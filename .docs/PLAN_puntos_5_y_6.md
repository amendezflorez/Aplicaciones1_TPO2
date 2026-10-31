# Plan — Puntos 5 y 6 (Publicar un Hallazgo o Pérdida y Modo Sin Conexión)

App **Hallado**. Este documento cubre:

5. **Publicar un Hallazgo o una Pérdida**
6. **Modo Sin Conexión**

Se apoya en lo ya construido para los puntos 1-4 (`AuthContext`, `api.js`, la entidad `Publicacion`/`FotoPublicacion` y `PublicacionMapper` del plan 3-4) sin tocar su contrato existente, siguiendo las reglas de `.docs/INTEGRACION.md`. Este documento se escribió en dos entregas: primero el **backend completo del Punto 5** (secciones 0-7: alta, "Mis publicaciones", renovación, vencimiento automático), después su **frontend completo** (secciones 8-13: wizard de carga guiada con borrador persistente, "Mis publicaciones", navegación). El **Punto 6 completo** (cola offline, caché de publicaciones consultadas, búsqueda sin conexión) sigue fuera de ambas entregas — ver sección 0 y 13.

## 0. Límites con otros puntos (importante para no pisar trabajo ajeno)

- La entidad `Publicacion` y `FotoPublicacion` ya existían (Punto 3-4, `PLAN_puntos_3_y_4.md`). Este plan las **extiende** (agrega `clientRequestId`) en vez de duplicarlas, siguiendo la regla que ya dejó escrita ese plan en su sección 0.
- `PublicacionMapper.toDetalle` ya hacía la gating de `direccionExacta`/`latExacta`/`lngExacta` según `esPropia`/reclamo aceptado; el alta y la renovación reusan ese mismo mapper para sus respuestas, así que la gating no se reimplementa en ningún lado nuevo.
- `EstadoPublicacion.EN_RECLAMO`/`RESUELTA` siguen siendo responsabilidad exclusiva de `ReclamoService` (Punto 7, ya integrado). Este plan **no** toca esas transiciones: el vencimiento automático solo actúa sobre `ABIERTA`, y `renovar` solo acepta publicaciones `ABIERTA` o `VENCIDA` — nunca `EN_RECLAMO` ni `RESUELTA` — justamente para no pisar el estado que gobierna el Punto 7.
- **Lo que esta entrega (backend + frontend del Punto 5) NO construye:** el **Punto 6 completo** (modo sin conexión): caché de últimas publicaciones consultadas, búsquedas sin conexión con aviso de datos no actualizados, deshabilitar acciones que requieren red, y una cola que reintente el alta cuando se publica sin conexión. Lo que sí queda preparado para que el Punto 6 no tenga que tocar lo ya hecho (ver secciones 3 y 10): `clientRequestId` del lado del backend, y del lado del frontend el módulo `services/publicarPublicacion.js` (`enviarPublicacion`, separado de cualquier pantalla) y `services/borradorPublicacionStorage.js`, pensados desde el principio para que una cola offline los reutilice tal cual en vez de reimplementar la subida de fotos y el alta.
- Quien construya el Punto 6 debe reusar `publicacionesService.js`/`publicarPublicacion.js`/`borradorPublicacionStorage.js` (sumarles lo que haga falta, no crear módulos paralelos) y el patrón de subida de fotos en dos pasos ya usado por `userService.uploadPhoto`/`reclamosService.subirFotoReclamo`.

## 1. Alcance técnico

Mismas reglas de `AGENTS.md`/los planes anteriores: backend Java 21 + Spring Boot 4.1 en `backend/` (DTOs `record`, JPA, `JwtAuthFilter`, `GlobalExceptionHandler`, sin Spring Security), lógica de negocio en `service/`, controllers finos con `@RequestAttribute("userId")`, errores vía la jerarquía `ApiException`. No se agregan dependencias nuevas: todo lo del Punto 5 se resuelve con lo que ya trae el backend (`PhotoStorageService`, `@Scheduled` ya habilitado en `BackendApplication`, bloqueo pesimista `findByIdForUpdate` ya usado por `ReclamoService`).

Las secciones 0-7 son la entrega backend; el frontend (JavaScript, React Navigation, sin TypeScript/Redux/librerías de UI) que lo consume está documentado en las secciones 8-13, incluyendo la única dependencia nueva que suma (`expo-file-system`, instalada con `npx expo install` — ver sección 9).

## 2. Estructura de carpetas (suma a la de puntos 3-4)

```text
backend/src/main/java/com/hallado/backend/
  entity/
    Publicacion.java                    # + clientRequestId (único por publicador)
  repository/
    PublicacionRepository.java          # + findByPublicadorIdAndClientRequestId,
                                         #   findByPublicadorIdOrderByCreadaEnDesc,
                                         #   findByEstadoAndVenceEnBefore
  dto/
    request/CrearPublicacionRequest.java
    response/MiPublicacionResponse.java
  service/
    PublicacionService.java             # + subirFoto, crear, getMisPublicaciones,
                                         #   renovar, vencimiento automático
    PublicacionMapper.java              # + toMia
  controller/
    PublicacionController.java          # + POST /publicaciones/fotos, POST /publicaciones,
                                         #   GET /publicaciones/mias,
                                         #   POST /publicaciones/{id}/renovar
```

Nada en `FotoPublicacion`, `PhotoStorageService`, `WebConfig` ni `GlobalExceptionHandler` cambia: se reusan tal cual.

## 3. Contrato de la API REST (Punto 5)

Base `API_BASE_URL`, todas las rutas requieren `Authorization: Bearer <JWT>` (no están en `JwtAuthFilter.PUBLIC_PREFIXES`).

