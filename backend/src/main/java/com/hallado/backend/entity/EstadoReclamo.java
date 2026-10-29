package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

// "pendiente" es el único estado que este plan asigna al crear. aceptado/rechazado/vencido
// los setea el Punto 7 (bandeja de reclamos, límite de 3 intentos, vencimiento a 48h);
// la entidad ya queda lista con el campo para que lo extienda en vez de duplicarlo.
public enum EstadoReclamo {
    PENDIENTE("pendiente"),
    ACEPTADO("aceptado"),
    RECHAZADO("rechazado"),
    VENCIDO("vencido");

    private final String json;

    EstadoReclamo(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static EstadoReclamo fromJson(String value) {
        for (EstadoReclamo e : values()) {
            if (e.json.equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "estado de reclamo inválido: " + value);
    }
}
