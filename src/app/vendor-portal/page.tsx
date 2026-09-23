'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, BookOpen, Calendar, Clock, IndianRupee, 
  CheckCircle2, AlertCircle, Plus, Search, ExternalLink, 
  FileText, MessageSquare, ChevronDown, Check, Download, 
  Printer, ArrowUpRight, ShieldCheck, User, Phone, Mail,
  RefreshCw, CheckSquare, Square, LogOut, ArrowRight, Loader2, X
} from 'lucide-react';
import AiMicButton from '@/components/AiMicButton';
import VendorStatementInvoicePdfTemplate, { VendorInvoiceItem } from '@/components/vendors/VendorStatementInvoicePdfTemplate';

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  type: string;
  workspace_id: string;
  studio_name: string;
}

interface VendorOrder {
  id: string;
  workspace_id: string;
  partner_id: string;
  partner_name: string;
  partner_email?: string;
  client_name: string;
  album_type: string;
  sheet_count: number;
  page_count: number;
  rate_per_sheet: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: string;
  payment_status: string;
  order_date: string;
  due_date?: string;
  pdf_proof_url?: string;
  notes?: string;
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    time: string;
    reminder_at?: string;
    is_voice?: boolean;
  }>;
}

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  'Pending Design': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  'In Design': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  'Client Review': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  'Changes Requested': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  'Sent for Printing': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' }
};

const DEFAULT_STATUS_LIST = [
  'Pending Design',
  'In Design',
  'Client Review',
  'Changes Requested',
  'Sent for Printing',
  'Completed'
];

