package com.hallado.backend.dto.response;

import java.util.List;

// Resumen del publicador tal como viaja embebido en PublicacionDetalleResponse. Incluye la
// reputación resumida y las insignias (mismos datos que GET /users/{id}/public) para que la
// tarjeta del publicador en el detalle no necesite una segunda llamada. El resto del perfil
// (barrio, antigüedad) queda en el perfil público.
public record PublicadorResponse(
        String id, String name, String photoUrl, ReputationResponse reputation, List<BadgeResponse> badges) {
}
