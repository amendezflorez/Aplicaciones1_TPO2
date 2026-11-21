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
import com.hallado.backend.entity.CasoResuelto;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.Reclamo;
import com.hallado.backend.entity.TipoNotificacion;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.TipoReclamo;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.CasoResueltoRepository;
import com.hallado.backend.repository.FotoPublicacionRepository;
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
    private final CasoResueltoRepository casoResueltoRepository;
    private final UserRepository userRepository;
    private final PhotoStorageService photoStorageService;
    private final NotificacionService notificacionService;
    private final FotoPublicacionRepository fotoPublicacionRepository;

    public ReclamoService(
            ReclamoRepository reclamoRepository,
            PublicacionRepository publicacionRepository,
            BarrioRepository barrioRepository,
            CasoResueltoRepository casoResueltoRepository,
            UserRepository userRepository,
            PhotoStorageService photoStorageService,
            NotificacionService notificacionService,
            FotoPublicacionRepository fotoPublicacionRepository) {
        this.reclamoRepository = reclamoRepository;
        this.publicacionRepository = publicacionRepository;
        this.barrioRepository = barrioRepository;
        this.casoResueltoRepository = casoResueltoRepository;
        this.userRepository = userRepository;
        this.photoStorageService = photoStorageService;
        this.notificacionService = notificacionService;
        this.fotoPublicacionRepository = fotoPublicacionRepository;
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
        if (reclamoRepository.existsByPublicacionIdAndEstado(
                publicacionId, com.hallado.backend.entity.EstadoReclamo.ACEPTADO)) {
            throw new ConflictException("Esta publicación ya tiene un reclamo aceptado y espera la entrega.");
        }
        if (request.tipo() == null || request.tipo().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Elegí si es tuyo o si lo encontraste.");
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
                throw new ApiException(HttpStatus.BAD_REQUEST, "Respondé la pregunta de verificación para demostrar que es tuyo.");
            }
            respuestaPregunta = request.respuestaPregunta();
        } else {
            if (request.fotoUrl() == null || request.fotoUrl().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Adjuntá una foto de lo que encontraste.");
            }
            if (request.barrioId() == null || request.barrioId().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Indicá el barrio donde lo encontraste.");
            }
            fotoUrl = request.fotoUrl();
            barrioEncontrado = barrioRepository
                    .findById(request.barrioId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El barrio elegido no existe."));
        }

        // Un reclamo activo a la vez por persona: si hay uno pendiente, hay que esperar la
        // respuesta (o el vencimiento a las 48 h) antes de volver a intentar.
        if (reclamoRepository.existsByPublicacionIdAndAutorIdAndEstado(
                publicacionId, userId, com.hallado.backend.entity.EstadoReclamo.PENDIENTE)) {
            throw new ConflictException("Ya tenés un reclamo pendiente sobre esta publicación. Esperá la respuesta.");
        }
        long intentosPrevios = reclamoRepository
                .findByPublicacionIdAndAutorId(publicacionId, userId)
                .size();
        if (intentosPrevios >= MAX_INTENTOS) {
            throw new ConflictException(
                    "Ya usaste los " + MAX_INTENTOS + " intentos de reclamo permitidos para esta publicación.");
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

        // Punto 12: aviso al publicador.
        notificacionService.notificar(
                publicacion.getPublicador(),
                TipoNotificacion.RECLAMO_RECIBIDO,
                tipo == TipoReclamo.ES_MIO ? "Alguien dice que es suyo" : "Alguien encontró lo que perdiste",
                nombre(autor) + (tipo == TipoReclamo.ES_MIO ? " reclamó «" : " dice que encontró «")
                        + publicacion.getTitulo() + "». Tenés 48 h para responder.",
                reclamo.getId(),
                publicacion.getId());

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
        List<Reclamo> reclamos = java.util.stream.Stream.concat(
                        reclamoRepository.findByAutorIdOrderByCreadaEnDesc(userId).stream(),
                        reclamoRepository.findRecibidosPorPublicador(userId).stream())
                .distinct()
                .toList();
        if (reclamos.isEmpty()) return List.of();

        java.util.Map<String, Instant> fechasResolucion = casoResueltoRepository
                .findByReclamoIds(reclamos.stream().map(Reclamo::getId).toList())
                .stream()
                .filter(caso -> caso.getReclamo() != null)
                .collect(java.util.stream.Collectors.toMap(
                        caso -> caso.getReclamo().getId(),
                        CasoResuelto::getFechaResolucion,
                        (fechaAnterior, fechaPosterior) -> fechaPosterior));
        return reclamos.stream()
                .map(reclamo -> toBandejaResponse(reclamo, fechasResolucion.get(reclamo.getId()), userId))
                .toList();
    }

    @Transactional
    public ReclamoResponse decidir(String userId, String reclamoId, String decision) {
        vencerPendientes();
        Reclamo existente = reclamoRepository.findById(reclamoId).orElseThrow(NotFoundException::new);
        Publicacion publicacion = publicacionRepository
                .findByIdForUpdate(existente.getPublicacion().getId())
                .orElseThrow(NotFoundException::new);
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
        if (aceptado && reclamoRepository.existsByPublicacionIdAndEstado(
                publicacion.getId(), com.hallado.backend.entity.EstadoReclamo.ACEPTADO)) {
            throw new ConflictException("Ya hay otro reclamo aceptado para esta publicación.");
        }
        reclamo.setEstado(aceptado
                ? com.hallado.backend.entity.EstadoReclamo.ACEPTADO
                : com.hallado.backend.entity.EstadoReclamo.RECHAZADO);
        reclamoRepository.save(reclamo);
        if (aceptado) {
            if (publicacion.getEstado() != EstadoPublicacion.EN_RECLAMO) {
                throw new ConflictException("La publicación ya no está disponible para aceptar reclamos.");
            }
        } else {
            reabrirSiNoQuedanReclamosActivos(publicacion);
        }

        // Punto 12: cambió el estado de un reclamo propio -> aviso a quien lo hizo.
        notificacionService.notificar(
                reclamo.getAutor(),
                aceptado ? TipoNotificacion.RECLAMO_ACEPTADO : TipoNotificacion.RECLAMO_RECHAZADO,
                aceptado ? "¡Aceptaron tu reclamo!" : "Rechazaron tu reclamo",
                aceptado
                        ? "Tu reclamo sobre «" + publicacion.getTitulo() + "» fue aceptado. Coordiná la devolución."
                        : "Tu reclamo sobre «" + publicacion.getTitulo() + "» no fue aceptado."
                                + intentosRestantesTexto(publicacion.getId(), reclamo.getAutor().getId()),
                reclamo.getId(),
                publicacion.getId());
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
        // Punto 12: el reclamo propio cambió de estado (venció sin respuesta).
        vencidos.forEach(reclamo -> notificacionService.notificar(
                reclamo.getAutor(),
                TipoNotificacion.RECLAMO_VENCIDO,
                "Tu reclamo venció",
                "Pasaron 48 h sin respuesta sobre «" + reclamo.getPublicacion().getTitulo() + "»."
                        + intentosRestantesTexto(reclamo.getPublicacion().getId(), reclamo.getAutor().getId()),
                reclamo.getId(),
                reclamo.getPublicacion().getId()));
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

    private String intentosRestantesTexto(String publicacionId, String autorId) {
        long usados = reclamoRepository.findByPublicacionIdAndAutorId(publicacionId, autorId).size();
        long restantes = Math.max(0, MAX_INTENTOS - usados);
        if (restantes == 0) return " Ya no te quedan intentos.";
        return restantes == 1 ? " Te queda 1 intento." : " Te quedan " + restantes + " intentos.";
    }

    private static String nombre(User user) {
        return (user.getName() == null || user.getName().isBlank()) ? "Alguien" : user.getName();
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

    private ReclamoBandejaResponse toBandejaResponse(Reclamo reclamo, Instant fechaResolucion, String userId) {
        String fotoPublicacion = fotoPublicacionRepository
                .findByPublicacionIdOrderByOrdenAsc(reclamo.getPublicacion().getId())
                .stream()
                .findFirst()
                .map(com.hallado.backend.entity.FotoPublicacion::getUrl)
                .orElse(null);
        User contraparte = reclamo.getAutor().getId().equals(userId)
                ? reclamo.getPublicacion().getPublicador()
                : reclamo.getAutor();
        String telefono = reclamo.getEstado() == com.hallado.backend.entity.EstadoReclamo.ACEPTADO
                        && contraparte.isPhoneVisible()
                        && contraparte.getPhone() != null
                        && !contraparte.getPhone().isBlank()
                ? contraparte.getPhone()
                : null;
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
                reclamo.getCreadaEn().plus(PLAZO_RESPUESTA),
                reclamo.getPublicacion().getEstado(),
                fechaResolucion,
                fotoPublicacion,
                telefono);
    }
}
