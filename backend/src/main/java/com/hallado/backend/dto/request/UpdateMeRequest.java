package com.hallado.backend.dto.request;

// Todos los campos son opcionales: EditProfileScreen siempre los envía todos,
// pero no forzamos eso acá para no acoplar el backend a un único cliente.
public record UpdateMeRequest(String name, String barrioId, String phone, Boolean phoneVisible) {
}
