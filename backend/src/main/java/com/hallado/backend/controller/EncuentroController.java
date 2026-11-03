package com.hallado.backend.controller;

import com.hallado.backend.dto.request.ProponerEncuentroRequest;
import com.hallado.backend.dto.response.EncuentroResponse;
import com.hallado.backend.service.EncuentroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EncuentroController {

    private final EncuentroService encuentroService;

    public EncuentroController(EncuentroService encuentroService) {
        this.encuentroService = encuentroService;
    }

    @GetMapping("/reclamos/{reclamoId}/encuentro")
    public EncuentroResponse obtener(
            @RequestAttribute("userId") String userId,
            @PathVariable String reclamoId) {
        return encuentroService.obtener(userId, reclamoId);
    }

    @PostMapping("/reclamos/{reclamoId}/encuentro/propuestas")
    @ResponseStatus(HttpStatus.CREATED)
    public EncuentroResponse proponer(
            @RequestAttribute("userId") String userId,
            @PathVariable String reclamoId,
            @Valid @RequestBody ProponerEncuentroRequest request) {
        return encuentroService.proponer(userId, reclamoId, request);
    }

    @PostMapping("/reclamos/{reclamoId}/encuentro/propuestas/{propuestaId}/aceptar")
    public EncuentroResponse aceptar(
            @RequestAttribute("userId") String userId,
            @PathVariable String reclamoId,
            @PathVariable String propuestaId) {
        return encuentroService.aceptar(userId, reclamoId, propuestaId);
    }
}
