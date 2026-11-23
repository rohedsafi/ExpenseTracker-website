package com.example.ExpanseProject.DTO;

import java.math.BigDecimal;

public record FinancialSummary(BigDecimal totalIncome, BigDecimal totalExpense, BigDecimal netBalance)
{
}
