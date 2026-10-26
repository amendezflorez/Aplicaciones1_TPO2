package com.hallado.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// purpose: "register" | "reset" (igual que en el contrato de la app)
public record ResendOtpRequest(@NotBlank @Email String email, @NotBlank String purpose) {
}
