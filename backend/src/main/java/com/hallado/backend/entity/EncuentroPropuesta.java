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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "encuentro_propuestas")
public class EncuentroPropuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamo_id", nullable = false)
    private Reclamo reclamo;

    @Column(nullable = false, length = 180)
    private String direccion;

    @Column(length = 180)
    private String referencia;

    private Double latitud;

    private Double longitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesto_por_id", nullable = false)
    private User propuestoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EstadoPropuestaEncuentro estado = EstadoPropuestaEncuentro.PROPUESTA_PENDIENTE;

    @Column(nullable = false)
    private Instant creadaEn;

    @Column(nullable = false)
    private Instant actualizadaEn;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Reclamo getReclamo() {
        return reclamo;
    }

    public void setReclamo(Reclamo reclamo) {
        this.reclamo = reclamo;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getReferencia() {
        return referencia;
    }

    public void setReferencia(String referencia) {
        this.referencia = referencia;
    }

    public Double getLatitud() {
        return latitud;
    }

    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }

    public Double getLongitud() {
        return longitud;
    }

    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }

    public User getPropuestoPor() {
        return propuestoPor;
    }

    public void setPropuestoPor(User propuestoPor) {
        this.propuestoPor = propuestoPor;
    }

    public EstadoPropuestaEncuentro getEstado() {
        return estado;
    }

    public void setEstado(EstadoPropuestaEncuentro estado) {
        this.estado = estado;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(Instant creadaEn) {
        this.creadaEn = creadaEn;
    }

    public Instant getActualizadaEn() {
        return actualizadaEn;
    }

    public void setActualizadaEn(Instant actualizadaEn) {
        this.actualizadaEn = actualizadaEn;
    }
}
