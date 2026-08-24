import React, { useState } from "react";
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  PieChart,
  Download,
  Building2,
  X,
  Printer
} from "lucide-react";
import { Candidate, GeneralExpense, AgencySettings } from "../types";
import { formatMoney, getTodayDateString, calculateCandidateFinance } from "../data/initialData";
import { useLanguage } from "../lib/LanguageContext";

interface FinanceViewProps {
  candidates: Candidate[];
  generalExpenses: GeneralExpense[];
  settings: AgencySettings;
  onAddGeneralExpense: (expense: Omit<GeneralExpense, "id">) => void;
  onDeleteGeneralExpense: (id: string | number) => void;
  onOpenCandidateProfile: (id: string) => void;
  onOpenExportModal?: (tab?: "FINANCE" | "PAYMENTS" | "EXPENSES") => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  candidates,
  generalExpenses,
  settings,
  onAddGeneralExpense,
  onDeleteGeneralExpense,
  onOpenCandidateProfile,
  onOpenExportModal
}) => {
  const { t, isAr } = useLanguage();
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<GeneralExpense["category"]>("إيجار");
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newNote, setNewNote] = useState("");

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "EXPENSES" | "CANDIDATES_FINANCE">("OVERVIEW");
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>("ALL");

  const activeCandidates = candidates.filter(c => !c.archived);

  // Financial aggregates
  let totalContractFees = 0;
  let totalAgencyLiabilities = 0;
  let totalCollectedPayments = 0;
  let totalCandidateExpenses = 0;

  activeCandidates.forEach(c => {
    const fin = calculateCandidateFinance(c);
    totalContractFees += fin.fees;
    totalAgencyLiabilities += fin.agencyLiability;
    totalCollectedPayments += fin.paid;
    totalCandidateExpenses += fin.exp;
  });

  const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalAllExpenses = totalCandidateExpenses + totalGeneralExpenses;
  const totalOutstanding = Math.max(0, totalContractFees - totalCollectedPayments);
  const netExpectedProfit = totalContractFees - totalAgencyLiabilities - totalAllExpenses;
  const currentCashProfit = totalCollectedPayments - totalAgencyLiabilities - totalAllExpenses;

  // Group general expenses by category
  const expenseByCategory: { [key: string]: number } = {};
  generalExpenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount || 0);
  });

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) return;

    onAddGeneralExpense({
      title: newTitle.trim(),
      amount: Number(newAmount),
      category: newCategory,
      date: newDate,
      note: newNote.trim()
    });

    setNewTitle("");
    setNewAmount("");
    setNewNote("");
    setShowAddExpenseModal(false);
  };

  const filteredGeneralExpenses = generalExpenses.filter(e => {
    if (expenseFilterCategory === "ALL") return true;
    return e.category === expenseFilterCategory;
  });

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#172a46] flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#c9a84c]" />
            <span>{t.financialLedger}</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {isAr
              ? "متابعة الإيرادات، المدفوعات، مصروفات التشغيل، وصافي الأرباح"
              : "Track revenue, payments, operational expenses, and net profits"}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (onOpenExportModal) {
                onOpenExportModal("FINANCE");
              }
            }}
            className="flex-1 sm:flex-initial bg-white hover:bg-stone-50 text-[#172a46] border border-stone-200 px-3.5 sm:px-4 py-2.5 rounded-2xl font-black text-xs shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Download className="w-4 h-4 text-[#c9a84c]" />
            <span className="truncate">{isAr ? "تصدير وطباعة (PDF • CSV)" : "Export / Print"}</span>
          </button>

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex-1 sm:flex-initial bg-[#172a46] hover:bg-[#223d64] text-white px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#c9a84c]" />
            <span className="truncate">{t.agencyExpense}</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Overview Banner */}
      <div className="bg-gradient-to-br from-[#172a46] via-[#1b3457] to-[#0f1d32] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-stone-800">
        <Landmark className="absolute -left-6 -bottom-6 text-white/5 w-64 h-64 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-[#c9a84c] font-black uppercase tracking-widest block mb-1">
                {t.netExpectedProfit} (Net Profit)
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white">
                {formatMoney(netExpectedProfit, settings.currency)}
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                {isAr ? "بناءً على إجمالي العقود النشطة ومصروفات التشغيل" : "Based on active contracts and operational expenses"}
              </p>
            </div>

            <div className={`bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 ${isAr ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] text-stone-300 font-bold block mb-0.5">
                {isAr ? "السيولة الحالية (المحصل - المصروفات)" : "Current Liquidity (Collected - Expenses)"}
              </span>
              <span className={`text-xl font-black ${currentCashProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatMoney(currentCashProfit, settings.currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 border-t border-white/10 pt-6">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.collectedRevenue}</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 block font-mono">
                {formatMoney(totalCollectedPayments, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                {isAr ? `من أصل ${formatMoney(totalContractFees)}` : `Out of ${formatMoney(totalContractFees)}`}
              </span>
            </div>

            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-400/20">
              <span className="text-[11px] text-amber-300 font-bold block mb-1">{t.agencyLiabilityShort} (-)</span>
              <span className="text-lg sm:text-xl font-black text-amber-300 block font-mono">
                {formatMoney(totalAgencyLiabilities, settings.currency)}
              </span>
              <span className="text-[10px] text-amber-200/70 mt-1 block">{isAr ? "مخصومة من أتعاب العمالة" : "Deducted from fees"}</span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.remainingBalance}</span>
              <span className="text-lg sm:text-xl font-black text-rose-400 block font-mono">
                {formatMoney(totalOutstanding, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{isAr ? "مبالغ قيد التحصيل" : "Pending collection"}</span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{isAr ? "مصروفات المرشحين" : "Candidate Expenses"}</span>
              <span className="text-lg sm:text-xl font-black text-stone-200 block font-mono">
                {formatMoney(totalCandidateExpenses, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{isAr ? "طبي، تدريب، تأشيرات، طيران" : "Medical, Training, Visa, Flights"}</span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 col-span-2 lg:col-span-1">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.agencyExpense}</span>
              <span className="text-lg sm:text-xl font-black text-amber-100 block font-mono">
                {formatMoney(totalGeneralExpenses, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{isAr ? "إيجار، رواتب، تشغيل" : "Rent, Salaries, Operations"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
            activeTab === "OVERVIEW"
              ? "bg-[#172a46] text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {isAr ? "ملخص وتوزيع المصروفات" : "Expense Summary & Distribution"}
        </button>

        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
            activeTab === "EXPENSES"
              ? "bg-[#172a46] text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <span>{isAr ? "سجل مصروفات الوكالة العامة" : "Agency General Expenses"}</span>
          <span className="text-[10px] bg-stone-200 text-stone-800 px-1.5 py-0.2 rounded-full font-bold">
            {generalExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("CANDIDATES_FINANCE")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
            activeTab === "CANDIDATES_FINANCE"
              ? "bg-[#172a46] text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {isAr ? "كشف حسابات المرشحين" : "Candidate Financial Ledger"}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#c9a84c]" />
              <span>{isAr ? "توزيع مصروفات الوكالة حسب البند" : "Agency Expense Distribution"}</span>
            </h3>

            <div className="space-y-3">
              {Object.keys(expenseByCategory).length > 0 ? (
                Object.entries(expenseByCategory).map(([cat, amt]) => {
                  const percentage = totalGeneralExpenses > 0 ? Math.round((amt / totalGeneralExpenses) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-stone-700">{cat}</span>
                        <span className="text-[#172a46] font-mono">{formatMoney(amt, settings.currency)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#c9a84c] h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-stone-400 text-xs">
                  {isAr ? "لا توجد مصروفات عامة مسجلة بعد." : "No general expenses logged yet."}
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#c9a84c]" />
              <span>{isAr ? "مؤشرات الأداء المالي" : "Financial KPI Indicators"}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex justify-between items-center">
                <span className="text-stone-600 font-bold">{isAr ? "متوسط الإيراد لكل مرشح:" : "Avg Revenue per Candidate:"}</span>
                <span className="font-black text-[#172a46] font-mono">
                  {activeCandidates.length > 0
                    ? formatMoney(Math.round(totalContractFees / activeCandidates.length), settings.currency)
                    : "0"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex justify-between items-center">
                <span className="text-stone-600 font-bold">{isAr ? "متوسط تكلفة المعاملة للمرشح:" : "Avg Processing Cost per Candidate:"}</span>
                <span className="font-black text-rose-700 font-mono">
                  {activeCandidates.length > 0
                    ? formatMoney(Math.round(totalCandidateExpenses / activeCandidates.length), settings.currency)
                    : "0"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex justify-between items-center">
                <span className="text-stone-600 font-bold">{isAr ? "نسبة التحصيل الإجمالية:" : "Collection Ratio:"}</span>
                <span className="font-black text-emerald-600 font-mono">
                  {totalContractFees > 0
                    ? `${Math.round((totalCollectedPayments / totalContractFees) * 100)}%`
                    : "0%"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex justify-between items-center">
                <span className="text-stone-600 font-bold">{isAr ? "هامش الربح المتوقع:" : "Expected Profit Margin:"}</span>
                <span className="font-black text-[#c9a84c] font-mono">
                  {totalContractFees > 0
                    ? `${Math.round((netExpectedProfit / totalContractFees) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL EXPENSES */}
      {activeTab === "EXPENSES" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-[#172a46]">{isAr ? "قائمة المصروفات الإدارية والتشغيلية" : "Administrative & Operating Expenses"}</h3>

            <div className="flex items-center gap-2">
              <select
                value={expenseFilterCategory}
                onChange={e => setExpenseFilterCategory(e.target.value)}
                className="p-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800"
              >
                <option value="ALL">{isAr ? "كل البنود" : "All categories"}</option>
                <option value="إيجار">{isAr ? "إيجار" : "Rent"}</option>
                <option value="رواتب">{isAr ? "رواتب" : "Salaries"}</option>
                <option value="تسويق">{isAr ? "تسويق" : "Marketing"}</option>
                <option value="رسوم حكومية">{isAr ? "رسوم حكومية" : "Government Fees"}</option>
                <option value="فواتير ومرافق">{isAr ? "فواتير ومرافق" : "Utilities"}</option>
                <option value="ضيافة وصيانة">{isAr ? "ضيافة وصيانة" : "Hospitality & Maintenance"}</option>
                <option value="أخرى">{isAr ? "أخرى" : "Other"}</option>
              </select>

              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1 shadow-xs transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAr ? "إضافة" : "Add"}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredGeneralExpenses.length > 0 ? (
              filteredGeneralExpenses.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#172a46]">{item.title}</span>
                      <span className="px-2.5 py-0.5 bg-white border border-stone-200 rounded-full text-[10px] font-bold text-stone-700">
                        {item.category}
                      </span>
                    </div>
                    {item.note && <p className="text-[11px] text-stone-500">{item.note}</p>}
                    <span className="text-[10px] text-stone-400 font-mono">{isAr ? "التاريخ" : "Date"}: {item.date}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-rose-600 font-mono">
                      {formatMoney(item.amount, settings.currency)}
                    </span>
                    <button
                      onClick={() => onDeleteGeneralExpense(item.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-2xl hover:bg-white transition-colors"
                      title={isAr ? "حذف المصروف" : "Delete expense"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-stone-400 text-xs">
                {isAr ? "لا توجد مصروفات تطابق التصفية الحالية." : "No expenses match current filter."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATES FINANCIAL LEDGER */}
      {activeTab === "CANDIDATES_FINANCE" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4 animate-in fade-in overflow-x-auto">
          <h3 className="font-black text-base text-[#172a46] mb-2">{isAr ? "جدول الحسابات الفردية لكل مرشح" : "Individual Candidate Accounts Ledger"}</h3>

          <table className={`w-full ${isAr ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 text-[11px]">
                <th className="pb-3 font-bold">{isAr ? "المرشح والمهنة" : "Candidate & Job"}</th>
                <th className="pb-3 font-bold">{isAr ? "المرحلة" : "Stage"}</th>
                <th className="pb-3 font-bold">{isAr ? "إجمالي الأتعاب" : "Total Fees"}</th>
                <th className="pb-3 font-bold text-amber-700">{isAr ? "مستحقات الوكالة (-)" : "Agency Dues (-)"}</th>
                <th className="pb-3 font-bold">{isAr ? "المدفوع" : "Paid"}</th>
                <th className="pb-3 font-bold">{isAr ? "المصروفات" : "Expenses"}</th>
                <th className="pb-3 font-bold">{isAr ? "المتبقي" : "Balance"}</th>
                <th className="pb-3 font-bold">{isAr ? "الربح الصافي" : "Net Profit"}</th>
                <th className="pb-3 font-bold text-center">{isAr ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-bold">
              {activeCandidates.map(c => {
                const fin = calculateCandidateFinance(c);
                const stageLabel = (t.stages as Record<string, string>)?.[c.stage] || c.stage;
                return (
                  <tr key={c.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5">
                      <div className="font-black text-[#172a46]">{c.firstName} {c.lastName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{c.id} • {c.job}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {stageLabel}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono">{formatMoney(fin.fees, settings.currency)}</td>
                    <td className="py-3.5 font-mono text-amber-700">{formatMoney(fin.agencyLiability, settings.currency)}</td>
                    <td className="py-3.5 font-mono text-emerald-600">{formatMoney(fin.paid, settings.currency)}</td>
                    <td className="py-3.5 font-mono text-rose-600">{formatMoney(fin.exp, settings.currency)}</td>
                    <td className="py-3.5 font-mono">
                      {fin.outstanding > 0 ? (
                        <span className="text-rose-600">{formatMoney(fin.outstanding, settings.currency)}</span>
                      ) : (
                        <span className="text-emerald-600">{isAr ? "مسدد" : "Paid"}</span>
                      )}
                    </td>
                    <td className="py-3.5 font-mono text-[#c9a84c]">{formatMoney(fin.profit, settings.currency)}</td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => onOpenCandidateProfile(c.id)}
                        className="px-3 py-1 bg-stone-100 hover:bg-[#172a46] hover:text-white rounded-xl text-[10px] font-black transition-colors"
                      >
                        {isAr ? "عرض الملف" : "View profile"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add General Expense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-[#172a46]">{isAr ? "إضافة مصروف عام للوكالة" : "Add Agency General Expense"}</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="p-1 rounded-2xl text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">{isAr ? "بيان / عنوان المصروف *" : "Expense Title *"}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? "مثال: إيجار المقر لشهر مايو" : "e.g. Office rent for May"}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">{isAr ? `المبلغ (${settings.currency}) *` : `Amount (${settings.currency}) *`}</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="35000"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">{isAr ? "تصنيف المصروف" : "Expense Category"}</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                >
                  <option value="إيجار">{isAr ? "إيجار المقر" : "Office Rent"}</option>
                  <option value="رواتب">{isAr ? "رواتب ومكافآت الموظفين" : "Salaries & Bonuses"}</option>
                  <option value="تسويق">{isAr ? "تسويق وإعلانات" : "Marketing & Ads"}</option>
                  <option value="رسوم حكومية">{isAr ? "رسوم وتراخيص حكومية" : "Gov Fees & Licensing"}</option>
                  <option value="فواتير ومرافق">{isAr ? "فواتير كهرباء وإنترنت وهاتف" : "Electricity, Internet & Utilities"}</option>
                  <option value="ضيافة وصيانة">{isAr ? "ضيافة وصيانة وتجهيزات" : "Hospitality & Maintenance"}</option>
                  <option value="أخرى">{isAr ? "مصروفات أخرى" : "Other Expenses"}</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">{isAr ? "تاريخ الصرف" : "Expense Date"}</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">{isAr ? "ملاحظات إضافية" : "Additional Notes"}</label>
                <input
                  type="text"
                  placeholder={isAr ? "اختياري" : "Optional"}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 text-stone-500 font-bold rounded-2xl hover:bg-stone-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#172a46] hover:bg-[#233f67] text-white font-black rounded-2xl shadow-md transition-transform active:scale-95"
                >
                  {isAr ? "حفظ المصروف" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
