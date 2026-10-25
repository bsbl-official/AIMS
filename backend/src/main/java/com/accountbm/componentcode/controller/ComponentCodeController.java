package com.accountbm.componentcode.controller;

import static com.accountbm.componentcode.dto.ComponentCodeDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.componentcode.service.ComponentCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/component-codes")
public class ComponentCodeController {
    private final ComponentCodeService service;
    public ComponentCodeController(ComponentCodeService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public List<ComponentCodeResponse> componentCodes(@PathVariable UUID companyId,
            @RequestParam(required = false) Integer projectCodeId,
            @RequestParam(required = false) Integer financeCodeId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.componentCodes(companyId, projectCodeId, financeCodeId, actorId(jwt));
    }

    @GetMapping("/{componentCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public ComponentCodeResponse componentCode(@PathVariable UUID companyId, @PathVariable Integer componentCodeId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.componentCode(companyId, componentCodeId, actorId(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:component_codes.manage')")
    public ResponseEntity<ComponentCodeResponse> create(@PathVariable UUID companyId,
            @Valid @RequestBody CreateComponentCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(companyId, request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/component-codes/" + result.id())).body(result);
    }

    @PutMapping("/{componentCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:component_codes.manage')")
    public ComponentCodeResponse update(@PathVariable UUID companyId, @PathVariable Integer componentCodeId,
            @Valid @RequestBody UpdateComponentCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, componentCodeId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
