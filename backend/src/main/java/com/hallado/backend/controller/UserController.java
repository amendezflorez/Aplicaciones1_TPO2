package com.hallado.backend.controller;

import com.hallado.backend.dto.request.UpdateMeRequest;
import com.hallado.backend.dto.response.PhotoResponse;
import com.hallado.backend.dto.response.PublicUserResponse;
import com.hallado.backend.dto.response.UserResponse;
import com.hallado.backend.service.UserService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// Todo lo que cuelga de /users requiere JWT (JwtAuthFilter); "userId" lo deja el filtro
// como request attribute a partir del subject del token.
@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/me")
    public UserResponse me(@RequestAttribute("userId") String userId) {
        return userService.getMe(userId);
    }

    @PutMapping("/users/me")
    public UserResponse updateMe(@RequestAttribute("userId") String userId, @RequestBody UpdateMeRequest body) {
        return userService.updateMe(userId, body);
    }

    @PostMapping(value = "/users/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoResponse uploadPhoto(
            @RequestAttribute("userId") String userId, @RequestParam("photo") MultipartFile photo) {
        return userService.updatePhoto(userId, photo);
    }

    @GetMapping("/users/{id}/public")
    public PublicUserResponse publicProfile(@PathVariable String id) {
        return userService.getPublicProfile(id);
    }
}
