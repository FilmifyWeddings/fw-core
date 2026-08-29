"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, Plus, Trash2, Phone, Mail, MessageSquare, Send,
  UserCheck, AlertCircle, ChevronDown, GripVertical, CheckCircle2, Table, ArrowUp, ArrowDown,
  QrCode, Sparkles, Upload, Image as ImageIcon, Building2, CreditCard, Lock, Unlock, ShieldCheck, Key,
  Pencil, X, PackageCheck, Gift, Layers, ListPlus, SlidersHorizontal, Edit2, Search, ArrowUpDown,
  MoveUp, MoveDown, HelpCircle, FileCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  WorkspaceEventType, 
  WorkspaceCrewRole, 
  WorkspaceQuotationDeliverable,
  WorkspaceQuotationSpecialAddon,
  WorkspaceQuotationPaidAddon,
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

interface DropdownItem {
  id: string;
  name: string;
  color: string;
}

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
  const [quotationSettings, setQuotationSettings] = useState<WorkspaceQuotationSettings>(DEFAULT_WORKSPACE_QUOTATION_SETTINGS);
  
  // Deliverables states
  const [newDelivTitle, setNewDelivTitle] = useState('');
  const [delivSearch, setDelivSearch] = useState('');
  const [editingDelivId, setEditingDelivId] = useState<string | null>(null);
  const [editDelivText, setEditDelivText] = useState('');

  // Special Addons states
  const [newSpecialTitle, setNewSpecialTitle] = useState('');
  const [specialSearch, setSpecialSearch] = useState('');
  const [editingSpecialId, setEditingSpecialId] = useState<string | null>(null);
  const [editSpecialText, setEditSpecialText] = useState('');

  // Paid Addons states
  const [newPaidTitle, setNewPaidTitle] = useState('');
  const [newPaidPrice, setNewPaidPrice] = useState('10000');
  const [paidSearch, setPaidSearch] = useState('');
  const [editingPaidId, setEditingPaidId] = useState<string | null>(null);
  const [editPaidText, setEditPaidText] = useState('');
  const [editPaidPriceVal, setEditPaidPriceVal] = useState(10000);

  // Payment Step Names states
  const [newStepName, setNewStepName] = useState('');
  const [stepSearch, setStepSearch] = useState('');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepText, setEditStepText] = useState('');

  // Terms & Conditions states
  const [termsText, setTermsText] = useState('');
  const [clausesText, setClausesText] = useState('');

  // 1. Leads Page Settings
  const [leadSources, setLeadSources] = useState<DropdownItem[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceColor, setNewSourceColor] = useState(GOOGLE_PRESET_COLORS[0]);
  const [leadEventTypes, setLeadEventTypes] = useState<DropdownItem[]>([]);
  const [leadStages, setLeadStages] = useState<DropdownItem[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(GOOGLE_PRESET_COLORS[0]);

  // 4. Finance Page Settings
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'UPI / GPay', 'Bank Transfer (IMPS/NEFT)', 'Credit / Debit Card', 'Cheque']);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [gstRate, setGstRate] = useState(18);
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [quotationPrefix, setQuotationPrefix] = useState('QTN-');

  // 5. Attendance Page Settings
  const [officeLat, setOfficeLat] = useState('19.0760');
  const [officeLng, setOfficeLng] = useState('72.8777');
  const [geofenceRadius, setGeofenceRadius] = useState(250);
  const [officeAddress, setOfficeAddress] = useState('Studio Core HQ, Mumbai');
  const [gracePeriodMins, setGracePeriodMins] = useState(15);
  const [fullDayHours, setFullDayHours] = useState(8);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [enableFaceMatch, setEnableFaceMatch] = useState(true);

  // 6. Integrations Page Settings
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [metaAdsConnected, setMetaAdsConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // 7. Team Page Settings
  const [studioName, setStudioName] = useState('Studio Core');
  const [supportEmail, setSupportEmail] = useState('support@studiocore.in');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [websiteUrl, setWebsiteUrl] = useState('https://studiocore.in');

  // Show Toast Helper
  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Load Workspace Settings
  const loadWorkspaceSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) {
        router.push('/login');
        return;
      }
      setWorkspaceId(currentUserId);

      // Load Quotation Settings
      const qSettings = await fetchWorkspaceQuotationSettings(currentUserId);
      setQuotationSettings(qSettings);
      setTermsText(qSettings.quoteTerms || '');
      setClausesText(qSettings.contractClauses || '');

      // Load Functions & Crew Roles
      const [fetchedEvTypes, fetchedRoles] = await Promise.all([
        fetchWorkspaceEventTypes(currentUserId),
        fetchWorkspaceCrewRoles(currentUserId)
      ]);
      setEventTypes(fetchedEvTypes);
      setCrewRoles(fetchedRoles);

      // Fallback for Leads Dropdowns
      setLeadSources([
        { id: '1', name: 'Instagram', color: '#ec4899' },
        { id: '2', name: 'Facebook Ads', color: '#3b82f6' },
        { id: '3', name: 'WhatsApp', color: '#10b981' },
        { id: '4', name: 'Referral', color: '#f59e0b' },
        { id: '5', name: 'Website', color: '#8b5cf6' },
      ]);
      setLeadStages([
        { id: '1', name: 'New Lead', color: '#3b82f6' },
        { id: '2', name: 'Call Scheduled', color: '#f59e0b' },
        { id: '3', name: 'Quotation Sent', color: '#8b5cf6' },
        { id: '4', name: 'Negotiation', color: '#ec4899' },
        { id: '5', name: 'Converted / Booked', color: '#10b981' },
        { id: '6', name: 'Lost / Closed', color: '#f43f5e' },
      ]);
    } catch (err) {
      console.error('[Settings Page Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWorkspaceSettings();

    const handleSync = () => {
      loadWorkspaceSettings();
    };

    window.addEventListener('workspace_quotation_settings_updated', handleSync);
    window.addEventListener('workspace_event_types_updated', handleSync);
    window.addEventListener('workspace_crew_roles_updated', handleSync);

    return () => {
      window.removeEventListener('workspace_quotation_settings_updated', handleSync);
      window.removeEventListener('workspace_event_types_updated', handleSync);
      window.removeEventListener('workspace_crew_roles_updated', handleSync);
    };
  }, [loadWorkspaceSettings]);

  // Handle Save Master Settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await saveAllWorkspaceQuotationSettings(workspaceId, {
        ...quotationSettings,
        quoteTerms: termsText,
        contractClauses: clausesText,
      });
      triggerToast('All Workspace Settings successfully updated!');
    } catch (err) {
      console.error('[Save Settings Error]:', err);
      triggerToast('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reorder Handlers for Deliverables
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

  // Reorder Handlers for Special Addons
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

  // Reorder Handlers for Paid Addons
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

  // Reorder Handlers for Payment Steps
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center animate-pulse">
          <SettingsIcon className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
        <p className="text-xs font-bold text-amber-950 mt-3 tracking-wider uppercase">Loading Workspace Settings...</p>
      </div>
    );
  }

  const TABS_CONFIG: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: 'leads', label: 'Leads & Stages', icon: Target },
    { id: 'functions', label: 'Event Functions', icon: FileText },
    { id: 'crew_roles', label: 'Crew Roles & Codes', icon: Users },
    { id: 'quotations', label: 'Quotation & Proposals', icon: Sparkles },
    { id: 'finance', label: 'Finance & Tax', icon: Coins },
    { id: 'attendance', label: 'Attendance & Geofence', icon: Clock },
    { id: 'integrations', label: 'Integrations & API', icon: Globe },
    { id: 'team', label: 'Studio Profile', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 flex flex-col selection:bg-amber-200">
      
      {/* ── TOP NAVIGATION BAR (WARM CREAM & AMBER LUXURY) ── */}
      <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-amber-200/80 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 shadow-2xs transition cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-amber-950 tracking-tight">Workspace Master Settings</h1>
              </div>
              <p className="text-[11px] text-amber-800/80 font-medium">Configure global master catalogs, quotation deliverables, and synchronization.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── SAVE TOAST NOTIFICATION ── */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-amber-900 text-white rounded-2xl shadow-xl border border-amber-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold">{saveToast}</span>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT TABS SIDEBAR (RESPONSIVE HORIZONTAL SCROLL ON MOBILE) ── */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-2 sm:p-3 sticky top-20">
            <p className="text-[10px] font-black text-amber-900/60 uppercase tracking-widest px-3 py-2">Settings Suite</p>
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {TABS_CONFIG.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2.5 shrink-0 lg:w-full text-left cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 font-black'
                        : 'text-zinc-700 hover:text-amber-950 hover:bg-amber-50/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── RIGHT MAIN VIEWPORT ── */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* ========================================================================= */}
          {/* TAB 4: QUOTATION & PROPOSALS SETTINGS (5 COMPREHENSIVE STACKED CARDS)      */}
          {/* ========================================================================= */}
          {activeTab === 'quotations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* HEADER BANNER */}
              <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Quotation & Proposal Master Engine</span>
                  </h2>
                  <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                    Manage deliverables, special add-ons, extra upgrades, payment schedule steps, and terms & conditions with live two-way sync.
                  </p>
                </div>
                <span className="px-3 py-1 bg-white border border-amber-300 text-amber-950 text-[11px] font-black rounded-full shadow-2xs shrink-0">
                  ⚡ 2-Way Live Synced
                </span>
              </div>

              {/* CARD 1: 📦 DELIVERABLES */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-amber-600" />
                      <span>Deliverables Catalog</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      All deliverables available in the Quotation Builder dropdown menu. Reorder with ↑ / ↓ buttons.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg shrink-0">
                    {quotationSettings.deliverables.length} Items
                  </span>
                </div>

                {/* Quick Add Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <input
                    type="text"
                    placeholder="Enter Deliverable name (e.g. 1 Teaser Video 1-2 Min, 75 High-Res Edited Photos)..."
                    value={newDelivTitle}
                    onChange={e => setNewDelivTitle(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newDelivTitle.trim()) {
                        await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, 'General');
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewDelivTitle('');
                        triggerToast('Deliverable added!');
                      }
                    }}
                    className="flex-1 w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newDelivTitle.trim()) {
                        await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, 'General');
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewDelivTitle('');
                        triggerToast('Deliverable added!');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Deliverable</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search deliverables..."
                    value={delivSearch}
                    onChange={e => setDelivSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Clean List Items View with Drag / Reorder Buttons */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {quotationSettings.deliverables
                    .filter(d => d.title.toLowerCase().includes(delivSearch.toLowerCase()))
                    .map((deliv, idx) => {
                      const isEditing = editingDelivId === deliv.id;
                      return (
                        <div
                          key={deliv.id || idx}
                          className="p-2.5 bg-[#FAF9F5] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Reorder Buttons (Up & Down) */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveDeliverable(idx, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDeliverable(idx, 'down')}
                                disabled={idx === quotationSettings.deliverables.length - 1}
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
                                value={editDelivText}
                                onChange={e => setEditDelivText(e.target.value)}
                                autoFocus
                                className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                              />
                            ) : (
                              <p className="text-xs font-bold text-zinc-900 truncate flex-1">{deliv.title}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (editDelivText.trim()) {
                                    await updateWorkspaceQuotationDeliverable(deliv.id, editDelivText, 'General', workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                    setEditingDelivId(null);
                                    triggerToast('Deliverable updated!');
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
                                  setEditingDelivId(deliv.id);
                                  setEditDelivText(deliv.title);
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
                                if (confirm(`Delete deliverable "${deliv.title}"?`)) {
                                  await deleteWorkspaceQuotationDeliverable(deliv.id, workspaceId);
                                  const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                  setQuotationSettings(updated);
                                  triggerToast('Deliverable removed!');
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

              {/* CARD 2: 🎁 SPECIAL ADD-ONS (COMPLIMENTARY) */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>Special Add-Ons (Complimentary Value Additions)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Complimentary items included in quotations at zero extra cost. Reorder with ↑ / ↓ buttons.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg shrink-0">
                    {quotationSettings.specialAddons.length} Items
                  </span>
                </div>

                {/* Quick Add Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <input
                    type="text"
                    placeholder="Enter Special Add-On title (e.g. Complimentary Pre-Wedding Session, Free Drone Included)..."
                    value={newSpecialTitle}
                    onChange={e => setNewSpecialTitle(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newSpecialTitle.trim()) {
                        await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, 'Complimentary');
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewSpecialTitle('');
                        triggerToast('Special Add-On added!');
                      }
                    }}
                    className="flex-1 w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newSpecialTitle.trim()) {
                        await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, 'Complimentary');
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewSpecialTitle('');
                        triggerToast('Special Add-On added!');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Special Add-On</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search special add-ons..."
                    value={specialSearch}
                    onChange={e => setSpecialSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Clean List Items View with Drag / Reorder Buttons */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {quotationSettings.specialAddons
                    .filter(s => s.title.toLowerCase().includes(specialSearch.toLowerCase()))
                    .map((addon, idx) => {
                      const isEditing = editingSpecialId === addon.id;
                      return (
                        <div
                          key={addon.id || idx}
                          className="p-2.5 bg-[#FAF9F5] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveSpecialAddon(idx, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSpecialAddon(idx, 'down')}
                                disabled={idx === quotationSettings.specialAddons.length - 1}
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
                                value={editSpecialText}
                                onChange={e => setEditSpecialText(e.target.value)}
                                autoFocus
                                className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                              />
                            ) : (
                              <p className="text-xs font-bold text-zinc-900 truncate flex-1">{addon.title}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (editSpecialText.trim()) {
                                    await updateWorkspaceQuotationSpecialAddon(addon.id, editSpecialText, 'Complimentary', workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                    setEditingSpecialId(null);
                                    triggerToast('Special Add-On updated!');
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
                                  setEditingSpecialId(addon.id);
                                  setEditSpecialText(addon.title);
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
                                if (confirm(`Delete special add-on "${addon.title}"?`)) {
                                  await deleteWorkspaceQuotationSpecialAddon(addon.id, workspaceId);
                                  const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                  setQuotationSettings(updated);
                                  triggerToast('Special Add-On removed!');
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

              {/* CARD 3: 💎 EXTRA PAID ADD-ONS & UPGRADES */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Extra Paid Add-Ons & Upgrades</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Optional paid upgrades with price in ₹ that clients can add to their quotation.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg shrink-0">
                    {quotationSettings.paidAddons.length} Items
                  </span>
                </div>

                {/* Quick Add Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <input
                    type="text"
                    placeholder="Enter Paid Add-On title (e.g. Additional Candid Photographer, Drone Pilot)..."
                    value={newPaidTitle}
                    onChange={e => setNewPaidTitle(e.target.value)}
                    className="flex-1 w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <div className="relative flex items-center w-full sm:w-32">
                    <span className="absolute left-2.5 text-xs font-bold text-amber-700">₹</span>
                    <input
                      type="number"
                      placeholder="10000"
                      value={newPaidPrice}
                      onChange={e => setNewPaidPrice(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (newPaidTitle.trim()) {
                        await saveWorkspaceQuotationPaidAddon(workspaceId, newPaidTitle, Number(newPaidPrice) || 10000, 'Extra Service');
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewPaidTitle('');
                        setNewPaidPrice('10000');
                        triggerToast('Paid Add-On added!');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Paid Add-On</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search paid add-ons..."
                    value={paidSearch}
                    onChange={e => setPaidSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Clean List Items View with Drag / Reorder Buttons */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {quotationSettings.paidAddons
                    .filter(p => p.title.toLowerCase().includes(paidSearch.toLowerCase()))
                    .map((paid, idx) => {
                      const isEditing = editingPaidId === paid.id;
                      return (
                        <div
                          key={paid.id || idx}
                          className="p-2.5 bg-[#FAF9F5] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => movePaidAddon(idx, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => movePaidAddon(idx, 'down')}
                                disabled={idx === quotationSettings.paidAddons.length - 1}
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
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editPaidText}
                                  onChange={e => setEditPaidText(e.target.value)}
                                  autoFocus
                                  className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                                />
                                <div className="relative flex items-center w-24">
                                  <span className="absolute left-2 text-[11px] font-bold text-amber-700">₹</span>
                                  <input
                                    type="number"
                                    value={editPaidPriceVal}
                                    onChange={e => setEditPaidPriceVal(Number(e.target.value) || 0)}
                                    className="w-full pl-5 pr-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">{paid.title}</p>
                                <span className="text-xs font-black text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md shrink-0">
                                  ₹{Number(paid.price || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (editPaidText.trim()) {
                                    await updateWorkspaceQuotationPaidAddon(paid.id, editPaidText, editPaidPriceVal, 'Extra Service', workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                    setEditingPaidId(null);
                                    triggerToast('Paid Add-On updated!');
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
                                  setEditingPaidId(paid.id);
                                  setEditPaidText(paid.title);
                                  setEditPaidPriceVal(Number(paid.price) || 0);
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
                                if (confirm(`Delete paid add-on "${paid.title}"?`)) {
                                  await deleteWorkspaceQuotationPaidAddon(paid.id, workspaceId);
                                  const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                  setQuotationSettings(updated);
                                  triggerToast('Paid Add-On removed!');
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

              {/* CARD 4: 💳 PAYMENT TERMS & SCHEDULE (STEP NAMES) */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Payment Terms & Schedule (Step Names)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Manage default installment step names. These options populate the Step Name dropdown in Quotation Builder.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg shrink-0">
                    {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS).length} Step Presets
                  </span>
                </div>

                {/* Quick Add Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <input
                    type="text"
                    placeholder="Enter new Step Name (e.g. Token Amount, Advance Amount, On Wedding Day, After Event, Final Delivery)..."
                    value={newStepName}
                    onChange={e => setNewStepName(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newStepName.trim()) {
                        await saveWorkspacePaymentStepName(workspaceId, newStepName);
                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                        setQuotationSettings(updated);
                        setNewStepName('');
                        triggerToast('Step Name added!');
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
                        triggerToast('Step Name added!');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Clean List Items View with Drag / Reorder Buttons */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS)
                    .filter(step => step.toLowerCase().includes(stepSearch.toLowerCase()))
                    .map((step, idx) => {
                      const isEditing = editingStepIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-[#FAF9F5] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Reorder Buttons */}
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
                                    triggerToast('Step Name updated!');
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
                                  triggerToast('Step Name removed!');
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

              {/* CARD 5: 📜 TERMS AND CONDITIONS */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-amber-600" />
                      <span>Terms and Conditions</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Default terms and contract clauses that synchronize with the Quotation Terms & Conditions page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveAllWorkspaceQuotationSettings(workspaceId, {
                        ...quotationSettings,
                        quoteTerms: termsText,
                        contractClauses: clausesText
                      });
                      triggerToast('Terms & Conditions synced with Quotation Builder!');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Sync Terms</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">
                      Standard Terms & Handover Note
                    </label>
                    <textarea
                      rows={6}
                      value={termsText}
                      onChange={e => setTermsText(e.target.value)}
                      placeholder="e.g. Deliverables will be compiled and sent within 45 days of wedding event completion..."
                      className="w-full p-3 bg-[#FAF9F5] border border-amber-200/80 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">
                      Contract Clauses & Policies
                    </label>
                    <textarea
                      rows={6}
                      value={clausesText}
                      onChange={e => setClausesText(e.target.value)}
                      placeholder="1. Standard contract terms apply for all assignments.&#10;2. Final deliverables delivered post clearance.&#10;3. Studio retains copyright for portfolio presentation."
                      className="w-full p-3 bg-[#FAF9F5] border border-amber-200/80 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: LEADS & STAGES SETTINGS                                            */}
          {/* ========================================================================= */}
          {activeTab === 'leads' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>Leads & Pipeline Configuration</span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Customize lead sources, intake channels, and pipeline deal stages.</p>
              </div>

              {/* Lead Sources */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">Lead Acquisition Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {leadSources.map(source => (
                    <span
                      key={source.id}
                      className="px-3 py-1.5 rounded-xl border border-amber-200 bg-[#FAF9F5] text-xs font-bold text-zinc-900 flex items-center gap-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                      <span>{source.name}</span>
                      <button
                        type="button"
                        onClick={() => setLeadSources(leadSources.filter(s => s.id !== source.id))}
                        className="text-zinc-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="New source name..."
                    value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSourceName.trim()) {
                        setLeadSources([...leadSources, { id: String(Date.now()), name: newSourceName.trim(), color: newSourceColor }]);
                        setNewSourceName('');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Lead Stages */}
              <div className="space-y-3 pt-4 border-t border-amber-100">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">Pipeline Stages</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {leadStages.map((stage, idx) => (
                    <div key={stage.id} className="p-2.5 bg-[#FAF9F5] border border-amber-200/70 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs font-bold text-zinc-900">{stage.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">Stage #{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EVENT FUNCTIONS SETTINGS                                           */}
          {/* ========================================================================= */}
          {activeTab === 'functions' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Event Functions Master Catalog</span>
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Master wedding events (Haldi, Mehendi, Sangeet, Wedding, etc.)</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg">
                  {eventTypes.length} Functions
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Function name (e.g. Haldi, Sangeet, Pool Party)..."
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newEventName.trim()) {
                      await saveWorkspaceEventType(workspaceId, newEventName, 'Wedding');
                      const updated = await fetchWorkspaceEventTypes(workspaceId);
                      setEventTypes(updated);
                      setNewEventName('');
                      triggerToast('Function created!');
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  + Add Function
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {eventTypes.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-3 bg-[#FAF9F5] border border-amber-200/80 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-900">{ev.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Delete function "${ev.name}"?`)) {
                          await deleteWorkspaceEventType(ev.id, workspaceId);
                          const updated = await fetchWorkspaceEventTypes(workspaceId);
                          setEventTypes(updated);
                          triggerToast('Function deleted!');
                        }
                      }}
                      className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CREW ROLES & SHORT CODES SETTINGS                                  */}
          {/* ========================================================================= */}
          {activeTab === 'crew_roles' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Crew Roles & Short Codes</span>
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Crew roles with short badges for team assignment and operations.</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg">
                  {crewRoles.length} Roles
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Role Name (e.g. Lead Drone Operator)..."
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Code (e.g. LDO)"
                  value={newRoleCode}
                  onChange={e => setNewRoleCode(e.target.value.toUpperCase())}
                  className="w-24 px-3 py-2 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newRoleName.trim()) {
                      await saveWorkspaceCrewRole(workspaceId, newRoleName, newRoleCode || getRoleShortCode(newRoleName));
                      const updated = await fetchWorkspaceCrewRoles(workspaceId);
                      setCrewRoles(updated);
                      setNewRoleName('');
                      setNewRoleCode('');
                      triggerToast('Crew Role added!');
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  + Add Role
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {crewRoles.map((role, idx) => (
                  <div key={role.id || idx} className="p-3 bg-[#FAF9F5] border border-amber-200/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded-md border border-amber-300">
                        {role.short_code}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">{role.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Delete crew role "${role.name}"?`)) {
                          await deleteWorkspaceCrewRole(role.id, workspaceId);
                          const updated = await fetchWorkspaceCrewRoles(workspaceId);
                          setCrewRoles(updated);
                          triggerToast('Crew role deleted!');
                        }
                      }}
                      className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: FINANCE & TAX SETTINGS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'finance' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>Finance & Invoicing Preferences</span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage currency, GST rates, invoice numbering, and accepted payment modes.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Default GST Rate (%)</label>
                  <input
                    type="number"
                    value={gstRate}
                    onChange={e => setGstRate(Number(e.target.value) || 0)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: ATTENDANCE & GEOFENCE SETTINGS                                      */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Attendance & Geofencing Policies</span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Configure studio GPS coordinates, radius, shift timings, and biometric controls.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Office Address</label>
                  <input
                    type="text"
                    value={officeAddress}
                    onChange={e => setOfficeAddress(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    value={geofenceRadius}
                    onChange={e => setGeofenceRadius(Number(e.target.value) || 250)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: INTEGRATIONS & API SETTINGS                                        */}
          {/* ========================================================================= */}
          {activeTab === 'integrations' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-600" />
                  <span>Integrations & Cloud Connections</span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Connect WhatsApp API, Meta Lead Ads, and Cloud Storage pipelines.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-amber-200 bg-[#FAF9F5] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">WA</div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-900">WhatsApp Automation</h4>
                      <p className="text-[10px] text-zinc-500">Baileys Multi-Device Worker</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">Connected</span>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-[#FAF9F5] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">Meta</div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-900">Meta Lead Ads</h4>
                      <p className="text-[10px] text-zinc-500">Webhook & CRM Sync</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full">Connected</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: STUDIO PROFILE SETTINGS                                            */}
          {/* ========================================================================= */}
          {activeTab === 'team' && (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Studio Business Profile</span>
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Your branding details that appear on client proposals and galleries.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Studio Brand Name</label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={e => setStudioName(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Support Phone Number</label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={e => setSupportPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F5] border border-amber-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
