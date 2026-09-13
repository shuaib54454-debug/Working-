package com.shuayb.recruitment

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.ui.MainViewModel
import com.shuayb.recruitment.ui.NavTab
import com.shuayb.recruitment.ui.components.PassportScannerDialog
import com.shuayb.recruitment.ui.components.ReceiptDialog
import com.shuayb.recruitment.ui.components.ScannedPassportData
import com.shuayb.recruitment.ui.screens.AddCandidateDialog
import com.shuayb.recruitment.ui.screens.AddGeneralExpenseDialog
import com.shuayb.recruitment.ui.screens.ArchiveScreen
import com.shuayb.recruitment.ui.screens.CandidateListScreen
import com.shuayb.recruitment.ui.screens.CandidateProfileScreen
import com.shuayb.recruitment.ui.screens.DashboardScreen
import com.shuayb.recruitment.ui.screens.FinanceScreen
import com.shuayb.recruitment.ui.screens.SettingsScreen
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary
import com.shuayb.recruitment.ui.theme.ShuaybRecruitmentTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ShuaybRecruitmentTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    RecruitmentApp()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecruitmentApp(viewModel: MainViewModel = viewModel()) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    val activeCandidates by viewModel.activeCandidates.collectAsStateWithLifecycle()
    val archivedCandidates by viewModel.archivedCandidates.collectAsStateWithLifecycle()
    val generalExpenses by viewModel.generalExpenses.collectAsStateWithLifecycle()
    val settings by viewModel.settings.collectAsStateWithLifecycle()

    val currentTab by viewModel.currentTab.collectAsStateWithLifecycle()
    val selectedCandidateId by viewModel.selectedCandidateId.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val stageFilter by viewModel.stageFilter.collectAsStateWithLifecycle()

    val showAddCandidateDialog by viewModel.showAddCandidateDialog.collectAsStateWithLifecycle()
    val editingCandidate by viewModel.editingCandidate.collectAsStateWithLifecycle()
    val showAddExpenseDialog by viewModel.showAddExpenseDialog.collectAsStateWithLifecycle()
    val receiptData by viewModel.receiptData.collectAsStateWithLifecycle()
    val showPassportScanner by viewModel.showPassportScanner.collectAsStateWithLifecycle()
    val toastMessage by viewModel.toastMessage.collectAsStateWithLifecycle()

    LaunchedEffect(toastMessage) {
        toastMessage?.let { msg ->
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    // Check if candidate profile is selected
    val selectedCandidate = remember(selectedCandidateId, activeCandidates, archivedCandidates) {
        if (selectedCandidateId == null) null
        else activeCandidates.find { it.id == selectedCandidateId }
            ?: archivedCandidates.find { it.id == selectedCandidateId }
    }

    if (selectedCandidate != null) {
        CandidateProfileScreen(
            candidate = selectedCandidate,
            settings = settings,
            onBack = { viewModel.selectCandidate(null) },
            onEdit = { viewModel.openEditCandidateDialog(selectedCandidate) },
            onArchive = { archive -> viewModel.archiveCandidate(selectedCandidate.id, archive) },
            onDelete = { viewModel.deleteCandidate(selectedCandidate) },
            onUpdateStage = { newStage -> viewModel.updateCandidateStage(selectedCandidate.id, newStage) },
            onAddPayment = { amount, date, method, note ->
                viewModel.addPayment(
                    candidateId = selectedCandidate.id,
                    candidateName = selectedCandidate.fullName,
                    amount = amount,
                    date = date,
                    method = method,
                    note = note
                )
            },
            onAddExpense = { amount, date, category, note ->
                viewModel.addCandidateExpense(
                    candidateId = selectedCandidate.id,
                    amount = amount,
                    date = date,
                    category = category,
                    note = note
                )
            },
            onAddNote = { text, author ->
                viewModel.addCandidateNote(
                    candidateId = selectedCandidate.id,
                    text = text,
                    author = author
                )
            },
            onViewReceipt = { receipt -> viewModel.showReceipt(receipt) }
        )
    } else {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(GoldAccent),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Work,
                                    contentDescription = null,
                                    tint = NavyDark,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = settings.agencyName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = currentTab.titleAr,
                                    fontSize = 11.sp,
                                    color = GoldAccent
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = NavyPrimary,
                        titleContentColor = Color.White
                    )
                )
            },
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp
                ) {
                    val tabs = listOf(
                        Triple(NavTab.DASHBOARD, Icons.Default.Dashboard, "الرئيسية"),
                        Triple(NavTab.CANDIDATES, Icons.Default.People, "المرشحون"),
                        Triple(NavTab.FINANCE, Icons.Default.AccountBalanceWallet, "المالية"),
                        Triple(NavTab.ARCHIVE, Icons.Default.Archive, "الأرشيف"),
                        Triple(NavTab.SETTINGS, Icons.Default.Settings, "الإعدادات")
                    )

                    tabs.forEach { (tab, icon, label) ->
                        val selected = currentTab == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { viewModel.selectTab(tab) },
                            icon = {
                                if (tab == NavTab.CANDIDATES && activeCandidates.isNotEmpty()) {
                                    BadgedBox(badge = { Badge { Text("${activeCandidates.size}") } }) {
                                        Icon(icon, contentDescription = label)
                                    }
                                } else {
                                    Icon(icon, contentDescription = label)
                                }
                            },
                            label = {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = NavyDark,
                                indicatorColor = GoldAccent,
                                selectedTextColor = NavyPrimary,
                                unselectedIconColor = Color.Gray,
                                unselectedTextColor = Color.Gray
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                when (currentTab) {
                    NavTab.DASHBOARD -> {
                        DashboardScreen(
                            candidates = activeCandidates,
                            expenses = generalExpenses,
                            settings = settings,
                            onNavigateTab = { tab -> viewModel.selectTab(tab) },
                            onSelectCandidate = { id -> viewModel.selectCandidate(id) },
                            onOpenAddCandidate = { viewModel.openAddCandidateDialog() },
                            onOpenAddExpense = { viewModel.openAddExpenseDialog() },
                            onOpenPassportScanner = { viewModel.openPassportScanner() }
                        )
                    }
                    NavTab.CANDIDATES -> {
                        CandidateListScreen(
                            candidates = activeCandidates,
                            settings = settings,
                            searchQuery = searchQuery,
                            stageFilter = stageFilter,
                            onSearchChange = { q -> viewModel.setSearchQuery(q) },
                            onStageFilterChange = { s -> viewModel.setStageFilter(s) },
                            onSelectCandidate = { id -> viewModel.selectCandidate(id) },
                            onOpenAddCandidate = { viewModel.openAddCandidateDialog() },
                            onEditCandidate = { candidate -> viewModel.openEditCandidateDialog(candidate) },
                            onArchiveCandidate = { id, arch -> viewModel.archiveCandidate(id, arch) }
                        )
                    }
                    NavTab.FINANCE -> {
                        FinanceScreen(
                            candidates = activeCandidates,
                            generalExpenses = generalExpenses,
                            settings = settings,
                            onOpenAddGeneralExpense = { viewModel.openAddExpenseDialog() },
                            onDeleteGeneralExpense = { exp -> viewModel.deleteGeneralExpense(exp) },
                            onSelectCandidate = { id -> viewModel.selectCandidate(id) }
                        )
                    }
                    NavTab.ARCHIVE -> {
                        ArchiveScreen(
                            archivedCandidates = archivedCandidates,
                            onSelectCandidate = { id -> viewModel.selectCandidate(id) },
                            onRestoreCandidate = { id -> viewModel.archiveCandidate(id, false) },
                            onDeleteCandidate = { c -> viewModel.deleteCandidate(c) }
                        )
                    }
                    NavTab.SETTINGS -> {
                        SettingsScreen(
                            settings = settings,
                            onSaveSettings = { s -> viewModel.saveSettings(s) },
                            onResetData = { viewModel.resetToSampleData() }
                        )
                    }
                }
            }
        }
    }

    // Add / Edit Candidate Dialog
    if (showAddCandidateDialog) {
        AddCandidateDialog(
            initialCandidate = editingCandidate,
            currency = settings.currency,
            onDismiss = { viewModel.closeCandidateDialog() },
            onOpenScanner = {
                viewModel.closeCandidateDialog()
                viewModel.openPassportScanner()
            },
            onSave = { candidate ->
                viewModel.saveCandidate(candidate) { success ->
                    if (success && currentTab != NavTab.CANDIDATES) {
                        viewModel.selectTab(NavTab.CANDIDATES)
                    }
                }
            }
        )
    }

    // Add General Expense Dialog
    if (showAddExpenseDialog) {
        AddGeneralExpenseDialog(
            currency = settings.currency,
            onDismiss = { viewModel.closeAddExpenseDialog() },
            onConfirm = { title, amount, date, category, note ->
                viewModel.addGeneralExpense(title, amount, date, category, note)
            }
        )
    }

    // Official Receipt Voucher Dialog
    receiptData?.let { receipt ->
        ReceiptDialog(
            receipt = receipt,
            onDismiss = { viewModel.closeReceipt() }
        )
    }

    // Smart Passport Scanner Dialog
    if (showPassportScanner) {
        PassportScannerDialog(
            onDismiss = { viewModel.closePassportScanner() },
            onApplyScannedData = { scanned ->
                val prefilled = Candidate(
                    id = "CAND-${System.currentTimeMillis() % 100000}",
                    firstName = scanned.firstName,
                    lastName = scanned.lastName,
                    phone = "+251911" + (100000..999999).random(),
                    secondPhone = "",
                    gender = scanned.gender,
                    dateOfBirth = scanned.dateOfBirth,
                    city = "أديس أبابا",
                    address = "بولي، أديس أبابا",
                    job = if (scanned.gender == "female") "عاملة منزلية" else "سائق خاص",
                    country = scanned.country,
                    passportNumber = scanned.passportNumber,
                    passportIssueDate = "2024-01-10",
                    passportExpiryDate = scanned.expiryDate,
                    stage = "NEW",
                    totalFees = 95000.0,
                    agencyLiability = 25000.0,
                    notes = "تم إدخال البيانات ومسحها ضوئياً عبر ماسح الجوازات الذكي"
                )
                viewModel.openEditCandidateDialog(prefilled)
            }
        )
    }
}
