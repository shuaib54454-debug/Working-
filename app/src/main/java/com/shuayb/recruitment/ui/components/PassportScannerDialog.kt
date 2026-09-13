package com.shuayb.recruitment.ui.components

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
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyPrimary

data class ScannedPassportData(
    val firstName: String,
    val lastName: String,
    val passportNumber: String,
    val gender: String,
    val dateOfBirth: String,
    val expiryDate: String,
    val country: String = "إثيوبيا"
)

@Composable
fun PassportScannerDialog(
    onDismiss: () -> Unit,
    onApplyScannedData: (ScannedPassportData) -> Unit
) {
    var selectedSample by remember { mutableStateOf<ScannedPassportData?>(null) }
    var isSimulatingScan by remember { mutableStateOf(false) }

    val presetPassports = listOf(
        ScannedPassportData(
            firstName = "بيثيليم",
            lastName = "تسفاي جيرما",
            passportNumber = "EP4920194",
            gender = "female",
            dateOfBirth = "1999-05-14",
            expiryDate = "2029-05-13"
        ),
        ScannedPassportData(
            firstName = "تيريفا",
            lastName = "أبيبي كيبيدي",
            passportNumber = "EP6829104",
            gender = "male",
            dateOfBirth = "1995-11-28",
            expiryDate = "2028-11-27"
        ),
        ScannedPassportData(
            firstName = "مريم",
            lastName = "عثمان وركو",
            passportNumber = "EP8392015",
            gender = "female",
            dateOfBirth = "2000-02-19",
            expiryDate = "2030-02-18"
        )
    )

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
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(NavyPrimary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.DocumentScanner,
                            contentDescription = null,
                            tint = NavyPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = "ماسح الجوازات الذكي (OCR)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Scanner Viewfinder Area
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(170.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF0F172A))
                        .border(2.dp, GoldAccent, RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = GoldAccent,
                            modifier = Modifier.size(38.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (isSimulatingScan) "جاري مسح بيانات الجواز ضوئياً..." else "وجّه الكاميرا نحو صفحة بيانات الجواز (MRZ)",
                            color = Color.White,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "يدعم جوازات السفر الإثيوبية الرسمية",
                            color = GoldAccent.copy(alpha = 0.8f),
                            fontSize = 10.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "نماذج سريعة لجوازات جاهزة للاستيراد المباشر:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Quick preset cards
                presetPassports.forEach { sample ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable {
                                selectedSample = sample
                            }
                            .border(
                                width = if (selectedSample?.passportNumber == sample.passportNumber) 2.dp else 1.dp,
                                color = if (selectedSample?.passportNumber == sample.passportNumber) GoldAccent else BorderSubtle,
                                shape = RoundedCornerShape(10.dp)
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selectedSample?.passportNumber == sample.passportNumber)
                                GoldAccent.copy(alpha = 0.08f)
                            else
                                MaterialTheme.colorScheme.surface
                        ),
                        shape = RoundedCornerShape(10.dp)
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
                                    text = "${sample.firstName} ${sample.lastName}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = NavyPrimary
                                )
                                Text(
                                    text = "جواز: ${sample.passportNumber} | انتهاء: ${sample.expiryDate}",
                                    fontSize = 11.sp,
                                    color = Color.Gray
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(NavyPrimary.copy(alpha = 0.08f))
                                    .padding(horizontal = 6.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = if (sample.gender == "female") "أنثى" else "ذكر",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = NavyPrimary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Action Buttons
                Button(
                    onClick = {
                        val toApply = selectedSample ?: presetPassports.first()
                        onApplyScannedData(toApply)
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary)
                ) {
                    Icon(Icons.Default.FlashOn, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (selectedSample != null) "استيراد بيانات الجواز المختار" else "استيراد بيانات النموذج الافتراضي"
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("إلغاء")
                }
            }
        }
    }
}
