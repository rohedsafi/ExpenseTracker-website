package com.example.ExpanseProject.Controller;

import com.example.ExpanseProject.DTO.FinancialSummary;
import com.example.ExpanseProject.Model.AppUser;
import com.example.ExpanseProject.Model.Transaction;
import com.example.ExpanseProject.Model.TransactionType;
import com.example.ExpanseProject.Service.AppUserService;
import com.example.ExpanseProject.Service.TransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class expanceController {

    private final TransactionService service;
    private final AppUserService appUserService;

    public expanceController(TransactionService service, AppUserService appUserService) {
        this.service = service;
        this.appUserService = appUserService;
    }

    @PostMapping("/transactions")
    public ResponseEntity<Transaction> addTransaction(@RequestBody Transaction transaction,
                                                      @AuthenticationPrincipal UserDetails principal) {
        transaction.setId(null);
        transaction.setOwner(owner(principal));
        return new ResponseEntity<>(service.addTransactions(transaction),
                HttpStatus.CREATED);
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getAllTransactions(@AuthenticationPrincipal UserDetails principal) {
        return new ResponseEntity<>(service.getAllTransactions(owner(principal)),
                HttpStatus.OK);
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserDetails principal) {
        Transaction transaction = service.getTransactionById(id, owner(principal));
        if (transaction != null) {
            return new ResponseEntity<>(transaction, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/transactions/type/{type}")
    public ResponseEntity<List<Transaction>> getTransactionsByType(
            @PathVariable TransactionType type, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(service.getTransactionsByType(type, owner(principal)));
    }

    @GetMapping("/transactions/filter")
    public ResponseEntity<List<Transaction>> getTransactionsByCategoryAndDateRange(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(service.getTansactionsByCategoryAndDateRange(
                category, startDate, endDate, owner(principal)));
    }

    @GetMapping("/transactions/summary")
    public ResponseEntity<FinancialSummary> getTransactionSummary(
            @AuthenticationPrincipal UserDetails principal) {
        return new ResponseEntity<>(service.getTransactionSummary(owner(principal)), HttpStatus.OK);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id,
                                                  @AuthenticationPrincipal UserDetails principal) {
        AppUser owner = owner(principal);
        Transaction transaction = service.getTransactionById(id, owner);
        if (transaction != null) {
            service.deleteTransaction(id, owner);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    private AppUser owner(UserDetails principal) {
        return appUserService.findByEmail(principal.getUsername());
    }

}
