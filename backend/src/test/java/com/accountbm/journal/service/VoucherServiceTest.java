package com.accountbm.journal.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class VoucherServiceTest {
    @Test
    void prefixesManualNumbersForEveryVoucherClass() {
        assertEquals("D20261104/01",VoucherService.normalizeNumber("debit","20261104/01"));
        assertEquals("C20261104/01",VoucherService.normalizeNumber("credit","C20261104/01"));
        assertEquals("JMANUAL-7",VoucherService.normalizeNumber("journal","manual-7"));
    }

    @Test
    void rejectsTheWrongClassPrefix() {
        assertThrows(ResponseStatusException.class,()->VoucherService.normalizeNumber("debit","C20261104/01"));
    }

    @Test
    void formatsAutomaticNumbersWithClassDateAndSequence() {
        assertEquals("D20261104/01",VoucherService.formattedNumber("D",LocalDate.of(2026,11,4),1));
        assertEquals("J20261104/12",VoucherService.formattedNumber("J",LocalDate.of(2026,11,4),12));
    }
}
