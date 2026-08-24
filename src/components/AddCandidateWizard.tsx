import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Briefcase,
  Globe,
  FileCheck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
  Camera,
  Scan
} from "lucide-react";
import { Candidate, AgencySettings, StageId } from "../types";
import { getTodayDateString } from "../data/initialData";
import { PassportScannerModal } from "./PassportScannerModal";

interface AddCandidateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (candidateData: Partial<Candidate>, initialPayment?: { amount: number; method: any; note: string }) => void;
  settings: AgencySettings;
}

export const AddCandidateWizard: React.FC<AddCandidateWizardProps> = ({
  isOpen,
  onClose,
  onAdd,
  settings
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isScannedWithMRZ, setIsScannedWithMRZ] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondPhone, setSecondPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const [job, setJob] = useState("");
  const [country, setCountry] = useState("المملكة العربية السعودية");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");
  const [cocNumber, setCocNumber] = useState("");
  const [cocStatus, setCocStatus] = useState("لم يختبر بعد");
  const [cocIssueDate, setCocIssueDate] = useState("");
  const [agentName, setAgentName] = useState("");
  const [sponsorName, setSponsorName] = useState("");

  const [totalFees, setTotalFees] = useState("");
  const [agencyLiability, setAgencyLiability] = useState("");
  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"كاش" | "تحويل بنكي" | "شيك">("تحويل بنكي");
  const [initialPaymentNote, setInitialPaymentNote] = useState("دفعة مقدمة عند التسجيل");

  if (!isOpen) return null;

  const nextCandidateId = `CAND-${String(settings.nextId).padStart(4, "0")}`;

  const handleScanApplied = (data: {
    firstName: string;
    lastName: string;
    passportNumber: string;
    passportExpiryDate: string;
    dateOfBirth: string;
    gender: "male" | "female";
    country: string;
    job?: string;
  }) => {
    if (data.firstName) setFirstName(data.firstName);
    if (data.lastName && data.lastName !== "-") setLastName(data.lastName);
    if (data.passportNumber) setPassportNumber(data.passportNumber);
    if (data.passportExpiryDate) setPassportExpiryDate(data.passportExpiryDate);
    if (data.dateOfBirth) setDateOfBirth(data.dateOfBirth);
    if (data.gender) setGender(data.gender);
    if (data.country) setCountry(data.country);
    if (data.job) setJob(data.job);
    setIsScannedWithMRZ(true);
  };

  const handleFinish = () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !job.trim() || !country.trim()) {
      alert("يرجى ملء الحقول الأساسية المطلوبة.");
      return;
    }

    const candidateData: Partial<Candidate> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      secondPhone: secondPhone.trim(),
      gender,
      dateOfBirth,
      address,
      job: job.trim(),
      country: country.trim(),
      passportNumber: passportNumber.trim(),
      passportExpiryDate,
      cocNumber: cocNumber.trim(),
      cocStatus,
      cocIssueDate,
      agentName: agentName.trim(),
      sponsorName: sponsorName.trim(),
      totalFees: Number(totalFees || 0),
      agencyLiability: Number(agencyLiability || 0),
      stage: "NEW",
      medicalStatus: "لم يفحص",
      trainingStatus: "لم يبدأ",
      visaStatus: "لم تقدم",
      flightStatus: "لم تحجز بعد"
    };

    let initialPayment = undefined;
    if (hasInitialPayment && Number(initialPaymentAmount) > 0) {
      initialPayment = {
        amount: Number(initialPaymentAmount),
        method: initialPaymentMethod,
        note: initialPaymentNote
      };
    }

    onAdd(candidateData, initialPayment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-[#172a46] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">تسجيل مرشح جديد (معالج الإدخال)</h3>
              <p className="text-xs text-stone-300">الرقم المخصص تلقائياً: <strong className="text-[#c9a84c] font-mono">{nextCandidateId}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Indicator */}
        <div className="bg-stone-50 px-6 py-3.5 border-b border-stone-200">
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 right-4 left-4 h-0.5 bg-stone-200 -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  step >= 1 ? "bg-[#172a46] text-white shadow-xs" : "bg-stone-200 text-stone-500"
                }`}
              >
                1
              </div>
              <span className={`text-[11px] font-bold mt-1 ${step >= 1 ? "text-[#172a46]" : "text-stone-400"}`}>
                البيانات الشخصية
              </span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  step >= 2 ? "bg-[#172a46] text-white shadow-xs" : "bg-stone-200 text-stone-500"
                }`}
              >
                2
              </div>
              <span className={`text-[11px] font-bold mt-1 ${step >= 2 ? "text-[#172a46]" : "text-stone-400"}`}>
                المهنة والجواز
              </span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  step === 3 ? "bg-[#c9a84c] text-[#172a46] shadow-xs font-black" : "bg-stone-200 text-stone-500"
                }`}
              >
                3
              </div>
              <span className={`text-[11px] font-bold mt-1 ${step === 3 ? "text-[#172a46]" : "text-stone-400"}`}>
                الأتعاب والمالية
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
          {/* Smart Passport Scanner Banner */}
          <div className="bg-gradient-to-r from-[#172a46] to-[#223d64] p-3.5 sm:p-4 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-[#c9a84c]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center shrink-0 shadow-xs font-black">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs sm:text-sm">ماسح الجواز الذكي (MRZ + OCR + تدقيق التواريخ)</h4>
                  {isScannedWithMRZ && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> تم الفحص والمطابقة
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300">
                  استخراج آلي وتعبئة فورية ومطابقة كود MRZ مع الحقول والتحقق الرياضي من صلاحية الجواز
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap self-stretch sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>فحص ومسح الجواز الآن</span>
            </button>
          </div>

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">الاسم الأول *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">اسم العائلة / اللقب *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: يوسف إبراهيم"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم الهاتف الأساسي *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="+251 9X XXX XXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c] text-right"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم هاتف إضافي (اختياري)</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="+251 9X XXX XXXX"
                    value={secondPhone}
                    onChange={e => setSecondPhone(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c] text-right"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">الجنس</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  >
                    <option value="female">أنثى</option>
                    <option value="male">ذكر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">العنوان أو مكان الإقامة</label>
                  <input
                    type="text"
                    placeholder="مثال: أديس أبابا - كيركوس"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Job & Passport */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">المهنة / الوظيفة المستهدفة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عاملة منزلية، سائق خاص، طاهي، تمريض..."
                    value={job}
                    onChange={e => setJob(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">دولة العمل / الوجهة *</label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  >
                    <option value="المملكة العربية السعودية">المملكة العربية السعودية</option>
                    <option value="دولة الإمارات العربية المتحدة">دولة الإمارات العربية المتحدة</option>
                    <option value="دولة الكويت">دولة الكويت</option>
                    <option value="دولة قطر">دولة قطر</option>
                    <option value="سلطنة عمان">سلطنة عمان</option>
                    <option value="مملكة البحرين">مملكة البحرين</option>
                    <option value="أخرى">دولة أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم جواز السفر</label>
                  <input
                    type="text"
                    placeholder="مثال: EP1234567"
                    value={passportNumber}
                    onChange={e => setPassportNumber(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">تاريخ انتهاء الجواز</label>
                  <input
                    type="date"
                    value={passportExpiryDate}
                    onChange={e => setPassportExpiryDate(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">المكتب الخارجي / الوسيط</label>
                  <input
                    type="text"
                    placeholder="مثال: مكتب الرياض للخدمات"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">اسم الكفيل / جهة العمل</label>
                  <input
                    type="text"
                    placeholder="اسم العائلة أو الشركة"
                    value={sponsorName}
                    onChange={e => setSponsorName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                {/* COC Certificate Section */}
                <div className="sm:col-span-2 bg-[#172a46]/5 border border-[#172a46]/10 p-3.5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#172a46] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#c9a84c]" />
                      شهادة الكفاءة المهنية الإثيوبية (COC - Certificate of Competence)
                    </span>
                    <span className="text-[10px] text-stone-500 font-bold bg-white px-2 py-0.5 rounded-md border border-stone-200">
                      اختياري / يمكن تحديثه لاحقاً
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">رقم شهادة COC</label>
                      <input
                        type="text"
                        placeholder="مثال: COC-ETH-2024-8891"
                        value={cocNumber}
                        onChange={e => setCocNumber(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">حالة شهادة COC</label>
                      <select
                        value={cocStatus}
                        onChange={e => setCocStatus(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                      >
                        <option value="لم يختبر بعد">لم يختبر بعد</option>
                        <option value="قيد الاختبار والتقييم">قيد الاختبار والتقييم</option>
                        <option value="بانتظار ظهور النتيجة">بانتظار ظهور النتيجة</option>
                        <option value="معتمد ومجتاز (Pass)">معتمد ومجتاز (Pass)</option>
                        <option value="غير مجتاز (Fail)">غير مجتاز (Fail)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">تاريخ إصدار الشهادة</label>
                      <input
                        type="date"
                        value={cocIssueDate}
                        onChange={e => setCocIssueDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Fees & Initial Payment */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    إجمالي أتعاب ورسوم الاستقدام المتفق عليها ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="مثال: 120000"
                    value={totalFees}
                    onChange={e => setTotalFees(e.target.value)}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-base font-black text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-800 mb-1 flex items-center justify-between">
                    <span>بند سداد مستحقات على الوكالة ({settings.currency})</span>
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-md">يخصم من الأتعاب</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 15000 (رسوم مستحقة على الوكالة)"
                    value={agencyLiability}
                    onChange={e => setAgencyLiability(e.target.value)}
                    className="w-full p-3.5 bg-amber-50/40 border border-amber-200 rounded-2xl text-base font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {Number(totalFees) > 0 && (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-600">صافي الأتعاب بعد خصم مستحقات الوكالة:</span>
                  <span className="font-black text-sm text-[#172a46]">
                    {(Number(totalFees || 0) - Number(agencyLiability || 0)).toLocaleString()} {settings.currency}
                  </span>
                </div>
              )}

              {/* Initial payment checkbox */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInitialPayment}
                    onChange={e => setHasInitialPayment(e.target.checked)}
                    className="w-4 h-4 rounded text-[#c9a84c] focus:ring-[#c9a84c]"
                  />
                  <span className="font-black text-sm text-[#172a46]">تسجيل دفعة مقدمة الآن وإصدار سند قبض فوري</span>
                </label>

                {hasInitialPayment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">مبلغ الدفعة المقدمة ({settings.currency})</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="مثال: 40000"
                        value={initialPaymentAmount}
                        onChange={e => setInitialPaymentAmount(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl font-bold text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">طريقة السداد</label>
                      <select
                        value={initialPaymentMethod}
                        onChange={e => setInitialPaymentMethod(e.target.value as any)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl font-bold text-stone-800"
                      >
                        <option value="تحويل بنكي">تحويل بنكي</option>
                        <option value="كاش">كاش (نقداً)</option>
                        <option value="شيك">شيك</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary recap note */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                سيتم إدراج المرشح تلقائياً في مرحلة <strong>(مسجل جديد)</strong>، مع إنشاء السجل المالي وسجل المراحل، ويمكنك متابعة وتحديث الإجراءات وإصدار سندات القبض في أي وقت.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="px-5 py-2.5 rounded-2xl border border-stone-200 text-xs font-black text-stone-700 hover:bg-white transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
                  alert("يرجى إدخال الاسم ورقم الهاتف للمتابعة.");
                  return;
                }
                if (step === 2 && (!job.trim() || !country.trim())) {
                  alert("يرجى إدخال المهنة والوجهة للمتابعة.");
                  return;
                }
                setStep((step + 1) as any);
              }}
              className="px-6 py-2.5 rounded-2xl bg-[#172a46] hover:bg-[#233d64] text-white text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-7 py-2.5 rounded-2xl bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إتمام وحفظ المرشح</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart Passport Scanner & MRZ Validation Modal */}
      <PassportScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onApplyData={handleScanApplied}
      />
    </div>
  );
};
