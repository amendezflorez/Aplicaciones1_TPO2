# Punto 12: Notificaciones push

Consigna: avisar aun con la app cerrada ante (a) reclamo nuevo recibido o cambio de estado de un reclamo propio, y (b) punto de encuentro propuesto o modificado. Al tocar la notificación se abre la pantalla correspondiente, previo desbloqueo de la sesión si corresponde. Bandeja con historial que distingue leídas de no leídas.

## Cómo está resuelto

**Backend** (`backend/src/main/java/com/hallado/backend/`)
- `entity/Notificacion`: cada aviso queda guardado (es la fuente de verdad de la bandeja). `entity/DispositivoPush`: token de Expo de cada celular logueado.
- `service/NotificacionService.notificar(...)`: único punto de entrada. Guarda la notificación y publica un evento.
- `service/ExpoPushSender`: escucha el evento con `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` y envía el push a `https://exp.host/--/api/v2/push/send`. Si la acción de negocio hace rollback no sale ningún aviso, y si el envío falla no se rompe la acción. Los tokens que Expo marca `DeviceNotRegistered` se borran. No necesita credenciales de Firebase en el backend.
- Eventos que notifican: reclamo recibido (al publicador), reclamo aceptado / rechazado / vencido (al autor), punto de encuentro propuesto / modificado / aceptado (a la otra parte), devolución confirmada (a quien devolvió) y reclamos que quedan cerrados cuando se confirma otra devolución.
- `app.push.enabled=false` en `application.properties` guarda las notificaciones pero no envía push.

**API** (todas requieren token)
| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/notificaciones` | `{ data: [{ id, tipo, titulo, cuerpo, reclamoId, publicacionId, leida, creadaEn }], noLeidas }` (últimas 100) |
| GET | `/notificaciones/no-leidas` | `{ noLeidas }` |
| PATCH | `/notificaciones/{id}/leida` | la notificación |
| POST | `/notificaciones/leer-todas` | 204 |
| POST | `/dispositivos` | 204, body `{ token }` (token `ExponentPushToken[...]`) |
| POST | `/dispositivos/baja` | 204, body `{ token }` (al cerrar sesión) |

`tipo`: `reclamo_recibido`, `reclamo_aceptado`, `reclamo_rechazado`, `reclamo_vencido`, `encuentro_propuesto`, `encuentro_modificado`, `encuentro_aceptado`, `devolucion_confirmada`.

**App**
- `services/pushNotifications.js`: configura el canal Android, pide permiso, registra el token y muestra notificaciones locales.
- `context/NotificacionesContext.js`: bandeja, contador de no leídas, sondeo cada 20 s con la app activa, manejo del toque.
- `navigation/navigationRef.js`: tabla tipo → pantalla (`destinoDeNotificacion`).
- `screens/notificaciones/NotificacionesScreen.js` y `components/HeaderBell.js` (campana con badge en el header de cada tab).
- Desbloqueo previo: con biometría activa, la app se vuelve a bloquear tras 30 s en segundo plano (`AuthContext`). Si se toca una notificación mientras está bloqueada, el destino queda pendiente y se abre apenas se desbloquea. En arranque en frío se usa `getLastNotificationResponseAsync`.

## Dos modos según dónde corre la app

| | Expo Go (Android) | Development build / APK |
|---|---|---|
| Push remoto (app cerrada) | No: Expo Go lo quitó desde el SDK 53 | Sí |
| Notificación del sistema | Sí, local, generada al detectar una novedad en la bandeja (app abierta o en segundo plano reciente) | Sí, push real |
| Bandeja y toque de notificación | Sí | Sí |

La bandeja avisa en pantalla cuando está en modo Expo Go.

## Activar el push real (una sola vez)

La consigna pide avisos "aun cuando no está abierta", así que para la demo conviene un APK o development build.

1. Cuenta gratuita en expo.dev y `npm install -g eas-cli`, después `eas login`.
2. En la carpeta del proyecto: `eas init`. Esto agrega `extra.eas.projectId` a `app.json` (sin ese id la app no puede pedir el token de push).
3. Credenciales de FCM (Android): en Firebase Console crear un proyecto, agregar una app Android con el package `com.anonymous.Aplicaciones1_TPO2` y descargar `google-services.json` a la raíz del proyecto. Agregar en `app.json`: `"android": { "googleServicesFile": "./google-services.json" }`. Después subir la clave de cuenta de servicio de FCM V1 con `eas credentials` (Android > Push Notifications).
4. Compilar: `eas build --profile development --platform android` (o `--profile preview` para un APK instalable). Instalar el APK en el celular.
5. Iniciar sesión en la app con permiso de notificaciones aceptado. El token queda registrado en la tabla `dispositivos_push`.
6. Probar: con dos cuentas, que una reclame una publicación de la otra. La segunda recibe el push con la app cerrada. Al tocarlo se abre Mis reclamos.

El backend tiene que tener salida a internet hacia `exp.host` (la PC que corre Spring en la misma red alcanza).

`google-services.json` no es secreto de alto riesgo pero conviene no subirlo a un repositorio público.
