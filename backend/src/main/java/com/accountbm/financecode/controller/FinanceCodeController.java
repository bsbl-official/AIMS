package com.accountbm.financecode.controller;

import static com.accountbm.financecode.dto.FinanceCodeDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.financecode.service.FinanceCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/finance-codes")
public class FinanceCodeController {
    private final FinanceCodeService service;
    public FinanceCodeController(FinanceCodeService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:finance_codes.read', 'permission:finance_codes.manage', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public List<FinanceCodeResponse> financeCodes(@PathVariable UUID companyId,
            @RequestParam(required = false) Integer projectCodeId, @AuthenticationPrincipal Jwt jwt) {
        return service.financeCodes(companyId, projectCodeId, actorId(jwt));
    }

    @GetMapping("/{financeCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:finance_codes.read', 'permission:finance_codes.manage', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public FinanceCodeResponse financeCode(@PathVariable UUID companyId, @PathVariable Integer financeCodeId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.financeCode(companyId, financeCodeId, actorId(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:finance_codes.manage')")
    public ResponseEntity<FinanceCodeResponse> create(@PathVariable UUID companyId,
            @Valid @RequestBody CreateFinanceCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(companyId, request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/finance-codes/" + result.id())).body(result);
    }

    @PutMapping("/{financeCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:finance_codes.manage')")
    public FinanceCodeResponse update(@PathVariable UUID companyId, @PathVariable Integer financeCodeId,
            @Valid @RequestBody UpdateFinanceCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, financeCodeId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
