// Backend simulado para desarrollo sin servidor real.
// Se activa con USE_MOCK en config/env.js y reemplaza el adapter de Axios, por lo que
// pantallas, servicios e interceptores funcionan exactamente igual que con la API real.
//
// Códigos de prueba:
//   - OTP válido: 123456        - OTP expirado: 000000 (responde 410)
//   - Usuario demo: demo@hallado.com / Demo1234 (5 devoluciones + insignia)
//   - Reclamos demo: incluye pendientes, rechazados y vencidos.
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
  if (db.encuentros !== undefined) {
    delete db.encuentros;
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
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
  const ahora = Date.now();
  db.publicaciones = db.publicaciones || [];
  if (!db.publicaciones.some((publicacion) => publicacion.id === 'pub-mapa-demo')) {
    db.publicaciones.push({
      id: 'pub-mapa-demo',
      publicadorId: 'u-2',
      tipo: 'encontrado',
      titulo: 'Encontré una mochila azul en Parque Las Heras',
      descripcion: 'Mochila azul con un cuaderno universitario adentro.',
      categoria: 'otros',
      barrio: BARRIOS[3],
      fechaSuceso: new Date(ahora - 24 * 60 * 60 * 1000).toISOString(),
      franjaHoraria: 'tarde',
      lat: -34.5855,
      lng: -58.4052,
      fotoPrincipalUrl: null,
      fotos: [],
      estado: 'en_reclamo',
      preguntaVerificacion: '¿Qué color tiene la mochila?',
    });
  }
  if (!db.publicaciones.some((publicacion) => publicacion.id === 'pub-es-mio-demo')) {
    db.publicaciones.push({
      id: 'pub-es-mio-demo',
      publicadorId: 'u-2',
      tipo: 'encontrado',
      titulo: 'Encontré auriculares inalámbricos en San Telmo',
      descripcion: 'Estuche negro de auriculares encontrado cerca del parque.',
      categoria: 'electronica',
      barrio: BARRIOS[7],
      fechaSuceso: new Date(ahora - 24 * 60 * 60 * 1000).toISOString(),
      franjaHoraria: 'tarde',
      lat: -34.621,
      lng: -58.3731,
      fotoPrincipalUrl: null,
      fotos: [],
      estado: 'abierta',
      preguntaVerificacion: '¿Qué marca y color tienen los auriculares?',
    });
    await saveDb();
  }
  if (!db.publicaciones.some((publicacion) => publicacion.id === 'pub-mapa-extra-demo')) {
    db.publicaciones.push({
      id: 'pub-mapa-extra-demo',
      publicadorId: 'u-2',
      tipo: 'encontrado',
      titulo: 'Encontré una billetera roja en Plaza Dorrego',
      descripcion: 'Billetera roja encontrada cerca de la feria de San Telmo.',
      categoria: 'documentos',
      barrio: BARRIOS[7],
      fechaSuceso: new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString(),
      franjaHoraria: 'manana',
      lat: -34.6218,
      lng: -58.3736,
      fotoPrincipalUrl: null,
      fotos: [],
      estado: 'en_reclamo',
      preguntaVerificacion: '¿Qué tarjeta guardabas en la billetera?',
    });
    await saveDb();
  }
  if (!db.publicaciones.some((publicacion) => publicacion.id === 'pub-reclamo-recibido-mapa-demo')) {
    db.publicaciones.push({
      id: 'pub-reclamo-recibido-mapa-demo',
      publicadorId: 'u-demo',
      tipo: 'encontrado',
      titulo: 'Encontré una cámara fotográfica en Recoleta',
      descripcion: 'Cámara compacta negra encontrada cerca del centro cultural.',
      categoria: 'electronica',
      barrio: BARRIOS[3],
      fechaSuceso: new Date(ahora - 24 * 60 * 60 * 1000).toISOString(),
      franjaHoraria: 'tarde',
      lat: -34.5875,
      lng: -58.3974,
      fotoPrincipalUrl: null,
      fotos: [],
      estado: 'en_reclamo',
      preguntaVerificacion: '¿Qué marca tiene la cámara?',
    });
    await saveDb();
  }
  const reclamosDemo = [
      {
        id: 'reclamo-recibido-demo',
        publicacionId: 'pub-demo-1',
        publicacionTitulo: 'Perdí DNI y SUBE en Belgrano',
        publicadorId: 'u-demo',
        publicadorNombre: 'Demo Vecino',
        publicadorFotoUrl: null,
        autorId: 'u-2',
        autorNombre: 'Ana Gómez',
        autorFotoUrl: null,
        tipo: 'lo_encontre',
        respuestaPregunta: null,
        descripcion: 'Encontré un estuche transparente con una tarjeta SUBE.',
        fotoUrl: 'https://picsum.photos/seed/hallado-evidencia/640/480',
        barrioEncontrado: BARRIOS[1],
        estado: 'pendiente',
        creadaEn: new Date(ahora - 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 47 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-enviado-demo',
        publicacionId: 'pub-ana-1',
        publicacionTitulo: 'Llavero con 3 llaves en Plaza Serrano',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'Tiene tres llaves y el llavero es de cuero marrón.',
        descripcion: 'Lo perdí al salir de la estación.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'pendiente',
        creadaEn: new Date(ahora - 2 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 46 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-encuentro-demo',
        publicacionId: 'pub-ana-2',
        publicacionTitulo: 'Se escapó mi perro caniche blanco',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'lo_encontre',
        respuestaPregunta: null,
        descripcion: 'Lo encontré cerca de Plaza Francia y lo tengo a resguardo.',
        fotoUrl: 'https://picsum.photos/seed/hallado-perro-encontrado/640/480',
        barrioEncontrado: BARRIOS[3],
        estado: 'aceptado',
        creadaEn: new Date(ahora - 5 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 43 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-recibido-rechazado-demo',
        publicacionId: 'pub-demo-1',
        publicacionTitulo: 'Perdí DNI y SUBE en Belgrano',
        publicadorId: 'u-demo',
        publicadorNombre: 'Demo Vecino',
        publicadorFotoUrl: null,
        autorId: 'u-2',
        autorNombre: 'Ana Gómez',
        autorFotoUrl: null,
        tipo: 'lo_encontre',
        respuestaPregunta: null,
        descripcion: 'Vi un estuche parecido junto a la parada del colectivo.',
        fotoUrl: 'https://picsum.photos/seed/hallado-evidencia-rechazada/640/480',
        barrioEncontrado: BARRIOS[1],
        estado: 'rechazado',
        creadaEn: new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora - 2 * 24 * 60 * 60 * 1000 + 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-recibido-pendiente-extra-demo',
        publicacionId: 'pub-demo-1',
        publicacionTitulo: 'Perdí DNI y SUBE en Belgrano',
        publicadorId: 'u-demo',
        publicadorNombre: 'Demo Vecino',
        publicadorFotoUrl: null,
        autorId: 'u-test',
        autorNombre: 'Lucía Pérez',
        autorFotoUrl: null,
        tipo: 'lo_encontre',
        respuestaPregunta: null,
        descripcion: 'Encontré un estuche con documentos cerca de la estación.',
        fotoUrl: 'https://picsum.photos/seed/hallado-evidencia-pendiente/640/480',
        barrioEncontrado: BARRIOS[1],
        estado: 'pendiente',
        creadaEn: new Date(ahora - 30 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 47.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-recibido-vencido-demo',
        publicacionId: 'pub-demo-1',
        publicacionTitulo: 'Perdí DNI y SUBE en Belgrano',
        publicadorId: 'u-demo',
        publicadorNombre: 'Demo Vecino',
        publicadorFotoUrl: null,
        autorId: 'u-2',
        autorNombre: 'Ana Gómez',
        autorFotoUrl: null,
        tipo: 'lo_encontre',
        respuestaPregunta: null,
        descripcion: 'Encontré un estuche cerca de la estación Belgrano.',
        fotoUrl: 'https://picsum.photos/seed/hallado-evidencia-vencida/640/480',
        barrioEncontrado: BARRIOS[1],
        estado: 'vencido',
        creadaEn: new Date(ahora - 4 * 24 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-enviado-rechazado-demo',
        publicacionId: 'pub-ana-1',
        publicacionTitulo: 'Llavero con 3 llaves en Plaza Serrano',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'Tiene tres llaves plateadas y el llavero es marrón.',
        descripcion: 'Creo que lo perdí cerca de la plaza.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'rechazado',
        creadaEn: new Date(ahora - 3 * 24 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora - 3 * 24 * 60 * 60 * 1000 + 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-enviado-vencido-demo',
        publicacionId: 'pub-ana-1',
        publicacionTitulo: 'Llavero con 3 llaves en Plaza Serrano',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'Un llavero de cuero marrón con tres llaves.',
        descripcion: 'Dejé mi teléfono para que me contacten.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'vencido',
        creadaEn: new Date(ahora - 5 * 24 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-enviado-mapa-demo',
        publicacionId: 'pub-mapa-demo',
        publicacionTitulo: 'Encontré una mochila azul en Parque Las Heras',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'La mochila es azul.',
        descripcion: 'Tiene un cuaderno universitario con mi nombre.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'aceptado',
        creadaEn: new Date(ahora - 3 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 45 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-enviado-mapa-extra-demo',
        publicacionId: 'pub-mapa-extra-demo',
        publicacionTitulo: 'Encontré una billetera roja en Plaza Dorrego',
        publicadorId: 'u-2',
        publicadorNombre: 'Ana Gómez',
        publicadorFotoUrl: null,
        autorId: 'u-demo',
        autorNombre: 'Demo Vecino',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'Guardaba mi tarjeta SUBE.',
        descripcion: 'La billetera tiene una pequeña marca en una esquina.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'aceptado',
        creadaEn: new Date(ahora - 90 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 46.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reclamo-recibido-proponer-encuentro-demo',
        publicacionId: 'pub-reclamo-recibido-mapa-demo',
        publicacionTitulo: 'Encontré una cámara fotográfica en Recoleta',
        publicadorId: 'u-demo',
        publicadorNombre: 'Demo Vecino',
        publicadorFotoUrl: null,
        autorId: 'u-2',
        autorNombre: 'Ana Gómez',
        autorFotoUrl: null,
        tipo: 'es_mio',
        respuestaPregunta: 'La cámara es una Canon.',
        descripcion: 'Tiene una correa roja que le agregué.',
        fotoUrl: null,
        barrioEncontrado: null,
        estado: 'aceptado',
        creadaEn: new Date(ahora - 2 * 60 * 60 * 1000).toISOString(),
        venceEn: new Date(ahora + 46 * 60 * 60 * 1000).toISOString(),
      },
  ];
  db.reclamos = db.reclamos || [];
  let agregoReclamoDemo = false;
  for (const reclamo of reclamosDemo) {
    if (!db.reclamos.some((existente) => existente.id === reclamo.id)) {
      db.reclamos.push(reclamo);
      agregoReclamoDemo = true;
    }
  }
  if (agregoReclamoDemo) await saveDb();

  if (!db.casos) {
    db.casos = [
      {
        id: 'caso-1',
        publicacionId: 'pub-demo-1',
        publicacionTitulo: 'Perdí DNI y SUBE en Belgrano',
        publicacionCategoria: 'documentos',
        publicacionFotoPrincipalUrl: null,
        devolvedorId: 'u-demo',
        recuperadorId: 'u-2',
        fechaResolucion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'caso-2',
        publicacionId: 'pub-ana-1',
        publicacionTitulo: 'Llavero con 3 llaves en Plaza Serrano',
        publicacionCategoria: 'llaves',
        publicacionFotoPrincipalUrl: null,
        devolvedorId: 'u-2',
        recuperadorId: 'u-demo',
        fechaResolucion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
  if (!db.valoraciones) {
    db.valoraciones = [
      {
        id: 'val-1',
        casoId: 'caso-1',
        autorId: 'u-2',
        destinatarioId: 'u-demo',
        positiva: true,
        comentario: 'Excelente vecino, me devolvió todo intacto y a tiempo.',
        agradecimientoPublico: '¡Muchísimas gracias Demo por tu enorme honestidad y buena onda!',
        creadaEn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
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

function toReclamoResponse(reclamo) {
const {
  id,
  publicacionId,
  tipo,
  respuestaPregunta,
  descripcion,
  fotoUrl,
  barrioEncontrado,
  estado,
  creadaEn,
} = reclamo;
return { id, publicacionId, tipo, respuestaPregunta, descripcion, fotoUrl, barrioEncontrado, estado, creadaEn };
}

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

  // ---------- Reclamos y devolución (Puntos 7 y 8) ----------
  if (url.startsWith('/reclamos')) {
    const me = authUser(config);
    if (!me) return respond(401);

    if (key === 'get /reclamos') {
      const ahora = Date.now();
      const reclamos = (db.reclamos || []).filter(
        (reclamo) => reclamo.autorId === me.id || reclamo.publicadorId === me.id
      );
      reclamos.forEach((reclamo) => {
        if (reclamo.estado === 'pendiente' && new Date(reclamo.venceEn).getTime() <= ahora) {
          reclamo.estado = 'vencido';
        }
      });
      return respond(200, reclamos);
    }

    if (key === 'post /reclamos/foto') {
      const part = config.data?._parts?.find(([field]) => field === 'foto');
      if (!part?.[1]?.uri) return respond(400, { message: 'La foto es obligatoria.' });
      return respond(200, { photoUrl: part[1].uri });
    }

    const decisionMatch = url.match(/^\/reclamos\/([^/]+)\/decision$/);
    if (method === 'patch' && decisionMatch) {
      const reclamo = (db.reclamos || []).find((item) => item.id === decisionMatch[1]);
      if (!reclamo) return respond(404);
      if (reclamo.publicadorId !== me.id) return respond(403);
      if (reclamo.estado !== 'pendiente') return respond(409);
      if (body.decision !== 'aceptar' && body.decision !== 'rechazar') return respond(400);

      reclamo.estado = body.decision === 'aceptar' ? 'aceptado' : 'rechazado';
      await saveDb();
      return respond(200, toReclamoResponse(reclamo));
    }
  }

  // ---------- Publicaciones (Puntos 3, 4 y 5) ----------
  if (url.startsWith('/publicaciones')) {
    const me = authUser(config);
    if (!me) return respond(401);

    if (key === 'get /publicaciones/mias') {
      const mias = (db.publicaciones || []).filter(p => p.publicadorId === me.id);
      return respond(200, mias);
    }

    const reclamoMatch = url.match(/^\/publicaciones\/([^/]+)\/reclamos(\/mio)?$/);
    if (reclamoMatch) {
      const publicacion = (db.publicaciones || []).find((item) => item.id === reclamoMatch[1]);
      if (!publicacion) return respond(404);

      if (method === 'get' && reclamoMatch[2] === '/mio') {
        const reclamo = (db.reclamos || []).find(
          (item) => item.publicacionId === publicacion.id && item.autorId === me.id
        );
        return respond(200, reclamo ? toReclamoResponse(reclamo) : null);
      }

      if (method === 'post' && !reclamoMatch[2]) {
        if (publicacion.publicadorId === me.id) return respond(400);
        const tipo = body.tipo;
        const tipoValido = (publicacion.tipo === 'encontrado' && tipo === 'es_mio')
          || (publicacion.tipo === 'perdido' && tipo === 'lo_encontre');
        if (!tipoValido) return respond(400);
        if (tipo === 'es_mio' && (!publicacion.preguntaVerificacion || !body.respuestaPregunta?.trim())) {
          return respond(400);
        }
        const barrioEncontrado = tipo === 'lo_encontre'
          ? BARRIOS.find((barrio) => barrio.id === body.barrioId)
          : null;
        if (tipo === 'lo_encontre' && (!body.fotoUrl || !barrioEncontrado)) return respond(400);

        db.reclamos = db.reclamos || [];
        const intentos = db.reclamos.filter(
          (item) => item.publicacionId === publicacion.id && item.autorId === me.id
        ).length;
        if (intentos >= 3) return respond(409);
        const publicador = db.users.find((user) => user.id === publicacion.publicadorId);
        const reclamo = {
          id: `reclamo-${Date.now()}`,
          publicacionId: publicacion.id,
          publicacionTitulo: publicacion.titulo,
          publicadorId: publicacion.publicadorId,
          publicadorNombre: publicador?.name || 'Usuario',
          publicadorFotoUrl: publicador?.photoUrl || null,
          autorId: me.id,
          autorNombre: me.name,
          autorFotoUrl: me.photoUrl,
          tipo,
          respuestaPregunta: tipo === 'es_mio' ? body.respuestaPregunta.trim() : null,
          descripcion: typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null,
          fotoUrl: tipo === 'lo_encontre' ? body.fotoUrl : body.fotoUrl || null,
          barrioEncontrado,
          estado: 'pendiente',
          creadaEn: new Date().toISOString(),
          venceEn: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        };
        db.reclamos.unshift(reclamo);
        publicacion.estado = 'en_reclamo';
        await saveDb();
        return respond(201, toReclamoResponse(reclamo));
      }
    }

    const detalleMatch = url.match(/^\/publicaciones\/([^/]+)$/);
    if (method === 'get' && detalleMatch && !url.includes('/seguir') && !url.includes('/fotos')) {
      const p = (db.publicaciones || []).find(item => item.id === detalleMatch[1]);
      if (!p) return respond(404);
      const pubUser = db.users.find(u => u.id === p.publicadorId) || { id: p.publicadorId, name: 'Usuario', photoUrl: null, reputation: { returnsCount: 0, positiveCount: 0 } };
      const siguiendo = (db.seguimientos || []).some(s => s.usuarioId === me.id && s.id === p.id);
      const yaReclame = (db.reclamos || []).some(
        (reclamo) => reclamo.publicacionId === p.id
          && reclamo.autorId === me.id
          && ['pendiente', 'aceptado'].includes(reclamo.estado)
      );
      return respond(200, {
        ...p,
        direccionExacta: p.publicadorId === me.id ? 'Dirección privada' : null,
        latExacta: null,
        lngExacta: null,
        publicador: { id: pubUser.id, name: pubUser.name, photoUrl: pubUser.photoUrl, reputation: pubUser.reputation },
        esPropia: p.publicadorId === me.id,
        yaReclame,
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

  // ---------- Historial y Valoraciones (Punto 10) ----------
  if (url.startsWith('/historial')) {
    const me = authUser(config);
    if (!me) return respond(401);

    const casoMatch = url.match(/^\/historial\/([^/]+)$/);
    if (method === 'get' && casoMatch) {
      const caso = (db.casos || []).find((c) => c.id === casoMatch[1]);
      if (!caso) return respond(404);
      if (caso.devolvedorId !== me.id && caso.recuperadorId !== me.id) return respond(403);

      const esDev = caso.devolvedorId === me.id;
      const contraId = esDev ? caso.recuperadorId : caso.devolvedorId;
      const contraUser = db.users.find((u) => u.id === contraId) || { id: contraId, name: 'Usuario', photoUrl: null };

      const miVal = (db.valoraciones || []).find((v) => v.casoId === caso.id && v.autorId === me.id);
      const recVal = (db.valoraciones || []).find((v) => v.casoId === caso.id && v.autorId === contraId);

      const resolucionMs = new Date(caso.fechaResolucion).getTime();
      const limiteMs = resolucionMs + 7 * 24 * 60 * 60 * 1000;
      const ahoraMs = Date.now();
      const dentroDePlazo = ahoraMs < limiteMs;
      const diasRestantes = dentroDePlazo ? Math.max(0, Math.ceil((limiteMs - ahoraMs) / (24 * 60 * 60 * 1000))) : 0;

      return respond(200, {
        id: caso.id,
        publicacionId: caso.publicacionId,
        publicacionTitulo: caso.publicacionTitulo,
        publicacionCategoria: caso.publicacionCategoria,
        publicacionFotoPrincipalUrl: caso.publicacionFotoPrincipalUrl,
        tipo: esDev ? 'devolvi' : 'recupere',
        fechaResolucion: caso.fechaResolucion,
        contraparte: { id: contraUser.id, name: contraUser.name, photoUrl: contraUser.photoUrl },
        puedeValorar: !miVal && dentroDePlazo,
        diasRestantesParaValorar: diasRestantes,
        miValoracion: miVal || null,
        valoracionRecibida: recVal || null,
      });
    }

    const valorarMatch = url.match(/^\/historial\/([^/]+)\/valorar$/);
    if (method === 'post' && valorarMatch) {
      const caso = (db.casos || []).find((c) => c.id === valorarMatch[1]);
      if (!caso) return respond(404);
      if (caso.devolvedorId !== me.id && caso.recuperadorId !== me.id) return respond(403);

      const resolucionMs = new Date(caso.fechaResolucion).getTime();
      if (Date.now() > resolucionMs + 7 * 24 * 60 * 60 * 1000) {
        return respond(400, { message: 'El plazo de 7 días para valorar ha expirado.' });
      }

      const yaValoro = (db.valoraciones || []).some((v) => v.casoId === caso.id && v.autorId === me.id);
      if (yaValoro) return respond(409, { message: 'Ya valoraste este caso.' });

      const esDev = caso.devolvedorId === me.id;
      const destinatarioId = esDev ? caso.recuperadorId : caso.devolvedorId;

      const nuevaVal = {
        id: `val-${Date.now()}`,
        casoId: caso.id,
        autorId: me.id,
        destinatarioId,
        positiva: !!body.positiva,
        comentario: body.comentario ? String(body.comentario).trim() : null,
        agradecimientoPublico: !esDev && body.agradecimientoPublico ? String(body.agradecimientoPublico).trim() : null,
        creadaEn: new Date().toISOString(),
      };

      db.valoraciones = db.valoraciones || [];
      db.valoraciones.push(nuevaVal);

      // Actualizar reputación de destinatario
      const destUser = db.users.find((u) => u.id === destinatarioId);
      if (destUser && destUser.reputation) {
        if (nuevaVal.positiva) {
          destUser.reputation.positiveCount += 1;
          if (destinatarioId === caso.devolvedorId) {
            destUser.reputation.returnsCount += 1;
          }
        } else {
          destUser.reputation.negativeCount += 1;
        }
        destUser.reputation.score = destUser.reputation.positiveCount - destUser.reputation.negativeCount;
      }

      await saveDb();

      return respond(200, {
        id: caso.id,
        publicacionId: caso.publicacionId,
        publicacionTitulo: caso.publicacionTitulo,
        publicacionCategoria: caso.publicacionCategoria,
        publicacionFotoPrincipalUrl: caso.publicacionFotoPrincipalUrl,
        tipo: esDev ? 'devolvi' : 'recupere',
        fechaResolucion: caso.fechaResolucion,
        contraparte: { id: destinatarioId, name: destUser?.name || 'Usuario', photoUrl: destUser?.photoUrl || null },
        puedeValorar: false,
        diasRestantesParaValorar: 0,
        miValoracion: nuevaVal,
        valoracionRecibida: (db.valoraciones || []).find((v) => v.casoId === caso.id && v.autorId === destinatarioId) || null,
      });
    }

    if (method === 'get' && url === '/historial') {
      const params = config.params || {};
      const tipoFiltro = params.tipo;

      const casosMios = (db.casos || []).filter((c) => {
        const esDev = c.devolvedorId === me.id;
        const esRec = c.recuperadorId === me.id;
        if (!esDev && !esRec) return false;
        if (tipoFiltro === 'devolvi' && !esDev) return false;
        if (tipoFiltro === 'recupere' && !esRec) return false;

        const fechaMs = new Date(c.fechaResolucion).getTime();
        if (params.desde && fechaMs < new Date(params.desde).getTime()) return false;
        if (params.hasta && fechaMs > new Date(params.hasta).getTime()) return false;
        return true;
      });

      const ahoraMs = Date.now();
      const resultado = casosMios.map((caso) => {
        const esDev = caso.devolvedorId === me.id;
        const contraId = esDev ? caso.recuperadorId : caso.devolvedorId;
        const contraUser = db.users.find((u) => u.id === contraId) || { id: contraId, name: 'Usuario', photoUrl: null };

        const miVal = (db.valoraciones || []).find((v) => v.casoId === caso.id && v.autorId === me.id);
        const recVal = (db.valoraciones || []).find((v) => v.casoId === caso.id && v.autorId === contraId);

        const resolucionMs = new Date(caso.fechaResolucion).getTime();
        const limiteMs = resolucionMs + 7 * 24 * 60 * 60 * 1000;
        const dentroDePlazo = ahoraMs < limiteMs;
        const diasRestantes = dentroDePlazo ? Math.max(0, Math.ceil((limiteMs - ahoraMs) / (24 * 60 * 60 * 1000))) : 0;

        return {
          id: caso.id,
          publicacionId: caso.publicacionId,
          publicacionTitulo: caso.publicacionTitulo,
          publicacionCategoria: caso.publicacionCategoria,
          publicacionFotoPrincipalUrl: caso.publicacionFotoPrincipalUrl,
          tipo: esDev ? 'devolvi' : 'recupere',
          fechaResolucion: caso.fechaResolucion,
          contraparte: { id: contraUser.id, name: contraUser.name, photoUrl: contraUser.photoUrl },
          puedeValorar: !miVal && dentroDePlazo,
          diasRestantesParaValorar: diasRestantes,
          miValoracion: miVal || null,
          valoracionRecibida: recVal || null,
        };
      });

      return respond(200, resultado);
    }
  }

  const agradecimientosMatch = url.match(/^\/users\/([^/]+)\/agradecimientos$/);
  if (method === 'get' && agradecimientosMatch) {
    const targetUserId = agradecimientosMatch[1];
    const lista = (db.valoraciones || [])
      .filter((v) => v.destinatarioId === targetUserId && v.agradecimientoPublico)
      .map((v) => {
        const autor = db.users.find((u) => u.id === v.autorId) || { name: 'Vecino', photoUrl: null };
        const caso = (db.casos || []).find((c) => c.id === v.casoId);
        return {
          id: v.id,
          autorNombre: autor.name,
          autorFotoUrl: autor.photoUrl,
          objeto: caso?.publicacionTitulo || 'Objeto devuelto',
          mensaje: v.agradecimientoPublico,
          fecha: v.creadaEn,
        };
      });
    return respond(200, lista);
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
