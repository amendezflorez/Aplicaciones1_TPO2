package com.hallado.backend.controller;

import com.hallado.backend.dto.request.ValorarRequest;
import com.hallado.backend.dto.response.AgradecimientoResponse;
import com.hallado.backend.dto.response.CasoHistorialResponse;
import com.hallado.backend.service.HistorialService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HistorialController {

    private final HistorialService historialService;

    public HistorialController(HistorialService historialService) {
        this.historialService = historialService;
    }

    @GetMapping("/historial")
    public List<CasoHistorialResponse> listar(
            @RequestAttribute("userId") String userId,
            @RequestParam(value = "tipo", required = false) String tipo,
            @RequestParam(value = "desde", required = false) String desde,
            @RequestParam(value = "hasta", required = false) String hasta) {
        return historialService.listar(userId, tipo, desde, hasta);
    }

    @GetMapping("/historial/{id}")
    public CasoHistorialResponse getDetalle(
            @RequestAttribute("userId") String userId,
            @PathVariable String id) {
        return historialService.getDetalle(userId, id);
    }

    @PostMapping("/historial/{id}/valorar")
    public CasoHistorialResponse valorar(
            @RequestAttribute("userId") String userId,
            @PathVariable String id,
            @RequestBody ValorarRequest body) {
        return historialService.valorar(userId, id, body);
    }

    @GetMapping("/users/{id}/agradecimientos")
    public List<AgradecimientoResponse> listarAgradecimientos(@PathVariable String id) {
        return historialService.listarAgradecimientos(id);
    }
}

