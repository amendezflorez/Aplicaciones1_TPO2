package com.hallado.backend.controller;

import com.hallado.backend.dto.response.PageResponse;
import com.hallado.backend.dto.response.PublicacionDetalleResponse;
import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.service.PublicacionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Buscador y detalle (Puntos 3 y 4). Requiere JWT como todo lo que no está en
// JwtAuthFilter.PUBLIC_PREFIXES; "userId" lo deja el filtro.
@RestController
public class PublicacionController {

    private final PublicacionService publicacionService;

    public PublicacionController(PublicacionService publicacionService) {
        this.publicacionService = publicacionService;
    }

    @GetMapping("/publicaciones")
    public PageResponse<PublicacionResumenResponse> buscar(
            @RequestParam("tipoBuscado") String tipoBuscado,
            @RequestParam(value = "categoria", required = false) String categoria,
            @RequestParam(value = "texto", required = false) String texto,
            @RequestParam(value = "barrioId", required = false) String barrioId,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng,
            @RequestParam(value = "radioKm", required = false) Double radioKm,
            @RequestParam(value = "rango", required = false) String rango,
            @RequestParam(value = "desde", required = false) String desde,
            @RequestParam(value = "hasta", required = false) String hasta,
            @RequestParam(value = "orden", required = false) String orden,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        return publicacionService.buscar(
                tipoBuscado, categoria, texto, barrioId, lat, lng, radioKm, rango, desde, hasta, orden, page, size);
    }

    @GetMapping("/publicaciones/{id}")
    public PublicacionDetalleResponse detalle(
            @PathVariable String id, @RequestAttribute("userId") String userId) {
        return publicacionService.getDetalle(id, userId);
    }
}
