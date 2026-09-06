import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Activity,
  Flame
} from "lucide-react";
import { Candidate, StageId } from "../types";
import { STAGES } from "../data/initialData";
import { useLanguage } from "../lib/LanguageContext";

interface StageDistributionChartProps {
  candidates: Candidate[];
  onSelectStage?: (stageId: StageId) => void;
  onNavigateToList?: () => void;
}

const STAGE_HEX_COLORS: Record<StageId, string> = {
  NEW: "#3b82f6",       // Blue
  INTERVIEW: "#6366f1", // Indigo
  MEDICAL: "#f59e0b",   // Amber
  TRAINING: "#f97316",  // Orange
  CONTRACT: "#a855f7",  // Purple
  VISA: "#ec4899",      // Pink
  FLIGHT: "#06b6d4",    // Cyan
  READY: "#10b981",     // Emerald
  TRAVELLED: "#059669", // Green
  COMPLETED: "#475569", // Slate
  CANCELLED: "#f43f5e"  // Rose
};

interface StageDataPoint {
  id: StageId;
  name: string;
  count: number;
  percentage: number;
  color: string;
  stepNumber: number;
}

export const StageDistributionChart: React.FC<StageDistributionChartProps> = ({
  candidates,
  onSelectStage,
  onNavigateToList
}) => {
  const { t, isAr } = useLanguage();
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [filterMode, setFilterMode] = useState<"all" | "active">("all");

  const activeCandidates = useMemo(() => {
    return candidates.filter(c => !c.archived);
  }, [candidates]);

  const { chartData, totalCount, topStage, readyAndTravelledCount, readyAndTravelledPercent } = useMemo(() => {
    const total = activeCandidates.length;

    const stagesToInclude = STAGES.filter(stage => {
      if (filterMode === "active") {
        return !["COMPLETED", "CANCELLED"].includes(stage.id);
      }
      return true;
    });

    const data: StageDataPoint[] = stagesToInclude.map(stage => {
      const count = activeCandidates.filter(c => c.stage === stage.id).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const translatedName = (t.stages as Record<string, string>)?.[stage.id] || stage.label;

      return {
        id: stage.id,
        name: translatedName,
        count,
        percentage,
        color: STAGE_HEX_COLORS[stage.id] || "#3b82f6",
        stepNumber: stage.stepNumber
      };
    });

    const top = [...data].sort((a, b) => b.count - a.count)[0] || data[0];
    const readyAndTravelled = activeCandidates.filter(c =>
      ["READY", "TRAVELLED", "COMPLETED"].includes(c.stage)
    ).length;
    const readyPercent = total > 0 ? Math.round((readyAndTravelled / total) * 100) : 0;

    return {
      chartData: data,
      totalCount: total,
      topStage: top,
      readyAndTravelledCount: readyAndTravelled,
      readyAndTravelledPercent: readyPercent
    };
  }, [activeCandidates, filterMode, t]);

  // Custom Tooltip for Recharts
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: StageDataPoint = payload[0].payload;
      return (
        <div className="bg-[#172a46] text-white p-3.5 rounded-2xl shadow-xl border border-white/10 text-xs min-w-[170px] animate-in fade-in">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-black text-sm text-white">{item.name}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-stone-300">
              <span>{isAr ? "عدد المرشحين:" : "Candidates:"}</span>
              <span className="font-black text-white text-sm bg-white/10 px-2 py-0.5 rounded-lg">
                {item.count}
              </span>
            </div>
            <div className="flex justify-between items-center text-stone-300">
              <span>{isAr ? "النسبة من الإجمالي:" : "Share of total:"}</span>
              <span className="font-black text-[#c9a84c]">{item.percentage}%</span>
            </div>
            <div className="flex justify-between items-center text-stone-400 text-[10px] pt-1">
              <span>{isAr ? "ترتيب الخطوة:" : "Step order:"}</span>
              <span className="font-bold">{isAr ? `المرحلة ${item.stepNumber}` : `Step ${item.stepNumber}`}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: StageDataPoint = payload[0].payload;
      return (
        <div className="bg-[#172a46] text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs min-w-[150px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-white">{item.name}</span>
          </div>
          <div className="flex justify-between items-center text-stone-300">
            <span>{isAr ? "المرشحين:" : "Count:"}</span>
            <span className="font-black text-white">{item.count}</span>
          </div>
          <div className="flex justify-between items-center text-stone-300 mt-1">
            <span>{isAr ? "النسبة:" : "Share:"}</span>
            <span className="font-black text-[#c9a84c]">{item.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-100 shadow-xs space-y-5">
      {/* Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />
            <h3 className="font-black text-base text-[#172a46]">
              {isAr ? "توزيع المرشحين حسب مراحل العمل" : "Candidate Distribution by Work Stages"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 font-bold text-stone-600">
              Recharts
            </span>
          </div>
          <p className="text-xs text-stone-500">
            {isAr
              ? "متابعة بصرية لمسار الاستقدام، تحديد مراحل التدفق والاختناق التشغيلي"
              : "Visual pipeline tracking to identify flow stages and operational bottlenecks"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Filter Mode Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl text-xs font-bold text-stone-600">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterMode === "all"
                  ? "bg-white text-[#172a46] shadow-xs"
                  : "hover:text-[#172a46]"
              }`}
            >
              {isAr ? "كافة المراحل" : "All Stages"}
            </button>
            <button
              onClick={() => setFilterMode("active")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterMode === "active"
                  ? "bg-white text-[#172a46] shadow-xs"
                  : "hover:text-[#172a46]"
              }`}
            >
              {isAr ? "المسار النشط فقط" : "Active Only"}
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl text-stone-600">
            <button
              onClick={() => setChartType("bar")}
              title={isAr ? "مخطط أعمدة" : "Bar Chart"}
              className={`p-1.5 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                chartType === "bar"
                  ? "bg-white text-[#172a46] shadow-xs"
                  : "hover:text-[#172a46]"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#c9a84c]" />
              <span className="hidden md:inline">{isAr ? "أعمدة" : "Bar"}</span>
            </button>
            <button
              onClick={() => setChartType("pie")}
              title={isAr ? "مخطط دائري" : "Pie / Donut Chart"}
              className={`p-1.5 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                chartType === "pie"
                  ? "bg-white text-[#172a46] shadow-xs"
                  : "hover:text-[#172a46]"
              }`}
            >
              <PieChartIcon className="w-4 h-4 text-[#c9a84c]" />
              <span className="hidden md:inline">{isAr ? "دائري" : "Donut"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-stone-500 font-bold">
              {isAr ? "إجمالي بالمسار" : "Total in Pipeline"}
            </span>
            <Layers className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xl font-black text-[#172a46]">{totalCount}</div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {isAr ? "مرشح قيد المتابعة" : "candidates tracked"}
          </span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-stone-500 font-bold">
              {isAr ? "أعلى مرحلة كثافة" : "Highest Stage"}
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-[#172a46] truncate">
            {topStage?.name || "-"}
          </div>
          <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
            {topStage?.count || 0} {isAr ? "مرشح" : "candidates"} ({topStage?.percentage || 0}%)
          </span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-stone-500 font-bold">
              {isAr ? "نسبة الإنجاز والسفر" : "Ready / Travelled"}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {readyAndTravelledPercent}%
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {readyAndTravelledCount} {isAr ? "مرشح جاهز أو سافر" : "ready or arrived"}
          </span>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-stone-500 font-bold">
              {isAr ? "عدد مراحل العمل" : "Stage Steps"}
            </span>
            <Activity className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600">{chartData.length}</div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {isAr ? "خطوة معتمدة بالمسار" : "pipeline steps"}
          </span>
        </div>
      </div>

      {/* Recharts Render Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: "600" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={55}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                onClick={(entry: any) => {
                  if (entry?.id && onSelectStage) {
                    onSelectStage(entry.id);
                  } else if (onNavigateToList) {
                    onNavigateToList();
                  }
                }}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.id}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontWeight: "600" }}
              />
              <Pie
                data={chartData.filter(d => d.count > 0)}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                label={({ name, percent }: any) =>
                  (percent * 100) >= 7 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
                onClick={(entry: any) => {
                  if (entry?.id && onSelectStage) {
                    onSelectStage(entry.id);
                  } else if (onNavigateToList) {
                    onNavigateToList();
                  }
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-pie-${entry.id}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Stage Color Pills Bar */}
      <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5 items-center justify-center">
        {chartData.map(stage => (
          <button
            key={stage.id}
            onClick={() => {
              if (onSelectStage) {
                onSelectStage(stage.id);
              } else if (onNavigateToList) {
                onNavigateToList();
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-[11px] font-bold text-stone-700 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span>{stage.name}</span>
            <span className="bg-white px-1.5 py-0.2 rounded-md text-[10px] text-stone-900 border border-stone-200 font-black">
              {stage.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
