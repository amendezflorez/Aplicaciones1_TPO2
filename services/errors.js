// Traduce un error de Axios a un mensaje en español para el usuario.
// `overrides` permite personalizar por código HTTP según la pantalla: { 409: '...' }.
export function getErrorMessage(error, overrides = {}) {
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  const status = error.response.status;
  if (overrides[status]) return overrides[status];

  switch (status) {
    case 400:
      return 'Los datos ingresados no son válidos.';
    case 401:
      return 'Credenciales inválidas.';
    case 404:
      return 'No se encontró lo que buscabas.';
    case 410:
      return 'El código expiró. Pedí uno nuevo.';
    case 429:
      return 'Demasiados intentos. Esperá un momento antes de reintentar.';
    default:
      return 'Ocurrió un error inesperado. Intentá de nuevo más tarde.';
  }
}
