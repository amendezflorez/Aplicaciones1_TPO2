package com.hallado.backend.dto.response;

import com.hallado.backend.entity.EstadoPublicacion;
import java.time.Instant;

public record ConfirmarDevolucionResponse(
        String reclamoId,
        String publicacionId,
        EstadoPublicacion estado,
        Instant fechaResolucion) {
}
