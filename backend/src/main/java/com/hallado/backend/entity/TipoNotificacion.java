package com.hallado.backend.entity;

// Punto 12: eventos que generan una notificación. La consigna exige como mínimo:
// reclamo nuevo recibido, cambio de estado de un reclamo propio y propuesta/modificación
// del punto de encuentro. Los demás (encuentro aceptado, devolución confirmada) completan
// el circuito para que la bandeja cuente toda la historia.
public enum TipoNotificacion {
    RECLAMO_RECIBIDO,
    RECLAMO_ACEPTADO,
    RECLAMO_RECHAZADO,
    RECLAMO_VENCIDO,
    ENCUENTRO_PROPUESTO,
    ENCUENTRO_MODIFICADO,
    ENCUENTRO_ACEPTADO,
    DEVOLUCION_CONFIRMADA;

    // Valor que viaja en el JSON y en el "data" del push (minúsculas, como el resto de
    // los enums de la API).
    public String toJson() {
        return name().toLowerCase();
    }
}
