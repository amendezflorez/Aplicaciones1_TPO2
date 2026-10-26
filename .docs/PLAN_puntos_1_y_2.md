# Plan — Puntos 1 y 2 (Autenticación y Perfil/Reputación)

App **Hallado** (objetos y mascotas perdidas). Este plan cubre solo:

1. **Autenticación y Registro de Usuarios**
2. **Perfil y Reputación**

Los puntos 3–10 los desarrollan otros integrantes; este plan deja listos los "enganches" (AuthContext, cliente Axios, navegación) para que se integren sin retrabajo.

---

## 1. Alcance técnico (alineado con las clases)

Solo se usa lo visto en las dos presentaciones:

| Tema de clase | Qué usamos |
|---|---|
| React Native vs React DOM | `View`, `Text`, `TextInput`, `Image`, `TouchableOpacity`, `FlatList`, `StyleSheet.create`, `onPress`, `onChangeText`, Flexbox |
| Scaffold recomendado | `components/ screens/ navigation/ services/ hooks/ context/ utils/ config/` |
| Axios + Interceptors | instancia `api` con `axios.create`, interceptor de request (Bearer) y de response (401 → logout) |
| React Navigation | `NavigationContainer` + Stack (auth) + Tabs (app) + Stack (perfil/ajustes), `navigation.navigate/goBack/replace`, `route.params`, `useNavigation`, `useRoute` |
| useContext | `AuthContext` + `AuthProvider` + custom hook `useAuth()` (patrón de la clase) |
| Storage | **SecureStore** para token (dato sensible); **AsyncStorage** para preferencias no sensibles (flag de biometría) |
| Biometría | `expo-local-authentication`: verificar `hasHardwareAsync` + `isEnrolledAsync` + `supportedAuthenticationTypesAsync` antes de `authenticateAsync` |
| Acceso al SO | `expo-image-picker` (cámara/galería para foto de perfil) |

**Fuera de alcance (no visto en clase):** Redux/Zustand, WatermelonDB, TypeScript, Expo Router, librerías de formularios, librerías de UI. Se usan `useState` para formularios y validaciones propias en `utils/`.

### Decisiones que se apartan de `AGENTS.md`
- `AGENTS.md` pide Expo Router y `src/app/`. La cátedra enseña **React Navigation** y el scaffold `screens/ navigation/ …`, y el entregable se evalúa con esa base. **Se usa React Navigation** y el scaffold de clase (el proyecto actual ya es `App.js` + `index.js`, sin Expo Router). Se mantiene de `AGENTS.md`: instalar con `npx expo install` y verificar la documentación de la versión SDK 57 antes de usar APIs de Expo.
- Lenguaje **JavaScript** (`.js`/`.jsx`), como en los ejemplos de clase. Por eso `tsc` no aplica; se valida con `npx expo lint`.

---

## 2. Dependencias

Instalar siempre con `npx expo install`:

```
@react-navigation/native
@react-navigation/native-stack
@react-navigation/bottom-tabs
react-native-screens
react-native-safe-area-context
axios
expo-secure-store
@react-native-async-storage/async-storage
expo-local-authentication
expo-image-picker
jwt-decode            # decodificar `exp` del JWT (recomendado en la clase)
```

`app.json` (config plugins): `expo-secure-store`, `expo-local-authentication` (mensaje FaceID/permiso) y `expo-image-picker` (permisos cámara/galería).

> Nota: `expo-secure-store`, `expo-local-authentication` y `expo-image-picker` funcionan en Expo Go en Android, pero se valida el flujo biométrico en un dispositivo físico con huella/rostro enrolado.

---

## 3. Estructura de carpetas (scaffold de clase)

```
App.js                         # AuthProvider > NavigationContainer > RootNavigator
index.js
config/
  env.js                       # API_BASE_URL
  theme.js                     # colores, espaciados
  constants.js                 # OTP_LENGTH, RESEND_SECONDS, umbrales UI, claves de storage
context/
  AuthContext.js               # user, token, status, login, logout, biometría
services/
  api.js                       # axios.create + setupInterceptors(logoutFn)
  authService.js               # register/otp/login/forgot/reset
  userService.js               # perfil propio, edición, foto, perfil público, barrios
  storage.js                   # wrappers SecureStore / AsyncStorage
hooks/
  useAuth.js                   # useContext(AuthContext) con validación de Provider
  useCountdown.js              # cooldown para "reenviar código"
  useBiometrics.js             # chequeo de disponibilidad + prompt
navigation/
  RootNavigator.js             # decide Auth / Lock / App según status
  AuthNavigator.js             # Stack de autenticación
  AppNavigator.js              # Tabs (placeholders de otros puntos + Perfil)
  ProfileNavigator.js          # Stack: Perfil, EditarPerfil, Configuración, PerfilPúblico
screens/
  auth/  LoginScreen, RegisterEmailScreen, VerifyOtpScreen, SetPasswordScreen,
         ForgotPasswordScreen, ResetPasswordScreen, BiometricLockScreen
  profile/ ProfileScreen, EditProfileScreen, SettingsScreen, PublicProfileScreen
components/
  Button, TextField, Screen (SafeArea + padding), OtpInput, Avatar,
  ReputationSummary, BadgeChip, ErrorText, Loading
utils/
  validators.js                # email, contraseña, teléfono, nombre
  formatters.js                # antigüedad ("Miembro desde…"), reputación
  jwt.js                       # isTokenExpired(token)
```

