package com.accountbm.vouchersetup.controller;

import static com.accountbm.vouchersetup.dto.VoucherSetupDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.vouchersetup.service.VoucherSetupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/voucher-setups")
public class VoucherSetupController {
    private final VoucherSetupService service;

    public VoucherSetupController(VoucherSetupService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.read','permission:voucher_setup.manage')")
    public List<VoucherSetupResponse> list(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.list(companyId, actor(jwt));
    }

    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.read','permission:voucher_setup.manage')")
    public VoucherSetupOptions options(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.options(companyId, actor(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.manage')")
    public ResponseEntity<List<VoucherSetupResponse>> create(@PathVariable UUID companyId,
            @Valid @RequestBody CreateVoucherSetupRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(companyId, request, actor(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/voucher-setups")).body(result);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.manage')")
    public VoucherSetupResponse update(@PathVariable UUID companyId, @PathVariable UUID id,
            @Valid @RequestBody UpdateVoucherSetupRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, id, request, actor(jwt));
    }

    @PutMapping("/{id}/control")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.manage')")
    public VoucherSetupResponse updateControl(@PathVariable UUID companyId, @PathVariable UUID id,
            @Valid @RequestBody UpdateVoucherControlRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.updateControl(companyId, id, request, actor(jwt));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:voucher_setup.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID companyId, @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        service.delete(companyId, id, actor(jwt));
        return ResponseEntity.noContent().build();
    }

    private static UUID actor(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
