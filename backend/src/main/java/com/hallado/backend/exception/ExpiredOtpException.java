package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

// También se usa cuando se superan los intentos permitidos: se trata como "pedí un código
// nuevo", que es el mismo mensaje/flujo que un código vencido en la UI (410).
public class ExpiredOtpException extends ApiException {

    public ExpiredOtpException() {
        super(HttpStatus.GONE, "El código expiró. Pedí uno nuevo.");
    }
}
