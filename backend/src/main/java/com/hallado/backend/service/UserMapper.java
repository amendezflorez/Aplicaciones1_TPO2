package com.hallado.backend.service;

import com.hallado.backend.dto.response.BadgeResponse;
import com.hallado.backend.dto.response.BarrioResponse;
import com.hallado.backend.dto.response.PublicUserResponse;
import com.hallado.backend.dto.response.ReputationResponse;
import com.hallado.backend.dto.response.UserResponse;
import com.hallado.backend.entity.Barrio;
import com.hallado.backend.entity.User;
import java.util.List;
import org.springframework.stereotype.Component;

// Las insignias se derivan de la reputación, igual que en el mock (mockAdapter.js:
// badgesFor). Los umbrales viven acá, no en la app.
@Component
public class UserMapper {

    private static final int SOLIDARIO_MIN_RETURNS = 5;
    private static final BadgeResponse BADGE_VECINO_SOLIDARIO =
            new BadgeResponse("VECINO_SOLIDARIO", "Vecino solidario");

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getPhotoUrl(),
                toBarrioResponse(user.getBarrio()),
                user.getPhone(),
                user.isPhoneVisible(),
                user.getMemberSince(),
                toReputationResponse(user),
                badgesFor(user));
    }

    public PublicUserResponse toPublicUserResponse(User user) {
        return new PublicUserResponse(
                user.getId(),
                user.getName(),
                user.getPhotoUrl(),
                toBarrioResponse(user.getBarrio()),
                user.getMemberSince(),
                toReputationResponse(user),
                badgesFor(user));
    }

    private BarrioResponse toBarrioResponse(Barrio barrio) {
        return BarrioResponse.of(barrio);
    }

    private ReputationResponse toReputationResponse(User user) {
        return new ReputationResponse(
                user.getReturnsCount(), user.getPositiveCount(), user.getNegativeCount(), user.getScore());
    }

    private List<BadgeResponse> badgesFor(User user) {
        return user.getReturnsCount() >= SOLIDARIO_MIN_RETURNS ? List.of(BADGE_VECINO_SOLIDARIO) : List.of();
    }
}