---

## 4. Contrato de la API REST (puntos 1 y 2)

El TPO pide construir la API REST; la entrega incluye backend + app. Este es el contrato que consume la app (**a validar con quien implemente el backend**). Base: `API_BASE_URL`. Auth con `Authorization: Bearer <JWT>`.

### Autenticación
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register/request-otp` | `{ email }` | `204`. Falla `409` si el email ya existe |
| POST | `/auth/register/verify-otp` | `{ email, code }` | `{ registrationToken }` (token corto, solo sirve para el paso siguiente). `400` código inválido / `410` expirado |
| POST | `/auth/register/complete` | `{ registrationToken, password }` | `{ token, user }` (queda logueado) |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }`. `401` credenciales inválidas |
| POST | `/auth/password/forgot` | `{ email }` | `204` (siempre, para no revelar si el email existe) |
| POST | `/auth/password/reset` | `{ email, code, newPassword }` | `204`. `400` inválido / `410` expirado |
| POST | `/auth/otp/resend` | `{ email, purpose: 'register' \| 'reset' }` | `204`. `429` si se pide demasiado rápido |

Reglas: OTP numérico de 6 dígitos, expira (p. ej. 10 min), límite de intentos y de reenvíos. La contraseña se guarda hasheada. El JWT incluye `exp`.

### Perfil y reputación
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users/me` | Perfil propio completo (incluye teléfono y `phoneVisible`) |
| PUT | `/users/me` | `{ name, barrioId, phone, phoneVisible }` → devuelve el usuario actualizado |
| POST | `/users/me/photo` | `multipart/form-data` campo `photo` → `{ photoUrl }` |
| GET | `/barrios` | Lista de barrios `[{ id, name }]` |
| GET | `/users/:id/public` | Perfil público: `{ id, name, photoUrl, barrio, memberSince, reputation, badges }`. **Nunca** devuelve teléfono ni historial de publicaciones |

Objeto `user` (propio):
```json
{ "id": "…", "email": "…", "name": "…", "photoUrl": "…|null",
  "barrio": { "id": "…", "name": "…" } , "phone": "…|null", "phoneVisible": false,
  "memberSince": "2026-01-15T00:00:00Z",
  "reputation": { "returnsCount": 3, "positiveCount": 5, "negativeCount": 1, "score": 4 },
  "badges": [ { "code": "VECINO_SOLIDARIO", "label": "Vecino solidario" } ] }
