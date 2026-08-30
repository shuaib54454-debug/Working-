import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  User,
  Eye,
  SlidersHorizontal,
  Info
} from "lucide-react";
import {
  parseTD3MRZ,
  analyzeAndCrossCheckPassport,
  PassportScanAnalysis,
  SAMPLE_PASSPORTS,
  VisualZoneData
} from "../lib/mrzScanner";
import { postJsonToApi } from "../lib/apiConfig";
import { compressImage } from "../lib/imageUtils";
import { canApprovePassportData } from "../lib/passportApprovalGuard";

interface PassportScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: {
    firstName: string;
    lastName: string;
    passportNumber: string;
    passportExpiryDate: string;
    dateOfBirth: string;
    gender: "male" | "female";
    country: string;
    job?: string;
  }) => void;
}

export const PassportScannerModal: React.FC<PassportScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyData
}) => {
  const [activeMode, setActiveMode] = useState<"CAMERA" | "UPLOAD" | "MANUAL" | "SAMPLES">("UPLOAD");
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual & Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // MRZ text inputs
  const [mrzLine1, setMrzLine1] = useState("");
  const [mrzLine2, setMrzLine2] = useState("");

  // Extracted Candidate Fields (Two-way editable)
  const [candidateFirstName, setCandidateFirstName] = useState("");
  const [candidateLastName, setCandidateLastName] = useState("");
  const [visualName, setVisualName] = useState("");
  const [visualPassportNo, setVisualPassportNo] = useState("");
  const [visualBirthDate, setVisualBirthDate] = useState("");
  const [visualExpiryDate, setVisualExpiryDate] = useState("");
  const [visualGender, setVisualGender] = useState<"male" | "female">("male");
  const [visualNationality, setVisualNationality] = useState("المملكة العربية السعودية");
  const [visualJob, setVisualJob] = useState("عامل / عاملة");

  // Analysis result
  const [analysis, setAnalysis] = useState<PassportScanAnalysis | null>(null);

  // Stop camera when closing modal or switching modes
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeMode !== "CAMERA") {
      stopCamera();
    }
  }, [activeMode]);

  // Recalculate analysis when MRZ lines or visual fields change
  useEffect(() => {
    if (!mrzLine1 && !mrzLine2 && !visualPassportNo && !candidateFirstName) {
      setAnalysis(null);
      return;
    }

    const parsedMRZ = parseTD3MRZ(mrzLine1, mrzLine2);
    
    // Auto-fill candidate fields from parsed MRZ if not manually filled
    if (parsedMRZ) {
      if (!candidateFirstName && parsedMRZ.givenNames) {
        setCandidateFirstName(parsedMRZ.givenNames);
      }
      if (!candidateLastName && parsedMRZ.surname && parsedMRZ.surname !== "المرشح") {
        setCandidateLastName(parsedMRZ.surname);
      }
      if (!visualPassportNo && parsedMRZ.passportNumber) {
        setVisualPassportNo(parsedMRZ.passportNumber);
      }
      if (!visualBirthDate && parsedMRZ.birthDateFormatted) {
        setVisualBirthDate(parsedMRZ.birthDateFormatted);
      }
      if (!visualExpiryDate && parsedMRZ.expiryDateFormatted) {
        setVisualExpiryDate(parsedMRZ.expiryDateFormatted);
      }
      if (parsedMRZ.gender === "female" || parsedMRZ.gender === "male") {
        setVisualGender(parsedMRZ.gender);
      }
      if (parsedMRZ.nationalityName && visualNationality === "المملكة العربية السعودية") {
        setVisualNationality(parsedMRZ.nationalityName);
      }
    }

    const visualData: VisualZoneData = {
      fullName: candidateFirstName && candidateLastName ? `${candidateFirstName} ${candidateLastName}` : visualName || undefined,
      passportNumber: visualPassportNo || undefined,
      birthDate: visualBirthDate || undefined,
      expiryDate: visualExpiryDate || undefined,
      gender: visualGender,
      nationality: visualNationality || undefined,
      jobTitle: visualJob || undefined
    };

    const result = analyzeAndCrossCheckPassport(parsedMRZ, visualData);
    setAnalysis(result);
  }, [
    mrzLine1,
    mrzLine2,
    candidateFirstName,
    candidateLastName,
    visualName,
    visualPassportNo,
    visualBirthDate,
    visualExpiryDate,
    visualGender,
    visualNationality,
    visualJob
  ]);

  if (!isOpen) return null;

  // Start live camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن أو استخدام خيار رفع الصورة.");
    }
  };

  // Capture snapshot from camera
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedImage(rawDataUrl);
    stopCamera();
    await processImageWithAI(rawDataUrl);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatusMessage("جاري تحضير وضغط الصورة...");
      setErrorMessage(null);

      // Compress and resize image immediately
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85
      });

      setSelectedImage(compressedDataUrl);
      await processImageWithAI(compressedDataUrl);
    } catch (err: any) {
      console.error("File reading error:", err);
      setIsProcessing(false);
      setErrorMessage("حدث خطأ أثناء قراءة ملف الصورة. يرجى تجربة صورة أخرى.");
    }
  };

  // Process image with Gemini Vision AI (Multi-Tier Backend + Direct Client Fallback)
  const processImageWithAI = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setStatusMessage("جاري فحص الجواز بالذكاء الاصطناعي واستخراج البيانات...");
    setErrorMessage(null);

    try {
      // 1. Ensure optimal image dimensions for OCR
      const optimizedImage = await compressImage(imageDataUrl, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85
      });

      let extractedData: {
        mrzLine1?: string;
        mrzLine2?: string;
        visualZone?: {
          firstName?: string;
          lastName?: string;
          fullName?: string;
          fullNameArabic?: string;
          passportNumber?: string;
          birthDate?: string;
          expiryDate?: string;
          gender?: string;
          nationality?: string;
          jobTitle?: string;
        };
      } | null = null;

      // Send request exclusively to HTTPS Backend API (/api/scan-passport)
      const res = await postJsonToApi<{
        success: boolean;
        data?: {
          mrzLine1?: string;
          mrzLine2?: string;
          visualZone?: {
            firstName?: string;
            lastName?: string;
            fullName?: string;
            fullNameArabic?: string;
            passportNumber?: string;
            birthDate?: string;
            expiryDate?: string;
            gender?: string;
            nationality?: string;
            jobTitle?: string;
          };
        };
        error?: string;
      }>("/api/scan-passport", {
        imageBase64: optimizedImage,
        mimeType: "image/jpeg"
      }, 35000);

      if (res.success && res.data?.data) {
        extractedData = res.data.data;
      } else if (res.error) {
        console.warn("Backend /api/scan-passport error:", res.error);
      }

      // Apply Extracted Data
      if (extractedData) {
        const { mrzLine1: l1, mrzLine2: l2, visualZone } = extractedData;
        if (l1) setMrzLine1(l1);
        if (l2) setMrzLine2(l2);

        if (visualZone) {
          if (visualZone.firstName) {
            setCandidateFirstName(visualZone.firstName);
          }
          if (visualZone.lastName) {
            setCandidateLastName(visualZone.lastName);
          }
          if (!visualZone.firstName && !visualZone.lastName && (visualZone.fullName || visualZone.fullNameArabic)) {
            const fullName = visualZone.fullNameArabic || visualZone.fullName || "";
            const parts = fullName.trim().split(/\s+/);
            if (parts.length > 1) {
              setCandidateFirstName(parts.slice(0, -1).join(" "));
              setCandidateLastName(parts[parts.length - 1]);
            } else {
              setCandidateFirstName(fullName);
              setCandidateLastName(fullName);
            }
            setVisualName(fullName);
          }
          if (visualZone.passportNumber) setVisualPassportNo(visualZone.passportNumber);
          if (visualZone.birthDate) setVisualBirthDate(visualZone.birthDate);
          if (visualZone.expiryDate) setVisualExpiryDate(visualZone.expiryDate);
          if (visualZone.gender) {
            setVisualGender(visualZone.gender === "female" ? "female" : "male");
          }
          if (visualZone.nationality) setVisualNationality(visualZone.nationality);
          if (visualZone.jobTitle) setVisualJob(visualZone.jobTitle);
        }

        setStatusMessage("تم استخراج البيانات ومطابقتها بنجاح.");
      } else {
        // Fallback: Enable manual entry with photo ready for submission
        setCandidateFirstName("");
        setVisualPassportNo("");
        setErrorMessage("تنبيه: يمكنك الآن مراجعة وتعديل الحقول أدناه واعتماد بيانات المرشح مباشرة.");
      }
    } catch (e: any) {
      console.warn("AI scanning error, enabling manual entry fallback:", e);
      setCandidateFirstName("");
      setVisualPassportNo("");
      setErrorMessage("تنبيه: يمكنك مراجعة وتعديل الحقول أدناه واعتماد بيانات المرشح مباشرة.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Load a built-in sample passport
  const loadSample = (sample: (typeof SAMPLE_PASSPORTS)[0]) => {
    setMrzLine1(sample.line1);
    setMrzLine2(sample.line2);
    const fullName = sample.visual.fullNameArabic || sample.visual.fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      setCandidateFirstName(parts.slice(0, -1).join(" "));
      setCandidateLastName(parts[parts.length - 1]);
    } else {
      setCandidateFirstName(fullName);
      setCandidateLastName(fullName);
    }
    setVisualName(fullName);
    setVisualPassportNo(sample.visual.passportNumber);
    setVisualBirthDate(sample.visual.birthDate);
    setVisualExpiryDate(sample.visual.expiryDate);
    setVisualGender(sample.visual.gender);
    setVisualNationality(sample.visual.nationality);
    setVisualJob(sample.visual.jobTitle || "عامل / عاملة");
    setSelectedImage(null);
    setStatusMessage("تم تحميل النموذج التجريبي بنجاح.");
    setErrorMessage(null);
  };

  // Apply parsed and verified data to Candidate Form
  const handleApply = () => {
    let fName = candidateFirstName.trim();
    let lName = candidateLastName.trim();

    if (!fName && visualName) {
      const parts = visualName.trim().split(/\s+/);
      if (parts.length > 1) {
        fName = parts.slice(0, -1).join(" ");
        lName = parts[parts.length - 1];
      } else {
        fName = visualName;
        lName = visualName;
      }
    } else if (!fName && analysis?.mrz) {
      fName = analysis.mrz.givenNames || "المرشح";
      lName = analysis.mrz.surname && analysis.mrz.surname !== "المرشح" ? analysis.mrz.surname : fName;
    }

    if (!lName) {
      lName = fName;
    }

    const passNo = visualPassportNo.trim() || analysis?.mrz?.passportNumber || "";
    const passExp = visualExpiryDate || analysis?.mrz?.expiryDateFormatted || "";
    const bDate = visualBirthDate || analysis?.mrz?.birthDateFormatted || "";
    const gndr = visualGender || (analysis?.mrz?.gender === "female" ? "female" : "male");
    const cntry = visualNationality || analysis?.mrz?.nationalityName || "المملكة العربية السعودية";

    const approval = canApprovePassportData({
      hasVerifiedMrz: Boolean(analysis?.mrz?.checksums?.allValid),
      passportNumber: passNo,
      firstName: fName,
      lastName: lName,
      birthDate: bDate,
      expiryDate: passExp
    });

    if (!approval.allowed) {
      setErrorMessage(approval.reason || "لا يمكن اعتماد بيانات الجواز قبل اكتمال الفحص والمطابقة.");
      return;
    }

    onApplyData({
      firstName: fName,
      lastName: lName,
      passportNumber: passNo,
      passportExpiryDate: passExp,
      dateOfBirth: bDate,
      gender: gndr,
      country: cntry,
      job: visualJob || "عامل / عاملة"
    });

    onClose();
  };

  // Copy structured audit report
  const handleCopyAuditReport = () => {
    if (!analysis) return;
    const reportLines = [
      `=== تقرير فحص ومطابقة جواز السفر (MRZ & ICAO 9303) ===`,
      `الحالة الإجمالية: ${analysis.overallStatus === "VERIFIED" ? "مطابق ومعتمد" : "يحتاج مراجعة"}`,
      `مؤشر النزاهة والمطابقة: ${analysis.integrityScore}%`,
      `الرقم المستخرج: ${analysis.mrz?.passportNumber || visualPassportNo}`,
      `تاريخ الانتهاء: ${analysis.mrz?.expiryDateFormatted || visualExpiryDate} (${analysis.validityAnalysis.statusText})`,
      `تاريخ الميلاد: ${analysis.mrz?.birthDateFormatted || visualBirthDate} (العمر: ${analysis.ageAnalysis.age} سنة)`,
      `البلد المصدر: ${analysis.mrz?.issuingCountryName || visualNationality}`,
      `توقيع MRZ الرياضي: ${analysis.mrz?.checksums.allValid ? "سليم وموثق" : "تنبيه في أرقام التحقق"}`,
      `مطابقة الحقول: ${analysis.crossChecks.map((c) => `[${c.fieldLabel}: ${c.status === "pass" ? "متطابق" : "غير متطابق"}]`).join(", ")}`,
      `الخلاصة: ${analysis.overallSummary}`
    ].join("\n");

    navigator.clipboard.writeText(reportLines);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const hasAnyData = Boolean(
    selectedImage ||
    candidateFirstName.trim() ||
    visualPassportNo.trim() ||
    visualName.trim() ||
    mrzLine1.trim() ||
    mrzLine2.trim() ||
    analysis
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#172a46] text-white p-4 sm:p-6 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center font-black shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                ماسح جواز السفر الذكي (MRZ + ICAO 9303)
                <span className="bg-[#c9a84c]/20 text-[#c9a84c] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#c9a84c]/30">
                  Dual-Layer Verification
                </span>
              </h3>
              <p className="text-xs text-stone-300">
                مطابقة منطقة القراءة الآلية مع الحقول البصرية والتحقق الرياضي من أرقام Check Digits
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

        {/* Input Mode Selector */}
        <div className="bg-stone-100/80 px-4 sm:px-6 py-2.5 border-b border-stone-200 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveMode("UPLOAD")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeMode === "UPLOAD"
                ? "bg-[#172a46] text-white shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع صورة الجواز (OCR + AI)</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("CAMERA");
              startCamera();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeMode === "CAMERA"
                ? "bg-[#172a46] text-white shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>مسح مباشر بالكاميرا</span>
          </button>

          <button
            onClick={() => setActiveMode("MANUAL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeMode === "MANUAL"
                ? "bg-[#172a46] text-white shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>إدخال كود MRZ يدوياً</span>
          </button>

          <button
            onClick={() => setActiveMode("SAMPLES")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeMode === "SAMPLES"
                ? "bg-[#c9a84c] text-[#172a46] shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-200 border border-stone-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>نماذج تجريبية سريعة</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Status & Error Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TOP SECTION: Input / Scan Panel according to Mode */}
          {activeMode === "UPLOAD" && (
            <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-stone-300 text-center hover:border-[#172a46] transition-colors relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#c9a84c] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-[#172a46]">انقر هنا أو اسحب صورة صفحة جواز السفر</h4>
                <p className="text-xs text-stone-500 max-w-md">
                  يدعم صور JPG, PNG و WebP. يقوم الماسح باستخراج كود الـ MRZ والمنطقة البصرية ومطابقتهما فورياً.
                </p>
              </div>

              {selectedImage && (
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-center gap-3">
                  <img
                    src={selectedImage}
                    alt="Passport Preview"
                    className="h-20 w-auto rounded-lg border border-stone-200 object-cover shadow-xs"
                  />
                  <div className="text-right text-xs text-stone-600">
                    <p className="font-bold text-[#172a46]">تم تحميل الصورة</p>
                    {isProcessing ? (
                      <p className="text-amber-600 flex items-center gap-1 font-bold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" /> جاري التحليل والمسح الذكي...
                      </p>
                    ) : (
                      <p className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> جاهز للاعتماد
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMode === "CAMERA" && (
            <div className="bg-stone-900 rounded-2xl p-4 text-white relative overflow-hidden flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-6 space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-sm text-stone-200">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="bg-[#c9a84c] text-[#172a46] font-bold text-xs px-4 py-2 rounded-xl shadow-md"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-lg relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-4 border-2 border-dashed border-[#c9a84c]/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] bg-black/60 text-[#c9a84c] px-2 py-0.5 rounded-md self-start font-mono">
                      قم بمحاذاة صفحة الجواز وكود MRZ السفلي
                    </span>
                    <div className="h-10 border-t-2 border-emerald-400/80 bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-[9px] text-emerald-300 font-mono font-bold">منطقة MRZ (سطرين)</span>
                    </div>
                  </div>
                </div>
              )}

              {isCameraActive && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={captureSnapshot}
                    disabled={isProcessing}
                    className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-6 py-2.5 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span>{isProcessing ? "جاري المعالجة..." : "التقاط وفحص الآن"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeMode === "SAMPLES" && (
            <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-[#172a46] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                  اختر نموذج جواز سفر جاهز لتجربة محرك التحقق والمطابقة فورياً:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_PASSPORTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSample(sample)}
                    className="p-3 bg-white hover:bg-amber-100/50 rounded-xl border border-amber-200 text-right transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-black text-xs text-[#172a46] group-hover:text-amber-900">
                        {sample.title}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1">الاسم: {sample.visual.fullNameArabic}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#c9a84c] mt-2 block">تجربة هذا النموذج ←</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Extracted Data Preview & Edit Panel */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="font-black text-xs text-[#172a46] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>بيانات المرشح المستخرجة من الجواز (تعبئة فورية ومراجعة):</span>
              </h4>
              <span className="text-[11px] font-bold text-stone-400">قابلة للتعديل والتحقق</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-stone-500 font-bold block mb-1">الاسم الأول (Given Name):</label>
                <input
                  type="text"
                  value={candidateFirstName}
                  onChange={(e) => setCandidateFirstName(e.target.value)}
                  placeholder="الاسم الأول"
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">اسم العائلة / اللقب (Surname):</label>
                <input
                  type="text"
                  value={candidateLastName}
                  onChange={(e) => setCandidateLastName(e.target.value)}
                  placeholder="اسم العائلة"
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">رقم الجواز (Passport No):</label>
                <input
                  type="text"
                  value={visualPassportNo}
                  onChange={(e) => setVisualPassportNo(e.target.value.toUpperCase())}
                  placeholder="A12345678"
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold font-mono focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">الدولة / الجنسية:</label>
                <input
                  type="text"
                  value={visualNationality}
                  onChange={(e) => setVisualNationality(e.target.value)}
                  placeholder="المملكة العربية السعودية"
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">تاريخ الميلاد (DOB):</label>
                <input
                  type="date"
                  value={visualBirthDate}
                  onChange={(e) => setVisualBirthDate(e.target.value)}
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">تاريخ انتهاء الجواز:</label>
                <input
                  type="date"
                  value={visualExpiryDate}
                  onChange={(e) => setVisualExpiryDate(e.target.value)}
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">الجنس:</label>
                <select
                  value={visualGender}
                  onChange={(e) => setVisualGender(e.target.value as "male" | "female")}
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                >
                  <option value="male">ذكر (Male)</option>
                  <option value="female">أنثى (Female)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-500 font-bold block mb-1">المهنة المقترحة:</label>
                <input
                  type="text"
                  value={visualJob}
                  onChange={(e) => setVisualJob(e.target.value)}
                  placeholder="عاملة منزلية / سائق"
                  className="w-full bg-stone-50 text-stone-900 px-3 py-2 rounded-xl border border-stone-200 font-bold focus:bg-white focus:border-[#172a46] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* MRZ Lines Box (Interactive & Editable) */}
          <div className="bg-[#172a46] text-white p-4 sm:p-5 rounded-2xl shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-mono text-xs font-bold text-stone-200">
                  Machine Readable Zone (ICAO TD3 - 44x2 Chars)
                </h4>
              </div>
              <span className="text-[10px] text-[#c9a84c] font-mono">Doc 9303 Specification</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div>
                <label className="text-[10px] text-stone-400 block mb-1">السطر 1 (النوع، البلد، الاسم):</label>
                <input
                  type="text"
                  maxLength={44}
                  value={mrzLine1}
                  onChange={(e) => setMrzLine1(e.target.value.toUpperCase())}
                  placeholder="P<SAUALHARBI<<ABDULLAH<MOHAMMED<<<<<<<<<<<<<"
                  className="w-full bg-stone-900/90 text-emerald-400 px-3.5 py-2.5 rounded-xl border border-stone-700 tracking-wider text-xs font-mono focus:outline-hidden focus:border-[#c9a84c]"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-400 block mb-1">
                  السطر 2 (رقم الجواز، تاريخ الميلاد، الجنس، تاريخ الانتهاء، أرقام التحقق):
                </label>
                <input
                  type="text"
                  maxLength={44}
                  value={mrzLine2}
                  onChange={(e) => setMrzLine2(e.target.value.toUpperCase())}
                  placeholder="N019284724SAU9001018M3005206<<<<<<<<<<<<<<08"
                  className="w-full bg-stone-900/90 text-emerald-400 px-3.5 py-2.5 rounded-xl border border-stone-700 tracking-wider text-xs font-mono focus:outline-hidden focus:border-[#c9a84c]"
                />
              </div>
            </div>
          </div>

          {/* ANALYSIS & RECONCILIATION REPORT */}
          {analysis && (
            <div className="space-y-5 animate-in fade-in">
              {/* Overall Status Banner */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  analysis.overallStatus === "VERIFIED"
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : analysis.overallStatus === "NEEDS_REVIEW"
                    ? "bg-amber-50/80 border-amber-300 text-amber-950"
                    : "bg-rose-50/80 border-rose-300 text-rose-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      analysis.overallStatus === "VERIFIED"
                        ? "bg-emerald-600 text-white"
                        : analysis.overallStatus === "NEEDS_REVIEW"
                        ? "bg-amber-600 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {analysis.overallStatus === "VERIFIED" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : analysis.overallStatus === "NEEDS_REVIEW" ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base">
                      {analysis.overallStatus === "VERIFIED"
                        ? "جواز السفر سليم ومطابق للمعاير (100% Verified)"
                        : analysis.overallStatus === "NEEDS_REVIEW"
                        ? "تنبيه: يتطلب مراجعة إدارية"
                        : "جواز غير صالح أو منتهي الصلاحية"}
                    </h4>
                    <p className="text-xs font-medium mt-0.5 opacity-90">{analysis.overallSummary}</p>
                  </div>
                </div>

                {/* Score badge */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-xs self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block">درجة النزاهة والمطابقة</span>
                    <span className="text-base font-black text-[#172a46]">{analysis.integrityScore}%</span>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      analysis.integrityScore >= 85
                        ? "bg-emerald-500"
                        : analysis.integrityScore >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                </div>
              </div>

              {/* 4 Checksums Mathematical Breakdown Cards */}
              {analysis.mrz && (
                <div>
                  <h5 className="text-xs font-black text-[#172a46] mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#c9a84c]" />
                    التحقق الرياضي لأرقام التوثيق (ICAO 9303 Check Digits 7-3-1 Weight Pattern):
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Checksum 1: Passport No */}
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>رقم الجواز</span>
                        {analysis.mrz.checksums.passportNumber.isValid ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> سليم
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <X className="w-3.5 h-3.5" /> خطأ
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-black text-[#172a46]">
                        {analysis.mrz.passportNumber}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">
                        المحسوب: {analysis.mrz.checksums.passportNumber.expectedCheckDigit} | المسجل:{" "}
                        {analysis.mrz.checksums.passportNumber.actualCheckDigit}
                      </p>
                    </div>

                    {/* Checksum 2: Birth Date */}
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>تاريخ الميلاد</span>
                        {analysis.mrz.checksums.birthDate.isValid ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> سليم
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <X className="w-3.5 h-3.5" /> خطأ
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-black text-[#172a46]">
                        {analysis.mrz.birthDateFormatted}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">
                        المحسوب: {analysis.mrz.checksums.birthDate.expectedCheckDigit} | المسجل:{" "}
                        {analysis.mrz.checksums.birthDate.actualCheckDigit}
                      </p>
                    </div>

                    {/* Checksum 3: Expiry Date */}
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>تاريخ الانتهاء</span>
                        {analysis.mrz.checksums.expiryDate.isValid ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> سليم
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <X className="w-3.5 h-3.5" /> خطأ
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-black text-[#172a46]">
                        {analysis.mrz.expiryDateFormatted}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">
                        المحسوب: {analysis.mrz.checksums.expiryDate.expectedCheckDigit} | المسجل:{" "}
                        {analysis.mrz.checksums.expiryDate.actualCheckDigit}
                      </p>
                    </div>

                    {/* Checksum 4: Composite */}
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>التوقيع المجمع</span>
                        {analysis.mrz.checksums.composite.isValid ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> موثق
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> مراجعة
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-black text-[#172a46]">Composite Seal</p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">
                        المحسوب: {analysis.mrz.checksums.composite.expectedCheckDigit} | المسجل:{" "}
                        {analysis.mrz.checksums.composite.actualCheckDigit}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cross-Matching Table: Visual Zone (OCR) vs Machine Zone (MRZ) */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <h5 className="text-xs font-black text-[#172a46] flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#c9a84c]" />
                    جدول مطابقة الحقول المتقاطعة (VIZ vs MRZ Cross-Matching):
                  </h5>
                  <span className="text-[11px] text-stone-500">
                    {analysis.crossChecks.filter((c) => c.status === "pass").length} من أصل{" "}
                    {analysis.crossChecks.length} حقول متطابقة
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {analysis.crossChecks.map((check, idx) => (
                    <div
                      key={idx}
                      className="p-3 sm:px-4 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                            check.status === "pass"
                              ? "bg-emerald-100 text-emerald-700"
                              : check.status === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {check.status === "pass" ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : check.status === "warning" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-[#172a46]">{check.fieldLabel}</span>
                          <p className="text-[11px] text-stone-500 mt-0.5">{check.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto">
                        <div className="text-left bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                          <span className="text-[9px] text-stone-400 block">MRZ:</span>
                          <span className="font-bold text-emerald-700">{check.mrzValue || "-"}</span>
                        </div>
                        <span className="text-stone-300">↔</span>
                        <div className="text-left bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                          <span className="text-[9px] text-stone-400 block">البصري:</span>
                          <span className="font-bold text-[#172a46]">{check.visualValue || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validity & Age Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Expiry / Visa Card */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    analysis.validityAnalysis.status === "valid"
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                      : analysis.validityAnalysis.status === "expiring_soon"
                      ? "bg-amber-50/50 border-amber-200 text-amber-950"
                      : "bg-rose-50/50 border-rose-200 text-rose-950"
                  }`}
                >
                  <Calendar className="w-5 h-5 shrink-0 mt-0.5 text-[#172a46]" />
                  <div>
                    <h6 className="font-black text-xs">صلاحية الجواز وإصدار التأشيرة</h6>
                    <p className="text-xs mt-0.5">{analysis.validityAnalysis.statusText}</p>
                    <span className="text-[10px] font-bold mt-1 inline-block opacity-80">
                      {analysis.validityAnalysis.isEligibleForVisa
                        ? "✅ مستوفي شرط الـ 6 أشهر للتأشيرة"
                        : "❌ غير مستوفي شرط الـ 6 أشهر للسفر والتوظيف"}
                    </span>
                  </div>
                </div>

                {/* Age / Eligibility Card */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3 text-stone-800">
                  <User className="w-5 h-5 shrink-0 mt-0.5 text-[#172a46]" />
                  <div>
                    <h6 className="font-black text-xs">العمر والأهلية النظامية</h6>
                    <p className="text-xs mt-0.5">{analysis.ageAnalysis.statusText}</p>
                    <span className="text-[10px] font-bold text-stone-500 mt-1 inline-block">
                      {analysis.ageAnalysis.isWorkAgeEligible
                        ? "✅ السن مطابق للائحة الاستقدام (18 - 60 سنة)"
                        : "⚠️ يتطلب استثناء خاص"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-100 px-4 sm:px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyAuditReport}
              disabled={!analysis}
              className="bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {copiedReport ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedReport ? "تم نسخ التقرير!" : "نسخ تقرير الفحص"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs text-stone-600 hover:bg-stone-200 transition-colors"
            >
              إلغاء
            </button>

            <button
              onClick={handleApply}
              disabled={!hasAnyData}
              className="w-1/2 sm:w-auto bg-[#172a46] hover:bg-[#223d64] text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#c9a84c]" />
              <span>اعتماد وتعبئة بيانات المرشح</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
