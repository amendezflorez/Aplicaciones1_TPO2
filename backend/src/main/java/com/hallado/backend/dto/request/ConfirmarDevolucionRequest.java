package com.hallado.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ConfirmarDevolucionRequest(@NotBlank String reclamoId) {
}
