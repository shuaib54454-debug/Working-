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
  AlertCircle,
  Smartphone
} from "lucide-react";
import { AgencySettings, Candidate, GeneralExpense } from "../types";
import { INITIAL_CANDIDATES, INITIAL_EXPENSES, DEFAULT_SETTINGS } from "../data/initialData";
import { exportCandidatesToCSV, exportFinanceToCSV, exportFullJSONBackup } from "../lib/exportUtils";
import { useLanguage } from "../lib/LanguageContext";
import { auth, logoutUser, changeCurrentUserPassword } from "../lib/firebase";
import { ShuaybLogo } from "./ShuaybLogo";

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

  // Account & Auth state
  const currentUser = auth.currentUser;
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: isAr ? "كلمة المرور يجب ألا تقل عن 6 أحرف" : "Password must be at least 6 characters"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeCurrentUserPassword(newPassword);
      setPasswordStatus({
        type: "success",
        message: isAr ? "تم تحديث كلمة المرور بنجاح" : "Password changed successfully"
      });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
    } catch (err: any) {
      setPasswordStatus({
        type: "error",
        message: err?.message || (isAr ? "فشل تغيير كلمة المرور" : "Failed to change password")
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (confirm(isAr ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to sign out?")) {
      await logoutUser();
    }
  };

  const connectedSheetTitle = localStorage.getItem("rec_connected_sheet_title");
  const connectedSheetId = localStorage.getItem("rec_connected_sheet_id");
  const lastSheetSync = localStorage.getItem("rec_last_sheet_sync");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Export full JSON backup (Candidates, Expenses, Settings)
  const handleExportJSON = () => {
    exportFullJSONBackup(candidates, generalExpenses, formData);
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          const restoredCandidates = parsed.candidates;
          const restoredExpenses = Array.isArray(parsed.generalExpenses) ? parsed.generalExpenses : [];
          const restoredSettings = parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS;

          onRestoreAllData({
            candidates: restoredCandidates,
            generalExpenses: restoredExpenses,
            settings: restoredSettings
          });
          setFormData(restoredSettings);
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

  // Export Candidates to CSV
  const handleExportCSV = () => {
    exportCandidatesToCSV(candidates, formData);
  };

  // Export Financial Ledger to CSV
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
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl font-black text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#c9a84c]"
                >
                  <option value="ETB">ETB (بير إثيوبي - Ethiopian Birr)</option>
                  <option value="SAR">SAR (ريال سعودي - Saudi Riyal)</option>
                  <option value="USD">USD (دولار أمريكي - US Dollar)</option>
                  <option value="AED">AED (درهم إماراتي - UAE Dirham)</option>
                  <option value="QAR">QAR (ريال قطري - Qatari Riyal)</option>
                  <option value="KWD">KWD (دينار كويتي - Kuwaiti Dinar)</option>
                  <option value="OMR">OMR (ريال عماني - Omani Rial)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">{t.agencySubtitle}</label>
                <input
                  type="text"
                  value={formData.agencySubtitle || ""}
                  onChange={e => setFormData({ ...formData, agencySubtitle: e.target.value })}
                  placeholder="e.g. Overseas Recruitment Agency"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.licenseNumber}</label>
                <input
                  type="text"
                  value={formData.licenseNumber || ""}
                  onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.taxNumber}</label>
                <input
                  type="text"
                  value={formData.taxNumber || ""}
                  onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.phone}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t.email}</label>
                <input
                  type="email"
                  dir="ltr"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">{t.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] text-xs font-black shadow-xs flex items-center gap-2 transition-transform active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{t.saveSettings}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cloud & Backup Management Column */}
        <div className="space-y-4">
          {/* Official Brand Emblem Showcase */}
          <div className="bg-[#fdfcfb] p-6 rounded-3xl border-2 border-[#c9a84c]/30 shadow-xs space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <span className="text-xs font-black text-[#172a46]">الهوية والشعار المعتمد</span>
              <span className="text-[10px] font-bold bg-[#c9a84c]/20 text-[#8B262A] px-2.5 py-0.5 rounded-full">
                شُعيب - Shuayb
              </span>
            </div>
            <ShuaybLogo size="xl" variant="full" showSubtitle={true} className="p-1" />
          </div>

          {/* Install Application & Deployment Guide */}
          <div className="bg-gradient-to-br from-[#172a46] to-[#203a60] text-white p-6 rounded-3xl border border-[#c9a84c]/30 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#c9a84c]" />
                <span>{isAr ? "تثبيت التطبيق على جهازك (PWA)" : "Install App on Device"}</span>
              </h3>
              <span className="text-[10px] font-black bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 px-2.5 py-0.5 rounded-full">
                {isAr ? "تطبيق مستقل" : "Standalone PWA"}
              </span>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {isAr
                ? "يمكنك تثبيت النظام كتطبيق أصلي على هاتفك (Android / iPhone) أو جهاز الكمبيوتر (Windows / Mac) للعمل بسرعة فائقة وبدون شريط المتصفح:"
                : "You can install this system as a standalone application on your mobile device or computer:"}
            </p>

            <div className="space-y-2 text-xs">
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <strong className="text-[#c9a84c] block mb-1">
                  {isAr ? "📱 على هواتف iPhone / iPad (متصفح Safari):" : "📱 On iPhone / iPad (Safari):"}
                </strong>
                <span className="text-stone-300 text-[11px]">
                  {isAr
                    ? "اضغط على زر المشاركة (Share ⎋) أسفل المتصفح ➔ ثم اختر 'إضافة إلى الشاشة الرئيسية (Add to Home Screen)'."
                    : "Tap the Share icon (⎋) in Safari ➔ Select 'Add to Home Screen'."}
                </span>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <strong className="text-[#c9a84c] block mb-1">
                  {isAr ? "🤖 على هواتف Android (متصفح Chrome):" : "🤖 On Android (Chrome):"}
                </strong>
                <span className="text-stone-300 text-[11px]">
                  {isAr
                    ? "اضغط على زر الخيارات (⋮) أعلى المتصفح ➔ ثم اختر 'تثبيت التطبيق (Install App)' أو 'إضافة للشاشة الرئيسية'."
                    : "Tap the menu (⋮) in Chrome ➔ Tap 'Install app' or 'Add to Home screen'."}
                </span>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <strong className="text-[#c9a84c] block mb-1">
                  {isAr ? "💻 على الكمبيوتر (Chrome / Edge):" : "💻 On Desktop (Chrome / Edge):"}
                </strong>
                <span className="text-stone-300 text-[11px]">
                  {isAr
                    ? "اضغط على أيقونة التثبيت (⊕) في شريط العنوان أعلى المتصفح لتثبيت البرنامج كبرنامج مستقل على سطح المكتب."
                    : "Click the Install icon (⊕) in the browser address bar to install as a desktop application."}
                </span>
              </div>
            </div>
          </div>

          {/* Account & Security Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
                <span>{isAr ? "حساب المشرف والأمان" : "Admin Account & Security"}</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {isAr ? "موثق" : "Authenticated"}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px] font-bold">{isAr ? "البريد الإلكتروني:" : "Email Address:"}</span>
                <span className="font-mono font-bold text-stone-800 text-[11px]">{currentUser?.email || "admin@agency.com"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px] font-bold">{isAr ? "معرف المستخدم (UID):" : "User UID:"}</span>
                <span className="font-mono text-stone-500 text-[10px] truncate max-w-[180px]">{currentUser?.uid || "-"}</span>
              </div>
            </div>

            {passwordStatus && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  passwordStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {passwordStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
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
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${connectedSheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>{isAr ? "فتح" : "Open"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {lastSheetSync && (
                  <span className="text-[10px] text-stone-500 block">{isAr ? "آخر مزامنة:" : "Last Sync:"} {lastSheetSync}</span>
                )}
              </div>
            ) : null}

            {onOpenGoogleSheetsModal && (
              <button
                onClick={onOpenGoogleSheetsModal}
                className="w-full p-3 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#c9a84c]" />
                <span>{isAr ? "فتح مركز إدارة ومزامنة Google Sheets" : "Manage Google Sheets Sync"}</span>
              </button>
            )}
          </div>

          {/* Backup & Local Data Management */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
              <Download className="w-5 h-5 text-[#c9a84c]" />
              <span>{t.backupRestore}</span>
            </h3>

            <p className="text-xs text-stone-500 leading-relaxed">
              {isAr
                ? "تحميل واسترجاع النسخ الاحتياطية وتصدير السجلات إلى ملفات CSV."
                : "Export and restore complete JSON backups and download CSV spreadsheets."}
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleExportJSON}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 text-[#172a46] rounded-2xl text-xs font-black flex items-center justify-between border border-stone-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#c9a84c]" />
                  {t.downloadBackup} (JSON)
                </span>
                <span className="text-[10px] text-stone-400">JSON</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 bg-stone-50 hover:bg-stone-100 text-[#172a46] rounded-2xl text-xs font-black flex items-center justify-between border border-stone-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    {t.restoreBackup} (JSON)
                  </span>
                  <span className="text-[10px] text-stone-400">JSON</span>
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 text-[#172a46] rounded-2xl text-xs font-black flex items-center justify-between border border-stone-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {isAr ? "تصدير المرشحين إلى إكسل (CSV)" : "Export Candidates (CSV)"}
                </span>
                <span className="text-[10px] text-stone-400">CSV</span>
              </button>

              <button
                onClick={handleExportFinanceCSV}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 text-[#172a46] rounded-2xl text-xs font-black flex items-center justify-between border border-stone-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#c9a84c]" />
                  {isAr ? "تصدير السجل المالي (CSV)" : "Export Finance (CSV)"}
                </span>
                <span className="text-[10px] text-stone-400">CSV</span>
              </button>
            </div>
          </div>

          {/* Demo Reset Options */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <h4 className="font-black text-sm text-stone-700">{t.resetDemoData}</h4>
            <p className="text-xs text-stone-400">
              {isAr
                ? "يمكنك إعادة تحميل البيانات النموذجية الأصلية لتجربة كافة وظائف النظام."
                : "Reset to initial sample candidates and accounting transactions for testing."}
            </p>

            <button
              onClick={() => {
                if (confirm(isAr ? "هل تريد استعادة البيانات النموذجية الأولية؟" : "Are you sure you want to restore demo data?")) {
                  onResetToDemo();
                }
              }}
              className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-700" />
              {t.resetDemoData}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

