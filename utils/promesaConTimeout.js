// Le agrega un timeout a una promesa que no lo tiene (ni getCurrentPositionAsync ni
// geocodeAsync/reverseGeocodeAsync de expo-location exponen uno propio): si no resuelve a
// tiempo, rechaza en vez de dejar la UI "cargando" indefinidamente — visto en emuladores
// sin Google Play Services, donde el proveedor fused nunca contesta.
export function conTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}
