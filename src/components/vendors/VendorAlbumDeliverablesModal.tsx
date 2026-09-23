'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, Calendar, Clock, IndianRupee, 
  CheckCircle2, AlertCircle, Plus, Search, ExternalLink, 
  FileText, MessageSquare, ChevronDown, Check, Download, 
  Printer, ArrowUpRight, ShieldCheck, User, Phone, Mail,
  RefreshCw, CheckSquare, Square, Layers, Edit3, Trash2
} from 'lucide-react';
import { 
  VendorAlbumOrder, 
  fetchVendorAlbumOrders, 
  saveVendorAlbumOrder 
} from '@/lib/services/vendorDeliverablesService';
import AiMicButton from '@/components/AiMicButton';
import VendorStatementInvoicePdfTemplate, { VendorInvoiceItem } from './VendorStatementInvoicePdfTemplate';

interface VendorAlbumDeliverablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  vendor: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    primary_role?: string;
    primary_type?: string;
    avatar_url?: string;
    daily_rate?: number;
    default_daily_rate?: number;
  };
  studioName?: string;
}

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Pending Design': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  'In Design': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  'Client Review': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  'Changes Requested': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
  'Sent for Printing': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' }
};

const DEFAULT_STATUS_LIST = [
  'Pending Design',
  'In Design',
  'Client Review',
  'Changes Requested',
  'Sent for Printing',
  'Completed'
];

