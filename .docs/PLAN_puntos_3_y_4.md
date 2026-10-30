# Plan — Puntos 3 y 4 (Buscador Inicial/Resultados y Detalle de la Publicación)

App **Hallado**. Este plan cubre:

3. **Buscador Inicial y Resultados**
4. **Detalle de la Publicación**

Se apoya en lo ya construido para los puntos 1 y 2 (`AuthContext`, `api.js`, `ProfileNavigator` con `PublicProfile`) sin tocarlo, siguiendo las reglas de `.docs/INTEGRACION.md`.

## 0. Límites con otros puntos (importante para no pisar trabajo ajeno)

Este plan construye lo mínimo necesario para que los Puntos 3 y 4 sean funcionales de punta a punta, incluyendo las entidades/endpoints que otros puntos van a necesitar extender. Explícitamente **no** construye:

- La bandeja "Mis reclamos", aceptar/rechazar, el límite de 3 intentos y el vencimiento a 48h pertenecen al **Punto 7** y ahora extienden la entidad `Reclamo` creada aquí. La aplicación y el backend incluyen la implementación integrada; no se debe duplicar la entidad ni sus endpoints.
- La propuesta de punto de encuentro ni el botón "Cómo llegar" (**Punto 8**).
- Las pantallas "Mis alertas" / "Seguidas" y el indicador de novedad agregado (**Punto 9**). Sí se crean las entidades `Alerta` y `Seguimiento` y los endpoints para crearlas/listarlas/borrarlas, porque "guardar como alerta" y "seguir la publicación" son acciones que el TP pide disparar desde los Puntos 3 y 4.
- La gestión de la propia publicación —pausar, renovar a los 30 días— (**Punto 5**); el detalle solo linkea a esa pantalla si es el propio publicador, con un placeholder si point 5 todavía no existe.
- Historial y valoraciones (**Punto 10**).

Quien construya 5/7/8/9/10 extiende estas entidades (`Reclamo.estado`, `Alerta`, `Seguimiento`) en vez de crear las suyas propias — evita duplicar el concepto de "reclamo" o "alerta".

## 1. Alcance técnico (alineado con las clases, igual que puntos 1-2)

Mismas reglas de `AGENTS.md`/`PLAN_puntos_1_y_2.md`: JavaScript puro, React Navigation (no Expo Router), sin Redux/TypeScript/librerías de UI, instalar con `npx expo install`, backend Java 25 + Spring Boot 4.1 en el mismo `backend/` (mismo patrón: DTOs record, JPA, `JwtAuthFilter`, `GlobalExceptionHandler`).

Dependencias nuevas necesarias (instalar con `npx expo install`):
- `expo-location` — ubicación actual del dispositivo para "¿Dónde?" y ordenar por más cercanos.
- `@react-native-community/datetimepicker` — selector de rango de fechas en "¿Cuándo?".

Nada más: la galería de fotos del detalle reutiliza patrones de `FlatList` horizontal, no hace falta una librería de carrusel.

## 2. Estructura de carpetas (suma a la de puntos 1-2)

```
config/
  constants.js            # sumar: CATEGORIAS, RANGOS_FECHA, PAGE_SIZE búsqueda
context/
  SearchContext.js         # últimas búsquedas (AsyncStorage) + filtros activos de la sesión de resultados
services/
  publicacionesService.js  # buscar, detalle, refinar/paginar
  alertasService.js        # crear/listar/borrar alertas (consumido también por punto 9)
  reclamosService.js       # crear reclamo ("Es mío" / "Lo encontré"), consultar "¿ya reclamé esto?"
  seguimientosService.js   # seguir/dejar de seguir
hooks/
  useUbicacionActual.js    # wrapper de expo-location con permisos
navigation/
  BuscarNavigator.js        # Stack: BuscadorInicial, Resultados, DetallePublicacion (+ ClaimModal)
screens/
  buscar/
    BuscadorInicialScreen.js   # los 4 pasos + últimas búsquedas
    ResultadosScreen.js        # listado paginado, refinar, ordenar, vacío
    DetallePublicacionScreen.js
    IniciarReclamoScreen.js    # formulario de "Es mío" / "Lo encontré" (modal/pantalla simple)
components/
  PublicationCard.js        # item de resultados (foto, título, categoría, barrio, fecha)
  CategoriaPicker.js
  BarrioOUbicacionPicker.js  # reusa BarrioPicker existente + opción "usar mi ubicación"
  RangoFechaPicker.js
  EstadoChip.js              # abierta / en reclamo / resuelta
  PhotoGallery.js            # carrusel horizontal de fotos del detalle
utils/
  publicacionFormatters.js  # "hace 2 días", distancia en km, franja horaria
```

