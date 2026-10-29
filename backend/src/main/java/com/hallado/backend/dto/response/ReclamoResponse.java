package com.hallado.backend.dto.response;

import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.TipoReclamo;
import java.time.Instant;

public record ReclamoResponse(
        String id,
        String publicacionId,
        TipoReclamo tipo,
        String respuestaPregunta,
        String descripcion,
        String fotoUrl,
        BarrioResponse barrioEncontrado,
        EstadoReclamo estado,
        Instant creadaEn) {
}
