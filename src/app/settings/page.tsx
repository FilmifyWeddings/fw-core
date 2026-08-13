'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, ShieldCheck, Plus, Trash2, Edit2,
  ChevronRight, Sparkles, AlertCircle, Building2, Sliders, ToggleLeft, ToggleRight
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

  // Auth & Load Settings
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

      const res = await fetch(`/api/settings?workspace_id=${wId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          setStudioName(s.studio_name || 'Studio Core Workspace');
          setStudioEmail(s.studio_email || '');

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
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWorkspaceSettings();
  }, [loadWorkspaceSettings]);

  // Save Settings Handler
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        settings: {
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
        },
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveToast('Settings saved & applied live across Studio Core! ✓');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert('Save Failed: ' + (errJson.error || 'Unknown error'));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  STUDIO CORE HUB
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2">
                Workspace & Page-Wise Settings
              </h1>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Studio / Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                placeholder="Enter Studio Name"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Primary Account Email
            </label>
            <input
              type="text"
              readOnly
              value={studioEmail}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800/60 rounded-xl text-sm text-slate-400 focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Page-Wise Settings Tabs Header */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {[
            { id: 'leads', label: 'Leads & Pipeline', icon: Target },
            { id: 'quotations', label: 'Quotations & Proposals', icon: FileText },
            { id: 'finance', label: 'Finance & Invoices', icon: Coins },
            { id: 'attendance', label: 'Attendance & Geofence', icon: Clock },
            { id: 'integrations', label: 'Meta & Integrations', icon: Globe },
            { id: 'team', label: 'Team & Owners', icon: Users },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-sm font-medium">Loading workspace configuration settings...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. LEADS PAGE SETTINGS */}
            {activeTab === 'leads' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <Target className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Leads Page Settings (`/leads`)</h2>
                    <p className="text-xs text-slate-400">Configure Lead Owners, Auto-Assignment, and Lead Prefix</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Prefix */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Lead ID Sequence Prefix
                    </label>
                    <input
                      type="text"
                      value={leadPrefix}
                      onChange={e => setLeadPrefix(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Example: `LD-2026-001`</p>
                  </div>

                  {/* Auto Assign Toggle */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Lead Auto-Distribution Engine
                    </label>
                    <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-xs font-semibold text-slate-300">Round-Robin Auto Assign</span>
                      <button
                        onClick={() => setLeadAutoAssignEnabled(!leadAutoAssignEnabled)}
                        className="transition-all"
                      >
                        {leadAutoAssignEnabled ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lead Owners Manager */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Manage Lead Owners (Assigned Teammates)
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add new Lead Owner Name..."
                      value={newOwnerName}
                      onChange={e => setNewOwnerName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddOwner}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {leadOwners.map(owner => (
                      <span
                        key={owner}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2"
                      >
                        <span>{owner}</span>
                        {owner !== 'Unassigned' && (
                          <button
                            onClick={() => handleRemoveOwner(owner)}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Budget Ranges */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Lead Budget Filter Options
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add budget range e.g. ₹5L - ₹10L..."
                      value={newBudgetRange}
                      onChange={e => setNewBudgetRange(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddBudgetRange}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {budgetRanges.map(range => (
                      <span
                        key={range}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2"
                      >
                        <span>{range}</span>
                        <button
                          onClick={() => handleRemoveBudgetRange(range)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. QUOTATIONS PAGE SETTINGS */}
            {activeTab === 'quotations' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Quotations & Proposals Settings (`/workspace/quotations`)</h2>
                    <p className="text-xs text-slate-400">Configure PDF themes, default terms, expiry duration, and contract clauses</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* PDF Theme */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      PDF Document Theme
                    </label>
                    <select
                      value={pdfTheme}
                      onChange={e => setPdfTheme(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="royal_gold">👑 Royal Gold & Obsidian</option>
                      <option value="minimal_dark">🖤 Minimal Dark Studio</option>
                      <option value="airy_clean">✨ Airy Clean White</option>
                    </select>
                  </div>

                  {/* Expiry Days */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Quotation Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={quoteExpiryDays}
                      onChange={e => setQuoteExpiryDays(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="INR">₹ INR (Indian Rupee)</option>
                      <option value="USD">$ USD (US Dollar)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                    </select>
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Default Quotation Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={quoteTerms}
                    onChange={e => setQuoteTerms(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Contract Clauses */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Standard Contract Clauses
                  </label>
                  <textarea
                    rows={4}
                    value={contractClauses}
                    onChange={e => setContractClauses(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. FINANCE & INVOICES SETTINGS */}
            {activeTab === 'finance' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <Coins className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Finance & Invoices Settings (`/workspace/finance`)</h2>
                    <p className="text-xs text-slate-400">Configure Invoice prefixes, GST %, Bank & UPI Details, and Expense Categories</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Invoice Prefix */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Invoice ID Prefix
                    </label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={e => setInvoicePrefix(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* GST % */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Default GST / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={gstPercent}
                      onChange={e => setGstPercent(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* UPI ID */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Studio UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Bank Account Transfer Details
                  </label>
                  <textarea
                    rows={2}
                    value={bankDetails}
                    onChange={e => setBankDetails(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Expense Categories */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Expense Categories
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add expense category e.g. Drone Rental..."
                      value={newExpenseCat}
                      onChange={e => setNewExpenseCat(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddExpenseCat}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {expenseCategories.map(cat => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2"
                      >
                        <span>{cat}</span>
                        <button
                          onClick={() => handleRemoveExpenseCat(cat)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. ATTENDANCE & GEOFENCE SETTINGS */}
            {activeTab === 'attendance' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <Clock className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Attendance & Geofence Settings (`/workspace/attendance`)</h2>
                    <p className="text-xs text-slate-400">Configure Geofence radius, Shift start time, and break limits</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Geofence Radius */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Geofence Radius (Meters)
                    </label>
                    <input
                      type="number"
                      value={geofenceRadius}
                      onChange={e => setGeofenceRadius(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Shift Start */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Default Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      value={graceMinutes}
                      onChange={e => setGraceMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Break Limit */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Break Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={breakLimitMinutes}
                      onChange={e => setBreakLimitMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. META & INTEGRATIONS SETTINGS */}
            {activeTab === 'integrations' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <Globe className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Meta & Integrations Settings (`/workspace/integrations/meta`)</h2>
                    <p className="text-xs text-slate-400">Configure Meta auto-sync interval and default WhatsApp triggers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Real-Time Meta Lead Webhook Sync</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Automatically ingest Facebook Instant Leads into CRM instantly</p>
                  </div>
                  <button
                    onClick={() => setMetaAutoSync(!metaAutoSync)}
                    className="transition-all"
                  >
                    {metaAutoSync ? (
                      <ToggleRight className="w-9 h-9 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 6. TEAM & OWNERS SETTINGS */}
            {activeTab === 'team' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Team & Access Control Settings (`/workspace/team`)</h2>
                    <p className="text-xs text-slate-400">Manage team members, roles, and access rules</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        SD
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{studioName} (You)</h4>
                        <p className="text-xs text-slate-400">{studioEmail || 'Workspace Owner'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
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
