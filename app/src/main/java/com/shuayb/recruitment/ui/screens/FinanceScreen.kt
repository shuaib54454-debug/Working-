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
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.GeneralExpense
import com.shuayb.recruitment.ui.components.StatCard
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary

@Composable
fun FinanceScreen(
    candidates: List<Candidate>,
    generalExpenses: List<GeneralExpense>,
    settings: AgencySettings,
    onOpenAddGeneralExpense: () -> Unit,
    onDeleteGeneralExpense: (GeneralExpense) -> Unit,
    onSelectCandidate: (String) -> Unit
) {
    var selectedSection by remember { mutableIntStateOf(0) }
    val sections = listOf("المصروفات التشغيلية", "تحصيلات المرشحين", "مستحقات الوكالة")

    // Calculations
    var totalCollected = 0.0
    var totalCandidateExpenses = 0.0
    var totalFeesContracted = 0.0
    var totalAgencyLiability = 0.0

    candidates.forEach { c ->
        val fin = FinanceUtils.calculateCandidateFinance(c)
        totalCollected += fin.paid
        totalCandidateExpenses += fin.expenses
        totalFeesContracted += fin.fees
        totalAgencyLiability += fin.agencyLiability
    }

    val totalGeneralExpenses = generalExpenses.sumOf { it.amount }
    val totalExpensesCombined = totalCandidateExpenses + totalGeneralExpenses
    val netProfit = totalCollected - totalExpensesCombined
    val totalOutstanding = (totalFeesContracted - totalCollected).coerceAtLeast(0.0)

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "الإدارة المالية والمحاسبة المركزية",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
            }

            // Stat Cards Grid
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        StatCard(
                            title = "إجمالي المقبوضات",
                            value = FinanceUtils.formatMoney(totalCollected, settings.currency),
                            icon = Icons.Default.Payments,
                            accentColor = Color(0xFF16A34A),
                            subtitle = "سندات قبض معتمدة",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "صافي الربح الفعلي",
                            value = FinanceUtils.formatMoney(netProfit, settings.currency),
                            icon = Icons.AutoMirrored.Filled.TrendingUp,
                            accentColor = if (netProfit >= 0) Color(0xFF2563EB) else Color(0xFFDC2626),
                            subtitle = "بعد جميع المصروفات",
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        StatCard(
                            title = "إجمالي المصروفات",
                            value = FinanceUtils.formatMoney(totalExpensesCombined, settings.currency),
                            icon = Icons.Default.TrendingDown,
                            accentColor = Color(0xFFDC2626),
                            subtitle = "تشغيلية + مرشحين",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "مستحقات تحت التحصيل",
                            value = FinanceUtils.formatMoney(totalOutstanding, settings.currency),
                            icon = Icons.Default.ReceiptLong,
                            accentColor = Color(0xFFD97706),
                            subtitle = "أقساط عقود متبقية",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Sub Navigation Tabs
            item {
                ScrollableTabRow(
                    selectedTabIndex = selectedSection,
                    edgePadding = 0.dp,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = NavyPrimary
                ) {
                    sections.forEachIndexed { index, label ->
                        Tab(
                            selected = selectedSection == index,
                            onClick = { selectedSection = index },
                            text = {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = if (selectedSection == index) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selectedSection == index) NavyPrimary else Color.Gray
                                )
                            }
                        )
                    }
                }
            }

            when (selectedSection) {
                0 -> {
                    // General Operating Expenses
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "المصروفات العامة والإدارية (${generalExpenses.size})",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary
                            )
                            Button(
                                onClick = onOpenAddGeneralExpense,
                                colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("تسجيل مصروف عام", fontSize = 11.sp)
                            }
                        }
                    }

                    if (generalExpenses.isEmpty()) {
                        item {
                            Text(
                                text = "لا توجد مصروفات إدارية عامة مسجلة بعد",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(vertical = 12.dp)
                            )
                        }
                    } else {
                        items(generalExpenses) { exp ->
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
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = exp.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = NavyPrimary
                                        )
                                        Text(
                                            text = "${exp.category} • ${exp.date}",
                                            fontSize = 11.sp,
                                            color = Color.Gray
                                        )
                                        if (exp.note.isNotBlank()) {
                                            Text(
                                                text = exp.note,
                                                fontSize = 11.sp,
                                                color = Color.DarkGray
                                            )
                                        }
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = FinanceUtils.formatMoney(exp.amount, settings.currency),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color(0xFFDC2626)
                                        )

                                        IconButton(onClick = { onDeleteGeneralExpense(exp) }) {
                                            Icon(Icons.Default.Delete, contentDescription = "حذف", tint = Color.LightGray)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // Candidate Collections Overview
                    item {
                        Text(
                            text = "سجل تحصيلات المرشحين والمتبقي",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = NavyPrimary
                        )
                    }

                    items(candidates) { candidate ->
                        val fin = FinanceUtils.calculateCandidateFinance(candidate)
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectCandidate(candidate.id) }
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
                                        text = candidate.fullName,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = NavyPrimary
                                    )
                                    Text(
                                        text = "المسدد: ${FinanceUtils.formatMoney(fin.paid, settings.currency)}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFF16A34A)
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "إجمالي العقد: ${FinanceUtils.formatMoney(fin.fees, settings.currency)}",
                                        fontSize = 11.sp,
                                        color = Color.Gray
                                    )
                                    Text(
                                        text = "المتبقي: ${FinanceUtils.formatMoney(fin.outstanding, settings.currency)}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (fin.outstanding > 0) Color(0xFFD97706) else Color.Gray
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                LinearProgressIndicator(
                                    progress = { fin.paymentProgress / 100f },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = Color(0xFF16A34A),
                                    trackColor = Color(0xFFE2E8F0)
                                )
                            }
                        }
                    }
                }
                2 -> {
                    // Agency Liability & Partner Settlement
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, GoldAccent.copy(alpha = 0.5f), RoundedCornerShape(14.dp)),
                            colors = CardDefaults.cardColors(containerColor = GoldAccent.copy(alpha = 0.08f)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "إجمالي مستحقات وكالات ومكاتب إثيوبيا الشريكة",
                                    fontSize = 12.sp,
                                    color = NavyDark,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = FinanceUtils.formatMoney(totalAgencyLiability, settings.currency),
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = NavyPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "تمثل الرسوم المستحقة للشركاء الإثيوبيين لإنجاز إجراءات الفحص والتدريب والتوثيق الحكومي",
                                    fontSize = 11.sp,
                                    color = Color.DarkGray
                                )
                            }
                        }
                    }

                    items(candidates) { candidate ->
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
                                        text = candidate.fullName,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = NavyPrimary
                                    )
                                    Text(
                                        text = "الوسيط: ${candidate.agentName.ifBlank { "مكتب شريك معتمد" }}",
                                        fontSize = 11.sp,
                                        color = Color.Gray
                                    )
                                }
                                Text(
                                    text = FinanceUtils.formatMoney(candidate.agencyLiability, settings.currency),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = NavyPrimary
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(90.dp))
            }
        }
    }
}
