'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, Calendar, Clock, IndianRupee, 
  CheckCircle2, AlertCircle, Plus, Search, ExternalLink, 
  FileText, MessageSquare, ChevronDown, Check, Download, 
  Printer, ArrowUpRight, ShieldCheck, User, Phone, Mail,
  RefreshCw, CheckSquare, Square, Layers, Edit3, Trash2,
  Film, Camera, Palette, Video, Layers as LayersIcon
} from 'lucide-react';
import { 
  VendorAlbumOrder, 
  AssignmentCategory,
  fetchVendorAlbumOrders, 
  saveVendorAlbumOrder,
  detectDeliverableCategory
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
    roles?: string[];
    member_types?: string[];
    monthly_salary?: number;
    [key: string]: any;
  };
  studioName?: string;
  onOpenSalaryDrawer?: (member: any) => void;
}

export type HubCategoryTab = 'shoot' | 'video_editing' | 'photo_editing' | 'album_design' | 'album_printing';

const CATEGORY_TABS_CONFIG: Array<{ id: HubCategoryTab; label: string; icon: string }> = [
  { id: 'shoot', label: 'Shoots', icon: '📸' },
  { id: 'video_editing', label: 'Video Editing', icon: '🎬' },
  { id: 'photo_editing', label: 'Photo Editing', icon: '✨' },
  { id: 'album_design', label: 'Album Designing', icon: '🎨' },
  { id: 'album_printing', label: 'Album Printing', icon: '📖' },
];

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Pending Design': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  'In Design': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  'In Progress': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  'Client Review': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  'Changes Requested': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
  'Sent for Printing': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' }
};

