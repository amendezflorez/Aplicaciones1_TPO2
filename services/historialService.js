import { api } from './api';

export const getHistorial = async (params) => (await api.get('/historial', { params })).data;

export const getCasoDetalle = async (id) => (await api.get(`/historial/${id}`)).data;

export const valorarCaso = async (id, data) => (await api.post(`/historial/${id}/valorar`, data)).data;

export const getAgradecimientosUsuario = async (userId) =>
  (await api.get(`/users/${userId}/agradecimientos`)).data;

