import { api } from './api';

// "Es mío" / "Lo encontré" desde el detalle (sección 3 del plan).
// data: { tipo: 'es_mio'|'lo_encontre', respuestaPregunta?, descripcion?, fotoUrl?, barrioId? }
export const crearReclamo = async (publicacionId, data) =>
  (await api.post(`/publicaciones/${publicacionId}/reclamos`, data)).data;

// El propio reclamo pendiente/aceptado sobre esa publicación, o null — para que el botón
// sepa si mostrar "Ya reclamaste" (lo mismo que ya trae detalle.yaReclame, pero esto sirve
// para refrescar el estado justo después de crear uno sin recargar todo el detalle).
export const getReclamoPropio = async (publicacionId) =>
  (await api.get(`/publicaciones/${publicacionId}/reclamos/mio`)).data;

// Sube la foto que pide "Lo encontré" (mismo patrón de dos pasos que la foto de perfil en
// userService.uploadPhoto: subir primero, mandar la URL ya resuelta en crearReclamo).
export async function subirFotoReclamo(uri) {
  const formData = new FormData();
  formData.append('foto', { uri, name: 'reclamo.jpg', type: 'image/jpeg' });
  const response = await api.post('/reclamos/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { photoUrl }
}
