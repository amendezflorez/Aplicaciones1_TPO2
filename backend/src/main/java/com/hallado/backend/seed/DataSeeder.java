package com.hallado.backend.seed;

import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.Categoria;
import com.hallado.backend.entity.EstadoPublicacion;
import com.hallado.backend.entity.FotoPublicacion;
import com.hallado.backend.entity.FranjaHoraria;
import com.hallado.backend.entity.Publicacion;
import com.hallado.backend.entity.TipoPublicacion;
import com.hallado.backend.entity.User;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.FotoPublicacionRepository;
import com.hallado.backend.repository.PublicacionRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Mismos barrios y usuarios demo que services/mock/mockAdapter.js, para que el equipo
// pueda seguir usando demo@hallado.com / Demo1234 al pasar de USE_MOCK a este backend.
// Solo siembra si las tablas están vacías (no pisa datos en reinicios).
@Component
public class DataSeeder implements CommandLineRunner {

    private final BarrioRepository barrioRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicacionRepository publicacionRepository;
    private final FotoPublicacionRepository fotoPublicacionRepository;

    public DataSeeder(
            BarrioRepository barrioRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PublicacionRepository publicacionRepository,
            FotoPublicacionRepository fotoPublicacionRepository) {
        this.barrioRepository = barrioRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.publicacionRepository = publicacionRepository;
        this.fotoPublicacionRepository = fotoPublicacionRepository;
    }

    // Centro aproximado de cada barrio (Punto 5, sección 10.x del plan 5/6): mismas
    // coordenadas que ya usaba seedPublicaciones para sus publicaciones de prueba en cada
    // barrio, reusadas acá para no inventar números nuevos. Es el respaldo que usa
    // PublicacionService.crear cuando el alta de una publicación solo trae la dirección
    // escrita, sin GPS ni geocoding exitoso del lado del cliente.
    private static final Map<String, double[]> COORDENADAS_BARRIOS = Map.of(
            "b1", new double[] {-34.5875, -58.4205}, // Palermo
            "b2", new double[] {-34.5633, -58.4550}, // Belgrano
            "b3", new double[] {-34.6189, -58.4433}, // Caballito
            "b4", new double[] {-34.5875, -58.3974}, // Recoleta
            "b5", new double[] {-34.5703, -58.4891}, // Villa Urquiza
            "b6", new double[] {-34.6333, -58.4667}, // Flores
            "b7", new double[] {-34.6089, -58.4205}, // Almagro
            "b8", new double[] {-34.6210, -58.3731}); // San Telmo

    @Override
    public void run(String... args) {
        if (barrioRepository.count() == 0) {
            barrioRepository.saveAll(List.of(
                    nuevoBarrio("b1", "Palermo"),
                    nuevoBarrio("b2", "Belgrano"),
                    nuevoBarrio("b3", "Caballito"),
                    nuevoBarrio("b4", "Recoleta"),
                    nuevoBarrio("b5", "Villa Urquiza"),
                    nuevoBarrio("b6", "Flores"),
                    nuevoBarrio("b7", "Almagro"),
                    nuevoBarrio("b8", "San Telmo")));
        } else {
            // Backfill para bases que ya tenían estos 8 barrios sembrados antes de que
            // Barrio tuviera lat/lng (Punto 5): sin esto, quien ya había levantado el
            // backend se quedaba con barrios sin coordenadas y el fallback de
            // PublicacionService.crear fallaba igual que antes del fix. Solo toca filas
            // que todavía tienen lat null.
            List<Barrio> aActualizar = new ArrayList<>();
            for (Barrio barrio : barrioRepository.findAll()) {
                double[] coords = COORDENADAS_BARRIOS.get(barrio.getId());
                if (coords != null && barrio.getLat() == null) {
                    barrio.setLat(coords[0]);
                    barrio.setLng(coords[1]);
                    aActualizar.add(barrio);
                }
            }
            if (!aActualizar.isEmpty()) {
                barrioRepository.saveAll(aActualizar);
            }
        }

        if (userRepository.count() == 0) {
            Barrio palermo = barrioRepository.findById("b1").orElseThrow();
            Barrio belgrano = barrioRepository.findById("b2").orElseThrow();

            User demo = new User();
            demo.setId("u-demo");
            demo.setEmail("demo@hallado.com");
            demo.setPasswordHash(passwordEncoder.encode("Demo1234"));
            demo.setName("Demo Vecino");
            demo.setBarrio(palermo);
            demo.setPhone("1155550000");
            demo.setPhoneVisible(false);
            demo.setMemberSince(Instant.parse("2025-03-10T00:00:00Z"));
            demo.setReturnsCount(5);
            demo.setPositiveCount(7);
            demo.setNegativeCount(1);
            demo.setScore(6);

            User ana = new User();
            ana.setId("u-2");
            ana.setEmail("ana@hallado.com");
            ana.setPasswordHash(passwordEncoder.encode("Ana12345"));
            ana.setName("Ana Gómez");
            ana.setBarrio(belgrano);
            ana.setPhone("1155551111");
            ana.setPhoneVisible(true);
            ana.setMemberSince(Instant.parse("2026-01-20T00:00:00Z"));
            ana.setReturnsCount(2);
            ana.setPositiveCount(2);
            ana.setNegativeCount(0);
            ana.setScore(2);

            userRepository.saveAll(List.of(demo, ana));
        }

        if (publicacionRepository.count() == 0) {
            seedPublicaciones();
        }
    }

