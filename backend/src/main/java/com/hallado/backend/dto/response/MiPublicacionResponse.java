package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;

// Item de GET /publicaciones/mias (Punto 5, sección 3 del plan 5/6). "puedeRenovar" ya
// resuelve acá el mismo criterio que aplica POST /publicaciones/{id}/renovar (vencida, o
// abierta a 5 días o menos de vencer) para que la pantalla "Mis publicaciones" no tenga
// que reimplementar la regla, solo mostrar/ocultar el botón.
public record MiPublicacionResponse(
        String id,
        TipoPublicacion tipo,
        String titulo,
        Categoria categoria,
        BarrioResponse barrio,
        Instant fechaSuceso,
        double lat,
        double lng,
        String fotoPrincipalUrl,
        EstadoPublicacion estado,
        Instant creadaEn,
        Instant venceEn,
        boolean puedeRenovar) {
}
