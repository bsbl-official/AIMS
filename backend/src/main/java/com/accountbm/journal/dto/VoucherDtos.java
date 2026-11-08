package com.accountbm.journal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class VoucherDtos {
    private VoucherDtos() {}

    public record VoucherLineRequest(
            @NotBlank String side,
            @NotBlank @Size(max=6) String l1Code, @NotBlank @Size(max=6) String l2Code,
            @NotBlank @Size(max=10) String l3Code, @NotBlank @Size(max=10) String l4Code,
            @NotBlank @Size(max=10) String l5Code,
            @Size(max=100) String particulars,
            @NotNull @DecimalMin(value="0.01") @Digits(integer=13, fraction=2) BigDecimal amount,
            @Size(max=20) String bankCode, @Size(max=20) String bankBranchCode,
            @Size(max=35) String chequeNumber, LocalDate chequeDate) {}

    public record CreateVoucherRequest(
            @NotNull UUID voucherSetupId, @NotNull LocalDate voucherDate,
            @Size(max=20) String voucherNumber,
            @NotBlank @Size(max=200) String particulars,
            @Size(max=6) String partyCode, @Size(max=100) String paidTo,
            @Size(max=35) String chequeNumber, LocalDate chequeDate,
            @Size(max=20) String bankCode, @Size(max=20) String bankBranchCode,
            @Size(max=30) String referenceBillNumber, LocalDate referenceBillDate,
            @NotEmpty @Size(max=200) List<@Valid VoucherLineRequest> lines) {}

    public record UpdateVoucherRequest(
            @NotBlank @Size(max=200) String particulars,
            @Size(max=6) String partyCode, @Size(max=100) String paidTo,
            @Size(max=35) String chequeNumber, LocalDate chequeDate,
            @Size(max=20) String bankCode, @Size(max=20) String bankBranchCode,
            @Size(max=30) String referenceBillNumber, LocalDate referenceBillDate,
            @NotEmpty @Size(max=200) List<@Valid VoucherLineRequest> lines,
            @NotNull @PositiveOrZero Long version) {}

    public record FullUpdateVoucherRequest(
            @NotBlank @Pattern(regexp="(?i)debit|credit|journal") String voucherClass,
            @NotNull UUID voucherSetupId, @NotNull LocalDate voucherDate,
            @Size(max=20) String voucherNumber,
            @NotBlank @Size(max=200) String particulars,
            @Size(max=6) String partyCode, @Size(max=100) String paidTo,
            @Size(max=35) String chequeNumber, LocalDate chequeDate,
            @Size(max=20) String bankCode, @Size(max=20) String bankBranchCode,
            @Size(max=30) String referenceBillNumber, LocalDate referenceBillDate,
            @NotEmpty @Size(max=200) List<@Valid VoucherLineRequest> lines,
            boolean removePhoto,
            @NotNull @PositiveOrZero Long version) {}

    public record VoucherLineResponse(UUID id, int lineNumber, String side, String l1Code, String l2Code,
            String l3Code, String l4Code, String l5Code, String accountHead, String particulars,
            BigDecimal amount, String bankCode, String bankBranchCode, String chequeNumber, LocalDate chequeDate) {}

    public record VoucherResponse(UUID id, UUID companyId, UUID voucherSetupId, UUID branchId,
            String branchCode, String branchName, Integer projectCodeId, String projectName,
            Integer financeCodeId, String financeName, Integer componentCodeId, String componentName,
            Long coaId, String coaDescription, String voucherNumber, LocalDate voucherDate,
            String voucherClass, String voucherType, String documentType, String particulars,
            String partyCode, String paidTo, String chequeNumber, LocalDate chequeDate,
            String bankCode, String bankBranchCode, String referenceBillNumber, LocalDate referenceBillDate,
            String status, BigDecimal totalDebit, BigDecimal totalCredit, List<VoucherLineResponse> lines,
            VoucherPhotoMetadata photo, String insertedBy, Instant insertedAt, String updatedBy, Instant updatedAt, long version) {}

    public record VoucherPhotoMetadata(String name, String contentType, int size) {}

    public record VoucherSummary(UUID id, String voucherNumber, LocalDate voucherDate, String voucherType,
            String documentType, String particulars, BigDecimal amount, String status, long version) {}

    public record CombinedVoucherSummary(UUID id, String voucherClass, String voucherNumber,
            LocalDate voucherDate, String voucherType, String documentType, String particulars,
            BigDecimal amount, String status, long version) {}

    public record VoucherSetupOption(UUID id, UUID branchId, String branchCode, String branchName,
            Integer projectCodeId, String projectName, Integer financeCodeId, String financeName,
            Integer componentCodeId, String componentName, Long coaId, String coaDescription,
            String voucherType, String documentType, String description, boolean autoVoucher) {}

    public record AccountHeadOption(Long coaId, String l1Code, String l2Code, String l3Code,
            String l4Code, String l5Code, String name) {}

    public record VoucherOptions(List<VoucherSetupOption> voucherSetups, List<AccountHeadOption> accountHeads) {}

    public record VoucherNumberPreview(String voucherNumber) {}
}