| Método | Ruta | Body/Query | Respuesta |
|---|---|---|---|
| POST | `/publicaciones/fotos` | `multipart/form-data`, campo `foto` | `{ photoUrl }` (`200`). Mismo `PhotoStorageService` que `/users/me/photo` y `/reclamos/foto`. |
| POST | `/publicaciones` | `CrearPublicacionRequest` (ver abajo) | `PublicacionDetalleResponse` (el mismo DTO de `GET /publicaciones/{id}`). `201` si crea una publicación nueva; `200` con la publicación ya existente si `clientRequestId` repite uno del mismo publicador. |
| GET | `/publicaciones/mias` | — | `MiPublicacionResponse[]`, más recientes primero, **sin** filtrar por estado (a diferencia del buscador del Punto 3). |
| POST | `/publicaciones/{id}/renovar` | — | `MiPublicacionResponse` actualizado. Solo el publicador; solo si `puedeRenovar` (ver 4.3). |

`CrearPublicacionRequest`:
```json
{
  "tipo": "perdido|encontrado",
  "titulo": "…",
  "descripcion": "…",
  "categoria": "documentos|llaves|electronica|mascotas|ropa|otros",
  "fechaSuceso": "2026-10-29T15:00:00Z",
  "franjaHoraria": "mañana|tarde|noche",
  "barrioId": "b1",
  "direccionExacta": "Av. Santa Fe 3253",
  "latExacta": -34.5885,
  "lngExacta": -58.4205,
  "fotos": ["https://…/uploads/…jpg"],
  "preguntaVerificacion": "¿De qué color es el llavero?",
  "respuestaVerificacion": "Marrón, de cuero",
  "clientRequestId": "uuid-generado-por-el-cliente"
}
```
Campos opcionales: `franjaHoraria`, `clientRequestId`, y `preguntaVerificacion`/`respuestaVerificacion` (solo si `tipo=perdido`: ahí están prohibidos). Todo lo demás es obligatorio — ver 4.2 para el detalle de cada validación y su mensaje.

`MiPublicacionResponse` (item de "Mis publicaciones"):
```json
{ "id": "…", "tipo": "encontrado", "titulo": "…", "categoria": "mascotas",
  "barrio": { "id": "b1", "name": "Palermo" }, "fechaSuceso": "2026-10-29T15:00:00Z",
  "lat": -34.58, "lng": -58.42, "fotoPrincipalUrl": "…|null",
  "estado": "abierta|en_reclamo|resuelta|vencida",
  "creadaEn": "2026-10-30T16:22:21Z", "venceEn": "2026-11-29T16:22:21Z",
  "puedeRenovar": true }
```

## 4. Diseño de la solución implementada

### 4.1 Idempotencia del alta (`clientRequestId`)

`Publicacion.clientRequestId` es un `String` opcional con una **constraint única compuesta** `(publicador_id, client_request_id)` — único por publicador, no global, para que el cliente solo tenga que generar un id sin colisión dentro de su propia sesión (p. ej. un UUID por intento de publicar), sin coordinarse con otros usuarios. H2 (como la mayoría de las bases) permite múltiples `NULL` en una constraint única, así que las publicaciones sin `clientRequestId` (hechas con conexión, sin pasar por una cola offline) no se ven afectadas.

`PublicacionService.crear` primero busca si ya existe una publicación con ese `(publicadorId, clientRequestId)`; si existe, devuelve esa publicación tal cual está (sin volver a validar ni tocar nada) con `201` reemplazado por `200`. Esto es lo que necesita el Punto 6: una cola offline que reintenta un `POST` cuya respuesta se perdió (conexión cortada justo después de que el servidor ya guardó la publicación) no duplica el alta, porque el segundo intento con el mismo `clientRequestId` es un no-op que solo relee lo ya creado.

### 4.2 Validaciones del alta (`POST /publicaciones`)

En orden, todas con `ApiException(BAD_REQUEST, mensaje)` (mismo patrón manual que `ReclamoService`, sin anotaciones `@Valid`/`@NotBlank` para mantener el estilo ya usado en el resto del backend):

| Campo | Regla | Mensaje |
|---|---|---|
| `tipo` | obligatorio, `perdido`\|`encontrado` | "tipo es obligatorio." / lo valida `TipoPublicacion.fromJson` |
| `titulo` | obligatorio, no vacío | "El título es obligatorio." |
| `descripcion` | obligatorio, no vacío | "La descripción es obligatoria." |
| `categoria` | obligatoria, una de las 6 fijas | "La categoría es obligatoria." / `Categoria.fromJson` |
| `fechaSuceso` | obligatoria, **no futura** (`isAfter(Instant.now())` rechazado) | "La fecha del suceso no puede ser futura." |
| `franjaHoraria` | opcional (igual que en la entidad) | — |
| `barrioId` | obligatorio, debe existir | "El barrio elegido no existe." |
| `direccionExacta` | obligatoria (texto libre) | "La dirección exacta es obligatoria." |
| `latExacta`/`lngExacta` | obligatorias ambas | "Las coordenadas del lugar son obligatorias (usá tu ubicación actual)." |
| `fotos` | al menos 1 URL no vacía | "Agregá al menos una foto." |
| `preguntaVerificacion`/`respuestaVerificacion` | **obligatorias** si `tipo=encontrado`, **prohibidas** si `tipo=perdido` | mensaje específico para cada caso |

Decisión de diseño sobre dirección/coordenadas: el TP dice "indicar el barrio y la dirección exacta, ya sea escribiéndola o tomando la ubicación actual (cargar coordenadas)" — se interpretó como que el texto libre y las coordenadas son dos campos independientes que **ambos** terminan necesitándose (el texto para mostrarlo al dueño cuando corresponda, las coordenadas para calcular la ubicación aproximada del mapa de resultados, sección 4.3 abajo), así que el backend los exige a los dos. El frontend puede resolverlo con un solo paso: tomar la ubicación actual rellena automáticamente ambos (coordenadas + reverse-geocoding o un texto editable), y quien prefiera escribir la dirección a mano igual puede capturar coordenadas aproximadas del mismo picker de ubicación que ya usa el Punto 3 (`useUbicacionActual`).

