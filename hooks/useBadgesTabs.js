import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getNovedades } from '../services/alertasService';
import { useAuth } from './useAuth';
import { useReclamos } from './useReclamos';

// Indicadores de novedad de las tabs (consigna Punto 9: "indicador visual de novedad").
//  - Alertas: publicaciones nuevas que coinciden con alertas + seguidas que cambiaron de estado
//    (GET /alertas/novedades), sondeado cada 30 s con la app activa.
//  - Reclamos: reclamos recibidos todavía pendientes de respuesta (ya vienen en ReclamosContext).
const INTERVALO_MS = 30000;

export function useBadgesTabs() {
  const { user, status } = useAuth();
  const { reclamos } = useReclamos();
  const [novedades, setNovedades] = useState(0);

  const refrescar = useCallback(async () => {
    try {
      const n = await getNovedades();
      setNovedades((n?.alertas ?? 0) + (n?.seguidas ?? 0));
    } catch {
      // Es solo un indicador: si falla, se conserva el último valor.
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    Promise.resolve().then(refrescar);
    let id = setInterval(refrescar, INTERVALO_MS);
    const sub = AppState.addEventListener('change', (estado) => {
      clearInterval(id);
      if (estado === 'active') {
        refrescar();
        id = setInterval(refrescar, INTERVALO_MS);
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [status, refrescar]);

  const reclamosPendientes = useMemo(
    () => reclamos.filter((r) => r.estado === 'pendiente' && r.publicadorId === user?.id).length,
    [reclamos, user?.id]
  );

  return { alertas: novedades, reclamos: reclamosPendientes, refrescarAlertas: refrescar };
}
