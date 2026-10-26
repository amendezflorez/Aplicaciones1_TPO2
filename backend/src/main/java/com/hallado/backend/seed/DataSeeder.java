package com.hallado.backend.seed;

import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.User;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
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

    public DataSeeder(
            BarrioRepository barrioRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.barrioRepository = barrioRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (barrioRepository.count() == 0) {
            barrioRepository.saveAll(List.of(
                    new Barrio("b1", "Palermo"),
                    new Barrio("b2", "Belgrano"),
                    new Barrio("b3", "Caballito"),
                    new Barrio("b4", "Recoleta"),
                    new Barrio("b5", "Villa Urquiza"),
                    new Barrio("b6", "Flores"),
                    new Barrio("b7", "Almagro"),
                    new Barrio("b8", "San Telmo")));
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
    }
}
