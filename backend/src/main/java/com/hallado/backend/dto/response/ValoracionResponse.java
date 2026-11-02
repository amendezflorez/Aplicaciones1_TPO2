package com.hallado.backend.dto.response;

import java.time.Instant;

public record ValoracionResponse(
        String id,
        boolean positiva,
        String comentario,
        String agradecimientoPublico,
        Instant creadaEn) {
}

