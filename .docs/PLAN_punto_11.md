# Plan — Punto 11: Confirmación de entrega mediante código QR

App **Hallado** — extensión funcional de los puntos 7, 8 y 10.

> La consigna original de `.docs/TPO_Hallado.pdf` define diez puntos. Este documento formaliza como Punto 11 el flujo de confirmación de entrega por QR solicitado para el proyecto; no implica que sea un requisito textual de la consigna original.

## 0. Objetivo y límites

Permitir que quien recupera el objeto confirme su recepción escaneando un código QR asociado a la publicación. La confirmación es independiente de aceptar un reclamo o acordar el lugar de encuentro:

1. El publicador acepta el reclamo; el reclamo pasa a `aceptado`, pero la publicación permanece `en_reclamo`.
2. Las partes coordinan la devolución mediante el punto de encuentro del Punto 8.
3. En el momento de la entrega, quien recupera escanea el QR de la publicación, desde la pantalla del dispositivo de quien devuelve o desde una copia impresa con anterioridad.
4. El servidor valida el reclamo, la publicación y la identidad del receptor. Si corresponde, registra la devolución y cambia la publicación a `resuelta`.

El QR contiene un JSON serializado `{"tipo":"hallado_devolucion","v":1,"publicacionId":"…"}` con el ID estable de la publicación, no un token efímero ligado a una sesión. El escáner lo lee con `JSON.parse` (ver `utils/qrDevolucion.js`). El cliente no es autoridad para cambiar el estado. Un QR válido no demuestra por sí solo que hubo entrega física; el flujo registra la confirmación del receptor.

Este punto no agrega chat, notificaciones push, valoración automática ni una firma digital de ambas partes. Las confirmaciones se reflejan a ambas personas al actualizarse la bandeja.

## 1. Alineación con el proyecto

| Tema | Decisión |
|---|---|
| Lenguaje móvil | JavaScript, sin TypeScript |
| Navegación | React Navigation; el flujo vive dentro de `ReclamosNavigator` |
| Cámara | `expo-camera` SDK 57 con `CameraView`, permiso solicitado y lectura limitada a QR |
| Galería | `expo-image-picker` para seleccionar una imagen existente |
| Decodificación local | `expo-image-manipulator`, `jsqr` y `jpeg-js`; la imagen no se sube al servidor para leerla |
| HTTP y sesión | Axios de `services/api.js`; token y manejo de sesión existentes |
| Backend | Java 21, Spring Boot, JPA y entidades existentes `Publicacion`, `Reclamo` y `CasoResuelto` |
| Persistencia de entrega | `CasoResuelto.fechaResolucion`, `devolvedor` y `recuperador` |
| Estado de publicación | `en_reclamo` hasta la confirmación; `resuelta` después de confirmar |

No se almacena el token de autenticación en el QR. El módulo Expo de cámara se configura en `app.json`; no se editan manualmente los proyectos nativos.

## 2. Roles y autorización

- **Devolvedor:** quien conserva el objeto y lo entrega. Puede mostrar el QR asociado a la publicación.
- **Receptor:** quien recupera el objeto y escanea el QR desde su sesión autenticada.
- El servidor deriva el receptor usando el tipo de reclamo:
  - `es_mio`: el autor del reclamo recupera el objeto; el publicador lo devuelve.
  - `lo_encontre`: el publicador recupera el objeto; el autor del reclamo lo devuelve.
- Solo el receptor puede confirmar. El publicador, una tercera persona o el propio emisor no pueden confirmar por el receptor.
- El cliente no envía un identificador de usuario ni rol para autorizar la acción: la identidad se obtiene del token validado por el backend.

## 3. Contrato REST

Todas las rutas requieren autenticación mediante el mecanismo ya configurado en `services/api.js`.

| Método | Ruta | Body | Respuesta y validaciones |
|---|---|---|---|
| `POST` | `/publicaciones/{publicacionId}/devolucion/confirmar` | `{ "reclamoId": "..." }` | `{ reclamoId, publicacionId, estado, fechaResolucion }`. Acepta únicamente un reclamo `aceptado` asociado a esa publicación, si la publicación está `en_reclamo` y quien solicita es el receptor. Persiste `CasoResuelto`, resuelve la publicación y cierra otros reclamos activos. |
| `GET` | `/reclamos` | — | Incluye `publicacionEstado` y `fechaResolucion` para que ambas partes vean el resultado y la fecha de entrega. |