`AppNavigator.js` suma: `<Tab.Screen name="Buscar" component={BuscarNavigator} />` (reemplaza el placeholder actual).

## 3. Contrato de la API REST (puntos 3 y 4)

Base `API_BASE_URL`, auth `Authorization: Bearer <JWT>` salvo que se indique lo contrario. Mismas convenciones que la sección 4 del plan de puntos 1-2 (records DTO, `GlobalExceptionHandler`, `JwtAuthFilter` ya cubre cualquier ruta no listada en `PUBLIC_PREFIXES`).

### Categorías y barrios
`GET /barrios` ya existe (punto 1-2). Categorías son un enum fijo, no hace falta endpoint: `documentos | llaves | electronica | mascotas | ropa | otros`.

### Publicaciones — búsqueda y resultados
| Método | Ruta | Query/Body | Respuesta |
|---|---|---|---|
| GET | `/publicaciones` | `tipoBuscado` (`perdido\|encontrado`, **obligatorio** — ver regla de tipo opuesto abajo), `categoria?`, `texto?`, `barrioId?`, `lat?`, `lng?`, `radioKm?` (si se usa ubicación), `rango` (`hoy\|3dias\|semana\|personalizado`), `desde?`, `hasta?` (si `rango=personalizado`), `orden` (`recientes\|cercanos`, `cercanos` exige `lat`/`lng`), `page`, `size` | `{ data: PublicacionResumen[], page, size, total }` |
| GET | `/publicaciones/{id}` | — | `PublicacionDetalle` (ver DTO abajo; `address`/`lat`/`lng` solo si hay un `Reclamo` `ACEPTADO` del usuario autenticado sobre esa publicación, o si la publicación es propia) |

**Regla de tipo opuesto** (literal del TP): si `tipoBuscado=perdido` (la persona perdió algo), la búsqueda filtra `publicaciones.tipo = 'encontrado'`, y viceversa. Lo resuelve el backend, no el cliente.

`PublicacionResumen`:
```json
{ "id": "…", "tipo": "encontrado", "titulo": "…", "categoria": "llaves",
  "barrio": { "id": "…", "name": "…" }, "fechaSuceso": "2026-10-20T00:00:00Z",
  "lat": -34.6, "lng": -58.4, "fotoPrincipalUrl": "…|null", "estado": "abierta" }
```

`PublicacionDetalle` (suma a `PublicacionResumen`):
```json
{ ...PublicacionResumen,
  "descripcion": "…", "franjaHoraria": "mañana|tarde|noche|null",
  "fotos": [ { "id": "…", "url": "…" } ],
  "direccionExacta": "…|null", "lat": "…|null", "lng": "…|null",
  "publicador": { "id": "…", "name": "…", "photoUrl": "…" },
  "esPropia": false, "yaReclame": false, "siguiendo": false }
```
`direccionExacta`/`lat`/`lng` del nivel detalle (coordenadas exactas del hecho, distinto de las del resumen que son aproximadas para el mapa de resultados) van `null` salvo reclamo aceptado o publicación propia — así el frontend no tiene que decidir nada, solo renderizar lo que llega.

### Últimas búsquedas (para repetir con un toque)
Se guardan **en el dispositivo** (`AsyncStorage` vía `SearchContext`, no es dato sensible ni compartido entre usuarios), no en el backend — evita un endpoint que ningún otro punto necesita.

### Alertas (búsqueda guardada) — Punto 9 consume el listado/gestión
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/alertas` | `{ tipoBuscado, categoria?, texto?, barrioId? }` | `Alerta` (`201`) |
| GET | `/alertas` | — | `Alerta[]` del usuario, con `novedadesCount` (publicaciones nuevas que matchean desde `ultimaRevision`) |
| DELETE | `/alertas/{id}` | — | `204` |

### Seguimiento de publicaciones — Punto 9 consume el listado
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/publicaciones/{id}/seguir` | — | `204`. Idempotente (`409` si ya la seguía, el cliente lo trata como éxito) |
| DELETE | `/publicaciones/{id}/seguir` | — | `204` |
| GET | `/seguimientos` | — | `PublicacionResumen[]` seguidas por el usuario |

