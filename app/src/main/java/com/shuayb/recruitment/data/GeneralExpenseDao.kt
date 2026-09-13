package com.shuayb.recruitment.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.shuayb.recruitment.model.GeneralExpense
import kotlinx.coroutines.flow.Flow

@Dao
interface GeneralExpenseDao {
    @Query("SELECT * FROM general_expenses ORDER BY date DESC, id DESC")
    fun getAllExpenses(): Flow<List<GeneralExpense>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpense(expense: GeneralExpense): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpenses(expenses: List<GeneralExpense>)

    @Delete
    suspend fun deleteExpense(expense: GeneralExpense)

    @Query("DELETE FROM general_expenses WHERE id = :id")
    suspend fun deleteExpenseById(id: Long)

    @Query("SELECT COUNT(*) FROM general_expenses")
    suspend fun getExpenseCount(): Int
}
