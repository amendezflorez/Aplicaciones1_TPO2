package com.hallado.backend.dto.request;

// tipoBuscado es el único obligatorio (ver validación en AlertaService); el resto son
// los mismos filtros opcionales del buscador, guardados tal cual para poder re-evaluarlos
// luego contra nuevas publicaciones (novedadesCount).
public record CrearAlertaRequest(String tipoBuscado, String categoria, String texto, String barrioId) {
}
