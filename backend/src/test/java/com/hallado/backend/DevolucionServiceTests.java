package com.hallado.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.hallado.backend.dto.response.ConfirmarDevolucionResponse;
import com.hallado.backend.dto.request.CrearReclamoRequest;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.CasoResuelto;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.EstadoReclamo;
import com.hallado.backend.entity.FranjaHoraria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.Reclamo;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.TipoReclamo;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.ConflictException;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.CasoResueltoRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.ReclamoRepository;
import com.hallado.backend.repository.UserRepository;
import com.hallado.backend.service.DevolucionService;
import com.hallado.backend.service.ReclamoService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
class DevolucionServiceTests {

    @Autowired
    private DevolucionService devolucionService;

    @Autowired
    private ReclamoService reclamoService;

    @Autowired
    private BarrioRepository barrioRepository;

    @Autowired
    private CasoResueltoRepository casoResueltoRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private ReclamoRepository reclamoRepository;

    @Autowired
    private UserRepository userRepository;

    private String publicadorId;
    private String autorId;
    private String otroAutorId;
    private String publicacionId;
    private String reclamoId;
    private String otroReclamoId;

    @BeforeEach
    void crearReclamoAceptado() {
        String suffix = UUID.randomUUID().toString();
        publicadorId = "devolucion-publicador-" + suffix;
        autorId = "devolucion-autor-" + suffix;
        User publicador = crearUsuario(publicadorId, "devolucion-publicador-" + suffix + "@test.local");
        User autor = crearUsuario(autorId, "devolucion-autor-" + suffix + "@test.local");
        Barrio barrio = barrioRepository.findById("b1").orElseThrow();

        Publicacion publicacion = new Publicacion();
        publicacion.setTipo(TipoPublicacion.ENCONTRADO);
        publicacion.setTitulo("Objeto para devolución");
        publicacion.setDescripcion("Prueba de confirmación por QR.");
        publicacion.setCategoria(Categoria.OTROS);
        publicacion.setFechaSuceso(Instant.now());
        publicacion.setFranjaHoraria(FranjaHoraria.TARDE);
        publicacion.setBarrio(barrio);
        publicacion.setLat(-34.5875);
        publicacion.setLng(-58.4205);
        publicacion.setEstado(EstadoPublicacion.EN_RECLAMO);
        publicacion.setPublicador(publicador);
        publicacion.setCreadaEn(Instant.now());
        publicacionId = publicacionRepository.save(publicacion).getId();

        Reclamo reclamo = new Reclamo();
        reclamo.setPublicacion(publicacion);
        reclamo.setAutor(autor);
        reclamo.setTipo(TipoReclamo.ES_MIO);
        reclamo.setEstado(EstadoReclamo.ACEPTADO);
        reclamo.setCreadaEn(Instant.now());
        reclamoId = reclamoRepository.save(reclamo).getId();
    }

    @AfterEach
    void limpiarFixture() {
        if (reclamoId == null) return;
        casoResueltoRepository.findFirstByReclamoId(reclamoId).ifPresent(casoResueltoRepository::delete);
        if (otroReclamoId != null) reclamoRepository.deleteById(otroReclamoId);
        reclamoRepository.deleteById(reclamoId);
        publicacionRepository.deleteById(publicacionId);
        userRepository.deleteById(publicadorId);
        userRepository.deleteById(autorId);
        if (otroAutorId != null) userRepository.deleteById(otroAutorId);
    }

    @Test
    @Transactional
    void soloQuienRecuperaPuedeConfirmarYSeRegistraLaEntrega() {
        ConfirmarDevolucionResponse response =
                devolucionService.confirmar(autorId, publicacionId, reclamoId);

        assertEquals(EstadoPublicacion.RESUELTA, response.estado());
        assertEquals(publicacionId, response.publicacionId());
        assertEquals(autorId, casoResueltoRepository.findFirstByReclamoId(reclamoId)
                .orElseThrow()
                .getRecuperador()
                .getId());
        assertEquals(publicadorId, casoResueltoRepository.findFirstByReclamoId(reclamoId)
                .orElseThrow()
                .getDevolvedor()
                .getId());
    }

