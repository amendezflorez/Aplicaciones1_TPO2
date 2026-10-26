package com.hallado.backend.service;

import com.hallado.backend.dto.response.AuthResponse;
import com.hallado.backend.entity.OtpPurpose;
import com.hallado.backend.entity.RegistrationToken;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.EmailAlreadyExistsException;
import com.hallado.backend.exception.ExpiredOtpException;
import com.hallado.backend.exception.InvalidCredentialsException;
import com.hallado.backend.repository.RegistrationTokenRepository;
import com.hallado.backend.repository.UserRepository;
import com.hallado.backend.security.JwtService;
import com.hallado.backend.util.Emails;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RegistrationTokenRepository registrationTokenRepository;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final long registrationTokenTtlMinutes;

    public AuthService(
            UserRepository userRepository,
            RegistrationTokenRepository registrationTokenRepository,
            OtpService otpService,
            JwtService jwtService,
            UserMapper userMapper,
            PasswordEncoder passwordEncoder,
            @Value("${app.otp.ttl-minutes}") long registrationTokenTtlMinutes) {
        this.userRepository = userRepository;
        this.registrationTokenRepository = registrationTokenRepository;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.registrationTokenTtlMinutes = registrationTokenTtlMinutes;
    }

    public void requestRegisterOtp(String rawEmail) {
        String email = Emails.normalize(rawEmail);
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException();
        }
        otpService.sendCode(email, OtpPurpose.REGISTER);
    }

    public String verifyRegisterOtp(String rawEmail, String code) {
        String email = Emails.normalize(rawEmail);
        otpService.verifyAndConsume(email, code, OtpPurpose.REGISTER);

        RegistrationToken registrationToken = new RegistrationToken();
        registrationToken.setToken(UUID.randomUUID().toString());
        registrationToken.setEmail(email);
        registrationToken.setExpiresAt(Instant.now().plusSeconds(registrationTokenTtlMinutes * 60));
        registrationTokenRepository.save(registrationToken);

        return registrationToken.getToken();
    }

    @Transactional
    public AuthResponse completeRegister(String token, String password) {
        RegistrationToken registrationToken =
                registrationTokenRepository.findById(token).orElseThrow(ExpiredOtpException::new);

        if (registrationToken.getExpiresAt().isBefore(Instant.now())) {
            registrationTokenRepository.delete(registrationToken);
            throw new ExpiredOtpException();
        }
        if (userRepository.existsByEmail(registrationToken.getEmail())) {
            registrationTokenRepository.delete(registrationToken);
            throw new EmailAlreadyExistsException();
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(registrationToken.getEmail());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setName("");
        user.setMemberSince(Instant.now());
        userRepository.save(user);

        registrationTokenRepository.delete(registrationToken);

        return new AuthResponse(jwtService.generateToken(user.getId()), userMapper.toUserResponse(user));
    }

    public AuthResponse login(String rawEmail, String password) {
        User user = userRepository
                .findByEmail(Emails.normalize(rawEmail))
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return new AuthResponse(jwtService.generateToken(user.getId()), userMapper.toUserResponse(user));
    }

    // Siempre "exitoso" de cara afuera (204), exista o no el email, para no revelar
    // si una cuenta está registrada (sección 4 del plan).
    public void forgotPassword(String rawEmail) {
        String email = Emails.normalize(rawEmail);
        userRepository.findByEmail(email).ifPresent(u -> otpService.sendCode(email, OtpPurpose.RESET));
    }

    public void resetPassword(String rawEmail, String code, String newPassword) {
        String email = Emails.normalize(rawEmail);
        otpService.verifyAndConsume(email, code, OtpPurpose.RESET);

        User user = userRepository.findByEmail(email).orElseThrow(InvalidCredentialsException::new);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void resendOtp(String rawEmail, String purpose) {
        otpService.sendCode(Emails.normalize(rawEmail), parsePurpose(purpose));
    }

    private OtpPurpose parsePurpose(String purpose) {
        if ("register".equalsIgnoreCase(purpose)) return OtpPurpose.REGISTER;
        if ("reset".equalsIgnoreCase(purpose)) return OtpPurpose.RESET;
        throw new ApiException(HttpStatus.BAD_REQUEST, "El propósito del código no es válido.");
    }
}
