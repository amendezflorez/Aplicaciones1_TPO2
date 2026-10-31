import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { guardarBorrador, borrarRegistroBorrador } from '../borradorPublicacionStorage';

// Capa de almacenamiento puro para la cola de publicaciones pendientes de envío (Punto 6,
// sección 4.4 de PLAN_puntos_5_y_6.md): solo CRUD (listar/agregar/actualizar/quitar), sin
// lógica de red — eso vive en colaProcesador.js. Las pantallas y contexts no tocan
// AsyncStorage/expo-file-system directamente: pasan siempre por estas funciones, para que
// el día que haga falta migrar a otro motor de almacenamiento (ej. WatermelonDB) alcance
// con reescribir este archivo.
//
// Cada ítem: { clientRequestId, borrador, estado: 'pendiente'|'error', mensajeError,
// creadaEn }. "borrador" tiene la misma forma que arma PublicarWizardScreen (ver
// services/publicarPublicacion.js), con sus fotos ya apuntando a archivos locales.
//
// La cola es POR USUARIO (`userId` como primer parámetro de cada función, igual que
// borradorPublicacionStorage): si no lo fuera, el usuario B vería (y el procesador
// enviaría, con el token de B) las publicaciones que el usuario A dejó pendientes antes de
// cerrar sesión en el mismo dispositivo. Ver sección 15.10 del plan.
const claveColaDe = (userId) => `offline:colaPendientes:${userId}`;

// Fotos de cada ítem en su propia subcarpeta (por clientRequestId, no por usuario: un
// clientRequestId ya es único por diseño — utils/uuid.js — así que alcanza para no
// pisarse entre ítems, de cualquier usuario) para poder borrarlas todas juntas al
// completar/descartar un ítem, sin tocar las de otros.
const dirDe = (clientRequestId) => new Directory(Paths.document, 'cola-publicaciones', clientRequestId);

export async function listarCola(userId) {
  try {
    const raw = await AsyncStorage.getItem(claveColaDe(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function obtenerItem(userId, clientRequestId) {
  const cola = await listarCola(userId);
  return cola.find((item) => item.clientRequestId === clientRequestId) ?? null;
}

async function guardarCola(userId, cola) {
  try {
    await AsyncStorage.setItem(claveColaDe(userId), JSON.stringify(cola));
  } catch {
    // Best-effort, igual que el resto del almacenamiento offline: si falla, la cola sigue
    // andando en memoria hasta el próximo guardado exitoso.
  }
}

// Mueve la publicación de "borrador en edición" a "pendiente en la cola" (sección 4.4 del
// plan): reusa el mismo directorio de fotos que ya armó borradorPublicacionStorage —no
// copia ni descarga nada de nuevo— moviendo la carpeta entera de
// borrador-publicacion/{clientRequestId} a cola-publicaciones/{clientRequestId}. Si el
// move falla (caso raro), las fotos quedan donde estaban y el ítem las sigue referenciando
// ahí: no se pierden, solo no se mudan.
export async function agregarACola(userId, borrador) {
  const origen = new Directory(Paths.document, 'borrador-publicacion', borrador.clientRequestId);
  const destino = dirDe(borrador.clientRequestId);
  let fotos = borrador.fotos;
  if (origen.exists) {
    try {
      await origen.move(destino);
      fotos = borrador.fotos.map((foto) => ({ ...foto, uri: new File(destino, nombreDe(foto.uri)).uri }));
    } catch (e) {
      console.warn('No se pudo mover la carpeta de fotos del borrador a la cola offline; se mantienen donde estaban', e);
    }
  }

  const item = {
    clientRequestId: borrador.clientRequestId,
    borrador: { ...borrador, fotos },
    estado: 'pendiente',
    mensajeError: null,
    creadaEn: Date.now(),
  };
  const cola = await listarCola(userId);
  await guardarCola(userId, [...cola, item]);
  // Borra solo el registro del borrador en AsyncStorage: el directorio de fotos ya se
  // movió (o, si falló, sigue intacto y en uso por este mismo ítem) — nunca hay que
  // borrarlo acá.
  await borrarRegistroBorrador(userId);
  return item;
}

export async function actualizarItem(userId, clientRequestId, cambios) {
  const cola = await listarCola(userId);
  const siguiente = cola.map((item) => (item.clientRequestId === clientRequestId ? { ...item, ...cambios } : item));
  await guardarCola(userId, siguiente);
}

// Éxito del procesador (colaProcesador.js): saca el ítem de la cola y borra sus fotos —ya
// están subidas al backend, no hace falta conservarlas localmente.
export async function quitarDeCola(userId, clientRequestId) {
  const cola = await listarCola(userId);
  await guardarCola(userId, cola.filter((item) => item.clientRequestId !== clientRequestId));
  try {
    const dir = dirDe(clientRequestId);
    if (dir.exists) dir.delete();
  } catch {
    // Si no se puede borrar la carpeta no es razón para romper el flujo de éxito.
  }
}

// "Descartar" desde Mis publicaciones (un ítem en estado 'error'): mismo efecto que
// quitarDeCola, nombre aparte para que el llamador sea explícito sobre la intención.
export const descartarItem = quitarDeCola;

// "Editar" desde Mis publicaciones (un ítem en estado 'error', sección 4.4 del plan):
// devuelve el mismo directorio de fotos al borrador en edición (movimiento inverso al de
// agregarACola) y guarda el borrador para que PublicarWizardScreen lo encuentre al montar
// con su mecanismo normal de "retomar" — no hace falta un camino de edición aparte.
export async function pasarAEdicion(userId, clientRequestId) {
  const item = await obtenerItem(userId, clientRequestId);
  if (!item) return null;

  const origen = dirDe(clientRequestId);
  const destino = new Directory(Paths.document, 'borrador-publicacion', clientRequestId);
  let fotos = item.borrador.fotos;
  if (origen.exists) {
    try {
      await origen.move(destino);
      fotos = item.borrador.fotos.map((foto) => ({ ...foto, uri: new File(destino, nombreDe(foto.uri)).uri }));
    } catch (e) {
      console.warn('No se pudo devolver la carpeta de fotos de la cola al borrador', e);
    }
  }

  const borradorEditable = { ...item.borrador, fotos };
  const cola = await listarCola(userId);
  await guardarCola(userId, cola.filter((i) => i.clientRequestId !== clientRequestId));
  await guardarBorrador(userId, borradorEditable);
  return borradorEditable;
}

function nombreDe(uri) {
  return uri.split('/').pop();
}
