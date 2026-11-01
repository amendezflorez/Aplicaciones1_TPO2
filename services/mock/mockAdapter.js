// Backend simulado para desarrollo sin servidor real.
// Se activa con USE_MOCK en config/env.js y reemplaza el adapter de Axios, por lo que
// pantallas, servicios e interceptores funcionan exactamente igual que con la API real.
//
// Códigos de prueba:
//   - OTP válido: 123456        - OTP expirado: 000000 (responde 410)
//   - Usuario demo: demo@hallado.com / Demo1234 (5 devoluciones + insignia)
// Los datos se guardan en AsyncStorage: sobreviven al reiniciar la app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';

const DB_KEY = 'mockDb';
const LATENCY_MS = 400;
const VALID_OTP = '123456';
const EXPIRED_OTP = '000000';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const BARRIOS = [
  { id: 'b1', name: 'Palermo' },
  { id: 'b2', name: 'Belgrano' },
  { id: 'b3', name: 'Caballito' },
  { id: 'b4', name: 'Recoleta' },
  { id: 'b5', name: 'Villa Urquiza' },
  { id: 'b6', name: 'Flores' },
  { id: 'b7', name: 'Almagro' },
  { id: 'b8', name: 'San Telmo' },
];

const BADGE_SOLIDARIO = { code: 'VECINO_SOLIDARIO', label: 'Vecino solidario' };
const SOLIDARIO_MIN_RETURNS = 5;

const emptyReputation = () => ({ returnsCount: 0, positiveCount: 0, negativeCount: 0, score: 0 });

const seedDb = () => ({
  users: [
    {
      id: 'u-demo',
      email: 'demo@hallado.com',
      password: 'Demo1234',
      name: 'Demo Vecino',
      photoUrl: null,
      barrio: BARRIOS[0],
      phone: '1155550000',
      phoneVisible: false,
      memberSince: '2025-03-10T00:00:00Z',
      reputation: { returnsCount: 5, positiveCount: 7, negativeCount: 1, score: 6 },
    },
    {
      id: 'u-2',
      email: 'ana@hallado.com',
      password: 'Ana12345',
      name: 'Ana Gómez',
      photoUrl: null,
      barrio: BARRIOS[1],
      phone: '1155551111',
      phoneVisible: true,
      memberSince: '2026-01-20T00:00:00Z',
      reputation: { returnsCount: 2, positiveCount: 2, negativeCount: 0, score: 2 },
    },
  ],
});

let db = null;

async function loadDb() {
  if (db) return db;
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    db = raw ? JSON.parse(raw) : seedDb();
  } catch {
    db = seedDb();
  }
  if (!db.alertas) {
    db.alertas = [
      {
        id: 'al-1',
        usuarioId: 'u-demo',
        tipoBuscado: 'perdi',
        categoria: 'mascotas',
        texto: 'perro caniche',
        barrio: BARRIOS[0],
        creadaEn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ultimaRevision: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        novedadesCount: 2,
        pausada: false,
      },
      {
        id: 'al-2',
        usuarioId: 'u-demo',
        tipoBuscado: 'encontre',
        categoria: 'documentos',
        texto: 'dni',
        barrio: BARRIOS[1],
        creadaEn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ultimaRevision: new Date().toISOString(),
        novedadesCount: 0,
        pausada: true,
      },
    ];
  }
  if (!db.publicaciones) {
    db.publicaciones = [
      {
        id: 'pub-ana-1',
        publicadorId: 'u-2',
        tipo: 'encontrado',
        titulo: 'Llavero con 3 llaves en Plaza Serrano',
        descripcion: 'Encontré este llavero cerca de Plaza Serrano ayer por la tarde.',
        categoria: 'llaves',
        barrio: BARRIOS[0],
        fechaSuceso: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        franjaHoraria: 'tarde',
        lat: -34.5875,
        lng: -58.4205,
        fotoPrincipalUrl: null,
        fotos: [],
        estado: 'abierta',
        preguntaVerificacion: '¿De qué color es el llavero?',
      },
      {
        id: 'pub-ana-2',
        publicadorId: 'u-2',
        tipo: 'perdido',
        titulo: 'Se escapó mi perro caniche blanco',
        descripcion: 'Perro caniche toy blanco, responde al nombre de Toby.',
        categoria: 'mascotas',
        barrio: BARRIOS[3],
        fechaSuceso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        franjaHoraria: 'noche',
        lat: -34.5875,
        lng: -58.3974,
        fotoPrincipalUrl: null,
        fotos: [],
        estado: 'abierta',
        preguntaVerificacion: null,
      },
      {
        id: 'pub-ana-3',
        publicadorId: 'u-2',
        tipo: 'perdido',
        titulo: 'Perdí campera de jean en Parque Centenario',
        descripcion: 'Campera de jean azul clásica con un pin en la solapa.',
        categoria: 'ropa',
        barrio: BARRIOS[2],
        fechaSuceso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        franjaHoraria: 'tarde',
        lat: -34.616,
        lng: -58.436,
        fotoPrincipalUrl: null,
        fotos: [],
        estado: 'abierta',
        preguntaVerificacion: null,
      },
      {
        id: 'pub-demo-1',
        publicadorId: 'u-demo',
        tipo: 'perdido',
        titulo: 'Perdí DNI y SUBE en Belgrano',
        descripcion: 'Estuche transparente con DNI y tarjeta SUBE.',
        categoria: 'documentos',
        barrio: BARRIOS[1],
        fechaSuceso: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        franjaHoraria: 'manana',
        lat: -34.5633,
        lng: -58.455,
        fotoPrincipalUrl: null,
        fotos: [],
        estado: 'abierta',
        preguntaVerificacion: null,
      },
    ];
  }
  if (!db.seguimientos) {
    db.seguimientos = [
      {
        id: 'pub-seg-1',
        usuarioId: 'u-demo',
        tipo: 'encontre',
        titulo: 'Mochila negra con billetera',
        categoria: 'otros',
        barrio: BARRIOS[0],
        fechaSuceso: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lat: -34.588,
        lng: -58.43,
        fotoPrincipalUrl: null,
        estado: 'en_reclamo',
        ultimoEstadoVisto: 'abierta',
        cambioEstado: true,
      },
      {
        id: 'pub-seg-2',
        usuarioId: 'u-demo',
        tipo: 'perdido',
        titulo: 'Gato siamés con collar rojo',
        categoria: 'mascotas',
        barrio: BARRIOS[2],
        fechaSuceso: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        lat: -34.618,
        lng: -58.44,
        fotoPrincipalUrl: null,
        estado: 'abierta',
        ultimoEstadoVisto: 'abierta',
        cambioEstado: false,
      },
    ];
  }
  return db;
}

