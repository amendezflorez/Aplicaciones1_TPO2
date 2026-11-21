import { getUserIdFromToken } from '../../utils/jwt';
import { esErrorDeRed, getErrorMessage } from '../errors';
import { enviarPublicacion, FOTO_FALTANTE } from '../publicarPublicacion';
import { getToken } from '../storage';
import { actualizarItem, listarCola, obtenerItem, quitarDeCola } from './colaPendientes';

// Orquesta el envío de la cola de publicaciones pendientes (Punto 6, sección 4.4 del plan
// 5/6). Separado de colaPendientes.js a propósito: ese archivo es solo almacenamiento
// (CRUD), esto es lógica de red — usa el mismo enviarPublicacion que ya usa el wizard
// online (services/publicarPublicacion.js), sin reimplementar la subida de fotos ni el
// alta.
//
// Recibe `userId` explícito (la cola es por usuario, ver colaPendientes.js) y lo disparan
// efectos en AuthContext (no ConnectivityContext: ese no conoce al usuario autenticado) —
// una vez al autenticarse (login, restaurar sesión, desbloqueo biométrico) y cada vez que
// se detecta una transición de offline a online/desconocido mientras hay sesión.

// Mutex a nivel de módulo (no de React): evita que dos llamadas a
// procesarColaPendientes() corran en simultáneo (p. ej. el efecto de reconexión y el de
// "recién autenticado" casi al mismo tiempo) y terminen subiendo la misma publicación dos
// veces.
let procesando = false;
// Si llega un pedido mientras hay una corrida en curso (p. ej. A cerró sesión a mitad de
// su corrida y B ya inició sesión), no se descarta: se recuerda el último userId pedido y
// se corre al terminar la actual.
let siguienteUserId = null;

// Reintentos ante errores del servidor (Punto 6). Los errores de RED no cuentan acá: sin
// conexión no tiene sentido gastar intentos, y el reintento ya lo dispara la vuelta de la
// conexión (ConnectivityContext → transición offline→online → AuthContext). Solo los 5xx /
// 408 / 429, que pasan CON conexión, necesitan su propio temporizador.
const MAX_INTENTOS_SERVIDOR = 5;
const BACKOFF_BASE_MS = 30000;
const BACKOFF_MAX_MS = 10 * 60000;
const esReintentable = (status) => status >= 500 || status === 408 || status === 429;
const esperaParaIntento = (intentos) => Math.min(BACKOFF_BASE_MS * 2 ** (intentos - 1), BACKOFF_MAX_MS);
let timerReintento = null;

// Después de cada corrida: si quedó algún pendiente esperando su backoff, agenda UNA
// nueva corrida para cuando le toque al más próximo (nunca más de un temporizador a la
// vez: procesarColaPendientes limpia el anterior al empezar).
async function programarReintento(userId) {
  const cola = await listarCola(userId);
  const proximos = cola
    .filter((item) => item.estado === 'pendiente' && item.proximoIntentoEn)
    .map((item) => item.proximoIntentoEn);
  if (proximos.length === 0) return;
  const espera = Math.max(Math.min(...proximos) - Date.now(), 1000);
  timerReintento = setTimeout(() => procesarColaPendientes(userId), espera);
}

// Error interno: la sesión vigente ya no es la del dueño de la cola.
const SESION_CAMBIADA = 'SESION_CAMBIADA';
async function verificarSesionDe(userId) {
  if (getUserIdFromToken(await getToken()) !== userId) {
    const e = new Error('La sesión ya no es la del dueño de esta cola');
    e.code = SESION_CAMBIADA;
    throw e;
  }
}

// Aviso a las pantallas abiertas (Mis publicaciones) de que un ítem de la cola cambió de
// estado — se envió o quedó con error — para que se refresquen solas, sin esperar a que
// la persona vuelva a entrar o tire para recargar. Un Set de listeners a nivel de módulo,
// mismo patrón "fuera de React" que el mutex de arriba.
const listeners = new Set();

