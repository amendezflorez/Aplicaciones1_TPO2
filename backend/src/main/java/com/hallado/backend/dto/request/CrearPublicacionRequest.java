package com.hallado.backend.dto.request;

import java.time.Instant;
import java.util.List;

// Alta de publicación (Punto 5, sección 3 de PLAN_puntos_5_y_6.md). "fotos" ya son URLs
// resueltas por el cliente en orden (mismo patrón de dos pasos que /reclamos/foto: subir
// primero a POST /publicaciones/fotos, mandar acá las URLs devueltas).
// "direccionExacta" y (latExacta+lngExacta) son cada uno opcional, pero al menos uno de
// los dos tiene que venir ("ya sea escribiéndola o tomando la ubicación actual", consigna
// del TP) — PublicacionService.crear rechaza solo si los dos faltan. Si faltan las
// coordenadas, el mapa de resultados usa el centro del barrio como mejor esfuerzo, pero
// latExacta/lngExacta (el dato gateado) nunca se fabrican: quedan null si no vinieron acá.
// "preguntaVerificacion"/"respuestaVerificacion" son obligatorias si tipo=encontrado y
// están prohibidas si tipo=perdido (ver PublicacionService.crear); la respuesta nunca se
// expone en ningún DTO de lectura.
// "clientRequestId" es opcional: lo genera el cliente para la cola offline del Punto 6, de
// forma que reintentar un POST cuya respuesta se perdió no duplique la publicación.
public record CrearPublicacionRequest(
        String tipo,
        String titulo,
        String descripcion,
        String categoria,
        Instant fechaSuceso,
        String franjaHoraria,
        String barrioId,
        String direccionExacta,
        Double latExacta,
        Double lngExacta,
        List<String> fotos,
        String preguntaVerificacion,
        String respuestaVerificacion,
        String clientRequestId) {
}
