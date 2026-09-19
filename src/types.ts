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

export interface WorkerDocumentRecord {
  id: string; // e.g. "DOC-CAND-0001-PASSPORT-K8A2"
  folder: "passport" | "photo" | "contract" | "visa" | "medical" | "coc" | "documents";
  title: string;
  url: string;
  storagePath?: string;
  fileName?: string;
  uploadedAt: string;
  fileType?: "pdf" | "image";
  sizeBytes?: number;
}

export interface CandidateNoteEntry {
  id: string;
  date: string;
  author?: string;
  text: string;
  referencedDocId?: string;
}

export interface CandidateStageHistoryEntry {
  id: string;
  fromStage?: StageId;
  toStage: StageId;
  date: string; // ISO 8601 string or formatted date
  timestamp: number;
  note?: string;
  changedBy?: string;
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
  idCardNumber?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportStoragePath?: string; // Firebase Cloud Storage path: workers/{id}/passport/...
  passportImageUrl?: string; // Firebase Cloud Storage download URL
  passportDocId?: string; // Unique Document ID
  photoStoragePath?: string; // Firebase Cloud Storage path: workers/{id}/photo/...
  photoUrl?: string;
  photoDocId?: string;
  contractStoragePath?: string;
  contractUrl?: string;
  contractDocId?: string;
  visaStoragePath?: string;
  visaUrl?: string;
  visaDocId?: string;
  medicalStoragePath?: string;
  medicalUrl?: string;
  medicalDocId?: string;
  cocStoragePath?: string;
  cocImageUrl?: string;
  cocDocId?: string;
  uploadedDocuments?: WorkerDocumentRecord[];
  stage: StageId;
  medicalStatus?: string;
  medicalDate?: string;
  cocNumber?: string;
  cocStatus?: string;
  cocIssueDate?: string;
  trainingStatus?: string;
  visaStatus?: string;
  visaNumber?: string;
  flightStatus?: string;
  flightDate?: string;
  flightTicketNumber?: string;
  totalFees: number;
  agencyLiability?: number;
  payments: PaymentRecord[];
  expenses: CandidateExpense[];
  registrationDate: string;
  archived: boolean;
  updatedAt?: string;
  notes?: string;
  noteEntries?: CandidateNoteEntry[];
  agentName?: string;
  sponsorName?: string;
  contractDurationYears?: number;
  stageHistory?: CandidateStageHistoryEntry[];
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

export interface AppSecuritySettings {
  enabled: boolean;
  pinCode?: string;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  lastActiveTimestamp?: number;
}

export interface FinanceSummary {
  fees: number;
  agencyLiability: number;
  netFees: number;
  paid: number;
  exp: number;
  outstanding: number;
  profit: number;
  paymentProgress: number;
}

export type ActiveView = "dashboard" | "list" | "profile" | "add" | "finance" | "activity" | "archive" | "settings";

export type ActivityActionType =
  | "STAGE_CHANGE"
  | "CANDIDATE_CREATED"
  | "CANDIDATE_UPDATED"
  | "CANDIDATE_ARCHIVED"
  | "CANDIDATE_RESTORED"
  | "CANDIDATE_DELETED"
  | "PAYMENT_ADDED"
  | "PAYMENT_DELETED"
  | "EXPENSE_CANDIDATE_ADDED"
  | "EXPENSE_CANDIDATE_DELETED"
  | "EXPENSE_GENERAL_ADDED"
  | "EXPENSE_GENERAL_DELETED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "NOTE_ADDED"
  | "SETTINGS_UPDATED";

export type ActivityCategory =
  | "STAGE"
  | "PAYMENT"
  | "EXPENSE"
  | "CANDIDATE"
  | "DOCUMENT"
  | "SETTINGS";

export interface ActivityLogEntry {
  id: string;
  ownerUid?: string;
  actionType: ActivityActionType;
  category: ActivityCategory;
  title: string;
  description: string;
  timestamp: number;
  date: string;
  userEmail: string;
  userName?: string;
  userUid?: string;
  candidateId?: string;
  candidateName?: string;
  amount?: number;
  metadata?: Record<string, any>;
}
