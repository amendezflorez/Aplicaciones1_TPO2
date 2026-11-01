## Trabajo Práctico Obligatorio

## Aplicación de Objetos y Mascotas Perdidas

La plataforma Hallado busca desarrollar una aplicación móvil que complemente su sistema interno ya existente, el cual gestiona usuarios, categorías, moderación de publicaciones y reputación de los participantes. La nueva app estará enfocada en que cualquier persona que pierda algo (llaves, documentos, una mochila o su mascota) pueda publicarlo al instante desde su celular, y en que quien encuentre algo en la calle pueda devolverlo a su dueño de forma simple y segura.

La integración con el sistema interno de Hallado garantizará que las publicaciones estén siempre sincronizadas, facilitando la moderación y generando confianza entre las partes. Con esta solución, Hallado busca acelerar la devolución de objetos y mascotas a sus dueños, promover la solidaridad entre vecinos y ofrecer una experiencia tecnológica moderna y alineada a las expectativas actuales.

## 1 - Autenticación y Registro de Usuarios:

* Registro: solicitar email → recibir un código de validación (OTP) → confirmarlo y definir una contraseña.
* Ingreso mediante email y contraseña.
* Recupero de contraseña: recibir un código por email para definir una nueva, con la posibilidad de reenviarlo en caso de no haberlo recibido o de que haya expirado.
* Desde la configuración, la persona puede activar o desactivar el desbloqueo de la sesión con la biometría del dispositivo.

## 2 - Perfil y Reputación:

* Ver y editar los datos personales: nombre, foto de perfil, barrio y teléfono de contacto.
* La persona decide si su teléfono es visible para la otra parte una vez aceptado un reclamo, o si prefiere comunicarse solo a través de la app.
* La reputación se construye a partir de las devoluciones concretadas y de las valoraciones recibidas (positivas o negativas).
* Al alcanzar ciertas metas (por ejemplo, 5 devoluciones concretadas) el perfil muestra una insignia visible, como "Vecino solidario".
* El perfil público muestra la reputación, las insignias y la antigüedad en la plataforma, pero no el teléfono ni el historial de publicaciones.



## 3 - Buscador Inicial y Resultados:

* Al ingresar a la app, la persona no ve un listado sino un buscador guiado:
* ¿Qué te pasó?: perdí algo / encontré algo.
* ¿Qué es?: categoría (documentos, llaves, electrónica, mascotas, ropa, otros) y, opcionalmente, palabras clave.
* ¿Dónde?: barrio o localidad, eligiéndolo de una lista o usando la ubicación actual del dispositivo.
* ¿Cuándo?: hoy, últimos 3 días, última semana o un rango de fechas.
* La búsqueda devuelve las publicaciones del tipo opuesto: si perdiste algo, ves lo que otros encontraron, y viceversa.
* El buscador muestra las últimas búsquedas realizadas para poder repetirlas con un toque.
* La pantalla de resultados es un listado paginado. Cada publicación muestra título, categoría, barrio, fecha del suceso, coordenadas junto a las fotos.
* Desde los resultados se pueden refinar los filtros sin volver al inicio, y ordenarlos por más recientes o más cercanos.
* Si no hay resultados, la app ofrece publicar la propia pérdida o hallazgo, o guardar la búsqueda como alerta.

## 4 - Detalle de la Publicación:

* Galería con todas las fotos, descripción, categoría, fecha y franja horaria del suceso, estado de la publicación (abierta, en reclamo, resuelta) y el barrio donde ocurrió.
* Datos del publicador con su reputación y acceso a su perfil público.
* Acciones disponibles según quién esté mirando:
* En una publicación de algo encontrado, un tercero puede indicar "Es mío".
* En una publicación de algo perdido, un tercero puede indicar "Lo encontré".
* Cualquier persona puede seguir la publicación para enterarse de sus novedades.
* Si es el propio publicador, accede a la gestión de su publicación.
* (Importante: la dirección exacta no se muestra hasta que el reclamo sea aceptado.)

## 5 - Publicar un Hallazgo o una Pérdida:

* Carga guiada en pasos:
* Elegir el tipo (perdí / encontré).
* Tomar fotos con la cámara o seleccionarlas de la galería.
* Completar título, descripción, categoría, y fecha y hora del suceso.
* Indicar el barrio y la dirección exacta, ya sea escribiéndola o tomando la ubicación actual del dispositivo (cargar coordenadas).



