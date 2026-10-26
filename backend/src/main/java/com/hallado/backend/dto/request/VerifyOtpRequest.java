package com.hallado.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(@NotBlank @Email String email, @NotBlank String code) {
}
