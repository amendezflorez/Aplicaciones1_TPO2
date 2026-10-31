import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

// ~10s: tope propio para no quedar "cargando" indefinidamente si no hay señal real.
const TIMEOUT_MS = 10000;
// Si hay una posición conocida de hasta 5 minutos, se usa esa (getLastKnownPositionAsync,
// mucho más rápida) en vez de pedir una nueva.
const EDAD_MAX_ULTIMA_POSICION_MS = 5 * 60 * 1000;

// Reemplaza a getCurrentPositionAsync como segundo intento (después de
// getLastKnownPositionAsync). Sin Google Play Services, Accuracy.Balanced tiende a
// resolver contra el proveedor de red (inexistente/inútil en un emulador sin esos
// servicios), así que una posición cargada a mano por Extended Controls o
// "adb emu geo fix" — que solo llega al proveedor GPS — nunca se recibía: quedaba en
// timeout aunque la posición ya estuviera seteada. watchPositionAsync con Accuracy.High
// sí se suscribe directo al proveedor GPS (vía LocationManager, no requiere Play
// Services) y recibe esa posición inyectada; nos quedamos con la primera lectura y
// cancelamos la suscripción apenas llega (o al vencer el timeout, lo que pase primero).
function obtenerPosicionConWatch(timeoutMs) {
  return new Promise((resolve, reject) => {
    let resuelto = false;
    let subscription = null;

    const finalizar = (accion) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(timer);
      subscription?.remove();
      accion();
    };

    const timer = setTimeout(() => finalizar(() => reject(new Error('TIMEOUT'))), timeoutMs);

    Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, (position) => {
      finalizar(() => resolve(position));
    })
      .then((sub) => {
        subscription = sub;
        // Si ya se resolvió (primera lectura o timeout) antes de que esta promesa
        // terminara de crear la suscripción, cancelarla igual para no dejarla colgada.
        if (resuelto) subscription.remove();
      })
      .catch((e) => finalizar(() => reject(e)));
  });
}

// Wrapper de expo-location con permisos (API verificada contra
// https://docs.expo.dev/versions/v57.0.0/sdk/location/: requestForegroundPermissionsAsync,
// hasServicesEnabledAsync, getLastKnownPositionAsync, watchPositionAsync,
// coords.latitude/longitude). No pide permiso al montar: se llama a obtenerUbicacion()
// recién cuando el usuario toca "Usar mi ubicación" (buscador, Punto 3) o "Usar mi
// ubicación actual" (Punto 5), para no disparar el prompt de permiso sin que la persona
// haya elegido esa opción.
//
// `error` es un objeto `{ tipo, mensaje }` (o null), no un booleano "permisoDenegado": hay
// más de una forma de que esto falle y cada una necesita su propio mensaje — permiso
// denegado (con acción para abrir la configuración), servicios de ubicación apagados, o
// sin señal/timeout. Usado también por BarrioOUbicacionPicker (buscador) además de
// PublicarWizardScreen (Punto 5), así que ambos se benefician del mismo fix.
export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerUbicacion = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError({
          tipo: 'permiso',
          mensaje: 'No pudimos acceder a tu ubicación: el permiso está denegado.',
        });
        return null;
      }

      // No asumir que existe el proveedor fused (Google Play Services): en un emulador
      // sin esos servicios, pedir la posición sin chequear esto antes puede quedar
      // colgado en vez de fallar con un mensaje claro.
      const serviciosActivos = await Location.hasServicesEnabledAsync();
      if (!serviciosActivos) {
        setError({
          tipo: 'servicio',
          mensaje: 'Activá la ubicación (GPS) del dispositivo para usar esta opción.',
        });
        return null;
      }

      let position = await Location.getLastKnownPositionAsync({
        maxAge: EDAD_MAX_ULTIMA_POSICION_MS,
      }).catch(() => null);

      if (!position) {
        position = await obtenerPosicionConWatch(TIMEOUT_MS);
      }

      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUbicacion(coords);
      return coords;
    } catch (e) {
      console.warn('useUbicacionActual: no se pudo obtener la ubicación', e);
      setError({
        tipo: 'sinSenal',
        mensaje: 'No pudimos obtener tu ubicación, probá de nuevo o escribí la dirección.',
      });
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiarUbicacion = useCallback(() => {
    setUbicacion(null);
    setError(null);
  }, []);

  return {
    ubicacion,
    cargando,
    error,
    obtenerUbicacion,
    limpiarUbicacion,
    // Acción sugerida para error.tipo === 'permiso': abre los ajustes de la app para que
    // la persona habilite el permiso a mano (expo-location no puede volver a pedirlo
    // después de un rechazo "no preguntar de nuevo").
    abrirConfiguracion: Linking.openSettings,
  };
}
