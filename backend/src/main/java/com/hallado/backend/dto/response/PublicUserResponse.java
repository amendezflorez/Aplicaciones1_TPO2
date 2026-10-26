package com.hallado.backend.dto.response;

import java.time.Instant;
import java.util.List;

// Perfil público (GET /users/:id/public): nunca teléfono ni historial de publicaciones.
public record PublicUserResponse(
        String id,
        String name,
        String photoUrl,
        BarrioResponse barrio,
        Instant memberSince,
        ReputationResponse reputation,
        List<BadgeResponse> badges) {
}