* Si se publica algo encontrado, se debe cargar una pregunta de verificación sobre un detalle que no se vea en las fotos (por ejemplo, "¿De qué color es el llavero?") junto con su respuesta. La respuesta es privada.
* Si la persona interrumpe la carga y sale de la app, al volver encuentra el borrador conservado para retomarlo donde lo dejó.
* Sección "Mis publicaciones" con el estado de cada una (abierta, en reclamo, resuelta, vencida). Las publicaciones vencen a los 30 días y pueden renovarse.

## 6 - Modo Sin Conexión:

* La app conserva en el dispositivo las últimas publicaciones que la persona consultó (detalle, fotos y barrio), para poder volver a verlas aunque no haya conexión a internet.
* Si la persona realiza una búsqueda sin conexión, la app muestra los últimos resultados cargados exitosamente, con un aviso de que la información podría no estar actualizada.
* La persona puede crear una publicación sin conexión. Queda marcada como "pendiente de envío" y se publica automáticamente al recuperar la conexión.
* Las acciones que requieren conexión (reclamar, aceptar un reclamo, seguir una publicación, etc.) quedan deshabilitadas, con un mensaje claro que indica que se necesita conexión para continuar.

## 7 - Reclamos y Verificación:

* Quien indica "Es mío" debe responder la pregunta de verificación y puede agregar una descripción y una foto que acredite que el objeto le pertenece.
* Quien indica "Lo encontré" debe adjuntar una foto y el barrio donde lo encontró, para que el dueño confirme si se trata de lo suyo.
* El publicador puede aceptar o rechazar cada reclamo.
* Cada persona tiene un máximo de 3 intentos de reclamo por publicación.
* Cada reclamo tiene un estado (pendiente, aceptado, rechazado, vencido) y vence automáticamente a las 48 horas si no recibe respuesta.
* Sección "Mis reclamos" donde la persona ve, en un mismo lugar y siempre actualizados, los reclamos que envió y los que recibió.

## 8 - Devolución y Punto de Encuentro:

* Una vez aceptado un reclamo, quien tiene el objeto propone un punto de encuentro, y la otra parte puede aceptarlo o sugerir uno alternativo.
* El punto de encuentro se debe poder visualizar con un botón "Cómo llegar" que abre Google Maps (o la aplicación de mapas por defecto del dispositivo) con la dirección precargada en modo navegación.

## 9 - Alertas y Publicaciones Seguidas:

* Cualquier búsqueda realizada desde el buscador puede guardarse como alerta, con todos sus criterios (tipo, categoría, barrio y palabras clave).

* Sección "Mis alertas" donde se pueden ver, pausar o eliminar las alertas, con la cantidad de publicaciones nuevas que coinciden con cada una.
* Sección "Seguidas" con las publicaciones que la persona sigue.
* Ambas secciones muestran un indicador visual de novedad cuando aparece una publicación que coincide con una alerta o cuando una publicación seguida cambia de estado.

## 10 - Historial y Valoraciones:

* Historial de casos resueltos, separado en "Devolví" y "Recuperé", con fecha, objeto y contraparte.
* Filtro por rango de fechas y por tipo.
* Dentro de los 7 días posteriores a la devolución, cada parte puede valorar a la otra (positiva o negativa) y dejar un mensaje breve opcional.
* Quien recuperó su objeto puede además dejar un agradecimiento público, visible en el perfil de quien se lo devolvió.
* Las valoraciones recibidas alimentan la reputación del usuario.

## El trabajo por realizar es el siguiente:

* Construir una API\_Rest para acceder a la información mencionada y cumplir con las funcionalidades que tendrá la aplicación móvil.

## Entregables para evaluación:

## Primera entrega: (Fecha pactada en el cronograma)

* Se realizará la entrega de las funcionalidades backend de los puntos X informadas junto con la app construida en React Native con Expo en Android 100% funcionales.

## Segunda entrega: (Fecha pactada en el cronograma)

* Se realizará la entrega de las funcionalidades backend de los puntos X informadas junto con la app construida en React Native con Expo en Android 100% funcionales.

## Entrega Final:

* Aplicación completamente funcional con el 100% de los casos de uso descritos, construida en React Native con Expo en Android o Android Nativo.

