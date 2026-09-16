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
import { findCandidateDuplicates } from "../lib/candidateDuplicate";
import { useLanguage } from "../lib/LanguageContext";

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
  const { t, isAr } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isScannedWithMRZ, setIsScannedWithMRZ] = useState(false);
  const [scanAppliedMessage, setScanAppliedMessage] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondPhone, setSecondPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const [job, setJob] = useState("");
  const [country, setCountry] = useState(isAr ? "المملكة العربية السعودية" : "Saudi Arabia");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");
  const [cocNumber, setCocNumber] = useState("");
  const [cocStatus, setCocStatus] = useState(isAr ? "لم يختبر بعد" : "Not Tested Yet");
  const [cocIssueDate, setCocIssueDate] = useState("");
  const [agentName, setAgentName] = useState("");
  const [sponsorName, setSponsorName] = useState("");

  const [totalFees, setTotalFees] = useState("");
  const [agencyLiability, setAgencyLiability] = useState("");
  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"كاش" | "تحويل بنكي" | "شيك">("تحويل بنكي");
  const [initialPaymentNote, setInitialPaymentNote] = useState(isAr ? "دفعة مقدمة عند التسجيل" : "Initial registration down-payment");

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
    if (data.firstName) setFirstName(data.firstName.trim());
    if (data.lastName) {
      setLastName(data.lastName === "-" ? data.firstName.trim() : data.lastName.trim());
    } else if (data.firstName) {
      setLastName(data.firstName.trim());
    }
    if (data.passportNumber) setPassportNumber(data.passportNumber.trim());
    if (data.passportExpiryDate) setPassportExpiryDate(data.passportExpiryDate.trim());
    if (data.dateOfBirth) setDateOfBirth(data.dateOfBirth.trim());
    if (data.gender) setGender(data.gender);
    if (data.job) setJob(data.job.trim());
    setIsScannedWithMRZ(true);
    setScanAppliedMessage(
      isAr
        ? `تم استخراج وتعبئة بيانات الجواز بنجاح: ${data.firstName} (${data.passportNumber || "بدون رقم"})`
        : `Passport data extracted & filled successfully: ${data.firstName} (${data.passportNumber || "No number"})`
    );
  };

  const handleFinish = () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !job.trim() || !country.trim()) {
      alert(isAr ? "يرجى ملء الحقول الأساسية المطلوبة." : "Please fill in all required fields.");
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

    // Prevent duplicate registrations using locally cached candidates.
    // Firestore synchronization keeps this cache populated across sessions.
    try {
      const stored = localStorage.getItem("shuayb_candidates");
      const existing = stored ? JSON.parse(stored) : [];
      const duplicateCheck = findCandidateDuplicates(
        Array.isArray(existing) ? existing : [],
        candidateData as Pick<Candidate, "firstName" | "lastName" | "dateOfBirth" | "passportNumber">
      );

      const confirmed = duplicateCheck.confirmed[0];
      if (confirmed) {
        alert(
          isAr
            ? `⚠️ هذا المرشح مسجل مسبقًا.\n\nالاسم: ${confirmed.candidate.firstName} ${confirmed.candidate.lastName}\nرقم الجواز: ${confirmed.candidate.passportNumber || "غير مسجل"}\nالرقم الداخلي: ${confirmed.candidate.id}\n\nلن يتم إنشاء سجل مكرر.`
            : `⚠️ This candidate is already registered.\n\nName: ${confirmed.candidate.firstName} ${confirmed.candidate.lastName}\nPassport: ${confirmed.candidate.passportNumber || "Not recorded"}\nInternal ID: ${confirmed.candidate.id}\n\nDuplicate record will not be created.`
        );
        return;
      }

      const possible = duplicateCheck.possible[0];
      if (possible) {
        const continueRegistration = window.confirm(
          isAr
            ? `⚠️ يوجد مرشح يحتمل أن يكون نفس الشخص.\n\nالاسم: ${possible.candidate.firstName} ${possible.candidate.lastName}\nتاريخ الميلاد: ${possible.candidate.dateOfBirth || "غير مسجل"}\nالرقم الداخلي: ${possible.candidate.id}\n\nهل تريد الاستمرار وتسجيله كمرشح جديد؟`
            : `⚠️ A potential matching candidate already exists.\n\nName: ${possible.candidate.firstName} ${possible.candidate.lastName}\nDOB: ${possible.candidate.dateOfBirth || "Not recorded"}\nInternal ID: ${possible.candidate.id}\n\nDo you want to continue registering as a new candidate?`
        );
        if (!continueRegistration) return;
      }
    } catch (duplicateError) {
      console.warn("Candidate duplicate check failed; continuing registration:", duplicateError);
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
              <h3 className="font-black text-base">
                {isAr ? "تسجيل مرشح جديد (معالج الإدخال)" : "Register New Candidate (Wizard)"}
              </h3>
              <p className="text-xs text-stone-300">
                {isAr ? "الرقم المخصص تلقائياً:" : "Assigned ID:"}{" "}
                <strong className="text-[#c9a84c] font-mono">{nextCandidateId}</strong>
              </p>
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
                {isAr ? "البيانات الشخصية" : "Personal Info"}
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
                {isAr ? "المهنة والجواز" : "Job & Passport"}
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
                {isAr ? "الأتعاب والمالية" : "Fees & Finance"}
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
                  <h4 className="font-black text-xs sm:text-sm">
                    {isAr ? "ماسح الجواز الذكي (MRZ + OCR + تدقيق التواريخ)" : "AI Passport Scanner (MRZ + OCR + Verification)"}
                  </h4>
                  {isScannedWithMRZ && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> {isAr ? "تم الفحص والمطابقة" : "Verified & Matched"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300">
                  {isAr
                    ? "استخراج آلي وتعبئة فورية ومطابقة كود MRZ مع الحقول والتحقق الرياضي من صلاحية الجواز"
                    : "Automated extraction, autofill, and MRZ checksum validation of passport fields"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap self-stretch sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isAr ? "فحص ومسح الجواز الآن" : "Scan Passport Now"}</span>
            </button>
          </div>

          {scanAppliedMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scanAppliedMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] shrink-0"
              >
                {isAr ? "معاينة بيانات الجواز والمهنة (خطوة 2) ←" : "Review Passport & Job (Step 2) →"}
              </button>
            </div>
          )}

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "الاسم الأول *" : "First Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? "مثال: أحمد" : "e.g. Ahmed"}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "اسم العائلة / اللقب *" : "Last Name / Surname *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? "مثال: يوسف إبراهيم" : "e.g. Yusuf Ibrahim"}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "رقم الهاتف الأساسي *" : "Primary Phone Number *"}
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="+251 9X XXX XXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "رقم هاتف إضافي (اختياري)" : "Secondary Phone (Optional)"}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="+251 9X XXX XXXX"
                    value={secondPhone}
                    onChange={e => setSecondPhone(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "الجنس" : "Gender"}
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  >
                    <option value="female">{isAr ? "أنثى" : "Female"}</option>
                    <option value="male">{isAr ? "ذكر" : "Male"}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "تاريخ الميلاد" : "Date of Birth"}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "العنوان أو مكان الإقامة" : "Address / Residence"}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? "مثال: أديس أبابا - كيركوس" : "e.g. Addis Ababa - Kirkos"}
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
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "المهنة / الوظيفة المستهدفة *" : "Target Job / Occupation *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? "مثال: عاملة منزلية، سائق خاص، طاهي..." : "e.g. Housemaid, Private Driver, Cook..."}
                    value={job}
                    onChange={e => setJob(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "دولة العمل / الوجهة *" : "Destination Country *"}
                  </label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  >
                    <option value={isAr ? "المملكة العربية السعودية" : "Saudi Arabia"}>
                      {isAr ? "المملكة العربية السعودية" : "Saudi Arabia"}
                    </option>
                    <option value={isAr ? "دولة الإمارات العربية المتحدة" : "United Arab Emirates"}>
                      {isAr ? "دولة الإمارات العربية المتحدة" : "United Arab Emirates"}
                    </option>
                    <option value={isAr ? "دولة الكويت" : "Kuwait"}>
                      {isAr ? "دولة الكويت" : "Kuwait"}
                    </option>
                    <option value={isAr ? "دولة قطر" : "Qatar"}>
                      {isAr ? "دولة قطر" : "Qatar"}
                    </option>
                    <option value={isAr ? "سلطنة عمان" : "Oman"}>
                      {isAr ? "سلطنة عمان" : "Oman"}
                    </option>
                    <option value={isAr ? "مملكة البحرين" : "Bahrain"}>
                      {isAr ? "مملكة البحرين" : "Bahrain"}
                    </option>
                    <option value={isAr ? "أخرى" : "Other"}>
                      {isAr ? "دولة أخرى" : "Other Country"}
                    </option>
                    {country && ![
                      "المملكة العربية السعودية",
                      "دولة الإمارات العربية المتحدة",
                      "دولة الكويت",
                      "دولة قطر",
                      "سلطنة عمان",
                      "مملكة البحرين",
                      "أخرى",
                      "Saudi Arabia",
                      "United Arab Emirates",
                      "Kuwait",
                      "Qatar",
                      "Oman",
                      "Bahrain",
                      "Other"
                    ].includes(country) && (
                      <option value={country}>{country}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "رقم جواز السفر" : "Passport Number"}
                  </label>
                  <input
                    type="text"
                    placeholder="EP1234567"
                    value={passportNumber}
                    onChange={e => setPassportNumber(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "تاريخ انتهاء الجواز" : "Passport Expiry Date"}
                  </label>
                  <input
                    type="date"
                    value={passportExpiryDate}
                    onChange={e => setPassportExpiryDate(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "المكتب الخارجي / الوسيط" : "External Agency / Broker"}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? "مثال: مكتب الرياض للخدمات" : "e.g. Riyadh Services Office"}
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {isAr ? "اسم الكفيل / جهة العمل" : "Sponsor Name / Employer"}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? "اسم العائلة أو الشركة" : "Family or Company name"}
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
                      {isAr
                        ? "شهادة الكفاءة المهنية الإثيوبية (COC - Certificate of Competence)"
                        : "Ethiopian Competence Certificate (COC)"}
                    </span>
                    <span className="text-[10px] text-stone-500 font-bold bg-white px-2 py-0.5 rounded-md border border-stone-200">
                      {isAr ? "اختياري / يمكن تحديثه لاحقاً" : "Optional / Update later"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        {isAr ? "رقم شهادة COC" : "COC Certificate No."}
                      </label>
                      <input
                        type="text"
                        placeholder="COC-ETH-2024-8891"
                        value={cocNumber}
                        onChange={e => setCocNumber(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        {isAr ? "حالة شهادة COC" : "COC Status"}
                      </label>
                      <select
                        value={cocStatus}
                        onChange={e => setCocStatus(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                      >
                        <option value={isAr ? "لم يختبر بعد" : "Not Tested Yet"}>
                          {isAr ? "لم يختبر بعد" : "Not Tested Yet"}
                        </option>
                        <option value={isAr ? "قيد الاختبار والتقييم" : "Under Testing"}>
                          {isAr ? "قيد الاختبار والتقييم" : "Under Testing"}
                        </option>
                        <option value={isAr ? "بانتظار ظهور النتيجة" : "Awaiting Result"}>
                          {isAr ? "بانتظار ظهور النتيجة" : "Awaiting Result"}
                        </option>
                        <option value={isAr ? "معتمد ومجتاز (Pass)" : "Passed (Certified)"}>
                          {isAr ? "معتمد ومجتاز (Pass)" : "Passed (Certified)"}
                        </option>
                        <option value={isAr ? "غير مجتاز (Fail)" : "Failed"}>
                          {isAr ? "غير مجتاز (Fail)" : "Failed"}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        {isAr ? "تاريخ إصدار الشهادة" : "Issue Date"}
                      </label>
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
                    {isAr
                      ? `إجمالي أتعاب ورسوم الاستقدام المتفق عليها (${settings.currency}) *`
                      : `Total Agreed Recruitment Fees (${settings.currency}) *`}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="120000"
                    value={totalFees}
                    onChange={e => setTotalFees(e.target.value)}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-base font-black text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-800 mb-1 flex items-center justify-between">
                    <span>
                      {isAr
                        ? `بند سداد مستحقات على الوكالة (${settings.currency})`
                        : `Agency Liabilities / Deductions (${settings.currency})`}
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                      {isAr ? "يخصم من الأتعاب" : "Deducted"}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="15000"
                    value={agencyLiability}
                    onChange={e => setAgencyLiability(e.target.value)}
                    className="w-full p-3.5 bg-amber-50/40 border border-amber-200 rounded-2xl text-base font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {Number(totalFees) > 0 && (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-600">
                    {isAr ? "صافي الأتعاب بعد خصم مستحقات الوكالة:" : "Net Fees after Agency Deductions:"}
                  </span>
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
                  <span className="font-black text-sm text-[#172a46]">
                    {isAr
                      ? "تسجيل دفعة مقدمة الآن وإصدار سند قبض فوري"
                      : "Record initial down-payment & issue receipt voucher now"}
                  </span>
                </label>

                {hasInitialPayment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        {isAr
                          ? `مبلغ الدفعة المقدمة (${settings.currency})`
                          : `Down-payment Amount (${settings.currency})`}
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="40000"
                        value={initialPaymentAmount}
                        onChange={e => setInitialPaymentAmount(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl font-bold text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        {isAr ? "طريقة السداد" : "Payment Method"}
                      </label>
                      <select
                        value={initialPaymentMethod}
                        onChange={e => setInitialPaymentMethod(e.target.value as any)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl font-bold text-stone-800"
                      >
                        <option value="تحويل بنكي">{isAr ? "تحويل بنكي" : "Bank Transfer"}</option>
                        <option value="كاش">{isAr ? "كاش (نقداً)" : "Cash"}</option>
                        <option value="شيك">{isAr ? "شيك" : "Cheque"}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary recap note */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                {isAr
                  ? "سيتم إدراج المرشح تلقائياً في مرحلة (مسجل جديد)، مع إنشاء السجل المالي وسجل المراحل، ويمكنك متابعة وتحديث الإجراءات وإصدار سندات القبض في أي وقت."
                  : "The candidate will be placed in (New Registration) stage. Financial and milestone records will be created automatically, and receipts can be issued anytime."}
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
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {isAr ? "السابق" : "Previous"}
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
                  alert(isAr ? "يرجى إدخال الاسم ورقم الهاتف للمتابعة." : "Please enter name and phone number to proceed.");
                  return;
                }
                if (step === 2 && (!job.trim() || !country.trim())) {
                  alert(isAr ? "يرجى إدخال المهنة والوجهة للمتابعة." : "Please enter job and destination country to proceed.");
                  return;
                }
                setStep((step + 1) as any);
              }}
              className="px-6 py-2.5 rounded-2xl bg-[#172a46] hover:bg-[#233d64] text-white text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <span>{isAr ? "التالي" : "Next"}</span>
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-7 py-2.5 rounded-2xl bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? "إتمام وحفظ المرشح" : "Save & Finish"}</span>
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
