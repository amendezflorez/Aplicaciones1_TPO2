package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;

// Respuesta de /seguimientos (Punto 9). Incluye los campos de PublicacionResumenResponse
// para renderizar directo en PublicationCard, más el estado visto y la bandera cambioEstado
// para el indicador visual de novedad cuando la publicación cambia de estado.
public record SeguimientoResponse(
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
        EstadoPublicacion ultimoEstadoVisto,
        boolean cambioEstado) {
}
