package com.hallado.backend.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;

import jakarta.persistence.LockModeType;

public interface PublicacionRepository extends JpaRepository<Publicacion, String> {

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT p FROM Publicacion p WHERE p.id = :id")
        Optional<Publicacion> findByIdForUpdate(@Param("id") String id);

    // Traé las publicaciones de un tipo en ciertos estados, más recientes primero. Es una
    // derived query a propósito: los filtros opcionales (categoría, barrio, fechas, texto)
    // NO van en JPQL con el patrón "(:p IS NULL OR campo = :p)", porque con Hibernate 7 un
    // parámetro null de tipo enum/Instant/String dentro de LOWER()/CONCAT() puede fallar
    // ("could not determine data type of parameter" en PostgreSQL, tipos desconocidos en
    // H2) y eso se veía en la app como pantalla de error al buscar sin filtros. Los filtros
    // opcionales se aplican en memoria en buscar(); el ordenamiento por cercanía y el
    // paginado ya se resolvían en memoria en PublicacionService, y el dataset es chico.
    List<Publicacion> findByTipoAndEstadoInOrderByFechaSucesoDesc(
            TipoPublicacion tipo, Collection<EstadoPublicacion> estados);

    // Caso de uso real del buscador (y de las alertas): solo abierta/en_reclamo (resuelta y
    // vencida ya no son accionables). Cualquier filtro en null significa "sin filtro".
    default List<Publicacion> buscar(
            TipoPublicacion tipo, Categoria categoria, String barrioId, Instant desde, Instant hasta, String texto) {
        String needle = (texto == null || texto.isBlank()) ? null : texto.trim().toLowerCase(Locale.ROOT);
        return findByTipoAndEstadoInOrderByFechaSucesoDesc(
                        tipo, List.of(EstadoPublicacion.ABIERTA, EstadoPublicacion.EN_RECLAMO))
                .stream()
                .filter(p -> categoria == null || p.getCategoria() == categoria)
                .filter(p -> barrioId == null || (p.getBarrio() != null && barrioId.equals(p.getBarrio().getId())))
                .filter(p -> desde == null || (p.getFechaSuceso() != null && !p.getFechaSuceso().isBefore(desde)))
                .filter(p -> hasta == null || (p.getFechaSuceso() != null && !p.getFechaSuceso().isAfter(hasta)))
                .filter(p -> needle == null
                        || (p.getTitulo() != null && p.getTitulo().toLowerCase(Locale.ROOT).contains(needle))
                        || (p.getDescripcion() != null
                                && p.getDescripcion().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
    }

    // Punto 5: idempotencia del alta (ver Publicacion.clientRequestId) y "Mis publicaciones".
    Optional<Publicacion> findByPublicadorIdAndClientRequestId(String publicadorId, String clientRequestId);

    List<Publicacion> findByPublicadorIdOrderByCreadaEnDesc(String publicadorId);

    // Vencimiento automático (sección 4.4 del plan 5/6): publicaciones ABIERTA cuyo
    // venceEn ya pasó. Solo ABIERTA a propósito: EN_RECLAMO/RESUELTA las gobierna
    // ReclamoService, no esta regla.
    List<Publicacion> findByEstadoAndVenceEnBefore(EstadoPublicacion estado, Instant venceEn);
}
