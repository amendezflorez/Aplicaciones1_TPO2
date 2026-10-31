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

// userId (claim `sub`) del token, o null si no hay token o no se puede decodificar. Lo
// emiten igual el backend Java (JwtService) y el mock.
export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token).sub ?? null;
  } catch {
    return null;
  }
}
