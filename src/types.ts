export type StageId = 
  | "NEW" 
  | "INTERVIEW" 
  | "MEDICAL" 
  | "TRAINING" 
  | "CONTRACT" 
  | "VISA" 
  | "FLIGHT" 
  | "READY" 
  | "TRAVELLED" 
  | "COMPLETED" 
  | "CANCELLED";

export interface StageConfig {
  id: StageId;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  stepNumber: number;
}

export interface PaymentRecord {
  id: string | number;
  amount: number;
  date: string;
  note?: string;
  method?: "كاش" | "تحويل بنكي" | "شيك" | "أخرى";
  receiptNumber?: string;
}

export interface CandidateExpense {
  id: string | number;
  amount: number;
  date: string;
  category: "فحص طبي" | "تأشيرة" | "تدريب" | "تذكرة طيران" | "إداري" | "عمولة وسيط" | "سداد مستحقات الوكالة" | "أخرى";
  note?: string;
}

export interface GeneralExpense {
  id: string | number;
  ownerUid?: string;
  title: string;
  amount: number;
  date: string;
  category: "إيجار" | "رواتب" | "تسويق" | "رسوم حكومية" | "فواتير ومرافق" | "ضيافة وصيانة" | "سداد مستحقات وكالة" | "أخرى";
  note?: string;
}

export interface Candidate {
  id: string; // e.g. CAND-0001
  ownerUid?: string;
  firstName: string;
  lastName: string;
  phone: string;
  secondPhone?: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  address?: string;
  city?: string;
  job: string;
  country: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportStoragePath?: string; // Firebase Cloud Storage path: workers/{id}/passport/...
  passportImageUrl?: string; // Firebase Cloud Storage download URL
  photoStoragePath?: string; // Firebase Cloud Storage path: workers/{id}/photo/...
  photoUrl?: string;
  contractStoragePath?: string;
  visaStoragePath?: string;
  medicalStoragePath?: string;
  cocStoragePath?: string; // Firebase Cloud Storage path: workers/{id}/coc/...
  cocImageUrl?: string;
  stage: StageId;
  medicalStatus?: string; // "لائق طبياً", "بانتظار النتيجة", "غير لائق", "لم يفحص"
  medicalDate?: string;
  cocNumber?: string; // رقم شهادة الكفاءة المهنية COC (Certificate of Competence)
  cocStatus?: string; // "معتمد ومجتاز", "قيد الاختبار", "بانتظار النتيجة", "غير مجتاز", "لم يختبر بعد"
  cocIssueDate?: string;
  trainingStatus?: string; // "مكتمل", "قيد التدريب", "لم يبدأ"
  visaStatus?: string; // "صدرت", "قيد الإجراء", "مرفوضة", "لم تقدم"
  visaNumber?: string;
  flightStatus?: string; // "تم الحجز", "بانتظار التأكيد", "لم تحجز"
  flightDate?: string;
  flightTicketNumber?: string;
  totalFees: number;
  agencyLiability?: number; // مستحقات الوكالة / رسوم الاستقدام المترتبة على الوكالة المخصومة من أتعاب التوظيف
  payments: PaymentRecord[];
  expenses: CandidateExpense[];
  registrationDate: string;
  archived: boolean;
  notes?: string;
  agentName?: string; // اسم الوسيط / المندوب
  sponsorName?: string; // اسم الكفيل / صاحب العمل
  contractDurationYears?: number;
}

export interface AgencySettings {
  ownerUid?: string;
  agencyName: string;
  agencySubtitle?: string;
  currency: string;
  nextId: number;
  phone: string;
  email: string;
  address: string;
  taxNumber?: string;
  licenseNumber?: string;
}

export interface FinanceSummary {
  fees: number;
  agencyLiability: number;
  netFees: number; // الأتعاب الصافية بعد خصم مستحقات الوكالة (fees - agencyLiability)
  paid: number;
  exp: number;
  outstanding: number;
  profit: number; // الربح الصافي بعد خصم مستحقات الوكالة والمصروفات
  paymentProgress: number;
}

export type ActiveView = "dashboard" | "list" | "profile" | "add" | "finance" | "archive" | "settings";
