package com.hallado.backend.repository;

import com.hallado.backend.entity.Seguimiento;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeguimientoRepository extends JpaRepository<Seguimiento, String> {

    boolean existsByUsuarioIdAndPublicacionId(String usuarioId, String publicacionId);

    Optional<Seguimiento> findByUsuarioIdAndPublicacionId(String usuarioId, String publicacionId);

    List<Seguimiento> findByUsuarioIdOrderByCreadaEnDesc(String usuarioId);

    void deleteByUsuarioIdAndPublicacionId(String usuarioId, String publicacionId);
}
