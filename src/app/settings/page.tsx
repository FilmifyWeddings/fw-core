'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, Plus, Trash2, Edit2,
  ChevronDown, Sparkles, Building2, Sliders, ToggleLeft, ToggleRight,
  Sheet, CheckCircle2, ShieldCheck, Database, Table, HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SettingsTab = 'leads' | 'quotations' | 'finance' | 'attendance' | 'integrations' | 'team';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('leads');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');

  // 1. General & Studio Settings
  const [studioName, setStudioName] = useState('Studio Core Workspace');
  const [studioEmail, setStudioEmail] = useState('');

  // 2. Leads Page Settings
  const [leadPrefix, setLeadPrefix] = useState('LD-2026-');
  const [leadDefaultOwner, setLeadDefaultOwner] = useState('Unassigned');
  const [leadOwners, setLeadOwners] = useState<string[]>(['Unassigned', 'Sahil Dhonde', 'Sushant Nawale', 'Production Team']);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [leadAutoAssignEnabled, setLeadAutoAssignEnabled] = useState(false);
  const [leadAssignStrategy, setLeadAssignStrategy] = useState('round_robin');
  const [budgetRanges, setBudgetRanges] = useState<string[]>(['₹50k - ₹1L', '₹1L - ₹2.5L', '₹2.5L - ₹5L', '₹5L+']);
  const [newBudgetRange, setNewBudgetRange] = useState('');

  // 3. Quotations Page Settings
  const [pdfTheme, setPdfTheme] = useState('royal_gold');
  const [quoteTerms, setQuoteTerms] = useState('Deliverables will be compiled and sent within 45 days of wedding event completion.');
  const [quoteExpiryDays, setQuoteExpiryDays] = useState(14);
  const [currency, setCurrency] = useState('INR');
  const [contractClauses, setContractClauses] = useState('1. Standard contract terms apply for all assignments.\n2. Final deliverables delivered post clearance.');

  // 4. Finance & Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');
  const [projectPrefix, setProjectPrefix] = useState('PRJ-2026-');
  const [gstPercent, setGstPercent] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('50% Retainer for booking lock, 50% on Event Date');
  const [upiId, setUpiId] = useState('studio@upi');
  const [bankDetails, setBankDetails] = useState('HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234');
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Marketing', 'Crew Travel', 'Equipment', 'Editor Pay', 'Misc']);
  const [newExpenseCat, setNewExpenseCat] = useState('');

  // 5. Attendance & Geofence Settings
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [shiftStart, setShiftStart] = useState('09:30');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [breakLimitMinutes, setBreakLimitMinutes] = useState(60);

  // 6. Meta & Integrations Settings
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

  // Sync settings to localStorage so every page reads fresh values immediately
  const syncToLocalStorage = (wId: string, settingsObj: any) => {
    try {
      localStorage.setItem(`settings_studio_${wId}`, settingsObj.studio_name || studioName);
      localStorage.setItem(`settings_owners_${wId}`, JSON.stringify(settingsObj.lead_owners || leadOwners));
      localStorage.setItem(`settings_currency_${wId}`, settingsObj.quotation_currency || currency);
      localStorage.setItem(`settings_gst_${wId}`, String(settingsObj.invoice_gst_percent ?? gstPercent));
      localStorage.setItem(`settings_upi_${wId}`, settingsObj.invoice_upi_id || upiId);
      localStorage.setItem(`settings_geofence_${wId}`, String(settingsObj.geofence_radius_meters || geofenceRadius));
    } catch (_) {}
  };

  // Auth & Load Settings from Supabase
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

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          setStudioName(s.studio_name || 'Studio Core Workspace');
          setStudioEmail(s.studio_email || session.user.email || '');

          // Leads
          setLeadPrefix(s.sequence_leads_prefix || 'LD-2026-');
          setLeadDefaultOwner(s.lead_default_owner || 'Unassigned');
          if (Array.isArray(s.lead_owners) && s.lead_owners.length > 0) setLeadOwners(s.lead_owners);
          setLeadAutoAssignEnabled(!!s.lead_auto_assign_enabled);
          setLeadAssignStrategy(s.lead_auto_assign_strategy || 'round_robin');
          if (Array.isArray(s.lead_budget_ranges)) setBudgetRanges(s.lead_budget_ranges);

          // Quotes
          setPdfTheme(s.quotation_pdf_theme || 'royal_gold');
          setQuoteTerms(s.quotation_pdf_terms || '');
          setQuoteExpiryDays(s.quotation_default_expiry_days || 14);
          setCurrency(s.quotation_currency || 'INR');
          setContractClauses(s.contract_clauses || '');

          // Finance
          setInvoicePrefix(s.sequence_invoices_prefix || 'INV-2026-');
          setProjectPrefix(s.sequence_projects_prefix || 'PRJ-2026-');
          setGstPercent(s.invoice_gst_percent ?? 18);
          setPaymentTerms(s.invoice_payment_terms || '');
          setUpiId(s.invoice_upi_id || '');
          setBankDetails(s.invoice_bank_details || '');
          if (Array.isArray(s.expense_categories)) setExpenseCategories(s.expense_categories);

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
        studio_name: studioName,
        sequence_leads_prefix: leadPrefix,
        lead_default_owner: leadDefaultOwner,
        lead_owners: leadOwners,
        lead_auto_assign_enabled: leadAutoAssignEnabled,
        lead_auto_assign_strategy: leadAssignStrategy,
        lead_budget_ranges: budgetRanges,

        quotation_pdf_theme: pdfTheme,
        quotation_pdf_terms: quoteTerms,
        quotation_default_expiry_days: quoteExpiryDays,
        quotation_currency: currency,
        contract_clauses: contractClauses,

        sequence_invoices_prefix: invoicePrefix,
        sequence_projects_prefix: projectPrefix,
        invoice_gst_percent: gstPercent,
        invoice_payment_terms: paymentTerms,
        invoice_upi_id: upiId,
        invoice_bank_details: bankDetails,
        expense_categories: expenseCategories,

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
        setSaveToast('Settings saved to Supabase & synchronized live across Studio Core! ✓');
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

  // Helper Array Modifiers
  const handleAddOwner = () => {
    if (!newOwnerName.trim()) return;
    if (!leadOwners.includes(newOwnerName.trim())) {
      setLeadOwners([...leadOwners, newOwnerName.trim()]);
    }
    setNewOwnerName('');
  };

  const handleRemoveOwner = (name: string) => {
    if (name === 'Unassigned') return;
    setLeadOwners(leadOwners.filter(o => o !== name));
  };

  const handleAddBudgetRange = () => {
    if (!newBudgetRange.trim()) return;
    if (!budgetRanges.includes(newBudgetRange.trim())) {
      setBudgetRanges([...budgetRanges, newBudgetRange.trim()]);
    }
    setNewBudgetRange('');
  };

  const handleRemoveBudgetRange = (range: string) => {
    setBudgetRanges(budgetRanges.filter(b => b !== range));
  };

  const handleAddExpenseCat = () => {
    if (!newExpenseCat.trim()) return;
    if (!expenseCategories.includes(newExpenseCat.trim())) {
      setExpenseCategories([...expenseCategories, newExpenseCat.trim()]);
    }
    setNewExpenseCat('');
  };

  const handleRemoveExpenseCat = (cat: string) => {
    setExpenseCategories(expenseCategories.filter(c => c !== cat));
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 p-4 sm:p-6 md:p-8 font-sans">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F9D58] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar - Google Sheets Light Aesthetic */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#0F9D58] uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Table className="w-3 h-3" /> GOOGLE SHEETS DYNAMIC SYNC
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
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

        {/* Studio General Overview Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Studio / Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition-all"
                placeholder="Enter Studio Name"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Primary Account Email (Supabase User ID)
            </label>
            <input
              type="text"
              readOnly
              value={studioEmail}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Page-Wise Settings Tabs Header - Google Sheets Filter Style */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
          {[
            { id: 'leads', label: '🎯 Leads & Pipeline', icon: Target },
            { id: 'quotations', label: '📄 Quotations & Proposals', icon: FileText },
            { id: 'finance', label: '💰 Finance & Invoices', icon: Coins },
            { id: 'attendance', label: '⏰ Attendance & Geofence', icon: Clock },
            { id: 'integrations', label: '🔌 Meta & Integrations', icon: Globe },
            { id: 'team', label: '👥 Team & Owners', icon: Users },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-[#0F9D58] text-white shadow-sm border border-[#0B8043]' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F9D58]" />
            <p className="text-sm font-semibold">Loading user settings from Supabase Database...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. LEADS PAGE SETTINGS */}
            {activeTab === 'leads' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Leads Page Settings (`/leads`)</h2>
                    <p className="text-xs font-medium text-slate-500">Manage Lead Owners, Auto-Assignment, and Lead ID Prefix</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Prefix */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Lead ID Sequence Prefix
                    </label>
                    <input
                      type="text"
                      value={leadPrefix}
                      onChange={e => setLeadPrefix(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Format: `LD-2026-001`</p>
                  </div>

                  {/* Auto Assign Toggle */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Lead Auto-Distribution Engine
                    </label>
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                      <span className="text-xs font-bold text-slate-800">Round-Robin Auto Assign</span>
                      <button
                        onClick={() => setLeadAutoAssignEnabled(!leadAutoAssignEnabled)}
                        className="transition-all cursor-pointer"
                      >
                        {leadAutoAssignEnabled ? (
                          <ToggleRight className="w-8 h-8 text-[#0F9D58]" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lead Owners Manager - Google Sheets Select Style */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                    Manage Lead Owners (Dropdown Options in Leads Page)
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add new Lead Owner Name..."
                      value={newOwnerName}
                      onChange={e => setNewOwnerName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                    <button
                      onClick={handleAddOwner}
                      className="px-4 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Owner
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {leadOwners.map(owner => (
                      <span
                        key={owner}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-xs"
                      >
                        <span>👤 {owner}</span>
                        {owner !== 'Unassigned' && (
                          <button
                            onClick={() => handleRemoveOwner(owner)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Budget Ranges */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                    Lead Budget Filter Options (Google Sheets Style Pills)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add budget range e.g. ₹5L - ₹10L..."
                      value={newBudgetRange}
                      onChange={e => setNewBudgetRange(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                    <button
                      onClick={handleAddBudgetRange}
                      className="px-4 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Range
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {budgetRanges.map(range => (
                      <span
                        key={range}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2"
                      >
                        <span>💰 {range}</span>
                        <button
                          onClick={() => handleRemoveBudgetRange(range)}
                          className="text-emerald-500 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. QUOTATIONS PAGE SETTINGS */}
            {activeTab === 'quotations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Quotations & Proposals Settings (`/workspace/quotations`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure PDF themes, default terms, expiry duration, and contract clauses</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* PDF Theme Google Sheet Dropdown */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      PDF Document Theme
                    </label>
                    <div className="relative">
                      <select
                        value={pdfTheme}
                        onChange={e => setPdfTheme(e.target.value)}
                        className="w-full appearance-none px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
                      >
                        <option value="royal_gold">👑 Royal Gold & Obsidian</option>
                        <option value="minimal_dark">🖤 Minimal Dark Studio</option>
                        <option value="airy_clean">✨ Airy Clean White</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Expiry Days */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Quotation Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={quoteExpiryDays}
                      onChange={e => setQuoteExpiryDays(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* Currency Google Sheet Dropdown */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Default Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full appearance-none px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
                      >
                        <option value="INR">₹ INR (Indian Rupee)</option>
                        <option value="USD">$ USD (US Dollar)</option>
                        <option value="AED">AED (UAE Dirham)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Default Quotation Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={quoteTerms}
                    onChange={e => setQuoteTerms(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                  />
                </div>

                {/* Contract Clauses */}
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Standard Contract Clauses
                  </label>
                  <textarea
                    rows={4}
                    value={contractClauses}
                    onChange={e => setContractClauses(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                  />
                </div>
              </div>
            )}

            {/* 3. FINANCE & INVOICES SETTINGS */}
            {activeTab === 'finance' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Finance & Invoices Settings (`/workspace/finance`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Invoice prefixes, GST %, Bank & UPI Details, and Expense Categories</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Invoice Prefix */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Invoice ID Prefix
                    </label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={e => setInvoicePrefix(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* GST % */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Default GST / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={gstPercent}
                      onChange={e => setGstPercent(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* UPI ID */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Studio UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Bank Account Transfer Details
                  </label>
                  <textarea
                    rows={2}
                    value={bankDetails}
                    onChange={e => setBankDetails(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                  />
                </div>

                {/* Expense Categories */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                    Expense Categories (Finance Page Dropdowns)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add expense category e.g. Drone Rental..."
                      value={newExpenseCat}
                      onChange={e => setNewExpenseCat(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                    <button
                      onClick={handleAddExpenseCat}
                      className="px-4 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Category
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {expenseCategories.map(cat => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2"
                      >
                        <span>🏷️ {cat}</span>
                        <button
                          onClick={() => handleRemoveExpenseCat(cat)}
                          className="text-amber-500 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. ATTENDANCE & GEOFENCE SETTINGS */}
            {activeTab === 'attendance' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Attendance & Geofence Settings (`/workspace/attendance`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Geofence radius, Shift start time, and break limits</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Geofence Radius */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Geofence Radius (Meters)
                    </label>
                    <input
                      type="number"
                      value={geofenceRadius}
                      onChange={e => setGeofenceRadius(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* Shift Start */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Default Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      value={graceMinutes}
                      onChange={e => setGraceMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>

                  {/* Break Limit */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Break Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={breakLimitMinutes}
                      onChange={e => setBreakLimitMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. META & INTEGRATIONS SETTINGS */}
            {activeTab === 'integrations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Meta & Integrations Settings (`/workspace/integrations/meta`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Meta auto-sync interval and default WhatsApp triggers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Real-Time Meta Lead Webhook Sync</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Automatically ingest Facebook Instant Leads into CRM instantly</p>
                  </div>
                  <button
                    onClick={() => setMetaAutoSync(!metaAutoSync)}
                    className="transition-all cursor-pointer"
                  >
                    {metaAutoSync ? (
                      <ToggleRight className="w-9 h-9 text-[#0F9D58]" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 6. TEAM & OWNERS SETTINGS */}
            {activeTab === 'team' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Team & Access Control Settings (`/workspace/team`)</h2>
                    <p className="text-xs font-medium text-slate-500">Manage team members, roles, and access rules</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0F9D58] flex items-center justify-center font-bold text-sm">
                        SD
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{studioName} (You)</h4>
                        <p className="text-xs text-slate-500">{studioEmail || 'Workspace Owner'}</p>
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
