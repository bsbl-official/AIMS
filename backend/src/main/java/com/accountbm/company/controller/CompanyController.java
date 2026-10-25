package com.accountbm.company.controller;

import static com.accountbm.company.dto.CompanyDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.company.service.CompanyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {
    private final CompanyService service;

    public CompanyController(CompanyService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:companies.read', 'permission:companies.manage', 'permission:branches.read', 'permission:branches.manage', 'permission:project_codes.read', 'permission:project_codes.manage', 'permission:finance_codes.read', 'permission:finance_codes.manage', 'permission:component_codes.read', 'permission:component_codes.manage', 'permission:financial_statements.read', 'permission:financial_statements.manage')")
    public List<CompanyResponse> companies(@AuthenticationPrincipal Jwt jwt) {
        return service.companies(actorId(jwt));
    }

    @GetMapping("/{companyId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:companies.read', 'permission:companies.manage')")
    public CompanyResponse company(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.company(companyId, actorId(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('permission:*')")
    public ResponseEntity<CompanyResponse> create(
            @Valid @RequestBody CreateCompanyRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var company = service.create(request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + company.id())).body(company);
    }

    @PutMapping("/{companyId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:companies.manage')")
    public CompanyResponse update(
            @PathVariable UUID companyId,
            @Valid @RequestBody UpdateCompanyRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, request, actorId(jwt));
    }

    @DeleteMapping("/{companyId}")
    @PreAuthorize("hasAuthority('permission:*')")
    public ResponseEntity<Void> delete(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        service.delete(companyId, actorId(jwt));
        return ResponseEntity.noContent().build();
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
