package com.hallado.backend.repository;

import com.hallado.backend.entity.EncuentroPropuesta;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncuentroPropuestaRepository extends JpaRepository<EncuentroPropuesta, String> {

    List<EncuentroPropuesta> findByReclamoIdOrderByCreadaEnAscIdAsc(String reclamoId);
}
