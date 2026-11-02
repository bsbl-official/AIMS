package com.accountbm.initialdata.controller;

import static com.accountbm.initialdata.dto.InitialDataDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.initialdata.service.InitialDataService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/initial-data")
public class InitialDataController {
    private final InitialDataService service;

    public InitialDataController(InitialDataService service) {
        this.service = service;
    }

    @GetMapping("/account-heads")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:initial_data.read','permission:initial_data.manage')")
    public List<AccountHeadResponse> accountHeads(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.accountHeads(companyId, actor(jwt));
    }

    @GetMapping("/entries")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:initial_data.read','permission:initial_data.manage')")
    public List<InitialDataSummaryResponse> entries(@PathVariable UUID companyId, @AuthenticationPrincipal Jwt jwt) {
        return service.entries(companyId, actor(jwt));
    }

    @GetMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:initial_data.read','permission:initial_data.manage')")
    public InitialDataResponse entry(@PathVariable UUID companyId, @PathVariable UUID entryId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.entry(companyId, entryId, actor(jwt));
    }

    @PostMapping("/entries")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:initial_data.manage')")
    public ResponseEntity<InitialDataResponse> save(@PathVariable UUID companyId,
            @Valid @RequestBody SaveInitialDataRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result = service.save(companyId, request, actor(jwt));
        return ResponseEntity.created(URI.create("/api/companies/" + companyId + "/initial-data/entries/" + result.entryId())).body(result);
    }

    private static UUID actor(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