export default function VendorAlbumDeliverablesModal({
  isOpen,
  onClose,
  workspaceId,
  vendor,
  studioName = 'StudioCore Partner Studio'
}: VendorAlbumDeliverablesModalProps) {
  const [orders, setOrders] = useState<VendorAlbumOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected orders for bulk invoice/statement generation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Statement PDF Template Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<VendorInvoiceItem[]>([]);

  // Add / Edit Job Inline Form
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newAlbumType, setNewAlbumType] = useState('Signature Photobook');
  const [newSheets, setNewSheets] = useState('30');
  const [newFee, setNewFee] = useState('4500');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');

  // Payment Recording Modal State
  const [paymentTarget, setPaymentTarget] = useState<VendorAlbumOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState('');

  // Comment Drawer State for a specific order
  const [commentTarget, setCommentTarget] = useState<VendorAlbumOrder | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentReminder, setCommentReminder] = useState('');

  // Load orders on open
  const loadOrders = useCallback(async () => {
    if (!vendor?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendors/albums?workspace_id=${workspaceId}&vendor_id=${vendor.id}&vendor_email=${encodeURIComponent(vendor.email || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('[VendorAlbumDeliverablesModal] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, vendor]);

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, loadOrders]);

  // Compute Deadlines & Overdue Status
  const getDeadlineBadge = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;

    const isDone = (status || '').toLowerCase().includes('complete') || (status || '').toLowerCase().includes('done');
    if (isDone) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Completed
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 animate-pulse flex items-center gap-1 shadow-2xs">
          ⚠️ Overdue {Math.abs(diffDays)}d
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
          ⏰ Due Today
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
        ⏳ {diffDays}d left
      </span>
    );
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = o.client_name.toLowerCase().includes(q);
        const matchesAlbum = (o.album_type || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesAlbum) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'All' && o.order_status !== statusFilter) {
        return false;
      }

      // 3. Month Filter
      if (selectedMonth !== 'All' && o.order_date) {
        const orderMonth = new Date(o.order_date).getMonth() + 1;
        if (orderMonth !== parseInt(selectedMonth, 10)) return false;
      }

      // 4. Custom Date Range
      if (startDate && o.order_date && o.order_date < startDate) return false;
      if (endDate && o.order_date && o.order_date > endDate) return false;

      return true;
    });
  }, [orders, searchQuery, statusFilter, selectedMonth, startDate, endDate]);

  // KPI Metrics Calculation
  const totalAlbumsCount = orders.length;
  const totalFeeSum = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalPaidSum = orders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
  const totalBalanceDue = Math.max(0, totalFeeSum - totalPaidSum);
  const overdueCount = orders.filter(o => {
    if (!o.due_date || (o.order_status || '').toLowerCase().includes('complete')) return false;
    const due = new Date(o.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  // Toggle selection
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Change Status Handler
  const handleStatusChange = async (order: VendorAlbumOrder, nextStatus: string) => {
    const updated = { ...order, order_status: nextStatus };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));

    await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Add / Save New Album Job
  const handleSaveNewJob = async () => {
    if (!newClientName.trim()) return;
    const sheetNum = parseInt(newSheets, 10) || 30;
    const totalFeeNum = Number(newFee) || sheetNum * 150;

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: newClientName.trim(),
      album_type: newAlbumType || 'Signature Photobook',
      sheet_count: sheetNum,
      page_count: sheetNum * 2,
      rate_per_sheet: Math.round(totalFeeNum / sheetNum),
      total_amount: totalFeeNum,
      paid_amount: 0,
      balance_amount: totalFeeNum,
      order_status: 'Pending Design',
      payment_status: 'PENDING',
      due_date: newDueDate || '',
      pdf_proof_url: newPdfUrl.trim() || '',
      notes: ''
    };

    const res = await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success && json.order) {
      setOrders(prev => [json.order, ...prev]);
      setIsAddJobOpen(false);
      setNewClientName('');
      setNewDueDate('');
      setNewPdfUrl('');
    }
  };

  // Record Payment Submit
  const handleRecordPayment = async () => {
    if (!paymentTarget || !payAmount) return;
    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      const res = await fetch('/api/vendors/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentTarget.id,
          workspaceId,
          partnerId: vendor.id,
          partnerName: vendor.name,
          amount: amountNum,
          paymentMode: payMode,
          referenceNo: payRef,
          autoSyncExpense: true
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setPaymentTarget(null);
        setPayAmount('');
        setPayRef('');
      }
    } catch (err) {
      console.warn('Payment submit error:', err);
    }
  };

  // Add Comment Submit
  const handleAddComment = async (isVoice: boolean = false) => {
    if (!commentTarget || !commentInput.trim()) return;
    try {
      const res = await fetch('/api/vendors/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: commentTarget.id,
          author: studioName || 'Studio Lead',
          text: commentInput.trim(),
          reminderAt: commentReminder || undefined,
          isVoice
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setCommentTarget(data.order);
        setCommentInput('');
        setCommentReminder('');
      }
    } catch (err) {
      console.warn('Comment submit error:', err);
    }
  };

  // Open Invoicing Template for single or multiple jobs
  const handleOpenInvoice = (singleOrder?: VendorAlbumOrder) => {
    const targetOrders = singleOrder ? [singleOrder] : orders.filter(o => selectedOrderIds.has(o.id));
    if (targetOrders.length === 0) return;

    const mapped: VendorInvoiceItem[] = targetOrders.map(o => ({
      order_id: o.id,
      client_name: o.client_name,
      album_type: o.album_type,
      sheet_count: o.sheet_count,
      page_count: o.page_count,
      rate_per_sheet: o.rate_per_sheet,
      total_amount: o.total_amount,
      paid_amount: o.paid_amount,
      balance_amount: o.balance_amount,
      order_status: o.order_status,
      payment_status: o.payment_status,
      due_date: o.due_date
    }));

    setInvoiceItems(mapped);
    setIsInvoiceModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* 3D Creamy Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#FAF8F2] rounded-3xl shadow-2xl border-2 border-amber-200/90 overflow-hidden z-10 text-stone-900"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 text-amber-300 flex items-center justify-center shadow-xs font-black text-sm">
                🎨
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {vendor.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                    {vendor.primary_role || 'Album Designer'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-stone-300 border border-white/10">
                    Partner / Vendor
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-amber-200/70 mt-0.5 flex-wrap">
                  {vendor.phone && <span className="flex items-center gap-1 font-mono">📞 {vendor.phone}</span>}
                  {vendor.email && <span className="flex items-center gap-1 font-mono">✉️ {vendor.email}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/vendor-portal"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-300/20"
                title="Open Dedicated Vendor External Portal"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vendor Portal</span>
              </a>

              <button
                type="button"
                onClick={() => setIsAddJobOpen(!isAddJobOpen)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ New Album Job</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs ml-1"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Top 3D Creamy KPI Overview Strip */}
          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 bg-amber-50/70 border-b border-amber-200/80">
            {/* 1. Total Albums */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Total Albums
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5 block">
                {totalAlbumsCount}
              </span>
            </div>

            {/* 2. Overdue / Due Alert */}
            <div className={`p-2.5 rounded-2xl bg-white border shadow-2xs ${overdueCount > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200/90'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${overdueCount > 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                Overdue Albums
              </span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${overdueCount > 0 ? 'text-rose-700 animate-pulse' : 'text-stone-700'}`}>
                {overdueCount} Overdue
              </span>
            </div>

            {/* 3. Total Fee */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Total Agreed Fee
              </span>
              <span className="text-sm sm:text-base font-black text-stone-900 font-mono mt-0.5 block">
                ₹{totalFeeSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 4. Total Paid */}
            <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                Total Paid
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5 block">
                ₹{totalPaidSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 5. Balance Due */}
            <div className={`p-2.5 rounded-2xl bg-white border shadow-2xs col-span-2 sm:col-span-1 ${totalBalanceDue > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200/90'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${totalBalanceDue > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
                Pending Balance
              </span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${totalBalanceDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                ₹{totalBalanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Add Job Inline Form */}
          <AnimatePresence>
            {isAddJobOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-amber-100/60 border-b border-amber-300 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Assign New Album Project</span>
                  </h4>
                  <button type="button" onClick={() => setIsAddJobOpen(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    placeholder="Client / Couple Name (e.g. Rahul & Pooja)"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  <input
                    type="text"
                    placeholder="Album Type (e.g. Signature Photobook)"
                    value={newAlbumType}
                    onChange={(e) => setNewAlbumType(e.target.value)}
                    className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Sheets"
                      value={newSheets}
                      onChange={(e) => setNewSheets(e.target.value)}
                      className="w-1/2 p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                    />
                    <input
                      type="number"
                      placeholder="Agreed Fee (₹)"
                      value={newFee}
                      onChange={(e) => setNewFee(e.target.value)}
                      className="w-1/2 p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                    />
                  </div>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Optional PDF Proof / Canva / Google Drive Link"
                    value={newPdfUrl}
                    onChange={(e) => setNewPdfUrl(e.target.value)}
                    className="flex-1 p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewJob}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save &amp; Assign Job
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter & Toolbar Strip */}
          <div className="p-3 sm:p-4 bg-white/70 border-b border-amber-200/60 flex items-center justify-between flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search couple or album title..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Date and Month Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 px-2 bg-stone-50 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-800 cursor-pointer shadow-2xs"
              >
                <option value="All">All Months</option>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                  <option key={m} value={String(idx + 1)}>{m}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2 bg-stone-50 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-800 cursor-pointer shadow-2xs"
              >
                <option value="All">All Statuses</option>
                {DEFAULT_STATUS_LIST.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-[11px] text-stone-500 font-bold bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 shadow-2xs">
                <span>Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[10px] font-mono outline-none"
                />
                <span>-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[10px] font-mono outline-none"
                />
              </div>
            </div>

            {/* Bulk Selection Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Select All</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenInvoice()}
                disabled={selectedOrderIds.size === 0}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-40"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate Statement ({selectedOrderIds.size})</span>
              </button>
            </div>
          </div>

          {/* Deliverables List (3D Creamy Cards) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#FAF8F2]">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-2">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-black text-stone-700">No Album Deliverables Found</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Click &ldquo;+ New Album Job&rdquo; above to assign the first album project, or assign deliverables in Post-Production.
                </p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const isSelected = selectedOrderIds.has(order.id);
                const statusStyle = STATUS_COLOR_MAP[order.order_status] || STATUS_COLOR_MAP['Pending Design'];
                const isPaid = order.payment_status === 'PAID';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-3 ${
                      isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200/90'
                    }`}
                  >
                    {/* Top Row: Checkbox, Client, Album Title, Deadline & 3D Status */}
                    <div className="flex items-start justify-between flex-wrap gap-2.5">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOrder(order.id)}
                          className="mt-0.5 text-stone-400 hover:text-amber-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-300" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight">
                              {order.client_name}
                            </h3>
                            {getDeadlineBadge(order.due_date, order.order_status)}
                          </div>
                          <p className="text-xs text-stone-500 font-semibold mt-0.5">
                            {order.album_type} • <span className="font-mono text-stone-800 font-bold">{order.sheet_count} Sheets</span> ({order.page_count || order.sheet_count * 2} Pages)
                          </p>
                        </div>
                      </div>

                      {/* 3D Creamy Status Dropdown */}
                      <div className="flex items-center gap-2">
                        <select
                          value={order.order_status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-black border cursor-pointer outline-none shadow-2xs transition ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {DEFAULT_STATUS_LIST.map(st => (
                            <option key={st} value={st} className="bg-white text-stone-900 font-bold">
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Middle Row: Financials, Proof Link, and Comments Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 items-center">
                      {/* Financials Strip */}
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                          Commercials &amp; Payment
                        </span>
                        <div className="flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap">
                          <span className="font-mono font-black text-stone-900">
                            ₹{Number(order.total_amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="font-mono text-emerald-700">
                            Paid: ₹{Number(order.paid_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className={`font-mono font-black ${order.balance_amount > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                            Bal: ₹{Number(order.balance_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* PDF Proof Link */}
                      <div className="sm:text-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                          Design Proof PDF
                        </span>
                        {order.pdf_proof_url ? (
                          <a
                            href={order.pdf_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline mt-0.5 truncate max-w-[200px]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">View Album Proof</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Enter Google Drive or Canva PDF Proof Link:');
                              if (url) {
                                handleStatusChange({ ...order, pdf_proof_url: url.trim() }, order.order_status);
                              }
                            }}
                            className="text-[11px] font-bold text-amber-600 hover:underline mt-0.5 cursor-pointer"
                          >
                            + Attach Proof Link
                          </button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentTarget(order);
                            setPayAmount(String(order.balance_amount || ''));
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <IndianRupee className="w-3 h-3" />
                          <span>{isPaid ? 'Settled' : 'Record Pay'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCommentTarget(order)}
                          className="px-2.5 py-1 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3 text-stone-400" />
                          <span>Notes ({(order.comments || []).length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenInvoice(order)}
                          className="px-2.5 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Generate Single Job Invoice"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>Invoice</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Record Payment Inline Modal */}
          <AnimatePresence>
            {paymentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-sm w-full space-y-3.5 text-stone-900"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h4 className="text-xs font-black text-amber-950">Record Payment for {paymentTarget.client_name}</h4>
                    <button type="button" onClick={() => setPaymentTarget(null)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 block">Amount to Pay (₹)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 block">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value as any)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="UPI">UPI (Google Pay, PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 block">Reference / UTR</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR1849202"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRecordPayment}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Confirm &amp; Record Payment
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Comments & AI Voice Notes Drawer */}
          <AnimatePresence>
            {commentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#FAF8F5] p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-lg w-full space-y-3.5 text-stone-900"
                >
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        Discussion &amp; AI Voice Notes • {commentTarget.client_name}
                      </h4>
                      <p className="text-[10px] text-stone-500 font-medium">{commentTarget.album_type}</p>
                    </div>
                    <button type="button" onClick={() => setCommentTarget(null)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Previous Comments */}
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {(commentTarget.comments || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic text-center py-4">No comments recorded yet.</p>
                    ) : (
                      commentTarget.comments?.map(c => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold">
                            <span className="text-amber-900">{c.author}</span>
                            <span>{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-stone-800 font-medium">{c.text}</p>
                          {c.reminder_at && (
                            <span className="inline-block text-[9px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              ⏰ Reminder: {new Date(c.reminder_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input Box with AI Voice Integration */}
                  <div className="space-y-2 pt-2 border-t border-amber-200/80">
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Type note or use AI Voice mic..."
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs pr-24"
                      />
                      <div className="absolute right-2 top-2">
                        <AiMicButton
                          size="sm"
                          onInsertComment={(transcript) => {
                            setCommentInput(prev => prev ? `${prev} ${transcript}` : transcript);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <span className="text-[10px] font-bold">Reminder:</span>
                        <input
                          type="datetime-local"
                          value={commentReminder}
                          onChange={(e) => setCommentReminder(e.target.value)}
                          className="bg-white border border-stone-200 rounded-lg text-[10px] p-1 shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddComment(false)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Minimal Luxury Statement / Invoice Printable Component */}
        <VendorStatementInvoicePdfTemplate
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          vendor={vendor}
          studioName={studioName}
          items={invoiceItems}
        />
      </div>
    </AnimatePresence>
  );
}
