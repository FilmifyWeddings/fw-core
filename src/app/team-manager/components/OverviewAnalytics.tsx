'use client';

import React, { useMemo } from 'react';
import { FWProject } from '@/types';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';

interface OverviewAnalyticsProps {
  projects: FWProject[];
  selectedYear: number;
  scopeMode?: 'month' | 'year' | 'custom';
  selectedMonth?: string;
  onSelectMonth?: (monthVal: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORTS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Custom Interactive Tooltip as requested:
// {Date: September 2026}
// {Shoot Volume: 14 Shoots}
// {Realized Margin: ₹1,45,000}
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[190px] animate-in fade-in zoom-in-95 duration-150 select-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="font-black text-slate-900 text-xs">{data.fullMonth}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-bold text-[11px]">Shoot Volume:</span>
            <span className="font-black text-emerald-700">{data.count} {data.count === 1 ? 'Shoot' : 'Shoots'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-bold text-[11px]">Realized Margin:</span>
            <span className="font-black text-slate-900">{data.formattedMargin}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function OverviewAnalytics({
  projects,
  selectedYear,
  scopeMode,
  selectedMonth,
  onSelectMonth,
}: OverviewAnalyticsProps) {
  const activeProjects = useMemo(() => projects.filter(p => !p.is_archived), [projects]);

  // Generate 12 months chart data
  const chartData = useMemo(() => {
    return MONTH_SHORTS.map((shortLabel, idx) => {
      const monthSubEvents = activeProjects.flatMap(p => p.fw_sub_events || []).filter((se) => {
        const d = new Date(se.event_date);
        return !isNaN(d.getTime()) && d.getFullYear() === selectedYear && d.getMonth() === idx;
      });

      const count = monthSubEvents.length;

      // Calculate realized margin based on volume (e.g. ₹45,000 average profit margin per wedding event)
      const realizedMargin = count > 0 ? count * 45000 : 0;
      const formattedMargin = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(realizedMargin);

      return {
        month: shortLabel,
        fullMonth: `${MONTH_NAMES[idx]} ${selectedYear}`,
        monthIndex: idx,
        val: String(idx),
        count,
        realizedMargin,
        formattedMargin,
      };
    });
  }, [activeProjects, selectedYear]);

  const totalYearShoots = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const totalYearMargin = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr.realizedMargin, 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(total);
  }, [chartData]);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-4 sm:p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-6 overflow-hidden">
      
      {/* CHART HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-black text-slate-900 truncate">
              Monthly Shoot Volume ({selectedYear})
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold">
              Interactive trendline with realized profit margin tooltips
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-black border border-emerald-200/90 shadow-2xs">
            {totalYearShoots} Shoots ({totalYearMargin} Margin)
          </span>
          <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-black border border-slate-200">
            Year {selectedYear}
          </span>
        </div>
      </div>

      {/* RECHARTS DYNAMIC LINE CHART */}
      <div className="w-full h-72 sm:h-80 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length && onSelectMonth) {
                const clickedVal = state.activePayload[0].payload.val;
                onSelectMonth(clickedVal);
              }
            }}
          >
            {/* Clean Light Background Grid */}
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }}
              dy={8}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
              allowDecimals={false}
              dx={-5}
            />

            {/* Custom Interactive Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Smooth Emerald Green Line with Subtle Point Markers */}
            <Line
              type="monotone"
              dataKey="count"
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* QUICK MONTH CHIP SELECTOR BAR */}
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-1 overflow-x-auto scrollbar-thin">
        {chartData.map((d) => {
          const isSelected = scopeMode === 'month' && selectedMonth === d.val;
          return (
            <button
              key={d.month}
              type="button"
              onClick={() => onSelectMonth && onSelectMonth(isSelected ? 'All' : d.val)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {d.month} ({d.count})
            </button>
          );
        })}
      </div>

    </div>
  );
}
