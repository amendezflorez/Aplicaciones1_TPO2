package com.hallado.backend.dto.response;

import java.time.Instant;

public record AgradecimientoResponse(
        String id,
        String autorNombre,
        String autorFotoUrl,
        String objeto,
        String mensaje,
        Instant fecha) {
}

