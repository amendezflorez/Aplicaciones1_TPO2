import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { decidirReclamo, getMisReclamos } from '../services/reclamosService';
import { getErrorMessage } from '../services/errors';

export const ReclamosContext = createContext(null);

export function ReclamosProvider({ children }) {
  const { status } = useAuth();
  const [reclamos, setReclamos] = useState([]);
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

  useEffect(() => {
    if (status === 'authenticated') refresh();
    else {
      setReclamos([]);
      setError('');
    }
  }, [status, refresh]);

  const value = useMemo(
    () => ({ reclamos, loading, error, refresh, decidir }),
    [reclamos, loading, error, refresh, decidir]
  );

  return <ReclamosContext.Provider value={value}>{children}</ReclamosContext.Provider>;
}