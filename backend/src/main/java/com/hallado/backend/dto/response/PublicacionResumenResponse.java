package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;

// Item de /publicaciones y de /seguimientos (sección 3 del plan). lat/lng acá son la
// ubicación aproximada, siempre visible (para el mapa de resultados) — no confundir con
// las de PublicacionDetalleResponse, que son las exactas y van gateadas.
public record PublicacionResumenResponse(
        String id,
        TipoPublicacion tipo,
        String titulo,
        Categoria categoria,
        BarrioResponse barrio,
        Instant fechaSuceso,
        double lat,
        double lng,
        String fotoPrincipalUrl,
        EstadoPublicacion estado) {
}
