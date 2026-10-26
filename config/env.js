// URL base de la API REST. En el emulador de Android, localhost del host es 10.0.2.2.
export const API_BASE_URL = 'http://10.0.2.2:3000/api';

// true: usa el backend simulado (services/mock/mockAdapter.js), sin servidor real.
// Poner en false cuando exista el backend y API_BASE_URL apunte a él.
export const USE_MOCK = true;
