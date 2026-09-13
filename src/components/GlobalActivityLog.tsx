import React, { useState, useMemo } from "react";
import {
  Activity,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  User as UserIcon,
  Layers,
  ArrowRightLeft,
  CreditCard,
  Wallet,
  UserCheck,
  UserPlus,
  FileText,
  Trash2,
  Archive,
  RefreshCw,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Building2
} from "lucide-react";
import { ActivityLogEntry, ActivityCategory, AgencySettings } from "../types";
import { formatMoney } from "../data/initialData";
import { formatRelativeTimeArabic, exportActivitiesToCSV } from "../lib/activityLog";
import { useLanguage } from "../lib/LanguageContext";

interface GlobalActivityLogProps {
  activities: ActivityLogEntry[];
  settings: AgencySettings;
  onSelectCandidate?: (candidateId: string) => void;
  onRefresh?: () => void;
  currentUserEmail?: string | null;
}

export const GlobalActivityLog: React.FC<GlobalActivityLogProps> = ({
  activities,
  settings,
  onSelectCandidate,
  onRefresh,
  currentUserEmail
}) => {
  const { t, isAr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS">("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Distinct users in activities for filter dropdown
  const distinctUsers = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.userEmail) set.add(act.userEmail);
    });
    return Array.from(set);
  }, [activities]);

  // Copy ID handler
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered activities
  const filteredActivities = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    return activities.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCand = item.candidateName?.toLowerCase().includes(q);
        const matchesUser = item.userEmail?.toLowerCase().includes(q);
        const matchesId = item.id?.toLowerCase().includes(q);
        const matchesCandId = item.candidateId?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCand && !matchesUser && !matchesId && !matchesCandId) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== "ALL") {
        if (item.category !== selectedCategory) {
          return false;
        }
      }

      // 3. User Filter
      if (selectedUser !== "ALL") {
        if (item.userEmail !== selectedUser) {
          return false;
        }
      }

      // 4. Date Range Filter
      if (selectedDateRange === "TODAY") {
        const itemDate = new Date(item.timestamp).toDateString();
        const todayDate = new Date().toDateString();
        if (itemDate !== todayDate) return false;
      } else if (selectedDateRange === "7DAYS") {
        if (now - item.timestamp > sevenDays) return false;
      } else if (selectedDateRange === "30DAYS") {
        if (now - item.timestamp > thirtyDays) return false;
      }

      return true;
    });
  }, [activities, searchQuery, selectedCategory, selectedUser, selectedDateRange]);

  // Statistics
  const stats = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toDateString();

    const todayCount = activities.filter((a) => new Date(a.timestamp).toDateString() === todayStr).length;
    const stageTransfers = activities.filter((a) => a.category === "STAGE").length;
    const paymentsCount = activities.filter((a) => a.category === "PAYMENT").length;
    const expensesCount = activities.filter((a) => a.category === "EXPENSE").length;
    const totalFinanceValue = activities
      .filter((a) => (a.category === "PAYMENT" || a.category === "EXPENSE") && a.amount)
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    return {
      total: activities.length,
      today: todayCount,
      stageTransfers,
      financialOps: paymentsCount + expensesCount,
      totalFinanceValue,
      usersCount: distinctUsers.length || 1
    };
  }, [activities, distinctUsers]);

  // Category Badge Helper
  const getCategoryConfig = (category: ActivityCategory, actionType: string) => {
    switch (category) {
      case "STAGE":
        return {
          label: "مسار المراحل",
          bg: "bg-purple-100 text-purple-800 border-purple-200",
          iconBg: "bg-purple-600 text-white",
          icon: ArrowRightLeft
        };
      case "PAYMENT":
        return {
          label: "سند قبض",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          iconBg: "bg-emerald-600 text-white",
          icon: CreditCard
        };
      case "EXPENSE":
        return {
          label: "مصروف مالي",
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          iconBg: "bg-amber-600 text-white",
          icon: Wallet
        };
      case "CANDIDATE":
        if (actionType === "CANDIDATE_CREATED") {
          return {
            label: "مرشح جديد",
            bg: "bg-blue-100 text-blue-800 border-blue-200",
            iconBg: "bg-blue-600 text-white",
            icon: UserPlus
          };
        }
        if (actionType === "CANDIDATE_DELETED" || actionType === "CANDIDATE_ARCHIVED") {
          return {
            label: "أرشفة وحذف",
            bg: "bg-rose-100 text-rose-800 border-rose-200",
            iconBg: "bg-rose-600 text-white",
            icon: actionType === "CANDIDATE_ARCHIVED" ? Archive : Trash2
          };
        }
        return {
          label: "بيانات مرشح",
          bg: "bg-indigo-100 text-indigo-800 border-indigo-200",
          iconBg: "bg-indigo-600 text-white",
          icon: UserCheck
        };
      case "DOCUMENT":
        return {
          label: "وثائق وملاحظات",
          bg: "bg-cyan-100 text-cyan-800 border-cyan-200",
          iconBg: "bg-cyan-600 text-white",
          icon: FileText
        };
      case "SETTINGS":
        return {
          label: "إعدادات النظام",
          bg: "bg-stone-100 text-stone-800 border-stone-200",
          iconBg: "bg-stone-600 text-white",
          icon: Building2
        };
      default:
        return {
          label: "نشاط إداري",
          bg: "bg-stone-100 text-stone-800 border-stone-200",
          iconBg: "bg-stone-600 text-white",
          icon: Activity
        };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* 1. Header Bar with Title, Live Status & Global Actions */}
      <div className="bg-gradient-to-r from-[#172a46] to-[#203a60] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-[#c9a84c]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center font-black shadow-md">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isAr ? "سجل النشاط العام والرقابة" : "Global Activity & Audit Log"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? "مزامنة سحابية حية" : "Live Real-Time Sync"}
              </span>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {isAr
                ? "توثيق فوري لكافة التحركات والعمليات الإدارية، مراحل المرشحين، وسندات القبض والمصروفات المنفذة من قبل جميع المستخدمين."
                : "Real-time audit log tracking all administrative changes, candidate stage transitions, receipts, and expenses across all users."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="تحديث البيانات"
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white transition-all border border-white/10 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => exportActivitiesToCSV(filteredActivities, settings.currency)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/15 shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4 text-[#c9a84c]" />
              <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#c9a84c] hover:bg-[#b89539] text-[#172a46] rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? "طباعة السجل" : "Print Audit"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Statistical Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Total Logs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold text-stone-500">{isAr ? "إجمالي العمليات" : "Total Operations"}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#172a46] font-mono">{stats.total}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">{isAr ? "إجراء مسجل بالنظام" : "Recorded actions"}</p>
          </div>
        </div>

        {/* Metric 2: Today's Actions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold text-stone-500">{isAr ? "نشاط اليوم" : "Today's Activity"}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 font-mono">{stats.today}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">{isAr ? "عملية خلال الـ 24 ساعة" : "Actions in last 24h"}</p>
          </div>
        </div>

        {/* Metric 3: Stage Transitions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold text-stone-500">{isAr ? "تحويلات المراحل" : "Stage Moves"}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700 font-mono">{stats.stageTransfers}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">{isAr ? "انتقال مرحلي للمرشحين" : "Candidate progression"}</p>
          </div>
        </div>

        {/* Metric 4: Financial Transactions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold text-stone-500">{isAr ? "العمليات المالية" : "Financial Ops"}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 font-mono">{stats.financialOps}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">{isAr ? "قبض ومصروفات" : "Receipts & expenses"}</p>
          </div>
        </div>

        {/* Metric 5: Active Users / Accounts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold text-stone-500">{isAr ? "المستخدمون النشطون" : "Active Users"}</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#172a46] font-mono">{stats.usersCount}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">{isAr ? "حساب نفذ عمليات" : "Users contributing"}</p>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        {/* Top Filter Row: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث باسم المرشح، المستخدم، نص العملية، أو معرّف السجل..." : "Search by candidate, user, action or ID..."}
              className="w-full pr-10 pl-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold bg-stone-200 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as any)}
                className="w-full pr-9 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all font-bold text-stone-700"
              >
                <option value="ALL">{isAr ? "كل الفترات الزمنية" : "All Time"}</option>
                <option value="TODAY">{isAr ? "اليوم فقط" : "Today Only"}</option>
                <option value="7DAYS">{isAr ? "آخر 7 أيام" : "Last 7 Days"}</option>
                <option value="30DAYS">{isAr ? "آخر 30 يوماً" : "Last 30 Days"}</option>
              </select>
            </div>
          </div>

          {/* User Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <UserIcon className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all font-bold text-stone-700 truncate"
              >
                <option value="ALL">{isAr ? "جميع المستخدمين" : "All Users"}</option>
                {distinctUsers.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-stone-400 font-bold ml-2 text-[11px] shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            {isAr ? "التصنيف:" : "Filter:"}
          </span>

          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedCategory === "ALL"
                ? "bg-[#172a46] text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {isAr ? "الكل" : "All"} ({activities.length})
          </button>

          <button
            onClick={() => setSelectedCategory("STAGE")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "STAGE"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {isAr ? "مسار المراحل" : "Stages"} (
            {activities.filter((a) => a.category === "STAGE").length})
          </button>

          <button
            onClick={() => setSelectedCategory("PAYMENT")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "PAYMENT"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {isAr ? "القبض والدفعات" : "Payments"} (
            {activities.filter((a) => a.category === "PAYMENT").length})
          </button>

          <button
            onClick={() => setSelectedCategory("EXPENSE")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "EXPENSE"
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {isAr ? "المصروفات" : "Expenses"} (
            {activities.filter((a) => a.category === "EXPENSE").length})
          </button>

          <button
            onClick={() => setSelectedCategory("CANDIDATE")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "CANDIDATE"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {isAr ? "ملفات المرشحين" : "Candidates"} (
            {activities.filter((a) => a.category === "CANDIDATE").length})
          </button>

          <button
            onClick={() => setSelectedCategory("DOCUMENT")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "DOCUMENT"
                ? "bg-cyan-700 text-white shadow-xs"
                : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {isAr ? "الوثائق والملاحظات" : "Docs & Notes"} (
            {activities.filter((a) => a.category === "DOCUMENT").length})
          </button>

          {(searchQuery || selectedCategory !== "ALL" || selectedDateRange !== "ALL" || selectedUser !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setSelectedDateRange("ALL");
                setSelectedUser("ALL");
              }}
              className="px-3 py-1 text-rose-600 hover:bg-rose-50 rounded-xl font-bold mr-auto shrink-0 transition-colors"
            >
              {isAr ? "إلغاء الفلاتر" : "Reset Filters"}
            </button>
          )}
        </div>
      </div>

      {/* 4. Filter Results Summary */}
      <div className="flex items-center justify-between px-1 text-xs text-stone-500 font-bold">
        <span>
          {isAr
            ? `عرض ${filteredActivities.length} من إجمالي ${activities.length} عملية مسجلة`
            : `Showing ${filteredActivities.length} of ${activities.length} recorded events`}
        </span>
        {currentUserEmail && (
          <span className="hidden sm:inline-flex items-center gap-1 text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c9a84c]" />
            {isAr ? `جلسة المستخدم: ${currentUserEmail}` : `Current user: ${currentUserEmail}`}
          </span>
        )}
      </div>

      {/* 5. Activities Timeline Stream */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-black text-stone-800 mb-1">
            {isAr ? "لا توجد أنشطة تطابق معايير البحث" : "No activities found matching filters"}
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
            {isAr
              ? "جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض الأنشطة والعمليات المسجلة."
              : "Try altering search terms or resetting filters to see all recorded logs."}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
              setSelectedDateRange("ALL");
              setSelectedUser("ALL");
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all"
          >
            {isAr ? "إعادة تعيين الفلاتر" : "Reset Filters"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden divide-y divide-stone-100">
          {filteredActivities.map((act) => {
            const config = getCategoryConfig(act.category, act.actionType);
            const IconComponent = config.icon;
            const isMe = currentUserEmail && act.userEmail === currentUserEmail;

            return (
              <div
                key={act.id}
                className="p-4 sm:p-5 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
              >
                {/* Left (or Right in RTL): Icon and Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category Action Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-xs ${config.iconBg}`}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2.5]" />
                  </div>

                  {/* Main Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Top Meta Line: Category Badge + Title + Amount */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border ${config.bg}`}
                      >
                        {config.label}
                      </span>

                      <h4 className="text-sm font-extrabold text-[#172a46] leading-tight">
                        {act.title}
                      </h4>

                      {/* Financial Amount Badge if exists */}
                      {act.amount !== undefined && act.amount > 0 && (
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg font-mono flex items-center gap-1 ${
                            act.category === "PAYMENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {act.category === "PAYMENT" ? "+" : "-"}
                          {formatMoney(act.amount, settings.currency)}
                        </span>
                      )}
                    </div>

                    {/* Detailed Description */}
                    <p className="text-xs text-stone-600 leading-relaxed break-words font-medium">
                      {act.description}
                    </p>

                    {/* Candidate Link Pill if attached */}
                    {act.candidateName && (
                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                        {onSelectCandidate && act.candidateId ? (
                          <button
                            onClick={() => onSelectCandidate(act.candidateId!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/70 rounded-xl text-[11px] font-extrabold transition-all group/btn"
                            title="الانتقال إلى ملف المرشح"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{act.candidateName}</span>
                            <span className="font-mono text-[10px] opacity-70">
                              (#{act.candidateId})
                            </span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 text-stone-700 rounded-lg text-[11px] font-bold">
                            <UserCheck className="w-3.5 h-3.5 text-stone-500" />
                            <span>{act.candidateName}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right / Secondary column: User & Timing Details */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 text-right">
                  {/* User / Performer Pill */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                        isMe
                          ? "bg-amber-100 text-[#172a46] border border-[#c9a84c]/40 font-black"
                          : "bg-stone-100 text-stone-700"
                      }`}
                      title={`المستخدم المسؤول: ${act.userEmail}`}
                    >
                      <UserIcon className="w-3 h-3 text-stone-400" />
                      <span className="truncate max-w-[140px]">{act.userEmail}</span>
                      {isMe && (
                        <span className="text-[9px] bg-[#c9a84c] text-[#172a46] px-1 rounded-sm font-black">
                          {isAr ? "أنت" : "You"}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Relative & Absolute Time */}
                  <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-medium">
                    <span className="font-bold text-stone-700">
                      {formatRelativeTimeArabic(act.timestamp)}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">
                      {new Date(act.timestamp).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">
                      {new Date(act.timestamp).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>

                  {/* Log ID with Copy Button */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-mono text-stone-400">
                      #{act.id}
                    </span>
                    <button
                      onClick={() => handleCopyId(act.id)}
                      title="نسخ معرّف الإجراء"
                      className="p-1 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100 transition-colors"
                    >
                      {copiedId === act.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
