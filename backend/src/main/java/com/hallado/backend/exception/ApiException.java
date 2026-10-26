package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

// Excepción base: lleva el HttpStatus que debe devolver la respuesta.
// Las pantallas de la app solo miran el código HTTP (services/errors.js), así que el
// mensaje es únicamente para logs/depuración.
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
