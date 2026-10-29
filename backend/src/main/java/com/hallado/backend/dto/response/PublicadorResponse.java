package com.hallado.backend.dto.response;

// Resumen del publicador tal como viaja embebido en PublicacionDetalleResponse (section 3
// del plan de puntos 3-4). Deliberadamente más chico que PublicUserResponse: el detalle
// de una publicación no necesita barrio/reputación/badges del publicador, solo lo
// mínimo para mostrar la card y linkear a su perfil público (GET /users/{id}/public).
public record PublicadorResponse(String id, String name, String photoUrl) {
}
