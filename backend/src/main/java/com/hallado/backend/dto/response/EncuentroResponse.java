package com.hallado.backend.dto.response;

import java.util.List;

public record EncuentroResponse(
        String reclamoId,
        EstadoEncuentro estado,
        EncuentroPropuestaResponse propuestaActual,
        EncuentroPropuestaResponse ubicacionAcordada,
        List<EncuentroPropuestaResponse> historial) {
}
