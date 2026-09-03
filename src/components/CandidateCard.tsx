import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Phone,
  PhoneCall,
  MessageCircle,
  MapPin,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Check,
  Edit3,
  Eye,
  SlidersHorizontal,
  MoreVertical,
  X,
  Sparkles,
  ArrowLeftRight
} from "lucide-react";
import { Candidate } from "../types";
import { STAGES, formatMoney, calculateCandidateFinance } from "../data/initialData";
import { useLanguage } from "../lib/LanguageContext";

interface CandidateCardProps {
  candidate: Candidate;
  currency: string;
  onClick: () => void;
  onEdit?: (candidateId: string) => void;
  onQuickStageChange?: (candidateId: string, newStage: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (candidateId: string, e: React.MouseEvent) => void;
}

export const CandidateCardMain: React.FC<CandidateCardProps> = ({
  candidate,
  currency,
  onClick,
  onEdit,
  onQuickStageChange,
  isSelected = false,
  onToggleSelect
}) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  const fin = calculateCandidateFinance(candidate);
  const currentStage = STAGES.find(s => s.id === candidate.stage) || STAGES[0];
  const stageLabel = (t.stages as Record<string, string>)?.[currentStage.id] || currentStage.label;

  // Swipe State
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isHorizontalScroll = useRef<boolean | null>(null);
  const hasMovedSignificantly = useRef<boolean>(false);

  // Maximum reveal width for actions
  const ACTION_DRAWER_WIDTH = 190;

  // Passport alert check (expires within 180 days)
  const isPassportExpiringSoon = candidate.passportExpiryDate
    ? new Date(candidate.passportExpiryDate).getTime() - Date.now() < 180 * 24 * 60 * 60 * 1000
    : false;

  // Touch Handlers for Mobile Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalScroll.current = null;
    hasMovedSignificantly.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Detect direction intent on first significant movement
    if (isHorizontalScroll.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalScroll.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalScroll.current) {
      hasMovedSignificantly.current = true;
      // In RTL: Swiping LEFT (negative deltaX) or RIGHT reveals actions based on alignment
      // Support intuitive swipe in both RTL and LTR
      let targetOffset = (isOpen ? (isAr ? -ACTION_DRAWER_WIDTH : ACTION_DRAWER_WIDTH) : 0) + deltaX;

      // Bound between -ACTION_DRAWER_WIDTH and 0 (or +ACTION_DRAWER_WIDTH)
      if (isAr) {
        if (targetOffset > 0) targetOffset = targetOffset * 0.2; // resistance
        if (targetOffset < -ACTION_DRAWER_WIDTH - 20) {
          targetOffset = -ACTION_DRAWER_WIDTH - (Math.abs(targetOffset + ACTION_DRAWER_WIDTH) * 0.2);
        }
      } else {
        if (targetOffset < 0) targetOffset = targetOffset * 0.2; // resistance
        if (targetOffset > ACTION_DRAWER_WIDTH + 20) {
          targetOffset = ACTION_DRAWER_WIDTH + ((targetOffset - ACTION_DRAWER_WIDTH) * 0.2);
        }
      }
      setOffsetX(targetOffset);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (!isHorizontalScroll.current && !hasMovedSignificantly.current) {
      return;
    }

    // Determine snap state
    const threshold = ACTION_DRAWER_WIDTH * 0.35;
    if (isAr) {
      if (offsetX < -threshold) {
        setOffsetX(-ACTION_DRAWER_WIDTH);
        setIsOpen(true);
      } else {
        setOffsetX(0);
        setIsOpen(false);
      }
    } else {
      if (offsetX > threshold) {
        setOffsetX(ACTION_DRAWER_WIDTH);
        setIsOpen(true);
      } else {
        setOffsetX(0);
        setIsOpen(false);
      }
    }
  };

