import { Candidate, GeneralExpense, AgencySettings, StageId } from "../types";
import { STAGES, formatMoney, calculateCandidateFinance } from "../data/initialData";

/**
 * Trigger download of text content as a file with UTF-8 BOM for Excel compatibility
 */
export function downloadCSV(filename: string, csvContent: string) {
  // \uFEFF is UTF-8 Byte Order Mark, crucial for Excel to recognize Arabic characters properly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format CSV cell to escape quotes and commas
 */
function escapeCSV(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Candidates list to detailed CSV
 */
export function exportCandidatesToCSV(candidates: Candidate[], settings: AgencySettings, filterStage?: string) {
  const filtered = candidates.filter(c => !c.archived && (!filterStage || filterStage === "ALL" || c.stage === filterStage));

  const headers = [
    "كود المرشح",
    "الاسم الأول",
    "اسم العائلة",
    "الاسم الكامل",
    "الجنس",
    "رقم الهاتف",
    "المهنة المطلوبة",
    "دولة الوجهة",
    "المرحلة الحالية",
    "رقم الجواز",
    "تاريخ انتهاء الجواز",
    "رقم التأشيرة",
    "إجمالي الأتعاب المقررة",
    "سداد مستحقات على الوكالة (خصم)",
    "صافي الأتعاب",
    "المبالغ المدفوعة",
    "المبلغ المتبقي",
    "المصروفات المباشرة",
    "صافي ربح المعاملة",
    "تاريخ التسجيل",
    "تاريخ السفر المقدر",
    "ملاحظات"
  ];

  const rows = filtered.map(c => {
    const fin = calculateCandidateFinance(c);
    const stageLabel = STAGES.find(s => s.id === c.stage)?.label || c.stage;

    return [
      escapeCSV(c.id),
      escapeCSV(c.firstName),
      escapeCSV(c.lastName),
      escapeCSV(`${c.firstName} ${c.lastName}`),
      escapeCSV(c.gender === "male" ? "ذكر" : "أنثى"),
      escapeCSV(c.phone),
      escapeCSV(c.job),
      escapeCSV(c.country),
      escapeCSV(stageLabel),
      escapeCSV(c.passportNumber || "غير متوفر"),
      escapeCSV(c.passportExpiryDate || "-"),
      escapeCSV(c.visaNumber || "-"),
      escapeCSV(fin.fees),
      escapeCSV(fin.agencyLiability),
      escapeCSV(fin.netFees),
      escapeCSV(fin.paid),
      escapeCSV(fin.outstanding),
      escapeCSV(fin.exp),
      escapeCSV(fin.profit),
      escapeCSV(c.registrationDate),
      escapeCSV(c.flightDate || "-"),
      escapeCSV(c.notes || "")
    ].join(",");
  });

  const csvContent = [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(`candidates_report_${dateStr}.csv`, csvContent);
}

/**
 * Export Comprehensive Financial Ledger to CSV
 */
export function exportFinanceToCSV(candidates: Candidate[], generalExpenses: GeneralExpense[], settings: AgencySettings) {
  const activeCandidates = candidates.filter(c => !c.archived);

  // Section 1: Candidate Payments Ledger
  const paymentHeaders = [
    "النوع",
    "رقم السند / المعرف",
    "كود المرشح",
    "اسم المرشح",
    "المهنة والوجهة",
    "المبلغ المحصل",
    "العملة",
    "طريقة الدفع",
    "تاريخ السند",
    "البيان والملاحظات"
  ];

  const paymentRows: string[] = [];
  activeCandidates.forEach(c => {
    (c.payments || []).forEach(p => {
      paymentRows.push([
        escapeCSV("سند قبض مرشح"),
        escapeCSV(p.receiptNumber || p.id),
        escapeCSV(c.id),
        escapeCSV(`${c.firstName} ${c.lastName}`),
        escapeCSV(`${c.job} - ${c.country}`),
        escapeCSV(p.amount),
        escapeCSV(settings.currency),
        escapeCSV(p.method || "نقدي"),
        escapeCSV(p.date),
        escapeCSV(p.note || "دفعة أتعاب توظيف")
      ].join(","));
    });
  });

  // Section 2: General Expenses
  const expenseHeaders = [
    "النوع",
    "رقم السند",
    "بند المصروف",
    "التصنيف",
    "المبلغ",
    "العملة",
    "تاريخ الصرف",
    "ملاحظات وبيان الصرف"
  ];

  const expenseRows = generalExpenses.map(e => [
    escapeCSV("مصروف عام للوكالة"),
    escapeCSV(e.id),
    escapeCSV(e.title),
    escapeCSV(e.category),
    escapeCSV(e.amount),
    escapeCSV(settings.currency),
    escapeCSV(e.date),
    escapeCSV(e.note || "")
  ].join(","));

  const fullCsv = [
    escapeCSV(`=== سجل مقبوضات وسندات دفع المرشحين (${settings.agencyName}) ===`),
    paymentHeaders.map(escapeCSV).join(","),
    ...paymentRows,
    "",
    escapeCSV("=== سجل المصروفات العامة والتشغيلية للوكالة ==="),
    expenseHeaders.map(escapeCSV).join(","),
    ...expenseRows
  ].join("\r\n");

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(`financial_ledger_${dateStr}.csv`, fullCsv);
}

/**
 * Export Complete System Backup (Candidates, Expenses, Settings) as a JSON file
 */
export function exportFullJSONBackup(
  candidates: Candidate[],
  generalExpenses: GeneralExpense[],
  settings: AgencySettings
) {
  const backupObject = {
    version: "1.0",
    agencyName: settings.agencyName,
    backupDate: new Date().toISOString(),
    stats: {
      candidatesCount: candidates.length,
      expensesCount: generalExpenses.length,
      currency: settings.currency
    },
    settings,
    candidates,
    generalExpenses
  };

  const blob = new Blob([JSON.stringify(backupObject, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `agency_full_backup_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