```

Reglas de reputación (**las calcula el backend**, la app solo muestra):
- La reputación se arma con las **devoluciones concretadas** y las **valoraciones recibidas** (positivas/negativas).
- Insignias por metas (ej.: 5 devoluciones → "Vecino solidario"). Los umbrales viven en el backend; la app renderiza `badges[]` tal cual.
- La visibilidad del teléfono frente a la otra parte tras aceptar un reclamo (punto 7) la resuelve el backend según `phoneVisible`; en este punto la app solo guarda el flag.

> Mientras el backend no esté disponible: `services/*` se pueden apuntar a un mock local (archivo con respuestas fijas) cambiando una constante en `config/env.js`, sin tocar las pantallas.

---

## 5. Diseño de la solución

### 5.1 Estado de sesión (`AuthContext`)
- `status`: `'loading' | 'unauthenticated' | 'locked' | 'authenticated'`
- Expone: `user`, `status`, `biometricEnabled`, `login(token, user)`, `logout()`, `updateUser(partial)`, `setBiometricEnabled(bool)`, `unlockWithBiometrics()`.
- Un solo contexto de auth (el contexto de tema u otros no se mezclan, según la mejor práctica vista).
- Al montar el Provider: `setupInterceptors(logout)` en un `useEffect` (inyección de `logout`, ya que el interceptor vive fuera del árbol de React).

### 5.2 Restauración de sesión al abrir la app
1. Leer `token` de SecureStore.
2. Sin token → `unauthenticated`.
3. Con token → validar `exp` con `jwt-decode`; si expiró → borrar token → `unauthenticated`.
4. Token válido → leer flag `biometricEnabled` (AsyncStorage). Si está activo y el dispositivo lo soporta → `locked` (muestra `BiometricLockScreen`); si no → cargar `GET /users/me` → `authenticated`.

### 5.3 Navegación
```
NavigationContainer
 └─ RootNavigator (según status)
     ├─ loading          → <Loading/>
     ├─ unauthenticated  → AuthNavigator (Stack): Login, RegisterEmail, VerifyOtp,
     │                      SetPassword, ForgotPassword, ResetPassword
     ├─ locked           → BiometricLockScreen
     └─ authenticated    → AppNavigator (Tabs) → …, Perfil → ProfileNavigator (Stack):
                            Profile, EditProfile, Settings, PublicProfile(params: { userId })
```
`PublicProfile` se registra con `route.params.userId` para que el punto 4 (detalle de publicación) navegue a él con `navigation.navigate('PublicProfile', { userId })`.

### 5.4 Flujos del punto 1
- **Registro:** `RegisterEmail` (email) → `VerifyOtp` (código, reenviar con cooldown, maneja expirado) → `SetPassword` (contraseña + confirmación) → login automático.
- **Login:** email + contraseña → `login(token, user)` → guarda token en SecureStore.
- **Recupero:** `ForgotPassword` (email) → `ResetPassword` (código + nueva contraseña, botón "Reenviar código" con cooldown, mensaje claro si expiró).
- **Biometría (Configuración):** switch "Desbloquear con biometría". Al activarlo: verificar los tres chequeos, pedir `authenticateAsync` de confirmación y recién entonces guardar el flag. Al desactivar: borrar flag. Si no hay hardware/enrolado → `Alert` explicativo y switch deshabilitado. Resultados del prompt manejados: `success`, `user_cancel`, `lockout`, `not_enrolled`, `system_cancel`.
- **Cierre de sesión:** borra token (SecureStore) y limpia estado. El flag de biometría se conserva por dispositivo; se limpia al hacer logout explícito para evitar que otra cuenta herede el bloqueo.

### 5.5 Flujos del punto 2
- **Perfil propio (`ProfileScreen`):** foto, nombre, barrio, teléfono, antigüedad, reputación (devoluciones, valoraciones +/−), insignias, accesos a Editar y Configuración, cerrar sesión.
- **Editar (`EditProfileScreen`):** nombre, barrio (lista desde `/barrios`), teléfono, switch "Mostrar mi teléfono a la otra parte una vez aceptado un reclamo" (por defecto apagado: comunicación solo por la app), foto desde cámara o galería con `expo-image-picker`. Valida y guarda con `PUT /users/me`; actualiza `AuthContext` con `updateUser`.
- **Perfil público (`PublicProfileScreen`):** foto, nombre, barrio, reputación, insignias y antigüedad. No muestra teléfono ni historial (el endpoint tampoco los devuelve).
- **Insignias:** `BadgeChip` visible en perfil propio y público.

### 5.6 Cliente HTTP
`services/api.js`: `axios.create({ baseURL })`; request interceptor lee token de SecureStore y agrega `Authorization`; `setupInterceptors(logoutFn)` agrega response interceptor: ante `401` en rutas autenticadas → `deleteItemAsync('token')` + `logoutFn()`. El `401` de `/auth/login` (credenciales inválidas) **no** debe disparar logout: se maneja en la pantalla.

### 5.7 Manejo de errores y UX
- Estados de carga y deshabilitado en botones durante requests; mensajes de error en español y claros.
- Mapeo de códigos HTTP a mensajes en un único helper (`utils/formatters.js` o `services/errors.js`).
- Validaciones locales antes de pedir red: email válido, contraseña ≥ 8 caracteres con letra y número, teléfono numérico, nombre no vacío.

---

## 6. Criterios de aceptación

**Punto 1**
- [ ] Registro completo: email → OTP → contraseña → sesión iniciada.
- [ ] Login con email/contraseña; error claro ante credenciales inválidas.
- [ ] Recupero de contraseña por código; reenvío disponible y mensaje al expirar.
- [ ] Sesión persiste al cerrar y reabrir la app (token en SecureStore, nunca en AsyncStorage).
- [ ] Token expirado o `401` → vuelve a Login automáticamente.
- [ ] Biometría activable/desactivable desde Configuración; al reabrir la app se pide biometría si está activa; sin sensor/enrolamiento no se lanza el prompt.

**Punto 2**
- [ ] Ver y editar nombre, foto (cámara o galería), barrio y teléfono.
- [ ] Switch de visibilidad del teléfono persistido en el backend.
- [ ] La reputación muestra devoluciones y valoraciones; la insignia aparece al alcanzar la meta (p. ej. "Vecino solidario" con 5 devoluciones).
- [ ] Perfil público muestra reputación, insignias y antigüedad, y **no** teléfono ni historial.

**Transversal**
- [ ] Corre en Android con Expo (Expo Go o development build).
- [ ] `npx expo lint` sin errores; `npx expo-doctor` sin problemas.

---

## 7. Riesgos y pendientes de definir con el equipo
1. **Backend:** quién lo implementa, stack y URL base; confirmar el contrato de la sección 4.
2. **Envío de OTP por email:** servicio SMTP/proveedor; en desarrollo el backend puede loguear el código en consola.
3. **Almacenamiento de fotos:** dónde se guardan las imágenes (disco del backend, S3, etc.).
4. **Integración con el resto:** acordar que `AppNavigator` (Tabs) y `AuthContext` son compartidos; los otros puntos agregan sus pantallas sin modificar la lógica de sesión.
5. **Biometría y logout:** confirmar el comportamiento descrito en 5.4 con el equipo.
