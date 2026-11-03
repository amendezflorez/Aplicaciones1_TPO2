package com.hallado.backend.service;

import com.hallado.backend.dto.request.ProponerEncuentroRequest;
import com.hallado.backend.dto.response.EncuentroPropuestaResponse;
import com.hallado.backend.dto.response.EncuentroResponse;
import com.hallado.backend.dto.response.EstadoEncuentro;
import com.hallado.backend.entity.EncuentroPropuesta;
import com.hallado.backend.entity.EstadoPropuestaEncuentro;
import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.Reclamo;
import com.hallado.backend.entity.TipoReclamo;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.EncuentroPropuestaRepository;
import com.hallado.backend.repository.ReclamoRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EncuentroService {

    private final ReclamoRepository reclamoRepository;
    private final EncuentroPropuestaRepository propuestaRepository;
    private final UserRepository userRepository;

    public EncuentroService(
            ReclamoRepository reclamoRepository,
            EncuentroPropuestaRepository propuestaRepository,
            UserRepository userRepository) {
        this.reclamoRepository = reclamoRepository;
        this.propuestaRepository = propuestaRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public EncuentroResponse obtener(String userId, String reclamoId) {
        Reclamo reclamo = reclamoRepository.findById(reclamoId).orElseThrow(NotFoundException::new);
        validarAcceso(reclamo, userId);
        validarAceptado(reclamo);
        return respuesta(reclamo);
    }

    @Transactional
    public EncuentroResponse proponer(String userId, String reclamoId, ProponerEncuentroRequest request) {
        Reclamo reclamo = reclamoRepository.findByIdForUpdate(reclamoId).orElseThrow(NotFoundException::new);
        validarAcceso(reclamo, userId);
        validarAceptado(reclamo);
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La propuesta de encuentro es obligatoria.");
        }

        if ((request.latitud() == null) != (request.longitud() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "latitud y longitud deben enviarse juntas.");
        }

        List<EncuentroPropuesta> historial = propuestaRepository.findByReclamoIdOrderByCreadaEnAscIdAsc(reclamoId);
        EncuentroPropuesta actual = historial.isEmpty() ? null : historial.get(historial.size() - 1);
        if (actual == null) {
            if (!personaQueTieneElObjeto(reclamo).equals(userId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Solo quien tiene el objeto puede proponer el primer lugar.");
            }
        } else {
            if (actual.getEstado() != EstadoPropuestaEncuentro.PROPUESTA_PENDIENTE) {
                throw new ConflictException("La negociación ya fue acordada y no admite nuevas propuestas.");
            }
            if (actual.getPropuestoPor().getId().equals(userId)) {
                throw new ConflictException("Esperá la respuesta de la otra persona antes de proponer otra ubicación.");
            }
            actual.setEstado(EstadoPropuestaEncuentro.REEMPLAZADO);
            actual.setActualizadaEn(Instant.now());
            propuestaRepository.save(actual);
        }

        User proponente = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);
        Instant ahora = Instant.now();
        if (actual != null && !ahora.isAfter(actual.getCreadaEn())) {
            ahora = actual.getCreadaEn().plusNanos(1);
        }
        EncuentroPropuesta propuesta = new EncuentroPropuesta();
        propuesta.setReclamo(reclamo);
        propuesta.setDireccion(request.direccion().trim());
        propuesta.setReferencia(request.referencia() == null || request.referencia().isBlank()
                ? null
                : request.referencia().trim());
        propuesta.setLatitud(request.latitud());
        propuesta.setLongitud(request.longitud());
        propuesta.setPropuestoPor(proponente);
        propuesta.setEstado(EstadoPropuestaEncuentro.PROPUESTA_PENDIENTE);
        propuesta.setCreadaEn(ahora);
        propuesta.setActualizadaEn(ahora);
        propuestaRepository.save(propuesta);
        return respuesta(reclamo);
    }

    @Transactional
    public EncuentroResponse aceptar(String userId, String reclamoId, String propuestaId) {
        Reclamo reclamo = reclamoRepository.findByIdForUpdate(reclamoId).orElseThrow(NotFoundException::new);
        validarAcceso(reclamo, userId);
        validarAceptado(reclamo);

        List<EncuentroPropuesta> historial = propuestaRepository.findByReclamoIdOrderByCreadaEnAscIdAsc(reclamoId);
        EncuentroPropuesta actual = historial.isEmpty() ? null : historial.get(historial.size() - 1);
        if (actual == null || !actual.getId().equals(propuestaId)
                || actual.getEstado() != EstadoPropuestaEncuentro.PROPUESTA_PENDIENTE) {
            throw new ConflictException("La propuesta ya cambió. Actualizá el encuentro e intentá nuevamente.");
        }
        if (actual.getPropuestoPor().getId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No podés aceptar tu propia propuesta.");
        }

        actual.setEstado(EstadoPropuestaEncuentro.ACEPTADO);
        actual.setActualizadaEn(Instant.now());
        propuestaRepository.save(actual);
        return respuesta(reclamo);
    }

    private void validarAcceso(Reclamo reclamo, String userId) {
        boolean esParte = reclamo.getAutor().getId().equals(userId)
                || reclamo.getPublicacion().getPublicador().getId().equals(userId);
        if (!esParte) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo las partes del reclamo pueden coordinar la devolución.");
        }
    }

    private void validarAceptado(Reclamo reclamo) {
        if (reclamo.getEstado() != EstadoReclamo.ACEPTADO) {
            throw new ConflictException("El reclamo debe estar aceptado para coordinar un encuentro.");
        }
    }

    private String personaQueTieneElObjeto(Reclamo reclamo) {
        return reclamo.getTipo() == TipoReclamo.LO_ENCONTRE
                ? reclamo.getAutor().getId()
                : reclamo.getPublicacion().getPublicador().getId();
    }

    private EncuentroResponse respuesta(Reclamo reclamo) {
        List<EncuentroPropuesta> propuestas =
                propuestaRepository.findByReclamoIdOrderByCreadaEnAscIdAsc(reclamo.getId());
        List<EncuentroPropuestaResponse> historial = propuestas.stream()
                .map(EncuentroPropuestaResponse::of)
                .toList();
        if (propuestas.isEmpty()) {
            return new EncuentroResponse(
                    reclamo.getId(), EstadoEncuentro.SIN_PROPUESTA, null, null, historial);
        }

        EncuentroPropuesta ultima = propuestas.get(propuestas.size() - 1);
        EncuentroPropuestaResponse actual = EncuentroPropuestaResponse.of(ultima);
        if (ultima.getEstado() == EstadoPropuestaEncuentro.ACEPTADO) {
            return new EncuentroResponse(
                    reclamo.getId(), EstadoEncuentro.ACORDADO, actual, actual, historial);
        }
        return new EncuentroResponse(
                reclamo.getId(), EstadoEncuentro.PENDIENTE, actual, null, historial);
    }
}
