// URL base de la API REST. En el emulador de Android, localhost del host es 10.0.2.2.
// El backend Java (backend/) corre en el puerto 3000 con context-path /api, así que
// esta URL ya apunta a él sin necesidad de cambios (ver backend/README.md).
export const API_BASE_URL = 'http://10.0.2.2:3000/api';

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// false (valor actual): usa el backend real (backend/, Spring Boot). Si no está
// levantado, las pantallas muestran "No se pudo conectar con el servidor" en vez de
// fallar en silencio: no hay fallback automático al mock.
export const USE_MOCK = false;
