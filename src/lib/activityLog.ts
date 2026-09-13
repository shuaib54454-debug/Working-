import { ActivityLogEntry, ActivityActionType, ActivityCategory, Candidate, GeneralExpense } from "../types";
import { STAGES } from "../data/initialData";

export function generateActivityId(): string {
  return "ACT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function createActivityEntry(
  actionType: ActivityActionType,
  category: ActivityCategory,
  title: string,
  description: string,
  userEmail: string,
  options?: {
    userName?: string;
    userUid?: string;
    candidateId?: string;
    candidateName?: string;
    amount?: number;
    metadata?: Record<string, any>;
    customTimestamp?: number;
  }
): ActivityLogEntry {
  const timestamp = options?.customTimestamp || Date.now();
  return {
    id: generateActivityId(),
    actionType,
    category,
    title,
    description,
    timestamp,
    date: new Date(timestamp).toISOString(),
    userEmail: userEmail || "مدير النظام",
    userName: options?.userName,
    userUid: options?.userUid,
    candidateId: options?.candidateId,
    candidateName: options?.candidateName,
    amount: options?.amount,
    metadata: options?.metadata
  };
}

/**
 * Synthesizes past activity logs from current candidates and expenses.
 * Useful if the database was just initialized or activities need to be reconstructed.
 */
export function buildHistoricActivitiesFromData(
  candidates: Candidate[],
  generalExpenses: GeneralExpense[],
  defaultUserEmail: string = "مدير النظام"
): ActivityLogEntry[] {
  const stageMap = new Map(STAGES.map((s) => [s.id, s.label]));
  const logs: ActivityLogEntry[] = [];

  candidates.forEach((cand) => {
    const candName = `${cand.firstName} ${cand.lastName}`.trim();
    const regDate = cand.registrationDate ? new Date(cand.registrationDate).getTime() : Date.now();

    // 1. Registration
    logs.push({
      id: `ACT-REG-${cand.id}`,
      actionType: "CANDIDATE_CREATED",
      category: "CANDIDATE",
      title: `تسجيل مرشح جديد: ${candName}`,
      description: `تم إضافة المرشح ${candName} إلى النظام في مهنة (${cand.job || "غير محدد"}) بجواز سفر رقم (${cand.passportNumber || "بدون"})`,
      timestamp: isNaN(regDate) ? Date.now() : regDate,
      date: cand.registrationDate || new Date().toISOString(),
      userEmail: defaultUserEmail,
      candidateId: cand.id,
      candidateName: candName,
      amount: cand.totalFees
    });

    // 2. Stage history
    if (cand.stageHistory && cand.stageHistory.length > 0) {
      cand.stageHistory.forEach((hist) => {
        const fromLabel = stageMap.get(hist.fromStage) || hist.fromStage;
        const toLabel = stageMap.get(hist.toStage) || hist.toStage;
        logs.push({
          id: `ACT-STG-${hist.id || hist.timestamp}`,
          actionType: "STAGE_CHANGE",
          category: "STAGE",
          title: `تغيير مرحلة: ${candName} إلى ${toLabel}`,
          description: `تم نقل المرشح ${candName} من مرحلة [${fromLabel}] إلى مرحلة [${toLabel}]${hist.note ? ` - ملاحظة: ${hist.note}` : ""}`,
          timestamp: hist.timestamp || new Date(hist.date).getTime() || Date.now(),
          date: hist.date,
          userEmail: hist.changedBy || defaultUserEmail,
          candidateId: cand.id,
          candidateName: candName
        });
      });
    }

    // 3. Payments
    if (cand.payments && cand.payments.length > 0) {
      cand.payments.forEach((pay) => {
        const payTime = pay.date ? new Date(pay.date).getTime() : Date.now();
        logs.push({
          id: `ACT-PAY-${cand.id}-${pay.id}`,
          actionType: "PAYMENT_ADDED",
          category: "PAYMENT",
          title: `قبض دفعة مالية: ${candName}`,
          description: `تم استلام دفعة بقيمة ${pay.amount} عن طريق (${pay.method || "كاش"})${pay.receiptNumber ? ` برقم سند (${pay.receiptNumber})` : ""}${pay.note ? ` - ${pay.note}` : ""}`,
          timestamp: isNaN(payTime) ? Date.now() : payTime,
          date: pay.date,
          userEmail: defaultUserEmail,
          candidateId: cand.id,
          candidateName: candName,
          amount: pay.amount
        });
      });
    }

    // 4. Candidate Expenses
    if (cand.expenses && cand.expenses.length > 0) {
      cand.expenses.forEach((exp) => {
        const expTime = exp.date ? new Date(exp.date).getTime() : Date.now();
        logs.push({
          id: `ACT-EXP-CAND-${cand.id}-${exp.id}`,
          actionType: "EXPENSE_CANDIDATE_ADDED",
          category: "EXPENSE",
          title: `مصروف مرشح: ${candName} (${exp.category})`,
          description: `تم تسجيل مصروف على المرشح بقيمة ${exp.amount} لتغطية (${exp.category})${exp.note ? ` - ${exp.note}` : ""}`,
          timestamp: isNaN(expTime) ? Date.now() : expTime,
          date: exp.date,
          userEmail: defaultUserEmail,
          candidateId: cand.id,
          candidateName: candName,
          amount: exp.amount
        });
      });
    }

    // 5. Notes
    if (cand.noteEntries && cand.noteEntries.length > 0) {
      cand.noteEntries.forEach((note) => {
        const noteTime = note.date ? new Date(note.date).getTime() : Date.now();
        logs.push({
          id: `ACT-NOTE-${cand.id}-${note.id}`,
          actionType: "NOTE_ADDED",
          category: "DOCUMENT",
          title: `تدوين ملاحظة: ${candName}`,
          description: `تمت إضافة ملاحظة جديدة: "${note.text.slice(0, 80)}${note.text.length > 80 ? "..." : ""}"`,
          timestamp: isNaN(noteTime) ? Date.now() : noteTime,
          date: note.date || new Date().toISOString(),
          userEmail: note.author || defaultUserEmail,
          candidateId: cand.id,
          candidateName: candName
        });
      });
    }
  });

  // General Expenses
  generalExpenses.forEach((gExp) => {
    const gTime = gExp.date ? new Date(gExp.date).getTime() : Date.now();
    logs.push({
      id: `ACT-EXP-GEN-${gExp.id}`,
      actionType: "EXPENSE_GENERAL_ADDED",
      category: "EXPENSE",
      title: `مصروف تشغيلي عام: ${gExp.title}`,
      description: `تم تسجيل مصروف عام في فئة (${gExp.category}) بقيمة ${gExp.amount}${gExp.note ? ` - ${gExp.note}` : ""}`,
      timestamp: isNaN(gTime) ? Date.now() : gTime,
      date: gExp.date,
      userEmail: defaultUserEmail,
      amount: gExp.amount
    });
  });

  // Sort descending by timestamp
  return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function formatRelativeTimeArabic(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return "الآن";
  if (diffSec < 90) return "منذ دقيقة";
  if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
  const diffHours = Math.floor(diffSec / 3600);
  if (diffHours === 1) return "منذ ساعة";
  if (diffHours === 2) return "منذ ساعتين";
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays === 2) return "منذ يومين";
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "منذ شهر";
  if (diffMonths < 12) return `منذ ${diffMonths} شهر`;
  return `منذ ${Math.floor(diffDays / 365)} سنة`;
}

