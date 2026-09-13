package com.shuayb.recruitment.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class StageId(val label: String, val stepNumber: Int) {
    NEW("مسجل جديد", 1),
    INTERVIEW("مقابلة واختبار", 2),
    MEDICAL("فحص طبي", 3),
    TRAINING("تدريب وتأهيل", 4),
    CONTRACT("توقيع العقد", 5),
    VISA("إصدار التأشيرة", 6),
    FLIGHT("حجز الطيران", 7),
    READY("جاهز للسفر", 8),
    TRAVELLED("سافر بنجاح", 9),
    COMPLETED("مكتمل العقد", 10),
    CANCELLED("ملغي / مستبعد", 11);

    companion object {
        fun fromString(value: String): StageId {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: NEW
        }
    }
}

data class PaymentRecord(
    val id: String,
    val amount: Double,
    val date: String,
    val note: String = "",
    val method: String = "كاش", // كاش, تحويل بنكي, شيك, أخرى
    val receiptNumber: String = ""
)

data class CandidateExpense(
    val id: String,
    val amount: Double,
    val date: String,
    val category: String, // فحص طبي, تأشيرة, تدريب, تذكرة طيران, إداري, عمولة وسيط, سداد مستحقات الوكالة, أخرى
    val note: String = ""
)

data class CandidateNoteEntry(
    val id: String,
    val date: String,
    val author: String = "المشرف",
    val text: String
)

@Entity(tableName = "candidates")
data class Candidate(
    @PrimaryKey val id: String, // e.g. CAND-0001
    val firstName: String,
    val lastName: String,
    val phone: String,
    val secondPhone: String = "",
    val gender: String = "female", // male, female
    val dateOfBirth: String = "",
    val address: String = "",
    val city: String = "أديس أبابا",
    val job: String = "عاملة منزلية",
    val country: String = "إثيوبيا",
    val passportNumber: String = "",
    val passportIssueDate: String = "",
    val passportExpiryDate: String = "",
    val stage: String = "NEW",
    val medicalStatus: String = "لم يفحص", // "لائق طبياً", "بانتظار النتيجة", "غير لائق", "لم يفحص"
    val medicalDate: String = "",
    val cocNumber: String = "",
    val cocStatus: String = "لم يختبر بعد", // "معتمد ومجتاز", "قيد الاختبار", "بانتظار النتيجة", "غير مجتاز", "لم يختبر بعد"
    val cocIssueDate: String = "",
    val trainingStatus: String = "لم يبدأ", // "مكتمل", "قيد التدريب", "لم يبدأ"
    val visaStatus: String = "لم تقدم", // "صدرت", "قيد الإجراء", "مرفوضة", "لم تقدم"
    val visaNumber: String = "",
    val flightStatus: String = "لم تحجز", // "تم الحجز", "بانتظار التأكيد", "لم تحجز"
    val flightDate: String = "",
    val flightTicketNumber: String = "",
    val totalFees: Double = 0.0,
    val agencyLiability: Double = 0.0,
    val paymentsJson: String = "[]",
    val expensesJson: String = "[]",
    val notesJson: String = "[]",
    val registrationDate: String = "",
    val archived: Boolean = false,
    val notes: String = "",
    val agentName: String = "",
    val sponsorName: String = "",
    val contractDurationYears: Int = 2
) {
    val fullName: String get() = "$firstName $lastName".trim()
}

@Entity(tableName = "general_expenses")
data class GeneralExpense(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val amount: Double,
    val date: String,
    val category: String, // إيجار, رواتب, تسويق, رسوم حكومية, فواتير ومرافق, ضيافة وصيانة, سداد مستحقات وكالة, أخرى
    val note: String = ""
)

@Entity(tableName = "agency_settings")
data class AgencySettings(
    @PrimaryKey val id: Int = 1,
    val agencyName: String = "وكالة شُعيب للاستقدام والتبادل التجاري",
    val agencySubtitle: String = "Shuayb Trade Bridge - تسهيل خدمات الاستقدام والتوظيف والتبادل التجاري",
    val currency: String = "ETB",
    val nextId: Int = 1001,
    val phone: String = "+251 91 123 4567",
    val email: String = "contact@shuayb-recruitment.com",
    val address: String = "Bole Road, Addis Ababa, Ethiopia",
    val licenseNumber: String = "ETH-REC-2024-998",
    val taxNumber: String = "TIN-88392019"
)

data class CandidateFinanceSummary(
    val fees: Double,
    val agencyLiability: Double,
    val netFees: Double,
    val paid: Double,
    val expenses: Double,
    val outstanding: Double,
    val profit: Double,
    val paymentProgress: Int
)
