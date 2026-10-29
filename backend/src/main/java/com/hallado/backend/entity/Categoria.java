package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

// Enum fijo (el TP no pide un endpoint de categorías, a diferencia de /barrios).
public enum Categoria {
    DOCUMENTOS("documentos"),
    LLAVES("llaves"),
    ELECTRONICA("electronica"),
    MASCOTAS("mascotas"),
    ROPA("ropa"),
    OTROS("otros");

    private final String json;

    Categoria(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static Categoria fromJson(String value) {
        for (Categoria c : values()) {
            if (c.json.equalsIgnoreCase(value)) {
                return c;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "categoria inválida: " + value);
    }
}
