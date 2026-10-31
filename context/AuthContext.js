import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnectivity } from '../hooks/useConnectivity';
import { setupInterceptors } from '../services/api';
import { procesarColaPendientes } from '../services/offline/colaProcesador';
import { getMe } from '../services/userService';
import {
  deleteToken,
  getBiometricEnabled,
  getToken,
  saveBiometricEnabled,
  saveToken,
} from '../services/storage';
import { isTokenExpired } from '../utils/jwt';

export const AuthContext = createContext(null);

// status: 'loading' | 'unauthenticated' | 'locked' | 'authenticated'
export function AuthProvider({ children }) {
  const { estado: estadoConexion, notificarErrorDeRed } = useConnectivity();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const logout = useCallback(async () => {
    await deleteToken();
    await saveBiometricEnabled(false);
    setBiometricEnabledState(false);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const login = useCallback(async (token, userData) => {
    await saveToken(token);
    setUser(userData);
    setStatus('authenticated');
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((current) => (current ? { ...current, ...partial } : current));
  }, []);

  const setBiometricEnabled = useCallback(async (enabled) => {
    await saveBiometricEnabled(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  // Carga el perfil con el token guardado y pasa a 'authenticated'.
  // Se usa al restaurar la sesión y al desbloquear con biometría.
  const loadSession = useCallback(async () => {
    try {
      setUser(await getMe());
      setStatus('authenticated');
    } catch {
      // Un 401 ya lo resuelve el interceptor (logout). Otros errores: volver al login.
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  // Se llama desde BiometricLockScreen tras una autenticación biométrica exitosa.
  const completeUnlock = loadSession;

  // El interceptor necesita logout() y notificarErrorDeRed() pero vive fuera de React: se
  // los inyectamos (Punto 6: cualquier request sin respuesta marca "sin conexión" en
  // ConnectivityContext, ver services/api.js).
  useEffect(() => setupInterceptors(logout, notificarErrorDeRed), [logout, notificarErrorDeRed]);

  // Restaurar sesión al abrir la app
  useEffect(() => {
    const restore = async () => {
      const token = await getToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      if (isTokenExpired(token)) {
        await deleteToken();
        setStatus('unauthenticated');
        return;
      }
      const enabled = await getBiometricEnabled();
      setBiometricEnabledState(enabled);
      if (enabled) {
        setStatus('locked');
        return;
      }
      await loadSession();
    };
    restore();
  }, [loadSession]);

  // Punto 6 (sección 15.10 del plan): dispara el procesamiento de la cola de
  // publicaciones pendientes de ESTE usuario (la cola es por userId, ver
  // services/offline/colaPendientes.js) — nunca la de otro que haya usado el dispositivo
  // antes. Dos disparadores:
  //  1. Recién autenticado (login, restaurar sesión, desbloqueo biométrico): cubre tanto
  //     "se abrió la app con sesión ya válida" como, sobre todo, "un usuario distinto
  //     inició sesión" — en ese caso procesa la cola de ESE usuario, nunca la del
  //     anterior, que queda intacta hasta que vuelva a loguearse.
  //  2. Vuelve la conexión (offline -> online/desconocido) mientras ya hay sesión — cubre
  //     también el caso de una sesión vencida a mitad de la cola: cuando el usuario se
  //     loguea de nuevo, el disparador 1 reintenta lo que quedó pendiente (colaProcesador
  //     deja esos ítems en 'pendiente', no los marca como error, ante un 401).
  const previoRef = useRef({ status, estadoConexion });
  useEffect(() => {
    const previo = previoRef.current;
    const autenticadoAhora = status === 'authenticated' && !!user;
    const recienAutenticado = previo.status !== 'authenticated' && status === 'authenticated';
    const volvioLaConexion = previo.estadoConexion === 'offline' && estadoConexion !== 'offline';
    if (autenticadoAhora && (recienAutenticado || volvioLaConexion)) {
      procesarColaPendientes(user.id);
    }
    previoRef.current = { status, estadoConexion };
  }, [status, estadoConexion, user]);

  const value = useMemo(
    () => ({
      user,
      status,
      biometricEnabled,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      updateUser,
      setBiometricEnabled,
      completeUnlock,
    }),
    [user, status, biometricEnabled, login, logout, updateUser, setBiometricEnabled, completeUnlock]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
