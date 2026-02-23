package com.abhishek.quiz_backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;

@Component
public class JwtUtil {

    private final SecretKey secretKey;

    public JwtUtil(@Value("${supabase.jwt.secret}") String jwtSecret) {
        // Supabase JWT secret is base64 encoded
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Validates and parses a Supabase JWT token.
     * Returns Claims (payload) if valid, throws exception if invalid.
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUserId(String token) {
        return validateToken(token).getSubject();
    }

    public String extractEmail(String token) {
        return (String) validateToken(token).get("email");
    }

    public String extractRole(String token) {
        return (String) validateToken(token).get("role");
    }
}