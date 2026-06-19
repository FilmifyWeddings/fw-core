'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Plus, Trash2, ArrowUp, ArrowDown, Settings, 
  Layers, Palette, Tag, Briefcase, FileSpreadsheet, AlertCircle, 
  Database, RefreshCw, BarChart2, FileText, Calendar, Lock,
  Coins, FileCheck, ClipboardList, ShieldAlert, ArrowRight, User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MasterSettingsHubProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onStagesUpdated?: () => void;
}

interface Service {
  id: string;
  name: string;
  base_price: number;
  description: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  services_included: string[];
  description: string;
}

interface Expense {
  id: string;
  client_id: string | null;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

interface Sequence {
  id: string;
  name: string;
  is_active: boolean;
}

interface CRMStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

// 7 Preset Colors for workflow stages
const WORKFLOW_COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1'  // Indigo
];

const DEFAULT_STUDIO_SETTINGS = {
  sequence_leads_prefix: 'LD-2026-',
  sequence_invoices_prefix: 'INV-2026-',
  sequence_projects_prefix: 'PRJ-2026-',
  lead_default_owner: 'Chad Thunderclock',
  lead_budget_ranges: ['₹50k - ₹1L', '₹1L - ₹2.5L', '₹2.5L - ₹5L', '₹5L+'],
  project_categories: ['Pre-Wedding', 'Haldi', 'Sangeet', 'Wedding', 'Reception', 'Engagement'],
  order_status_tags: ['Pending', 'Processing', 'Delivered'],
  invoice_gst_percent: 18,
  invoice_payment_terms: '50% Retainer for booking lock, 50% on Event Date',
  expense_categories: ['Marketing', 'Crew Travel', 'Equipment', 'Editor Pay', 'Misc'],
  cancellation_policy: 'Retainer fee is strictly non-refundable if cancelled within 30 days of the shoot schedule.',
  cancellation_reasons: ['Date Postponed', 'Budget Constraints', 'Personal Reasons', 'Vendor Conflict'],
  deliverables: [
    { id: 'raw_photos', label: 'Raw Photos & JPEGs', qty: 1000 },
    { id: 'cinematic_teasers', label: 'Cinematic 1-min Teasers', qty: 1 },
    { id: 'long_form_videos', label: 'Long-form Cinematic Videos', qty: 1 },
    { id: 'canvas_albums', label: 'Canvas Bound Photo Albums', qty: 1 }
  ],
  quotation_pdf_theme: 'royal_gold',
  quotation_pdf_terms: 'Deliverables will be compiled and sent within 45 days of wedding event completion.',
  invoice_upi_id: 'sushant@upi',
  invoice_bank_details: 'HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234',
  contract_clauses: '1. Standard contract terms apply for all photography assignments.\n2. Final deliverables are delivered post outstanding clearance.\n3. Photographer studio owns standard copyrights for portfolio display.'
};

