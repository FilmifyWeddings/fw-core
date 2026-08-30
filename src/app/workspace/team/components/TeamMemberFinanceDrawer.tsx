"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, IndianRupee, Calendar, CreditCard, Plus, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Edit3, Trash2, Sparkles, Building2, 
  User, Check, FileText, Send, Layers, Wallet, TrendingUp, History,
  Receipt, ArrowUpRight, ShieldCheck, CheckCheck, RefreshCw, SlidersHorizontal
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
  fetchMemberFinancialSummary 
} from '@/lib/team-finance-sync';

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
  } | null;
}

export default function TeamMemberFinanceDrawer({
  isOpen,
  onClose,
  workspaceId,
  member
}: TeamMemberFinanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'transactions'>('ledger');
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
    pending_events_count: 0
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
  const [newEventName, setNewEventName] = useState('Wedding & Sangeet');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventRole, setNewEventRole] = useState(member?.primary_role || 'Candid Photographer');
  const [newEventAgreedAmount, setNewEventAgreedAmount] = useState('');

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
  const isLab = memberType.includes('LAB') || memberType.includes('ALBUM');
  const isInHouse = memberType.includes('HOUSE') || memberType.includes('STAFF');

  // Load Member Financial Data
  const loadData = useCallback(async () => {
    if (!member?.id || !workspaceId) return;
    setLoading(true);
    try {
      if (isLab) {
        const orders = await fetchPartnerAlbumOrders(workspaceId, member.id);
        setAlbumOrders(orders);
      } else if (isInHouse) {
        const salaries = await fetchMemberSalaryRecords(workspaceId, member.id);
        setSalaryRecords(salaries);
      } else {
        const eventPayouts = await fetchMemberEventPayouts(workspaceId, member.id);
        setPayouts(eventPayouts);
      }

      const sum = await fetchMemberFinancialSummary(workspaceId, member.id, memberType);
      setSummary(sum);
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, member, memberType, isLab, isInHouse]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Handle Record Payment Submit
  const handleRecordPaymentSubmit = async () => {
    if (!paymentTarget || !paymentAmount || Number(paymentAmount) <= 0) return;
    setSubmittingPayment(true);
    try {
      const amount = Number(paymentAmount);

      if (paymentTarget.type === 'EVENT') {
        await recordPayoutTransaction(workspaceId, paymentTarget.id, member!.id, {
          amount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_no: paymentRef,
          notes: paymentNotes,
          autoCreateExpense: autoSyncFinance,
          memberName: member?.name,
          clientName: paymentTarget.clientName,
          eventName: paymentTarget.title
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

      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      await loadData();
    } catch (err) {
      console.error('[TeamMemberFinanceDrawer] Payment error:', err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* 3D Slide-over Panel (Light Yellow & Cream Studio Luxury) */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-2xl bg-[#FEFDF8] border-l-2 border-amber-200/90 shadow-2xl flex flex-col h-full z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b-2 border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 text-white font-black text-base flex items-center justify-center shadow-md">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  member.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-amber-950">{member.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    {isLab ? 'Album / Lab Partner' : isInHouse ? 'In-House Team' : 'Freelancer Crew'}
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-800/80 mt-0.5 flex items-center gap-2">
                  <span>{member.primary_role || 'Operations'}</span>
                  {member.phone && <span>• {member.phone}</span>}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-200 text-amber-900 cursor-pointer shadow-xs transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3D Financial Summary Cards at Top */}
          <div className="p-4 sm:p-6 grid grid-cols-3 gap-2.5 sm:gap-3 bg-amber-50/40 border-b border-amber-200/80">
            {/* Total Agreed / Earned */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border-2 border-amber-200/90 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-amber-600" /> Total Contracted
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 mt-1 font-mono">
                ₹{summary.total_agreed.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Paid */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border-2 border-emerald-200/90 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Total Paid
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-900 mt-1 font-mono">
                ₹{summary.total_paid.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Balance Pending */}
            <div className={`p-3 sm:p-3.5 rounded-2xl bg-white border-2 shadow-sm flex flex-col justify-between ${
              summary.total_balance > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200/90'
            }`}>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-500'
              }`}>
                <Clock className="w-3 h-3 text-amber-600" /> Balance Due
              </span>
              <span className={`text-sm sm:text-base font-black mt-1 font-mono ${
                summary.total_balance > 0 ? 'text-rose-700' : 'text-zinc-700'
              }`}>
                ₹{summary.total_balance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* ── CASE 1: FREELANCER EVENT-WISE PAYOUTS ──────────────── */}
            {isFreelancer && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Assigned Events & Compensation</span>
                    </h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                      Event assignments from Team Manager with agreed fee and payment tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEventOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event Payout</span>
                  </button>
                </div>

                {/* Add Event Form (Inline Toggle) */}
                {isAddEventOpen && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                      <span className="text-xs font-black text-amber-950">Add Custom Event Assignment</span>
                      <button type="button" onClick={() => setIsAddEventOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Client Name (e.g. Rahul & Sneha)"
                        value={newEventClient}
                        onChange={e => setNewEventClient(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Event / Function (e.g. Sangeet & Reception)"
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
                  {payouts.length === 0 ? (
                    <div className="p-8 text-center bg-white border-2 border-dashed border-amber-200/90 rounded-2xl text-zinc-400 text-xs font-medium">
                      No event payouts found. Assign this member to an event in Team Manager or click "+ Add Event Payout" above.
                    </div>
                  ) : (
                    payouts.map(payout => (
                      <div
                        key={payout.id}
                        className="p-4 rounded-2xl bg-white border-2 border-amber-200/90 shadow-[0_4px_16px_-4px_rgba(217,119,6,0.06)] hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-100 pb-2.5">
                          <div>
                            <span className="text-xs font-black text-amber-950 block">{payout.client_name}</span>
                            <span className="text-[11px] font-bold text-amber-800/80">{payout.event_name} • {payout.role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                              {payout.event_date}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              payout.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : payout.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {payout.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center bg-[#FEFDF8] p-2.5 rounded-xl border border-amber-200/70">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Agreed Fee</span>
                            <span className="text-xs font-black text-amber-950 font-mono">₹{Number(payout.agreed_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Paid</span>
                            <span className="text-xs font-black text-emerald-700 font-mono">₹{Number(payout.paid_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-rose-600 block">Balance</span>
                            <span className="text-xs font-black text-rose-700 font-mono">₹{Number(payout.balance_amount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {payout.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTarget({
                                type: 'EVENT',
                                id: payout.id,
                                title: payout.event_name,
                                clientName: payout.client_name,
                                totalAmount: Number(payout.agreed_amount),
                                balanceAmount: Number(payout.balance_amount)
                              });
                              setPaymentAmount(String(payout.balance_amount));
                              setIsPaymentModalOpen(true);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment (Pay Advance / Settlement)</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── CASE 2: LAB / ALBUM PRINTING ORDERS ────────────────── */}
            {isLab && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Client Album Printing Orders</span>
                    </h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                      Track album printing by client, sheet count, and printing charges.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddAlbumOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Album Order</span>
                  </button>
                </div>

                {/* Add Album Form */}
                {isAddAlbumOpen && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                      <span className="text-xs font-black text-amber-950">Add Album Printing Order</span>
                      <button type="button" onClick={() => setIsAddAlbumOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Client Name (e.g. Anand & Pooja)"
                        value={newAlbumClient}
                        onChange={e => setNewAlbumClient(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Album Type (e.g. Velvet Leather Box 12x36)"
                        value={newAlbumType}
                        onChange={e => setNewAlbumType(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Sheet Count (e.g. 40)"
                        value={newAlbumSheets}
                        onChange={e => setNewAlbumSheets(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Rate Per Sheet (₹)"
                        value={newAlbumRate}
                        onChange={e => setNewAlbumRate(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (newAlbumClient && newAlbumSheets && newAlbumRate) {
                          await savePartnerAlbumOrder(workspaceId, {
                            partner_id: member.id,
                            partner_name: member.name,
                            client_name: newAlbumClient,
                            album_type: newAlbumType,
                            sheet_count: Number(newAlbumSheets),
                            rate_per_sheet: Number(newAlbumRate)
                          });
                          setIsAddAlbumOpen(false);
                          setNewAlbumClient('');
                          loadData();
                        }
                      }}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Album Order
                    </button>
                  </div>
                )}

                {/* Album Orders List */}
                <div className="space-y-3">
                  {albumOrders.length === 0 ? (
                    <div className="p-8 text-center bg-white border-2 border-dashed border-amber-200/90 rounded-2xl text-zinc-400 text-xs font-medium">
                      No album printing orders recorded for this lab partner.
                    </div>
                  ) : (
                    albumOrders.map(order => (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-white border-2 border-amber-200/90 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                          <div>
                            <span className="text-xs font-black text-amber-950 block">{order.client_name}</span>
                            <span className="text-[11px] font-bold text-zinc-600">{order.album_type} ({order.sheet_count} Sheets @ ₹{order.rate_per_sheet}/sheet)</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            order.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {order.payment_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center bg-[#FEFDF8] p-2.5 rounded-xl border border-amber-200/70">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 block">Total Cost</span>
                            <span className="text-xs font-black text-amber-950 font-mono">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 block">Paid</span>
                            <span className="text-xs font-black text-emerald-700 font-mono">₹{Number(order.paid_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-rose-600 block">Balance</span>
                            <span className="text-xs font-black text-rose-700 font-mono">₹{Number(order.balance_amount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {order.payment_status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTarget({
                                type: 'ALBUM',
                                id: order.id,
                                title: `${order.album_type} (${order.sheet_count} sheets)`,
                                clientName: order.client_name,
                                totalAmount: Number(order.total_amount),
                                balanceAmount: Number(order.balance_amount)
                              });
                              setPaymentAmount(String(order.balance_amount));
                              setIsPaymentModalOpen(true);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Printing Payment</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── CASE 3: IN-HOUSE TEAM MONTHLY SALARY ──────────────── */}
            {isInHouse && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>Monthly Payroll & Performance Incentives</span>
                    </h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                      Base salary, performance bonuses, and monthly disbursements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSalaryOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Month Payroll</span>
                  </button>
                </div>

                {/* Add Salary Form */}
                {isAddSalaryOpen && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                      <span className="text-xs font-black text-amber-950">Add Month Payroll Breakdown</span>
                      <button type="button" onClick={() => setIsAddSalaryOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="month"
                        value={newSalaryMonth}
                        onChange={e => setNewSalaryMonth(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Base Salary (₹)"
                        value={newSalaryBase}
                        onChange={e => setNewSalaryBase(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Incentive / Bonus (₹)"
                        value={newSalaryIncentive}
                        onChange={e => setNewSalaryIncentive(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Deductions / Advance (₹)"
                        value={newSalaryDeductions}
                        onChange={e => setNewSalaryDeductions(e.target.value)}
                        className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (newSalaryMonth && newSalaryBase) {
                          await saveSalaryRecord(workspaceId, {
                            member_id: member.id,
                            member_name: member.name,
                            month_year: newSalaryMonth,
                            base_salary: Number(newSalaryBase),
                            incentive_amount: Number(newSalaryIncentive || 0),
                            deductions: Number(newSalaryDeductions || 0)
                          });
                          setIsAddSalaryOpen(false);
                          loadData();
                        }
                      }}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Payroll Record
                    </button>
                  </div>
                )}

                {/* Salary Records List */}
                <div className="space-y-3">
                  {salaryRecords.length === 0 ? (
                    <div className="p-8 text-center bg-white border-2 border-dashed border-amber-200/90 rounded-2xl text-zinc-400 text-xs font-medium">
                      No monthly payroll records found. Click "+ Add Month Payroll" to generate salary.
                    </div>
                  ) : (
                    salaryRecords.map(sal => (
                      <div
                        key={sal.id}
                        className="p-4 rounded-2xl bg-white border-2 border-amber-200/90 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                          <span className="text-xs font-black text-amber-950 uppercase">{sal.month_year} Payroll</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            sal.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {sal.payment_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center bg-[#FEFDF8] p-2.5 rounded-xl border border-amber-200/70 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-400 block">Base</span>
                            <span className="font-bold text-zinc-800 font-mono">₹{sal.base_salary.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-emerald-600 block">+ Incentive</span>
                            <span className="font-bold text-emerald-700 font-mono">₹{sal.incentive_amount.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-rose-600 block">- Deductions</span>
                            <span className="font-bold text-rose-700 font-mono">₹{sal.deductions.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-amber-950 block">Net Payable</span>
                            <span className="font-black text-amber-950 font-mono">₹{sal.net_payable.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {sal.payment_status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTarget({
                                type: 'SALARY',
                                id: sal.id,
                                title: `${sal.month_year} Month Salary`,
                                totalAmount: Number(sal.net_payable),
                                balanceAmount: Number(sal.net_payable)
                              });
                              setPaymentAmount(String(sal.net_payable));
                              setIsPaymentModalOpen(true);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Disburse Monthly Salary</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── RECORD PAYMENT MODAL ────────────────────────────────────── */}
          {isPaymentModalOpen && paymentTarget && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-md bg-[#FEFDF8] border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Record Payment Disbursement</span>
                    </h3>
                    <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                      {paymentTarget.clientName ? `${paymentTarget.clientName} • ` : ''}{paymentTarget.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                      Payment Amount (₹)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-xs text-amber-700">₹</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950">Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={e => setPaymentMode(e.target.value as any)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
                      >
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950">Payment Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950">Reference / UTR / Cheque No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-928374829103 or Cash handed over"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                    />
                  </div>

                  {/* Auto Sync Toggle */}
                  <label className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-black text-amber-950">Sync to Finance Expenses</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSyncFinance}
                      onChange={e => setAutoSyncFinance(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex gap-2 pt-2 border-t border-amber-200/80">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingPayment}
                    onClick={handleRecordPaymentSubmit}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submittingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm & Pay</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
