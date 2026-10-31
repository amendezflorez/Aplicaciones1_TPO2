import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { setSinConexion } from '../services/offline/estadoConexion';

export const ConnectivityContext = createContext(null);

// Punto 6 (sección 4.1 de PLAN_puntos_5_y_6.md). `estado` es 'online' | 'offline' |
// 'desconocido', no un simple booleano, porque isInternetReachable de NetInfo puede ser
// null (sobre todo al arrancar la app, antes de la primera medición real) — eso NO
// significa "sin conexión": se trata como 'desconocido' y no bloquea la UI ni muestra el
// banner (solo 'offline' lo hace).
//
// Además de lo que reporta NetInfo, cualquier request de Axios que falle sin respuesta
// (ver services/errors.js:esErrorDeRed) fuerza 'offline' de inmediato vía
// notificarErrorDeRed() — inyectado en el interceptor de services/api.js desde
// AuthContext, igual patrón que ya usa con logout. Esto cubre el caso de estar conectado a
// una red sin salida real a internet, o con el backend caído: NetInfo puede seguir
// diciendo "conectado" y aun así ninguna request va a llegar a destino.
//
// Este Provider NO dispara el procesamiento de la cola de pendientes: la cola es por
// usuario (services/offline/colaPendientes.js) y este Provider, a propósito, vive por
// fuera de AuthProvider (así puede inyectarle notificarErrorDeRed al interceptor) y no
// conoce qué usuario está logueado. Ese disparo vive en AuthContext, que sí tiene userId Y
// (vía useConnectivity()) el estado de conexión — ver su comentario.
export function ConnectivityProvider({ children }) {
  const [netInfoState, setNetInfoState] = useState({ isConnected: null, isInternetReachable: null });
  const [forzadoOffline, setForzadoOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetInfoState(state);
      // Si NetInfo confirma que sí hay conexión real, levantamos cualquier "forzado
      // offline" previo: un request pudo haber fallado puntualmente, no necesariamente
      // sigue caído.
      if (state.isConnected && state.isInternetReachable !== false) {
        setForzadoOffline(false);
      }
    });
    return unsubscribe;
  }, []);

  const estado = useMemo(() => {
    if (forzadoOffline) return 'offline';
    if (netInfoState.isConnected === false) return 'offline';
    if (netInfoState.isConnected === true) {
      if (netInfoState.isInternetReachable === false) return 'offline';
      if (netInfoState.isInternetReachable === true) return 'online';
      return 'desconocido'; // isInternetReachable todavía null
    }
    return 'desconocido'; // isConnected todavía null (arranque de la app)
  }, [netInfoState, forzadoOffline]);

  // Para los servicios que viven fuera de React (ver services/offline/estadoConexion.js).
  useEffect(() => setSinConexion(estado === 'offline'), [estado]);

  const notificarErrorDeRed = useCallback(() => setForzadoOffline(true), []);

  const value = useMemo(
    () => ({
      estado,
      sinConexion: estado === 'offline',
      notificarErrorDeRed,
    }),
    [estado, notificarErrorDeRed]
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}
