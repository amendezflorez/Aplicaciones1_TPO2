package com.hallado.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.hallado.backend.dto.request.CrearReclamoRequest;
import com.hallado.backend.dto.response.BarrioResponse;
import com.hallado.backend.dto.response.ReclamoBandejaResponse;
import com.hallado.backend.dto.response.ReclamoResponse;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.Reclamo;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.TipoReclamo;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.ReclamoRepository;
import com.hallado.backend.repository.UserRepository;

@Service
public class ReclamoService {

    private static final int MAX_INTENTOS = 3;
    private static final Duration PLAZO_RESPUESTA = Duration.ofHours(48);

    private final ReclamoRepository reclamoRepository;
    private final PublicacionRepository publicacionRepository;
    private final BarrioRepository barrioRepository;
    private final UserRepository userRepository;
    private final PhotoStorageService photoStorageService;

    public ReclamoService(
            ReclamoRepository reclamoRepository,
            PublicacionRepository publicacionRepository,
            BarrioRepository barrioRepository,
            UserRepository userRepository,
            PhotoStorageService photoStorageService) {
        this.reclamoRepository = reclamoRepository;
        this.publicacionRepository = publicacionRepository;
        this.barrioRepository = barrioRepository;
        this.userRepository = userRepository;
        this.photoStorageService = photoStorageService;
    }

    // Reusa PhotoStorageService para las fotos de evidencia opcionales/obligatorias.
    public String subirFoto(String userId, MultipartFile foto) {
        return photoStorageService.store(userId, foto);
    }