### 4.3 Ubicación aproximada (`lat`/`lng`)

El detalle (Punto 4) y el buscador (Punto 3) ya asumían que `lat`/`lng` (siempre visibles) son una versión aproximada de `latExacta`/`lngExacta` (gateadas). Como el Punto 5 es quien ahora las genera, `PublicacionService.crear` calcula un offset aleatorio de hasta **±0.0015°** (~150 m) en cada eje sobre la coordenada exacta cargada — mismo orden de magnitud que usaba el offset fijo que `DataSeeder` aplicaba antes de que existiera este alta real. El cálculo se hace **una sola vez, al crear** la publicación, y el resultado queda persistido en `lat`/`lng`; no se recalcula en cada lectura (si no, "ordenar por cercanos" o el filtro `radioKm` del buscador darían resultados inconsistentes entre un request y el siguiente).

### 4.4 Vencimiento automático

Las publicaciones vencen a los 30 días de creadas (`venceEn = creadaEn + 30 días`, ya lo hacía `DataSeeder`; ahora lo hace el alta real). La transición `ABIERTA → VENCIDA` se resuelve **de las dos formas a la vez**, mismo criterio que ya usa `ReclamoService` para vencer reclamos pendientes:

1. **`@Scheduled(fixedDelay = 60000)`**: cada 60 segundos, un job de mantenimiento busca publicaciones `ABIERTA` con `venceEn` pasado y las pasa a `VENCIDA`.
2. **Al leer**: `buscar()`, `getDetalle()` y `getMisPublicaciones()` aplican la misma regla antes de responder, para que el estado nunca se vea desactualizado aunque el scheduler todavía no haya pasado (igual que `ReclamoService.vencerPendientes()` se llama tanto desde su `@Scheduled` como desde `obtenerMio`/`listar`/`decidir`).

Deliberadamente **solo actúa sobre `ABIERTA`**: una publicación `EN_RECLAMO` o `RESUELTA` no vence por esta regla, aunque su `venceEn` original haya pasado — esos estados los gobierna por completo `ReclamoService` (Punto 7), y no tendría sentido vencer una publicación con un reclamo activo o ya resuelto.

### 4.5 "Mis publicaciones" y renovación

`GET /publicaciones/mias` trae **todas** las publicaciones del usuario autenticado sin filtrar por estado (a diferencia del buscador, que solo muestra `abierta`/`en_reclamo`), porque la sección "Mis publicaciones" del TP pide ver explícitamente los 4 estados.

`POST /publicaciones/{id}/renovar`: solo el publicador (`403` si no), y solo si `puedeRenovar` es `true`. Criterio (documentado en el propio mensaje de error):
- `estado = VENCIDA` → siempre renovable.
- `estado = ABIERTA` y `venceEn` está a **5 días o menos** de la fecha actual ("próxima a vencer") → renovable.
- `estado = EN_RECLAMO` o `RESUELTA` → **nunca** renovable desde este endpoint (ver sección 0: esos estados son del Punto 7).

Al renovar: `estado = ABIERTA`, `venceEn = ahora + 30 días`. El mismo criterio (`puedeRenovar`) se expone precalculado en cada item de `MiPublicacionResponse`, así el frontend solo muestra/oculta el botón sin reimplementar la regla.

### 4.6 `respuestaVerificacion` nunca se expone

Se verificó explícitamente (manualmente, con requests reales contra el backend corriendo) que `respuestaVerificacion` no aparece en ningún DTO de lectura: ni en `PublicacionResumenResponse` (buscador), ni en `PublicacionDetalleResponse` (detalle y la propia respuesta del alta), ni en `MiPublicacionResponse` ("mis publicaciones"). Solo existe en la entidad `Publicacion` y en el campo de entrada `CrearPublicacionRequest.respuestaVerificacion`; su comparación contra la respuesta de un reclamo "Es mío" sigue siendo trabajo del Punto 7 (ya implementado: el publicador la evalúa manualmente al decidir, sin comparación automática — ver `PLAN_punto_7.md` sección 6.2).

## 5. Criterios de aceptación

- [x] `POST /publicaciones/fotos` sube una foto reusando `PhotoStorageService` y devuelve su URL.
- [x] `POST /publicaciones` crea la publicación con `estado=abierta` y `venceEn = creadaEn + 30 días`.
- [x] `tipo=encontrado` exige `preguntaVerificacion`+`respuestaVerificacion`; `tipo=perdido` los rechaza.
- [x] Al menos una foto es obligatoria; faltan título/descripción/categoría/fecha/barrio/dirección/coordenadas → `400` con mensaje específico.
- [x] `fechaSuceso` futura se rechaza.
- [x] `lat`/`lng` aproximadas se calculan a partir de `latExacta`/`lngExacta` con un offset aleatorio acotado, una sola vez al crear.
- [x] Reenviar el mismo `clientRequestId` para el mismo publicador no duplica la publicación: devuelve la existente con `200`.
- [x] `GET /publicaciones/mias` devuelve las publicaciones del usuario con los 4 estados posibles, más recientes primero.
- [x] `POST /publicaciones/{id}/renovar` solo lo puede hacer el publicador (`403` si no), solo si está vencida o a 5 días o menos de vencer (`400` si no corresponde todavía); al renovar, `estado=abierta` y `venceEn` se extiende 30 días.
- [x] Las publicaciones `abierta` vencidas pasan a `vencida` automáticamente (job cada 60s) y también al leerlas (buscador, detalle, mis publicaciones) sin esperar al job.
- [x] `respuestaVerificacion` no aparece en ningún DTO de lectura (verificado con requests reales).
- [x] La gating de `direccionExacta`/`latExacta`/`lngExacta` del Punto 4 (`PublicacionMapper.toDetalle`) sigue funcionando sin cambios sobre publicaciones creadas por este alta (verificado: el propio publicador las ve, un tercero sin reclamo aceptado no).
- [x] `backend/mvnw test` (arranque completo del contexto Spring) y una compilación limpia (`mvnw compile`) pasan con los cambios.

