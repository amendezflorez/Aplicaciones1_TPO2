import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { STORAGE_KEYS } from '../config/constants';

// Borrador del wizard de publicar (Punto 5, sección 4.3 del plan): texto/selecciones en
// AsyncStorage (no es dato sensible), fotos copiadas a un directorio propio con
// expo-file-system. Guardado por usuario para no mezclar el borrador de una cuenta con el
// de otra en el mismo dispositivo si hacen logout/login.
const claveDe = (userId) => `${STORAGE_KEYS.borradorPublicacionPrefix}:${userId}`;

// Directorio propio y persistente de la app (Paths.document, no Paths.cache): el sistema
// puede borrar la caché para liberar espacio en cualquier momento, y el borrador puede
// quedar guardado días hasta que la persona lo retome — la URI que devuelve
// expo-image-picker vive en caché y no es segura para eso.
//
// Namespaced por clientRequestId (no una sola carpeta compartida): el Punto 6 agrega una
// cola de publicaciones pendientes de envío que reusa este mismo mecanismo de fotos (ver
// services/offline/colaPendientes.js), moviendo la carpeta de un borrador en curso a la
// cola. Si todas las fotos vivieran en una única carpeta plana, borrar el borrador actual
// (borrarBorrador) podría arrasar con las fotos de un ítem ya encolado que todavía no se
// subió — namespaced por intento, cada uno se borra o se mueve sin pisar al otro.
const dirDe = (clientRequestId) => new Directory(Paths.document, 'borrador-publicacion', clientRequestId);

export async function cargarBorrador(userId) {
  try {
    const raw = await AsyncStorage.getItem(claveDe(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Persistencia best-effort: si AsyncStorage falla (disco lleno, etc.) el wizard sigue
// andando en memoria, solo se pierde la posibilidad de retomarlo si la app se cierra.
export async function guardarBorrador(userId, borrador) {
  try {
    await AsyncStorage.setItem(claveDe(userId), JSON.stringify(borrador));
  } catch {
    // intencionalmente silencioso, ver comentario arriba
  }
}

// Borra el borrador completo: el registro en AsyncStorage y la carpeta de fotos de ese
// clientRequestId. Se usa al publicar con éxito o al tocar "Descartar" — en los dos casos
// las fotos ya no hacen falta (se subieron, o la persona decidió no usarlas).
export async function borrarBorrador(userId, clientRequestId) {
  await borrarRegistroBorrador(userId);
  try {
    if (clientRequestId) {
      const dir = dirDe(clientRequestId);
      if (dir.exists) dir.delete();
    }
  } catch {
    // idem: si no se puede borrar el directorio de fotos no es razón para romper el flujo
    // de "publicar con éxito", que es cuando se llama a esto.
  }
}

// Solo el registro en AsyncStorage, sin tocar la carpeta de fotos (Punto 6): se usa cuando
// el borrador pasa a ser un ítem de la cola offline (services/offline/colaPendientes.js),
// que ya se encargó de mover esas fotos a su propia carpeta antes de llamar a esto — acá
// no hay que borrar nada de disco, solo dejar de tratarlo como "el borrador en edición".
export async function borrarRegistroBorrador(userId) {
  try {
    await AsyncStorage.removeItem(claveDe(userId));
  } catch {
    // idem
  }
}

// Copia la foto elegida (cámara o galería) al directorio del borrador y devuelve su nueva
// URI persistente. idempotent:true porque esta función se llama una vez por foto elegida
// y no hace falta chequear "exists" antes: crear un directorio que ya existe no es error.
export async function copiarFotoAlBorrador(uriOrigen, clientRequestId) {
  const dir = dirDe(clientRequestId);
  dir.create({ intermediates: true, idempotent: true });
  const nombre = `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const destino = new File(dir, nombre);
  await new File(uriOrigen).copy(destino);
  return destino.uri;
}

// Al eliminar una foto del wizard (botón "✕" en el paso de fotos) borramos también su
// archivo persistido, para no dejar basura acumulándose en el directorio entre ediciones.
export function eliminarArchivoBorrador(uri) {
  try {
    new File(uri).delete();
  } catch {
    // Si ya no existe o no se puede borrar no bloqueamos al usuario por esto.
  }
}
