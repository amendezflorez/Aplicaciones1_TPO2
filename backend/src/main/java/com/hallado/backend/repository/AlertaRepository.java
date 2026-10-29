package com.hallado.backend.repository;

import com.hallado.backend.entity.Alerta;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertaRepository extends JpaRepository<Alerta, String> {

    List<Alerta> findByUsuarioIdOrderByCreadaEnDesc(String usuarioId);

    Optional<Alerta> findByIdAndUsuarioId(String id, String usuarioId);
}
