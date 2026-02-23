package com.abhishek.quiz_backend.controller;

import com.abhishek.quiz_backend.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
public class UserController {

    /**
     * Public health check endpoint
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "status", "UP",
                "service", "QuizSync API",
                "version", "1.0.0"
        )));
    }

    /**
     * Returns the currently authenticated user's profile from the JWT
     * GET /api/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCurrentUser(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Not authenticated"));
        }

        // auth.getPrincipal() = userId (subject claim)
        // auth.getCredentials() = email claim
        String userId = (String) auth.getPrincipal();
        String email = (String) auth.getCredentials();

        log.debug("User profile requested: {} ({})", email, userId);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "userId", userId,
                "email", email != null ? email : ""
        )));
    }
}