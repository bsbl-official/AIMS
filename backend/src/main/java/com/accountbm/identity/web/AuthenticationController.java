package com.accountbm.identity.web;

import static com.accountbm.identity.dto.IdentityDtos.*;

import java.util.UUID;

import com.accountbm.identity.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {
    public static final String ACCESS_TOKEN_COOKIE = "account_bm_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "account_bm_refresh_token";

    private final AuthenticationService authenticationService;
    private final long refreshTokenDays;
    private final boolean secureCookies;
    private final String sameSite;

    public AuthenticationController(
            AuthenticationService authenticationService,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays,
            @Value("${app.auth-cookie.secure}") boolean secureCookies,
            @Value("${app.auth-cookie.same-site}") String sameSite) {
        this.authenticationService = authenticationService;
        this.refreshTokenDays = refreshTokenDays;
        this.secureCookies = secureCookies;
        this.sameSite = sameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authenticated(authenticationService.login(request, clientIp(httpRequest), httpRequest.getHeader("User-Agent")));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_TOKEN_COOKIE) String refreshToken,
            HttpServletRequest httpRequest) {
        return authenticated(authenticationService.refresh(refreshToken, clientIp(httpRequest), httpRequest.getHeader("User-Agent")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null) authenticationService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_TOKEN_COOKIE, "/api").toString())
                .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_TOKEN_COOKIE, "/api/auth").toString())
                .build();
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken());
    }

    @GetMapping("/me")
    public CurrentUser me(@AuthenticationPrincipal Jwt jwt) {
        return authenticationService.currentUser(UUID.fromString(jwt.getSubject()));
    }

    private static String clientIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank() ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
    }

    private ResponseEntity<AuthResponse> authenticated(TokenResponse tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookie(
                        ACCESS_TOKEN_COOKIE, tokens.accessToken(), "/api", tokens.expiresInSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, authCookie(
                        REFRESH_TOKEN_COOKIE, tokens.refreshToken(), "/api/auth", refreshTokenDays * 24 * 60 * 60).toString())
                .body(new AuthResponse(tokens.expiresInSeconds(), tokens.user()));
    }

    private ResponseCookie authCookie(String name, String value, String path, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie clearCookie(String name, String path) {
        return authCookie(name, "", path, 0);
    }
}
