"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, IndianRupee, Calendar, CreditCard, Plus, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Edit3, Trash2, Sparkles, Building2, 
  User, Check, FileText, Send, Layers, Wallet, TrendingUp, History,
  Receipt, ArrowUpRight, ShieldCheck, CheckCheck, RefreshCw, SlidersHorizontal,
  Phone, Mail, BarChart3, BookOpen, MapPin
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
  fetchMemberFinancialSummary 
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
  } | null;
}

export default function TeamMemberFinanceDrawer({
  isOpen,
  onClose,
  workspaceId,
  member
}: TeamMemberFinanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'monthly'>('ledger');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [payouts, setPayouts] = useState<TeamEventPayout[]>([]);
  const [albumOrders, setAlbumOrders] = useState<PartnerAlbumOrder[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<TeamSalaryRecord[]>([]);
  const [summary, setSummary] = useState<TeamFinancialSummary>({
    member_id: '',
    total_agreed: 0,
    total_paid: 0,
    total_balance: 0,
    active_events_count: 0,
    paid_events_count: 0,
    pending_events_count: 0,
    monthly_breakdown: []
  });

  // Modal States
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

  // Manual Add Modal for Freelancer Event
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventClient, setNewEventClient] = useState('');
  const [newEventName, setNewEventName] = useState('Wedding Shoot');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventRole, setNewEventRole] = useState(member?.primary_role || 'Photographer');
  const [newEventAgreedAmount, setNewEventAgreedAmount] = useState(member?.default_daily_rate ? String(member.default_daily_rate) : '');

  // Manual Add Modal for Album Order
  const [isAddAlbumOpen, setIsAddAlbumOpen] = useState(false);
  const [newAlbumClient, setNewAlbumClient] = useState('');
  const [newAlbumType, setNewAlbumType] = useState('Luxury Photobook (12x36)');
  const [newAlbumSheets, setNewAlbumSheets] = useState('35');
  const [newAlbumRate, setNewAlbumRate] = useState('300');

  // Manual Add Modal for In-House Salary
  const [isAddSalaryOpen, setIsAddSalaryOpen] = useState(false);
  const [newSalaryMonth, setNewSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [newSalaryBase, setNewSalaryBase] = useState('35000');
  const [newSalaryIncentive, setNewSalaryIncentive] = useState('5000');
  const [newSalaryDeductions, setNewSalaryDeductions] = useState('0');

  // Member Type Normalization
  const memberType = (member?.primary_type || 'FREELANCER').toUpperCase();
  const isFreelancer = !memberType.includes('LAB') && !memberType.includes('HOUSE') && !memberType.includes('STAFF');
  const isLab = memberType.includes('LAB') || memberType.includes('ALBUM') || memberType.includes('PARTNER');
  const isInHouse = memberType.includes('HOUSE') || memberType.includes('STAFF');

  // Load Member Financial Data
  const loadData = useCallback(async () => {
    if (!member?.id || !workspaceId) return;
    setLoading(true);
    try {
      // 1. ALWAYS load event payouts for all team members (assigned shoots from Team Manager)
      let eventPayouts = await fetchMemberEventPayouts(workspaceId, member.id);

      // 2. Direct Fallback query from fw_crew_assignments / fw_assignments & fw_sub_events
      if (!eventPayouts || eventPayouts.length === 0) {
        try {
          let rawData: any[] | null = null;
          
          // A. Try fw_crew_assignments table / view with workspace_id filter
          try {
            const { data: crewData } = await supabase
              .from('fw_crew_assignments')
              .select('*, fw_sub_events(*)')
              .eq('member_id', member.id)
              .eq('workspace_id', workspaceId);

            if (crewData && crewData.length > 0) {
              rawData = crewData.map((c: any) => ({
                id: c.id,
                required_role: c.role || c.required_role || 'Crew',
                assigned_member_id: c.member_id || member.id,
                agreed_amount: c.agreed_fee || c.agreed_amount || c.rate || 0,
                advance_amount: c.advance_amount || c.paid_amount || 0,
                paid_amount: c.paid_amount || c.advance_amount || 0,
                balance_amount: c.balance_amount || 0,
                payment_status: c.payment_status || 'PENDING',
                sub_event_id: c.sub_event_id,
                workspace_id: c.workspace_id,
                created_at: c.created_at,
                updated_at: c.updated_at,
                fw_sub_events: c.fw_sub_events
              }));
            }
          } catch (_) {}

          // B. Fallback to fw_assignments table with workspace isolation
          if (!rawData || rawData.length === 0) {
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
                  client_name,
                  couple_name
                )
              `)
              .eq('assigned_member_id', member.id);

            if (assignmentsData && assignmentsData.length > 0) {
              rawData = assignmentsData.filter((a: any) => !a.workspace_id || a.workspace_id === workspaceId);
            }
          }

          if (rawData && rawData.length > 0) {
            const fallbackPayouts: TeamEventPayout[] = rawData.map((a: any) => {
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
                client_name: se?.couple_name || se?.client_name || 'Wedding Shoot',
                event_name: se?.event_title || a.required_role || 'Shoot Event',
                event_date: se?.event_date || new Date().toISOString().split('T')[0],
                role: a.required_role || member.primary_role || 'Crew',
                agreed_amount: agreed,
                paid_amount: paid,
                balance_amount: bal,
                status: pStatus as any,
                payment_method: 'UPI / Bank Transfer',
                venue: se?.venue || se?.location || '',
                start_time: se?.start_time || '',
                end_time: se?.end_time || '',
                created_at: a.created_at || new Date().toISOString(),
                updated_at: a.updated_at || new Date().toISOString()
              };
            });
            eventPayouts = fallbackPayouts;
          }
        } catch (fbErr) {
          console.warn('[TeamMemberFinanceDrawer] Direct assignments fallback note:', fbErr);
        }
      }

      setPayouts(eventPayouts || []);

      // 3. Also load partner album orders if lab
      if (isLab) {
        const orders = await fetchPartnerAlbumOrders(workspaceId, member.id);
        setAlbumOrders(orders);
      }

      // 4. Also load salary records if in-house
      if (isInHouse) {
        const salaries = await fetchMemberSalaryRecords(workspaceId, member.id);
        setSalaryRecords(salaries);
      }

      const sum = await fetchMemberFinancialSummary(workspaceId, member.id, memberType);

      // Dynamically calculate accurate summary totals from real eventPayouts
      if (eventPayouts && eventPayouts.length > 0) {
        const eventAgreed = eventPayouts.reduce((a, b) => a + Number(b.agreed_amount || 0), 0);
        const eventPaid = eventPayouts.reduce((a, b) => a + Number(b.paid_amount || 0), 0);
        setSummary({
          ...sum,
          total_agreed: eventAgreed,
          total_paid: eventPaid,
          total_balance: Math.max(0, eventAgreed - eventPaid),
          active_events_count: eventPayouts.length,
          paid_events_count: eventPayouts.filter(p => p.status === 'PAID' || p.status === 'completed').length,
          pending_events_count: eventPayouts.filter(p => p.status !== 'PAID' && p.status !== 'completed').length
        });
      } else {
        setSummary(sum);
      }
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, member, memberType, isLab, isInHouse]);

  // Track active member ID to prevent stale data flash
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && member?.id) {
      if (member.id !== activeMemberId) {
        setActiveMemberId(member.id);
        setPayouts([]);
        setAlbumOrders([]);
        setSalaryRecords([]);
        setSummary({
          member_id: member.id,
          total_agreed: 0,
          total_paid: 0,
          total_balance: 0,
          active_events_count: 0,
          paid_events_count: 0,
          pending_events_count: 0,
          monthly_breakdown: []
        });
        setLoading(true);
      }
      loadData();
      if (member?.default_daily_rate) {
        setNewEventAgreedAmount(String(member.default_daily_rate));
      }
    } else if (!isOpen) {
      setActiveMemberId(null);
    }
  }, [isOpen, member?.id, loadData]);

  // Handle Record Payment Submit
  const handleRecordPaymentSubmit = async () => {
    if (!paymentTarget || !paymentAmount || Number(paymentAmount) <= 0) return;
    const amount = Number(paymentAmount);
    setSubmittingPayment(true);

    // 0. Instant Optimistic State Patch (0ms)
    if (paymentTarget.type === 'EVENT') {
      setPayouts(prev => prev.map(p => {
        if (p.id === paymentTarget.id) {
          const prevPaid = Number(p.paid_amount) || 0;
          const newPaid = prevPaid + amount;
          const newBal = Math.max(0, p.agreed_amount - newPaid);
          const newStatus = (p.agreed_amount > 0 && newBal === 0) ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');
          return {
            ...p,
            paid_amount: newPaid,
            balance_amount: newBal,
            status: newStatus
          };
        }
        return p;
      }));

      setSummary(prev => ({
        ...prev,
        total_paid: prev.total_paid + amount,
        total_balance: Math.max(0, prev.total_balance - amount)
      }));
    }

    setIsPaymentModalOpen(false);
    setPaymentTarget(null);
    setPaymentAmount('');
    setPaymentRef('');
    setPaymentNotes('');

    try {
      if (paymentTarget.type === 'EVENT') {
        const previousPaid = (paymentTarget.totalAmount - paymentTarget.balanceAmount) || 0;
        const newAdvanceTotal = previousPaid + amount;
        const isFullyPaid = newAdvanceTotal >= paymentTarget.totalAmount;
        const paymentStatus = isFullyPaid ? 'completed' : 'partial';

        await updateCrewAssignmentPayment(workspaceId, paymentTarget.id, {
          advanceAmount: newAdvanceTotal,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMode,
          paymentDate: paymentDate,
          notes: paymentNotes || paymentRef,
          teamMemberId: member!.id,
          teamMemberName: member?.name,
          clientName: paymentTarget.clientName,
          eventName: paymentTarget.title,
          roleName: paymentTarget.role,
          agreedAmount: paymentTarget.totalAmount
        });

        await recordPayoutTransaction(workspaceId, paymentTarget.id, member!.id, {
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
        await recordAlbumOrderPayment(workspaceId, paymentTarget.id, member!.id, {
          amount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_no: paymentRef,
          notes: paymentNotes,
          partnerName: member?.name,
          clientName: paymentTarget.clientName
        });
      } else if (paymentTarget.type === 'SALARY') {
        await recordSalaryPayment(workspaceId, paymentTarget.id, member!.id, {
          amount,
          paid_date: paymentDate,
          payment_mode: paymentMode,
          reference_no: paymentRef,
          notes: paymentNotes,
          memberName: member?.name,
          monthYear: paymentTarget.title
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', {
          detail: { memberId: member!.id, amount }
        }));
      }

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
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* 3D Slide-Over Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 max-w-2xl w-full bg-[#FAF8F2] shadow-2xl border-l border-amber-200/80 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-zinc-900 to-amber-950 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 overflow-hidden flex items-center justify-center shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-300 font-black text-base">
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-amber-50 truncate">{member.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {member.primary_role || 'Crew Member'}
                  </span>
                  {Boolean(member.default_daily_rate && member.default_daily_rate > 0) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5">
                      <IndianRupee className="w-2.5 h-2.5" />
                      <span>{Number(member.default_daily_rate).toLocaleString('en-IN')}/day</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-amber-200/70 mt-1 flex-wrap">
                  {member.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span>{member.phone}</span>
                    </span>
                  )}
                  {member.email && (
                    <span className="flex items-center gap-1 truncate max-w-[220px]">
                      <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-amber-200/60 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Widgets */}
          <div className="p-4 sm:p-5 grid grid-cols-3 gap-2.5 sm:gap-3 bg-amber-50/60 border-b border-amber-200/80">
            {/* Total Contracted */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-amber-200/90 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-amber-600" /> Total Agreed
              </span>
              {loading ? (
                <div className="h-6 w-20 bg-amber-200/60 rounded-lg animate-pulse mt-1" />
              ) : (
                <span className="text-sm sm:text-base font-black text-amber-950 mt-1 font-mono">
                  ₹{summary.total_agreed.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Total Paid */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-emerald-200/90 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Total Paid
              </span>
              {loading ? (
                <div className="h-6 w-20 bg-emerald-200/60 rounded-lg animate-pulse mt-1" />
              ) : (
                <span className="text-sm sm:text-base font-black text-emerald-900 mt-1 font-mono">
                  ₹{summary.total_paid.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Balance Due */}
            <div className={`p-3.5 rounded-2xl bg-white border-2 shadow-sm flex flex-col justify-between ${
              summary.total_balance > 0 ? 'border-rose-300 bg-rose-50/40' : 'border-amber-200/90'
            }`}>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-500'
              }`}>
                <Clock className="w-3 h-3 text-rose-500" /> Pending Due
              </span>
              {loading ? (
                <div className="h-6 w-20 bg-rose-200/60 rounded-lg animate-pulse mt-1" />
              ) : (
                <span className={`text-sm sm:text-base font-black mt-1 font-mono ${
                  summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-700'
                }`}>
                  ₹{summary.total_balance.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 pt-3 pb-0 flex items-center gap-2 border-b border-amber-200/60 bg-[#FAF8F2]">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'border-amber-600 text-amber-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              📅 Bookings &amp; Events ({payouts.length})
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'monthly'
                  ? 'border-amber-600 text-amber-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              📊 Financial Summary
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {activeTab === 'monthly' ? (
              /* Monthly Breakdown Chart */
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border-2 border-amber-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span>Monthly Financial Distribution</span>
                  </h4>

                  {(!summary.monthly_breakdown || summary.monthly_breakdown.length === 0) ? (
                    <p className="text-xs text-stone-400 py-6 text-center">No monthly payout records to display yet.</p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {summary.monthly_breakdown.map((m) => {
                        const maxVal = Math.max(...(summary.monthly_breakdown || []).map(x => x.agreed || 1), 1);
                        const agreedPct = Math.min(100, Math.round((m.agreed / maxVal) * 100));
                        const paidPct = Math.min(100, Math.round((m.paid / maxVal) * 100));

                        return (
                          <div key={m.month} className="space-y-1.5 p-3 rounded-xl bg-stone-50/80 border border-stone-200">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-amber-950 font-black">{m.month}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-stone-500">Agreed: ₹{m.agreed.toLocaleString('en-IN')}</span>
                                <span className="text-emerald-700 font-black">Paid: ₹{m.paid.toLocaleString('en-IN')}</span>
                                {m.balance > 0 && (
                                  <span className="text-rose-700 font-black">Due: ₹{m.balance.toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </div>
                            <div className="h-2.5 w-full bg-stone-200 rounded-full overflow-hidden flex">
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
            ) : (
              /* Ledger Tab */
              <>
                {/* ── 1. SHOOT BOOKINGS & EVENT-WISE PAYOUTS (FOR ALL MEMBERS) ── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>Shoot Bookings & Payment Ledger</span>
                        </h3>
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                          Event assignments synced from Team Manager with payout status.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddEventOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Custom Event</span>
                      </button>
                    </div>

                    {/* Add Event Form (Inline Toggle) */}
                    {isAddEventOpen && (
                      <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                          <span className="text-xs font-black text-amber-950">Add Custom Shoot Assignment</span>
                          <button type="button" onClick={() => setIsAddEventOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Client / Couple Name"
                            value={newEventClient}
                            onChange={e => setNewEventClient(e.target.value)}
                            className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Event Title (e.g. Wedding & Reception)"
                            value={newEventName}
                            onChange={e => setNewEventName(e.target.value)}
                            className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                          />
                          <input
                            type="date"
                            value={newEventDate}
                            onChange={e => setNewEventDate(e.target.value)}
                            className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Agreed Amount (₹)"
                            value={newEventAgreedAmount}
                            onChange={e => setNewEventAgreedAmount(e.target.value)}
                            className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none font-mono"
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
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                        >
                          Save Event Assignment
                        </button>
                      </div>
                    )}

                    {/* Event Payouts List */}
                    <div className="space-y-3">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="p-4 rounded-3xl bg-white border-2 border-amber-200/60 shadow-xs space-y-3 relative overflow-hidden animate-pulse"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-14 rounded-2xl bg-amber-200/70 shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="h-4 w-36 bg-amber-200/80 rounded-lg" />
                                    <div className="h-4 w-20 bg-amber-100 rounded-full" />
                                  </div>
                                  <div className="h-3 w-48 bg-amber-100/90 rounded-lg" />
                                  <div className="h-4 w-24 bg-amber-200/50 rounded-md" />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100/80">
                                <div className="h-7 bg-amber-100/80 rounded-lg" />
                                <div className="h-7 bg-amber-100/80 rounded-lg" />
                                <div className="h-7 bg-amber-100/80 rounded-lg" />
                              </div>
                              <div className="h-9 bg-amber-200/60 rounded-xl w-full" />
                            </div>
                          ))}
                        </div>
                      ) : payouts.length === 0 ? (
                        <div className="p-8 text-center bg-white border-2 border-dashed border-amber-200/90 rounded-2xl text-zinc-400 text-xs font-medium">
                          No shoot bookings recorded yet for this member. Assign them to a shoot in Team Manager or add a custom payout above.
                        </div>
                      ) : (
                        payouts.map(payout => {
                          const dateObj = payout.event_date ? new Date(payout.event_date) : null;
                          const dayStr = dateObj && !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '--';
                          const monthStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'DATE';

                          const cleanRole = payout.role || 'Crew';
                          const roleShortCode = cleanRole.toLowerCase().includes('candid photo') || cleanRole.toLowerCase().includes('candid')
                            ? 'CP'
                            : cleanRole.toLowerCase().includes('cinemat')
                            ? 'CM'
                            : cleanRole.toLowerCase().includes('traditional photo') || cleanRole.toLowerCase().includes('photo')
                            ? 'TP'
                            : cleanRole.toLowerCase().includes('drone')
                            ? 'DR'
                            : cleanRole.slice(0, 2).toUpperCase();

                          const isPaid = payout.status === 'PAID' || payout.status === 'completed' || (payout.agreed_amount > 0 && payout.balance_amount === 0);
                          const isPartial = !isPaid && (payout.paid_amount > 0 || payout.status === 'PARTIAL' || payout.status === 'partial');

                          return (
                            <div
                              key={payout.id}
                              className="p-4 rounded-3xl bg-white border-2 border-amber-200/90 shadow-[0_4px_20px_-4px_rgba(217,119,6,0.08)] hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                            >
                              {/* Top Main Row */}
                              <div className="flex items-start gap-3">
                                {/* Left Date Pill */}
                                <div className="flex flex-col items-center justify-center w-12 h-14 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-sm shrink-0 border border-amber-400/40">
                                  <span className="text-[10px] font-black uppercase tracking-wider leading-none text-amber-100">{monthStr}</span>
                                  <span className="text-base font-black leading-none mt-0.5">{dayStr}</span>
                                </div>

                                {/* Middle Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <h4 className="text-sm font-black text-amber-950 truncate tracking-tight">{payout.client_name}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : isPartial
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                      {isPaid ? '🟢 Completed' : isPartial ? '🟡 Partial' : '🔴 Pending'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-xs font-bold text-amber-900/90">{payout.event_name}</span>
                                    {payout.venue && (
                                      <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span className="truncate max-w-[130px]">{payout.venue}</span>
                                      </span>
                                    )}
                                    {(payout.start_time || payout.end_time) && (
                                      <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span>{payout.start_time || ''}{payout.end_time ? ` - ${payout.end_time}` : ''}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Role Badge */}
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-100/80 border border-amber-300/80 text-[10px] font-black text-amber-950 flex items-center gap-1">
                                      <span className="bg-amber-600 text-white rounded px-1 text-[9px] font-black">{roleShortCode}</span>
                                      <span>{cleanRole}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Financials Strip */}
                              <div className="grid grid-cols-3 gap-2 text-center bg-[#FEFDF8] p-2.5 rounded-2xl border border-amber-200/80">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Agreed Fee</span>
                                  <span className="text-xs font-black text-amber-950 font-mono">₹{Number(payout.agreed_amount).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Advance / Paid</span>
                                  <span className="text-xs font-black text-emerald-700 font-mono">₹{Number(payout.paid_amount).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase text-rose-600 block">Balance Due</span>
                                  <span className="text-xs font-black text-rose-700 font-mono">₹{Number(payout.balance_amount).toLocaleString('en-IN')}</span>
                                </div>
                              </div>

                              {/* Action: Update Payment Button */}
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
                                className="w-full py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-amber-100" />
                                <span>Update Payment / Settle Payout</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                {/* ── CASE 2: PARTNER ALBUM ORDERS ────────────────────────── */}
                {isLab && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-600" />
                          <span>Album Printing & Binding Orders</span>
                        </h3>
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                          Track photobook printing batches, sheet counts, and vendor settlements.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddAlbumOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ New Album Order</span>
                      </button>
                    </div>

                    {isAddAlbumOpen && (
                      <div className="p-4 rounded-2xl bg-purple-50/90 border-2 border-purple-300 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                          <span className="text-xs font-black text-purple-950">Add Photobook Order</span>
                          <button type="button" onClick={() => setIsAddAlbumOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Client Name"
                            value={newAlbumClient}
                            onChange={e => setNewAlbumClient(e.target.value)}
                            className="p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Album Type (e.g. 12x36 Velvet)"
                            value={newAlbumType}
                            onChange={e => setNewAlbumType(e.target.value)}
                            className="p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Sheet Count"
                            value={newAlbumSheets}
                            onChange={e => setNewAlbumSheets(e.target.value)}
                            className="p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Rate Per Sheet (₹)"
                            value={newAlbumRate}
                            onChange={e => setNewAlbumRate(e.target.value)}
                            className="p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (newAlbumClient) {
                              const total = (Number(newAlbumSheets) || 30) * (Number(newAlbumRate) || 300);
                              await savePartnerAlbumOrder(workspaceId, {
                                partner_id: member.id,
                                partner_name: member.name,
                                client_name: newAlbumClient,
                                album_type: newAlbumType,
                                sheet_count: Number(newAlbumSheets),
                                rate_per_sheet: Number(newAlbumRate),
                                total_amount: total
                              });
                              setIsAddAlbumOpen(false);
                              setNewAlbumClient('');
                              loadData();
                            }
                          }}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs"
                        >
                          Create Album Order
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {albumOrders.length === 0 ? (
                        <div className="p-8 text-center bg-white border-2 border-dashed border-purple-200 rounded-2xl text-zinc-400 text-xs font-medium">
                          No album orders found for this printing partner.
                        </div>
                      ) : (
                        albumOrders.map(order => (
                          <div
                            key={order.id}
                            className="p-4 rounded-2xl bg-white border-2 border-purple-200/80 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                              <div>
                                <span className="text-xs font-black text-purple-950 block">{order.client_name}</span>
                                <span className="text-[11px] font-bold text-purple-800/80">{order.album_type} • {order.sheet_count} Sheets @ ₹{order.rate_per_sheet}/sheet</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                order.payment_status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {order.payment_status}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center bg-[#FAF7FD] p-2.5 rounded-xl border border-purple-200/70">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Total</span>
                                <span className="text-xs font-black text-purple-950 font-mono">₹{order.total_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Paid</span>
                                <span className="text-xs font-black text-emerald-700 font-mono">₹{order.paid_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-rose-600 block">Balance</span>
                                <span className="text-xs font-black text-rose-700 font-mono">₹{order.balance_amount.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {order.payment_status !== 'PAID' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentTarget({
                                    type: 'ALBUM',
                                    id: order.id,
                                    title: order.album_type,
                                    clientName: order.client_name,
                                    totalAmount: order.total_amount,
                                    balanceAmount: order.balance_amount
                                  });
                                  setPaymentAmount(String(order.balance_amount));
                                  setIsPaymentModalOpen(true);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-xs"
                              >
                                Record Partner Settlement
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ── CASE 3: IN-HOUSE TEAM SALARIES ──────────────────────── */}
                {isInHouse && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>Monthly Payroll & Salary Slips</span>
                        </h3>
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                          Base salaries, performance incentives, and monthly payout disbursements.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddSalaryOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Generate Salary Slip</span>
                      </button>
                    </div>

                    {isAddSalaryOpen && (
                      <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                          <span className="text-xs font-black text-emerald-950">New Salary Slip</span>
                          <button type="button" onClick={() => setIsAddSalaryOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="month"
                            value={newSalaryMonth}
                            onChange={e => setNewSalaryMonth(e.target.value)}
                            className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Base Salary (₹)"
                            value={newSalaryBase}
                            onChange={e => setNewSalaryBase(e.target.value)}
                            className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Incentive (₹)"
                            value={newSalaryIncentive}
                            onChange={e => setNewSalaryIncentive(e.target.value)}
                            className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Deductions (₹)"
                            value={newSalaryDeductions}
                            onChange={e => setNewSalaryDeductions(e.target.value)}
                            className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveSalaryRecord(workspaceId, {
                              member_id: member.id,
                              member_name: member.name,
                              month_year: newSalaryMonth,
                              base_salary: Number(newSalaryBase),
                              incentive_amount: Number(newSalaryIncentive),
                              deductions: Number(newSalaryDeductions)
                            });
                            setIsAddSalaryOpen(false);
                            loadData();
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs"
                        >
                          Save Salary Record
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {salaryRecords.length === 0 ? (
                        <div className="p-8 text-center bg-white border-2 border-dashed border-emerald-200 rounded-2xl text-zinc-400 text-xs font-medium">
                          No salary records generated yet.
                        </div>
                      ) : (
                        salaryRecords.map(sal => (
                          <div
                            key={sal.id}
                            className="p-4 rounded-2xl bg-white border-2 border-emerald-200/80 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                              <span className="text-xs font-black text-emerald-950 block">Month: {sal.month_year}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                sal.payment_status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {sal.payment_status}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center bg-[#F7FDF9] p-2.5 rounded-xl border border-emerald-200/70">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Net Payable</span>
                                <span className="text-xs font-black text-emerald-950 font-mono">₹{sal.net_payable.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Paid</span>
                                <span className="text-xs font-black text-emerald-700 font-mono">₹{sal.paid_amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">Status</span>
                                <span className="text-xs font-black text-zinc-700">{sal.payment_status}</span>
                              </div>
                            </div>

                            {sal.payment_status !== 'PAID' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentTarget({
                                    type: 'SALARY',
                                    id: sal.id,
                                    title: sal.month_year,
                                    totalAmount: sal.net_payable,
                                    balanceAmount: sal.net_payable - sal.paid_amount
                                  });
                                  setPaymentAmount(String(sal.net_payable - sal.paid_amount));
                                  setIsPaymentModalOpen(true);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs rounded-xl shadow-xs"
                              >
                                Disburse Salary Payment
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── RECORD PAYMENT SETTLEMENT MODAL ───────────────────────── */}
      {isPaymentModalOpen && paymentTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-200/90 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment Settlement</span>
                </h3>
                <p className="text-[11px] font-bold text-zinc-500">
                  {paymentTarget.clientName ? `${paymentTarget.clientName} • ` : ''}{paymentTarget.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block uppercase">Outstanding Balance</span>
                <span className="text-sm font-black text-emerald-950 font-mono">
                  ₹{paymentTarget.balanceAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentAmount(String(paymentTarget.balanceAmount))}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black cursor-pointer shadow-xs"
              >
                Pay Full Balance
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-zinc-700">
              <div className="space-y-1">
                <label>Payment Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={paymentTarget.balanceAmount}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm font-black text-zinc-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label>Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / IMPS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label>Reference No. / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #423019349"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>

              <div className="space-y-1">
                <label>Notes / Voucher Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared full shoot balance"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>

              {/* 2-Way Sync to Finance Checkbox */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncFinance}
                  onChange={e => setAutoSyncFinance(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-[11px] font-bold text-amber-950">
                  ⚡ Auto-sync transaction directly to Studio Finance &amp; Expenses
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                onClick={handleRecordPaymentSubmit}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {submittingPayment ? 'Processing...' : 'Confirm & Mark Paid'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
