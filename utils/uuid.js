// Id local para idempotencia del lado del cliente (clientRequestId del alta de
// publicaciones — sección 4.1 de .docs/PLAN_puntos_5_y_6.md). No hace falta que sea un
// UUID v4 "de verdad" ni criptográficamente fuerte: el backend solo exige que sea único
// por publicador, así que timestamp + un sufijo al azar alcanza y evita sumar una
// dependencia nueva (expo-crypto, uuid, etc.) solo para esto.
export function generarIdLocal() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
