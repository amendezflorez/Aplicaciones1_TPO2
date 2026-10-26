package com.hallado.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

// Solo usamos spring-security-crypto (BCrypt) para hashear contraseñas; no se agregó
// Spring Security completo (filtros, login form, etc.) porque no se vio en clase y la
// autenticación la maneja JwtAuthFilter a mano.
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
