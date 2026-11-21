package com.hallado.backend.service;

import java.util.Map;

// Punto 12: se publica al guardar una Notificacion. ExpoPushSender lo escucha y manda el
// push recién cuando la transacción que la creó se confirma (AFTER_COMMIT): si la acción
// de negocio falla y se hace rollback, no sale ningún aviso; y si el envío del push falla,
// la acción de negocio ya quedó guardada (y la notificación está igual en la bandeja).
public record NotificacionCreadaEvent(String usuarioId, String titulo, String cuerpo, Map<String, String> data) {
}