export function exportActivitiesToCSV(activities: ActivityLogEntry[], currency: string = "ETB"): void {
  const headers = [
    "معرّف الإجراء",
    "التاريخ والوقت",
    "التصنيف",
    "نوع الإجراء",
    "العنوان",
    "التفاصيل",
    "المستخدم / المنفّذ",
    "المرشح",
    "معرّف المرشح",
    `المبلغ (${currency})`
  ];

  const categoryLabels: Record<ActivityCategory, string> = {
    STAGE: "مسار المراحل",
    PAYMENT: "سندات القبض",
    EXPENSE: "المصروفات",
    CANDIDATE: "ملفات المرشحين",
    DOCUMENT: "الوثائق والملاحظات",
    SETTINGS: "إعدادات النظام"
  };

  const rows = activities.map((act) => [
    act.id,
    new Date(act.timestamp).toLocaleString("ar-EG"),
    categoryLabels[act.category] || act.category,
    act.actionType,
    `"${(act.title || "").replace(/"/g, '""')}"`,
    `"${(act.description || "").replace(/"/g, '""')}"`,
    act.userEmail || "",
    `"${(act.candidateName || "").replace(/"/g, '""')}"`,
    act.candidateId || "",
    act.amount !== undefined ? act.amount : ""
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Shuayb_Activity_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