Errores esperados:

- `400`: el reclamo no corresponde a la publicación indicada.
- `403`: quien escanea no está autorizado como receptor.
- `404`: no existe la publicación o el reclamo.
- `409`: reclamo no aceptado, publicación no disponible o devolución ya confirmada.

El cambio de estado, el cierre de reclamos activos y el alta de `CasoResuelto` forman una sola transacción. Las operaciones que deciden reclamos y confirman la entrega deben bloquear primero la publicación para serializar transiciones concurrentes. Mientras haya un reclamo aceptado, no se permiten nuevos reclamos ni otra aceptación para esa publicación.

## 4. Flujo móvil

### 4.1 Acceso al escáner

- En `MisReclamosScreen`, la acción **Confirmar entrega con QR** solo se presenta en un reclamo aceptado, no resuelto y al usuario que recupera el objeto.
- La pantalla recibe `publicacionId` y `reclamoId` como parámetros de navegación.
- Al entrar, consulta el permiso de cámara y solicita permiso si aún se puede pedir. Si está denegado, muestra una explicación, el acceso a galería y el botón **Abrir Configuración**.
- La cámara se mantiene activa únicamente mientras la pantalla está enfocada. El lector procesa QR, no otros códigos de barras.

### 4.2 Lectura en vivo y desde galería

- Cámara: `CameraView.onBarcodeScanned` entrega el contenido del QR.
- Galería: `expo-image-picker` devuelve una imagen; se normaliza localmente y `jsqr` intenta decodificarla. Si no hay QR legible, se informa el problema y se puede seleccionar otra imagen.
- Ambas vías envían el contenido al mismo validador del cliente, que lo parsea con `JSON.parse` y valida `tipo` y `v`. El `publicacionId` debe coincidir con el `publicacionId` esperado antes de llamar al backend.
- Si la lectura falla por formato, calidad o ausencia de QR, no se registra una confirmación ni se envía la imagen al servidor.

### 4.3 Resultado

- Mientras se valida, se bloquean lecturas repetidas y se muestra progreso.
- Si el servidor confirma, se muestra éxito y fecha/hora de resolución; se actualiza la bandeja.
- La contraparte ve el estado al refrescar la bandeja, mediante actualización manual, al enfocar o por el refresco periódico existente.
- Si falla la red o el servidor responde con conflicto/autorización, se comunica el error y no se presenta un éxito falso.
- Una falla al refrescar la bandeja después de una respuesta exitosa se informa por separado: no invalida la confirmación ya persistida.

## 5. Componentes y archivos

```text
screens/reclamos/
  ConfirmarDevolucionScreen.js     # permisos, cámara, galería, estados y resultado
  MisReclamosScreen.js             # entrada al escáner para el receptor
  PuntoEncuentroScreen.js          # no permite seguir coordinando una entrega resuelta
components/
  ReclamoCard.js                   # acciones y estado/fecha de la entrega
navigation/
  ReclamosNavigator.js             # ruta ConfirmarDevolucion
services/
  reclamosService.js               # POST de confirmación
  qrImageDecoder.js                # lectura local del QR desde una imagen
app.json                            # permisos y textos de uso de cámara/fotos
backend/src/main/java/com/hallado/backend/
  controller/DevolucionController.java
  service/DevolucionService.java
  dto/request/ConfirmarDevolucionRequest.java
  dto/response/ConfirmarDevolucionResponse.java
  entity/CasoResuelto.java          # persistencia existente del Punto 10
```

La creación o impresión del QR debe usar el ID de la publicación existente. El formato visual que permite al publicador compartir o imprimir ese código se mantiene desacoplado de la autorización y no altera el contrato del escáner.

## 6. Seguridad y casos borde

