package com.example.ExpanseProject.Service;

import com.example.ExpanseProject.DTO.FinancialSummary;
import com.example.ExpanseProject.Model.AppUser;
import com.example.ExpanseProject.Model.Transaction;
import com.example.ExpanseProject.Model.TransactionType;
import com.example.ExpanseProject.Repository.TransactionRepo;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class TransactionService {
    private final TransactionRepo transactionRepo;

    public TransactionService(TransactionRepo transactionRepo) {
        this.transactionRepo = transactionRepo;
    }

   public Transaction addTransactions(Transaction transaction) {
       return transactionRepo.save(transaction);
   }


   public List<Transaction> getAllTransactions(AppUser owner) {
       return transactionRepo.findAllByOwner_IdOrderByDateDesc(owner.getId());
   }

    public Transaction getTransactionById(Long id, AppUser owner) {
        return transactionRepo.findByIdAndOwner_Id(id, owner.getId()).orElse(null);
    }

    public List<Transaction> getTansactionsByCategoryAndDateRange(
            String category, LocalDate startDate, LocalDate endDate, AppUser owner) {
       if(category != null && startDate != null && endDate != null) {
           return transactionRepo.findByCategoryIgnoreCaseAndDateBetweenAndOwner_Id(category, startDate, endDate, owner.getId());
       } else if (category != null) {
           return transactionRepo.findByCategoryIgnoreCaseAndOwner_Id(category, owner.getId());
       } else if (startDate != null && endDate != null) {
           return transactionRepo.findByDateBetweenAndOwner_Id(startDate, endDate, owner.getId());
       } else {
           return transactionRepo.findAllByOwner_IdOrderByDateDesc(owner.getId());
       }

    }

    @Transactional
    public void deleteTransaction(Long id, AppUser owner) {
        transactionRepo.deleteByIdAndOwner_Id(id, owner.getId());
    }

    public FinancialSummary getTransactionSummary(AppUser owner) {
        BigDecimal totalIncome = transactionRepo.sumAmountByTypeAndOwnerId(TransactionType.INCOME, owner.getId());
        BigDecimal totalExpense = transactionRepo.sumAmountByTypeAndOwnerId(TransactionType.EXPENSE, owner.getId());
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;
        BigDecimal netBalance = totalIncome.subtract(totalExpense);
        return new FinancialSummary(totalIncome, totalExpense, netBalance);
    }


    public List<Transaction> getTransactionsByType(TransactionType type, AppUser owner) {
       return transactionRepo.findByTypeAndOwner_Id(type, owner.getId());
    }
}
