package com.accountbm.journal.controller;

import static com.accountbm.journal.dto.VoucherDtos.CombinedVoucherSummary;

import com.accountbm.journal.service.VoucherService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies/{companyId}/vouchers")
public class VoucherListController {
    private final VoucherService service;

    public VoucherListController(VoucherService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.read','permission:journal.create')")
    public List<CombinedVoucherSummary> list(@PathVariable UUID companyId, @RequestParam UUID branchId,
            @RequestParam(required=false) String voucherNumber, @RequestParam(required=false) LocalDate fromDate,
            @RequestParam(required=false) LocalDate toDate, @RequestParam(required=false) String voucherClass,
            @AuthenticationPrincipal Jwt jwt) {
        return service.listAll(companyId, branchId, voucherNumber, fromDate, toDate, voucherClass,
                UUID.fromString(jwt.getSubject()));
    }
}
