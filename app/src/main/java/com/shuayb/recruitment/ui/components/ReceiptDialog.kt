package com.shuayb.recruitment.ui.components

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.ui.ReceiptData
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyPrimary

@Composable
fun ReceiptDialog(
    receipt: ReceiptData,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header action
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE6F4EA)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF137333),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = "سند قبض رسمي",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Paper Voucher Container
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFAFAFA)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = receipt.agencyName,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = NavyPrimary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "قسم الحسابات والشؤون المالية",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider(color = BorderSubtle)
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("رقم السند:", fontSize = 11.sp, color = Color.Gray)
                                Text(receipt.receiptNumber, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("التاريخ:", fontSize = 11.sp, color = Color.Gray)
                                Text(receipt.date, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("استلمنا من المرشح / العميل:", fontSize = 11.sp, color = Color.Gray)
                                Text(receipt.candidateName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = NavyPrimary)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("كود الملف:", fontSize = 11.sp, color = Color.Gray)
                                Text(receipt.candidateId, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Amount Highlight Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(NavyPrimary.copy(alpha = 0.06f))
                                .border(1.dp, GoldAccent.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                .padding(vertical = 12.dp, horizontal = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("المبلغ المقبوض", fontSize = 11.sp, color = Color.Gray)
                                Text(
                                    text = FinanceUtils.formatMoney(receipt.amount, receipt.currency),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = NavyPrimary
                                )
                                Text("طريقة الدفع: ${receipt.paymentMethod}", fontSize = 11.sp, color = GoldAccent, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        if (receipt.note.isNotBlank()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "وذلك مقابل: ${receipt.note}",
                                fontSize = 12.sp,
                                color = Color.DarkGray,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Signatures
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("المستلم / أمين الصندوق", fontSize = 11.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("________________", fontSize = 11.sp, color = Color.LightGray)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("ختم الوكالة المعتمد", fontSize = 11.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("[ معتمد إلكترونياً ]", fontSize = 10.sp, color = GoldAccent, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            val shareText = """
                                سند قبض رسمي
                                الوكالة: ${receipt.agencyName}
                                رقم السند: ${receipt.receiptNumber}
                                التاريخ: ${receipt.date}
                                المرشح: ${receipt.candidateName} (${receipt.candidateId})
                                المبلغ: ${FinanceUtils.formatMoney(receipt.amount, receipt.currency)}
                                طريقة الدفع: ${receipt.paymentMethod}
                                البيان: ${receipt.note}
                            """.trimIndent()

                            val sendIntent: Intent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, shareText)
                                type = "text/plain"
                            }
                            val shareIntent = Intent.createChooser(sendIntent, "مشاركة سند القبض")
                            context.startActivity(shareIntent)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("مشاركة السند")
                    }

                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("إغلاق")
                    }
                }
            }
        }
    }
}
