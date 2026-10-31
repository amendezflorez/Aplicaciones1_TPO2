package com.hallado.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// lat/lng: centro aproximado del barrio. Nullable porque un barrio cargado a mano podría
// no tenerlas, pero los 8 semillados por DataSeeder siempre las traen. Punto 5 (sección
// 10.x de PLAN_puntos_5_y_6.md): mejor esfuerzo para el mapa de resultados cuando el alta
// de una publicación solo escribió la dirección, sin GPS ni geocoding exitoso del lado del
// cliente — ver PublicacionService.crear. Nunca se usan para fabricar un
// Publicacion.latExacta/lngExacta falso, solo para la ubicación aproximada.
@Entity
@Table(name = "barrios")
public class Barrio {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private Double lat;

    private Double lng;

    public Barrio() {
    }

    public Barrio(String id, String name) {
        this(id, name, null, null);
    }

    public Barrio(String id, String name, Double lat, Double lng) {
        this.id = id;
        this.name = name;
        this.lat = lat;
        this.lng = lng;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }
}