## 6. Cómo probarlo

Arrancar el backend (`cd backend && ./mvnw spring-boot:run`, puerto `3000`, context-path `/api`) y usar los usuarios semillados por `DataSeeder` (`demo@hallado.com` / `Demo1234`, `ana@hallado.com` / `Ana12345`).

```bash
# 1) Login para obtener el token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@hallado.com","password":"Demo1234"}' | jq -r .token)

# 2) Subir una foto (primer paso del alta)
curl -s -X POST http://localhost:3000/api/publicaciones/fotos \
  -H "Authorization: Bearer $TOKEN" \
  -F "foto=@/ruta/a/una/foto.jpg;type=image/jpeg"
# -> { "photoUrl": "http://localhost:3000/api/uploads/u-demo-....jpg" }

# 3) Crear la publicación (tipo=perdido: SIN pregunta/respuesta de verificación)
curl -s -X POST http://localhost:3000/api/publicaciones \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tipo": "perdido",
    "titulo": "Perdí mis llaves con llavero rojo",
    "descripcion": "Se me cayeron cerca de la plaza",
    "categoria": "llaves",
    "fechaSuceso": "2026-10-29T15:00:00Z",
    "franjaHoraria": "tarde",
    "barrioId": "b1",
    "direccionExacta": "Av. Santa Fe 3253",
    "latExacta": -34.5885,
    "lngExacta": -58.4205,
    "fotos": ["http://localhost:3000/api/uploads/u-demo-....jpg"],
    "clientRequestId": "un-uuid-generado-por-el-cliente"
  }'
# -> 201, PublicacionDetalleResponse completo

# 4) Repetir el mismo POST con el mismo clientRequestId -> 200, misma publicación (no duplica)

# 5) "Mis publicaciones"
curl -s http://localhost:3000/api/publicaciones/mias -H "Authorization: Bearer $TOKEN"

# 6) Renovar (falla con 400 hasta que esté vencida o a <=5 días de vencer)
curl -s -X POST http://localhost:3000/api/publicaciones/{id}/renovar -H "Authorization: Bearer $TOKEN"

# 7) Publicar algo "encontrado" (pregunta/respuesta de verificación OBLIGATORIAS)
curl -s -X POST http://localhost:3000/api/publicaciones \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tipo": "encontrado", "titulo": "Encontré un gato gris",
    "descripcion": "Cerca del parque, muy manso", "categoria": "mascotas",
    "fechaSuceso": "2026-10-29T15:00:00Z", "barrioId": "b1",
    "direccionExacta": "Plaza Italia", "latExacta": -34.58, "lngExacta": -58.42,
    "fotos": ["http://localhost:3000/api/uploads/u-demo-....jpg"],
    "preguntaVerificacion": "¿De qué color es el collar?",
    "respuestaVerificacion": "No tiene collar, mancha blanca en la cola"
  }'
# Buscarla como otro usuario con GET /publicaciones?tipoBuscado=perdido&categoria=mascotas
# y confirmar que "respuestaVerificacion" no aparece en ningún lado de la respuesta.
```

También se puede inspeccionar/editar la base directamente vía la consola H2 (`http://localhost:3000/api/h2-console`, JDBC URL `jdbc:h2:file:./data/hallado`, user `sa`, sin password) — útil para forzar `venceEn` al pasado y probar el vencimiento automático sin esperar 30 días reales (así se validó manualmente el flujo completo vencer → `puedeRenovar=true` → `renovar` → `estado=abierta` de nuevo).

## 7. Riesgos y pendientes de definir con el equipo

1. **Frontend del Punto 5**: ya implementado — ver secciones 8-13.
2. **Borrador local**: ya implementado del lado del frontend (`services/borradorPublicacionStorage.js`, `AsyncStorage` + `expo-file-system`), sin ningún endpoint de "borradores" en el servidor — el backend sigue sin saber nada de una publicación hasta el `POST` final. Ver sección 10.2.
3. **Punto 6 (offline) completo**: cola de alta pendiente de envío, caché de últimas publicaciones vistas, búsqueda sin conexión con aviso, deshabilitar acciones que requieren red. `clientRequestId` (backend) y `services/publicarPublicacion.js`/`services/borradorPublicacionStorage.js` (frontend) ya quedaron preparados para que esa cola los reutilice, pero la cola ni `NetInfo` en sí no están implementados — ver sección 13.
4. **"Próxima a vencer" = 5 días**: es un criterio razonable pero no está en la letra del TP (que solo dice "vencen a los 30 días y pueden renovarse"); si la cátedra da un número distinto, es un solo valor a cambiar (`PublicacionService.VENTANA_RENOVACION_ANTICIPADA`).
5. **Dirección y coordenadas siempre obligatorias**: ~~se decidió exigir ambas (ver sección 4.2)~~ — **resuelto en la sección 14.2**: ahora alcanza con una de las dos (consigna del TP), con el centro del barrio como respaldo del lado del servidor y `Location.geocodeAsync` como mejor esfuerzo del lado del cliente.
6. **Fotos de publicación en disco local**: mismo `PhotoStorageService` que fotos de perfil/reclamo — para desplegar en más de una instancia hace falta almacenamiento compartido (ya señalado como pendiente en `PLAN_punto_7.md`).

## 8. Alcance técnico (frontend)

