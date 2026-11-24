// Punto 11: formato del payload del QR de devolución.
// El QR contiene un JSON serializado; quien escanea lo parsea con JSON.parse y valida su forma.
export const QR_TIPO_DEVOLUCION = 'hallado_devolucion';
export const QR_VERSION = 1;

export function serializarQrDevolucion(publicacionId) {
  return JSON.stringify({
    tipo: QR_TIPO_DEVOLUCION,
    v: QR_VERSION,
    publicacionId: String(publicacionId),
  });
}

// Devuelve { publicacionId } si el contenido es un QR de devolución válido, o null si no lo es.
export function parsearQrDevolucion(contenido) {
  if (typeof contenido !== 'string' || !contenido.trim()) return null;
  let datos;
  try {
    datos = JSON.parse(contenido.trim());
  } catch {
    return null;
  }
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
  if (datos.tipo !== QR_TIPO_DEVOLUCION || datos.v !== QR_VERSION) return null;
  if (typeof datos.publicacionId !== 'string' || !datos.publicacionId.trim()) return null;
  return { publicacionId: datos.publicacionId.trim() };
}
