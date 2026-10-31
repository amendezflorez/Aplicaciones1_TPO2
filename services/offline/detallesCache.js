import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

// Caché de detalles de publicación consultados con éxito (Punto 6, sección 4.2 de
// PLAN_puntos_5_y_6.md): "la app conserva en el dispositivo las últimas publicaciones que
// la persona consultó (detalle, fotos y barrio)". Capa de almacenamiento puro — solo
// guardar/obtener/eliminar — para que DetallePublicacionScreen no toque AsyncStorage ni
// expo-file-system directamente.
const PREFIJO_ITEM = 'offline:detalle:';
const CLAVE_INDICE = 'offline:detalles:index';
// LRU: hasta 20 publicaciones vistas recientemente. Un número chico y fijo, no
// configurable, alcanza para un TP (no hace falta que el equipo lo ajuste en runtime).
const MAX_DETALLES = 20;

const claveItem = (id) => `${PREFIJO_ITEM}${id}`;
const dirDe = (id) => new Directory(Paths.document, 'cache-detalles', id);

async function leerIndice() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_INDICE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Mueve `id` al frente del índice (más reciente) y, si se pasa de MAX_DETALLES, descarta
// las entradas más viejas (ítem + sus fotos en disco) — el LRU completo.
async function tocarIndice(id) {
  const indice = await leerIndice();
  const siguiente = [id, ...indice.filter((x) => x !== id)];
  const descartados = siguiente.slice(MAX_DETALLES);
  const vigentes = siguiente.slice(0, MAX_DETALLES);
  for (const idDescartado of descartados) {
    await eliminarDetalle(idDescartado, { actualizarIndice: false });
  }
  try {
    await AsyncStorage.setItem(CLAVE_INDICE, JSON.stringify(vigentes));
  } catch {
    // best-effort
  }
}

// Descarga cada foto del detalle a un archivo local y guarda el detalle con esas URIs
// locales — así se puede mostrar con fotos aunque no haya conexión. Si una foto puntual no
// se puede descargar, se sigue con la URL remota para esa foto en particular (no es un
// error que deba frenar el resto del caché).
export async function guardarDetalle(detalle) {
  if (!detalle?.id) return;
  const dir = dirDe(detalle.id);
  try {
    dir.create({ intermediates: true, idempotent: true });
  } catch {
    return; // sin carpeta no hay dónde bajar las fotos; se deja de cachear este detalle
  }

  const fotosLocales = [];
  for (const foto of detalle.fotos ?? []) {
    try {
      const destino = new File(dir, `${foto.id}.jpg`);
      if (!destino.exists) {
        await File.downloadFileAsync(foto.url, destino, { idempotent: true });
      }
      fotosLocales.push({ ...foto, url: destino.uri });
    } catch (e) {
      console.warn('No se pudo descargar una foto para el caché offline del detalle', e);
      fotosLocales.push(foto); // sigue apuntando a la URL remota, mejor que nada
    }
  }

  const paraGuardar = {
    ...detalle,
    fotos: fotosLocales,
    fotoPrincipalUrl: fotosLocales[0]?.url ?? detalle.fotoPrincipalUrl,
  };

  try {
    await AsyncStorage.setItem(claveItem(detalle.id), JSON.stringify(paraGuardar));
    await tocarIndice(detalle.id);
  } catch {
    // best-effort
  }
}

export async function obtenerDetalle(id) {
  try {
    const raw = await AsyncStorage.getItem(claveItem(id));
    if (!raw) return null;
    await tocarIndice(id); // se volvió a consultar: cuenta como "reciente" para el LRU
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function eliminarDetalle(id, { actualizarIndice = true } = {}) {
  try {
    await AsyncStorage.removeItem(claveItem(id));
  } catch {
    // best-effort
  }
  try {
    const dir = dirDe(id);
    if (dir.exists) dir.delete();
  } catch {
    // best-effort
  }
  if (actualizarIndice) {
    const indice = await leerIndice();
    try {
      await AsyncStorage.setItem(CLAVE_INDICE, JSON.stringify(indice.filter((x) => x !== id)));
    } catch {
      // best-effort
    }
  }
}