    @Transactional
    public ReclamoResponse crear(String userId, String publicacionId, CrearReclamoRequest request) {
        Publicacion publicacion = publicacionRepository.findByIdForUpdate(publicacionId)
            .orElseThrow(NotFoundException::new);
        if (publicacion.getPublicador().getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No podés reclamar tu propia publicación.");
        }
        if (publicacion.getEstado() == EstadoPublicacion.RESUELTA
            || publicacion.getEstado() == EstadoPublicacion.VENCIDA) {
            throw new ConflictException("Esta publicación ya no acepta reclamos.");
        }
        if (request.tipo() == null || request.tipo().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tipo es obligatorio.");
        }
        TipoReclamo tipo = TipoReclamo.fromJson(request.tipo());
        validarTipoContraPublicacion(tipo, publicacion);

        String respuestaPregunta = null;
        String fotoUrl = (request.fotoUrl() == null || request.fotoUrl().isBlank()) ? null : request.fotoUrl();
        Barrio barrioEncontrado = null;
        if (tipo == TipoReclamo.ES_MIO) {
            if (publicacion.getPreguntaVerificacion() == null || publicacion.getPreguntaVerificacion().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Esta publicación no tiene pregunta de verificación.");
            }
            if (request.respuestaPregunta() == null || request.respuestaPregunta().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "respuestaPregunta es obligatoria para 'Es mío'.");
            }
            respuestaPregunta = request.respuestaPregunta();
        } else {
            if (request.fotoUrl() == null || request.fotoUrl().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "fotoUrl es obligatoria para 'Lo encontré'.");
            }
            if (request.barrioId() == null || request.barrioId().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "barrioId es obligatorio para 'Lo encontré'.");
            }
            fotoUrl = request.fotoUrl();
            barrioEncontrado = barrioRepository
                    .findById(request.barrioId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El barrio elegido no existe."));
        }

        long intentosPrevios = reclamoRepository
                .findByPublicacionIdAndAutorId(publicacionId, userId)
                .size();
        if (intentosPrevios >= MAX_INTENTOS) {
            throw new ConflictException("Ya alcanzaste el máximo de intentos de reclamo sobre esta publicación.");
        }

        User autor = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);

        Reclamo reclamo = new Reclamo();
        reclamo.setPublicacion(publicacion);
        reclamo.setAutor(autor);
        reclamo.setTipo(tipo);
        reclamo.setRespuestaPregunta(respuestaPregunta);
        reclamo.setDescripcion(
                (request.descripcion() == null || request.descripcion().isBlank()) ? null : request.descripcion());
        reclamo.setFotoUrl(fotoUrl);
        reclamo.setBarrioEncontrado(barrioEncontrado);
        reclamo.setCreadaEn(Instant.now());
        reclamoRepository.save(reclamo);

        if (publicacion.getEstado() == EstadoPublicacion.ABIERTA) {
            publicacion.setEstado(EstadoPublicacion.EN_RECLAMO);
            publicacionRepository.save(publicacion);
        }

        return toResponse(reclamo);
    }

    @Transactional
    public ReclamoResponse obtenerMio(String userId, String publicacionId) {
        vencerPendientes();
        return reclamoRepository
                .findFirstByPublicacionIdAndAutorIdOrderByCreadaEnDesc(publicacionId, userId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public List<ReclamoBandejaResponse> listar(String userId) {
        vencerPendientes();
        return java.util.stream.Stream.concat(
                        reclamoRepository.findByAutorIdOrderByCreadaEnDesc(userId).stream(),
                        reclamoRepository.findRecibidosPorPublicador(userId).stream())
                .distinct()
                .map(this::toBandejaResponse)
                .toList();
    }

    @Transactional
    public ReclamoResponse decidir(String userId, String reclamoId, String decision) {
        vencerPendientes();
        Reclamo reclamo = reclamoRepository.findByIdForUpdate(reclamoId).orElseThrow(NotFoundException::new);
        if (!reclamo.getPublicacion().getPublicador().getId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el publicador puede responder este reclamo.");
        }
        if (reclamo.getEstado() != com.hallado.backend.entity.EstadoReclamo.PENDIENTE) {
            throw new ConflictException("Este reclamo ya no está pendiente.");
        }
        if (decision == null || (!decision.equalsIgnoreCase("aceptar") && !decision.equalsIgnoreCase("rechazar"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La decisión debe ser aceptar o rechazar.");
        }

        boolean aceptado = decision.equalsIgnoreCase("aceptar");
        reclamo.setEstado(aceptado
                ? com.hallado.backend.entity.EstadoReclamo.ACEPTADO
                : com.hallado.backend.entity.EstadoReclamo.RECHAZADO);
        reclamoRepository.save(reclamo);
        if (aceptado) {
            Publicacion publicacion = reclamo.getPublicacion();
            publicacion.setEstado(EstadoPublicacion.RESUELTA);
            publicacionRepository.save(publicacion);
        } else {
            reabrirSiNoQuedanReclamosActivos(reclamo.getPublicacion());
        }
        return toResponse(reclamo);
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void vencerReclamosSinRespuesta() {
        vencerPendientes();
    }

    private void vencerPendientes() {
        Instant cutoff = Instant.now().minus(PLAZO_RESPUESTA);
        List<Reclamo> vencidos = reclamoRepository.findByEstadoAndCreadaEnBefore(
                com.hallado.backend.entity.EstadoReclamo.PENDIENTE, cutoff);
        vencidos.forEach(reclamo -> reclamo.setEstado(com.hallado.backend.entity.EstadoReclamo.VENCIDO));
        reclamoRepository.saveAll(vencidos);
        vencidos.stream()
                .map(Reclamo::getPublicacion)
                .distinct()
                .forEach(this::reabrirSiNoQuedanReclamosActivos);
    }

    private void reabrirSiNoQuedanReclamosActivos(Publicacion publicacion) {
        if (publicacion.getEstado() == EstadoPublicacion.EN_RECLAMO
                && !reclamoRepository.existsByPublicacionIdAndEstado(
                        publicacion.getId(), com.hallado.backend.entity.EstadoReclamo.PENDIENTE)
                && !reclamoRepository.existsByPublicacionIdAndEstado(
                        publicacion.getId(), com.hallado.backend.entity.EstadoReclamo.ACEPTADO)) {
            publicacion.setEstado(EstadoPublicacion.ABIERTA);
            publicacionRepository.save(publicacion);
        }
    }

    // "Es mío" solo tiene sentido sobre una publicación tipo=encontrado (alguien avisa que
    // encontró algo); "Lo encontré" solo sobre tipo=perdido (alguien avisa que encontró lo
    // que otro perdió). Es la contraparte, a nivel reclamo, de la regla de tipo opuesto
    // del buscador.
    private void validarTipoContraPublicacion(TipoReclamo tipo, Publicacion publicacion) {
        boolean valido = (tipo == TipoReclamo.ES_MIO && publicacion.getTipo() == TipoPublicacion.ENCONTRADO)
                || (tipo == TipoReclamo.LO_ENCONTRE && publicacion.getTipo() == TipoPublicacion.PERDIDO);
        if (!valido) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El tipo de reclamo no corresponde al tipo de publicación.");
        }
    }

    private ReclamoResponse toResponse(Reclamo reclamo) {
        Barrio barrio = reclamo.getBarrioEncontrado();
        return new ReclamoResponse(
                reclamo.getId(),
                reclamo.getPublicacion().getId(),
                reclamo.getTipo(),
                reclamo.getRespuestaPregunta(),
                reclamo.getDescripcion(),
                reclamo.getFotoUrl(),
                BarrioResponse.of(barrio),
                reclamo.getEstado(),
                reclamo.getCreadaEn());
    }

    private ReclamoBandejaResponse toBandejaResponse(Reclamo reclamo) {
        return new ReclamoBandejaResponse(
                reclamo.getId(),
                reclamo.getPublicacion().getId(),
                reclamo.getPublicacion().getTitulo(),
                reclamo.getPublicacion().getPublicador().getId(),
                reclamo.getPublicacion().getPublicador().getName(),
                reclamo.getPublicacion().getPublicador().getPhotoUrl(),
                reclamo.getAutor().getId(),
                reclamo.getAutor().getName(),
                reclamo.getAutor().getPhotoUrl(),
                reclamo.getTipo(),
                reclamo.getRespuestaPregunta(),
                reclamo.getDescripcion(),
                reclamo.getFotoUrl(),
                BarrioResponse.of(reclamo.getBarrioEncontrado()),
                reclamo.getEstado(),
                reclamo.getCreadaEn(),
                reclamo.getCreadaEn().plus(PLAZO_RESPUESTA));
    }
}
