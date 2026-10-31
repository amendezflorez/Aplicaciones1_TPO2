import { crearPublicacion, subirFotoPublicacion } from './publicacionesService';

// Orquesta el alta completa de una publicación: sube las fotos pendientes (en orden) y
// hace el POST final. Deliberadamente separada de PublicarWizardScreen y sin depender de
// ningún estado de React: recibe un "borrador" plano (el mismo objeto que
// borradorPublicacionStorage persiste en AsyncStorage) y nada más, para que el Punto 6
// (cola offline) pueda llamarla tal cual desde un procesador en segundo plano cuando
// vuelva la conexión, sin tener que montar ninguna pantalla.
//
// borrador: { tipo, titulo, descripcion, categoria, fechaSuceso (ISO string), franjaHoraria,
//   barrioId, direccionExacta, latExacta, lngExacta, fotos: [{ uri, url }], preguntaVerificacion,
//   respuestaVerificacion, clientRequestId }
// Cada foto ya trae `url` resuelta si un intento anterior la subió con éxito (ver
// onFotoSubida abajo) — reenviar un borrador parcialmente subido no vuelve a subir lo que
// ya se subió, solo retoma desde la primera foto sin url.
//
// callbacks.onFotoSubida(foto, url): se llama después de subir cada foto, para que quien
// llama (el wizard, o la cola offline) pueda persistir ese progreso parcial antes de
// seguir con la siguiente — así un fallo a mitad de camino (ej. se cortó la conexión en la
// foto 3 de 4) no obliga a resubir las que ya se subieron en el próximo intento.
//
// callbacks.antesDeCadaRequest(): opcional, se espera antes de cada subida y del POST
// final; si lanza, se corta el envío. La cola offline lo usa para no seguir mandando con
// la sesión de OTRA persona si mientras tanto se cerró sesión y entró otro usuario (el
// interceptor de api.js toma el token vigente en cada request).
export async function enviarPublicacion(borrador, callbacks = {}) {
  const { onFotoSubida, antesDeCadaRequest } = callbacks;
  const fotos = [];
  for (const foto of borrador.fotos) {
    if (foto.url) {
      fotos.push(foto.url);
      continue;
    }
    await antesDeCadaRequest?.();
    const { photoUrl } = await subirFotoPublicacion(foto.uri);
    fotos.push(photoUrl);
    onFotoSubida?.(foto, photoUrl);
  }

  const esEncontrado = borrador.tipo === 'encontrado';
  await antesDeCadaRequest?.();

  return crearPublicacion({
    tipo: borrador.tipo,
    titulo: borrador.titulo,
    descripcion: borrador.descripcion,
    categoria: borrador.categoria,
    fechaSuceso: borrador.fechaSuceso,
    franjaHoraria: borrador.franjaHoraria || undefined,
    barrioId: borrador.barrioId,
    direccionExacta: borrador.direccionExacta,
    latExacta: borrador.latExacta,
    lngExacta: borrador.lngExacta,
    fotos,
    // Defensivo: aunque el wizard ya solo pide pregunta/respuesta cuando tipo=encontrado,
    // acá se vuelven a filtrar por las dudas de que un borrador viejo (retomado días
    // después, o reproducido por la cola offline del Punto 6) las traiga con otro tipo.
    preguntaVerificacion: esEncontrado ? borrador.preguntaVerificacion : undefined,
    respuestaVerificacion: esEncontrado ? borrador.respuestaVerificacion : undefined,
    clientRequestId: borrador.clientRequestId,
  });
}
