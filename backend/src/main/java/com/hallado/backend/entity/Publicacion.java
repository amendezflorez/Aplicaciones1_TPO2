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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

// Puntos 3 y 4 (lectura) + Punto 5 (alta/gestión, ver PLAN_puntos_5_y_6.md). "lat"/"lng"
// son la ubicación aproximada que se muestra siempre (mapa de resultados);
// "latExacta"/"lngExacta"/"direccionExacta" son el dato preciso del hecho y solo se
// exponen en el detalle si hay un Reclamo ACEPTADO del usuario o es su propia
// publicación (PublicacionMapper hace la gating, nunca el cliente).
// "preguntaVerificacion" (solo si tipo=ENCONTRADO) sí viaja en el detalle para que
// cualquiera pueda intentar un reclamo "Es mío"; "respuestaVerificacion" nunca se expone
// en ningún DTO (se compara server-side al validar el reclamo, trabajo del Punto 7).
@Entity
@Table(
        name = "publicaciones",
        uniqueConstraints = @UniqueConstraint(columnNames = {"publicador_id", "client_request_id"}))
public class Publicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoPublicacion tipo;

    @Column(nullable = false)
    private String titulo;

    // Sin @Lob a propósito: Hibernate 7 no permite usar LOWER() en HQL sobre un campo
    // mapeado a CLOB (lo necesita el buscador por texto de PublicacionRepository), y una
    // descripción de este caso de uso entra sin problema en un VARCHAR largo.
    @Column(nullable = false, length = 4000)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Categoria categoria;

    @Column(nullable = false)
    private Instant fechaSuceso;

    @Enumerated(EnumType.STRING)
    private FranjaHoraria franjaHoraria;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "barrio_id", nullable = false)
    private Barrio barrio;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    private String direccionExacta;

    private Double latExacta;

    private Double lngExacta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoPublicacion estado = EstadoPublicacion.ABIERTA;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "publicador_id", nullable = false)
    private User publicador;

    private String preguntaVerificacion;

    private String respuestaVerificacion;

    @Column(nullable = false)
    private Instant creadaEn;

    private Instant venceEn;

    // Idempotencia del alta (Punto 6, cola offline): el cliente genera un id propio por
    // intento de publicar; si un POST /publicaciones repetido (reintento tras perder la
    // respuesta del primero, sin conexión intermitente) llega con un clientRequestId que
    // ya existe para ese publicador, el backend devuelve la publicación ya creada en vez
    // de duplicarla. Único por publicador, no global, para no exigirle al cliente un UUID
    // con colisión prácticamente imposible entre usuarios distintos.
    @Column(name = "client_request_id")
    private String clientRequestId;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TipoPublicacion getTipo() {
        return tipo;
    }

    public void setTipo(TipoPublicacion tipo) {
        this.tipo = tipo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
    }

    public Instant getFechaSuceso() {
        return fechaSuceso;
    }

    public void setFechaSuceso(Instant fechaSuceso) {
        this.fechaSuceso = fechaSuceso;
    }

    public FranjaHoraria getFranjaHoraria() {
        return franjaHoraria;
    }

    public void setFranjaHoraria(FranjaHoraria franjaHoraria) {
        this.franjaHoraria = franjaHoraria;
    }

    public Barrio getBarrio() {
        return barrio;
    }

    public void setBarrio(Barrio barrio) {
        this.barrio = barrio;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLng() {
        return lng;
    }

    public void setLng(double lng) {
        this.lng = lng;
    }

    public String getDireccionExacta() {
        return direccionExacta;
    }

    public void setDireccionExacta(String direccionExacta) {
        this.direccionExacta = direccionExacta;
    }

    public Double getLatExacta() {
        return latExacta;
    }

    public void setLatExacta(Double latExacta) {
        this.latExacta = latExacta;
    }

    public Double getLngExacta() {
        return lngExacta;
    }

    public void setLngExacta(Double lngExacta) {
        this.lngExacta = lngExacta;
    }

    public EstadoPublicacion getEstado() {
        return estado;
    }

    public void setEstado(EstadoPublicacion estado) {
        this.estado = estado;
    }

    public User getPublicador() {
        return publicador;
    }

    public void setPublicador(User publicador) {
        this.publicador = publicador;
    }

    public String getPreguntaVerificacion() {
        return preguntaVerificacion;
    }

    public void setPreguntaVerificacion(String preguntaVerificacion) {
        this.preguntaVerificacion = preguntaVerificacion;
    }

    public String getRespuestaVerificacion() {
        return respuestaVerificacion;
    }

    public void setRespuestaVerificacion(String respuestaVerificacion) {
        this.respuestaVerificacion = respuestaVerificacion;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public void setCreadaEn(Instant creadaEn) {
        this.creadaEn = creadaEn;
    }

    public Instant getVenceEn() {
        return venceEn;
    }

    public void setVenceEn(Instant venceEn) {
        this.venceEn = venceEn;
    }

    public String getClientRequestId() {
        return clientRequestId;
    }

    public void setClientRequestId(String clientRequestId) {
        this.clientRequestId = clientRequestId;
    }
}
