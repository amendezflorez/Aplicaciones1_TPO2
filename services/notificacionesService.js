import { api } from './api';

// Punto 12: bandeja de notificaciones y registro del dispositivo para push.
// GET /notificaciones -> { data: Notificacion[], noLeidas: number }
// Notificacion: { id, tipo, titulo, cuerpo, reclamoId, publicacionId, leida, creadaEn }

export async function getBandeja() {
  const { data } = await api.get('/notificaciones');
  return data;
}

export async function getNoLeidas() {
  const { data } = await api.get('/notificaciones/no-leidas');
  return data?.noLeidas ?? 0;
}

export async function marcarLeida(id) {
  const { data } = await api.patch(`/notificaciones/${id}/leida`);
  return data;
}

export async function marcarTodasLeidas() {
  await api.post('/notificaciones/leer-todas');
}

export async function registrarDispositivo(token) {
  await api.post('/dispositivos', { token });
}

export async function darDeBajaDispositivo(token) {
  await api.post('/dispositivos/baja', { token });
}
