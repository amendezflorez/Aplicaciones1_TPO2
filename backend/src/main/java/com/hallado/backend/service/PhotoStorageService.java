package com.hallado.backend.service;

import com.hallado.backend.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

// Guarda la foto de perfil en disco (carpeta ignorada por git) y devuelve una URL
// absoluta servida por WebConfig en /uploads/**, usable directo en <Image source={{uri}}>.
@Service
public class PhotoStorageService {

    private final String uploadsDir;

    public PhotoStorageService(@Value("${app.uploads.dir}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    public String store(String userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Falta el archivo de la foto.");
        }
        try {
            Path dir = Path.of(uploadsDir);
            Files.createDirectories(dir);

            String filename = userId + "-" + UUID.randomUUID() + extensionOf(file.getOriginalFilename());
            Path target = dir.resolve(filename);
            file.transferTo(target);

            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/" + filename)
                    .toUriString();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la foto.");
        }
    }

    private String extensionOf(String originalFilename) {
        if (originalFilename == null) return ".jpg";
        int dot = originalFilename.lastIndexOf('.');
        return (dot >= 0 && dot < originalFilename.length() - 1) ? originalFilename.substring(dot) : ".jpg";
    }
}
