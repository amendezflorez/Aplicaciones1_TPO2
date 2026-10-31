import { api } from './api';
import { esErrorDeRed } from './errors';
import { guardarBarrios, obtenerBarriosGuardados } from './offline/barriosCache';
import { estaSinConexion } from './offline/estadoConexion';

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

// Punto 6: cada respuesta OK se guarda (services/offline/barriosCache.js) y, sin conexión
// o si la request falla por red, se devuelve la lista guardada — así el paso "Dónde" del
// wizard (y cualquier otro picker de barrios) funciona offline sin cambios en la UI. Si
// nunca se cargó con conexión, se propaga el error de red (el picker muestra el aviso).
export async function getBarrios() {
  if (estaSinConexion()) {
    const guardados = await obtenerBarriosGuardados();
    if (guardados) return guardados;
  }
  try {
    const { data } = await api.get('/barrios');
    guardarBarrios(data);
    return data;
  } catch (e) {
    if (!esErrorDeRed(e)) throw e;
    const guardados = await obtenerBarriosGuardados();
    if (guardados) return guardados;
    throw e;
  }
}

// Perfil público: sin teléfono ni historial de publicaciones
export const getPublicProfile = async (userId) =>
  (await api.get(`/users/${userId}/public`)).data;
