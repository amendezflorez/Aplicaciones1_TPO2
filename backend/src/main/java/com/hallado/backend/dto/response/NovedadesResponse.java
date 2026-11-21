package com.hallado.backend.dto.response;

// Resumen liviano para el badge de la tab "Alertas": total de publicaciones nuevas en las
// alertas activas y cantidad de publicaciones seguidas que cambiaron de estado.
public record NovedadesResponse(long alertas, long seguidas) {
}
