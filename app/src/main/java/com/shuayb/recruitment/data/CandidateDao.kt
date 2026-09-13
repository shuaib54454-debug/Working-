package com.shuayb.recruitment.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.shuayb.recruitment.model.Candidate
import kotlinx.coroutines.flow.Flow

@Dao
interface CandidateDao {
    @Query("SELECT * FROM candidates WHERE archived = 0 ORDER BY id DESC")
    fun getActiveCandidates(): Flow<List<Candidate>>

    @Query("SELECT * FROM candidates WHERE archived = 1 ORDER BY id DESC")
    fun getArchivedCandidates(): Flow<List<Candidate>>

    @Query("SELECT * FROM candidates ORDER BY id DESC")
    fun getAllCandidates(): Flow<List<Candidate>>

    @Query("SELECT * FROM candidates WHERE id = :id LIMIT 1")
    suspend fun getCandidateById(id: String): Candidate?

    @Query("SELECT * FROM candidates WHERE id = :id LIMIT 1")
    fun observeCandidateById(id: String): Flow<Candidate?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCandidate(candidate: Candidate)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCandidates(candidates: List<Candidate>)

    @Update
    suspend fun updateCandidate(candidate: Candidate)

    @Delete
    suspend fun deleteCandidate(candidate: Candidate)

    @Query("DELETE FROM candidates WHERE id = :id")
    suspend fun deleteCandidateById(id: String)

    @Query("SELECT COUNT(*) FROM candidates")
    suspend fun getCandidateCount(): Int

    @Query("SELECT * FROM candidates WHERE passportNumber = :passportNumber LIMIT 1")
    suspend fun findByPassport(passportNumber: String): Candidate?

    @Query("SELECT * FROM candidates WHERE phone = :phone LIMIT 1")
    suspend fun findByPhone(phone: String): Candidate?
}
