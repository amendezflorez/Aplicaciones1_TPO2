# Plan — Punto 7 (Reclamos y Verificación)

App **Hallado** (objetos y mascotas perdidas). Este documento describe el módulo de reclamos ya integrado con los puntos 3 y 4:

7. **Reclamos y Verificación**

La entidad `Reclamo` y el alta desde el detalle de una publicación pertenecen al Punto 4. Este punto extiende esa implementación; no crea una entidad paralela. La aplicación usa JavaScript, React Navigation, Axios, React Context y hooks, de acuerdo con los materiales de la cátedra y `.docs/INTEGRACION.md`.

## 0. Límites e integración con otros puntos

- El Punto 4 inicia el reclamo desde `DetallePublicacionScreen` y provee `preguntaVerificacion` cuando existe. El Punto 7 agrega la bandeja, las decisiones, el límite de intentos y la expiración.
- El Punto 5 es responsable de crear y gestionar publicaciones. Este módulo consume publicaciones existentes y actualiza su estado a `en_reclamo`, `resuelta` o `abierta` según la actividad de reclamos.
- La entidad JPA `Reclamo` ya existe en `backend/`; cualquier ampliación debe extenderla, no duplicarla.
- Este módulo no implementa reputación, historial de devoluciones, valoraciones, chat ni notificaciones push. La bandeja se actualiza al enfocarse, mediante gesto de refresco y sondeo mientras está visible.
- La bandeja requiere el backend real (`USE_MOCK = false`). `services/mock/mockAdapter.js` no implementa publicaciones ni endpoints de reclamos.

## 1. Alcance técnico (alineado con las clases)

| Tema | Implementación |
|---|---|
| Lenguaje | JavaScript (`.js`), sin TypeScript |
| Navegación | React Navigation: tab `Reclamos` y stack `ReclamosNavigator` |
| Estado compartido | `ReclamosContext` + `ReclamosProvider` y hook `useReclamos()` |
| Sesión | `useAuth()` para identificar al usuario y mostrar los reclamos que le corresponden |
| HTTP | Axios mediante `services/api.js`; el token Bearer lo agrega el interceptor existente |
| Evidencia | `expo-image-picker` para galería/cámara, con `mediaTypes: ['images']` |
| Backend | Java 21, Spring Boot 4.1, JPA, DTOs `record`, repositorios y controladores existentes |

No se agregan dependencias. Se conservan las reglas de `AGENTS.md`: validar las APIs Expo contra SDK 57 y no editar `ios/` ni `android/` manualmente.

## 2. Estructura de carpetas

```text
App.js                                  # envuelve la navegación con ReclamosProvider
context/
  ReclamosContext.js                   # lista, carga, error, refresco y decisiones
hooks/
  useReclamos.js                       # acceso al contexto y validación del Provider
services/
  reclamosService.js                   # alta, foto, consulta, bandeja y decisión
navigation/
  AppNavigator.js                      # tab Reclamos
  ReclamosNavigator.js                 # stack de la bandeja
screens/
  buscar/
    IniciarReclamoScreen.js             # formularios es_mio / lo_encontre
  reclamos/
    MisReclamosScreen.js                # tabs recibidos/enviados y refresco
components/
  ReclamoCard.js                        # datos, evidencia, estado y acciones
backend/src/main/java/com/hallado/backend/
  controller/ReclamoController.java
  service/ReclamoService.java
  repository/ReclamoRepository.java
  dto/request/DecisionReclamoRequest.java
  dto/response/ReclamoBandejaResponse.java
```

## 3. Contrato de la API REST

Todas las rutas requieren `Authorization: Bearer <JWT>`, excepto las rutas públicas que ya define el backend. La base es `API_BASE_URL`.

| Método | Ruta | Body / datos | Respuesta y reglas |
|---|---|---|---|
| POST | `/publicaciones/{id}/reclamos` | `{ tipo, respuestaPregunta?, descripcion?, fotoUrl?, barrioId? }` | Crea el reclamo (`201`). `es_mio` exige respuesta y una pregunta configurada en la publicación; `lo_encontre` exige `fotoUrl` y `barrioId`. Rechaza publicaciones propias, tipo incompatible y publicaciones resueltas/vencidas. `409` al superar tres intentos por autor/publicación. |
| GET | `/publicaciones/{id}/reclamos/mio` | — | Reclamo más reciente del usuario para esa publicación o `null`; antes de responder, actualiza los vencimientos. |
| POST | `/reclamos/foto` | `multipart/form-data`, campo `foto` | `{ photoUrl }`. La URL devuelta se manda en el alta del reclamo. |
| GET | `/reclamos` | — | Lista combinada de reclamos enviados y recibidos por el usuario autenticado, ordenada por fecha descendente. |
| PATCH | `/reclamos/{id}/decision` | `{ "decision": "aceptar" | "rechazar" }` | Reclamo actualizado. Solo el publicador puede decidir, y solo si está pendiente. |

`ReclamoBandejaResponse` contiene `id`, `publicacionId`, `publicacionTitulo`, identidad/nombre/foto del publicador y autor, `tipo`, `respuestaPregunta`, `descripcion`, `fotoUrl`, `barrioEncontrado`, `estado`, `creadaEn` y `venceEn`.

