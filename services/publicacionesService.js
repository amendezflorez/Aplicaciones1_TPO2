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

// Punto 5 (publicar). Mismo patrón de dos pasos que userService.uploadPhoto/
// reclamosService.subirFotoReclamo: subir la foto primero, mandar la URL ya resuelta en
// crearPublicacion. uri es la URI local (ya copiada al directorio persistente del
// borrador, ver services/borradorPublicacionStorage.js) de la foto a subir.
export async function subirFotoPublicacion(uri) {
  const formData = new FormData();
  formData.append('foto', { uri, name: 'publicacion.jpg', type: 'image/jpeg' });
  const response = await api.post('/publicaciones/fotos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { photoUrl }
}

// data: ver CrearPublicacionRequest en el backend (sección 3 de PLAN_puntos_5_y_6.md).
// Devuelve la publicación creada (o la ya existente si data.clientRequestId repetía una
// anterior del mismo usuario) con la forma de PublicacionDetalleResponse.
export const crearPublicacion = async (data) => (await api.post('/publicaciones', data)).data;

// "Mis publicaciones": todos los estados, sin filtrar, más recientes primero.
export const getMisPublicaciones = async () => (await api.get('/publicaciones/mias')).data;

export const renovarPublicacion = async (id) => (await api.post(`/publicaciones/${id}/renovar`)).data;
