package com.hallado.backend.controller;

import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.service.SeguimientoService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// "Seguir" una publicación desde el detalle (Punto 4). El listado de "Seguidas" lo usa
// el Punto 9.
@RestController
public class SeguimientoController {

    private final SeguimientoService seguimientoService;

    public SeguimientoController(SeguimientoService seguimientoService) {
        this.seguimientoService = seguimientoService;
    }

    @PostMapping("/publicaciones/{id}/seguir")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void seguir(@RequestAttribute("userId") String userId, @PathVariable String id) {
        seguimientoService.seguir(userId, id);
    }

    @DeleteMapping("/publicaciones/{id}/seguir")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dejarDeSeguir(@RequestAttribute("userId") String userId, @PathVariable String id) {
        seguimientoService.dejarDeSeguir(userId, id);
    }

    @GetMapping("/seguimientos")
    public List<PublicacionResumenResponse> listar(@RequestAttribute("userId") String userId) {
        return seguimientoService.listar(userId);
    }
}
