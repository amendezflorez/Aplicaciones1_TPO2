package com.hallado.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hallado.backend.dto.request.ProponerEncuentroRequest;
import com.hallado.backend.dto.response.EncuentroResponse;
import com.hallado.backend.dto.response.EstadoEncuentro;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EncuentroPropuesta;
import com.hallado.backend.entity.EstadoPropuestaEncuentro;
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
import com.hallado.backend.repository.EncuentroPropuestaRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.ReclamoRepository;
import com.hallado.backend.repository.UserRepository;
import com.hallado.backend.service.EncuentroService;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class EncuentroServiceTests {

    @Autowired
    private EncuentroService encuentroService;

    @Autowired
    private BarrioRepository barrioRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private ReclamoRepository reclamoRepository;

    @Autowired
    private EncuentroPropuestaRepository encuentroPropuestaRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private String publicadorId;
    private String autorId;
    private String reclamoId;
    private String publicacionId;

    @BeforeEach
    void crearReclamoAceptado() {
        String suffix = UUID.randomUUID().toString();
        publicadorId = "encuentro-publicador-" + suffix;
        autorId = "encuentro-autor-" + suffix;
        User publicador = crearUsuario(publicadorId, "publicador-" + suffix + "@test.local");
        User autor = crearUsuario(autorId, "autor-" + suffix + "@test.local");
        Barrio barrio = barrioRepository.findById("b1").orElseThrow();

        Publicacion publicacion = new Publicacion();
        publicacion.setTipo(TipoPublicacion.ENCONTRADO);
        publicacion.setTitulo("Publicación de prueba");
        publicacion.setDescripcion("Prueba de coordinación.");
        publicacion.setCategoria(Categoria.OTROS);
        publicacion.setFechaSuceso(Instant.now());
        publicacion.setFranjaHoraria(FranjaHoraria.TARDE);
        publicacion.setBarrio(barrio);
        publicacion.setLat(-34.5875);
        publicacion.setLng(-58.4205);
        publicacion.setEstado(EstadoPublicacion.RESUELTA);
        publicacion.setPublicador(publicador);
        publicacion.setCreadaEn(Instant.now());
        publicacion = publicacionRepository.save(publicacion);
        publicacionId = publicacion.getId();

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
        encuentroPropuestaRepository.deleteAll(
                encuentroPropuestaRepository.findByReclamoIdOrderByCreadaEnAscIdAsc(reclamoId));
        reclamoRepository.deleteById(reclamoId);
        publicacionRepository.deleteById(publicacionId);
        userRepository.deleteById(publicadorId);
        userRepository.deleteById(autorId);
    }

    @Test
    @Transactional
    void contrapropuestaReemplazaLaVigenteYLaOtraPartePuedeAceptar() {
        EncuentroResponse primera = encuentroService.proponer(
                publicadorId, reclamoId, new ProponerEncuentroRequest("Plaza central", null, null, null));
        String primeraId = primera.propuestaActual().id();

        EncuentroResponse segunda = encuentroService.proponer(
                autorId, reclamoId, new ProponerEncuentroRequest("Biblioteca pública", "Entrada principal", null, null));
        assertEquals(EstadoPropuestaEncuentro.REEMPLAZADO, segunda.historial().get(0).estado());
        assertEquals(EstadoEncuentro.PENDIENTE, segunda.estado());

        EncuentroResponse acordado =
                encuentroService.aceptar(publicadorId, reclamoId, segunda.propuestaActual().id());
        assertEquals(EstadoEncuentro.ACORDADO, acordado.estado());
        assertEquals(segunda.propuestaActual().id(), acordado.ubicacionAcordada().id());
        assertEquals(EstadoPropuestaEncuentro.ACEPTADO, acordado.historial().get(1).estado());
        assertThrows(ApiException.class, () -> encuentroService.aceptar(autorId, reclamoId, primeraId));
    }

    @Test
    @Transactional
    void soloLasPartesPuedenConsultarElEncuentro() {
        ApiException error = assertThrows(
                ApiException.class, () -> encuentroService.obtener("usuario-ajeno", reclamoId));

        assertEquals(403, error.getStatus().value());
    }

    @Test
    @Transactional
    void elReclamoDebeEstarAceptadoAntesDeProponer() {
        Reclamo reclamo = reclamoRepository.findById(reclamoId).orElseThrow();
        reclamo.setEstado(EstadoReclamo.PENDIENTE);
        reclamoRepository.save(reclamo);

        assertThrows(ConflictException.class, () -> encuentroService.proponer(
                publicadorId, reclamoId, new ProponerEncuentroRequest("Plaza central", null, null, null)));
    }

    @Test
    @Transactional
    void soloQuienTieneElObjetoPuedeEnviarLaPropuestaInicial() {
        ApiException error = assertThrows(ApiException.class, () -> encuentroService.proponer(
                autorId, reclamoId, new ProponerEncuentroRequest("Plaza central", null, null, null)));

        assertEquals(403, error.getStatus().value());
    }

    @Test
    @Transactional
    void unaPersonaNoPuedeAceptarSuPropiaPropuesta() {
        EncuentroResponse propuesta = encuentroService.proponer(
                publicadorId, reclamoId, new ProponerEncuentroRequest("Plaza central", null, null, null));

        ApiException error = assertThrows(
                ApiException.class,
                () -> encuentroService.aceptar(publicadorId, reclamoId, propuesta.propuestaActual().id()));

        assertEquals(403, error.getStatus().value());
    }

    @Test
    void aceptarYContraofertarEnParaleloNoPuedenConfirmarAmbasTransiciones() throws Exception {
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        EncuentroResponse inicial = transactions.execute(status -> encuentroService.proponer(
                publicadorId, reclamoId, new ProponerEncuentroRequest("Plaza central", null, null, null)));
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch iniciar = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Boolean> aceptar = executor.submit(() -> {
                listos.countDown();
                if (!iniciar.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timeout de sincronización");
                try {
                    transactions.execute(status ->
                            encuentroService.aceptar(autorId, reclamoId, inicial.propuestaActual().id()));
                    return true;
                } catch (ConflictException ex) {
                    return false;
                }
            });
            Future<Boolean> contraofertar = executor.submit(() -> {
                listos.countDown();
                if (!iniciar.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timeout de sincronización");
                try {
                    transactions.execute(status -> encuentroService.proponer(
                            autorId,
                            reclamoId,
                            new ProponerEncuentroRequest("Biblioteca pública", null, null, null)));
                    return true;
                } catch (ConflictException ex) {
                    return false;
                }
            });

            assertTrue(listos.await(5, TimeUnit.SECONDS));
            iniciar.countDown();
            boolean aceptada = aceptar.get(10, TimeUnit.SECONDS);
            boolean contraofertaCreada = contraofertar.get(10, TimeUnit.SECONDS);
            assertNotEquals(aceptada, contraofertaCreada);

            EncuentroResponse finalizado = encuentroService.obtener(autorId, reclamoId);
            assertEquals(
                    aceptada ? EstadoEncuentro.ACORDADO : EstadoEncuentro.PENDIENTE,
                    finalizado.estado());
        } finally {
            iniciar.countDown();
            executor.shutdownNow();
        }
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
