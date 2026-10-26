import { jwtDecode } from 'jwt-decode';

// Devuelve true si el token no se puede decodificar o ya venció (claim `exp` en segundos).
export function isTokenExpired(token) {
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return false;
    return exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
