package com.hallado.backend.repository;

import com.hallado.backend.entity.Valoracion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ValoracionRepository extends JpaRepository<Valoracion, String> {

    Optional<Valoracion> findByCasoIdAndAutorId(String casoId, String autorId);

    List<Valoracion> findByCasoId(String casoId);

    @Query("""
            SELECT v FROM Valoracion v
            WHERE v.destinatario.id = :destinatarioId
              AND v.agradecimientoPublico IS NOT NULL
              AND TRIM(v.agradecimientoPublico) != ''
            ORDER BY v.creadaEn DESC
            """)
    List<Valoracion> findAgradecimientosByDestinatarioId(@Param("destinatarioId") String destinatarioId);
}

