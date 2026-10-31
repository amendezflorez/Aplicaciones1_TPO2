package com.hallado.backend.service;

import com.hallado.backend.dto.request.CrearAlertaRequest;
import com.hallado.backend.dto.response.AlertaResponse;
import com.hallado.backend.dto.response.BarrioResponse;
import com.hallado.backend.entity.Alerta;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.AlertaRepository;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

// "Búsqueda guardada". Alta/listado/borrado nomás: las pantallas "Mis alertas" y qué
// hacer con el indicador de novedad agregado son del Punto 9 (sección 0 del plan).
@Service
public class AlertaService {

    private final AlertaRepository alertaRepository;
    private final BarrioRepository barrioRepository;
    private final UserRepository userRepository;
    private final PublicacionRepository publicacionRepository;

    public AlertaService(
            AlertaRepository alertaRepository,
            BarrioRepository barrioRepository,
            UserRepository userRepository,
            PublicacionRepository publicacionRepository) {
        this.alertaRepository = alertaRepository;
        this.barrioRepository = barrioRepository;
        this.userRepository = userRepository;
        this.publicacionRepository = publicacionRepository;
    }

    public AlertaResponse crear(String userId, CrearAlertaRequest request) {
        if (request.tipoBuscado() == null || request.tipoBuscado().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tipoBuscado es obligatorio.");
        }
        TipoPublicacion tipoBuscado = TipoPublicacion.fromJson(request.tipoBuscado());
        Categoria categoria = (request.categoria() == null || request.categoria().isBlank())
                ? null
                : Categoria.fromJson(request.categoria());
        Barrio barrio = null;
        if (request.barrioId() != null && !request.barrioId().isBlank()) {
            barrio = barrioRepository
                    .findById(request.barrioId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El barrio elegido no existe."));
        }
        User usuario = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);

        Instant ahora = Instant.now();
        Alerta alerta = new Alerta();
        alerta.setUsuario(usuario);
        alerta.setTipoBuscado(tipoBuscado);
        alerta.setCategoria(categoria);
        alerta.setTexto((request.texto() == null || request.texto().isBlank()) ? null : request.texto());
        alerta.setBarrio(barrio);
        alerta.setCreadaEn(ahora);
        alerta.setUltimaRevision(ahora);
        alertaRepository.save(alerta);

        return toResponse(alerta, 0);
    }

    public List<AlertaResponse> listar(String userId) {
        return alertaRepository.findByUsuarioIdOrderByCreadaEnDesc(userId).stream()
                .map(alerta -> toResponse(alerta, contarNovedades(alerta, userId)))
                .toList();
    }

    public void borrar(String userId, String id) {
        Alerta alerta = alertaRepository.findByIdAndUsuarioId(id, userId).orElseThrow(NotFoundException::new);
        alertaRepository.delete(alerta);
    }

    // Mismo criterio que "contarNovedades" del backend Node de Ronda (demo/novedades):
    // las publicaciones propias del usuario nunca cuentan como novedad para sí mismo.
    private long contarNovedades(Alerta alerta, String userId) {
        List<Publicacion> matches = publicacionRepository.buscar(
                alerta.getTipoBuscado().opuesto(),
                alerta.getCategoria(),
                alerta.getBarrio() == null ? null : alerta.getBarrio().getId(),
                alerta.getUltimaRevision(),
                null,
                alerta.getTexto());
        return matches.stream()
                .filter(p -> !p.getPublicador().getId().equals(userId))
                .count();
    }

    private AlertaResponse toResponse(Alerta alerta, long novedadesCount) {
        Barrio barrio = alerta.getBarrio();
        return new AlertaResponse(
                alerta.getId(),
                alerta.getTipoBuscado(),
                alerta.getCategoria(),
                alerta.getTexto(),
                BarrioResponse.of(barrio),
                alerta.getCreadaEn(),
                novedadesCount);
    }
}
