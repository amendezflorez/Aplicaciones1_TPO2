package com.hallado.backend.dto.response;

import com.hallado.backend.entity.Notificacion;
import java.time.Instant;

// Punto 12: item de la bandeja. "tipo" en minúsculas (p. ej. "reclamo_recibido"): la app
// lo usa para el ícono y para decidir qué pantalla abrir al tocarla.
public record NotificacionResponse(
        String id,
        String tipo,
        String titulo,
        String cuerpo,
        String reclamoId,
        String publicacionId,
        boolean leida,
        Instant creadaEn) {

    public static NotificacionResponse of(Notificacion n) {
        return new NotificacionResponse(
                n.getId(),
                n.getTipo().toJson(),
                n.getTitulo(),
                n.getCuerpo(),
                n.getReclamoId(),
                n.getPublicacionId(),
                n.isLeida(),
                n.getCreadaEn());
    }
}
