package com.accountbm.projectcode.controller;

import static com.accountbm.projectcode.dto.ProjectCodeDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.projectcode.service.ProjectCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/project-codes")
public class ProjectCodeController {
    private final ProjectCodeService service;

    public ProjectCodeController(ProjectCodeService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:project_codes.read', 'permission:project_codes.manage', 'permission:finance_codes.read', 'permission:finance_codes.manage', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public List<ProjectCodeResponse> projectCodes(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.projectCodes(companyId, actorId(jwt));
    }

    @GetMapping("/{projectCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:project_codes.read', 'permission:project_codes.manage', 'permission:finance_codes.read', 'permission:finance_codes.manage', 'permission:component_codes.read', 'permission:component_codes.manage')")
    public ProjectCodeResponse projectCode(@PathVariable UUID companyId, @PathVariable Integer projectCodeId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.projectCode(companyId, projectCodeId, actorId(jwt));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:project_codes.manage')")
    public ResponseEntity<ProjectCodeResponse> create(@PathVariable UUID companyId,
            @Valid @RequestBody CreateProjectCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result = service.create(companyId, request, actorId(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/project-codes/" + result.id())).body(result);
    }

    @PutMapping("/{projectCodeId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:project_codes.manage')")
    public ProjectCodeResponse update(@PathVariable UUID companyId, @PathVariable Integer projectCodeId,
            @Valid @RequestBody UpdateProjectCodeRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.update(companyId, projectCodeId, request, actorId(jwt));
    }

    private static UUID actorId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
