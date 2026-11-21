package com.hallado.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistrarDispositivoRequest(@NotBlank @Size(max = 200) String token) {
}
