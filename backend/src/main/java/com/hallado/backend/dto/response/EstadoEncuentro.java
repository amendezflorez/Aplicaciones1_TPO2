package com.hallado.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonValue;

public enum EstadoEncuentro {
    SIN_PROPUESTA("sin_propuesta"),
    PENDIENTE("pendiente"),
    ACORDADO("acordado");

    private final String json;

    EstadoEncuentro(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }
}