export function escucharColaProcesada(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function avisarCambio(userId) {
  for (const listener of listeners) {
    try {
      listener(userId);
    } catch {
      // un listener roto no frena el procesamiento
    }
  }
}

export async function procesarColaPendientes(userId) {
  if (!userId) return;
  if (procesando) {
    siguienteUserId = userId;
    return;
  }
  procesando = true;
  clearTimeout(timerReintento);
  try {
    await procesar(userId);
    await programarReintento(userId);
  } finally {
    procesando = false;
  }
  if (siguienteUserId) {
    const proximo = siguienteUserId;
    siguienteUserId = null;
    await procesarColaPendientes(proximo);
  }
}

async function procesar(userId) {
  const cola = await listarCola(userId);
  for (const item of cola) {
    if (item.estado !== 'pendiente') continue;
    // Releer el estado actual en cada vuelta: un ítem anterior pudo haber cambiado la
    // cola (completarse, o la persona pudo haber editado/descartado otro mientras
    // tanto).
    const actual = await obtenerItem(userId, item.clientRequestId);
    if (!actual || actual.estado !== 'pendiente') continue;
    // En espera por backoff tras un error del servidor: todavía no le toca.
    if (actual.proximoIntentoEn && actual.proximoIntentoEn > Date.now()) continue;

    // Copia local acumulativa: cada onFotoSubida parte de la anterior. Antes cada una
    // partía de `actual.borrador` original, así que la foto 2 pisaba la url guardada de
    // la foto 1 (y un reintento —p. ej. tras un 401— la volvía a subir).
    let borrador = actual.borrador;
    try {
      await enviarPublicacion(borrador, {
        // Mismo mecanismo que el wizard online: persiste qué fotos ya se subieron
        // antes de seguir con la próxima, para no resubirlas si este intento falla a
        // mitad de camino.
        //
        // Esperado (await), no "fire and forget": actualizarItem lee la cola, la modifica
        // y la vuelve a escribir. Sin esperar, esa escritura podía terminar DESPUÉS de
        // quitarDeCola y volver a meter en la cola un ítem ya enviado.
        onFotoSubida: async (foto, url) => {
          borrador = { ...borrador, fotos: borrador.fotos.map((f) => (f.uri === foto.uri ? { ...f, url } : f)) };
          await actualizarItem(userId, actual.clientRequestId, { borrador });
        },
        antesDeCadaRequest: () => verificarSesionDe(userId),
      });
      await quitarDeCola(userId, actual.clientRequestId);
      avisarCambio(userId);
    } catch (e) {
      // Sesión vencida: el interceptor de services/api.js ya hizo logout por su cuenta
      // ante este 401 (no es una ruta /auth/*). Un 401 NO es un error de validación del
      // backend sobre ESTA publicación — es "con quien la mandamos ya no está
      // logueado" — así que no se marca 'error': el ítem queda 'pendiente' tal cual
      // para reintentarse solo cuando ese mismo usuario vuelva a loguearse (el efecto en
      // AuthContext dispara procesarColaPendientes de nuevo al ver status=authenticated).
      const sesionVencida = e.response?.status === 401;
      // Cambió la sesión a mitad de la corrida (logout de este usuario, o entró otro):
      // se corta sin tocar el ítem — queda 'pendiente' para cuando su dueño vuelva.
      if (e.code === SESION_CAMBIADA) break;
      // Foto borrada del dispositivo: no es un problema de red, reintentar no lo arregla.
      // Se marca 'error' para que la persona la edite (vuelva a agregar la foto) o la
      // descarte desde Mis publicaciones.
      if (e.code === FOTO_FALTANTE) {
        await actualizarItem(userId, actual.clientRequestId, { estado: 'error', mensajeError: e.message });
        avisarCambio(userId);
        continue;
      }
      if (esErrorDeRed(e) || sesionVencida) {
        // Sin conexión real, se cortó a mitad de camino, o se venció la sesión: en los
        // tres casos no tiene sentido seguir con el resto de la cola en esta corrida
        // (todos los ítems restantes van a fallar por la misma razón), así que se corta
        // acá y se reintenta en la próxima corrida válida.
        console.warn(
          sesionVencida
            ? 'Publicación pendiente: la sesión venció, se reintentará al volver a loguearse'
            : 'Publicación pendiente: sin conexión, se reintentará más tarde',
          e
        );
        break;
      }
      // Error del servidor (5xx) o transitorio (408 timeout, 429 demasiadas requests): no
      // es culpa de la publicación, así que se reintenta sola con backoff exponencial
      // (30s, 1m, 2m, 4m). Si sigue fallando después de MAX_INTENTOS_SERVIDOR intentos,
      // pasa a 'error' para no reintentar infinito: la persona la ve en Mis
      // publicaciones y puede tocar "Reintentar", editarla o descartarla. Se sigue con el
      // resto de la cola (continue, no break): otro ítem puede andar bien.
      const status = e.response?.status;
      if (esReintentable(status)) {
        const intentos = (actual.intentos ?? 0) + 1;
        if (intentos >= MAX_INTENTOS_SERVIDOR) {
          await actualizarItem(userId, actual.clientRequestId, {
            estado: 'error',
            intentos,
            proximoIntentoEn: null,
            mensajeError: `${getErrorMessage(e)} Lo intentamos ${intentos} veces sin éxito.`,
          });
        } else {
          await actualizarItem(userId, actual.clientRequestId, {
            intentos,
            proximoIntentoEn: Date.now() + esperaParaIntento(intentos),
            mensajeError: 'El servidor no pudo recibirla todavía. La vamos a reintentar automáticamente.',
          });
        }
        avisarCambio(userId);
        continue;
      }
      // Error 4xx (validación del backend sobre ESTA publicación): reintentar no lo
      // arregla, se marca con error — "Mis publicaciones" ofrece editarla o descartarla.
      await actualizarItem(userId, actual.clientRequestId, {
        estado: 'error',
        mensajeError: getErrorMessage(e),
      });
      avisarCambio(userId);
    }
  }
}
