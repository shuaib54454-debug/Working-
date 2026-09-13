package com.shuayb.recruitment.data

import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.CandidateExpense
import com.shuayb.recruitment.model.CandidateFinanceSummary
import com.shuayb.recruitment.model.CandidateNoteEntry
import com.shuayb.recruitment.model.PaymentRecord
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object JsonConverters {

    fun parsePayments(json: String?): List<PaymentRecord> {
        if (json.isNullOrBlank()) return emptyList()
        val list = mutableListOf<PaymentRecord>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    PaymentRecord(
                        id = obj.optString("id", System.currentTimeMillis().toString()),
                        amount = obj.optDouble("amount", 0.0),
                        date = obj.optString("date", ""),
                        note = obj.optString("note", ""),
                        method = obj.optString("method", "كاش"),
                        receiptNumber = obj.optString("receiptNumber", "")
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun serializePayments(payments: List<PaymentRecord>): String {
        val array = JSONArray()
        for (p in payments) {
            val obj = JSONObject()
            obj.put("id", p.id)
            obj.put("amount", p.amount)
            obj.put("date", p.date)
            obj.put("note", p.note)
            obj.put("method", p.method)
            obj.put("receiptNumber", p.receiptNumber)
            array.put(obj)
        }
        return array.toString()
    }

    fun parseExpenses(json: String?): List<CandidateExpense> {
        if (json.isNullOrBlank()) return emptyList()
        val list = mutableListOf<CandidateExpense>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    CandidateExpense(
                        id = obj.optString("id", System.currentTimeMillis().toString()),
                        amount = obj.optDouble("amount", 0.0),
                        date = obj.optString("date", ""),
                        category = obj.optString("category", "أخرى"),
                        note = obj.optString("note", "")
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun serializeExpenses(expenses: List<CandidateExpense>): String {
        val array = JSONArray()
        for (e in expenses) {
            val obj = JSONObject()
            obj.put("id", e.id)
            obj.put("amount", e.amount)
            obj.put("date", e.date)
            obj.put("category", e.category)
            obj.put("note", e.note)
            array.put(obj)
        }
        return array.toString()
    }

    fun parseNotes(json: String?): List<CandidateNoteEntry> {
        if (json.isNullOrBlank()) return emptyList()
        val list = mutableListOf<CandidateNoteEntry>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    CandidateNoteEntry(
                        id = obj.optString("id", System.currentTimeMillis().toString()),
                        date = obj.optString("date", ""),
                        author = obj.optString("author", "المشرف"),
                        text = obj.optString("text", "")
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun serializeNotes(notes: List<CandidateNoteEntry>): String {
        val array = JSONArray()
        for (n in notes) {
            val obj = JSONObject()
            obj.put("id", n.id)
            obj.put("date", n.date)
            obj.put("author", n.author)
            obj.put("text", n.text)
            array.put(obj)
        }
        return array.toString()
    }
}

object FinanceUtils {
    fun calculateCandidateFinance(candidate: Candidate): CandidateFinanceSummary {
        val payments = JsonConverters.parsePayments(candidate.paymentsJson)
        val expenses = JsonConverters.parseExpenses(candidate.expensesJson)

        val paid = payments.sumOf { it.amount }
        val totalCandidateExpenses = expenses.sumOf { it.amount }
        val fees = candidate.totalFees
        val agencyLiability = candidate.agencyLiability
        val netFees = (fees - agencyLiability).coerceAtLeast(0.0)
        val outstanding = (fees - paid).coerceAtLeast(0.0)
        val profit = fees - agencyLiability - totalCandidateExpenses
        val progress = if (fees > 0) ((paid / fees) * 100).toInt().coerceIn(0, 100) else 0

        return CandidateFinanceSummary(
            fees = fees,
            agencyLiability = agencyLiability,
            netFees = netFees,
            paid = paid,
            expenses = totalCandidateExpenses,
            outstanding = outstanding,
            profit = profit,
            paymentProgress = progress
        )
    }

    fun formatMoney(amount: Double, currency: String = "ETB"): String {
        val formatter = NumberFormat.getNumberInstance(Locale.US)
        formatter.maximumFractionDigits = 0
        return "${formatter.format(amount)} $currency"
    }

    fun todayDate(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(Date())
    }
}
