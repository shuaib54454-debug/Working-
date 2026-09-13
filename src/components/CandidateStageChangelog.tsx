import React, { useState } from "react";
import {
  History,
  Clock,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ShieldCheck,
  FileText,
  Plus,
  Sparkles,
  Info,
  Filter,
  Copy,
  Check
} from "lucide-react";
import { Candidate, StageId, CandidateStageHistoryEntry } from "../types";
import { STAGES } from "../data/initialData";

interface CandidateStageChangelogProps {
  candidate: Candidate;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
}

export const CandidateStageChangelog: React.FC<CandidateStageChangelogProps> = ({
  candidate,
  onUpdate
}) => {
  const [targetStage, setTargetStage] = useState<StageId>(candidate.stage);
  const [transitionNote, setTransitionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("ALL");

  const currentStageConfig = STAGES.find(s => s.id === candidate.stage) || STAGES[0];
  const historyList = candidate.stageHistory || [];

  // Relative time helper in Arabic
  const formatRelativeTime = (timestamp?: number, isoDate?: string): string => {
    const timeMs = timestamp || (isoDate ? new Date(isoDate).getTime() : 0);
    if (!timeMs || isNaN(timeMs)) return "غير محدد";

    const diffSec = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSec < 60) return "الآن / منذ لحظات";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  };

  // Formatted date and time in Arabic
  const formatFullDateTime = (isoDate?: string, timestamp?: number): string => {
    const d = timestamp ? new Date(timestamp) : (isoDate ? new Date(isoDate) : new Date());
    if (isNaN(d.getTime())) return isoDate || "تاريخ غير محدد";

    try {
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return d.toLocaleString();
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExecuteStageChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetStage === candidate.stage) return;

    setIsSubmitting(true);

    const newEntry: CandidateStageHistoryEntry = {
      id: "STG-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
      fromStage: candidate.stage,
      toStage: targetStage,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      note: transitionNote.trim() || undefined,
      changedBy: "مدير النظام"
    };

    const updatedHistory = [newEntry, ...historyList];

    onUpdate(candidate.id, {
      stage: targetStage,
      stageHistory: updatedHistory
    });

    setActionSuccess(`تم تحديث مرحلة المرشح وتوثيق العملية في سجل التغييرات بنجاح`);
    setTransitionNote("");
    setIsSubmitting(false);

    setTimeout(() => {
      setActionSuccess(null);
    }, 4000);
  };

  // Filtered list
  const filteredHistory = historyList.filter(item => {
    if (filterStage === "ALL") return true;
    return item.toStage === filterStage || item.fromStage === filterStage;
  });

  return (
    <div id="candidate-changelog-tab" className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#c9a84c] flex items-center justify-center shrink-0">
            <History className="w-6 h-6 text-[#172a46]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-black text-[#172a46]">سجل التغييرات ومسار المراحل</h3>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-black px-2.5 py-1 rounded-xl border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                سجل شفاف وموثّق
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
              تتبع زمني دقيق لجميع التعديلات والتحولات التي طرأت على مرحلة المرشح (Stage) مع توثيق وقت وتاريخ كل تعديل ومسوغاته لضمان أعلى مستويات الشفافية والجودة الإدارية.
            </p>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="bg-stone-50 border border-stone-200 px-3 py-2 rounded-2xl text-center min-w-[90px]">
            <span className="text-[10px] text-stone-400 font-black block">إجمالي التعديلات</span>
            <span className="text-base font-black text-[#172a46] font-mono">{historyList.length}</span>
          </div>

          <div className={`px-3 py-2 rounded-2xl text-center border min-w-[110px] ${currentStageConfig.bgColor} ${currentStageConfig.textColor} border-current/20`}>
            <span className="text-[10px] opacity-75 font-black block">المرحلة الحالية</span>
            <span className="text-xs font-black truncate block">{currentStageConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Transition Execution Card */}
      <div className="bg-gradient-to-br from-stone-50 to-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200/60">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#c9a84c]" />
            <h4 className="text-sm font-black text-[#172a46]">تسجيل وتوثيق انتقال مرحلة جديد</h4>
          </div>
          <span className="text-[11px] text-stone-400 font-bold">يتم تدوين التغيير فوراً في السجل التاريخي</span>
        </div>

        <form onSubmit={handleExecuteStageChange} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Current Stage Indicator */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-black text-stone-600">المرحلة الراهنة</label>
              <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2 ${currentStageConfig.bgColor} ${currentStageConfig.textColor} border-current/20`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="truncate">{currentStageConfig.label}</span>
              </div>
            </div>

            {/* Target Stage Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-black text-stone-700">
                الانتقال إلى المرحلة الجديدة <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as StageId)}
                className="w-full bg-white border border-stone-300 focus:border-[#172a46] rounded-2xl px-3.5 py-2.5 text-xs font-black text-[#172a46] outline-none shadow-xs transition-colors"
              >
                {STAGES.map((stg) => (
                  <option key={stg.id} value={stg.id} disabled={stg.id === candidate.stage}>
                    {stg.label} {stg.id === candidate.stage ? "(الحالية)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Button */}
            <div className="md:col-span-5 flex items-end">
              <button
                type="submit"
                disabled={targetStage === candidate.stage || isSubmitting}
                className="w-full bg-[#172a46] hover:bg-[#203a60] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black px-4 py-2.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#c9a84c]" />
                <span>توثيق وتعديل المرحلة</span>
              </button>
            </div>
          </div>

          {/* Optional Transition Rationale / Note */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black text-stone-600 flex items-center justify-between">
              <span>مسوغ أو ملاحظة التغيير (اختياري للشفافية)</span>
              <span className="text-[10px] text-stone-400">مثال: تم استلام شهادة الفحص الطبي واعتماد اللياقة</span>
            </label>
            <input
              type="text"
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              placeholder="اكتب ملاحظة أو سبب تحويل المعاملة لهذه المرحلة..."
              className="w-full bg-white border border-stone-200 focus:border-[#172a46] rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-800 outline-none placeholder:text-stone-400 shadow-2xs"
            />
          </div>
        </form>
      </div>

      {/* Filter and Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-400" />
          <h4 className="text-sm font-black text-[#172a46]">التسلسل الزمني للتغييرات</h4>
          <span className="text-xs text-stone-400 font-mono font-bold">({filteredHistory.length} سجل)</span>
        </div>

        {historyList.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-700 outline-none"
            >
              <option value="ALL">جميع المراحل</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="relative">
        {/* Continuous timeline line */}
        <div className="absolute right-6 top-6 bottom-6 w-0.5 bg-stone-200 hidden sm:block pointer-events-none" />

        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, index) => {
              const fromConfig = item.fromStage ? STAGES.find(s => s.id === item.fromStage) : null;
              const toConfig = STAGES.find(s => s.id === item.toStage) || STAGES[0];

              return (
                <div
                  key={item.id || index}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-stone-200/90 relative hover:border-stone-300 transition-all sm:mr-12"
                >
                  {/* Timeline node circle on desktop */}
                  <div className="absolute -right-12 top-6 w-6 h-6 rounded-full bg-white border-4 border-[#172a46] hidden sm:flex items-center justify-center translate-x-1/2 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3 mb-3">
                    {/* Date and Relative Time */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 text-[#c9a84c] shrink-0" />
                      <span className="text-xs font-black text-[#172a46]">
                        {formatFullDateTime(item.date, item.timestamp)}
                      </span>
                      <span className="bg-stone-100 text-stone-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {formatRelativeTime(item.timestamp, item.date)}
                      </span>
                    </div>

                    {/* Meta IDs & Trace */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyId(item.id)}
                        title="نسخ رقم التوثيق"
                        className="flex items-center gap-1 font-mono text-[10px] text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-stone-400" />
                        )}
                        <span>#{item.id}</span>
                      </button>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-50 px-2 py-1 rounded-lg">
                        <User className="w-3 h-3 text-stone-400" />
                        <span>{item.changedBy || "مدير النظام"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Transition Visual Display */}
                  <div className="flex items-center gap-3 flex-wrap my-2">
                    {fromConfig ? (
                      <>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 ${fromConfig.bgColor} ${fromConfig.textColor} border-current/20`}>
                          <span className="text-[10px] opacity-75 font-normal">من:</span>
                          <span>{fromConfig.label}</span>
                        </div>

                        <div className="flex items-center text-stone-400">
                          <ArrowLeft className="w-4 h-4 text-stone-400 rtl:inline ltr:hidden" />
                          <ArrowRight className="w-4 h-4 text-stone-400 ltr:inline rtl:hidden" />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-stone-400">تحديث أولي:</span>
                    )}

                    <div className={`px-3.5 py-1.5 rounded-xl text-xs font-black border shadow-2xs flex items-center gap-1.5 ${toConfig.bgColor} ${toConfig.textColor} border-current/20`}>
                      <span className="text-[10px] opacity-75 font-normal">إلى:</span>
                      <span>{toConfig.label}</span>
                    </div>

                    {index === 0 && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-xl border border-emerald-200">
                        أحدث تعديل
                      </span>
                    )}
                  </div>

                  {/* Reason / Note Text */}
                  {item.note && (
                    <div className="mt-3 bg-stone-50 rounded-2xl p-3 border border-stone-100 flex items-start gap-2.5 text-xs text-stone-700">
                      <FileText className="w-3.5 h-3.5 text-[#c9a84c] shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-black text-[#172a46] ml-1">ملاحظة التوثيق:</span>
                        <span>{item.note}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-stone-100 shadow-xs space-y-3 sm:mr-12">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-[#172a46]">لا توجد تغييرات مرحلية مسجلة بعد</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                لم يتم تسجيل أي تعديل يدوي أو آلي على مرحلة هذا المرشح حتى الآن. يمكنك استخدام النموذج أعلاه للانتقال لمرحلة جديدة وتوثيق سبب التغيير.
              </p>
            </div>
          )}

          {/* Baseline Initial Registration Node (Always visible at the base of the audit trail) */}
          <div className="bg-gradient-to-r from-stone-50 to-white rounded-3xl p-5 shadow-xs border border-stone-200/80 relative sm:mr-12 opacity-90">
            {/* Timeline node circle */}
            <div className="absolute -right-12 top-6 w-6 h-6 rounded-full bg-[#172a46] text-white hidden sm:flex items-center justify-center translate-x-1/2 shadow-xs">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-black text-stone-700">
                  تاريخ التسجيل الأولي: {candidate.registrationDate}
                </span>
                <span className="bg-stone-200 text-stone-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  نقطة البداية
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono font-bold">معرّف المرشح: {candidate.id}</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              تم إدراج المرشح <strong>{candidate.firstName} {candidate.lastName}</strong> لأول مرة في النظام بمهنة ({candidate.job || "غير محدد"}) ووجهة ({candidate.country || "غير محدد"}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
