package com.accountbm.financialstatement.controller;

import static com.accountbm.financialstatement.dto.FinancialStatementDtos.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.accountbm.financialstatement.service.FinancialStatementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companies/{companyId}/financial-statements")
public class FinancialStatementController {
    private final FinancialStatementService service;

    public FinancialStatementController(FinancialStatementService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.read', 'permission:financial_statements.manage')")
    public List<ReportResponse> hierarchy(
            @PathVariable UUID companyId,
            @AuthenticationPrincipal Jwt jwt) {
        return service.hierarchy(companyId, actorId(jwt));
    }

    @PostMapping("/reports")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<ReportResponse> createReport(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.createReport(companyId, request, actorId(jwt));
        return ResponseEntity.created(location(companyId)).body(result);
    }

    @PostMapping("/groups")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<GroupResponse> createGroup(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.createGroup(companyId, request, actorId(jwt));
        return ResponseEntity.created(location(companyId)).body(result);
    }

    @PostMapping("/layers")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<LayerResponse> createLayer(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateLayerRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.createLayer(companyId, request, actorId(jwt));
        return ResponseEntity.created(location(companyId)).body(result);
    }

    @PostMapping("/specifications")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<SpecificationResponse> createSpecification(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateSpecificationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = service.createSpecification(companyId, request, actorId(jwt));
        return ResponseEntity.created(location(companyId)).body(result);
    }

    @PutMapping("/reports/{reportCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ReportResponse updateReport(@PathVariable UUID companyId, @PathVariable String reportCode,
            @Valid @RequestBody UpdateReportRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.updateReport(companyId, reportCode, request, actorId(jwt));
    }

    @DeleteMapping("/reports/{reportCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<Void> deleteReport(@PathVariable UUID companyId, @PathVariable String reportCode,
            @AuthenticationPrincipal Jwt jwt) {
        service.deleteReport(companyId, reportCode, actorId(jwt));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/groups/{reportCode}/{groupCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public GroupResponse updateGroup(@PathVariable UUID companyId, @PathVariable String reportCode,
            @PathVariable String groupCode, @Valid @RequestBody UpdateGroupRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.updateGroup(companyId, reportCode, groupCode, request, actorId(jwt));
    }

    @DeleteMapping("/groups/{reportCode}/{groupCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<Void> deleteGroup(@PathVariable UUID companyId, @PathVariable String reportCode,
            @PathVariable String groupCode, @AuthenticationPrincipal Jwt jwt) {
        service.deleteGroup(companyId, reportCode, groupCode, actorId(jwt));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/layers/{reportCode}/{groupCode}/{layerCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public LayerResponse updateLayer(@PathVariable UUID companyId, @PathVariable String reportCode,
            @PathVariable String groupCode, @PathVariable String layerCode,
            @Valid @RequestBody UpdateLayerRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.updateLayer(companyId, reportCode, groupCode, layerCode, request, actorId(jwt));
    }

    @DeleteMapping("/layers/{reportCode}/{groupCode}/{layerCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<Void> deleteLayer(@PathVariable UUID companyId, @PathVariable String reportCode,
            @PathVariable String groupCode, @PathVariable String layerCode, @AuthenticationPrincipal Jwt jwt) {
        service.deleteLayer(companyId, reportCode, groupCode, layerCode, actorId(jwt));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/specifications/{reportCode}/{groupCode}/{layerCode}/{reportType}/{specificationCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public SpecificationResponse updateSpecification(@PathVariable UUID companyId,
            @PathVariable String reportCode, @PathVariable String groupCode, @PathVariable String layerCode,
            @PathVariable String reportType, @PathVariable String specificationCode,
            @Valid @RequestBody UpdateSpecificationRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.updateSpecification(companyId, reportCode, groupCode, layerCode, reportType,
                specificationCode, request, actorId(jwt));
    }

    @DeleteMapping("/specifications/{reportCode}/{groupCode}/{layerCode}/{reportType}/{specificationCode}")
    @PreAuthorize("hasAnyAuthority('permission:*', 'permission:financial_statements.manage')")
    public ResponseEntity<Void> deleteSpecification(@PathVariable UUID companyId,
            @PathVariable String reportCode, @PathVariable String groupCode, @PathVariable String layerCode,
            @PathVariable String reportType, @PathVariable String specificationCode,
            @AuthenticationPrincipal Jwt jwt) {
        service.deleteSpecification(companyId, reportCode, groupCode, layerCode, reportType,
                specificationCode, actorId(jwt));
        return ResponseEntity.noContent().build();
    }

    private static URI location(UUID companyId) {
        return URI.create("/api/companies/" + companyId + "/financial-statements");
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
