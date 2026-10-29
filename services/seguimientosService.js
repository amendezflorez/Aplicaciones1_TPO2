import { api } from './api';

// "Seguir" desde el detalle (Punto 4); el listado lo consume también el Punto 9.
// Idempotente por constraint única en el backend: POST devuelve 409 si ya la seguía —
// quien llame a esto debe tratar ese 409 como éxito (sección 3 del plan), no como un
// error a mostrar (ver el catch en DetallePublicacionScreen).
export const seguirPublicacion = (id) => api.post(`/publicaciones/${id}/seguir`);
export const dejarDeSeguirPublicacion = (id) => api.delete(`/publicaciones/${id}/seguir`);
export const getSeguidas = async () => (await api.get('/seguimientos')).data;
