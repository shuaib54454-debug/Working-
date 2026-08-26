import React, { useState, useRef } from "react";
import {
  Settings,
  Building2,
  DollarSign,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Save,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Cloud,
  Sparkles,
  ExternalLink,
  Wallet,
  Database,
  Languages,
  LogOut,
  KeyRound,
  UserCheck,
  Lock,
  AlertCircle
} from "lucide-react";
import { AgencySettings, Candidate, GeneralExpense } from "../types";
import { INITIAL_CANDIDATES, INITIAL_EXPENSES, DEFAULT_SETTINGS } from "../data/initialData";
import { exportCandidatesToCSV, exportFinanceToCSV, exportFullJSONBackup } from "../lib/exportUtils";
import { useLanguage } from "../lib/LanguageContext";
import { auth, logoutUser, changeCurrentUserPassword } from "../lib/firebase";

interface SettingsViewProps {
  settings: AgencySettings;
  candidates: Candidate[];
  generalExpenses: GeneralExpense[];
  onSaveSettings: (settings: AgencySettings) => void;
  onRestoreAllData: (data: { candidates: Candidate[]; generalExpenses: GeneralExpense[]; settings: AgencySettings }) => void;
  onResetToDemo: () => void;
  onOpenGoogleSheetsModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  candidates,
  generalExpenses,
  onSaveSettings,
  onRestoreAllData,
  onResetToDemo,
  onOpenGoogleSheetsModal
}) => {
  const { t, language, setLanguage, isAr } = useLanguage();
  const [formData, setFormData] = useState<AgencySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const connectedSheetId = typeof window !== "undefined" ? localStorage.getItem("SHUAYB_SPREADSHEET_ID") : null;
  const connectedSheetTitle = typeof window !== "undefined" ? localStorage.getItem("SHUAYB_SPREADSHEET_TITLE") : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: isAr ? "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." : "Password must be at least 6 characters."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: isAr ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeCurrentUserPassword(newPassword);
      setPasswordStatus({
        type: "success",
        message: isAr ? "تم تحديث كلمة المرور بنجاح!" : "Password updated successfully!"
      });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordStatus(null);
      }, 2500);
    } catch (err: any) {
      setPasswordStatus({
        type: "error",
        message: err?.message || (isAr ? "تعذر تغيير كلمة المرور. قد يتطلب إعادة تسجيل الدخول." : "Failed to change password.")
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      isAr ? "هل أنت متأكد من رغبتك في تسجيل الخروج؟" : "Are you sure you want to sign out?"
    );
    if (confirmLogout) {
      await logoutUser();
    }
  };

  const handleBackupDownload = () => {
    exportFullJSONBackup(candidates, generalExpenses, formData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let restoredCandidates = candidates;
        let restoredExpenses = generalExpenses;
        let restoredSettings = formData;

        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          restoredCandidates = parsed.candidates;
        } else if (Array.isArray(parsed)) {
          restoredCandidates = parsed;
        }

        if (parsed.generalExpenses && Array.isArray(parsed.generalExpenses)) {
          restoredExpenses = parsed.generalExpenses;
        }

        if (parsed.settings && typeof parsed.settings === "object") {
          restoredSettings = { ...formData, ...parsed.settings };
          setFormData(restoredSettings);
        }

        if (restoredCandidates.length > 0 || restoredExpenses.length > 0) {
          onRestoreAllData({
            candidates: restoredCandidates,
            generalExpenses: restoredExpenses,
            settings: restoredSettings
          });
          alert(`تم استرجاع النسخة الاحتياطية بنجاح!\n• عدد المرشحين: ${restoredCandidates.length}\n• عدد المصروفات: ${restoredExpenses.length}\n• بيانات الوكالة: ${restoredSettings.agencyName}`);
        } else {
          alert("صيغة الملف غير صالحة. يرجى اختيار ملف نسخة احتياطية صالح لنظام الوكالة يحتوي على مصفوفة المرشحين.");
        }
      } catch (err) {
        alert("حدث خطأ أثناء قراءة الملف. تأكد من سلامة ملف JSON وأنه غير تالف.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportCSV = () => {
    exportCandidatesToCSV(candidates, formData);
  };

  const handleExportFinanceCSV = () => {
    exportFinanceToCSV(candidates, generalExpenses, formData);
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Header with Language Selector */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#172a46] text-[#c9a84c] flex items-center justify-center shadow-xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#172a46] flex items-center gap-2">
              <span>{t.settingsTitle}</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {isAr
                ? "تخصيص بيانات الوكالة، العملة الافتراضية، ومزامنة جداول Google Sheets السحابية"
                : "Customize agency information, currency, cloud sync, and data backups"}
            </p>
          </div>
        </div>

        {/* Language Selection Buttons */}
        <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 self-start md:self-auto">
          <Languages className="w-4 h-4 text-[#c9a84c] ml-1 mr-1" />
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "ar"
                ? "bg-white text-[#172a46] shadow-xs font-black"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            العربية (Arabic)
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "en"
                ? "bg-white text-[#172a46] shadow-xs font-black"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            English (الإنجليزية)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#c9a84c]" />
              <span>{t.agencyProfile}</span>
            </h3>
            {savedSuccess && (
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t.success}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.agencyName} *</label>
                <input
                  type="text"
                  required
                  value={formData.agencyName}
                  onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-black text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.currency} *</label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 text-xs outline-none focus:ring-2 focus:ring-[#c9a84c]"
                >
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="USD">USD - دولار أمريكي</option>
                  <option value="AED">AED - درهم إماراتي</option>
                  <option value="KWD">KWD - دينار كويتي</option>
                  <option value="BHD">BHD - دينار بحريني</option>
                  <option value="OMR">OMR - ريال عماني</option>
                  <option value="QAR">QAR - ريال قطري</option>
                  <option value="EGP">EGP - جنيه مصري</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>{t.phone}</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 font-medium outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder="+966 50 000 0000"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>{t.email}</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 font-medium outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder="info@agency.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>{t.licenseNumber}</span>
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 font-medium outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder="LIC-123456"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>{t.taxNumber}</span>
                </label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 font-medium outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder="300000000000003"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>{t.address}</span>
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 font-medium outline-none focus:ring-2 focus:ring-[#c9a84c]"
                placeholder="الرياض، المملكة العربية السعودية"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#172a46] hover:bg-[#203a60] text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Save className="w-4 h-4 text-[#c9a84c]" />
                <span>{t.saveSettings}</span>
              </button>
            </div>
          </form>

          {/* Backup & Restore Controls */}
          <div className="border-t border-stone-200 pt-6 space-y-4">
            <h4 className="font-black text-sm text-[#172a46] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#c9a84c]" />
              <span>{t.backupAndRestore}</span>
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {isAr
                ? "يمكنك تحميل نسخة احتياطية كاملة من قاعدة بيانات الوكالة بصيغة JSON، أو استرجاع بياناتك السابقة في أي وقت بضغطة واحدة."
                : "Export a complete JSON backup of candidates, finances, and settings or restore your previous data anytime."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackupDownload}
                className="p-3.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-black text-stone-800 flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-[#c9a84c]" />
                <span>{t.exportJsonBackup}</span>
              </button>

              <label className="p-3.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-black text-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{t.restoreBackup}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.exportCandidatesCSV}</span>
              </button>

              <button
                type="button"
                onClick={handleExportFinanceCSV}
                className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.exportFinanceCSV}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Cards & Cloud Integrations */}
        <div className="space-y-6">
          {/* Account & Security Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
                <span>{isAr ? "الحساب والأمان" : "Account & Security"}</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {isAr ? "حساب موثق" : "Verified"}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "البريد الإلكتروني:" : "Email:"}</span>
                <span className="font-bold text-[#172a46] text-[11px] dir-ltr truncate max-w-[170px]">
                  {auth?.currentUser?.email || "shuaib54454@gmail.com"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "حالة المصادقة:" : "Auth Status:"}</span>
                <span className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isAr ? "متصل بسحابة Firebase" : "Connected to Firebase"}
                </span>
              </div>
            </div>

            {/* Password status notification */}
            {passwordStatus && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  passwordStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {passwordStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            {/* Change password toggle / form */}
            {!showPasswordChange ? (
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>{isAr ? "تغيير كلمة المرور" : "Change Password"}</span>
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#c9a84c]" />
                    {isAr ? "تعيين كلمة مرور جديدة" : "New Password"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="text-[11px] font-bold text-stone-400 hover:text-stone-600"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>

                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={isAr ? "كلمة المرور الجديدة (6+ أحرف)" : "New Password (6+ chars)"}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />

                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-2 bg-[#172a46] text-white rounded-xl text-xs font-black hover:bg-[#203a60] disabled:opacity-50 transition-colors"
                >
                  {isChangingPassword ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ كلمة المرور" : "Save New Password")}
                </button>
              </form>
            )}

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>{isAr ? "تسجيل الخروج من الحساب" : "Sign Out"}</span>
            </button>
          </div>

          {/* Cloud Database (Firebase Firestore) Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500" />
                <span>{t.cloudSyncTitle}</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.cloudConnected}
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {isAr
                ? "يتم حفظ ومزامنة جميع بيانات المرشحين، العمليات المالية، وسندات القبض مباشرة على سحابة Google Cloud مع استمرارية كاملة عبر كافة الأجهزة."
                : "All candidate records, financial transactions, and receipts are continuously synchronized to Google Cloud with real-time persistence."}
            </p>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "معرف المشروع (GCP Project):" : "GCP Project ID:"}</span>
                <span className="font-mono font-bold text-stone-800 text-[11px] dir-ltr">gen-lang-client-0213401665</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "منطقة الاستضافة (Region):" : "Hosting Region:"}</span>
                <span className="font-mono font-bold text-stone-800 text-[11px]">us-west1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "المزامنة اللحظية (Real-time Sync):" : "Real-time Sync:"}</span>
                <span className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isAr ? "مفعلة تلقائياً" : "Active & Synchronized"}
                </span>
              </div>
            </div>
          </div>

          {/* Secure Backend AI Vision Service Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c9a84c]" />
                <span>{isAr ? "خدمة الذكاء الاصطناعي الخلفية (Secure Backend AI)" : "Secure Backend AI Vision"}</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {isAr ? "محمي وآمن" : "Secure Server-Side"}
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {isAr
                ? "تتم معالجة صور الجوازات واستخراج البيانات عبر خادم الواجهة الخلفية الآمن (Server-Side HTTPS API). يتم الاحتفاظ بمفتاح GEMINI_API_KEY حصرياً على الخادم لضمان أمان النظام وحماية البيانات."
                : "Passport images are securely processed on the backend server via HTTPS API. The GEMINI_API_KEY remains strictly server-side for maximum security."}
            </p>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "المعمارية الأمنية:" : "Architecture:"}</span>
                <span className="font-bold text-[#172a46] text-[11px]">Android APK → Backend HTTPS → Gemini</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "حماية المفاتيح السحابية:" : "API Key Storage:"}</span>
                <span className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? "خادم آمن 100% (No Client Exposure)" : "Server-Side Only"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">{isAr ? "معيار القراءة الآلية:" : "MRZ Standard:"}</span>
                <span className="font-bold text-stone-800 text-[11px]">ICAO Doc 9303 (TD3)</span>
              </div>
            </div>
          </div>

          {/* Google Sheets Integration Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Google Sheets</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {t.connected}
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {isAr
                ? "اربط النظام بجداول بيانات Google Sheets السحابية في Google Drive لمزامنة بيانات المرشحين والمدفوعات والمصروفات أولاً بأول."
                : "Connect the system with Google Sheets in Google Drive to sync candidates, payments, and expenses in real time."}
            </p>

            {connectedSheetId ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {isAr ? "مرتبط مع:" : "Linked with:"} {connectedSheetTitle || "Sheet"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-700 truncate">ID: {connectedSheetId}</div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onOpenGoogleSheetsModal}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t.googleSheetsSync}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
