package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

public enum TipoReclamo {
    ES_MIO("es_mio"),
    LO_ENCONTRE("lo_encontre");

    private final String json;

    TipoReclamo(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static TipoReclamo fromJson(String value) {
        for (TipoReclamo t : values()) {
            if (t.json.equalsIgnoreCase(value)) {
                return t;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "tipo de reclamo inválido: " + value);
    }
}
