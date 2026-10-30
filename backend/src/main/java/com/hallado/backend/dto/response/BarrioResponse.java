package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Barrio;

// lat/lng: centro aproximado del barrio (Punto 5, sección 10.x de PLAN_puntos_5_y_6.md) —
// el frontend lo usa como respaldo para la ubicación aproximada cuando el alta de una
// publicación solo trae la dirección escrita y ni el geocoding del cliente ni el servidor
// (PublicacionService.crear) lograron resolver coordenadas reales.
// of() centraliza el null-check: son 5 lugares del backend los que construían este DTO.
public record BarrioResponse(String id, String name, Double lat, Double lng) {

    public static BarrioResponse of(Barrio barrio) {
        return barrio == null ? null : new BarrioResponse(barrio.getId(), barrio.getName(), barrio.getLat(), barrio.getLng());
    }
}
