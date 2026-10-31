import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { borrarRegistroBorrador, cargarBorrador, guardarBorrador } from '../borradorPublicacionStorage';

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
const CARPETA_COLA = 'cola-publicaciones';
const CARPETA_BORRADOR = 'borrador-publicacion'; // la de borradorPublicacionStorage.js
const dirDe = (clientRequestId) => new Directory(Paths.document, CARPETA_COLA, clientRequestId);
const dirBorradorDe = (clientRequestId) => new Directory(Paths.document, CARPETA_BORRADOR, clientRequestId);

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

// Traslada la carpeta de fotos {carpetaOrigen}/{id} a {carpetaDestino}/{id} y devuelve las
// fotos con sus URIs nuevas. Primero crea la carpeta padre de destino (sin ella el move
// nativo falla con "The destination path does not exist") y mueve la carpeta DENTRO de
// ella, conservando el nombre {id}; `move` actualiza `origen.uri` a donde quedó. Si el
// move falla por cualquier otro motivo, copia foto por foto y borra el origen: nunca deja
// las fotos compartidas entre el borrador y la cola, donde descartar uno borraría las del
// otro. Solo si también falla la copia quedan las URIs originales (no se pierde nada).
async function trasladarFotos(clientRequestId, carpetaOrigen, carpetaDestino, fotos) {
  const origen = new Directory(Paths.document, carpetaOrigen, clientRequestId);
  if (!origen.exists) return fotos;
  const padre = new Directory(Paths.document, carpetaDestino);
  const remapear = (dir) => fotos.map((foto) => ({ ...foto, uri: new File(dir, nombreDe(foto.uri)).uri }));
  try {
    padre.create({ intermediates: true, idempotent: true });
    await origen.move(padre);
    return remapear(origen);
  } catch {
    // sigue con la copia
  }
  try {
    const destino = new Directory(padre, clientRequestId);
    destino.create({ intermediates: true, idempotent: true });
    for (const foto of fotos) {
      const archivo = new File(foto.uri);
      if (archivo.exists) await archivo.copy(destino);
    }
    origen.delete();
    return remapear(destino);
  } catch (e) {
    console.warn('No se pudieron trasladar las fotos de la publicación; quedan donde estaban', e);
    return fotos;
  }
}

// Mueve la publicación de "borrador en edición" a "pendiente en la cola" (sección 4.4 del
// plan): reusa los archivos de fotos que ya armó borradorPublicacionStorage —no descarga
// nada de nuevo— trasladando borrador-publicacion/{clientRequestId} a
// cola-publicaciones/{clientRequestId} (ver trasladarFotos).
export async function agregarACola(userId, borrador) {
  const fotos = await trasladarFotos(borrador.clientRequestId, CARPETA_BORRADOR, CARPETA_COLA, borrador.fotos);

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
  // trasladó (o, si falló todo, sigue intacto y en uso por este mismo ítem) — nunca hay
  // que borrarlo acá.
  await borrarRegistroBorrador(userId);
  return item;
}

export async function actualizarItem(userId, clientRequestId, cambios) {
  const cola = await listarCola(userId);
  const siguiente = cola.map((item) => (item.clientRequestId === clientRequestId ? { ...item, ...cambios } : item));
  await guardarCola(userId, siguiente);
}

// Éxito del procesador (colaProcesador.js) o "Descartar": saca el ítem de la cola y borra
// sus fotos —ya están subidas al backend, o la persona decidió no enviarla—. También borra
// borrador-publicacion/{clientRequestId}: ítems encolados antes de corregir el traslado de
// fotos quedaron con las fotos ahí. Si quedó un registro de borrador con este mismo
// clientRequestId (el autoguardado del wizard podía re-escribirlo después de encolar),
// también se descarta: es la misma publicación, ya enviada o descartada.
export async function quitarDeCola(userId, clientRequestId) {
  const cola = await listarCola(userId);
  await guardarCola(userId, cola.filter((item) => item.clientRequestId !== clientRequestId));
  for (const dir of [dirDe(clientRequestId), dirBorradorDe(clientRequestId)]) {
    try {
      if (dir.exists) dir.delete();
    } catch {
      // Si no se puede borrar la carpeta no es razón para romper el flujo de éxito.
    }
  }
  const borrador = await cargarBorrador(userId);
  if (borrador?.clientRequestId === clientRequestId) await borrarRegistroBorrador(userId);
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

  // Ítems viejos con las fotos todavía en borrador-publicacion/: no hay nada que trasladar
  // (trasladarFotos devuelve las mismas URIs si no existe la carpeta de la cola).
  const fotos = await trasladarFotos(clientRequestId, CARPETA_COLA, CARPETA_BORRADOR, item.borrador.fotos);

  const borradorEditable = { ...item.borrador, fotos };
  const cola = await listarCola(userId);
  await guardarCola(userId, cola.filter((i) => i.clientRequestId !== clientRequestId));
  await guardarBorrador(userId, borradorEditable);
  return borradorEditable;
}

function nombreDe(uri) {
  return uri.split('/').pop();
}
