'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Plus, Trash2, ArrowUp, ArrowDown, Settings, 
  Layers, Palette, Tag, Briefcase, FileSpreadsheet, AlertCircle, 
  Database, RefreshCw, BarChart2
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

const MINIMAL_DEFAULTS = [
  { name: 'Inquiry', color: '#3b82f6' },
  { name: 'Contacted', color: '#8b5cf6' },
  { name: 'Meeting Scheduled', color: '#ec4899' },
  { name: 'Proposal Sent', color: '#f59e0b' },
  { name: 'Contract Signed', color: '#10b981' },
  { name: 'Retainer Paid', color: '#06b6d4' },
  { name: 'Completed', color: '#6366f1' },
  { name: 'Closed/Lost', color: '#6b7280' }
];

export function MasterSettingsHub({ isOpen, onClose, workspaceId, onStagesUpdated }: MasterSettingsHubProps) {
  const [activeTab, setActiveTab] = useState<'schemas' | 'workflow'>('schemas');
  const [loading, setLoading] = useState(false);

  // Schema state
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);

  // Workflow state
  const [stages, setStages] = useState<CRMStage[]>([]);

  // Schema forms state
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

  // Workflow forms state
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#ff6b00');

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

      // 6. Fetch Leads for dropdown selector
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (dbLeads) setLeadsList(dbLeads);

    } catch (err) {
      console.error('Failed to load settings schemas:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Services Add/Delete ---
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

  // --- Packages Add/Delete ---
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

  // --- Expenses Add/Delete ---
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

  // --- Sequences Add/Delete ---
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

  // --- Kanban Stage Dynamic Management ---
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
      // Swapping position algorithm to bypass Postgres position unique constraint
      const tempPos = -1 - Math.floor(Math.random() * 10000);
      
      await supabase.from('crm_stages').update({ position: tempPos }).eq('id', stageA.id);
      await supabase.from('crm_stages').update({ position: stageA.position }).eq('id', stageB.id);
      await supabase.from('crm_stages').update({ position: stageB.position }).eq('id', stageA.id);

      // Re-load list locally
      const updated = [...stages];
      const temp = { ...stageA, position: stageB.position };
      updated[index] = { ...stageB, position: stageA.position };
      updated[targetIndex] = temp;
      
      // Sort and update local state
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
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        />

        {/* Panel Wrapper */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 190 }}
          className="relative w-full max-w-2xl h-full bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 shadow-2xl flex flex-col text-slate-800 dark:text-zinc-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-900 shrink-0 bg-slate-50 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
                <Settings className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Configuration Hub</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage master pricing, packages, custom workflows and pipeline stages</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Tab selection */}
          <div className="flex border-b border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/30 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('schemas')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'schemas'
                  ? 'bg-white dark:bg-zinc-900 text-orange-500 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-550 hover:text-slate-850 dark:hover:text-zinc-300'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Master Schemas</span>
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'workflow'
                  ? 'bg-white dark:bg-zinc-900 text-orange-500 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-550 hover:text-slate-850 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>CRM Workflows</span>
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-xs text-slate-400 font-medium">Syncing database configuration...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* TAB 1: MASTER SCHEMAS (SERVICES, PACKAGES, EXPENSES, SEQUENCE IDS) */}
                {activeTab === 'schemas' && (
                  <motion.div
                    key="schemas"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-8 text-xs"
                  >
                    
                    {/* SECTION 1: GLOBAL SERVICES */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-900 pb-2">
                        <Briefcase className="w-4 h-4 text-orange-500" />
                        1. Photography Services Master Catalog
                      </h4>

                      {/* Add Service form */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-3 rounded-xl">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Service Name</label>
                          <input 
                            type="text" 
                            placeholder="Traditional Video"
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Base Price (₹)</label>
                          <input 
                            type="number" 
                            placeholder="30000"
                            value={servicePrice}
                            onChange={(e) => setServicePrice(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-mono font-semibold"
                          />
                        </div>
                        <div className="space-y-1 flex items-end">
                          <button
                            onClick={handleAddService}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity"
                          >
                            + Catalog Service
                          </button>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Description</label>
                          <input 
                            type="text" 
                            placeholder="Deliverables specs (e.g. 2 shooters, long video output)..."
                            value={serviceDesc}
                            onChange={(e) => setServiceDesc(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Services list table */}
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-zinc-900 rounded-xl divide-y divide-slate-200 dark:divide-zinc-900">
                        {services.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No photography services cataloged.</div>
                        ) : (
                          services.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                {s.description && <p className="text-[10px] text-slate-400 mt-0.5">{s.description}</p>}
                              </div>
                              <div className="flex items-center gap-3 font-mono font-extrabold text-slate-900 dark:text-zinc-200">
                                <span>₹{Number(s.base_price).toLocaleString('en-IN')}</span>
                                <button onClick={() => handleDeleteService(s.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: PACKAGES */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-900 pb-2">
                        <Tag className="w-4 h-4 text-orange-500" />
                        2. Custom Price Packages Master Matrix
                      </h4>

                      {/* Add Package form */}
                      <div className="space-y-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-xl">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Name</label>
                            <input 
                              type="text" 
                              placeholder="Premium Gold Wedding"
                              value={packageName}
                              onChange={(e) => setPackageName(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Price (₹)</label>
                            <input 
                              type="number" 
                              placeholder="180000"
                              value={packagePrice}
                              onChange={(e) => setPackagePrice(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-mono font-semibold"
                            />
                          </div>
                        </div>

                        {/* Services checklist selector */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Select Included Services</label>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 rounded-lg">
                            {services.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic p-1">Catalog services first in section 1 above.</span>
                            ) : (
                              services.map(s => {
                                const selected = packageServices.includes(s.id);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => togglePackageService(s.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                                      selected 
                                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' 
                                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    {s.name}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Package Details</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Traditional Photo + Cinematic Video Bundle..."
                              value={packageDesc}
                              onChange={(e) => setPackageDesc(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                            />
                          </div>
                          <button
                            onClick={handleAddPackage}
                            className="bg-slate-900 dark:bg-white text-white dark:text-black py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity"
                          >
                            + Catalog Package
                          </button>
                        </div>
                      </div>

                      {/* Packages list */}
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-zinc-900 rounded-xl divide-y divide-slate-200 dark:divide-zinc-900">
                        {packages.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No price packages cataloged.</div>
                        ) : (
                          packages.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.services_included.map(sid => {
                                    const service = services.find(s => s.id === sid);
                                    return service ? (
                                      <span key={sid} className="bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] text-slate-500 font-semibold border border-slate-200 dark:border-zinc-850">
                                        {service.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 font-mono font-extrabold text-slate-900 dark:text-zinc-200">
                                <span>₹{Number(p.price).toLocaleString('en-IN')}</span>
                                <button onClick={() => handleDeletePackage(p.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 3: EXPENSES */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-900 pb-2">
                        <BarChart2 className="w-4 h-4 text-orange-500" />
                        3. Internal Expense Ledger (Workspace Auditing)
                      </h4>

                      {/* Add Expense Form */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-3 rounded-xl">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Amount (₹)</label>
                          <input 
                            type="number" 
                            placeholder="5000"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Category</label>
                          <select
                            value={expenseCategory}
                            onChange={(e) => setExpenseCategory(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <option value="Marketing">Marketing</option>
                            <option value="Shooter Travel">Crew Travel</option>
                            <option value="Equipment Repair">Equipment</option>
                            <option value="Editor Cost">Editor Pay</option>
                            <option value="Miscellaneous">Misc Expense</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Link Project</label>
                          <select
                            value={expenseClient}
                            onChange={(e) => setExpenseClient(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <option value="">None (General)</option>
                            {leadsList.map(l => (
                              <option key={l.id} value={l.id}>{l.name || 'Unspecified'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 flex items-end">
                          <button
                            onClick={handleAddExpense}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-1.5 rounded-lg font-bold hover:opacity-90"
                          >
                            + Log Expense
                          </button>
                        </div>
                        <div className="col-span-4 space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400">Notes / Details</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Paid Rahul shooter for Udaipur traveling allowance..."
                            value={expenseDesc}
                            onChange={(e) => setExpenseDesc(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Expenses List */}
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-zinc-900 rounded-xl divide-y divide-slate-200 dark:divide-zinc-900">
                        {expenses.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No expenses logged.</div>
                        ) : (
                          expenses.map(e => {
                            const linkedLead = leadsList.find(l => l.id === e.client_id);
                            return (
                              <div key={e.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] border border-slate-200 dark:border-zinc-800">
                                      {e.category}
                                    </span>
                                    {linkedLead && (
                                      <span className="text-[9px] text-orange-500 font-bold">
                                        Project: {linkedLead.name}
                                      </span>
                                    )}
                                  </div>
                                  {e.description && <p className="text-[10px] text-slate-400 mt-1">{e.description}</p>}
                                </div>
                                <div className="flex items-center gap-3 font-mono font-extrabold text-slate-900 dark:text-zinc-200">
                                  <span>₹{Number(e.amount).toLocaleString('en-IN')}</span>
                                  <button onClick={() => handleDeleteExpense(e.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SECTION 4: DRIP CAMPAIGN SEQUENCE IDS */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-900 pb-2">
                        <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                        4. Drip Marketing Auto-Sequence Registry
                      </h4>

                      {/* Add Sequence Form */}
                      <div className="flex gap-2 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-3 rounded-xl">
                        <input 
                          type="text" 
                          placeholder="e.g. 5-Day WhatsApp Drip Followup"
                          value={sequenceName}
                          onChange={(e) => setSequenceName(e.target.value)}
                          className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1.5 rounded-lg text-xs"
                        />
                        <button
                          onClick={handleAddSequence}
                          className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-lg font-bold hover:opacity-90"
                        >
                          + Add Sequence
                        </button>
                      </div>

                      {/* Sequences List */}
                      <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-zinc-900 rounded-xl divide-y divide-slate-200 dark:divide-zinc-900">
                        {sequences.length === 0 ? (
                          <div className="p-4 text-center italic text-slate-400">No drip sequences active.</div>
                        ) : (
                          sequences.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-900/20">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Sequence ID: {s.id}</span>
                              </div>
                              <button onClick={() => handleDeleteSequence(s.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* TAB 2: CRM WORKFLOWS & CUSTOM KANBAN STAGES */}
                {activeTab === 'workflow' && (
                  <motion.div
                    key="workflow"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-6 text-xs"
                  >
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[10px] font-bold leading-normal flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Editing stages re-orders columns dynamically on the Kanban Board. Changes apply instantly and lock globally under your master photographer profile for all logged-in studio crew shooters.</span>
                    </div>

                    {/* Add custom Stage form */}
                    <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-850 p-4 rounded-2xl space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider">Create Custom Deal Stage</h4>
                      
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
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 p-1 rounded-xl w-28 h-9.5">
                            <input 
                              type="color"
                              value={newStageColor}
                              onChange={(e) => setNewStageColor(e.target.value)}
                              className="w-8 h-8 border-none bg-transparent cursor-pointer shrink-0"
                            />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{newStageColor}</span>
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={handleAddStage}
                            className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold hover:opacity-90 h-9.5"
                          >
                            + Add Stage
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
                          className="text-[9px] uppercase font-extrabold tracking-wide text-orange-500 hover:text-orange-400 bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10"
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

                  </motion.div>
                )}

              </AnimatePresence>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
