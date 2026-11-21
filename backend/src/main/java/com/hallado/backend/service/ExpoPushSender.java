package com.hallado.backend.service;

import com.hallado.backend.entity.DispositivoPush;
import com.hallado.backend.repository.DispositivoPushRepository;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;

// Punto 12: envía los push a través del servicio de Expo (https://docs.expo.dev/push-notifications/sending-notifications/).
// Expo se encarga de hablar con FCM (Android), así que el backend no necesita credenciales
// de Firebase: solo los tokens "ExponentPushToken[...]" que registra la app.
//
// - @TransactionalEventListener(AFTER_COMMIT): se envía solo si la acción se guardó.
// - @Async: no demora la respuesta HTTP de la acción que generó la notificación.
// - Cualquier error se loguea y se ignora: la notificación ya está en la bandeja.
// - Tokens que Expo informa como "DeviceNotRegistered" (app desinstalada) se borran.
@Component
public class ExpoPushSender {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushSender.class);

    private final DispositivoPushRepository dispositivoRepository;
    private final RestClient restClient;
    private final boolean habilitado;

    public ExpoPushSender(
            DispositivoPushRepository dispositivoRepository,
            @Value("${app.push.enabled:true}") boolean habilitado,
            @Value("${app.push.expo-url:https://exp.host/--/api/v2/push/send}") String expoUrl) {
        this.dispositivoRepository = dispositivoRepository;
        this.habilitado = habilitado;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().baseUrl(expoUrl).requestFactory(factory).build();
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificacionCreada(NotificacionCreadaEvent event) {
        if (!habilitado) return;
        try {
            List<DispositivoPush> dispositivos = dispositivoRepository.findByUsuarioId(event.usuarioId());
            if (dispositivos.isEmpty()) return;

            List<Map<String, Object>> mensajes = new ArrayList<>();
            for (DispositivoPush d : dispositivos) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("to", d.getToken());
                m.put("title", event.titulo());
                m.put("body", event.cuerpo());
                m.put("data", event.data());
                m.put("sound", "default");
                m.put("priority", "high");
                m.put("channelId", "default");
                mensajes.add(m);
            }

            Map<?, ?> respuesta = restClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(mensajes)
                    .retrieve()
                    .body(Map.class);
            limpiarTokensInvalidos(dispositivos, respuesta);
        } catch (Exception e) {
            log.warn("No se pudo enviar el push de Expo: {}", e.getMessage());
        }
    }

    // Expo responde { data: [ { status: "ok" | "error", details: { error: "DeviceNotRegistered" } } ] }
    // en el mismo orden que los mensajes enviados.
    private void limpiarTokensInvalidos(List<DispositivoPush> dispositivos, Map<?, ?> respuesta) {
        if (respuesta == null || !(respuesta.get("data") instanceof List<?> tickets)) return;
        for (int i = 0; i < tickets.size() && i < dispositivos.size(); i++) {
            if (tickets.get(i) instanceof Map<?, ?> ticket
                    && "error".equals(ticket.get("status"))
                    && ticket.get("details") instanceof Map<?, ?> details
                    && "DeviceNotRegistered".equals(details.get("error"))) {
                dispositivoRepository.deleteByToken(dispositivos.get(i).getToken());
            }
        }
    }
}
