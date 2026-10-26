const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// "2026-01-15T00:00:00Z" -> "Miembro desde enero de 2026"
export function formatMemberSince(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return `Miembro desde ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}