- No confiar en el valor leído por el cliente: validar publicación, reclamo, usuario, tipo y estado en el servidor.
- Rechazar QR vacío, malformado, de otra publicación, de una publicación vencida/resuelta o asociado a un reclamo rechazado/vencido/pendiente.
- Rechazar confirmaciones repetidas e impedir más de un `CasoResuelto` para la misma devolución.
- Serializar confirmaciones concurrentes y decisiones concurrentes para evitar dos reclamos aceptados o casos resueltos duplicados.
- Al resolver, cerrar los otros reclamos pendientes/aceptados de la publicación para que no queden acciones vigentes sobre un objeto ya devuelto.
- Evitar escaneos accidentales: requerir que el usuario inicie la acción desde su reclamo aceptado, bloquear doble lectura y mostrar claramente el objeto antes de confirmar. Si el producto requiere confirmación explícita, agregar un paso de revisión previo al POST.
- No pedir acceso a fotos completas si el selector del sistema permite seleccionar una imagen sin ese permiso; conservar el fallback incluso con permiso de cámara denegado.
- Tratar una confirmación de backend exitosa como definitiva aunque falle la carga posterior de la bandeja.
- Un QR estático basado en ID puede copiarse o fotografiarse. La autorización del receptor reduce el abuso, pero no prueba la entrega. Para mayor garantía, acordar con el equipo un desafío adicional de un solo uso, una confirmación del devolvedor o una comprobación bilateral antes de incorporarla.
- Considerar códigos QR grandes, dañados, de bajo contraste, fotografiados con poca luz, capturas de pantalla, imágenes rotadas y desconexión durante el envío.

## 7. Plan de implementación

1. **Contrato y reglas:** definir receptor por tipo de reclamo, estados válidos, resultado JSON y errores.
2. **Backend:** implementar endpoint autenticado, bloqueos transaccionales, escritura de `CasoResuelto`, estado `resuelta` y cierre de reclamos competidores.
3. **Bandeja:** exponer estado de publicación y fecha de resolución; mostrar el resultado a ambas partes y detener acciones de coordinación al resolver.
4. **Escáner:** agregar permisos, vista de cámara, lectura de QR y prevención de doble lectura.
5. **Fallback de galería:** seleccionar la imagen, decodificar en local y reutilizar el mismo envío/autorización.
6. **Pruebas y documentación:** cubrir roles, transiciones, errores, imagen sin QR, operación repetida, actualización de bandeja y permisos denegados.

## 8. Criterios de aceptación

- [x] El flujo distingue entre aceptar el reclamo y confirmar la entrega.
- [x] El receptor autorizado puede escanear desde cámara o desde una imagen de galería.
- [x] Un QR físico preexistente puede utilizarse si contiene el ID estable de la publicación.
- [x] El permiso denegado presenta explicación, alternativa de galería y acceso a Configuración.
- [x] La lectura de galería se realiza localmente, sin subir la foto para decodificarla.
- [x] El backend comprueba la asociación QR/publicación/reclamo y el rol del usuario.
- [x] El backend registra `CasoResuelto`, cambia el estado a `resuelta` y cierra reclamos activos en una transacción.
- [x] La confirmación repetida, el actor no autorizado y los estados incompatibles se rechazan.
- [x] Ambas partes pueden consultar el resultado y la fecha de resolución.
- [ ] Probar cámara, permisos y lectura de fotos en dispositivos físicos Android e iOS.
- [ ] Definir si se requiere confirmación del devolvedor o un desafío de un solo uso para reducir el riesgo de escaneo accidental/fraude.

## 9. Verificación técnica

- Backend: `cd backend && .\mvnw.cmd test`.
- Lint dirigido: `npx expo lint` o ESLint sobre los archivos modificados; separar fallas preexistentes de las introducidas por este punto.
- Bundle Android: `npx expo export --platform android`.
- Diagnóstico de Expo: `npx expo-doctor`; resolver o documentar incompatibilidades del entorno sin actualizaciones no relacionadas.
- Dispositivo: probar permiso concedido, denegado, bloqueado, regreso desde Configuración, galería con y sin QR, falta de conexión, QR equivocado y reclamo resuelto por la otra parte.
