'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, Calendar, Clock, IndianRupee, 
  CheckCircle2, AlertCircle, Plus, Search, ExternalLink, 
  FileText, MessageSquare, ChevronDown, Check, Download, 
  Printer, ArrowUpRight, ShieldCheck, User, Phone, Mail,
  RefreshCw, CheckSquare, Square, Layers, Edit3, Trash2,
  Film, Camera, Palette, Video, Layers as LayersIcon, Bell,
  Filter
} from 'lucide-react';
import { 
  VendorAlbumOrder, 
  AssignmentCategory, 
  detectDeliverableCategory,
  formatNoteDateTime
} from '@/lib/services/vendorDeliverablesService';
import AiMicButton from '@/components/AiMicButton';
import VendorStatementInvoicePdfTemplate, { VendorInvoiceItem } from './VendorStatementInvoicePdfTemplate';
import VendorDeliverablesFilterModal, { DeliverablesFilterState } from './VendorDeliverablesFilterModal';

// Fast Module-Level In-Memory Cache for 0ms instant loading
const memCachedVendorOrders = new Map<string, VendorAlbumOrder[]>();

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

const PRESET_EVENT_OPTIONS = [
  'Wedding',
  'Reception',
  'Sangeet',
  'Haldi',
  'Engagement',
  'Mehendi',
  'Cocktail',
  'Pre-Wedding',
  'Ring Ceremony',
  'Post-Wedding'
];

