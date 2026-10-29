package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.FranjaHoraria;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;
import java.util.List;

// GET /publicaciones/{id} (sección 3 del plan). No es un "extends" de
// PublicacionResumenResponse a nivel Java (son records independientes), pero repite sus
// campos tal cual el contrato indica ("...PublicacionResumen").
// direccionExacta/latExacta/lngExacta llegan null salvo reclamo ACEPTADO del usuario o
// publicación propia — la gating la hace PublicacionMapper, nunca el cliente.
// preguntaVerificacion sí viaja siempre (cualquiera puede intentar "Es mío");
// respuestaVerificacion nunca se expone acá ni en ningún otro DTO.
public record PublicacionDetalleResponse(
        String id,
        TipoPublicacion tipo,
        String titulo,
        Categoria categoria,
        BarrioResponse barrio,
        Instant fechaSuceso,
        double lat,
        double lng,
        String fotoPrincipalUrl,
        EstadoPublicacion estado,
        String descripcion,
        FranjaHoraria franjaHoraria,
        List<FotoPublicacionResponse> fotos,
        String direccionExacta,
        Double latExacta,
        Double lngExacta,
        String preguntaVerificacion,
        PublicadorResponse publicador,
        boolean esPropia,
        boolean yaReclame,
        boolean siguiendo) {
}
