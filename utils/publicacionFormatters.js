const DIA_MS = 24 * 60 * 60 * 1000;

// "2026-10-27T10:00:00Z" -> "hoy" / "ayer" / "hace 5 días"
export function formatFechaRelativa(isoDate) {
  if (!isoDate) return '';
  const fecha = new Date(isoDate);
  if (Number.isNaN(fecha.getTime())) return '';
  const diffDias = Math.floor((Date.now() - fecha.getTime()) / DIA_MS);
  if (diffDias <= 0) return 'hoy';
  if (diffDias === 1) return 'ayer';
  return `hace ${diffDias} días`;
}

export function formatDistanciaKm(km) {
  if (km == null || Number.isNaN(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const FRANJA_LABELS = { mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
export function formatFranjaHoraria(franja) {
  return franja ? (FRANJA_LABELS[franja] ?? franja) : '';
}

// Arma un texto legible a partir de un resultado de Location.reverseGeocodeAsync (Punto 5,
// sección 10.x del plan): se usa como sugerencia editable de "dirección exacta" al tocar
// "Usar mi ubicación actual" en el wizard de publicar — nunca se manda tal cual sin que la
// persona la vea, el campo sigue siendo un TextField normal que puede corregir.
export function formatDireccionGeocodificada(direccion) {
  if (!direccion) return '';
  const calle = [direccion.street, direccion.streetNumber].filter(Boolean).join(' ');
  if (calle) return calle;
  return [direccion.district, direccion.city].filter(Boolean).join(', ');
}
