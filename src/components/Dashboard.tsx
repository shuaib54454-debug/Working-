import React from "react";
import {
  Users,
  Activity,
  Plane,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Building2,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  FileSpreadsheet,
  BadgeAlert,
  Search,
  Sparkles,
  Download,
  Scan
} from "lucide-react";
import { Candidate, AgencySettings, GeneralExpense, StageId } from "../types";
import { STAGES, formatMoney, calculateCandidateFinance } from "../data/initialData";
import { CandidateCardSmall } from "./CandidateCard";
import { MonthlyRevenueChart } from "./MonthlyRevenueChart";
import { useLanguage } from "../lib/LanguageContext";

interface DashboardProps {
  candidates: Candidate[];
  generalExpenses: GeneralExpense[];
  settings: AgencySettings;
  onNavigate: (view: any) => void;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
  onOpenGeneralExpenseModal: () => void;
  onOpenExportModal?: () => void;
  onOpenPassportScanner?: () => void;
  onOpenGoogleSheetsModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  candidates,
  generalExpenses,
  settings,
  onNavigate,
  onSelectCandidate,
  onAddCandidate,
  onOpenGeneralExpenseModal,
  onOpenExportModal,
  onOpenPassportScanner,
  onOpenGoogleSheetsModal
}) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  const activeCandidates = candidates.filter(c => !c.archived);

  // Financial calculations
  let totalFees = 0;
  let totalAgencyLiabilities = 0;
  let totalPaid = 0;
  let candidateExpenses = 0;

  activeCandidates.forEach(c => {
    const fin = calculateCandidateFinance(c);
    totalFees += fin.fees;
    totalAgencyLiabilities += fin.agencyLiability;
    totalPaid += fin.paid;
    candidateExpenses += fin.exp;
  });

  const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalAllExpenses = candidateExpenses + totalGeneralExpenses;
  const totalOutstanding = Math.max(0, totalFees - totalPaid);
  const netExpectedProfit = totalFees - totalAgencyLiabilities - totalAllExpenses;
  const currentRealizedProfit = totalPaid - totalAllExpenses;

  // Counts by stage categories
  const inProcessCount = activeCandidates.filter(c => 
    !["TRAVELLED", "COMPLETED", "CANCELLED"].includes(c.stage)
  ).length;

  const readyCount = activeCandidates.filter(c => c.stage === "READY").length;
  const travelledCount = activeCandidates.filter(c => c.stage === "TRAVELLED").length;
  const completedCount = activeCandidates.filter(c => c.stage === "COMPLETED").length;

  // Smart Alerts
  const alerts: Array<{ type: "danger" | "warning" | "info"; text: string; candId?: string }> = [];

  activeCandidates.forEach(c => {
    const fin = calculateCandidateFinance(c);
    // Passport expiring within 180 days
    if (c.passportExpiryDate) {
      const expDate = new Date(c.passportExpiryDate).getTime();
      const now = Date.now();
      const daysLeft = Math.round((expDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        alerts.push({
          type: "danger",
          text: isAr
            ? `جواز سفر ${c.firstName} ${c.lastName} منتهي الصلاحية (${c.passportExpiryDate})!`
            : `Passport of ${c.firstName} ${c.lastName} is expired (${c.passportExpiryDate})!`,
          candId: c.id
        });
      } else if (daysLeft < 180) {
        alerts.push({
          type: "warning",
          text: isAr
            ? `جواز سفر ${c.firstName} ${c.lastName} ينتهي خلال ${daysLeft} يوماً (${c.passportExpiryDate})`
            : `Passport of ${c.firstName} ${c.lastName} expires in ${daysLeft} days (${c.passportExpiryDate})`,
          candId: c.id
        });
      }
    }

    // Ready for flight but has unpaid balance
    if (c.stage === "READY" && fin.outstanding > 0) {
      alerts.push({
        type: "warning",
        text: isAr
          ? `${c.firstName} ${c.lastName} في مرحلة (جاهز للسفر) ولديه مستحقات متبقية (${formatMoney(fin.outstanding, settings.currency)})`
          : `${c.firstName} ${c.lastName} is ready to travel with outstanding balance (${formatMoney(fin.outstanding, settings.currency)})`,
        candId: c.id
      });
    }

    // Medical result pending
    if (c.stage === "MEDICAL" && (!c.medicalStatus || c.medicalStatus.includes("بانتظار") || c.medicalStatus.includes("Pending"))) {
      alerts.push({
        type: "info",
        text: isAr
          ? `فحص طبي معلق للمرشح ${c.firstName} ${c.lastName}`
          : `Medical check pending for ${c.firstName} ${c.lastName}`,
        candId: c.id
      });
    }
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Agency Hero Welcome & Quick Stats */}
      <div className="bg-[#172a46] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-[#c9a84c]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="inline-block px-3 py-1 bg-[#c9a84c]/20 text-[#c9a84c] text-xs font-black rounded-full border border-[#c9a84c]/30 mb-2">
                {t.dashboard}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">{settings.agencyName}</h2>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                {isAr
                  ? "نظرة شاملة على أداء الوكالة، مراحل المرشحين، والتدفقات المالية"
                  : "Comprehensive overview of agency performance, pipeline, and cash flows"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenPassportScanner && (
                <button
                  onClick={onOpenPassportScanner}
                  title={isAr ? "ماسح الجوازات الذكي وفحص كود MRZ" : "Smart Passport MRZ Scanner"}
                  className="bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#c9a84c] border border-[#c9a84c]/40 px-3.5 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <Scan className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.passportScanner}</span>
                </button>
              )}
              {onOpenGoogleSheetsModal && (
                <button
                  onClick={onOpenGoogleSheetsModal}
                  title="Google Sheets Sync"
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Google Sheets</span>
                </button>
              )}
              {onOpenExportModal && (
                <button
                  onClick={onOpenExportModal}
                  title={isAr ? "تصدير السجلات أو طباعة تقارير PDF" : "Export & Print PDF"}
                  className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-2xl font-bold text-sm border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-4 h-4 text-[#c9a84c]" />
                  <span className="hidden sm:inline">{isAr ? "تصدير / طباعة" : "Export / Print"}</span>
                </button>
              )}
              <button
                onClick={onAddCandidate}
                className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-4 py-2.5 rounded-2xl font-black text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{t.addCandidate}</span>
              </button>
              <button
                onClick={onOpenGeneralExpenseModal}
                className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-2xl font-bold text-sm border border-white/20 transition-colors flex items-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">{t.agencyExpense}</span>
              </button>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 border-t border-white/10 pt-6">
            <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.netExpectedProfit}</span>
              <span className="text-xl sm:text-2xl font-black text-[#c9a84c] block">
                {formatMoney(netExpectedProfit, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{isAr ? "إجمالي الرسوم - كل المصاريف" : "Total Fees - All Expenses"}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.collectedRevenue}</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 block">
                {formatMoney(totalPaid, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                {isAr ? `من أصل ${formatMoney(totalFees, settings.currency)}` : `Out of ${formatMoney(totalFees, settings.currency)}`}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.remainingBalance}</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400 block">
                {formatMoney(totalOutstanding, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">{isAr ? "مبالغ قيد التحصيل" : "Pending Collection"}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 font-bold block mb-1">{t.totalExpenses}</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 block">
                {formatMoney(totalAllExpenses, settings.currency)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                {isAr 
                  ? `مرشحين: ${formatMoney(candidateExpenses)} | عام: ${formatMoney(totalGeneralExpenses)}`
                  : `Candidates: ${formatMoney(candidateExpenses)} | Agency: ${formatMoney(totalGeneralExpenses)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Action Buttons Bar */}
      <div className="grid grid-cols-3 sm:hidden gap-2">
        <button
          onClick={onAddCandidate}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#c9a84c] text-[#172a46] font-black text-xs shadow-xs active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[3] mb-1" />
          <span>{isAr ? "إضافة مرشح" : "Add Candidate"}</span>
        </button>

        {onOpenPassportScanner && (
          <button
            onClick={onOpenPassportScanner}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform"
          >
            <Scan className="w-5 h-5 mb-1" />
            <span>{isAr ? "ماسح الجوازات" : "Passport Scan"}</span>
          </button>
        )}

        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5 text-[#c9a84c] mb-1" />
            <span>{isAr ? "تصدير / PDF" : "Export / PDF"}</span>
          </button>
        )}
      </div>

      {/* Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate("list")}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-stone-500">{t.totalCandidates}</span>
            <div className="w-8 h-8 rounded-2xl bg-stone-100 text-[#172a46] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172a46]">{activeCandidates.length}</div>
          <div className="text-[11px] text-stone-400 mt-1">{isAr ? "ملف نشط بالنظام" : "Active candidate files"}</div>
        </div>

        <div
          onClick={() => onNavigate("list")}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-stone-500">{t.inProcess}</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{inProcessCount}</div>
          <div className="text-[11px] text-stone-400 mt-1">{isAr ? "بين المقابلة والتأشيرة" : "Interview to Visa"}</div>
        </div>

        <div
          onClick={() => onNavigate("list")}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-stone-500">{t.readyToTravel}</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{readyCount}</div>
          <div className="text-[11px] text-stone-400 mt-1">{isAr ? "اكتملت جميع الإجراءات" : "All paperwork complete"}</div>
        </div>

        <div
          onClick={() => onNavigate("list")}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-stone-500">{t.travelledSuccess}</span>
            <div className="w-8 h-8 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-700">{travelledCount}</div>
          <div className="text-[11px] text-stone-400 mt-1">{isAr ? "وصلوا لوجهات عملهم" : "Arrived at destination"}</div>
        </div>
      </div>

      {/* Stage Pipeline Breakdown */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />
            <h3 className="font-black text-base text-[#172a46]">{t.pipelineBreakdown}</h3>
          </div>
          <button
            onClick={() => onNavigate("list")}
            className="text-xs font-bold text-[#c9a84c] hover:underline flex items-center gap-1"
          >
            <span>{isAr ? "عرض القائمة" : "View list"}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {STAGES.slice(0, 8).map(stage => {
            const count = activeCandidates.filter(c => c.stage === stage.id).length;
            const stageLabel = (t.stages as Record<string, string>)?.[stage.id] || stage.label;
            return (
              <div
                key={stage.id}
                onClick={() => onNavigate("list")}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${stage.bgColor} hover:shadow-xs border-stone-100`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone-600 truncate">{stageLabel}</span>
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                </div>
                <div className="text-xl font-black text-[#172a46]">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Revenue Recharts Section */}
      <MonthlyRevenueChart
        candidates={candidates}
        generalExpenses={generalExpenses}
        currency={settings.currency}
      />

      {/* Alerts Section (if any) */}
      {alerts.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-base">{t.alerts} ({alerts.length})</h3>
            </div>
            <span className="text-xs text-stone-400">{isAr ? "يرجى المراجعة" : "Action required"}</span>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 4).map((alert, idx) => (
              <div
                key={idx}
                onClick={() => alert.candId && onSelectCandidate(alert.candId)}
                className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer ${
                  alert.type === "danger"
                    ? "bg-rose-50 text-rose-900 border-r-4 border-rose-500 hover:bg-rose-100"
                    : alert.type === "warning"
                    ? "bg-amber-50 text-amber-900 border-r-4 border-amber-500 hover:bg-amber-100"
                    : "bg-blue-50 text-blue-900 border-r-4 border-blue-500 hover:bg-blue-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">•</span>
                  <span>{alert.text}</span>
                </div>
                <span className="text-[11px] text-stone-500 hover:text-[#172a46] shrink-0 flex items-center gap-1 font-black">
                  {isAr ? "فتح الملف" : "Open file"} <ArrowIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Candidates & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Candidates List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-[#172a46] flex items-center gap-2">
              <span>{t.recentCandidates}</span>
              <span className="text-xs font-normal text-stone-400">({Math.min(5, activeCandidates.length)})</span>
            </h3>
            <button
              onClick={() => onNavigate("list")}
              className="text-xs font-black text-[#c9a84c] hover:underline flex items-center gap-1"
            >
              <span>{isAr ? "عرض جميع المرشحين" : "View all candidates"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {activeCandidates.length > 0 ? (
              activeCandidates
                .slice(-5)
                .reverse()
                .map(cand => (
                  <CandidateCardSmall
                    key={cand.id}
                    candidate={cand}
                    currency={settings.currency}
                    onClick={() => onSelectCandidate(cand.id)}
                  />
                ))
            ) : (
              <div className="bg-white p-8 rounded-3xl text-center text-stone-400 border border-dashed border-stone-200">
                {t.noCandidates}
              </div>
            )}
          </div>
        </div>

        {/* Agency Quick Shortcuts & Info */}
        <div className="space-y-4">
          <h3 className="font-black text-base text-[#172a46]">{t.quickActions}</h3>

          <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-xs space-y-2.5">
            <button
              onClick={onAddCandidate}
              className="w-full p-3.5 rounded-2xl bg-[#172a46] hover:bg-[#20395c] text-white text-xs font-black flex items-center justify-between transition-all shadow-xs"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#c9a84c]" />
                {t.addCandidate}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenGeneralExpenseModal}
              className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 text-[#172a46] text-xs font-black flex items-center justify-between border border-stone-200 transition-all"
            >
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#c9a84c]" />
                {t.agencyExpense}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate("finance")}
              className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 text-[#172a46] text-xs font-black flex items-center justify-between border border-stone-200 transition-all"
            >
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                {t.financialLedger}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate("settings")}
              className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 text-[#172a46] text-xs font-black flex items-center justify-between border border-stone-200 transition-all"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                {t.backupRestore}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Agency Details Card */}
          <div className="bg-stone-50 p-5 rounded-3xl border border-stone-100 text-xs text-stone-600 space-y-1.5">
            <div className="font-bold text-[#172a46] flex items-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-[#c9a84c]" />
              <span>{t.agencyProfile}</span>
            </div>
            <p className="text-[11px]">{t.licenseNumber}: <strong className="text-stone-700">{settings.licenseNumber || "N/A"}</strong></p>
            <p className="text-[11px]">{t.taxNumber}: <strong className="text-stone-700">{settings.taxNumber || "N/A"}</strong></p>
            <p className="text-[11px]">{t.currency}: <strong className="text-[#c9a84c] font-black">{settings.currency}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};