Mismas reglas que los planes anteriores: JavaScript puro (sin TypeScript), React Navigation v7, sin Redux/Zustand/librerías de UI o forms, `StyleSheet` + `config/theme.js`, componentes compartidos ya existentes (`Screen`, `Button`, `TextField`, `ErrorText`, `Loading`, `CategoriaPicker`, `BarrioPicker`), `getErrorMessage` para errores de red y un objeto `errors` por paso para validación de campos (mismo patrón que `EditProfileScreen`/`IniciarReclamoScreen`).

Una sola dependencia nueva, instalada con `npx expo install expo-file-system` (quedó en `package.json` como `~57.0.7`, verificada contra `node_modules` tras la instalación real, no contra memoria): hace falta para copiar las fotos elegidas a un directorio persistente de la app (sección 10.4) — las URIs que devuelve `expo-image-picker` viven en caché y el sistema puede borrarlas en cualquier momento, algo crítico acá porque el borrador puede quedar guardado días. La API usada es la que SDK 57 expone como default de `expo-file-system` (clases `File`/`Directory`/`Paths`, no el namespace "legacy" de versiones anteriores a la 53) — confirmado leyendo los `.d.ts` del paquete ya instalado, no por memoria.

`npx expo-doctor` (21/21 checks) y `npx expo lint` (sin errores ni warnings) corrieron limpios sobre todo el código nuevo.

Decisión deliberada: no se agregó `expo-file-system` a `plugins` en `app.json`. El plugin del paquete solo sirve para pedir permisos de almacenamiento compartido de Android (`READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`) y un par de flags de iOS para compartir archivos con otras apps — nada de lo que usa este plan: todas las fotos del borrador viven en `Paths.document` (directorio privado de la app, scoped storage, sin permiso de runtime) y las URIs que entrega el picker ya son accesibles sin permisos adicionales. Pedir esos permisos sin usarlos solo agregaría un prompt innecesario en Android < 13.

## 9. Estructura de carpetas (frontend, suma a la de puntos 3-4/7)

```text
config/
  constants.js                        # + STORAGE_KEYS.borradorPublicacionPrefix, MAX_FOTOS_PUBLICACION
navigation/
  AppNavigator.js                     # + tab "Publicar"
  PublicarNavigator.js                # Stack: MisPublicaciones (inicial), PublicarWizard
screens/
  publicar/
    MisPublicacionesScreen.js         # listado + "Renovar" + "+ Nueva publicación"
    PublicarWizardScreen.js           # wizard de carga guiada (pasos a-f)
  buscar/
    ResultadosScreen.js               # placeholder "Próximamente" reemplazado: navega al wizard con prefill
    DetallePublicacionScreen.js       # placeholder "Próximamente" reemplazado: navega a "Mis publicaciones"
services/
  publicacionesService.js             # + subirFotoPublicacion, crearPublicacion, getMisPublicaciones, renovarPublicacion
  publicarPublicacion.js              # enviarPublicacion(borrador, callbacks) — módulo propio, sin UI (sección 10.3)
  borradorPublicacionStorage.js       # AsyncStorage + expo-file-system: persistencia del borrador y sus fotos
utils/
  uuid.js                             # generarIdLocal() para clientRequestId
```

## 10. Diseño de la solución implementada

### 10.1 Dónde vive "Publicar": tab propia

Se eligió una tab nueva "Publicar" en `AppNavigator` (entre Buscar y Reclamos) en vez de colgarla de Perfil, por el mismo criterio que ya se usó para darle su propia tab a Reclamos: el TP describe "Publicar un hallazgo o pérdida" como una sección de primer nivel con su propia subsección ("Mis publicaciones"), no un ajuste de cuenta. `PublicarNavigator` (Stack) tiene "Mis publicaciones" como pantalla inicial, no el wizard — mismo criterio que `ReclamosNavigator`: la bandeja/listado es la puerta de entrada natural, y desde ahí se dispara "+ Nueva publicación" hacia el wizard, en vez de que la persona caiga directo en un formulario cada vez que toca la tab.

### 10.2 Una sola pantalla con pasos internos, no varias pantallas de stack

`PublicarWizardScreen` es una pantalla, con los pasos a-f manejados por `useState` interno (`indice` + un array `pasos` calculado con `useMemo`), igual que `BuscadorInicialScreen` ya hace para sus 4 pasos — con un motivo extra acá: todo el estado del formulario tiene que autoguardarse junto en cada paso (sección 10.4), y repartirlo en pantallas separadas de un stack obligaría a pasarlo entero de params en params en cada "Siguiente" (React Navigation no comparte estado entre pantallas salvo por params o Context) o a crear un Context nuevo solo para esto — más complejidad que mantener un único componente con el mismo patrón ya usado en el repo. El paso "Verificación" solo existe si `tipo=encontrado` (la pregunta/respuesta están prohibidas para `tipo=perdido` en el backend, sección 4.2): la lista `pasos` se arma dinámicamente con `useMemo`, así que el indicador "Paso X de Y" siempre cuenta los pasos reales de ese flujo.

Pasos, en orden:
1. Tipo (a): dos botones grandes "Perdí algo"/"Encontré algo" (mismo estilo que el paso 1 de `BuscadorInicialScreen`), avanza solo al elegir.
2. Fotos (b): grilla de miniaturas con botones "atrás/adelante" para reordenar y "eliminar" por foto, más "Cámara"/"Galería" para agregar (hasta `MAX_FOTOS_PUBLICACION = 6`). La galería usa selección múltiple (API de `expo-image-picker` 57.0.20, confirmada contra los `.d.ts` instalados) para elegir varias de una.
3. Detalles (c): título, descripción, categoría (`CategoriaPicker` sin la opción "Cualquiera", a diferencia de cómo se usa en el buscador), fecha del suceso (`DateTimePicker` modo fecha, sin fechas futuras, mismo patrón que `RangoFechaPicker`) y franja horaria (chips con `FRANJAS_HORARIAS`, opcional, igual que en el backend).
4. Ubicación (d): `BarrioPicker` (obligatorio) + un campo de dirección/referencia exacta (obligatorio, texto libre) + botón "Usar mi ubicación actual" (`useUbicacionActual`, obligatorio para tener las coordenadas exactas). No se reusó `BarrioOUbicacionPicker`: ese componente trata barrio y ubicación como mutuamente excluyentes (así es el buscador, sección 4.1 de `PLAN_puntos_3_y_4.md`), pero acá los tres datos (barrio, dirección escrita, coordenadas) son independientes y los tres son obligatorios (sección 4.2 de este plan, backend).
5. Verificación (e, solo si `tipo=encontrado`): pregunta + respuesta, con un texto aclarando que la respuesta es privada y nunca se muestra a nadie (consigna del TP, punto 5).
6. Resumen (f): repaso de lo cargado + miniaturas, botón "Publicar" dispara el envío (sección 10.3).

