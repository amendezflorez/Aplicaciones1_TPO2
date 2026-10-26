package com.hallado.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

// Perfil propio + reputación (secciones 1 y 2 del contrato). Las devoluciones y
// valoraciones (puntos 7/8) todavía no existen en esta entrega: returns/positive/negative/score
// quedan en 0 salvo en los usuarios semilla; los puntos siguientes los irán incrementando.
@Entity
@Table(name = "users")
public class User {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name = "";

    private String photoUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "barrio_id")
    private Barrio barrio;

    private String phone;

    @Column(nullable = false)
    private boolean phoneVisible = false;

    @Column(nullable = false)
    private Instant memberSince;

    @Column(nullable = false)
    private int returnsCount = 0;

    @Column(nullable = false)
    private int positiveCount = 0;

    @Column(nullable = false)
    private int negativeCount = 0;

    @Column(nullable = false)
    private int score = 0;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public Barrio getBarrio() {
        return barrio;
    }

    public void setBarrio(Barrio barrio) {
        this.barrio = barrio;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public boolean isPhoneVisible() {
        return phoneVisible;
    }

    public void setPhoneVisible(boolean phoneVisible) {
        this.phoneVisible = phoneVisible;
    }

    public Instant getMemberSince() {
        return memberSince;
    }

    public void setMemberSince(Instant memberSince) {
        this.memberSince = memberSince;
    }

    public int getReturnsCount() {
        return returnsCount;
    }

    public void setReturnsCount(int returnsCount) {
        this.returnsCount = returnsCount;
    }

    public int getPositiveCount() {
        return positiveCount;
    }

    public void setPositiveCount(int positiveCount) {
        this.positiveCount = positiveCount;
    }

    public int getNegativeCount() {
        return negativeCount;
    }

    public void setNegativeCount(int negativeCount) {
        this.negativeCount = negativeCount;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }
}
