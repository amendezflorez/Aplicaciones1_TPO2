package com.hallado.backend.dto.response;

import java.util.List;

public record BandejaNotificacionesResponse(List<NotificacionResponse> data, long noLeidas) {
}
