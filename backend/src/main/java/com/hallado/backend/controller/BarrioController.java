package com.hallado.backend.controller;

import com.hallado.backend.dto.response.BarrioResponse;
import com.hallado.backend.repository.BarrioRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Ruta pública (sin JWT): ver JwtAuthFilter.PUBLIC_PREFIXES.
@RestController
@RequestMapping("/barrios")
public class BarrioController {

    private final BarrioRepository barrioRepository;

    public BarrioController(BarrioRepository barrioRepository) {
        this.barrioRepository = barrioRepository;
    }

    @GetMapping
    public List<BarrioResponse> list() {
        return barrioRepository.findAll().stream().map(BarrioResponse::of).toList();
    }
}
