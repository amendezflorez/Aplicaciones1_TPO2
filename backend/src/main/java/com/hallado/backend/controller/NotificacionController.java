package com.hallado.backend.controller;

import com.hallado.backend.dto.request.RegistrarDispositivoRequest;
import com.hallado.backend.dto.response.BandejaNotificacionesResponse;
import com.hallado.backend.dto.response.NotificacionResponse;
import com.hallado.backend.service.NotificacionService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Punto 12: bandeja de notificaciones (historial, leídas/no leídas) y registro del token
// de push de cada dispositivo.
@RestController
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @GetMapping("/notificaciones")
    public BandejaNotificacionesResponse bandeja(@RequestAttribute("userId") String userId) {
        return notificacionService.bandeja(userId);
    }

    @GetMapping("/notificaciones/no-leidas")
    public Map<String, Long> noLeidas(@RequestAttribute("userId") String userId) {
        return Map.of("noLeidas", notificacionService.noLeidas(userId));
    }

    @PatchMapping("/notificaciones/{id}/leida")
    public NotificacionResponse marcarLeida(@RequestAttribute("userId") String userId, @PathVariable String id) {
        return notificacionService.marcarLeida(userId, id);
    }

    @PostMapping("/notificaciones/leer-todas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarTodasLeidas(@RequestAttribute("userId") String userId) {
        notificacionService.marcarTodasLeidas(userId);
    }

    @PostMapping("/dispositivos")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registrarDispositivo(
            @RequestAttribute("userId") String userId, @Valid @RequestBody RegistrarDispositivoRequest request) {
        notificacionService.registrarDispositivo(userId, request.token());
    }

    @PostMapping("/dispositivos/baja")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void darDeBajaDispositivo(
            @RequestAttribute("userId") String userId, @Valid @RequestBody RegistrarDispositivoRequest request) {
        notificacionService.darDeBajaDispositivo(userId, request.token());
    }
}
