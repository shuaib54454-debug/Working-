package com.shuayb.recruitment.data

import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.CandidateExpense
import com.shuayb.recruitment.model.CandidateNoteEntry
import com.shuayb.recruitment.model.GeneralExpense
import com.shuayb.recruitment.model.PaymentRecord
import kotlinx.coroutines.flow.Flow

class RecruitmentRepository(
    private val candidateDao: CandidateDao,
    private val generalExpenseDao: GeneralExpenseDao,
    private val agencySettingsDao: AgencySettingsDao
) {
    val activeCandidates: Flow<List<Candidate>> = candidateDao.getActiveCandidates()
    val archivedCandidates: Flow<List<Candidate>> = candidateDao.getArchivedCandidates()
    val allCandidates: Flow<List<Candidate>> = candidateDao.getAllCandidates()
    val generalExpenses: Flow<List<GeneralExpense>> = generalExpenseDao.getAllExpenses()
    val settings: Flow<AgencySettings?> = agencySettingsDao.getSettings()

    suspend fun getCandidateById(id: String): Candidate? = candidateDao.getCandidateById(id)
    fun observeCandidateById(id: String): Flow<Candidate?> = candidateDao.observeCandidateById(id)

    suspend fun saveCandidate(candidate: Candidate) {
        candidateDao.insertCandidate(candidate)
    }

    suspend fun updateCandidate(candidate: Candidate) {
        candidateDao.updateCandidate(candidate)
    }

    suspend fun deleteCandidate(candidate: Candidate) {
        candidateDao.deleteCandidate(candidate)
    }

    suspend fun archiveCandidate(candidateId: String, archive: Boolean) {
        val candidate = candidateDao.getCandidateById(candidateId) ?: return
        candidateDao.updateCandidate(candidate.copy(archived = archive))
    }

    suspend fun updateCandidateStage(candidateId: String, newStage: String) {
        val candidate = candidateDao.getCandidateById(candidateId) ?: return
        candidateDao.updateCandidate(candidate.copy(stage = newStage))
    }

    suspend fun addPayment(candidateId: String, payment: PaymentRecord) {
        val candidate = candidateDao.getCandidateById(candidateId) ?: return
        val currentPayments = JsonConverters.parsePayments(candidate.paymentsJson).toMutableList()
        currentPayments.add(payment)
        val updatedJson = JsonConverters.serializePayments(currentPayments)
        candidateDao.updateCandidate(candidate.copy(paymentsJson = updatedJson))
    }

    suspend fun addCandidateExpense(candidateId: String, expense: CandidateExpense) {
        val candidate = candidateDao.getCandidateById(candidateId) ?: return
        val currentExpenses = JsonConverters.parseExpenses(candidate.expensesJson).toMutableList()
        currentExpenses.add(expense)
        val updatedJson = JsonConverters.serializeExpenses(currentExpenses)
        candidateDao.updateCandidate(candidate.copy(expensesJson = updatedJson))
    }

    suspend fun addCandidateNote(candidateId: String, note: CandidateNoteEntry) {
        val candidate = candidateDao.getCandidateById(candidateId) ?: return
        val currentNotes = JsonConverters.parseNotes(candidate.notesJson).toMutableList()
        currentNotes.add(0, note) // add to front
        val updatedJson = JsonConverters.serializeNotes(currentNotes)
        candidateDao.updateCandidate(candidate.copy(notesJson = updatedJson))
    }

    suspend fun checkDuplicate(passportNumber: String, phone: String, excludeId: String? = null): String? {
        if (passportNumber.isNotBlank()) {
            val byPass = candidateDao.findByPassport(passportNumber.trim())
            if (byPass != null && byPass.id != excludeId) {
                return "رقم جواز السفر مسجل مسبقاً للمرشح: ${byPass.fullName} (${byPass.id})"
            }
        }
        if (phone.isNotBlank()) {
            val byPhone = candidateDao.findByPhone(phone.trim())
            if (byPhone != null && byPhone.id != excludeId) {
                return "رقم الهاتف مسجل مسبقاً للمرشح: ${byPhone.fullName} (${byPhone.id})"
            }
        }
        return null
    }

    suspend fun addGeneralExpense(expense: GeneralExpense): Long {
        return generalExpenseDao.insertExpense(expense)
    }

    suspend fun deleteGeneralExpense(expense: GeneralExpense) {
        generalExpenseDao.deleteExpense(expense)
    }

    suspend fun saveSettings(settings: AgencySettings) {
        agencySettingsDao.saveSettings(settings)
    }

    suspend fun generateNextCandidateId(): String {
        val currentSettings = agencySettingsDao.getSettingsOnce() ?: SampleData.defaultSettings
        val nextNum = currentSettings.nextId
        agencySettingsDao.saveSettings(currentSettings.copy(nextId = nextNum + 1))
        return "CAND-$nextNum"
    }
}
