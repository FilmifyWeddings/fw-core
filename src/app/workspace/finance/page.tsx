'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, CreditCard, Receipt, Users, Plus, Search, Filter, 
  Calendar, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  FileText, Download, Printer, ExternalLink, ChevronDown, ChevronUp, Edit3, 
  Trash2, X, RefreshCw, Sparkles, Phone, Calculator, Tag, PieChart, Wallet, 
  ArrowRight, Bell, Send, Check, Crown, Lock, Unlock, ShieldCheck, Key,
  Eye, EyeOff, AlertCircle, CheckSquare, Square, Pencil, MoreVertical, SlidersHorizontal,
  MapPin, CheckCheck, UserCheck, UserPlus, Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractFinancialsFromQuotation, normalizeToIsoDate } from '@/lib/quotation-finance-sync';
import { LeadQuotationModal } from '@/components/dashboard/lead-quotation-modal';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import { ExcelMigrationModal } from '@/components/finance/excel-migration-modal';
import MilestoneStepDropdown from '@/components/finance/MilestoneStepDropdown';
import { FinancePinVerificationCard } from '@/components/finance/FinancePinVerificationCard';
import { FinanceAnalyticsDashboard } from '@/components/finance/FinanceAnalyticsDashboard';
import { FinanceAnalyticsView } from '@/app/workspace/finance/components/FinanceAnalyticsView';
import { ClientFinanceCard } from '@/app/workspace/finance/components/ClientFinanceCard';
import { exportCurrentFinanceToExcel } from '@/lib/excel-finance-migration';
import type { 
  WorkspaceClient, ClientFinanceRecord, FinanceMilestoneItem, FinanceExpenseItem, 
  FinanceAuditLog, FinanceSecuritySettings, Lead, LeadStatus, LeadScore 
} from '@/types';
import { useWorkspaceData } from '@/context/WorkspaceDataContext';

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  'Crew & Freelancer Payout',
  'Photographer Payout',
  'Cinematographer Payout',
  'Video Editor Payout',
  'Drone Operator Payout',
  'Album Printing & Binding',
  'Travel & Flights',
  'Hotel & Accommodation',
  'Equipment Rental',
  'Hard Drives & Delivery',
  'Studio Rent & Utilities',
  'Marketing & Meta Ads',
  'Software & Subscriptions',
  'Miscellaneous'
];

// Initial default team members
const DEFAULT_TEAM_MEMBERS = [
  'Rahul Sharma (Lead Photo)',
  'Sneha Reddy (Lead Editor)',
  'Amit Patel (Cinematographer)',
  'Karan Singh (Drone Operator)',
  'Priya Desai (Client Manager)',
  'Sushant (Operations Head)'
];

