package com.hallado.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// No usamos Spring Security (no se vio en clase): este filtro simple exige un Bearer
// válido en todo lo que no sea /auth/*, /barrios o /uploads/** (coincide con el mock:
// mockAdapter.js solo deja pasar sin token las rutas de autenticación y /barrios).
// El id del usuario autenticado queda en el request attribute "userId" para los
// controllers (@RequestAttribute).
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final List<String> PUBLIC_PREFIXES = List.of("/auth/", "/barrios", "/uploads/", "/h2-console");

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String token = (header != null && header.startsWith("Bearer "))
                ? header.substring("Bearer ".length())
                : null;
        Optional<String> userId = token != null ? jwtService.parseUserId(token) : Optional.empty();

        if (userId.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"No autorizado.\"}");
            return;
        }

        request.setAttribute("userId", userId.get());
        chain.doFilter(request, response);
    }
}
