package com.hallado.backend.dto.response;

import com.hallado.backend.entity.EncuentroPropuesta;
import com.hallado.backend.entity.EstadoPropuestaEncuentro;
import java.time.Instant;

public record EncuentroPropuestaResponse(
        String id,
        String direccion,
        String referencia,
        Double latitud,
        Double longitud,
        String propuestoPorId,
        Instant propuestoEn,
        EstadoPropuestaEncuentro estado) {

    public static EncuentroPropuestaResponse of(EncuentroPropuesta propuesta) {
        return new EncuentroPropuestaResponse(
                propuesta.getId(),
                propuesta.getDireccion(),
                propuesta.getReferencia(),
                propuesta.getLatitud(),
                propuesta.getLongitud(),
                propuesta.getPropuestoPor().getId(),
                propuesta.getCreadaEn(),
                propuesta.getEstado());
    }
}
