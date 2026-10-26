package com.hallado.backend.service;

import com.hallado.backend.dto.request.UpdateMeRequest;
import com.hallado.backend.dto.response.PhotoResponse;
import com.hallado.backend.dto.response.PublicUserResponse;
import com.hallado.backend.dto.response.UserResponse;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.User;
import com.hallado.backend.exception.ApiException;
import com.hallado.backend.exception.NotFoundException;
import com.hallado.backend.exception.UnauthorizedException;
import com.hallado.backend.repository.BarrioRepository;
import com.hallado.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BarrioRepository barrioRepository;
    private final UserMapper userMapper;
    private final PhotoStorageService photoStorageService;

    public UserService(
            UserRepository userRepository,
            BarrioRepository barrioRepository,
            UserMapper userMapper,
            PhotoStorageService photoStorageService) {
        this.userRepository = userRepository;
        this.barrioRepository = barrioRepository;
        this.userMapper = userMapper;
        this.photoStorageService = photoStorageService;
    }

    public UserResponse getMe(String userId) {
        return userMapper.toUserResponse(requireById(userId));
    }

    public UserResponse updateMe(String userId, UpdateMeRequest request) {
        User user = requireById(userId);

        if (request.name() != null) {
            user.setName(request.name().trim());
        }
        if (request.barrioId() != null) {
            Barrio barrio = barrioRepository
                    .findById(request.barrioId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "El barrio elegido no existe."));
            user.setBarrio(barrio);
        }
        user.setPhone(request.phone());
        if (request.phoneVisible() != null) {
            user.setPhoneVisible(request.phoneVisible());
        }

        userRepository.save(user);
        return userMapper.toUserResponse(user);
    }

    public PhotoResponse updatePhoto(String userId, MultipartFile photo) {
        User user = requireById(userId);
        String url = photoStorageService.store(userId, photo);
        user.setPhotoUrl(url);
        userRepository.save(user);
        return new PhotoResponse(url);
    }

    public PublicUserResponse getPublicProfile(String id) {
        User user = userRepository.findById(id).orElseThrow(NotFoundException::new);
        return userMapper.toPublicUserResponse(user);
    }

    private User requireById(String id) {
        // El id viene del JWT ya validado por JwtAuthFilter; si no existe, la cuenta
        // fue borrada entre la emisión del token y esta request.
        return userRepository.findById(id).orElseThrow(UnauthorizedException::new);
    }
}
