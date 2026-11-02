// URL base de la API REST. En el emulador de Android, localhost del host es 10.0.2.2;
// desde un celular físico con Expo Go hay que usar la IP de la PC en la red local (no
// 10.0.2.2, que solo resuelve dentro del emulador). El backend Java (backend/) corre en
// el puerto 3000 con context-path /api (ver backend/README.md).
// Valor actual: IP de esta PC en la red local, para probar desde Expo Go.
// Si usás el emulador de Android Studio, cambiar a 'http://10.0.2.2:3000/api'.
export const API_BASE_URL = 'http://192.168.1.3:3000/api';

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// false: usa el backend real (backend/, Spring Boot).
export const USE_MOCK = false;

// Los encuentros se resuelven localmente en desarrollo y cuando está activo el backend mock.
export const USE_ENCOUNTER_MOCK = __DEV__ || USE_MOCK;
