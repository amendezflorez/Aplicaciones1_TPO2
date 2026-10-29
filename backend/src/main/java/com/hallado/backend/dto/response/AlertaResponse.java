package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;

// novedadesCount: publicaciones nuevas que matchean el filtro de la alerta desde
// "ultimaRevision", excluyendo siempre las propias del usuario (mismo criterio que
// "contarNovedades" del backend Node de Ronda: una publicación propia nunca cuenta como
// novedad para uno mismo). El Punto 9 es quien decide cuándo mover ultimaRevision.
public record AlertaResponse(
        String id,
        TipoPublicacion tipoBuscado,
        Categoria categoria,
        String texto,
        BarrioResponse barrio,
        Instant creadaEn,
        long novedadesCount) {
}