  // Toggle quick actions on click/tap for non-touch or explicit button
  const toggleQuickActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setOffsetX(0);
      setIsOpen(false);
    } else {
      setOffsetX(isAr ? -ACTION_DRAWER_WIDTH : ACTION_DRAWER_WIDTH);
      setIsOpen(true);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasMovedSignificantly.current) {
      e.stopPropagation();
      return;
    }
    if (isOpen) {
      setOffsetX(0);
      setIsOpen(false);
      return;
    }
    onClick();
  };

  const cleanPhone = candidate.phone ? candidate.phone.replace(/[^0-9]/g, "") : "";

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow select-none group">
      {/* Background Action Drawer (Revealed on Swipe) */}
      <div
        className={`absolute inset-0 bg-[#172a46] flex items-center justify-end p-2 gap-1.5 z-0 ${
          isAr ? "flex-row-reverse" : "flex-row"
        }`}
        style={{ width: "100%" }}
      >
        {/* Call & WhatsApp Action */}
        {candidate.phone && (
          <div className="flex flex-col items-center justify-center gap-1">
            <a
              href={`tel:${candidate.phone}`}
              onClick={(e) => e.stopPropagation()}
              title="اتصال هاتفي مباشر"
              className="w-12 h-11 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 touch-manipulation"
            >
              <PhoneCall className="w-4 h-4" />
              <span className="text-[9px] font-black mt-0.5">اتصال</span>
            </a>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="محادثة واتساب"
              className="w-12 h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 touch-manipulation"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[9px] font-black mt-0.5">واتساب</span>
            </a>
          </div>
        )}

        {/* Edit Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOffsetX(0);
            setIsOpen(false);
            if (onEdit) onEdit(candidate.id);
          }}
          title="تعديل بيانات المرشح"
          className="w-12 h-[92px] bg-[#c9a84c] hover:bg-[#d8b759] active:bg-[#b08e3a] text-[#172a46] rounded-2xl flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 touch-manipulation font-black"
        >
          <Edit3 className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-extrabold mt-1">تعديل</span>
        </button>

        {/* View Profile Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOffsetX(0);
            setIsOpen(false);
            onClick();
          }}
          title="عرض الملف والتفاصيل"
          className="w-12 h-[92px] bg-stone-700 hover:bg-stone-600 active:bg-stone-800 text-white rounded-2xl flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 touch-manipulation font-black"
        >
          <Eye className="w-5 h-5" />
          <span className="text-[10px] font-extrabold mt-1">عرض</span>
        </button>
      </div>

      {/* Foreground Interactive Card (Slides with Gesture) */}
      <div
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)"
        }}
        className={`bg-white rounded-3xl p-4 sm:p-5 border relative z-10 cursor-pointer transition-all active:bg-stone-50/80 touch-pan-y ${
          isSelected
            ? "border-[#c9a84c] ring-2 ring-[#c9a84c]/30 bg-amber-50/15 shadow-sm"
            : "border-stone-200/80 hover:border-[#c9a84c]/50 shadow-2xs"
        }`}
      >
        {/* Swipe Handle, Checkbox & Quick Toggle Pill */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            {/* Multi-select Checkbox with large touch target */}
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(candidate.id, e);
                }}
                title={isSelected ? (isAr ? "إلغاء التحديد" : "Deselect") : (isAr ? "تحديد المرشح للعمليات الجماعية" : "Select candidate for bulk actions")}
                className={`min-w-[32px] min-h-[32px] w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 touch-manipulation shrink-0 ${
                  isSelected
                    ? "bg-[#172a46] text-[#c9a84c] shadow-xs border-2 border-[#172a46] ring-2 ring-[#c9a84c]/30"
                    : "bg-stone-50 hover:bg-stone-100 text-transparent border-2 border-stone-300 hover:border-stone-400"
                }`}
                aria-label={isSelected ? "محدد" : "غير محدد"}
              >
                <Check className={`w-4 h-4 stroke-[3] transition-transform ${isSelected ? "scale-100 opacity-100 text-[#c9a84c]" : "scale-75 opacity-0 text-transparent"}`} />
              </button>
            )}

            <span className="text-[11px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 font-mono">
              {candidate.id}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:inline-flex items-center gap-1 font-medium">
              <ArrowLeftRight className="w-2.5 h-2.5 text-[#c9a84c]" />
              {isAr ? "اسحب للإجراءات السريعة" : "Swipe for actions"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Stage Badge with quick touch feedback */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs ${currentStage.bgColor} ${currentStage.textColor} border border-current/20 flex items-center gap-1 shrink-0`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentStage.color}`} />
              {stageLabel}
            </span>

            {/* Quick Action Toggle Button (Touch Friendly) */}
            <button
              type="button"
              onClick={toggleQuickActions}
              title={isOpen ? "إغلاق الإجراءات" : "خيارات سريعة (اتصال، تعديل، عرض)"}
              className={`min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 touch-manipulation ${
                isOpen
                  ? "bg-[#172a46] text-[#c9a84c] shadow-xs rotate-90"
                  : "bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-600"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Name, Job & Avatar Row (Large Touch Area) */}
        <div className="flex items-start gap-3 mb-2.5">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-[#172a46] font-extrabold flex items-center justify-center text-base border border-stone-100 group-hover:bg-[#172a46] group-hover:text-white transition-colors shrink-0 shadow-2xs overflow-hidden">
            {candidate.photoUrl ? (
              <img src={candidate.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              candidate.firstName.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-base text-[#172a46] group-hover:text-[#c9a84c] transition-colors truncate">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-[#c9a84c] shrink-0" />
                <span className="truncate">{candidate.job || (isAr ? "مهنة غير محددة" : "Unspecified job")}</span>
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{candidate.country || (isAr ? "الوجهة غير محددة" : "Unspecified")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Passport Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 my-1.5 border-y border-stone-100 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span dir="ltr" className="font-mono text-[11px] font-bold">
              {candidate.phone || (isAr ? "بدون هاتف" : "No phone")}
            </span>
            {candidate.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${candidate.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  title="اتصال هاتفي مباشر"
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs touch-manipulation"
                >
                  <PhoneCall className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="محادثة واتساب"
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs touch-manipulation"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>{candidate.registrationDate}</span>
          </div>

          {candidate.passportNumber && (
            <div className={`flex items-center gap-1.5 ${isPassportExpiringSoon ? "text-amber-700 font-bold" : "text-stone-600"}`}>
              {isPassportExpiringSoon ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <FileCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              )}
              <span className="text-[11px] font-mono">{candidate.passportNumber}</span>
            </div>
          )}

          {candidate.cocNumber && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
              <span className="text-[#c9a84c]">COC:</span>
              <span className="font-mono">{candidate.cocNumber}</span>
            </div>
          )}
        </div>

        {/* Financial Status & Details Arrow */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1.5">
          {/* Payment bar */}
          <div className="flex-1">
            <div className="flex justify-between items-center text-[11px] mb-1.5">
              <span className="text-stone-400 font-medium">
                {t.collectedRevenue}: <strong className="text-emerald-700 font-bold">{formatMoney(fin.paid, currency)}</strong>
              </span>
              <span className="text-stone-400 font-medium">
                {fin.outstanding > 0 ? (
                  <span className="text-rose-600 font-bold">
                    {isAr ? "متبقي" : "Balance"}: {formatMoney(fin.outstanding, currency)}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {isAr ? "مسدد بالكامل" : "Fully paid"}
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  fin.paymentProgress >= 100
                    ? "bg-emerald-500"
                    : fin.paymentProgress > 50
                    ? "bg-[#c9a84c]"
                    : "bg-blue-500"
                }`}
                style={{ width: `${fin.paymentProgress}%` }}
              />
            </div>
          </div>

          {/* View Profile Action button */}
          <div className="min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-50 group-hover:bg-[#172a46] group-hover:text-white flex items-center gap-1.5 text-xs font-bold text-[#172a46] transition-all active:scale-95 touch-manipulation self-end sm:self-center">
            <span>{isAr ? "التفاصيل" : "Details"}</span>
            <ArrowIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CandidateCardSmall: React.FC<{
  candidate: Candidate;
  currency: string;
  onClick: () => void;
  onEdit?: (candidateId: string) => void;
}> = ({ candidate, currency, onClick, onEdit }) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  const fin = calculateCandidateFinance(candidate);
  const currentStage = STAGES.find(s => s.id === candidate.stage) || STAGES[0];
  const stageLabel = (t.stages as Record<string, string>)?.[currentStage.id] || currentStage.label;

  return (
    <div
      onClick={onClick}
      className="bg-white p-3.5 rounded-2xl border border-stone-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] touch-manipulation"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#172a46] font-extrabold flex items-center justify-center text-sm border border-stone-100 group-hover:bg-[#172a46] group-hover:text-white transition-colors shrink-0">
          {candidate.firstName.charAt(0)}
        </div>
        <div className="min-w-0">
          <h4 className="font-extrabold text-sm text-[#172a46] group-hover:text-[#c9a84c] transition-colors truncate">
            {candidate.firstName} {candidate.lastName}
          </h4>
          <p className="text-xs text-stone-400 flex items-center gap-1.5 truncate">
            <span>{candidate.job || (isAr ? "مهنة غير محددة" : "Unspecified job")}</span>
            <span>•</span>
            <span>{candidate.country}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={isAr ? "text-left" : "text-right"}>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${currentStage.bgColor} ${currentStage.textColor} border border-current/20 inline-block`}>
            {stageLabel}
          </span>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {fin.outstanding > 0 ? (
              <span className="text-rose-600 font-bold">{isAr ? "باقي" : "Balance"}: {formatMoney(fin.outstanding, currency)}</span>
            ) : (
              <span className="text-emerald-600 font-bold">{isAr ? "خالص" : "Paid"}</span>
            )}
          </div>
        </div>
        <ArrowIcon className="w-4 h-4 text-stone-300 group-hover:text-[#c9a84c] transition-transform" />
      </div>
    </div>
  );
};
