import React, { useState, useRef } from "react";
import {
  ChevronRight,
  User,
  Phone,
  PhoneCall,
  MessageCircle,
  MapPin,
  Briefcase,
  Calendar,
  ShieldCheck,
  Plane,
  CreditCard,
  Receipt,
  FileCheck,
  Stethoscope,
  GraduationCap,
  Ticket,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  DollarSign,
  FileText,
  BadgeCheck,
  Send,
  X,
  Scan,
  Camera,
  Upload,
  ExternalLink,
  File,
  Image as ImageIcon,
  Download,
  Loader2
} from "lucide-react";
import { Candidate, AgencySettings, StageId, PaymentRecord, CandidateExpense } from "../types";
import { STAGES, formatMoney, getTodayDateString, calculateCandidateFinance } from "../data/initialData";
import { exportElementToPDF } from "../lib/pdfUtils";
import { ReceiptData } from "./ReceiptModal";
import { PassportScannerModal } from "./PassportScannerModal";
import { uploadWorkerDocument, WorkerStorageFolder } from "../lib/firebase";

interface CandidateProfileProps {
  candidate: Candidate;
  settings: AgencySettings;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenEditModal: () => void;
  onPrintReceipt: (data: ReceiptData) => void;
}

export const CandidateProfile: React.FC<CandidateProfileProps> = ({
  candidate,
  settings,
  onBack,
  onUpdate,
  onArchive,
  onDelete,
  onOpenEditModal,
  onPrintReceipt
}) => {
  const [activeTab, setActiveTab] = useState<"INFO" | "STEPS" | "MONEY" | "DOCS">("INFO");
  const [showScannerModal, setShowScannerModal] = useState(false);
  
  // Payment Modal State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<"كاش" | "تحويل بنكي" | "شيك" | "أخرى">("تحويل بنكي");
  const [paymentNote, setPaymentNote] = useState("");

  // Candidate Expense Modal State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayDateString());
  const [expenseCategory, setExpenseCategory] = useState<CandidateExpense["category"]>("فحص طبي");
  const [expenseNote, setExpenseNote] = useState("");

  // Agency Liability Modal State
  const [showEditLiabilityModal, setShowEditLiabilityModal] = useState(false);
  const [liabilityAmount, setLiabilityAmount] = useState("");

  // Cloud Storage Upload State
  const [uploadingFolder, setUploadingFolder] = useState<WorkerStorageFolder | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportProfilePDF = async () => {
    setIsExportingPDF(true);
    try {
      const filename = `Candidate-${candidate.firstName}-${candidate.lastName}-${candidate.id}.pdf`;
      await exportElementToPDF("candidate-profile-container", {
        filename,
        orientation: "portrait",
        scale: 2
      });
    } catch (err) {
      console.error("Candidate PDF export failed:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleFileUpload = async (folder: WorkerStorageFolder, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFolder(folder);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const { downloadUrl, storagePath } = await uploadWorkerDocument(candidate.id, folder, file);
      if (folder === "passport") {
        onUpdate(candidate.id, { passportImageUrl: downloadUrl, passportStoragePath: storagePath });
      } else if (folder === "photo") {
        onUpdate(candidate.id, { photoUrl: downloadUrl, photoStoragePath: storagePath });
      } else if (folder === "contract") {
        onUpdate(candidate.id, { contractStoragePath: storagePath });
      } else if (folder === "visa") {
        onUpdate(candidate.id, { visaStoragePath: storagePath });
      } else if (folder === "medical") {
        onUpdate(candidate.id, { medicalStoragePath: storagePath });
      } else if (folder === "coc") {
        onUpdate(candidate.id, { cocImageUrl: downloadUrl, cocStoragePath: storagePath });
      }
      setUploadSuccess(`تم رفع وثيقة (${folder}) إلى Cloud Storage بنجاح`);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "فشل رفع الملف إلى Cloud Storage");
    } finally {
      setUploadingFolder(null);
      e.target.value = "";
    }
  };

  const fin = calculateCandidateFinance(candidate);
  const currentStage = STAGES.find(s => s.id === candidate.stage) || STAGES[0];

  // Passport expiry check
  const isPassportExpiringSoon = candidate.passportExpiryDate
    ? new Date(candidate.passportExpiryDate).getTime() - Date.now() < 180 * 24 * 60 * 60 * 1000
    : false;

  // Handle adding payment
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;

    const newPayment: PaymentRecord = {
      id: Date.now(),
      amount: Number(paymentAmount),
      date: paymentDate,
      method: paymentMethod,
      note: paymentNote,
      receiptNumber: `REC-${String(Math.floor(1000 + Math.random() * 9000))}`
    };

    const updatedPayments = [...(candidate.payments || []), newPayment];
    onUpdate(candidate.id, { payments: updatedPayments });

    // Open receipt modal for printing immediately
    onPrintReceipt({
      type: "PAYMENT",
      receiptNumber: newPayment.receiptNumber || "REC-NEW",
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      candidateId: candidate.id,
      candidateJob: candidate.job,
      amount: newPayment.amount,
      date: newPayment.date,
      paymentMethod: newPayment.method,
      note: newPayment.note,
      remainingBalance: Math.max(0, candidate.totalFees - (fin.paid + newPayment.amount))
    });

    setPaymentAmount("");
    setPaymentNote("");
    setShowAddPaymentModal(false);
  };

  // Handle adding candidate expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) return;

    const newExp: CandidateExpense = {
      id: Date.now(),
      amount: Number(expenseAmount),
      date: expenseDate,
      category: expenseCategory,
      note: expenseNote
    };

    const updatedExpenses = [...(candidate.expenses || []), newExp];
    onUpdate(candidate.id, { expenses: updatedExpenses });

    setExpenseAmount("");
    setExpenseNote("");
    setShowAddExpenseModal(false);
  };

  // Quick stage switcher
  const handleStageChange = (newStage: StageId) => {
    onUpdate(candidate.id, { stage: newStage });
  };

  return (
    <div id="candidate-profile-container" className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Profile Header */}
      <div className="bg-[#172a46] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        {/* Decorative badge watermark */}
        <div className="absolute left-[-20px] top-[-20px] w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-[#c9a84c]/10 blur-3xl pointer-events-none" />

        {/* Back and actions row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-2xl transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للقائمة</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportProfilePDF}
              disabled={isExportingPDF}
              title="تحميل ملف المرشح بصيغة PDF"
              className="flex items-center gap-1.5 bg-[#8B262A] hover:bg-[#a02c31] disabled:opacity-50 text-white px-3.5 py-2 rounded-2xl text-xs font-black shadow-sm transition-transform active:scale-95"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a84c]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#c9a84c]" />
              )}
              <span>{isExportingPDF ? "جاري إنشاء PDF..." : "تحميل ملف PDF"}</span>
            </button>

            <button
              onClick={() => window.print()}
              title="طباعة الملف"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white px-3 py-2 rounded-2xl text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>طباعة</span>
            </button>

            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-4 py-2 rounded-2xl text-xs font-black shadow-sm transition-transform active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل البيانات</span>
            </button>

            <button
              onClick={() => onArchive(candidate.id)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white px-3.5 py-2 rounded-2xl text-xs font-bold transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>أرشفة</span>
            </button>
          </div>
        </div>

        {/* Candidate Profile Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#c9a84c] text-[#172a46] font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20">
              {candidate.firstName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {candidate.firstName} {candidate.lastName}
                </h2>
                <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-xl text-[#c9a84c] border border-white/10">
                  {candidate.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-stone-300 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-white">
                  <Briefcase className="w-4 h-4 text-[#c9a84c]" />
                  {candidate.job || "مهنة غير محددة"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-stone-400" />
                  {candidate.country || "الوجهة غير محددة"}
                </span>
                <span>•</span>
                <span className="text-stone-400">
                  تاريخ التسجيل: {candidate.registrationDate}
                </span>
              </div>
            </div>
          </div>

          {/* Current Stage Switcher Pill */}
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">المرحلة الحالية</span>
            <div className="relative">
              <select
                value={candidate.stage}
                onChange={e => handleStageChange(e.target.value as StageId)}
                className={`px-4 py-2 rounded-2xl text-xs font-black cursor-pointer shadow-lg outline-none appearance-none pr-8 pl-4 ${currentStage.bgColor} ${currentStage.textColor} border border-white/20`}
              >
                {STAGES.map(s => (
                  <option key={s.id} value={s.id} className="bg-white text-[#172a46]">
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="absolute left-2.5 top-2.5 pointer-events-none text-current">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-white/10 pt-4 overflow-x-auto no-scrollbar relative z-10">
          <button
            onClick={() => setActiveTab("INFO")}
            className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "INFO"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm"
                : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            البيانات الشخصية
          </button>

          <button
            onClick={() => setActiveTab("STEPS")}
            className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "STEPS"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm"
                : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            مراحل وإجراءات الاستقدام
          </button>

          <button
            onClick={() => setActiveTab("MONEY")}
            className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "MONEY"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm"
                : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            الحسابات والمالية
            {fin.outstanding > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("DOCS")}
            className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "DOCS"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm"
                : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            الملاحظات والوثائق
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: INFO (البيانات الشخصية وجواز السفر)
      ========================================================================== */}
      {activeTab === "INFO" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in">
          {/* Personal Info Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <User className="w-5 h-5 text-[#c9a84c]" />
              <h3 className="font-black text-sm text-[#172a46]">المعلومات الشخصية والاتصال</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 font-bold block mb-1">الاسم الكامل</span>
                <span className="font-extrabold text-[#172a46] text-sm">{candidate.firstName} {candidate.lastName}</span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">رقم الهاتف</span>
                <div className="flex items-center gap-2">
                  <span dir="ltr" className="font-mono font-bold text-stone-800 text-sm">{candidate.phone || "غير محدد"}</span>
                  {candidate.phone && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${candidate.phone}`}
                        title="اتصال هاتفي مباشر"
                        className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors active:scale-95 shadow-xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${candidate.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="محادثة واتساب"
                        className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors active:scale-95 shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {candidate.secondPhone && (
                <div>
                  <span className="text-stone-400 font-bold block mb-1">هاتف إضافي / طوارئ</span>
                  <span dir="ltr" className="font-mono font-bold text-stone-800">{candidate.secondPhone}</span>
                </div>
              )}

              <div>
                <span className="text-stone-400 font-bold block mb-1">الجنس</span>
                <span className="font-bold text-stone-800">{candidate.gender === "female" ? "أنثى" : "ذكر"}</span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">تاريخ الميلاد</span>
                <span className="font-bold text-stone-800">{candidate.dateOfBirth || "غير محدد"}</span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">العنوان / الإقامة</span>
                <span className="font-bold text-stone-800">{candidate.address || candidate.city || "غير محدد"}</span>
              </div>
            </div>
          </div>

          {/* Passport Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
                <h3 className="font-black text-sm text-[#172a46]">بيانات جواز السفر والتحقق</h3>
              </div>
              <div className="flex items-center gap-2">
                {isPassportExpiringSoon && (
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    قرب انتهاء الصلاحية
                  </span>
                )}
                <button
                  onClick={() => setShowScannerModal(true)}
                  className="bg-stone-100 hover:bg-stone-200 text-[#172a46] px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all active:scale-95"
                >
                  <Scan className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>فحص MRZ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 font-bold block mb-1">رقم جواز السفر</span>
                <span className="font-mono font-black text-sm text-[#172a46] bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-100 inline-block">
                  {candidate.passportNumber || "لم يسجل بعد"}
                </span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">تاريخ الإصدار</span>
                <span className="font-bold text-stone-800">{candidate.passportIssueDate || "غير محدد"}</span>
              </div>

              <div className="col-span-2">
                <span className="text-stone-400 font-bold block mb-1">تاريخ الانتهاء</span>
                <div className={`p-2.5 rounded-2xl border font-bold flex items-center justify-between ${
                  isPassportExpiringSoon ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-100 text-stone-800'
                }`}>
                  <span>{candidate.passportExpiryDate || "غير محدد"}</span>
                  {candidate.passportExpiryDate && (
                    <span className="text-[10px]">
                      {new Date(candidate.passportExpiryDate) < new Date() ? "منتهي الصلاحية!" : "ساري المفعول"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COC Certificate Card (Ethiopian Certificate of Competence) */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#c9a84c]" />
                <h3 className="font-black text-sm text-[#172a46]">شهادة الكفاءة المهنية الإثيوبية (COC - Certificate of Competence)</h3>
              </div>
              <div>
                {candidate.cocStatus === "معتمد ومجتاز (Pass)" || candidate.cocStatus === "معتمد ومجتاز" ? (
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    معتمد ومجتاز (Pass)
                  </span>
                ) : candidate.cocStatus === "غير مجتاز (Fail)" ? (
                  <span className="text-xs font-black bg-rose-100 text-rose-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    غير مجتاز (Fail)
                  </span>
                ) : candidate.cocStatus === "قيد الاختبار والتقييم" || candidate.cocStatus === "بانتظار ظهور النتيجة" ? (
                  <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {candidate.cocStatus}
                  </span>
                ) : (
                  <span className="text-xs font-black bg-stone-100 text-stone-600 px-3 py-1 rounded-full">
                    {candidate.cocStatus || "لم يختبر بعد"}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">رقم شهادة COC</span>
                <span className="font-mono font-black text-sm text-[#172a46] block">
                  {candidate.cocNumber || "غير مسجل"}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">معتمدة من هيئة التدريب الإثيوبية</span>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">حالة التقييم والاختبار</span>
                <span className="font-bold text-stone-800 block text-sm">{candidate.cocStatus || "لم يختبر بعد"}</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">جاهزية العامل المهنية</span>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">تاريخ إصدار الشهادة</span>
                <span className="font-bold text-stone-800 block text-sm">{candidate.cocIssueDate || "غير محدد"}</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">صلاحية الاعتماد</span>
              </div>
            </div>
          </div>

          {/* Job, Agent & Sponsor Details */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Building2 className="w-5 h-5 text-[#c9a84c]" />
              <h3 className="font-black text-sm text-[#172a46]">بيانات التعاقد، الوسيط، وصاحب العمل</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">المهنة والبلد المطلوب</span>
                <span className="font-black text-sm text-[#172a46] block">{candidate.job}</span>
                <span className="text-stone-600 font-bold block mt-0.5">{candidate.country}</span>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">المكتب الخارجي / الوسيط</span>
                <span className="font-bold text-stone-800 block text-sm">{candidate.agentName || "مباشر بدون وسيط"}</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">شريك الاستقدام</span>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-stone-400 font-bold block mb-1">الكفيل / صاحب العمل</span>
                <span className="font-bold text-stone-800 block text-sm">{candidate.sponsorName || "بانتظار الربط مع كفيل"}</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">مدة العقد: {candidate.contractDurationYears || 2} سنوات</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: STEPS (المراحل وتفاصيل الفحص والتأشيرة والتذكرة)
      ========================================================================== */}
      {activeTab === "STEPS" && (
        <div className="space-y-5 animate-in fade-in">
          {/* Main Stage Progression Tracker */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[#172a46] flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-[#c9a84c]" />
                <span>شريط التقدم في مراحل الاستقدام</span>
              </h3>
              <span className="text-xs font-bold text-stone-500">
                المرحلة: <strong className="text-[#172a46]">{currentStage.label}</strong>
              </span>
            </div>

            {/* Visual Stage Steps Line */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {STAGES.slice(0, 8).map((stage, idx) => {
                const isPassed = STAGES.findIndex(s => s.id === candidate.stage) >= idx;
                const isCurrent = candidate.stage === stage.id;

                return (
                  <div
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#172a46] text-white border-[#172a46] shadow-md scale-102"
                        : isPassed
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 mb-1">خطوة {idx + 1}</div>
                    <div className="text-xs font-black truncate">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Checkpoints: Medical, Training, Visa, Flight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medical Checkup */}
            <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#172a46]">الفحص الطبي (GAMCA / المركز المعتمد)</h4>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">حالة الفحص الطبي</label>
                  <select
                    value={candidate.medicalStatus || "لم يفحص"}
                    onChange={e => onUpdate(candidate.id, { medicalStatus: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    <option value="لم يفحص">لم يفحص بعد</option>
                    <option value="بانتظار النتيجة">بانتظار ظهور النتيجة</option>
                    <option value="لائق طبياً (مكتمل)">لائق طبياً (مكتمل معتمد)</option>
                    <option value="غير لائق طبياً">غير لائق طبياً (مستبعد)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Training */}
            <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#172a46]">التدريب والتأهيل المهني</h4>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">حالة التدريب والدورات</label>
                  <select
                    value={candidate.trainingStatus || "لم يبدأ"}
                    onChange={e => onUpdate(candidate.id, { trainingStatus: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    <option value="لم يبدأ">لم يبدأ التدريب</option>
                    <option value="قيد التدريب">قيد التدريب والتأهيل</option>
                    <option value="مكتمل مع شهادة معتمدة">مكتمل مع شهادة معتمدة</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COC Certificate Checkpoint */}
            <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#172a46]">شهادة الكفاءة المهنية (COC)</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">حالة اختبار COC</label>
                  <select
                    value={candidate.cocStatus || "لم يختبر بعد"}
                    onChange={e => onUpdate(candidate.id, { cocStatus: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    <option value="لم يختبر بعد">لم يختبر بعد</option>
                    <option value="قيد الاختبار والتقييم">قيد الاختبار والتقييم</option>
                    <option value="بانتظار ظهور النتيجة">بانتظار ظهور النتيجة</option>
                    <option value="معتمد ومجتاز (Pass)">معتمد ومجتاز (Pass)</option>
                    <option value="غير مجتاز (Fail)">غير مجتاز (Fail)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">رقم الشهادة المعتمد</label>
                  <input
                    type="text"
                    placeholder="مثال: COC-ETH-8821"
                    value={candidate.cocNumber || ""}
                    onChange={e => onUpdate(candidate.id, { cocNumber: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  />
                </div>
              </div>
            </div>

            {/* Visa */}
            <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#172a46]">التأشيرة ومعاملة السفارة</h4>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">حالة التأشيرة</label>
                  <select
                    value={candidate.visaStatus || "لم تقدم"}
                    onChange={e => onUpdate(candidate.id, { visaStatus: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    <option value="لم تقدم">لم تقدم للسفارة بعد</option>
                    <option value="قيد الإجراء بالسفارة">قيد الإجراء بالسفارة / القنصلية</option>
                    <option value="صدرت التأشيرة بنجاح">صدرت التأشيرة بنجاح</option>
                    <option value="مرفوضة">مرفوضة من السفارة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1">رقم التأشيرة</label>
                  <input
                    type="text"
                    placeholder="مثال: VSA-SA-90123"
                    value={candidate.visaNumber || ""}
                    onChange={e => onUpdate(candidate.id, { visaNumber: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  />
                </div>
              </div>
            </div>

            {/* Flight Ticket */}
            <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Plane className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#172a46]">حجز تذكرة الطيران وموعد السفر</h4>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">حالة التذكرة</label>
                    <select
                      value={candidate.flightStatus || "لم تحجز بعد"}
                      onChange={e => onUpdate(candidate.id, { flightStatus: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                    >
                      <option value="لم تحجز بعد">لم تحجز بعد</option>
                      <option value="تم تأكيد التذكرة">تم تأكيد التذكرة</option>
                      <option value="سافر">سافر بنجاح</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-400 font-bold mb-1">تاريخ الرحلة</label>
                    <input
                      type="date"
                      value={candidate.flightDate || ""}
                      onChange={e => onUpdate(candidate.id, { flightDate: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-[#c9a84c]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-stone-400 font-bold mb-1">رقم التذكرة / خط الطيران</label>
                  <input
                    type="text"
                    placeholder="مثال: ET-9012 الخطوط الإثيوبية"
                    value={candidate.flightTicketNumber || ""}
                    onChange={e => onUpdate(candidate.id, { flightTicketNumber: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MONEY (الحسابات، المدفوعات، المصروفات وسندات القبض والصرف)
      ========================================================================== */}
      {activeTab === "MONEY" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Agency Liability / Dues Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-[#172a46]">بند سداد المستحقات على الوكالة (الخصم من أتعاب التوظيف)</h4>
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-lg border border-amber-200">
                    مستحقات توظيف العامل
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  المبلغ المترتب على الوكالة سداده لجهات خارجية أو عمولات استقدام تخص هذا العامل ويتم خصمه مباشرة من إجمالي أتعاب التوظيف لاحتساب صافي الأرباح بدقة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right sm:text-left bg-white px-4 py-2.5 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-bold text-stone-400 block">المبلغ المخصوم</span>
                <span className="text-lg font-black text-amber-700">{formatMoney(fin.agencyLiability, settings.currency)}</span>
              </div>
              <button
                onClick={() => {
                  setLiabilityAmount(String(candidate.agencyLiability || 0));
                  setShowEditLiabilityModal(true);
                }}
                className="bg-[#172a46] hover:bg-[#203a60] text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-transform active:scale-95 shadow-sm whitespace-nowrap"
              >
                تعديل المستحقات
              </button>
            </div>
          </div>

          {/* Financial KPI Summary Cards (5-grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block mb-1">إجمالي أتعاب التوظيف</span>
              <span className="text-lg sm:text-xl font-black text-[#172a46] block">{formatMoney(fin.fees, settings.currency)}</span>
              <span className="text-[10px] text-stone-400 mt-1 block">القيمة الإجمالية</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-100 shadow-xs bg-amber-50/30">
              <span className="text-[11px] font-bold text-amber-800 block mb-1">مستحقات على الوكالة (-)</span>
              <span className="text-lg sm:text-xl font-black text-amber-700 block">{formatMoney(fin.agencyLiability, settings.currency)}</span>
              <span className="text-[10px] text-amber-600 font-bold mt-1 block">خصم من الأتعاب</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block mb-1">المبالغ المقبوضة</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 block">{formatMoney(fin.paid, settings.currency)}</span>
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block">نسبة التحصيل: {fin.paymentProgress}%</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block mb-1">المتبقي للتحصيل</span>
              <span className={`text-lg sm:text-xl font-black block ${fin.outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatMoney(fin.outstanding, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{fin.outstanding > 0 ? "مستحق على العميل" : "تم السداد كاملاً"}</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-stone-400 block mb-1">صافي ربح المعاملة</span>
              <span className="text-lg sm:text-xl font-black text-[#c9a84c] block">{formatMoney(fin.profit, settings.currency)}</span>
              <span className="text-[10px] text-stone-500 mt-1 block">الأتعاب - مستحقات الوكالة - المصروفات ({formatMoney(fin.exp)})</span>
            </div>
          </div>

          {/* Payments & Candidate Expenses Two-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payments Column */}
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-sm text-[#172a46]">سجل المدفوعات والمقبوضات</h3>
                </div>
                <button
                  onClick={() => setShowAddPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  تسجيل دفعة
                </button>
              </div>

              {/* Payments List */}
              <div className="space-y-2.5">
                {(candidate.payments && candidate.payments.length > 0) ? (
                  candidate.payments.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-emerald-700">{formatMoney(p.amount, settings.currency)}</span>
                          <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-bold text-stone-600">
                            {p.method || "كاش"}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">{p.note || "دفعة أتعاب استقدام"}</p>
                        <span className="text-[10px] text-stone-400 font-mono">التاريخ: {p.date} • سند: {p.receiptNumber || `REC-${idx+1}`}</span>
                      </div>

                      <button
                        onClick={() =>
                          onPrintReceipt({
                            type: "PAYMENT",
                            receiptNumber: p.receiptNumber || `REC-${idx + 1}`,
                            candidateName: `${candidate.firstName} ${candidate.lastName}`,
                            candidateId: candidate.id,
                            candidateJob: candidate.job,
                            amount: p.amount,
                            date: p.date,
                            paymentMethod: p.method,
                            note: p.note,
                            remainingBalance: fin.outstanding
                          })
                        }
                        title="طباعة سند قبض"
                        className="p-2 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:text-[#172a46] hover:border-[#172a46] transition-colors shrink-0 flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>سند</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-stone-400 text-xs italic">
                    لا توجد دفعات مسجلة حتى الآن.
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Expenses Column */}
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  <h3 className="font-black text-sm text-[#172a46]">مصروفات المرشح والمعاملات</h3>
                </div>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  تسجيل مصروف
                </button>
              </div>

              {/* Expenses List */}
              <div className="space-y-2.5">
                {(candidate.expenses && candidate.expenses.length > 0) ? (
                  candidate.expenses.map((e, idx) => (
                    <div
                      key={e.id || idx}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-rose-700">{formatMoney(e.amount, settings.currency)}</span>
                          <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-bold text-stone-600">
                            {e.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">{e.note || "مصروف معاملة"}</p>
                        <span className="text-[10px] text-stone-400 font-mono">التاريخ: {e.date}</span>
                      </div>

                      <button
                        onClick={() =>
                          onPrintReceipt({
                            type: "EXPENSE",
                            receiptNumber: `EXP-${idx + 1}`,
                            candidateName: `${candidate.firstName} ${candidate.lastName}`,
                            candidateId: candidate.id,
                            candidateJob: candidate.job,
                            amount: e.amount,
                            date: e.date,
                            category: e.category,
                            note: e.note
                          })
                        }
                        title="طباعة سند صرف"
                        className="p-2 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:text-[#172a46] hover:border-[#172a46] transition-colors shrink-0 flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>سند</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-stone-400 text-xs italic">
                    لا توجد مصروفات مسجلة لهذا المرشح.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DOCS & NOTES (الملاحظات والوثائق والسحابة)
      ========================================================================== */}
      {activeTab === "DOCS" && (
        <div className="space-y-5 animate-in fade-in">
          {/* Cloud Storage Documents Section */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[#172a46] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
                <span>أرشيف وثائق المرشح (Firebase Cloud Storage)</span>
              </h3>
              <span className="text-[11px] font-bold text-stone-400">
                workers/{candidate.id}/
              </span>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* 1. Passport Document */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-black text-stone-800">صورة جواز السفر</span>
                  </div>
                  {candidate.passportImageUrl ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      مرفوع
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-600">
                      غير متوفر
                    </span>
                  )}
                </div>

                {candidate.passportImageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={candidate.passportImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#172a46] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#203a60] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>عرض الصورة</span>
                    </a>
                  </div>
                )}

                <div className="pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>{uploadingFolder === "passport" ? "جاري الرفع..." : "رفع صورة الجواز"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingFolder === "passport"}
                      onChange={e => handleFileUpload("passport", e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 2. Candidate Photo */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-black text-stone-800">الصورة الشخصية</span>
                  </div>
                  {candidate.photoUrl ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      مرفوع
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-600">
                      غير متوفر
                    </span>
                  )}
                </div>

                {candidate.photoUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={candidate.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#172a46] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#203a60] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>معاينة الصورة</span>
                    </a>
                  </div>
                )}

                <div className="pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>{uploadingFolder === "photo" ? "جاري الرفع..." : "رفع الصورة الشخصية"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingFolder === "photo"}
                      onChange={e => handleFileUpload("photo", e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 3. Contract Document */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-black text-stone-800">عقد العمل والاتفاقية</span>
                  </div>
                  {candidate.contractStoragePath ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      محفوظ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-600">
                      غير متوفر
                    </span>
                  )}
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>{uploadingFolder === "contract" ? "جاري الرفع..." : "رفع ملف العقد (PDF/صورة)"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingFolder === "contract"}
                      onChange={e => handleFileUpload("contract", e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 4. Medical Document */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-black text-stone-800">التقرير الطبي</span>
                  </div>
                  {candidate.medicalStoragePath ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      محفوظ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-600">
                      غير متوفر
                    </span>
                  )}
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>{uploadingFolder === "medical" ? "جاري الرفع..." : "رفع التقرير الطبي"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingFolder === "medical"}
                      onChange={e => handleFileUpload("medical", e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 5. COC Certificate Document */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-black text-stone-800">شهادة الكفاءة المهنية (COC)</span>
                  </div>
                  {candidate.cocStoragePath || candidate.cocImageUrl ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      محفوظ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-600">
                      غير متوفر
                    </span>
                  )}
                </div>

                {candidate.cocImageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={candidate.cocImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#172a46] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#203a60] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>معاينة شهادة COC</span>
                    </a>
                  </div>
                )}

                <div className="pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>{uploadingFolder === "coc" ? "جاري الرفع..." : "رفع شهادة COC (صورة/PDF)"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingFolder === "coc"}
                      onChange={e => handleFileUpload("coc", e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-[#172a46] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#c9a84c]" />
              <span>الملاحظات وسجل المتابعة الإدارية</span>
            </h3>

            <textarea
              rows={5}
              value={candidate.notes || ""}
              onChange={e => onUpdate(candidate.id, { notes: e.target.value })}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
              placeholder="اكتب هنا أي تفاصيل خاصة بالمرشح، تفضيلات الكفيل، أو أي متطلبات خاصة بالاستقدام..."
            />

            <div className="flex justify-end">
              <button
                onClick={() => alert("تم حفظ الملاحظات بنجاح")}
                className="px-4 py-2 bg-[#172a46] text-white rounded-2xl text-xs font-black"
              >
                تحديث الملاحظات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Payment */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-stone-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-[#172a46]">تسجيل دفعة مالية جديدة</h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">المبلغ المطلوب تسجيله ({settings.currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="مثال: 50000"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-black text-stone-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">تاريخ الدفعة</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">طريقة السداد</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                >
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="كاش">نقداً (كاش)</option>
                  <option value="شيك">شيك مصرفي</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">ملاحظات أو بيان الدفعة</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="مثال: دفعة ثانية بعد صدور التأشيرة"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 text-stone-500 font-bold rounded-2xl hover:bg-stone-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md"
                >
                  حفظ وطباعة السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Expense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-stone-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-[#172a46]">تسجيل مصروف للمرشح</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">المبلغ المصروف ({settings.currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="مثال: 4500"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-black text-stone-800 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">بند المصروف</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                >
                  <option value="فحص طبي">فحص طبي</option>
                  <option value="تأشيرة">رسوم تأشيرة وسفارة</option>
                  <option value="تدريب">تدريب وتأهيل</option>
                  <option value="تذكرة طيران">تذكرة طيران</option>
                  <option value="عمولة وسيط">عمولة وسيط / مكتب</option>
                  <option value="سداد مستحقات الوكالة">سداد مستحقات الوكالة (رسوم استقدام)</option>
                  <option value="إداري">إداري وترجمة وتصديق</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">تاريخ الصرف</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">بيان وتفاصيل المصروف</label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  placeholder="مثال: رسوم تصديق الوثائق من الخارجية"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 text-stone-500 font-bold rounded-2xl hover:bg-stone-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-md"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Agency Liability / Dues */}
      {showEditLiabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-stone-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-base text-[#172a46]">تعديل مستحقات الوكالة على العامل</h3>
              </div>
              <button onClick={() => setShowEditLiabilityModal(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdate(candidate.id, { agencyLiability: Number(liabilityAmount || 0) });
                setShowEditLiabilityModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 text-stone-700 leading-relaxed">
                <p className="font-bold text-[#172a46] mb-1">💡 آلية خصم المستحقات:</p>
                يتم خصم هذا المبلغ مباشرة من إجمالي أتعاب التوظيف (<strong className="text-[#172a46]">{formatMoney(candidate.totalFees, settings.currency)}</strong>) لحساب الأرباح الفعلية الصافية للوكالة عن هذا العامل.
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  مبلغ المستحقات على الوكالة ({settings.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={liabilityAmount}
                  onChange={e => setLiabilityAmount(e.target.value)}
                  placeholder="مثال: 15000"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-base font-black text-amber-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditLiabilityModal(false)}
                  className="px-4 py-2 text-stone-500 font-bold rounded-2xl hover:bg-stone-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#172a46] hover:bg-[#203a60] text-white font-black rounded-2xl shadow-md"
                >
                  حفظ وتحديث الأرباح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passport Scanner & MRZ Verification Modal */}
      <PassportScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onApplyData={(data) => {
          onUpdate(candidate.id, {
            passportNumber: data.passportNumber || candidate.passportNumber,
            passportExpiryDate: data.passportExpiryDate || candidate.passportExpiryDate,
            dateOfBirth: data.dateOfBirth || candidate.dateOfBirth,
            gender: data.gender || candidate.gender,
            country: data.country || candidate.country,
            job: data.job || candidate.job
          });
        }}
      />
    </div>
  );
};
