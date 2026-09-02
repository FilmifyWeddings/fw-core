'use client';

import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, Calendar, CheckCircle2, Clock, AlertCircle, 
  Send, Users2, ChevronLeft, ChevronRight, Sparkles, ArrowUpRight,
  CreditCard, Check, Search, Filter, ShieldCheck, FileText
} from 'lucide-react';
import { FWTeamMember, FWProject } from '@/types';
import { supabase } from '@/lib/supabase';
import { syncTeamPaymentToFinanceExpense } from '@/lib/team-finance-sync';

export interface MonthlyPayrollTabProps {
  workspaceId: string;
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  onRefreshData: () => void;
}

export default function MonthlyPayrollTab({
  workspaceId,
  projects,
  teamMembers,
  onRefreshData,
}: MonthlyPayrollTabProps) {
  // Current Month State (e.g. "2026-09")
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Payout Record Modal State
  const [quickPayMember, setQuickPayMember] = useState<{
    member: FWTeamMember;
    totalAgreed: number;
    totalPaid: number;
    balance: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<string>('UPI');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Compute month-specific assignments and financials per member
  const memberMonthPayroll = useMemo(() => {
    const map: Record<string, {
      member: FWTeamMember;
      eventsCount: number;
      totalAgreed: number;
      totalPaid: number;
      balance: number;
      assignments: any[];
    }> = {};

    teamMembers.forEach(m => {
      map[m.id] = {
        member: m,
        eventsCount: 0,
        totalAgreed: 0,
        totalPaid: 0,
        balance: 0,
        assignments: [],
      };
    });

    projects.forEach(p => {
      (p.fw_sub_events || []).forEach(se => {
        const seDate = se.event_date || '';
        if (seDate.startsWith(selectedMonth)) {
          (se.fw_assignments || []).forEach(a => {
            if (a.assigned_member_id && map[a.assigned_member_id]) {
              const item = map[a.assigned_member_id];
              const agreed = Number(a.agreed_amount) || Number(item.member.default_daily_rate) || 0;
              const paid = Number(a.advance_amount) || 0;
              const bal = Math.max(0, agreed - paid);

              item.eventsCount += 1;
              item.totalAgreed += agreed;
              item.totalPaid += paid;
              item.balance += bal;
              item.assignments.push({
                clientName: p.client_name,
                eventTitle: se.event_title,
                eventDate: se.event_date,
                role: a.required_role,
                agreed,
                paid,
                balance: bal,
                status: a.payment_status || (bal === 0 && agreed > 0 ? 'completed' : paid > 0 ? 'partial' : 'pending')
              });
            }
          });
        }
      });
    });

    return Object.values(map).filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.member.name.toLowerCase().includes(q) ||
          (item.member.primary_role && item.member.primary_role.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, teamMembers, selectedMonth, searchQuery]);

  // Overall Month KPIs
  const monthKpis = useMemo(() => {
    let totalAgreed = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalShoots = 0;

    memberMonthPayroll.forEach(m => {
      totalAgreed += m.totalAgreed;
      totalPaid += m.totalPaid;
      totalBalance += m.balance;
      totalShoots += m.eventsCount;
    });

    return { totalAgreed, totalPaid, totalBalance, totalShoots };
  }, [memberMonthPayroll]);

  // Record Quick Payout & Sync to Expenses
  const handleRecordQuickPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayMember || !Number(payAmount)) return;

    setIsProcessingPay(true);
    try {
      const amountNum = Number(payAmount);
      const cleanMemberName = quickPayMember.member.name.replace(/\.\.\./g, '').trim();

      // 1. Sync directly to Finance Expenses
      await syncTeamPaymentToFinanceExpense(workspaceId, {
        title: `Crew Payout: ${cleanMemberName} (${quickPayMember.member.primary_role})`,
        category: 'Crew & Freelancer Payout',
        amount: amountNum,
        date: new Date().toISOString().split('T')[0],
        payment_mode: payMode,
        notes: payNotes || `Monthly Payroll Payment for ${formattedMonthLabel}`,
        team_member_name: cleanMemberName,
        team_member_id: quickPayMember.member.id,
      });

      // 2. Refresh workspace data
      onRefreshData();
      setQuickPayMember(null);
      setPayAmount('');
      setPayNotes('');
    } catch (err: any) {
      console.error('[MonthlyPayroll] Quick pay error:', err);
      alert('Failed to record payout: ' + err.message);
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── TOP MONTH BAR & KPI STATS ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        
        {/* Month Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Monthly Crew Payroll &amp; Commercials
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Calculate total shoot fees, advances paid, and pending balance for {formattedMonthLabel}
              </p>
            </div>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black text-slate-900 min-w-[120px] text-center">
              {formattedMonthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Summary Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Agreed Fees</span>
              <IndianRupee className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900">
              ₹{monthKpis.totalAgreed.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">{monthKpis.totalShoots} shoot slots booked</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Advances / Paid</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-950">
              ₹{monthKpis.totalPaid.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold">Synced to Expenses</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Pending Balance</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-rose-950">
              ₹{monthKpis.totalBalance.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-rose-700 font-semibold">Payable on wrap</span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Active Crew</span>
              <Users2 className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-indigo-950">
              {memberMonthPayroll.filter(m => m.eventsCount > 0).length} Members
            </p>
            <span className="text-[10px] text-indigo-700 font-semibold">With assigned dates</span>
          </div>

        </div>

      </div>

      {/* ── MEMBER-WISE PAYROLL TABLE / CARDS ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">
              Crew Breakdown ({memberMonthPayroll.length} Members)
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Member Payroll List */}
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {memberMonthPayroll.map((item) => {
            const cleanName = item.member.name.replace(/\.\.\./g, '').trim();
            const hasBalance = item.balance > 0;
            const hasShoots = item.eventsCount > 0;

            return (
              <div key={item.member.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                
                {/* Member Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {item.member.avatar_url ? (
                    <img
                      src={item.member.avatar_url}
                      alt={cleanName}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {cleanName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 truncate">{cleanName}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {item.member.primary_role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {hasShoots ? `${item.eventsCount} shoots assigned this month` : 'No shoots assigned in this month'}
                    </p>
                  </div>
                </div>

                {/* Financial Amounts Badges */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Agreed Fee</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                      ₹{item.totalAgreed.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Paid / Adv</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                      ₹{item.totalPaid.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">Balance Due</span>
                    <span className={`text-xs sm:text-sm font-black font-mono ${hasBalance ? 'text-rose-600' : 'text-slate-400'}`}>
                      ₹{item.balance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Quick Payout Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPayMember(item);
                      setPayAmount(String(item.balance > 0 ? item.balance : ''));
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Pay</span>
                  </button>

                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Quick Payout Modal */}
      {quickPayMember && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Record Payment for {quickPayMember.member.name}
              </h3>
              <button
                type="button"
                onClick={() => setQuickPayMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordQuickPayout} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount in ₹"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Advance for Wedding Shoot"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                ⚡ This payment will automatically be recorded under your <strong>Studio Expenses</strong> with full details.
              </div>

              <button
                type="submit"
                disabled={isProcessingPay || !Number(payAmount)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessingPay ? 'Recording Payout...' : 'Confirm & Sync to Expenses'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
