package com.hallado.backend.repository;

import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.Reclamo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReclamoRepository extends JpaRepository<Reclamo, String> {

    // El más reciente del usuario sobre esa publicación, para "yaReclame" / el botón de
    // IniciarReclamoScreen. El Punto 7 construye el límite real de 3 intentos sobre esta
    // misma tabla (contando filas por publicacion+autor).
    Optional<Reclamo> findFirstByPublicacionIdAndAutorIdOrderByCreadaEnDesc(String publicacionId, String autorId);

    List<Reclamo> findByPublicacionIdAndAutorId(String publicacionId, String autorId);

    boolean existsByPublicacionIdAndAutorIdAndEstado(String publicacionId, String autorId, EstadoReclamo estado);
}
