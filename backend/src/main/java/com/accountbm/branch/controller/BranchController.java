package com.accountbm.branch.controller;

import static com.accountbm.branch.dto.BranchDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.branch.service.BranchService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies/{companyId}/branches")
public class BranchController {
    private final BranchService service;

    public BranchController(BranchService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:branches.read', 'permission:branches.manage')")
    public List<BranchResponse> branches(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.branches(companyId, actorId(jwt));
    }

    @GetMapping("/{branchId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:branches.read', 'permission:branches.manage')")
    public BranchResponse branch(
            @PathVariable UUID companyId,
            @PathVariable UUID branchId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.branch(companyId, branchId, actorId(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:branches.manage')")
    public ResponseEntity<BranchResponse> create(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateBranchRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var branch = service.create(companyId, request, actorId(jwt));
        return ResponseEntity.created(
                URI.create("/api/companies/" + companyId + "/branches/" + branch.id())).body(branch);
    }

    @PutMapping("/{branchId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:branches.manage')")
    public BranchResponse update(
            @PathVariable UUID companyId,
            @PathVariable UUID branchId,
            @Valid @RequestBody UpdateBranchRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, branchId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
