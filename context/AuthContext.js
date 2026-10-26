import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { setupInterceptors } from '../services/api';
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

  // El interceptor necesita logout() pero vive fuera de React: se lo inyectamos.
  useEffect(() => setupInterceptors(logout), [logout]);

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
