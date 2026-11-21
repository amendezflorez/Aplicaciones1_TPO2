import axios from 'axios';
import { API_BASE_URL } from '../../config/env';
import { api } from '../api';

// Último estado de conexión conocido, legible desde fuera de React (servicios). Lo escribe
// ConnectivityProvider cada vez que cambia; los servicios lo usan para no esperar un
// timeout de red que ya se sabe que va a fallar (p. ej. getBarrios cae directo al caché).
let sinConexion = false;

export const setSinConexion = (valor) => {
  sinConexion = valor;
};

export const estaSinConexion = () => sinConexion;

const TIMEOUT_PING_MS = 5000;

// "¿El backend responde?" — lo usa ConnectivityProvider para salir del modo "forzado
// offline" (ver ese archivo). Cuenta como alcanzable CUALQUIER respuesta HTTP, incluso un
// error 4xx/5xx: lo único que importa es que el servidor contestó. Va con axios "pelado"
// (no con la instancia `api`) a propósito: sin interceptores, así un 401 acá nunca dispara
// un logout ni un error de red vuelve a notificar "sin conexión". Reusa el adapter de
// `api` para que con USE_MOCK también responda el backend simulado.
export async function backendAlcanzable() {
  try {
    await axios.get(`${API_BASE_URL}/barrios`, { timeout: TIMEOUT_PING_MS, adapter: api.defaults.adapter });
    return true;
  } catch (e) {
    return Boolean(e?.response);
  }
}
