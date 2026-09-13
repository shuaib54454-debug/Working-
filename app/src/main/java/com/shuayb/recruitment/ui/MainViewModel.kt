package com.shuayb.recruitment.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shuayb.recruitment.data.AppDatabase
import com.shuayb.recruitment.data.Converters
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.data.JsonConverters
import com.shuayb.recruitment.data.RecruitmentRepository
import com.shuayb.recruitment.data.SampleData
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.CandidateExpense
import com.shuayb.recruitment.model.CandidateNoteEntry
import com.shuayb.recruitment.model.GeneralExpense
import com.shuayb.recruitment.model.PaymentRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class NavTab(val titleAr: String, val titleEn: String) {
    DASHBOARD("لوحة التحكم", "Dashboard"),
    CANDIDATES("المرشحون", "Candidates"),
    FINANCE("المالية", "Finance"),
    ARCHIVE("الأرشيف", "Archive"),
    SETTINGS("الإعدادات", "Settings")
}

data class ReceiptData(
    val receiptNumber: String,
    val candidateId: String,
    val candidateName: String,
    val amount: Double,
    val date: String,
    val paymentMethod: String,
    val note: String,
    val agencyName: String,
    val currency: String
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: RecruitmentRepository

    init {
        val db = AppDatabase.getDatabase(application, viewModelScope)
        repository = RecruitmentRepository(
            db.candidateDao(),
            db.generalExpenseDao(),
            db.agencySettingsDao()
        )
    }

    val activeCandidates: StateFlow<List<Candidate>> = repository.activeCandidates
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val archivedCandidates: StateFlow<List<Candidate>> = repository.archivedCandidates
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val generalExpenses: StateFlow<List<GeneralExpense>> = repository.generalExpenses
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val settings: StateFlow<AgencySettings> = repository.settings
        .combine(MutableStateFlow(SampleData.defaultSettings)) { s, default ->
            s ?: default
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SampleData.defaultSettings)

    private val _currentTab = MutableStateFlow(NavTab.DASHBOARD)
    val currentTab: StateFlow<NavTab> = _currentTab.asStateFlow()

    private val _selectedCandidateId = MutableStateFlow<String?>(null)
    val selectedCandidateId: StateFlow<String?> = _selectedCandidateId.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _stageFilter = MutableStateFlow<String?>(null)
    val stageFilter: StateFlow<String?> = _stageFilter.asStateFlow()

    private val _showAddCandidateDialog = MutableStateFlow(false)
    val showAddCandidateDialog: StateFlow<Boolean> = _showAddCandidateDialog.asStateFlow()

    private val _editingCandidate = MutableStateFlow<Candidate?>(null)
    val editingCandidate: StateFlow<Candidate?> = _editingCandidate.asStateFlow()

    private val _showAddExpenseDialog = MutableStateFlow(false)
    val showAddExpenseDialog: StateFlow<Boolean> = _showAddExpenseDialog.asStateFlow()

    private val _receiptData = MutableStateFlow<ReceiptData?>(null)
    val receiptData: StateFlow<ReceiptData?> = _receiptData.asStateFlow()

    private val _showPassportScanner = MutableStateFlow(false)
    val showPassportScanner: StateFlow<Boolean> = _showPassportScanner.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    fun selectTab(tab: NavTab) {
        _currentTab.value = tab
        if (tab != NavTab.CANDIDATES && tab != NavTab.ARCHIVE) {
            _selectedCandidateId.value = null
        }
    }

    fun selectCandidate(id: String?) {
        _selectedCandidateId.value = id
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setStageFilter(stage: String?) {
        _stageFilter.value = stage
    }

    fun openAddCandidateDialog() {
        _editingCandidate.value = null
        _showAddCandidateDialog.value = true
    }

    fun openEditCandidateDialog(candidate: Candidate) {
        _editingCandidate.value = candidate
        _showAddCandidateDialog.value = true
    }

    fun closeCandidateDialog() {
        _showAddCandidateDialog.value = false
        _editingCandidate.value = null
    }

    fun openAddExpenseDialog() {
        _showAddExpenseDialog.value = true
    }

    fun closeAddExpenseDialog() {
        _showAddExpenseDialog.value = false
    }

    fun openPassportScanner() {
        _showPassportScanner.value = true
    }

    fun closePassportScanner() {
        _showPassportScanner.value = false
    }

    fun showReceipt(receipt: ReceiptData) {
        _receiptData.value = receipt
    }

    fun closeReceipt() {
        _receiptData.value = null
    }

    fun clearToast() {
        _toastMessage.value = null
    }

    fun saveCandidate(candidate: Candidate, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            // Check duplicates
            val dup = repository.checkDuplicate(
                candidate.passportNumber,
                candidate.phone,
                excludeId = candidate.id
            )
            if (dup != null && _editingCandidate.value == null) {
                _toastMessage.value = dup
                onComplete(false)
                return@launch
            }

            if (_editingCandidate.value != null) {
                repository.updateCandidate(candidate)
                _toastMessage.value = "تم تحديث بيانات المرشح بنجاح"
            } else {
                repository.saveCandidate(candidate)
                _toastMessage.value = "تم تسجيل المرشح الجديد بنجاح"
            }
            closeCandidateDialog()
            onComplete(true)
        }
    }

    fun updateCandidateStage(candidateId: String, newStage: String) {
        viewModelScope.launch {
            repository.updateCandidateStage(candidateId, newStage)
            _toastMessage.value = "تم تحديث مرحلة الإجراء بنجاح"
        }
    }

    fun archiveCandidate(candidateId: String, archive: Boolean) {
        viewModelScope.launch {
            repository.archiveCandidate(candidateId, archive)
            _toastMessage.value = if (archive) "تم نقل المرشح إلى الأرشيف" else "تمت استعادة المرشح بنشاط"
            if (_selectedCandidateId.value == candidateId) {
                _selectedCandidateId.value = null
            }
        }
    }

    fun deleteCandidate(candidate: Candidate) {
        viewModelScope.launch {
            repository.deleteCandidate(candidate)
            _toastMessage.value = "تم حذف المرشح نهائياً"
            if (_selectedCandidateId.value == candidate.id) {
                _selectedCandidateId.value = null
            }
        }
    }

    fun addPayment(
        candidateId: String,
        candidateName: String,
        amount: Double,
        date: String,
        method: String,
        note: String
    ) {
        viewModelScope.launch {
            val receiptNum = "REC-${System.currentTimeMillis() % 100000}"
            val payment = PaymentRecord(
                id = "PAY-${System.currentTimeMillis()}",
                amount = amount,
                date = if (date.isNotBlank()) date else FinanceUtils.todayDate(),
                note = note,
                method = method,
                receiptNumber = receiptNum
            )
            repository.addPayment(candidateId, payment)
            _toastMessage.value = "تم تسجيل سند القبض وإضافة المبلغ بنجاح"

            // Prompt receipt
            _receiptData.value = ReceiptData(
                receiptNumber = receiptNum,
                candidateId = candidateId,
                candidateName = candidateName,
                amount = amount,
                date = payment.date,
                paymentMethod = method,
                note = note,
                agencyName = settings.value.agencyName,
                currency = settings.value.currency
            )
        }
    }

    fun addCandidateExpense(
        candidateId: String,
        amount: Double,
        date: String,
        category: String,
        note: String
    ) {
        viewModelScope.launch {
            val expense = CandidateExpense(
                id = "CEXP-${System.currentTimeMillis()}",
                amount = amount,
                date = if (date.isNotBlank()) date else FinanceUtils.todayDate(),
                category = category,
                note = note
            )
            repository.addCandidateExpense(candidateId, expense)
            _toastMessage.value = "تم تسجيل مصروف المرشح بنجاح"
        }
    }

    fun addCandidateNote(candidateId: String, text: String, author: String) {
        viewModelScope.launch {
            val entry = CandidateNoteEntry(
                id = "NOTE-${System.currentTimeMillis()}",
                date = FinanceUtils.todayDate(),
                author = if (author.isNotBlank()) author else "المشرف",
                text = text
            )
            repository.addCandidateNote(candidateId, entry)
            _toastMessage.value = "تمت إضافة الملاحظة بنجاح"
        }
    }

    fun addGeneralExpense(
        title: String,
        amount: Double,
        date: String,
        category: String,
        note: String
    ) {
        viewModelScope.launch {
            val expense = GeneralExpense(
                title = title,
                amount = amount,
                date = if (date.isNotBlank()) date else FinanceUtils.todayDate(),
                category = category,
                note = note
            )
            repository.addGeneralExpense(expense)
            closeAddExpenseDialog()
            _toastMessage.value = "تم تسجيل المصروف الإداري بنجاح"
        }
    }

    fun deleteGeneralExpense(expense: GeneralExpense) {
        viewModelScope.launch {
            repository.deleteGeneralExpense(expense)
            _toastMessage.value = "تم حذف المصروف"
        }
    }

    fun saveSettings(updatedSettings: AgencySettings) {
        viewModelScope.launch {
            repository.saveSettings(updatedSettings)
            _toastMessage.value = "تم حفظ إعدادات الوكالة بنجاح"
        }
    }

    fun resetToSampleData() {
        viewModelScope.launch {
            val db = AppDatabase.getDatabase(getApplication(), viewModelScope)
            AppDatabase.populateInitialData(db)
            _toastMessage.value = "تمت استعادة البيانات الافتراضية بنجاح"
        }
    }
}
