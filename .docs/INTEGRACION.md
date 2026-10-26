# Guía de integración — Puntos 1 y 2

Para quienes desarrollan los demás puntos (buscador, publicaciones, reclamos, etc.).

## Correr la app
```
npm install
npx expo start        # Android: tecla "a" (emulador) o Expo Go con QR
```
## Backend Java (puntos 1 y 2)
Hay un backend real en `backend/` (Spring Boot/Maven) que implementa el contrato de la sección 4 del plan. Con `USE_MOCK = false` en `config/env.js` (valor actual) la app le pega a él:
```
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```
Queda en `http://localhost:3000/api` (o `http://10.0.2.2:3000/api` desde el emulador), que ya coincide con `API_BASE_URL`. Detalle en `backend/README.md` (usuarios demo, cómo ver el código OTP, consola de H2).

## Backend simulado (mock), por si no querés levantar el backend Java
Con `USE_MOCK = true` en `config/env.js` la app funciona sin ningún servidor: `services/mock/mockAdapter.js` responde los endpoints del contrato en memoria (persistido en AsyncStorage).
- Código OTP válido: `123456`; OTP expirado: `000000` (responde 410).
- Usuario demo: `demo@hallado.com` / `Demo1234` (5 devoluciones + insignia). Otro: `ana@hallado.com` / `Ana12345` (los mismos usuarios existen semillados en el backend Java).

Ajustar `API_BASE_URL` en `config/env.js` si el backend corre en otro puerto o si se usa desde un celular físico (IP de la PC en la red local en vez de `10.0.2.2`).

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
