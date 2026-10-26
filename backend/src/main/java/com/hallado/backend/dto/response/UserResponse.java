package com.hallado.backend.dto.response;

import java.time.Instant;
import java.util.List;

// Perfil propio (GET/PUT /users/me): incluye teléfono y phoneVisible.
public record UserResponse(
        String id,
        String email,
        String name,
        String photoUrl,
        BarrioResponse barrio,
        String phone,
        boolean phoneVisible,
        Instant memberSince,
        ReputationResponse reputation,
        List<BadgeResponse> badges) {
}