Cada "Siguiente" valida solo los campos del paso actual antes de avanzar, con errores por campo igual que el resto del repo.

### 10.3 Envío separado de la UI (services/publicarPublicacion.js)

`enviarPublicacion(borrador, callbacks)` es una función async sin ningún import de React, que recibe el borrador tal cual lo persiste `borradorPublicacionStorage` (objeto plano con un arreglo de fotos, cada una con su URI local y su URL remota si ya se subió) y: sube las fotos que todavía no tengan URL resuelta, en orden; avisa con un callback después de cada una, para que quien llama persista ese progreso parcial; y hace el alta final, omitiendo pregunta/respuesta de verificación si el tipo no es "encontrado" (defensivo, por si un borrador viejo trae esos campos de un intento anterior con otro tipo).

Esto es justo lo que pide el enunciado: queda listo para que el Punto 6 (cola offline) la llame directo desde un procesador en segundo plano cuando vuelva la conexión, sin tener que montar `PublicarWizardScreen` ni ninguna otra pantalla. Si la subida de una foto a mitad de una tanda falla (ej. se corta la conexión), las fotos anteriores ya quedaron con su URL persistida en el borrador: "Retomar" en el próximo intento no las vuelve a subir, solo retoma desde la que falló.

### 10.4 Borrador persistente (services/borradorPublicacionStorage.js)

- Texto y selecciones (tipo, título, descripción, categoría, fecha, franja, barrio, dirección, coordenadas, pregunta/respuesta, clientRequestId): `AsyncStorage`, con una clave por usuario (para no mezclar el borrador de una cuenta con el de otra en el mismo dispositivo si hacen logout/login — mismo criterio de "qué va en AsyncStorage" que ya documenta `INTEGRACION.md`).
- Fotos: cada una se copia, apenas se elige, a un directorio propio y persistente de la app con `expo-file-system` — la URI original del picker (caché) no es segura para un borrador que puede durar días. Al eliminar una foto del wizard también se borra su archivo, para no acumular basura entre ediciones.
- Autoguardado con debounce: un efecto en el wizard guarda el borrador 600ms después del último cambio relevante (no en cada tecla tipeada), y no corre hasta que se resolvió si había que ofrecer "Retomar"/"Descartar" (para no pisar un borrador existente con el estado inicial vacío mientras se está preguntando).
- Al entrar al wizard: si hay un borrador guardado, se muestra un aviso con "Descartar" (borra borrador + fotos y aplica el prefill que haya llegado por params, si se vino de ResultadosScreen) y "Retomar" (restaura todo el estado, reusando el mismo clientRequestId del borrador — necesario para que, si ese intento ya había llegado a crear la publicación en el backend pero la respuesta no volvió, reintentar no duplique).
- Al publicar con éxito: se borra la clave de AsyncStorage y el directorio entero de fotos de una sola vez.

### 10.5 "Mis publicaciones"

`MisPublicacionesScreen` pide la lista al enfocarse (se refresca sola al volver de publicar o de renovar) y reusa `PublicationCard` tal cual: `MiPublicacionResponse` ya trae exactamente los campos que ese componente espera (foto principal, categoría, barrio, fecha del suceso, estado), así que no hizo falta una card nueva. Cada item muestra además un botón "Renovar" cuando corresponde (el backend ya precalcula ese criterio, sección 4.5 — la pantalla no reimplementa la regla de "vencida o a 5 días o menos de vencer"). Tocar una publicación navega al mismo detalle del Punto 4 (mismo patrón cruzado entre tabs que ya documenta `INTEGRACION.md`).

### 10.6 Los dos placeholders reemplazados

- `ResultadosScreen.js` (estado vacío, botón "Publicar lo que perdí/encontré"): ahora navega al wizard pasando el tipo, la categoría y el barrio de la búsqueda activa como prefill — el tipo de la búsqueda es literalmente "perdí"/"encontré" tal como se eligió en el paso 1 del buscador, el mismo valor que espera el wizard (no hace falta invertirlo: el flip a "tipo opuesto" solo aplica a la búsqueda, no a lo que la persona va a publicar sobre su propia situación).
- `DetallePublicacionScreen.js` (botón "Gestionar publicación", visible si es la propia publicación): ahora navega a "Mis publicaciones". No se construyó una pantalla de gestión por-publicación aparte: "Mis publicaciones" ya es donde vive la única acción de gestión que expone el backend (renovar).

## 11. Criterios de aceptación (frontend)

