package com.hallado.backend.repository;

import com.hallado.backend.entity.DispositivoPush;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DispositivoPushRepository extends JpaRepository<DispositivoPush, String> {

    Optional<DispositivoPush> findByToken(String token);

    List<DispositivoPush> findByUsuarioId(String usuarioId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByToken(String token);
}
