package com.hallado.backend.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Todos los campos son opcionales: solo se aplican los que vienen (no nulos). Así un
// cliente que mande solo { "name": "Ana" } no pisa el teléfono ni el barrio.
//
// Teléfono: para BORRARLO hay que mandar "" (cadena vacía); null significa "no tocar".
// El formato es el mismo que valida la app (utils/validators.js: isValidPhone).
public record UpdateMeRequest(
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres.")
        @Pattern(regexp = ".*\\S.*", message = "Ingresá tu nombre.")
        String name,
        String barrioId,
        @Pattern(
                regexp = "^$|^\\+?[0-9\\s-]{8,15}$",
                message = "Ingresá un teléfono válido (entre 8 y 15 dígitos, puede empezar con +).")
        String phone,
        Boolean phoneVisible) {
}
