package com.hallado.backend.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
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

    // Filtra solo abierta/en_reclamo (resuelta/vencida ya no son accionables desde el
    // buscador). Cada parámetro opcional usa el patrón "(:p IS NULL OR campo = :p)";
    // el ordenamiento/paginado final (recientes vs. cercanos, radioKm) se resuelve en
    // PublicacionService sobre esta lista, porque "cercanos" necesita Haversine en
    // memoria (no hay point type en H2 acá) y el dataset de un TP es chico.
    // Los estados van como parámetro bindeado (:estados), no como literales de enum
    // escritos en el texto de la consulta: Hibernate 7 (el que trae Spring Boot 4.1)
    // no valida igual los literales de enum con nombre completo dentro de un IN que
    // versiones viejas — bindear el valor desde Java es la forma robusta y portable.
    @Query("""
            SELECT p FROM Publicacion p
            WHERE p.tipo = :tipo
              AND p.estado IN :estados
              AND (:categoria IS NULL OR p.categoria = :categoria)
              AND (:barrioId IS NULL OR p.barrio.id = :barrioId)
              AND (:desde IS NULL OR p.fechaSuceso >= :desde)
              AND (:hasta IS NULL OR p.fechaSuceso <= :hasta)
              AND (:texto IS NULL
                   OR LOWER(p.titulo) LIKE CONCAT('%', LOWER(:texto), '%')
                   OR LOWER(p.descripcion) LIKE CONCAT('%', LOWER(:texto), '%'))
            """)
    List<Publicacion> buscarPorEstados(
            @Param("tipo") TipoPublicacion tipo,
            @Param("estados") Collection<EstadoPublicacion> estados,
            @Param("categoria") Categoria categoria,
            @Param("barrioId") String barrioId,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta,
            @Param("texto") String texto);

    // Overload de conveniencia: el caso de uso real (buscador) siempre filtra
    // abierta/en_reclamo.
    default List<Publicacion> buscar(
            TipoPublicacion tipo, Categoria categoria, String barrioId, Instant desde, Instant hasta, String texto) {
        return buscarPorEstados(
                tipo,
                List.of(EstadoPublicacion.ABIERTA, EstadoPublicacion.EN_RECLAMO),
                categoria,
                barrioId,
                desde,
                hasta,
                texto);
    }

    // Punto 5: idempotencia del alta (ver Publicacion.clientRequestId) y "Mis publicaciones".
    Optional<Publicacion> findByPublicadorIdAndClientRequestId(String publicadorId, String clientRequestId);

    List<Publicacion> findByPublicadorIdOrderByCreadaEnDesc(String publicadorId);

    // Vencimiento automático (sección 4.4 del plan 5/6): publicaciones ABIERTA cuyo
    // venceEn ya pasó. Solo ABIERTA a propósito: EN_RECLAMO/RESUELTA las gobierna
    // ReclamoService, no esta regla.
    List<Publicacion> findByEstadoAndVenceEnBefore(EstadoPublicacion estado, Instant venceEn);
}
