package com.hallado.backend.service;

import com.hallado.backend.dto.response.PublicacionResumenResponse;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.Seguimiento;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.SeguimientoRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// "Seguir" desde el detalle (Punto 4). El listado ("Seguidas") lo arma el Punto 9.
@Service
public class SeguimientoService {

    private final SeguimientoRepository seguimientoRepository;
    private final PublicacionRepository publicacionRepository;
    private final PublicacionMapper publicacionMapper;
    private final UserRepository userRepository;

    public SeguimientoService(
            SeguimientoRepository seguimientoRepository,
            PublicacionRepository publicacionRepository,
            PublicacionMapper publicacionMapper,
            UserRepository userRepository) {
        this.seguimientoRepository = seguimientoRepository;
        this.publicacionRepository = publicacionRepository;
        this.publicacionMapper = publicacionMapper;
        this.userRepository = userRepository;
    }

    // Idempotente por constraint única (usuario_id, publicacion_id): si ya la seguía
    // devuelve 409, que el cliente trata como éxito (sección 3 del plan).
    public void seguir(String userId, String publicacionId) {
        if (seguimientoRepository.existsByUsuarioIdAndPublicacionId(userId, publicacionId)) {
            throw new ConflictException("Ya seguías esta publicación.");
        }
        Publicacion publicacion = publicacionRepository.findById(publicacionId).orElseThrow(NotFoundException::new);
        User usuario = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);

        Seguimiento seguimiento = new Seguimiento();
        seguimiento.setUsuario(usuario);
        seguimiento.setPublicacion(publicacion);
        seguimiento.setCreadaEn(Instant.now());
        seguimientoRepository.save(seguimiento);
    }

    @Transactional
    public void dejarDeSeguir(String userId, String publicacionId) {
        seguimientoRepository.deleteByUsuarioIdAndPublicacionId(userId, publicacionId);
    }

    public List<PublicacionResumenResponse> listar(String userId) {
        return seguimientoRepository.findByUsuarioIdOrderByCreadaEnDesc(userId).stream()
                .map(s -> publicacionMapper.toResumen(s.getPublicacion()))
                .toList();
    }
}
