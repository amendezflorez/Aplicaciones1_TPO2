package com.hallado.backend.service;

import com.hallado.backend.dto.response.BarrioResponse;
import com.hallado.backend.dto.response.FotoPublicacionResponse;
import com.hallado.backend.dto.response.MiPublicacionResponse;
import com.hallado.backend.dto.response.PublicacionDetalleResponse;
import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.dto.response.PublicadorResponse;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.FotoPublicacion;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.repository.FotoPublicacionRepository;
import com.hallado.backend.repository.ReclamoRepository;
import com.hallado.backend.repository.SeguimientoRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

// direccionExacta/latExacta/lngExacta solo se revelan si es la propia publicación o si el
// usuario tiene un Reclamo ACEPTADO sobre ella (sección 3 del plan) — la gating vive acá,
// un solo lugar, para que ningún controller/servicio nuevo pueda "olvidarse" de aplicarla.
@Component
public class PublicacionMapper {

    private final FotoPublicacionRepository fotoPublicacionRepository;
    private final ReclamoRepository reclamoRepository;
    private final SeguimientoRepository seguimientoRepository;

    public PublicacionMapper(
            FotoPublicacionRepository fotoPublicacionRepository,
            ReclamoRepository reclamoRepository,
            SeguimientoRepository seguimientoRepository) {
        this.fotoPublicacionRepository = fotoPublicacionRepository;
        this.reclamoRepository = reclamoRepository;
        this.seguimientoRepository = seguimientoRepository;
    }

    public PublicacionResumenResponse toResumen(Publicacion p) {
        return new PublicacionResumenResponse(
                p.getId(),
                p.getTipo(),
                p.getTitulo(),
                p.getCategoria(),
                toBarrioResponse(p.getBarrio()),
                p.getFechaSuceso(),
                p.getLat(),
                p.getLng(),
                fotoPrincipalUrl(p.getId()),
                p.getEstado());
    }

    public PublicacionDetalleResponse toDetalle(Publicacion p, String userId) {
        boolean esPropia = p.getPublicador().getId().equals(userId);
        boolean reclamoAceptado =
                reclamoRepository.existsByPublicacionIdAndAutorIdAndEstado(p.getId(), userId, EstadoReclamo.ACEPTADO);
        boolean revelarUbicacionExacta = esPropia || reclamoAceptado;

        boolean yaReclame = !esPropia
                && !reclamoRepository.findByPublicacionIdAndAutorId(p.getId(), userId).isEmpty();
        boolean siguiendo = seguimientoRepository.existsByUsuarioIdAndPublicacionId(userId, p.getId());

        List<FotoPublicacionResponse> fotos = fotoPublicacionRepository
                .findByPublicacionIdOrderByOrdenAsc(p.getId())
                .stream()
                .map(f -> new FotoPublicacionResponse(f.getId(), f.getUrl()))
                .toList();

        return new PublicacionDetalleResponse(
                p.getId(),
                p.getTipo(),
                p.getTitulo(),
                p.getCategoria(),
                toBarrioResponse(p.getBarrio()),
                p.getFechaSuceso(),
                p.getLat(),
                p.getLng(),
                fotos.isEmpty() ? null : fotos.get(0).url(),
                p.getEstado(),
                p.getDescripcion(),
                p.getFranjaHoraria(),
                fotos,
                revelarUbicacionExacta ? p.getDireccionExacta() : null,
                revelarUbicacionExacta ? p.getLatExacta() : null,
                revelarUbicacionExacta ? p.getLngExacta() : null,
                p.getPreguntaVerificacion(),
                new PublicadorResponse(
                        p.getPublicador().getId(), p.getPublicador().getName(), p.getPublicador().getPhotoUrl()),
                esPropia,
                yaReclame,
                siguiendo);
    }

    // Punto 5: item de "Mis publicaciones". "puedeRenovar" la calcula el llamador
    // (PublicacionService) porque depende de la hora actual, no es un dato de la entidad.
    public MiPublicacionResponse toMia(Publicacion p, boolean puedeRenovar) {
        return new MiPublicacionResponse(
                p.getId(),
                p.getTipo(),
                p.getTitulo(),
                p.getCategoria(),
                toBarrioResponse(p.getBarrio()),
                p.getFechaSuceso(),
                p.getLat(),
                p.getLng(),
                fotoPrincipalUrl(p.getId()),
                p.getEstado(),
                p.getCreadaEn(),
                p.getVenceEn(),
                puedeRenovar);
    }

    private String fotoPrincipalUrl(String publicacionId) {
        List<FotoPublicacion> fotos = fotoPublicacionRepository.findByPublicacionIdOrderByOrdenAsc(publicacionId);
        return fotos.stream()
                .min(Comparator.comparingInt(FotoPublicacion::getOrden))
                .map(FotoPublicacion::getUrl)
                .orElse(null);
    }

    private BarrioResponse toBarrioResponse(Barrio barrio) {
        return BarrioResponse.of(barrio);
    }
}