const DEFAULT_STATUS_LIST = [
  'Pending Design',
  'In Progress',
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
  studioName = 'StudioCore Partner Studio',
  onOpenSalaryDrawer,
}: VendorAlbumDeliverablesModalProps) {
  const [orders, setOrders] = useState<VendorAlbumOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Active Category Tab (NO "all" tab)
  const [activeCategoryTab, setActiveCategoryTab] = useState<HubCategoryTab>('shoot');

  // Selected orders for bulk invoice/statement generation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Statement PDF Template Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<VendorInvoiceItem[]>([]);

  // Add / Edit Job Modal States
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<HubCategoryTab>('shoot');
  const [newClientName, setNewClientName] = useState('');
  const [newAlbumType, setNewAlbumType] = useState('Wedding Shoot');
  const [newSpecs, setNewSpecs] = useState('Full Day Shoot');
  const [newSheets, setNewSheets] = useState('30');
  const [newFee, setNewFee] = useState('5000');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Inline Edit Item State
  const [editingOrder, setEditingOrder] = useState<VendorAlbumOrder | null>(null);

  // Payment Recording Modal State
  const [paymentTarget, setPaymentTarget] = useState<VendorAlbumOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState('');

  // Comment Drawer State for a specific order
  const [commentTarget, setCommentTarget] = useState<VendorAlbumOrder | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentReminder, setCommentReminder] = useState('');

  // Check member types and roles
  const isFreelancer = vendor?.primary_type === 'FREELANCER' || (vendor?.member_types || []).includes('FREELANCER');
  const isInHouse = vendor?.primary_type === 'IN_HOUSE' || (vendor?.member_types || []).includes('IN_HOUSE');
  const isPartner = vendor?.primary_type === 'PARTNER' || (vendor?.member_types || []).includes('PARTNER') || vendor?.type === 'partner';

  // Load orders on open
  const loadOrders = useCallback(async () => {
    if (!vendor?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendors/albums?workspace_id=${workspaceId}&vendor_id=${vendor.id}&vendor_email=${encodeURIComponent(vendor.email || '')}&vendor_name=${encodeURIComponent(vendor.name || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('[VendorDeliverablesHubModal] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, vendor]);

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, loadOrders]);

  // Live Category Counts
  const categoryCounts = useMemo(() => {
    return {
      shoot: orders.filter(o => o.category === 'shoot').length,
      video_editing: orders.filter(o => o.category === 'video_editing').length,
      photo_editing: orders.filter(o => o.category === 'photo_editing').length,
      album_design: orders.filter(o => o.category === 'album_design' || (!o.category && !o.service_type?.includes('Print'))).length,
      album_printing: orders.filter(o => o.category === 'album_printing' || o.service_type?.includes('Print')).length,
    };
  }, [orders]);

  // ── DYNAMIC VISIBLE TABS (Hide tabs with 0 tasks, except Shoot/Printing if applicable) ──
  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: HubCategoryTab; label: string; icon: string; count: number }> = [];

    // 1. Shoots: Show if has shoots OR if member role/type is photographer, cinematographer, freelancer, in-house
    const shootCount = categoryCounts.shoot;
    const isShootRole = /photo|cinema|drone|traditional|camera|shoot/i.test(vendor.primary_role || '') || isFreelancer || isInHouse;
    if (shootCount > 0 || isShootRole) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
    }

    // 2. Video Editing: Show ONLY if member has video editing tasks OR role is Video Editor!
    const videoCount = categoryCounts.video_editing;
    if (videoCount > 0 || /video\s*editor/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'video_editing', label: 'Video Editing', icon: '🎬', count: videoCount });
    }

    // 3. Photo Editing: Show ONLY if member has photo editing tasks OR role is Photo Editor!
    const photoCount = categoryCounts.photo_editing;
    if (photoCount > 0 || /photo\s*editor|retouch/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'photo_editing', label: 'Photo Editing', icon: '✨', count: photoCount });
    }

    // 4. Album Designing: Show ONLY if member has album designing tasks OR role is Album Designer!
    const albumCount = categoryCounts.album_design;
    if (albumCount > 0 || /album\s*design/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'album_design', label: 'Album Designing', icon: '🎨', count: albumCount });
    }

    // 5. Album Printing: Always visible or show if has printing orders / printing lab / partner
    const printCount = categoryCounts.album_printing;
    if (printCount > 0 || /print|lab|binding/i.test(vendor.primary_role || '') || isPartner) {
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    // Safety fallback
    if (tabs.length === 0) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    return tabs;
  }, [categoryCounts, vendor.primary_role, isFreelancer, isInHouse, isPartner]);

  // Ensure activeCategoryTab is always a visible tab with items
  useEffect(() => {
    if (isOpen && visibleTabs.length > 0) {
      if (!visibleTabs.some(t => t.id === activeCategoryTab)) {
        const firstWithItems = visibleTabs.find(t => t.count > 0) || visibleTabs[0];
        setActiveCategoryTab(firstWithItems.id);
      }
    }
  }, [isOpen, visibleTabs, activeCategoryTab]);

  // Compute Deadlines & Overdue Status
  const getDeadlineBadge = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;

    const isDone = (status || '').toLowerCase().includes('complete') || (status || '').toLowerCase().includes('done') || (status || '').toLowerCase().includes('delivered');
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 animate-pulse flex items-center gap-1 shadow-2xs">
          ⚠️ Overdue {Math.abs(diffDays)}d
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
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

  // Filtered Orders for Current Tab
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Strict Category Match
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      if (itemCat !== activeCategoryTab) return false;

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = o.client_name.toLowerCase().includes(q);
        const matchesAlbum = (o.album_type || o.item_title || '').toLowerCase().includes(q);
        const matchesSpecs = (o.specs || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesAlbum && !matchesSpecs) return false;
      }

      // 3. Status Filter (Deliverables only)
      if (activeCategoryTab !== 'shoot' && statusFilter !== 'All' && o.order_status !== statusFilter) {
        return false;
      }

      // 4. Month Filter
      if (selectedMonth !== 'All' && o.order_date) {
        const orderMonth = new Date(o.order_date).getMonth() + 1;
        if (orderMonth !== parseInt(selectedMonth, 10)) return false;
      }

      // 5. Custom Date Range
      if (startDate && o.order_date && o.order_date < startDate) return false;
      if (endDate && o.order_date && o.order_date > endDate) return false;

      return true;
    });
  }, [orders, activeCategoryTab, searchQuery, statusFilter, selectedMonth, startDate, endDate]);

  // Tab Metrics Calculation
  const tabTotalCount = filteredOrders.length;
  const tabFeeSum = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const tabPaidSum = filteredOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
  const tabBalanceDue = Math.max(0, tabFeeSum - tabPaidSum);
  const tabOverdueCount = filteredOrders.filter(o => {
    if (!o.due_date || (o.order_status || '').toLowerCase().includes('complete') || (o.order_status || '').toLowerCase().includes('done')) return false;
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
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Change Status Handler with Immediate Bi-Directional Post-Production Sync (for non-shoots)
  const handleStatusChange = async (order: VendorAlbumOrder, nextStatus: string) => {
    const updated = { ...order, order_status: nextStatus };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));

    await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Add / Save New Assignment
  const handleSaveNewJob = async () => {
    if (!newClientName.trim()) return;
    const sheetNum = parseInt(newSheets, 10) || (newCategory === 'album_design' || newCategory === 'album_printing' ? 30 : 1);
    const totalFeeNum = Number(newFee) || (newCategory === 'album_design' ? sheetNum * 150 : 5000);

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: newClientName.trim(),
      category: newCategory,
      item_title: newAlbumType || (newCategory === 'shoot' ? 'Wedding Shoot' : 'Creative Task'),
      album_type: newAlbumType || (newCategory === 'shoot' ? 'Wedding Shoot' : 'Creative Task'),
      specs: newSpecs.trim() || (newCategory === 'shoot' ? 'Full Day Shoot' : `${sheetNum} Sheets`),
      sheet_count: sheetNum,
      page_count: sheetNum * 2,
      rate_per_sheet: newCategory === 'album_design' ? Math.round(totalFeeNum / sheetNum) : 0,
      total_amount: totalFeeNum,
      paid_amount: 0,
      balance_amount: totalFeeNum,
      order_status: newCategory === 'shoot' ? 'In Progress' : 'Pending Design',
      payment_status: 'PENDING',
      due_date: newDueDate || '',
      pdf_proof_url: newPdfUrl.trim() || '',
      notes: newNotes.trim() || ''
    };

    const res = await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success && json.order) {
      setOrders(prev => [json.order, ...prev]);
      setActiveCategoryTab(newCategory);
      setIsAddJobOpen(false);
      setNewClientName('');
      setNewDueDate('');
      setNewPdfUrl('');
      setNewNotes('');
    }
  };

  // Save Inline Edit Modal
  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;
    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOrder)
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setEditingOrder(null);
      } else {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? editingOrder : o));
        setEditingOrder(null);
      }
    } catch (err) {
      console.warn('Edit save error:', err);
    }
  };

  // Delete Order Handler
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    setOrders(prev => prev.filter(o => o.id !== orderId));
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
      } else {
        const newPaid = (paymentTarget.paid_amount || 0) + amountNum;
        const newBal = Math.max(0, paymentTarget.total_amount - newPaid);
        const updated = {
          ...paymentTarget,
          paid_amount: newPaid,
          balance_amount: newBal,
          payment_status: (newBal === 0 ? 'PAID' : 'PARTIAL') as any
        };
        setOrders(prev => prev.map(o => o.id === paymentTarget.id ? updated : o));
        setPaymentTarget(null);
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
    const targetOrders = singleOrder ? [singleOrder] : filteredOrders.filter(o => selectedOrderIds.has(o.id));
    const effectiveOrders = targetOrders.length > 0 ? targetOrders : filteredOrders;
    if (effectiveOrders.length === 0) return;

    const mapped: VendorInvoiceItem[] = effectiveOrders.map(o => ({
      order_id: o.id,
      client_name: o.client_name,
      album_type: o.item_title || o.album_type,
      category: o.category || 'shoot',
      specs: o.specs || `${o.sheet_count} Sheets`,
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

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'shoot':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">📸 Shoot</span>;
      case 'video_editing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200">🎬 Video Edit</span>;
      case 'photo_editing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">✨ Photo Edit</span>;
      case 'album_printing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">📖 Printing</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">🎨 Album</span>;
    }
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
          className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-[#FAF8F2] rounded-3xl shadow-2xl border-2 border-amber-200/90 overflow-hidden z-10 text-stone-900"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 text-amber-300 flex items-center justify-center shadow-xs font-black text-lg overflow-hidden shrink-0">
                {vendor.avatar_url ? (
                  <img src={vendor.avatar_url} alt={vendor.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{vendor.name ? vendor.name.slice(0, 2).toUpperCase() : 'TM'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {vendor.name}
                  </h2>
                  {/* Primary Type Badges */}
                  {isFreelancer && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                      📸 Freelancer
                    </span>
                  )}
                  {isInHouse && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
                      🏢 In-House Staff
                    </span>
                  )}
                  {isPartner && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                      🤝 Partner / Vendor
                    </span>
                  )}
                  {vendor.primary_role && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-stone-300 border border-white/10">
                      {vendor.primary_role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-amber-200/70 mt-1 flex-wrap font-mono">
                  {vendor.phone && <span className="flex items-center gap-1">📞 {vendor.phone}</span>}
                  {vendor.email && <span className="flex items-center gap-1">✉️ {vendor.email}</span>}
                  {(vendor.daily_rate || vendor.default_daily_rate) ? (
                    <span className="text-amber-300 font-bold">₹{vendor.daily_rate || vendor.default_daily_rate}/day</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInHouse && onOpenSalaryDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSalaryDrawer(vendor);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Salary Slips</span>
                </button>
              )}

              {isPartner && (
                <a
                  href="/vendor-portal"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-300/20"
                  title="Open Dedicated Vendor External Portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portal</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setNewCategory(activeCategoryTab);
                  setIsAddJobOpen(!isAddJobOpen);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Assignment</span>
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

          {/* Categorized Segregated Navigation Menu / Tabs (DYNAMIC: Hides 0-count unassigned tabs!) */}
          <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-amber-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {visibleTabs.map(tab => {
              const isActive = activeCategoryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-200/80'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-amber-700/60 text-white' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Top 3D Creamy KPI Overview Strip for Active View */}
          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 bg-amber-50/70 border-b border-amber-200/80">
            {/* 1. Total Jobs */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Total {visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments'}
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5 block">
                {tabTotalCount} Jobs
              </span>
            </div>

            {/* 2. Done Price / Total Agreed */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Agreed Done Price
              </span>
              <span className="text-sm sm:text-base font-black text-stone-900 font-mono mt-0.5 block">
                ₹{tabFeeSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 3. Total Paid */}
            <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                Total Paid
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5 block">
                ₹{tabPaidSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 4. Balance Due */}
            <div className={`p-2.5 rounded-2xl bg-white border shadow-2xs ${tabBalanceDue > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200/90'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${tabBalanceDue > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
                Pending Balance
              </span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${tabBalanceDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                ₹{tabBalanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Add Assignment Inline Form */}
          <AnimatePresence>
            {isAddJobOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-amber-100/70 border-b border-amber-300 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Create &amp; Assign New Assignment</span>
                  </h4>
                  <button type="button" onClick={() => setIsAddJobOpen(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {/* Category Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => {
                        const cat = e.target.value as any;
                        setNewCategory(cat);
                        if (cat === 'shoot') {
                          setNewAlbumType('Wedding Shoot');
                          setNewSpecs('Full Day Shoot');
                        } else if (cat === 'album_design') {
                          setNewAlbumType('Signature Photobook');
                          setNewSpecs('30 Sheets (60 Pages)');
                        } else if (cat === 'video_editing') {
                          setNewAlbumType('Cinematic Wedding Film');
                          setNewSpecs('25-30 Mins');
                        } else if (cat === 'photo_editing') {
                          setNewAlbumType('Master Photo Retouching');
                          setNewSpecs('500 Photos');
                        } else if (cat === 'album_printing') {
                          setNewAlbumType('Flush Mount Print Order');
                          setNewSpecs('30 Sheets Flush Mount');
                        }
                      }}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                    >
                      <option value="shoot">📸 Shoot Assignment</option>
                      <option value="video_editing">🎬 Video Editing</option>
                      <option value="photo_editing">✨ Photo Editing</option>
                      <option value="album_design">🎨 Album Designing</option>
                      <option value="album_printing">📖 Album Printing</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Couple / Client Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul & Pooja"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">
                      {newCategory === 'shoot' ? 'Event Name / Title' : 'Deliverable Title'}
                    </label>
                    <input
                      type="text"
                      placeholder={newCategory === 'shoot' ? 'e.g. Wedding Shoot / Reception' : 'e.g. Cinematic Teaser'}
                      value={newAlbumType}
                      onChange={(e) => setNewAlbumType(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Specs / Pages / Details</label>
                    <input
                      type="text"
                      placeholder={newCategory === 'shoot' ? 'e.g. Full Day Candid' : 'e.g. 35 Sheets (70 Pages)'}
                      value={newSpecs}
                      onChange={(e) => setNewSpecs(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Done Price (₹)</label>
                      <input
                        type="number"
                        placeholder="₹"
                        value={newFee}
                        onChange={(e) => setNewFee(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                        {newCategory === 'shoot' ? 'Shoot Date' : 'Deadline'}
                      </label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Optional Drive Folder URL or Proof Link"
                    value={newPdfUrl}
                    onChange={(e) => setNewPdfUrl(e.target.value)}
                    className="flex-1 p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewJob}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                  >
                    Save &amp; Assign Task
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
                placeholder="Search couple, deliverable, specs..."
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

              {activeCategoryTab !== 'shoot' && (
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
              )}

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
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Statement {selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Deliverables & Assignments List (3D Creamy Cards) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#FAF8F2]">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-3">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-black text-stone-700">
                  No {visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments'} Found
                </h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {activeCategoryTab === 'album_printing'
                    ? 'Manually add your album printing orders here.'
                    : 'Assign tasks from Post-Production or Bookings, or click "+ Add Assignment" above.'}
                </p>
                {activeCategoryTab === 'album_printing' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory('album_printing');
                      setNewAlbumType('Flush Mount Print Order');
                      setNewSpecs('30 Sheets Flush Mount');
                      setIsAddJobOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition"
                  >
                    + Add Album Printing Order
                  </button>
                )}
              </div>
            ) : (
              filteredOrders.map(order => {
                const isSelected = selectedOrderIds.has(order.id);
                const isPaid = order.payment_status === 'PAID' || Number(order.balance_amount || 0) === 0;
                const isShoot = order.category === 'shoot';
                const statusStyle = STATUS_COLOR_MAP[order.order_status] || STATUS_COLOR_MAP['Pending Design'];

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-3 ${
                      isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200/90'
                    }`}
                  >
                    {/* Top Row: Checkbox, Couple Name, Category/Event Tag, Title, (Status dropdown ONLY if NOT shoot) */}
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
                            {getCategoryBadge(order.category)}
                            {!isShoot && getDeadlineBadge(order.due_date, order.order_status)}
                          </div>
                          
                          {/* Event / Deliverable Details */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-stone-600 font-medium flex-wrap">
                            <span className="font-bold text-amber-950">
                              {order.item_title || order.album_type}
                            </span>
                            {order.specs && (
                              <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60 font-bold">
                                {order.specs}
                              </span>
                            )}
                            {order.due_date && isShoot && (
                              <span className="font-mono text-stone-500 text-[11px]">
                                Date: {order.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3D Creamy Status Dropdown: ONLY for Video, Photo, Album Designing, Printing (STRICTLY HIDDEN FOR SHOOTS!) */}
                      {!isShoot && (
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
                      )}
                    </div>

                    {/* Bottom Row: Commercials (Done Price, Paid, Balance) & Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 items-center">
                      {/* Financials Strip */}
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                          Agreed Done Price &amp; Balance
                        </span>
                        <div className="flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap">
                          <span className="font-mono font-black text-stone-900">
                            Done: ₹{Number(order.total_amount).toLocaleString('en-IN')}
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

                      {/* PDF Proof / Drive Link (if applicable) */}
                      <div className="sm:text-center">
                        {!isShoot ? (
                          <>
                            <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                              Drive Folder / Proof
                            </span>
                            {order.pdf_proof_url || order.drive_folder_url ? (
                              <a
                                href={order.pdf_proof_url || order.drive_folder_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline mt-0.5 truncate max-w-[200px]"
                              >
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Open Link</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt('Enter Google Drive or Canva Link:');
                                  if (url) {
                                    handleStatusChange({ ...order, pdf_proof_url: url.trim() }, order.order_status);
                                  }
                                }}
                                className="text-[11px] font-bold text-amber-600 hover:underline mt-0.5 cursor-pointer"
                              >
                                + Attach Link
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-[11px] text-stone-400 font-medium">
                            Shoot Event Commercials
                          </div>
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
                          onClick={() => setEditingOrder(order)}
                          className="px-2.5 py-1 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Edit Pricing & Details"
                        >
                          <Edit3 className="w-3 h-3 text-stone-400" />
                          <span>Edit</span>
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

          {/* Edit Assignment Modal */}
          <AnimatePresence>
            {editingOrder && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-lg w-full space-y-3.5 text-stone-900"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit Commercials &amp; Details • {editingOrder.client_name}</span>
                    </h4>
                    <button type="button" onClick={() => setEditingOrder(null)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Couple / Client Name</label>
                      <input
                        type="text"
                        value={editingOrder.client_name}
                        onChange={(e) => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                        {editingOrder.category === 'shoot' ? 'Event Name' : 'Deliverable Title'}
                      </label>
                      <input
                        type="text"
                        value={editingOrder.item_title || editingOrder.album_type}
                        onChange={(e) => setEditingOrder({ ...editingOrder, item_title: e.target.value, album_type: e.target.value })}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Done Price (₹)</label>
                      <input
                        type="number"
                        value={editingOrder.total_amount}
                        onChange={(e) => {
                          const tot = Number(e.target.value) || 0;
                          setEditingOrder({
                            ...editingOrder,
                            total_amount: tot,
                            balance_amount: Math.max(0, tot - (editingOrder.paid_amount || 0))
                          });
                        }}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Paid Amount (₹)</label>
                      <input
                        type="number"
                        value={editingOrder.paid_amount || 0}
                        onChange={(e) => {
                          const paid = Number(e.target.value) || 0;
                          setEditingOrder({
                            ...editingOrder,
                            paid_amount: paid,
                            balance_amount: Math.max(0, (editingOrder.total_amount || 0) - paid),
                            payment_status: (editingOrder.total_amount - paid === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING') as any
                          });
                        }}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Balance Due (₹)</label>
                      <input
                        type="number"
                        value={editingOrder.balance_amount || 0}
                        onChange={(e) => {
                          const bal = Number(e.target.value) || 0;
                          setEditingOrder({
                            ...editingOrder,
                            balance_amount: bal
                          });
                        }}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono text-rose-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Specs / Pages / Details</label>
                      <input
                        type="text"
                        value={editingOrder.specs || ''}
                        onChange={(e) => setEditingOrder({ ...editingOrder, specs: e.target.value })}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Deadline / Date</label>
                      <input
                        type="date"
                        value={editingOrder.due_date ? editingOrder.due_date.split('T')[0] : ''}
                        onChange={(e) => setEditingOrder({ ...editingOrder, due_date: e.target.value })}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Drive / Proof URL</label>
                    <input
                      type="url"
                      value={editingOrder.pdf_proof_url || editingOrder.drive_folder_url || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, pdf_proof_url: e.target.value, drive_folder_url: e.target.value })}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteOrder(editingOrder.id);
                        setEditingOrder(null);
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Delete Assignment
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOrder(null)}
                        className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditOrder}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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