### Reclamos — alta y bandeja integrada (Punto 7)
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/publicaciones/{id}/reclamos` | `{ tipo: 'es_mio'\|'lo_encontre', respuestaPregunta?, descripcion?, fotoUrl? }`. `es_mio` exige `respuestaPregunta`; `lo_encontre` exige `fotoUrl` y `barrioId` (dónde lo encontró) | `Reclamo` (`201`). `409` si ya tiene 3 intentos sobre esa publicación (límite ya contemplado en la entidad aunque el *consumo* del límite real —reintentos tras rechazo— lo termina de ajustar el Punto 7) |
| GET | `/publicaciones/{id}/reclamos/mio` | — | `Reclamo\|null` — el propio reclamo pendiente/aceptado sobre esa publicación, para que el botón sepa si mostrar "Ya reclamaste" |
| GET | `/reclamos` | — | `ReclamoBandeja[]` — reclamos enviados y recibidos, con datos de publicación, autor/publicador y vencimiento |
| PATCH | `/reclamos/{id}/decision` | `{ decision: 'aceptar'|'rechazar' }` | `Reclamo` actualizado; solo el publicador puede responder reclamos pendientes |

`Reclamo.estado`: `pendiente` por defecto; vence a las 48 h si no hay respuesta. El backend aplica el tope de 3 intentos por autor/publicación.

## 4. Diseño de la solución

### 4.1 `BuscadorInicialScreen` (4 pasos)
Un wizard simple de 4 pasos con `useState` local (no hace falta Context, la navegación entre pasos es intra-pantalla), igual de espíritu a `EditProfileScreen`:
1. **¿Qué te pasó?** — dos `TouchableOpacity` grandes (perdí / encontré) → fija `tipoBuscado` (el opuesto es lo que se va a buscar, pero la persona elige en términos de su propia situación).
2. **¿Qué es?** — `CategoriaPicker` (6 opciones fijas) + `TextField` opcional de palabras clave.
3. **¿Dónde?** — `BarrioOUbicacionPicker`: lista de barrios (reusa el mismo picker de punto 2) o botón "Usar mi ubicación" (`useUbicacionActual`, pide permiso con `expo-location`).
4. **¿Cuándo?** — chips hoy/3 días/semana + opción "elegir fechas" que abre `RangoFechaPicker` (`@react-native-community/datetimepicker`, modo `range` si el SDK lo soporta, si no dos pickers desde/hasta).

Al confirmar: guarda la búsqueda en `SearchContext` (últimas 5, AsyncStorage) y navega a `Resultados` con los filtros por params.

### 4.2 `ResultadosScreen`
- `FlatList` paginada (`onEndReached` → pide `page+1`), cada item es `PublicationCard`.
- Barra de refinar filtros arriba (reabre un modal con los mismos controles del paso 2-4, sin volver al wizard completo) y selector de orden (recientes/cercanos — cercanos deshabilitado si no se usó ubicación).
- Estado vacío: dos botones — "Publicar lo que [perdí/encontré]" (navega al flujo del Punto 5, fuera de este plan — si no existe todavía, placeholder) y "Guardar esta búsqueda como alerta" (`POST /alertas`).
- Tap en un item → `navigation.navigate('DetallePublicacion', { id })`.

### 4.3 `DetallePublicacionScreen`
- Galería (`PhotoGallery`, `FlatList` horizontal + paginación con dots, reusa el patrón de scroll horizontal ya usado en otras partes del curso).
- Descripción, categoría, fecha + franja horaria, `EstadoChip`, barrio.
- Card del publicador: foto + nombre + reputación resumida, tap → `navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId } })` (igual que documenta `INTEGRACION.md`).
- Botonera condicional según `detalle.esPropia` / `detalle.tipo` / `detalle.yaReclame` / `detalle.siguiendo`:
  - `esPropia` → botón "Gestionar publicación" (navega al Punto 5 si existe; si no, deshabilitado con aviso "disponible cuando esté listo Mis publicaciones").
  - `!esPropia && tipo === 'encontrado' && !yaReclame` → "Es mío" → `IniciarReclamoScreen` con `tipo='es_mio'`.
  - `!esPropia && tipo === 'perdido' && !yaReclame` → "Lo encontré" → `IniciarReclamoScreen` con `tipo='lo_encontre'`.
  - `yaReclame` → botón deshabilitado "Ya enviaste un reclamo" (el seguimiento de ese reclamo es Punto 7).
  - `!esPropia` → toggle "Seguir" / "Dejar de seguir" (`POST`/`DELETE /publicaciones/{id}/seguir`).
- Sin conexión (una vez exista el Punto 6, no es parte de este plan): esta pantalla es la que ese punto cachea — se deja el componente desacoplado de la red (recibe `publicacion` ya resuelta) para no pelear con esa integración futura.

### 4.4 `IniciarReclamoScreen`
Formulario simple: si `tipo='es_mio'` muestra la pregunta de verificación de la publicación (`publicacion.preguntaVerificacion`, dato que sí viaja en `PublicacionDetalle` — ver nota abajo) + input de respuesta + descripción/foto opcionales; si `tipo='lo_encontre'` pide foto (`expo-image-picker`, igual patrón que la foto de perfil) y barrio. `POST /publicaciones/{id}/reclamos` → vuelve al detalle con el botón ya en estado "Ya enviaste un reclamo".

> Nota: la pregunta de verificación la carga quien publica un hallazgo (Punto 5 — `preguntaVerificacion` + `respuestaVerificacion` en el alta de la publicación). Este plan solo la **consume** en el detalle/reclamo; si el Punto 5 todavía no la pide al publicar, se semillan publicaciones de prueba con ella en `DataSeeder` para poder probar 3 y 4 de punta a punta mientras tanto.

### 4.5 Entidades nuevas (backend)
```
Publicacion       id, tipo(perdido|encontrado), titulo, descripcion, categoria,
                  fechaSuceso, franjaHoraria, barrio(FK Barrio), direccionExacta, lat, lng,
                  estado(abierta|en_reclamo|resuelta|vencida), publicador(FK User),
                  preguntaVerificacion, respuestaVerificacion (solo si tipo=encontrado; nunca se expone en los DTO), creadaEn, venceEn
