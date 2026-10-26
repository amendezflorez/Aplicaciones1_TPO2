# TODO — Puntos 1 y 2 (Autenticación y Perfil/Reputación)

Referencia: [PLAN_puntos_1_y_2.md](PLAN_puntos_1_y_2.md). Marcar con `[x]` al terminar. Orden pensado para tener algo funcionando de punta a punta lo antes posible.

## Fase 0 — Definiciones previas
- [ ] Confirmar con el equipo quién hace el backend y la URL base
- [ ] Validar el contrato de API (sección 4 del plan) con quien implementa el backend
- [ ] Acordar que `AuthContext`, `api.js` y `AppNavigator` son compartidos con los demás puntos

## Fase 1 — Base del proyecto
- [x] Verificar documentación de Expo SDK 57 (`https://docs.expo.dev/versions/v57.0.0/`) para los módulos a usar
- [x] Instalar dependencias con `npx expo install` (navigation, screens, safe-area-context, axios, secure-store, async-storage, local-authentication, image-picker, jwt-decode)
- [x] Configurar plugins en `app.json` (secure-store, local-authentication, image-picker)
- [x] Crear estructura de carpetas: `components/ screens/ navigation/ services/ hooks/ context/ utils/ config/`
- [x] `config/env.js` (`API_BASE_URL`), `config/theme.js`, `config/constants.js`
- [x] Componentes base: `Screen`, `Button`, `TextField`, `ErrorText`, `Loading`
- [x] `utils/validators.js` (email, contraseña, teléfono, nombre)

## Fase 2 — Infraestructura de sesión
- [x] `services/storage.js` (wrappers SecureStore para token, AsyncStorage para flag de biometría)
- [x] `utils/jwt.js` → `isTokenExpired(token)`
- [x] `services/api.js`: instancia Axios + interceptor de request (Bearer)
- [x] `setupInterceptors(logoutFn)`: interceptor de response (401 → borrar token + logout), excluyendo `/auth/login`
- [x] `context/AuthContext.js`: estado `status`, `user`, `login`, `logout`, `updateUser`
- [x] Restauración de sesión al montar (token → validar `exp` → `GET /users/me`)
- [x] `hooks/useAuth.js` (con error si se usa fuera del Provider)
- [x] Registrar `setupInterceptors(logout)` en un `useEffect` del Provider
- [x] `App.js`: `AuthProvider` > `NavigationContainer` > `RootNavigator`
- [x] `navigation/RootNavigator.js` (loading / auth / locked / app según `status`)

## Fase 3 — Punto 1: Autenticación
- [x] `services/authService.js` (register request-otp / verify-otp / complete, login, forgot, reset, resend)
- [x] `navigation/AuthNavigator.js` (Stack)
- [x] `hooks/useCountdown.js` para cooldown del reenvío
- [x] `components/OtpInput` (6 dígitos)
- [x] `LoginScreen` (email + contraseña, link a registro y a recupero)
- [x] `RegisterEmailScreen` (pide OTP; manejo de email ya registrado)
- [x] `VerifyOtpScreen` (confirmar código, reenviar, manejo de código inválido/expirado)
- [x] `SetPasswordScreen` (contraseña + confirmación → login automático)
- [x] `ForgotPasswordScreen` (email → envía código)
- [x] `ResetPasswordScreen` (código + nueva contraseña, reenviar código, manejo de expirado)
- [x] Mensajes de error por código HTTP (helper único)
- [ ] Probar: registro completo, login, recupero, cierre y reapertura de app (persistencia)
- [ ] Probar: token expirado / 401 → vuelve a Login

## Fase 4 — Punto 1: Biometría
- [x] `hooks/useBiometrics.js` (`hasHardwareAsync` + `isEnrolledAsync` + `supportedAuthenticationTypesAsync` + `authenticateAsync`)
- [x] `setBiometricEnabled` en `AuthContext` (confirma con prompt antes de activar)
- [x] Estado `locked` al reabrir la app si el flag está activo y hay token válido
- [x] `BiometricLockScreen` (prompt automático, reintentar, "usar contraseña" → logout)
- [x] Manejo de resultados: `success`, `user_cancel`, `lockout`, `not_enrolled`, `system_cancel`
- [x] Switch en `SettingsScreen` (deshabilitado + aviso si no hay hardware/enrolamiento)
- [ ] Probar en dispositivo Android físico con huella/rostro enrolado

## Fase 5 — Punto 2: Perfil
- [x] `services/userService.js` (me, update, photo, barrios, public profile)
- [x] `navigation/ProfileNavigator.js` (Stack) y `AppNavigator.js` (Tabs con tab Perfil; placeholders para el resto)
- [x] `components/Avatar`, `ReputationSummary`, `BadgeChip`
- [x] `ProfileScreen` (foto, nombre, barrio, teléfono, antigüedad, reputación, insignias, accesos a Editar/Configuración, cerrar sesión)
- [x] `EditProfileScreen`: nombre, selector de barrio, teléfono, validaciones
- [x] Foto de perfil con `expo-image-picker` (cámara y galería, permisos) + subida multipart
- [x] Switch "teléfono visible tras aceptar reclamo" (por defecto apagado)
- [x] Guardar con `PUT /users/me` y refrescar `AuthContext` (`updateUser`)
- [x] `utils/formatters.js` (antigüedad "Miembro desde…", textos de reputación)
- [x] `PublicProfileScreen` (params `{ userId }`): reputación, insignias, antigüedad; sin teléfono ni historial
- [ ] Verificar que la insignia "Vecino solidario" aparece con 5 devoluciones (dato del backend)

## Fase 6 — Cierre
- [x] Revisar estados de carga, errores de red y textos en español en todas las pantallas
- [x] `npx expo lint` sin errores
- [x] `npx expo-doctor` sin problemas
- [ ] Prueba end-to-end en Android (Expo): registro → perfil → editar → biometría → cerrar/reabrir → logout
- [x] Actualizar `CLAUDE.md` con la arquitectura real (React Navigation, AuthContext, estructura de carpetas, comandos)
- [x] Documentar para el equipo cómo agregar pantallas al `AppNavigator` y cómo navegar a `PublicProfile`
