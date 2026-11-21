import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { darDeBajaDispositivo, registrarDispositivo } from './notificacionesService';

// Punto 12 — capa sobre expo-notifications.
//
// Dos modos, elegidos solos según dónde corre la app:
//  - Development build / APK (modo "push real"): pide el token de Expo Push, lo registra
//    en el backend (POST /dispositivos) y el backend manda los push vía Expo, que llegan
//    aunque la app esté cerrada.
//  - Expo Go en Android: desde el SDK 53, Expo Go no recibe push remotos. Ahí la app
//    consulta la bandeja periódicamente (NotificacionesContext) y muestra cada novedad
//    como notificación LOCAL del sistema. Funciona con la app abierta o en segundo plano
//    reciente, no con la app cerrada (limitación de Expo Go, no del código).

export const esExpoGo = isRunningInExpoGo();
export const soportaPushRemoto = Platform.OS !== 'web' && !esExpoGo && Device.isDevice;

let tokenActual = null;
let configurado = false;

// Cómo se muestran las notificaciones que llegan con la app abierta: banner + sonido.
export function configurarNotificaciones() {
  if (configurado || Platform.OS === 'web') return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Reclamos y devoluciones',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#0B6E63',
    }).catch(() => {});
  }
}

// Pide permiso (Android 13+ lo necesita). Devuelve true si se puede notificar.
export async function asegurarPermiso() {
  if (Platform.OS === 'web') return false;
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    return false;
  }
}

// Registra este dispositivo para recibir push de la cuenta logueada. Nunca tira: si algo
// falla (sin permiso, Expo Go, sin projectId, sin red), la app sigue funcionando con la
// bandeja y las notificaciones locales.
export async function registrarParaPush() {
  if (!soportaPushRemoto) return null;
  try {
    if (!(await asegurarPermiso())) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registrarDispositivo(token);
    tokenActual = token;
    return token;
  } catch {
    return null;
  }
}

// Al cerrar sesión: este celular deja de recibir los push de esta cuenta.
export async function darDeBajaPush() {
  if (!tokenActual) return;
  const token = tokenActual;
  tokenActual = null;
  try {
    await darDeBajaDispositivo(token);
  } catch {
    // Si falla (sin red), el backend lo reasigna cuando otra cuenta registre el mismo token.
  }
}

// Notificación local inmediata (modo Expo Go). data lleva lo necesario para navegar.
export async function mostrarNotificacionLocal({ titulo, cuerpo, data }) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
    });
  } catch {
    // sin permiso: la novedad igual queda en la bandeja
  }
}

export function escucharToques(callback) {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response?.notification?.request?.content?.data ?? {});
  });
  return () => sub.remove();
}

// Si la app se abrió en frío tocando una notificación, devuelve su data (una sola vez).
export async function dataDeAperturaEnFrio() {
  if (Platform.OS === 'web') return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    await Notifications.clearLastNotificationResponseAsync();
    return response.notification?.request?.content?.data ?? null;
  } catch {
    return null;
  }
}

export async function actualizarBadgeIcono(cantidad) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(cantidad);
  } catch {
    // no todos los launchers de Android soportan badge
  }
}
