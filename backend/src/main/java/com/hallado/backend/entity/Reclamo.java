package com.hallado.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

// Solo el alta y la consulta de "mi reclamo" (Punto 7 construye aceptar/rechazar, el
// límite real de 3 intentos y el vencimiento a 48h). "estado" arranca siempre PENDIENTE
// acá; no hay endpoint propio en este plan para cambiarlo.
@Entity
@Table(name = "reclamos")
public class Reclamo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publicacion_id", nullable = false)
    private Publicacion publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id", nullable = false)
    private User autor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoReclamo tipo;

    private String respuestaPregunta;

    @Lob
    private String descripcion;

    private String fotoUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "barrio_encontrado_id")
    private Barrio barrioEncontrado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoReclamo estado = EstadoReclamo.PENDIENTE;

    @Column(nullable = false)
    private Instant creadaEn;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Publicacion getPublicacion() {
        return publicacion;
    }

    public void setPublicacion(Publicacion publicacion) {
        this.publicacion = publicacion;
    }

    public User getAutor() {
        return autor;
    }

    public void setAutor(User autor) {
        this.autor = autor;
    }

    public TipoReclamo getTipo() {
        return tipo;
    }

    public void setTipo(TipoReclamo tipo) {
        this.tipo = tipo;
    }

    public String getRespuestaPregunta() {
        return respuestaPregunta;
    }

    public void setRespuestaPregunta(String respuestaPregunta) {
        this.respuestaPregunta = respuestaPregunta;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public Barrio getBarrioEncontrado() {
        return barrioEncontrado;
    }

    public void setBarrioEncontrado(Barrio barrioEncontrado) {
        this.barrioEncontrado = barrioEncontrado;
    }

    public EstadoReclamo getEstado() {
        return estado;
    }

    public void setEstado(EstadoReclamo estado) {
        this.estado = estado;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(Instant creadaEn) {
        this.creadaEn = creadaEn;
    }
}
