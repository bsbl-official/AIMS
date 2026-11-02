package com.accountbm.coa.controller;

import static com.accountbm.coa.dto.InitialCoaDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.coa.service.InitialCoaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/initial-coa", "/api/coa"})
public class InitialCoaController {
    private final InitialCoaService service;

    public InitialCoaController(InitialCoaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.read', 'permission:coa.manage', 'permission:financial_statements.read', 'permission:financial_statements.manage')")
    public List<InitialCoaResponse> initialCoas() {
        return service.initialCoas();
    }

    @GetMapping("/{coaId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.read', 'permission:coa.manage')")
    public InitialCoaResponse initialCoa(@PathVariable Long coaId) {
        return service.initialCoa(coaId);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.manage')")
    public ResponseEntity<InitialCoaResponse> create(
            @Valid @RequestBody CreateInitialCoaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/initial-coa/" + result.coaId())).body(result);
    }

    @PutMapping("/{coaId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.manage')")
    public InitialCoaResponse update(
            @PathVariable Long coaId,
            @Valid @RequestBody UpdateInitialCoaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(coaId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
