'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight
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

interface FinanceAnalyticsDashboardProps {
  records: ClientFinanceRecord[];
  expenses: FinanceExpense[];
  clients: any[];
  workspaceId: string;
  todayStr: string;
  onOpenCompletePaymentModal: (record: ClientFinanceRecord, milestone: FinanceMilestoneItem) => void;
  onOpenRecordPayment: (record: ClientFinanceRecord) => void;
  onOpenInvoice: (record: ClientFinanceRecord) => void;
  onOpenQuotationModal: (record: ClientFinanceRecord) => void;
}

export function FinanceAnalyticsDashboard({
  records,
  expenses,
  clients,
  workspaceId,
  todayStr,
  onOpenCompletePaymentModal,
  onOpenRecordPayment,
  onOpenInvoice,
  onOpenQuotationModal,
}: FinanceAnalyticsDashboardProps) {
  // Timeframe Filter: all | this_year | last_year | this_month | last_30_days
  const [timeframe, setTimeframe] = useState<'all' | 'this_year' | 'last_year' | 'this_month' | 'last_30_days'>('this_year');
  const [activeTabSub, setActiveTabSub] = useState<'overview' | 'breakdowns' | 'schedule'>('overview');
  const [rpcAnalyticsData, setRpcAnalyticsData] = useState<any>(null);

  // Try RPC on mount/workspace change (gracefully fallback if not present)
  useEffect(() => {
    if (!workspaceId || workspaceId === 'ws_demo') return;

    const fetchRpcAnalytics = async () => {
      try {
        const { data, error } = await supabase.rpc('get_workspace_finance_analytics', {
          target_workspace_id: workspaceId
        });
        if (!error && data) {
          setRpcAnalyticsData(data);
        }
      } catch {
        // Fallback to client calculations
      }
    };

    fetchRpcAnalytics();
  }, [workspaceId]);

  // Filter records & expenses based on selected timeframe
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const isDateInTimeframe = (dateStr?: string) => {
      if (!dateStr || timeframe === 'all') return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

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
      return isDateInTimeframe(matchDate);
    });

    const exps = expenses.filter(e => isDateInTimeframe(e.payment_date || e.created_at));

    return { records: recs, expenses: exps };
  }, [records, expenses, timeframe]);

  // Aggregate Metrics
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

  // Top Contributing Clients (Ranked by Total Received / Contract Value)
  const topClients = useMemo(() => {
    return [...filteredData.records]
      .sort((a, b) => (Number(b.received_amount) || 0) - (Number(a.received_amount) || 0))
      .slice(0, 5);
  }, [filteredData.records]);

  // Upcoming / Overdue Receivables Schedule
  const upcomingReceivables = useMemo(() => {
    const list = [];

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

  // Category Expenses Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
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

  // Team Member / Payee Breakdown
  const teamBreakdown = useMemo(() => {
    const map = {};
    filteredData.expenses.forEach(e => {
      const payee = e.paid_to || 'Unassigned Vendor';
      if (!map[payee]) map[payee] = { total: 0, count: 0 };
      map[payee].total += Number(e.amount) || 0;
      map[payee].count += 1;
    });

    return Object.entries(map)
      .map(([payee, data]) => ({
        payee,
        total: data.total,
        count: data.count,
        percentage: metrics.totalExpenses > 0 ? Math.round((data.total / metrics.totalExpenses) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredData.expenses, metrics.totalExpenses]);

  // Monthly Trend Visualization (Past 6 Months)
  const monthlyTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = targetDate.getMonth();
      const yr = targetDate.getFullYear();
      const monthLabel = months[mIdx];

      const monthRecs = records.filter(r => {
        const dStr = r.created_at || r.client?.event_date;
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getMonth() === mIdx && d.getFullYear() === yr;
      });

      const monthExps = expenses.filter(e => {
        const dStr = e.payment_date || e.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getMonth() === mIdx && d.getFullYear() === yr;
      });

      const inv = monthRecs.reduce((s, r) => s + (Number(r.final_total_amount) || 0), 0);
      const rec = monthRecs.reduce((s, r) => s + (Number(r.received_amount) || 0), 0);
      const exp = monthExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      result.push({
        monthLabel,
        year: yr,
        invoiced: inv,
        received: rec,
        expenses: exp
      });
    }

    const maxVal = Math.max(...result.map(d => Math.max(d.invoiced, d.received, d.expenses)), 1000);

    return { data: result, maxVal };
  }, [records, expenses]);

  return (
    <div className="space-y-5 font-sans text-slate-900 w-full max-w-full overflow-x-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR: TIMEFRAME SELECTOR & SUB-VIEW SWITCHER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-2.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Timeframe Pill Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'this_year', label: 'This Year (2026)' },
            { id: 'last_year', label: 'Last Year (2025)' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                timeframe === t.id
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'breakdowns', label: 'Breakdowns', icon: PieChartIcon },
            { id: 'schedule', label: 'Dues Schedule', icon: Clock },
          ].map(sub => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveTabSub(sub.id)}
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
          💎 3D FLOATING KPI CARDS WITH GRADIENT GLOWS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* KPI 1: Gross Invoiced (Deep Sapphire Blue) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-4 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] text-white shadow-[0_10px_25px_-5px_rgba(30,58,138,0.3)] border border-blue-400/30 overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">Gross Invoiced</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileText className="w-3.5 h-3.5 text-blue-100" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-sans tracking-tight">
              ₹{metrics.totalInvoiced.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-blue-200">
              <span>{filteredData.records.length} Contracts</span>
              <span className="font-bold flex items-center gap-0.5 text-blue-100">
                100% Value
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Cash Received (Emerald Green Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-4 bg-gradient-to-br from-[#065f46] via-[#059669] to-[#10b981] text-white shadow-[0_10px_25px_-5px_rgba(6,95,70,0.3)] border border-emerald-400/30 overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Cash Received</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Wallet className="w-3.5 h-3.5 text-emerald-100" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-sans tracking-tight">
              ₹{metrics.totalReceived.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-emerald-100 font-bold">
              <span>{metrics.realizationRate}% Realized</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">Realized</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Receivables (Amber Accent Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-4 bg-gradient-to-br from-[#9a3412] via-[#ea580c] to-[#f97316] text-white shadow-[0_10px_25px_-5px_rgba(154,52,18,0.3)] border border-orange-400/30 overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-200">Pending Receivables</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Clock className="w-3.5 h-3.5 text-orange-100" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-sans tracking-tight">
              ₹{metrics.totalPending.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-orange-100 font-bold">
              <span>{100 - metrics.realizationRate}% Outstanding</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">Collect</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Expenses & Payouts (Rose / Coral Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-4 bg-gradient-to-br from-[#881337] via-[#be123c] to-[#f43f5e] text-white shadow-[0_10px_25px_-5px_rgba(136,19,55,0.3)] border border-rose-400/30 overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-200">Team & Expenses</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <CreditCard className="w-3.5 h-3.5 text-rose-100" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-sans tracking-tight">
              ₹{metrics.totalExpenses.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-rose-100 font-bold">
              <span>{filteredData.expenses.length} Payouts</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">Ops</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Net Studio Profit (Royal Purple Glow) */}
        <div className="relative group rounded-2xl sm:rounded-3xl p-4 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6] text-white shadow-[0_10px_25px_-5px_rgba(76,29,149,0.3)] border border-purple-400/30 overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-200">Net Studio Profit</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <TrendingUp className="w-3.5 h-3.5 text-purple-100" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-sans tracking-tight">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-purple-100 font-bold">
              <span>{metrics.profitMargin}% Profit Margin</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">Net</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: OVERVIEW OR BREAKDOWNS OR SCHEDULE
      ───────────────────────────────────────────────────────────── */}
      {activeTabSub === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          
          {/* 6-Month Cash Flow & Revenue Comparison (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  Monthly Cash Flow & Volume Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Comparing Invoiced vs Cash Received vs Total Expenses</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Invoiced</span>
                <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Received</span>
                <span className="flex items-center gap-1 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses</span>
              </div>
            </div>

            {/* Visual Multi-Bar Chart */}
            <div className="pt-4 space-y-4">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 sm:h-56 pb-2 border-b border-slate-100">
                {monthlyTrends.data.map((item, idx) => {
                  const invHeight = Math.max(6, (item.invoiced / monthlyTrends.maxVal) * 100);
                  const recHeight = Math.max(6, (item.received / monthlyTrends.maxVal) * 100);
                  const expHeight = Math.max(6, (item.expenses / monthlyTrends.maxVal) * 100);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group">
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                        {/* Invoiced Bar */}
                        <div 
                          className="w-2 sm:w-3 bg-blue-500/80 rounded-t-md transition-all group-hover:bg-blue-600"
                          style={{ height: `${invHeight}%` }}
                          title={`Invoiced: ₹${item.invoiced.toLocaleString('en-IN')}`}
                        />
                        {/* Received Bar */}
                        <div 
                          className="w-2 sm:w-3 bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600 shadow-xs"
                          style={{ height: `${recHeight}%` }}
                          title={`Received: ₹${item.received.toLocaleString('en-IN')}`}
                        />
                        {/* Expense Bar */}
                        <div 
                          className="w-2 sm:w-3 bg-rose-400 rounded-t-md transition-all group-hover:bg-rose-500"
                          style={{ height: `${expHeight}%` }}
                          title={`Expenses: ₹${item.expenses.toLocaleString('en-IN')}`}
                        />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-600 mt-2">
                        {item.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex sm:hidden items-center justify-around text-[10px] font-bold pt-1">
                <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600" /> Invoiced</span>
                <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Received</span>
                <span className="flex items-center gap-1 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses</span>
              </div>
            </div>
          </div>

          {/* Top Contributing Clients (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Top Contributing Clients
              </h3>
              <span className="text-[11px] font-bold text-slate-400">By Collected Value</span>
            </div>

            {topClients.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No client financial data found.</p>
            ) : (
              <div className="space-y-2.5">
                {topClients.map((rec, index) => {
                  const clientName = rec.client?.name || 'Unnamed Client';
                  const total = rec.final_total_amount || 0;
                  const recAmt = rec.received_amount || 0;
                  const pct = total > 0 ? Math.round((recAmt / total) * 100) : 0;

                  return (
                    <div key={rec.id} className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-2 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                            index === 0 ? 'bg-amber-100 text-amber-800' : index === 1 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                              {clientName}
                            </h4>
                            <span className="text-[10px] text-slate-400 block">{rec.client?.event_type || 'Photography'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-emerald-800">₹{recAmt.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">of ₹{total.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
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
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: BREAKDOWNS (CATEGORIES & TEAM PAYOUTS)
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

          {/* Team / Crew Member Payouts Breakdown */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Team & Crew Payout Distribution
              </h3>
              <span className="text-xs font-bold text-slate-400">Top Payees</span>
            </div>

            {teamBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">No logged team payouts in this timeframe.</p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {teamBreakdown.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.payee}</span>
                        <span className="text-[10px] text-slate-400">{item.count} Transactions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-rose-800">₹{item.total.toLocaleString('en-IN')}</span>
                        <span className="px-2 py-0.5 text-[10px] font-black bg-white rounded-md border text-slate-600">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
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
          SECTION: UPCOMING & OVERDUE DUES SCHEDULE
      ───────────────────────────────────────────────────────────── */}
      {activeTabSub === 'schedule' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                Upcoming Milestones & Pending Receivables
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Collect installments directly from clients or dispatch WhatsApp reminders</p>
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

    </div>
  );
}
