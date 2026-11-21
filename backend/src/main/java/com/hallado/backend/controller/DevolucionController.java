package com.hallado.backend.controller;

import com.hallado.backend.dto.request.ConfirmarDevolucionRequest;
import com.hallado.backend.dto.response.ConfirmarDevolucionResponse;
import com.hallado.backend.service.DevolucionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DevolucionController {

    private final DevolucionService devolucionService;

    public DevolucionController(DevolucionService devolucionService) {
        this.devolucionService = devolucionService;
    }

    @PostMapping("/publicaciones/{publicacionId}/devolucion/confirmar")
    public ConfirmarDevolucionResponse confirmar(
            @RequestAttribute("userId") String userId,
            @PathVariable String publicacionId,
            @Valid @RequestBody ConfirmarDevolucionRequest request) {
        return devolucionService.confirmar(userId, publicacionId, request.reclamoId());
    }
}
