'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, Plus, Trash2, Phone, Mail, MessageSquare, Send,
  UserCheck, AlertCircle, ChevronDown, GripVertical, CheckCircle2, Table, ArrowUp, ArrowDown,
  QrCode, Sparkles, Upload, Image as ImageIcon, Building2, CreditCard, Lock, Unlock, ShieldCheck, Key,
  Pencil, X, PackageCheck, Gift, Layers, ListPlus, SlidersHorizontal, Edit2, Edit3, MoveUp, MoveDown,
  Search, FileCheck, Calendar, MapPin, Sliders, Shield, Tag, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  WorkspaceEventType, 
  WorkspaceCrewRole, 
  WorkspaceQuotationDeliverable,
  WorkspaceQuotationSpecialAddon,
  WorkspaceQuotationPaidAddon,
  WorkspaceQuotationDefaultFunction,
  WorkspaceQuotationSettings,
  fetchWorkspaceEventTypes, 
  fetchWorkspaceCrewRoles, 
  fetchWorkspaceQuotationSettings,
  saveWorkspaceEventType, 
  updateWorkspaceEventType,
  deleteWorkspaceEventType, 
  saveWorkspaceCrewRole, 
  updateWorkspaceCrewRole,
  deleteWorkspaceCrewRole, 
  saveWorkspaceQuotationDeliverable,
  updateWorkspaceQuotationDeliverable,
  deleteWorkspaceQuotationDeliverable,
  reorderWorkspaceQuotationDeliverables,
  saveWorkspaceQuotationSpecialAddon,
  updateWorkspaceQuotationSpecialAddon,
  deleteWorkspaceQuotationSpecialAddon,
  reorderWorkspaceQuotationSpecialAddons,
  saveWorkspaceQuotationPaidAddon,
  updateWorkspaceQuotationPaidAddon,
  deleteWorkspaceQuotationPaidAddon,
  reorderWorkspaceQuotationPaidAddons,
  saveWorkspaceQuotationDefaultFunction,
  updateWorkspaceQuotationDefaultFunction,
  deleteWorkspaceQuotationDefaultFunction,
  saveWorkspacePaymentStepName,
  updateWorkspacePaymentStepName,
  deleteWorkspacePaymentStepName,
  reorderWorkspacePaymentStepNames,
  saveAllWorkspaceQuotationSettings,
  DEFAULT_EVENT_TYPES, 
  DEFAULT_CREW_ROLES, 
  DEFAULT_WORKSPACE_QUOTATION_SETTINGS,
  DEFAULT_DURATION_SLOTS,
  DEFAULT_QUOTATION_PAYMENT_STEPS,
  getRoleShortCode 
} from '@/lib/workspace-settings';


type SettingsTab = 'leads' | 'functions' | 'crew_roles' | 'quotations' | 'finance' | 'attendance' | 'integrations' | 'team';
type QuoteSubTab = 'deliverables' | 'special_addons' | 'paid_addons' | 'default_functions' | 'payment_steps' | 'theme_terms';

interface DropdownItem {
  id: string;
  name: string;
  color: string;
}