FotoPublicacion   id, publicacion(FK), url, orden
Alerta            id, usuario(FK), tipoBuscado, categoria, texto, barrio(FK), creadaEn, ultimaRevision
Seguimiento       id, usuario(FK), publicacion(FK), creadaEn   (unique usuario+publicacion)
Reclamo           id, publicacion(FK), autor(FK), tipo(es_mio|lo_encontre), respuestaPregunta,
                  descripcion, fotoUrl, barrioEncontrado(FK Barrio, solo lo_encontre),
                  estado(pendiente|aceptado|rechazado|vencido) default pendiente, creadaEn
```
`DataSeeder` suma 10-15 publicaciones de prueba (mitad perdido/mitad encontrado, varias categorías/barrios/fechas) para poder probar el buscador con resultados reales desde el primer día, igual que ya sembró usuarios y barrios para 1-2.

## 5. Criterios de aceptación

**Punto 3**
- [ ] Los 4 pasos del buscador guiado funcionan y navegan a Resultados con los filtros aplicados.
- [ ] La búsqueda devuelve publicaciones del tipo **opuesto** al elegido.
- [ ] Las últimas búsquedas se muestran y repetirlas con un toque vuelve a buscar con esos filtros.
- [ ] Resultados paginados; refinar sin volver al inicio; ordenar por recientes/cercanos.
- [ ] Sin resultados: ofrece publicar o guardar como alerta.

**Punto 4**
- [ ] Galería, descripción, categoría, fecha+franja, estado y barrio se ven completos.
- [ ] Datos del publicador con reputación y acceso a su perfil público (reusa `PublicProfile` existente).
- [ ] "Es mío" / "Lo encontré" aparece según el tipo de publicación y dispara el alta del reclamo.
- [ ] "Seguir" / "Dejar de seguir" funciona.
- [ ] La dirección exacta no se muestra salvo reclamo aceptado o publicación propia (hoy: nunca, hasta que exista el Punto 7 — comportamiento correcto, no pendiente).
- [ ] Si es la propia publicación, hay acceso a gestión (o el placeholder si el Punto 5 no está listo).

**Transversal**
- [ ] `npx expo lint` sin errores; `npx expo-doctor` sin problemas.
- [ ] Backend: `GlobalExceptionHandler` cubre los casos nuevos (publicación inexistente, reclamo duplicado, etc.) con el mismo formato de error que 1-2.

## 6. Riesgos y pendientes de definir con el equipo
1. **Punto 5 (publicar)** probablemente no existe todavía cuando se construya esto: se resuelve con datos sembrados en `DataSeeder` para no bloquear 3 y 4, y un placeholder en el botón "Gestionar publicación".
2. **Punto 7** va a necesitar tocar `Reclamo` (agregar accept/reject, vencimiento a 48h, límite real de 3 intentos) — avisar a quien lo construya que la entidad ya existe acá, para que extienda en vez de duplicar.
3. **Punto 9** idem con `Alerta`/`Seguimiento` y el cálculo de `novedadesCount`.
4. **Ubicación**: `expo-location` requiere permiso en tiempo de ejecución; si se niega, "ordenar por cercanos" queda deshabilitado sin romper el resto del buscador.
