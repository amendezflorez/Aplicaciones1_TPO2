import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  aceptarPropuestaEncuentro,
  decidirReclamo,
  getEncuentro,
  getMisReclamos,
  proponerEncuentro,
} from '../services/reclamosService';
import { getErrorMessage } from '../services/errors';

export const ReclamosContext = createContext(null);

export function ReclamosProvider({ children }) {
  const { status } = useAuth();
  const cargadoRef = useRef(false);
  const [reclamos, setReclamos] = useState([]);
  const [encuentros, setEncuentros] = useState({});
  // loading: solo la primera carga (antes de tener datos). refreshing: pull-to-refresh.
  // El polling periódico es silencioso: no toca ninguno de los dos (evita el parpadeo).
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState('');

  // refresh({ manual: true }) para pull-to-refresh; sin opciones es silencioso salvo la 1.ª carga.
  const refresh = useCallback(async (opciones) => {
    if (status !== 'authenticated') return false;
    const manual = opciones?.manual === true;
    if (manual) setRefreshing(true);
    else if (!cargadoRef.current) setLoading(true);
    try {
      setReclamos(await getMisReclamos());
      cargadoRef.current = true;
      setCargado(true);
      setError('');
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  const decidir = useCallback(async (reclamoId, decision) => {
    const actualizado = await decidirReclamo(reclamoId, decision);
    // Refleja el nuevo estado al instante y reconcilia con el servidor sin spinner.
    setReclamos((actuales) => actuales.map((item) => (
      item.id === reclamoId && actualizado?.estado ? { ...item, estado: actualizado.estado } : item
    )));
    refresh();
    return actualizado;
  }, [refresh]);

  const guardarEncuentro = useCallback((reclamoId, encuentro) => {
    setEncuentros((actuales) => ({ ...actuales, [reclamoId]: encuentro }));
    return encuentro;
  }, []);

  const cargarEncuentro = useCallback(async (reclamoId) => {
    const encuentro = await getEncuentro(reclamoId);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro]);

  const proponerUbicacion = useCallback(async (reclamoId, ubicacion) => {
    const encuentro = await proponerEncuentro(reclamoId, ubicacion);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro]);

  const aceptarUbicacion = useCallback(async (reclamoId, propuestaId) => {
    const encuentro = await aceptarPropuestaEncuentro(reclamoId, propuestaId);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro]);

  useEffect(() => {
    let active = true;
    const synchronizeSession = async () => {
      await Promise.resolve();
      if (!active) return;
      if (status === 'authenticated') {
        await refresh();
      } else {
        setReclamos([]);
        setEncuentros({});
        setError('');
        setCargado(false);
        cargadoRef.current = false;
      }
    };
    synchronizeSession();
    return () => {
      active = false;
    };
  }, [status, refresh]);

  const value = useMemo(
    () => ({
      reclamos,
      encuentros,
      loading,
      refreshing,
      cargado,
      error,
      refresh,
      decidir,
      cargarEncuentro,
      proponerUbicacion,
      aceptarUbicacion,
    }),
    [reclamos, encuentros, loading, refreshing, cargado, error, refresh, decidir, cargarEncuentro, proponerUbicacion, aceptarUbicacion]
  );

  return <ReclamosContext.Provider value={value}>{children}</ReclamosContext.Provider>;
}