package com.accountbm.identity.web;

import static com.accountbm.identity.dto.IdentityDtos.*;

import java.util.List;
import java.util.UUID;

import com.accountbm.identity.service.IdentityAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/identity")
public class IdentityAdminController {
    private final IdentityAdminService service;

    public IdentityAdminController(IdentityAdminService service) {
        this.service = service;
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:users.read', 'permission:users.manage')")
    public List<UserSummary> users(@RequestParam UUID organizationId, @AuthenticationPrincipal Jwt jwt) {
        return service.users(organizationId, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:users.manage')")
    public UserSummary createUser(@Valid @RequestBody CreateUserRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.createUser(request, UUID.fromString(jwt.getSubject()));
    }

    @PatchMapping("/users/{userId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:users.manage')")
    public UserSummary updateUser(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        return service.updateUser(userId, request, UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:roles.read', 'permission:roles.manage')")
    public List<RoleDetail> roles(@RequestParam UUID organizationId, @AuthenticationPrincipal Jwt jwt) {
        return service.roles(organizationId, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:roles.manage')")
    public RoleDetail createRole(@Valid @RequestBody SaveRoleRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.createRole(request, UUID.fromString(jwt.getSubject()));
    }

    @PatchMapping("/roles/{roleId}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:roles.manage')")
    public RoleDetail updateRole(@PathVariable UUID roleId, @Valid @RequestBody SaveRoleRequest request,
                                 @AuthenticationPrincipal Jwt jwt) {
        return service.updateRole(roleId, request, UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:roles.read', 'permission:roles.manage')")
    public List<PermissionSummary> permissions() {
        return service.permissions();
    }

    @GetMapping("/organizations")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:users.read', 'permission:users.manage')")
    public List<OrganizationSummary> organizations(@AuthenticationPrincipal Jwt jwt) {
        return service.organizations(UUID.fromString(jwt.getSubject()));
    }
}
