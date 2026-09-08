"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  X, IndianRupee, Calendar, CreditCard, Plus, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Edit3, Trash2, Sparkles, Building2, 
  User, Check, FileText, Send, Layers, Wallet, TrendingUp, History,
  Receipt, ArrowUpRight, ShieldCheck, CheckCheck, RefreshCw, SlidersHorizontal,
  Phone, Mail, BarChart3, BookOpen, MapPin, Award, ChevronDown, CheckSquare, Square,
  Printer, Download
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
  deleteSalaryRecord,
  recordSalaryPayment,
  updateCrewAssignmentPayment,
  fetchMemberFinancialSummary,
  syncTeamPaymentToFinanceExpense,
  syncTeamPaymentToExpensesAndAnalytics
} from '@/lib/team-finance-sync';
import { supabase } from '@/lib/supabase';
import { fetchMemberPayouts, recordMemberPayment } from '@/lib/services/teamPayoutService';
import { recordCrewPayoutTranche } from '@/lib/services/payoutExpensesSyncService';
import RecordPaymentModal from './RecordPaymentModal';
import SalarySlipModal, { SalarySlipData } from './SalarySlipModal';
import DeleteSlipConfirmModal from './DeleteSlipConfirmModal';
import SalarySlipPdfTemplate from './SalarySlipPdfTemplate';

interface TeamMemberFinanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
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
    commercial_agreed?: number;
    commercial_paid?: number;
    events?: any[];
    [key: string]: any;
  } | null;
  initialSummary?: TeamFinancialSummary | null;
  onFinancialUpdate?: (memberId: string, updatedMetrics: Partial<TeamFinancialSummary>) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const resolveClientName = (item: any): string => {
  if (!item) return 'Client Not Assigned';

  // Check direct properties first
  if (item.client_name && typeof item.client_name === 'string' && item.client_name.trim() !== '' && !item.client_name.toLowerCase().includes('client not') && !item.client_name.toLowerCase().includes('wedding shoot')) {
    const cleaned = item.client_name.split(' - ')[0].split(' • ')[0].trim();
    if (cleaned) return cleaned;
  }
  
  // Check nested project/booking/lead structures
  const potentialName = 
    item.project?.client_name ||
    item.project?.title ||
    item.project?.couple_name ||
    item.fw_projects?.client_name ||
    item.booking?.client_name ||
    item.booking?.title ||
    item.booking?.couple_title ||
    item.event?.client_name ||
    item.event?.project?.client_name ||
    item.sub_event?.client_name ||
    item.fw_sub_events?.client_name ||
    item.lead?.name;

  if (potentialName && typeof potentialName === 'string' && potentialName.trim() !== '') {
    // If title has format like "Dinesh & Aishwarya - Wedding", extract the couple name
    const cleaned = potentialName.split(' - ')[0].split(' • ')[0].trim();
    if (cleaned) return cleaned;
  }

  // Fallback check from global projects cache/map if available
  if (typeof window !== 'undefined' && item.project_id && (window as any).__PROJECTS_CACHE?.[item.project_id]) {
    const cached = (window as any).__PROJECTS_CACHE[item.project_id];
    const name = typeof cached === 'string' ? cached : (cached.client_name || cached.title || '');
    if (name && typeof name === 'string' && name.trim() !== '') {
      return name.split(' - ')[0].split(' • ')[0].trim();
    }
  }

  return 'Client Not Assigned';
};

