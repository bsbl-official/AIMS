package com.accountbm.identity.web;

import static com.accountbm.identity.dto.MfaDtos.*;

import java.util.UUID;

import com.accountbm.identity.service.MfaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/mfa")
public class MfaController {
    private final MfaService service;
    public MfaController(MfaService service){this.service=service;}
    @PostMapping("/enrollment")
    public EnrollmentStart begin(@AuthenticationPrincipal Jwt jwt){return service.begin(actor(jwt));}
    @PostMapping("/enrollment/confirm")
    public EnrollmentComplete confirm(@Valid @RequestBody ConfirmEnrollmentRequest request,@AuthenticationPrincipal Jwt jwt){
        return service.confirm(actor(jwt),request.code());
    }
    @DeleteMapping
    public ResponseEntity<Void> disable(@Valid @RequestBody DisableMfaRequest request,@AuthenticationPrincipal Jwt jwt){
        service.disable(actor(jwt),request.currentPassword(),request.code());return ResponseEntity.noContent().build();
    }
    private static UUID actor(Jwt jwt){return UUID.fromString(jwt.getSubject());}
}

