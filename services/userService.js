import { api } from './api';

export const getMe = async () => (await api.get('/users/me')).data;

// data: { name, barrioId, phone, phoneVisible } -> devuelve el usuario actualizado
export const updateMe = async (data) => (await api.put('/users/me', data)).data;

// Sube la foto de perfil (multipart) -> { photoUrl }
export async function uploadPhoto(uri) {
  const formData = new FormData();
  formData.append('photo', { uri, name: 'profile.jpg', type: 'image/jpeg' });
  const response = await api.post('/users/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export const getBarrios = async () => (await api.get('/barrios')).data;

// Perfil público: sin teléfono ni historial de publicaciones
export const getPublicProfile = async (userId) =>
  (await api.get(`/users/${userId}/public`)).data;