    @Test
    @Transactional
    void quienDevuelveNoPuedeConfirmarLaRecepcion() {
        ApiException error = assertThrows(
                ApiException.class,
                () -> devolucionService.confirmar(publicadorId, publicacionId, reclamoId));

        assertEquals(403, error.getStatus().value());
    }

    @Test
    @Transactional
    void noSePuedeConfirmarUnReclamoNoAceptado() {
        Reclamo reclamo = reclamoRepository.findById(reclamoId).orElseThrow();
        reclamo.setEstado(EstadoReclamo.PENDIENTE);
        reclamoRepository.save(reclamo);

        assertThrows(ConflictException.class,
                () -> devolucionService.confirmar(autorId, publicacionId, reclamoId));
    }

    @Test
    @Transactional
    void unaSegundaConfirmacionNoDuplicaElCasoResuelto() {
        devolucionService.confirmar(autorId, publicacionId, reclamoId);

        assertThrows(ConflictException.class,
                () -> devolucionService.confirmar(autorId, publicacionId, reclamoId));
        assertEquals(1, casoResueltoRepository.findFirstByReclamoId(reclamoId).stream().count());
    }

    @Test
    @Transactional
    void soloSeAceptaElIdentificadorDeLaPublicacionDelReclamo() {
        assertThrows(ApiException.class,
                () -> devolucionService.confirmar(autorId, "otra-publicacion", reclamoId));
    }

    @Test
    @Transactional
    void enUnReclamoLoEncontreElPublicadorEsQuienRecupera() {
        Publicacion publicacion = publicacionRepository.findById(publicacionId).orElseThrow();
        publicacion.setTipo(TipoPublicacion.PERDIDO);
        publicacionRepository.save(publicacion);
        Reclamo reclamo = reclamoRepository.findById(reclamoId).orElseThrow();
        reclamo.setTipo(TipoReclamo.LO_ENCONTRE);
        reclamoRepository.save(reclamo);

        devolucionService.confirmar(publicadorId, publicacionId, reclamoId);

        CasoResuelto caso = casoResueltoRepository.findFirstByReclamoId(reclamoId).orElseThrow();
        assertEquals(publicadorId, caso.getRecuperador().getId());
        assertEquals(autorId, caso.getDevolvedor().getId());
    }

    @Test
    @Transactional
    void cerrarEntregaRechazaLosOtrosReclamosActivosDeLaPublicacion() {
        otroAutorId = "devolucion-otro-autor-" + UUID.randomUUID();
        User otroAutor = crearUsuario(otroAutorId, otroAutorId + "@test.local");
        Publicacion publicacion = publicacionRepository.findById(publicacionId).orElseThrow();
        Reclamo otroReclamo = new Reclamo();
        otroReclamo.setPublicacion(publicacion);
        otroReclamo.setAutor(otroAutor);
        otroReclamo.setTipo(TipoReclamo.ES_MIO);
        otroReclamo.setCreadaEn(Instant.now());
        otroReclamoId = reclamoRepository.save(otroReclamo).getId();

        devolucionService.confirmar(autorId, publicacionId, reclamoId);

        assertEquals(EstadoReclamo.RECHAZADO,
                reclamoRepository.findById(otroReclamoId).orElseThrow().getEstado());
    }

    @Test
    @Transactional
    void noSeAdmitenNuevosReclamosMientrasHayUnaEntregaPendiente() {
        assertThrows(ConflictException.class, () -> reclamoService.crear(
                "nuevo-usuario",
                publicacionId,
                new CrearReclamoRequest("es_mio", "respuesta", null, null, null)));
    }

    private User crearUsuario(String id, String email) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPasswordHash("test");
        user.setName("Usuario de prueba");
        user.setMemberSince(Instant.now());
        return userRepository.save(user);
    }
}
