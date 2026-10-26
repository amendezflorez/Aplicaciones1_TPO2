package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends ApiException {

    public TooManyRequestsException() {
        super(HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos. Esperá un momento antes de reintentar.");
    }
}
