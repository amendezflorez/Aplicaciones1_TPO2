package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {

    public NotFoundException() {
        super(HttpStatus.NOT_FOUND, "No se encontró lo que buscabas.");
    }
}
