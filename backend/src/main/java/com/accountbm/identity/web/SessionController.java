package com.accountbm.identity.web;

import static com.accountbm.identity.web.AuthenticationController.REFRESH_TOKEN_COOKIE;

import java.util.List;
import java.util.UUID;

import com.accountbm.identity.service.SessionService;
import com.accountbm.identity.service.SessionService.SessionView;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/sessions")
public class SessionController {
    private final SessionService sessions;
    public SessionController(SessionService sessions) { this.sessions = sessions; }

    @GetMapping
    public List<SessionView> list(@AuthenticationPrincipal Jwt jwt,
            @CookieValue(name=REFRESH_TOKEN_COOKIE, required=false) String refreshToken) {
        return sessions.list(UUID.fromString(jwt.getSubject()), refreshToken);
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID sessionId) {
        sessions.revoke(UUID.fromString(jwt.getSubject()), sessionId);
        return ResponseEntity.noContent().build();
    }
}
