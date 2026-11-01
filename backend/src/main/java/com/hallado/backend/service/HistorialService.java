package com.hallado.backend.service;

import com.hallado.backend.dto.request.ValorarRequest;
import com.hallado.backend.dto.response.AgradecimientoResponse;
import com.hallado.backend.dto.response.CasoHistorialResponse;
import com.hallado.backend.dto.response.ContraparteResponse;
import com.hallado.backend.dto.response.ValoracionResponse;
import com.hallado.backend.entity.CasoResuelto;
import com.hallado.backend.entity.FotoPublicacion;
import com.hallado.backend.entity.User;
import com.hallado.backend.entity.Valoracion;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.CasoResueltoRepository;
import com.hallado.backend.repository.FotoPublicacionRepository;
import com.hallado.backend.repository.UserRepository;
import com.hallado.backend.repository.ValoracionRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class HistorialService {

    private static final Duration PLAZO_VALORACION = Duration.ofDays(7);

    private final CasoResueltoRepository casoResueltoRepository;
    private final ValoracionRepository valoracionRepository;
    private final UserRepository userRepository;
    private final FotoPublicacionRepository fotoPublicacionRepository;

    public HistorialService(
            CasoResueltoRepository casoResueltoRepository,
            ValoracionRepository valoracionRepository,
            UserRepository userRepository,
            FotoPublicacionRepository fotoPublicacionRepository) {
        this.casoResueltoRepository = casoResueltoRepository;
        this.valoracionRepository = valoracionRepository;
        this.userRepository = userRepository;
        this.fotoPublicacionRepository = fotoPublicacionRepository;
    }

    @Transactional(readOnly = true)
    public List<CasoHistorialResponse> listar(String userId, String tipo, String desdeRaw, String hastaRaw) {
        Instant desde = (desdeRaw != null && !desdeRaw.isBlank()) ? parseInstant(desdeRaw) : null;
        Instant hasta = (hastaRaw != null && !hastaRaw.isBlank()) ? parseInstant(hastaRaw) : null;

        List<CasoResuelto> casos = casoResueltoRepository.buscarHistorial(userId, tipo, desde, hasta);
        return casos.stream().map(c -> toResponse(c, userId)).toList();
    }

    @Transactional(readOnly = true)
    public CasoHistorialResponse getDetalle(String userId, String casoId) {
        CasoResuelto caso = casoResueltoRepository.findById(casoId).orElseThrow(NotFoundException::new);
        if (!caso.getDevolvedor().getId().equals(userId) && !caso.getRecuperador().getId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No tenés permiso para ver este caso.");
        }
        return toResponse(caso, userId);
    }

    public CasoHistorialResponse valorar(String userId, String casoId, ValorarRequest request) {
        CasoResuelto caso = casoResueltoRepository.findById(casoId).orElseThrow(NotFoundException::new);

        boolean esDevolvedor = caso.getDevolvedor().getId().equals(userId);
        boolean esRecuperador = caso.getRecuperador().getId().equals(userId);

        if (!esDevolvedor && !esRecuperador) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo las partes involucradas pueden valorar este caso.");
        }

        Instant ahora = Instant.now();
        Instant limite = caso.getFechaResolucion().plus(PLAZO_VALORACION);
        if (ahora.isAfter(limite)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El plazo de 7 días para valorar ha expirado.");
        }

        if (valoracionRepository.findByCasoIdAndAutorId(casoId, userId).isPresent()) {
            throw new ConflictException("Ya valoraste a tu contraparte en este caso.");
        }

        User autor = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);
        User destinatario = esDevolvedor ? caso.getRecuperador() : caso.getDevolvedor();

        Valoracion valoracion = new Valoracion();
        valoracion.setCaso(caso);
        valoracion.setAutor(autor);
        valoracion.setDestinatario(destinatario);
        valoracion.setPositiva(request.positiva());
        valoracion.setComentario(request.comentario() != null ? request.comentario().trim() : null);

        // Solo quien recuperó el objeto puede dejar un agradecimiento público en el perfil del vecino
        if (esRecuperador && request.agradecimientoPublico() != null && !request.agradecimientoPublico().isBlank()) {
            valoracion.setAgradecimientoPublico(request.agradecimientoPublico().trim());
        }

        valoracion.setCreadaEn(ahora);
        valoracionRepository.save(valoracion);

        // Actualizar reputación de la contraparte
        if (request.positiva()) {
            destinatario.setPositiveCount(destinatario.getPositiveCount() + 1);
        } else {
            destinatario.setNegativeCount(destinatario.getNegativeCount() + 1);
        }
        destinatario.setScore(destinatario.getPositiveCount() - destinatario.getNegativeCount());
        userRepository.save(destinatario);

        return toResponse(caso, userId);
    }

    @Transactional(readOnly = true)
    public List<AgradecimientoResponse> listarAgradecimientos(String userId) {
        List<Valoracion> valoraciones = valoracionRepository.findAgradecimientosByDestinatarioId(userId);
        return valoraciones.stream()
                .map(v -> new AgradecimientoResponse(
                        v.getId(),
                        v.getAutor().getName(),
                        v.getAutor().getPhotoUrl(),
                        v.getCaso().getPublicacion().getTitulo(),
                        v.getAgradecimientoPublico(),
                        v.getCreadaEn()))
                .toList();
    }

    private CasoHistorialResponse toResponse(CasoResuelto c, String userId) {
        boolean esDevolvedor = c.getDevolvedor().getId().equals(userId);
        String tipo = esDevolvedor ? "devolvi" : "recupere";
        User contraparteUser = esDevolvedor ? c.getRecuperador() : c.getDevolvedor();

        ContraparteResponse contraparte = new ContraparteResponse(
                contraparteUser.getId(),
                contraparteUser.getName(),
                contraparteUser.getPhotoUrl());

        List<FotoPublicacion> fotos = fotoPublicacionRepository
                .findByPublicacionIdOrderByOrdenAsc(c.getPublicacion().getId());
        String fotoPrincipalUrl = fotos.isEmpty() ? null : fotos.get(0).getUrl();

        Optional<Valoracion> miValOpt = valoracionRepository.findByCasoIdAndAutorId(c.getId(), userId);
        Optional<Valoracion> recValOpt = valoracionRepository.findByCasoIdAndAutorId(c.getId(), contraparteUser.getId());

        ValoracionResponse miValoracion = miValOpt.map(this::toValResponse).orElse(null);
        ValoracionResponse valoracionRecibida = recValOpt.map(this::toValResponse).orElse(null);

        Instant ahora = Instant.now();
        Instant limite = c.getFechaResolucion().plus(PLAZO_VALORACION);
        boolean dentroDePlazo = ahora.isBefore(limite);
        boolean puedeValorar = miValoracion == null && dentroDePlazo;
        long diasRestantes = dentroDePlazo ? Math.max(0, Duration.between(ahora, limite).toDays() + 1) : 0;

        return new CasoHistorialResponse(
                c.getId(),
                c.getPublicacion().getId(),
                c.getPublicacion().getTitulo(),
                c.getPublicacion().getCategoria(),
                fotoPrincipalUrl,
                tipo,
                c.getFechaResolucion(),
                contraparte,
                puedeValorar,
                diasRestantes,
                miValoracion,
                valoracionRecibida);
    }

    private ValoracionResponse toValResponse(Valoracion v) {
        return new ValoracionResponse(
                v.getId(),
                v.isPositiva(),
                v.getComentario(),
                v.getAgradecimientoPublico(),
                v.getCreadaEn());
    }

    private Instant parseInstant(String raw) {
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            return null;
        }
    }
}

