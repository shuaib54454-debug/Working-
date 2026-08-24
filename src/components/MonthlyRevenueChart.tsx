import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Layers
} from "lucide-react";
import { Candidate, GeneralExpense, AgencySettings } from "../types";
import { formatMoney } from "../data/initialData";

interface MonthlyRevenueChartProps {
  candidates: Candidate[];
  generalExpenses?: GeneralExpense[];
  currency: string;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

interface MonthlyDataPoint {
  key: string; // "YYYY-MM"
  monthName: string; // "فبراير 2024"
  shortMonth: string; // "فبراير"
  year: string;
  revenue: number; // Actual payments received
  contractValue: number; // Candidate totalFees registered in this month
  expenses: number; // Candidate expenses in this month
  generalExpenses: number; // General agency expenses in this month
  totalExpenses: number;
  netIncome: number; // revenue - totalExpenses
  paymentsCount: number;
  candidatesCount: number;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({
  candidates,
  generalExpenses = [],
  currency
}) => {
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");
  const [metricView, setMetricView] = useState<"revenue" | "comparison" | "net">("revenue");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Aggregate monthly data
  const { monthlyData, availableYears, summary } = useMemo(() => {
    const dataMap: Record<string, MonthlyDataPoint> = {};

    const getMonthKey = (dateStr?: string): { key: string; year: string; monthIdx: number } | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const y = d.getFullYear().toString();
      const m = (d.getMonth() + 1).toString().padStart(2, "0");
      return { key: `${y}-${m}`, year: y, monthIdx: d.getMonth() };
    };

    const ensureMonthPoint = (key: string, year: string, monthIdx: number): MonthlyDataPoint => {
      if (!dataMap[key]) {
        dataMap[key] = {
          key,
          monthName: `${ARABIC_MONTHS[monthIdx]} ${year}`,
          shortMonth: ARABIC_MONTHS[monthIdx],
          year,
          revenue: 0,
          contractValue: 0,
          expenses: 0,
          generalExpenses: 0,
          totalExpenses: 0,
          netIncome: 0,
          paymentsCount: 0,
          candidatesCount: 0
        };
      }
      return dataMap[key];
    };

    const yearsSet = new Set<string>();

    // 1. Process candidate registrations (contract value)
    candidates.forEach(cand => {
      const reg = getMonthKey(cand.registrationDate);
      if (reg) {
        yearsSet.add(reg.year);
        const point = ensureMonthPoint(reg.key, reg.year, reg.monthIdx);
        point.contractValue += Number(cand.totalFees || 0);
        point.candidatesCount += 1;
      }

      // 2. Process payments (Actual revenue)
      if (cand.payments && Array.isArray(cand.payments)) {
        cand.payments.forEach(p => {
          const pMonth = getMonthKey(p.date);
          if (pMonth) {
            yearsSet.add(pMonth.year);
            const point = ensureMonthPoint(pMonth.key, pMonth.year, pMonth.monthIdx);
            point.revenue += Number(p.amount || 0);
            point.paymentsCount += 1;
          }
        });
      }

      // 3. Process candidate direct expenses
      if (cand.expenses && Array.isArray(cand.expenses)) {
        cand.expenses.forEach(e => {
          const eMonth = getMonthKey(e.date);
          if (eMonth) {
            yearsSet.add(eMonth.year);
            const point = ensureMonthPoint(eMonth.key, eMonth.year, eMonth.monthIdx);
            point.expenses += Number(e.amount || 0);
          }
        });
      }
    });

    // 4. Process general expenses
    generalExpenses.forEach(ge => {
      const geMonth = getMonthKey(ge.date);
      if (geMonth) {
        yearsSet.add(geMonth.year);
        const point = ensureMonthPoint(geMonth.key, geMonth.year, geMonth.monthIdx);
        point.generalExpenses += Number(ge.amount || 0);
      }
    });

    // Calculate totals & net
    Object.values(dataMap).forEach(pt => {
      pt.totalExpenses = pt.expenses + pt.generalExpenses;
      pt.netIncome = pt.revenue - pt.totalExpenses;
    });

    // Sort chronologically
    let sorted = Object.values(dataMap).sort((a, b) => a.key.localeCompare(b.key));

    // If empty data, provide at least recent months
    if (sorted.length === 0) {
      const now = new Date();
      const currentYear = now.getFullYear().toString();
      yearsSet.add(currentYear);
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const y = d.getFullYear().toString();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const key = `${y}-${m}`;
        sorted.push({
          key,
          monthName: `${ARABIC_MONTHS[d.getMonth()]} ${y}`,
          shortMonth: ARABIC_MONTHS[d.getMonth()],
          year: y,
          revenue: 0,
          contractValue: 0,
          expenses: 0,
          generalExpenses: 0,
          totalExpenses: 0,
          netIncome: 0,
          paymentsCount: 0,
          candidatesCount: 0
        });
      }
    }

    // Filter by year if selected
    const filtered = selectedYear === "all" ? sorted : sorted.filter(d => d.year === selectedYear);

    // Summary calculations
    const totalRev = filtered.reduce((sum, d) => sum + d.revenue, 0);
    const totalExp = filtered.reduce((sum, d) => sum + d.totalExpenses, 0);
    const totalNet = totalRev - totalExp;
    const avgMonthlyRev = filtered.length > 0 ? Math.round(totalRev / filtered.length) : 0;
    const peakMonth = filtered.reduce((max, d) => (d.revenue > max.revenue ? d : max), filtered[0] || { monthName: "-", revenue: 0 });
    const totalPaymentsCount = filtered.reduce((sum, d) => sum + d.paymentsCount, 0);

    return {
      monthlyData: filtered,
      availableYears: Array.from(yearsSet).sort().reverse(),
      summary: {
        totalRev,
        totalExp,
        totalNet,
        avgMonthlyRev,
        peakMonth,
        totalPaymentsCount
      }
    };
  }, [candidates, generalExpenses, selectedYear]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: MonthlyDataPoint = payload[0]?.payload;
      return (
        <div className="bg-[#172a46] text-white p-4 rounded-2xl shadow-xl border border-white/10 text-xs min-w-[200px] z-50 text-right">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="font-black text-[#c9a84c] text-sm">{dataPoint?.monthName || label}</span>
            <span className="text-[10px] text-stone-400">{dataPoint?.paymentsCount || 0} دفعة</span>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-stone-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />
                الإيرادات المحصلة:
              </span>
              <strong className="text-white font-black">{formatMoney(dataPoint?.revenue || 0, currency)}</strong>
            </div>

            {metricView === "comparison" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-stone-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    قيمة العقود المسجلة:
                  </span>
                  <strong className="text-blue-300 font-black">{formatMoney(dataPoint?.contractValue || 0, currency)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    المصروفات الإجمالية:
                  </span>
                  <strong className="text-rose-300 font-black">{formatMoney(dataPoint?.totalExpenses || 0, currency)}</strong>
                </div>
              </>
            )}

            {(metricView === "comparison" || metricView === "net") && (
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 mt-1">
                <span className="text-emerald-300 font-bold">صافي الدخل الشهري:</span>
                <strong className={`font-black ${dataPoint?.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatMoney(dataPoint?.netIncome || 0, currency)}
                </strong>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-2xl bg-[#c9a84c]/10 text-[#c9a84c] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-[#172a46]">توزيع إيرادات التوظيف الشهرية</h3>
            <span className="text-[10px] font-black bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full border border-stone-200">
              تحليل مالي
            </span>
          </div>
          <p className="text-xs text-stone-500">
            تتبع التدفقات المالية والمقبوضات الشهرية وعقود التوظيف
          </p>
        </div>

        {/* Filters and Chart Type Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          {availableYears.length > 1 && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-[#c9a84c]"
            >
              <option value="all">كل السنوات</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  سنة {yr}
                </option>
              ))}
            </select>
          )}

          {/* Metric View Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMetricView("revenue")}
              className={`px-3 py-1 rounded-lg transition-all ${
                metricView === "revenue"
                  ? "bg-white text-[#172a46] shadow-xs font-black"
                  : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              الإيرادات المحصلة
            </button>
            <button
              onClick={() => setMetricView("comparison")}
              className={`px-3 py-1 rounded-lg transition-all ${
                metricView === "comparison"
                  ? "bg-white text-[#172a46] shadow-xs font-black"
                  : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              مقارنة شاملة
            </button>
            <button
              onClick={() => setMetricView("net")}
              className={`px-3 py-1 rounded-lg transition-all ${
                metricView === "net"
                  ? "bg-white text-[#172a46] shadow-xs font-black"
                  : "text-stone-600 hover:text-[#172a46]"
              }`}
            >
              الصافي
            </button>
          </div>

          {/* Chart Presentation Mode */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-stone-600">
            <button
              onClick={() => setChartType("area")}
              title="مخطط مساحي"
              className={`p-1.5 rounded-lg transition-all ${
                chartType === "area" ? "bg-white text-[#172a46] shadow-xs" : "hover:text-[#172a46]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              title="أعمدة بيانية"
              className={`p-1.5 rounded-lg transition-all ${
                chartType === "bar" ? "bg-white text-[#172a46] shadow-xs" : "hover:text-[#172a46]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("line")}
              title="خط بياني"
              className={`p-1.5 rounded-lg transition-all ${
                chartType === "line" ? "bg-white text-[#172a46] shadow-xs" : "hover:text-[#172a46]"
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPI Highlights Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold block mb-0.5">إجمالي التحصيلات بالفترة</span>
          <span className="text-base sm:text-lg font-black text-[#172a46]">
            {formatMoney(summary.totalRev, currency)}
          </span>
          <span className="text-[9px] text-stone-400 block mt-0.5">{summary.totalPaymentsCount} عملية دفع مسجلة</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold block mb-0.5">متوسط الإيراد الشهري</span>
          <span className="text-base sm:text-lg font-black text-blue-700">
            {formatMoney(summary.avgMonthlyRev, currency)}
          </span>
          <span className="text-[9px] text-stone-400 block mt-0.5">معدل تحصيل شهري</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold block mb-0.5">أعلى شهر إيراداً</span>
          <span className="text-base sm:text-lg font-black text-[#c9a84c] truncate block">
            {summary.peakMonth.monthName}
          </span>
          <span className="text-[9px] text-stone-400 block mt-0.5">{formatMoney(summary.peakMonth.revenue, currency)}</span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold block mb-0.5">صافي الدخل الإجمالي</span>
          <span className={`text-base sm:text-lg font-black ${summary.totalNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatMoney(summary.totalNet, currency)}
          </span>
          <span className="text-[9px] text-stone-400 block mt-0.5">بعد خصم المصروفات</span>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="w-full h-72 sm:h-80 pt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#c9a84c" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: "600" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={val => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px", fontWeight: "700" }}
              />

              {metricView === "revenue" && (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="الإيرادات المحصلة"
                  stroke="#c9a84c"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  activeDot={{ r: 6, fill: "#172a46", stroke: "#c9a84c", strokeWidth: 2 }}
                />
              )}

              {metricView === "comparison" && (
                <>
                  <Area
                    type="monotone"
                    dataKey="contractValue"
                    name="قيمة العقود"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorContracts)"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="المحصل فعلياً"
                    stroke="#c9a84c"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalExpenses"
                    name="المصروفات"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={0.1}
                    fill="#f43f5e"
                  />
                </>
              )}

              {metricView === "net" && (
                <Area
                  type="monotone"
                  dataKey="netIncome"
                  name="صافي الدخل الشهري"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              )}
            </AreaChart>
          ) : chartType === "bar" ? (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: "600" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={val => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px", fontWeight: "700" }}
              />

              {metricView === "revenue" && (
                <Bar
                  dataKey="revenue"
                  name="الإيرادات المحصلة"
                  fill="#c9a84c"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                />
              )}

              {metricView === "comparison" && (
                <>
                  <Bar
                    dataKey="contractValue"
                    name="قيمة العقود"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="revenue"
                    name="المحصل فعلياً"
                    fill="#c9a84c"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="totalExpenses"
                    name="المصروفات"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </>
              )}

              {metricView === "net" && (
                <Bar
                  dataKey="netIncome"
                  name="صافي الدخل الشهري"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                />
              )}
            </BarChart>
          ) : (
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: "600" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={val => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px", fontWeight: "700" }}
              />

              {metricView === "revenue" && (
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="الإيرادات المحصلة"
                  stroke="#c9a84c"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#c9a84c" }}
                  activeDot={{ r: 7 }}
                />
              )}

              {metricView === "comparison" && (
                <>
                  <Line
                    type="monotone"
                    dataKey="contractValue"
                    name="قيمة العقود"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="المحصل فعلياً"
                    stroke="#c9a84c"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#c9a84c" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalExpenses"
                    name="المصروفات"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </>
              )}

              {metricView === "net" && (
                <Line
                  type="monotone"
                  dataKey="netIncome"
                  name="صافي الدخل الشهري"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981" }}
                  activeDot={{ r: 7 }}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
