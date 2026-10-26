package com.hallado.backend.controller;

import com.hallado.backend.dto.request.CompleteRegisterRequest;
import com.hallado.backend.dto.request.ForgotPasswordRequest;
import com.hallado.backend.dto.request.LoginRequest;
import com.hallado.backend.dto.request.RequestOtpRequest;
import com.hallado.backend.dto.request.ResendOtpRequest;
import com.hallado.backend.dto.request.ResetPasswordRequest;
import com.hallado.backend.dto.request.VerifyOtpRequest;
import com.hallado.backend.dto.response.AuthResponse;
import com.hallado.backend.dto.response.RegistrationTokenResponse;
import com.hallado.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Rutas públicas (sin JWT): ver JwtAuthFilter.PUBLIC_PREFIXES.
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<Void> requestOtp(@Valid @RequestBody RequestOtpRequest body) {
        authService.requestRegisterOtp(body.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register/verify-otp")
    public RegistrationTokenResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest body) {
        return new RegistrationTokenResponse(authService.verifyRegisterOtp(body.email(), body.code()));
    }

    @PostMapping("/register/complete")
    public AuthResponse complete(@Valid @RequestBody CompleteRegisterRequest body) {
        return authService.completeRegister(body.registrationToken(), body.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body) {
        return authService.login(body.email(), body.password());
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body) {
        authService.forgotPassword(body.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest body) {
        authService.resetPassword(body.email(), body.code(), body.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/otp/resend")
    public ResponseEntity<Void> resendOtp(@Valid @RequestBody ResendOtpRequest body) {
        authService.resendOtp(body.email(), body.purpose());
        return ResponseEntity.noContent().build();
    }
}
