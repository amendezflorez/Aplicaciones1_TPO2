package com.hallado.backend.dto.request;

public record ValorarRequest(
        boolean positiva,
        String comentario,
        String agradecimientoPublico) {
}

