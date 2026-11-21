package com.hallado.backend.exception;

import jakarta.validation.ConstraintViolation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

// Único lugar donde las excepciones se traducen a status HTTP + { "message": "..." }.
// La app (services/errors.js) muestra ese "message" tal cual en los 4xx, así que tiene que
// estar en español claro y sin detalles técnicos. Los errores propios del framework
// (parámetro faltante, JSON mal formado, ruta inexistente...) ya no caen en el 500
// genérico: cada uno tiene su código y su mensaje.
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorBody(String message) {
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorBody(ex.getMessage()));
    }

    // @Valid sobre el body: si la anotación trae un mensaje propio (message = "..."), se
    // muestra ese; si es el mensaje por defecto de Bean Validation (en inglés), uno genérico.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        String mensaje = "Revisá los datos ingresados: hay campos incompletos o inválidos.";
        FieldError fe = ex.getBindingResult().getFieldError();
        if (fe != null) {
            try {
                ConstraintViolation<?> v = fe.unwrap(ConstraintViolation.class);
                String template = v.getMessageTemplate();
                if (template != null && !template.startsWith("{")) {
                    mensaje = v.getMessage();
                }
            } catch (IllegalArgumentException ignored) {
                // No viene de Bean Validation: se queda el mensaje genérico.
            }
        }
        return ResponseEntity.badRequest().body(new ErrorBody(mensaje));
    }

    // JSON mal formado, fecha con formato inválido o un enum desconocido. Si el origen es
    // una ApiException (los @JsonCreator de los enums tiran ApiException), se respeta.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorBody> handleUnreadable(HttpMessageNotReadableException ex) {
        if (ex.getMostSpecificCause() instanceof ApiException api) {
            return handleApi(api);
        }
        return ResponseEntity.badRequest().body(new ErrorBody("Los datos enviados tienen un formato inválido."));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorBody> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest().body(new ErrorBody("Falta un dato obligatorio en la solicitud."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorBody> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        if (ex.getMostSpecificCause() instanceof ApiException api) {
            return handleApi(api);
        }
        return ResponseEntity.badRequest().body(new ErrorBody("Uno de los filtros tiene un valor inválido."));
    }

    // Incluye @RequestAttribute("userId") faltante (no debería pasar detrás del filtro JWT).
    @ExceptionHandler(ServletRequestBindingException.class)
    public ResponseEntity<ErrorBody> handleBinding(ServletRequestBindingException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorBody("Tu sesión expiró. Volvé a ingresar."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorBody> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorBody("No encontramos lo que buscabas."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorBody> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(new ErrorBody("Operación no permitida."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(413)
                .body(new ErrorBody("La imagen es demasiado grande (máximo 10 MB). Probá con otra."));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorBody> handleMultipart(MultipartException ex) {
        return ResponseEntity.badRequest().body(new ErrorBody("No pudimos leer la imagen enviada. Probá con otra."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex) {
        log.error("Error inesperado", ex);
        return ResponseEntity.internalServerError()
                .body(new ErrorBody("Ocurrió un error en el servidor. Intentá de nuevo en unos minutos."));
    }
}
