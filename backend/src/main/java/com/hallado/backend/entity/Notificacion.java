package com.hallado.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

// Punto 12: cada notificación enviada queda guardada para la bandeja de la app (historial
// con leídas / no leídas). El push es solo el aviso; la fuente de verdad es esta tabla.
// reclamoId/publicacionId son ids sueltos (no relaciones) a propósito: la notificación
// tiene que poder mostrarse aunque el reclamo cambie, y la app los usa para abrir la
// pantalla correspondiente al tocarla.
@Entity
@Table(name = "notificaciones", indexes = @Index(name = "idx_notif_usuario_fecha", columnList = "usuario_id, creada_en"))
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoNotificacion tipo;

    @Column(nullable = false, length = 140)
    private String titulo;

    @Column(nullable = false, length = 400)
    private String cuerpo;

    private String reclamoId;

    private String publicacionId;

    @Column(nullable = false)
    private boolean leida = false;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
    }

    public TipoNotificacion getTipo() {
        return tipo;
    }

    public void setTipo(TipoNotificacion tipo) {
        this.tipo = tipo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getCuerpo() {
        return cuerpo;
    }

    public void setCuerpo(String cuerpo) {
        this.cuerpo = cuerpo;
    }

    public String getReclamoId() {
        return reclamoId;
    }

    public void setReclamoId(String reclamoId) {
        this.reclamoId = reclamoId;
    }

    public String getPublicacionId() {
        return publicacionId;
    }

    public void setPublicacionId(String publicacionId) {
        this.publicacionId = publicacionId;
    }

    public boolean isLeida() {
        return leida;
    }

    public void setLeida(boolean leida) {
        this.leida = leida;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(Instant creadaEn) {
        this.creadaEn = creadaEn;
    }
}
