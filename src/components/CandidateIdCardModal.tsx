import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  FileDown,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  QrCode,
  Sparkles,
  CreditCard,
  Copy,
  Check
} from "lucide-react";
import { Candidate, AgencySettings } from "../types";
import {
  CandidateIdCardData,
  renderIdCard,
  IdCardRenderOptions
} from "../lib/idCardRenderer";
import { exportCR80CardToPDF } from "../lib/pdfUtils";
import { useLanguage } from "../lib/LanguageContext";

interface CandidateIdCardModalProps {
  candidate: Candidate;
  settings: AgencySettings;
  isOpen: boolean;
  onClose: () => void;
}

export const CandidateIdCardModal: React.FC<CandidateIdCardModalProps> = ({
  candidate,
  settings,
  isOpen,
  onClose
}) => {
  const { isAr } = useLanguage();

  // Determine initial medical status mapping to allowed values: "مكتمل" | "غير مكتمل" | "قيد المراجعة"
  const getInitialMedicalStatus = (): "مكتمل" | "غير مكتمل" | "قيد المراجعة" => {
    const raw = (candidate.medicalStatus || "").trim();
    if (
      raw === "لائق طبياً" ||
      raw === "مكتمل" ||
      raw.toLowerCase().includes("fit") ||
      raw.toLowerCase().includes("complete") ||
      candidate.stage === "VISA" ||
      candidate.stage === "FLIGHT" ||
      candidate.stage === "TRAVELLED" ||
      candidate.stage === "COMPLETED"
    ) {
      return "مكتمل";
    }
    if (
      raw === "بانتظار النتيجة" ||
      raw === "قيد الإجراء" ||
      raw === "قيد المراجعة" ||
      raw.toLowerCase().includes("pending") ||
      raw.toLowerCase().includes("review")
    ) {
      return "قيد المراجعة";
    }
    return "غير مكتمل";
  };

  // State
  const [medicalExamStatus, setMedicalExamStatus] = useState<"مكتمل" | "غير مكتمل" | "قيد المراجعة">(
    getInitialMedicalStatus()
  );
  const [organizationName, setOrganizationName] = useState<string>(
    candidate.sponsorName ||
      settings.agencyName ||
      (isAr ? "مستشفى الأمل التخصصي للرعاية الصحية" : "Al-Amal Specialized Healthcare Hospital")
  );
  const [jobTitle, setJobTitle] = useState<string>(candidate.job || (isAr ? "طبيب" : "Doctor"));
  const [issueDate, setIssueDate] = useState<string>(
    candidate.registrationDate || new Date().toISOString().slice(0, 10)
  );
  const [expiryDate, setExpiryDate] = useState<string>(
    candidate.passportExpiryDate ||
      new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Toggles
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(false);
  const [showOrganization, setShowOrganization] = useState<boolean>(true);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showDates, setShowDates] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [cardSide, setCardSide] = useState<"both" | "front" | "back">("both");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // visual preview scaling

  // Status and export
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Root container ref for renderIdCard
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Construct exact JSON contract
  const cardData: CandidateIdCardData = {
    fullName: `${candidate.firstName} ${candidate.lastName}`.trim(),
    jobTitle: jobTitle || (isAr ? "طبيب" : "Doctor"),
    photoUrl: candidate.photoUrl || "",
    idCardNumber: candidate.id || "DOC-0001",
    passportNumber: candidate.passportNumber || (isAr ? "غير متوفر" : "N/A"),
    cocNumber: candidate.cocNumber || (isAr ? "غير متوفر" : "N/A"),
    medicalExamStatus: medicalExamStatus,
    organizationName: organizationName,
    logoUrl: "",
    issueDate: issueDate,
    expiryDate: expiryDate
  };

  // Re-render card whenever data or toggles change
  useEffect(() => {
    if (!isOpen) return;

    const options: IdCardRenderOptions = {
      maskSensitiveData,
      showOrganization,
      showLogo,
      showDates,
      showQrCode,
      side: cardSide,
      isAr
    };

    const doRender = () => {
      if (cardContainerRef.current) {
        renderIdCard(cardContainerRef.current, cardData, options);
      }
    };

    doRender();
    const rafId = requestAnimationFrame(doRender);
    const timerId = setTimeout(doRender, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [
    isOpen,
    cardData.fullName,
    cardData.jobTitle,
    cardData.photoUrl,
    cardData.idCardNumber,
    cardData.passportNumber,
    cardData.cocNumber,
    cardData.medicalExamStatus,
    cardData.organizationName,
    cardData.issueDate,
    cardData.expiryDate,
    maskSensitiveData,
    showOrganization,
    showLogo,
    showDates,
    showQrCode,
    cardSide,
    isAr
  ]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setPdfSuccess(false);

      const frontEl = document.getElementById("cr80-card-front");
      const backEl = document.getElementById("cr80-card-back");

      const success = await exportCR80CardToPDF(frontEl, backEl, {
        filename: `Doctor-ID-Card-${candidate.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
        side: cardSide
      });

      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3500);
      }
    } catch (err) {
      console.error("Error exporting CR80 ID Card to PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Copy JSON Data Contract
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(cardData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0c1a2e]/80 backdrop-blur-md overflow-y-auto animate-in fade-in"
      id="modal-candidate-id-card"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#172a46] text-white p-5 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center font-black shadow-md shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">
                  {isAr ? "بطاقة التعريف المهنية للطبيب (CR80 ID Card)" : "Professional Doctor ID Card (CR80)"}
                </h2>
                <span className="text-[11px] bg-[#c9a84c]/20 text-[#c9a84c] font-bold px-2 py-0.5 rounded-full border border-[#c9a84c]/30">
                  CR80 • 85.6 × 54 mm
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium mt-0.5">
                {isAr
                  ? "توليد بطاقة هوية قياسية جاهزة للطباعة على كروت البلاستيك CR80 والتصدير إلى PDF"
                  : "Generate ISO CR80 standard ID cards ready for thermal plastic printing & PDF export"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors text-sm"
            title={isAr ? "إغلاق" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split into Controls & Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-50">
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
            {/* Card View & Zoom Controls */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-[#172a46] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>{isAr ? "طريقة العرض والمعاينة" : "Preview & Display Options"}</span>
              </h3>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCardSide("both")}
                  className={`py-1.5 rounded-lg transition-all ${
                    cardSide === "both"
                      ? "bg-[#172a46] text-white shadow-xs"
                      : "text-stone-600 hover:text-[#172a46]"
                  }`}
                >
                  {isAr ? "الوجهين" : "Both Sides"}
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("front")}
                  className={`py-1.5 rounded-lg transition-all ${
                    cardSide === "front"
                      ? "bg-[#172a46] text-white shadow-xs"
                      : "text-stone-600 hover:text-[#172a46]"
                  }`}
                >
                  {isAr ? "الأمامي" : "Front"}
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("back")}
                  className={`py-1.5 rounded-lg transition-all ${
                    cardSide === "back"
                      ? "bg-[#172a46] text-white shadow-xs"
                      : "text-stone-600 hover:text-[#172a46]"
                  }`}
                >
                  {isAr ? "الخلفي" : "Back"}
                </button>
              </div>

              {/* Preview Zoom Slider */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3 text-xs">
                <span className="text-stone-500 font-bold text-[11px]">
                  {isAr ? "تكبير المعاينة الشاشية:" : "Preview Zoom:"}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.9"
                    max="1.6"
                    step="0.05"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-24 accent-[#172a46] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[11px] text-stone-700 w-8 text-left">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Medical Exam Status Selector */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
              <label className="text-xs font-black text-[#172a46] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? "حالة الفحص الطبي (Medical Exam)" : "Medical Examination Status"}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-medium">{isAr ? "مطلوب" : "Required"}</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMedicalExamStatus("مكتمل")}
                  className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                    medicalExamStatus === "مكتمل"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs font-black"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? "مكتمل ✅" : "Fit ✅"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedicalExamStatus("قيد المراجعة")}
                  className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                    medicalExamStatus === "قيد المراجعة"
                      ? "bg-amber-50 border-amber-500 text-amber-800 shadow-xs font-black"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? "قيد المراجعة ⚠️" : "Review ⚠️"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedicalExamStatus("غير مكتمل")}
                  className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                    medicalExamStatus === "غير مكتمل"
                      ? "bg-rose-50 border-rose-500 text-rose-800 shadow-xs font-black"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>{isAr ? "غير مكتمل ❌" : "Incomplete ❌"}</span>
                </button>
              </div>
            </div>

            {/* Privacy & Security Toggles */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    {maskSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#172a46] block">
                      {isAr ? "حجب البيانات الحساسة (Masking)" : "Data Masking"}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      {isAr ? "إظهار آخر 4 أرقام فقط (الجواز وCOC: •••• 1234)" : "Mask sensitive IDs (Passport & COC: •••• 1234)"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaskSensitiveData(!maskSensitiveData)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    maskSensitiveData ? "bg-[#172a46]" : "bg-stone-300"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      maskSensitiveData ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Optional Field Toggles */}
              <div className="pt-3 border-t border-stone-100 space-y-2.5">
                <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider block">
                  {isAr ? "الحقول الاختيارية بالبطاقة" : "Optional Card Fields"}
                </span>

                {/* Organization Toggle */}
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="flex items-center gap-1.5 text-stone-700 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{isAr ? "اسم المنشأة الصحية / المستشفى" : "Healthcare Facility Name"}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showOrganization}
                    onChange={(e) => setShowOrganization(e.target.checked)}
                    className="accent-[#172a46] w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                {/* Dates Toggle */}
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="flex items-center gap-1.5 text-stone-700 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{isAr ? "تواريخ الإصدار والانتهاء" : "Issue & Expiry Dates"}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showDates}
                    onChange={(e) => setShowDates(e.target.checked)}
                    className="accent-[#172a46] w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                {/* QR Code Toggle */}
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="flex items-center gap-1.5 text-stone-700 font-bold">
                    <QrCode className="w-3.5 h-3.5 text-stone-400" />
                    <span>{isAr ? "رمز التحقق الذكي (QR Code)" : "Smart QR Verification"}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="accent-[#172a46] w-4 h-4 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Editable Fields for Card Customization */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
              <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider block">
                {isAr ? "تخصيص البيانات المعروضة" : "Customize Card Text"}
              </span>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  {isAr ? "المسمى الوظيفي:" : "Job Title:"}
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={isAr ? "طبيب" : "Doctor"}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl p-2 px-3 focus:outline-none focus:border-[#172a46]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  {isAr ? "اسم المستشفى / المنشأة:" : "Hospital / Facility Name:"}
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={isAr ? "المستشفى التخصصي" : "Specialized Hospital"}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl p-2 px-3 focus:outline-none focus:border-[#172a46]"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Area */}
          <div className="lg:col-span-8 flex flex-col items-center justify-start space-y-4 order-1 lg:order-2">
            {/* Visual Canvas Container */}
            <div className="w-full bg-stone-200/70 border-2 border-dashed border-stone-300 rounded-3xl p-4 sm:p-8 flex flex-col items-center justify-center min-h-[340px] sm:min-h-[380px] overflow-x-auto relative">
              <div
                className="transition-transform duration-200 origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Root Element for renderIdCard */}
                <div ref={cardContainerRef} id="cr80-rendered-card-root" />
              </div>

              {/* Physical Dimension Spec Indicator */}
              <div className="absolute bottom-3 right-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-stone-600 border border-stone-300/80 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>CR80: 85.6mm × 54.0mm (3.37″ × 2.125″) @ 300 DPI</span>
              </div>
            </div>

            {/* Quick Data Verification Box */}
            <div className="w-full bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-stone-400 block text-[10px]">{isAr ? "المرشح:" : "Candidate:"}</span>
                  <span className="font-black text-[#172a46]">{cardData.fullName}</span>
                </div>
                <div className="h-6 w-px bg-stone-200 hidden sm:block"></div>
                <div>
                  <span className="text-stone-400 block text-[10px]">{isAr ? "رقم الجواز:" : "Passport No:"}</span>
                  <span className="font-mono font-bold text-stone-800">
                    {maskSensitiveData
                      ? "•••• " + (candidate.passportNumber || "").slice(-4)
                      : candidate.passportNumber || (isAr ? "غير مسجل" : "Unregistered")}
                  </span>
                </div>
                <div className="h-6 w-px bg-stone-200 hidden sm:block"></div>
                <div>
                  <span className="text-stone-400 block text-[10px]">{isAr ? "رقم COC:" : "COC No:"}</span>
                  <span className="font-mono font-bold text-stone-800">
                    {maskSensitiveData
                      ? "•••• " + (candidate.cocNumber || "").slice(-4)
                      : candidate.cocNumber || (isAr ? "غير مسجل" : "Unregistered")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                title={isAr ? "نسخ عقد البيانات JSON" : "Copy JSON Data Contract"}
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? (isAr ? "تم النسخ!" : "Copied!") : (isAr ? "نسخ JSON" : "Copy JSON")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="bg-white p-4 sm:p-5 px-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500 font-medium">
            {isAr
              ? "متوافق مع جميع طابعات الكروت البلاستيكية (Zebra, Fargo, Evolis, Magicard)."
              : "Standard CR80 format compatible with all PVC plastic ID card printers."}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <FileDown className={`w-4 h-4 ${isExportingPdf ? "animate-bounce" : ""}`} />
              <span>
                {isExportingPdf
                  ? (isAr ? "جارٍ إعداد PDF..." : "Exporting PDF...")
                  : pdfSuccess
                  ? (isAr ? "تم تصدير PDF بنجاح!" : "PDF Exported Successfully!")
                  : (isAr ? "تصدير PDF" : "Export PDF")}
              </span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#172a46] hover:bg-[#203a60] active:scale-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4 text-[#c9a84c]" />
              <span>{isAr ? "طباعة البطاقة (Print CR80)" : "Print ID Card (CR80)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
