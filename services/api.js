import axios from 'axios';
import { API_BASE_URL, USE_MOCK } from '../config/env';
import { mockAdapter } from './mock/mockAdapter';
import { deleteToken, getToken } from './storage';

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Sin backend real: las requests las resuelve el mock, pasando igual por los interceptores.
if (USE_MOCK) api.defaults.adapter = mockAdapter;

// REQUEST: adjunta el token en cada llamada
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE: el interceptor vive fuera del árbol de React, por lo que recibe
// `logoutFn` como parámetro (no puede usar useContext).
// Los 401 de /auth/* (credenciales inválidas, OTP) los maneja cada pantalla.
export function setupInterceptors(logoutFn) {
  const id = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const isAuthRoute = error.config?.url?.startsWith('/auth/');
      if (error.response?.status === 401 && !isAuthRoute) {
        await deleteToken();
        logoutFn();
      }
      return Promise.reject(error);
    }
  );
  return () => api.interceptors.response.eject(id);
}