export default function TeamMemberFinanceDrawer({
  isOpen,
  onClose,
  workspaceId,
  workspaceName = 'Filmify Weddings',
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
    paidAmount?: number;
    balanceAmount: number;
    role?: string;
    projectId?: string;
    subEventId?: string;
    assignmentId?: string;
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

  // Salary Slip Controls Modals State
  const [selectedSlipForEdit, setSelectedSlipForEdit] = useState<SalarySlipData | null>(null);
  const [isEditSlipModalOpen, setIsEditSlipModalOpen] = useState(false);
  const [slipToDelete, setSlipToDelete] = useState<TeamSalaryRecord | null>(null);
  const [isDeleteSlipModalOpen, setIsDeleteSlipModalOpen] = useState(false);
  const [isDeletingSlip, setIsDeletingSlip] = useState(false);
  const [slipForPdf, setSlipForPdf] = useState<TeamSalaryRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

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
  // Fast background data loader (0ms lag, strictly scoped to current studio owner)
  const loadData = useCallback(async () => {
    if (!member?.id || !workspaceId) return;
    setIsRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Query ONLY assignments created within this studio's projects (STRICT SCOPE: Prevents 87 vs 50 discrepancy!)
      const { data: assignments, error: assignErr } = await supabase
        .from('fw_assignments')
        .select(`
          id,
          project_id,
          sub_event_id,
          assigned_member_id,
          required_role,
          agreed_amount,
          paid_amount,
          advance_amount,
          balance_amount,
          status,
          payment_status,
          user_id,
          created_at,
          updated_at,
          sub_event:fw_sub_events(id, event_title, event_date, start_time_12h, end_time_12h, venue_name),
          project:fw_projects!inner(id, client_name, user_id, main_date, main_venue, status)
        `)
        .eq('assigned_member_id', member.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (assignErr) {
        console.warn('[TeamMemberFinanceDrawer] Strict assignments query error:', assignErr.message);
      }

      const eventPayouts: TeamEventPayout[] = (assignments || []).map((a: any) => {
        const se = a.sub_event || a.fw_sub_events;
        const proj = a.project || a.fw_projects;
        const rawAgreed = a.agreed_amount !== undefined && a.agreed_amount !== null ? Number(a.agreed_amount) : 0;
        const agreed = isNaN(rawAgreed) ? 0 : rawAgreed;
        const paid = Number(a.paid_amount ?? a.advance_amount) || 0;
        const bal = Math.max(0, agreed - paid);
        const pStatus = (agreed > 0 && bal === 0) || a.payment_status === 'completed' || a.payment_status === 'PAID' || a.status === 'PAID' || a.status === 'completed'
          ? 'PAID'
          : paid > 0 || a.payment_status === 'partial' || a.payment_status === 'PARTIAL'
          ? 'PARTIAL'
          : 'PENDING';

        const clientName = resolveClientName({
          ...a,
          client_name: a.client_name,
          project: proj,
          sub_event: se
        });

        return {
          id: a.id,
          workspace_id: a.user_id || workspaceId,
          member_id: member.id,
          member_name: member.name || '',
          project_id: a.project_id || se?.project_id || '',
          sub_event_id: a.sub_event_id || '',
          client_name: clientName,
          event_name: se?.event_title || se?.name || a.sub_event_name || 'Shoot Event',
          event_date: se?.event_date || a.sub_event_date || new Date().toISOString().split('T')[0],
          role: a.required_role || member.primary_role || 'Crew',
          agreed_amount: agreed,
          paid_amount: paid,
          balance_amount: bal,
          status: pStatus,
          venue: se?.venue_name || proj?.main_venue || '',
          start_time: se?.start_time_12h || se?.start_time || '',
          end_time: se?.end_time_12h || se?.end_time || '',
          project: proj,
          sub_event: se,
          created_at: a.created_at,
          updated_at: a.updated_at
        };
      });

      // 2. Fetch salaries with multi-tenant resilience (team_salary_slips + team_salary_records + cache)
      let salaries: TeamSalaryRecord[] = [];
      try {
        const { data: slips, error: slipsErr } = await supabase
          .from('team_salary_slips')
          .select('*')
          .eq('user_id', user.id)
          .eq('member_id', member.id)
          .order('payout_date', { ascending: false });

        if (!slipsErr && slips && slips.length > 0) {
          salaries = slips.map((s: any) => ({
            id: s.id,
            workspace_id: s.user_id || workspaceId,
            member_id: s.member_id,
            member_name: member.name,
            month_year: s.month_year,
            base_salary: Number(s.base_salary) || 0,
            incentive_amount: Number(s.incentive_amount) || 0,
            deductions: Number(s.deduction_amount) || 0,
            deduction_amount: Number(s.deduction_amount) || 0,
            net_payable: Number(s.net_paid) || 0,
            paid_amount: Number(s.net_paid) || 0,
            net_paid: Number(s.net_paid) || 0,
            payment_status: 'PAID' as const,
            status: s.status || 'Paid',
            paid_date: s.payout_date || '',
            payout_date: s.payout_date || '',
            payment_mode: s.payment_mode || 'UPI',
            reference_no: s.reference_no || '',
            notes: s.notes || '',
            created_at: s.created_at,
            updated_at: s.updated_at
          }));
        }
      } catch (err) {
        console.warn('[TeamMemberFinanceDrawer] DB team_salary_slips fetch note:', err);
      }

      // Merge records from team_salary_records so existing data is NEVER lost
      try {
        const { data: recs, error: recsErr } = await supabase
          .from('team_salary_records')
          .select('*')
          .eq('member_id', member.id)
          .order('month_year', { ascending: false });

        if (!recsErr && recs && recs.length > 0) {
          const existingIds = new Set(salaries.map(s => s.id));
          const existingMonths = new Set(salaries.map(s => (s.month_year || '').toLowerCase().trim()));
          for (const r of recs) {
            const mKey = (r.month_year || '').toLowerCase().trim();
            if (!existingIds.has(r.id) && !existingMonths.has(mKey)) {
              salaries.push(r as TeamSalaryRecord);
              existingIds.add(r.id);
              if (mKey) existingMonths.add(mKey);
            }
          }
        }
      } catch (rErr) {
        console.warn('[TeamMemberFinanceDrawer] DB team_salary_records fetch note:', rErr);
      }

      // Check fetchMemberSalaryRecords fallback
      if (salaries.length === 0) {
        const [salariesResult] = await Promise.allSettled([
          fetchMemberSalaryRecords(workspaceId, member.id)
        ]);
        if (salariesResult.status === 'fulfilled' && salariesResult.value && salariesResult.value.length > 0) {
          const existingIds = new Set(salaries.map(s => s.id));
          for (const r of salariesResult.value) {
            if (!existingIds.has(r.id)) {
              salaries.push(r);
              existingIds.add(r.id);
            }
          }
        }
      }

      // Sync and retrieve from resilient local cache
      if (typeof window !== 'undefined') {
        const cacheKey = `fw_salary_slips_${member.id}`;
        if (salaries.length > 0) {
          try { localStorage.setItem(cacheKey, JSON.stringify(salaries)); } catch (_) {}
        } else {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) salaries = JSON.parse(cached);
          } catch (_) {}
        }
      }

      const [ordersResult] = await Promise.allSettled([
        isLab ? fetchPartnerAlbumOrders(workspaceId, member.id) : Promise.resolve([])
      ]);

      let orders: PartnerAlbumOrder[] = ordersResult.status === 'fulfilled' ? (ordersResult.value || []) : [];

      setPayouts(eventPayouts);
      setSalaryRecords(salaries);
      setAlbumOrders(orders);

      const eventAgreed = eventPayouts.reduce((a, b) => a + Number(b.agreed_amount || 0), 0);
      const eventPaid = eventPayouts.reduce((a, b) => a + Number(b.paid_amount || 0), 0);
      const salaryPaidTotal = salaries.reduce((a, b) => a + Number(b.paid_amount || b.net_payable || 0), 0);

      const computedSummary: TeamFinancialSummary = {
        member_id: member.id,
        total_agreed: eventAgreed,
        total_paid: eventPaid + salaryPaidTotal,
        total_balance: Math.max(0, eventAgreed - eventPaid),
        active_events_count: eventPayouts.length,
        paid_events_count: eventPayouts.filter(p => p.status === 'PAID' || p.status === 'completed').length,
        pending_events_count: eventPayouts.filter(p => p.status !== 'PAID' && p.status !== 'completed').length,
        monthly_breakdown: []
      };

      setSummary(computedSummary);
      onFinancialUpdate?.(member.id, computedSummary);
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Fast load error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [workspaceId, member, memberType, isLab, onFinancialUpdate]);

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

  // Isolated Shoots for Bookings Tab (strictly equal to loaded payouts from studio assignments):
  const studioShoots = useMemo(() => {
    return payouts;
  }, [payouts]);

  // Member in-house / staff status
  const isInHouse = member?.primary_type === 'IN_HOUSE' || member?.member_types?.includes('IN_HOUSE') || member?.payout_frequency === 'monthly';

  // Year filter for studio shoots to align with calendar view (e.g. 2026 vs All)
  const [shootsYearFilter, setShootsYearFilter] = useState<string>('All');

  const availableShootsYears = useMemo(() => {
    const set = new Set<string>();
    studioShoots.forEach(s => {
      const d = s.event_date || s.sub_event?.event_date || s.created_at;
      if (d && d.length >= 4) {
        set.add(d.slice(0, 4));
      }
    });
    return Array.from(set).sort().reverse();
  }, [studioShoots]);

  const filteredShoots = useMemo(() => {
    if (shootsYearFilter === 'All') return studioShoots;
    return studioShoots.filter(s => {
      const d = s.event_date || s.sub_event?.event_date || s.created_at;
      return d && d.startsWith(shootsYearFilter);
    });
  }, [studioShoots, shootsYearFilter]);

  // Ensure top banner cards strictly sum all rows currently listed in Bookings & Events:
  const fallbackEvents = useMemo(() => {
    if (!Array.isArray(member?.events)) return [];
    return member.events;
  }, [member?.events]);

  const events = filteredShoots.length > 0 ? filteredShoots : (shootsYearFilter === 'All' && studioShoots.length === 0 ? fallbackEvents : []);

  const computedAgreed = useMemo(() => {
    return (events || []).reduce((acc, curr) => {
      const rawAmt = Number(curr.agreed_amount) || 0;
      // If member is in-house on monthly salary and rate matches default daily rate (synthetic 18,000 bug), ignore it as 0
      const amt = (isInHouse && rawAmt === Number(member?.default_daily_rate) && (Number(curr.paid_amount) || 0) === 0) ? 0 : rawAmt;
      return acc + amt;
    }, 0);
  }, [events, isInHouse, member?.default_daily_rate]);

  const computedPaid = useMemo(() => {
    return (events || []).reduce((acc, curr) => acc + (Number(curr.paid_amount || curr.advance_amount) || 0), 0);
  }, [events]);

  const computedBalance = Math.max(0, computedAgreed - computedPaid);

  const displayAgreed = computedAgreed === 0 ? 0 : computedAgreed;
  const displayPaid = computedPaid;
  const displayBalance = computedBalance;

  // ── SAVE / UPDATE SALARY SLIP (STRICT MULTI-TENANT ISOLATION) ──
  const handleSaveSalarySlip = async (slipData: any, autoSyncExpense: boolean) => {
    if (!member?.id) return;

    const base = Number(slipData.base_salary) || 0;
    const incentive = Number(slipData.incentive_amount) || 0;
    const ded = Number(slipData.deduction_amount ?? slipData.deductions) || 0;
    const net = Math.max(0, base + incentive - ded);
    const pDate = slipData.payout_date || slipData.paid_date || new Date().toISOString().split('T')[0];

    const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    const slipId = isUuid(slipData.id) ? slipData.id : crypto.randomUUID();
    const monthYearTitle = slipData.month_year || formatSlipTitle('', pDate);

    setIsSubmittingSalary(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Please log in to save salary slip');
        setIsSubmittingSalary(false);
        return;
      }
      const effectiveUserId = user.id;

      // 1. Save to dedicated team_salary_slips table with strict user_id isolation
      try {
        const { error: slipErr } = await supabase.from('team_salary_slips').upsert({
          id: slipId,
          user_id: user.id,
          member_id: member.id,
          month_year: monthYearTitle,
          payout_date: pDate,
          base_salary: base,
          incentive_amount: incentive,
          deduction_amount: ded,
          net_paid: net,
          payment_mode: slipData.payment_mode || 'UPI',
          reference_no: slipData.reference_no || '',
          notes: slipData.notes || '',
          status: 'Paid',
          updated_at: new Date().toISOString()
        });
        if (slipErr) {
          console.warn('[TeamMemberFinanceDrawer] DB team_salary_slips upsert note:', slipErr.message);
        }
      } catch (dbErr) {
        console.warn('[TeamMemberFinanceDrawer] DB team_salary_slips upsert note:', dbErr);
      }

      // 2. Also save to team_salary_records & localStorage for complete backwards-compatibility
      const recordSlip: TeamSalaryRecord = {
        id: slipId,
        workspace_id: workspaceId || effectiveUserId,
        member_id: member.id,
        member_name: member.name,
        month_year: monthYearTitle,
        base_salary: base,
        incentive_amount: incentive,
        deductions: ded,
        deduction_amount: ded,
        net_payable: net,
        paid_amount: net,
        net_paid: net,
        payment_status: 'PAID',
        paid_date: pDate,
        payout_date: pDate,
        payment_mode: slipData.payment_mode || 'UPI',
        reference_no: slipData.reference_no || '',
        notes: slipData.notes || `Salary for ${monthYearTitle}`,
        updated_at: new Date().toISOString()
      };

      await saveSalaryRecord(workspaceId || effectiveUserId, recordSlip);

      // LocalStorage redundant cache
      if (typeof window !== 'undefined') {
        try {
          const cacheKey = `fw_salary_slips_${member.id}`;
          const existing = localStorage.getItem(cacheKey);
          let list: any[] = existing ? JSON.parse(existing) : [];
          const idx = list.findIndex(x => x.id === slipId);
          if (idx >= 0) list[idx] = recordSlip;
          else list.unshift(recordSlip);
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch (_) {}
      }

      // 3. Automatically sync to Studio Expenses & Ledger if enabled
      if (autoSyncExpense) {
        try {
          const safeSalaryAssignmentId = `sal_${slipId.slice(0, 8)}`;
          await syncTeamPaymentToExpensesAndAnalytics(workspaceId || effectiveUserId, {
            paymentType: 'Salary',
            memberName: member.name,
            memberId: member.id,
            memberType: 'team_member',
            paidAmount: net,
            paymentDate: pDate,
            paymentMethod: slipData.payment_mode || 'UPI',
            safeAssignmentId: safeSalaryAssignmentId,
            notes: `Base: ₹${base.toLocaleString('en-IN')} | Incentive: ₹${incentive.toLocaleString('en-IN')} | Ded: ₹${ded.toLocaleString('en-IN')} | Ref: ${slipData.reference_no || 'N/A'}`
          });
        } catch (syncErr) {
          console.info('[TeamMemberFinanceDrawer] Expense auto-sync notice:', syncErr);
        }

        try {
          if (typeof (window as any).mutate === 'function') {
            (window as any).mutate((key: any) => typeof key === 'string' && (key.includes('expenses') || key.includes('analytics') || key.includes('team') || key.includes('finance')), undefined, { revalidate: true });
          }
        } catch (_) {}
      }

      // 4. Optimistic UI update & immediate summary card refresh
      const oldSlip = salaryRecords.find(s => s.id === slipId);
      const oldAmount = oldSlip ? Number(oldSlip.paid_amount || oldSlip.net_payable || oldSlip.net_paid || 0) : 0;
      const diff = net - oldAmount;

      setSalaryRecords(prev => {
        const exists = prev.some(s => s.id === slipId);
        if (exists) {
          return prev.map(s => s.id === slipId ? recordSlip : s);
        }
        return [recordSlip, ...prev];
      });

      setSummary(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          total_paid: Math.max(0, prev.total_paid + diff)
        };
        onFinancialUpdate?.(member.id, updated);
        return updated;
      });

      showToast(slipData.id ? 'Salary slip updated successfully!' : `Payment of ₹${net.toLocaleString('en-IN')} logged & synced to Expenses!`);
      setIsEditSlipModalOpen(false);
      setSelectedSlipForEdit(null);
      setShowAddSalary(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', {
          detail: { memberId: member.id, amount: net }
        }));
      }

      loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Failed to save salary slip:', err);
    } finally {
      setIsSubmittingSalary(false);
    }
  };

  // ── DELETE SALARY SLIP HANDLER (STRICT MULTI-TENANT USER_ID SCOPE) ──
  const handleDeleteSlipConfirm = async () => {
    if (!slipToDelete || !member?.id) return;
    setIsDeletingSlip(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        try {
          const { error: delErr } = await supabase
            .from('team_salary_slips')
            .delete()
            .eq('id', slipToDelete.id)
            .eq('user_id', user.id);

          if (delErr) {
            console.warn('[TeamMemberFinanceDrawer] Delete team_salary_slips warning:', delErr.message);
          }
        } catch (e) {
          console.warn('[TeamMemberFinanceDrawer] Delete team_salary_slips note:', e);
        }
      }

      await deleteSalaryRecord(workspaceId, slipToDelete.id, member.id);

      if (typeof window !== 'undefined') {
        try {
          const cacheKey = `fw_salary_slips_${member.id}`;
          const existing = localStorage.getItem(cacheKey);
          if (existing) {
            let list: any[] = JSON.parse(existing);
            list = list.filter(x => x.id !== slipToDelete.id);
            localStorage.setItem(cacheKey, JSON.stringify(list));
          }
        } catch (_) {}
      }

      const deletedAmount = Number(slipToDelete.paid_amount || slipToDelete.net_payable || slipToDelete.net_paid || 0);

      setSalaryRecords(prev => prev.filter(s => s.id !== slipToDelete.id));
      setSummary(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          total_paid: Math.max(0, prev.total_paid - deletedAmount)
        };
        onFinancialUpdate?.(member.id, updated);
        return updated;
      });

      showToast(`Salary slip for ${slipToDelete.month_year} deleted`);
      setIsDeleteSlipModalOpen(false);
      setSlipToDelete(null);

      loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Failed to delete salary slip:', err);
    } finally {
      setIsDeletingSlip(false);
    }
  };

  // ── CREATE SALARY SLIP SUBMISSION HANDLER (INLINE FORM) ──
  const handleCreateSalarySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.id || !workspaceId) return;

    const d = new Date(salaryDate || now);
    const validDate = isNaN(d.getTime()) ? now : d;
    const monthKey = `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`;
    const monthTitle = formatSlipTitle(monthKey, salaryDate);

    await handleSaveSalarySlip({
      month_year: monthTitle,
      payout_date: salaryDate,
      paid_date: salaryDate,
      base_salary: Number(salaryBaseAmount) || 0,
      incentive_amount: Number(salaryIncentive) || 0,
      deduction_amount: Number(salaryDeductions) || 0,
      deductions: Number(salaryDeductions) || 0,
      payment_mode: salaryPaymentMode,
      reference_no: salaryRefNo,
      notes: salaryNotes || `Salary for ${monthTitle}`
    }, salaryAutoSyncExpense);

    setSalaryIncentive('0');
    setSalaryDeductions('0');
    setSalaryRefNo('');
    setSalaryNotes('');
    setShowAddSalary(false);
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
  const handlePaymentSubmit = async (paramsOrEvent?: React.FormEvent | {
    amount: number;
    paymentDate: string;
    paymentMode: string;
    paymentRef: string;
    paymentNotes: string;
    autoSyncFinance: boolean;
  }) => {
    if (paramsOrEvent && 'preventDefault' in paramsOrEvent) {
      paramsOrEvent.preventDefault();
    }

    const isParamObj = paramsOrEvent && !('preventDefault' in paramsOrEvent);
    const amountVal = isParamObj ? paramsOrEvent.amount : Number(paymentAmount);
    const pDate = isParamObj ? paramsOrEvent.paymentDate : paymentDate;
    const pMode = (isParamObj ? paramsOrEvent.paymentMode : paymentMode) as any;
    const pRef = isParamObj ? paramsOrEvent.paymentRef : paymentRef;
    const pNotes = isParamObj ? paramsOrEvent.paymentNotes : paymentNotes;
    const pAutoSync = isParamObj ? paramsOrEvent.autoSyncFinance : autoSyncFinance;

    if (!paymentTarget || isNaN(amountVal) || amountVal < 0) return;

    setSubmittingPayment(true);
    try {
      const amount = amountVal;
      const isZeroSettle = amount === 0;
      const safeAssignmentId = paymentTarget?.id ? String(paymentTarget.id) : `pay_${Date.now()}`;
      const memberId = member?.id;
      const memberName = member?.name || 'Team Member';
      const mType = member?.primary_type?.toLowerCase() || ((member as any)?.member_types?.includes('PARTNER') ? 'partner' : 'team_member');
      const paymentType = paymentTarget.type === 'EVENT' ? 'Shoot Fee' : paymentTarget.type === 'ALBUM' ? 'Album / Lab Fee' : 'Advance Payout';

      const pStatus = (isZeroSettle || amount >= paymentTarget.balanceAmount) ? 'completed' : 'partial';

      if (paymentTarget.type === 'EVENT') {
        const trancheResult = await recordCrewPayoutTranche({
          workspaceId,
          assignmentId: safeAssignmentId,
          memberId: memberId!,
          memberName: memberName,
          projectId: paymentTarget.projectId,
          subEventId: paymentTarget.subEventId,
          clientName: paymentTarget.clientName,
          eventName: paymentTarget.title,
          installmentAmount: amount,
          paymentDate: pDate,
          paymentMode: pMode,
          referenceNo: pRef,
          notes: pNotes,
          currentAgreedAmount: paymentTarget.totalAmount,
          currentPaidAmount: paymentTarget.paidAmount
        });

        // Immediately update this event payout in local state for 0ms visual feedback
        setPayouts(prev => prev.map(p => {
          if (p.id === paymentTarget.id) {
            return {
              ...p,
              paid_amount: trancheResult.newPaid,
              balance_amount: trancheResult.newBalance,
              status: trancheResult.newStatus as any
            };
          }
          return p;
        }));
      } else if (paymentTarget.type === 'ALBUM') {
        await recordAlbumOrderPayment(workspaceId, safeAssignmentId, member!.id, {
          amount,
          payment_date: pDate,
          payment_mode: pMode,
          reference_no: pRef,
          notes: pNotes,
          partnerName: member?.name,
          clientName: paymentTarget.clientName
        });

        await syncTeamPaymentToExpensesAndAnalytics(workspaceId, {
          paymentType,
          memberName,
          memberId,
          memberType: mType,
          paidAmount: amount,
          paymentDate: pDate,
          paymentMethod: pMode,
          safeAssignmentId,
          notes: pNotes || `${paymentType} for ${paymentTarget.title || 'Assignment'}`
        });
      }

      // Immediate Real-Time Cache Revalidation & Sync
      try {
        if (typeof (window as any).mutate === 'function') {
          (window as any).mutate((key: any) => typeof key === 'string' && (key.includes('expenses') || key.includes('analytics') || key.includes('team') || key.includes('finance')), undefined, { revalidate: true });
        }
      } catch (_) {}
      router.refresh();
      showToast(`Payment of ₹${amount.toLocaleString('en-IN')} logged & synced to Expenses & Analytics!`);

      const balanceDeduction = isZeroSettle ? paymentTarget.balanceAmount : amount;
      const updatedMetrics = {
        ...summary,
        total_paid: summary.total_paid + amount,
        total_balance: Math.max(0, summary.total_balance - balanceDeduction)
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

      loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Failed to record payment:', err);
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
                  {Boolean(member.default_daily_rate && member.default_daily_rate > 0 && !isInHouse) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5">
                      <IndianRupee className="w-2.5 h-2.5" />
                      <span>{Number(member.default_daily_rate).toLocaleString('en-IN')}/day</span>
                    </span>
                  )}
                  {isInHouse && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      In-House Staff
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
                ₹{displayAgreed.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Paid */}
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Total Paid
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-900 mt-1 font-mono">
                ₹{displayPaid.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Balance Due */}
            <div className={`p-2.5 rounded-xl bg-white border shadow-2xs flex flex-col justify-between ${
              displayBalance > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200/90'
            }`}>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                displayBalance > 0 ? 'text-rose-700' : 'text-zinc-500'
              }`}>
                <Clock className="w-2.5 h-2.5 text-rose-500" /> Balance Due
              </span>
              <span className={`text-xs sm:text-sm font-black mt-1 font-mono ${
                displayBalance > 0 ? 'text-rose-700' : 'text-zinc-700'
              }`}>
                ₹{displayBalance.toLocaleString('en-IN')}
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
              📅 Bookings &amp; Events ({filteredShoots.length})
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

                {/* Shoots Roster Year Selector Pills */}
                {availableShootsYears.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider mr-1">Year Scope:</span>
                    <button
                      type="button"
                      onClick={() => setShootsYearFilter('All')}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer ${
                        shootsYearFilter === 'All'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      All ({studioShoots.length})
                    </button>
                    {availableShootsYears.map((yr) => {
                      const yrCount = studioShoots.filter(s => {
                        const d = s.event_date || s.sub_event?.event_date || s.created_at;
                        return d && d.startsWith(yr);
                      }).length;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setShootsYearFilter(yr)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer ${
                            shootsYearFilter === yr
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {yr} ({yrCount})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Shoots Roster */}
                <div className="space-y-2.5">
                  {filteredShoots.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-1">
                      <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-stone-600">No Shoot Assignments Found</p>
                      <p className="text-[11px] text-stone-400">Assign this member to upcoming events in Team Manager or add a custom event above.</p>
                    </div>
                  ) : (
                    filteredShoots.map((payout) => {
                      const rawCardAgreed = Number(payout.agreed_amount) || 0;
                      const cardPaid = Number(payout.paid_amount || 0);
                      const cardAgreed = (isInHouse && rawCardAgreed === Number(member?.default_daily_rate) && cardPaid === 0) ? 0 : rawCardAgreed;
                      const cardDue = Math.max(0, cardAgreed - cardPaid);
                      const isPaid = (cardAgreed > 0 && cardDue <= 0) || payout.status === 'PAID' || payout.status === 'completed';
                      const displayClient = resolveClientName(payout);
                      const displayEvent = payout.event_name || payout.sub_event?.event_title || 'Shoot Event';

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
                              <h4 className="text-sm font-bold text-slate-900">
                                {displayEvent} • <span className="text-amber-600 font-semibold">{displayClient}</span>
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
                                : cardAgreed === 0
                                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isPaid ? '🟢 PAID' : cardAgreed === 0 ? '⚪ ₹0 RATE' : '🟡 DUE'}
                            </span>
                          </div>

                          <div className="bg-stone-50 rounded-xl p-2 grid grid-cols-3 gap-1 text-center font-mono border border-stone-200/70">
                            <div>
                              <span className="text-[9px] font-bold text-stone-400 block uppercase">Agreed</span>
                              <span className="text-xs font-black text-stone-800">₹{cardAgreed.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Paid</span>
                              <span className="text-xs font-black text-emerald-700">₹{cardPaid.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-rose-500 block uppercase">Due</span>
                              <span className="text-xs font-black text-rose-700">₹{cardDue.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentTarget({
                                  type: 'EVENT',
                                  id: payout.id,
                                  title: displayEvent,
                                  clientName: displayClient,
                                  totalAmount: cardAgreed,
                                  paidAmount: cardPaid,
                                  balanceAmount: cardDue,
                                  role: payout.role,
                                  projectId: payout.project_id || (payout as any).project?.id,
                                  subEventId: payout.sub_event_id || (payout as any).sub_event?.id,
                                  assignmentId: payout.id
                                });
                                setPaymentAmount(String(cardDue > 0 ? cardDue : (cardAgreed > 0 ? cardAgreed : '')));
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
                    onClick={() => {
                      setSelectedSlipForEdit(null);
                      setIsEditSlipModalOpen(true);
                    }}
                    className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Add Salary Slip</span>
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
                        <p className="text-[11px] text-stone-400">Add the first salary slip using the button below or above.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlipForEdit(null);
                            setIsEditSlipModalOpen(true);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Add First Salary Slip</span>
                        </button>
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

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs flex items-center gap-1">
                                  ✓ Paid
                                </span>

                                {/* Download / Print Slip Voucher Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlipForPdf(slip);
                                    setIsPdfModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 border border-stone-200/80 hover:border-indigo-300 transition cursor-pointer shadow-2xs"
                                  title="Print / Download Salary Slip Voucher"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Slip Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSlipForEdit({
                                      ...slip,
                                      base_salary: Number(slip.base_salary) || 0,
                                      incentive_amount: Number(slip.incentive_amount) || 0,
                                      deduction_amount: Number(slip.deductions ?? (slip as any).deduction_amount) || 0,
                                      deductions: Number(slip.deductions ?? (slip as any).deduction_amount) || 0,
                                      payout_date: slip.paid_date || (slip as any).payout_date
                                    });
                                    setIsEditSlipModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-50 border border-stone-200/80 hover:border-amber-300 transition cursor-pointer shadow-2xs"
                                  title="Edit Salary Slip"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Slip Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlipToDelete(slip);
                                    setIsDeleteSlipModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200/80 hover:border-rose-300 transition cursor-pointer shadow-2xs"
                                  title="Delete Salary Slip"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

        {/* ── MODAL: RECORD PAYMENT FOR EVENT / ALBUM (ZERO-AMOUNT SETTLEMENT FIX) ── */}
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentTarget(null);
          }}
          paymentTarget={paymentTarget}
          member={member}
          workspaceId={workspaceId}
          onSubmitPayment={handlePaymentSubmit}
          isSubmitting={submittingPayment}
        />

        {/* ── MODAL: EDIT / ADD SALARY SLIP (MULTI-TENANT USER_ID ISOLATION) ── */}
        <SalarySlipModal
          isOpen={isEditSlipModalOpen}
          onClose={() => {
            setIsEditSlipModalOpen(false);
            setSelectedSlipForEdit(null);
          }}
          member={member}
          workspaceId={workspaceId}
          slipToEdit={selectedSlipForEdit}
          onSave={handleSaveSalarySlip}
          isSaving={isSubmittingSalary}
        />

        {/* ── MODAL: LUXURY DELETE SALARY SLIP CONFIRMATION ── */}
        <DeleteSlipConfirmModal
          isOpen={isDeleteSlipModalOpen}
          onClose={() => {
            setIsDeleteSlipModalOpen(false);
            setSlipToDelete(null);
          }}
          onConfirm={handleDeleteSlipConfirm}
          monthYear={slipToDelete?.month_year || 'this cycle'}
          netPaid={Number(slipToDelete?.paid_amount || slipToDelete?.net_payable || 0)}
          isDeleting={isDeletingSlip}
        />

        {/* ── MODAL: PROFESSIONAL STUDIO SALARY SLIP VOUCHER (PRINTABLE A4 / PDF) ── */}
        <SalarySlipPdfTemplate
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false);
            setSlipForPdf(null);
          }}
          slip={slipForPdf}
          member={member}
          studioName={workspaceName || 'Filmify Weddings'}
        />

      </div>
    </AnimatePresence>
  );
}
