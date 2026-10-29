package com.hallado.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hallado.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

// "perdido": la persona perdió algo y publica buscándolo.
// "encontrado": alguien encontró algo y publica para devolverlo.
// La "regla de tipo opuesto" del buscador (sección 3 del plan) vive en PublicacionService,
// no acá: este enum solo modela el dato.
public enum TipoPublicacion {
    PERDIDO("perdido"),
    ENCONTRADO("encontrado");

    private final String json;

    TipoPublicacion(String json) {
        this.json = json;
    }

    @JsonValue
    public String toJson() {
        return json;
    }

    @JsonCreator
    public static TipoPublicacion fromJson(String value) {
        for (TipoPublicacion t : values()) {
            if (t.json.equalsIgnoreCase(value)) {
                return t;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "tipo/tipoBuscado inválido: " + value);
    }

    public TipoPublicacion opuesto() {
        return this == PERDIDO ? ENCONTRADO : PERDIDO;
    }
}