export default function VendorAlbumDeliverablesModal({
  isOpen,
  onClose,
  workspaceId,
  vendor,
  studioName = 'StudioCore Partner Studio',
  onOpenSalaryDrawer,
}: VendorAlbumDeliverablesModalProps) {
  // Synchronous initial cache read for 0ms instant display
  const [orders, setOrders] = useState<VendorAlbumOrder[]>(() => {
    if (vendor?.id) {
      if (memCachedVendorOrders.has(vendor.id)) {
        return memCachedVendorOrders.get(vendor.id)!;
      }
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`) || localStorage.getItem(`vendor_orders_${vendor.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memCachedVendorOrders.set(vendor.id, parsed);
              return parsed;
            }
          }
        } catch (_) {}
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Advanced 3D Multi-Select Filters
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<DeliverablesFilterState>({
    startDate: '',
    endDate: '',
    eventTypes: [],
    roles: [],
    paymentStatuses: [],
  });

  // Active Category Tab
  const [activeCategoryTab, setActiveCategoryTab] = useState<HubCategoryTab>('shoot');

  // Progressive Lazy Rendering: Start with 10 cards
  const [visibleCardCount, setVisibleCardCount] = useState(10);

  // Selected orders for bulk invoice/statement generation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Statement PDF Template Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<VendorInvoiceItem[]>([]);

  // Studio Profile Information Sync
  const [studioProfile, setStudioProfile] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`studio_settings_${workspaceId}`) || localStorage.getItem('sc_studio_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            name: parsed.studio_name || parsed.studioName || studioName,
            phone: parsed.phone || parsed.studioPhone || '+91 98765 43210',
            email: parsed.email || parsed.studioEmail || 'accounts@filmifyweddings.com',
            address: parsed.address || parsed.studioAddress || 'StudioCore Hub, Creative District, Mumbai'
          };
        }
      } catch (_) {}
    }
    return {
      name: studioName,
      phone: '+91 98765 43210',
      email: 'accounts@filmifyweddings.com',
      address: 'StudioCore Hub, Creative District, Mumbai'
    };
  });

  // Dedicated Add Shoot Modal State (Toolbar "+ Add Shoot" trigger)
  const [isAddShootModalOpen, setIsAddShootModalOpen] = useState(false);
  const [shootCoupleName, setShootCoupleName] = useState('');
  const [shootSelectedEvents, setShootSelectedEvents] = useState<string[]>(['Wedding']);
  const [shootCustomEvent, setShootCustomEvent] = useState('');
  const [shootDate, setShootDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shootTime, setShootTime] = useState('10:00 AM - 10:00 PM');
  const [shootRole, setShootRole] = useState(vendor?.primary_role || 'Cinematographer');
  const [shootAgreedFee, setShootAgreedFee] = useState(String(vendor?.daily_rate || vendor?.default_daily_rate || '5000'));
  const [shootPaidAmount, setShootPaidAmount] = useState('0');
  const [shootPayMode, setShootPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [shootPayDate, setShootPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shootPayRef, setShootPayRef] = useState('');
  const [shootNotes, setShootNotes] = useState('');
  const [isSavingShoot, setIsSavingShoot] = useState(false);

  // Add / Edit Non-Shoot Job Modal States
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<HubCategoryTab>('video_editing');
  const [newClientName, setNewClientName] = useState('');
  const [newAlbumType, setNewAlbumType] = useState('Signature Photobook');
  const [newSpecs, setNewSpecs] = useState('30 Sheets (60 Pages)');
  const [newSheets, setNewSheets] = useState('30');
  const [newFee, setNewFee] = useState('5000');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Inline Edit Item State
  const [editingOrder, setEditingOrder] = useState<VendorAlbumOrder | null>(null);

  // Payment & Commercials Modal State
  const [paymentTarget, setPaymentTarget] = useState<VendorAlbumOrder | null>(null);
  const [payDonePrice, setPayDonePrice] = useState('0');
  const [payPaidAmount, setPayPaidAmount] = useState('0');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Comment Drawer State for a specific order
  const [commentTarget, setCommentTarget] = useState<VendorAlbumOrder | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentReminder, setCommentReminder] = useState('');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Check member types and roles
  const isFreelancer = vendor?.primary_type === 'FREELANCER' || (vendor?.member_types || []).includes('FREELANCER');
  const isInHouse = vendor?.primary_type === 'IN_HOUSE' || (vendor?.member_types || []).includes('IN_HOUSE');
  const isPartner = vendor?.primary_type === 'PARTNER' || (vendor?.member_types || []).includes('PARTNER') || vendor?.type === 'partner';

  // Load orders with silent background revalidation
  const loadOrders = useCallback(async (silent = false) => {
    if (!vendor?.id) return;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await fetch(`/api/vendors/albums?workspace_id=${workspaceId}&vendor_id=${vendor.id}&vendor_email=${encodeURIComponent(vendor.email || '')}&vendor_name=${encodeURIComponent(vendor.name || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        memCachedVendorOrders.set(vendor.id, data.orders);
        try {
          localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(data.orders));
          localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(data.orders));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[VendorDeliverablesHubModal] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, vendor]);

  // Synchronous cache loading whenever modal opens or vendor changes
  useEffect(() => {
    if (isOpen && vendor?.id) {
      if (memCachedVendorOrders.has(vendor.id)) {
        setOrders(memCachedVendorOrders.get(vendor.id)!);
      } else if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`) || localStorage.getItem(`vendor_orders_${vendor.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setOrders(parsed);
              memCachedVendorOrders.set(vendor.id, parsed);
            }
          }
        } catch (_) {}
      }
      // Revalidate in background
      loadOrders(memCachedVendorOrders.has(vendor.id) || orders.length > 0);
    }
  }, [isOpen, vendor?.id]);

  // Reset lazy card count when view or filters change
  useEffect(() => {
    setVisibleCardCount(10);
  }, [activeCategoryTab, searchQuery, filters, statusFilter]);

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

  // Dynamic Visible Navigation Tabs
  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: HubCategoryTab; label: string; icon: string; count: number }> = [];

    const shootCount = categoryCounts.shoot;
    const isShootRole = /photo|cinema|drone|traditional|camera|shoot/i.test(vendor.primary_role || '') || isFreelancer || isInHouse;
    if (shootCount > 0 || isShootRole) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
    }

    const videoCount = categoryCounts.video_editing;
    if (videoCount > 0 || /video\s*editor/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'video_editing', label: 'Video Editing', icon: '🎬', count: videoCount });
    }

    const photoCount = categoryCounts.photo_editing;
    if (photoCount > 0 || /photo\s*editor|retouch/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'photo_editing', label: 'Photo Editing', icon: '✨', count: photoCount });
    }

    const albumCount = categoryCounts.album_design;
    if (albumCount > 0 || /album\s*design/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'album_design', label: 'Album Designing', icon: '🎨', count: albumCount });
    }

    const printCount = categoryCounts.album_printing;
    if (printCount > 0 || /print|lab|binding/i.test(vendor.primary_role || '') || isPartner) {
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    if (tabs.length === 0) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    return tabs;
  }, [categoryCounts, vendor.primary_role, isFreelancer, isInHouse, isPartner]);

  useEffect(() => {
    if (isOpen && visibleTabs.length > 0) {
      if (!visibleTabs.some(t => t.id === activeCategoryTab)) {
        const firstWithItems = visibleTabs.find(t => t.count > 0) || visibleTabs[0];
        setActiveCategoryTab(firstWithItems.id);
      }
    }
  }, [isOpen, visibleTabs, activeCategoryTab]);

  // Collect available event types for multi-select filter
  const availableEventTypes = useMemo(() => {
    const set = new Set<string>(PRESET_EVENT_OPTIONS);
    orders.forEach(o => {
      const name = o.event_name || o.item_title || o.album_type;
      if (name && name.trim()) set.add(name.trim());
    });
    return Array.from(set);
  }, [orders]);

  // Collect available crew roles for multi-select filter
  const availableRoles = useMemo(() => {
    const set = new Set<string>([
      'Cinematographer', 
      'Candid Photographer', 
      'Traditional Photographer', 
      'Drone Pilot', 
      'Traditional Videographer', 
      'Assistant', 
      'Lead Editor'
    ]);
    if (vendor.primary_role) set.add(vendor.primary_role);
    (vendor.roles || []).forEach((r: string) => set.add(r));
    orders.forEach(o => {
      if (o.role) set.add(o.role);
      if (o.service_type) set.add(o.service_type);
    });
    return Array.from(set);
  }, [orders, vendor]);

  // Format Shoot Date helper (e.g. 28 NOV 2026 or 18 MAR 2026)
  const formatShootDate = (rawDate?: string): string => {
    if (!rawDate) return 'Date Scheduled';
    try {
      const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = months[parseInt(m, 10) - 1] || m;
        return `${d} ${monthName} ${y}`;
      }
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${monthName} ${year}`;
      }
      return rawDate;
    } catch (_) {
      return rawDate;
    }
  };

  // Filtered Orders for Current Tab with Multi-Select Filters
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Strict Category Match
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      if (itemCat !== activeCategoryTab) return false;

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = (o.client_name || '').toLowerCase().includes(q);
        const matchesAlbum = (o.album_type || o.item_title || o.event_name || '').toLowerCase().includes(q);
        const matchesSpecs = (o.specs || '').toLowerCase().includes(q);
        const matchesRole = (o.role || o.service_type || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesAlbum && !matchesSpecs && !matchesRole) return false;
      }

      // 3. Status Filter (Non-shoots)
      if (activeCategoryTab !== 'shoot' && statusFilter !== 'All' && o.order_status !== statusFilter) {
        return false;
      }

      // 4. Date Range Filter
      const orderDate = o.event_date || o.order_date || o.due_date;
      if (filters.startDate && orderDate && orderDate < filters.startDate) return false;
      if (filters.endDate && orderDate && orderDate > filters.endDate) return false;

      // 5. Event Types Multi-Select Filter
      if (filters.eventTypes.length > 0) {
        const eventName = (o.event_name || o.album_type || o.item_title || '').toLowerCase();
        const matchesEvent = filters.eventTypes.some(et => eventName.includes(et.toLowerCase()));
        if (!matchesEvent) return false;
      }

      // 6. Crew Roles Multi-Select Filter
      if (filters.roles.length > 0) {
        const orderRole = (o.role || o.service_type || '').toLowerCase();
        const matchesRole = filters.roles.some(r => orderRole.includes(r.toLowerCase()));
        if (!matchesRole) return false;
      }

      // 7. Payment Status Multi-Select Filter
      if (filters.paymentStatuses.length > 0) {
        const tot = Number(o.total_amount || 0);
        const paid = Number(o.paid_amount || 0);
        const bal = Number(o.balance_amount || 0);

        let statusKey = 'UNPAID';
        if (tot === 0 && paid === 0 && bal === 0) statusKey = 'UNSETTLED';
        else if (tot > 0 && bal === 0 && paid >= tot) statusKey = 'FULL PAID';
        else if (paid > 0 && bal > 0) statusKey = 'PARTIALLY PAID';
        else statusKey = 'UNPAID';

        if (!filters.paymentStatuses.includes(statusKey)) return false;
      }

      return true;
    });
  }, [orders, activeCategoryTab, searchQuery, statusFilter, filters]);

  // Progressive Lazy Slice
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCardCount);
  }, [filteredOrders, visibleCardCount]);

  // Active Filters Count
  const activeFiltersCount = 
    (filters.startDate || filters.endDate ? 1 : 0) +
    filters.eventTypes.length +
    filters.roles.length +
    filters.paymentStatuses.length;

  // Dynamic Tab Metrics Calculation based on filtered results
  const tabTotalCount = filteredOrders.length;
  const tabFeeSum = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const tabPaidSum = filteredOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
  const tabBalanceDue = Math.max(0, tabFeeSum - tabPaidSum);

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

  // Change Status Handler for non-shoots
  const handleStatusChange = async (order: VendorAlbumOrder, nextStatus: string) => {
    const updated = { ...order, order_status: nextStatus };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));

    await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // ── SAVE DEDICATED NEW SHOOT ──
  const handleSaveNewShoot = async () => {
    if (!shootCoupleName.trim()) return;
    setIsSavingShoot(true);
    const agreedNum = Number(shootAgreedFee) || 0;
    const paidNum = Number(shootPaidAmount) || 0;
    const balNum = Math.max(0, agreedNum - paidNum);
    const isFull = agreedNum > 0 && paidNum >= agreedNum;

    const allEvents = [...shootSelectedEvents];
    if (shootCustomEvent.trim() && !allEvents.includes(shootCustomEvent.trim())) {
      allEvents.push(shootCustomEvent.trim());
    }
    const eventTitle = allEvents.join(', ') || 'Wedding Shoot';

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: shootCoupleName.trim(),
      category: 'shoot',
      item_title: eventTitle,
      event_name: eventTitle,
      album_type: eventTitle,
      specs: shootTime ? `${shootDate} • ${shootTime}` : shootDate || 'Scheduled Shoot',
      service_type: shootRole,
      role: shootRole,
      event_date: shootDate,
      event_time: shootTime,
      sheet_count: 1,
      page_count: 1,
      rate_per_sheet: 0,
      total_amount: agreedNum,
      paid_amount: paidNum,
      balance_amount: balNum,
      order_status: isFull ? 'Completed' : 'In Progress',
      payment_status: isFull ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING',
      order_date: shootDate || new Date().toISOString().split('T')[0],
      due_date: shootDate || '',
      notes: shootNotes.trim(),
    };

    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.order) {
        const newOrder = data.order;
        
        // If payment recorded upfront, sync payment
        if (paidNum > 0) {
          await fetch('/api/vendors/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: newOrder.id,
              workspaceId,
              partnerId: vendor.id,
              partnerName: vendor.name,
              totalAmount: agreedNum,
              paidAmount: paidNum,
              isFullPaid: isFull,
              paymentMode: shootPayMode,
              paymentDate: shootPayDate,
              referenceNo: shootPayRef,
              notes: shootNotes,
              autoSyncExpense: true
            })
          }).catch(() => {});
        }

        setOrders(prev => {
          const updated = [newOrder, ...prev];
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });

        setIsAddShootModalOpen(false);
        setShootCoupleName('');
        setShootSelectedEvents(['Wedding']);
        setShootCustomEvent('');
        setShootPaidAmount('0');
        setShootPayRef('');
        setShootNotes('');
      }
    } catch (err) {
      console.warn('Save shoot error:', err);
    } finally {
      setIsSavingShoot(false);
    }
  };

  // Add / Save New Non-Shoot Assignment
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
      item_title: newAlbumType || 'Creative Task',
      album_type: newAlbumType || 'Creative Task',
      specs: newSpecs.trim() || `${sheetNum} Sheets`,
      sheet_count: sheetNum,
      page_count: sheetNum * 2,
      rate_per_sheet: newCategory === 'album_design' ? Math.round(totalFeeNum / sheetNum) : 0,
      total_amount: totalFeeNum,
      paid_amount: 0,
      balance_amount: totalFeeNum,
      order_status: 'Pending Design',
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
      setOrders(prev => {
        const updated = [json.order, ...prev];
        memCachedVendorOrders.set(vendor.id, updated);
        return updated;
      });
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

  // Open Payment & Commercials Modal
  const handleOpenRecordPayment = (order: VendorAlbumOrder) => {
    setPaymentTarget(order);
    setPayDonePrice(String(order.total_amount || 0));
    setPayPaidAmount(String(order.paid_amount || 0));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('UPI');
    setPayRef('');
    setPayNotes(order.notes || '');
  };

  // Record Payment Submit with Commercials Persistence
  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const doneNum = Number(payDonePrice) || 0;
    const paidNum = Number(payPaidAmount) || 0;
    const isFull = doneNum > 0 && paidNum >= doneNum;
    setIsSubmittingPayment(true);

    try {
      const res = await fetch('/api/vendors/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentTarget.id,
          workspaceId,
          partnerId: vendor.id,
          partnerName: vendor.name,
          totalAmount: doneNum,
          paidAmount: isFull ? doneNum : paidNum,
          isFullPaid: isFull,
          paymentMode: payMode,
          paymentDate: payDate,
          referenceNo: payRef,
          notes: payNotes,
          autoSyncExpense: true
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setPaymentTarget(null);
      } else {
        const bal = Math.max(0, doneNum - paidNum);
        const updated: VendorAlbumOrder = {
          ...paymentTarget,
          total_amount: doneNum,
          paid_amount: paidNum,
          balance_amount: bal,
          payment_status: bal === 0 && doneNum > 0 ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING'
        };
        setOrders(prev => prev.map(o => o.id === paymentTarget.id ? updated : o));
        setPaymentTarget(null);
      }
    } catch (err) {
      console.warn('Payment submit error:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Quick Preset Helper for Notes Reminder
  const setQuickReminderPreset = (preset: 'tomorrow_morning' | 'in_2_days' | 'in_3_days') => {
    const d = new Date();
    if (preset === 'tomorrow_morning') {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    } else if (preset === 'in_2_days') {
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
    } else if (preset === 'in_3_days') {
      d.setDate(d.getDate() + 3);
      d.setHours(10, 0, 0, 0);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dtStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setCommentReminder(dtStr);
  };

  // Add Comment Submit
  const handleAddComment = async (isVoice: boolean = false) => {
    if (!commentTarget || !commentInput.trim()) return;
    setIsSubmittingComment(true);
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
        setShowReminderPicker(false);

        if (commentReminder) {
          window.dispatchEvent(new CustomEvent('studio_reminder_created', {
            detail: {
              deliverable_id: commentTarget.id,
              reminder_at: commentReminder,
              text: commentInput.trim()
            }
          }));
        }
      }
    } catch (err) {
      console.warn('Comment submit error:', err);
    } finally {
      setIsSubmittingComment(false);
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
      album_type: o.event_name || o.item_title || o.album_type || 'Shoot Task',
      event_name: o.event_name,
      event_date: o.event_date || o.order_date,
      event_time: o.event_time,
      role: o.role || o.service_type,
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
        return null;
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

              {/* In Non-Shoots Tab, Show Header "+ Add Assignment" button */}
              {activeCategoryTab !== 'shoot' && (
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
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs ml-1"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Dynamic Visible Navigation Tabs */}
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

          {/* Top 3D Creamy KPI Overview Strip: Dynamic to Filtered Results, "9 Shoots" for shoots tab */}
          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 bg-amber-50/70 border-b border-amber-200/80">
            {/* 1. Total Shoots / Total Jobs */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Total {activeCategoryTab === 'shoot' ? 'Shoots' : (visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments')}
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5 block">
                {tabTotalCount} {activeCategoryTab === 'shoot' ? 'Shoots' : 'Jobs'}
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

          {/* Non-Shoot Add Assignment Inline Form */}
          <AnimatePresence>
            {isAddJobOpen && activeCategoryTab !== 'shoot' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-amber-100/70 border-b border-amber-300 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Create &amp; Assign New Deliverable Task</span>
                  </h4>
                  <button type="button" onClick={() => setIsAddJobOpen(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                    >
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
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Deliverable Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Cinematic Teaser"
                      value={newAlbumType}
                      onChange={(e) => setNewAlbumType(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">Specs / Sheets</label>
                    <input
                      type="text"
                      placeholder="e.g. 30 Sheets (60 Pages)"
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
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Deadline</label>
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
            {/* Left: Search Input + 3D Filters Button */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeCategoryTab === 'shoot' ? "Search couple, event, role..." : "Search couple, deliverable, specs..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              {/* 3D Filter Modal Trigger Button with Active Count Pill */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                  activeFiltersCount > 0
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-amber-900 shadow-2xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Active Filter Chips Preview */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({ startDate: '', endDate: '', eventTypes: [], roles: [], paymentStatuses: [] })}
                  className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer hidden md:inline-block"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Right: Select All + Download Statement + (+ Add Shoot on Shoots Tab) */}
            <div className="flex items-center gap-2 flex-wrap">
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
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Download Statement {selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''}</span>
              </button>

              {/* Dedicated "+ Add Shoot" Button placed directly on toolbar */}
              {activeCategoryTab === 'shoot' && (
                <button
                  type="button"
                  onClick={() => setIsAddShootModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Shoot</span>
                </button>
              )}
            </div>
          </div>

          {/* Deliverables & Assignments List (3D Creamy Cards with Progressive Lazy Rendering) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#FAF8F2]">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-3">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-black text-stone-700">
                  No {activeCategoryTab === 'shoot' ? 'Shoots' : (visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments')} Found
                </h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {activeCategoryTab === 'shoot'
                    ? 'Click "+ Add Shoot" on the toolbar to schedule and assign a new shoot.'
                    : activeCategoryTab === 'album_printing'
                    ? 'Manually add your album printing orders here.'
                    : 'Assign tasks from Post-Production or Bookings, or click "+ Add Assignment" above.'}
                </p>
                {activeCategoryTab === 'shoot' && (
                  <button
                    type="button"
                    onClick={() => setIsAddShootModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition"
                  >
                    + Add New Shoot
                  </button>
                )}
              </div>
            ) : (
              <>
                {displayedOrders.map(order => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const isShoot = order.category === 'shoot';
                  const statusStyle = STATUS_COLOR_MAP[order.order_status] || STATUS_COLOR_MAP['Pending Design'];

                  // Commercials Calculations
                  const tot = Number(order.total_amount || 0);
                  const paid = Number(order.paid_amount || 0);
                  const bal = Number(order.balance_amount || 0);

                  const isZero = tot === 0 && paid === 0 && bal === 0;
                  const isFullPaid = tot > 0 && bal === 0 && paid >= tot;
                  const isPartiallyPaid = paid > 0 && bal > 0;

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-3 ${
                        isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200/90'
                      }`}
                    >
                      {/* Top Row: Checkbox, Couple Name, Category/Event Details, Status */}
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
                            {isShoot ? (
                              /* SHOOTS DETAILS */
                              <div className="space-y-1">
                                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                                  {order.client_name}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-stone-700 font-medium flex-wrap pt-0.5">
                                  {/* Event Name */}
                                  <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
                                    {order.event_name || order.item_title || order.album_type || 'Wedding Event'}
                                  </span>

                                  <span className="text-stone-300">•</span>

                                  {/* Date & Timing */}
                                  <span className="inline-flex items-center gap-1.5 text-stone-700 font-semibold bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200/80 font-mono text-[11px]">
                                    <Calendar className="w-3 h-3 text-amber-600" />
                                    <span>{formatShootDate(order.event_date || order.due_date)}</span>
                                    {order.event_time && (
                                      <>
                                        <span className="text-stone-300">|</span>
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>{order.event_time}</span>
                                      </>
                                    )}
                                  </span>

                                  <span className="text-stone-300">•</span>

                                  {/* Category / Role */}
                                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-300/60 shadow-2xs">
                                    {order.role || order.service_type || 'Shoot Specialist'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* DELIVERABLES DETAILS */
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight">
                                    {order.client_name}
                                  </h3>
                                  {getCategoryBadge(order.category)}
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1 text-xs text-stone-600 font-medium flex-wrap">
                                  <span className="font-bold text-amber-950">
                                    {order.item_title || order.album_type}
                                  </span>
                                  {order.specs && (
                                    <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60 font-bold">
                                      {order.specs}
                                    </span>
                                  )}
                                  {order.due_date && (
                                    <span className="font-mono text-stone-500 text-[11px]">
                                      Due: {order.due_date}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Status: For Shoots: Synchronized Status Pill! */}
                        {isShoot ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {isZero ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-100 text-stone-600 border border-stone-300 shadow-2xs uppercase tracking-wider">
                                UNSETTLED
                              </span>
                            ) : isFullPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                FULL PAID
                              </span>
                            ) : isPartiallyPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                                PARTIALLY PAID
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                                UNPAID
                              </span>
                            )}
                          </div>
                        ) : (
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

                      {/* Bottom Row: Commercials (Agreed, Paid, Balance in RED) & Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 items-center">
                        {/* Financials Strip */}
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                            Agreed Commercials &amp; Balance
                          </span>
                          <div className="flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap">
                            <span className="font-mono font-black text-stone-900">
                              Agreed: ₹{tot.toLocaleString('en-IN')}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="font-mono text-emerald-700 font-bold">
                              Paid: ₹{paid.toLocaleString('en-IN')}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className={`font-mono font-black ${bal > 0 ? 'text-rose-700 font-black' : 'text-stone-500'}`}>
                              Balance: ₹{bal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* PDF Proof / Drive Link for deliverables */}
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
                          ) : null}
                        </div>

                        {/* Action Buttons: Status Button Bug Fixed for 0,0,0 cards */}
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isZero ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                              title="Set agreed commercials & payment"
                            >
                              <AlertCircle className="w-3 h-3 text-stone-500" />
                              <span>Unsettled</span>
                            </button>
                          ) : isFullPaid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Full Paid</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                            >
                              <IndianRupee className="w-3 h-3 text-amber-600" />
                              <span>Record Pay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
                            title="Edit Couple & Event Name"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
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
                })}

                {/* Progressive Lazy Rendering: Load More Button */}
                {visibleCardCount < filteredOrders.length && (
                  <div className="pt-2 pb-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCardCount(prev => prev + 10)}
                      className="px-5 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-black text-xs shadow-2xs transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Load More ({filteredOrders.length - visibleCardCount} remaining)</span>
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── 3D DEDICATED ADD SHOOT MODAL ── */}
          <AnimatePresence>
            {isAddShootModalOpen && (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-xl w-full space-y-4 text-stone-900 overflow-hidden max-h-[92vh] flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900">
                        <Camera className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-amber-950">Add Shoot Assignment</h4>
                        <p className="text-xs text-stone-500 font-medium">Assign new event shoot directly to {vendor.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddShootModalOpen(false)}
                      className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto space-y-4 flex-1 pr-1">
                    {/* Couple Name */}
                    <div>
                      <label className="text-xs font-bold text-stone-600 block mb-1">Couple / Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Vikram & Ananya"
                        value={shootCoupleName}
                        onChange={(e) => setShootCoupleName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* Event Types Multi-Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-600 block">Event Types (Select Multiple)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_EVENT_OPTIONS.map((evt) => {
                          const isChecked = shootSelectedEvents.includes(evt);
                          return (
                            <button
                              key={evt}
                              type="button"
                              onClick={() => {
                                setShootSelectedEvents(prev => 
                                  prev.includes(evt) ? prev.filter(x => x !== evt) : [...prev, evt]
                                );
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                isChecked
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              <span>{evt}</span>
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter custom event title..."
                        value={shootCustomEvent}
                        onChange={(e) => setShootCustomEvent(e.target.value)}
                        className="w-full mt-1.5 p-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* Date & Timing & Role */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-stone-600 block mb-1">Shoot Date *</label>
                        <input
                          type="date"
                          value={shootDate}
                          onChange={(e) => setShootDate(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold font-mono text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-600 block mb-1">Timing / Hours</label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM - 10:00 PM"
                          value={shootTime}
                          onChange={(e) => setShootTime(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-600 block mb-1">Assigned Role</label>
                        <select
                          value={shootRole}
                          onChange={(e) => setShootRole(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                        >
                          <option value="Cinematographer">Cinematographer</option>
                          <option value="Candid Photographer">Candid Photographer</option>
                          <option value="Traditional Photographer">Traditional Photographer</option>
                          <option value="Drone Pilot">Drone Pilot</option>
                          <option value="Traditional Videographer">Traditional Videographer</option>
                          <option value="Assistant">Assistant</option>
                          <option value="Lead Editor">Lead Editor</option>
                        </select>
                      </div>
                    </div>

                    {/* Commercials: Agreed Done Price, Paid Amount + ⚡ Full Paid Shortcut */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                            Agreed Done Price (₹)
                          </label>
                          <input
                            type="number"
                            value={shootAgreedFee}
                            onChange={(e) => setShootAgreedFee(e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black uppercase text-stone-500 block">
                              Paid Amount (₹)
                            </label>
                            <button
                              type="button"
                              onClick={() => setShootPaidAmount(shootAgreedFee)}
                              className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                            >
                              ⚡ Full Paid
                            </button>
                          </div>
                          <input
                            type="number"
                            value={shootPaidAmount}
                            onChange={(e) => setShootPaidAmount(e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono text-emerald-700 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Live Balance Due display */}
                      {(() => {
                        const ag = Number(shootAgreedFee) || 0;
                        const pd = Number(shootPaidAmount) || 0;
                        const bal = Math.max(0, ag - pd);
                        return (
                          <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-amber-200/60">
                            <span className="text-stone-600">Calculated Balance Due:</span>
                            <span className={`font-mono font-black ${bal > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              ₹{bal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payment Details (Visible if Paid > 0) */}
                    {Number(shootPaidAmount) > 0 && (
                      <div className="p-3 bg-white border border-stone-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <span className="text-[10px] font-black uppercase text-stone-400 block">
                          Payment Record Details
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Mode</span>
                            <select
                              value={shootPayMode}
                              onChange={(e) => setShootPayMode(e.target.value as any)}
                              className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <option value="UPI">UPI (Google Pay, PhonePe)</option>
                              <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Date</span>
                            <input
                              type="date"
                              value={shootPayDate}
                              onChange={(e) => setShootPayDate(e.target.value)}
                              className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Reference / UTR</span>
                          <input
                            type="text"
                            placeholder="Optional UTR / Ref Number"
                            value={shootPayRef}
                            onChange={(e) => setShootPayRef(e.target.value)}
                            className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-bold text-stone-600 block mb-1">Notes / Instructions</label>
                      <textarea
                        rows={2}
                        placeholder="Reporting time, location, special gears, or briefing notes..."
                        value={shootNotes}
                        onChange={(e) => setShootNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => setIsAddShootModalOpen(false)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingShoot || !shootCoupleName.trim()}
                      onClick={handleSaveNewShoot}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isSavingShoot ? 'Saving Shoot...' : 'Save & Assign Shoot'}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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
                      <span>Edit Details • {editingOrder.client_name}</span>
                    </h4>
                    <button type="button" onClick={() => setEditingOrder(null)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 py-1">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Couple / Client Name</label>
                      <input
                        type="text"
                        value={editingOrder.client_name}
                        onChange={(e) => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                        {editingOrder.category === 'shoot' ? 'Event Name (e.g. Wedding, Reception)' : 'Event / Task Title'}
                      </label>
                      <input
                        type="text"
                        value={editingOrder.event_name || editingOrder.item_title || editingOrder.album_type}
                        onChange={(e) => setEditingOrder({ ...editingOrder, event_name: e.target.value, item_title: e.target.value, album_type: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
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

          {/* Record Pay & Commercials Modal */}
          <AnimatePresence>
            {paymentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-md w-full space-y-4 text-stone-900"
                >
                  <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-amber-600" />
                        <span>Record Pay &amp; Commercials</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-semibold mt-0.5">
                        {paymentTarget.client_name} • {paymentTarget.event_name || paymentTarget.item_title || paymentTarget.album_type}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPaymentTarget(null)} 
                      className="text-stone-400 hover:text-stone-700 w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-amber-200/80">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                          Agreed Done Price (₹)
                        </label>
                        <input
                          type="number"
                          value={payDonePrice}
                          onChange={(e) => setPayDonePrice(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 block">
                            Paid Amount (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => setPayPaidAmount(payDonePrice)}
                            className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                            title="Set Paid Amount equal to Done Price"
                          >
                            ⚡ Full Paid
                          </button>
                        </div>
                        <input
                          type="number"
                          value={payPaidAmount}
                          onChange={(e) => setPayPaidAmount(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs text-emerald-700"
                        />
                      </div>
                    </div>

                    {/* Live Balance Due Banner */}
                    {(() => {
                      const doneNum = Number(payDonePrice) || 0;
                      const paidNum = Number(payPaidAmount) || 0;
                      const liveBal = Math.max(0, doneNum - paidNum);
                      const isSettled = liveBal === 0 && doneNum > 0;
                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isSettled 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                            : liveBal > 0 
                            ? 'bg-rose-50 border-rose-300 text-rose-900' 
                            : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}>
                          <span className="text-[11px] font-bold">
                            {isSettled ? '✓ Fully Settled' : 'Pending Balance Due:'}
                          </span>
                          <span className={`text-xs font-mono font-black ${liveBal > 0 ? 'text-rose-700 font-black' : 'text-emerald-700 font-bold'}`}>
                            ₹{liveBal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payment Details: Date, Mode, Reference, Notes */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Mode</label>
                        <select
                          value={payMode}
                          onChange={(e) => setPayMode(e.target.value as any)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="UPI">UPI (Google Pay, PhonePe)</option>
                          <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Reference / UTR (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. UTR294018204"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Notes / Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Advance paid on shoot day"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setPaymentTarget(null)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingPayment}
                      onClick={handleRecordPayment}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPayment ? 'Saving...' : 'Confirm & Save Commercials'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Comments & AI Voice Notes Drawer */}
          <AnimatePresence>
            {commentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-lg w-full space-y-4 text-stone-900"
                >
                  <div className="flex items-start justify-between border-b border-amber-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Discussion &amp; AI Voice Notes</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-semibold mt-0.5">
                        {commentTarget.client_name} • {commentTarget.event_name || commentTarget.item_title || commentTarget.album_type}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setCommentTarget(null);
                        setShowReminderPicker(false);
                      }} 
                      className="text-stone-400 hover:text-stone-700 w-7 h-7 rounded-lg hover:bg-stone-200/50 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Previous Comments List */}
                  <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                    {(commentTarget.comments || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400 italic">
                        No notes or comments recorded yet. Add the first instruction or reminder below.
                      </div>
                    ) : (
                      commentTarget.comments?.map(c => (
                        <div key={c.id} className="p-3 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold flex-wrap gap-1">
                            <span className="text-amber-950 font-black">{c.author || 'Studio Lead'}</span>
                            <span className="font-mono text-stone-500 text-[10px]">
                              {c.formatted_time || formatNoteDateTime(c.time)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {c.text}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                            {c.reminder_at && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                                ⏰ Reminder: {formatNoteDateTime(c.reminder_at)}
                              </span>
                            )}
                            {c.is_voice && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                🎙️ Voice Note
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reminder Alert Date & Time Pop-Up / Section */}
                  <AnimatePresence>
                    {showReminderPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <span>Schedule Reminder Alert:</span>
                          </span>
                          {commentReminder && (
                            <button
                              type="button"
                              onClick={() => setCommentReminder('')}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('tomorrow_morning')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            Tomorrow 10 AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('in_2_days')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            In 2 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('in_3_days')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            In 3 Days
                          </button>
                        </div>

                        <input
                          type="datetime-local"
                          value={commentReminder}
                          onChange={(e) => setCommentReminder(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-purple-500 shadow-2xs font-mono"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input Box with AI Voice & Reminder Integration */}
                  <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Type note or click mic for AI Voice transcription..."
                        className="w-full p-3 pb-11 bg-white border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
                      />
                      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowReminderPicker(prev => !prev)}
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                            commentReminder
                              ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                              : showReminderPicker
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-purple-50 hover:text-purple-900'
                          }`}
                          title="Schedule Reminder Alert"
                        >
                          <Bell className="w-3.5 h-3.5 text-purple-600" />
                          <span>Reminder</span>
                        </button>

                        <AiMicButton
                          size="sm"
                          onInsertComment={(transcript) => {
                            setCommentInput(prev => prev ? `${prev} ${transcript}` : transcript);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isSubmittingComment || !commentInput.trim()}
                        onClick={() => handleAddComment(false)}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingComment ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 3D Multi-Select Filter Modal */}
        <VendorDeliverablesFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({ startDate: '', endDate: '', eventTypes: [], roles: [], paymentStatuses: [] })}
          availableEventTypes={availableEventTypes}
          availableRoles={availableRoles}
          totalFilteredCount={filteredOrders.length}
        />

        {/* Minimal Luxury Statement / Invoice Printable Component */}
        <VendorStatementInvoicePdfTemplate
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          vendor={vendor}
          studioName={studioProfile.name || studioName}
          studioPhone={studioProfile.phone}
          studioEmail={studioProfile.email}
          studioAddress={studioProfile.address}
          items={invoiceItems}
        />
      </div>
    </AnimatePresence>
  );
}
