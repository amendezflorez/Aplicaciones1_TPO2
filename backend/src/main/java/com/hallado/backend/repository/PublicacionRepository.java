package com.hallado.backend.repository;

import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PublicacionRepository extends JpaRepository<Publicacion, String> {

    // Filtra solo abierta/en_reclamo (resuelta/vencida ya no son accionables desde el
    // buscador). Cada parámetro opcional usa el patrón "(:p IS NULL OR campo = :p)";
    // el ordenamiento/paginado final (recientes vs. cercanos, radioKm) se resuelve en
    // PublicacionService sobre esta lista, porque "cercanos" necesita Haversine en
    // memoria (no hay point type en H2 acá) y el dataset de un TP es chico.
    @Query("""
            SELECT p FROM Publicacion p
            WHERE p.tipo = :tipo
              AND p.estado IN (
                  com.hallado.backend.entity.EstadoPublicacion.ABIERTA,
                  com.hallado.backend.entity.EstadoPublicacion.EN_RECLAMO)
              AND (:categoria IS NULL OR p.categoria = :categoria)
              AND (:barrioId IS NULL OR p.barrio.id = :barrioId)
              AND (:desde IS NULL OR p.fechaSuceso >= :desde)
              AND (:hasta IS NULL OR p.fechaSuceso <= :hasta)
              AND (:texto IS NULL
                   OR LOWER(p.titulo) LIKE CONCAT('%', LOWER(:texto), '%')
                   OR LOWER(p.descripcion) LIKE CONCAT('%', LOWER(:texto), '%'))
            """)
    List<Publicacion> buscar(
            @Param("tipo") TipoPublicacion tipo,
            @Param("categoria") Categoria categoria,
            @Param("barrioId") String barrioId,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta,
            @Param("texto") String texto);
}
