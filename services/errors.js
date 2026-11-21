// Punto 6 (sin conexión): true si Axios no recibió respuesta del servidor — falla de red
// real (sin wifi/datos, servidor inalcanzable, timeout), no un 4xx/5xx que el backend sí
// contestó. Las pantallas y la cola offline lo usan para decidir si caen al caché.
// Solo cuenta como error de red un error de Axios sin respuesta: un fallo local de JS (un
// archivo que no se puede leer, un bug) NO es "sin conexión" y no debe dejar una
// publicación reintentándose en silencio para siempre.
export function esErrorDeRed(error) {
  return error?.isAxiosError === true && !error.response;
}

// Traduce un error a un mensaje claro en español para la persona.
//
// Orden de prioridad:
//   1. Sin respuesta del servidor -> mensaje de conexión (distingue timeout).
//   2. `overrides[status]` de la pantalla (cuando el contexto permite un texto más preciso).
//   3. El `message` que manda el backend (GlobalExceptionHandler) en 4xx: ya está en
//      español y es específico ("Ya alcanzaste el máximo de 3 intentos...").
//   4. Un texto genérico por código.
// Nunca muestra detalles técnicos (stack traces, nombres de clases, "Request failed...").
export function getErrorMessage(error, overrides = {}) {
  if (!error) return 'Ocurrió un error inesperado.';
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message ?? '')) {
      return 'El servidor tardó demasiado en responder. Probá de nuevo en un momento.';
    }
    if (error.isAxiosError === false || (error.message && !error.config)) {
      // Error de JS (no de red): no exponer el mensaje técnico.
      return 'Algo salió mal. Intentá de nuevo.';
    }
    return 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  const status = error.response.status;
  if (overrides[status]) return overrides[status];

  const serverMsg = mensajeDelServidor(error.response.data);
  if (serverMsg && status >= 400 && status < 500) return serverMsg;

  switch (status) {
    case 400:
      return 'Revisá los datos ingresados: hay algo que no es válido.';
    case 401:
      return 'Tu sesión expiró o las credenciales no son correctas.';
    case 403:
      return 'No tenés permiso para hacer esta acción.';
    case 404:
      return 'No encontramos lo que buscabas. Puede que ya no exista.';
    case 409:
      return 'No se pudo completar porque el estado cambió. Actualizá e intentá de nuevo.';
    case 410:
      return 'El código expiró. Pedí uno nuevo.';
    case 413:
      return 'El archivo es demasiado grande. Probá con una foto más liviana.';
    case 429:
      return 'Demasiados intentos. Esperá un momento antes de reintentar.';
    case 502:
    case 503:
    case 504:
      return 'El servidor no está disponible en este momento. Probá de nuevo en unos minutos.';
    default:
      return 'Ocurrió un error en el servidor. Intentá de nuevo en unos minutos.';
  }
}

function mensajeDelServidor(data) {
  if (!data || typeof data !== 'object') return null;
  const msg = data.message ?? data.error;
  if (typeof msg !== 'string') return null;
  const limpio = msg.trim();
  // Descartar mensajes técnicos que se hayan filtrado (excepciones Java, rutas, etc.).
  if (!limpio || limpio.length > 220 || /exception|java\.|org\.|null|\bat\s+\w+\./i.test(limpio)) return null;
  return limpio;
}
