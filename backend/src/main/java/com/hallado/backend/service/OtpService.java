package com.hallado.backend.service;

import com.hallado.backend.entity.OtpCode;
import com.hallado.backend.entity.OtpPurpose;
import com.hallado.backend.exception.ExpiredOtpException;
import com.hallado.backend.exception.InvalidOtpException;
import com.hallado.backend.exception.TooManyRequestsException;
import com.hallado.backend.repository.OtpCodeRepository;
import java.security.SecureRandom;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Códigos OTP de 6 dígitos (registro y recupero de contraseña). No hay proveedor de
// email configurado (fuera del alcance de la cátedra): el código se loguea en la
// consola del backend, tal como permite la sección 7 del plan ("el backend puede
// loguear el código en consola").
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);

    private final OtpCodeRepository otpCodeRepository;
    private final SecureRandom random = new SecureRandom();

    private final long ttlMinutes;
    private final long resendCooldownSeconds;
    private final int maxAttempts;

    public OtpService(
            OtpCodeRepository otpCodeRepository,
            @Value("${app.otp.ttl-minutes}") long ttlMinutes,
            @Value("${app.otp.resend-cooldown-seconds}") long resendCooldownSeconds,
            @Value("${app.otp.max-attempts}") int maxAttempts) {
        this.otpCodeRepository = otpCodeRepository;
        this.ttlMinutes = ttlMinutes;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxAttempts = maxAttempts;
    }

    // Usado por request-otp, forgot-password y resend: misma regla de cooldown en los tres.
    public void sendCode(String email, OtpPurpose purpose) {
        otpCodeRepository.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose).ifPresent(last -> {
            if (last.getCreatedAt().plusSeconds(resendCooldownSeconds).isAfter(Instant.now())) {
                throw new TooManyRequestsException();
            }
        });

        String code = generateCode();
        Instant now = Instant.now();

        OtpCode otp = new OtpCode();
        otp.setEmail(email);
        otp.setPurpose(purpose);
        otp.setCode(code);
        otp.setCreatedAt(now);
        otp.setExpiresAt(now.plusSeconds(ttlMinutes * 60));
        otpCodeRepository.save(otp);

        log.info("Código OTP para {} ({}): {}", email, purpose, code);
    }

    // Lanza InvalidOtpException (400) si el código no coincide, o ExpiredOtpException (410)
    // si no hay código vigente, venció o se superaron los intentos permitidos.
    public void verifyAndConsume(String email, String code, OtpPurpose purpose) {
        OtpCode otp = otpCodeRepository
                .findFirstByEmailAndPurposeAndUsedFalseOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(ExpiredOtpException::new);

        if (otp.getExpiresAt().isBefore(Instant.now()) || otp.getAttempts() >= maxAttempts) {
            throw new ExpiredOtpException();
        }

        if (!otp.getCode().equals(code)) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpCodeRepository.save(otp);
            throw new InvalidOtpException();
        }

        otp.setUsed(true);
        otpCodeRepository.save(otp);
    }

    private String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