- [x] El wizard cubre los 6 pasos (a-f) de la consigna, con el paso de verificación condicionado a tipo=encontrado.
- [x] Fotos: cámara o galería (selección múltiple), reordenables y eliminables antes de publicar.
- [x] Categoría reusa CategoriaPicker; barrio reusa BarrioPicker; fecha usa el datetimepicker ya instalado (sin fecha futura); franja horaria con los mismos valores que el backend.
- [x] Dirección exacta (texto) + ubicación actual (coordenadas) ambas obligatorias y ambas visibles en el paso "Ubicación".
- [x] "Encontrado" exige pregunta + respuesta de verificación, con aviso explícito de que la respuesta es privada; "Perdido" no muestra ese paso.
- [x] Resumen final antes de publicar; "Publicar" sube las fotos y hace el alta reusando enviarPublicacion (no hay lógica de red duplicada en la pantalla).
- [x] El borrador se autoguarda en cada paso (con debounce) en AsyncStorage, por usuario; las fotos se copian a un directorio persistente con expo-file-system, no quedan en la URI de caché del picker.
- [x] Al entrar al wizard con un borrador guardado, se ofrece Retomar/Descartar antes de mostrar cualquier paso.
- [x] Borrador y fotos se borran al publicar con éxito.
- [x] "Mis publicaciones" lista los 4 estados con EstadoChip (vía PublicationCard), muestra "Renovar" solo cuando corresponde, y abre el detalle existente al tocar un item.
- [x] Los dos placeholders "Próximamente" fueron reemplazados por navegación real.
- [x] expo lint y expo-doctor (21/21) corren sin errores sobre todo el código nuevo.
- [x] enviarPublicacion está en un módulo sin UI, listo para que el Punto 6 lo reutilice.

## 12. Cómo probarlo

Con el backend corriendo y la app contra él (USE_MOCK = false, API_BASE_URL apuntando a esa IP):

1. Loguearse con demo@hallado.com / Demo1234.
2. Ir a la tab Publicar y tocar "+ Nueva publicación".
3. Elegir "Perdí algo", cargar 1-2 fotos (probar cámara y galería), completar detalles con una fecha pasada, elegir barrio + escribir una dirección + tocar "Usar mi ubicación actual" (pide permiso de ubicación la primera vez), confirmar el resumen y publicar. Debería aparecer en "Mis publicaciones" con estado "Abierta".
4. Repetir eligiendo "Encontré algo": el wizard debe pedir pregunta + respuesta de verificación antes del resumen.
5. Probar el borrador: empezar una publicación, completar 2-3 pasos, salir de esa pantalla antes de publicar, volver a entrar a "Publicar" y tocar "+ Nueva publicación": debe aparecer el aviso "Publicación sin terminar" con Retomar/Descartar. "Retomar" debe reponer exactamente lo que se había cargado, fotos incluidas.
6. Probar "Renovar": no hay forma de llegar a una publicación vencida esperando 30 días reales; se puede forzar la fecha de vencimiento al pasado con la consola H2 tal como describe la sección 6 de este plan para el backend, y después ver que "Mis publicaciones" muestra el botón "Renovar" y que al tocarlo la publicación vuelve a "Abierta".
7. Probar el flujo cruzado: desde la tab Buscar, hacer una búsqueda sin resultados y tocar "Publicar lo que perdí/encontré" — debe abrir el wizard con el tipo (y categoría/barrio si se habían elegido) ya precargados.
8. Desde el detalle de una publicación propia, tocar "Gestionar publicación" — debe llevar a "Mis publicaciones".

## 13. Riesgos y pendientes de definir con el equipo (frontend)

1. Reordenar fotos con botones, no arrastre: se usaron flechas en vez de un drag-and-drop (que exigiría una librería de gestos no vista en clase). Es más lento para reordenar muchas fotos, pero cumple el requisito sin sumar dependencias ajenas al programa de la materia.
2. "Dirección o referencia exacta" como texto libre: no hay reverse-geocoding (ver riesgo 5 de la sección 7, backend) — la persona tiene que describir el lugar con sus palabras aunque ya haya tocado "Usar mi ubicación actual"; los dos campos no se autocompletan entre sí.
3. No hay progreso visual de subida de fotos: el botón "Publicar" queda en estado de carga durante toda la subida + alta, pero la persona no ve "foto 2 de 4" mientras tanto. enviarPublicacion ya expone el gancho necesario para agregarlo sin tocar la lógica de envío.
4. Punto 6 (offline) sigue sin implementarse: falta NetInfo, la cola de publicaciones "pendientes de envío", la caché de últimas publicaciones/búsquedas consultadas y deshabilitar acciones que requieren red con el aviso que pide el TP. enviarPublicacion y borradorPublicacionStorage ya están pensados para que esa cola los reutilice (correr enviarPublicacion sobre cada borrador pendiente cuando se detecte conexión), pero construir la cola en sí queda para esa entrega.
5. La carpeta del borrador no se limpia si la persona nunca publica ni descarta: si abandona el wizard sin tocar "Descartar" (por ejemplo cierra la app y nunca vuelve a esa sección), el borrador y sus fotos quedan guardados indefinidamente — es el comportamiento que pide la consigna ("al volver encuentra el borrador conservado"), pero vale la pena que el equipo lo tenga presente como posible fuente de espacio ocupado en el dispositivo a largo plazo.

## 14. Ajustes posteriores a la primera entrega del frontend (feedback de prueba en emulador)

Probar el paso "Dónde" del wizard en un emulador de Android (sin Google Play Services en esa imagen) encontró cuatro problemas reales, resueltos así:

### 14.1 `useUbicacionActual` colgado/con mensaje incorrecto en emuladores sin Google Play Services

El hook (compartido por el buscador y el Punto 5) pedía directamente `getCurrentPositionAsync({})` sin chequear nada antes. En un emulador sin Google Play Services (sin proveedor fused) eso puede no resolver nunca, y el único estado de error que existía (`permisoDenegado`) terminaba mostrando "revisá los permisos" aunque el permiso estuviera concedido — el verdadero problema (sin señal) no tenía ni detección ni mensaje propio.