## 4. Diseño de la solución implementada

### 4.1 Inicio del reclamo

- **Es mío (`es_mio`)**: presenta la pregunta de verificación provista por el detalle; exige una respuesta. La descripción y una foto son opcionales.
- **Lo encontré (`lo_encontre`)**: exige una evidencia fotográfica y el barrio donde se encontró. La descripción es opcional.
- Galería y cámara usan `expo-image-picker`. La pantalla verifica `result.canceled` y que `result.assets[0].uri` exista antes de actualizar la selección.
- La foto se sube primero a `/reclamos/foto`; después la URL resuelta se incluye en `POST /publicaciones/{id}/reclamos`.
- Al completar el alta se vuelve al detalle con `navigation.goBack()`.

### 4.2 Intentos y reglas de alta

- El backend cuenta todos los reclamos previos de ese autor para esa publicación, cualquiera sea su estado. Rechazos y vencimientos no reinician el contador.
- El máximo es de tres intentos por combinación autor/publicación.
- El alta bloquea la fila de la publicación durante la operación para serializar altas concurrentes y evitar que dos requests simultáneos excedan el límite.
- `es_mio` solo corresponde a publicaciones tipo `encontrado`; `lo_encontre` solo a publicaciones tipo `perdido`.
- La respuesta a la pregunta se exige y se entrega al publicador; no se compara automáticamente contra `respuestaVerificacion`. La decisión final sigue siendo explícita por parte del publicador.

### 4.3 Bandeja “Mis reclamos”

- `GET /reclamos` entrega las dos perspectivas en una única lista del servidor.
- `MisReclamosScreen` filtra localmente usando el usuario de `AuthContext`: “Recibidos” son los reclamos cuyas publicaciones pertenecen al usuario; “Enviados” son los reclamos creados por él.
- La pantalla recarga al tomar foco, permite refresco manual y vuelve a consultar cada 30 segundos mientras está abierta.
- La tarjeta muestra tipo, publicación, participante, fecha, estado, respuesta, descripción, barrio y foto de evidencia cuando están disponibles.
- Solo los pendientes recibidos muestran acciones. Aceptar/rechazar solicita confirmación y luego actualiza la bandeja desde el servidor.

### 4.4 Estados, vencimiento y efecto en la publicación

Estados JSON: `pendiente`, `aceptado`, `rechazado`, `vencido`.

- Todo reclamo nuevo comienza en `pendiente`.
- Cada pendiente vence a las 48 horas desde `creadaEn`. Una tarea de Spring revisa los vencimientos cada minuto; las consultas de bandeja y reclamo propio también procesan los pendientes vencidos antes de responder.
- Aceptar cambia el reclamo a `aceptado` y la publicación a `resuelta`.
- Rechazar cambia el reclamo a `rechazado`. Si no quedan reclamos pendientes o aceptados en esa publicación, vuelve a `abierta`.
- Al vencer el último reclamo activo, la publicación también vuelve a `abierta`.
- Los estados y el límite son responsabilidad del backend; la interfaz no persiste un estado alternativo.

## 5. Criterios de aceptación

- [x] “Es mío” requiere respuesta a la pregunta de verificación; admite descripción y foto opcionales.
- [x] “Lo encontré” exige foto de evidencia y barrio.
- [x] La subida de foto usa el selector/cámara de Expo y envía al alta la URL devuelta por backend.
- [x] El backend impone tres intentos máximos por usuario y publicación, incluyendo intentos rechazados o vencidos.
- [x] Los estados pendiente, aceptado, rechazado y vencido se reflejan desde el servidor.
- [x] El vencimiento ocurre a las 48 horas y se procesa periódicamente y al consultar la bandeja.
- [x] Solo el publicador puede aceptar/rechazar y la decisión requiere estado pendiente.
- [x] “Mis reclamos” presenta enviados y recibidos y se sincroniza al enfocarse, manualmente y cada 30 segundos.
- [x] React Navigation, Context, custom hook, Axios y la estructura modular existente se reutilizan.
- [x] `npx expo lint`, `npx expo-doctor` y `backend/mvnw test` se ejecutaron correctamente durante la integración.

## 6. Riesgos y pendientes de definir con el equipo

1. **Mock**: `services/mock/mockAdapter.js` todavía no implementa el buscador ni el contrato de reclamos. La bandeja no está disponible al activar `USE_MOCK = true`.
2. **Validación de respuesta**: por diseño actual, el backend no compara automáticamente la respuesta con `respuestaVerificacion`; el publicador evalúa la información y decide. Si el TP exige comparación automática, hay que acordar la regla y el mensaje de reintento sin exponer la respuesta almacenada.
3. **Pruebas de reglas**: el backend tiene un test general de contexto, pero faltan pruebas específicas de límite concurrente, vencimiento, autorización de decisiones y transición de estado de publicación.
4. **Fotos**: la subida usa el almacenamiento local de `PhotoStorageService`; para despliegue multi-instancia habría que definir almacenamiento compartido.
5. **Lockfile frontend**: `package-lock.json` omite actualmente `@emnapi/core` y `@emnapi/runtime` que npm requiere; `npm ci` falla hasta sincronizar el lockfile. La instalación usada para validar el módulo no lo modificó.