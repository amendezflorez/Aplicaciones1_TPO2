# Guía de integración — Puntos 1 y 2

Para quienes desarrollan los demás puntos (buscador, publicaciones, reclamos, etc.).

## Correr la app
```
npm install
npx expo start        # Android: tecla "a" (emulador) o Expo Go con QR
```
## Backend simulado (mock)
Con `USE_MOCK = true` en `config/env.js` (valor actual) la app funciona sin servidor: `services/mock/mockAdapter.js` responde los endpoints del contrato en memoria (persistido en AsyncStorage).
- Código OTP válido: `123456`; OTP expirado: `000000` (responde 410).
- Usuario demo: `demo@hallado.com` / `Demo1234` (5 devoluciones + insignia). Otro: `ana@hallado.com` / `Ana12345`.
- Con el backend real: `USE_MOCK = false` y ajustar `API_BASE_URL`.

Ajustar `API_BASE_URL` en `config/env.js` (emulador Android: `http://10.0.2.2:PUERTO/api`; celular físico: IP de la PC en la red local).

## Agregar una pantalla al flujo principal (tabs)
1. Crear la pantalla en `screens/<tema>/MiPantalla.js` y, si tiene varias, un stack en `navigation/MiTemaNavigator.js` (como `ProfileNavigator`).
2. Registrarla en `navigation/AppNavigator.js`:
   ```js
   <Tab.Screen name="Buscar" component={BuscarNavigator} />
   ```
3. No tocar `AuthContext`, `RootNavigator` ni `api.js`: la sesión ya está resuelta.

## Llamar a la API
Usar la instancia compartida; ya adjunta el token y cierra sesión ante un 401:
```js
import { api } from '../services/api';
export const getPublicaciones = async () => (await api.get('/publicaciones')).data;
```
Para mostrar errores: `getErrorMessage(error, { 409: 'Mensaje propio' })` de `services/errors.js`.

## Datos de la sesión
```js
import { useAuth } from '../hooks/useAuth';
const { user, logout } = useAuth();   // user.id, user.name, user.phoneVisible, ...
```
Si una pantalla edita datos del usuario, llamar a `updateUser({ ... })` para refrescar la sesión.

## Abrir el perfil público de otra persona
Desde cualquier tab (por ejemplo el detalle de publicación, punto 4):
```js
navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId } });
```

## Componentes reutilizables
`Screen`, `Button`, `TextField`, `ErrorText`, `Loading`, `Avatar`, `BadgeChip`, `ReputationSummary`, `BarrioPicker` (en `components/`); colores y espaciados en `config/theme.js`; validaciones en `utils/validators.js`.

## Reglas del equipo
- El token solo se guarda en SecureStore (`services/storage.js`), nunca en AsyncStorage.
- Si es sensible, SecureStore; si es preferencia o caché, AsyncStorage.
- Instalar dependencias con `npx expo install`.
- Validar con `npx expo lint` antes de integrar.
