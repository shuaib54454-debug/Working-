import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  Plus,
  ExternalLink,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  LogOut,
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Candidate, GeneralExpense, AgencySettings } from "../types";
import {
  googleSignIn,
  getAccessToken,
  logout,
  initAuth
} from "../lib/googleAuth";
import {
  listUserSpreadsheets,
  createAgencySpreadsheet,
  exportDataToSpreadsheet,
  importCandidatesFromSpreadsheet,
  GoogleDriveFile,
  ImportedCandidatePreview
} from "../lib/googleSheets";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  generalExpenses: GeneralExpense[];
  settings: AgencySettings;
  onImportCandidates: (newCandidates: ImportedCandidatePreview[]) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  candidates,
  generalExpenses,
  settings,
  onImportCandidates
}) => {
  // Auth state
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    email: string | null;
    photo: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sheets state
  const [activeTab, setActiveTab] = useState<"sync" | "create" | "existing" | "import">("sync");
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("rec_connected_sheet_id") || "";
  });
  const [selectedSpreadsheetTitle, setSelectedSpreadsheetTitle] = useState<string>(() => {
    return localStorage.getItem("rec_connected_sheet_title") || "";
  });
  const [newSheetTitle, setNewSheetTitle] = useState(`${settings.agencyName} - سجل المرشحين`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem("rec_last_sheet_sync") || null;
  });

  // Import preview state
  const [importPreviews, setImportPreviews] = useState<ImportedCandidatePreview[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);

  // Destructive confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "overwrite_sheet" | "import_data";
    onConfirm: () => void;
  } | null>(null);

  // Listen to auth
  useEffect(() => {
    if (!isOpen) return;

    initAuth(
      (user, _token) => {
        setIsSignedIn(true);
        setUserProfile({
          name: user.displayName || user.email || "مستخدم Google",
          email: user.email,
          photo: user.photoURL
        });
      },
      () => {
        setIsSignedIn(false);
        setUserProfile(null);
      }
    );
  }, [isOpen]);

  // Load drive files when switching to existing tab or signed in
  useEffect(() => {
    if (isSignedIn && activeTab === "existing") {
      fetchDriveFiles();
    }
  }, [isSignedIn, activeTab]);

  const fetchDriveFiles = async () => {
    try {
      setLoadingFiles(true);
      setErrorMsg(null);
      const token = await getAccessToken();
      if (!token) {
        setIsSignedIn(false);
        return;
      }
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.error("Error fetching spreadsheets:", err);
      setErrorMsg(err.message || "تعذر جلب ملفات Google Sheets من Drive");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      setErrorMsg(null);
      const res = await googleSignIn();
      if (res) {
        setIsSignedIn(true);
        setUserProfile({
          name: res.user.displayName || res.user.email || "مستخدم Google",
          email: res.user.email,
          photo: res.user.photoURL
        });
        setSuccessMsg("تم تسجيل الدخول وربط حساب Google بنجاح");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || "فشل تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsSignedIn(false);
      setUserProfile(null);
      setSuccessMsg("تم تسجيل الخروج من حساب Google");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء تسجيل الخروج");
    }
  };

  // 1. Create New Sheet & Export
  const handleCreateNewSheet = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("يرجى تسجيل الدخول بحساب Google أولاً");
        setIsSignedIn(false);
        return;
      }

      const { spreadsheetId, spreadsheetUrl } = await createAgencySpreadsheet(
        token,
        newSheetTitle,
        candidates,
        generalExpenses,
        settings
      );

      setSelectedSpreadsheetId(spreadsheetId);
      setSelectedSpreadsheetTitle(newSheetTitle);
      localStorage.setItem("rec_connected_sheet_id", spreadsheetId);
      localStorage.setItem("rec_connected_sheet_title", newSheetTitle);
      
      const nowStr = new Date().toLocaleString("ar-EG");
      setLastSyncTime(nowStr);
      localStorage.setItem("rec_last_sheet_sync", nowStr);

      setSuccessMsg(`تم إنشاء جدول البيانات بنجاح وتصدير ${candidates.length} مرشح والبيانات المالية!`);
      setActiveTab("sync");
    } catch (err: any) {
      console.error("Create sheet error:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء إنشاء جدول البيانات في Google Drive");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Sync / Overwrite existing sheet with confirmation dialog
  const requestSyncToSheet = () => {
    if (!selectedSpreadsheetId) {
      setErrorMsg("يرجى اختيار أو إنشاء جدول بيانات أولاً");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "تحديث ومزامنة جدول Google Sheets",
      description: `سيتم تصدير وتحديث ${candidates.length} مرشحاً وجميع قيود المدفوعات والمصروفات إلى جدول البيانات "${selectedSpreadsheetTitle || selectedSpreadsheetId}". هل تريد المتابعة؟`,
      actionType: "overwrite_sheet",
      onConfirm: executeSyncToSheet
    });
  };

  const executeSyncToSheet = async () => {
    setConfirmDialog(null);
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("يرجى تسجيل الدخول بحساب Google أولاً");
        setIsSignedIn(false);
        return;
      }

      await exportDataToSpreadsheet(
        token,
        selectedSpreadsheetId,
        candidates,
        generalExpenses,
        settings
      );

      const nowStr = new Date().toLocaleString("ar-EG");
      setLastSyncTime(nowStr);
      localStorage.setItem("rec_last_sheet_sync", nowStr);
      setSuccessMsg("تمت مزامنة وتحديث جدول Google Sheets بنجاح!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setErrorMsg(err.message || "فشل تحديث جدول Google Sheets");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Load preview for import
  const handleLoadImportPreview = async () => {
    if (!selectedSpreadsheetId) {
      setErrorMsg("يرجى اختيار جدول بيانات لقراءة المرشحين منه");
      return;
    }

    try {
      setLoadingImport(true);
      setErrorMsg(null);
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("يرجى تسجيل الدخول بحساب Google أولاً");
        setIsSignedIn(false);
        return;
      }

      const list = await importCandidatesFromSpreadsheet(token, selectedSpreadsheetId);
      if (list.length === 0) {
        setErrorMsg("لم يتم العثور على أسطر صالحة للمرشحين في صفحة 'المرشحين' بالجدول.");
      } else {
        setImportPreviews(list);
        setSuccessMsg(`تم العثور على ${list.length} مرشح جاهز للاستيراد.`);
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء قراءة الجدول من Google Sheets");
    } finally {
      setLoadingImport(false);
    }
  };

  // 4. Confirm import into local database
  const requestImportCandidates = () => {
    if (importPreviews.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "تأكيد استيراد المرشحين",
      description: `سيتم استيراد ${importPreviews.length} مرشحاً وإضافتهم إلى قاعدة بيانات الوكالة مع توليد أرقام مرجعية متسلسلة تلقائياً. هل أنت متأكد من الاستيراد؟`,
      actionType: "import_data",
      onConfirm: () => {
        onImportCandidates(importPreviews);
        setConfirmDialog(null);
        setImportPreviews([]);
        setSuccessMsg(`تم استيراد ${importPreviews.length} مرشح بنجاح!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#172a46] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>تكامل Google Sheets المباشر</span>
                <span className="text-[10px] font-black bg-[#c9a84c] text-[#172a46] px-2 py-0.5 rounded-full">
                  سحابي
                </span>
              </h3>
              <p className="text-xs text-stone-300">
                مزامنة وتصدير واستيراد بيانات المرشحين والمقبوضات والمصروفات مع جداول بيانات Google Drive
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

        {/* Status Messages */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 flex items-center gap-2 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-6 flex items-center gap-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Account & Connection Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isSignedIn && userProfile?.photo ? (
                <img
                  src={userProfile.photo}
                  alt={userProfile.name || "User"}
                  className="w-11 h-11 rounded-full border border-stone-200 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 font-black">
                  G
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#172a46]">
                    {isSignedIn ? userProfile?.name : "غير متصل بحساب Google"}
                  </span>
                  {isSignedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> متصل
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      يتطلب تسجيل الدخول
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isSignedIn
                    ? userProfile?.email || "تم منح أذونات Google Sheets & Drive بنجاح"
                    : "قم بتسجيل الدخول للوصول إلى جداول البيانات في Google Drive"}
                </p>
              </div>
            </div>

            <div>
              {isSignedIn ? (
                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  تسجيل الخروج
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="px-4 py-2.5 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {/* Google Icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.685-5.17 3.685-9.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.26 21.3 7.36 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.38l4.01-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.26 6.62l4.01 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>{authLoading ? "جاري الاتصال..." : "تسجيل الدخول باستخدام Google"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex border-b border-stone-200 gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("sync")}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "sync"
                  ? "border-[#172a46] text-[#172a46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              المزامنة والتصدير
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "border-[#172a46] text-[#172a46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Plus className="w-4 h-4" />
              إنشاء جدول جديد
            </button>

            <button
              onClick={() => setActiveTab("existing")}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "existing"
                  ? "border-[#172a46] text-[#172a46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              اختيار من Drive
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "import"
                  ? "border-[#172a46] text-[#172a46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Download className="w-4 h-4" />
              استيراد مرشحين
            </button>
          </div>

          {/* TAB 1: Sync & Export */}
          {activeTab === "sync" && (
            <div className="space-y-4">
              {selectedSpreadsheetId ? (
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                        الجدول المرتبط حالياً
                      </span>
                      <h4 className="text-base font-black text-[#172a46] flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span>{selectedSpreadsheetTitle || "جدول بيانات الوكالة"}</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-mono mt-1">ID: {selectedSpreadsheetId}</p>
                    </div>

                    <a
                      href={`https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-[#172a46] hover:bg-stone-50 flex items-center gap-1 shadow-xs"
                    >
                      <span>فتح في Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/50 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-stone-500 block text-[11px]">المرشحون</span>
                      <span className="font-black text-stone-800 text-sm">{candidates.length}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-stone-500 block text-[11px]">سندات القبض</span>
                      <span className="font-black text-stone-800 text-sm">
                        {candidates.reduce((s, c) => s + (c.payments?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-stone-500 block text-[11px]">المصروفات</span>
                      <span className="font-black text-stone-800 text-sm">{generalExpenses.length}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-stone-500 block text-[11px]">آخر مزامنة</span>
                      <span className="font-black text-stone-800 text-[11px] truncate block" title={lastSyncTime || ""}>
                        {lastSyncTime || "لم تتم المزامنة"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={requestSyncToSheet}
                      disabled={isProcessing || !isSignedIn}
                      className="px-5 py-2.5 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
                      <span>{isProcessing ? "جاري المزامنة مع Google Sheets..." : "مزامنة وتحديث البيانات الآن"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSpreadsheetId("");
                        setSelectedSpreadsheetTitle("");
                        localStorage.removeItem("rec_connected_sheet_id");
                        localStorage.removeItem("rec_connected_sheet_title");
                      }}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-bold"
                    >
                      إلغاء الربط مع هذا الجدول
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#c9a84c] flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-sm text-[#172a46]">لا يوجد جدول Google Sheets مرتبط حالياً</h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    يمكنك إنشاء جدول بيانات جديد بضغطة زر واحدة في حسابك على Google Drive، أو اختيار جدول موجود مسبقاً.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("create")}
                      className="px-4 py-2 bg-[#172a46] text-white hover:bg-[#243e65] rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-[#c9a84c]" />
                      إنشاء جدول جديد الآن
                    </button>
                    <button
                      onClick={() => setActiveTab("existing")}
                      className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-2xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-4 h-4" />
                      اختيار من Drive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Create New Spreadsheet */}
          {activeTab === "create" && (
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div>
                <h4 className="font-black text-sm text-[#172a46]">إنشاء جدول بيانات جديد وتصدير البيانات</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  سيتم إنشاء جدول يحتوي على 4 صفحات مخصصة (المرشحين، السندات، المصروفات، ملخص الوكالة) وتصدير جميع السجلات الحالية إليه مباشرة.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700">عنوان جدول البيانات</label>
                <input
                  type="text"
                  value={newSheetTitle}
                  onChange={e => setNewSheetTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-[#172a46] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
                  placeholder="اسم الملف..."
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1 text-stone-600">
                <span className="font-bold text-[#172a46] block mb-1">الصفحات التي سيتم إنشاؤها تلقائياً:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>✓ <strong>المرشحين:</strong> الاسم، الهاتف، المهنة، الدولة، الجواز، الرسوم، المتبقي.</div>
                  <div>✓ <strong>المدفوعات والسندات:</strong> أرقام السندات، التواريخ، المبالغ، طرق الدفع.</div>
                  <div>✓ <strong>المصروفات العامة:</strong> إيجارات، رواتب، تراخيص، مرافق.</div>
                  <div>✓ <strong>ملخص الوكالة:</strong> إجمالي الأرباح، المقبوضات، المصروفات، المتبقيات.</div>
                </div>
              </div>

              <button
                onClick={handleCreateNewSheet}
                disabled={isProcessing || !isSignedIn}
                className="w-full py-3 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                <span>{isProcessing ? "جاري إنشاء وتصدير الجدول..." : "إنشاء الجدول في Google Drive وتصدير السجلات الآن"}</span>
              </button>
            </div>
          )}

          {/* TAB 3: Browse Existing Spreadsheets */}
          {activeTab === "existing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-[#172a46]">ملفات Google Sheets في حسابك</h4>
                  <p className="text-xs text-stone-500">اختر الجدول الذي ترغب في ربطه مع الوكالة للمزامنة أو الاستيراد</p>
                </div>
                <button
                  onClick={fetchDriveFiles}
                  disabled={loadingFiles || !isSignedIn}
                  className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 text-xs font-bold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? "animate-spin" : ""}`} />
                  <span>تحديث القائمة</span>
                </button>
              </div>

              {loadingFiles ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#c9a84c] mx-auto" />
                  <p className="text-xs text-stone-500 font-bold">جاري استعراض ملفات Google Sheets من Drive...</p>
                </div>
              ) : driveFiles.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {driveFiles.map(file => {
                    const isSelected = selectedSpreadsheetId === file.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedSpreadsheetId(file.id);
                          setSelectedSpreadsheetTitle(file.name);
                          localStorage.setItem("rec_connected_sheet_id", file.id);
                          localStorage.setItem("rec_connected_sheet_title", file.name);
                          setSuccessMsg(`تم ربط الجدول "${file.name}" بنجاح`);
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#172a46] text-white border-[#172a46] shadow-xs"
                            : "bg-white text-stone-800 border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className={`w-5 h-5 ${isSelected ? "text-[#c9a84c]" : "text-emerald-600"}`} />
                          <div>
                            <h5 className="font-extrabold text-xs sm:text-sm">{file.name}</h5>
                            <span className={`text-[10px] ${isSelected ? "text-stone-300" : "text-stone-400"}`}>
                              آخر تعديل: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString("ar-EG") : "غير محدد"}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <span className="text-[10px] font-black bg-[#c9a84c] text-[#172a46] px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> تم الاختيار
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-stone-500 hover:text-stone-800">
                              اختر هذا الجدول
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
                  <FolderOpen className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs text-stone-500 font-bold">
                    {isSignedIn
                      ? "لم يتم العثور على جداول بيانات حديثة في حساب Google Drive"
                      : "سجل الدخول أولاً لعرض الملفات"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Import Candidates */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-[#172a46]">استيراد المرشحين من صفحة 'المرشحين' بالجدول</h4>
                    <p className="text-xs text-stone-500">
                      يقرأ الجدول المتصل ويطابق الأعمدة (الاسم، الهاتف، المهنة، الدولة، الجواز، الرسوم) تلقائياً
                    </p>
                  </div>
                  <button
                    onClick={handleLoadImportPreview}
                    disabled={loadingImport || !selectedSpreadsheetId || !isSignedIn}
                    className="px-4 py-2 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${loadingImport ? "animate-spin" : ""}`} />
                    <span>{loadingImport ? "جاري قراءة البيانات..." : "قراءة وتجهيز المعاينة"}</span>
                  </button>
                </div>

                {!selectedSpreadsheetId && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    يرجى اختيار أو إنشاء جدول أولاً من تبويب "المزامنة" أو "اختيار من Drive".
                  </p>
                )}
              </div>

              {/* Import Previews Table */}
              {importPreviews.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-xs text-[#172a46]">
                      معاينة المرشحين الجاهزين للاستيراد ({importPreviews.length} مرشح)
                    </h5>
                    <button
                      onClick={requestImportCandidates}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد استيراد {importPreviews.length} مرشح إلى الوكالة</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">الاسم</th>
                          <th className="p-2.5">الهاتف</th>
                          <th className="p-2.5">المهنة</th>
                          <th className="p-2.5">دولة الاستقدام</th>
                          <th className="p-2.5">رقم الجواز</th>
                          <th className="p-2.5">إجمالي الرسوم</th>
                          <th className="p-2.5">المرحلة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {importPreviews.map((p, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-2.5 font-bold text-stone-800">{p.firstName} {p.lastName}</td>
                            <td className="p-2.5 font-mono text-stone-600">{p.phone || "-"}</td>
                            <td className="p-2.5 text-stone-700">{p.job}</td>
                            <td className="p-2.5 text-stone-700">{p.country}</td>
                            <td className="p-2.5 font-mono text-stone-600">{p.passportNumber || "-"}</td>
                            <td className="p-2.5 font-bold text-stone-800">{p.totalFees}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[10px] font-bold">
                                {p.stage}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>اتصال آمن ومصرح به عبر Google Workspace OAuth2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-700 font-bold hover:bg-stone-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive / Mutating operations (Workspace Skill Mandate) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-black text-[#172a46]">{confirmDialog.title}</h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {confirmDialog.description}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-[#172a46] hover:bg-[#243e65] text-white rounded-2xl text-xs font-black shadow-xs"
              >
                تأكيد ومتابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
