import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Users,
  Wallet,
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  Receipt,
  Sparkles,
  DollarSign,
  ArrowDownToLine,
  Loader2,
  TableProperties,
  Layers
} from "lucide-react";
import { Candidate, GeneralExpense, AgencySettings, StageId } from "../types";
import { STAGES, formatMoney, calculateCandidateFinance, getTodayDateString } from "../data/initialData";
import { exportCandidatesToCSV, exportFinanceToCSV, exportFullJSONBackup } from "../lib/exportUtils";
import { exportElementToPDF, generateDirectTablePDF } from "../lib/pdfUtils";
import { ShuaybLogo } from "./ShuaybLogo";
import { useLanguage } from "../lib/LanguageContext";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  generalExpenses: GeneralExpense[];
  settings: AgencySettings;
  defaultTab?: "CANDIDATES" | "FINANCE" | "PAYMENTS" | "EXPENSES";
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  candidates,
  generalExpenses,
  settings,
  defaultTab = "CANDIDATES"
}) => {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState<"CANDIDATES" | "FINANCE" | "PAYMENTS" | "EXPENSES">(defaultTab);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [reportDate] = useState<string>(getTodayDateString());
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportMode, setExportMode] = useState<"OFFICIAL_SHEET" | "DIRECT_TABLE">("OFFICIAL_SHEET");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (c.archived) return false;
      if (selectedStage !== "ALL" && c.stage !== selectedStage) return false;
      if (selectedCountry !== "ALL" && c.country !== selectedCountry) return false;
      return true;
    });
  }, [candidates, selectedStage, selectedCountry]);

  // Countries set
  const countries = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.country && !c.archived) set.add(c.country);
    });
    return Array.from(set);
  }, [candidates]);

  // Financial aggregates
  const financialSummary = useMemo(() => {
    let totalContractFees = 0;
    let totalCollectedPayments = 0;
    let totalCandidateExpenses = 0;

    candidates.filter(c => !c.archived).forEach(c => {
      const fin = calculateCandidateFinance(c);
      totalContractFees += fin.fees;
      totalCollectedPayments += fin.paid;
      totalCandidateExpenses += fin.exp;
    });

    const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAllExpenses = totalCandidateExpenses + totalGeneralExpenses;
    const totalOutstanding = Math.max(0, totalContractFees - totalCollectedPayments);
    const netProfit = totalContractFees - totalAllExpenses;
    const cashProfit = totalCollectedPayments - totalAllExpenses;

    return {
      totalContractFees,
      totalCollectedPayments,
      totalCandidateExpenses,
      totalGeneralExpenses,
      totalAllExpenses,
      totalOutstanding,
      netProfit,
      cashProfit
    };
  }, [candidates, generalExpenses]);

  // Itemized Candidate Payments
  const allPayments = useMemo(() => {
    const list: {
      candidateId: string;
      candidateName: string;
      job: string;
      country: string;
      receiptNumber: string;
      amount: number;
      date: string;
      method: string;
      notes: string;
    }[] = [];

    candidates.filter(c => !c.archived).forEach(c => {
      (c.payments || []).forEach(p => {
        list.push({
          candidateId: c.id,
          candidateName: `${c.firstName} ${c.lastName}`,
          job: c.job || "-",
          country: c.country || "-",
          receiptNumber: p.receiptNumber || p.id,
          amount: p.amount,
          date: p.date,
          method: p.method || "نقدي",
          notes: p.note || "دفعة أتعاب"
        });
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [candidates]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      if (exportMode === "DIRECT_TABLE") {
        // Direct jsPDF + AutoTable Generation
        if (activeTab === "CANDIDATES") {
          const headers = ["الكود", "اسم المرشح", "المهنة والوجهة", "المرحلة", "الجواز", "الأتعاب", "المدفوع", "المتبقي"];
          const rows = filteredCandidates.map(c => {
            const fin = calculateCandidateFinance(c);
            const stageLabel = STAGES.find(s => s.id === c.stage)?.label || c.stage;
            return [
              c.id,
              `${c.firstName} ${c.lastName}`,
              `${c.job || ""} (${c.country || ""})`,
              stageLabel,
              c.passportNumber || "-",
              formatMoney(fin.fees, settings.currency),
              formatMoney(fin.paid, settings.currency),
              formatMoney(fin.outstanding, settings.currency)
            ];
          });

          const totalFees = filteredCandidates.reduce((s, c) => s + (c.totalFees || 0), 0);
          const totalPaid = filteredCandidates.reduce((s, c) => s + calculateCandidateFinance(c).paid, 0);
          const totalOut = filteredCandidates.reduce((s, c) => s + calculateCandidateFinance(c).outstanding, 0);

          const summary = [
            ["الإجمالي", `${filteredCandidates.length} مرشح`, "-", "-", "-", formatMoney(totalFees, settings.currency), formatMoney(totalPaid, settings.currency), formatMoney(totalOut, settings.currency)]
          ];

          generateDirectTablePDF({
            title: "سجل بيانات ومراحل المرشحين (Workers Ledger)",
            agencyName: settings.agencyName,
            phone: settings.phone,
            licenseNumber: settings.licenseNumber,
            taxNumber: settings.taxNumber,
            headers,
            rows,
            summaryRows: summary,
            filename: `Shuayb-Candidates-${reportDate}.pdf`,
            orientation: "landscape"
          });
        } else if (activeTab === "FINANCE") {
          const headers = ["البند المالي", "القيمة الإجمالية", "ملاحظات وتفاصيل"];
          const rows = [
            ["إجمالي قيمة العقود المقررة", formatMoney(financialSummary.totalContractFees, settings.currency), "إجمالي أتعاب جميع المرشحين"],
            ["المقبوضات المحصلة فعلياً", formatMoney(financialSummary.totalCollectedPayments, settings.currency), "السيولة النقدية الداخلة للمكتب"],
            ["المديونيات المتبقية طرف المرشحين", formatMoney(financialSummary.totalOutstanding, settings.currency), "مبالغ مستحقة قيد التحصيل"],
            ["مصروفات المعاملات المباشرة", formatMoney(financialSummary.totalCandidateExpenses, settings.currency), "فحوصات، تأشيرات، تفويض، سفر"],
            ["المصروفات التشغيلية العامة", formatMoney(financialSummary.totalGeneralExpenses, settings.currency), "إيجارات، رواتب، فواتير المكتب"],
            ["المجموع الكلي للنفقات", formatMoney(financialSummary.totalAllExpenses, settings.currency), "المصروفات المباشرة + العامة"],
            ["صافي الأرباح المتوقعة", formatMoney(financialSummary.netProfit, settings.currency), "العقود المقررة - إجمالي النفقات"],
            ["الفائض النقدي الفعلي الحالي", formatMoney(financialSummary.cashProfit, settings.currency), "المقبوضات المحصلة - إجمالي النفقات"]
          ];

          generateDirectTablePDF({
            title: "البيان المالي والتدفقات النقدية (Financial Statement)",
            agencyName: settings.agencyName,
            phone: settings.phone,
            licenseNumber: settings.licenseNumber,
            taxNumber: settings.taxNumber,
            headers,
            rows,
            filename: `Shuayb-Financial-Report-${reportDate}.pdf`,
            orientation: "portrait"
          });
        } else if (activeTab === "PAYMENTS") {
          const headers = ["رقم السند", "اسم المرشح", "المبلغ", "طريقة الدفع", "التاريخ", "البيان"];
          const rows = allPayments.map(p => [
            p.receiptNumber,
            p.candidateName,
            formatMoney(p.amount, settings.currency),
            p.method,
            p.date,
            p.notes
          ]);
          const total = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
          const summary = [
            ["الإجمالي", `${allPayments.length} سند`, formatMoney(total, settings.currency), "-", "-", "-"]
          ];

          generateDirectTablePDF({
            title: "سجل سندات المقبوضات (Receipts Ledger)",
            agencyName: settings.agencyName,
            phone: settings.phone,
            licenseNumber: settings.licenseNumber,
            taxNumber: settings.taxNumber,
            headers,
            rows,
            summaryRows: summary,
            filename: `Shuayb-Receipts-${reportDate}.pdf`,
            orientation: "portrait"
          });
        } else {
          // Expenses
          const headers = ["رقم البند", "بند المصروف", "التصنيف", "المبلغ", "التاريخ", "ملاحظات"];
          const rows = generalExpenses.map(e => [
            `#${e.id}`,
            e.title,
            e.category,
            formatMoney(e.amount, settings.currency),
            e.date,
            e.note || "-"
          ]);
          const total = generalExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
          const summary = [
            ["الإجمالي", `${generalExpenses.length} بند`, "-", formatMoney(total, settings.currency), "-", "-"]
          ];

          generateDirectTablePDF({
            title: "بيان المصروفات التشغيلية العامة (Expenses Ledger)",
            agencyName: settings.agencyName,
            phone: settings.phone,
            licenseNumber: settings.licenseNumber,
            taxNumber: settings.taxNumber,
            headers,
            rows,
            summaryRows: summary,
            filename: `Shuayb-Expenses-${reportDate}.pdf`,
            orientation: "portrait"
          });
        }
        showToast(isAr ? "تم توليد وتحميل ملف PDF بنجاح!" : "PDF downloaded successfully!");
      } else {
        // High-Resolution Document Snapshot Export
        let docName = "Shuayb-Report";
        if (activeTab === "CANDIDATES") docName = `Shuayb-Candidates-Report-${reportDate}`;
        else if (activeTab === "FINANCE") docName = `Shuayb-Financial-Report-${reportDate}`;
        else if (activeTab === "PAYMENTS") docName = `Shuayb-Payments-Receipts-${reportDate}`;
        else if (activeTab === "EXPENSES") docName = `Shuayb-Agency-Expenses-${reportDate}`;

        const success = await exportElementToPDF("printable-report", {
          filename: `${docName}.pdf`,
          orientation: activeTab === "CANDIDATES" ? "landscape" : "portrait",
          scale: 2
        });
        if (success) {
          showToast(isAr ? "تم تصدير مستند PDF الرسمي بنجاح!" : "Official PDF document exported successfully!");
        }
      }
    } catch (error) {
      console.error("PDF Export error:", error);
      showToast(isAr ? "حدث خطأ أثناء التصدير، جاري فتح الطباعة..." : "Export error, opening print dialog...");
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === "CANDIDATES") {
      exportCandidatesToCSV(candidates, settings, selectedStage);
    } else {
      exportFinanceToCSV(candidates, generalExpenses, settings);
    }
    showToast(isAr ? "تم تصدير ملف CSV / Excel بنجاح!" : "CSV exported successfully!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#172a46] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#c9a84c] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#172a46] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c9a84c]/20 text-[#c9a84c] flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <span>{isAr ? "مركز تصدير وطباعة تقارير PDF والجداول" : "Export & Print PDF Reports"}</span>
              </h3>
              <p className="text-xs text-stone-300">
                {isAr
                  ? "توليد ملفات PDF رسمية، طباعة مباشرة، وتصدير جداول Excel ونسخ احتياطية مدعومة بـ jsPDF & AutoTable"
                  : "Generate official PDF reports, direct print, and Excel/JSON exports powered by jsPDF & AutoTable"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-header / Tabs & Actions */}
        <div className="bg-stone-50 border-b border-stone-200 p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-200/70 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("CANDIDATES")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "CANDIDATES" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>{isAr ? "سجل المرشحين" : "Candidates"}</span>
            </button>

            <button
              onClick={() => setActiveTab("FINANCE")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "FINANCE" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? "التقرير المالي العام" : "Financial Report"}</span>
            </button>

            <button
              onClick={() => setActiveTab("PAYMENTS")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "PAYMENTS" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? "سجل سندات القبض" : "Receipts"}</span>
            </button>

            <button
              onClick={() => setActiveTab("EXPENSES")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "EXPENSES" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-rose-600" />
              <span>{isAr ? "مصروفات الوكالة" : "Expenses"}</span>
            </button>
          </div>

          {/* PDF Format Mode & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setExportMode("OFFICIAL_SHEET")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  exportMode === "OFFICIAL_SHEET" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600"
                }`}
                title="تصدير مستند ورقي معتمد بترويسة وختم الوكالة"
              >
                <Layers className="w-3 h-3 text-[#8B262A]" />
                <span>مستند رسمي</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode("DIRECT_TABLE")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  exportMode === "DIRECT_TABLE" ? "bg-white text-[#172a46] shadow-xs font-black" : "text-stone-600"
                }`}
                title="توليد جدول PDF سريع وفوري عبر jspdf-autotable"
              >
                <TableProperties className="w-3 h-3 text-blue-600" />
                <span>جدول AutoTable</span>
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              title="توليد وتحميل تقرير PDF رسمي عالي الدقة مباشرة إلى جهازك"
              className="px-4 py-2 bg-[#8B262A] hover:bg-[#a02c31] disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              {isExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
              ) : (
                <FileText className="w-4 h-4 text-[#c9a84c]" />
              )}
              <span>{isExportingPDF ? "جاري إنشاء PDF..." : "تحميل تقرير PDF"}</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              title="تصدير البيانات إلى ملف Excel بصيغة CSV"
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Instant Print */}
            <button
              onClick={handlePrint}
              title="طباعة التقرير عبر الطابعة أو حفظه كـ PDF عبر المتصفح"
              className="px-3.5 py-2 bg-[#172a46] hover:bg-[#243e65] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#c9a84c]" />
              <span>طباعة</span>
            </button>

            {/* Backup JSON */}
            <button
              onClick={() => {
                exportFullJSONBackup(candidates, generalExpenses, settings);
                showToast(isAr ? "تم تحميل النسخة الاحتياطية JSON بنجاح!" : "JSON backup downloaded!");
              }}
              title="تحميل نسخة احتياطية كاملة من جميع البيانات بصيغة JSON"
              className="px-2.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Filters bar if viewing candidates */}
        {activeTab === "CANDIDATES" && (
          <div className="px-6 py-2.5 bg-stone-100/60 border-b border-stone-200 flex flex-wrap items-center gap-3 text-xs shrink-0">
            <span className="font-bold text-stone-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              {isAr ? "تصفية التقرير:" : "Filter:"}
            </span>

            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg font-bold text-stone-700 outline-none text-xs"
            >
              <option value="ALL">{isAr ? "جميع المراحل" : "All Stages"}</option>
              {STAGES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {countries.length > 0 && (
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg font-bold text-stone-700 outline-none text-xs"
              >
                <option value="ALL">{isAr ? "جميع الوجهات" : "All Destinations"}</option>
                {countries.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <span className="text-stone-400 mr-auto text-[11px]">
              {isAr ? "عدد السجلات بالتقرير:" : "Total Records:"}{" "}
              <strong className="text-stone-700 font-mono">{filteredCandidates.length}</strong>
            </span>
          </div>
        )}

        {/* Scrollable Printable Document Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-100/40 space-y-6">
          {/* The Actual Printable Document Sheet */}
          <div
            id="printable-report"
            className="bg-white p-8 rounded-2xl shadow-xs border border-stone-200 max-w-4xl mx-auto space-y-6 text-stone-900"
            dir="rtl"
          >
            {/* Report Official Letterhead */}
            <div className="border-b-2 border-[#172a46] pb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShuaybLogo size="lg" variant="icon" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#172a46]">{settings.agencyName}</h1>
                  <p className="text-xs font-bold text-[#8B262A] mt-0.5">{settings.agencySubtitle || "مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-600 mt-2 font-medium">
                    {settings.licenseNumber && <span>ترخيص رقم: <strong className="text-[#172a46]">{settings.licenseNumber}</strong></span>}
                    {settings.taxNumber && <span>الرقم الضريبي: <strong className="text-[#172a46]">{settings.taxNumber}</strong></span>}
                    {settings.phone && <span>هاتف: <strong dir="ltr">{settings.phone}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <div className="inline-block bg-[#172a46] text-white px-3 py-1 rounded-xl text-xs font-black">
                  {activeTab === "CANDIDATES"
                    ? "تقرير سجل المرشحين والعمال"
                    : activeTab === "FINANCE"
                    ? "البيان المالي والتدفقات النقدية"
                    : activeTab === "PAYMENTS"
                    ? "سجل سندات المقبوضات"
                    : "بيان المصروفات التشغيلية"}
                </div>
                <div className="text-[10px] text-stone-400 mt-1.5 font-bold">
                  تاريخ الإصدار: {reportDate}
                </div>
              </div>
            </div>

            {/* Content View 1: Candidates Table */}
            {activeTab === "CANDIDATES" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-[#172a46] border-y border-stone-300 text-[11px] font-black">
                        <th className="py-2.5 px-3">الكود</th>
                        <th className="py-2.5 px-3">اسم المرشح</th>
                        <th className="py-2.5 px-3">المهنة / الوجهة</th>
                        <th className="py-2.5 px-3">المرحلة الحالية</th>
                        <th className="py-2.5 px-3">رقم الجواز</th>
                        <th className="py-2.5 px-3">الأتعاب</th>
                        <th className="py-2.5 px-3">المدفوع</th>
                        <th className="py-2.5 px-3">المتبقي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[11px]">
                      {filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-400 font-bold">
                            لا توجد بيانات مطابقة لخيارات التصفية
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map(c => {
                          const fin = calculateCandidateFinance(c);
                          const stageLabel = STAGES.find(s => s.id === c.stage)?.label || c.stage;
                          return (
                            <tr key={c.id} className="hover:bg-stone-50">
                              <td className="py-2 px-3 font-mono font-bold text-stone-600">{c.id}</td>
                              <td className="py-2 px-3 font-bold text-[#172a46]">{c.firstName} {c.lastName}</td>
                              <td className="py-2 px-3 text-stone-600">{c.job} - {c.country}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md font-bold text-[10px]">
                                  {stageLabel}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-stone-600">{c.passportNumber || "-"}</td>
                              <td className="py-2 px-3 font-bold">{formatMoney(fin.fees, settings.currency)}</td>
                              <td className="py-2 px-3 font-bold text-emerald-700">{formatMoney(fin.paid, settings.currency)}</td>
                              <td className="py-2 px-3 font-bold text-rose-600">{formatMoney(fin.outstanding, settings.currency)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Table Footer */}
                <div className="pt-3 border-t-2 border-stone-300 grid grid-cols-3 gap-4 text-xs font-black">
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px]">إجمالي أتعاب القائمة:</span>
                    <span className="font-mono">
                      {formatMoney(
                        filteredCandidates.reduce((sum, c) => sum + (c.totalFees || 0), 0),
                        settings.currency
                      )}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px]">إجمالي المقبوضات:</span>
                    <span className="text-emerald-700 font-mono">
                      {formatMoney(
                        filteredCandidates.reduce((sum, c) => sum + calculateCandidateFinance(c).paid, 0),
                        settings.currency
                      )}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[10px]">إجمالي المتبقي للتحصيل:</span>
                    <span className="text-rose-600 font-mono">
                      {formatMoney(
                        filteredCandidates.reduce((sum, c) => sum + calculateCandidateFinance(c).outstanding, 0),
                        settings.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Content View 2: Comprehensive Financial Statement */}
            {activeTab === "FINANCE" && (
              <div className="space-y-6">
                {/* 4 Financial Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">إجمالي العقود المقررة</span>
                    <strong className="text-sm sm:text-base font-black text-[#172a46] block mt-0.5 font-mono">
                      {formatMoney(financialSummary.totalContractFees, settings.currency)}
                    </strong>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">المقبوضات المحصلة فعلياً</span>
                    <strong className="text-sm sm:text-base font-black text-emerald-700 block mt-0.5 font-mono">
                      {formatMoney(financialSummary.totalCollectedPayments, settings.currency)}
                    </strong>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">إجمالي المصروفات (المباشرة والعامة)</span>
                    <strong className="text-sm sm:text-base font-black text-rose-600 block mt-0.5 font-mono">
                      {formatMoney(financialSummary.totalAllExpenses, settings.currency)}
                    </strong>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">صافي الأرباح المتوقعة</span>
                    <strong className="text-sm sm:text-base font-black text-[#c9a84c] block mt-0.5 font-mono">
                      {formatMoney(financialSummary.netProfit, settings.currency)}
                    </strong>
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <h4 className="font-black text-[#172a46] border-b border-stone-200 pb-1.5">
                      تحليل المصروفات التشغيلية
                    </h4>
                    <div className="space-y-1.5 text-stone-700">
                      <div className="flex justify-between">
                        <span>مصروفات المعاملات المباشرة:</span>
                        <strong className="font-bold font-mono">{formatMoney(financialSummary.totalCandidateExpenses, settings.currency)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>المصروفات العامة وإيجارات المكتب:</span>
                        <strong className="font-bold font-mono">{formatMoney(financialSummary.totalGeneralExpenses, settings.currency)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-stone-200 pt-1 font-black text-[#172a46]">
                        <span>المجموع الكلي للنفقات:</span>
                        <span className="font-mono">{formatMoney(financialSummary.totalAllExpenses, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <h4 className="font-black text-[#172a46] border-b border-stone-200 pb-1.5">
                      حالة السيولة والتحصيل
                    </h4>
                    <div className="space-y-1.5 text-stone-700">
                      <div className="flex justify-between">
                        <span>السيولة النقدية المحصلة:</span>
                        <strong className="font-bold text-emerald-700 font-mono">{formatMoney(financialSummary.totalCollectedPayments, settings.currency)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>المديونيات المتبقية طرف المرشحين:</span>
                        <strong className="font-bold text-rose-600 font-mono">{formatMoney(financialSummary.totalOutstanding, settings.currency)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-stone-200 pt-1 font-black text-[#172a46]">
                        <span>الفائض النقدي الفعلي الحالي:</span>
                        <span className={`font-mono ${financialSummary.cashProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          {formatMoney(financialSummary.cashProfit, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content View 3: Payments Ledger Table */}
            {activeTab === "PAYMENTS" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-[#172a46] border-y border-stone-300 text-[11px] font-black">
                        <th className="py-2.5 px-3">رقم السند</th>
                        <th className="py-2.5 px-3">اسم المرشح</th>
                        <th className="py-2.5 px-3">المبلغ المحصل</th>
                        <th className="py-2.5 px-3">طريقة الدفع</th>
                        <th className="py-2.5 px-3">تاريخ السند</th>
                        <th className="py-2.5 px-3">البيان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[11px]">
                      {allPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-400 font-bold">
                            لا توجد سندات قبض مسجلة
                          </td>
                        </tr>
                      ) : (
                        allPayments.map((p, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2 px-3 font-mono font-bold text-stone-600">{p.receiptNumber}</td>
                            <td className="py-2 px-3 font-bold text-[#172a46]">{p.candidateName}</td>
                            <td className="py-2 px-3 font-black text-emerald-700 font-mono">{formatMoney(p.amount, settings.currency)}</td>
                            <td className="py-2 px-3 text-stone-600">{p.method}</td>
                            <td className="py-2 px-3 text-stone-600">{p.date}</td>
                            <td className="py-2 px-3 text-stone-500">{p.notes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs font-black">
                  <span>إجمالي المقبوضات في السجل:</span>
                  <span className="text-emerald-700 text-sm font-mono">
                    {formatMoney(
                      allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
                      settings.currency
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Content View 4: General Expenses Table */}
            {activeTab === "EXPENSES" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-[#172a46] border-y border-stone-300 text-[11px] font-black">
                        <th className="py-2.5 px-3">رقم البند</th>
                        <th className="py-2.5 px-3">بند المصروف</th>
                        <th className="py-2.5 px-3">التصنيف</th>
                        <th className="py-2.5 px-3">المبلغ</th>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[11px]">
                      {generalExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-400 font-bold">
                            لا توجد مصروفات عامة مسجلة
                          </td>
                        </tr>
                      ) : (
                        generalExpenses.map((e, idx) => (
                          <tr key={e.id || idx} className="hover:bg-stone-50">
                            <td className="py-2 px-3 font-mono font-bold text-stone-600">#{e.id}</td>
                            <td className="py-2 px-3 font-bold text-[#172a46]">{e.title}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md font-bold text-[10px]">
                                {e.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-black text-rose-600 font-mono">{formatMoney(e.amount, settings.currency)}</td>
                            <td className="py-2 px-3 text-stone-600">{e.date}</td>
                            <td className="py-2 px-3 text-stone-500">{e.note || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs font-black">
                  <span>إجمالي المصروفات العامة:</span>
                  <span className="text-rose-600 text-sm font-mono">
                    {formatMoney(
                      generalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
                      settings.currency
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Official Report Sign-off & Stamp Area for PDF / Print */}
            <div className="pt-8 border-t-2 border-stone-300 flex justify-between items-end text-xs text-stone-600">
              <div className="space-y-1">
                <span className="block font-bold">توقيع المسؤول المالي / المدير:</span>
                <span className="block text-stone-400">................................................</span>
              </div>

              <div className="text-center space-y-1">
                <span className="block font-bold">ختم الوكالة الرسمي</span>
                <div className="w-24 h-16 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center text-[10px] text-stone-300">
                  ختم معتمد
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs shrink-0">
          <span className="text-stone-500 font-medium">
            {isAr
              ? "يمكنك تحميل التقرير كملف PDF عالي الجودة أو طباعته فورياً عبر أي طابعة."
              : "Download high-quality PDF reports or print directly to any printer."}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl font-bold transition-colors"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
