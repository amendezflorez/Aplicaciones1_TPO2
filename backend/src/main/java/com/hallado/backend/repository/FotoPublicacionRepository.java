package com.hallado.backend.repository;

import com.hallado.backend.entity.FotoPublicacion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoPublicacionRepository extends JpaRepository<FotoPublicacion, String> {

    List<FotoPublicacion> findByPublicacionIdOrderByOrdenAsc(String publicacionId);
}
