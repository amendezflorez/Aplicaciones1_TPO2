package com.hallado.backend.repository;

import com.hallado.backend.entity.Notificacion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacionRepository extends JpaRepository<Notificacion, String> {

    List<Notificacion> findTop100ByUsuarioIdOrderByCreadaEnDesc(String usuarioId);

    List<Notificacion> findByUsuarioId(String usuarioId);

    long countByUsuarioIdAndLeidaFalse(String usuarioId);

    Optional<Notificacion> findByIdAndUsuarioId(String id, String usuarioId);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.usuario.id = :usuarioId AND n.leida = false")
    int marcarTodasLeidas(@Param("usuarioId") String usuarioId);
}
