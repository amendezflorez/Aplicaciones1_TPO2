import { API_BASE_URL } from '../config/env';

const BASE = API_BASE_URL.replace(/\/+$/, '');

// Las fotos subidas al backend (perfil, publicaciones, reclamos) se sirven en
// <API_BASE_URL>/uploads/<archivo>. El backend guarda en la base la URL absoluta con el
// host que usó el cliente al subirla (localhost, 10.0.2.2, la IP de la PC de turno...),
// que desde otro dispositivo o con otra IP no resuelve. Por eso cualquier URL de
// /uploads/ — absoluta con cualquier host, o relativa — se rearma contra API_BASE_URL.
// URLs externas (p. ej. picsum.photos del seed) y URIs locales (file://, content://) se
// devuelven tal cual. Usado por Avatar, PhotoGallery, PublicationCard, ReclamoCard y el
// caché offline de detalles.
const UPLOADS = /^(?:https?:\/\/[^/]+)?(?:\/api)?(\/uploads\/.+)$/i;

export function resolverUrlFoto(url) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(UPLOADS);
  return match ? `${BASE}${match[1]}` : url;
}
