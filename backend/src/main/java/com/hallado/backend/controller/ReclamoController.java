package com.hallado.backend.controller;

import com.hallado.backend.dto.request.CrearReclamoRequest;
import com.hallado.backend.dto.response.PhotoResponse;
import com.hallado.backend.dto.response.ReclamoResponse;
import com.hallado.backend.service.ReclamoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// Solo el alta ("Es mío"/"Lo encontré" desde el detalle) y "¿ya reclamé esto?". El Punto 7
// construye la bandeja de reclamos y aceptar/rechazar sobre esta misma entidad.
@RestController
public class ReclamoController {

    private final ReclamoService reclamoService;

    public ReclamoController(ReclamoService reclamoService) {
        this.reclamoService = reclamoService;
    }

    @PostMapping("/publicaciones/{id}/reclamos")
    @ResponseStatus(HttpStatus.CREATED)
    public ReclamoResponse crear(
            @RequestAttribute("userId") String userId,
            @PathVariable String id,
            @RequestBody CrearReclamoRequest body) {
        return reclamoService.crear(userId, id, body);
    }

    @GetMapping("/publicaciones/{id}/reclamos/mio")
    public ReclamoResponse mio(@RequestAttribute("userId") String userId, @PathVariable String id) {
        return reclamoService.obtenerMio(userId, id);
    }

    // Usado por IniciarReclamoScreen antes del POST de arriba cuando tipo='lo_encontre':
    // sube la foto y devuelve la URL que después viaja en CrearReclamoRequest.fotoUrl
    // (mismo patrón de dos pasos que la foto de perfil en UserController).
    @PostMapping(value = "/reclamos/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoResponse subirFoto(
            @RequestAttribute("userId") String userId, @RequestParam("foto") MultipartFile foto) {
        return new PhotoResponse(reclamoService.subirFoto(userId, foto));
    }
}
