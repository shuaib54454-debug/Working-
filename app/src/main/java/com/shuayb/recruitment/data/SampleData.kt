package com.shuayb.recruitment.data

import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.CandidateExpense
import com.shuayb.recruitment.model.CandidateNoteEntry
import com.shuayb.recruitment.model.GeneralExpense
import com.shuayb.recruitment.model.PaymentRecord

object SampleData {

    val defaultSettings = AgencySettings(
        id = 1,
        agencyName = "وكالة شُعيب للاستقدام والتبادل التجاري",
        agencySubtitle = "Shuayb Trade Bridge - تسهيل خدمات الاستقدام والتوظيف والتبادل التجاري",
        currency = "ETB",
        nextId = 1006,
        phone = "+251 91 123 4567",
        email = "contact@shuayb-recruitment.com",
        address = "بوليكس، أديس أبابا، إثيوبيا",
        licenseNumber = "ETH-REC-2024-998",
        taxNumber = "TIN-88392019"
    )

    val sampleCandidates = listOf(
        Candidate(
            id = "CAND-1001",
            firstName = "فاطمة",
            lastName = "أحمد محمد",
            phone = "+251911445566",
            secondPhone = "+251922334455",
            gender = "female",
            dateOfBirth = "1997-04-12",
            address = "حي بولي، أديس أبابا",
            city = "أديس أبابا",
            job = "عاملة منزلية",
            country = "إثيوبيا",
            passportNumber = "EP3948201",
            passportIssueDate = "2023-01-15",
            passportExpiryDate = "2028-01-14",
            stage = "READY",
            medicalStatus = "لائق طبياً",
            medicalDate = "2024-02-10",
            cocNumber = "COC-ETH-84920",
            cocStatus = "معتمد ومجتاز",
            cocIssueDate = "2024-02-15",
            trainingStatus = "مكتمل",
            visaStatus = "صدرت",
            visaNumber = "V-84920194",
            flightStatus = "تم الحجز",
            flightDate = "2024-10-25",
            flightTicketNumber = "ET-94820194",
            totalFees = 95000.0,
            agencyLiability = 25000.0,
            paymentsJson = JsonConverters.serializePayments(
                listOf(
                    PaymentRecord("PAY-1", 45000.0, "2024-01-10", "الدفعة الأولى عند التسجيل", "تحويل بنكي", "REC-101"),
                    PaymentRecord("PAY-2", 50000.0, "2024-03-05", "الدفعة الثانية بعد صدور التأشيرة", "كاش", "REC-102")
                )
            ),
            expensesJson = JsonConverters.serializeExpenses(
                listOf(
                    CandidateExpense("EXP-1", 4500.0, "2024-02-10", "فحص طبي", "فحص مركز غامبيلا الطبي"),
                    CandidateExpense("EXP-2", 6000.0, "2024-02-18", "تدريب", "دورة تأهيل الضيافة المنزلية")
                )
            ),
            notesJson = JsonConverters.serializeNotes(
                listOf(
                    CandidateNoteEntry("NOT-1", "2024-01-10", "أحمد الإداري", "تم استلام أصل الجواز واستيفاء المستندات"),
                    CandidateNoteEntry("NOT-2", "2024-02-11", "د. عمر", "الفحص الطبي سليم 100%")
                )
            ),
            registrationDate = "2024-01-10",
            archived = false,
            notes = "مرشحة ممتازة وتجيد التحدث بالإنجليزية والعربية",
            agentName = "مكتب الصفا للاستقدام",
            sponsorName = "سعود بن عبد الرحمن",
            contractDurationYears = 2
        ),
        Candidate(
            id = "CAND-1002",
            firstName = "بيكيلي",
            lastName = "تاكلي تسيغاي",
            phone = "+251912889900",
            secondPhone = "",
            gender = "male",
            dateOfBirth = "1994-08-20",
            address = "حي ميكانيكا، هاواسا",
            city = "هاواسا",
            job = "سائق خاص",
            country = "إثيوبيا",
            passportNumber = "EP8492011",
            passportIssueDate = "2022-06-10",
            passportExpiryDate = "2027-06-09",
            stage = "VISA",
            medicalStatus = "لائق طبياً",
            medicalDate = "2024-03-01",
            cocNumber = "COC-ETH-19384",
            cocStatus = "معتمد ومجتاز",
            cocIssueDate = "2024-03-12",
            trainingStatus = "مكتمل",
            visaStatus = "قيد الإجراء",
            visaNumber = "",
            flightStatus = "لم تحجز",
            flightDate = "",
            flightTicketNumber = "",
            totalFees = 110000.0,
            agencyLiability = 30000.0,
            paymentsJson = JsonConverters.serializePayments(
                listOf(
                    PaymentRecord("PAY-3", 60000.0, "2024-02-20", "دفعة مقدمة ورسوم تفويض", "تحويل بنكي", "REC-103")
                )
            ),
            expensesJson = JsonConverters.serializeExpenses(
                listOf(
                    CandidateExpense("EXP-3", 4500.0, "2024-03-01", "فحص طبي", "فحص المستشفى المعتمد")
                )
            ),
            notesJson = JsonConverters.serializeNotes(
                listOf(
                    CandidateNoteEntry("NOT-3", "2024-02-20", "الاستقبال", "لديه رخصة قيادة إثيوبية سارية وخبرة 5 سنوات")
                )
            ),
            registrationDate = "2024-02-20",
            archived = false,
            notes = "خبرة ممتازة في قيادة السيارات الحديثة",
            agentName = "وسيط الرياض للخدمات",
            sponsorName = "شركة النخبة اللوجستية",
            contractDurationYears = 2
        ),
        Candidate(
            id = "CAND-1003",
            firstName = "حواء",
            lastName = "إدريس جبريل",
            phone = "+251913334411",
            secondPhone = "",
            gender = "female",
            dateOfBirth = "1999-11-05",
            address = "طريق السكة، ديرة داوا",
            city = "ديرة داوا",
            job = "طباخة",
            country = "إثيوبيا",
            passportNumber = "EP5829103",
            passportIssueDate = "2023-09-01",
            passportExpiryDate = "2028-08-31",
            stage = "MEDICAL",
            medicalStatus = "بانتظار النتيجة",
            medicalDate = "2024-04-10",
            cocNumber = "COC-ETH-33921",
            cocStatus = "معتمد ومجتاز",
            cocIssueDate = "2024-04-05",
            trainingStatus = "قيد التدريب",
            visaStatus = "لم تقدم",
            visaNumber = "",
            flightStatus = "لم تحجز",
            flightDate = "",
            flightTicketNumber = "",
            totalFees = 98000.0,
            agencyLiability = 26000.0,
            paymentsJson = JsonConverters.serializePayments(
                listOf(
                    PaymentRecord("PAY-4", 40000.0, "2024-04-01", "دفعة بدء الإجراءات", "كاش", "REC-104")
                )
            ),
            expensesJson = JsonConverters.serializeExpenses(
                listOf(
                    CandidateExpense("EXP-4", 4500.0, "2024-04-10", "فحص طبي", "فحص مخبري شامل")
                )
            ),
            notesJson = JsonConverters.serializeNotes(
                listOf(
                    CandidateNoteEntry("NOT-4", "2024-04-01", "المشرف", "تجيد الطبخ الخليجي والشعبي")
                )
            ),
            registrationDate = "2024-04-01",
            archived = false,
            notes = "خبرة سابقة في دبي لمدة سنتين",
            agentName = "مكتب شعاع المستقبل",
            sponsorName = "خالد بن منصور الهاجري",
            contractDurationYears = 2
        ),
        Candidate(
            id = "CAND-1004",
            firstName = "سليمان",
            lastName = "قاسم بيكلي",
            phone = "+251914556677",
            secondPhone = "",
            gender = "male",
            dateOfBirth = "1992-03-15",
            address = "شارع الميناء، بحر دار",
            city = "بحر دار",
            job = "مزارع ومشرف زراعي",
            country = "إثيوبيا",
            passportNumber = "EP7192834",
            passportIssueDate = "2021-05-14",
            passportExpiryDate = "2026-05-13",
            stage = "TRAVELLED",
            medicalStatus = "لائق طبياً",
            medicalDate = "2024-01-15",
            cocNumber = "COC-ETH-99382",
            cocStatus = "معتمد ومجتاز",
            cocIssueDate = "2024-01-20",
            trainingStatus = "مكتمل",
            visaStatus = "صدرت",
            visaNumber = "V-9938201",
            flightStatus = "تم الحجز",
            flightDate = "2024-03-15",
            flightTicketNumber = "ET-1029384",
            totalFees = 90000.0,
            agencyLiability = 22000.0,
            paymentsJson = JsonConverters.serializePayments(
                listOf(
                    PaymentRecord("PAY-5", 90000.0, "2024-03-10", "سداد كامل الرسوم", "تحويل بنكي", "REC-105")
                )
            ),
            expensesJson = JsonConverters.serializeExpenses(
                listOf(
                    CandidateExpense("EXP-5", 4500.0, "2024-01-15", "فحص طبي", "فحص شامل"),
                    CandidateExpense("EXP-6", 18500.0, "2024-03-12", "تذكرة طيران", "تذكرة طيران أديس - الرياض")
                )
            ),
            notesJson = JsonConverters.serializeNotes(
                listOf(
                    CandidateNoteEntry("NOT-5", "2024-03-15", "المندوب", "وصل العاصمة وتسلم مهام العمل بنجاح")
                )
            ),
            registrationDate = "2024-01-05",
            archived = false,
            notes = "أتم الإجراءات وسافر واستلم العمل",
            agentName = "الوكالة الإثيوبية للتنمية",
            sponsorName = "مزرعة الواحة الخضراء",
            contractDurationYears = 2
        ),
        Candidate(
            id = "CAND-1005",
            firstName = "أستر",
            lastName = "ديمسي هايلو",
            phone = "+251915667788",
            secondPhone = "",
            gender = "female",
            dateOfBirth = "1998-07-22",
            address = "المنطقة الوسطى، نازريت",
            city = "نازريت",
            job = "مربية أطفال",
            country = "إثيوبيا",
            passportNumber = "EP9028374",
            passportIssueDate = "2023-10-10",
            passportExpiryDate = "2028-10-09",
            stage = "NEW",
            medicalStatus = "لم يفحص",
            medicalDate = "",
            cocNumber = "",
            cocStatus = "لم يختبر بعد",
            cocIssueDate = "",
            trainingStatus = "لم يبدأ",
            visaStatus = "لم تقدم",
            visaNumber = "",
            flightStatus = "لم تحجز",
            flightDate = "",
            flightTicketNumber = "",
            totalFees = 95000.0,
            agencyLiability = 25000.0,
            paymentsJson = "[]",
            expensesJson = "[]",
            notesJson = "[]",
            registrationDate = "2024-04-15",
            archived = false,
            notes = "مسجلة جديدة بانتظار المقابلة الشخصية وإجراء الفحص الطبي",
            agentName = "مكتب الصفا",
            sponsorName = "فهد بن عبد العزيز",
            contractDurationYears = 2
        )
    )

    val sampleExpenses = listOf(
        GeneralExpense(
            id = 1,
            title = "إيجار مقر الوكالة - بوليكس",
            amount = 35000.0,
            date = "2024-04-01",
            category = "إيجار",
            note = "إيجار شهر أبريل 2024"
        ),
        GeneralExpense(
            id = 2,
            title = "رواتب موظفي الاستقبال والإدارة",
            amount = 48000.0,
            date = "2024-04-05",
            category = "رواتب",
            note = "رواتب الكادر الإداري"
        ),
        GeneralExpense(
            id = 3,
            title = "حملة إعلانية وتسويق استقدام الكفاءات",
            amount = 12000.0,
            date = "2024-04-08",
            category = "تسويق",
            note = "إعلانات استقطاب العمالة المهنية"
        ),
        GeneralExpense(
            id = 4,
            title = "تجديد التراخيص والرسوم الحكومية السنوية",
            amount = 15000.0,
            date = "2024-04-10",
            category = "رسوم حكومية",
            note = "رسوم وزارة العمل والتشغيل"
        )
    )
}
