import { api } from './api';
import { USE_ENCOUNTER_MOCK } from '../config/env';
import {
  aceptarEncuentroMock,
  getEncuentroMock,
  proponerEncuentroMock,
} from './encounterMockService';

async function conRespaldoMock(request, fallback) {
  if (USE_ENCOUNTER_MOCK) return fallback();
  try {
    return await request();
  } catch (error) {
    if (error.response?.status === 500) return fallback();
    throw error;
  }
}

// "Es mío" / "Lo encontré" desde el detalle (sección 3 del plan).
// data: { tipo: 'es_mio'|'lo_encontre', respuestaPregunta?, descripcion?, fotoUrl?, barrioId? }
export const crearReclamo = async (publicacionId, data) =>
  (await api.post(`/publicaciones/${publicacionId}/reclamos`, data)).data;

// El propio reclamo pendiente/aceptado sobre esa publicación, o null — para que el botón
// sepa si mostrar "Ya reclamaste" (lo mismo que ya trae detalle.yaReclame, pero esto sirve
// para refrescar el estado justo después de crear uno sin recargar todo el detalle).
export const getReclamoPropio = async (publicacionId) =>
  (await api.get(`/publicaciones/${publicacionId}/reclamos/mio`)).data;

export const getMisReclamos = async () => (await api.get('/reclamos')).data;

export const decidirReclamo = async (reclamoId, decision) =>
  (await api.patch(`/reclamos/${reclamoId}/decision`, { decision })).data;

// Contrato del Punto 8: el servidor persiste la negociación y sus rutas requieren
// un reclamo aceptado. GET devuelve estado sin_propuesta|pendiente|acordado,
// propuestaActual y ubicacionAcordada; cada ubicación incluye id, direccion,
// referencia, latitud, longitud y propuestoPorId cuando esos datos aplican.
export const getEncuentro = async (reclamoId, usuarioId, publicacionTitulo) =>
  conRespaldoMock(
    async () => (await api.get(`/reclamos/${reclamoId}/encuentro`)).data,
    () => getEncuentroMock(reclamoId, usuarioId, publicacionTitulo)
  );

export const proponerEncuentro = async (reclamoId, ubicacion, usuarioId) =>
  conRespaldoMock(
    async () => (await api.post(`/reclamos/${reclamoId}/encuentro/propuestas`, ubicacion)).data,
    () => proponerEncuentroMock(reclamoId, ubicacion, usuarioId)
  );

export const aceptarPropuestaEncuentro = async (reclamoId, propuestaId) =>
  conRespaldoMock(
    async () => (await api.post(`/reclamos/${reclamoId}/encuentro/propuestas/${propuestaId}/aceptar`)).data,
    () => aceptarEncuentroMock(reclamoId, propuestaId)
  );

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
