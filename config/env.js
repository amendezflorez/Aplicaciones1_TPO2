// URL base de la API REST. En el emulador de Android, localhost del host es 10.0.2.2;
// desde un celular físico con Expo Go hay que usar la IP de la PC en la red local (no
// 10.0.2.2, que solo resuelve dentro del emulador). El backend Java (backend/) corre en
// el puerto 3000 con context-path /api (ver backend/README.md).
// Valor actual: IP de la Wi-Fi de la PC de Mady (ipconfig -> "Adaptador de LAN
// inalámbrica Wi-Fi" -> IPv4), para probar desde el celular físico vía Expo Go.
// Si volvés a usar el emulador de Android Studio, cambiar de nuevo a 'http://10.0.2.2:3000/api'.
export const API_BASE_URL = 'http://192.168.1.21:3000/api';

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// false (valor actual): usa el backend real (backend/, Spring Boot). Si no está
// levantado, las pantallas muestran "No se pudo conectar con el servidor" en vez de
// fallar en silencio: no hay fallback automático al mock.
export const USE_MOCK = false;
