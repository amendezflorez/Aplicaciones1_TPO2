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

## Puntos 3 y 4 (buscador, resultados, detalle de publicación)

Ya construidos (tab "Buscar"). Lo que el resto del equipo puede reusar en vez de duplicar:

**Servicios** (`services/`): `publicacionesService.js` (buscar/detalle), `alertasService.js`
(crear/listar/borrar — el Punto 9 lo necesita para "Mis alertas" y el indicador de
novedad), `seguimientosService.js` (seguir/dejar de seguir/listar — el Punto 9 lo
necesita para "Seguidas"), `reclamosService.js` (crear reclamo, consultar el propio, subir
la foto de "Lo encontré" — el Punto 7 lo necesita para la bandeja de reclamos).

**Componentes** (`components/`): `PublicationCard`, `EstadoChip`, `PhotoGallery`,
`CategoriaPicker`, `BarrioOUbicacionPicker`, `RangoFechaPicker`.

**Constantes** (`config/constants.js`): `CATEGORIAS`, `RANGOS_FECHA`, `FRANJAS_HORARIAS`.

**Abrir el detalle de una publicación** desde cualquier tab (mismo patrón que el perfil
público de arriba — lo necesitan, por ejemplo, "Mis alertas"/"Seguidas" del Punto 9 o la
bandeja de reclamos del Punto 7):
```js
navigation.navigate('Buscar', { screen: 'DetallePublicacion', params: { id } });
```

**Backend (`backend/`)**: entidades `Publicacion`, `FotoPublicacion`, `Alerta`,
`Seguimiento`, `Reclamo` — contrato completo en `.docs/PLAN_puntos_3_y_4.md` (sección 3).
La sección 0 de ese plan dice explícitamente qué le falta a cada entidad para los puntos
siguientes (por ejemplo, `Reclamo.estado` hoy solo llega a `pendiente`: el Punto 7 agrega
aceptar/rechazar y el vencimiento a 48h sobre esta misma entidad, no una propia). Ojo:
`ReclamoService.crear` ya tiene un tope defensivo de 3 intentos por publicación+autor
(antes de que el Punto 7 exista) — si el límite real que pide la consigna es otro, ajustar
ahí, no agregar una segunda validación en paralelo.

## Reglas del equipo
- El token solo se guarda en SecureStore (`services/storage.js`), nunca en AsyncStorage.
- Si es sensible, SecureStore; si es preferencia o caché, AsyncStorage.
- Instalar dependencias con `npx expo install`.
- Validar con `npx expo lint` antes de integrar.
