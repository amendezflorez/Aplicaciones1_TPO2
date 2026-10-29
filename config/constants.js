export const STORAGE_KEYS = {
  token: 'token',
  biometricEnabled: 'biometricEnabled',
  ultimasBusquedas: 'ultimasBusquedas',
};

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 60;
export const PASSWORD_MIN_LENGTH = 8;

// Puntos 3/4 (buscador). Mismos valores que el enum Categoria del backend Java
// (backend/.../entity/Categoria.java) — "id" es lo que viaja en la URL/body.
export const CATEGORIAS = [
  { id: 'documentos', label: 'Documentos' },
  { id: 'llaves', label: 'Llaves' },
  { id: 'electronica', label: 'Electrónica' },
  { id: 'mascotas', label: 'Mascotas' },
  { id: 'ropa', label: 'Ropa' },
  { id: 'otros', label: 'Otros' },
];

export const RANGOS_FECHA = [
  { id: 'hoy', label: 'Hoy' },
  { id: '3dias', label: 'Últimos 3 días' },
  { id: 'semana', label: 'Última semana' },
  { id: 'personalizado', label: 'Elegir fechas' },
];

export const FRANJAS_HORARIAS = [
  { id: 'mañana', label: 'Mañana' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noche', label: 'Noche' },
];

export const SEARCH_PAGE_SIZE = 10;
export const MAX_BUSQUEDAS_RECIENTES = 5;
