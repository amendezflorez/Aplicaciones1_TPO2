package com.hallado.backend.dto.response;

import java.time.Instant;

import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.TipoReclamo;

// publicacionFotoUrl: foto principal de la publicación (miniatura en "Mis reclamos").
// contraparteTelefono: teléfono de la otra parte, SOLO si el reclamo está aceptado y esa
// persona eligió que su teléfono sea visible (Punto 2); si no, null.
public record ReclamoBandejaResponse(
        String id,
        String publicacionId,
        String publicacionTitulo,
        String publicadorId,
        String publicadorNombre,
        String publicadorFotoUrl,
        String autorId,
        String autorNombre,
        String autorFotoUrl,
        TipoReclamo tipo,
        String respuestaPregunta,
        String descripcion,
        String fotoUrl,
        BarrioResponse barrioEncontrado,
        EstadoReclamo estado,
        Instant creadaEn,
        Instant venceEn,
        EstadoPublicacion publicacionEstado,
        Instant fechaResolucion,
        String publicacionFotoUrl,
        String contraparteTelefono) {
}