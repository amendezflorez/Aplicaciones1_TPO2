package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

// "abierta": nadie reclamó todavía (o hay reclamos rechazados). "en_reclamo": hay al
// menos un Reclamo pendiente/aceptado sobre la publicación. "resuelta"/"vencida" las
// setea el Punto 5/7 (renovación, aceptación final); acá solo se declara el campo.
public enum EstadoPublicacion {
    ABIERTA("abierta"),
    EN_RECLAMO("en_reclamo"),
    RESUELTA("resuelta"),
    VENCIDA("vencida");

    private final String json;

    EstadoPublicacion(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static EstadoPublicacion fromJson(String value) {
        for (EstadoPublicacion e : values()) {
            if (e.json.equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "estado inválido: " + value);
    }
}
