import { api } from './api';

// filtros: { tipoBuscado, categoria, texto, barrioId, lat, lng, radioKm, rango, desde,
// hasta, orden, page, size } — ver sección 3 de .docs/PLAN_puntos_3_y_4.md. Se filtran acá
// los valores vacíos para no mandar "categoria=" o "texto=" sueltos en la query string.
export async function buscarPublicaciones(filtros) {
  const params = {};
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  });
  // { data, page, size, total }
  return (await api.get('/publicaciones', { params })).data;
}

// Detalle (Punto 4). direccionExacta/latExacta/lngExacta ya vienen null desde el backend
// si no corresponde mostrarlos: esta pantalla no decide nada, solo renderiza.
export const getDetallePublicacion = async (id) => (await api.get(`/publicaciones/${id}`)).data;

// Idempotente: el backend devuelve 409 si ya la seguía: quien llame a esto debe tratar
// ese 409 como éxito (ver sección 3 del plan), no como un error a mostrar.
export const seguirPublicacion = (id) => api.post(`/publicaciones/${id}/seguir`);
export const dejarDeSeguirPublicacion = (id) => api.delete(`/publicaciones/${id}/seguir`);
export const getSeguidas = async () => (await api.get('/seguimientos')).data;