// 9 Exact Colors matching user's screenshot
const GOOGLE_PRESET_COLORS = [
  '#3b82f6', // 1. Sky Blue
  '#06b6d4', // 2. Cyan / Turquoise
  '#10b981', // 3. Teal / Mint Green
  '#84cc16', // 4. Lime Green
  '#f43f5e', // 5. Red / Coral
  '#f59e0b', // 6. Yellow / Gold
  '#8b5cf6', // 7. Purple
  '#ec4899', // 8. Pink / Magenta
  '#f97316', // 9. Bright Orange
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('leads');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);

  // Functions & Crew Roles States
  const [eventTypes, setEventTypes] = useState<WorkspaceEventType[]>(DEFAULT_EVENT_TYPES);
  const [crewRoles, setCrewRoles] = useState<WorkspaceCrewRole[]>(DEFAULT_CREW_ROLES);
  const [newEventName, setNewEventName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  // Editing Modals State
  const [editingFunction, setEditingFunction] = useState<WorkspaceEventType | null>(null);
  const [editFunctionName, setEditFunctionName] = useState('');
  const [editingCrewRole, setEditingCrewRole] = useState<WorkspaceCrewRole | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('');

  // Quotation Settings Suite States
  // Payment Steps states
  const [newStepName, setNewStepName] = useState('');
  const [stepSearch, setStepSearch] = useState('');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepText, setEditStepText] = useState('');

  // Reorder Handlers for Quotation Deliverables, Add-Ons & Payment Steps
  const moveDeliverable = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.deliverables];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationDeliverables(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, deliverables: reordered }));
  };

  const moveSpecialAddon = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.specialAddons];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationSpecialAddons(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, specialAddons: reordered }));
  };

  const movePaidAddon = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.paidAddons];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationPaidAddons(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, paidAddons: reordered }));
  };

  const movePaymentStep = async (idx: number, direction: 'up' | 'down') => {
    const steps = [...(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS)];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const temp = steps[idx];
    steps[idx] = steps[targetIdx];
    steps[targetIdx] = temp;
    const reordered = await reorderWorkspacePaymentStepNames(steps, workspaceId);
    setQuotationSettings(prev => ({ ...prev, paymentSteps: reordered }));
  };

  const [quoteSubTab, setQuoteSubTab] = useState<QuoteSubTab>('deliverables');
  const [quotationSettings, setQuotationSettings] = useState<WorkspaceQuotationSettings>(DEFAULT_WORKSPACE_QUOTATION_SETTINGS);
  
  // Deliverables states
  const [newDelivTitle, setNewDelivTitle] = useState('');
  const [newDelivCat, setNewDelivCat] = useState('Video');
  const [delivSearch, setDelivSearch] = useState('');
  const [editingDeliv, setEditingDeliv] = useState<WorkspaceQuotationDeliverable | null>(null);
  const [editDelivTitle, setEditDelivTitle] = useState('');
  const [editDelivCat, setEditDelivCat] = useState('Video');

  // Special Addons states
  const [newSpecialTitle, setNewSpecialTitle] = useState('');
  const [newSpecialCat, setNewSpecialCat] = useState('Shoots');
  const [specialSearch, setSpecialSearch] = useState('');
  const [editingSpecial, setEditingSpecial] = useState<WorkspaceQuotationSpecialAddon | null>(null);
  const [editSpecialTitle, setEditSpecialTitle] = useState('');
  const [editSpecialCat, setEditSpecialCat] = useState('Shoots');

  // Paid Addons states
  const [newPaidTitle, setNewPaidTitle] = useState('');
  const [newPaidPrice, setNewPaidPrice] = useState('10000');
  const [newPaidCat, setNewPaidCat] = useState('Photography');
  const [paidSearch, setPaidSearch] = useState('');
  const [editingPaid, setEditingPaid] = useState<WorkspaceQuotationPaidAddon | null>(null);
  const [editPaidTitle, setEditPaidTitle] = useState('');
  const [editPaidPrice, setEditPaidPrice] = useState('10000');
  const [editPaidCat, setEditPaidCat] = useState('Photography');

  // Default Functions states
  const [newDefaultFuncName, setNewDefaultFuncName] = useState('');
  const [newDefaultFuncDuration, setNewDefaultFuncDuration] = useState('7 Hours');
  const [newDefaultFuncNotes, setNewDefaultFuncNotes] = useState('');
  const [newDefaultFuncLocation, setNewDefaultFuncLocation] = useState('VENUE / HOTEL NAME');
  const [defaultFuncSearch, setDefaultFuncSearch] = useState('');
  const [editingDefaultFunc, setEditingDefaultFunc] = useState<WorkspaceQuotationDefaultFunction | null>(null);
  const [editDefaultFuncName, setEditDefaultFuncName] = useState('');
  const [editDefaultFuncDuration, setEditDefaultFuncDuration] = useState('7 Hours');
  const [editDefaultFuncNotes, setEditDefaultFuncNotes] = useState('');
  const [editDefaultFuncLocation, setEditDefaultFuncLocation] = useState('');
  const [editDefaultFuncReqs, setEditDefaultFuncReqs] = useState<Array<{ name: string; qty: number }>>([]);

  // 1. Leads Page Settings
  const [leadOwners, setLeadOwners] = useState<DropdownItem[]>([
    { id: '1', name: 'Unassigned', color: '#10b981' },
    { id: '2', name: 'Sahil Dhonde', color: '#3b82f6' },
    { id: '3', name: 'Sushant Nawale', color: '#8b5cf6' },
    { id: '4', name: 'Production Team', color: '#f43f5e' },
  ]);

  const [leadSources, setLeadSources] = useState<DropdownItem[]>([
    { id: 's1', name: 'Facebook Ads', color: '#3b82f6' },
    { id: 's2', name: 'Instagram Ads', color: '#ec4899' },
    { id: 's3', name: 'Google Ads', color: '#f43f5e' },
    { id: 's4', name: 'Website', color: '#10b981' },
    { id: 's5', name: 'Referral', color: '#f59e0b' },
    { id: 's6', name: 'WhatsApp Direct', color: '#84cc16' },
  ]);

  const [leadStages, setLeadStages] = useState<DropdownItem[]>([
    { id: 'new', name: 'Inquiry / New', color: '#3b82f6' },
    { id: 'contacted', name: 'Contacted', color: '#8b5cf6' },
    { id: 'cool', name: 'Cool / Warm', color: '#06b6d4' },
    { id: 'hot', name: 'Hot Lead', color: '#f43f5e' },
    { id: 'booked', name: 'Booked', color: '#84cc16' },
    { id: 'won', name: 'Won / Converted', color: '#10b981' },
    { id: 'lost', name: 'Lost / Closed', color: '#f43f5e' },
  ]);

  const [budgetRanges, setBudgetRanges] = useState<DropdownItem[]>([
    { id: 'b1', name: '50k - 1L', color: '#10b981' },
    { id: 'b2', name: '1L - 2.5L', color: '#3b82f6' },
    { id: 'b3', name: '2.5L - 5L', color: '#f59e0b' },
    { id: 'b4', name: '5L+', color: '#f43f5e' },
  ]);

  // Lead Action Buttons Checkboxes (Default for new users: quotation, call, mail, comments)
  const [quickActions, setQuickActions] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('leads_quick_actions');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) {}
      }
    }
    return {
      quotation: true,
      call: true,
      mail: true,
      comments: true,
      google_contact: false,
      wgl_alert: false,
      whatsapp: false,
      followup: false,
    };
  });

  // 2. Quotations Page Settings
  const [pdfTheme, setPdfTheme] = useState('royal_gold');
  const [quoteTerms, setQuoteTerms] = useState('Deliverables will be compiled and sent within 45 days of wedding event completion.');
  const [quoteExpiryDays, setQuoteExpiryDays] = useState(14);
  const [currency, setCurrency] = useState('INR');
  const [contractClauses, setContractClauses] = useState('1. Standard contract terms apply for all assignments.\n2. Final deliverables delivered post clearance.');

  // 3. Finance & Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('FILMIFY WEDDINGS');
  const [invoiceTagline, setInvoiceTagline] = useState('Luxury Wedding Photography & Cinematography');
  const [invoiceGstin, setInvoiceGstin] = useState('27AABCF1234F1ZP');
  const [invoiceAddress, setInvoiceAddress] = useState('Mumbai, Maharashtra, India');
  const [invoicePhone, setInvoicePhone] = useState('+91 98765 43210');
  const [invoiceEmail, setInvoiceEmail] = useState('info@filmifyweddings.com');
  const [invoiceBankName, setInvoiceBankName] = useState('HDFC Bank');
  const [invoiceAccountNo, setInvoiceAccountNo] = useState('50200012345678');
  const [invoiceIfsc, setInvoiceIfsc] = useState('HDFC0001234');
  const [invoiceAccountHolder, setInvoiceAccountHolder] = useState('Filmify Weddings LLP');
  const [invoiceTerms, setInvoiceTerms] = useState('1. Advance payment is non-refundable upon client cancellation.\n2. Final deliverables delivered post clearance of balance.');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('Thank you for choosing Filmify Weddings! This is a computer-generated invoice.');
  const [invoiceFont, setInvoiceFont] = useState('Cormorant Garamond');
  const [invoiceThemePalette, setInvoiceThemePalette] = useState('auto');
  const [invoiceQrImageUrl, setInvoiceQrImageUrl] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('PRJ-2026-');
  const [gstPercent, setGstPercent] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('50% Retainer for booking lock, 50% on Event Date');
  const [upiId, setUpiId] = useState('studio@upi');
  const [bankDetails, setBankDetails] = useState('HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234');
  const [expenseCategories, setExpenseCategories] = useState<DropdownItem[]>([
    { id: 'e1', name: 'Marketing', color: '#3b82f6' },
    { id: 'e2', name: 'Crew Travel', color: '#f97316' },
    { id: 'e3', name: 'Equipment', color: '#8b5cf6' },
    { id: 'e4', name: 'Editor Pay', color: '#10b981' },
  ]);

  // 3.1 Finance Vault & PIN Security Settings
  const [financePinLocked, setFinancePinLocked] = useState(false);
  const [financePinCode, setFinancePinCode] = useState('123456');
  const [financeAdminEmail, setFinanceAdminEmail] = useState('');
  const [financeMasterPassword, setFinanceMasterPassword] = useState('');
  const [financeTimeoutMins, setFinanceTimeoutMins] = useState(60);

  // 4. Attendance Settings
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [shiftStart, setShiftStart] = useState('09:30');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [breakLimitMinutes, setBreakLimitMinutes] = useState(60);

  // 5. Meta Settings
  const [metaAutoSync, setMetaAutoSync] = useState(true);

  // Get Auth Headers helper
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Sync settings to localStorage
  const syncToLocalStorage = (wId: string, settingsObj: any) => {
    try {
      const ownerNames = (settingsObj.lead_owners || []).map((o: any) => typeof o === 'string' ? o : o.name);
      localStorage.setItem(`settings_owners_${wId}`, JSON.stringify(ownerNames));
      localStorage.setItem(`settings_owners_full_${wId}`, JSON.stringify(leadOwners));
      localStorage.setItem('leads_workspace_team_members', JSON.stringify(
        leadOwners.map((o, idx) => ({ id: o.id || String(idx + 1), name: o.name, email: '', role: 'Lead Owner', color: o.color }))
      ));

      // Sync Sources
      localStorage.setItem(`settings_sources_${wId}`, JSON.stringify(leadSources));
      localStorage.setItem('leads_workspace_sources', JSON.stringify(leadSources));

      // Sync Stages
      localStorage.setItem(`settings_stages_${wId}`, JSON.stringify(leadStages));
      localStorage.setItem('leads_workspace_stages', JSON.stringify(leadStages.map((st, pos) => ({
        id: st.id || st.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: st.name,
        color: st.color,
        position: pos
      }))));

      // Sync Quick Actions
      if (settingsObj.lead_quick_actions && typeof settingsObj.lead_quick_actions === 'object') {
        localStorage.setItem('leads_quick_actions', JSON.stringify(settingsObj.lead_quick_actions));
        localStorage.setItem(`settings_quick_actions_${wId}`, JSON.stringify(settingsObj.lead_quick_actions));
      }

      localStorage.setItem(`settings_currency_${wId}`, settingsObj.quotation_currency || currency);
      localStorage.setItem(`settings_gst_${wId}`, String(settingsObj.invoice_gst_percent ?? gstPercent));
      localStorage.setItem(`settings_upi_${wId}`, settingsObj.invoice_upi_id || upiId);
      localStorage.setItem(`settings_geofence_${wId}`, String(settingsObj.geofence_radius_meters || geofenceRadius));
      localStorage.setItem('studio_invoice_template_config', JSON.stringify({
        companyName: settingsObj.invoice_company_name || invoiceCompanyName,
        tagline: settingsObj.invoice_tagline || invoiceTagline,
        gstin: settingsObj.invoice_gstin || invoiceGstin,
        address: settingsObj.invoice_address || invoiceAddress,
        phone: settingsObj.invoice_phone || invoicePhone,
        email: settingsObj.invoice_email || invoiceEmail,
        invoiceTitle: 'TAX INVOICE',
        prefix: settingsObj.sequence_invoices_prefix || invoicePrefix,
        bankName: settingsObj.invoice_bank_name || invoiceBankName,
        accountNo: settingsObj.invoice_account_no || invoiceAccountNo,
        ifsc: settingsObj.invoice_ifsc || invoiceIfsc,
        accountHolder: settingsObj.invoice_account_holder || invoiceAccountHolder,
        upiId: settingsObj.invoice_upi_id || upiId,
        showUpiQr: true,
        terms: settingsObj.invoice_terms || invoiceTerms,
        footerNote: settingsObj.invoice_footer_note || invoiceFooterNote,
        logoUrl: '',
        qrCodeImageUrl: settingsObj.invoice_qr_image_url || invoiceQrImageUrl,
        fontFamily: settingsObj.invoice_font || invoiceFont,
        themePreset: settingsObj.invoice_theme_palette || invoiceThemePalette,
        themeColor: '#D4AF37',
      }));
    } catch (_) {}
  };

  // Load Settings from Supabase
  const loadWorkspaceSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const wId = session.user.id;
      setWorkspaceId(wId);

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/settings?workspace_id=${wId}`, { headers });

      // Fetch full workspace quotation settings
      const qSettings = await fetchWorkspaceQuotationSettings(wId);
      setQuotationSettings(qSettings);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;

          // Leads Owners
          if (Array.isArray(s.lead_owners) && s.lead_owners.length > 0) {
            setLeadOwners(s.lead_owners.map((o: any, idx: number) => {
              if (typeof o === 'string') {
                return { id: String(idx + 1), name: o, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return o;
            }));
          }

          // Lead Sources
          if (Array.isArray(s.lead_sources) && s.lead_sources.length > 0) {
            setLeadSources(s.lead_sources.map((src: any, idx: number) => {
              if (typeof src === 'string') {
                return { id: `src_${idx}`, name: src, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return src;
            }));
          }

          // Lead Stages
          if (Array.isArray(s.lead_stages) && s.lead_stages.length > 0) {
            setLeadStages(s.lead_stages.map((st: any, idx: number) => {
              if (typeof st === 'string') {
                return { id: `st_${idx}`, name: st, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return st;
            }));
          }

          // Budget Ranges
          if (Array.isArray(s.lead_budget_ranges)) {
            setBudgetRanges(s.lead_budget_ranges.map((b: any, idx: number) => {
              if (typeof b === 'string') {
                return { id: `b_${idx}`, name: b, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return b;
            }));
          }

          // Quick Actions
          if (s.lead_quick_actions && typeof s.lead_quick_actions === 'object') {
            setQuickActions(s.lead_quick_actions);
            localStorage.setItem('leads_quick_actions', JSON.stringify(s.lead_quick_actions));
            localStorage.setItem(`settings_quick_actions_${wId}`, JSON.stringify(s.lead_quick_actions));
          }

          // Quotes
          setPdfTheme(s.quotation_pdf_theme || 'royal_gold');
          setQuoteTerms(s.quotation_pdf_terms || '');
          setQuoteExpiryDays(s.quotation_default_expiry_days || 14);
          setCurrency(s.quotation_currency || 'INR');
          setContractClauses(s.contract_clauses || '');

          // Finance
          setInvoicePrefix(s.sequence_invoices_prefix || 'INV-2026-');
          if (s.invoice_company_name) setInvoiceCompanyName(s.invoice_company_name);
          if (s.invoice_tagline) setInvoiceTagline(s.invoice_tagline);
          if (s.invoice_gstin) setInvoiceGstin(s.invoice_gstin);
          if (s.invoice_address) setInvoiceAddress(s.invoice_address);
          if (s.invoice_phone) setInvoicePhone(s.invoice_phone);
          if (s.invoice_email) setInvoiceEmail(s.invoice_email);
          if (s.invoice_bank_name) setInvoiceBankName(s.invoice_bank_name);
          if (s.invoice_account_no) setInvoiceAccountNo(s.invoice_account_no);
          if (s.invoice_ifsc) setInvoiceIfsc(s.invoice_ifsc);
          if (s.invoice_account_holder) setInvoiceAccountHolder(s.invoice_account_holder);

          // Load Finance Vault Security Settings
          try {
            const { data: secData } = await supabase
              .from('finance_security_settings')
              .select('*')
              .eq('workspace_id', wId)
              .maybeSingle();

            if (secData) {
              setFinancePinLocked(Boolean(secData.is_locked));
              if (secData.pin_hash) setFinancePinCode(secData.pin_hash);
              if (secData.admin_email) setFinanceAdminEmail(secData.admin_email);
              if (secData.master_password_hash) setFinanceMasterPassword(secData.master_password_hash);
              if (secData.session_timeout_minutes) setFinanceTimeoutMins(secData.session_timeout_minutes);
            }
          } catch (_) {}
          if (s.invoice_terms) setInvoiceTerms(s.invoice_terms);
          if (s.invoice_footer_note) setInvoiceFooterNote(s.invoice_footer_note);
          if (s.invoice_font) setInvoiceFont(s.invoice_font);
          if (s.invoice_theme_palette) setInvoiceThemePalette(s.invoice_theme_palette);
          if (s.invoice_qr_image_url) setInvoiceQrImageUrl(s.invoice_qr_image_url);
          setProjectPrefix(s.sequence_projects_prefix || 'PRJ-2026-');
          setGstPercent(s.invoice_gst_percent ?? 18);
          setPaymentTerms(s.invoice_payment_terms || '');
          setUpiId(s.invoice_upi_id || '');
          setBankDetails(s.invoice_bank_details || '');
          if (Array.isArray(s.expense_categories)) {
            setExpenseCategories(s.expense_categories.map((c: any, idx: number) => {
              if (typeof c === 'string') {
                return { id: `e_${idx}`, name: c, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return c;
            }));
          }

          // Attendance
          setGeofenceRadius(s.geofence_radius_meters || 100);
          setShiftStart(s.shift_start_time || '09:30');
          setGraceMinutes(s.grace_period_minutes || 15);
          setBreakLimitMinutes(s.break_limit_minutes || 60);

          // Integrations
          setMetaAutoSync(s.meta_auto_sync_enabled !== false);

          syncToLocalStorage(wId, s);
        }
      }

      // Fetch Workspace Event Types and Crew Roles
      if (wId) {
        const ev = await fetchWorkspaceEventTypes(wId);
        if (ev && ev.length > 0) setEventTypes(ev);
        const cr = await fetchWorkspaceCrewRoles(wId);
        if (cr && cr.length > 0) setCrewRoles(cr);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [router, getAuthHeaders]);

  useEffect(() => {
    loadWorkspaceSettings();
  }, [loadWorkspaceSettings]);

  // Save Settings Handler
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wId = session?.user?.id || workspaceId;
      const headers = await getAuthHeaders();

      const payloadSettings = {
        lead_owners: leadOwners.map(o => ({ id: o.id, name: o.name, color: o.color })),
        lead_sources: leadSources.map(s => ({ id: s.id, name: s.name, color: s.color })),
        lead_stages: leadStages.map((st, idx) => ({ id: st.id || `st_${idx}`, name: st.name, color: st.color, position: idx })),
        lead_budget_ranges: budgetRanges.map(b => b.name),
        lead_quick_actions: quickActions,

        quotation_pdf_theme: pdfTheme,
        quotation_pdf_terms: quoteTerms,
        quotation_default_expiry_days: quoteExpiryDays,
        quotation_currency: currency,
        contract_clauses: contractClauses,

        sequence_invoices_prefix: invoicePrefix,
        invoice_company_name: invoiceCompanyName,
        invoice_tagline: invoiceTagline,
        invoice_gstin: invoiceGstin,
        invoice_address: invoiceAddress,
        invoice_phone: invoicePhone,
        invoice_email: invoiceEmail,
        invoice_bank_name: invoiceBankName,
        invoice_account_no: invoiceAccountNo,
        invoice_ifsc: invoiceIfsc,
        invoice_account_holder: invoiceAccountHolder,
        invoice_terms: invoiceTerms,
        invoice_footer_note: invoiceFooterNote,
        invoice_font: invoiceFont,
        invoice_theme_palette: invoiceThemePalette,
        invoice_qr_image_url: invoiceQrImageUrl,
        sequence_projects_prefix: projectPrefix,
        invoice_gst_percent: gstPercent,
        invoice_payment_terms: paymentTerms,
        invoice_upi_id: upiId,
        invoice_bank_details: bankDetails,
        expense_categories: expenseCategories.map(c => c.name),

        geofence_radius_meters: geofenceRadius,
        shift_start_time: shiftStart,
        grace_period_minutes: graceMinutes,
        break_limit_minutes: breakLimitMinutes,

        meta_auto_sync_enabled: metaAutoSync,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspace_id: wId,
          settings: payloadSettings,
        }),
      });

      if (res.ok) {
        syncToLocalStorage(wId, payloadSettings);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('settings_updated'));
        }
        // Save Finance Vault Security Settings
        try {
          await supabase
            .from('finance_security_settings')
            .upsert([{
              workspace_id: wId,
              user_id: wId,
              is_locked: financePinLocked,
              pin_hash: financePinCode || '123456',
              admin_email: financeAdminEmail || '',
              master_password_hash: financeMasterPassword || '',
              session_timeout_minutes: Number(financeTimeoutMins) || 60,
              updated_at: new Date().toISOString()
            }], { onConflict: 'workspace_id' });
        } catch (secSaveErr) {
          console.warn('Finance vault save note:', secSaveErr);
        }

        // Persist quotation settings
        try {
          await saveAllWorkspaceQuotationSettings(wId, {
            ...quotationSettings,
            pdfTheme,
            quoteTerms,
            contractClauses,
            quoteExpiryDays,
            currency
          });
        } catch (qErr) {
          console.warn('Quotation settings save note:', qErr);
        }

        setSaveToast('Settings saved & synchronized live across all pages! ');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert('Save Failed: ' + (errJson.error || 'Unknown server error'));
      }
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Google Sheets Option Item Handlers
  const handleUpdateItemName = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string,
    newName: string
  ) => {
    setList(list.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const handleUpdateItemColor = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string,
    newColor: string
  ) => {
    setList(list.map(item => item.id === id ? { ...item, color: newColor } : item));
    setActiveColorPickerId(null);
  };

  const handleRemoveItem = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string
  ) => {
    setList(list.filter(item => item.id !== id));
  };

  const handleAddItem = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    prefix: string
  ) => {
    const nextIdx = list.length + 1;
    const newColor = GOOGLE_PRESET_COLORS[(list.length) % GOOGLE_PRESET_COLORS.length];
    setList([...list, { id: `${prefix}_${Date.now()}`, name: `Option ${nextIdx}`, color: newColor }]);
  };

  const handleMoveItemUp = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    index: number
  ) => {
    if (index <= 0) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    setList(copy);
  };

  const handleMoveItemDown = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    index: number
  ) => {
    if (index >= list.length - 1) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    setList(copy);
  };

  // Render Google Sheets Style Dropdown Item List Component matching image palette
  const renderGoogleOptionList = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    prefix: string,
    addLabel: string = "Add another item"
  ) => (
    <div className="space-y-2.5 pt-2">
      {list.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 sm:gap-3 group relative">
          {/* Grip Handle */}
          <div className="cursor-grab text-slate-300 hover:text-zinc-500 transition-colors p-1">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Up / Down Reorder Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleMoveItemUp(list, setList, index)}
              disabled={index === 0}
              className="p-1 text-slate-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveItemDown(list, setList, index)}
              disabled={index === list.length - 1}
              className="p-1 text-slate-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Picker Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveColorPickerId(activeColorPickerId === item.id ? null : item.id)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-amber-200/90 rounded-xl hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            >
              <span className="w-4 h-4 rounded-md shadow-inner" style={{ backgroundColor: item.color }} />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Exact Color Palette Popover matching image */}
            {activeColorPickerId === item.id && (
              <div className="absolute left-0 top-11 z-50 p-3 bg-white border border-amber-200/90 rounded-2xl shadow-2xl space-y-2 min-w-[280px]">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Select Color</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {GOOGLE_PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateItemColor(list, setList, item.id, c)}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-xs border border-black/10 relative"
                      style={{ backgroundColor: c }}
                    >
                      {item.color.toLowerCase() === c.toLowerCase() && (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Input Box */}
          <input
            type="text"
            value={item.name}
            onChange={e => handleUpdateItemName(list, setList, item.id, e.target.value)}
            className="flex-1 px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-sm font-medium text-amber-950 focus:outline-none focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] shadow-xs"
            placeholder="Option Name..."
          />

          {/* Trash Icon Button */}
          <button
            type="button"
            onClick={() => handleRemoveItem(list, setList, item.id)}
            className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete option"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add another item button */}
      <button
        type="button"
        onClick={() => handleAddItem(list, setList, prefix)}
        className="mt-2 px-4 py-2 bg-white border border-amber-200/90 hover:bg-[#FEFDF8] text-[#0F9D58] font-bold text-xs rounded-xl transition-all shadow-xs border-dashed flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>{addLabel}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEFDF8]/80 text-amber-950 p-4 sm:p-6 md:p-8 font-sans">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F9D58] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/90 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200/90 text-zinc-600 hover:text-amber-950 transition-all shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#0F9D58] uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Table className="w-3 h-3" /> GOOGLE SHEETS DYNAMIC SYNC
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-950 mt-1 flex items-center gap-2">
                Master Page-Wise Settings Dashboard
              </h1>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Saving to Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Page-Wise Settings Tabs Header */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-amber-200/90 scrollbar-none">
          {[
            { id: 'leads', label: ' Leads & Pipeline', icon: Target },
            { id: 'functions', label: ' Functions & Events', icon: Sparkles },
            { id: 'crew_roles', label: ' Crew Roles & Codes', icon: Users },
            { id: 'quotations', label: ' Quotations & Proposals', icon: FileText },
            { id: 'finance', label: ' Finance & Invoices', icon: Coins },
            { id: 'attendance', label: ' Attendance & Geofence', icon: Clock },
            { id: 'integrations', label: ' Meta & Integrations', icon: Globe },
            { id: 'team', label: ' Team & Owners', icon: ShieldCheck },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-[#0F9D58] text-white shadow-xs border border-[#0B8043]' 
                    : 'bg-white hover:bg-amber-50 text-zinc-700 border border-amber-200/90'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500 space-y-3 bg-white rounded-2xl border border-amber-200/90 shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F9D58]" />
            <p className="text-sm font-semibold">Loading user settings from Supabase Database...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. LEADS PAGE SETTINGS */}
            {activeTab === 'leads' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Leads Page Settings (`/leads`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Manage Lead Owners, Lead Sources, Pipeline Stages, and Action Buttons</p>
                  </div>
                </div>

                {/* Lead Action Buttons Checkboxes */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider block">
                      Manage Lead Action Column Buttons (Visible on `/leads` Page)
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5">Select which action buttons appear in the Action column (New users get Quotation, Call, Mail & Comments by default)</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {[
                      { key: 'quotation', label: 'Quotation / Proposal', icon: FileText, desc: 'Generate & send PDF quotes', isDefault: true },
                      { key: 'call', label: 'Device Dialer Call', icon: Phone, desc: 'Click-to-call lead phone number', isDefault: true },
                      { key: 'mail', label: 'Email Lead', icon: Mail, desc: 'Send email to lead', isDefault: true },
                      { key: 'comments', label: 'Comments & Reminders', icon: MessageSquare, desc: 'Open discussion timeline drawer', isDefault: true },
                      { key: 'google_contact', label: 'Google Contact Sync', icon: UserCheck, desc: 'Sync lead to Google Contacts', isDefault: false },
                      { key: 'wgl_alert', label: 'WGL Alert Dispatch', icon: AlertCircle, desc: 'Dispatch WGL team notification', isDefault: false },
                      { key: 'whatsapp', label: 'WhatsApp Direct', icon: Send, desc: 'Send WhatsApp welcome message', isDefault: false },
                      { key: 'followup', label: 'Followup Calendar', icon: Clock, desc: 'Schedule followups & tasks', isDefault: false },
                    ].map(item => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          quickActions[item.key] 
                            ? 'bg-emerald-50/60 border-emerald-300 text-amber-950 shadow-2xs' 
                            : 'bg-white border-amber-200/90 text-zinc-500 hover:bg-[#FEFDF8]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!quickActions[item.key]}
                          onChange={e => setQuickActions({ ...quickActions, [item.key]: e.target.checked })}
                          className="mt-0.5 w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] border-slate-300 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <item.icon className="w-3.5 h-3.5 text-[#0F9D58]" />
                            {item.label}
                            {item.isDefault && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-[#0F9D58] px-1.5 py-0.2 rounded-md">Default</span>
                            )}
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Lead Owners Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Manage Lead Owners (Dropdown Options in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadOwners, setLeadOwners, 'owner', 'Add another item')}
                </div>

                {/* Lead Sources Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Manage Lead Sources (Dropdown Options in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadSources, setLeadSources, 'source', 'Add another item')}
                </div>

                {/* Lead Stages Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Manage Pipeline Stages (Kanban Columns in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadStages, setLeadStages, 'stage', 'Add another item')}
                </div>

                {/* Lead Budget Ranges Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Lead Budget Filter Options
                  </label>
                  {renderGoogleOptionList(budgetRanges, setBudgetRanges, 'budget', 'Add another item')}
                </div>
              </div>
            )}

            {/* 1.5 FUNCTIONS & WEDDING EVENTS SETTINGS */}
            {activeTab === 'functions' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">Functions & Wedding Events Settings</h2>
                      <p className="text-xs font-medium text-zinc-500">
                        Manage standardized wedding event names. Synced automatically across Quotations and Team Manager.
                      </p>
                    </div>
                  </div>

                  <div className="relative min-w-[220px]">
                    <input
                      type="text"
                      placeholder="Search functions..."
                      value={eventSearch}
                      onChange={e => setEventSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F9D58]"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Add New Function Form */}
                <div className="p-4 bg-[#FEFDF8] border border-amber-200/90 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
                    + Add New Function
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      placeholder="Event Name (e.g. Ring Ceremony, Cocktail, Pool Party)..."
                      value={newEventName}
                      onChange={e => setNewEventName(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && newEventName.trim()) {
                          const clean = newEventName.trim();
                          const created = await saveWorkspaceEventType(workspaceId, clean, 'General');
                          if (created) {
                            setEventTypes(prev => [...prev.filter(ev => ev.name.toLowerCase() !== clean.toLowerCase()), created]);
                            setNewEventName('');
                            setSaveToast(`Function "${clean}" added & synced!`);
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newEventName.trim()) return;
                        const clean = newEventName.trim();
                        const created = await saveWorkspaceEventType(workspaceId, clean, 'General');
                        if (created) {
                          setEventTypes(prev => [...prev.filter(ev => ev.name.toLowerCase() !== clean.toLowerCase()), created]);
                          setNewEventName('');
                          setSaveToast(`Function "${clean}" added & synced!`);
                          setTimeout(() => setSaveToast(null), 3000);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Function</span>
                    </button>
                  </div>
                </div>

                {/* Event Types List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {eventTypes
                    .filter(e => e.name.toLowerCase().includes(eventSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-white border border-amber-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-amber-950 block truncate">{item.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category || 'General'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.is_default && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-50 text-zinc-500 rounded-md">
                              Default
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFunction(item);
                              setEditFunctionName(item.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-indigo-50 cursor-pointer"
                            title="Edit Function"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Delete function "${item.name}"?`)) return;
                              await deleteWorkspaceEventType(item.id, workspaceId);
                              setEventTypes(prev => prev.filter(e => e.id !== item.id));
                              setSaveToast(`Function "${item.name}" removed`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Edit Function Modal */}
                {editingFunction && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-amber-200/90 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Function Name</h3>
                        <button
                          onClick={() => setEditingFunction(null)}
                          className="p-1 text-slate-400 hover:text-zinc-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editFunctionName}
                        onChange={e => setEditFunctionName(e.target.value)}
                        placeholder="Function Name..."
                        className="w-full px-3 py-2 border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingFunction(null)}
                          className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-amber-50 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!editFunctionName.trim()) return;
                            const clean = editFunctionName.trim();
                            const updated = await updateWorkspaceEventType(editingFunction.id, clean, editingFunction.category, workspaceId);
                            if (updated) {
                              setEventTypes(prev => prev.map(ev => ev.id === editingFunction.id ? { ...ev, name: clean } : ev));
                              setSaveToast(`Function updated to "${clean}"!`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }
                            setEditingFunction(null);
                          }}
                          className="px-4 py-1.5 bg-[#0F9D58] hover:bg-[#0B8043] text-white text-xs font-extrabold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1.6 CREW ROLES & SHORT CODES SETTINGS */}
            {activeTab === 'crew_roles' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">Crew Roles & Short Codes Settings</h2>
                      <p className="text-xs font-medium text-zinc-500">
                        Configure crew roles with short codes (TP, CP, CV, DP) for compact roster cards in Team Manager.
                      </p>
                    </div>
                  </div>

                  <div className="relative min-w-[220px]">
                    <input
                      type="text"
                      placeholder="Search roles or codes..."
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F9D58]"
                    />
                    <Users className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Add New Crew Role Form */}
                <div className="p-4 bg-[#FEFDF8] border border-amber-200/90 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
                    + Add New Crew Role & Short Code
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Full Role Name (e.g. Candid Photographer)..."
                      value={newRoleName}
                      onChange={e => {
                        setNewRoleName(e.target.value);
                        if (!newRoleCode) setNewRoleCode(getRoleShortCode(e.target.value));
                      }}
                      className="sm:col-span-2 px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] shadow-xs"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Short Code (e.g. CP)..."
                        value={newRoleCode}
                        onChange={e => setNewRoleCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-black text-indigo-600 uppercase focus:outline-none focus:border-[#0F9D58] shadow-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newRoleName.trim()) return;
                        const cleanName = newRoleName.trim();
                        const cleanCode = newRoleCode.trim().toUpperCase() || getRoleShortCode(cleanName);
                        const created = await saveWorkspaceCrewRole(workspaceId, cleanName, cleanCode, 'Photography');
                        if (created) {
                          setCrewRoles(prev => [...prev.filter(r => r.name.toLowerCase() !== cleanName.toLowerCase()), created]);
                          setNewRoleName('');
                          setNewRoleCode('');
                          setSaveToast(`Crew Role "${cleanName} (${cleanCode})" added & synced!`);
                          setTimeout(() => setSaveToast(null), 3000);
                        }
                      }}
                      className="w-full px-5 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Role</span>
                    </button>
                  </div>
                </div>

                {/* Crew Roles List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                  {crewRoles
                    .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.short_code.toLowerCase().includes(roleSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-white border border-amber-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                            {item.short_code}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-amber-950 block truncate">{item.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category || 'Crew'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.is_default && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-50 text-zinc-500 rounded-md">
                              Def
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCrewRole(item);
                              setEditRoleName(item.name);
                              setEditRoleCode(item.short_code);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-indigo-50 cursor-pointer"
                            title="Edit Role & Code"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Delete crew role "${item.name}"?`)) return;
                              await deleteWorkspaceCrewRole(item.id, workspaceId);
                              setCrewRoles(prev => prev.filter(r => r.id !== item.id));
                              setSaveToast(`Crew role "${item.name}" removed`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition rounded-lg cursor-pointer opacity-100 border border-rose-200/60 shadow-2xs"
                            title={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Edit Crew Role Modal */}
                {editingCrewRole && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-amber-200/90 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Crew Role</h3>
                        <button
                          onClick={() => setEditingCrewRole(null)}
                          className="p-1 text-slate-400 hover:text-zinc-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Full Role Name</label>
                          <input
                            type="text"
                            value={editRoleName}
                            onChange={e => setEditRoleName(e.target.value)}
                            placeholder="Role Name..."
                            className="w-full px-3 py-2 border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Short Code (Any Length)</label>
                          <input
                            type="text"
                            value={editRoleCode}
                            onChange={e => setEditRoleCode(e.target.value.toUpperCase())}
                            placeholder="Short Code (e.g. CP, CINE, DRONE)..."
                            className="w-full px-3 py-2 border border-amber-200/90 rounded-xl text-xs font-black text-indigo-600 uppercase focus:outline-none focus:border-[#0F9D58]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingCrewRole(null)}
                          className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-amber-50 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!editRoleName.trim()) return;
                            const cleanName = editRoleName.trim();
                            const cleanCode = editRoleCode.trim().toUpperCase() || getRoleShortCode(cleanName);
                            const updated = await updateWorkspaceCrewRole(editingCrewRole.id, cleanName, cleanCode, editingCrewRole.category, workspaceId);
                            if (updated) {
                              setCrewRoles(prev => prev.map(r => r.id === editingCrewRole.id ? { ...r, name: cleanName, short_code: cleanCode } : r));
                              setSaveToast(`Crew role updated to "${cleanName} (${cleanCode})"!`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }
                            setEditingCrewRole(null);
                          }}
                          className="px-4 py-1.5 bg-[#0F9D58] hover:bg-[#0B8043] text-white text-xs font-extrabold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. QUOTATIONS PAGE SETTINGS */}
            {activeTab === 'quotations' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">Quotations & Proposals Suite (`/workspace/quotations`)</h2>
                      <p className="text-xs font-medium text-zinc-500">Manage Deliverables, Special Add-ons, Extra Paid Add-ons, Default Functions, and Themes with 2-Way Sync</p>
                    </div>
                  </div>

                  {/* Quotation Sub-Tabs Navigation Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-amber-50/80 rounded-xl overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('deliverables')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'deliverables' ? 'bg-white text-blue-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Deliverables</span>
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-black">
                        {quotationSettings.deliverables.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('special_addons')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'special_addons' ? 'bg-white text-purple-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Special Add-ons</span>
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] rounded-full font-black">
                        {quotationSettings.specialAddons.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('paid_addons')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'paid_addons' ? 'bg-white text-emerald-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Extra Paid Add-ons</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
                        {quotationSettings.paidAddons.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('default_functions')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'default_functions' ? 'bg-white text-amber-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Default Functions</span>
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-black">
                        {quotationSettings.defaultFunctions.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('theme_terms')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'theme_terms' ? 'bg-white text-amber-950 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Theme & Terms</span>
                    </button>
                  </div>
                </div>

                {/* SUBTAB 1: OUTPUT DELIVERABLES */}
                {quoteSubTab === 'deliverables' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider"> Output Deliverables Catalog</h3>
                        <p className="text-[11px] text-blue-800 font-medium">Deliverables managed here sync automatically with the Quotation Builder dropdowns and client proposals.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-blue-200 text-blue-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.deliverables.length} Deliverables Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Deliverable title (e.g. 10 Drone 4K Highlight Clips)..."
                        value={newDelivTitle}
                        onChange={e => setNewDelivTitle(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newDelivTitle.trim()) {
                            await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, newDelivCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewDelivTitle('');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      <select
                        value={newDelivCat}
                        onChange={e => setNewDelivCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Video">Video</option>
                        <option value="Photo">Photo</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Album">Album</option>
                        <option value="Data">Data</option>
                        <option value="General">General</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newDelivTitle.trim()) {
                            await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, newDelivCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewDelivTitle('');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white font-black shadow-[0_4px_14px_rgba(245,158,11,0.3)] active:translate-y-0.5 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Deliverable</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search deliverables..."
                          value={delivSearch}
                          onChange={e => setDelivSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.deliverables.filter(d => d.title.toLowerCase().includes(delivSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.deliverables
                          .filter(d => d.title.toLowerCase().includes(delivSearch.toLowerCase()))
                          .map((d, idx) => (
                            <div
                              key={d.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-blue-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{d.title}</p>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-zinc-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                                    {d.category || 'General'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeliv(d);
                                    setEditDelivTitle(d.title);
                                    setEditDelivCat(d.category || 'General');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Deliverable"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationDeliverable(d.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Deliverable"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: SPECIAL VALUE ADDITIONS (COMPLIMENTARY) */}
                {quoteSubTab === 'special_addons' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider"> Special Value Additions (Complimentary)</h3>
                        <p className="text-[11px] text-purple-800 font-medium">Free perks and value-added services offered to entice clients in proposals.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-purple-200 text-purple-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.specialAddons.length} Special Addons
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Special Addon title (e.g. Free Drone Coverage for Sangeet)..."
                        value={newSpecialTitle}
                        onChange={e => setNewSpecialTitle(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newSpecialTitle.trim()) {
                            await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, newSpecialCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewSpecialTitle('');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
                      />
                      <select
                        value={newSpecialCat}
                        onChange={e => setNewSpecialCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Shoots">Shoots</option>
                        <option value="Album">Album</option>
                        <option value="Drone">Drone</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Data">Data</option>
                        <option value="Live Output">Live Output</option>
                        <option value="Complimentary">Complimentary</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newSpecialTitle.trim()) {
                            await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, newSpecialCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewSpecialTitle('');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Special Addon</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search special addons..."
                          value={specialSearch}
                          onChange={e => setSpecialSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.specialAddons.filter(s => s.title.toLowerCase().includes(specialSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.specialAddons
                          .filter(s => s.title.toLowerCase().includes(specialSearch.toLowerCase()))
                          .map((s, idx) => (
                            <div
                              key={s.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-purple-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{s.title}</p>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-black rounded-md uppercase tracking-wider">
                                    {s.category || 'Complimentary'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSpecial(s);
                                    setEditSpecialTitle(s.title);
                                    setEditSpecialCat(s.category || 'Complimentary');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Special Addon"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationSpecialAddon(s.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Special Addon"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: PAID ADD-ONS & UPGRADES */}
                {quoteSubTab === 'paid_addons' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider"> Extra Paid Add-ons & Upgrades</h3>
                        <p className="text-[11px] text-emerald-800 font-medium">Additional billable crew, services & upgrades that clients can opt for with standard base pricing.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-emerald-200 text-emerald-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.paidAddons.length} Paid Add-ons Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add-on Title (e.g. FPV Drone Pilot)..."
                        value={newPaidTitle}
                        onChange={e => setNewPaidTitle(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                      />
                      <div className="relative flex items-center w-36">
                        <span className="absolute left-2.5 text-xs font-bold text-emerald-700"></span>
                        <input
                          type="number"
                          placeholder="Price ()"
                          value={newPaidPrice}
                          onChange={e => setNewPaidPrice(e.target.value)}
                          className="w-full pl-6 pr-2 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <select
                        value={newPaidCat}
                        onChange={e => setNewPaidCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Photography">Photography</option>
                        <option value="Cinematography">Cinematography</option>
                        <option value="Drone">Drone</option>
                        <option value="Live Tech">Live Tech</option>
                        <option value="Album">Album</option>
                        <option value="Post-Production">Post-Production</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Equipment">Equipment</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newPaidTitle.trim()) {
                            await saveWorkspaceQuotationPaidAddon(workspaceId, newPaidTitle, Number(newPaidPrice) || 0, newPaidCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewPaidTitle('');
                            setNewPaidPrice('10000');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Paid Add-on</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search paid add-ons..."
                          value={paidSearch}
                          onChange={e => setPaidSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.paidAddons.filter(p => p.title.toLowerCase().includes(paidSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.paidAddons
                          .filter(p => p.title.toLowerCase().includes(paidSearch.toLowerCase()))
                          .map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{p.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-extrabold text-emerald-700">
                                      {Number(p.price || 0).toLocaleString('en-IN')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-amber-50 text-zinc-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                                      {p.category || 'Extra Service'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPaid(p);
                                    setEditPaidTitle(p.title);
                                    setEditPaidPrice(String(p.price || 0));
                                    setEditPaidCat(p.category || 'Extra Service');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Paid Add-on"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationPaidAddon(p.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Paid Add-on"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: DEFAULT WEDDING FUNCTIONS & COVERAGE */}
                {quoteSubTab === 'default_functions' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider"> Default Quotation Functions & Events</h3>
                        <p className="text-[11px] text-amber-800 font-medium">Pre-configure standard wedding functions with default crew counts, duration, and notes. When creating a new Quotation Proposal, these functions will load automatically!</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-amber-200 text-amber-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.defaultFunctions.length} Default Functions Active
                      </span>
                    </div>

                    {/* Quick Add Function Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Function Name (e.g. Sangeet & Cocktail)..."
                          value={newDefaultFuncName}
                          onChange={e => setNewDefaultFuncName(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                        <select
                          value={newDefaultFuncDuration}
                          onChange={e => setNewDefaultFuncDuration(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                        >
                          {DEFAULT_DURATION_SLOTS.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Default Venue / City..."
                          value={newDefaultFuncLocation}
                          onChange={e => setNewDefaultFuncLocation(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-medium text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          placeholder="Optional notes (e.g. Includes stage performances & couple entry coverage)..."
                          value={newDefaultFuncNotes}
                          onChange={e => setNewDefaultFuncNotes(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (newDefaultFuncName.trim()) {
                              await saveWorkspaceQuotationDefaultFunction(workspaceId, {
                                name: newDefaultFuncName,
                                durationSlot: newDefaultFuncDuration,
                                location: newDefaultFuncLocation,
                                notes: newDefaultFuncNotes,
                                requirements: [
                                  { name: 'Candid Photography', qty: 2 },
                                  { name: 'Cinematography', qty: 2 },
                                  { name: 'Drone', qty: 1 }
                                ]
                              });
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setNewDefaultFuncName('');
                              setNewDefaultFuncNotes('');
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Default Function</span>
                        </button>
                      </div>
                    </div>

                    {/* Functions List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search default functions..."
                          value={defaultFuncSearch}
                          onChange={e => setDefaultFuncSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          {quotationSettings.defaultFunctions.length} Functions configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quotationSettings.defaultFunctions
                          .filter(f => f.name.toLowerCase().includes(defaultFuncSearch.toLowerCase()))
                          .map((f, idx) => (
                            <div
                              key={f.id || idx}
                              className="p-4 bg-white border border-amber-200/90 hover:border-amber-300 rounded-2xl shadow-2xs space-y-2.5 transition-all group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <h4 className="text-sm font-extrabold text-amber-950">{f.name}</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
                                     {f.durationSlot || '7 Hours'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDefaultFunc(f);
                                      setEditDefaultFuncName(f.name);
                                      setEditDefaultFuncDuration(f.durationSlot || '7 Hours');
                                      setEditDefaultFuncLocation(f.location || '');
                                      setEditDefaultFuncNotes(f.notes || '');
                                      setEditDefaultFuncReqs(f.requirements || []);
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await deleteWorkspaceQuotationDefaultFunction(f.id, workspaceId);
                                      const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                      setQuotationSettings(updated);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Crew requirements tags */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(f.requirements || []).map((req, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="px-2 py-0.5 bg-amber-50 border border-amber-200/90 text-zinc-850 text-[10px] font-extrabold rounded-md flex items-center gap-1"
                                  >
                                    <span>{req.qty}x</span>
                                    <span>{req.name}</span>
                                    <span className="px-1 py-0.2 bg-blue-100 text-blue-800 text-[8px] font-black rounded">
                                      {getRoleShortCode(req.name)}
                                    </span>
                                  </span>
                                ))}
                              </div>

                              {f.notes && (
                                <p className="text-[11px] text-zinc-500 italic bg-[#FEFDF8] p-2 rounded-lg border border-amber-100">
                                  "{f.notes}"
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 5: THEME, EXPIRY & TERMS */}
                                {/* SUBTAB 5: PAYMENT SCHEDULE STEP NAMES */}
                {quoteSubTab === 'payment_steps' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span>Payment Terms & Schedule Step Names</span>
                        </h3>
                        <p className="text-[11px] text-amber-900 font-medium">Default installment step presets. These populate the Step Name dropdown in Quotation Builder with live 2-way sync.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-amber-300 text-amber-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS).length} Presets Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Step Name (e.g. Token Amount, Advance Amount, On Wedding Day, After Event)..."
                        value={newStepName}
                        onChange={e => setNewStepName(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newStepName.trim()) {
                            await saveWorkspacePaymentStepName(workspaceId, newStepName);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewStepName('');
                            setSaveToast('Step Name added!');
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }}
                        className="flex-1 w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (newStepName.trim()) {
                            await saveWorkspacePaymentStepName(workspaceId, newStepName);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewStepName('');
                            setSaveToast('Step Name added!');
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Step Name</span>
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search step names..."
                        value={stepSearch}
                        onChange={e => setStepSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FEFDF8] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Step Names List with Reorder Controls */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS)
                        .filter(s => s.toLowerCase().includes(stepSearch.toLowerCase()))
                        .map((step, idx) => {
                          const isEditing = editingStepIndex === idx;
                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-[#FEFDF8] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => movePaymentStep(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <MoveUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePaymentStep(idx, 'down')}
                                    disabled={idx === (quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS).length - 1}
                                    className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <MoveDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  #{idx + 1}
                                </span>

                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editStepText}
                                    onChange={e => setEditStepText(e.target.value)}
                                    autoFocus
                                    className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                                  />
                                ) : (
                                  <p className="text-xs font-bold text-zinc-900 truncate flex-1">{step}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (editStepText.trim()) {
                                        await updateWorkspacePaymentStepName(step, editStepText, workspaceId);
                                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                        setQuotationSettings(updated);
                                        setEditingStepIndex(null);
                                        setSaveToast('Step Name updated!');
                                        setTimeout(() => setSaveToast(null), 3000);
                                      }
                                    }}
                                    className="px-2 py-1 bg-amber-500 text-white text-[10px] font-black rounded-md cursor-pointer"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStepIndex(idx);
                                      setEditStepText(step);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Delete step name "${step}"?`)) {
                                      await deleteWorkspacePaymentStepName(step, workspaceId);
                                      const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                      setQuotationSettings(updated);
                                      setSaveToast('Step Name removed!');
                                      setTimeout(() => setSaveToast(null), 3000);
                                    }
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {quoteSubTab === 'theme_terms' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* PDF Theme Dropdown */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          PDF Document Theme
                        </label>
                        <div className="relative">
                          <select
                            value={pdfTheme}
                            onChange={e => setPdfTheme(e.target.value)}
                            className="w-full appearance-none px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                          >
                            <option value="royal_gold"> Royal Gold & Obsidian</option>
                            <option value="minimal_dark"> Minimal Dark Studio</option>
                            <option value="airy_clean"> Airy Clean White</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Expiry Days */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          Quotation Validity (Days)
                        </label>
                        <input
                          type="number"
                          value={quoteExpiryDays}
                          onChange={e => setQuoteExpiryDays(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                        />
                      </div>

                      {/* Currency Dropdown */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          Default Currency
                        </label>
                        <div className="relative">
                          <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full appearance-none px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                          >
                            <option value="INR"> INR (Indian Rupee)</option>
                            <option value="USD">$ USD (US Dollar)</option>
                            <option value="AED">AED (UAE Dirham)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Terms */}
                    <div>
                      <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                        Default Quotation Terms & Conditions
                      </label>
                      <textarea
                        rows={3}
                        value={quoteTerms}
                        onChange={e => setQuoteTerms(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-medium text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>

                    {/* Contract Clauses */}
                    <div>
                      <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                        Standard Contract Clauses
                      </label>
                      <textarea
                        rows={4}
                        value={contractClauses}
                        onChange={e => setContractClauses(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>
                )}

                {/* EDITING MODALS */}
                {/* 1. Edit Deliverable Modal */}
                {editingDeliv && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Deliverable</h3>
                        <button type="button" onClick={() => setEditingDeliv(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Deliverable Title</label>
                          <input
                            type="text"
                            value={editDelivTitle}
                            onChange={e => setEditDelivTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editDelivCat}
                            onChange={e => setEditDelivCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Video">Video</option>
                            <option value="Photo">Photo</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Album">Album</option>
                            <option value="Data">Data</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingDeliv(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editDelivTitle.trim()) {
                              await updateWorkspaceQuotationDeliverable(editingDeliv.id, editDelivTitle, editDelivCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingDeliv(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white font-black shadow-[0_4px_14px_rgba(245,158,11,0.3)] active:translate-y-0.5 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Edit Special Addon Modal */}
                {editingSpecial && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Special Addon</h3>
                        <button type="button" onClick={() => setEditingSpecial(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Special Addon Title</label>
                          <input
                            type="text"
                            value={editSpecialTitle}
                            onChange={e => setEditSpecialTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editSpecialCat}
                            onChange={e => setEditSpecialCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Shoots">Shoots</option>
                            <option value="Album">Album</option>
                            <option value="Drone">Drone</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Data">Data</option>
                            <option value="Live Output">Live Output</option>
                            <option value="Complimentary">Complimentary</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingSpecial(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editSpecialTitle.trim()) {
                              await updateWorkspaceQuotationSpecialAddon(editingSpecial.id, editSpecialTitle, editSpecialCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingSpecial(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Edit Paid Addon Modal */}
                {editingPaid && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Paid Add-on Service</h3>
                        <button type="button" onClick={() => setEditingPaid(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Add-on Title</label>
                          <input
                            type="text"
                            value={editPaidTitle}
                            onChange={e => setEditPaidTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Price ()</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-emerald-700"></span>
                            <input
                              type="number"
                              value={editPaidPrice}
                              onChange={e => setEditPaidPrice(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editPaidCat}
                            onChange={e => setEditPaidCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Photography">Photography</option>
                            <option value="Cinematography">Cinematography</option>
                            <option value="Drone">Drone</option>
                            <option value="Live Tech">Live Tech</option>
                            <option value="Album">Album</option>
                            <option value="Post-Production">Post-Production</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Equipment">Equipment</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingPaid(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editPaidTitle.trim()) {
                              await updateWorkspaceQuotationPaidAddon(editingPaid.id, editPaidTitle, Number(editPaidPrice) || 0, editPaidCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingPaid(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Edit Default Function Modal */}
                {editingDefaultFunc && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-amber-200/90 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Default Function Template</h3>
                        <button type="button" onClick={() => setEditingDefaultFunc(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Function Name</label>
                          <input
                            type="text"
                            value={editDefaultFuncName}
                            onChange={e => setEditDefaultFuncName(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-bold text-zinc-700 block mb-1">Duration Slot</label>
                            <select
                              value={editDefaultFuncDuration}
                              onChange={e => setEditDefaultFuncDuration(e.target.value)}
                              className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                            >
                              {DEFAULT_DURATION_SLOTS.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 block mb-1">Default Venue / Location</label>
                            <input
                              type="text"
                              value={editDefaultFuncLocation}
                              onChange={e => setEditDefaultFuncLocation(e.target.value)}
                              className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                            />
                          </div>
                        </div>

                        {/* Crew allocations editor */}
                        <div className="space-y-2 pt-2 border-t border-amber-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-zinc-850 uppercase tracking-wider">Default Crew Requirements</label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditDefaultFuncReqs([
                                  ...editDefaultFuncReqs,
                                  { name: 'Candid Photography', qty: 1 }
                                ]);
                              }}
                              className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200"
                            >
                              + Add Crew Role
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {editDefaultFuncReqs.map((req, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-2 p-2 bg-[#FEFDF8] rounded-xl border border-amber-200/90">
                                <select
                                  value={req.name}
                                  onChange={e => {
                                    const updated = [...editDefaultFuncReqs];
                                    updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                                    setEditDefaultFuncReqs(updated);
                                  }}
                                  className="flex-1 px-2 py-1 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-850"
                                >
                                  {DEFAULT_CREW_ROLES.map(cr => (
                                    <option key={cr.id} value={cr.name}>{cr.name} ({cr.short_code})</option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-zinc-500">Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={req.qty}
                                    onChange={e => {
                                      const updated = [...editDefaultFuncReqs];
                                      updated[rIdx] = { ...updated[rIdx], qty: Math.max(1, Number(e.target.value) || 1) };
                                      setEditDefaultFuncReqs(updated);
                                    }}
                                    className="w-14 px-2 py-1 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 text-center"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDefaultFuncReqs(editDefaultFuncReqs.filter((_, i) => i !== rIdx));
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Coverage Notes</label>
                          <textarea
                            rows={2}
                            value={editDefaultFuncNotes}
                            onChange={e => setEditDefaultFuncNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium text-amber-950"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100">
                        <button
                          type="button"
                          onClick={() => setEditingDefaultFunc(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editDefaultFuncName.trim()) {
                              await updateWorkspaceQuotationDefaultFunction(editingDefaultFunc.id, {
                                name: editDefaultFuncName,
                                durationSlot: editDefaultFuncDuration,
                                location: editDefaultFuncLocation,
                                notes: editDefaultFuncNotes,
                                requirements: editDefaultFuncReqs
                              }, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingDefaultFunc(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. FINANCE & INVOICES SETTINGS */}
            {activeTab === 'finance' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Finance & Invoices Settings (`/workspace/finance`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Configure Invoice branding, GSTIN, Bank Transfer credentials, and Expense Categories</p>
                  </div>
                </div>

                {/* Studio & Brand Identity on Invoices */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-zinc-850 uppercase tracking-wider"> Studio Identity & Header on Invoices</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Company / Studio Name</label>
                      <input
                        type="text"
                        value={invoiceCompanyName}
                        onChange={e => setInvoiceCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={invoiceTagline}
                        onChange={e => setInvoiceTagline(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={invoiceGstin}
                        onChange={e => setInvoiceGstin(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={invoicePhone}
                        onChange={e => setInvoicePhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={invoiceEmail}
                        onChange={e => setInvoiceEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Studio Physical Address</label>
                    <input
                      type="text"
                      value={invoiceAddress}
                      onChange={e => setInvoiceAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/* Bank Transfer & UPI Details */}
                <div className="space-y-4 pt-4 border-t border-amber-100">
                  <h3 className="text-xs font-black text-zinc-850 uppercase tracking-wider"> Bank Account & UPI Payment Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={invoiceBankName}
                        onChange={e => setInvoiceBankName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={invoiceAccountHolder}
                        onChange={e => setInvoiceAccountHolder(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Account Number</label>
                      <input
                        type="text"
                        value={invoiceAccountNo}
                        onChange={e => setInvoiceAccountNo(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={invoiceIfsc}
                        onChange={e => setInvoiceIfsc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">UPI ID (e.g. name@bank)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  {/* QR Code Upload Section */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">Official Payment QR Code Image (Custom Upload)</label>
                    <div className="flex flex-wrap items-center gap-3 bg-[#FEFDF8] p-3 rounded-xl border border-amber-200/90">
                      {invoiceQrImageUrl ? (
                        <img src={invoiceQrImageUrl} alt="QR Code" className="w-12 h-12 object-contain rounded-lg border bg-white p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <QrCode className="w-6 h-6" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setInvoiceQrImageUrl(previewUrl);

                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const userId = session?.user?.id || 'default_user';
                              const ext = file.name.split('.').pop() || 'png';
                              const filePath = `qr_codes/${userId}/invoice_qr_${Date.now()}.${ext}`;

                              const { error: uploadError } = await supabase.storage
                                .from('workspace-assets')
                                .upload(filePath, file, { upsert: true });

                              if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage
                                  .from('workspace-assets')
                                  .getPublicUrl(filePath);
                                setInvoiceQrImageUrl(publicUrl);
                              }
                            } catch (uploadErr) {
                              console.warn('[Supabase Settings QR Upload Notice]:', uploadErr);
                            }
                          }
                        }}
                        className="text-xs text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0F9D58] file:text-white hover:file:bg-[#0B8043] cursor-pointer"
                      />
                      {invoiceQrImageUrl && (
                        <button
                          type="button"
                          onClick={() => setInvoiceQrImageUrl('')}
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Remove QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Number Prefix & Font Theme */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-amber-100">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice ID Prefix</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={e => setInvoicePrefix(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Default GST Rate (%)</label>
                    <input
                      type="number"
                      value={gstPercent}
                      onChange={e => setGstPercent(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice Color Palette (Quotation Themes)</label>
                    <select
                      value={invoiceThemePalette}
                      onChange={e => setInvoiceThemePalette(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto"> Auto-Sync with Default Quotation Theme</option>
                      <option value="cyprus-sand-dune">Cyprus & Sand Dune (#004643 / #F0EDE5)</option>
                      <option value="sand-dune-cyprus">Sand Dune & Cyprus (#F0EDE5 / #004643)</option>
                      <option value="cherry-red-cream">Cherry Red & Cream (#750505 / #FBFCEB)</option>
                      <option value="cream-cherry-red">Cream & Cherry Red (#FBFCEB / #750505)</option>
                      <option value="plum-milk">Plum & Milk (#381932 / #FFF3E6)</option>
                      <option value="milk-plum">Milk & Plum (#FFF3E6 / #381932)</option>
                      <option value="sand-chocolate">Sand & Chocolate (#3E000C / #FFECD1)</option>
                      <option value="chocolate-sand">Chocolate & Sand (#FFECD1 / #3E000C)</option>
                      <option value="feldgrau-wheat">Feldgrau & Wheat (#3A4B41 / #E6CFA7)</option>
                      <option value="wheat-feldgrau">Wheat & Feldgrau (#E6CFA7 / #3A4B41)</option>
                      <option value="noctis-marigold">Noctis & Marigold (#1F2235 / #E3A419)</option>
                      <option value="marigold-noctis">Marigold & Noctis (#E3A419 / #1F2235)</option>
                      <option value="champagne-obsidian">Champagne & Obsidian (#111111 / #F7F4EF)</option>
                      <option value="royal-gold">Royal Gold & Luxury Sand (#D4AF37 / #FAF7F2)</option>
                      <option value="minimal-charcoal">Minimal Charcoal & White (#262626 / #FFFFFF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice Typography / Font</label>
                    <select
                      value={invoiceFont}
                      onChange={e => setInvoiceFont(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto"> Auto-Sync with Default Quotation Font</option>
                      <option value="Cormorant Garamond">Cormorant Garamond (Quotation Luxury Serif)</option>
                      <option value="Cinzel">Cinzel (Royal Classical)</option>
                      <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean Sans)</option>
                      <option value="Montserrat">Montserrat (Geometric Sans)</option>
                      <option value="Inter">Inter (SaaS Minimal)</option>
                      <option value="Outfit">Outfit (Contemporary Clean)</option>
                      <option value="Prata">Prata (Romantic Editorial)</option>
                      <option value="Bodoni Moda">Bodoni Moda (High Fashion)</option>
                    </select>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-4 pt-4 border-t border-amber-100">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Standard Invoice Terms & Conditions</label>
                    <textarea
                      rows={2}
                      value={invoiceTerms}
                      onChange={e => setInvoiceTerms(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Footer Note / Disclaimer</label>
                    <input
                      type="text"
                      value={invoiceFooterNote}
                      onChange={e => setInvoiceFooterNote(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/*  FINANCE VAULT SECURITY & PIN PROTECTION */}
                <div className="pt-5 border-t border-amber-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                          Finance Vault Security & PIN Gate
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Protect financial figures, quotations revenue, and payouts behind a 6-digit PIN screen
                        </p>
                      </div>
                    </div>

                    {/* Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={financePinLocked}
                        onChange={e => setFinancePinLocked(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {financePinLocked && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            6-Digit Master PIN <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            maxLength={6}
                            value={financePinCode}
                            onChange={e => setFinancePinCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="123456"
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-center text-base font-black tracking-widest text-amber-950 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Auto-Lock Session Timeout
                          </label>
                          <select
                            value={financeTimeoutMins}
                            onChange={e => setFinanceTimeoutMins(Number(e.target.value))}
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 focus:outline-none"
                          >
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={60}>1 Hour (Standard)</option>
                            <option value={240}>4 Hours</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Admin Recovery Email
                          </label>
                          <input
                            type="email"
                            value={financeAdminEmail}
                            onChange={e => setFinanceAdminEmail(e.target.value)}
                            placeholder="admin@studio.com"
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-amber-950 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Master Admin Password
                          </label>
                          <input
                            type="password"
                            value={financeMasterPassword}
                            onChange={e => setFinanceMasterPassword(e.target.value)}
                            placeholder=""
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-amber-950 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Once enabled, anyone navigating to <code>/workspace/finance</code> must enter the PIN to unlock metrics.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expense Categories Google Sheets Option Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Expense Categories Options
                  </label>
                  {renderGoogleOptionList(expenseCategories, setExpenseCategories, 'expense', 'Add another item')}
                </div>
              </div>
            )}

            {/* 4. ATTENDANCE & GEOFENCE SETTINGS */}
            {activeTab === 'attendance' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Attendance & Geofence Settings (`/workspace/attendance`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Configure Geofence radius, Shift start time, and break limits</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Geofence Radius */}
                  <div>
                    <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                      Geofence Radius (Meters)
                    </label>
                    <input
                      type="number"
                      value={geofenceRadius}
                      onChange={e => setGeofenceRadius(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Shift Start */}
                  <div>
                    <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                      Default Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      value={graceMinutes}
                      onChange={e => setGraceMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Break Limit */}
                  <div>
                    <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                      Break Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={breakLimitMinutes}
                      onChange={e => setBreakLimitMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. META & INTEGRATIONS SETTINGS */}
            {activeTab === 'integrations' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Meta & Integrations Settings (`/workspace/integrations/meta`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Configure Meta auto-sync interval and default WhatsApp triggers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#FEFDF8] border border-amber-200/90 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">Real-Time Meta Lead Webhook Sync</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Automatically ingest Facebook Instant Leads into CRM instantly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMetaAutoSync(!metaAutoSync)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      metaAutoSync ? 'bg-[#0F9D58] text-white' : 'bg-slate-200 text-zinc-600'
                    }`}
                  >
                    {metaAutoSync ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            )}

            {/* 6. TEAM & OWNERS SETTINGS */}
            {activeTab === 'team' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Team & Access Control Settings (`/workspace/team`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Manage team members, roles, and access rules</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-[#FEFDF8] border border-amber-200/90 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0F9D58] flex items-center justify-center font-bold text-sm">
                        WS
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-950">Workspace User Account</h4>
                        <p className="text-xs text-zinc-500">Active Supabase Workspace ID: {workspaceId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#0F9D58] border border-emerald-200 text-xs font-bold">
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
