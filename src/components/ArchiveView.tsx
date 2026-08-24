import React, { useState } from "react";
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Users,
  Briefcase,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Info
} from "lucide-react";
import { Candidate, AgencySettings } from "../types";
import { formatMoney } from "../data/initialData";
import { useLanguage } from "../lib/LanguageContext";

interface ArchiveViewProps {
  candidates: Candidate[];
  settings: AgencySettings;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  candidates,
  settings,
  onRestore,
  onPermanentDelete
}) => {
  const { t, isAr } = useLanguage();
  const [search, setSearch] = useState("");
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const archivedCandidates = candidates.filter(c => c.archived);

  const filtered = archivedCandidates.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.firstName + " " + c.lastName).toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      (c.job || "").toLowerCase().includes(term) ||
      (c.phone || "").toLowerCase().includes(term) ||
      (c.passportNumber || "").toLowerCase().includes(term)
    );
  });

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleConfirmDelete = () => {
    if (!candidateToDelete) return;
    const name = `${candidateToDelete.firstName} ${candidateToDelete.lastName}`;
    onPermanentDelete(candidateToDelete.id);
    setCandidateToDelete(null);
    showToast(isAr ? `تم حذف ملف ${name} نهائياً بنجاح.` : `File for ${name} permanently deleted.`);
  };

  const handleRestoreCandidate = (cand: Candidate) => {
    onRestore(cand.id);
    showToast(isAr ? `تمت استعادة ملف ${cand.firstName} ${cand.lastName} إلى القائمة الرئيسية بنجاح.` : `Restored ${cand.firstName} ${cand.lastName} to main list.`);
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#172a46] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#c9a84c]/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-full mx-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#172a46] flex items-center gap-2">
            <Archive className="w-6 h-6 text-[#c9a84c]" />
            <span>{isAr ? "أرشيف المرشحين والمعاملات" : "Candidates Archive"}</span>
            <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              {archivedCandidates.length} {isAr ? "ملف مؤرشف" : "archived"}
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {isAr
              ? "الملفات المؤرشفة أو المكتملة أو الملغية. يمكنك استعادتها للقائمة الرئيسية أو حذفها نهائياً من قاعدة البيانات."
              : "Archived or completed records. You can restore them to active list or permanently delete them."}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs">
        <div className="relative">
          <Search className="absolute right-3.5 top-3.5 text-stone-400 w-4 h-4" />
          <input
            type="text"
            className="w-full pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
            placeholder={isAr ? "ابحث في الأرشيف بالاسم، رقم الهوية، الجواز، أو المهنة..." : "Search archive by name, ID, passport, or job..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List of Archived Candidates */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map(cand => (
            <div
              key={cand.id}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-[#c9a84c]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-[#172a46] font-black flex items-center justify-center text-sm border border-stone-200 shrink-0">
                  {cand.firstName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#172a46]">
                      {cand.firstName} {cand.lastName}
                    </h3>
                    <span className="text-[10px] font-bold text-stone-500 font-mono bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                      {cand.id}
                    </span>
                    {cand.passportNumber && (
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                        {cand.passportNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-[#c9a84c]" />
                      <span>{cand.job || (isAr ? "مهنة غير محددة" : "Unspecified")}</span>
                    </span>
                    <span>•</span>
                    <span>{cand.country || (isAr ? "الوجهة غير محددة" : "Unspecified")}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{cand.registrationDate}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleRestoreCandidate(cand)}
                  className="px-4 py-2 bg-[#172a46] text-white hover:bg-[#243e65] active:scale-95 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>{isAr ? "استعادة للقائمة" : "Restore"}</span>
                </button>

                <button
                  onClick={() => setCandidateToDelete(cand)}
                  className="px-3.5 py-2 text-rose-600 hover:text-white hover:bg-rose-600 active:scale-95 rounded-2xl transition-all border border-rose-200 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  title={isAr ? "حذف نهائي من النظام" : "Delete permanently"}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isAr ? "حذف نهائي" : "Delete"}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-full bg-stone-50 text-stone-300 flex items-center justify-center mx-auto border border-stone-200">
              <Archive className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-stone-700">
              {search ? (isAr ? "لم يتم العثور على نتائج للبحث" : "No matching records found") : (isAr ? "الأرشيف فارغ حالياً" : "Archive is currently empty")}
            </h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {search
                ? (isAr ? "جرب البحث بكلمات أخرى أو امسح شريط البحث لعرض كل المؤرشفين." : "Try adjusting your search keywords.")
                : (isAr ? "أي ملف مرشح تقوم بأرشفته من شاشة الملف الشخصي سيظهر هنا لإمكانية استرجاعه أو حذفه نهائياً." : "Any archived candidate will appear here for restoration or permanent deletion.")}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Permanent Deletion */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-rose-50 p-6 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-rose-950">
                  {isAr ? "تأكيد الحذف النهائي" : "Confirm Permanent Deletion"}
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  {isAr
                    ? "هل أنت متأكد من حذف هذا الملف نهائياً من قاعدة البيانات؟"
                    : "Are you sure you want to permanently delete this candidate record?"}
                </p>
              </div>
              <button
                onClick={() => setCandidateToDelete(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Summary Card */}
            <div className="p-6 space-y-4">
              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-400">{isAr ? "اسم المرشح:" : "Candidate Name:"}</span>
                  <strong className="text-[#172a46] font-bold">
                    {candidateToDelete.firstName} {candidateToDelete.lastName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">{isAr ? "رقم الملف:" : "Candidate ID:"}</span>
                  <span className="font-mono font-bold text-stone-700">{candidateToDelete.id}</span>
                </div>
                {candidateToDelete.passportNumber && (
                  <div className="flex justify-between">
                    <span className="text-stone-400">{isAr ? "رقم الجواز:" : "Passport No:"}</span>
                    <span className="font-mono text-stone-700">{candidateToDelete.passportNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-400">{isAr ? "المهنة / الوجهة:" : "Job / Country:"}</span>
                  <span className="text-stone-700">{candidateToDelete.job} • {candidateToDelete.country}</span>
                </div>
              </div>

              <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/60 flex items-start gap-2 text-[11px] text-rose-800 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  {isAr
                    ? "تنبيه: سيتم مسح هذا الملف وسجل مدفوعاته ومصروفاته نهائياً من الذاكرة المحلية وقاعدة بيانات Firebase ولن يمكن استرجاعه."
                    : "Warning: This record and all its associated payments and expenses will be permanently wiped from the database."}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isAr ? "نعم، احذف نهائياً" : "Yes, Delete Permanently"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCandidateToDelete(null)}
                  className="py-3 px-5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-colors"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
