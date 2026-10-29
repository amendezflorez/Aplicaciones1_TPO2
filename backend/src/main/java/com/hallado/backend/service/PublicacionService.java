package com.hallado.backend.service;

import com.hallado.backend.dto.response.PageResponse;
import com.hallado.backend.dto.response.PublicacionDetalleResponse;
import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.util.GeoUtils;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

// Buscador (Punto 3) y detalle (Punto 4). "Regla de tipo opuesto": si tipoBuscado=perdido
// (la persona perdió algo) se buscan publicaciones tipo=encontrado, y viceversa — la
// resuelve este service (PublicacionRepository.buscar recibe el tipo YA invertido), nunca
// el cliente (sección 3 del plan).
@Service
public class PublicacionService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final PublicacionRepository publicacionRepository;
    private final PublicacionMapper publicacionMapper;

    public PublicacionService(PublicacionRepository publicacionRepository, PublicacionMapper publicacionMapper) {
        this.publicacionRepository = publicacionRepository;
        this.publicacionMapper = publicacionMapper;
    }

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

    public PublicacionDetalleResponse getDetalle(String id, String userId) {
        Publicacion publicacion = publicacionRepository.findById(id).orElseThrow(NotFoundException::new);
        return publicacionMapper.toDetalle(publicacion, userId);
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
