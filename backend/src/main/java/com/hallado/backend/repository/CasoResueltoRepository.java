package com.hallado.backend.repository;

import com.hallado.backend.entity.CasoResuelto;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CasoResueltoRepository extends JpaRepository<CasoResuelto, String> {

    @Query("""
            SELECT c FROM CasoResuelto c
            WHERE (c.devolvedor.id = :userId OR c.recuperador.id = :userId)
              AND (:tipo IS NULL
                   OR (:tipo = 'devolvi' AND c.devolvedor.id = :userId)
                   OR (:tipo = 'recupere' AND c.recuperador.id = :userId))
              AND (:desde IS NULL OR c.fechaResolucion >= :desde)
              AND (:hasta IS NULL OR c.fechaResolucion <= :hasta)
            ORDER BY c.fechaResolucion DESC
            """)
    List<CasoResuelto> buscarHistorial(
            @Param("userId") String userId,
            @Param("tipo") String tipo,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta);
}

