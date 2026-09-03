"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  X, IndianRupee, Calendar, CreditCard, Plus, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Edit3, Trash2, Sparkles, Building2, 
  User, Check, FileText, Send, Layers, Wallet, TrendingUp, History,
  Receipt, ArrowUpRight, ShieldCheck, CheckCheck, RefreshCw, SlidersHorizontal,
  Phone, Mail, BarChart3, BookOpen, MapPin, Award, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { 
  TeamEventPayout, 
  PartnerAlbumOrder, 
  TeamSalaryRecord, 
  TeamPayoutTransaction,
  TeamFinancialSummary,
  fetchMemberEventPayouts, 
  saveOrUpdateEventPayout, 
  recordPayoutTransaction, 
  fetchPartnerAlbumOrders, 
  savePartnerAlbumOrder, 
  recordAlbumOrderPayment, 
  fetchMemberSalaryRecords, 
  saveSalaryRecord, 
  recordSalaryPayment,
  updateCrewAssignmentPayment,
  fetchMemberFinancialSummary,
  syncTeamPaymentToFinanceExpense,
  syncTeamPaymentToExpensesAndAnalytics
} from '@/lib/team-finance-sync';
import { supabase } from '@/lib/supabase';

interface TeamMemberFinanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    primary_role?: string;
    primary_type?: string;
    avatar_url?: string;
    default_daily_rate?: number;
    default_currency?: string;
    payout_frequency?: string;
  } | null;
  initialSummary?: TeamFinancialSummary | null;
  onFinancialUpdate?: (memberId: string, updatedMetrics: Partial<TeamFinancialSummary>) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TeamMemberFinanceDrawer({
  isOpen,
  onClose,
  workspaceId,
  member,
  initialSummary,
  onFinancialUpdate,
}: TeamMemberFinanceDrawerProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // 3 Primary Tabs
  const [activeTab, setActiveTab] = useState<'bookings' | 'payroll' | 'analytics'>('bookings');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data States
  const [payouts, setPayouts] = useState<TeamEventPayout[]>([]);
  const [albumOrders, setAlbumOrders] = useState<PartnerAlbumOrder[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<TeamSalaryRecord[]>([]);
  const [summary, setSummary] = useState<TeamFinancialSummary>(initialSummary || {
    member_id: member?.id || '',
    total_agreed: 0,
    total_paid: 0,
    total_balance: 0,
    active_events_count: 0,
    paid_events_count: 0,
    pending_events_count: 0,
    monthly_breakdown: []
  });

  // Modal States for Shoot / Album Payment
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    type: 'EVENT' | 'ALBUM' | 'SALARY';
    id: string;
    title: string;
    clientName?: string;
    totalAmount: number;
    balanceAmount: number;
    role?: string;
  } | null>(null);

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [autoSyncFinance, setAutoSyncFinance] = useState<boolean>(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Manual Add Modal for Custom Event
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventClient, setNewEventClient] = useState('');
  const [newEventName, setNewEventName] = useState('Wedding Shoot');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventRole, setNewEventRole] = useState(member?.primary_role || 'Photographer');
  const [newEventAgreedAmount, setNewEventAgreedAmount] = useState(member?.default_daily_rate ? String(member.default_daily_rate) : '');

  // ── MONTHLY PAYROLL & SALARY SLIP FORM STATES ──
  const now = new Date();
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [salaryDate, setSalaryDate] = useState<string>(now.toISOString().split('T')[0]); // YYYY-MM-DD
  const [salaryBaseAmount, setSalaryBaseAmount] = useState<string>(member?.default_daily_rate ? String(member.default_daily_rate) : '25000');
  const [salaryIncentive, setSalaryIncentive] = useState<string>('0');
  const [salaryDeductions, setSalaryDeductions] = useState<string>('0');
  const [salaryPaymentMode, setSalaryPaymentMode] = useState<'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque'>('Bank Transfer');
  const [salaryRefNo, setSalaryRefNo] = useState<string>('');
  const [salaryNotes, setSalaryNotes] = useState<string>('');
  const [salaryAutoSyncExpense, setSalaryAutoSyncExpense] = useState<boolean>(true);
  const [isSubmittingSalary, setIsSubmittingSalary] = useState<boolean>(false);

  // Payroll Filter State
  const [payrollFilterYear, setPayrollFilterYear] = useState<string>('All');
  const [payrollFilterMonth, setPayrollFilterMonth] = useState<string>('All');

  // Analytics Filter Scope
  const [analyticsYearScope, setAnalyticsYearScope] = useState<number>(now.getFullYear());

  // Member Type Normalization
  const memberType = (member?.primary_type || 'FREELANCER').toUpperCase();
  const isLab = memberType.includes('LAB') || memberType.includes('ALBUM') || memberType.includes('PARTNER');

  // Helper to format Month/Year cleanly
  const formatSlipTitle = useCallback((monthYear?: string, paidDate?: string) => {
    if (monthYear && monthYear.includes('-')) {
      const parts = monthYear.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) {
        return `${MONTH_NAMES[m]} ${y}`;
      }
    }
    if (paidDate) {
      const d = new Date(paidDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    return monthYear || 'Monthly';
  }, []);

  const formatDisplayDate = useCallback((dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  // Fast background data loader (0ms lag, parallelized via Promise.allSettled)
  const loadData = useCallback(async () => {
    if (!member?.id || !workspaceId) return;
    setIsRefreshing(true);
    try {
      const [payoutsResult, salariesResult, ordersResult, summaryResult] = await Promise.allSettled([
        fetchMemberEventPayouts(workspaceId, member.id),
        fetchMemberSalaryRecords(workspaceId, member.id),
        isLab ? fetchPartnerAlbumOrders(workspaceId, member.id) : Promise.resolve([]),
        fetchMemberFinancialSummary(workspaceId, member.id, memberType)
      ]);

      let eventPayouts: TeamEventPayout[] = payoutsResult.status === 'fulfilled' ? (payoutsResult.value || []) : [];
      let salaries: TeamSalaryRecord[] = salariesResult.status === 'fulfilled' ? (salariesResult.value || []) : [];
      let orders: PartnerAlbumOrder[] = ordersResult.status === 'fulfilled' ? (ordersResult.value || []) : [];
      let sum: TeamFinancialSummary = summaryResult.status === 'fulfilled' && summaryResult.value ? summaryResult.value : (initialSummary || {
        member_id: member.id,
        total_agreed: 0,
        total_paid: 0,
        total_balance: 0,
        active_events_count: 0,
        paid_events_count: 0,
        pending_events_count: 0,
        monthly_breakdown: []
      });

      // Direct Fallback query from fw_assignments if payouts empty
      if (!eventPayouts || eventPayouts.length === 0) {
        try {
          const { data: assignmentsData } = await supabase
            .from('fw_assignments')
            .select(`
              id,
              required_role,
              assigned_member_id,
              agreed_amount,
              advance_amount,
              paid_amount,
              balance_amount,
              payment_status,
              sub_event_id,
              workspace_id,
              created_at,
              updated_at,
              fw_sub_events (
                id,
                project_id,
                event_title,
                event_date,
                start_time,
                end_time,
                venue,
                location,
                client_name
              )
            `)
            .eq('assigned_member_id', member.id);

          if (assignmentsData && assignmentsData.length > 0) {
            const rawData = assignmentsData.filter((a: any) => !a.workspace_id || a.workspace_id === workspaceId);
            eventPayouts = rawData.map((a: any) => {
              const se = a.fw_sub_events;
              const defaultDailyRate = Number(member.default_daily_rate) || 0;
              const rawAgreed = Number(a.agreed_amount) || 0;
              const agreed = rawAgreed > 0 ? rawAgreed : defaultDailyRate;
              const paid = Number(a.advance_amount ?? a.paid_amount) || 0;
              const bal = Number(a.balance_amount) > 0 ? Number(a.balance_amount) : Math.max(0, agreed - paid);
              const pStatus = (agreed > 0 && bal === 0) || a.payment_status === 'completed' || a.payment_status === 'PAID'
                ? 'PAID'
                : paid > 0 || a.payment_status === 'partial' || a.payment_status === 'PARTIAL'
                ? 'PARTIAL'
                : 'PENDING';

              return {
                id: a.id,
                workspace_id: a.workspace_id || workspaceId,
                member_id: member.id,
                member_name: member.name || '',
                project_id: se?.project_id || '',
                sub_event_id: a.sub_event_id || '',
                client_name: se?.client_name || 'Wedding Client',
                event_name: se?.event_title || 'Wedding Shoot',
                event_date: se?.event_date || new Date().toISOString().split('T')[0],
                role: a.required_role || member.primary_role || 'Crew',
                agreed_amount: agreed,
                paid_amount: paid,
                balance_amount: bal,
                status: pStatus,
                venue: se?.venue || se?.location || '',
                start_time: se?.start_time || '',
                end_time: se?.end_time || '',
                created_at: a.created_at,
                updated_at: a.updated_at
              };
            });
          }
        } catch (_) {}
      }

      setPayouts(eventPayouts);
      setSalaryRecords(salaries);
      setAlbumOrders(orders);

      const studioShootsList = eventPayouts.filter((item: any) => {
        if (workspaceId && workspaceId !== 'all') {
          if (item.workspace_id && item.workspace_id !== workspaceId) return false;
          if (item.fw_sub_events?.workspace_id && item.fw_sub_events.workspace_id !== workspaceId) return false;
        }
        return true;
      });

      const eventAgreed = studioShootsList.reduce((a, b) => a + Number(b.agreed_amount || 0), 0);
      const eventPaid = studioShootsList.reduce((a, b) => a + Number(b.paid_amount || 0), 0);
      const salaryPaidTotal = salaries.reduce((a, b) => a + Number(b.paid_amount || b.net_payable || 0), 0);

      const computedSummary: TeamFinancialSummary = {
        ...sum,
        total_agreed: eventAgreed,
        total_paid: eventPaid + salaryPaidTotal,
        total_balance: Math.max(0, eventAgreed - eventPaid),
        active_events_count: studioShootsList.length,
        paid_events_count: studioShootsList.filter(p => p.status === 'PAID' || p.status === 'completed').length,
        pending_events_count: studioShootsList.filter(p => p.status !== 'PAID' && p.status !== 'completed').length
      };

      setSummary(computedSummary);
      onFinancialUpdate?.(member.id, computedSummary);
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Fast load error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [workspaceId, member, memberType, isLab, initialSummary, onFinancialUpdate]);

  // Instant open trigger & load in background
  useEffect(() => {
    if (isOpen && member?.id) {
      if (initialSummary) {
        setSummary(initialSummary);
      }
      if (member.default_daily_rate) {
        setSalaryBaseAmount(String(member.default_daily_rate));
        setNewEventAgreedAmount(String(member.default_daily_rate));
      }
      loadData();
    }
  }, [isOpen, member?.id, initialSummary, loadData]);

  // Isolated Shoots for Bookings Tab
  const studioShoots = useMemo(() => {
    return payouts.filter((item: any) => {
      if (workspaceId && workspaceId !== 'all') {
        if (item.workspace_id && item.workspace_id !== workspaceId) return false;
        if (item.fw_sub_events?.workspace_id && item.fw_sub_events.workspace_id !== workspaceId) return false;
      }
      return true;
    });
  }, [payouts, workspaceId]);

  // ── CREATE SALARY SLIP SUBMISSION HANDLER ──
  const handleCreateSalarySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.id || !workspaceId) return;

    const base = Number(salaryBaseAmount) || 0;
    const incentive = Number(salaryIncentive) || 0;
    const ded = Number(salaryDeductions) || 0;
    const net = Math.max(0, base + incentive - ded);
    
    // Derive monthKey from selected payment date
    const d = new Date(salaryDate || now);
    const validDate = isNaN(d.getTime()) ? now : d;
    const monthKey = `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`;
    const monthTitle = formatSlipTitle(monthKey, salaryDate);

    setIsSubmittingSalary(true);
    try {
      const newSlip: TeamSalaryRecord = {
        id: `sal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        workspace_id: workspaceId,
        member_id: member.id,
        member_name: member.name,
        month_year: monthKey,
        base_salary: base,
        incentive_amount: incentive,
        deductions: ded,
        net_payable: net,
        paid_amount: net,
        payment_status: 'PAID',
        paid_date: salaryDate,
        payment_mode: salaryPaymentMode,
        reference_no: salaryRefNo,
        notes: salaryNotes || `Salary for ${monthTitle}`,
        updated_at: new Date().toISOString()
      };

      // 1. Save to database / local store
      await saveSalaryRecord(workspaceId, newSlip);

      // 2. Automatically sync to Studio Expenses & Ledger if enabled
      if (salaryAutoSyncExpense) {
        const safeSalaryAssignmentId = newSlip.id ? String(newSlip.id) : `sal_${Date.now()}`;
        await syncTeamPaymentToExpensesAndAnalytics(workspaceId, {
          paymentType: 'Salary',
          memberName: member.name,
          memberId: member.id,
          memberType: 'team_member',
          paidAmount: net,
          paymentDate: salaryDate,
          paymentMethod: salaryPaymentMode,
          safeAssignmentId: safeSalaryAssignmentId,
          notes: `Base: ₹${base.toLocaleString('en-IN')} | Incentive: ₹${incentive.toLocaleString('en-IN')} | Ded: ₹${ded.toLocaleString('en-IN')} | Ref: ${salaryRefNo || 'N/A'}`
        });

        // Immediate cache revalidation & success toast
        try {
          if (typeof (window as any).mutate === 'function') {
            (window as any).mutate((key: any) => typeof key === 'string' && (key.includes('expenses') || key.includes('analytics') || key.includes('team') || key.includes('finance')), undefined, { revalidate: true });
          }
        } catch (_) {}
        router.refresh();
        showToast(`Payment of ₹${net.toLocaleString('en-IN')} logged & synced to Expenses & Analytics!`);
      }

      // Optimistic UI update
      setSalaryRecords(prev => [newSlip, ...prev.filter(s => s.id !== newSlip.id)]);
      
      const newTotalPaid = summary.total_paid + net;
      const updatedMetrics = {
        ...summary,
        total_paid: newTotalPaid
      };
      setSummary(updatedMetrics);
      onFinancialUpdate?.(member.id, updatedMetrics);

      // Reset form fields and collapse
      setSalaryIncentive('0');
      setSalaryDeductions('0');
      setSalaryRefNo('');
      setSalaryNotes('');
      setShowAddSalary(false);

      // Notify global app listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', {
          detail: { memberId: member.id, amount: net, summary: updatedMetrics }
        }));
      }

      // Reload in background
      loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Failed to create salary slip:', err);
    } finally {
      setIsSubmittingSalary(false);
    }
  };

  // Filtered Salary Records
  const filteredSalaries = useMemo(() => {
    return salaryRecords.filter(s => {
      if (payrollFilterYear !== 'All') {
        const y = s.month_year.split('-')[0] || (s.paid_date ? s.paid_date.split('-')[0] : '');
        if (y !== payrollFilterYear) return false;
      }
      if (payrollFilterMonth !== 'All') {
        const m = s.month_year.split('-')[1] || (s.paid_date ? s.paid_date.split('-')[1] : '');
        if (m !== payrollFilterMonth) return false;
      }
      return true;
    });
  }, [salaryRecords, payrollFilterYear, payrollFilterMonth]);

  // Total Salary Stats
  const totalSalariesPaid = useMemo(() => {
    return salaryRecords.reduce((acc, s) => acc + Number(s.paid_amount || s.net_payable || 0), 0);
  }, [salaryRecords]);

  const totalIncentivesPaid = useMemo(() => {
    return salaryRecords.reduce((acc, s) => acc + Number(s.incentive_amount || 0), 0);
  }, [salaryRecords]);

  // Payment Settlement Handler for Bookings
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;

    setSubmittingPayment(true);
    try {
      const amount = Number(paymentAmount);
      const safeAssignmentId = paymentTarget?.id ? String(paymentTarget.id) : `pay_${Date.now()}`;
      const memberId = member?.id;
      const memberName = member?.name || 'Team Member';
      const mType = member?.primary_type?.toLowerCase() || ((member as any)?.member_types?.includes('PARTNER') ? 'partner' : 'team_member');
      const paymentType = paymentTarget.type === 'EVENT' ? 'Shoot Fee' : paymentTarget.type === 'ALBUM' ? 'Album / Lab Fee' : 'Advance Payout';

      if (paymentTarget.type === 'EVENT') {
        await updateCrewAssignmentPayment(workspaceId, safeAssignmentId, {
          advanceAmount: amount,
          paymentStatus: amount >= paymentTarget.balanceAmount ? 'completed' : 'partial',
          paymentMethod: paymentMode,
          paymentDate,
          notes: paymentNotes,
          teamMemberId: memberId,
          teamMemberName: memberName,
          clientName: paymentTarget.clientName,
          eventName: paymentTarget.title,
          roleName: paymentTarget.role,
          agreedAmount: paymentTarget.totalAmount
        });

        await recordPayoutTransaction(workspaceId, safeAssignmentId, member!.id, {
          amount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_no: paymentRef,
          notes: paymentNotes,
          autoCreateExpense: autoSyncFinance,
          memberName: member?.name,
          clientName: paymentTarget.clientName,
          eventName: paymentTarget.title,
          role: paymentTarget.role
        });
      } else if (paymentTarget.type === 'ALBUM') {
        await recordAlbumOrderPayment(workspaceId, safeAssignmentId, member!.id, {
          amount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_no: paymentRef,
          notes: paymentNotes,
          partnerName: member?.name,
          clientName: paymentTarget.clientName
        });
      }

      // Auto-Record Payment into expenses Table (Deep Detailed Sync)
      await syncTeamPaymentToExpensesAndAnalytics(workspaceId, {
        paymentType,
        memberName,
        memberId,
        memberType: mType,
        paidAmount: amount,
        paymentDate,
        paymentMethod: paymentMode,
        safeAssignmentId,
        notes: paymentNotes || `${paymentType} for ${paymentTarget.title || 'Assignment'}`
      });

      // Immediate Real-Time Cache Revalidation & Sync
      try {
        if (typeof (window as any).mutate === 'function') {
          (window as any).mutate((key: any) => typeof key === 'string' && (key.includes('expenses') || key.includes('analytics') || key.includes('team') || key.includes('finance')), undefined, { revalidate: true });
        }
      } catch (_) {}
      router.refresh();
      showToast(`Payment of ₹${amount.toLocaleString('en-IN')} logged & synced to Expenses & Analytics!`);

      const updatedMetrics = {
        ...summary,
        total_paid: summary.total_paid + amount,
        total_balance: Math.max(0, summary.total_balance - amount)
      };
      setSummary(updatedMetrics);
      onFinancialUpdate?.(member!.id, updatedMetrics);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', {
          detail: { memberId: member!.id, amount, summary: updatedMetrics }
        }));
      }

      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
      await loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Record payment failed:', err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 right-6 z-[99999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-md pointer-events-auto"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold">{toastMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent transition-opacity"
        />

        {/* Centered Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-[94vw] max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col z-10 font-sans border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-zinc-900 to-amber-950 text-white flex items-center justify-between shadow-md rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 overflow-hidden flex items-center justify-center shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-300 font-black text-sm">
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-amber-50 truncate">{member.name}</h2>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {member.primary_role || 'Crew'}
                  </span>
                  {Boolean(member.default_daily_rate && member.default_daily_rate > 0) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5">
                      <IndianRupee className="w-2.5 h-2.5" />
                      <span>{Number(member.default_daily_rate).toLocaleString('en-IN')}/{member.payout_frequency === 'monthly' ? 'mo' : 'day'}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-[11px] text-amber-200/70 mt-0.5 flex-wrap">
                  {member.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span>{member.phone}</span>
                    </span>
                  )}
                  {member.email && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs"
              title="Close Drawer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Top Quick Stats Strip */}
          <div className="p-3 sm:p-4 grid grid-cols-3 gap-2 sm:gap-2.5 bg-amber-50/60 border-b border-amber-200/80">
            {/* Total Agreed */}
            <div className="p-2.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5 text-amber-600" /> Agreed Shoots
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-950 mt-1 font-mono">
                ₹{summary.total_agreed.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Paid */}
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Total Paid
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-900 mt-1 font-mono">
                ₹{summary.total_paid.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Balance Due */}
            <div className={`p-2.5 rounded-xl bg-white border shadow-2xs flex flex-col justify-between ${
              summary.total_balance > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200/90'
            }`}>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-500'
              }`}>
                <Clock className="w-2.5 h-2.5 text-rose-500" /> Balance Due
              </span>
              <span className={`text-xs sm:text-sm font-black mt-1 font-mono ${
                summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-700'
              }`}>
                ₹{summary.total_balance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 3 Navigation Tabs */}
          <div className="px-4 pt-2.5 pb-0 flex items-center gap-2 border-b border-amber-200/60 bg-[#FAF8F2]">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'border-amber-600 text-amber-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              📅 Bookings &amp; Events ({studioShoots.length})
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'payroll'
                  ? 'border-amber-600 text-amber-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              💵 Monthly Payroll &amp; Salary ({salaryRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-amber-600 text-amber-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              📊 3D Analytics Dashboard
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* ══════════════════════════════════════════════════════════════
                TAB 1: BOOKINGS & EVENTS (SHOOTS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Shoot Bookings &amp; Payment Ledger</span>
                    </h3>
                    <p className="text-[10px] font-medium text-zinc-500">
                      Live event assignments synced from Team Manager calendar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEventOpen(!isAddEventOpen)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Custom Event</span>
                  </button>
                </div>

                {/* Add Custom Event Inline Form */}
                {isAddEventOpen && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5">
                      <span className="text-xs font-black text-amber-950">Add Custom Shoot Assignment</span>
                      <button type="button" onClick={() => setIsAddEventOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Client / Couple Name"
                        value={newEventClient}
                        onChange={e => setNewEventClient(e.target.value)}
                        className="p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Event Title (e.g. Reception)"
                        value={newEventName}
                        onChange={e => setNewEventName(e.target.value)}
                        className="p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={e => setNewEventDate(e.target.value)}
                        className="p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Agreed Amount (₹)"
                        value={newEventAgreedAmount}
                        onChange={e => setNewEventAgreedAmount(e.target.value)}
                        className="p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (newEventClient && newEventAgreedAmount) {
                          await saveOrUpdateEventPayout(workspaceId, {
                            member_id: member.id,
                            member_name: member.name,
                            client_name: newEventClient,
                            event_name: newEventName,
                            event_date: newEventDate,
                            role: newEventRole,
                            agreed_amount: Number(newEventAgreedAmount)
                          });
                          setIsAddEventOpen(false);
                          setNewEventClient('');
                          setNewEventAgreedAmount('');
                          loadData();
                        }
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                    >
                      Save Event Assignment
                    </button>
                  </div>
                )}

                {/* Shoots Roster */}
                <div className="space-y-2.5">
                  {studioShoots.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-1">
                      <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-stone-600">No Shoot Assignments Found</p>
                      <p className="text-[11px] text-stone-400">Assign this member to upcoming events in Team Manager or add a custom event above.</p>
                    </div>
                  ) : (
                    studioShoots.map((payout) => {
                      const isPaid = payout.status === 'PAID' || payout.status === 'completed' || Number(payout.balance_amount) <= 0;
                      return (
                        <div
                          key={payout.id}
                          className="p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs hover:shadow-xs transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                                {payout.event_date}
                              </span>
                              <h4 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                                {payout.event_name} • <span className="text-amber-700">{payout.client_name}</span>
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-500 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-bold border border-stone-200">
                                  {payout.role}
                                </span>
                                {payout.venue && (
                                  <span className="flex items-center gap-0.5 truncate max-w-[200px]">
                                    <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                    {payout.venue}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isPaid ? '🟢 PAID' : '🟡 DUE'}
                            </span>
                          </div>

                          <div className="bg-stone-50 rounded-xl p-2 grid grid-cols-3 gap-1 text-center font-mono border border-stone-200/70">
                            <div>
                              <span className="text-[9px] font-bold text-stone-400 block uppercase">Agreed</span>
                              <span className="text-xs font-black text-stone-800">₹{Number(payout.agreed_amount).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Paid</span>
                              <span className="text-xs font-black text-emerald-700">₹{Number(payout.paid_amount).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-rose-500 block uppercase">Due</span>
                              <span className="text-xs font-black text-rose-700">₹{Number(payout.balance_amount).toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentTarget({
                                  type: 'EVENT',
                                  id: payout.id,
                                  title: payout.event_name,
                                  clientName: payout.client_name,
                                  totalAmount: Number(payout.agreed_amount),
                                  balanceAmount: Number(payout.balance_amount),
                                  role: payout.role
                                });
                                setPaymentAmount(String(payout.balance_amount > 0 ? payout.balance_amount : payout.agreed_amount));
                                setIsPaymentModalOpen(true);
                              }}
                              className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                              <span>Record Payment</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2: MONTHLY PAYROLL & SALARY (COLLAPSIBLE FORM + 3D SLIPS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                {/* 1. Header Toolbar with Collapsible Toggle Button */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
                      <span>Monthly Payroll &amp; Salary</span>
                    </h3>
                    <p className="text-[10px] text-stone-500 font-medium">
                      Manage monthly remuneration cycles, performance incentives, and expense sync.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddSalary(!showAddSalary)}
                    className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{showAddSalary ? 'Hide Form' : '+ Add Salary Slip'}</span>
                  </button>
                </div>

                {/* 2. Collapsible Add Salary Slip Form */}
                <AnimatePresence>
                  {showAddSalary && (
                    <motion.form
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleCreateSalarySlip}
                      className="p-4 rounded-2xl bg-white border-2 border-amber-300 shadow-sm space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-stone-900">Create Salary Slip &amp; Payout</h4>
                            <p className="text-[10px] text-amber-800 font-bold">
                              Salary Cycle: {formatSlipTitle('', salaryDate)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddSalary(false)}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Simplified Grid: Single Payment Date (standard picker) */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        {/* A. Simple Payment Date */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                            Payment Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={salaryDate}
                            onChange={(e) => setSalaryDate(e.target.value)}
                            className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* B. Base Salary Amount */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                            Base Salary (₹) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="e.g. 20000"
                            value={salaryBaseAmount}
                            onChange={(e) => setSalaryBaseAmount(e.target.value)}
                            className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        {/* C. Incentive / Bonus Amount */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                            + Incentive / Bonus (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 2000"
                            value={salaryIncentive}
                            onChange={(e) => setSalaryIncentive(e.target.value)}
                            className="w-full h-8 px-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        {/* D. Deductions / Advance */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-rose-600 tracking-wider block">
                            - Deductions / Advance (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={salaryDeductions}
                            onChange={(e) => setSalaryDeductions(e.target.value)}
                            className="w-full h-8 px-2.5 bg-rose-50/50 border border-rose-300 rounded-lg text-xs font-bold text-rose-950 focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Payment Mode & Reference */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                            Payment Mode
                          </label>
                          <select
                            value={salaryPaymentMode}
                            onChange={(e) => setSalaryPaymentMode(e.target.value as any)}
                            className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
                          >
                            <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                            <option value="UPI">UPI (Google Pay, PhonePe)</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                            Reference / UTR No.
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UTR194829482"
                            value={salaryRefNo}
                            onChange={(e) => setSalaryRefNo(e.target.value)}
                            className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                            Notes / Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Cleared monthly retainer"
                            value={salaryNotes}
                            onChange={(e) => setSalaryNotes(e.target.value)}
                            className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Net Calculated Amount Strip & Expense Sync Checkbox */}
                      <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex-wrap gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={salaryAutoSyncExpense}
                            onChange={(e) => setSalaryAutoSyncExpense(e.target.checked)}
                            className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-stone-700">
                            Automatically record in Studio Expenses &amp; Ledger
                          </span>
                        </label>

                        <div className="text-right">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Net Payable</span>
                          <span className="text-sm font-black text-emerald-700 font-mono">
                            ₹{Math.max(0, (Number(salaryBaseAmount) || 0) + (Number(salaryIncentive) || 0) - (Number(salaryDeductions) || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingSalary}
                        className="w-full py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-100" />
                        <span>{isSubmittingSalary ? 'Recording Salary...' : 'Add Salary Slip & Record Payment'}</span>
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* 3. Salary Slips Roster & Filter Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      <span>Monthly Salary &amp; Incentive Records</span>
                    </h4>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={payrollFilterYear}
                        onChange={(e) => setPayrollFilterYear(e.target.value)}
                        className="h-7 px-2 bg-white border border-stone-200 rounded-lg text-[11px] font-bold text-stone-800 cursor-pointer shadow-2xs"
                      >
                        <option value="All">All Years</option>
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>

                      <select
                        value={payrollFilterMonth}
                        onChange={(e) => setPayrollFilterMonth(e.target.value)}
                        className="h-7 px-2 bg-white border border-stone-200 rounded-lg text-[11px] font-bold text-stone-800 cursor-pointer shadow-2xs"
                      >
                        <option value="All">All Months</option>
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={String(idx + 1).padStart(2, '0')}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Total Salaries</span>
                      <span className="text-xs font-black text-stone-900 font-mono">₹{totalSalariesPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Total Incentives</span>
                      <span className="text-xs font-black text-emerald-700 font-mono">₹{totalIncentivesPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs col-span-2 sm:col-span-1">
                      <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">Total Slips</span>
                      <span className="text-xs font-black text-purple-900 font-mono">{salaryRecords.length} Generated</span>
                    </div>
                  </div>

                  {/* Records List - Clean 3D Pill Cards Typography */}
                  <div className="space-y-2.5">
                    {filteredSalaries.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-1">
                        <IndianRupee className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-stone-600">No Salary Slips Found</p>
                        <p className="text-[11px] text-stone-400">Add the first salary slip using the "+ Add Salary Slip" button above.</p>
                      </div>
                    ) : (
                      filteredSalaries.map((slip) => {
                        const title = `${formatSlipTitle(slip.month_year, slip.paid_date)} Salary Slip`;
                        const subtext = `Paid on ${formatDisplayDate(slip.paid_date)} • ${slip.payment_mode || 'Bank Transfer'}${slip.reference_no ? ' • Ref: ' + slip.reference_no : ''}`;

                        return (
                          <div
                            key={slip.id}
                            className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-sm font-black text-stone-900 block tracking-tight">
                                  {title}
                                </span>
                                <span className="text-[10px] text-stone-500 font-medium">
                                  {subtext}
                                </span>
                              </div>

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs flex items-center gap-1">
                                ✓ Paid
                              </span>
                            </div>

                            {/* Inset 3D Financial Breakdown Pill */}
                            <div className="bg-stone-50/90 rounded-xl p-2.5 border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                              <span className="text-stone-600 font-semibold">
                                Base: <strong className="text-stone-900 font-black">₹{Number(slip.base_salary).toLocaleString('en-IN')}</strong>
                              </span>
                              <span className="text-stone-300 hidden sm:inline">|</span>
                              <span className="text-emerald-700 font-semibold">
                                Incentive: <strong className="font-black">+₹{Number(slip.incentive_amount || 0).toLocaleString('en-IN')}</strong>
                              </span>
                              <span className="text-stone-300 hidden sm:inline">|</span>
                              <span className="text-rose-600 font-semibold">
                                Deduction: <strong className="font-black">-₹{Number(slip.deductions || 0).toLocaleString('en-IN')}</strong>
                              </span>
                              <span className="text-stone-300 hidden sm:inline">|</span>
                              <span className="text-emerald-900 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                                Net Paid: ₹{Number(slip.paid_amount || slip.net_payable).toLocaleString('en-IN')}
                              </span>
                            </div>

                            {slip.notes && (
                              <p className="text-[10px] text-stone-500 italic bg-amber-50/50 p-1.5 rounded-lg border border-amber-200/50">
                                💬 {slip.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-emerald-700 pt-0.5">
                              <span className="flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Synced with Studio Expenses &amp; Accounting
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3: 3D PERFORMANCE ANALYTICS DASHBOARD
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                {/* Analytics Scope Filter */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Performance Analytics</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-stone-400">Year:</span>
                    <select
                      value={analyticsYearScope}
                      onChange={(e) => setAnalyticsYearScope(parseInt(e.target.value, 10))}
                      className="h-7 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-800 cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3D KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-amber-950 text-white shadow-md space-y-1">
                    <span className="text-[10px] font-bold text-amber-200/80 uppercase tracking-wider block">
                      Total Shoots / Shifts
                    </span>
                    <div className="text-2xl font-black text-white">{studioShoots.length}</div>
                    <span className="text-[10px] text-amber-300/80 font-medium block">
                      {summary.paid_events_count} Completed • {summary.pending_events_count} Upcoming
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Total Earned &amp; Paid
                    </span>
                    <div className="text-2xl font-black text-emerald-700 font-mono">
                      ₹{summary.total_paid.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium block">
                      Direct remuneration settled
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Agreed Rate / Base
                    </span>
                    <div className="text-xl font-black text-stone-900 font-mono">
                      ₹{Number(member.default_daily_rate || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium block">
                      Payout mode: {member.payout_frequency || 'daily'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Reliability Score
                    </span>
                    <div className="text-xl font-black text-indigo-700 flex items-center gap-1">
                      <Award className="w-5 h-5 text-indigo-500" />
                      <span>100% Active</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium block">
                      Studio verified crew
                    </span>
                  </div>
                </div>

                {/* Monthly Financial Distribution */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>Month-by-Month Earnings Breakdown</span>
                  </h4>

                  {(!summary.monthly_breakdown || summary.monthly_breakdown.length === 0) ? (
                    <p className="text-xs text-stone-400 py-6 text-center">No monthly payout records to display yet.</p>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      {summary.monthly_breakdown.map((m) => {
                        const maxVal = Math.max(...(summary.monthly_breakdown || []).map(x => x.agreed || 1), 1);
                        const agreedPct = Math.min(100, Math.round((m.agreed / maxVal) * 100));
                        const paidPct = Math.min(100, Math.round((m.paid / maxVal) * 100));

                        return (
                          <div key={m.month} className="space-y-1 p-2.5 rounded-xl bg-stone-50/80 border border-stone-200">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-stone-900 font-black">{m.month}</span>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-stone-500 font-mono">Agreed: ₹{m.agreed.toLocaleString('en-IN')}</span>
                                <span className="text-emerald-700 font-black font-mono">Paid: ₹{m.paid.toLocaleString('en-IN')}</span>
                                {m.balance > 0 && (
                                  <span className="text-rose-700 font-black font-mono">Due: ₹{m.balance.toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </div>
                            <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden flex">
                              <div style={{ width: `${paidPct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${Math.max(0, agreedPct - paidPct)}%` }} className="bg-amber-400 h-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ── MODAL: RECORD PAYMENT FOR EVENT / ALBUM ── */}
        <AnimatePresence>
          {isPaymentModalOpen && paymentTarget && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-md w-full p-5 border border-stone-200 shadow-2xl space-y-4 font-sans"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-stone-900">Record Settlement Payment</h3>
                    <p className="text-[10px] text-stone-400">{paymentTarget.title} • {paymentTarget.clientName}</p>
                  </div>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-500 block">Payment Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-500 block">Date *</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-500 block">Mode *</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-500 block">Ref / UTR No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI849202"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={autoSyncFinance}
                      onChange={(e) => setAutoSyncFinance(e.target.checked)}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-stone-700">
                      Record in Studio Expenses
                    </span>
                  </label>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="flex-1 py-1.5 rounded-lg border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
                    >
                      {submittingPayment ? 'Saving...' : 'Confirm Payment'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
}
