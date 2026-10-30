package com.hallado.backend.dto.response;

import java.time.Instant;

import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.TipoReclamo;

public record ReclamoBandejaResponse(
        String id,
        String publicacionId,
        String publicacionTitulo,
        String publicadorId,
        String publicadorNombre,
        String publicadorFotoUrl,
        String autorId,
        String autorNombre,
        String autorFotoUrl,
        TipoReclamo tipo,
        String respuestaPregunta,
        String descripcion,
        String fotoUrl,
        BarrioResponse barrioEncontrado,
        EstadoReclamo estado,
        Instant creadaEn,
        Instant venceEn) {
}