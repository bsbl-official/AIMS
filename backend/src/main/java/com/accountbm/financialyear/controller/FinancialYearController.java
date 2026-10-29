package com.accountbm.financialyear.controller;

import static com.accountbm.financialyear.dto.FinancialYearDtos.*;

import java.util.List;
import java.util.UUID;

import com.accountbm.financialyear.service.FinancialYearService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies/{companyId}/financial-year")
public class FinancialYearController {
    private final FinancialYearService service;

    public FinancialYearController(FinancialYearService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_years.read', 'permission:financial_years.manage')")
    public List<FinancialPeriodResponse> periods(
            @PathVariable UUID companyId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.periods(companyId, actorId(jwt));
    }

    @PutMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_years.manage')")
    public List<FinancialPeriodResponse> update(
            @PathVariable UUID companyId,
            @Valid @RequestBody SaveFinancialYearRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
