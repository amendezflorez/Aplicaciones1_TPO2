package com.hallado.backend.exception;

import org.springframework.http.HttpStatus;

// 409: a diferencia de NotFoundException/UnauthorizedException, acá el mensaje sí varía
// según el caso (ya seguía la publicación, ya tiene 3 intentos, etc.), por eso toma un
// mensaje en vez de uno fijo.
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
