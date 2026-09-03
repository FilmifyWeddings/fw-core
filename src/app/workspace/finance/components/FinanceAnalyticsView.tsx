'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Wallet,
  FileText,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  Send,
  Check,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  Award,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  X,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface ClientFinanceRecord {
  id: string;
  client_id: string;
  workspace_id: string;
  base_package_price?: number;
  discount_amount?: number;
  accommodation_charges?: number;
  travel_charges?: number;
  additional_charges?: number;
  subtotal_amount?: number;
  gst_rate?: number;
  gst_amount?: number;
  final_total_amount?: number;
  total_package_price?: number;
  received_amount?: number;
  pending_amount?: number;
  payment_status?: string;
  final_quotation_id?: string;
  has_final_quotation?: boolean;
  final_quotation_version?: number;
  created_at?: string;
  updated_at?: string;
  client?: any;
  milestones?: FinanceMilestoneItem[];
}

export interface FinanceMilestoneItem {
  id: string;
  record_id?: string;
  title?: string;
  step_name?: string;
  amount: number;
  due_date?: string;
  paid_date?: string;
  status: 'pending' | 'completed' | 'paid' | string;
  payment_mode?: string;
  reference_id?: string;
  notes?: string;
}

export interface FinanceExpense {
  id: string;
  expense_type: string;
  category: string;
  title: string;
  amount: number;
  paid_to: string;
  team_member_id?: string;
  payment_mode: string;
  payment_date: string;
  client_id?: string;
  notes?: string;
  created_at?: string;
}

interface FinanceAnalyticsViewProps {
  records: ClientFinanceRecord[];
  expenses: FinanceExpense[];
  clients: any[];
  workspaceId: string;
  todayStr: string;
  onOpenCompletePaymentModal: (record: ClientFinanceRecord, milestone: FinanceMilestoneItem) => void;
  onOpenRecordPayment: (record: ClientFinanceRecord) => void;
  onOpenInvoice: (record: ClientFinanceRecord) => void;
}

