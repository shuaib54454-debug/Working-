package com.shuayb.recruitment.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.NoteAdd
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Unarchive
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.data.JsonConverters
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.PaymentRecord
import com.shuayb.recruitment.model.StageId
import com.shuayb.recruitment.ui.ReceiptData
import com.shuayb.recruitment.ui.components.StageBadge
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary
import com.shuayb.recruitment.ui.theme.getStageColor

@Composable
fun CandidateProfileScreen(
    candidate: Candidate,
    settings: AgencySettings,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onArchive: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onUpdateStage: (String) -> Unit,
    onAddPayment: (amount: Double, date: String, method: String, note: String) -> Unit,
    onAddExpense: (amount: Double, date: String, category: String, note: String) -> Unit,
    onAddNote: (text: String, author: String) -> Unit,
    onViewReceipt: (ReceiptData) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var stageMenuExpanded by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    var showAddPaymentDialog by remember { mutableStateOf(false) }
    var showAddExpenseDialog by remember { mutableStateOf(false) }
    var showAddNoteDialog by remember { mutableStateOf(false) }

    val fin = remember(candidate) { FinanceUtils.calculateCandidateFinance(candidate) }
    val payments = remember(candidate.paymentsJson) { JsonConverters.parsePayments(candidate.paymentsJson) }
    val candidateExpenses = remember(candidate.expensesJson) { JsonConverters.parseExpenses(candidate.expensesJson) }
    val notesList = remember(candidate.notesJson) { JsonConverters.parseNotes(candidate.notesJson) }

    val tabs = listOf(
        "البيانات والجواز",
        "المراحل والإجراءات",
        "المالية وسندات القبض",
        "الملاحظات (${notesList.size})"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top App Bar for Profile
        Surface(
            color = NavyPrimary,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "رجوع",
                        tint = Color.White
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = candidate.fullName,
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${candidate.job} • ${candidate.id}",
                        color = GoldAccent,
                        fontSize = 11.sp
                    )
                }

                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, contentDescription = "تعديل", tint = Color.White)
                }

                IconButton(onClick = { showDeleteConfirm = true }) {
                    Icon(Icons.Default.Delete, contentDescription = "حذف", tint = Color(0xFFF87171))
                }
            }
        }

        // Candidate Quick Header Card with Stage Switcher
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(NavyPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = candidate.firstName.take(1),
                                color = NavyPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Column {
                            Text(
                                text = "المرحلة الحالية:",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            StageBadge(stageStr = candidate.stage)
                        }
                    }

                    // Button to change stage
                    Box {
                        OutlinedButton(
                            onClick = { stageMenuExpanded = true },
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("تغيير المرحلة", fontSize = 11.sp)
                        }

                        DropdownMenu(
                            expanded = stageMenuExpanded,
                            onDismissRequest = { stageMenuExpanded = false }
                        ) {
                            StageId.entries.forEach { s ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = "${s.stepNumber}. ${s.label}",
                                            color = getStageColor(s.name),
                                            fontWeight = if (candidate.stage.equals(s.name, ignoreCase = true)) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    onClick = {
                                        stageMenuExpanded = false
                                        onUpdateStage(s.name)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Tab Row
        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            edgePadding = 16.dp,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = NavyPrimary
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            text = title,
                            fontSize = 12.sp,
                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                            color = if (selectedTab == index) NavyPrimary else Color.Gray
                        )
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Tab Content
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            when (selectedTab) {
                0 -> PersonalDetailsTab(candidate)
                1 -> StagesProceduresTab(candidate)
                2 -> FinancialsTab(
                    candidate = candidate,
                    fin = fin,
                    payments = payments,
                    candidateExpenses = candidateExpenses,
                    currency = settings.currency,
                    onOpenAddPayment = { showAddPaymentDialog = true },
                    onOpenAddExpense = { showAddExpenseDialog = true },
                    onViewReceipt = onViewReceipt,
                    agencyName = settings.agencyName
                )
                3 -> NotesTab(
                    notes = notesList,
                    generalNote = candidate.notes,
                    onOpenAddNote = { showAddNoteDialog = true }
                )
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("تأكيد حذف المرشح") },
            text = { Text("هل أنت متأكد من رغبتك في حذف ملف المرشح (${candidate.fullName}) نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("نعم، حذف نهائي")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("إلغاء")
                }
            }
        )
    }

    // Add Payment Dialog
    if (showAddPaymentDialog) {
        AddPaymentDialog(
            candidate = candidate,
            currency = settings.currency,
            onDismiss = { showAddPaymentDialog = false },
            onConfirm = { amount, date, method, note ->
                onAddPayment(amount, date, method, note)
                showAddPaymentDialog = false
            }
        )
    }

    // Add Candidate Expense Dialog
    if (showAddExpenseDialog) {
        AddCandidateExpenseDialog(
            candidate = candidate,
            currency = settings.currency,
            onDismiss = { showAddExpenseDialog = false },
            onConfirm = { amount, date, category, note ->
                onAddExpense(amount, date, category, note)
                showAddExpenseDialog = false
            }
        )
    }

    // Add Note Dialog
    if (showAddNoteDialog) {
        AddNoteDialog(
            onDismiss = { showAddNoteDialog = false },
            onConfirm = { text, author ->
                onAddNote(text, author)
                showAddNoteDialog = false
            }
        )
    }
}

@Composable
fun PersonalDetailsTab(candidate: Candidate) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "بيانات جواز السفر الرسمي",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    DetailRow("رقم الجواز:", candidate.passportNumber.ifBlank { "غير مسجل" }, isBold = true)
                    DetailRow("تاريخ الإصدار:", candidate.passportIssueDate.ifBlank { "غير مسجل" })
                    DetailRow("تاريخ الانتهاء:", candidate.passportExpiryDate.ifBlank { "غير مسجل" })
                    DetailRow("بلد الإصدار:", candidate.country)
                }
            }
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "البيانات الشخصية ومعلومات الاتصال",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    DetailRow("الاسم الكامل:", candidate.fullName)
                    DetailRow("النوع:", if (candidate.gender == "female") "أنثى" else "ذكر")
                    DetailRow("تاريخ الميلاد:", candidate.dateOfBirth.ifBlank { "غير مسجل" })
                    DetailRow("المهنة المطلوبة:", candidate.job)
                    DetailRow("المدينة / الإقليم:", candidate.city)
                    DetailRow("العنوان:", candidate.address.ifBlank { "غير مسجل" })
                    DetailRow("رقم الهاتف الأساسي:", candidate.phone)
                    if (candidate.secondPhone.isNotBlank()) {
                        DetailRow("رقم الهاتف الإضافي:", candidate.secondPhone)
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "بيانات الوسيط والكفيل والتعاقد",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    DetailRow("اسم الكفيل / صاحب العمل:", candidate.sponsorName.ifBlank { "قيد التعيين" })
                    DetailRow("اسم المندوب / الوسيط:", candidate.agentName.ifBlank { "مباشر من الوكالة" })
                    DetailRow("مدة العقد:", "${candidate.contractDurationYears} سنوات")
                    DetailRow("تاريخ التسجيل بالوكالة:", candidate.registrationDate.ifBlank { "اليوم" })
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun StagesProceduresTab(candidate: Candidate) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // 1. Medical Check
        item {
            ProcedureItemCard(
                title = "الفحص الطبي الشامل",
                status = candidate.medicalStatus,
                date = candidate.medicalDate,
                numberLabel = null,
                numberValue = null,
                icon = Icons.Default.LocalHospital,
                color = Color(0xFFD97706)
            )
        }

        // 2. COC Certificate
        item {
            ProcedureItemCard(
                title = "شهادة الكفاءة المهنية (COC)",
                status = candidate.cocStatus,
                date = candidate.cocIssueDate,
                numberLabel = "رقم الشهادة:",
                numberValue = candidate.cocNumber,
                icon = Icons.Default.VerifiedUser,
                color = Color(0xFF2563EB)
            )
        }

        // 3. Training
        item {
            ProcedureItemCard(
                title = "التدريب والتأهيل المنزلي",
                status = candidate.trainingStatus,
                date = null,
                numberLabel = null,
                numberValue = null,
                icon = Icons.Default.School,
                color = Color(0xFFEA580C)
            )
        }

        // 4. Visa
        item {
            ProcedureItemCard(
                title = "إصدار التأشيرة",
                status = candidate.visaStatus,
                date = null,
                numberLabel = "رقم التأشيرة:",
                numberValue = candidate.visaNumber,
                icon = Icons.Default.Receipt,
                color = Color(0xFFDB2777)
            )
        }

        // 5. Flight
        item {
            ProcedureItemCard(
                title = "حجز تذاكر الطيران",
                status = candidate.flightStatus,
                date = candidate.flightDate,
                numberLabel = "رقم التذكرة:",
                numberValue = candidate.flightTicketNumber,
                icon = Icons.Default.Flight,
                color = Color(0xFF0891B2)
            )
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun ProcedureItemCard(
    title: String,
    status: String,
    date: String?,
    numberLabel: String?,
    numberValue: String?,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
                if (!numberLabel.isNullOrBlank() && !numberValue.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "$numberLabel $numberValue",
                        fontSize = 11.sp,
                        color = Color.DarkGray
                    )
                }
                if (!date.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "التاريخ: $date",
                        fontSize = 10.sp,
                        color = Color.Gray
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(color.copy(alpha = 0.1f))
                    .border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = status.ifBlank { "لم يحدد" },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
        }
    }
}

