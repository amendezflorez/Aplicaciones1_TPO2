package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Categoria;
import java.time.Instant;

public record CasoHistorialResponse(
        String id,
        String publicacionId,
        String publicacionTitulo,
        Categoria publicacionCategoria,
        String publicacionFotoPrincipalUrl,
        String tipo,
        Instant fechaResolucion,
        ContraparteResponse contraparte,
        boolean puedeValorar,
        long diasRestantesParaValorar,
        ValoracionResponse miValoracion,
        ValoracionResponse valoracionRecibida) {
}

