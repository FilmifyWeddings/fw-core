'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Trash2, Calendar, Send, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers, ArrowDown, HelpCircle,
  Search, ShieldAlert, Sparkles, ChevronRight, UserCheck, Users,
  GripVertical, Plus, Edit, Copy, PlayCircle, RotateCcw, 
  Database, PauseCircle, MoreVertical, Sliders, X, ArrowLeft,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WhatsappWorkflowBuilderProps {
  workspaceId: string;
}

interface ContactGroup {
  id: string;
  group_name: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
}

interface WorkflowStep {
  template_id: string;
  template_name: string;
  delay_value: number;
  delay_unit: 'seconds' | 'hours';
  sort_index: number;
}

interface Workflow {
  id: string;
  workflow_name: string;
  target_group_id: string | null;
  workflow_steps: WorkflowStep[];
  execution_count: number;
  created_at: string;
  status?: 'Active' | 'Inactive'; // UI-controlled / persisted
}

export function WhatsappWorkflowBuilder({ workspaceId }: WhatsappWorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Layout Registry View States
  const [searchQuery, setSearchQuery] = useState('');
  const [dense, setDense] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form states
  const [showBuilder, setShowBuilder] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<'Active' | 'Inactive'>('Active');

  // Drag and Drop Ref / states
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch templates
      const tempRes = await fetch(`/api/templates?workspace_id=${workspaceId}`);
      const tempData = await tempRes.json();
      if (tempData.success) {
        setTemplates(tempData.results || []);
      }

      // 2. Fetch contact groups
      const groupRes = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${workspaceId}`);
      const groupData = await groupRes.json();
      if (groupData.success) {
        setGroups(groupData.results || []);
      }

      // 3. Fetch workflows
      const workflowRes = await fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}`);
      const workflowData = await workflowRes.json();
      if (workflowData.success) {
        // Enforce status default on load
        const list: Workflow[] = (workflowData.results || []).map((w: any) => ({
          ...w,
          status: w.status || (w.workflow_steps?.length > 0 ? 'Active' : 'Inactive')
        }));
        setWorkflows(list);
        localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('Fallback loading workflows from local storage');
      const localGroups = localStorage.getItem(`wa_contact_groups_${workspaceId}`);
      if (localGroups) setGroups(JSON.parse(localGroups));
      const localWorkflows = localStorage.getItem(`wa_workflows_${workspaceId}`);
      if (localWorkflows) setWorkflows(JSON.parse(localWorkflows));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadData();
    }
  }, [workspaceId]);

  // Click outside menu listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drag Sorting Handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newSteps = [...steps];
    const draggedItemContent = newSteps[dragItem.current];
    newSteps.splice(dragItem.current, 1);
    newSteps.splice(dragOverItem.current, 0, draggedItemContent);
    
    // Reset sort indexes
    const resorted = newSteps.map((step, idx) => ({
      ...step,
      sort_index: idx
    }));

    dragItem.current = null;
    dragOverItem.current = null;
    setSteps(resorted);
  };

  // Add new card step
  const handleAddStep = () => {
    const defaultTemplate = templates[0];
    const newStep: WorkflowStep = {
      template_id: defaultTemplate?.id || '',
      template_name: defaultTemplate?.name || '',
      delay_value: 30,
      delay_unit: 'seconds',
      sort_index: steps.length
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...steps];
    if (field === 'template_name') {
      const selected = templates.find(t => t.name === value);
      newSteps[index] = {
        ...newSteps[index],
        template_name: value,
        template_id: selected?.id || ''
      };
    } else {
      newSteps[index] = {
        ...newSteps[index],
        [field]: value
      };
    }
    setSteps(newSteps);
  };

  const handleDeleteStep = (index: number) => {
    const filtered = steps.filter((_, i) => i !== index).map((step, idx) => ({
      ...step,
      sort_index: idx
    }));
    setSteps(filtered);
  };

  // Create or Update Workflow
  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        workflow_name: name.trim(),
        target_group_id: targetGroup || null,
        workflow_steps: steps,
        status: workflowStatus
      };

      const url = editId
        ? `/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}&workflow_id=${editId}`
        : `/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}`;
      const method = editId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowBuilder(false);
        setEditId(null);
        setName('');
        setTargetGroup('');
        setSteps([]);
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      // Local storage fallback
      const savedWorkflow: Workflow = {
        id: editId || `local-workflow-${Date.now()}`,
        workflow_name: name.trim(),
        target_group_id: targetGroup || null,
        workflow_steps: steps,
        execution_count: editId ? (workflows.find(w => w.id === editId)?.execution_count || 0) : 0,
        status: workflowStatus,
        created_at: new Date().toISOString()
      };

      let updated = [];
      if (editId) {
        updated = workflows.map(w => w.id === editId ? savedWorkflow : w);
      } else {
        updated = [savedWorkflow, ...workflows];
      }
      setWorkflows(updated);
      localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(updated));

      setShowBuilder(false);
      setEditId(null);
      setName('');
      setTargetGroup('');
      setSteps([]);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Workflow status
  const handleToggleStatus = async (workflow: Workflow) => {
    const nextStatus = workflow.status === 'Active' ? 'Inactive' : 'Active';
    try {
      // Update local state
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, status: nextStatus } : w));
      
      await fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}&workflow_id=${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.warn('Status toggle saved locally');
      const updated = workflows.map(w => w.id === workflow.id ? { ...w, status: nextStatus } : w);
      localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(updated));
    }
  };

  // Duplicate Workflow
  const handleDuplicate = (workflow: Workflow) => {
    setName(`${workflow.workflow_name} Copy`);
    setTargetGroup(workflow.target_group_id || '');
    setSteps(workflow.workflow_steps.map(s => ({ ...s })));
    setWorkflowStatus(workflow.status || 'Active');
    setEditId(null);
    setShowBuilder(true);
    setActiveMenuId(null);
  };

  // Delete Workflow
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom workflow?')) return;
    try {
      const res = await fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}&workflow_id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const updated = workflows.filter(w => w.id !== id);
      setWorkflows(updated);
      localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(updated));
    } finally {
      setActiveMenuId(null);
    }
  };

  // Execute Workflow
  const handleExecute = async (workflow: Workflow) => {
    setExecutingId(workflow.id);
    try {
      const res = await fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}&workflow_id=${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_count: workflow.execution_count + 1
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully triggered workflow "${workflow.workflow_name}"!`);
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      // Offline fallback trigger
      const updated = workflows.map(w => w.id === workflow.id ? { ...w, execution_count: w.execution_count + 1 } : w);
      setWorkflows(updated);
      localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(updated));
      alert(`Triggered workflow "${workflow.workflow_name}" in local sandbox execution.`);
    } finally {
      setExecutingId(null);
      setActiveMenuId(null);
    }
  };

  const handleEditClick = (workflow: Workflow) => {
    setEditId(workflow.id);
    setName(workflow.workflow_name);
    setTargetGroup(workflow.target_group_id || '');
    setSteps(workflow.workflow_steps || []);
    setWorkflowStatus(workflow.status || 'Active');
    setShowBuilder(true);
    setActiveMenuId(null);
  };

  const handleAddNew = () => {
    setEditId(null);
    setName('');
    setTargetGroup('');
    setSteps([]);
    setWorkflowStatus('Active');
    setShowBuilder(true);
  };

  // Checkbox multi-selectors
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedWorkflows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedWorkflows.map(w => w.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter(w =>
    w.workflow_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalWorkflows = filteredWorkflows.length;
  const totalPages = Math.ceil(totalWorkflows / rowsPerPage) || 1;
  const paginatedWorkflows = filteredWorkflows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Analytics Metrics
  const metricCount = workflows.length;
  const metricUsed = workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0);
  const metricActive = workflows.filter(w => w.status === 'Active').length;
  const metricInactive = workflows.filter(w => w.status === 'Inactive').length;

  return (
    <div className="w-full p-1 space-y-6">
      
      {!showBuilder ? (
        <div className="space-y-6">
          
          {/* ═══ MASTER ANALYTICS COUNTER DOCK ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-zinc-950/60 border border-zinc-900 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* WORKFLOWS */}
            <div className="flex items-center gap-3.5 border-r border-zinc-900/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider block">Workflows (Count)</span>
                <span className="text-lg font-black text-white mt-0.5 block leading-none">{metricCount}</span>
              </div>
            </div>

            {/* EXEC USED */}
            <div className="flex items-center gap-3.5 border-r border-zinc-900/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider block">Exec Used</span>
                <span className="text-lg font-black text-white mt-0.5 block leading-none">{metricUsed}</span>
              </div>
            </div>

            {/* EXEC REMAINING */}
            <div className="flex items-center gap-3.5 border-r border-zinc-900/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider block">Exec Remaining</span>
                <span className="text-lg font-black text-emerald-450 mt-0.5 block leading-none">5K</span>
              </div>
            </div>

            {/* ACTIVE */}
            <div className="flex items-center gap-3.5 border-r border-zinc-900/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider block">Active</span>
                <span className="text-lg font-black text-white mt-0.5 block leading-none">{metricActive}</span>
              </div>
            </div>

            {/* INACTIVE */}
            <div className="flex items-center gap-3.5 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider block">Inactive</span>
                <span className="text-lg font-black text-white mt-0.5 block leading-none">{metricInactive}</span>
              </div>
            </div>

          </div>

          {/* ═══ FILTER & ACTION SECTION ═══ */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-2 border-b border-zinc-900/40">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search workflows by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3 text-zinc-550 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 hover:scale-102"
            >
              <Plus className="w-4 h-4" /> Add New Workflow
            </button>
          </div>

          {/* ═══ REGISTRY TABLE VIEW (UNIVERSAL RESPONSIVENESS LAW) ═══ */}
          <div className="w-full overflow-hidden border border-zinc-900 bg-zinc-950/20 rounded-2xl shadow-xl relative">
            <div className="overflow-x-auto scroller-thin w-full">
              
              <table className="w-full text-left border-collapse text-zinc-350 min-w-[900px] table-fixed">
                <colgroup>
                  <col className="w-[50px]" />
                  <col className="w-[180px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col className="w-[180px]" />
                  <col className="w-[100px]" />
                  <col className="w-[90px]" />
                  <col className="w-[160px]" />
                  <col className="w-[70px]" />
                </colgroup>

                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950/60 select-none">
                    <th className="py-4 px-4 text-center">
                      <button onClick={handleSelectAll} className="text-zinc-650 hover:text-white transition-colors">
                        <Users className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="py-4 px-4">Name</th>
                    <th className="py-4 px-4">Device</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4">Trigger</th>
                    <th className="py-4 px-4 text-center">Next Run</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                    <th className="py-4 px-4">Last Modified</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-900/50 text-xs font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-zinc-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-450" />
                          <span>Polling active workflows...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedWorkflows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-zinc-500">
                        <div className="flex flex-col items-center gap-2">
                          <Layers className="w-8 h-8 text-zinc-700" />
                          <p className="font-semibold text-zinc-400">No automation workflows configured</p>
                          <p className="text-[10px] text-zinc-600 max-w-xs">Define a trigger workflow above to begin dispatching automated notifications.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkflows.map(wf => {
                      const isSelected = selectedIds.includes(wf.id);
                      const targetGroupObj = groups.find(g => g.id === wf.target_group_id);
                      const modifiedDate = new Date(wf.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      });
                      const isActive = wf.status !== 'Inactive';

                      return (
                        <tr
                          key={wf.id}
                          className={`hover:bg-zinc-900/20 transition-colors border-b border-zinc-900/60 ${
                            isSelected ? 'bg-zinc-900/10' : ''
                          }`}
                        >
                          {/* Selector */}
                          <td className="px-4 text-center py-3" onClick={() => handleSelectRow(wf.id)}>
                            <div className={`w-3.5 h-3.5 rounded border mx-auto flex items-center justify-center cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-500 border-emerald-600 text-black' : 'border-zinc-800 hover:border-zinc-700'
                            }`}>
                              {isSelected && <span className="text-[9px] font-bold">✓</span>}
                            </div>
                          </td>

                          {/* Name */}
                          <td className={`px-4 font-black truncate py-3 ${dense ? 'py-1.5' : 'py-3'}`}>
                            <span className="text-white hover:text-emerald-400 cursor-pointer block truncate" onClick={() => handleEditClick(wf)}>
                              {wf.workflow_name}
                            </span>
                          </td>

                          {/* Device / Agent Context */}
                          <td className="px-4 text-zinc-400 font-medium py-3">
                            <span className="truncate block">Gateway</span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 text-center py-3">
                            <button
                              onClick={() => handleToggleStatus(wf)}
                              className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border transition-colors ${
                                isActive 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:bg-zinc-850'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          {/* Trigger */}
                          <td className="px-4 font-mono text-[10px] text-zinc-500 py-3">
                            <span className="bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-850">
                              {targetGroupObj ? 'GROUP_MEMBER_ADDED' : 'LEAD_INGESTED'}
                            </span>
                          </td>

                          {/* Next Run */}
                          <td className="px-4 text-center text-zinc-650 font-mono text-[11px] py-3">
                            -
                          </td>

                          {/* Execution / Actions count */}
                          <td className="px-4 text-center font-bold text-zinc-300 py-3">
                            {wf.execution_count}
                          </td>

                          {/* Last Modified */}
                          <td className="px-4 text-zinc-500 font-mono text-[11px] py-3">
                            {modifiedDate}
                          </td>

                          {/* 3-Dot Options dropdown */}
                          <td className="px-4 text-right relative py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === wf.id ? null : wf.id)}
                              className="p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-550 hover:text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === wf.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-4 top-11 mt-1 w-44 bg-zinc-950 border border-zinc-850 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 z-40 text-left"
                              >
                                <button
                                  onClick={() => handleEditClick(wf)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  Edit Node Flow
                                </button>
                                
                                <button
                                  onClick={() => handleDuplicate(wf)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  Duplicate Flow
                                </button>

                                <button
                                  onClick={() => handleExecute(wf)}
                                  disabled={executingId === wf.id}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                >
                                  <PlayCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  {executingId === wf.id ? 'Running...' : 'Execute Sequence'}
                                </button>

                                <div className="h-[1px] bg-zinc-900 my-0.5" />

                                <button
                                  onClick={() => handleDelete(wf.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-450 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  Delete Workflow
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            </div>
          </div>

          {/* ═══ BOTTOM CONTROLS & PAGINATION ═══ */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 border-t border-zinc-900/60 pt-4">
            
            {/* Dense toggle on the left */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setDense(!dense)}
                className={`relative w-8.5 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  dense ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  dense ? 'translate-x-3.5' : 'translate-x-0'
                }`} />
              </button>
              <span className="font-semibold text-zinc-400">Dense Row Padding</span>
            </div>

            {/* Pagination controls on the right */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={e => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <span>
                {totalWorkflows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–
                {Math.min(currentPage * rowsPerPage, totalWorkflows)} of {totalWorkflows}
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ═══ 3D GLASSMORPHISM DRIP BUILDER CONSOLE ═══ */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-6 relative overflow-hidden shadow-2xl"
        >
          {/* Decorative ambient background glows */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Builder Header */}
          <div className="flex justify-between items-center pb-4 border-b border-zinc-900 relative z-10">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block mb-0.5">3D Drip Automation Node Console</span>
              <h2 className="text-base font-extrabold text-white">
                {editId ? `Modify Sequence: ${name}` : 'Construct New Drip Flow'}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-350">
                <span className="text-[9px] uppercase font-bold text-zinc-500">Status</span>
                <button
                  type="button"
                  onClick={() => setWorkflowStatus(prev => prev === 'Active' ? 'Inactive' : 'Active')}
                  className={`relative w-22 h-7 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer border ${
                    workflowStatus === 'Active'
                      ? 'bg-emerald-950/60 border-emerald-500/30'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  {/* Sliding circle */}
                  <motion.div
                    animate={{ x: workflowStatus === 'Active' ? 56 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-5 h-5 rounded-full ${
                      workflowStatus === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-650'
                    }`}
                  />
                  {/* Active / Inactive Text */}
                  <span className={`absolute text-[8.5px] font-black uppercase tracking-wider select-none transition-colors duration-300 ${
                    workflowStatus === 'Active' 
                      ? 'left-2.5 text-emerald-400' 
                      : 'right-2.5 text-zinc-550'
                  }`}>
                    {workflowStatus}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-all"
              >
                Cancel Editor
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveWorkflow} className="space-y-6 relative z-10">
            
            {/* Meta Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Inbound Automated Welcome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Target Contact Group Trigger</label>
                <select
                  value={targetGroup}
                  required
                  onChange={e => setTargetGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                >
                  {groups.length === 0 ? (
                    <option value="">No Contact Groups Found - Create One First</option>
                  ) : (
                    <>
                      {!targetGroup && <option value="">Select Target Contact Group...</option>}
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.group_name} (Group Added Trigger)</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Workflow Card Nodes Stack */}
            <div className="space-y-5">
              
              <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Sequence Drip Nodes
              </div>

              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 text-zinc-550 text-xs">
                  <Layers className="w-7 h-7 text-zinc-800 mb-2" />
                  No step nodes configured. Add your first step below.
                </div>
              ) : (
                <div className="space-y-0">
                  {steps.map((step, index) => (
                    <React.Fragment key={index}>

                      {/* 3D Glassmorphic Drip Node with delay inside */}
                      <div
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className="p-5 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-white/10 flex flex-col md:flex-row items-center gap-4 transition-all relative group"
                      >
                        {/* Drag Handle & Node Index */}
                        <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-zinc-550 hover:text-white transition-colors shrink-0">
                          <GripVertical className="w-4 h-4" />
                          <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            NODE #{index + 1}
                          </span>
                        </div>

                        {/* Select Template */}
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Message Template</label>
                          <select
                            value={step.template_name}
                            onChange={(e) => handleUpdateStep(index, 'template_name', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                          >
                            <option value="">Select Template</option>
                            {templates.map(t => (
                              <option key={t.id} value={t.name}>{t.name} ({t.type})</option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Delay Matrix: Number + Unit */}
                        <div className="w-full md:w-64 space-y-1">
                          <label className="text-[9px] font-bold text-zinc-455 uppercase tracking-wider flex items-center gap-1">
                            Delay Cooldown <span className="text-[8px] text-zinc-650 font-mono font-normal">(Relative to Ingestion)</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="30"
                              value={step.delay_value}
                              onChange={(e) => handleUpdateStep(index, 'delay_value', parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none text-center focus:border-emerald-500/40"
                            />
                            <select
                              value={step.delay_unit}
                              onChange={(e) => handleUpdateStep(index, 'delay_unit', e.target.value)}
                              className="flex-1 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none cursor-pointer focus:border-emerald-500/40"
                            >
                              <option value="seconds">Seconds</option>
                              <option value="hours">Hours</option>
                            </select>
                          </div>
                          <span className="text-[8.5px] text-zinc-550 block font-sans leading-none pt-1">
                            Runs exactly {step.delay_value} {step.delay_unit} after lead creation.
                          </span>
                        </div>

                        {/* Delete Node Step */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(index)}
                          className="p-2 text-zinc-650 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0 md:self-end"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Glowing vertical linking line featuring a fluid animated gradient pulse */}
                      {index < steps.length - 1 && (
                        <div className="flex flex-col items-center py-2 select-none">
                          <div className="w-[2px] h-8 bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent relative animate-pulse shadow-[0_0_8px_#10b981]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                          <span className="text-[8px] text-zinc-600 font-mono tracking-widest uppercase my-0.5">drip execution delay flow</span>
                        </div>
                      )}

                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Add Step Button natively placed EXACTLY at bottom of cards stack */}
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-emerald-400" /> Add Workflow Node Step
                </button>
              </div>

            </div>

            {/* Form Save Button */}
            <div className="pt-5 border-t border-zinc-900 flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-500 text-black hover:bg-emerald-600 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {saving ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Workflow...</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Save Workflow Sequence</>
                )}
              </button>
            </div>

          </form>
        </motion.div>
      )}

    </div>
  );
}
