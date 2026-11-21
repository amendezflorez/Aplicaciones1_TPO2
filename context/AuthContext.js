import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useConnectivity } from '../hooks/useConnectivity';
import { setupInterceptors } from '../services/api';
import { esErrorDeRed } from '../services/errors';
import { darDeBajaPush } from '../services/pushNotifications';
import { procesarColaPendientes } from '../services/offline/colaProcesador';
import { getBarrios, getMe } from '../services/userService';
import {
  deleteToken,
  getBiometricEnabled,
  getToken,
  saveBiometricEnabled,
  saveToken,
} from '../services/storage';
import { isTokenExpired } from '../utils/jwt';

export const AuthContext = createContext(null);

// Último perfil cargado, para poder entrar a la app sin conexión (Punto 6): antes, si
// GET /users/me fallaba por red al abrir la app, se mandaba a la persona al login aunque
// tuviera una sesión válida, y no podía ver nada de lo guardado offline.
const USUARIO_CACHE_KEY = 'usuarioCache';
const guardarUsuarioCache = (u) => AsyncStorage.setItem(USUARIO_CACHE_KEY, JSON.stringify(u)).catch(() => {});
const leerUsuarioCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(USUARIO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Punto 1 + Punto 12: con biometría activada, si la app vuelve del segundo plano después
// de este tiempo se vuelve a bloquear. Así, al tocar una notificación con la app en
// segundo plano se pide el desbloqueo antes de abrir la pantalla (consigna: "previo
// desbloqueo de la sesión si corresponde").
const BLOQUEO_TRAS_MS = 30 * 1000;

// status: 'loading' | 'unauthenticated' | 'locked' | 'authenticated'
export function AuthProvider({ children }) {
  const { estado: estadoConexion, notificarErrorDeRed, notificarExitoDeRed } = useConnectivity();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const logout = useCallback(async () => {
    // Antes de borrar el token: la baja del dispositivo necesita la sesión.
    await darDeBajaPush();
    await deleteToken();
    await AsyncStorage.removeItem(USUARIO_CACHE_KEY).catch(() => {});
    await saveBiometricEnabled(false);
    setBiometricEnabledState(false);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const login = useCallback(async (token, userData) => {
    await saveToken(token);
    setUser(userData);
    guardarUsuarioCache(userData);
    setStatus('authenticated');
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...partial };
      guardarUsuarioCache(next);
      return next;
    });
  }, []);

  // Vuelve a pedir GET /users/me (p. ej. ProfileScreen al enfocarse) para que reputación e
  // insignias estén al día. Devuelve el usuario o tira el error para que la pantalla lo
  // muestre.
  const refreshUser = useCallback(async () => {
    const fresh = await getMe();
    setUser(fresh);
    guardarUsuarioCache(fresh);
    return fresh;
  }, []);

  const setBiometricEnabled = useCallback(async (enabled) => {
    await saveBiometricEnabled(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  // Carga el perfil con el token guardado y pasa a 'authenticated'.
  // Se usa al restaurar la sesión y al desbloquear con biometría.
  const loadSession = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      guardarUsuarioCache(me);
      setStatus('authenticated');
    } catch (error) {
      // 401: el interceptor ya hizo logout. Sin red o servidor caído: si hay un perfil
      // guardado se entra igual (modo sin conexión) en vez de echar a la persona al login.
      const cache = await leerUsuarioCache();
      if (cache && (esErrorDeRed(error) || error?.response?.status >= 500)) {
        setUser(cache);
        setStatus('authenticated');
        return;
      }
      if (error?.response?.status !== 401) {
        setUser(null);
        setStatus('unauthenticated');
      }
    }
  }, []);

  // Se llama desde BiometricLockScreen tras una autenticación biométrica exitosa.
  const completeUnlock = loadSession;

  // El interceptor necesita logout() y notificarErrorDeRed() pero vive fuera de React: se
  // los inyectamos (Punto 6: cualquier request sin respuesta marca "sin conexión" en
  // ConnectivityContext, ver services/api.js).
  useEffect(
    () => setupInterceptors(logout, notificarErrorDeRed, notificarExitoDeRed),
    [logout, notificarErrorDeRed, notificarExitoDeRed]
  );

  // Re-bloqueo al volver del segundo plano (ver BLOQUEO_TRAS_MS).
  const enFondoDesdeRef = useRef(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp === 'background') {
        enFondoDesdeRef.current = Date.now();
        return;
      }
      if (estadoApp === 'active' && enFondoDesdeRef.current) {
        const ausente = Date.now() - enFondoDesdeRef.current;
        enFondoDesdeRef.current = null;
        if (biometricEnabled && status === 'authenticated' && ausente >= BLOQUEO_TRAS_MS) {
          setStatus('locked');
        }
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, status]);

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
      // Precarga/refresca el caché de barrios (services/offline/barriosCache.js) para que
      // el wizard de publicar funcione offline aunque nunca se haya abierto un picker de
      // barrios con conexión. Sin conexión, getBarrios cae al caché y no pasa nada.
      if (estadoConexion !== 'offline') getBarrios().catch(() => {});
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
      refreshUser,
      setBiometricEnabled,
      completeUnlock,
    }),
    [user, status, biometricEnabled, login, logout, updateUser, refreshUser, setBiometricEnabled, completeUnlock]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
