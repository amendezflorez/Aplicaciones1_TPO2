import { api } from './api';

// Búsqueda guardada (sección 3 del plan). "Guardar esta búsqueda como alerta" en
// ResultadosScreen llama a crearAlerta con los mismos filtros activos.
export const crearAlerta = async (filtros) => (await api.post('/alertas', filtros)).data;

// Cada alerta trae novedadesCount (publicaciones nuevas que matchean desde la última
// revisión, sin contar las propias) — lo consume el Punto 9 para el indicador agregado.
export const getAlertas = async () => (await api.get('/alertas')).data;

export const borrarAlerta = (id) => api.delete(`/alertas/${id}`);
