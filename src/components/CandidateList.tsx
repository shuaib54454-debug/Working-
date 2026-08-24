import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  UserCheck,
  Plane,
  FileCheck,
  Building2,
  Users,
  Briefcase,
  MapPin,
  X,
  SlidersHorizontal,
  Download,
  Printer,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Check,
  Archive,
  ArrowRightLeft,
  Trash2,
  Sparkles,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  Layers
} from "lucide-react";
import { Candidate, AgencySettings, StageId } from "../types";
import { STAGES, formatMoney, calculateCandidateFinance } from "../data/initialData";
import { CandidateCardMain } from "./CandidateCard";
import { exportCandidatesToCSV } from "../lib/exportUtils";
import { useLanguage } from "../lib/LanguageContext";

interface CandidateListProps {
  candidates: Candidate[];
  settings: AgencySettings;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
  onEditCandidate?: (id: string) => void;
  onQuickStageChange?: (candidateId: string, newStage: StageId) => void;
  onOpenExportModal?: () => void;
  onBulkArchive?: (ids: string[]) => void;
  onBulkStageChange?: (ids: string[], newStage: StageId) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  settings,
  onSelectCandidate,
  onAddCandidate,
  onEditCandidate,
  onQuickStageChange,
  onOpenExportModal,
  onBulkArchive,
  onBulkStageChange,
  onBulkDelete
}) => {
  const { t, isAr } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "fees-high" | "outstanding-high" | "name">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStageChangeModal, setShowStageChangeModal] = useState(false);
  const [targetStage, setTargetStage] = useState<StageId>("applied");
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Extract unique countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.country && !c.archived) set.add(c.country);
    });
    return Array.from(set);
  }, [candidates]);

  // Filtered & Sorted Candidates
  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return candidates
      .filter(c => !c.archived)
      .filter(c => {
        // Search query
        if (term) {
          const matchName = `${c.firstName} ${c.lastName}`.toLowerCase().includes(term);
          const matchId = (c.id || "").toLowerCase().includes(term);
          const matchPhone = (c.phone || "").toLowerCase().includes(term);
          const matchJob = (c.job || "").toLowerCase().includes(term);
          const matchPassport = (c.passportNumber || "").toLowerCase().includes(term);
          const matchCountry = (c.country || "").toLowerCase().includes(term);
          if (!matchName && !matchId && !matchPhone && !matchJob && !matchPassport && !matchCountry) {
            return false;
          }
        }

        // Stage filter
        if (selectedStage !== "ALL" && c.stage !== selectedStage) {
          return false;
        }

        // Gender filter
        if (selectedGender !== "ALL" && c.gender !== selectedGender) {
          return false;
        }

        // Country filter
        if (selectedCountry !== "ALL" && c.country !== selectedCountry) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.registrationDate || 0).getTime() - new Date(a.registrationDate || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.registrationDate || 0).getTime() - new Date(b.registrationDate || 0).getTime();
        }
        if (sortBy === "fees-high") {
          return (b.totalFees || 0) - (a.totalFees || 0);
        }
        if (sortBy === "outstanding-high") {
          const finA = calculateCandidateFinance(a);
          const finB = calculateCandidateFinance(b);
          return finB.outstanding - finA.outstanding;
        }
        if (sortBy === "name") {
          return a.firstName.localeCompare(b.firstName, isAr ? "ar" : "en");
        }
        return 0;
      });
  }, [candidates, search, selectedStage, selectedGender, selectedCountry, sortBy, isAr]);

  // Selection Checkers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredCandidates.length === 0) return false;
    return filteredCandidates.every(c => selectedIds.includes(c.id));
  }, [filteredCandidates, selectedIds]);

  const selectedCount = selectedIds.length;

  const toggleSelectCandidate = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredCandidates.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredCandidates.map(c => c.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk action handlers
  const handleExecuteBulkArchive = () => {
    if (selectedIds.length === 0) return;
    if (onBulkArchive) {
      onBulkArchive(selectedIds);
    }
    showNotification(
      isAr
        ? `تمت أرشفة (${selectedCount}) من المرشحين بنجاح`
        : `Successfully archived (${selectedCount}) candidates`
    );
    clearSelection();
    setShowArchiveConfirmModal(false);
  };

  const handleExecuteBulkStageChange = () => {
    if (selectedIds.length === 0) return;
    if (onBulkStageChange) {
      onBulkStageChange(selectedIds, targetStage);
    }
    const targetStageObj = STAGES.find(s => s.id === targetStage);
    const stageName = (t.stages as Record<string, string>)?.[targetStage] || targetStageObj?.label || targetStage;
    showNotification(
      isAr
        ? `تم تحويل (${selectedCount}) مرشحين إلى مرحلة: ${stageName}`
        : `Updated stage to "${stageName}" for (${selectedCount}) candidates`
    );
    clearSelection();
    setShowStageChangeModal(false);
  };

  const handleExportSelected = () => {
    const selectedList = candidates.filter(c => selectedIds.includes(c.id));
    if (selectedList.length === 0) return;
    exportCandidatesToCSV(selectedList, settings);
    showNotification(
      isAr
        ? `تم تصدير (${selectedList.length}) مرشحاً إلى ملف CSV بنجاح`
        : `Exported (${selectedList.length}) selected candidates to CSV`
    );
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (onBulkDelete) {
      onBulkDelete(selectedIds);
    }
    showNotification(
      isAr
        ? `تم حذف (${selectedCount}) من المرشحين نهائياً`
        : `Permanently deleted (${selectedCount}) candidates`
    );
    clearSelection();
    setShowDeleteConfirmModal(false);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedStage("ALL");
    setSelectedGender("ALL");
    setSelectedCountry("ALL");
    setSortBy("newest");
  };

  const hasActiveFilter = search || selectedStage !== "ALL" || selectedGender !== "ALL" || selectedCountry !== "ALL" || sortBy !== "newest";

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300 relative">
      {/* Toast Notification Banner */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-[#172a46] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#c9a84c] flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#c9a84c] shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{successToast}</span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#172a46] flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#c9a84c] shrink-0" />
            <span>{t.candidateListTitle}</span>
            <span className="text-xs sm:text-sm font-black text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200/60 shadow-2xs">
              {filteredCandidates.length} {isAr ? "مرشح" : "candidates"}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1.5 leading-relaxed">
            {isAr
              ? "إدارة بيانات المتقدمين ومتابعة مسار التوظيف والمدفوعات والمستندات والعمليات الجماعية"
              : "Manage applicant records, recruitment stages, payments, documents, and bulk actions"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              if (onOpenExportModal) {
                onOpenExportModal();
              } else {
                exportCandidatesToCSV(candidates, settings, selectedStage);
              }
            }}
            title={isAr ? "تصدير السجل إلى Excel أو طباعة تقرير PDF" : "Export to Excel / Print PDF"}
            className="flex-1 sm:flex-initial min-h-[44px] bg-white hover:bg-stone-50 active:bg-stone-100 text-[#172a46] border border-stone-200 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation"
          >
            <Download className="w-4 h-4 text-[#c9a84c] shrink-0" />
            <span className="whitespace-nowrap">{isAr ? "تصدير / طباعة (CSV • PDF)" : "Export / Print (CSV • PDF)"}</span>
          </button>

          <button
            onClick={onAddCandidate}
            className="flex-1 sm:flex-initial min-h-[44px] bg-[#c9a84c] hover:bg-[#d8b759] active:bg-[#b89539] text-[#172a46] px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span className="whitespace-nowrap">{t.addCandidate}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filter Toggle */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none`} />
            <input
              type="text"
              className={`w-full min-h-[46px] ${isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:bg-white focus:border-[#c9a84c] transition-all`}
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`absolute ${isAr ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 active:scale-90 rounded-xl transition-all touch-manipulation`}
                aria-label="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`min-h-[46px] min-w-[46px] px-3.5 sm:px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96] touch-manipulation ${
              showAdvancedFilters || hasActiveFilter
                ? "bg-[#172a46] text-white border-[#172a46] shadow-xs"
                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 active:bg-stone-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.filter}</span>
            {hasActiveFilter && (
              <span className="w-2 h-2 rounded-full bg-[#c9a84c] sm:hidden" />
            )}
          </button>
        </div>

        {/* Stage Filter Chips (Scrollable horizontal bar with touch enhancement) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x">
          <button
            type="button"
            onClick={() => setSelectedStage("ALL")}
            className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 touch-manipulation flex items-center gap-1.5 ${
              selectedStage === "ALL"
                ? "bg-[#172a46] text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 active:bg-stone-300"
            }`}
          >
            <span>{t.allStages}</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              selectedStage === "ALL" ? "bg-white/20 text-white" : "bg-white text-stone-700 shadow-2xs"
            }`}>
              {candidates.filter(c => !c.archived).length}
            </span>
          </button>
          {STAGES.map(s => {
            const count = candidates.filter(c => !c.archived && c.stage === s.id).length;
            const isSelected = selectedStage === s.id;
            const stageLabel = (t.stages as Record<string, string>)?.[s.id] || s.label;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setSelectedStage(s.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 touch-manipulation flex items-center gap-2 border ${
                  isSelected
                    ? `${s.color} text-white shadow-xs border-transparent`
                    : `${s.bgColor} ${s.textColor} border-stone-200/60 hover:opacity-90 active:brightness-90`
                }`}
              >
                <span>{stageLabel}</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-black/25 text-white' : 'bg-white/90 shadow-2xs'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">{t.gender}</label>
              <select
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c] transition-all"
              >
                <option value="ALL">{t.allGenders}</option>
                <option value="female">{t.female}</option>
                <option value="male">{t.male}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">{t.destinationCountry}</label>
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c] transition-all"
              >
                <option value="ALL">{t.allDestinations}</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">{t.sortBy}</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c] transition-all"
              >
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
                <option value="outstanding-high">{t.highestOutstanding}</option>
                <option value="fees-high">{t.highestFees}</option>
                <option value="name">{t.nameAlphabetical}</option>
              </select>
            </div>

            {hasActiveFilter && (
              <div className="sm:col-span-3 flex justify-end pt-1">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl font-bold flex items-center gap-1.5 transition-colors active:scale-95 touch-manipulation"
                >
                  <X className="w-4 h-4" />
                  <span>{isAr ? "إعادة ضبط جميع الفلاتر" : "Reset all filters"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Touch Swipe Tip Banner (Mobile Friendly) */}
      {showSwipeHint && filteredCandidates.length > 0 && (
        <div className="bg-[#172a46]/5 border border-[#c9a84c]/30 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-[#172a46] shadow-2xs">
          <div className="flex items-center gap-2.5 font-bold leading-relaxed">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c9a84c] shrink-0 animate-ping" />
            <span>
              {isAr
                ? "💡 ميزة التحديد واللمس: يمكنك تحديد المرشحين عبر المربعات لتطبيق الإجراءات الجماعية (أرشفة • تغيير مرحلة • تصدير)، أو السحب للخيارات السريعة"
                : "💡 Selection & Touch: Use checkboxes on cards for bulk actions (Archive • Change Stage • Export), or swipe for quick actions"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSwipeHint(false)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-700 active:bg-stone-200/60 rounded-xl transition-all active:scale-90 touch-manipulation shrink-0"
            title="إخفاء"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-Selection Control Bar */}
      {filteredCandidates.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#172a46] hover:text-[#c9a84c] transition-colors active:scale-95 touch-manipulation"
            >
              <div
                className={`min-w-[26px] min-h-[26px] w-6.5 h-6.5 rounded-lg flex items-center justify-center border-2 transition-all ${
                  isAllFilteredSelected
                    ? "bg-[#172a46] border-[#172a46] text-[#c9a84c]"
                    : selectedCount > 0
                    ? "bg-[#172a46]/20 border-[#172a46] text-[#172a46]"
                    : "border-stone-300 bg-stone-50"
                }`}
              >
                {isAllFilteredSelected ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : selectedCount > 0 ? (
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#172a46]" />
                ) : null}
              </div>
              <span>
                {isAllFilteredSelected
                  ? (isAr ? "إلغاء تحديد المعروض" : "Deselect Visible")
                  : (isAr ? `تحديد كل المعروض (${filteredCandidates.length})` : `Select All Visible (${filteredCandidates.length})`)}
              </span>
            </button>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">
                {isAr ? `تم تحديد (${selectedCount}) مرشح` : `(${selectedCount}) selected`}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                {isAr ? "إلغاء التحديد" : "Clear"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Candidate Cards Grid */}
      {filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredCandidates.map(candidate => (
            <CandidateCardMain
              key={candidate.id}
              candidate={candidate}
              currency={settings.currency}
              onClick={() => onSelectCandidate(candidate.id)}
              onEdit={onEditCandidate}
              onQuickStageChange={onQuickStageChange}
              isSelected={selectedIds.includes(candidate.id)}
              onToggleSelect={toggleSelectCandidate}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-stone-50 text-stone-400 rounded-full flex items-center justify-center mx-auto border border-stone-100">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base sm:text-lg text-[#172a46]">{t.noCandidatesFound}</h3>
          <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
            {isAr
              ? "جرب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض كافة المرشحين المسجلين."
              : "Try adjusting search terms or resetting filters to see registered candidates."}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 text-xs sm:text-sm font-bold rounded-2xl transition-all active:scale-95 touch-manipulation"
            >
              <X className="w-4 h-4" />
              <span>{isAr ? "إلغاء الفلاتر" : "Clear filters"}</span>
            </button>
          )}
        </div>
      )}

      {/* 🌟 STICKY BULK ACTIONS TOOLBAR (Floating at bottom when items are selected) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-2xl z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#172a46] text-white p-2.5 sm:p-3.5 rounded-3xl shadow-2xl border-2 border-[#c9a84c]/70 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3">
            {/* Selection Counter & Clear */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="min-w-[32px] min-h-[32px] px-2.5 py-1 bg-[#c9a84c] text-[#172a46] font-black rounded-xl text-xs sm:text-sm flex items-center justify-center shadow-xs font-mono">
                {selectedCount}
              </span>
              <span className="text-xs font-bold text-stone-200 hidden sm:inline">
                {isAr ? "مرشح محدد" : "Selected"}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                title={isAr ? "إلغاء التحديد" : "Deselect All"}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-stone-300 hover:text-white flex items-center justify-center transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {/* 1. Change Stage */}
              <button
                type="button"
                onClick={() => setShowStageChangeModal(true)}
                title={isAr ? "تغيير المرحلة الإجرائية للمحددين" : "Change Stage for Selected"}
                className="min-h-[40px] px-3 sm:px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-300 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation whitespace-nowrap"
              >
                <ArrowRightLeft className="w-4 h-4 shrink-0 text-[#c9a84c]" />
                <span>{isAr ? "تغيير المرحلة" : "Change Stage"}</span>
              </button>

              {/* 2. Archive Selected */}
              <button
                type="button"
                onClick={() => setShowArchiveConfirmModal(true)}
                title={isAr ? "أرشفة المرشحين المحددين" : "Archive Selected"}
                className="min-h-[40px] px-3 sm:px-4 py-2 rounded-2xl bg-stone-700/80 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation whitespace-nowrap"
              >
                <Archive className="w-4 h-4 shrink-0 text-stone-300" />
                <span>{isAr ? "أرشفة" : "Archive"}</span>
              </button>

              {/* 3. Export CSV */}
              <button
                type="button"
                onClick={handleExportSelected}
                title={isAr ? "تصدير بيانات المحددين إلى Excel / CSV" : "Export Selected to CSV"}
                className="min-h-[40px] px-3 sm:px-4 py-2 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 active:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="hidden sm:inline">{isAr ? "تصدير CSV" : "Export"}</span>
              </button>

              {/* 4. Delete (Optional confirmation) */}
              {onBulkDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  title={isAr ? "حذف نهائي للمحددين" : "Delete Selected"}
                  className="min-h-[40px] p-2 sm:px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 border border-rose-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation"
                >
                  <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔄 MODAL: BULK CHANGE STAGE */}
      {showStageChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#c9a84c]/20 text-[#c9a84c] flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#172a46]">
                    {isAr ? "تغيير المرحلة للمرشحين المحددين" : "Change Stage for Selected"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? `سيتم تطبيق المرحلة الجديدة على (${selectedCount}) من المرشحين دفعة واحدة`
                      : `Will apply the selected stage to (${selectedCount}) candidates at once`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStageChangeModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stages Grid Picker */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {STAGES.map(stage => {
                const isTarget = targetStage === stage.id;
                const stageLabel = (t.stages as Record<string, string>)?.[stage.id] || stage.label;
                return (
                  <button
                    type="button"
                    key={stage.id}
                    onClick={() => setTargetStage(stage.id as StageId)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-right transition-all active:scale-[0.98] ${
                      isTarget
                        ? "border-[#c9a84c] bg-amber-50/50 shadow-xs ring-2 ring-[#c9a84c]/30"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-full ${stage.color} shrink-0`} />
                      <span className="text-xs sm:text-sm font-black text-[#172a46]">{stageLabel}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isTarget
                          ? "border-[#c9a84c] bg-[#172a46] text-[#c9a84c]"
                          : "border-stone-300 bg-white"
                      }`}
                    >
                      {isTarget && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStageChangeModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-colors"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkStageChange}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#c9a84c] hover:bg-[#d8b759] active:bg-[#b89539] text-[#172a46] font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isAr ? `تحديث (${selectedCount}) مرشحين` : `Update (${selectedCount})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 MODAL: BULK ARCHIVE CONFIRMATION */}
      {showArchiveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#172a46]">
                  {isAr ? "تأكيد أرشفة المرشحين المحددين" : "Confirm Bulk Archive"}
                </h3>
                <p className="text-xs text-stone-500">
                  {isAr
                    ? `هل أنت متأكد من نقل (${selectedCount}) من المرشحين إلى قسم الأرشيف؟ يمكن استعادتهم لاحقاً.`
                    : `Are you sure you want to move (${selectedCount}) candidates to archive? They can be restored later.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-colors"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkArchive}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-900 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Archive className="w-4 h-4" />
                <span>{isAr ? `أرشفة (${selectedCount})` : `Archive (${selectedCount})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL: BULK DELETE CONFIRMATION */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-rose-900">
                  {isAr ? "تأكيد الحذف النهائي" : "Confirm Permanent Deletion"}
                </h3>
                <p className="text-xs text-rose-700">
                  {isAr
                    ? `تحذير: سيتم حذف (${selectedCount}) من المرشحين بشكل نهائي من السجلات وقاعدة البيانات. لا يمكن التراجع عن هذه الخطوة!`
                    : `Warning: (${selectedCount}) candidates will be permanently removed. This action cannot be undone!`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-colors"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isAr ? `حذف نهائي (${selectedCount})` : `Delete (${selectedCount})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