export default function FinancePage() {
  const { workspaceMembers } = useWorkspaceData();
  const [activeTab, setActiveTab] = useState<'clients' | 'expenses' | 'analytics'>('clients');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [financeRecords, setFinanceRecords] = useState<ClientFinanceRecord[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpenseItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinanceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // 👥 TEAM MEMBERS LIST & HANDLED BY ATTRIBUTION
  // ─────────────────────────────────────────────────────────────
  const [teamMembersList, setTeamMembersList] = useState<string[]>(DEFAULT_TEAM_MEMBERS);
  const [teamMemberFilter, setTeamMemberFilter] = useState('all');
  const [addingMemberForClientId, setAddingMemberForClientId] = useState<string | null>(null);
  const [newMemberInputName, setNewMemberInputName] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 🪙 PAYMENT TERMS & 3D MILESTONE TEMPLATES
  // ─────────────────────────────────────────────────────────────
  const [paymentMilestoneTemplates, setPaymentMilestoneTemplates] = useState<string[]>([
    'Token Amount',
    'Advance Amount',
    'On Wedding Day'
  ]);

  // ─────────────────────────────────────────────────────────────
  // 🔐 ADMIN SECURITY GATE & HARD PIN LOCK (ZERO DOM EXPOSURE)
  // ─────────────────────────────────────────────────────────────
  const [securitySettings, setSecuritySettings] = useState<FinanceSecuritySettings | null>(null);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(false);
  const [isCheckingPinStatus, setIsCheckingPinStatus] = useState<boolean>(true);
  const [isPinRequired, setIsPinRequired] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // 🔍 UNIFIED ADVANCED FILTERS & SEARCH
  // ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid' | 'overdue_only'>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 📅 LEAD CRM CALENDAR DATE RANGE ENGINE
  // ─────────────────────────────────────────────────────────────
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'this_quarter' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded client cards set
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [openMenuRecordId, setOpenMenuRecordId] = useState<string | null>(null);

  // Category list for expenses & Custom Category creation
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 📜 REAL-TIME AUDIT LOG DRAWER
  // ─────────────────────────────────────────────────────────────
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [auditLogFilter, setAuditLogFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

  // ─────────────────────────────────────────────────────────────
  // 🔔 FINANCIAL NOTIFICATIONS & DUE DATE ALERTS
  // ─────────────────────────────────────────────────────────────
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-close notification, filter & more popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 📊 INTERACTIVE METRIC CARDS DRILL-DOWN MODALS
  // ─────────────────────────────────────────────────────────────
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [upcomingTimeframe, setUpcomingTimeframe] = useState<'7' | '15' | '30' | '90' | 'custom'>('30');

  // ─────────────────────────────────────────────────────────────
  // ✏️ PRICING BREAKDOWN EDIT CONFIRMATION MODAL
  // ─────────────────────────────────────────────────────────────
  const [showPricingEditModal, setShowPricingEditModal] = useState<{
    open: boolean;
    record?: ClientFinanceRecord;
  }>({ open: false });

  const [pricingEditFormData, setPricingEditFormData] = useState({
    base_package_price: '',
    discount_amount: '',
    accommodation_charges: '',
    travel_charges: '',
    additional_charges: '',
    gst_rate: 0
  });

  // ─────────────────────────────────────────────────────────────
  // 💳 COMPLETE PAYMENT / MILESTONE STATUS MODAL
  // ─────────────────────────────────────────────────────────────
  const [showCompletePaymentModal, setShowCompletePaymentModal] = useState<{
    open: boolean;
    recordId: string;
    clientName: string;
    milestone: FinanceMilestoneItem | null;
  }>({ open: false, recordId: '', clientName: '', milestone: null });

  const [completePaymentFormData, setCompletePaymentFormData] = useState({
    amount: '',
    status: 'completed' as 'completed' | 'pending',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    reference_id: '',
    notes: ''
  });

  // ─────────────────────────────────────────────────────────────
  // 💸 GENERAL RECORD PAYMENT & ADD STEP MODALS
  // ─────────────────────────────────────────────────────────────
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<{
    open: boolean;
    client?: WorkspaceClient;
    financeRecord?: ClientFinanceRecord;
    milestoneId?: string;
  }>({ open: false });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_mode: 'UPI',
    reference_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    target_milestone_id: ''
  });

  const [showAddStepModal, setShowAddStepModal] = useState<{
    open: boolean;
    recordId?: string;
  }>({ open: false });

  const [stepFormData, setStepFormData] = useState({
    step_name: '',
    due_date: new Date().toISOString().split('T')[0],
    amount: ''
  });

  // ─────────────────────────────────────────────────────────────
  // ✏️ FLEXIBLE INSTALLMENT QUICK EDIT MODAL
  // ─────────────────────────────────────────────────────────────
  const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false);
  const [editingMilestoneData, setEditingMilestoneData] = useState<{
    recordId: string;
    milestoneId: string;
    step_name: string;
    amount: string;
    due_date: string;
    paid_date: string;
    status: string;
    payment_mode: string;
    reference_id: string;
    notes: string;
  }>({
    recordId: '',
    milestoneId: '',
    step_name: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending',
    payment_mode: 'UPI',
    reference_id: '',
    notes: ''
  });

  // Action dropdown state for milestones
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 💸 TEAM PAYOUTS & EXPENSES EDIT & CREATE MODALS
  // ─────────────────────────────────────────────────────────────
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState<{
    expense_type: 'project_expense' | 'team_payout' | 'other_expense';
    category: string;
    title: string;
    amount: string;
    paid_to: string;
    team_member_id: string;
    payment_mode: string;
    payment_date: string;
    client_id: string;
    notes: string;
  }>({
    expense_type: 'project_expense',
    category: 'Photographer Payout',
    title: '',
    amount: '',
    paid_to: '',
    team_member_id: '',
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    client_id: '',
    notes: ''
  });

  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [expenseEditFormData, setExpenseEditFormData] = useState<{
    id: string;
    expense_type: 'project_expense' | 'team_payout' | 'other_expense';
    category: string;
    title: string;
    amount: string;
    paid_to: string;
    team_member_id: string;
    payment_mode: string;
    payment_date: string;
    client_id: string;
    notes: string;
  }>({
    id: '',
    expense_type: 'project_expense',
    category: 'Photographer Payout',
    title: '',
    amount: '',
    paid_to: '',
    team_member_id: '',
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    client_id: '',
    notes: ''
  });

  const [deleteConfirmExpenseId, setDeleteConfirmExpenseId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 🧾 INVOICE & QUOTATION MODAL
  // ─────────────────────────────────────────────────────────────
  const [showInvoiceModal, setShowInvoiceModal] = useState<{
    open: boolean;
    client?: WorkspaceClient;
    financeRecord?: ClientFinanceRecord;
  }>({ open: false });

  const [quotationModalLead, setQuotationModalLead] = useState<Lead | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [defaultQuotationTemplate, setDefaultQuotationTemplate] = useState<any>(null);
  const [settingFinalLoadingId, setSettingFinalLoadingId] = useState<string | null>(null);
  const [isExcelMigrationModalOpen, setIsExcelMigrationModalOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 🧮 HELPER: COMPUTE TOTALS (STRICT ZERO DUMMY DATA)
  // ─────────────────────────────────────────────────────────────
  function computeFinanceTotals(
    rec: ClientFinanceRecord, 
    customMilestones?: FinanceMilestoneItem[], 
    overrideReceived?: number
  ): ClientFinanceRecord {
    const miles = customMilestones !== undefined ? customMilestones : (rec.milestones || []);
    
    const base = Math.max(0, Math.round(Number(rec.base_package_price || 0)));
    const discount = Math.max(0, Math.round(Number(rec.discount_amount || 0)));
    const accom = Math.max(0, Math.round(Number(rec.accommodation_charges || 0)));
    const travel = Math.max(0, Math.round(Number(rec.travel_charges || 0)));
    const addl = Math.max(0, Math.round(Number(rec.additional_charges || 0)));
    const subtotal = Math.max(0, base - discount + accom + travel + addl);
    const gstRate = Number(rec.gst_rate ?? 0);
    const gstAmount = Math.round((subtotal * gstRate) / 100);
    const finalTotal = subtotal + gstAmount;

    let received = 0;
    if (overrideReceived !== undefined) {
      received = Math.round(overrideReceived);
    } else if (miles.length > 0) {
      received = miles
        .filter(m => m && (m.status === 'completed' || (m as any).status === 'Completed' || (m as any).status === 'PAID' || (m as any).status === 'paid'))
        .reduce((sum, m) => sum + Math.round(Number(m.amount || 0)), 0);
    } else {
      received = Math.round(Number(rec.received_amount || 0));
    }

    const pending = Math.max(0, finalTotal - received);
    const paymentStatus = pending === 0 && finalTotal > 0 ? 'paid' : (received > 0 ? 'partially_paid' : 'pending');

    return {
      ...rec,
      base_package_price: base,
      discount_amount: discount,
      accommodation_charges: accom,
      travel_charges: travel,
      additional_charges: addl,
      subtotal_amount: subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      final_total_amount: finalTotal,
      received_amount: received,
      pending_amount: pending,
      payment_status: paymentStatus,
      milestones: miles
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 🚀 INITIAL SECURITY CHECK (HARD PIN GATE INITIALIZATION)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initSecurityAndSession() {
      setIsCheckingPinStatus(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const wsId = session?.user?.id || 'ws_demo';
        if (isMounted) {
          setCurrentWorkspaceId(wsId);
        }

        // Fetch security settings from DB
        let secData: FinanceSecuritySettings | null = null;
        try {
          let secQuery = supabase.from('finance_security_settings').select('*');
          if (wsId && wsId !== 'ws_demo') {
            secQuery = secQuery.or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`);
          }
          const { data } = await secQuery.maybeSingle();
          secData = data;
        } catch (e) {
          console.warn('Finance security settings notice:', e);
        }

        if (isMounted) {
          setSecuritySettings(secData);

          if (secData && secData.is_locked) {
            setIsPinRequired(true);
            const unlockTimestamp = sessionStorage.getItem(`finance_unlocked_${wsId}`);
            if (unlockTimestamp) {
              const elapsedMinutes = (Date.now() - parseInt(unlockTimestamp, 10)) / (1000 * 60);
              const timeoutMinutes = secData.session_timeout_minutes || 15;
              if (elapsedMinutes < timeoutMinutes) {
                setIsPinVerified(true);
              } else {
                sessionStorage.removeItem(`finance_unlocked_${wsId}`);
                setIsPinVerified(false);
              }
            } else {
              setIsPinVerified(false);
            }
          } else {
            setIsPinRequired(false);
            setIsPinVerified(true);
          }
        }
      } catch (err) {
        console.error('Error during security check:', err);
        if (isMounted) {
          setIsPinRequired(false);
          setIsPinVerified(true);
        }
      } finally {
        if (isMounted) {
          setIsCheckingPinStatus(false);
        }
      }
    }

    initSecurityAndSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 📥 GUARDED DATA FETCH: ONLY DOWNLOADS WHEN PIN IS 100% VERIFIED
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCheckingPinStatus || !isPinVerified || !currentWorkspaceId) return;

    fetchFinanceData();

    const handleExpensesUpdated = () => {
      fetchFinanceData();
    };
    window.addEventListener('finance_expenses_updated', handleExpensesUpdated);
    window.addEventListener('team_finance_updated', handleExpensesUpdated);
    return () => {
      window.removeEventListener('finance_expenses_updated', handleExpensesUpdated);
      window.removeEventListener('team_finance_updated', handleExpensesUpdated);
    };
  }, [isPinVerified, isCheckingPinStatus, currentWorkspaceId]);

  const handleLockVault = () => {
    if (currentWorkspaceId) {
      sessionStorage.removeItem(`finance_unlocked_${currentWorkspaceId}`);
    }
    setIsPinVerified(false);
  };

  // ─────────────────────────────────────────────────────────────
  // 📥 FETCH FINANCE DATA, AUDIT LOGS, CLIENTS & TEAM
  // ─────────────────────────────────────────────────────────────
  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';
      if (session?.user?.id) {
        setCurrentWorkspaceId(session.user.id);
      }

      // 1. Fetch Clients (Initial 50 records limit for sub-300ms transition)
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 49);

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      let clientList = clientData ? [...clientData] : [];

      // 2. Fetch Client Finance Records
      let financeQuery = supabase
        .from('client_finance_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        financeQuery = financeQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: financeData } = await financeQuery;
      const financeMap = new Map<string, ClientFinanceRecord>();
      if (financeData) {
        financeData.forEach(f => financeMap.set(f.client_id, f));
      }

      // 3. Fetch Team Members & Finance Milestone Settings
      try {
        const memberSet = new Set<string>(DEFAULT_TEAM_MEMBERS);
        if (workspaceMembers && workspaceMembers.length > 0) {
          workspaceMembers.forEach(m => {
            if (m.name && m.name.trim()) memberSet.add(m.name.trim());
          });
        }

        // B. Fetch from profiles
        const { data: profiles } = await supabase.from('profiles').select('id, workspace_name');
        if (profiles) {
          profiles.forEach(p => {
            if (p.workspace_name && p.workspace_name.trim()) memberSet.add(p.workspace_name.trim());
          });
        }

        // C. Fetch Handled By from clientList and financeData
        clientList.forEach(c => {
          let handled = (c as any).handled_by || (c as any).assigned_team_member_name;
          if (!handled && (c as any).custom_data?.handled_by) handled = (c as any).custom_data.handled_by;
          if (!handled && c.notes && typeof c.notes === 'string') {
            const match = c.notes.match(/handled_by:\s*([^\n\r,]+)/i);
            if (match && match[1]) handled = match[1].trim();
          }
          if (handled && typeof handled === 'string' && handled.trim()) memberSet.add(handled.trim());
        });

        if (financeData) {
          financeData.forEach(f => {
            const h = (f as any).handled_by;
            if (h && typeof h === 'string' && h.trim()) memberSet.add(h.trim());
          });
        }

        setTeamMembersList(Array.from(memberSet));

        // D. Fetch Payment Milestone Templates from workspace_finance_settings or localStorage
        const templateSet = new Set<string>(['Token Amount', 'Advance Amount', 'On Wedding Day']);
        try {
          const { data: finSettings } = await supabase
            .from('workspace_finance_settings')
            .select('*')
            .eq('user_id', workspaceId)
            .maybeSingle();

          if (finSettings?.payment_milestone_templates && Array.isArray(finSettings.payment_milestone_templates)) {
            finSettings.payment_milestone_templates.forEach((t: string) => {
              if (t && typeof t === 'string' && t.trim()) templateSet.add(t.trim());
            });
          } else {
            const savedLocal = typeof window !== 'undefined' ? localStorage.getItem(`fw_milestone_templates_${workspaceId}`) : null;
            if (savedLocal) {
              const parsed = JSON.parse(savedLocal);
              if (Array.isArray(parsed)) parsed.forEach(t => templateSet.add(t));
            }
          }
        } catch (_) {}

        setPaymentMilestoneTemplates(Array.from(templateSet));

        // E. Fetch Workspace Custom Expense Categories
        if (workspaceId && workspaceId !== 'ws_demo') {
          try {
            const { data: catData } = await supabase
              .from('workspace_expense_categories')
              .select('category_name')
              .eq('workspace_id', workspaceId)
              .order('created_at', { ascending: true });

            if (catData && catData.length > 0) {
              const customCats = catData.map(c => c.category_name);
              setExpenseCategories(Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customCats])));
            }
          } catch (catErr) {
            console.warn('Expense categories lookup notice:', catErr);
          }
        }
      } catch (err) {
        console.warn('Error loading team members or finance settings:', err);
      }

      // 4. Fetch Quotation Documents
      const leadIds = clientList.map(c => c.lead_id).filter(Boolean);
      const quoteDocMap = new Map<string, any>();
      const allLeadQuotesMap = new Map<string, any[]>();
      const leadMap = new Map<string, any>();

      const validLeadIds = leadIds.filter(id => id && typeof id === 'string' && id.trim().length > 0 && id.length >= 8);
      if (validLeadIds.length > 0) {
        try {
          const leadShortFilters = validLeadIds.map(id => `template_id.ilike.%${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}%`);
          const [docsRes, leadsRes] = await Promise.all([
            supabase
              .from('quotation_documents')
              .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
              .or(`lead_id.in.(${validLeadIds.join(',')}),${leadShortFilters.join(',')}`)
              .order('created_at', { ascending: false }),
            supabase
              .from('leads')
              .select('id, name, final_quotation_id, quotation_id')
              .in('id', validLeadIds)
          ]);

          if (leadsRes.data) {
            leadsRes.data.forEach(l => leadMap.set(l.id, l));
          }

          const quoteDocs = docsRes.data;
          if (quoteDocs && quoteDocs.length > 0) {
            const leadGroups = new Map<string, any[]>();
            for (const doc of quoteDocs) {
              const matchedLeadId = doc.lead_id || leadIds.find(lid => doc.template_id?.includes(lid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)));
              if (matchedLeadId) {
                if (!leadGroups.has(matchedLeadId)) leadGroups.set(matchedLeadId, []);
                leadGroups.get(matchedLeadId)!.push(doc);
              }
            }

            leadGroups.forEach((docs, leadId) => {
              allLeadQuotesMap.set(leadId, docs);
              const leadObj = leadMap.get(leadId);
              const finalDoc = docs.find(d => 
                d.content_json?.is_final === true || 
                d.is_final === true || 
                (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id))
              );
              if (finalDoc) {
                quoteDocMap.set(leadId, finalDoc);
              }
            });
          }
        } catch (err) {
          console.warn('[Finance] Error fetching quotation documents:', err);
        }
      }

      // 5. Synthesize Records (ZERO DUMMY DATA GUARANTEE)
      const finalRecords: ClientFinanceRecord[] = [];

      for (const c of clientList) {
        const existing = financeMap.get(c.id);
        const leadObj = c.lead_id ? leadMap.get(c.lead_id) : null;
        const leadDocs = c.lead_id ? (allLeadQuotesMap.get(c.lead_id) || []) : [];
        const availableQuotes = leadDocs.map(d => {
          const v = Number(d.lead_version || d.version || 1);
          const f = d.content_json ? extractFinancialsFromQuotation(d.content_json, c.event_date) : null;
          const couple = d.content_json?.cover?.coupleName || d.content_json?.cover?.groomName || '';
          const isFinal = d.content_json?.is_final === true || 
            d.is_final === true || 
            (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id));
          return {
            template_id: d.template_id,
            version: v,
            title: couple ? `${couple} (v${v}.0)` : `Quotation v${v}.0`,
            is_final: Boolean(isFinal),
            created_at: d.created_at,
            financials: f
          };
        });

        let linkedFinalQuote = c.lead_id ? quoteDocMap.get(c.lead_id) : null;
        if (!linkedFinalQuote && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs.find(d => 
            d.content_json?.is_final === true || 
            d.is_final === true || 
            (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id))
          );
        }
        if (!linkedFinalQuote && leadObj?.final_quotation_id && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs.find(d => d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id) || leadDocs[0];
        }

        const hasFinalQuotation = Boolean(linkedFinalQuote || leadObj?.final_quotation_id);
        if (!linkedFinalQuote && hasFinalQuotation && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs[0];
        }

        const finalVersion = linkedFinalQuote ? Number(linkedFinalQuote.lead_version || linkedFinalQuote.version || 1) : undefined;
        const qFinancials = linkedFinalQuote && linkedFinalQuote.content_json
          ? extractFinancialsFromQuotation(linkedFinalQuote.content_json, c.event_date)
          : null;

        // Extract handled by attribution
        const handledBy = (c as any).handled_by || (c as any).assigned_team_member_name || (existing as any)?.handled_by || 'Unassigned';

        if (hasFinalQuotation && qFinancials && qFinancials.final_total_amount > 0) {
          const isDbCorruptOrMissing = !existing || 
            Number(existing.final_total_amount) <= 0 || 
            Number(existing.base_package_price) <= 10 || 
            existing.final_total_amount !== qFinancials.final_total_amount;

          const recordData: ClientFinanceRecord = {
            id: existing?.id || `fin_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: { ...c, handled_by: handledBy } as any,
            has_final_quotation: true,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote.template_id,
            available_quotations: availableQuotes,
            base_package_price: qFinancials.base_package_price,
            discount_amount: qFinancials.discount_amount,
            accommodation_charges: qFinancials.accommodation_charges,
            travel_charges: qFinancials.travel_charges,
            additional_charges: qFinancials.additional_charges,
            subtotal_amount: qFinancials.subtotal_amount,
            gst_rate: qFinancials.gst_rate,
            gst_amount: qFinancials.gst_amount,
            final_total_amount: qFinancials.final_total_amount,
            received_amount: existing?.received_amount !== undefined && existing.received_amount > qFinancials.received_amount
              ? Math.round(Number(existing.received_amount))
              : qFinancials.received_amount,
            pending_amount: Math.max(0, qFinancials.final_total_amount - (existing?.received_amount !== undefined && existing.received_amount > qFinancials.received_amount ? Number(existing.received_amount) : qFinancials.received_amount)),
            payment_status: (existing?.payment_status && existing.payment_status !== 'pending')
              ? existing.payment_status
              : qFinancials.payment_status,
            milestones: Array.isArray(existing?.milestones) && existing.milestones.length > 0 && !isDbCorruptOrMissing
              ? existing.milestones
              : qFinancials.milestones,
            created_at: existing?.created_at || c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          finalRecords.push(recordData);
        } else if (existing) {
          const rawBase = Math.max(0, Math.round(Number(existing.base_package_price) || Number(c.total_package_amount) || 0));
          const discount = Math.max(0, Math.round(Number(existing.discount_amount) || 0));
          const accommodation = Math.max(0, Math.round(Number(existing.accommodation_charges) || 0));
          const travel = Math.max(0, Math.round(Number(existing.travel_charges) || 0));
          const additional = Math.max(0, Math.round(Number(existing.additional_charges) || 0));
          const subtotal = Math.max(0, rawBase - discount + accommodation + travel + additional);
          const gstRate = Number(existing.gst_rate) || 0;
          const gstAmount = Math.round((subtotal * gstRate) / 100);
          const finalTotal = subtotal + gstAmount;
          const received = Math.max(0, Math.round(Number(existing.received_amount) || Number(c.paid_amount) || 0));
          const pending = Math.max(0, finalTotal - received);

          finalRecords.push({
            ...existing,
            client: { ...c, handled_by: handledBy } as any,
            has_final_quotation: hasFinalQuotation,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote?.template_id || leadObj?.final_quotation_id || undefined,
            available_quotations: availableQuotes,
            base_package_price: rawBase,
            discount_amount: discount,
            accommodation_charges: accommodation,
            travel_charges: travel,
            additional_charges: additional,
            subtotal_amount: subtotal,
            gst_rate: gstRate,
            gst_amount: gstAmount,
            final_total_amount: finalTotal,
            received_amount: received,
            pending_amount: pending,
            payment_status: pending === 0 && finalTotal > 0 ? 'paid' : received > 0 ? 'partially_paid' : 'pending',
            milestones: Array.isArray(existing.milestones) ? existing.milestones : []
          });
        } else {
          // CLEAN INITIAL STATE: STRICT ZERO DUMMY DATA FOR NEW BOOKED CLIENTS
          const basePkg = Math.max(0, Math.round(Number(c.total_package_amount) || 0));
          const received = Math.max(0, Math.round(Number(c.paid_amount) || 0));
          const subtotal = basePkg;
          const finalTotal = subtotal;
          const pending = Math.max(0, finalTotal - received);

          const newRecord: ClientFinanceRecord = {
            id: `fin_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: { ...c, handled_by: handledBy } as any,
            has_final_quotation: false,
            final_quotation_version: undefined,
            final_quotation_id: undefined,
            available_quotations: availableQuotes,
            base_package_price: basePkg,
            discount_amount: 0,
            accommodation_charges: 0,
            travel_charges: 0,
            additional_charges: 0,
            subtotal_amount: subtotal,
            gst_rate: 0,
            gst_amount: 0,
            final_total_amount: finalTotal,
            received_amount: received,
            pending_amount: pending,
            payment_status: pending === 0 && finalTotal > 0 ? 'paid' : received > 0 ? 'partially_paid' : 'pending',
            milestones: [], // STRICT ZERO DUMMY STEPS
            created_at: c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          finalRecords.push(newRecord);
        }
      }

      setFinanceRecords(finalRecords);
      if (finalRecords.length > 0) {
        setExpandedCards(new Set([finalRecords[0].id]));
      }

      // 6. Fetch Expenses (Initial 50 records limit for sub-300ms transition)
      let expenseQuery = supabase
        .from('finance_expenses')
        .select('*')
        .order('payment_date', { ascending: false })
        .range(0, 49);

      if (workspaceId && workspaceId !== 'ws_demo') {
        expenseQuery = expenseQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: expenseData } = await expenseQuery;
      setExpenses(expenseData || []);

      // 7. Fetch Audit Logs
      try {
        let auditQuery = supabase
          .from('finance_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (workspaceId && workspaceId !== 'ws_demo') {
          auditQuery = auditQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }

        const { data: auditData } = await auditQuery;
        if (auditData) {
          setAuditLogs(auditData as FinanceAuditLog[]);
        }
      } catch (auditErr) {
        console.warn('Audit logs fetch notice:', auditErr);
      }

      setClients(clientList);
    } catch (e) {
      console.error('Error fetching finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 📝 LOG AUDIT ENTRY HELPER
  // ─────────────────────────────────────────────────────────────
  const logAudit = async (
    log_type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'SECURITY',
    amount: number,
    description: string,
    client_id?: string | null,
    client_name?: string | null,
    payment_mode?: string | null
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';
      const actorName = session?.user?.user_metadata?.full_name || 'Admin';

      const entry: FinanceAuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        workspace_id: workspaceId,
        user_id: workspaceId,
        client_id: client_id || null,
        client_name: client_name || null,
        log_type,
        amount: Math.round(amount || 0),
        actor_name: actorName,
        description,
        payment_mode: payment_mode || null,
        created_at: new Date().toISOString()
      };

      setAuditLogs(prev => [entry, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('finance_audit_logs').insert([entry]);
      }
    } catch (err) {
      console.warn('Failed to log finance audit:', err);
    }
  };

  // Toggle card expansion
  const toggleCard = (recordId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  // Persist finance record changes to Supabase
  const updateFinanceRecordInDB = async (record: ClientFinanceRecord) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const payload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        client_id: record.client_id,
        base_package_price: Math.round(record.base_package_price),
        discount_amount: Math.round(record.discount_amount),
        accommodation_charges: Math.round(record.accommodation_charges),
        travel_charges: Math.round(record.travel_charges),
        additional_charges: Math.round(record.additional_charges),
        subtotal_amount: Math.round(record.subtotal_amount),
        gst_rate: record.gst_rate,
        gst_amount: Math.round(record.gst_amount),
        final_total_amount: Math.round(record.final_total_amount),
        received_amount: Math.round(record.received_amount),
        pending_amount: Math.round(record.pending_amount),
        payment_status: record.payment_status,
        milestones: record.milestones || [],
        updated_at: new Date().toISOString()
      };

      if (workspaceId !== 'ws_demo') {
        const { data: existingRec } = await supabase
          .from('client_finance_records')
          .select('id')
          .eq('client_id', record.client_id)
          .maybeSingle();

        if (existingRec) {
          await supabase
            .from('client_finance_records')
            .update(payload)
            .eq('client_id', record.client_id);
        } else {
          await supabase
            .from('client_finance_records')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
        }

        // Also update client totals
        await supabase
          .from('workspace_clients')
          .update({
            total_package_amount: record.final_total_amount,
            paid_amount: record.received_amount,
            status: record.pending_amount === 0 && record.final_total_amount > 0 ? 'completed' : 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', record.client_id);
      }
    } catch (e) {
      console.error('Error updating finance record in DB:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 👥 TEAM ATTRIBUTION: HANDLE ASSIGN MEMBER TO CLIENT
  // ─────────────────────────────────────────────────────────────
  const handleAssignTeamMember = async (clientId: string, memberName: string) => {
    if (!clientId) return;

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.client_id === clientId) {
        return {
          ...rec,
          client: { ...rec.client, handled_by: memberName } as any
        };
      }
      return rec;
    }));

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, handled_by: memberName } as any;
      }
      return c;
    }));

    try {
      // 1. Fetch current client to preserve custom_data and notes
      const { data: currentClient } = await supabase
        .from('workspace_clients')
        .select('notes, custom_data')
        .eq('id', clientId)
        .maybeSingle();

      const existingNotes = currentClient?.notes || '';
      let newNotes = existingNotes;
      if (newNotes.includes('handled_by:')) {
        newNotes = newNotes.replace(/handled_by:\s*[^\n\r,]+/i, `handled_by: ${memberName}`);
      } else {
        newNotes = newNotes ? `${newNotes}\nhandled_by: ${memberName}` : `handled_by: ${memberName}`;
      }

      const existingCustom = (currentClient?.custom_data as any) || {};
      const updatedCustom = { ...existingCustom, handled_by: memberName };

      // Update workspace_clients with handled_by column + custom_data + notes fallback
      await supabase
        .from('workspace_clients')
        .update({
          handled_by: memberName,
          custom_data: updatedCustom,
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      // Also update client_finance_records
      await supabase
        .from('client_finance_records')
        .update({
          handled_by: memberName,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      const targetClient = clients.find(c => c.id === clientId);
      logAudit(
        'ADJUSTMENT',
        0,
        `Assigned ${targetClient?.name || 'Client'} to team member: "${memberName}"`,
        clientId,
        targetClient?.name
      );
    } catch (err) {
      console.warn('Error saving team member assignment:', err);
    }
  };

  const handleAddNewTeamMember = async (clientId: string) => {
    if (!newMemberInputName.trim()) return;
    const cleanName = newMemberInputName.trim();
    if (!teamMembersList.includes(cleanName)) {
      setTeamMembersList(prev => [...prev, cleanName]);
    }

    // Persist new team member to fw_team_members in Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id;
      if (workspaceId) {
        await supabase.from('fw_team_members').insert([{
          user_id: workspaceId,
          workspace_id: workspaceId,
          name: cleanName,
          primary_role: 'Executive',
          is_active: true,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (e) {
      console.warn('Could not insert team member into fw_team_members:', e);
    }

    await handleAssignTeamMember(clientId, cleanName);
    setAddingMemberForClientId(null);
    setNewMemberInputName('');
  };

  // ─────────────────────────────────────────────────────────────
  // 🪙 PAYMENT TERMS & MILESTONE TEMPLATES SAVING
  // ─────────────────────────────────────────────────────────────
  const handleSaveNewMilestoneTemplate = async (newTemplateName: string) => {
    if (!newTemplateName || !newTemplateName.trim()) return;
    const clean = newTemplateName.trim();

    let updatedList = [...paymentMilestoneTemplates];
    if (!updatedList.includes(clean)) {
      updatedList = [...updatedList, clean];
      setPaymentMilestoneTemplates(updatedList);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Save in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`fw_milestone_templates_${workspaceId}`, JSON.stringify(updatedList));
      }

      // 2. Persist in workspace_finance_settings in Supabase
      if (workspaceId !== 'ws_demo') {
        const { data: existing } = await supabase
          .from('workspace_finance_settings')
          .select('id')
          .eq('user_id', workspaceId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('workspace_finance_settings')
            .update({
              payment_milestone_templates: updatedList,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', workspaceId);
        } else {
          await supabase
            .from('workspace_finance_settings')
            .insert([{
              user_id: workspaceId,
              workspace_id: workspaceId,
              payment_milestone_templates: updatedList,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
        }
      }
    } catch (e) {
      console.warn('Error persisting milestone template in DB:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ✏️ PRICING BREAKDOWN EDIT CONFIRMATION MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOpenPricingEditModal = (rec: ClientFinanceRecord) => {
    setPricingEditFormData({
      base_package_price: String(rec.base_package_price || 0),
      discount_amount: String(rec.discount_amount || 0),
      accommodation_charges: String(rec.accommodation_charges || 0),
      travel_charges: String(rec.travel_charges || 0),
      additional_charges: String(rec.additional_charges || 0),
      gst_rate: Number(rec.gst_rate || 0)
    });
    setShowPricingEditModal({ open: true, record: rec });
  };

  const handleSavePricingBreakdown = () => {
    if (!showPricingEditModal.record) return;
    const rec = showPricingEditModal.record;

    const base = Math.max(0, Math.round(parseFloat(pricingEditFormData.base_package_price) || 0));
    const discount = Math.max(0, Math.round(parseFloat(pricingEditFormData.discount_amount) || 0));
    const accom = Math.max(0, Math.round(parseFloat(pricingEditFormData.accommodation_charges) || 0));
    const travel = Math.max(0, Math.round(parseFloat(pricingEditFormData.travel_charges) || 0));
    const addl = Math.max(0, Math.round(parseFloat(pricingEditFormData.additional_charges) || 0));
    const gstRate = Math.max(0, Number(pricingEditFormData.gst_rate || 0));

    const updatedRecordObj: ClientFinanceRecord = {
      ...rec,
      base_package_price: base,
      discount_amount: discount,
      accommodation_charges: accom,
      travel_charges: travel,
      additional_charges: addl,
      gst_rate: gstRate
    };

    const finalUpdated = computeFinanceTotals(updatedRecordObj);

    setFinanceRecords(prev => prev.map(r => r.id === rec.id ? finalUpdated : r));
    updateFinanceRecordInDB(finalUpdated);

    logAudit(
      'ADJUSTMENT',
      finalUpdated.final_total_amount,
      `Updated pricing breakdown for ${rec.client?.name || 'Client'}: Net Investment ₹${finalUpdated.final_total_amount.toLocaleString('en-IN')}`,
      rec.client_id,
      rec.client?.name
    );

    setShowPricingEditModal({ open: false });
  };

  // ─────────────────────────────────────────────────────────────
  // 💳 COMPLETE PAYMENT / MILESTONE STATUS MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOpenCompletePaymentModal = (record: ClientFinanceRecord, milestone: FinanceMilestoneItem) => {
    const isCompleted = milestone.status === 'completed' || milestone.status === 'paid' || (milestone.status as string) === 'Completed';
    setCompletePaymentFormData({
      amount: String(milestone.amount || 0),
      status: isCompleted ? 'completed' : 'completed',
      payment_date: milestone.paid_date || new Date().toISOString().split('T')[0],
      payment_mode: milestone.payment_mode || 'UPI',
      reference_id: milestone.reference_id || '',
      notes: milestone.notes || ''
    });
    setShowCompletePaymentModal({
      open: true,
      recordId: record.id,
      clientName: record.client?.name || 'Client',
      milestone
    });
  };

  const handleSaveCompletePaymentModal = () => {
    const { recordId, milestone } = showCompletePaymentModal;
    if (!recordId || !milestone) return;

    const numAmt = Math.round(parseFloat(completePaymentFormData.amount) || 0);
    const isComp = completePaymentFormData.status === 'completed';

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestone.id) {
            return {
              ...m,
              amount: numAmt,
              status: (completePaymentFormData.status as any),
              paid_date: isComp ? (completePaymentFormData.payment_date || new Date().toISOString().split('T')[0]) : undefined,
              payment_mode: isComp ? completePaymentFormData.payment_mode : undefined,
              reference_id: completePaymentFormData.reference_id || null,
              notes: completePaymentFormData.notes || null
            };
          }
          return m;
        });

        const finalUpdated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(finalUpdated);

        logAudit(
          isComp ? 'INCOME' : 'ADJUSTMENT',
          numAmt,
          `${isComp ? 'Recorded Payment' : 'Updated Milestone'} "${milestone.step_name || 'Milestone'}" for ${rec.client?.name || 'Client'}: ₹${numAmt.toLocaleString('en-IN')} (${completePaymentFormData.payment_mode})`,
          rec.client_id,
          rec.client?.name,
          completePaymentFormData.payment_mode
        );

        return finalUpdated;
      }
      return rec;
    }));

    setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null });
  };

  // Handle Milestone Inline Editing
  const handleMilestoneStepChange = (recordId: string, milestoneId: string, field: keyof FinanceMilestoneItem, val: any) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, [field]: val };
          }
          return m;
        });
        const finalUpdated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(finalUpdated);
        return finalUpdated;
      }
      return rec;
    }));
  };

  // Handle Deleting a Milestone Step
  const handleDeleteMilestone = (recordId: string, milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this payment milestone?')) return;

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const target = (rec.milestones || []).find(m => m.id === milestoneId);
        const updatedMilestones = (rec.milestones || []).filter(m => m.id !== milestoneId);
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);

        if (target) {
          logAudit(
            'ADJUSTMENT',
            target.amount,
            `Removed installment "${target.step_name || target.title}" from ${rec.client?.name || 'Client'}`,
            rec.client_id,
            rec.client?.name
          );
        }

        return updated;
      }
      return rec;
    }));
    setOpenActionMenuId(null);
  };

  // Open Edit Milestone Modal
  const handleOpenEditMilestone = (recordId: string, milestone: FinanceMilestoneItem) => {
    setEditingMilestoneData({
      recordId,
      milestoneId: milestone.id,
      step_name: milestone.step_name || milestone.title || 'Payment Milestone',
      amount: String(milestone.amount || 0),
      due_date: milestone.due_date || new Date().toISOString().split('T')[0],
      paid_date: milestone.paid_date || '',
      status: milestone.status || 'pending',
      payment_mode: milestone.payment_mode || 'UPI',
      reference_id: milestone.reference_id || '',
      notes: milestone.notes || ''
    });
    setShowEditMilestoneModal(true);
    setOpenActionMenuId(null);
  };

  const handleSaveEditedMilestone = () => {
    const { recordId, milestoneId, step_name, amount, due_date, paid_date, status, payment_mode, reference_id, notes } = editingMilestoneData;
    const numAmt = Math.round(parseFloat(amount) || 0);

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              step_name: step_name.trim(),
              title: step_name.trim(),
              amount: numAmt,
              due_date: due_date || null,
              paid_date: status === 'completed' || status === 'paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null,
              status: (status as any),
              payment_mode: status === 'completed' || status === 'paid' ? payment_mode : undefined,
              reference_id: reference_id || null,
              notes: notes || null
            };
          }
          return m;
        });

        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);

        logAudit(
          status === 'completed' || status === 'paid' ? 'INCOME' : 'ADJUSTMENT',
          numAmt,
          `Updated installment "${step_name}" to ₹${numAmt.toLocaleString('en-IN')} (Status: ${status}, Mode: ${payment_mode})`,
          rec.client_id,
          rec.client?.name,
          payment_mode
        );

        return updated;
      }
      return rec;
    }));

    setShowEditMilestoneModal(false);
  };

  // Record Payment Modal Save
  const handleSaveRecordedPayment = () => {
    if (!showRecordPaymentModal.financeRecord) return;
    const rec = showRecordPaymentModal.financeRecord;
    const paidAmt = Math.round(parseFloat(paymentFormData.amount) || 0);
    if (paidAmt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    let updatedMilestones = Array.isArray(rec.milestones) ? [...rec.milestones] : [];
    
    if (paymentFormData.target_milestone_id) {
      updatedMilestones = updatedMilestones.map(m => {
        if (m.id === paymentFormData.target_milestone_id) {
          return {
            ...m,
            amount: paidAmt,
            status: 'completed' as const,
            paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
            payment_mode: paymentFormData.payment_mode || 'UPI',
            reference_id: paymentFormData.reference_id || null,
            notes: paymentFormData.notes || null
          };
        }
        return m;
      });
    } else {
      const firstPendingIdx = updatedMilestones.findIndex(m => m.status !== 'completed' && m.status !== 'paid');
      if (firstPendingIdx !== -1) {
        updatedMilestones[firstPendingIdx] = {
          ...updatedMilestones[firstPendingIdx],
          amount: paidAmt,
          status: 'completed' as const,
          paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          payment_mode: paymentFormData.payment_mode || 'UPI',
          reference_id: paymentFormData.reference_id || null,
          notes: paymentFormData.notes || null
        };
      } else {
        updatedMilestones.push({
          id: `m_pay_${Date.now()}`,
          step_name: `Payment (${paymentFormData.payment_mode || 'UPI'})`,
          due_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          amount: paidAmt,
          status: 'completed',
          payment_mode: paymentFormData.payment_mode || 'UPI',
          reference_id: paymentFormData.reference_id || null,
          notes: paymentFormData.notes || null
        });
      }
    }

    const updatedRecord = computeFinanceTotals(rec, updatedMilestones);
    setFinanceRecords(prev => prev.map(r => r.id === rec.id ? updatedRecord : r));
    updateFinanceRecordInDB(updatedRecord);

    logAudit(
      'INCOME',
      paidAmt,
      `Recorded payment of ₹${paidAmt.toLocaleString('en-IN')} (${paymentFormData.payment_mode}) for ${rec.client?.name || 'Client'}`,
      rec.client_id,
      rec.client?.name,
      paymentFormData.payment_mode
    );

    setShowRecordPaymentModal({ open: false });
    setPaymentFormData({
      amount: '',
      payment_mode: 'UPI',
      reference_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
      target_milestone_id: ''
    });
  };

  // Add Step Modal Save
  const handleSaveNewStep = () => {
    if (!showAddStepModal.recordId || !stepFormData.step_name.trim()) {
      alert('Please enter Step Name');
      return;
    }

    const amt = Math.round(parseFloat(stepFormData.amount) || 0);
    const newMilestone: FinanceMilestoneItem = {
      id: `m_step_${Date.now()}`,
      step_name: stepFormData.step_name.trim(),
      title: stepFormData.step_name.trim(),
      due_date: stepFormData.due_date,
      amount: amt,
      status: 'pending'
    };

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === showAddStepModal.recordId) {
        const updatedMilestones = [...(rec.milestones || []), newMilestone];
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);

        logAudit(
          'ADJUSTMENT',
          amt,
          `Added new milestone step "${stepFormData.step_name.trim()}" (₹${amt.toLocaleString('en-IN')}) for ${rec.client?.name || 'Client'}`,
          rec.client_id,
          rec.client?.name
        );

        return updated;
      }
      return rec;
    }));

    setShowAddStepModal({ open: false });
    setStepFormData({
      step_name: '',
      due_date: new Date().toISOString().split('T')[0],
      amount: ''
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 💸 EXPENSES & TEAM PAYOUTS MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  const handleCreateCustomCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || currentWorkspaceId;
      if (wsId && wsId !== 'ws_demo') {
        await supabase
          .from('workspace_expense_categories')
          .insert({
            workspace_id: wsId,
            category_name: trimmed,
            is_default: false
          });
      }
      setExpenseCategories(prev => Array.from(new Set([...prev, trimmed])));
      setExpenseFormData(prev => ({ ...prev, category: trimmed }));
      setExpenseEditFormData(prev => ({ ...prev, category: trimmed }));
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    } catch (err) {
      console.error('Error creating custom category:', err);
    }
  };

  const handleSaveExpense = async () => {
    const amt = Math.round(parseFloat(expenseFormData.amount) || 0);
    if (!expenseFormData.title || amt <= 0) {
      alert('Please enter Expense Title and a valid Amount.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newExp: FinanceExpenseItem & { team_member_id?: string | null } = {
        id: `exp_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        client_id: expenseFormData.client_id || null,
        expense_type: expenseFormData.expense_type,
        category: expenseFormData.category,
        title: expenseFormData.title,
        amount: amt,
        paid_to: expenseFormData.paid_to || null,
        team_member_id: expenseFormData.team_member_id || null,
        payment_mode: expenseFormData.payment_mode,
        payment_date: expenseFormData.payment_date,
        status: 'paid',
        notes: expenseFormData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExpenses(prev => [newExp, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('finance_expenses').insert([newExp]);
      }

      const clientObj = clients.find(c => c.id === newExp.client_id);
      logAudit(
        'EXPENSE',
        amt,
        `Logged ${newExp.category}: "${newExp.title}" paid to ${newExp.paid_to || 'Vendor'} (${newExp.payment_mode})`,
        newExp.client_id,
        clientObj?.name,
        newExp.payment_mode
      );

      setShowAddExpenseModal(false);
      setExpenseFormData({
        expense_type: 'project_expense',
        category: expenseCategories[0] || 'Photographer Payout',
        title: '',
        amount: '',
        paid_to: '',
        team_member_id: '',
        payment_mode: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        client_id: '',
        notes: ''
      });
    } catch (e) {
      console.error('Error saving expense:', e);
    }
  };

  const handleOpenEditExpense = (exp: FinanceExpenseItem & { team_member_id?: string | null }) => {
    setExpenseEditFormData({
      id: exp.id,
      expense_type: exp.expense_type || 'project_expense',
      category: exp.category || 'Photographer Payout',
      title: exp.title || '',
      amount: String(exp.amount || 0),
      paid_to: exp.paid_to || '',
      team_member_id: exp.team_member_id || '',
      payment_mode: exp.payment_mode || 'UPI',
      payment_date: exp.payment_date || new Date().toISOString().split('T')[0],
      client_id: exp.client_id || '',
      notes: exp.notes || ''
    });
    setShowEditExpenseModal(true);
  };

  const handleSaveEditedExpense = async () => {
    const amt = Math.round(parseFloat(expenseEditFormData.amount) || 0);
    if (!expenseEditFormData.title || amt <= 0) {
      alert('Please enter Title and a valid Amount.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const updatedExp: FinanceExpenseItem & { team_member_id?: string | null } = {
        id: expenseEditFormData.id,
        workspace_id: workspaceId,
        user_id: workspaceId,
        client_id: expenseEditFormData.client_id || null,
        expense_type: expenseEditFormData.expense_type,
        category: expenseEditFormData.category,
        title: expenseEditFormData.title,
        amount: amt,
        paid_to: expenseEditFormData.paid_to || null,
        team_member_id: expenseEditFormData.team_member_id || null,
        payment_mode: expenseEditFormData.payment_mode,
        payment_date: expenseEditFormData.payment_date,
        status: 'paid',
        notes: expenseEditFormData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExpenses(prev => prev.map(e => e.id === updatedExp.id ? updatedExp : e));

      if (workspaceId !== 'ws_demo') {
        await supabase
          .from('finance_expenses')
          .update(updatedExp)
          .eq('id', updatedExp.id);
      }

      logAudit(
        'EXPENSE',
        amt,
        `Updated expense: "${updatedExp.title}" (₹${amt.toLocaleString('en-IN')})`,
        updatedExp.client_id,
        null,
        updatedExp.payment_mode
      );

      setShowEditExpenseModal(false);
    } catch (err) {
      console.error('Error editing expense:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      setExpenses(prev => prev.filter(e => e.id !== id));

      if (workspaceId !== 'ws_demo') {
        await supabase.from('finance_expenses').delete().eq('id', id);
      }

      logAudit(
        'ADJUSTMENT',
        target.amount,
        `Deleted expense: "${target.title}" (₹${target.amount.toLocaleString('en-IN')})`,
        target.client_id
      );

      setDeleteConfirmExpenseId(null);
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 🔍 DYNAMIC UNIFIED FILTERING & METRICS ENGINE
  // ─────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    clients.forEach(c => {
      if (c.event_type) cats.add(c.event_type);
    });
    return Array.from(cats);
  }, [clients]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    clients.forEach(c => {
      const loc = (c as any).city || (c as any).venue;
      if (loc && typeof loc === 'string' && loc.trim()) locs.add(loc.trim());
    });
    return Array.from(locs);
  }, [clients]);

  // Check active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (locationFilter !== 'all') count++;
    if (paymentModeFilter !== 'all') count++;
    if (teamMemberFilter !== 'all') count++;
    if (dateRangePreset !== 'all' || (startDate && endDate)) count++;
    return count;
  }, [categoryFilter, statusFilter, locationFilter, paymentModeFilter, teamMemberFilter, dateRangePreset, startDate, endDate]);

  const resetAllFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
    setPaymentModeFilter('all');
    setTeamMemberFilter('all');
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const filteredRecords = useMemo(() => {
    return financeRecords.filter(rec => {
      const client = rec.client;
      const clientName = client?.name?.toLowerCase() || '';
      const eventType = client?.event_type || '';
      const phone = client?.phone?.toLowerCase() || '';
      const city = ((client as any)?.city || (client as any)?.venue || '').toLowerCase();
      const handled = (client as any)?.handled_by || (client as any)?.assigned_team_member_name || 'Unassigned';
      const query = searchQuery.toLowerCase();

      // Search Query
      const matchesSearch = !query || clientName.includes(query) || eventType.toLowerCase().includes(query) || phone.includes(query) || city.includes(query) || handled.toLowerCase().includes(query);

      // Category
      const matchesCategory = categoryFilter === 'all' || eventType === categoryFilter;

      // Status
      let matchesStatus = true;
      if (statusFilter === 'overdue_only') {
        const hasOverdue = (rec.milestones || []).some(m => m.due_date && m.due_date < todayStr && m.status !== 'completed' && m.status !== 'paid');
        matchesStatus = hasOverdue;
      } else if (statusFilter === 'pending') {
        matchesStatus = Number(rec.pending_amount) > 0;
      } else if (statusFilter === 'paid') {
        matchesStatus = rec.payment_status === 'paid' || (Number(rec.final_total_amount) > 0 && Number(rec.pending_amount) === 0);
      } else if (statusFilter === 'partially_paid') {
        matchesStatus = rec.payment_status === 'partially_paid' || (Number(rec.received_amount) > 0 && Number(rec.pending_amount) > 0);
      }

      // Location
      const matchesLocation = locationFilter === 'all' || 
        ((client as any)?.city && (client as any).city.toLowerCase() === locationFilter.toLowerCase()) || 
        ((client as any)?.venue && (client as any).venue.toLowerCase() === locationFilter.toLowerCase());

      // Payment Mode
      let matchesMode = true;
      if (paymentModeFilter !== 'all') {
        matchesMode = (rec.milestones || []).some(m => m.payment_mode && m.payment_mode.toLowerCase() === paymentModeFilter.toLowerCase());
      }

      // 👥 Team Member (Handled By) Filter
      let matchesTeam = true;
      if (teamMemberFilter !== 'all') {
        if (teamMemberFilter === 'unassigned') {
          matchesTeam = !handled || handled === 'Unassigned';
        } else {
          matchesTeam = handled === teamMemberFilter || 
            ((client as any)?.assigned_team_member_name === teamMemberFilter) ||
            ((client as any)?.handled_by === teamMemberFilter) ||
            ((rec as any)?.handled_by === teamMemberFilter);
        }
      }

      // 📅 Date Range Match: First Completed Milestone Payment Date (Fallback to Event Date or Created At)
      let matchesDate = true;
      if (dateRangePreset !== 'all' || startDate || endDate) {
        const completedMilestones = (rec.milestones || []).filter(m => m.status === 'completed' || m.status === 'paid');
        let firstPaymentDate: string | undefined;
        if (completedMilestones.length > 0) {
          const dates = completedMilestones
            .map(m => m.due_date || (m as any).payment_date)
            .filter(Boolean)
            .sort();
          if (dates.length > 0) {
            firstPaymentDate = dates[0];
          }
        }
        const effectiveDate = firstPaymentDate || client?.event_date || rec.created_at?.split('T')[0];
        if (effectiveDate) {
          if (startDate && effectiveDate < startDate) matchesDate = false;
          if (endDate && effectiveDate > endDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesLocation && matchesMode && matchesTeam && matchesDate;
    });
  }, [financeRecords, searchQuery, categoryFilter, statusFilter, locationFilter, paymentModeFilter, teamMemberFilter, dateRangePreset, startDate, endDate, todayStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const query = searchQuery.toLowerCase();
      const title = exp.title?.toLowerCase() || '';
      const paidTo = exp.paid_to?.toLowerCase() || '';
      const cat = exp.category?.toLowerCase() || '';

      const matchesSearch = !query || title.includes(query) || paidTo.includes(query) || cat.includes(query);
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      const matchesMode = paymentModeFilter === 'all' || exp.payment_mode === paymentModeFilter;

      let matchesDate = true;
      if (startDate && exp.payment_date < startDate) matchesDate = false;
      if (endDate && exp.payment_date > endDate) matchesDate = false;

      return matchesSearch && matchesCategory && matchesMode && matchesDate;
    });
  }, [expenses, searchQuery, categoryFilter, paymentModeFilter, startDate, endDate]);

  // 5 Top Metric Cards calculations (Dynamically calculated based on active date range, team member & filters)
  const totalInvoiced = useMemo(() => {
    return Math.round(filteredRecords.reduce((acc, r) => acc + (Number(r.final_total_amount) || 0), 0));
  }, [filteredRecords]);

  const totalReceived = useMemo(() => {
    return Math.round(filteredRecords.reduce((acc, r) => acc + (Number(r.received_amount) || 0), 0));
  }, [filteredRecords]);

  const totalPending = useMemo(() => {
    return Math.max(0, totalInvoiced - totalReceived);
  }, [totalInvoiced, totalReceived]);

  const totalExpensesAmount = useMemo(() => {
    return Math.round(filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0));
  }, [filteredExpenses]);

  const netProfit = Math.round(totalReceived - totalExpensesAmount);
  const profitMargin = totalReceived > 0 ? Math.round((netProfit / totalReceived) * 100) : 100;
  const realizedPercent = totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0;

  // Overdue calculations
  const overdueMilestonesList = useMemo(() => {
    const list: Array<{
      milestone: FinanceMilestoneItem;
      client: WorkspaceClient;
      record: ClientFinanceRecord;
      daysOverdue: number;
    }> = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    financeRecords.forEach(rec => {
      if (rec.client && Array.isArray(rec.milestones)) {
        rec.milestones.forEach(ms => {
          const isPaid = ms.status === 'completed' || ms.status === 'paid' || (ms.status as string) === 'Completed';
          if (!isPaid && ms.due_date) {
            const dueDate = new Date(ms.due_date);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate <= now) {
              const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              list.push({
                milestone: ms,
                client: rec.client!,
                record: rec,
                daysOverdue: Math.max(0, diffDays)
              });
            }
          }
        });
      }
    });

    return list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [financeRecords]);

  // Quotation handler
  const handleOpenQuotationModalForRecord = (record: ClientFinanceRecord) => {
    const leadId = record.client?.lead_id || record.client_id;
    const constructedLead: Lead = {
      id: leadId,
      name: record.client?.name || 'Client',
      phone: record.client?.phone || '',
      email: record.client?.email || '',
      workspace_id: record.workspace_id,
      status: 'closed' as LeadStatus,
      source: 'Manual',
      score: 'High-Value 🔥' as LeadScore,
      score_reason: 'Booked Client in Finance',
      final_quotation_id: record.final_quotation_id || (record.client as any)?.final_quotation_id || undefined,
      raw_payload: {
        event_date: record.client?.event_date,
        event_type: record.client?.event_type,
        city: (record.client as any)?.city,
        venue: (record.client as any)?.venue,
        client_id: record.client_id
      },
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString()
    };

    setQuotationModalLead(constructedLead);
    setIsQuotationModalOpen(true);
  };

  // 1. Loading state while verifying PIN status
  if (isCheckingPinStatus) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Verifying Security...</p>
        </div>
      </div>
    );
  }

  // 2. HARD PIN-LOCK GATE: If PIN is required and not verified, render ONLY the PIN Gate Card (ZERO Finance DOM)
  if (isPinRequired && !isPinVerified) {
    return (
      <div className="flex min-h-[85vh] w-full items-center justify-center p-4 bg-[#FDFBF7]">
        <FinancePinVerificationCard
          securitySettings={securitySettings}
          workspaceId={currentWorkspaceId}
          onSuccess={() => {
            sessionStorage.setItem(`finance_unlocked_${currentWorkspaceId}`, Date.now().toString());
            setIsPinVerified(true);
          }}
        />
      </div>
    );
  }

  // 3. ONLY REACHED IF 100% VERIFIED
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-28 pt-3 px-3 sm:px-5 lg:px-7 font-sans selection:bg-amber-100 selection:text-amber-900 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[1680px] mx-auto space-y-4 sm:space-y-5">

        {/* ─────────────────────────────────────────────────────────────
            TOP 5 METRIC CARDS WITH SPARKLINES (APP-GRADE 2-COL MOBILE STRIP)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          
          {/* Card 1: GROSS INVOICED */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[78px] sm:min-h-[128px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100/60">
                <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">Gross Invoiced</span>
                <p className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight font-sans truncate">
                  ₹{totalInvoiced.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-1 sm:mt-auto">
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                {filteredRecords.length} Contracts
              </span>

              {/* Orange Sparkline SVG (Desktop Only) */}
              <svg className="hidden sm:block w-20 h-7 text-orange-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 25 15, 50 25 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 2: CASH RECEIVED */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[78px] sm:min-h-[128px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">Cash Received</span>
                <p className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight font-sans truncate">
                  ₹{totalReceived.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-1 sm:mt-auto">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 truncate">
                {realizedPercent}% Realized <CheckCircle2 className="w-3 h-3 hidden sm:inline" />
              </span>

              {/* Green Sparkline SVG (Desktop Only) */}
              <svg className="hidden sm:block w-20 h-7 text-emerald-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 25 28, 45 15 T 80 20 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 3: PENDING RECEIVABLES (CLICKABLE DRILL-DOWN) */}
          <div 
            onClick={() => setShowOverdueModal(true)}
            className="bg-white hover:bg-orange-50/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[78px] sm:min-h-[128px] cursor-pointer transition"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100/60">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">Pending Due</span>
                <p className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight font-sans truncate">
                  ₹{totalPending.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-1 sm:mt-auto">
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Milestones
              </span>

              {/* Orange Sparkline SVG (Desktop Only) */}
              <svg className="hidden sm:block w-20 h-7 text-orange-400" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 25 Q 30 25, 55 32 T 100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 4: TEAM & EXPENSES */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[78px] sm:min-h-[128px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/60">
                <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">Team & Ops</span>
                <p className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight font-sans truncate">
                  ₹{totalExpensesAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-1 sm:mt-auto">
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                {filteredExpenses.length} Payouts
              </span>

              {/* Pink Sparkline SVG (Desktop Only) */}
              <svg className="hidden sm:block w-20 h-7 text-rose-400" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 32 Q 35 30, 60 22 T 100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 5: NET STUDIO PROFIT (2-COL MOBILE BANNER) */}
          <div className="col-span-2 md:col-span-1 2xl:col-span-1 bg-gradient-to-r md:bg-white from-purple-50/90 via-indigo-50/90 to-purple-50/90 sm:from-white sm:to-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-purple-200/80 sm:border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex items-center sm:flex-col justify-between min-h-[64px] sm:min-h-[128px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-100 sm:bg-purple-50 text-purple-700 sm:text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/80 sm:border-purple-100/60">
                <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-900/70 sm:text-slate-400 block truncate">Net Studio Profit</span>
                <p className="text-base sm:text-2xl font-black text-purple-950 sm:text-slate-900 tracking-tight font-sans truncate">
                  ₹{netProfit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center sm:items-end justify-between sm:w-full mt-0 sm:mt-auto">
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-purple-200/70 sm:bg-transparent text-purple-900 sm:text-purple-600 flex items-center gap-1">
                {profitMargin}% Margin <CheckCircle2 className="w-3 h-3 hidden sm:inline" />
              </span>

              {/* Purple Sparkline SVG (Desktop Only) */}
              <svg className="hidden sm:block w-20 h-7 text-purple-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 30 25, 55 18 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            🎛️ STREAMLINED ACTION BAR & CONTROLS (UNIFIED SINGLE-ROW)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-3 shadow-xs space-y-2.5">
          
          {/* Top Segmented Tabs Switcher (Mobile Native Grid + Desktop Underline Tabs) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-2 md:pb-0">
            
            {/* Mobile 3-Column Segmented Tab Pill (< md) */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-2xl md:hidden text-center">
              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className={`py-1.5 px-1 rounded-xl text-xs font-bold transition truncate ${
                  activeTab === 'clients'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Invoices ({filteredRecords.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`py-1.5 px-1 rounded-xl text-xs font-bold transition truncate ${
                  activeTab === 'expenses'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Expenses ({filteredExpenses.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`py-1.5 px-1 rounded-xl text-xs font-bold transition truncate ${
                  activeTab === 'analytics'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Analytics
              </button>
            </div>

            {/* Desktop Horizontal Tabs (>= md) */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => setActiveTab('clients')}
                className={`flex items-center gap-1.5 pb-2 pt-1 text-xs font-bold transition relative cursor-pointer ${
                  activeTab === 'clients'
                    ? 'text-amber-800 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Client Invoices & Milestones ({filteredRecords.length})</span>
                {activeTab === 'clients' && (
                  <motion.div 
                    layoutId="tabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 pb-2 pt-1 text-xs font-bold transition relative cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'text-amber-800 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Team Payouts & Expenses ({filteredExpenses.length})</span>
                {activeTab === 'expenses' && (
                  <motion.div 
                    layoutId="tabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 pb-2 pt-1 text-xs font-bold transition relative cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'text-amber-800 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Finance Analytics</span>
                {activeTab === 'analytics' && (
                  <motion.div 
                    layoutId="tabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full"
                  />
                )}
              </button>
            </div>

            {/* Desktop Action Icons (>= md) */}
            <div className="hidden md:flex items-center gap-2">
              {/* Notifications Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
                  className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                  title="Due Date & Payment Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {overdueMilestonesList.length > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-sm">
                      {overdueMilestonesList.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-rose-500" />
                          <h4 className="text-xs font-black text-slate-900">Overdue & Due Alerts</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {overdueMilestonesList.length} pending
                        </span>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {overdueMilestonesList.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                            <span>All milestone payments are up to date! 🎉</span>
                          </div>
                        ) : (
                          overdueMilestonesList.map((item, idx) => (
                            <div key={idx} className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/70 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 text-xs truncate max-w-[170px]">
                                  {item.client.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800">
                                  {item.daysOverdue > 0 ? `${item.daysOverdue}d Overdue` : 'Due Today'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">
                                  {item.milestone.step_name || item.milestone.title}
                                </span>
                                <span className="font-mono font-black text-rose-900">
                                  ₹{(Number(item.milestone.amount) || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-100">
                                {item.client.phone && (
                                  <a
                                    href={`https://wa.me/${item.client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                      `Hello ${item.client.name}, this is a reminder regarding your pending installment for ${item.milestone.step_name || 'Booking'} of ₹${(item.milestone.amount || 0).toLocaleString('en-IN')}.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1"
                                  >
                                    <Send className="w-2.5 h-2.5" /> WhatsApp
                                  </a>
                                )}
                                <button
                                  onClick={() => handleOpenCompletePaymentModal(item.record, item.milestone)}
                                  className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg shadow-xs hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-2.5 h-2.5" /> Mark Paid
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Import Excel */}
              <button
                type="button"
                onClick={() => setIsExcelMigrationModalOpen(true)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-2xs transition cursor-pointer flex items-center gap-1"
                title="Import Spreadsheets"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={() => exportCurrentFinanceToExcel(filteredRecords, clients)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer flex items-center gap-1"
                title="Export to Excel"
              >
                <Download className="w-4 h-4 text-slate-600" />
              </button>

              {/* Lock Vault */}
              {isPinRequired && (
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs transition cursor-pointer"
                  title="Lock Vault"
                >
                  <Lock className="w-4 h-4 text-amber-700" />
                </button>
              )}

              {/* Audit Logs */}
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(true)}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                title="Audit Logs"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Unified Action Row (Search + Filter + Mobile Action Icons) */}
          <div className="flex items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[120px] h-8 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search client, event, member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs transition"
              />
            </div>

            {/* Filter Trigger Button */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(prev => !prev)}
                className={`h-8 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-orange-50 text-orange-700 border-orange-200 font-black'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Master Filters Dropdown Panel */}
              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 space-y-3.5 font-sans"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-orange-600" /> Filter Criteria
                      </h4>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="text-[10px] font-extrabold text-rose-600 hover:underline"
                        >
                          Reset All ({activeFiltersCount})
                        </button>
                      )}
                    </div>

                    {/* 📅 DATE RANGE PICKER */}
                    <div className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-700" /> Date Range
                        </label>
                        {dateRangePreset !== 'all' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[10px] font-extrabold">
                        {[
                          { id: 'all', label: 'All Time' },
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'this_week', label: 'This Week' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'last_30_days', label: 'Last 30 Days' },
                        ].map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              const val = preset.id as any;
                              setDateRangePreset(val);
                              const now = new Date();
                              if (val === 'today') {
                                const str = now.toISOString().split('T')[0];
                                setStartDate(str);
                                setEndDate(str);
                              } else if (val === 'yesterday') {
                                const y = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
                                setStartDate(y);
                                setEndDate(y);
                              } else if (val === 'this_week') {
                                const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
                                const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6)).toISOString().split('T')[0];
                                setStartDate(firstDay);
                                setEndDate(lastDay);
                              } else if (val === 'this_month') {
                                const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                                setStartDate(first);
                                setEndDate(last);
                              } else if (val === 'last_30_days') {
                                const past = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
                                setStartDate(past);
                                setEndDate(now.toISOString().split('T')[0]);
                              } else if (val === 'all') {
                                setStartDate('');
                                setEndDate('');
                              }
                            }}
                            className={`py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                              dateRangePreset === preset.id
                                ? 'bg-amber-600 text-white border-amber-600 font-black'
                                : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-2 py-1.5 shadow-2xs">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setDateRangePreset('custom');
                              setStartDate(e.target.value);
                            }}
                            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
                          />
                          <span className="text-amber-600 text-xs font-bold">➔</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setDateRangePreset('custom');
                              setEndDate(e.target.value);
                            }}
                            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 👥 TEAM MEMBER */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-600" /> Team Member
                      </label>
                      <select
                        value={teamMemberFilter}
                        onChange={(e) => setTeamMemberFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="all">👥 All Team Members</option>
                        <option value="unassigned">👤 Unassigned Only</option>
                        {teamMembersList.map(member => (
                          <option key={member} value={member}>{member}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="all">⚡ All Statuses</option>
                        <option value="overdue_only">⚠️ Overdue Dues Only</option>
                        <option value="pending">⏳ Pending Balance</option>
                        <option value="partially_paid">🌓 Partially Paid</option>
                        <option value="paid">✅ 100% Paid Full</option>
                      </select>
                    </div>

                    {/* Event Category */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Event Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="all">📂 All Event Categories</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Location / City */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Location / City</label>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="all">📍 All Locations / Cities</option>
                        {uniqueLocations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Channel */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Mode Channel</label>
                      <select
                        value={paymentModeFilter}
                        onChange={(e) => setPaymentModeFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="all">💳 All Channels</option>
                        <option value="UPI">UPI (GooglePay / PhonePe)</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsFilterDropdownOpen(false)}
                        className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Only Action Icons (< md) */}
            <div className="flex md:hidden items-center gap-1.5">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
                  className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {overdueMilestonesList.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {overdueMilestonesList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Audit Log */}
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(true)}
                className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                title="Audit Logs"
              >
                <Clock className="w-4 h-4" />
              </button>

              {/* Lock Vault */}
              {isPinRequired && (
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 flex items-center justify-center cursor-pointer"
                  title="Lock Vault"
                >
                  <Lock className="w-4 h-4 text-amber-700" />
                </button>
              )}

              {/* Mobile More Actions (•••) Dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                  className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                  title="More Tools"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {isMoreMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-1 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-40 space-y-0.5 text-xs font-bold font-sans"
                    >
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          exportCurrentFinanceToExcel(filteredRecords, clients);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export Excel (.xlsx)</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsExcelMigrationModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-black"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Import Excel / CSV</span>
                      </button>

                      {activeTab === 'expenses' && (
                        <button
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setShowAddExpenseModal(true);
                          }}
                          className="w-full px-3 py-2 text-left text-orange-700 hover:bg-orange-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-orange-600" />
                          <span>Log New Expense</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: CLIENT INVOICES & MILESTONES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-500">Loading client financial records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-3">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">No matching client records</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No clients match your filter criteria. Try clearing search, team member, or date filters.
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    className="px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              filteredRecords.map((record) => (
                <ClientFinanceCard
                  key={record.id}
                  record={record}
                  isExpanded={expandedCards.has(record.id)}
                  onToggle={() => toggleCard(record.id)}
                  todayStr={todayStr}
                  teamMembersList={teamMembersList}
                  paymentMilestoneTemplates={paymentMilestoneTemplates}
                  onAssignTeamMember={handleAssignTeamMember}
                  onAddNewTeamMember={handleAddNewTeamMember}
                  onOpenPricingEditModal={handleOpenPricingEditModal}
                  onOpenRecordPayment={(rec) => setShowRecordPaymentModal({ open: true, client: rec.client || undefined, financeRecord: rec })}
                  onOpenInvoiceModal={(rec) => setShowInvoiceModal({ open: true, client: rec.client || undefined, financeRecord: rec })}
                  onOpenCompletePaymentModal={handleOpenCompletePaymentModal}
                  onOpenEditMilestone={handleOpenEditMilestone}
                  onDeleteMilestone={handleDeleteMilestone}
                  onMilestoneChange={handleMilestoneStepChange}
                  onAddMilestoneStep={(recordId) => setShowAddStepModal({ open: true, recordId })}
                  onSaveNewTemplate={handleSaveNewMilestoneTemplate}
                />
              ))
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: TEAM PAYOUTS & EXPENSES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Logged Studio Expenses & Team Payouts</h3>
                  <p className="text-xs text-slate-500 font-medium">Direct edit, delete, and real-time P&L recalculation</p>
                </div>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Log Expense
                </button>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No expenses or team payouts logged yet.</p>
                  <p className="text-[11px] text-slate-400">Click "+ Log Expense" above to record crew payouts or travel expenses.</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <th className="pb-3 px-2">Category</th>
                          <th className="pb-3 px-2">Title / Description</th>
                          <th className="pb-3 px-2">Paid To</th>
                          <th className="pb-3 px-2">Date</th>
                          <th className="pb-3 px-2">Mode</th>
                          <th className="pb-3 px-2 text-right">Amount (₹)</th>
                          <th className="pb-3 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-2">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-50 text-orange-800 border border-orange-200">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-bold text-slate-900">{exp.title}</td>
                            <td className="py-3 px-2 text-slate-600 font-medium">{exp.paid_to || '—'}</td>
                            <td className="py-3 px-2 text-slate-500 font-mono">
                              {exp.payment_date ? new Date(exp.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {exp.payment_mode || 'UPI'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-black text-slate-900 text-sm">
                              ₹{(Number(exp.amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditExpense(exp)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                  title="Edit Expense"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmExpenseId(exp.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Expense Cards (< md) */}
                  <div className="block md:hidden space-y-2.5">
                    {filteredExpenses.map((exp) => (
                      <div key={exp.id} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-orange-50 text-orange-800 border border-orange-200 truncate max-w-[170px]">
                            {exp.category}
                          </span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            ₹{(Number(exp.amount) || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2 text-slate-700">
                          <span className="font-bold text-slate-900 truncate">{exp.title}</span>
                          <span className="text-[11px] text-slate-500 font-medium shrink-0">Paid to: {exp.paid_to || '—'}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {exp.payment_date ? new Date(exp.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase text-[9px]">
                              {exp.payment_mode || 'UPI'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmExpenseId(exp.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: FINANCE ANALYTICS & INTERACTIVE DASHBOARD
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <FinanceAnalyticsView
            records={filteredRecords as any}
            expenses={filteredExpenses as any}
            clients={clients}
            workspaceId={currentWorkspaceId}
            todayStr={todayStr}
            onOpenCompletePaymentModal={handleOpenCompletePaymentModal}
            onOpenRecordPayment={(rec) => setShowRecordPaymentModal({ open: true, client: rec.client || undefined, financeRecord: rec })}
            onOpenInvoice={(rec) => setShowInvoiceModal({ open: true, client: rec.client || undefined, financeRecord: rec })}
          />
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ✏️ MODAL: PRICING BREAKDOWN EDIT CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPricingEditModal.open && showPricingEditModal.record && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-3.5 font-sans max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Edit Pricing Breakdown</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[240px]">
                    Client: {showPricingEditModal.record.client?.name}
                  </p>
                </div>
                <button 
                  onClick={() => setShowPricingEditModal({ open: false })} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Subtotal & Total Preview */}
              {(() => {
                const b = Math.max(0, Math.round(parseFloat(pricingEditFormData.base_package_price) || 0));
                const d = Math.max(0, Math.round(parseFloat(pricingEditFormData.discount_amount) || 0));
                const ac = Math.max(0, Math.round(parseFloat(pricingEditFormData.accommodation_charges) || 0));
                const tr = Math.max(0, Math.round(parseFloat(pricingEditFormData.travel_charges) || 0));
                const ad = Math.max(0, Math.round(parseFloat(pricingEditFormData.additional_charges) || 0));
                const sub = Math.max(0, b - d + ac + tr + ad);
                const gst = Math.round((sub * Number(pricingEditFormData.gst_rate || 0)) / 100);
                const tot = sub + gst;

                return (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Base Package (₹)</label>
                        <input
                          type="number"
                          value={pricingEditFormData.base_package_price}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, base_package_price: e.target.value }))}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-rose-600 block mb-1">Discount (₹)</label>
                        <input
                          type="number"
                          value={pricingEditFormData.discount_amount}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                          className="w-full h-9 px-2.5 bg-rose-50/50 border border-rose-200 rounded-lg font-mono font-bold text-rose-600 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-rose-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Accommodation (₹)</label>
                        <input
                          type="number"
                          value={pricingEditFormData.accommodation_charges}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, accommodation_charges: e.target.value }))}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Travel Charges (₹)</label>
                        <input
                          type="number"
                          value={pricingEditFormData.travel_charges}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, travel_charges: e.target.value }))}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Additional (₹)</label>
                        <input
                          type="number"
                          value={pricingEditFormData.additional_charges}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, additional_charges: e.target.value }))}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">GST Rate</label>
                        <select
                          value={pricingEditFormData.gst_rate}
                          onChange={(e) => setPricingEditFormData(prev => ({ ...prev, gst_rate: Number(e.target.value) }))}
                          className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                        >
                          <option value={0}>0% (No GST)</option>
                          <option value={5}>5% GST</option>
                          <option value={12}>12% GST</option>
                          <option value={18}>18% GST (Standard)</option>
                          <option value={28}>28% GST</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Calculated Highlight Card */}
                    <div className="p-3 bg-orange-50/80 border border-orange-200/80 rounded-xl space-y-1 mt-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">₹{sub.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">GST Amount ({pricingEditFormData.gst_rate}%):</span>
                        <span className="font-mono font-bold text-slate-900">₹{gst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-orange-950 font-black text-xs sm:text-sm pt-1 border-t border-orange-200">
                        <span>Final Net Investment:</span>
                        <span className="font-mono text-orange-700">₹{tot.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowPricingEditModal({ open: false })}
                        className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePricingBreakdown}
                        className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 font-black text-white text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Save Pricing Changes
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          💳 MODAL: RECORD PAYMENT COMPLETION
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCompletePaymentModal.open && showCompletePaymentModal.milestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Record Payment Completion</h3>
                    <p className="text-xs text-slate-500 font-medium">{showCompletePaymentModal.clientName}</p>
                  </div>
                </div>
                <button onClick={() => setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800">
                  Milestone: <span className="text-slate-900">{showCompletePaymentModal.milestone.step_name || showCompletePaymentModal.milestone.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount Received (₹)</label>
                    <input
                      type="number"
                      value={completePaymentFormData.amount}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                    <select
                      value={completePaymentFormData.status}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="completed">Completed / Paid</option>
                      <option value="pending">Pending / Due</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Received Date</label>
                    <input
                      type="date"
                      value={completePaymentFormData.payment_date}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode Channel</label>
                    <select
                      value={completePaymentFormData.payment_mode}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">UTR / Transaction Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/2938102938"
                    value={completePaymentFormData.reference_id}
                    onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null })}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCompletePaymentModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save & Update Milestone
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          📜 REAL-TIME AUDIT LOG DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAuditDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-full shadow-2xl p-6 border-l border-slate-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Finance Audit Logs</h3>
                      <p className="text-[11px] text-slate-500">Live immutable activity stream</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAuditDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAuditLogFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${auditLogFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    All ({auditLogs.length})
                  </button>
                  <button
                    onClick={() => setAuditLogFilter('INCOME')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${auditLogFilter === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    🟢 Income Only
                  </button>
                  <button
                    onClick={() => setAuditLogFilter('EXPENSE')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${auditLogFilter === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    🔴 Expenses Only
                  </button>
                </div>

                {/* Log Entries List */}
                <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                  {auditLogs
                    .filter(l => auditLogFilter === 'all' || l.log_type === auditLogFilter)
                    .map((log) => {
                      const isIncome = log.log_type === 'INCOME';
                      const isExpense = log.log_type === 'EXPENSE';

                      return (
                        <div
                          key={log.id}
                          className={`p-3 rounded-2xl border text-xs space-y-1 ${
                            isIncome
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : isExpense
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-black text-[11px] ${isIncome ? 'text-emerald-800' : isExpense ? 'text-rose-800' : 'text-slate-700'}`}>
                              {isIncome ? '🟢 Money In (Income)' : isExpense ? '🔴 Money Out (Expense)' : '⚙️ Adjustment'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}
                            </span>
                          </div>

                          <p className="font-bold text-slate-900">{log.description}</p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Actor: <strong className="text-slate-700">{log.actor_name}</strong></span>
                            <span className={`font-mono font-black ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isIncome ? '+' : '-'}₹{(Number(log.amount) || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsAuditDrawerOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          📊 MODAL: OVERDUE PAYMENTS DRILL-DOWN
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOverdueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-100 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Overdue & Pending Milestone List</h3>
                      <p className="text-xs text-slate-500 font-medium">Sorted by urgency & scheduled due dates</p>
                    </div>
                  </div>
                  <button onClick={() => setShowOverdueModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="max-h-[55vh] overflow-y-auto space-y-2.5 pr-1">
                  {overdueMilestonesList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No overdue payments!</p>
                    </div>
                  ) : (
                    overdueMilestonesList.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-white rounded-2xl border border-orange-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs">{item.client.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                              {item.daysOverdue > 0 ? `${item.daysOverdue} Days Overdue` : 'Due Today'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {item.milestone.step_name || item.milestone.title} • Due: {item.milestone.due_date}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-sm text-rose-800">
                            ₹{(Number(item.milestone.amount) || 0).toLocaleString('en-IN')}
                          </span>

                          {item.client.phone && (
                            <a
                              href={`https://wa.me/${item.client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hello ${item.client.name}, gentle reminder regarding pending installment for ${item.milestone.step_name || 'Booking'} of ₹${(item.milestone.amount || 0).toLocaleString('en-IN')}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Remind
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenCompletePaymentModal(item.record, item.milestone)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowOverdueModal(false)}
                  className="px-5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          ✏️ MODAL: FLEXIBLE INSTALLMENT QUICK EDIT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditMilestoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Edit Payment Milestone</h3>
                <button onClick={() => setShowEditMilestoneModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Step Name</label>
                  <MilestoneStepDropdown
                    value={editingMilestoneData.step_name}
                    onChange={(newVal) => setEditingMilestoneData(prev => ({ ...prev, step_name: newVal }))}
                    templates={paymentMilestoneTemplates}
                    onAddTemplate={handleSaveNewMilestoneTemplate}
                    placeholder="Select Milestone"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={editingMilestoneData.amount}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Status</label>
                    <select
                      value={editingMilestoneData.status}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingMilestoneData.due_date}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={editingMilestoneData.payment_mode}
                      onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="UPI">UPI (GPay/PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowEditMilestoneModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedMilestone}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RECORD PAYMENT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRecordPaymentModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Record Client Payment</h3>
                    <p className="text-[11px] text-slate-500">{showRecordPaymentModal.client?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowRecordPaymentModal({ open: false })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={paymentFormData.payment_mode}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash Deposit</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowRecordPaymentModal({ open: false })}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRecordedPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW STEP
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddStepModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Add Installment Step</h3>
                <button onClick={() => setShowAddStepModal({ open: false })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Step Name</label>
                  <MilestoneStepDropdown
                    value={stepFormData.step_name}
                    onChange={(newVal) => setStepFormData(prev => ({ ...prev, step_name: newVal }))}
                    templates={paymentMilestoneTemplates}
                    onAddTemplate={handleSaveNewMilestoneTemplate}
                    placeholder="Select Milestone"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={stepFormData.due_date}
                      onChange={(e) => setStepFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={stepFormData.amount}
                      onChange={(e) => setStepFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowAddStepModal({ open: false })}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewStep}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Step
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW EXPENSE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Record Team Payout / Expense</h3>
                <button onClick={() => setShowAddExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Select Client */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">1. Select Client (Optional)</label>
                  <select
                    value={expenseFormData.client_id}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">None / General Studio Expense</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.event_type || 'Event'}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Team Member Dropdown */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Team Member / Crew</label>
                  <select
                    value={expenseFormData.paid_to}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpenseFormData(prev => ({
                        ...prev,
                        paid_to: val,
                        team_member_id: val
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">Select Crew / Staff Member...</option>
                    {teamMembersList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Category (with + Add Category option) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">3. Expense Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[10px] font-black text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddCategoryModal(true);
                      } else {
                        setExpenseFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__add_new__">✨ + Add Custom Category...</option>
                  </select>
                </div>

                {/* 4. Title / Description */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Title / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Photographer Advance / Hotel Stay"
                    value={expenseFormData.title}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                {/* 5. Amount & Paid To Custom Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Paid To / Payee</label>
                    <input
                      type="text"
                      placeholder="e.g. Amit Sharma / Vendor"
                      value={expenseFormData.paid_to}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                {/* 6. Payment Mode & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={expenseFormData.payment_mode}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date</label>
                    <input
                      type="date"
                      value={expenseFormData.payment_date}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowAddExpenseModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExpense}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Expense
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT LOGGED EXPENSE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Edit Logged Expense</h3>
                <button onClick={() => setShowEditExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Client */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">1. Select Client (Optional)</label>
                  <select
                    value={expenseEditFormData.client_id}
                    onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">None / General Studio Expense</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.event_type || 'Event'}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Team Member Dropdown */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Team Member / Crew</label>
                  <select
                    value={expenseEditFormData.paid_to}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpenseEditFormData(prev => ({
                        ...prev,
                        paid_to: val,
                        team_member_id: val
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">Select Crew / Staff Member...</option>
                    {teamMembersList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">3. Expense Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[10px] font-black text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    value={expenseEditFormData.category}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddCategoryModal(true);
                      } else {
                        setExpenseEditFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__add_new__">✨ + Add Custom Category...</option>
                  </select>
                </div>

                {/* 4. Title / Description */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Title / Description</label>
                  <input
                    type="text"
                    value={expenseEditFormData.title}
                    onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                {/* 5. Amount & Paid To */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={expenseEditFormData.amount}
                      onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Paid To / Payee</label>
                    <input
                      type="text"
                      value={expenseEditFormData.paid_to}
                      onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                {/* 6. Payment Mode & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={expenseEditFormData.payment_mode}
                      onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date</label>
                    <input
                      type="date"
                      value={expenseEditFormData.payment_date}
                      onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowEditExpenseModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedExpense}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD CUSTOM EXPENSE CATEGORY (SUPABASE SYNC)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Add Custom Expense Category</h3>
                <button onClick={() => setShowAddCategoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Drone License / Background Score"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomCategory()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowAddCategoryModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomCategory}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Category
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DELETE EXPENSE CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmExpenseId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center font-sans"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Expense Record?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This will remove the expense from studio totals and update profit in real time.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmExpenseId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteExpense(deleteConfirmExpenseId)}
                  className="px-4 py-2 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          INVOICE & QUOTATION MODAL DIALOGS
      ───────────────────────────────────────────────────────────── */}
      <ExcelMigrationModal
        isOpen={isExcelMigrationModalOpen}
        onClose={() => setIsExcelMigrationModalOpen(false)}
        workspaceId={currentWorkspaceId || (typeof window !== 'undefined' ? (sessionStorage.getItem('workspace_id') || '00000000-0000-0000-0000-000000000000') : '00000000-0000-0000-0000-000000000000')}
        onSuccess={async () => {
          await fetchFinanceData();
        }}
      />

      {showInvoiceModal.open && (
        <InvoiceModalDialog
          isOpen={showInvoiceModal.open}
          onClose={() => setShowInvoiceModal({ open: false })}
          client={showInvoiceModal.client || null}
          financeRecord={showInvoiceModal.financeRecord || null}
          defaultQuotationTemplate={defaultQuotationTemplate}
        />
      )}

      {isQuotationModalOpen && quotationModalLead && (
        <LeadQuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setQuotationModalLead(null);
            fetchFinanceData();
          }}
          lead={quotationModalLead}
          onFinalSet={async () => {
            await fetchFinanceData();
          }}
        />
      )}

    </div>
  );
}
