package com.accountbm.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class DashboardServiceTest {
    @Test
    void buildsAnEqualLengthComparisonRange() {
        var range = DashboardService.dates(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 9), "Asia/Dhaka");
        assertEquals(LocalDate.of(2026, 10, 23), range.comparisonFrom());
        assertEquals(LocalDate.of(2026, 10, 31), range.comparisonTo());
    }

    @Test
    void rejectsPartialReversedAndOversizedRanges() {
        assertThrows(ResponseStatusException.class,
                () -> DashboardService.dates(LocalDate.of(2026, 11, 1), null, "UTC"));
        assertThrows(ResponseStatusException.class,
                () -> DashboardService.dates(LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 1), "UTC"));
        assertThrows(ResponseStatusException.class,
                () -> DashboardService.dates(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 2), "UTC"));
    }

    @Test
    void calculatesComparablePercentageAndAvoidsZeroBaseline() {
        assertEquals(new BigDecimal("25.00"),
                DashboardService.percentage(new BigDecimal("125"), new BigDecimal("100")));
        assertEquals(new BigDecimal("-25.00"),
                DashboardService.percentage(new BigDecimal("75"), new BigDecimal("100")));
        assertNull(DashboardService.percentage(BigDecimal.TEN, BigDecimal.ZERO));
    }
}
