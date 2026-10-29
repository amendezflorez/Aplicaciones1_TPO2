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

// "Búsqueda guardada" (Punto 9 construye las pantallas Mis alertas / el indicador de
// novedad agregado; acá solo viven la entidad y alta/listado/borrado, que el buscador de
// los Puntos 3/4 ya necesita disparar). "ultimaRevision" arranca igual a "creadaEn" y no
// se muta desde este plan: marcarla como vista es responsabilidad de las pantallas del
// Punto 9, que la van a actualizar cuando abran "Mis alertas".
@Entity
@Table(name = "alertas")
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoPublicacion tipoBuscado;

    @Enumerated(EnumType.STRING)
    private Categoria categoria;

    private String texto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "barrio_id")
    private Barrio barrio;

    @Column(nullable = false)
    private Instant creadaEn;

    @Column(nullable = false)
    private Instant ultimaRevision;

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

    public TipoPublicacion getTipoBuscado() {
        return tipoBuscado;
    }

    public void setTipoBuscado(TipoPublicacion tipoBuscado) {
        this.tipoBuscado = tipoBuscado;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
    }

    public String getTexto() {
        return texto;
    }

    public void setTexto(String texto) {
        this.texto = texto;
    }

    public Barrio getBarrio() {
        return barrio;
    }

    public void setBarrio(Barrio barrio) {
        this.barrio = barrio;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(Instant creadaEn) {
        this.creadaEn = creadaEn;
    }

    public Instant getUltimaRevision() {
        return ultimaRevision;
    }

    public void setUltimaRevision(Instant ultimaRevision) {
        this.ultimaRevision = ultimaRevision;
    }
}