@Composable
fun FinancialsTab(
    candidate: Candidate,
    fin: com.shuayb.recruitment.model.CandidateFinanceSummary,
    payments: List<PaymentRecord>,
    candidateExpenses: List<com.shuayb.recruitment.model.CandidateExpense>,
    currency: String,
    onOpenAddPayment: () -> Unit,
    onOpenAddExpense: () -> Unit,
    onViewReceipt: (ReceiptData) -> Unit,
    agencyName: String
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Financial Overview Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "الملخص المالي للمرشح",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    DetailRow("إجمالي أتعاب الاستقدام:", FinanceUtils.formatMoney(fin.fees, currency), isBold = true)
                    DetailRow("مستحقات الوكالة الإثيوبية:", FinanceUtils.formatMoney(fin.agencyLiability, currency))
                    DetailRow("صافي الأتعاب التعاقدية:", FinanceUtils.formatMoney(fin.netFees, currency))
                    DetailRow("إجمالي المسدد حتى الآن:", FinanceUtils.formatMoney(fin.paid, currency), color = Color(0xFF16A34A), isBold = true)
                    DetailRow("المتبقي للتحصيل:", FinanceUtils.formatMoney(fin.outstanding, currency), color = Color(0xFFD97706), isBold = true)
                    DetailRow("مصروفات مباشرة على المرشح:", FinanceUtils.formatMoney(fin.expenses, currency), color = Color(0xFFDC2626))
                    DetailRow("صافي ربح هذا المرشح:", FinanceUtils.formatMoney(fin.profit, currency), color = Color(0xFF2563EB), isBold = true)

                    Spacer(modifier = Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { fin.paymentProgress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Color(0xFF16A34A),
                        trackColor = Color(0xFFE2E8F0)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "نسبة التحصيل: ${fin.paymentProgress}%",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        modifier = Modifier.align(Alignment.End)
                    )
                }
            }
        }

        // Payments Header + Action
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "سجل المقبوضات والدفعات (${payments.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
                Button(
                    onClick = onOpenAddPayment,
                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("إضافة دفعة (سند قبض)", fontSize = 11.sp)
                }
            }
        }

        // Payments list
        if (payments.isEmpty()) {
            item {
                Text(
                    text = "لم يتم تسجيل أي دفعات مالية لهذا المرشح حتى الآن",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        } else {
            items(payments) { p ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = FinanceUtils.formatMoney(p.amount, currency),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color(0xFF16A34A)
                            )
                            Text(
                                text = "${p.date} • ${p.method} • ${p.receiptNumber}",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                            if (p.note.isNotBlank()) {
                                Text(
                                    text = p.note,
                                    fontSize = 11.sp,
                                    color = Color.DarkGray
                                )
                            }
                        }

                        OutlinedButton(
                            onClick = {
                                onViewReceipt(
                                    ReceiptData(
                                        receiptNumber = p.receiptNumber,
                                        candidateId = candidate.id,
                                        candidateName = candidate.fullName,
                                        amount = p.amount,
                                        date = p.date,
                                        paymentMethod = p.method,
                                        note = p.note,
                                        agencyName = agencyName,
                                        currency = currency
                                    )
                                )
                            },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("عرض السند", fontSize = 10.sp)
                        }
                    }
                }
            }
        }

        // Candidate Direct Expenses
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "مصروفات المرشح المباشرة (${candidateExpenses.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
                Button(
                    onClick = onOpenAddExpense,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("تسجيل مصروف", fontSize = 11.sp)
                }
            }
        }

        if (candidateExpenses.isEmpty()) {
            item {
                Text(
                    text = "لا توجد مصروفات مباشرة مسجلة على هذا المرشح",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        } else {
            items(candidateExpenses) { exp ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = exp.category,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = NavyPrimary
                            )
                            Text(
                                text = "${exp.date} • ${exp.note}",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                        }

                        Text(
                            text = FinanceUtils.formatMoney(exp.amount, currency),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFFDC2626)
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun NotesTab(
    notes: List<com.shuayb.recruitment.model.CandidateNoteEntry>,
    generalNote: String,
    onOpenAddNote: () -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        if (generalNote.isNotBlank()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, GoldAccent.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = GoldAccent.copy(alpha = 0.08f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("ملاحظات عامة مسجلة مع الملف:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(generalNote, fontSize = 12.sp, color = Color.DarkGray)
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "سجل المتابعة اليومية والتدوين",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
                Button(
                    onClick = onOpenAddNote,
                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.NoteAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("تدوين ملاحظة", fontSize = 11.sp)
                }
            }
        }

        if (notes.isEmpty()) {
            item {
                Text(
                    text = "لم يتم تدوين ملاحظات متابعة بعد",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(vertical = 12.dp)
                )
            }
        } else {
            items(notes) { entry ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = entry.author,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = NavyPrimary
                            )
                            Text(
                                text = entry.date,
                                fontSize = 10.sp,
                                color = Color.Gray
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = entry.text,
                            fontSize = 12.sp,
                            color = Color.DarkGray
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun DetailRow(label: String, value: String, isBold: Boolean = false, color: Color? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 12.sp, color = Color.Gray)
        Text(
            text = value,
            fontSize = 12.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = color ?: MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun AddPaymentDialog(
    candidate: Candidate,
    currency: String,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, date: String, method: String, note: String) -> Unit
) {
    var amountStr by remember { mutableStateOf("") }
    var dateStr by remember { mutableStateOf(FinanceUtils.todayDate()) }
    var methodStr by remember { mutableStateOf("تحويل بنكي") }
    var noteStr by remember { mutableStateOf("دفعة رسوم استقدام") }

    val methods = listOf("تحويل بنكي", "كاش", "شيك", "أخرى")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تسجيل سند قبض جديد للمرشح") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("المرشح: ${candidate.fullName} (${candidate.id})", fontSize = 12.sp, color = NavyPrimary, fontWeight = FontWeight.Bold)

                OutlinedTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = { Text("المبلغ ($currency)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = dateStr,
                    onValueChange = { dateStr = it },
                    label = { Text("تاريخ السند (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text("طريقة الدفع:", fontSize = 11.sp, color = Color.Gray)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    methods.forEach { m ->
                        val selected = methodStr == m
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) NavyPrimary else Color(0xFFF1F5F9))
                                .clickable { methodStr = m }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Text(m, fontSize = 11.sp, color = if (selected) Color.White else Color.Black)
                        }
                    }
                }

                OutlinedTextField(
                    value = noteStr,
                    onValueChange = { noteStr = it },
                    label = { Text("البيان / ملاحظة") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountStr.toDoubleOrNull() ?: 0.0
                    if (amt > 0) {
                        onConfirm(amt, dateStr, methodStr, noteStr)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary)
            ) {
                Text("حفظ وإصدار السند")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}

@Composable
fun AddCandidateExpenseDialog(
    candidate: Candidate,
    currency: String,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, date: String, category: String, note: String) -> Unit
) {
    var amountStr by remember { mutableStateOf("") }
    var dateStr by remember { mutableStateOf(FinanceUtils.todayDate()) }
    var categoryStr by remember { mutableStateOf("فحص طبي") }
    var noteStr by remember { mutableStateOf("") }

    val categories = listOf("فحص طبي", "تأشيرة", "تدريب", "تذكرة طيران", "إداري", "عمولة وسيط", "أخرى")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تسجيل مصروف مباشر على المرشح") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = { Text("المبلغ ($currency)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = dateStr,
                    onValueChange = { dateStr = it },
                    label = { Text("التاريخ (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text("بند المصروف:", fontSize = 11.sp, color = Color.Gray)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    categories.take(4).forEach { cat ->
                        val selected = categoryStr == cat
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) Color(0xFFDC2626) else Color(0xFFF1F5F9))
                                .clickable { categoryStr = cat }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Text(cat, fontSize = 11.sp, color = if (selected) Color.White else Color.Black)
                        }
                    }
                }

                OutlinedTextField(
                    value = noteStr,
                    onValueChange = { noteStr = it },
                    label = { Text("تفاصيل وبيان المصروف") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountStr.toDoubleOrNull() ?: 0.0
                    if (amt > 0) {
                        onConfirm(amt, dateStr, categoryStr, noteStr)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
            ) {
                Text("تسجيل المصروف")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}

@Composable
fun AddNoteDialog(
    onDismiss: () -> Unit,
    onConfirm: (text: String, author: String) -> Unit
) {
    var textStr by remember { mutableStateOf("") }
    var authorStr by remember { mutableStateOf("المشرف") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تدوين ملاحظة في ملف المتابعة") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = authorStr,
                    onValueChange = { authorStr = it },
                    label = { Text("اسم المدون / المشرف") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = textStr,
                    onValueChange = { textStr = it },
                    label = { Text("نص الملاحظة") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (textStr.isNotBlank()) {
                        onConfirm(textStr, authorStr)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary)
            ) {
                Text("حفظ الملاحظة")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}
