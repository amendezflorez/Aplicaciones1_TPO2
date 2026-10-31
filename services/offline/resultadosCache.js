import AsyncStorage from '@react-native-async-storage/async-storage';

// Caché de los últimos resultados de búsqueda cargados con éxito (Punto 6, sección 4.3 de
// PLAN_puntos_5_y_6.md): "si la persona realiza una búsqueda sin conexión, la app muestra
// los últimos resultados cargados exitosamente, con un aviso de que la información podría
// no estar actualizada". Un solo slot (no por cada combinación de filtros): coincide con
// la letra de la consigna ("los últimos resultados", no "los últimos resultados de esta
// búsqueda en particular") y evita la complejidad de cachear/indexar por filtro.
const CLAVE = 'offline:resultados:ultimo';

export async function guardarResultados({ filtros, orden, data, total }) {
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify({ filtros, orden, data, total, cacheadoEn: Date.now() }));
  } catch {
    // best-effort, igual que el resto de este caché
  }
}

export async function obtenerUltimosResultados() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
