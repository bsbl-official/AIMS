package com.accountbm.financialstatement.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class FinancialStatementDtos {
    private FinancialStatementDtos() {}

    public record CreateReportRequest(
            @NotBlank @Size(max = 2) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String reportCode,
            @NotBlank @Size(max = 100) String reportDescription,
            @Size(max = 100) String summaryLabel) {}

    public record UpdateReportRequest(
            @NotBlank @Size(max = 100) String reportDescription,
            @Size(max = 100) String summaryLabel) {}

    public record CreateGroupRequest(
            @NotBlank @Size(max = 2) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String reportCode,
            @NotBlank @Size(max = 3) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String groupCode,
            @NotBlank @Size(max = 100) String groupDescription,
            @Size(max = 100) String summaryLabel) {}

    public record UpdateGroupRequest(
            @NotBlank @Size(max = 100) String groupDescription,
            @Size(max = 100) String summaryLabel) {}

    public record CreateLayerRequest(
            @NotBlank @Size(max = 2) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String reportCode,
            @NotBlank @Size(max = 3) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String groupCode,
            @NotBlank @Size(max = 3) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String layerCode,
            @NotBlank @Size(max = 100) String layerDescription,
            @Size(max = 100) String summaryLabel,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String sign) {}

    public record UpdateLayerRequest(
            @NotBlank @Size(max = 100) String layerDescription,
            @Size(max = 100) String summaryLabel,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String sign) {}

    public record CreateSpecificationRequest(
            @NotBlank @Size(max = 2) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String reportCode,
            @NotBlank @Size(max = 3) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String groupCode,
            @NotBlank @Size(max = 3) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String layerCode,
            @NotBlank @Size(max = 6) @Pattern(regexp = "[A-Za-z0-9]+", message = "must contain only letters and numbers") String specificationCode,
            @NotBlank @Size(max = 100) String specificationDescription,
            @NotBlank @Size(max = 1) String reportType,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String groupSign,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String sign,
            @Positive @Max(999999) Long noteId,
            @Size(max = 1) String retainEarningFlag,
            @Size(max = 6) String reportShort,
            @Size(max = 5) String cashFlowFlag,
            @Size(max = 5) String receiptPaymentFlag,
            @Size(max = 30) String ratioParameter,
            @Size(max = 1) String liquidCashFlag,
            @Size(max = 1) String savingsFlag,
            @Size(max = 1) String debtFlag,
            @Size(max = 1) String principalPaidFlag,
            @Size(max = 1) String serviceChargePaidFlag,
            @Size(max = 1) String currentAssetFlag,
            @Size(max = 1) String currentLiabilityFlag,
            @Size(max = 1) String splitFigureFlag,
            @Size(max = 1) String combineFlag,
            @Size(max = 50) String specificationCodeDummy) {}

    public record UpdateSpecificationRequest(
            @NotBlank @Size(max = 100) String specificationDescription,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String groupSign,
            @Pattern(regexp = "[+-]?", message = "must be + or -") String sign,
            @Positive @Max(999999) Long noteId,
            @Size(max = 1) String retainEarningFlag,
            @Size(max = 6) String reportShort,
            @Size(max = 5) String cashFlowFlag,
            @Size(max = 5) String receiptPaymentFlag,
            @Size(max = 30) String ratioParameter,
            @Size(max = 1) String liquidCashFlag,
            @Size(max = 1) String savingsFlag,
            @Size(max = 1) String debtFlag,
            @Size(max = 1) String principalPaidFlag,
            @Size(max = 1) String serviceChargePaidFlag,
            @Size(max = 1) String currentAssetFlag,
            @Size(max = 1) String currentLiabilityFlag,
            @Size(max = 1) String splitFigureFlag,
            @Size(max = 1) String combineFlag,
            @Size(max = 50) String specificationCodeDummy) {}

    public record ReportResponse(
            String reportCode, String reportDescription, String summaryLabel,
            List<GroupResponse> groups) {}

    public record GroupResponse(
            String groupCode, String groupDescription, String summaryLabel,
            List<LayerResponse> layers) {}

    public record LayerResponse(
            String layerCode, String layerDescription, String summaryLabel, String sign,
            List<SpecificationResponse> specifications) {}

    public record SpecificationResponse(
            String specificationCode, String specificationDescription, String reportType,
            String groupSign, String sign, Long noteId, String retainEarningFlag,
            String reportShort, String cashFlowFlag, String receiptPaymentFlag,
            String ratioParameter, String liquidCashFlag, String savingsFlag, String debtFlag,
            String principalPaidFlag, String serviceChargePaidFlag, String currentAssetFlag,
            String currentLiabilityFlag, String splitFigureFlag, String combineFlag,
            String specificationCodeDummy, String insertedBy, Instant insertedAt,
            String updatedBy, Instant updatedAt) {}
}