export function FinanceAnalyticsView({
  records,
  expenses,
  clients,
  workspaceId,
  todayStr,
  onOpenCompletePaymentModal,
  onOpenRecordPayment,
  onOpenInvoice,
}: FinanceAnalyticsViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Timeframe filter presets or custom date range
  const [timeframe, setTimeframe] = useState<'this_year' | 'last_year' | 'this_month' | 'last_30_days' | 'all' | 'custom'>('this_year');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start: string; end: string } | null>(null);

  const [activeTabSub, setActiveTabSub] = useState<'overview' | 'breakdowns' | 'schedule'>('overview');

  // Filter records & expenses based on timeframe & custom dates
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const isDateInFilter = (dateStr?: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (timeframe === 'custom' && appliedCustomDates) {
        if (appliedCustomDates.start && d < new Date(appliedCustomDates.start)) return false;
        if (appliedCustomDates.end) {
          const endD = new Date(appliedCustomDates.end);
          endD.setHours(23, 59, 59, 999);
          if (d > endD) return false;
        }
        return true;
      }

      if (timeframe === 'this_year') {
        return d.getFullYear() === currentYear;
      }
      if (timeframe === 'last_year') {
        return d.getFullYear() === currentYear - 1;
      }
      if (timeframe === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (timeframe === 'last_30_days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        return d >= thirtyDaysAgo && d <= now;
      }
      return true;
    };

    const recs = records.filter(r => {
      const matchDate = r.created_at || r.client?.event_date;
      return isDateInFilter(matchDate);
    });

    const exps = expenses.filter(e => isDateInFilter(e.payment_date || e.created_at));

    return { records: recs, expenses: exps };
  }, [records, expenses, timeframe, appliedCustomDates]);

  // Aggregate Top-Level Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = filteredData.records.reduce((sum, r) => sum + (Number(r.final_total_amount) || 0), 0);
    const totalReceived = filteredData.records.reduce((sum, r) => sum + (Number(r.received_amount) || 0), 0);
    const totalPending = filteredData.records.reduce((sum, r) => sum + (Number(r.pending_amount) || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalReceived - totalExpenses;
    const profitMargin = totalReceived > 0 ? Math.round((netProfit / totalReceived) * 100) : 0;
    const realizationRate = totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0;

    return {
      totalInvoiced,
      totalReceived,
      totalPending,
      totalExpenses,
      netProfit,
      profitMargin,
      realizationRate
    };
  }, [filteredData]);

  // Interactive Line Chart Data (Monthly aggregation over past 6-12 months or selected period)
  const lineChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = targetDate.getMonth();
      const yr = targetDate.getFullYear();
      const monthLabel = `${months[mIdx]} '${yr.toString().slice(-2)}`;

      const monthRecs = records.filter(r => {
        const dStr = r.created_at || r.client?.event_date;
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getMonth() === mIdx && d.getFullYear() === yr;
      });

      const inv = monthRecs.reduce((s, r) => s + (Number(r.final_total_amount) || 0), 0);
      const rec = monthRecs.reduce((s, r) => s + (Number(r.received_amount) || 0), 0);
      const pend = monthRecs.reduce((s, r) => s + (Number(r.pending_amount) || 0), 0);

      result.push({
        month: monthLabel,
        invoiced: inv,
        received: rec,
        pending: pend
      });
    }

    return result;
  }, [records]);

  // 🏆 Top Paying Clients (Ranked by Total Contract Value & Received Amount)
  const topPayingClients = useMemo(() => {
    return [...filteredData.records]
      .sort((a, b) => (Number(b.received_amount) || 0) - (Number(a.received_amount) || 0))
      .slice(0, 5);
  }, [filteredData.records]);

  // 👥 "Handled By" Manager / Team Member Revenue Breakdown
  const handledByBreakdown = useMemo(() => {
    const map: Record<string, { clientsCount: number; billed: number; received: number; pending: number }> = {};

    filteredData.records.forEach(r => {
      const member = (r.client as any)?.assigned_team_member || r.client?.handled_by || 'Unassigned';
      if (!map[member]) {
        map[member] = { clientsCount: 0, billed: 0, received: 0, pending: 0 };
      }
      map[member].clientsCount += 1;
      map[member].billed += Number(r.final_total_amount) || 0;
      map[member].received += Number(r.received_amount) || 0;
      map[member].pending += Number(r.pending_amount) || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        ...data,
        realizationPct: data.billed > 0 ? Math.round((data.received / data.billed) * 100) : 0
      }))
      .sort((a, b) => b.received - a.received);
  }, [filteredData.records]);

  // Category Expenses Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.expenses.forEach(e => {
      const cat = e.category || 'General Expense';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: metrics.totalExpenses > 0 ? Math.round((amount / metrics.totalExpenses) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData.expenses, metrics.totalExpenses]);

  // Upcoming / Overdue Receivables Schedule
  const upcomingReceivables = useMemo(() => {
    const list: Array<{
      record: ClientFinanceRecord;
      milestone: FinanceMilestoneItem;
      clientName: string;
      clientPhone?: string;
      dueDate: string;
      amount: number;
      isOverdue: boolean;
      daysDiff: number;
    }> = [];

    filteredData.records.forEach(record => {
      (record.milestones || []).forEach(ms => {
        const isPaid = ms.status === 'completed' || ms.status === 'paid';
        if (!isPaid && ms.due_date) {
          const due = new Date(ms.due_date);
          const today = new Date(todayStr);
          const diffTime = due.getTime() - today.getTime();
          const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isOverdue = ms.due_date < todayStr;

          list.push({
            record,
            milestone: ms,
            clientName: record.client?.name || 'Unnamed Client',
            clientPhone: record.client?.phone,
            dueDate: ms.due_date,
            amount: Number(ms.amount) || 0,
            isOverdue,
            daysDiff
          });
        }
      });
    });

    return list.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysDiff - b.daysDiff;
    }).slice(0, 8);
  }, [filteredData.records, todayStr]);

  const handleApplyCustomDates = () => {
    if (customStartDate || customEndDate) {
      setAppliedCustomDates({ start: customStartDate, end: customEndDate });
      setTimeframe('custom');
      setShowCustomDateModal(false);
    }
  };

  const handleClearCustomDates = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedCustomDates(null);
    setTimeframe('this_year');
    setShowCustomDateModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-slate-900 w-full max-w-full overflow-x-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP CONTROL STRIP: PRESETS + CUSTOM DATE RANGE + SUB-VIEWS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-2 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Date Filter Presets & Custom Picker Button */}
        {/* Mobile Timeframe Filter Trigger (< md) */}
        <div className="flex md:hidden items-center justify-between gap-2 w-full">
          <button
            type="button"
            onClick={() => setShowCustomDateModal(true)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs active:scale-95 transition"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">
                {timeframe === 'this_year' && 'This Year (2026)'}
                {timeframe === 'last_year' && 'Last Year (2025)'}
                {timeframe === 'this_month' && 'This Month'}
                {timeframe === 'last_30_days' && 'Last 30 Days'}
                {timeframe === 'all' && 'All Time'}
                {timeframe === 'custom' && appliedCustomDates && `${appliedCustomDates.start || 'Start'} → ${appliedCustomDates.end || 'End'}`}
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
              Change
            </span>
          </button>
        </div>

        {/* Desktop Date Filter Presets (>= md) */}
        <div className="hidden md:flex items-center gap-1.5 py-0.5">
          {[
            { id: 'this_year', label: 'This Year (2026)' },
            { id: 'last_year', label: 'Last Year (2025)' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTimeframe(t.id as any);
                setAppliedCustomDates(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                timeframe === t.id
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Custom Date Range Trigger */}
          <button
            onClick={() => setShowCustomDateModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              timeframe === 'custom' && appliedCustomDates
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {timeframe === 'custom' && appliedCustomDates
                ? `${appliedCustomDates.start || 'Start'} → ${appliedCustomDates.end || 'End'}`
                : 'Custom Date'}
            </span>
          </button>
        </div>

        {/* Sub-View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 self-start md:self-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'breakdowns', label: 'Breakdowns', icon: PieChartIcon },
            { id: 'schedule', label: 'Dues Schedule', icon: Clock },
          ].map(sub => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveTabSub(sub.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTabSub === sub.id
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 3D FLOATING KPI CARDS WITH GRADIENT GLOWS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        
        {/* KPI 1: Gross Invoiced (Deep Sapphire Blue) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] text-white shadow-[0_10px_25px_-5px_rgba(30,58,138,0.3)] border border-blue-400/30 overflow-hidden flex flex-col justify-between min-h-[105px] sm:min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 truncate">Gross Invoiced</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-100" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-2xl font-black font-sans tracking-tight truncate">
              ₹{metrics.totalInvoiced.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-blue-200 mt-0.5">
              <span>{filteredData.records.length} Contracts</span>
              <span className="font-bold text-blue-100 hidden sm:inline">100% Value</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Cash Received (Emerald Green Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#065f46] via-[#059669] to-[#10b981] text-white shadow-[0_10px_25px_-5px_rgba(6,95,70,0.3)] border border-emerald-400/30 overflow-hidden flex flex-col justify-between min-h-[105px] sm:min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 truncate">Cash Received</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-100" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-2xl font-black font-sans tracking-tight truncate">
              ₹{metrics.totalReceived.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-100 font-bold mt-0.5">
              <span>{metrics.realizationRate}% Realized</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] hidden sm:inline">Realized</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Receivables (Amber Accent Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#9a3412] via-[#ea580c] to-[#f97316] text-white shadow-[0_10px_25px_-5px_rgba(154,52,18,0.3)] border border-orange-400/30 overflow-hidden flex flex-col justify-between min-h-[105px] sm:min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-200 truncate">Pending Due</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-100" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-2xl font-black font-sans tracking-tight truncate">
              ₹{metrics.totalPending.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-orange-100 font-bold mt-0.5">
              <span>{100 - metrics.realizationRate}% Outstanding</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] hidden sm:inline">Collect</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Expenses & Payouts (Rose / Coral Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#881337] via-[#be123c] to-[#f43f5e] text-white shadow-[0_10px_25px_-5px_rgba(136,19,55,0.3)] border border-rose-400/30 overflow-hidden flex flex-col justify-between min-h-[105px] sm:min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 truncate">Team & Ops</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-100" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-2xl font-black font-sans tracking-tight truncate">
              ₹{metrics.totalExpenses.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-rose-100 font-bold mt-0.5">
              <span>{filteredData.expenses.length} Payouts</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] hidden sm:inline">Ops</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Net Studio Profit (Royal Purple Banner) */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 relative group rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6] text-white shadow-[0_10px_25px_-5px_rgba(76,29,149,0.3)] border border-purple-400/30 overflow-hidden flex flex-col justify-between min-h-[105px] sm:min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 truncate">Net Studio Profit</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-100" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-2xl font-black font-sans tracking-tight truncate">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-purple-100 font-bold mt-0.5">
              <span>{metrics.profitMargin}% Margin</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] hidden sm:inline">Net</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SUB-VIEW: OVERVIEW (INTERACTIVE LINE CHART & TOP PAYING CLIENTS)
      ───────────────────────────────────────────────────────────── */}
      {activeTabSub === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* TOP ROW: LINE CHART (7 COLS) + TOP PAYING CLIENTS (5 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            
            {/* 📈 INTERACTIVE LINE CHART (Cash Flow Volume) */}
            <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Cash Flow & Volume Trend
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Interactive trend of Cash Received vs Pending Receivables
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                    Cash Received
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-2xs" />
                    Pending Due
                  </span>
                </div>
              </div>

              {/* Recharts Dual-Line Chart with Interactive Tooltip */}
              <div className="h-60 sm:h-72 w-full pt-2">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 font-sans">
                                <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
                                <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                                  <span>Cash Received:</span>
                                  <span className="font-mono font-black">₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-amber-400 font-bold">
                                  <span>Pending Due:</span>
                                  <span className="font-mono font-black">₹{Number(payload[1]?.value || 0).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="received"
                        name="Cash Received"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pending"
                        name="Pending Due"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                    Loading trend chart...
                  </div>
                )}
              </div>
            </div>

            {/* 🏆 TOP PAYING CLIENTS (5 COLS) */}
            <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Top Paying Clients
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Highest cash contributors & contract values</p>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Ranked</span>
              </div>

              {topPayingClients.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No client records found.</p>
              ) : (
                <div className="space-y-2.5">
                  {topPayingClients.map((rec, index) => {
                    const clientName = rec.client?.name || 'Unnamed Client';
                    const total = rec.final_total_amount || 0;
                    const recAmt = rec.received_amount || 0;
                    const pct = total > 0 ? Math.round((recAmt / total) * 100) : 0;

                    const rankBadges = [
                      { label: '#1', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
                      { label: '#2', bg: 'bg-slate-200 text-slate-800 border-slate-300' },
                      { label: '#3', bg: 'bg-orange-100 text-orange-900 border-orange-300' },
                      { label: '#4', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
                      { label: '#5', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
                    ];

                    const badge = rankBadges[index] || rankBadges[3];

                    return (
                      <div key={rec.id} className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-2 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full text-[10px] font-black border flex items-center justify-center shrink-0 ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[170px]">
                                {clientName}
                              </h4>
                              <span className="text-[10px] text-slate-400 block">
                                {rec.client?.event_type || 'Wedding Photography'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-emerald-800">
                              ₹{recAmt.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              of ₹{total.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* BOTTOM ROW: HANDLED BY BREAKDOWN CARD */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Revenue Grouped by Handled By / Manager
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Realization and cash collected per team member</p>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {handledByBreakdown.length} Team Members
              </span>
            </div>

            {handledByBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No assigned managers found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {handledByBreakdown.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">
                        👤 {item.name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-purple-100 text-purple-900">
                        {item.clientsCount} Clients
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Collected</span>
                        <span className="font-bold text-emerald-700">₹{item.received.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Pending</span>
                        <span className="font-bold text-rose-600">₹{item.pending.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${item.realizationPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SUB-VIEW: BREAKDOWNS (CATEGORIES & OPERATING PAYOUTS)
      ───────────────────────────────────────────────────────────── */}
      {activeTabSub === 'breakdowns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Category-wise Breakdown */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-orange-600" />
                Expenses by Category
              </h3>
              <span className="text-xs font-bold font-mono text-slate-500">
                Total: ₹{metrics.totalExpenses.toLocaleString('en-IN')}
              </span>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">No categorized expenses in this timeframe.</p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {categoryBreakdown.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900">₹{item.amount.toLocaleString('en-IN')}</span>
                        <span className="px-2 py-0.5 text-[10px] font-black bg-white rounded-md border text-slate-600">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Member Payouts Breakdown */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Team & Crew Payout Distribution
              </h3>
              <span className="text-xs font-bold text-slate-400">Top Payees</span>
            </div>

            {filteredData.expenses.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">No logged team payouts in this timeframe.</p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {Array.from(new Set(filteredData.expenses.map(e => e.paid_to || 'Unassigned'))).map((payee, idx) => {
                  const total = filteredData.expenses
                    .filter(e => (e.paid_to || 'Unassigned') === payee)
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const pct = metrics.totalExpenses > 0 ? Math.round((total / metrics.totalExpenses) * 100) : 0;

                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{payee}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-rose-800">₹{total.toLocaleString('en-IN')}</span>
                          <span className="px-2 py-0.5 text-[10px] font-black bg-white rounded-md border text-slate-600">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SUB-VIEW: SCHEDULE (UPCOMING & OVERDUE DUES)
      ───────────────────────────────────────────────────────────── */}
      {activeTabSub === 'schedule' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                Upcoming Milestones & Pending Receivables
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Collect installments directly or dispatch WhatsApp reminders</p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {upcomingReceivables.length} Pending Actions
            </span>
          </div>

          {upcomingReceivables.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">All Scheduled Payments are Up-to-date! 🎉</h4>
              <p className="text-xs text-slate-400">No overdue or pending installments in this timeframe.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {upcomingReceivables.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition space-y-3 ${
                    item.isOverdue 
                      ? 'bg-rose-50/50 border-rose-200/80' 
                      : 'bg-amber-50/30 border-amber-200/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.clientName}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {item.milestone.step_name || item.milestone.title || 'Milestone Installment'}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      item.isOverdue
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.isOverdue ? `⚠️ ${Math.abs(item.daysDiff)}d Overdue` : `Due in ${item.daysDiff}d`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Due Amount</span>
                      <span className="text-base font-mono font-black text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.clientPhone && (
                        <a
                          href={`https://wa.me/${item.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${item.clientName}, this is a gentle reminder from our studio regarding the scheduled payment of ₹${item.amount.toLocaleString('en-IN')} for ${item.milestone.step_name || 'Booking'}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <Send className="w-3 h-3" /> WhatsApp
                        </a>
                      )}

                      <button
                        onClick={() => onOpenCompletePaymentModal(item.record, item.milestone)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Collect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: CUSTOM DATE RANGE SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCustomDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Custom Date Range</h3>
                </div>
                <button 
                  onClick={() => setShowCustomDateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClearCustomDates}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomDates}
                  disabled={!customStartDate && !customEndDate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition"
                >
                  Apply Date Range
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Re-export for compatibility
export default FinanceAnalyticsView;
