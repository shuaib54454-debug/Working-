import { Candidate, StageConfig, AgencySettings, GeneralExpense } from "../types";

export const STORAGE_KEYS = {
  candidates: "shuayb_rec_cands_v2",
  expenses: "shuayb_rec_exp_v2",
  settings: "shuayb_rec_set_v2"
};

export const STAGES: StageConfig[] = [
  { id: "NEW", label: "مسجل جديد", color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700", stepNumber: 1 },
  { id: "INTERVIEW", label: "مقابلة واختبار", color: "bg-indigo-500", bgColor: "bg-indigo-50", textColor: "text-indigo-700", stepNumber: 2 },
  { id: "MEDICAL", label: "فحص طبي", color: "bg-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700", stepNumber: 3 },
  { id: "TRAINING", label: "تدريب وتأهيل", color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700", stepNumber: 4 },
  { id: "CONTRACT", label: "توقيع العقد", color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700", stepNumber: 5 },
  { id: "VISA", label: "إصدار التأشيرة", color: "bg-pink-500", bgColor: "bg-pink-50", textColor: "text-pink-700", stepNumber: 6 },
  { id: "FLIGHT", label: "حجز الطيران", color: "bg-cyan-500", bgColor: "bg-cyan-50", textColor: "text-cyan-700", stepNumber: 7 },
  { id: "READY", label: "جاهز للسفر", color: "bg-emerald-500", bgColor: "bg-emerald-50", textColor: "text-emerald-700", stepNumber: 8 },
  { id: "TRAVELLED", label: "سافر بنجاح", color: "bg-green-600", bgColor: "bg-green-50", textColor: "text-green-800", stepNumber: 9 },
  { id: "COMPLETED", label: "مكتمل العقد", color: "bg-slate-700", bgColor: "bg-slate-100", textColor: "text-slate-800", stepNumber: 10 },
  { id: "CANCELLED", label: "ملغي / مستبعد", color: "bg-rose-500", bgColor: "bg-rose-50", textColor: "text-rose-700", stepNumber: 11 }
];

export const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: "وكالة شُعيب للاستقدام والتبادل التجاري",
  agencySubtitle: "Shuayb Trade Bridge - تسهيل خدمات الاستقدام والتوظيف والتبادل التجاري",
  currency: "ETB",
  nextId: 1,
  phone: "",
  email: "",
  address: "",
  licenseNumber: "",
  taxNumber: ""
};

export const INITIAL_CANDIDATES: Candidate[] = [];

export const INITIAL_EXPENSES: GeneralExpense[] = [];

export const formatMoney = (val: number | string, cur: string = "ETB"): string => {
  const num = Number(val || 0);
  return `${num.toLocaleString("en-US")} ${cur}`;
};

export const getTodayDateString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const calculateCandidateFinance = (c: Candidate) => {
  const paid = (c.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const exp = (c.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const fees = Number(c.totalFees || 0);
  const agencyLiability = Number(c.agencyLiability || 0);
  const netFees = Math.max(0, fees - agencyLiability);
  const outstanding = Math.max(0, fees - paid);
  const profit = fees - agencyLiability - exp;
  const paymentProgress = fees > 0 ? Math.min(100, Math.round((paid / fees) * 100)) : 0;
  return { fees, agencyLiability, netFees, paid, exp, outstanding, profit, paymentProgress };
};
