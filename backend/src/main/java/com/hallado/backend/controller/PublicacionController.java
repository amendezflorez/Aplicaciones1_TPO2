package com.hallado.backend.controller;

import com.hallado.backend.dto.request.CrearPublicacionRequest;
import com.hallado.backend.dto.response.MiPublicacionResponse;
import com.hallado.backend.dto.response.PageResponse;
import com.hallado.backend.dto.response.PhotoResponse;
import com.hallado.backend.dto.response.PublicacionDetalleResponse;
import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.service.PublicacionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// Buscador y detalle (Puntos 3 y 4) + alta/gestión (Punto 5, ver
// .docs/PLAN_puntos_5_y_6.md). Requiere JWT como todo lo que no está en
// JwtAuthFilter.PUBLIC_PREFIXES; "userId" lo deja el filtro.
@RestController
public class PublicacionController {

    private final PublicacionService publicacionService;

    public PublicacionController(PublicacionService publicacionService) {
        this.publicacionService = publicacionService;
    }

    // Primer paso del alta: sube una foto y devuelve su URL (mismo patrón de dos pasos que
    // /reclamos/foto y /users/me/photo). El segundo paso es POST /publicaciones con esas
    // URLs ya resueltas en "fotos".
    @PostMapping(value = "/publicaciones/fotos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoResponse subirFoto(
            @RequestAttribute("userId") String userId, @RequestParam("foto") MultipartFile foto) {
        return new PhotoResponse(publicacionService.subirFoto(userId, foto));
    }

    // 201 si crea una publicación nueva; 200 (sin duplicar) si clientRequestId ya existía
    // para este publicador — ver PublicacionService.crear.
    @PostMapping("/publicaciones")
    public ResponseEntity<PublicacionDetalleResponse> crear(
            @RequestAttribute("userId") String userId, @RequestBody CrearPublicacionRequest body) {
        var resultado = publicacionService.crear(userId, body);
        HttpStatus status = resultado.creada() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(resultado.publicacion());
    }

    @GetMapping("/publicaciones/mias")
    public List<MiPublicacionResponse> mias(@RequestAttribute("userId") String userId) {
        return publicacionService.getMisPublicaciones(userId);
    }

    @PostMapping("/publicaciones/{id}/renovar")
    public MiPublicacionResponse renovar(@RequestAttribute("userId") String userId, @PathVariable String id) {
        return publicacionService.renovar(userId, id);
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
