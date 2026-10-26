package com.hallado.backend.repository;

import com.hallado.backend.entity.OtpCode;
import com.hallado.backend.entity.OtpPurpose;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpCodeRepository extends JpaRepository<OtpCode, String> {

    // Último código enviado (usado o no), para aplicar el cooldown de reenvío.
    Optional<OtpCode> findFirstByEmailAndPurposeOrderByCreatedAtDesc(String email, OtpPurpose purpose);

    // Último código vigente (sin consumir), el que se valida en verify/reset.
    Optional<OtpCode> findFirstByEmailAndPurposeAndUsedFalseOrderByCreatedAtDesc(String email, OtpPurpose purpose);
}
