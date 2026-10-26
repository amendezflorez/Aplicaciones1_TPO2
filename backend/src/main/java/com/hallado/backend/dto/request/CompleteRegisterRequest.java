package com.hallado.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CompleteRegisterRequest(
        @NotBlank String registrationToken,
        // Misma regla que utils/validators.js isValidPassword: ≥8 caracteres, con letra y número.
        // La app ya valida esto antes de pedir red; esto es defensa en profundidad del lado server.
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$") String password) {
}
