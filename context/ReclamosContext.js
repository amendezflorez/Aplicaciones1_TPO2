import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
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
  const { status, user } = useAuth();
  const [reclamos, setReclamos] = useState([]);
  const [encuentros, setEncuentros] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return false;
    setLoading(true);
    setError('');
    try {
      setReclamos(await getMisReclamos());
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
    }
  }, [status]);

  const decidir = useCallback(async (reclamoId, decision) => {
    await decidirReclamo(reclamoId, decision);
    await refresh();
  }, [refresh]);

  const guardarEncuentro = useCallback((reclamoId, encuentro) => {
    setEncuentros((actuales) => ({ ...actuales, [reclamoId]: encuentro }));
    return encuentro;
  }, []);

  const cargarEncuentro = useCallback(async (reclamoId) => {
    const reclamo = reclamos.find((item) => item.id === reclamoId);
    const encuentro = await getEncuentro(reclamoId, user?.id, reclamo?.publicacionTitulo);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro, reclamos, user?.id]);

  const proponerUbicacion = useCallback(async (reclamoId, ubicacion) => {
    const encuentro = await proponerEncuentro(reclamoId, ubicacion, user?.id);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro, user?.id]);

  const aceptarUbicacion = useCallback(async (reclamoId, propuestaId) => {
    const encuentro = await aceptarPropuestaEncuentro(reclamoId, propuestaId);
    return guardarEncuentro(reclamoId, encuentro);
  }, [guardarEncuentro]);

  useEffect(() => {
    if (status === 'authenticated') refresh();
    else {
      setReclamos([]);
      setEncuentros({});
      setError('');
    }
  }, [status, refresh]);

  const value = useMemo(
    () => ({
      reclamos,
      encuentros,
      loading,
      error,
      refresh,
      decidir,
      cargarEncuentro,
      proponerUbicacion,
      aceptarUbicacion,
    }),
    [reclamos, encuentros, loading, error, refresh, decidir, cargarEncuentro, proponerUbicacion, aceptarUbicacion]
  );

  return <ReclamosContext.Provider value={value}>{children}</ReclamosContext.Provider>;
}