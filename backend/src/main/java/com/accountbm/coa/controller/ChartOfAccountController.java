package com.accountbm.coa.controller;

import static com.accountbm.coa.dto.ChartOfAccountDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.coa.service.ChartOfAccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/coa")
public class ChartOfAccountController {
    private final ChartOfAccountService service;

    public ChartOfAccountController(ChartOfAccountService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.read', 'permission:coa.manage', 'permission:financial_statements.read', 'permission:financial_statements.manage')")
    public List<ChartOfAccountResponse> chartOfAccounts() {
        return service.chartOfAccounts();
    }

    @GetMapping("/{coaId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.read', 'permission:coa.manage')")
    public ChartOfAccountResponse chartOfAccount(@PathVariable Long coaId) {
        return service.chartOfAccount(coaId);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.manage')")
    public ResponseEntity<ChartOfAccountResponse> create(
            @Valid @RequestBody CreateChartOfAccountRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/coa/" + result.coaId())).body(result);
    }

    @PutMapping("/{coaId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:coa.manage')")
    public ChartOfAccountResponse update(
            @PathVariable Long coaId,
            @Valid @RequestBody UpdateChartOfAccountRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(coaId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
