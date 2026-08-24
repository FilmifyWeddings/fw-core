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
  Eye, EyeOff, AlertCircle, CheckSquare, Square, Pencil, MoreVertical
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractFinancialsFromQuotation } from '@/lib/quotation-finance-sync';
import { LeadQuotationModal } from '@/components/dashboard/lead-quotation-modal';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import type { 
  WorkspaceClient, ClientFinanceRecord, FinanceMilestoneItem, FinanceExpenseItem, 
  FinanceAuditLog, FinanceSecuritySettings, Lead, LeadStatus, LeadScore 
} from '@/types';

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  'Photographer Payout',
  'Cinematographer Payout',
  'Video Editor Payout',
  'Drone Operator Payout',
  'Travel & Flights',
  'Hotel & Accommodation',
  'Equipment Rental',
  'Hard Drives & Delivery',
  'Studio Rent & Utilities',
  'Marketing & Meta Ads',
  'Software & Subscriptions',
  'Miscellaneous'
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'expenses' | 'analytics'>('clients');
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [financeRecords, setFinanceRecords] = useState<ClientFinanceRecord[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpenseItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinanceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // 🔐 ADMIN SECURITY GATE & PIN VAULT
  // ─────────────────────────────────────────────────────────────
  const [securitySettings, setSecuritySettings] = useState<FinanceSecuritySettings | null>(null);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 🔍 SEARCH & FILTERS
  // ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');

  // Expanded client cards set
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Category list for expenses
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);

  // ─────────────────────────────────────────────────────────────
  // 📜 REAL-TIME AUDIT LOG DRAWER
  // ─────────────────────────────────────────────────────────────
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [auditLogFilter, setAuditLogFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

  // ─────────────────────────────────────────────────────────────
  // 🔔 FINANCIAL NOTIFICATIONS & DUE DATE ALERTS
  // ─────────────────────────────────────────────────────────────
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 📊 INTERACTIVE METRIC CARDS DRILL-DOWN MODALS
  // ─────────────────────────────────────────────────────────────
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [upcomingTimeframe, setUpcomingTimeframe] = useState<'7' | '15' | '30' | '90' | 'custom'>('30');

  // ─────────────────────────────────────────────────────────────
  // 💸 RECORD PAYMENT & MILESTONES MODALS
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
  // 🚀 INITIAL DATA LOAD & SECURITY CHECK
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    checkSecurityAndFetchData();
  }, []);

  const checkSecurityAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Security Settings
      try {
        let secQuery = supabase.from('finance_security_settings').select('*');
        if (workspaceId && workspaceId !== 'ws_demo') {
          secQuery = secQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }
        const { data: secData } = await secQuery.maybeSingle();
        if (secData) {
          setSecuritySettings(secData);
          if (secData.is_locked) {
            const unlockedTime = sessionStorage.getItem('finance_vault_unlocked_time');
            if (unlockedTime) {
              const elapsed = Date.now() - parseInt(unlockedTime, 10);
              const timeoutMs = (secData.session_timeout_minutes || 60) * 60 * 1000;
              if (elapsed < timeoutMs) {
                setIsVaultLocked(false);
              } else {
                setIsVaultLocked(true);
              }
            } else {
              setIsVaultLocked(true);
            }
          } else {
            setIsVaultLocked(false);
          }
        }
      } catch (secErr) {
        console.warn('Security settings notice:', secErr);
      }

      // 2. Fetch Finance Data
      await fetchFinanceData();
    } catch (e) {
      console.error('Error during initial finance load:', e);
    }
  };

  const handleUnlockVault = () => {
    setUnlockError('');
    if (!securitySettings) {
      setIsVaultLocked(false);
      return;
    }

    const correctPin = securitySettings.pin_hash || '123456';
    const correctPassword = securitySettings.master_password_hash || '';

    if (pinInput && pinInput === correctPin) {
      sessionStorage.setItem('finance_vault_unlocked_time', String(Date.now()));
      setIsVaultLocked(false);
      setPinInput('');
      return;
    }

    if (passwordInput && (passwordInput === correctPassword || passwordInput === correctPin)) {
      sessionStorage.setItem('finance_vault_unlocked_time', String(Date.now()));
      setIsVaultLocked(false);
      setPasswordInput('');
      return;
    }

    setUnlockError('Incorrect 6-digit PIN or master password. Please try again.');
  };

  const handleLockVaultNow = () => {
    sessionStorage.removeItem('finance_vault_unlocked_time');
    setIsVaultLocked(true);
    setPinInput('');
    setPasswordInput('');
  };

  // ─────────────────────────────────────────────────────────────
  // 📥 FETCH FINANCE DATA, AUDIT LOGS & CLIENTS
  // ─────────────────────────────────────────────────────────────
  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Clients
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

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

      // 3. Fetch Quotation Documents
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

      // 4. Synthesize Records
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
            title: couple ? `${couple} (V${v})` : `Quotation Version ${v}`,
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
            client: c,
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
            client: c,
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
          // Client without quotation & without previous record
          const basePkg = Math.max(0, Math.round(Number(c.total_package_amount) || 0));
          const subtotal = basePkg;
          const finalTotal = subtotal;
          const received = Math.max(0, Math.round(Number(c.paid_amount) || 0));
          const pending = Math.max(0, finalTotal - received);

          const initialMilestones: FinanceMilestoneItem[] = received > 0 ? [
            {
              id: `m_init_${Date.now()}`,
              step_name: received >= finalTotal && finalTotal > 0 ? 'Full Payment' : 'Advance Booking',
              due_date: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              paid_date: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              amount: received,
              status: 'completed',
              payment_mode: 'UPI'
            }
          ] : [];

          const newRecord: ClientFinanceRecord = {
            id: `fin_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: c,
            has_final_quotation: hasFinalQuotation,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote?.template_id || leadObj?.final_quotation_id || undefined,
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
            milestones: initialMilestones,
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

      // 5. Fetch Expenses (CLEAN SLATE: 100% Zero Dummy Data Fallback)
      let expenseQuery = supabase
        .from('finance_expenses')
        .select('*')
        .order('payment_date', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        expenseQuery = expenseQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: expenseData } = await expenseQuery;
      setExpenses(expenseData || []);

      // 6. Fetch Audit Logs
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

  // Handle Breakdown Line Item Changes
  const handleBreakdownChange = (
    recordId: string, 
    field: keyof ClientFinanceRecord, 
    val: number
  ) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updated = { ...rec, [field]: Math.round(val || 0) };
        const finalUpdated = computeFinanceTotals(updated);
        updateFinanceRecordInDB(finalUpdated);
        return finalUpdated;
      }
      return rec;
    }));
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

  // Toggle Milestone Status (Completed / Pending)
  const handleMilestoneStatusToggle = (recordId: string, milestoneId: string) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const todayStr = new Date().toISOString().split('T')[0];
        let changedMs: FinanceMilestoneItem | null = null;
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            const isCompleted = m.status === 'completed' || m.status === 'paid' || (m.status as string) === 'Completed';
            const nextStatus = isCompleted ? 'pending' : 'completed';
            changedMs = {
              ...m,
              status: nextStatus as any,
              paid_date: nextStatus === 'completed' ? (m.paid_date || todayStr) : undefined
            };
            return changedMs;
          }
          return m;
        });

        const finalUpdated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(finalUpdated);

        if (changedMs) {
          const isNowPaid = (changedMs as any).status === 'completed';
          logAudit(
            isNowPaid ? 'INCOME' : 'ADJUSTMENT',
            (changedMs as any).amount,
            `Toggled installment "${(changedMs as any).step_name || 'Milestone'}" to ${isNowPaid ? 'Paid' : 'Pending'} for ${rec.client?.name || 'Client'}`,
            rec.client_id,
            rec.client?.name,
            (changedMs as any).payment_mode
          );
        }

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
              payment_mode,
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
      status: 'pending',
      payment_mode: 'UPI'
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
  const handleSaveExpense = async () => {
    const amt = Math.round(parseFloat(expenseFormData.amount) || 0);
    if (!expenseFormData.title || amt <= 0) {
      alert('Please enter Expense Title and a valid Amount.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newExp: FinanceExpenseItem = {
        id: `exp_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        client_id: expenseFormData.client_id || null,
        expense_type: expenseFormData.expense_type,
        category: expenseFormData.category,
        title: expenseFormData.title,
        amount: amt,
        paid_to: expenseFormData.paid_to || null,
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
        category: 'Photographer Payout',
        title: '',
        amount: '',
        paid_to: '',
        payment_mode: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        client_id: '',
        notes: ''
      });
    } catch (e) {
      console.error('Error saving expense:', e);
    }
  };

  const handleOpenEditExpense = (exp: FinanceExpenseItem) => {
    setExpenseEditFormData({
      id: exp.id,
      expense_type: exp.expense_type || 'project_expense',
      category: exp.category || 'Photographer Payout',
      title: exp.title || '',
      amount: String(exp.amount || 0),
      paid_to: exp.paid_to || '',
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

      const updatedExp: FinanceExpenseItem = {
        id: expenseEditFormData.id,
        workspace_id: workspaceId,
        user_id: workspaceId,
        client_id: expenseEditFormData.client_id || null,
        expense_type: expenseEditFormData.expense_type,
        category: expenseEditFormData.category,
        title: expenseEditFormData.title,
        amount: amt,
        paid_to: expenseEditFormData.paid_to || null,
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
  // 🔍 FILTERED DATASET & METRIC RECALCULATION
  // ─────────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return financeRecords.filter(rec => {
      const clientName = rec.client?.name?.toLowerCase() || '';
      const eventType = rec.client?.event_type?.toLowerCase() || '';
      const phone = rec.client?.phone?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = !query || clientName.includes(query) || eventType.includes(query) || phone.includes(query);
      const matchesStatus = statusFilter === 'all' || rec.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [financeRecords, searchQuery, statusFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const query = searchQuery.toLowerCase();
      const title = exp.title?.toLowerCase() || '';
      const paidTo = exp.paid_to?.toLowerCase() || '';
      const cat = exp.category?.toLowerCase() || '';

      return !query || title.includes(query) || paidTo.includes(query) || cat.includes(query);
    });
  }, [expenses, searchQuery]);

  // 5 Top Metric Cards calculations
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

  const upcomingMilestonesList = useMemo(() => {
    const list: Array<{
      milestone: FinanceMilestoneItem;
      client: WorkspaceClient;
      record: ClientFinanceRecord;
      daysUntil: number;
    }> = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let maxDays = 30;
    if (upcomingTimeframe === '7') maxDays = 7;
    if (upcomingTimeframe === '15') maxDays = 15;
    if (upcomingTimeframe === '30') maxDays = 30;
    if (upcomingTimeframe === '90') maxDays = 90;

    financeRecords.forEach(rec => {
      if (rec.client && Array.isArray(rec.milestones)) {
        rec.milestones.forEach(ms => {
          const isPaid = ms.status === 'completed' || ms.status === 'paid' || (ms.status as string) === 'Completed';
          if (!isPaid && ms.due_date) {
            const dueDate = new Date(ms.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= maxDays) {
              list.push({
                milestone: ms,
                client: rec.client!,
                record: rec,
                daysUntil: diffDays
              });
            }
          }
        });
      }
    });

    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [financeRecords, upcomingTimeframe]);

  const totalUpcomingExpectedCashflow = useMemo(() => {
    return upcomingMilestonesList.reduce((sum, item) => sum + (Number(item.milestone.amount) || 0), 0);
  }, [upcomingMilestonesList]);

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

  const handleSetFinalFromFinance = async (leadId: string, quotationId: string, clientId?: string) => {
    if (!leadId || !quotationId || settingFinalLoadingId) return;
    setSettingFinalLoadingId(quotationId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/set-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quotationId, leadId })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        await fetchFinanceData();
      } else {
        alert(json.error || 'Failed to set final quotation');
      }
    } catch (err: any) {
      console.error('Error setting final quotation from finance:', err);
      alert('Failed to set final quotation.');
    } finally {
      setSettingFinalLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-28 pt-4 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* ─────────────────────────────────────────────────────────────
          🔐 FROSTED-GLASS PIN VAULT SECURITY GATE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isVaultLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 max-w-md w-full border border-white/40 shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Finance Vault Locked 🔐</h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Enter your 6-digit Master PIN or Admin Password to access workspace finance.
                </p>
              </div>

              {unlockError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Enter 6-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                    className="w-full text-center tracking-[1em] text-2xl font-black px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-500">Or Master Admin Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUnlockVault}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Finance Suite
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-medium">
                PIN protection is configured under Settings → Finance & Security Settings.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            TOP 5 METRIC CARDS WITH SPARKLINES (MATCHING SCREENSHOT)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: GROSS INVOICED */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-32">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100/60">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Gross Invoiced</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  ₹{totalInvoiced.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <span className="text-[11px] font-medium text-slate-400">
                {filteredRecords.length} Active Contracts
              </span>

              {/* Orange Sparkline SVG */}
              <svg className="w-20 h-7 text-orange-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 25 15, 50 25 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 2: CASH RECEIVED */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-32">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Cash Received</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  ₹{totalReceived.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                {realizedPercent}% Realized <CheckCircle2 className="w-3.5 h-3.5" />
              </span>

              {/* Green Sparkline SVG */}
              <svg className="w-20 h-7 text-emerald-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 25 28, 45 15 T 80 20 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 3: PENDING RECEIVABLES (CLICKABLE DRILL-DOWN) */}
          <div 
            onClick={() => setShowOverdueModal(true)}
            className="bg-white hover:bg-orange-50/20 rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-32 cursor-pointer transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100/60">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pending Receivables</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  ₹{totalPending.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <span className="text-[11px] font-medium text-slate-400">
                Scheduled Milestones
              </span>

              {/* Orange Sparkline SVG */}
              <svg className="w-20 h-7 text-orange-400" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 25 Q 30 25, 55 32 T 100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 4: TEAM & EXPENSES */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-32">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/60">
                <CreditCard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Team & Expenses</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  ₹{totalExpensesAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <span className="text-[11px] font-medium text-slate-400">
                {filteredExpenses.length} Logged Payouts
              </span>

              {/* Pink Sparkline SVG */}
              <svg className="w-20 h-7 text-rose-400" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 32 Q 35 30, 60 22 T 100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 5: NET STUDIO PROFIT */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-32">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Net Studio Profit</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  ₹{netProfit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                {profitMargin}% Profit Margin <CheckCircle2 className="w-3.5 h-3.5" />
              </span>

              {/* Purple Sparkline SVG */}
              <svg className="w-20 h-7 text-purple-500" viewBox="0 0 100 35" fill="none" preserveAspectRatio="none">
                <path d="M0 30 Q 30 25, 55 18 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            TABS & SEARCH / FILTER BAR (MATCHING SCREENSHOT)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          
          {/* Left Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'clients'
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Client Invoices & Milestones</span>
              {activeTab === 'clients' && (
                <motion.div 
                  layoutId="tabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'expenses'
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Team Payouts & Expenses ({filteredExpenses.length})</span>
              {activeTab === 'expenses' && (
                <motion.div 
                  layoutId="tabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'analytics'
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Financial Analytics</span>
              {activeTab === 'analytics' && (
                <motion.div 
                  layoutId="tabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full"
                />
              )}
            </button>
          </div>

          {/* Right Search, Filters & Audit Trigger */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-60 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search client or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none px-3.5 py-1.5 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid Full</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* 🔔 Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
                className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                title="Due Date & Payment Alerts"
              >
                <Bell className="w-4 h-4" />
                {overdueMilestonesList.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-sm">
                    {overdueMilestonesList.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
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
                                onClick={() => handleMilestoneStatusToggle(item.record.id, item.milestone.id)}
                                className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg shadow-xs hover:bg-emerald-700 flex items-center gap-1"
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

            {/* 📜 Audit Log Trigger */}
            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              title="Finance Audit Stream"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: CLIENT INVOICES & MILESTONES (EXACT SCREENSHOT LAYOUT)
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
                  No clients match your filter criteria. Try clearing the search or status filter.
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => {
                const isExpanded = expandedCards.has(record.id);
                const client = record.client;
                const milestones = record.milestones || [];
                const finalTotal = record.final_total_amount || 0;
                const recAmt = record.received_amount || 0;
                const pendAmt = record.pending_amount || 0;

                return (
                  <motion.div
                    key={record.id}
                    layout
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
                  >
                    {/* ─── CLIENT HEADER ROW (EXACT SCREENSHOT DESIGN) ─── */}
                    <div 
                      onClick={() => toggleCard(record.id)}
                      className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition"
                    >
                      {/* Left: Avatar + Name + Tags + Date/Phone */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0 border border-purple-100">
                          {client?.name ? client.name.slice(0, 2).toUpperCase() : <Users className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900">
                              {client?.name || 'Unnamed Client'}
                            </h3>

                            {/* Status Badge */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              record.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : recAmt > 0
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {record.payment_status === 'paid' ? 'Paid Full' : recAmt > 0 ? 'Partially Paid' : 'Pending'}
                            </span>

                            {/* Quotation Button */}
                            {record.has_final_quotation ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenQuotationModalForRecord(record);
                                }}
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100 transition"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Quotation Synced
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenQuotationModalForRecord(record);
                                }}
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 transition flex items-center gap-1 border border-orange-200"
                              >
                                + Select Final Quotation
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                            <span className="flex items-center gap-1 text-slate-600 font-bold">
                              🏷️ {client?.event_type || 'Wedding Photography'}
                            </span>
                            <span>•</span>
                            <span>
                              Event Date: {client?.event_date ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'}
                            </span>
                            {client?.phone && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 font-mono font-medium">{client.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Dual Progress Bar + Action Buttons + Toggle */}
                      <div className="flex items-center gap-4 justify-between lg:justify-end flex-wrap">
                        
                        {/* Dual Progress Bar */}
                        <div className="w-48 text-right">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-emerald-700 font-mono">Rec: ₹{recAmt.toLocaleString('en-IN')}</span>
                            <span className="text-rose-600 font-mono">Pend: ₹{pendAmt.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Dual colored bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-l-full"
                              style={{ width: `${finalTotal > 0 ? (recAmt / finalTotal) * 100 : 0}%` }}
                            />
                            <div 
                              className="h-full bg-rose-300 rounded-r-full"
                              style={{ width: `${finalTotal > 0 ? (pendAmt / finalTotal) * 100 : 100}%` }}
                            />
                          </div>

                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            Total: ₹{finalTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Record Payment Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRecordPaymentModal({ open: true, client: record.client || undefined, financeRecord: record });
                          }}
                          className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
                        >
                          Record Payment
                        </button>

                        {/* Tax Invoice Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowInvoiceModal({ open: true, client: record.client || undefined, financeRecord: record });
                          }}
                          className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-700" />
                          Tax Invoice
                        </button>

                        {/* Round Chevron Toggle */}
                        <div className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* ─── EXPANDED CARD BODY: 2-COLUMN SPLIT (PRICING DETAILS vs PAYMENT TERMS & SCHEDULE) ─── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-slate-100 p-5 sm:p-6 bg-white"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* ══════════════════════════════════════════════
                                LEFT COLUMN: PRICING DETAILS (4 Cols)
                            ══════════════════════════════════════════════ */}
                            <div className="lg:col-span-5 space-y-4 border-r-0 lg:border-r border-slate-100 lg:pr-6">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                Pricing Details
                              </h4>

                              <div className="space-y-2.5 text-xs">
                                {/* Base Package Price */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 font-medium">Base Package Price</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₹{(Number(record.base_package_price) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Discount (Complimentary) */}
                                <div className="flex items-center justify-between">
                                  <span className="text-rose-500 font-bold">Discount (Complimentary)</span>
                                  <span className="font-mono font-bold text-rose-500">
                                    - ₹{(Number(record.discount_amount) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Accommodation Charges */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 font-medium">Accommodation Charges</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₹{(Number(record.accommodation_charges) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Travel Charges */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 font-medium">Travel Charges</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₹{(Number(record.travel_charges) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Additional Charges */}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 font-medium">Additional Charges</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₹{(Number(record.additional_charges) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="border-t border-slate-100 pt-2.5 space-y-2">
                                  {/* Subtotal (Gross Total) */}
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="text-slate-800">Subtotal (Gross Total)</span>
                                    <span className="font-mono text-slate-900">
                                      ₹{(Number(record.subtotal_amount) || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  {/* GST */}
                                  <div className="flex items-center justify-between text-slate-500 font-medium">
                                    <span>GST ({record.gst_rate || 0}%)</span>
                                    <span className="font-mono">
                                      ₹{(Number(record.gst_amount) || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>

                                {/* Final Net Investment Box (Peach/Cream Highlight Box) */}
                                <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl flex items-center justify-between mt-4">
                                  <div>
                                    <span className="text-xs font-bold text-orange-900 block">Final Net Investment</span>
                                    <span className="text-[10px] text-slate-500 font-medium">Inclusive of all Taxes & Fees</span>
                                  </div>
                                  <span className="text-lg font-mono font-black text-orange-600">
                                    ₹{finalTotal.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ══════════════════════════════════════════════
                                RIGHT COLUMN: PAYMENT TERMS & SCHEDULE (7 Cols)
                            ══════════════════════════════════════════════ */}
                            <div className="lg:col-span-7 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                  Payment Terms & Schedule
                                </h4>

                                <button
                                  type="button"
                                  onClick={() => setShowAddStepModal({ open: true, recordId: record.id })}
                                  className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl border border-orange-200 flex items-center gap-1 cursor-pointer transition"
                                >
                                  + Add Step
                                </button>
                              </div>

                              {/* Milestones Schedule Table */}
                              {milestones.length === 0 ? (
                                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 space-y-1">
                                  <p className="font-bold text-slate-600">No installments scheduled yet.</p>
                                  <p className="text-[11px]">Click "+ Add Step" to schedule milestone payment dates.</p>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {/* Table Column Headers */}
                                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 px-2">
                                    <span className="col-span-3">Date</span>
                                    <span className="col-span-4">Steps</span>
                                    <span className="col-span-2 text-right">Amount</span>
                                    <span className="col-span-2 text-center">Status</span>
                                    <span className="col-span-1 text-right">Action</span>
                                  </div>

                                  {/* Milestone Rows */}
                                  {milestones.map((ms) => {
                                    const isPaid = ms.status === 'completed' || ms.status === 'paid' || (ms.status as string) === 'Completed';

                                    return (
                                      <div
                                        key={ms.id}
                                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-2xl hover:bg-slate-50/80 transition border border-transparent hover:border-slate-200 text-xs"
                                      >
                                        {/* Date Field */}
                                        <div className="col-span-3">
                                          <div className="relative">
                                            <input
                                              type="date"
                                              value={ms.due_date || ''}
                                              onChange={(e) => handleMilestoneStepChange(record.id, ms.id, 'due_date', e.target.value)}
                                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 focus:outline-none focus:border-amber-500"
                                            />
                                          </div>
                                        </div>

                                        {/* Step Name */}
                                        <div className="col-span-4">
                                          <input
                                            type="text"
                                            value={ms.step_name || ms.title || ''}
                                            onChange={(e) => handleMilestoneStepChange(record.id, ms.id, 'step_name', e.target.value)}
                                            placeholder="Payment Milestone"
                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                                          />
                                        </div>

                                        {/* Amount */}
                                        <div className="col-span-2 text-right">
                                          <input
                                            type="number"
                                            value={ms.amount || 0}
                                            onChange={(e) => handleMilestoneStepChange(record.id, ms.id, 'amount', Number(e.target.value))}
                                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-amber-500"
                                          />
                                        </div>

                                        {/* Status Pill Button */}
                                        <div className="col-span-2 flex justify-center">
                                          <button
                                            type="button"
                                            onClick={() => handleMilestoneStatusToggle(record.id, ms.id)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition cursor-pointer flex items-center gap-1 ${
                                              isPaid
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                            }`}
                                          >
                                            {isPaid ? <><Check className="w-3 h-3" /> Completed</> : 'Pending'}
                                          </button>
                                        </div>

                                        {/* Action / 3 Dots Menu */}
                                        <div className="col-span-1 flex items-center justify-end relative">
                                          <button
                                            type="button"
                                            onClick={() => setOpenActionMenuId(openActionMenuId === ms.id ? null : ms.id)}
                                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>

                                          {/* Dropdown Menu */}
                                          {openActionMenuId === ms.id && (
                                            <div className="absolute right-0 top-8 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-36 z-30 space-y-0.5 text-xs">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditMilestone(record.id, ms)}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2"
                                              >
                                                <Pencil className="w-3.5 h-3.5" /> Edit Step
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteMilestone(record.id, ms.id)}
                                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 font-bold text-rose-600 flex items-center gap-2"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Bottom 3 Summary Cards (FIXED AMOUNT, RECEIVED AMOUNT, PENDING AMOUNT) */}
                              <div className="grid grid-cols-3 gap-3 pt-3">
                                {/* Fixed Amount */}
                                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Fixed Amount</span>
                                  <span className="font-mono font-bold text-sm text-slate-900 mt-0.5 block">
                                    ₹{finalTotal.toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Received Amount */}
                                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 text-center">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Received Amount</span>
                                  <span className="font-mono font-bold text-sm text-emerald-700 mt-0.5 block">
                                    ₹{recAmt.toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Pending Amount */}
                                <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/80 text-center">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">Pending Amount</span>
                                  <span className="font-mono font-bold text-sm text-rose-600 mt-0.5 block">
                                    ₹{pendAmt.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: TEAM PAYOUTS & EXPENSES (EDIT & DELETE WITH REALTIME RECALC)
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
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl text-xs shadow-xs flex items-center gap-1.5"
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
                <div className="overflow-x-auto">
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
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="Edit Expense"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmExpenseId(exp.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
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
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: FINANCIAL ANALYTICS & BREAKDOWN
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Income vs Expenses Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-orange-600" />
                Revenue vs Operating Expenses
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Collected Revenue</span>
                    <span className="font-mono text-emerald-700">₹{totalReceived.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Total Expenses & Team Payouts</span>
                    <span className="font-mono text-rose-700">₹{totalExpensesAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${totalReceived > 0 ? Math.min(100, (totalExpensesAmount / totalReceived) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-orange-900 uppercase">Estimated Net Profit</span>
                    <p className="text-2xl font-mono font-black text-orange-950 mt-0.5">
                      ₹{netProfit.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-200 text-orange-900">
                    {profitMargin}% Profit Margin
                  </span>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                Expenses by Category
              </h3>

              {filteredExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No expense categories to chart yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Array.from(new Set(filteredExpenses.map(e => e.category))).map(cat => {
                    const catTotal = filteredExpenses
                      .filter(e => e.category === cat)
                      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                    const pct = totalExpensesAmount > 0 ? Math.round((catTotal / totalExpensesAmount) * 100) : 0;

                    return (
                      <div key={cat} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-slate-800">{cat}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-slate-900">₹{catTotal.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-black text-slate-500 bg-white px-2 py-0.5 rounded-md border">
                            {pct}%
                          </span>
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
                            onClick={() => handleMilestoneStatusToggle(item.record.id, item.milestone.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
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
                  <input
                    type="text"
                    value={editingMilestoneData.step_name}
                    onChange={(e) => setEditingMilestoneData(prev => ({ ...prev, step_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
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
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedMilestone}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs"
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
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRecordedPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-xs"
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
                  <input
                    type="text"
                    placeholder="e.g. Pre-Wedding Shoot Balance"
                    value={stepFormData.step_name}
                    onChange={(e) => setStepFormData(prev => ({ ...prev, step_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
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
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewStep}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs"
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
                <button onClick={() => setShowAddExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Client (Optional)</label>
                  <select
                    value={expenseFormData.client_id}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">None / General Studio Expense</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.event_type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Photographer Advance"
                    value={expenseFormData.title}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

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
                    <label className="font-bold text-slate-700 block mb-1">Paid To</label>
                    <input
                      type="text"
                      placeholder="e.g. Amit Sharma"
                      value={expenseFormData.paid_to}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

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
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExpense}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs"
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
                <button onClick={() => setShowEditExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={expenseEditFormData.category}
                    onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title / Description</label>
                  <input
                    type="text"
                    value={expenseEditFormData.title}
                    onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

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
                    <label className="font-bold text-slate-700 block mb-1">Paid To</label>
                    <input
                      type="text"
                      value={expenseEditFormData.paid_to}
                      onChange={(e) => setExpenseEditFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                </div>

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
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedExpense}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-xl shadow-xs"
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
