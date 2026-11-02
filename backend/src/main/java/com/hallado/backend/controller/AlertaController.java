package com.hallado.backend.controller;

import com.hallado.backend.dto.request.CrearAlertaRequest;
import com.hallado.backend.dto.request.PausarAlertaRequest;
import com.hallado.backend.dto.response.AlertaResponse;
import com.hallado.backend.service.AlertaService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Búsquedas guardadas — alta/listado/borrado/pausa/revisar (Feature 9).
@RestController
public class AlertaController {

    private final AlertaService alertaService;

    public AlertaController(AlertaService alertaService) {
        this.alertaService = alertaService;
    }

    @PostMapping("/alertas")
    @ResponseStatus(HttpStatus.CREATED)
    public AlertaResponse crear(@RequestAttribute("userId") String userId, @RequestBody CrearAlertaRequest body) {
        return alertaService.crear(userId, body);
    }

    @GetMapping("/alertas")
    public List<AlertaResponse> listar(@RequestAttribute("userId") String userId) {
        return alertaService.listar(userId);
    }

    @PatchMapping("/alertas/{id}/pausar")
    public AlertaResponse pausar(
            @RequestAttribute("userId") String userId,
            @PathVariable String id,
            @RequestBody(required = false) PausarAlertaRequest body) {
        return alertaService.pausar(userId, id, body != null ? body.pausada() : null);
    }

    @PostMapping("/alertas/{id}/revisar")
    public AlertaResponse revisar(@RequestAttribute("userId") String userId, @PathVariable String id) {
        return alertaService.revisar(userId, id);
    }

    @DeleteMapping("/alertas/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@RequestAttribute("userId") String userId, @PathVariable String id) {
        alertaService.borrar(userId, id);
    }
}
