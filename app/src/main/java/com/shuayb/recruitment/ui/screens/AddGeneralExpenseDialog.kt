package com.shuayb.recruitment.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.ui.theme.NavyPrimary

@Composable
fun AddGeneralExpenseDialog(
    currency: String,
    onDismiss: () -> Unit,
    onConfirm: (title: String, amount: Double, date: String, category: String, note: String) -> Unit
) {
    var titleStr by remember { mutableStateOf("") }
    var amountStr by remember { mutableStateOf("") }
    var dateStr by remember { mutableStateOf(FinanceUtils.todayDate()) }
    var categoryStr by remember { mutableStateOf("إيجار") }
    var noteStr by remember { mutableStateOf("") }

    val categories = listOf("إيجار", "رواتب", "تسويق", "رسوم حكومية", "فواتير ومرافق", "ضيافة وصيانة", "أخرى")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تسجيل مصروف إداري أو تشغيلي", fontWeight = FontWeight.Bold, color = NavyPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = titleStr,
                    onValueChange = { titleStr = it },
                    label = { Text("عنوان المصروف (مثال: إيجار المقر، فاتورة كهرباء)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

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

                Text("التصنيف:", fontSize = 11.sp, color = Color.Gray)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    categories.take(4).forEach { cat ->
                        val selected = categoryStr == cat
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) NavyPrimary else Color(0xFFF1F5F9))
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
                    label = { Text("ملاحظات إضافية") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountStr.toDoubleOrNull() ?: 0.0
                    if (titleStr.isNotBlank() && amt > 0) {
                        onConfirm(titleStr, amt, dateStr, categoryStr, noteStr)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary)
            ) {
                Text("حفظ المصروف")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}
