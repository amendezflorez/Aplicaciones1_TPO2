import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mockEncuentros';

async function readEncuentros() {
  try {
    return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '{}');
  } catch {
    return {};
  }
}

async function saveEncuentro(reclamoId, encuentro) {
  const encuentros = await readEncuentros();
  encuentros[reclamoId] = encuentro;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(encuentros));
  return encuentro;
}

export async function getEncuentroMock(reclamoId) {
  const encuentros = await readEncuentros();
  return encuentros[reclamoId] || saveEncuentro(reclamoId, {
    reclamoId,
    estado: 'sin_propuesta',
    propuestaActual: null,
    ubicacionAcordada: null,
  });
}

export async function proponerEncuentroMock(reclamoId, ubicacion, usuarioId) {
  const actual = await getEncuentroMock(reclamoId);
  const esContrapropuesta = ['pendiente', 'contrapropuesto'].includes(actual.estado);
  const propuesta = {
    id: `enc-${Date.now()}`,
    direccion: ubicacion.direccion,
    referencia: ubicacion.referencia || null,
    latitud: ubicacion.latitud ?? null,
    longitud: ubicacion.longitud ?? null,
    propuestoPorId: usuarioId || 'usuario-local',
    creadaEn: new Date().toISOString(),
    tipo: esContrapropuesta ? 'contrapropuesta' : 'propuesta',
  };

  return saveEncuentro(reclamoId, {
    reclamoId,
    estado: esContrapropuesta ? 'contrapropuesto' : 'pendiente',
    propuestaActual: propuesta,
    ubicacionAcordada: null,
  });
}

export async function aceptarEncuentroMock(reclamoId, propuestaId) {
  const actual = await getEncuentroMock(reclamoId);
  if (!actual.propuestaActual || actual.propuestaActual.id !== propuestaId) {
    throw new Error('La propuesta ya no está disponible.');
  }

  return saveEncuentro(reclamoId, {
    ...actual,
    estado: 'acordado',
    ubicacionAcordada: actual.propuestaActual,
  });
}