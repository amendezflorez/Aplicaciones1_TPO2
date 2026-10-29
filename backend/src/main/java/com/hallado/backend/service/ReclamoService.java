package com.hallado.backend.service;

import com.hallado.backend.dto.request.CrearReclamoRequest;
import com.hallado.backend.dto.response.BarrioResponse;
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
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

// Solo el alta ("Es mío"/"Lo encontré" del detalle) y "¿ya reclamé esto?". El Punto 7
// construye aceptar/rechazar, el consumo real del límite de 3 intentos (tras rechazo) y
// el vencimiento a 48h (sección 0 del plan) — acá solo se deja la entidad lista y un tope
// defensivo de 3 filas por publicación+autor para no dejar la puerta abierta a spam.
@Service
public class ReclamoService {

    private static final int MAX_INTENTOS = 3;

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

    // "Lo encontré" exige una foto (sección 3 del plan) y todavía no hay un endpoint
    // genérico de subida de imágenes en el backend (el único que existía era específico
    // de la foto de perfil). Reusa PhotoStorageService tal cual: misma carpeta de
    // uploads, misma URL servida por WebConfig en /uploads/**.
    public String subirFoto(String userId, MultipartFile foto) {
        return photoStorageService.store(userId, foto);
    }

    public ReclamoResponse crear(String userId, String publicacionId, CrearReclamoRequest request) {
        Publicacion publicacion = publicacionRepository.findById(publicacionId).orElseThrow(NotFoundException::new);
        if (publicacion.getPublicador().getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No podés reclamar tu propia publicación.");
        }
        if (request.tipo() == null || request.tipo().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tipo es obligatorio.");
        }
        TipoReclamo tipo = TipoReclamo.fromJson(request.tipo());
        validarTipoContraPublicacion(tipo, publicacion);

        String respuestaPregunta = null;
        String fotoUrl = null;
        Barrio barrioEncontrado = null;
        if (tipo == TipoReclamo.ES_MIO) {
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

    public ReclamoResponse obtenerMio(String userId, String publicacionId) {
        return reclamoRepository
                .findFirstByPublicacionIdAndAutorIdOrderByCreadaEnDesc(publicacionId, userId)
                .map(this::toResponse)
                .orElse(null);
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
                barrio == null ? null : new BarrioResponse(barrio.getId(), barrio.getName()),
                reclamo.getEstado(),
                reclamo.getCreadaEn());
    }
}