    // Puntos 3/4: 12 publicaciones de prueba (mitad perdido/mitad encontrado, variadas en
    // categoría/barrio/fecha) para poder probar el buscador con resultados reales desde el
    // primer día (sección 4.5 del plan). Las "encontrado" traen preguntaVerificacion +
    // respuestaVerificacion sembradas a mano porque el Punto 5 (alta de publicación,
    // que es quien normalmente las pediría al publicar) todavía no existe — ver nota en
    // la sección 4.4 del plan.
    private void seedPublicaciones() {
        User demo = userRepository.findById("u-demo").orElseThrow();
        User ana = userRepository.findById("u-2").orElseThrow();
        Barrio palermo = barrioRepository.findById("b1").orElseThrow();
        Barrio belgrano = barrioRepository.findById("b2").orElseThrow();
        Barrio caballito = barrioRepository.findById("b3").orElseThrow();
        Barrio recoleta = barrioRepository.findById("b4").orElseThrow();
        Barrio villaUrquiza = barrioRepository.findById("b5").orElseThrow();
        Barrio flores = barrioRepository.findById("b6").orElseThrow();
        Barrio almagro = barrioRepository.findById("b7").orElseThrow();
        Barrio sanTelmo = barrioRepository.findById("b8").orElseThrow();

        Instant ahora = Instant.now();
        List<Publicacion> publicaciones = new ArrayList<>();

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Llavero encontrado cerca de Plaza Serrano", Categoria.LLAVES, palermo,
                -34.5875, -58.4205, ahora.minus(Duration.ofHours(20)), FranjaHoraria.TARDE, ana,
                "¿Cuántas llaves tiene el llavero y de qué color es?", "3 llaves y un llavero de cuero marrón"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Perdí mi DNI y tarjeta SUBE", Categoria.DOCUMENTOS, belgrano,
                -34.5633, -58.4550, ahora.minus(Duration.ofDays(2)), FranjaHoraria.MANANA, demo, null, null));

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Encontré un gato atigrado sin collar", Categoria.MASCOTAS, caballito,
                -34.6189, -58.4433, ahora.minus(Duration.ofHours(6)), FranjaHoraria.TARDE, demo,
                "¿Tiene alguna mancha distintiva? ¿De qué color son sus ojos?", "Mancha blanca en el pecho, ojos verdes"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Se escapó mi perro caniche", Categoria.MASCOTAS, recoleta,
                -34.5875, -58.3974, ahora.minus(Duration.ofDays(3)), FranjaHoraria.NOCHE, ana, null, null));

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Encontré un celular Samsung en el subte línea D", Categoria.ELECTRONICA,
                villaUrquiza, -34.5703, -58.4891, ahora.minus(Duration.ofDays(4)), FranjaHoraria.MANANA, demo,
                "¿De qué color es la funda y qué fondo de pantalla tiene?",
                "Funda negra, fondo de pantalla un paisaje de montaña"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Perdí una campera de jean en Parque Centenario", Categoria.ROPA, caballito,
                -34.6160, -58.4360, ahora.minus(Duration.ofDays(5)), FranjaHoraria.TARDE, ana, null, null));

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Encontré una billetera con documentos", Categoria.DOCUMENTOS, almagro,
                -34.6089, -58.4205, ahora.minus(Duration.ofDays(6)), FranjaHoraria.TARDE, demo,
                "¿Qué marca es la billetera y cuánto dinero tenía aproximadamente?",
                "Billetera de cuero negra marca Prune, sin dinero"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Perdí mis auriculares inalámbricos", Categoria.ELECTRONICA, sanTelmo,
                -34.6210, -58.3731, ahora.minus(Duration.ofDays(8)), FranjaHoraria.NOCHE, ana, null, null));

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Encontré una bufanda tejida a mano", Categoria.ROPA, flores,
                -34.6333, -58.4667, ahora.minus(Duration.ofDays(10)), FranjaHoraria.MANANA, demo,
                "¿De qué colores es la bufanda?", "Rayas gris y bordó"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Perdí las llaves del auto con un llavero de Boca", Categoria.LLAVES,
                sanTelmo, -34.6225, -58.3715, ahora.minus(Duration.ofDays(12)), FranjaHoraria.TARDE, ana, null, null));

        publicaciones.add(nueva(
                TipoPublicacion.ENCONTRADO, "Encontré un loro suelto en una plaza", Categoria.MASCOTAS, palermo,
                -34.5850, -58.4230, ahora.minus(Duration.ofDays(15)), FranjaHoraria.MANANA, demo,
                "¿Qué frases repite el loro?", "Dice 'hola' y silba"));

        publicaciones.add(nueva(
                TipoPublicacion.PERDIDO, "Perdí una mochila con útiles de la facultad", Categoria.OTROS, recoleta,
                -34.5890, -58.3950, ahora.minus(Duration.ofDays(20)), FranjaHoraria.TARDE, ana, null, null));

        publicacionRepository.saveAll(publicaciones);

        for (int i = 0; i < publicaciones.size(); i++) {
            FotoPublicacion foto = new FotoPublicacion();
            foto.setPublicacion(publicaciones.get(i));
            foto.setUrl("https://picsum.photos/seed/hallado-pub-" + (i + 1) + "/800/600");
            foto.setOrden(0);
            fotoPublicacionRepository.save(foto);
        }
    }

    private Barrio nuevoBarrio(String id, String name) {
        double[] coords = COORDENADAS_BARRIOS.get(id);
        return new Barrio(id, name, coords[0], coords[1]);
    }

    private Publicacion nueva(
            TipoPublicacion tipo,
            String titulo,
            Categoria categoria,
            Barrio barrio,
            double lat,
            double lng,
            Instant fechaSuceso,
            FranjaHoraria franjaHoraria,
            User publicador,
            String preguntaVerificacion,
            String respuestaVerificacion) {
        Publicacion p = new Publicacion();
        p.setTipo(tipo);
        p.setTitulo(titulo);
        p.setDescripcion(
                "Publicación de prueba (seed) para probar el buscador y el detalle de los Puntos 3 y 4.");
        p.setCategoria(categoria);
        p.setFechaSuceso(fechaSuceso);
        p.setFranjaHoraria(franjaHoraria);
        p.setBarrio(barrio);
        p.setLat(lat);
        p.setLng(lng);
        // Ubicación/dirección "exacta": mismo entorno, con un pequeño offset, gateada en
        // el detalle (solo reclamo aceptado o publicación propia).
        p.setLatExacta(lat + 0.0015);
        p.setLngExacta(lng + 0.0015);
        p.setDireccionExacta("Dirección exacta reservada (a metros de " + barrio.getName() + ")");
        p.setEstado(EstadoPublicacion.ABIERTA);
        p.setPublicador(publicador);
        p.setPreguntaVerificacion(preguntaVerificacion);
        p.setRespuestaVerificacion(respuestaVerificacion);
        Instant creadaEn = fechaSuceso.plus(Duration.ofHours(1));
        p.setCreadaEn(creadaEn);
        p.setVenceEn(creadaEn.plus(Duration.ofDays(30)));
        return p;
    }
}
