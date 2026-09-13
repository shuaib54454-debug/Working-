package com.shuayb.recruitment.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
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
import androidx.compose.ui.window.Dialog
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.StageId
import com.shuayb.recruitment.ui.components.ScannedPassportData
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary

@Composable
fun AddCandidateDialog(
    initialCandidate: Candidate?,
    currency: String,
    onDismiss: () -> Unit,
    onOpenScanner: () -> Unit,
    onSave: (Candidate) -> Unit
) {
    val isEdit = initialCandidate != null

    var firstName by remember { mutableStateOf(initialCandidate?.firstName ?: "") }
    var lastName by remember { mutableStateOf(initialCandidate?.lastName ?: "") }
    var phone by remember { mutableStateOf(initialCandidate?.phone ?: "+251") }
    var secondPhone by remember { mutableStateOf(initialCandidate?.secondPhone ?: "") }
    var gender by remember { mutableStateOf(initialCandidate?.gender ?: "female") }
    var dob by remember { mutableStateOf(initialCandidate?.dateOfBirth ?: "") }
    var city by remember { mutableStateOf(initialCandidate?.city ?: "أديس أبابا") }
    var address by remember { mutableStateOf(initialCandidate?.address ?: "") }
    var job by remember { mutableStateOf(initialCandidate?.job ?: "عاملة منزلية") }
    var passportNumber by remember { mutableStateOf(initialCandidate?.passportNumber ?: "") }
    var passportIssueDate by remember { mutableStateOf(initialCandidate?.passportIssueDate ?: "") }
    var passportExpiryDate by remember { mutableStateOf(initialCandidate?.passportExpiryDate ?: "") }
    var stage by remember { mutableStateOf(initialCandidate?.stage ?: "NEW") }
    var totalFeesStr by remember { mutableStateOf(initialCandidate?.totalFees?.toInt()?.toString() ?: "95000") }
    var agencyLiabilityStr by remember { mutableStateOf(initialCandidate?.agencyLiability?.toInt()?.toString() ?: "25000") }
    var agentName by remember { mutableStateOf(initialCandidate?.agentName ?: "") }
    var sponsorName by remember { mutableStateOf(initialCandidate?.sponsorName ?: "") }
    var contractDurationYears by remember { mutableIntStateOf(initialCandidate?.contractDurationYears ?: 2) }
    var notes by remember { mutableStateOf(initialCandidate?.notes ?: "") }

    var errorMessage by remember { mutableStateOf<String?>(null) }

    val jobsList = listOf("عاملة منزلية", "سائق خاص", "طباخة", "مربية أطفال", "ممرضة منزلية", "مزارع", "عامل مهني")

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isEdit) "تعديل ملف المرشح" else "تسجيل مرشح جديد",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق")
                    }
                }

                // Quick Passport Scanner Button
                if (!isEdit) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = onOpenScanner,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.DocumentScanner, contentDescription = null, tint = NavyDark, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("مسح الجواز ضوئياً وتعبئة البيانات تلقائياً", color = NavyDark, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (errorMessage != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFFEE2E2))
                            .padding(10.dp)
                    ) {
                        Text(errorMessage ?: "", color = Color(0xFFDC2626), fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Section 1: Personal Info
                Text("1. البيانات الشخصية", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = { Text("الاسم الأول *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = lastName,
                        onValueChange = { lastName = it },
                        label = { Text("اسم العائلة *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("رقم الهاتف الأساسي *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = secondPhone,
                        onValueChange = { secondPhone = it },
                        label = { Text("هاتف إضافي") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Gender Toggle
                Text("النوع:", fontSize = 11.sp, color = Color.Gray)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (gender == "female") GoldAccent else Color(0xFFF1F5F9))
                            .clickable { gender = "female" }
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text("أنثى", fontSize = 12.sp, color = if (gender == "female") NavyDark else Color.DarkGray, fontWeight = FontWeight.SemiBold)
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (gender == "male") GoldAccent else Color(0xFFF1F5F9))
                            .clickable { gender = "male" }
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text("ذكر", fontSize = 12.sp, color = if (gender == "male") NavyDark else Color.DarkGray, fontWeight = FontWeight.SemiBold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = dob,
                        onValueChange = { dob = it },
                        label = { Text("تاريخ الميلاد (YYYY-MM-DD)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text("المدينة / الإقليم") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Job Selector chips
                Text("المهنة المطلوبة:", fontSize = 11.sp, color = Color.Gray)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    jobsList.take(3).forEach { j ->
                        val selected = job == j
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) NavyPrimary else Color(0xFFF1F5F9))
                                .clickable { job = j }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Text(j, fontSize = 11.sp, color = if (selected) Color.White else Color.Black)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Section 2: Passport & Travel Info
                Text("2. بيانات جواز السفر", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = passportNumber,
                    onValueChange = { passportNumber = it.uppercase() },
                    label = { Text("رقم جواز السفر (مثل: EP1234567)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = passportIssueDate,
                        onValueChange = { passportIssueDate = it },
                        label = { Text("تاريخ الإصدار") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = passportExpiryDate,
                        onValueChange = { passportExpiryDate = it },
                        label = { Text("تاريخ الانتهاء") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Section 3: Financials & Contracts
                Text("3. البيانات المالية والتعاقد", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = totalFeesStr,
                        onValueChange = { totalFeesStr = it },
                        label = { Text("إجمالي الأتعاب ($currency)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = agencyLiabilityStr,
                        onValueChange = { agencyLiabilityStr = it },
                        label = { Text("مستحقات الوكالة ($currency)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = sponsorName,
                        onValueChange = { sponsorName = it },
                        label = { Text("اسم الكفيل / صاحب العمل") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = agentName,
                        onValueChange = { agentName = it },
                        label = { Text("اسم الوسيط / المكتب") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("ملاحظات إضافية على ملف المرشح") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )

                Spacer(modifier = Modifier.height(18.dp))

                // Submit Button
                Button(
                    onClick = {
                        if (firstName.isBlank() || lastName.isBlank()) {
                            errorMessage = "يرجى إدخال الاسم الأول واسم العائلة"
                            return@Button
                        }
                        if (phone.isBlank()) {
                            errorMessage = "يرجى إدخال رقم الهاتف"
                            return@Button
                        }

                        val fees = totalFeesStr.toDoubleOrNull() ?: 95000.0
                        val liability = agencyLiabilityStr.toDoubleOrNull() ?: 25000.0

                        val candidateToSave = if (isEdit && initialCandidate != null) {
                            initialCandidate.copy(
                                firstName = firstName.trim(),
                                lastName = lastName.trim(),
                                phone = phone.trim(),
                                secondPhone = secondPhone.trim(),
                                gender = gender,
                                dateOfBirth = dob.trim(),
                                city = city.trim(),
                                address = address.trim(),
                                job = job.trim(),
                                passportNumber = passportNumber.trim(),
                                passportIssueDate = passportIssueDate.trim(),
                                passportExpiryDate = passportExpiryDate.trim(),
                                stage = stage,
                                totalFees = fees,
                                agencyLiability = liability,
                                agentName = agentName.trim(),
                                sponsorName = sponsorName.trim(),
                                contractDurationYears = contractDurationYears,
                                notes = notes.trim()
                            )
                        } else {
                            Candidate(
                                id = "CAND-${System.currentTimeMillis() % 100000}",
                                firstName = firstName.trim(),
                                lastName = lastName.trim(),
                                phone = phone.trim(),
                                secondPhone = secondPhone.trim(),
                                gender = gender,
                                dateOfBirth = dob.trim(),
                                city = city.trim(),
                                address = address.trim(),
                                job = job.trim(),
                                country = "إثيوبيا",
                                passportNumber = passportNumber.trim(),
                                passportIssueDate = passportIssueDate.trim(),
                                passportExpiryDate = passportExpiryDate.trim(),
                                stage = stage,
                                totalFees = fees,
                                agencyLiability = liability,
                                registrationDate = FinanceUtils.todayDate(),
                                agentName = agentName.trim(),
                                sponsorName = sponsorName.trim(),
                                contractDurationYears = contractDurationYears,
                                notes = notes.trim()
                            )
                        }

                        onSave(candidateToSave)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = if (isEdit) "تحديث وحفظ التعديلات" else "إتمام تسجيل المرشح",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("إلغاء")
                }
            }
        }
    }
}
