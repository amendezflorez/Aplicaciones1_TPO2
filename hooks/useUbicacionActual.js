import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

// Wrapper de expo-location con permisos (API verificada contra
// https://docs.expo.dev/versions/v57.0.0/sdk/location/: requestForegroundPermissionsAsync
// + getCurrentPositionAsync, coords.latitude/longitude). No pide permiso al montar: se
// llama a obtenerUbicacion() recién cuando el usuario toca "Usar mi ubicación" (paso 3 del
// buscador) u "ordenar por cercanos", para no disparar el prompt de permiso sin que la
// persona haya elegido esa opción.
export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [permisoDenegado, setPermisoDenegado] = useState(false);

  const obtenerUbicacion = useCallback(async () => {
    setCargando(true);
    setPermisoDenegado(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermisoDenegado(true);
        return null;
      }
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUbicacion(coords);
      return coords;
    } catch {
      setPermisoDenegado(true);
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  return { ubicacion, cargando, permisoDenegado, obtenerUbicacion };
}
