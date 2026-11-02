// URL base de la API REST. En el emulador de Android, localhost del host es 10.0.2.2;
// desde un celular físico con Expo Go hay que usar la IP de la PC en la red local (no
// 10.0.2.2, que solo resuelve dentro del emulador). El backend Java (backend/) corre en
// el puerto 3000 con context-path /api (ver backend/README.md).
// Valor actual: IP de la Wi-Fi de la PC de Mady (ipconfig -> "Adaptador de LAN
// inalámbrica Wi-Fi" -> IPv4), para probar desde el celular físico vía Expo Go.
// Si volvés a usar el emulador de Android Studio, cambiar de nuevo a 'http://10.0.2.2:3000/api'.
export const API_BASE_URL = 'http://10.100.18.219:3000/api';

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// false: usa el backend real (backend/, Spring Boot).
export const USE_MOCK = false;

// Los encuentros se resuelven localmente en desarrollo y cuando está activo el backend mock.
export const USE_ENCOUNTER_MOCK = __DEV__ || USE_MOCK;
