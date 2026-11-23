package com.example.ExpanseProject.Repository;

import com.example.ExpanseProject.Model.Transaction;
import com.example.ExpanseProject.Model.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepo extends JpaRepository<Transaction, Long> {

    List<Transaction> findAllByOwner_IdOrderByDateDesc(Long ownerId);

    Optional<Transaction> findByIdAndOwner_Id(Long id, Long ownerId);

    List<Transaction> findByTypeAndOwner_Id(TransactionType type, Long ownerId);

    List<Transaction> findByDateBetweenAndOwner_Id(LocalDate startDate, LocalDate endDate, Long ownerId);

    List<Transaction> findByCategoryIgnoreCaseAndOwner_Id(String category, Long ownerId);

    List<Transaction> findByCategoryIgnoreCaseAndDateBetweenAndOwner_Id(
            String category, LocalDate startDate, LocalDate endDate, Long ownerId);

    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.type = :type AND t.owner.id = :ownerId")
    BigDecimal sumAmountByTypeAndOwnerId(@Param("type") TransactionType type, @Param("ownerId") Long ownerId);

    long deleteByIdAndOwner_Id(Long id, Long ownerId);

}
