package com.hallado.backend.dto.response;

import java.util.List;

// { data, page, size, total } — forma genérica de paginado usada por GET /publicaciones
// (sección 3 del plan). "total" es el total de resultados que matchean el filtro, no el
// tamaño de "data".
public record PageResponse<T>(List<T> data, int page, int size, long total) {
}
