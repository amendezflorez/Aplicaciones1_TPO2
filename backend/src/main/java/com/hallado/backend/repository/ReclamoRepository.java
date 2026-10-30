package com.hallado.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.Reclamo;

public interface ReclamoRepository extends JpaRepository<Reclamo, String> {

    // El más reciente del usuario sobre esa publicación, para "yaReclame" / el botón de
    // IniciarReclamoScreen. El Punto 7 construye el límite real de 3 intentos sobre esta
    // misma tabla (contando filas por publicacion+autor).
    Optional<Reclamo> findFirstByPublicacionIdAndAutorIdOrderByCreadaEnDesc(String publicacionId, String autorId);

    List<Reclamo> findByPublicacionIdAndAutorId(String publicacionId, String autorId);

    List<Reclamo> findByAutorIdOrderByCreadaEnDesc(String autorId);

    @Query("SELECT r FROM Reclamo r WHERE r.publicacion.publicador.id = :userId ORDER BY r.creadaEn DESC")
    List<Reclamo> findRecibidosPorPublicador(@Param("userId") String userId);

    List<Reclamo> findByEstadoAndCreadaEnBefore(EstadoReclamo estado, java.time.Instant cutoff);

    boolean existsByPublicacionIdAndEstado(String publicacionId, EstadoReclamo estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reclamo r WHERE r.id = :id")
    Optional<Reclamo> findByIdForUpdate(@Param("id") String id);

    boolean existsByPublicacionIdAndAutorIdAndEstado(String publicacionId, String autorId, EstadoReclamo estado);
}