export default function VendorPortalPage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected orders for statement generation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Invoice / Statement Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<VendorInvoiceItem[]>([]);

  // Discussion Drawer State
  const [commentTarget, setCommentTarget] = useState<VendorOrder | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentReminder, setCommentReminder] = useState('');

  // Check persisted vendor session on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sc_vendor_portal_email');
    if (savedEmail) {
      handleAuthenticate(savedEmail);
    }
  }, []);

  const handleAuthenticate = async (emailToVerify?: string) => {
    const targetEmail = (emailToVerify || emailInput).trim().toLowerCase();
    if (!targetEmail) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/vendors/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Vendor email not recognized');
      }

      setVendor(data.vendor);
      setOrders(data.orders || []);
      localStorage.setItem('sc_vendor_portal_email', targetEmail);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate vendor');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sc_vendor_portal_email');
    setVendor(null);
    setOrders([]);
    setEmailInput('');
  };

  const refreshOrders = useCallback(async () => {
    if (!vendor) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/vendors/albums?workspace_id=${vendor.workspace_id}&vendor_id=${vendor.id}&vendor_email=${encodeURIComponent(vendor.email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [vendor]);

  // Update Status
  const handleStatusChange = async (order: VendorOrder, nextStatus: string) => {
    const updated = { ...order, order_status: nextStatus };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));

    await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Add Comment
  const handleAddComment = async (isVoice: boolean = false) => {
    if (!commentTarget || !commentInput.trim() || !vendor) return;
    try {
      const res = await fetch('/api/vendors/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: commentTarget.id,
          author: vendor.name,
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

  // Compute Deadlines & Overdue Status
  const getDeadlineBadge = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;

    const isDone = (status || '').toLowerCase().includes('complete') || (status || '').toLowerCase().includes('done');
    if (isDone) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 animate-pulse flex items-center gap-1 shadow-2xs">
          ⚠️ Overdue {Math.abs(diffDays)}d
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1 shadow-2xs">
          ⏰ Due Today
        </span>
      );
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
        ⏳ {diffDays}d left
      </span>
    );
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = o.client_name.toLowerCase().includes(q);
        const matchesAlbum = (o.album_type || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesAlbum) return false;
      }
      if (statusFilter !== 'All' && o.order_status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // KPI Metrics Calculation
  const totalAlbumsCount = orders.length;
  const totalFeeSum = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalPaidSum = orders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
  const totalBalanceDue = Math.max(0, totalFeeSum - totalPaidSum);
  const completedCount = orders.filter(o => (o.order_status || '').toLowerCase().includes('complete')).length;

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

  const handleOpenInvoice = (singleOrder?: VendorOrder) => {
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

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOGIN SCREEN (IF NOT AUTHENTICATED)
  // ══════════════════════════════════════════════════════════════════════════════
  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-4 text-stone-900 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200/90 shadow-2xl space-y-6"
        >
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-xs">
              🎨
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 block">
              Vendor &amp; Partner Network
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              StudioCore Vendor Portal
            </h1>
            <p className="text-xs text-stone-500 font-medium max-w-xs mx-auto">
              Access your assigned client albums, track production deadlines, and generate invoices.
            </p>
          </div>

          {/* Email Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuthenticate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 block">
                Registered Vendor Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="e.g. designer@craftalbums.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Vendor Account...</span>
                </>
              ) : (
                <>
                  <span>Access My Vendor Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p className="text-[10px] text-stone-400 text-center font-medium">
            Protected by StudioCore Multi-Tenant Isolation • Contact your studio partner if you need assistance.
          </p>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: AUTHENTICATED VENDOR DASHBOARD (CREAMY 3D)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FAF8F2] text-stone-900 font-sans pb-16">
      {/* Top Floating Studio Brand Banner */}
      <header className="sticky top-0 z-30 bg-[#2B231D] text-amber-50 shadow-md border-b border-amber-900/40 px-4 sm:px-8 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center text-lg font-black shadow-xs">
            🎨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                {vendor.studio_name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                Vendor Hub
              </span>
            </div>
            <p className="text-[11px] text-amber-200/70 font-medium">
              Welcome back, <span className="font-bold text-white">{vendor.name}</span> ({vendor.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshOrders}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
            title="Refresh Deliverables"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-stone-300 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-3xl bg-white border-2 border-amber-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              Assigned Albums
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-0.5 block">
              {totalAlbumsCount}
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white border-2 border-emerald-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              Completed Albums
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono mt-0.5 block">
              {completedCount}
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white border-2 border-amber-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              Total Earnings Fee
            </span>
            <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-0.5 block">
              ₹{totalFeeSum.toLocaleString('en-IN')}
            </span>
          </div>

          <div className={`p-4 rounded-3xl bg-white border-2 shadow-2xs ${totalBalanceDue > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-amber-200/90'}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${totalBalanceDue > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
              Pending Payment
            </span>
            <span className={`text-xl sm:text-2xl font-black font-mono mt-0.5 block ${totalBalanceDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
              ₹{totalBalanceDue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-white rounded-3xl border-2 border-amber-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by couple or album title..."
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-2xs"
            >
              <option value="All">All Statuses</option>
              {DEFAULT_STATUS_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-40"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Statement ({selectedOrderIds.size})</span>
            </button>
          </div>
        </div>

        {/* Assigned Deliverables List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-2">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <h4 className="text-sm font-black text-stone-700">No Projects Found</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                No album deliverables currently match your search. New projects assigned by your studio will appear here automatically.
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
                  className={`p-5 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-3.5 ${
                    isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200/90'
                  }`}
                >
                  {/* Top Details Strip */}
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
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-black text-stone-900 tracking-tight">
                            {order.client_name}
                          </h3>
                          {getDeadlineBadge(order.due_date, order.order_status)}
                        </div>
                        <p className="text-xs text-stone-500 font-semibold mt-0.5">
                          {order.album_type} • <span className="font-mono text-stone-800 font-bold">{order.sheet_count} Sheets</span> ({order.page_count || order.sheet_count * 2} Pages)
                        </p>
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden sm:inline">Status:</span>
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

                  {/* Actions & Proof Link Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 items-center">
                    {/* Financials Strip */}
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                        Your Compensation
                      </span>
                      <div className="flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap">
                        <span className="font-mono font-black text-stone-900">
                          ₹{Number(order.total_amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="font-mono text-emerald-700">
                          Received: ₹{Number(order.paid_amount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className={`font-mono font-black ${order.balance_amount > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                          Bal: ₹{Number(order.balance_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Proof URL Upload */}
                    <div className="sm:text-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                        PDF Design Proof Link
                      </span>
                      {order.pdf_proof_url ? (
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <a
                            href={order.pdf_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline truncate max-w-[160px]"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">View Uploaded Proof</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Update Design Proof URL:', order.pdf_proof_url);
                              if (url !== null) {
                                handleStatusChange({ ...order, pdf_proof_url: url.trim() }, order.order_status);
                              }
                            }}
                            className="text-[10px] text-stone-400 hover:text-stone-700 font-bold"
                          >
                            (Edit)
                          </button>
                        </div>
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
                          + Upload Design Proof Link
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCommentTarget(order)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <span>Discussion ({(order.comments || []).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInvoice(order)}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Discussion & AI Voice Notes Modal */}
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
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimal Luxury Statement / Invoice Printable Component */}
      <VendorStatementInvoicePdfTemplate
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        vendor={vendor}
        studioName={vendor.studio_name}
        items={invoiceItems}
      />
    </div>
  );
}
