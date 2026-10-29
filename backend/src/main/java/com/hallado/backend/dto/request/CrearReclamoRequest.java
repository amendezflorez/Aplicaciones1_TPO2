package com.hallado.backend.dto.request;

// "es_mio" exige respuestaPregunta; "lo_encontre" exige fotoUrl y barrioId (dónde lo
// encontró) — ver validación en ReclamoService. fotoUrl ya resuelta por el cliente
// (mismo patrón que la foto de perfil: se sube antes con un endpoint de archivo y acá
// solo viaja la URL) para no duplicar lógica de multipart.
public record CrearReclamoRequest(
        String tipo, String respuestaPregunta, String descripcion, String fotoUrl, String barrioId) {
}
