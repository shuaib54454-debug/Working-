import { Candidate, StageConfig, AgencySettings, GeneralExpense } from "../types";

export const STORAGE_KEYS = {
  candidates: "shuayb_rec_cands_v2",
  expenses: "shuayb_rec_exp_v2",
  settings: "shuayb_rec_set_v2",
  activities: "shuayb_rec_activities_v1"
};

export const STAGES: StageConfig[] = [
  { id: "NEW", label: "New Registered", color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700", stepNumber: 1 },
  { id: "INTERVIEW", label: "Interview & Test", color: "bg-indigo-500", bgColor: "bg-indigo-50", textColor: "text-indigo-700", stepNumber: 2 },
  { id: "MEDICAL", label: "Medical Check", color: "bg-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700", stepNumber: 3 },
  { id: "TRAINING", label: "Training & Orientation", color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700", stepNumber: 4 },
  { id: "CONTRACT", label: "Contract Signed", color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700", stepNumber: 5 },
  { id: "VISA", label: "Visa Processing", color: "bg-pink-500", bgColor: "bg-pink-50", textColor: "text-pink-700", stepNumber: 6 },
  { id: "FLIGHT", label: "Flight Booking", color: "bg-cyan-500", bgColor: "bg-cyan-50", textColor: "text-cyan-700", stepNumber: 7 },
  { id: "READY", label: "Ready to Travel", color: "bg-emerald-500", bgColor: "bg-emerald-50", textColor: "text-emerald-700", stepNumber: 8 },
  { id: "TRAVELLED", label: "Travelled & Placed", color: "bg-green-600", bgColor: "bg-green-50", textColor: "text-green-800", stepNumber: 9 },
  { id: "COMPLETED", label: "Contract Completed", color: "bg-slate-700", bgColor: "bg-slate-100", textColor: "text-slate-800", stepNumber: 10 },
  { id: "CANCELLED", label: "Cancelled / Dropped", color: "bg-rose-500", bgColor: "bg-rose-50", textColor: "text-rose-700", stepNumber: 11 }
];

export const getStageLabel = (stageId: string, isAr: boolean = false): string => {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return stageId;
  if (!isAr) return stage.label;
  const arMap: Record<string, string> = {
    NEW: "مسجل جديد",
    INTERVIEW: "مقابلة واختبار",
    MEDICAL: "فحص طبي",
    TRAINING: "تدريب وتأهيل",
    CONTRACT: "توقيع العقد",
    VISA: "إصدار التأشيرة",
    FLIGHT: "حجز الطيران",
    READY: "جاهز للسفر",
    TRAVELLED: "سافر بنجاح",
    COMPLETED: "مكتمل العقد",
    CANCELLED: "ملغي / مستبعد"
  };
  return arMap[stageId] || stage.label;
};

export const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: "Shuayb Recruitment & Trade Agency",
  agencySubtitle: "Shuayb Trade Bridge - Manpower Recruitment & Commercial Trade Services",
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
