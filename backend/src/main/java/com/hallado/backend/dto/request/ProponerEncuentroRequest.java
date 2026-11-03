package com.hallado.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProponerEncuentroRequest(
        @NotBlank @Size(max = 180) String direccion,
        @Size(max = 180) String referencia,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitud,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitud) {
}