Arreglado en el hook (no en cada pantalla, para que buscador y Punto 5 compartan el fix):
1. `Location.hasServicesEnabledAsync()` antes de pedir cualquier posición — si está apagado, error `'servicio'` con un mensaje específico, sin siquiera intentar `getCurrentPositionAsync`.
2. `Location.getLastKnownPositionAsync({ maxAge: 5 min })` primero (rápida, no todos los emuladores la soportan, por eso con `.catch(() => null)`); si no hay nada, recién ahí `getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`.
3. Esa segunda llamada corre con un timeout propio de ~10s implementado con `Promise.race` (`utils/promesaConTimeout.js`, reusado también para el geocoding de 14.2) — expo-location no expone uno nativo para esta función, y es justo lo que faltaba para no quedar "cargando" indefinidamente.
4. El estado que devuelve el hook pasó de un booleano `permisoDenegado` a un objeto `error: { tipo, mensaje } | null` con tres `tipo` posibles: `'permiso'`, `'servicio'`, `'sinSenal'` — cada uno con su propio mensaje. Para `'permiso'` el hook también expone `abrirConfiguracion` (`Linking.openSettings`), porque expo-location no puede volver a pedir el permiso después de un rechazo "no preguntar de nuevo": hay que mandar a la persona a los ajustes del sistema a mano.
5. Todo error real se loguea con `console.warn` antes de traducirlo a un mensaje para la persona, para poder diagnosticar.

`BarrioOUbicacionPicker` (compartido por `BuscadorInicialScreen` y el modal "Refinar" de `ResultadosScreen`) pasó de recibir `permisoDenegado` a recibir el mismo `error`, mostrando su mensaje y, si `tipo === 'permiso'`, un botón "Abrir configuración" — así el buscador se beneficia del mismo fix sin duplicar nada.

### 14.2 Validación del paso "Ubicación": dirección O ubicación, no las dos

La consigna dice "indicar el barrio y la dirección exacta, **ya sea escribiéndola o tomando la ubicación actual** del dispositivo" — es decir, alcanza con una de las dos formas de cargar la ubicación. El wizard (y el backend) exigían ambas siempre, así que con barrio + dirección escritos "Siguiente" seguía deshabilitado esperando coordenadas que nadie había pedido.

- **Frontend** (`PublicarWizardScreen.calcularErrores`): ahora exige `barrioId` siempre, y **o bien** `direccionExacta` no vacía **o bien** `latExacta`+`lngExacta` presentes — ya no las dos. El label del campo de texto aclara "(opcional si usás tu ubicación)".
- Si la persona solo escribe la dirección (nunca toca "Usar mi ubicación"), al tocar "Siguiente" se dispara en segundo plano `intentarGeocodificarDireccion` (`Location.geocodeAsync`, mismo timeout de 14.1), que completa `latExacta`/`lngExacta` si puede — **sin bloquear el avance**: si falla o tarda de más, el wizard sigue igual, el `catch` solo hace `console.warn`.
- Simétricamente, si la persona usa "Usar mi ubicación actual", `usarUbicacion` ahora llama a `Location.reverseGeocodeAsync` y, si el campo de dirección está vacío, lo completa con una sugerencia editable (`formatDireccionGeocodificada`, `utils/publicacionFormatters.js`) — nunca pisa lo que la persona ya escribió, y si el reverse geocoding falla no es un error, el campo simplemente queda como estaba.
- **Backend** (`PublicacionService.crear`): la misma relajación. Rechaza solo si **ambos** (dirección y coordenadas) faltan; si faltan las coordenadas pero hay barrio, usa el centro del barrio (`Barrio.lat`/`Barrio.lng`, campos nuevos) como mejor esfuerzo para la ubicación aproximada del mapa. Importante: ese respaldo **nunca** se usa para fabricar un `latExacta`/`lngExacta` falso — esos campos (el dato que un reclamante aceptado llega a ver) quedan `null` si el cliente no mandó nada, nunca se completan con el centro del barrio. `Barrio` ahora tiene `lat`/`lng` (nullable, sembrados por `DataSeeder` con las mismas coordenadas que ya usaba para las publicaciones de prueba de cada barrio) y `GET /barrios` los expone (`BarrioResponse.lat/lng`) para que, a futuro, el frontend también pueda usarlos como respaldo si quisiera. `DataSeeder` incluye además un backfill: si el backend ya se había levantado antes de este cambio (barrios sin `lat`/`lng` en la base), los completa al reiniciar sin perder los datos existentes.
- "Mostrar qué falta completar" (pedido explícito del feedback): como el botón deshabilitado no dispara `onPress`, antes no había forma de enterarse de qué faltaba sin que estuviera habilitado. Se agregó un texto "Para continuar, completá: …" visible siempre que `!pasoValido`, construido a partir de las mismas claves que ya devuelve `calcularErrores` (un diccionario `ETIQUETAS_CAMPOS` les pone un nombre corto) — funciona igual en los cinco pasos con botón, no solo en "Ubicación".

### 14.3 `DateTimePicker`: `onChange` deprecado

Confirmado contra `src/index.d.ts` de la versión instalada (`@react-native-community/datetimepicker@9.1.0`), no de memoria: `onChange` está deprecado a favor de `onValueChange` (se llama solo cuando la persona confirma un valor) + `onDismiss` (al cerrar sin elegir nada) — antes un solo callback mezclaba los dos casos distinguidos por `event.type`. Migrado en los dos lugares que usan el componente: `RangoFechaPicker.js` (Punto 3, dos instancias: desde/hasta) y `PublicarWizardScreen.js` (Punto 5, fecha del suceso).

### 14.4 Riesgo actualizado

El riesgo 5 de la sección 7 (backend) sobre "no hay geocoding, dirección y coordenadas siempre obligatorias" queda resuelto por este fix: ahora sí hay un camino de "solo dirección escrita" de punta a punta, con el centro del barrio como red de contención del lado del servidor y `Location.geocodeAsync` como mejor esfuerzo del lado del cliente antes de llegar a necesitarla.
