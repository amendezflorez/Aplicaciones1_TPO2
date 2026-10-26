package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

public class InvalidOtpException extends ApiException {

    public InvalidOtpException() {
        super(HttpStatus.BAD_REQUEST, "El código es incorrecto.");
    }
}
