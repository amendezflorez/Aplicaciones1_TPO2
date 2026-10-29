package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

public enum FranjaHoraria {
    MANANA("mañana"),
    TARDE("tarde"),
    NOCHE("noche");

    private final String json;

    FranjaHoraria(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static FranjaHoraria fromJson(String value) {
        for (FranjaHoraria f : values()) {
            if (f.json.equalsIgnoreCase(value)) {
                return f;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "franjaHoraria inválida: " + value);
    }
}
