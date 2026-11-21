package com.hallado.backend.service;

import com.hallado.backend.dto.response.ConfirmarDevolucionResponse;
import com.hallado.backend.entity.CasoResuelto;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.Reclamo;
import com.hallado.backend.entity.TipoReclamo;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.repository.CasoResueltoRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.ReclamoRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DevolucionService {

    private final PublicacionRepository publicacionRepository;
    private final ReclamoRepository reclamoRepository;
    private final CasoResueltoRepository casoResueltoRepository;

    public DevolucionService(
            PublicacionRepository publicacionRepository,
            ReclamoRepository reclamoRepository,
            CasoResueltoRepository casoResueltoRepository) {
        this.publicacionRepository = publicacionRepository;
        this.reclamoRepository = reclamoRepository;
        this.casoResueltoRepository = casoResueltoRepository;
    }

    @Transactional
    public ConfirmarDevolucionResponse confirmar(String userId, String publicacionId, String reclamoId) {
        Publicacion publicacion = publicacionRepository.findByIdForUpdate(publicacionId)
                .orElseThrow(NotFoundException::new);
        Reclamo reclamo = reclamoRepository.findByIdForUpdate(reclamoId)
                .orElseThrow(NotFoundException::new);

        if (!reclamo.getPublicacion().getId().equals(publicacionId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El reclamo no corresponde a esta publicación.");
        }
        if (reclamo.getEstado() != EstadoReclamo.ACEPTADO) {
            throw new ConflictException("El reclamo debe estar aceptado para confirmar la devolución.");
        }
        if (publicacion.getEstado() == EstadoPublicacion.RESUELTA
                || casoResueltoRepository.findFirstByReclamoId(reclamoId).isPresent()) {
            throw new ConflictException("La devolución de esta publicación ya fue confirmada.");
        }
        if (publicacion.getEstado() != EstadoPublicacion.EN_RECLAMO) {
            throw new ConflictException("La publicación ya no está disponible para confirmar la devolución.");
        }

        String recuperadorId = reclamo.getTipo() == TipoReclamo.ES_MIO
                ? reclamo.getAutor().getId()
                : publicacion.getPublicador().getId();
        if (!recuperadorId.equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo quien recupera el objeto puede confirmar la entrega.");
        }

        Instant fechaResolucion = Instant.now();
        CasoResuelto caso = new CasoResuelto();
        caso.setPublicacion(publicacion);
        caso.setReclamo(reclamo);
        caso.setDevolvedor(reclamo.getTipo() == TipoReclamo.ES_MIO
                ? publicacion.getPublicador()
                : reclamo.getAutor());
        caso.setRecuperador(reclamo.getTipo() == TipoReclamo.ES_MIO
                ? reclamo.getAutor()
                : publicacion.getPublicador());
        caso.setFechaResolucion(fechaResolucion);
        casoResueltoRepository.save(caso);

        List<Reclamo> reclamosActivos = new ArrayList<>();
        reclamosActivos.addAll(reclamoRepository.findByPublicacionIdAndEstado(
                publicacionId, EstadoReclamo.PENDIENTE));
        reclamosActivos.addAll(reclamoRepository.findByPublicacionIdAndEstado(
                publicacionId, EstadoReclamo.ACEPTADO));
        reclamosActivos.stream()
                .filter(otroReclamo -> !otroReclamo.getId().equals(reclamoId))
                .forEach(otroReclamo -> otroReclamo.setEstado(EstadoReclamo.RECHAZADO));
        reclamoRepository.saveAll(reclamosActivos);

        publicacion.setEstado(EstadoPublicacion.RESUELTA);
        publicacionRepository.save(publicacion);

        return new ConfirmarDevolucionResponse(
                reclamoId, publicacionId, publicacion.getEstado(), fechaResolucion);
    }
}
