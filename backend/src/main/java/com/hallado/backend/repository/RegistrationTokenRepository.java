package com.hallado.backend.repository;

import com.hallado.backend.entity.RegistrationToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationTokenRepository extends JpaRepository<RegistrationToken, String> {
}
