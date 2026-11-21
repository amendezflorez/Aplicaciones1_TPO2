package com.hallado.backend.service;

import com.hallado.backend.dto.response.BandejaNotificacionesResponse;
import com.hallado.backend.dto.response.NotificacionResponse;
import com.hallado.backend.entity.DispositivoPush;
import com.hallado.backend.entity.Notificacion;
import com.hallado.backend.entity.TipoNotificacion;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.DispositivoPushRepository;
import com.hallado.backend.repository.NotificacionRepository;
import com.hallado.backend.repository.UserRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Punto 12 (Notificaciones push). Un solo punto de entrada, notificar(...), que usan
// ReclamoService, EncuentroService y DevolucionService: guarda la notificación para la
// bandeja y publica el evento que dispara el push (ver ExpoPushSender).
@Service
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final DispositivoPushRepository dispositivoRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificacionService(
            NotificacionRepository notificacionRepository,
            DispositivoPushRepository dispositivoRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher) {
        this.notificacionRepository = notificacionRepository;
        this.dispositivoRepository = dispositivoRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    // Se llama dentro de la transacción de la acción de negocio (crear reclamo, aceptar,
    // proponer encuentro...): si esa acción hace rollback, la notificación tampoco queda.
    @Transactional
    public void notificar(
            User destinatario,
            TipoNotificacion tipo,
            String titulo,
            String cuerpo,
            String reclamoId,
            String publicacionId) {
        Notificacion n = new Notificacion();
        n.setUsuario(destinatario);
        n.setTipo(tipo);
        n.setTitulo(recortar(titulo, 140));
        n.setCuerpo(recortar(cuerpo, 400));
        n.setReclamoId(reclamoId);
        n.setPublicacionId(publicacionId);
        n.setCreadaEn(Instant.now());
        notificacionRepository.save(n);

        Map<String, String> data = new HashMap<>();
        data.put("notificacionId", n.getId());
        data.put("tipo", tipo.toJson());
        if (reclamoId != null) data.put("reclamoId", reclamoId);
        if (publicacionId != null) data.put("publicacionId", publicacionId);
        eventPublisher.publishEvent(
                new NotificacionCreadaEvent(destinatario.getId(), n.getTitulo(), n.getCuerpo(), data));
    }

    @Transactional(readOnly = true)
    public BandejaNotificacionesResponse bandeja(String userId) {
        return new BandejaNotificacionesResponse(
                notificacionRepository.findTop100ByUsuarioIdOrderByCreadaEnDesc(userId).stream()
                        .map(NotificacionResponse::of)
                        .toList(),
                notificacionRepository.countByUsuarioIdAndLeidaFalse(userId));
    }

    @Transactional(readOnly = true)
    public long noLeidas(String userId) {
        return notificacionRepository.countByUsuarioIdAndLeidaFalse(userId);
    }

    @Transactional
    public NotificacionResponse marcarLeida(String userId, String notificacionId) {
        Notificacion n = notificacionRepository.findByIdAndUsuarioId(notificacionId, userId)
                .orElseThrow(NotFoundException::new);
        n.setLeida(true);
        return NotificacionResponse.of(notificacionRepository.save(n));
    }

    @Transactional
    public void marcarTodasLeidas(String userId) {
        notificacionRepository.marcarTodasLeidas(userId);
    }

    @Transactional
    public void registrarDispositivo(String userId, String token) {
        String limpio = token == null ? "" : token.trim();
        if (!limpio.startsWith("ExponentPushToken[") && !limpio.startsWith("ExpoPushToken[")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El identificador del dispositivo no es válido.");
        }
        User usuario = userRepository.findById(userId).orElseThrow(UnauthorizedException::new);
        DispositivoPush dispositivo = dispositivoRepository.findByToken(limpio).orElseGet(DispositivoPush::new);
        dispositivo.setToken(limpio);
        dispositivo.setUsuario(usuario);
        dispositivo.setActualizadoEn(Instant.now());
        dispositivoRepository.save(dispositivo);
    }

    // Al cerrar sesión: ese celular deja de recibir avisos de esta cuenta.
    @Transactional
    public void darDeBajaDispositivo(String userId, String token) {
        if (token == null) return;
        dispositivoRepository.findByToken(token.trim())
                .filter(d -> d.getUsuario().getId().equals(userId))
                .ifPresent(dispositivoRepository::delete);
    }

    private static String recortar(String texto, int max) {
        if (texto == null) return "";
        return texto.length() <= max ? texto : texto.substring(0, max - 1) + "…";
    }
}