export function MasterSettingsHub({ isOpen, onClose, workspaceId, onStagesUpdated }: MasterSettingsHubProps) {
  const [activeMenu, setActiveMenu] = useState<
    'sequences' | 'leads' | 'projects' | 'invoices' | 'expenses' | 'services' | 'packages' | 'deliverables' | 'pdf_quote' | 'pdf_invoice' | 'pdf_contract' | 'workflow'
  >('sequences');
  const [loading, setLoading] = useState(false);

  // Schema state from DB
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [stages, setStages] = useState<CRMStage[]>([]);

  // Studio Settings (saved in profiles JSON column, fallback to localStorage)
  const [studioSettings, setStudioSettings] = useState<any>(DEFAULT_STUDIO_SETTINGS);

  // Form states
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');

  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageServices, setPackageServices] = useState<string[]>([]);
  const [packageDesc, setPackageDesc] = useState('');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Marketing');
  const [expenseClient, setExpenseClient] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  const [sequenceName, setSequenceName] = useState('');

  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6'); // Default to blue circle

  // Input states for studioSettings arrays
  const [newBudgetRange, setNewBudgetRange] = useState('');
  const [newProjCategory, setNewProjCategory] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [newExpenseCategoryInput, setNewExpenseCategoryInput] = useState('');
  const [newCancelReason, setNewCancelReason] = useState('');
  const [newDeliverableLabel, setNewDeliverableLabel] = useState('');

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadAllSettings();
    }
  }, [isOpen, workspaceId]);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch CRM Stages
      const { data: dbStages } = await supabase
        .from('crm_stages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });
      if (dbStages) setStages(dbStages);

      // 2. Fetch Services
      const { data: dbServices } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbServices) setServices(dbServices);

      // 3. Fetch Packages
      const { data: dbPackages } = await supabase
        .from('packages')
        .select('*')
        .eq('tenant_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbPackages) setPackages(dbPackages);

      // 4. Fetch Expenses
      const { data: dbExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbExpenses) setExpenses(dbExpenses);

      // 5. Fetch Sequences
      const { data: dbSeqs } = await supabase
        .from('sequences')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbSeqs) setSequences(dbSeqs);

      // 6. Fetch Leads
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbLeads) setLeadsList(dbLeads);

      // 7. Fetch profile's studio_settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('studio_settings')
        .eq('id', workspaceId)
        .single();

      if (profile?.studio_settings && Object.keys(profile.studio_settings).length > 0) {
        setStudioSettings({ ...DEFAULT_STUDIO_SETTINGS, ...profile.studio_settings });
      } else {
        const local = localStorage.getItem(`studio_settings_${workspaceId}`);
        if (local) {
          try {
            setStudioSettings(JSON.parse(local));
          } catch (_) {}
        }
      }

    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveStudioSettings = async (nextSettings: any) => {
    setStudioSettings(nextSettings);
    localStorage.setItem(`studio_settings_${workspaceId}`, JSON.stringify(nextSettings));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ studio_settings: nextSettings })
        .eq('id', workspaceId);
      if (error) {
        console.warn('DB studio_settings update failed, using fallback:', error.message);
      }
    } catch (err) {
      console.warn('DB write exception, using fallback:', err);
    }
  };

  // --- Services Catalog ---
  const handleAddService = async () => {
    if (!serviceName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          tenant_id: workspaceId,
          name: serviceName.trim(),
          base_price: Number(servicePrice) || 0,
          description: serviceDesc.trim()
        })
        .select();

      if (!error && data) {
        setServices(prev => [data[0], ...prev]);
        setServiceName('');
        setServicePrice('');
        setServiceDesc('');
      } else {
        alert(error?.message || 'Error inserting service');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (!error) {
        setServices(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Packages ---
  const handleAddPackage = async () => {
    if (!packageName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert({
          tenant_id: workspaceId,
          name: packageName.trim(),
          price: Number(packagePrice) || 0,
          description: packageDesc.trim(),
          services_included: packageServices
        })
        .select();

      if (!error && data) {
        setPackages(prev => [data[0], ...prev]);
        setPackageName('');
        setPackagePrice('');
        setPackageServices([]);
        setPackageDesc('');
      } else {
        alert(error?.message || 'Error inserting package');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (!error) {
        setPackages(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePackageService = (serviceId: string) => {
    if (packageServices.includes(serviceId)) {
      setPackageServices(prev => prev.filter(id => id !== serviceId));
    } else {
      setPackageServices(prev => [...prev, serviceId]);
    }
  };

  // --- Expenses Ledger ---
  const handleAddExpense = async () => {
    if (!expenseAmount) return;
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          tenant_id: workspaceId,
          amount: Number(expenseAmount),
          category: expenseCategory,
          client_id: expenseClient || null,
          description: expenseDesc.trim()
        })
        .select();

      if (!error && data) {
        setExpenses(prev => [data[0], ...prev]);
        setExpenseAmount('');
        setExpenseClient('');
        setExpenseDesc('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (!error) {
        setExpenses(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Sequences ---
  const handleAddSequence = async () => {
    if (!sequenceName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          workspace_id: workspaceId,
          name: sequenceName.trim(),
          is_active: true
        })
        .select();

      if (!error && data) {
        setSequences(prev => [data[0], ...prev]);
        setSequenceName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return;
    try {
      const { error } = await supabase.from('sequences').delete().eq('id', id);
      if (!error) {
        setSequences(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Kanban Stage Management ---
  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    const nextPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    try {
      const { data, error } = await supabase
        .from('crm_stages')
        .insert({
          workspace_id: workspaceId,
          name: newStageName.trim(),
          color: newStageColor,
          position: nextPosition
        })
        .select();

      if (!error && data) {
        setStages(prev => [...prev, data[0]]);
        setNewStageName('');
        if (onStagesUpdated) onStagesUpdated();
      } else {
        alert(error?.message || 'Error inserting stage');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (id: string, name: string) => {
    if (stages.length <= 2) {
      alert('You must retain at least 2 pipeline stages.');
      return;
    }
    if (!confirm(`Are you sure you want to delete stage '${name}'? All leads mapping to this stage will be detached.`)) return;
    try {
      const { error } = await supabase.from('crm_stages').delete().eq('id', id);
      if (!error) {
        setStages(prev => prev.filter(s => s.id !== id));
        if (onStagesUpdated) onStagesUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const stageA = stages[index];
    const stageB = stages[targetIndex];

    try {
      const tempPos = -1 - Math.floor(Math.random() * 10000);
      await supabase.from('crm_stages').update({ position: tempPos }).eq('id', stageA.id);
      await supabase.from('crm_stages').update({ position: stageA.position }).eq('id', stageB.id);
      await supabase.from('crm_stages').update({ position: stageB.position }).eq('id', stageA.id);

      const updated = [...stages];
      const temp = { ...stageA, position: stageB.position };
      updated[index] = { ...stageB, position: stageA.position };
      updated[targetIndex] = temp;
      updated.sort((a, b) => a.position - b.position);
      setStages(updated);
      if (onStagesUpdated) onStagesUpdated();
    } catch (err) {
      console.error('Failed to swap stage positions:', err);
    }
  };

  const handleResetDefaultStages = async () => {
    if (!confirm('Re-seed all 8 default Kanban stages? This will not delete existing custom stages, but merges defaults.')) return;
    try {
      await supabase.rpc('seed_default_crm_stages', { p_workspace_id: workspaceId });
      loadAllSettings();
      if (onStagesUpdated) onStagesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Panel Wrapper */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          className="relative w-full max-w-4xl h-full bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 shadow-2xl flex flex-col text-slate-800 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-900 shrink-0 bg-white dark:bg-zinc-950/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Configuration Hub</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Control Panel IDs, document templates, pricing & pipeline stages</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Layout containing sidebar and content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/40 p-4 overflow-y-auto space-y-6 select-none">
              
              {/* Category 1: Master Data */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-400 dark:text-zinc-650 tracking-wider block px-2.5 mb-1.5">Master Configurations</span>
                {[
                  { id: 'sequences', label: 'Sequence IDs', icon: FileSpreadsheet },
                  { id: 'leads', label: 'Leads Config', icon: User },
                  { id: 'projects', label: 'Projects & Clients', icon: Briefcase },
                  { id: 'invoices', label: 'Invoices & Orders', icon: Coins },
                  { id: 'expenses', label: 'Expenses & Policies', icon: BarChart2 }
                ].map(item => {
                  const Icon = item.icon;
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id as any)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                        active 
                          ? 'bg-slate-900 dark:bg-zinc-905 text-white shadow-sm border border-transparent' 
                          : 'text-slate-550 dark:text-zinc-450 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-500' : 'text-zinc-550'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category 2: Core Catalogs */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-400 dark:text-zinc-650 tracking-wider block px-2.5 mb-1.5">Studio Catalogs</span>
                {[
                  { id: 'services', label: 'Services Catalog', icon: Tag },
                  { id: 'packages', label: 'Packages Matrix', icon: Tag },
                  { id: 'deliverables', label: 'Deliverables List', icon: ClipboardList }
                ].map(item => {
                  const Icon = item.icon;
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id as any)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                        active 
                          ? 'bg-slate-900 dark:bg-zinc-905 text-white shadow-sm border border-transparent' 
                          : 'text-slate-550 dark:text-zinc-450 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-500' : 'text-zinc-550'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category 3: Document Templates */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-400 dark:text-zinc-650 tracking-wider block px-2.5 mb-1.5">PDF Document Layouts</span>
                {[
                  { id: 'pdf_quote', label: 'Quotation Canvas', icon: FileText },
                  { id: 'pdf_invoice', label: 'Invoice Layout', icon: FileCheck },
                  { id: 'pdf_contract', label: 'Contract Clauses', icon: FileText }
                ].map(item => {
                  const Icon = item.icon;
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id as any)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                        active 
                          ? 'bg-slate-900 dark:bg-zinc-905 text-white shadow-sm border border-transparent' 
                          : 'text-slate-550 dark:text-zinc-450 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-500' : 'text-zinc-550'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category 4: Pipeline */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-400 dark:text-zinc-650 tracking-wider block px-2.5 mb-1.5">CRM Pipeline</span>
                <button
                  onClick={() => setActiveMenu('workflow')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeMenu === 'workflow' 
                      ? 'bg-slate-900 dark:bg-zinc-905 text-white shadow-sm border border-transparent' 
                      : 'text-slate-550 dark:text-zinc-450 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Layers className={`w-4 h-4 ${activeMenu === 'workflow' ? 'text-orange-500' : 'text-zinc-550'}`} />
                  <span>Workflow Stages</span>
                </button>
              </div>

            </div>

            {/* Config Content Panel Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#09090b]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                  <span className="text-xs text-slate-400 font-medium">Syncing database configuration...</span>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-6 text-xs text-slate-700 dark:text-zinc-300">
                  
                  {/* --- TAB: SEQUENCE IDS --- */}
                  {activeMenu === 'sequences' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileSpreadsheet className="w-4.5 h-4.5 text-orange-500" />
                          Master Sequence prefixes
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Define automated prefixes patterns for documents, invoices, and folders</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Leads Prefix</label>
                            <input 
                              type="text" 
                              value={studioSettings.sequence_leads_prefix || ''}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, sequence_leads_prefix: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Invoices Prefix</label>
                            <input 
                              type="text" 
                              value={studioSettings.sequence_invoices_prefix || ''}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, sequence_invoices_prefix: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Projects Prefix</label>
                            <input 
                              type="text" 
                              value={studioSettings.sequence_projects_prefix || ''}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, sequence_projects_prefix: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* DB Drip campaign Sequences */}
                      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-900">
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Marketing Auto-Sequences</h4>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. 5-Day WhatsApp Drip Followup"
                            value={sequenceName}
                            onChange={(e) => setSequenceName(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                          />
                          <button
                            onClick={handleAddSequence}
                            className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold hover:opacity-90"
                          >
                            + Sequence ID
                          </button>
                        </div>

                        <div className="border border-slate-200 dark:border-zinc-900 rounded-2xl divide-y divide-slate-150 dark:divide-zinc-900 overflow-hidden bg-white dark:bg-zinc-950/20">
                          {sequences.length === 0 ? (
                            <div className="p-4 text-center italic text-slate-400">No active marketing drip sequences.</div>
                          ) : (
                            sequences.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/30">
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Sequence key ID: {s.id}</span>
                                </div>
                                <button onClick={() => handleDeleteSequence(s.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: LEADS CONFIG --- */}
                  {activeMenu === 'leads' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <User className="w-4.5 h-4.5 text-orange-500" />
                          Leads default parameters
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Customize leads scoring settings and default assignments</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Default Assigned Owner</label>
                          <input 
                            type="text"
                            value={studioSettings.lead_default_owner || ''}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, lead_default_owner: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        {/* Budget Ranges builder */}
                        <div className="space-y-3 pt-2">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Lead Budget Tier Ranges</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="e.g. ₹50k - ₹1L"
                              value={newBudgetRange}
                              onChange={(e) => setNewBudgetRange(e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newBudgetRange.trim()) return;
                                const ranges = [...(studioSettings.lead_budget_ranges || []), newBudgetRange.trim()];
                                saveStudioSettings({ ...studioSettings, lead_budget_ranges: ranges });
                                setNewBudgetRange('');
                              }}
                              className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                            >
                              Add Tier
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl min-h-12">
                            {(studioSettings.lead_budget_ranges || []).map((range: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-350">
                                <span>{range}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = (studioSettings.lead_budget_ranges || []).filter((_: any, i: number) => i !== idx);
                                    saveStudioSettings({ ...studioSettings, lead_budget_ranges: filtered });
                                  }}
                                  className="text-slate-450 hover:text-red-500 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: PROJECTS & CLIENTS --- */}
                  {activeMenu === 'projects' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Briefcase className="w-4.5 h-4.5 text-orange-500" />
                          Projects & client fields mapper
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Define default wedding event categories and custom mapping tags</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="space-y-3">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Default Wedding Event Categories</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="e.g. Baby Shower, Cinematic Teaser"
                              value={newProjCategory}
                              onChange={(e) => setNewProjCategory(e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newProjCategory.trim()) return;
                                const cats = [...(studioSettings.project_categories || []), newProjCategory.trim()];
                                saveStudioSettings({ ...studioSettings, project_categories: cats });
                                setNewProjCategory('');
                              }}
                              className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                            >
                              Add Category
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl min-h-12">
                            {(studioSettings.project_categories || []).map((cat: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-350">
                                <span>{cat}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = (studioSettings.project_categories || []).filter((_: any, i: number) => i !== idx);
                                    saveStudioSettings({ ...studioSettings, project_categories: filtered });
                                  }}
                                  className="text-slate-450 hover:text-red-500 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: INVOICES & ORDERS --- */}
                  {activeMenu === 'invoices' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Coins className="w-4.5 h-4.5 text-orange-500" />
                          Orders & Billing settings
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Configure default tax calculations, payment terms, and status keys</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Default GST / Tax Rate (%)</label>
                            <input 
                              type="number"
                              value={studioSettings.invoice_gst_percent || 0}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, invoice_gst_percent: Number(e.target.value) })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Billing Terms & booking lock</label>
                            <input 
                              type="text"
                              value={studioSettings.invoice_payment_terms || ''}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, invoice_payment_terms: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-semibold"
                            />
                          </div>
                        </div>

                        {/* Order status options */}
                        <div className="space-y-3 pt-2">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Deliverables Order Status stages</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="e.g. In Color Correction"
                              value={newOrderStatus}
                              onChange={(e) => setNewOrderStatus(e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newOrderStatus.trim()) return;
                                const tags = [...(studioSettings.order_status_tags || []), newOrderStatus.trim()];
                                saveStudioSettings({ ...studioSettings, order_status_tags: tags });
                                setNewOrderStatus('');
                              }}
                              className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                            >
                              Add Status
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl min-h-12">
                            {(studioSettings.order_status_tags || []).map((tag: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-350">
                                <span>{tag}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = (studioSettings.order_status_tags || []).filter((_: any, i: number) => i !== idx);
                                    saveStudioSettings({ ...studioSettings, order_status_tags: filtered });
                                  }}
                                  className="text-slate-450 hover:text-red-500 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: EXPENSES & CANCELLATION --- */}
                  {activeMenu === 'expenses' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart2 className="w-4.5 h-4.5 text-orange-500" />
                            Internal Expense categories
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Manage transaction classification categories for studio audits</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Add expense tag (e.g. Studio Rent)"
                              value={newExpenseCategoryInput}
                              onChange={(e) => setNewExpenseCategoryInput(e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newExpenseCategoryInput.trim()) return;
                                const cats = [...(studioSettings.expense_categories || []), newExpenseCategoryInput.trim()];
                                saveStudioSettings({ ...studioSettings, expense_categories: cats });
                                setNewExpenseCategoryInput('');
                              }}
                              className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                            >
                              Add Category
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl min-h-12">
                            {(studioSettings.expense_categories || []).map((cat: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-350">
                                <span>{cat}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = (studioSettings.expense_categories || []).filter((_: any, i: number) => i !== idx);
                                    saveStudioSettings({ ...studioSettings, expense_categories: filtered });
                                  }}
                                  className="text-slate-450 hover:text-red-500 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Cancellation section */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-900">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="w-4.5 h-4.5 text-orange-500" />
                            Cancellation Rules & Policy
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Define cancellation conditions and reasons for report metrics</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Master Cancellation Policy Terms</label>
                            <textarea 
                              rows={3}
                              value={studioSettings.cancellation_policy || ''}
                              onChange={(e) => saveStudioSettings({ ...studioSettings, cancellation_policy: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2.5 rounded-xl text-xs"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Cancellation Reason Checklist</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Add reason (e.g. Budget conflict)"
                                value={newCancelReason}
                                onChange={(e) => setNewCancelReason(e.target.value)}
                                className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newCancelReason.trim()) return;
                                  const reasons = [...(studioSettings.cancellation_reasons || []), newCancelReason.trim()];
                                  saveStudioSettings({ ...studioSettings, cancellation_reasons: reasons });
                                  setNewCancelReason('');
                                }}
                                className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                              >
                                Add Reason
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl min-h-12">
                              {(studioSettings.cancellation_reasons || []).map((reason: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-350">
                                  <span>{reason}</span>
                                  <button 
                                    onClick={() => {
                                      const filtered = (studioSettings.cancellation_reasons || []).filter((_: any, i: number) => i !== idx);
                                      saveStudioSettings({ ...studioSettings, cancellation_reasons: filtered });
                                    }}
                                    className="text-slate-450 hover:text-red-500 font-bold ml-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: SERVICES CATALOG --- */}
                  {activeMenu === 'services' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Briefcase className="w-4.5 h-4.5 text-orange-500" />
                          Photography Services catalog
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Manage catalog of standard photoshoot deliverables and base pricing</p>
                      </div>

                      {/* Add Service form */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-3 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Service Name</label>
                          <input 
                            type="text" 
                            placeholder="Traditional Video"
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Base Price (₹)</label>
                          <input 
                            type="number" 
                            placeholder="30000"
                            value={servicePrice}
                            onChange={(e) => setServicePrice(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-semibold"
                          />
                        </div>
                        <div className="space-y-1 flex items-end">
                          <button
                            onClick={handleAddService}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
                          >
                            + Catalog Service
                          </button>
                        </div>
                        <div className="col-span-3 space-y-1 mt-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Description</label>
                          <input 
                            type="text" 
                            placeholder="Deliverables specs (e.g. 2 shooters, long video output)..."
                            value={serviceDesc}
                            onChange={(e) => setServiceDesc(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      {/* Services list table */}
                      <div className="border border-slate-200 dark:border-zinc-900 rounded-2xl divide-y divide-slate-200 dark:divide-zinc-900 overflow-hidden bg-white dark:bg-zinc-950/20">
                        {services.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No photography services cataloged.</div>
                        ) : (
                          services.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                {s.description && <p className="text-[10px] text-slate-400 mt-0.5 font-sans">{s.description}</p>}
                              </div>
                              <div className="flex items-center gap-3 font-mono font-extrabold text-slate-900 dark:text-zinc-200">
                                <span>₹{Number(s.base_price).toLocaleString('en-IN')}</span>
                                <button onClick={() => handleDeleteService(s.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- TAB: PACKAGES MATRIX --- */}
                  {activeMenu === 'packages' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Tag className="w-4.5 h-4.5 text-orange-500" />
                          Custom Price Packages Builder
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Bundle multiple services into custom price packages</p>
                      </div>

                      {/* Add Package form */}
                      <div className="space-y-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Name</label>
                            <input 
                              type="text" 
                              placeholder="Premium Gold Wedding"
                              value={packageName}
                              onChange={(e) => setPackageName(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Price (₹)</label>
                            <input 
                              type="number" 
                              placeholder="180000"
                              value={packagePrice}
                              onChange={(e) => setPackagePrice(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-semibold"
                            />
                          </div>
                        </div>

                        {/* Services checklist selector */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Select Included Services</label>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 rounded-xl">
                            {services.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic p-1">Catalog services first in Services section.</span>
                            ) : (
                              services.map(s => {
                                const selected = packageServices.includes(s.id);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => togglePackageService(s.id)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                                      selected 
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' 
                                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-450'
                                    }`}
                                  >
                                    {s.name}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end pt-2">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Details</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Traditional Photo + Cinematic Video Bundle..."
                              value={packageDesc}
                              onChange={(e) => setPackageDesc(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                            />
                          </div>
                          <button
                            onClick={handleAddPackage}
                            className="bg-slate-900 dark:bg-white text-white dark:text-black py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
                          >
                            + Catalog Package
                          </button>
                        </div>
                      </div>

                      {/* Packages list */}
                      <div className="border border-slate-200 dark:border-zinc-900 rounded-2xl divide-y divide-slate-200 dark:divide-zinc-900 overflow-hidden bg-white dark:bg-zinc-950/20">
                        {packages.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No price packages cataloged.</div>
                        ) : (
                          packages.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {Array.isArray(p.services_included) && p.services_included.map(sid => {
                                    const service = services.find(s => s.id === sid);
                                    return service ? (
                                      <span key={sid} className="bg-slate-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md text-[9px] text-slate-500 font-semibold border border-slate-200 dark:border-zinc-850">
                                        {service.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 font-mono font-extrabold text-slate-900 dark:text-zinc-200">
                                <span>₹{Number(p.price).toLocaleString('en-IN')}</span>
                                <button onClick={() => handleDeletePackage(p.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- TAB: DELIVERABLES CATALOG --- */}
                  {activeMenu === 'deliverables' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <ClipboardList className="w-4.5 h-4.5 text-orange-500" />
                          Deliverables Master Checklist
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Customize default list of items and default counts for new proposals</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add Deliverable (e.g. Screen live streams)"
                            value={newDeliverableLabel}
                            onChange={(e) => setNewDeliverableLabel(e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newDeliverableLabel.trim()) return;
                              const current = studioSettings.deliverables || [];
                              const next = [...current, {
                                id: `custom_del_${Math.random().toString(36).substring(2, 5)}`,
                                label: newDeliverableLabel.trim(),
                                qty: 1
                              }];
                              saveStudioSettings({ ...studioSettings, deliverables: next });
                              setNewDeliverableLabel('');
                            }}
                            className="bg-slate-900 dark:bg-white text-white dark:text-black px-3.5 rounded-xl font-bold hover:opacity-90"
                          >
                            + Add Deliverable
                          </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(studioSettings.deliverables || []).map((item: any, idx: number) => (
                            <div key={item.id || idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl">
                              <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                  <span>Default Qty:</span>
                                  <input 
                                    type="number"
                                    value={item.qty || 1}
                                    onChange={(e) => {
                                      const updated = (studioSettings.deliverables || []).map((d: any, i: number) => 
                                        i === idx ? { ...d, qty: Number(e.target.value) || 1 } : d
                                      );
                                      saveStudioSettings({ ...studioSettings, deliverables: updated });
                                    }}
                                    className="w-14 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-1 text-center font-bold text-slate-800 dark:text-white"
                                  />
                                </div>
                                <button 
                                  onClick={() => {
                                    const filtered = (studioSettings.deliverables || []).filter((_: any, i: number) => i !== idx);
                                    saveStudioSettings({ ...studioSettings, deliverables: filtered });
                                  }}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
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

                  {/* --- TAB: QUOTATION PDF TEMPLATE --- */}
                  {activeMenu === 'pdf_quote' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-orange-500" />
                          Quotation Canvas Styles
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Configure default themes and legal terms for wedding photography proposals</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Default PDF Layout Theme</label>
                          <select 
                            value={studioSettings.quotation_pdf_theme || 'royal_gold'}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, quotation_pdf_theme: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            <option value="modern_light">Modern Light (Free)</option>
                            <option value="classic_mono">Classic Monochrome (Free)</option>
                            <option value="royal_gold">Royal Gold (Premium)</option>
                            <option value="desert_rose">Desert Rose (Premium)</option>
                            <option value="nordic_blue">Nordic Blue (Premium)</option>
                            <option value="emerald_lush">Emerald Lush (Premium)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Proposal Terms & conditions</label>
                          <textarea 
                            rows={4}
                            value={studioSettings.quotation_pdf_terms || ''}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, quotation_pdf_terms: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2.5 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: INVOICE PDF TEMPLATE --- */}
                  {activeMenu === 'pdf_invoice' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileCheck className="w-4.5 h-4.5 text-orange-500" />
                          Invoice Billing layout
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Define outstanding bank transfer rules, UPI IDs, and billing footnotes</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">UPI ID for Direct Transfers</label>
                          <input 
                            type="text" 
                            value={studioSettings.invoice_upi_id || ''}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, invoice_upi_id: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs font-mono font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Bank Account Details (NEFT/RTGS)</label>
                          <textarea 
                            rows={3}
                            value={studioSettings.invoice_bank_details || ''}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, invoice_bank_details: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: CONTRACT PDF --- */}
                  {activeMenu === 'pdf_contract' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-orange-500" />
                          Contract Clauses
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Customize default service contract terms for customer signatures</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Legal Agreement Clauses (Full Text)</label>
                          <textarea 
                            rows={8}
                            value={studioSettings.contract_clauses || ''}
                            onChange={(e) => saveStudioSettings({ ...studioSettings, contract_clauses: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-3 rounded-2xl text-xs font-sans leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB: WORKFLOW STAGES --- */}
                  {activeMenu === 'workflow' && (
                    <div className="space-y-6">
                      
                      <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[10px] font-bold leading-normal flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Editing stages re-orders columns dynamically on the Kanban Board. Changes apply instantly and lock globally under your master photographer profile for all logged-in studio crew shooters.</span>
                      </div>

                      {/* Add custom Stage form */}
                      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                        <h4 className="text-[10px] uppercase font-bold text-slate-550 dark:text-zinc-400 tracking-wider">Create Custom Deal Stage</h4>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] uppercase font-bold text-slate-400">Stage Name</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Advance Retainer Paid"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-2 rounded-xl text-xs"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Color Highlight</label>
                              <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-xl w-32 h-9.5">
                                <input 
                                  type="color"
                                  value={newStageColor}
                                  onChange={(e) => setNewStageColor(e.target.value)}
                                  className="w-7 h-7 border-none bg-transparent cursor-pointer shrink-0"
                                />
                                <span className="text-[10px] font-mono text-zinc-550 uppercase">{newStageColor}</span>
                              </div>
                            </div>
                          </div>

                          {/* Color presets minimal 6-7 options */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block">Preset Colors</label>
                            <div className="flex items-center gap-2.5">
                              {WORKFLOW_COLOR_PRESETS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setNewStageColor(color)}
                                  className={`w-6.5 h-6.5 rounded-full border-2 transition-transform hover:scale-110 ${
                                    newStageColor === color ? 'border-orange-500 scale-105 shadow-sm' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <div className="text-[9px] font-bold text-zinc-500 font-mono pl-1 uppercase">
                                Preset Selected
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={handleAddStage}
                              className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold hover:opacity-90 text-xs"
                            >
                              + Add Stage to Workflow
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Re-order & delete stages checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-orange-500" />
                            Pipeline Stages Workflow Order ({stages.length})
                          </h4>
                          
                          <button
                            onClick={handleResetDefaultStages}
                            className="text-[9px] uppercase font-extrabold tracking-wide text-orange-500 hover:text-orange-400 bg-orange-500/5 px-2.5 py-1 rounded border border-orange-500/10"
                          >
                            Reset to 8 Defaults
                          </button>
                        </div>

                        <div className="space-y-2 border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/20 rounded-2xl p-4 divide-y divide-slate-100 dark:divide-zinc-900/60">
                          {stages.map((stage, idx) => (
                            <div key={stage.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white text-xs">{stage.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5">Position key: {stage.position}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Move Up */}
                                <button
                                  onClick={() => handleMoveStage(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded disabled:opacity-20"
                                  title="Move Stage Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Move Down */}
                                <button
                                  onClick={() => handleMoveStage(idx, 'down')}
                                  disabled={idx === stages.length - 1}
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded disabled:opacity-20"
                                  title="Move Stage Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteStage(stage.id, stage.name)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors ml-1"
                                  title="Delete Stage"
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

                </div>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
