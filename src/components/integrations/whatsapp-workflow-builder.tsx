'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Trash2, Calendar, Send, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers, ArrowDown, HelpCircle,
  Search, ShieldAlert, Sparkles, ChevronRight, UserCheck,
  GripVertical, Plus, Edit, Copy, PlayCircle
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
}

export function WhatsappWorkflowBuilder({ workspaceId }: WhatsappWorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Form states
  const [showBuilder, setShowBuilder] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  // Drag and Drop Ref / states
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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
        setWorkflows(workflowData.results || []);
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
        workflow_steps: steps
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

  // Duplicate Workflow
  const handleDuplicate = (workflow: Workflow) => {
    setName(`${workflow.workflow_name} Copy`);
    setTargetGroup(workflow.target_group_id || '');
    setSteps(workflow.workflow_steps.map(s => ({ ...s })));
    setEditId(null);
    setShowBuilder(true);
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
      alert(`Triggered workflow "${workflow.workflow_name}" in local sandbox execution mode.`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleEditClick = (workflow: Workflow) => {
    setEditId(workflow.id);
    setName(workflow.workflow_name);
    setTargetGroup(workflow.target_group_id || '');
    setSteps(workflow.workflow_steps || []);
    setShowBuilder(true);
  };

  const handleAddNew = () => {
    setEditId(null);
    setName('');
    setTargetGroup('');
    setSteps([]);
    setShowBuilder(true);
  };

  return (
    <div className="w-full p-1 space-y-6">
      
      {!showBuilder ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Dynamic Workflow Registry</h2>
            </div>
            <button
              onClick={handleAddNew}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create Workflow
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs border border-zinc-900 rounded-2xl bg-zinc-950/20">
              <Layers className="w-8 h-8 text-zinc-700 mb-2" />
              No workflows found. Build your first workflow now!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map(wf => {
                const targetGroupObj = groups.find(g => g.id === wf.target_group_id);
                return (
                  <motion.div
                    key={wf.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs font-extrabold text-white">{wf.workflow_name}</h3>
                          <span className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase block mt-0.5">
                            Target: {targetGroupObj?.group_name || 'All Leads'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(wf)}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(wf)}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(wf.id)}
                            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 leading-normal space-y-1">
                        <div>Steps configured: <strong className="text-white">{wf.workflow_steps?.length || 0} nodes</strong></div>
                        <div>Total executions: <strong className="text-white">{wf.execution_count} runs</strong></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-900 mt-4 flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono">Created: {new Date(wf.created_at).toLocaleDateString()}</span>
                      
                      <button
                        onClick={() => handleExecute(wf)}
                        disabled={executingId === wf.id}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-extrabold text-[10px] rounded-lg border border-emerald-500/20 transition-all flex items-center gap-1"
                      >
                        {executingId === wf.id ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" /> Executing...</>
                        ) : (
                          <><PlayCircle className="w-3 h-3" /> Execute Workflow</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Workflow Builder Editor Console */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-6"
        >
          <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">WORKFLOW NODE CONSOLE</span>
              <h2 className="text-base font-extrabold text-white mt-0.5">
                {editId ? `Modify Workflow: ${name}` : 'Construct New Workflow'}
              </h2>
            </div>
            <button
              onClick={() => setShowBuilder(false)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-all"
            >
              Cancel Editor
            </button>
          </div>

          <form onSubmit={handleSaveWorkflow} className="space-y-6">
            
            {/* Meta Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Inbound Automated Welcome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Contact Group</label>
                <select
                  value={targetGroup}
                  onChange={e => setTargetGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                >
                  <option value="">All Leads / Unassigned</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.group_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Workflow Card Nodes Stack */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Sequence Card Nodes
              </div>

              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 text-zinc-500 text-xs">
                  No step nodes configured. Add your first step below.
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="p-4 rounded-2xl border border-zinc-850 bg-zinc-900/10 hover:border-zinc-800 flex flex-col md:flex-row items-center gap-4 transition-all relative group"
                    >
                      {/* Drag Handle */}
                      <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold text-zinc-500">#{index + 1}</span>
                      </div>

                      {/* Select Template */}
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">Send Template</label>
                        <select
                          value={step.template_name}
                          onChange={(e) => handleUpdateStep(index, 'template_name', e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                        >
                          <option value="">Select Template</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.name}>{t.name} ({t.type})</option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Delay Matrix: Number + Unit */}
                      <div className="w-full md:w-56 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">Delay Cooldown</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="30"
                            value={step.delay_value}
                            onChange={(e) => handleUpdateStep(index, 'delay_value', parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none text-center"
                          />
                          <select
                            value={step.delay_unit}
                            onChange={(e) => handleUpdateStep(index, 'delay_unit', e.target.value)}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                          >
                            <option value="seconds">Seconds</option>
                            <option value="hours">Hours</option>
                          </select>
                        </div>
                      </div>

                      {/* Delete Step Node */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(index)}
                        className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all md:self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* NATIVE + Add Step Button placed EXACTLY at bottom of sequence list */}
              <div className="pt-2 flex justify-center">
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
            <div className="pt-6 border-t border-zinc-900 flex justify-end gap-3">
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