const saveDb = () => AsyncStorage.setItem(DB_KEY, JSON.stringify(db));

// Las insignias se derivan de la reputación (en el backend real las calcula el servidor).
const badgesFor = (user) =>
  user.reputation.returnsCount >= SOLIDARIO_MIN_RETURNS ? [BADGE_SOLIDARIO] : [];

const toOwnUser = ({ password, ...user }) => ({ ...user, badges: badgesFor(user) });

// Perfil público: sin email, teléfono ni historial.
const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  photoUrl: user.photoUrl,
  barrio: user.barrio,
  memberSince: user.memberSince,
  reputation: user.reputation,
  badges: badgesFor(user),
});

const toBase64Url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function createToken(userId) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${toBase64Url({ alg: 'none', typ: 'JWT' })}.${toBase64Url({ sub: userId, exp })}.mock`;
}

function userIdFromToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { sub, exp } = JSON.parse(atob(payload));
    return exp * 1000 > Date.now() ? sub : null;
  } catch {
    return null;
  }
}

const respond = (status, data = null) => ({ status, data });

function authUser(config) {
  const header = config.headers?.Authorization ?? '';
  const id = userIdFromToken(header.replace('Bearer ', ''));
  return db.users.find((u) => u.id === id) ?? null;
}

const normalizeEmail = (email = '') => email.trim().toLowerCase();

async function route(config) {
  const method = config.method.toLowerCase();
  const url = config.url;
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data ?? {};
  const key = `${method} ${url}`;

  // ---------- Autenticación ----------
  if (key === 'post /auth/register/request-otp') {
    const exists = db.users.some((u) => u.email === normalizeEmail(body.email));
    return exists ? respond(409) : respond(204);
  }

  if (key === 'post /auth/register/verify-otp') {
    if (body.code === EXPIRED_OTP) return respond(410);
    if (body.code !== VALID_OTP) return respond(400);
    return respond(200, { registrationToken: `reg:${normalizeEmail(body.email)}` });
  }

  if (key === 'post /auth/register/complete') {
    if (!body.registrationToken?.startsWith('reg:')) return respond(410);
    const email = body.registrationToken.slice(4);
    if (db.users.some((u) => u.email === email)) return respond(409);
    const user = {
      id: `u-${Date.now()}`,
      email,
      password: body.password,
      name: '',
      photoUrl: null,
      barrio: null,
      phone: null,
      phoneVisible: false,
      memberSince: new Date().toISOString(),
      reputation: emptyReputation(),
    };
    db.users.push(user);
    await saveDb();
    return respond(200, { token: createToken(user.id), user: toOwnUser(user) });
  }

  if (key === 'post /auth/login') {
    const user = db.users.find((u) => u.email === normalizeEmail(body.email));
    if (!user || user.password !== body.password) return respond(401);
    return respond(200, { token: createToken(user.id), user: toOwnUser(user) });
  }

  if (key === 'post /auth/password/forgot' || key === 'post /auth/otp/resend') {
    return respond(204);
  }

  if (key === 'post /auth/password/reset') {
    if (body.code === EXPIRED_OTP) return respond(410);
    if (body.code !== VALID_OTP) return respond(400);
    const user = db.users.find((u) => u.email === normalizeEmail(body.email));
    if (user) {
      user.password = body.newPassword;
      await saveDb();
    }
    return respond(204);
  }

  // ---------- Barrios ----------
  if (key === 'get /barrios') return respond(200, BARRIOS);

  // ---------- Perfil propio (requiere token) ----------
  if (url.startsWith('/users/me')) {
    const me = authUser(config);
    if (!me) return respond(401);

    if (key === 'get /users/me') return respond(200, toOwnUser(me));

    if (key === 'put /users/me') {
      const barrio = BARRIOS.find((b) => b.id === body.barrioId) ?? me.barrio;
      Object.assign(me, {
        name: body.name ?? me.name,
        barrio,
        phone: body.phone ?? null,
        phoneVisible: Boolean(body.phoneVisible),
      });
      await saveDb();
      return respond(200, toOwnUser(me));
    }

    if (key === 'post /users/me/photo') {
      // En RN, FormData guarda los campos en _parts; el mock reutiliza la URI local como URL.
      const part = config.data?._parts?.find(([field]) => field === 'photo');
      me.photoUrl = part?.[1]?.uri ?? me.photoUrl;
      await saveDb();
      return respond(200, { photoUrl: me.photoUrl });
    }
  }

  // ---------- Perfil público ----------
  const publicMatch = url.match(/^\/users\/([^/]+)\/public$/);
  if (method === 'get' && publicMatch) {
    if (!authUser(config)) return respond(401);
    const user = db.users.find((u) => u.id === publicMatch[1]);
    return user ? respond(200, toPublicUser(user)) : respond(404);
  }

  // ---------- Publicaciones (Puntos 3, 4 y 5) ----------
  if (url.startsWith('/publicaciones')) {
    const me = authUser(config);
    if (!me) return respond(401);

    if (key === 'get /publicaciones/mias') {
      const mias = (db.publicaciones || []).filter(p => p.publicadorId === me.id);
      return respond(200, mias);
    }

    const detalleMatch = url.match(/^\/publicaciones\/([^/]+)$/);
    if (method === 'get' && detalleMatch && !url.includes('/seguir') && !url.includes('/fotos')) {
      const p = (db.publicaciones || []).find(item => item.id === detalleMatch[1]);
      if (!p) return respond(404);
      const pubUser = db.users.find(u => u.id === p.publicadorId) || { id: p.publicadorId, name: 'Usuario', photoUrl: null, reputation: { returnsCount: 0, positiveCount: 0 } };
      const siguiendo = (db.seguimientos || []).some(s => s.usuarioId === me.id && s.id === p.id);
      return respond(200, {
        ...p,
        direccionExacta: p.publicadorId === me.id ? 'Dirección privada' : null,
        latExacta: null,
        lngExacta: null,
        publicador: { id: pubUser.id, name: pubUser.name, photoUrl: pubUser.photoUrl, reputation: pubUser.reputation },
        esPropia: p.publicadorId === me.id,
        yaReclame: false,
        siguiendo,
      });
    }

    if (method === 'get' && url === '/publicaciones') {
      const params = config.params || {};
      const tipoOpuesto =
        params.tipoBuscado === 'perdi' || params.tipoBuscado === 'perdido'
          ? 'encontrado'
          : params.tipoBuscado === 'encontre' || params.tipoBuscado === 'encontrado'
            ? 'perdido'
            : null;
      const filtradas = (db.publicaciones || []).filter(p => {
        if (tipoOpuesto && p.tipo !== tipoOpuesto) return false;
        if (params.categoria && p.categoria !== params.categoria) return false;
        if (params.barrioId && p.barrio?.id !== params.barrioId) return false;
        return true;
      });
      return respond(200, {
        data: filtradas,
        page: 0,
        size: 20,
        total: filtradas.length,
      });
    }
  }

  // ---------- Alertas (Punto 9) ----------
  if (url.startsWith('/alertas')) {
    const me = authUser(config);
    if (!me) return respond(401);

    if (key === 'get /alertas') {
      const list = (db.alertas || []).filter((a) => a.usuarioId === me.id);
      return respond(200, list);
    }

    if (key === 'post /alertas') {
      const barrio = body.barrioId ? BARRIOS.find((b) => b.id === body.barrioId) || null : null;
      const nueva = {
        id: `al-${Date.now()}`,
        usuarioId: me.id,
        tipoBuscado: body.tipoBuscado,
        categoria: body.categoria || null,
        texto: body.texto || null,
        barrio,
        creadaEn: new Date().toISOString(),
        ultimaRevision: new Date().toISOString(),
        novedadesCount: 0,
        pausada: false,
      };
      db.alertas = db.alertas || [];
      db.alertas.unshift(nueva);
      await saveDb();
      return respond(201, nueva);
    }

    const pausarMatch = url.match(/^\/alertas\/([^/]+)\/pausar$/);
    if (method === 'patch' && pausarMatch) {
      const alerta = (db.alertas || []).find((a) => a.id === pausarMatch[1] && a.usuarioId === me.id);
      if (!alerta) return respond(404);
      alerta.pausada = body?.pausada !== undefined ? body.pausada : !alerta.pausada;
      if (alerta.pausada) alerta.novedadesCount = 0;
      await saveDb();
      return respond(200, alerta);
    }

    const revisarMatch = url.match(/^\/alertas\/([^/]+)\/revisar$/);
    if (method === 'post' && revisarMatch) {
      const alerta = (db.alertas || []).find((a) => a.id === revisarMatch[1] && a.usuarioId === me.id);
      if (!alerta) return respond(404);
      alerta.novedadesCount = 0;
      alerta.ultimaRevision = new Date().toISOString();
      await saveDb();
      return respond(200, alerta);
    }

    const deleteMatch = url.match(/^\/alertas\/([^/]+)$/);
    if (method === 'delete' && deleteMatch) {
      db.alertas = (db.alertas || []).filter((a) => a.id !== deleteMatch[1]);
      await saveDb();
      return respond(204);
    }
  }

  // ---------- Seguimientos (Punto 9) ----------
  if (url === '/seguimientos' && method === 'get') {
    const me = authUser(config);
    if (!me) return respond(401);
    const list = (db.seguimientos || []).filter((s) => s.usuarioId === me.id);
    return respond(200, list);
  }

  const seguirMatch = url.match(/^\/publicaciones\/([^/]+)\/seguir$/);
  if (seguirMatch) {
    const me = authUser(config);
    if (!me) return respond(401);
    const pubId = seguirMatch[1];
    if (method === 'post') {
      const yaSigue = (db.seguimientos || []).some((s) => s.usuarioId === me.id && s.id === pubId);
      if (yaSigue) return respond(409);
      db.seguimientos = db.seguimientos || [];
      const pub = (db.publicaciones || []).find((p) => p.id === pubId);
      db.seguimientos.push({
        id: pubId,
        usuarioId: me.id,
        tipo: pub ? pub.tipo : 'perdido',
        titulo: pub ? pub.titulo : 'Publicación seguida',
        categoria: pub ? pub.categoria : 'otros',
        barrio: pub ? pub.barrio : BARRIOS[0],
        fechaSuceso: pub ? pub.fechaSuceso : new Date().toISOString(),
        lat: pub ? pub.lat : -34.6,
        lng: pub ? pub.lng : -58.4,
        fotoPrincipalUrl: pub ? pub.fotoPrincipalUrl : null,
        estado: pub ? pub.estado : 'abierta',
        ultimoEstadoVisto: pub ? pub.estado : 'abierta',
        cambioEstado: false,
      });
      await saveDb();
      return respond(204);
    }
    if (method === 'delete') {
      db.seguimientos = (db.seguimientos || []).filter((s) => !(s.usuarioId === me.id && s.id === pubId));
      await saveDb();
      return respond(204);
    }
  }

  const vistoMatch = url.match(/^\/seguimientos\/([^/]+)\/visto$/);
  if (method === 'post' && vistoMatch) {
    const me = authUser(config);
    if (!me) return respond(401);
    const item = (db.seguimientos || []).find((s) => s.usuarioId === me.id && s.id === vistoMatch[1]);
    if (item) {
      item.cambioEstado = false;
      item.ultimoEstadoVisto = item.estado;
      await saveDb();
    }
    return respond(204);
  }

  return respond(404);
}

// Adapter de Axios: recibe la config final de la request y devuelve la response.
export async function mockAdapter(config) {
  await loadDb();
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const { status, data } = await route(config);
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} };

  if (status >= 400) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      response
    );
  }
  return response;
}
