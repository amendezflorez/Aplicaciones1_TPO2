package com.hallado.backend.service;

import com.hallado.backend.dto.request.CrearPublicacionRequest;
import com.hallado.backend.dto.response.MiPublicacionResponse;
import com.hallado.backend.dto.response.PageResponse;
import com.hallado.backend.dto.response.PublicacionDetalleResponse;
import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.FotoPublicacion;
import com.hallado.backend.entity.FranjaHoraria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.FotoPublicacionRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.UserRepository;
import com.hallado.backend.util.GeoUtils;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

// Buscador (Punto 3), detalle (Punto 4) y alta/gestión (Punto 5 — ver
// .docs/PLAN_puntos_5_y_6.md). "Regla de tipo opuesto": si tipoBuscado=perdido (la persona
// perdió algo) se buscan publicaciones tipo=encontrado, y viceversa — la resuelve este
// service (PublicacionRepository.buscar recibe el tipo YA invertido), nunca el cliente
// (sección 3 del plan 3-4).
@Service
public class PublicacionService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int DIAS_VIGENCIA = 30;
    private static final Duration VENTANA_RENOVACION_ANTICIPADA = Duration.ofDays(5);
    // ~150 m, mismo orden de magnitud que el offset fijo que usaba DataSeeder antes del
    // Punto 5: suficiente para no revelar el punto exacto en el mapa de resultados sin
    // alejarse del barrio real.
    private static final double JITTER_MAX_GRADOS = 0.0015;

    private final PublicacionRepository publicacionRepository;
    private final PublicacionMapper publicacionMapper;
    private final FotoPublicacionRepository fotoPublicacionRepository;
    private final BarrioRepository barrioRepository;
    private final UserRepository userRepository;
    private final PhotoStorageService photoStorageService;

    public PublicacionService(
            PublicacionRepository publicacionRepository,
            PublicacionMapper publicacionMapper,
            FotoPublicacionRepository fotoPublicacionRepository,
            BarrioRepository barrioRepository,
            UserRepository userRepository,
            PhotoStorageService photoStorageService) {
        this.publicacionRepository = publicacionRepository;
        this.publicacionMapper = publicacionMapper;
        this.fotoPublicacionRepository = fotoPublicacionRepository;
        this.barrioRepository = barrioRepository;
        this.userRepository = userRepository;
        this.photoStorageService = photoStorageService;
    }

    @Transactional
    public PageResponse<PublicacionResumenResponse> buscar(
            String tipoBuscadoRaw,
            String categoriaRaw,
            String texto,
            String barrioId,
            Double lat,
            Double lng,
            Double radioKm,
            String rango,
            String desdeRaw,
            String hastaRaw,
            String ordenRaw,
            Integer page,
            Integer size) {
        vencerAbiertasVencidas();
        if (tipoBuscadoRaw == null || tipoBuscadoRaw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tipoBuscado es obligatorio.");
        }
        TipoPublicacion tipoBuscado = TipoPublicacion.fromJson(tipoBuscadoRaw);
        TipoPublicacion tipoAPublicar = tipoBuscado.opuesto();
        Categoria categoria = (categoriaRaw == null || categoriaRaw.isBlank()) ? null : Categoria.fromJson(categoriaRaw);

        String orden = (ordenRaw == null || ordenRaw.isBlank()) ? "recientes" : ordenRaw;
        if (!orden.equals("recientes") && !orden.equals("cercanos")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "orden inválido: " + orden);
        }
        if (orden.equals("cercanos") && (lat == null || lng == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "orden=cercanos requiere lat/lng.");
        }

        Instant[] rangoFechas = resolverRango(rango, desdeRaw, hastaRaw);

        int pageNum = (page == null || page < 0) ? 0 : page;
        int pageSize = (size == null || size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);

        List<Publicacion> resultados = publicacionRepository.buscar(
                tipoAPublicar,
                categoria,
                (barrioId == null || barrioId.isBlank()) ? null : barrioId,
                rangoFechas[0],
                rangoFechas[1],
                (texto == null || texto.isBlank()) ? null : texto);

        if (radioKm != null) {
            if (lat == null || lng == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "radioKm requiere lat/lng.");
            }
            resultados = resultados.stream()
                    .filter(p -> GeoUtils.distanciaKm(lat, lng, p.getLat(), p.getLng()) <= radioKm)
                    .toList();
        }

        if (orden.equals("cercanos")) {
            resultados = resultados.stream()
                    .sorted(Comparator.comparingDouble(p -> GeoUtils.distanciaKm(lat, lng, p.getLat(), p.getLng())))
                    .toList();
        }
        // "recientes" ya viene ordenado por fechaSuceso DESC desde la query.

        long total = resultados.size();
        int desde = Math.min(pageNum * pageSize, resultados.size());
        int hasta = Math.min(desde + pageSize, resultados.size());
        List<PublicacionResumenResponse> data =
                resultados.subList(desde, hasta).stream().map(publicacionMapper::toResumen).toList();

        return new PageResponse<>(data, pageNum, pageSize, total);
    }

    @Transactional
    public PublicacionDetalleResponse getDetalle(String id, String userId) {
        Publicacion publicacion = publicacionRepository.findById(id).orElseThrow(NotFoundException::new);
        vencerSiCorresponde(publicacion);
        return publicacionMapper.toDetalle(publicacion, userId);
    }

    // Punto 5: sube una foto de publicación (mismo PhotoStorageService que fotos de perfil
    // y de reclamo) y devuelve su URL; POST /publicaciones la recibe ya resuelta en
    // "fotos" (mismo patrón de dos pasos que el resto del repo).
    public String subirFoto(String userId, MultipartFile foto) {
        return photoStorageService.store(userId, foto);
    }

    // Alta de publicación (sección 3 del plan 5/6). Devuelve también si efectivamente creó
    // una publicación nueva o reusó una existente por clientRequestId, para que el
    // controller elija 201 vs 200.
    @Transactional
    public CrearPublicacionResultado crear(String userId, CrearPublicacionRequest body) {
        String clientRequestId =
                (body.clientRequestId() == null || body.clientRequestId().isBlank()) ? null : body.clientRequestId();
        if (clientRequestId != null) {
            var existente = publicacionRepository.findByPublicadorIdAndClientRequestId(userId, clientRequestId);
            if (existente.isPresent()) {
                return new CrearPublicacionResultado(
                        publicacionMapper.toDetalle(existente.get(), userId), false);
            }
        }

        if (body.tipo() == null || body.tipo().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tipo es obligatorio.");
        }
        TipoPublicacion tipo = TipoPublicacion.fromJson(body.tipo());

        if (body.titulo() == null || body.titulo().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El título es obligatorio.");
        }
        if (body.descripcion() == null || body.descripcion().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La descripción es obligatoria.");
        }
        if (body.categoria() == null || body.categoria().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La categoría es obligatoria.");
        }
        Categoria categoria = Categoria.fromJson(body.categoria());

        if (body.fechaSuceso() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha del suceso es obligatoria.");
        }
        if (body.fechaSuceso().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha del suceso no puede ser futura.");
        }
        FranjaHoraria franjaHoraria =
                (body.franjaHoraria() == null || body.franjaHoraria().isBlank())
                        ? null
                        : FranjaHoraria.fromJson(body.franjaHoraria());

        if (body.barrioId() == null || body.barrioId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El barrio es obligatorio.");
        }
        Barrio barrio = barrioRepository
                .findById(body.barrioId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El barrio elegido no existe."));

        // "ya sea escribiéndola o tomando la ubicación actual" (consigna del TP, Punto 5):
        // alcanza con uno de los dos, no hace falta exigir ambos — antes se pedían los dos
        // siempre, lo que bloqueaba el camino "solo dirección escrita" de punta a punta.
        boolean tieneDireccionTexto = body.direccionExacta() != null && !body.direccionExacta().isBlank();
        boolean tieneCoordenadas = body.latExacta() != null && body.lngExacta() != null;
        if (!tieneDireccionTexto && !tieneCoordenadas) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Indicá la dirección exacta escribiéndola o usando tu ubicación actual.");
        }

        if (body.fotos() == null || body.fotos().stream().allMatch(url -> url == null || url.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Agregá al menos una foto.");
        }

        boolean preguntaPresente =
                body.preguntaVerificacion() != null && !body.preguntaVerificacion().isBlank();
        boolean respuestaPresente =
                body.respuestaVerificacion() != null && !body.respuestaVerificacion().isBlank();
        if (tipo == TipoPublicacion.ENCONTRADO) {
            if (!preguntaPresente || !respuestaPresente) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Si publicás algo encontrado tenés que cargar una pregunta de verificación y su respuesta.");
            }
        } else if (preguntaPresente || respuestaPresente) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "La pregunta de verificación es solo para publicaciones de algo encontrado.");
        }

        User publicador = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);

        // Fuente para la ubicación aproximada (lat/lng, siempre pública, sección 10.x del
        // plan 5/6): las coordenadas que mandó el cliente si existen (GPS, o un geocoding
        // ya resuelto del lado del cliente a partir del texto); si no, el centro del
        // barrio como mejor esfuerzo. Importante: el barrio NUNCA se usa para fabricar un
        // latExacta/lngExacta falso más abajo — esos campos (el dato gateado que ve un
        // reclamante aceptado) solo se completan con lo que mandó el cliente, o quedan
        // null si no mandó nada.
        double latParaAproximar;
        double lngParaAproximar;
        if (tieneCoordenadas) {
            latParaAproximar = body.latExacta();
            lngParaAproximar = body.lngExacta();
        } else if (barrio.getLat() != null && barrio.getLng() != null) {
            latParaAproximar = barrio.getLat();
            lngParaAproximar = barrio.getLng();
        } else {
            // Caso límite, prácticamente inalcanzable con los barrios semillados (todos
            // tienen lat/lng): un barrio cargado a mano sin coordenadas y sin que el
            // cliente haya logrado ninguna. Publicacion.lat/lng no admiten null, así que
            // no hay forma de guardar esta publicación sin algún dato de ubicación.
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "No pudimos ubicar esta publicación en el mapa: probá usando tu ubicación actual.");
        }
        double[] aproximada = aproximar(latParaAproximar, lngParaAproximar);

        Publicacion publicacion = new Publicacion();
        publicacion.setTipo(tipo);
        publicacion.setTitulo(body.titulo().trim());
        publicacion.setDescripcion(body.descripcion().trim());
        publicacion.setCategoria(categoria);
        publicacion.setFechaSuceso(body.fechaSuceso());
        publicacion.setFranjaHoraria(franjaHoraria);
        publicacion.setBarrio(barrio);
        publicacion.setLat(aproximada[0]);
        publicacion.setLng(aproximada[1]);
        publicacion.setDireccionExacta(tieneDireccionTexto ? body.direccionExacta().trim() : null);
        publicacion.setLatExacta(body.latExacta());
        publicacion.setLngExacta(body.lngExacta());
        publicacion.setEstado(EstadoPublicacion.ABIERTA);
        publicacion.setPublicador(publicador);
        publicacion.setPreguntaVerificacion(preguntaPresente ? body.preguntaVerificacion().trim() : null);
        publicacion.setRespuestaVerificacion(respuestaPresente ? body.respuestaVerificacion().trim() : null);
        Instant ahora = Instant.now();
        publicacion.setCreadaEn(ahora);
        publicacion.setVenceEn(ahora.plus(Duration.ofDays(DIAS_VIGENCIA)));
        publicacion.setClientRequestId(clientRequestId);
        publicacionRepository.save(publicacion);

        List<String> urls = body.fotos().stream().filter(url -> url != null && !url.isBlank()).toList();
        List<FotoPublicacion> fotos = new ArrayList<>();
        for (int i = 0; i < urls.size(); i++) {
            FotoPublicacion foto = new FotoPublicacion();
            foto.setPublicacion(publicacion);
            foto.setUrl(urls.get(i));
            foto.setOrden(i);
            fotos.add(foto);
        }
        fotoPublicacionRepository.saveAll(fotos);

        return new CrearPublicacionResultado(publicacionMapper.toDetalle(publicacion, userId), true);
    }

    public record CrearPublicacionResultado(PublicacionDetalleResponse publicacion, boolean creada) {
    }

    // "Mis publicaciones" (sección 3 del plan 5/6): todas las del usuario, sin filtrar por
    // estado (a diferencia del buscador), más recientes primero.
    @Transactional
    public List<MiPublicacionResponse> getMisPublicaciones(String userId) {
        vencerAbiertasVencidas();
        Instant ahora = Instant.now();
        return publicacionRepository.findByPublicadorIdOrderByCreadaEnDesc(userId).stream()
                .map(p -> publicacionMapper.toMia(p, puedeRenovar(p, ahora)))
                .toList();
    }

    // Renovar (sección 3 del plan 5/6): solo el publicador, y solo si está vencida o
    // próxima a vencer (ver puedeRenovar). Deliberadamente no acepta EN_RECLAMO/RESUELTA:
    // esos estados los gobierna ReclamoService (Punto 7) y renovar no debe pisarlos.
    @Transactional
    public MiPublicacionResponse renovar(String userId, String publicacionId) {
        Publicacion publicacion =
                publicacionRepository.findByIdForUpdate(publicacionId).orElseThrow(NotFoundException::new);
        if (!publicacion.getPublicador().getId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el publicador puede renovar esta publicación.");
        }
        Instant ahora = Instant.now();
        if (!puedeRenovar(publicacion, ahora)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Esta publicación todavía no se puede renovar: tiene que estar vencida o a "
                            + VENTANA_RENOVACION_ANTICIPADA.toDays() + " días o menos de vencer.");
        }
        publicacion.setEstado(EstadoPublicacion.ABIERTA);
        publicacion.setVenceEn(ahora.plus(Duration.ofDays(DIAS_VIGENCIA)));
        publicacionRepository.save(publicacion);
        return publicacionMapper.toMia(publicacion, puedeRenovar(publicacion, ahora));
    }

    // Vencida: siempre renovable. Abierta: renovable si está a VENTANA_RENOVACION_ANTICIPADA
    // días o menos de su venceEn ("próxima a vencer"). En_reclamo/resuelta: nunca desde acá.
    private boolean puedeRenovar(Publicacion publicacion, Instant ahora) {
        if (publicacion.getEstado() == EstadoPublicacion.VENCIDA) {
            return true;
        }
        if (publicacion.getEstado() != EstadoPublicacion.ABIERTA || publicacion.getVenceEn() == null) {
            return false;
        }
        return !publicacion.getVenceEn().isAfter(ahora.plus(VENTANA_RENOVACION_ANTICIPADA));
    }

    // Vencimiento automático (sección 4.4 del plan 5/6): se resuelve de las dos formas a
    // la vez, igual que ReclamoService con sus reclamos vencidos — un @Scheduled de
    // mantenimiento para el caso en que nadie vuelva a leer esa publicación, y la misma
    // regla aplicada al vuelo en los puntos de lectura (buscar/detalle/mias) para que el
    // estado nunca se vea desactualizado aunque el scheduler todavía no haya pasado.
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void vencerPublicacionesSinRenovar() {
        vencerAbiertasVencidas();
    }

    private void vencerAbiertasVencidas() {
        List<Publicacion> vencidas =
                publicacionRepository.findByEstadoAndVenceEnBefore(EstadoPublicacion.ABIERTA, Instant.now());
        vencidas.forEach(p -> p.setEstado(EstadoPublicacion.VENCIDA));
        publicacionRepository.saveAll(vencidas);
    }

    private void vencerSiCorresponde(Publicacion publicacion) {
        if (publicacion.getEstado() == EstadoPublicacion.ABIERTA
                && publicacion.getVenceEn() != null
                && publicacion.getVenceEn().isBefore(Instant.now())) {
            publicacion.setEstado(EstadoPublicacion.VENCIDA);
            publicacionRepository.save(publicacion);
        }
    }

    // Ubicación aproximada para el mapa de resultados (sección 3 del plan 5/6): offset
    // aleatorio de hasta JITTER_MAX_GRADOS en cada eje sobre la coordenada exacta cargada
    // al publicar. Se calcula una sola vez, al crear, y queda fijo en lat/lng — no se
    // recalcula en cada lectura.
    private double[] aproximar(double latExacta, double lngExacta) {
        double jitterLat = (ThreadLocalRandom.current().nextDouble() * 2 - 1) * JITTER_MAX_GRADOS;
        double jitterLng = (ThreadLocalRandom.current().nextDouble() * 2 - 1) * JITTER_MAX_GRADOS;
        return new double[] {latExacta + jitterLat, lngExacta + jitterLng};
    }

    /** Devuelve [desde, hasta], cualquiera puede ser null (sin filtro de fecha). */
    private Instant[] resolverRango(String rango, String desdeRaw, String hastaRaw) {
        if (rango == null || rango.isBlank()) {
            return new Instant[] {null, null};
        }
        Instant ahora = Instant.now();
        return switch (rango) {
            case "hoy" -> new Instant[] {ahora.minus(Duration.ofDays(1)), ahora};
            case "3dias" -> new Instant[] {ahora.minus(Duration.ofDays(3)), ahora};
            case "semana" -> new Instant[] {ahora.minus(Duration.ofDays(7)), ahora};
            case "personalizado" -> {
                if (desdeRaw == null || hastaRaw == null) {
                    throw new ApiException(
                            HttpStatus.BAD_REQUEST, "rango=personalizado requiere desde y hasta.");
                }
                yield new Instant[] {parseInstant(desdeRaw, "desde"), parseInstant(hastaRaw, "hasta")};
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "rango inválido: " + rango);
        };
    }

    private Instant parseInstant(String raw, String campo) {
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, campo + " inválido, formato esperado ISO-8601.");
        }
    }
}
