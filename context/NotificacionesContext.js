import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { navegarADestino } from '../navigation/navigationRef';
import { getErrorMessage } from '../services/errors';
import { getBandeja, marcarLeida as marcarLeidaApi, marcarTodasLeidas as marcarTodasApi } from '../services/notificacionesService';
import {
  actualizarBadgeIcono,
  configurarNotificaciones,
  dataDeAperturaEnFrio,
  escucharToques,
  mostrarNotificacionLocal,
  registrarParaPush,
  soportaPushRemoto,
} from '../services/pushNotifications';

export const NotificacionesContext = createContext(null);

// Punto 12 (Notificaciones push). Responsabilidades:
//  1. Al autenticarse, registra el dispositivo para push (development build / APK).
//  2. Mantiene la bandeja (historial, leídas/no leídas) y el contador de no leídas, que se
//     muestra como badge.
//  3. Sondea la bandeja cada 20 s con la app activa. En Expo Go (sin push remoto) cada
//     notificación nueva se muestra además como notificación local del sistema.
//  4. Al tocar una notificación abre la pantalla correspondiente. Si la sesión está
//     bloqueada con biometría, guarda el destino y navega recién después del desbloqueo.
const INTERVALO_MS = 20000;

export function NotificacionesProvider({ children }) {
  const { status } = useAuth();
  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const vistosRef = useRef(null); // ids ya conocidos (null = primera carga, no avisar)
  const destinoPendienteRef = useRef(null);

  const aplicarBandeja = useCallback((bandeja) => {
    const lista = bandeja?.data ?? [];
    setItems(lista);
    setNoLeidas(bandeja?.noLeidas ?? lista.filter((n) => !n.leida).length);
    actualizarBadgeIcono(bandeja?.noLeidas ?? 0);
    return lista;
  }, []);

  const refrescar = useCallback(
    async ({ manual = false } = {}) => {
      if (status !== 'authenticated') return;
      if (manual) setCargando(true);
      try {
        const lista = aplicarBandeja(await getBandeja());
        setError('');
        // Modo Expo Go: las nuevas no leídas se muestran como notificación local.
        if (vistosRef.current && !soportaPushRemoto) {
          lista
            .filter((n) => !n.leida && !vistosRef.current.has(n.id))
            .slice(0, 3)
            .forEach((n) =>
              mostrarNotificacionLocal({
                titulo: n.titulo,
                cuerpo: n.cuerpo,
                data: { notificacionId: n.id, tipo: n.tipo, reclamoId: n.reclamoId, publicacionId: n.publicacionId },
              })
            );
        }
        vistosRef.current = new Set(lista.map((n) => n.id));
      } catch (e) {
        if (manual) setError(getErrorMessage(e));
      } finally {
        if (manual) setCargando(false);
      }
    },
    [status, aplicarBandeja]
  );

  const marcarLeida = useCallback(async (id) => {
    let eraNoLeida = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        eraNoLeida = !n.leida;
        return { ...n, leida: true };
      })
    );
    if (eraNoLeida) setNoLeidas((c) => Math.max(0, c - 1));
    try {
      await marcarLeidaApi(id);
    } catch {
      // Se reintenta solo en el próximo refresco; no vale la pena molestar con un error.
    }
  }, []);

  const marcarTodas = useCallback(async () => {
    await marcarTodasApi();
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    actualizarBadgeIcono(0);
  }, []);

  // Abrir la pantalla de una notificación (desde la bandeja o desde el sistema).
  const abrir = useCallback(
    (data) => {
      if (data?.notificacionId) marcarLeida(data.notificacionId);
      if (status !== 'authenticated' || !navegarADestino(data)) {
        destinoPendienteRef.current = data;
      }
    },
    [status, marcarLeida]
  );

  useEffect(() => {
    configurarNotificaciones();
  }, []);

  // Toques en notificaciones del sistema (app abierta o en segundo plano).
  useEffect(() => escucharToques((data) => abrir(data)), [abrir]);

  // Sesión: al entrar registra push, carga la bandeja y revisa si la app se abrió en frío
  // tocando una notificación. Al salir limpia todo.
  useEffect(() => {
    if (status === 'authenticated') {
      registrarParaPush();
      Promise.resolve().then(() => refrescar());
      dataDeAperturaEnFrio().then((data) => {
        if (data) destinoPendienteRef.current = data;
      });
    } else if (status === 'unauthenticated') {
      vistosRef.current = null;
      destinoPendienteRef.current = null;
      // Diferido (no sincrónico dentro del efecto) para no encadenar renders.
      Promise.resolve().then(() => {
        setItems([]);
        setNoLeidas(0);
      });
    }
  }, [status, refrescar]);

  // Destino pendiente (notificación tocada con la sesión bloqueada o en arranque en frío):
  // se resuelve apenas la sesión queda autenticada y la navegación está lista.
  useEffect(() => {
    if (status !== 'authenticated' || !destinoPendienteRef.current) return undefined;
    const id = setInterval(() => {
      const data = destinoPendienteRef.current;
      if (!data) return clearInterval(id);
      if (navegarADestino(data)) {
        if (data.notificacionId) marcarLeida(data.notificacionId);
        destinoPendienteRef.current = null;
        clearInterval(id);
      }
      return undefined;
    }, 300);
    return () => clearInterval(id);
  }, [status, marcarLeida]);

  // Sondeo periódico solo con la app activa.
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
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

  const value = useMemo(
    () => ({ items, noLeidas, cargando, error, refrescar, marcarLeida, marcarTodas, abrir, pushRemoto: soportaPushRemoto }),
    [items, noLeidas, cargando, error, refrescar, marcarLeida, marcarTodas, abrir]
  );

  return <NotificacionesContext.Provider value={value}>{children}</NotificacionesContext.Provider>;
}
