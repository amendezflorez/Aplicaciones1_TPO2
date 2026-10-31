import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIAS, MAX_BUSQUEDAS_RECIENTES, RANGOS_FECHA } from '../../config/constants';

// Caché de resultados de búsqueda cargados con éxito (Punto 6, sección 4.3 de
// PLAN_puntos_5_y_6.md): "si la persona realiza una búsqueda sin conexión, la app muestra
// los últimos resultados cargados exitosamente, con un aviso de que la información podría
// no estar actualizada". Se guarda un slot por criterio de búsqueda (filtros normalizados
// + orden), las últimas MAX_BUSQUEDAS_RECIENTES — mismo tope que las "últimas búsquedas"
// del buscador. Solo la primera página de cada una. Sin conexión, la pantalla pide la
// búsqueda actual: si está guardada se muestra esa; si no, la más reciente, avisando que
// es de otra búsqueda (con un resumen legible de sus filtros).
const CLAVE = 'offline:resultados:busquedas';
// Versión anterior (un único slot, sin importar los filtros): se borra al guardar.
const CLAVE_LEGACY = 'offline:resultados:ultimo';

// Coordenadas redondeadas a 3 decimales (~100 m): dos lecturas de GPS desde el mismo lugar
// casi nunca dan exactamente el mismo número y deben contar como la misma búsqueda.
const redondear = (n) => (n == null ? null : Math.round(Number(n) * 1000) / 1000);
const soloFecha = (iso) => (iso ? String(iso).slice(0, 10) : null);

function claveBusqueda(filtros = {}, orden = 'recientes') {
  const personalizado = filtros.rango === 'personalizado';
  const usaUbicacion = filtros.lat != null && filtros.lng != null;
  return JSON.stringify([
    filtros.tipoBuscado ?? null,
    filtros.categoria ?? null,
    filtros.texto ? filtros.texto.trim().toLowerCase().replace(/\s+/g, ' ') : null,
    usaUbicacion ? null : (filtros.barrioId ?? null),
    usaUbicacion ? redondear(filtros.lat) : null,
    usaUbicacion ? redondear(filtros.lng) : null,
    usaUbicacion ? (filtros.radioKm ?? null) : null,
    filtros.rango ?? null,
    personalizado ? soloFecha(filtros.desde) : null,
    personalizado ? soloFecha(filtros.hasta) : null,
    orden,
  ]);
}

async function leer() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

// "Perdí · Mascotas · "gato gris" · Palermo · Última semana". El nombre del barrio se toma
// de los propios resultados (filtrados por ese barrio, todos lo traen): sin conexión no se
// puede pedir GET /barrios para traducir el id.
function resumir(filtros, orden, data) {
  const partes = [filtros.tipoBuscado === 'perdido' ? 'Perdí' : 'Encontré'];
  partes.push(CATEGORIAS.find((c) => c.id === filtros.categoria)?.label ?? 'Cualquier categoría');
  if (filtros.texto?.trim()) partes.push(`"${filtros.texto.trim()}"`);
  if (filtros.lat != null && filtros.lng != null) {
    partes.push('Cerca de mi ubicación');
  } else if (filtros.barrioId) {
    partes.push(data.find((p) => p.barrio?.id === filtros.barrioId)?.barrio?.name ?? 'Un barrio');
  } else {
    partes.push('Cualquier lugar');
  }
  if (filtros.rango === 'personalizado' && filtros.desde && filtros.hasta) {
    const corta = (iso) => {
      const d = new Date(iso);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    };
    partes.push(`${corta(filtros.desde)} al ${corta(filtros.hasta)}`);
  } else if (filtros.rango) {
    partes.push(RANGOS_FECHA.find((r) => r.id === filtros.rango)?.label ?? filtros.rango);
  }
  if (orden === 'cercanos') partes.push('Más cercanos');
  return partes.join(' · ');
}

// Guarda (o reemplaza) la primera página de esta búsqueda y la pone primera en la lista.
export async function guardarResultados({ filtros, orden, data, total }) {
  try {
    const clave = claveBusqueda(filtros, orden);
    const entrada = { clave, filtros, orden, data, total, resumen: resumir(filtros, orden, data), cacheadoEn: Date.now() };
    const siguientes = [entrada, ...(await leer()).filter((e) => e.clave !== clave)].slice(0, MAX_BUSQUEDAS_RECIENTES);
    await AsyncStorage.setItem(CLAVE, JSON.stringify(siguientes));
    await AsyncStorage.removeItem(CLAVE_LEGACY);
  } catch {
    // best-effort, igual que el resto de este caché
  }
}

// Resultados guardados para mostrar sin conexión:
//  - { coincide: true, ...entrada }  si esta misma búsqueda está guardada;
//  - { coincide: false, ...entrada } con la última búsqueda guardada, si no;
//  - null si no hay nada guardado.
// `entrada` = { filtros, orden, data, total, resumen, cacheadoEn }.
export async function obtenerResultadosGuardados(filtros, orden) {
  const lista = await leer();
  if (lista.length === 0) return null;
  const clave = claveBusqueda(filtros, orden);
  const exacta = lista.find((e) => e.clave === clave);
  return exacta ? { ...exacta, coincide: true } : { ...lista[0], coincide: false };
}
