package com.accountbm.coa.controller;

import com.accountbm.coa.service.AccountLayerService;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/account-layers")
public class AccountLayerController {
    private final AccountLayerService service;
    public AccountLayerController(AccountLayerService service) { this.service = service; }

    @GetMapping("/{level}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.read','permission:coa.manage')")
    public List<Map<String, Object>> list(@PathVariable UUID companyId, @PathVariable int level,
            @RequestParam long coaId, @AuthenticationPrincipal Jwt jwt) {
        return service.list(companyId, coaId, level, actor(jwt));
    }

    @PostMapping("/{level}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.manage')")
    public ResponseEntity<Map<String, Object>> create(@PathVariable UUID companyId, @PathVariable int level,
            @RequestParam long coaId, @RequestBody Map<String, Object> data, @AuthenticationPrincipal Jwt jwt) {
        var result = service.save(companyId, coaId, level, data, actor(jwt), false);
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/account-layers/" + level + "?coaId=" + coaId)).body(result);
    }

    @PutMapping("/{level}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.manage')")
    public Map<String, Object> update(@PathVariable UUID companyId, @PathVariable int level,
            @RequestParam long coaId, @RequestBody Map<String, Object> data, @AuthenticationPrincipal Jwt jwt) {
        return service.save(companyId, coaId, level, data, actor(jwt), true);
    }

    @DeleteMapping("/{level}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID companyId, @PathVariable int level,
            @RequestParam long coaId, @RequestBody Map<String, Object> data, @AuthenticationPrincipal Jwt jwt) {
        service.delete(companyId, coaId, level, data, actor(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/report-options")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.read','permission:coa.manage')")
    public List<Map<String, Object>> reportOptions(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.reportOptions(companyId, actor(jwt));
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.read','permission:coa.manage')")
    public List<Map<String, Object>> categories(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.categories(companyId, actor(jwt));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:coa.manage')")
    public ResponseEntity<Map<String, Object>> category(@PathVariable UUID companyId,
            @RequestBody Map<String, Object> data, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(201).body(service.createCategory(companyId, data, actor(jwt)));
    }

    private static UUID actor(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
