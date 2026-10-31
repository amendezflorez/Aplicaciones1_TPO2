import AsyncStorage from '@react-native-async-storage/async-storage';

// Caché de la lista de barrios (Punto 6): GET /barrios es la única dependencia del backend
// que tiene el wizard de publicar antes del alta, y sin ella el paso "Dónde" no se puede
// completar sin conexión. Se guarda cada vez que la request responde OK y se usa como
// respaldo cuando falla por red — ver getBarrios en services/userService.js, que es lo que
// usan todas las pantallas (wizard, buscador, refinar, editar perfil, reclamos). No es por
// usuario: la lista es la misma para todos.
const CLAVE = 'offline:barrios';

export async function guardarBarrios(barrios) {
  if (!Array.isArray(barrios)) return;
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(barrios));
  } catch {
    // best-effort
  }
}

// null si nunca se cargó la lista con conexión (o el JSON guardado está corrupto).
export async function obtenerBarriosGuardados() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    const lista = raw ? JSON.parse(raw) : null;
    return Array.isArray(lista) ? lista : null;
  } catch {
    return null;
  }
}
