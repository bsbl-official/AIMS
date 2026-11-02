package com.accountbm.vouchersetup.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class VoucherSetupDtos {
    private VoucherSetupDtos() {}

    public record BranchOption(UUID id, String code, String name) {}
    public record ProjectOption(Integer id, String name) {}
    public record FinanceOption(Integer id, Integer projectCodeId, String name) {}
    public record ComponentOption(Integer id, Integer projectCodeId, Integer financeCodeId, String name) {}
    public record CoaOption(Long id, String description) {}

    public record VoucherSetupOptions(
            List<BranchOption> branches, List<ProjectOption> projects, List<FinanceOption> finances,
            List<ComponentOption> components, List<CoaOption> coas) {}

    public record VoucherLineRequest(
            @NotBlank String voucherClass,
            @NotBlank String voucherType,
            @NotBlank String documentType,
            @NotBlank @Size(max = 100) String description) {}

    public record CreateVoucherSetupRequest(
            @NotNull UUID branchId,
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer financeCodeId,
            @NotNull @Positive Integer componentCodeId,
            @NotNull @Positive Long coaId,
            @NotEmpty List<@Valid VoucherLineRequest> vouchers) {}

    public record UpdateVoucherSetupRequest(
            @NotNull UUID branchId,
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer financeCodeId,
            @NotNull @Positive Integer componentCodeId,
            @NotNull @Positive Long coaId,
            @NotBlank String voucherClass,
            @NotBlank String voucherType,
            @NotBlank String documentType,
            @NotBlank @Size(max = 100) String description,
            @NotNull @PositiveOrZero Long version) {}

    public record UpdateVoucherControlRequest(
            @NotNull Boolean autoVoucher,
            @NotNull @PositiveOrZero Long voucherLastNo,
            @NotNull @PositiveOrZero Long version) {}

    public record VoucherSetupResponse(
            UUID id, UUID companyId, UUID branchId, String branchCode, String branchName,
            Integer projectCodeId, String projectName, Integer financeCodeId, String financeName,
            Integer componentCodeId, String componentName, Long coaId, String coaDescription,
            String voucherClass, String voucherType, String description, String documentType,
            boolean autoVoucher, long voucherLastNo,
            String insertedBy, Instant insertedAt, String updatedBy, Instant updatedAt, long version) {}
}
