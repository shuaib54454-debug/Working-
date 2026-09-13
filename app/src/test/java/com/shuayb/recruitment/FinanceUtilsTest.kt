package com.shuayb.recruitment

import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.data.JsonConverters
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.CandidateExpense
import com.shuayb.recruitment.model.PaymentRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FinanceUtilsTest {

    @Test
    fun testCandidateFinanceCalculations() {
        val payments = listOf(
            PaymentRecord("p1", 20000.0, "2025-01-01", "كاش", "تحويل بنكي", "REC-1"),
            PaymentRecord("p2", 30000.0, "2025-01-10", "دفعة ثانية", "كاش", "REC-2")
        )
        val expenses = listOf(
            CandidateExpense("e1", 5000.0, "2025-01-02", "فحص طبي", "فحص شامل"),
            CandidateExpense("e2", 2000.0, "2025-01-05", "تأشيرة", "رسوم إنجاز")
        )

        val candidate = Candidate(
            id = "CAND-101",
            firstName = "بيثيليم",
            lastName = "تسفاي",
            phone = "+251911223344",
            totalFees = 100000.0,
            agencyLiability = 25000.0,
            paymentsJson = JsonConverters.serializePayments(payments),
            expensesJson = JsonConverters.serializeExpenses(expenses)
        )

        val fin = FinanceUtils.calculateCandidateFinance(candidate)

        assertEquals(100000.0, fin.fees, 0.01)
        assertEquals(25000.0, fin.agencyLiability, 0.01)
        assertEquals(75000.0, fin.netFees, 0.01)
        assertEquals(50000.0, fin.paid, 0.01)
        assertEquals(50000.0, fin.outstanding, 0.01)
        assertEquals(7000.0, fin.expenses, 0.01)
        assertEquals(50, fin.paymentProgress)
        // Profit = netFees (75000) - expenses (7000) = 68000
        assertEquals(68000.0, fin.profit, 0.01)
    }

    @Test
    fun testFormatMoney() {
        val formatted = FinanceUtils.formatMoney(95000.0, "ETB")
        assertTrue(formatted.contains("ETB"))
        assertTrue(formatted.contains("95,000") || formatted.contains("95000"))
    }
}
