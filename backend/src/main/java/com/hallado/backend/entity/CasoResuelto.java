package com.hallado.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "casos_resueltos")
public class CasoResuelto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "publicacion_id", nullable = false)
    private Publicacion publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamo_id")
    private Reclamo reclamo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "devolvedor_id", nullable = false)
    private User devolvedor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recuperador_id", nullable = false)
    private User recuperador;

    @Column(nullable = false)
    private Instant fechaResolucion;

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

    public Reclamo getReclamo() {
        return reclamo;
    }

    public void setReclamo(Reclamo reclamo) {
        this.reclamo = reclamo;
    }

    public User getDevolvedor() {
        return devolvedor;
    }

    public void setDevolvedor(User devolvedor) {
        this.devolvedor = devolvedor;
    }

    public User getRecuperador() {
        return recuperador;
    }

    public void setRecuperador(User recuperador) {
        this.recuperador = recuperador;
    }

    public Instant getFechaResolucion() {
        return fechaResolucion;
    }

    public void setFechaResolucion(Instant fechaResolucion) {
        this.fechaResolucion = fechaResolucion;
    }
}

