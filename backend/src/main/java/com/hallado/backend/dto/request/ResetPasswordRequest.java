package com.hallado.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank @Email String email,
        @NotBlank String code,
        // Misma regla que utils/validators.js isValidPassword: ≥8 caracteres, con letra y número.
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$") String newPassword) {
}
