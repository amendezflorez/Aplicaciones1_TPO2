import { CATEGORIAS } from '../config/constants';
import { formatFecha } from './publicacionFormatters';

// Helpers del buscador (Punto 3): criterios -> texto/chips legibles, distancia y fechas.
//
// Forma de "filtros" (la misma que viaja a GET /publicaciones):
//   { tipoBuscado: 'perdido' | 'encontrado' | 'todos', categoria, texto, barrioId, lat, lng,
//     radioKm, rango, desde, hasta }
// 'perdido' = "yo perdí algo" (se listan los hallazgos de otros); 'encontrado' = "yo encontré
// algo" (se listan las pérdidas); 'todos' = explorar ambos tipos.

export const RADIOS_KM = [1, 3, 5, 10];
export const RADIO_KM_POR_DEFECTO = 5;

// Etiquetas cortas para chips (las de config/constants son más largas: "Últimos 3 días").
export const RANGO_CORTO = {
  hoy: 'Hoy',
  '3dias': '3 días',
  semana: 'Semana',
  personalizado: 'Elegir fechas',
};

const RANGO_RESUMEN = {
  hoy: 'Hoy',
  '3dias': 'Últimos 3 días',
  semana: 'Última semana',
};

export function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function finDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Distancia en km entre dos puntos (fórmula de Haversine).
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const rad = (g) => (Number(g) * Math.PI) / 180;
  const dLat = rad(lat2) - rad(lat1);
  const dLng = rad(lng2) - rad(lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const usaUbicacion = (filtros) => filtros?.lat != null && filtros?.lng != null;

// Texto de rango para el resumen ("Hoy", "12 nov al 18 nov"), o '' si no hay.
export function textoRango(filtros) {
  if (filtros.rango === 'personalizado') {
    if (filtros.desde && filtros.hasta) return `${formatFecha(filtros.desde)} al ${formatFecha(filtros.hasta)}`;
    return '';
  }
  return RANGO_RESUMEN[filtros.rango] ?? '';
}

// Frase del tipo de búsqueda para títulos y tarjetas.
export function textoTipo(tipoBuscado) {
  if (tipoBuscado === 'perdido') return 'Perdí algo';
  if (tipoBuscado === 'encontrado') return 'Encontré algo';
  return 'Todas las publicaciones';
}

// Lista de criterios activos como chips: [{ key, icon, label }]. El tipo va primero.
// barrioNombre viene aparte porque los filtros solo guardan el id del barrio.
export function criteriosDeFiltros(filtros, barrioNombre) {
  const criterios = [
    {
      key: 'tipo',
      icon: filtros.tipoBuscado === 'encontrado' ? 'hand-left-outline' : 'help-circle-outline',
      label: textoTipo(filtros.tipoBuscado),
    },
  ];
  if (filtros.tipoBuscado === 'todos') criterios[0].icon = 'earth-outline';
  const categoria = CATEGORIAS.find((c) => c.id === filtros.categoria);
  if (categoria) criterios.push({ key: 'categoria', icon: 'pricetag-outline', label: categoria.label });
  if (filtros.texto?.trim()) criterios.push({ key: 'texto', icon: 'search-outline', label: `"${filtros.texto.trim()}"` });
  if (usaUbicacion(filtros)) {
    criterios.push({
      key: 'lugar',
      icon: 'locate-outline',
      label: filtros.radioKm ? `A menos de ${filtros.radioKm} km` : 'Cerca de mi ubicación',
    });
  } else if (filtros.barrioId) {
    criterios.push({ key: 'lugar', icon: 'location-outline', label: barrioNombre ?? 'Un barrio' });
  }
  const rango = textoRango(filtros);
  if (rango) criterios.push({ key: 'rango', icon: 'calendar-outline', label: rango });
  return criterios;
}

// Resumen en una línea para "Últimas búsquedas": "Perdí · Llaves · Palermo · Hoy".
export function resumenDeFiltros(filtros, barrioNombre) {
  const partes = [];
  if (filtros.tipoBuscado === 'perdido') partes.push('Perdí');
  else if (filtros.tipoBuscado === 'encontrado') partes.push('Encontré');
  else partes.push('Todo');
  partes.push(CATEGORIAS.find((c) => c.id === filtros.categoria)?.label ?? 'Cualquier categoría');
  if (filtros.texto?.trim()) partes.push(`"${filtros.texto.trim()}"`);
  if (usaUbicacion(filtros)) partes.push('Cerca de mí');
  else if (filtros.barrioId) partes.push(barrioNombre ?? 'Un barrio');
  const rango = textoRango(filtros);
  if (rango) partes.push(rango);
  return partes.join(' · ');
}

// Clave estable de un conjunto de criterios: dos búsquedas distintas nunca colapsan en una
// sola en "Últimas búsquedas" (antes se deduplicaba por la etiqueta, que ignora el texto y
// las fechas). Las coordenadas se redondean (~100 m): dos lecturas de GPS son la misma búsqueda.
export function claveDeFiltros(filtros) {
  const r = (n) => (n == null ? null : Math.round(Number(n) * 1000) / 1000);
  const dia = (iso) => (iso ? String(iso).slice(0, 10) : null);
  const personalizado = filtros.rango === 'personalizado';
  return JSON.stringify([
    filtros.tipoBuscado ?? null,
    filtros.categoria ?? null,
    filtros.texto?.trim().toLowerCase() || null,
    usaUbicacion(filtros) ? null : (filtros.barrioId ?? null),
    r(filtros.lat),
    r(filtros.lng),
    filtros.radioKm ?? null,
    filtros.rango ?? null,
    personalizado ? dia(filtros.desde) : null,
    personalizado ? dia(filtros.hasta) : null,
  ]);
}

// Convierte el estado del selector de fechas a los campos de la query. El rango
// personalizado cubre los días completos: desde 00:00 del primer día hasta 23:59 del último.
export function paramsDeFecha(rango, desde, hasta) {
  if (!rango) return { rango: undefined, desde: undefined, hasta: undefined };
  if (rango !== 'personalizado') return { rango, desde: undefined, hasta: undefined };
  return {
    rango,
    desde: desde ? inicioDelDia(desde).toISOString() : undefined,
    hasta: hasta ? finDelDia(hasta).toISOString() : undefined,
  };
}
