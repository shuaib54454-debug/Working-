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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.FlightTakeoff
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.data.JsonConverters
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.GeneralExpense
import com.shuayb.recruitment.model.StageId
import com.shuayb.recruitment.ui.NavTab
import com.shuayb.recruitment.ui.components.StageBadge
import com.shuayb.recruitment.ui.components.StatCard
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary
import com.shuayb.recruitment.ui.theme.getStageColor

@Composable
fun DashboardScreen(
    candidates: List<Candidate>,
    expenses: List<GeneralExpense>,
    settings: AgencySettings,
    onNavigateTab: (NavTab) -> Unit,
    onSelectCandidate: (String) -> Unit,
    onOpenAddCandidate: () -> Unit,
    onOpenAddExpense: () -> Unit,
    onOpenPassportScanner: () -> Unit
) {
    // Computations
    val totalCandidates = candidates.size
    val activeInPipeline = candidates.count { it.stage != "TRAVELLED" && it.stage != "COMPLETED" && it.stage != "CANCELLED" }
    val travelledCount = candidates.count { it.stage == "TRAVELLED" || it.stage == "COMPLETED" }

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

    val totalGeneralExpenses = expenses.sumOf { it.amount }
    val totalOverallExpenses = totalCandidateExpenses + totalGeneralExpenses
    val netProfit = totalCollected - totalOverallExpenses
    val totalOutstanding = (totalFeesContracted - totalCollected).coerceAtLeast(0.0)

    // Stage distribution
    val stageCounts = remember(candidates) {
        StageId.entries.map { stage ->
            stage to candidates.count { it.stage.equals(stage.name, ignoreCase = true) }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
            // Hero Brand Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(NavyPrimary, NavyDark)
                        )
                    )
                    .border(1.dp, GoldAccent.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(GoldAccent),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Work,
                                    contentDescription = null,
                                    tint = NavyDark,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = settings.agencyName,
                                    color = Color.White,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "نظام استقدام الكفاءات والتبادل التجاري الإثيوبي",
                                    color = GoldAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.White.copy(alpha = 0.1f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = FinanceUtils.todayDate(),
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Quick Action Buttons in Banner
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onOpenAddCandidate,
                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PersonAdd, contentDescription = null, tint = NavyDark, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("إضافة مرشح", color = NavyDark, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = onOpenPassportScanner,
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.15f)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.DocumentScanner, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("مسح جواز", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Executive Financial Stat Cards
        item {
            Text(
                text = "المؤشرات المالية الرئيسية",
                style = MaterialTheme.typography.titleMedium,
                color = NavyPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

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
                        subtitle = "من سندات قبض المرشحين",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "صافي الأرباح",
                        value = FinanceUtils.formatMoney(netProfit, settings.currency),
                        icon = Icons.AutoMirrored.Filled.TrendingUp,
                        accentColor = if (netProfit >= 0) Color(0xFF2563EB) else Color(0xFFDC2626),
                        subtitle = "بعد خصم كافة المصروفات",
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    StatCard(
                        title = "المصروفات الكلية",
                        value = FinanceUtils.formatMoney(totalOverallExpenses, settings.currency),
                        icon = Icons.Default.TrendingDown,
                        accentColor = Color(0xFFDC2626),
                        subtitle = "مرشحين + إدارية",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "أقساط متبقية للتحصيل",
                        value = FinanceUtils.formatMoney(totalOutstanding, settings.currency),
                        icon = Icons.Default.AccountBalanceWallet,
                        accentColor = Color(0xFFD97706),
                        subtitle = "مستحقات على الكفلاء",
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Candidate Pipeline Summary Cards
        item {
            Text(
                text = "حالة مسار استقدام الكفاءات",
                style = MaterialTheme.typography.titleMedium,
                color = NavyPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("إجمالي المرشحين", fontSize = 11.sp, color = Color.Gray)
                        Text("$totalCandidates", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                        Text("في قاعدة البيانات", fontSize = 9.sp, color = Color.Gray)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("قيد الإجراءات", fontSize = 11.sp, color = Color.Gray)
                        Text("$activeInPipeline", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
                        Text("فحص / تدريب / تأشيرة", fontSize = 9.sp, color = Color.Gray)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("سافروا بنجاح", fontSize = 11.sp, color = Color.Gray)
                        Text("$travelledCount", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        Text("اكتملت إجراءاتهم", fontSize = 9.sp, color = Color.Gray)
                    }
                }
            }
        }

        // Stage Funnel Distribution
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "توزيع المرشحين حسب مراحل الاستقدام (11 مرحلة)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = NavyPrimary
                        )
                        Text(
                            text = "عرض الكل",
                            fontSize = 11.sp,
                            color = GoldAccent,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { onNavigateTab(NavTab.CANDIDATES) }
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    stageCounts.filter { it.second > 0 }.forEach { (stage, count) ->
                        val color = getStageColor(stage.name)
                        val fraction = if (totalCandidates > 0) count.toFloat() / totalCandidates else 0f

                        Column(modifier = Modifier.padding(vertical = 4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${stage.stepNumber}. ${stage.label}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "$count مرشح",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = color
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { fraction },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = color,
                                trackColor = color.copy(alpha = 0.15f)
                            )
                        }
                    }

                    if (stageCounts.all { it.second == 0 }) {
                        Text(
                            text = "لا توجد بيانات مرشحين حالياً",
                            color = Color.Gray,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }

        // Recent Candidates section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "أحدث المرشحين المسجلين",
                    style = MaterialTheme.typography.titleMedium,
                    color = NavyPrimary,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "قائمة المرشحين",
                    fontSize = 12.sp,
                    color = GoldAccent,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateTab(NavTab.CANDIDATES) }
                )
            }
        }

        items(candidates.take(4)) { candidate ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectCandidate(candidate.id) }
                    .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(NavyPrimary.copy(alpha = 0.08f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = candidate.firstName.take(1),
                                color = NavyPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = candidate.fullName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${candidate.job} • ${candidate.id}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        StageBadge(stageStr = candidate.stage)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = FinanceUtils.formatMoney(candidate.totalFees, settings.currency),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = NavyPrimary
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
