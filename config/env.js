import { Platform } from 'react-native';

// En web, localhost apunta al host de la PC; en Android/emulador, localhost del host es 10.0.2.2.
const DEV_API_BASE_URL =
  Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://10.0.2.2:3000/api';

export const API_BASE_URL = DEV_API_BASE_URL;

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// false (valor actual): usa el backend real (backend/, Spring Boot). Si no está
// levantado, las pantallas muestran "No se pudo conectar con el servidor" en vez de
// fallar en silencio: no hay fallback automático al mock.
export const USE_MOCK = false;
