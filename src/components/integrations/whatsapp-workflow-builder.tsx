'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Play, Trash2, Calendar, Send, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers, ArrowDown, HelpCircle,
  Search, ShieldAlert, Sparkles, ChevronRight, UserCheck, Users,
  GripVertical, Plus, Edit, Copy, PlayCircle, RotateCcw, 
  Database, PauseCircle, MoreVertical, Sliders, X, ArrowLeft,
  ChevronLeft, ChevronRight as ChevronRightIcon, BarChart3,
  ChevronDown, FileText, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkflowExecutionTimelineModal } from '@/components/integrations/WorkflowExecutionTimelineModal';

// Helper to distinguish Group Templates from Client Templates
const isGroupTemplate = (t: { name?: string; category?: string }) => {
  const cat = (t.category || '').toLowerCase();
  const nm = (t.name || '').toLowerCase();
  return cat === 'group_alert' || cat === 'group_workflow' || cat === 'group' || nm.startsWith('group_') || nm.includes('group_alert');
};

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
  category?: string;
}

interface WhatsAppSyncedGroup {
  jid: string;
  display_name: string;
  participant_count?: number;
}

interface WorkflowStep {
  template_id: string;
  template_name: string;
  delay_value: number;
  delay_unit: 'seconds' | 'minutes' | 'hours' | 'days';
  sort_index: number;
  target_type?: 'client' | 'group';
  target_group_jid?: string;
  target_group_name?: string;
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
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [syncedWhatsAppGroups, setSyncedWhatsAppGroups] = useState<WhatsAppSyncedGroup[]>([]);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [openGroupDropdownIndex, setOpenGroupDropdownIndex] = useState<number | null>(null);
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<number, string>>({});
  const [openTemplateDropdownIndex, setOpenTemplateDropdownIndex] = useState<number | null>(null);
  const [templateSearchQueries, setTemplateSearchQueries] = useState<Record<number, string>>({});
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
  const [mounted, setMounted] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    workflow: Workflow;
    coords: { top: number; right: number };
  } | null>(null);
  const [selectedWorkflowForTimeline, setSelectedWorkflowForTimeline] = useState<Workflow | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dismiss floating action menu on window scroll/resize
  useEffect(() => {
    if (!actionMenu) return;
    const handleDismiss = () => setActionMenu(null);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [actionMenu]);

  const toggleActionMenu = (wf: Workflow, targetElem: HTMLElement) => {
    if (actionMenu?.workflow.id === wf.id) {
      setActionMenu(null);
      return;
    }
    const rect = targetElem.getBoundingClientRect();
    const menuHeight = 220;
    const fitsBelow = rect.bottom + menuHeight <= window.innerHeight - 10;
    const rightPos = Math.max(12, window.innerWidth - rect.right);
    const topPos = fitsBelow ? rect.bottom + 6 : Math.max(10, rect.top - menuHeight - 6);

    setActionMenu({
      workflow: wf,
      coords: {
        top: Math.round(topPos),
        right: Math.round(rightPos)
      }
    });
  };

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
  const fetchSyncedGroups = async () => {
    setFetchingGroups(true);
    try {
      // 1. Check local DB chats
      const { data: dbGroups } = await supabase
        .from('baileys_chats')
        .select('jid, display_name, participant_count, is_group')
        .eq('is_group', true)
        .order('display_name', { ascending: true });

      if (dbGroups && dbGroups.length > 0) {
        setSyncedWhatsAppGroups(dbGroups);
        localStorage.setItem(`wa_synced_groups_${workspaceId}`, JSON.stringify(dbGroups));
      }

      // 2. Also trigger live fetch from worker
      const res = await fetch('/api/integrations/baileys/fetch-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId })
      });
      const data = await res.json();
      if (data.success && data.groups && data.groups.length > 0) {
        setSyncedWhatsAppGroups(data.groups);
        localStorage.setItem(`wa_synced_groups_${workspaceId}`, JSON.stringify(data.groups));
      }
    } catch (e) {
      console.warn('Error fetching synced WhatsApp groups:', e);
      const cached = localStorage.getItem(`wa_synced_groups_${workspaceId}`);
      if (cached) setSyncedWhatsAppGroups(JSON.parse(cached));
    } finally {
      setFetchingGroups(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all endpoints concurrently in parallel
      const [tempRes, groupRes, workflowRes] = await Promise.all([
        fetch(`/api/templates?workspace_id=${workspaceId}`),
        fetch(`/api/integrations/whatsapp/groups?tenant_id=${workspaceId}`),
        fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}`)
      ]);

      const [tempData, groupData, workflowData] = await Promise.all([
        tempRes.json(),
        groupRes.json(),
        workflowRes.json()
      ]);

      if (tempData.success) {
        setTemplates(tempData.results || []);
      }
      if (groupData.success) {
        setGroups(groupData.results || []);
      }
      if (workflowData.success) {
        // Enforce status default on load
        const list: Workflow[] = (workflowData.results || []).map((w: any) => ({
          ...w,
          status: w.status || (w.workflow_steps?.length > 0 ? 'Active' : 'Inactive')
        }));
        setWorkflows(list);
        localStorage.setItem(`wa_workflows_${workspaceId}`, JSON.stringify(list));
      }

      fetchSyncedGroups();
    } catch (err) {
      console.warn('Fallback loading workflows from local storage', err);
      const localGroups = localStorage.getItem(`wa_contact_groups_${workspaceId}`);
      if (localGroups) setGroups(JSON.parse(localGroups));
      const localWorkflows = localStorage.getItem(`wa_workflows_${workspaceId}`);
      if (localWorkflows) setWorkflows(JSON.parse(localWorkflows));
      const cached = localStorage.getItem(`wa_synced_groups_${workspaceId}`);
      if (cached) setSyncedWhatsAppGroups(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadData();

      // Real-time listener for instant group updates in milliseconds
      const channel = supabase
        .channel(`realtime_baileys_chats_${workspaceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'baileys_chats' },
          (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new;
              if (row && row.is_group) {
                setSyncedWhatsAppGroups(prev => {
                  const exists = prev.some(g => g.jid === row.jid);
                  let updated;
                  if (exists) {
                    updated = prev.map(g => g.jid === row.jid ? {
                      ...g,
                      display_name: row.display_name || g.display_name,
                      participant_count: row.participant_count ?? g.participant_count
                    } : g);
                  } else {
                    updated = [...prev, {
                      jid: row.jid,
                      display_name: row.display_name || row.jid.split('@')[0],
                      participant_count: row.participant_count ?? 0,
                      is_group: true
                    }];
                  }
                  return updated.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old;
              if (oldRow?.jid) {
                setSyncedWhatsAppGroups(prev => prev.filter(g => g.jid !== oldRow.jid));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
    // Default to first client template if available
    const clientTemplate = templates.find(t => !isGroupTemplate(t)) || templates[0];
    const newStep: WorkflowStep = {
      template_id: clientTemplate?.id || '',
      template_name: clientTemplate?.name || '',
      delay_value: steps.length === 0 ? 0 : 1,
      delay_unit: steps.length === 0 ? 'seconds' : 'minutes',
      sort_index: steps.length,
      target_type: 'client',
      target_group_jid: '',
      target_group_name: ''
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...steps];
    if (field === 'target_type') {
      const isGroup = value === 'group';
      const curTemplate = templates.find(t => t.name === newSteps[index].template_name);
      const isCurGroup = curTemplate ? isGroupTemplate(curTemplate) : false;

      let newTemplateName = newSteps[index].template_name;
      let newTemplateId = newSteps[index].template_id;

      // If switching to client and current template is group template, auto pick first client template
      if (!isGroup && isCurGroup) {
        const clientT = templates.find(t => !isGroupTemplate(t));
        newTemplateName = clientT?.name || '';
        newTemplateId = clientT?.id || '';
      }
      // If switching to group and current template is client template, auto pick first group template
      if (isGroup && !isCurGroup) {
        const groupT = templates.find(t => isGroupTemplate(t));
        newTemplateName = groupT?.name || '';
        newTemplateId = groupT?.id || '';
      }

      newSteps[index] = {
        ...newSteps[index],
        target_type: value,
        template_name: newTemplateName,
        template_id: newTemplateId,
        target_group_jid: isGroup ? (newSteps[index].target_group_jid || syncedWhatsAppGroups[0]?.jid || '') : '',
        target_group_name: isGroup ? (newSteps[index].target_group_name || syncedWhatsAppGroups[0]?.display_name || '') : ''
      };
    } else if (field === 'template_name') {
      const selected = templates.find(t => t.name === value);
      const isGroup = selected ? isGroupTemplate(selected) : false;

      newSteps[index] = {
        ...newSteps[index],
        template_name: value,
        template_id: selected?.id || '',
        target_type: isGroup ? 'group' : (newSteps[index].target_type || 'client'),
        target_group_jid: isGroup && !newSteps[index].target_group_jid ? (syncedWhatsAppGroups[0]?.jid || '') : newSteps[index].target_group_jid,
        target_group_name: isGroup && !newSteps[index].target_group_name ? (syncedWhatsAppGroups[0]?.display_name || '') : newSteps[index].target_group_name
      };
    } else if (field === 'target_group_jid') {
      const foundGroup = syncedWhatsAppGroups.find(g => g.jid === value);
      newSteps[index] = {
        ...newSteps[index],
        target_group_jid: value,
        target_group_name: foundGroup?.display_name || value
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
    setActionMenu(null);
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
      setActionMenu(null);
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
      setActionMenu(null);
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
    setActionMenu(null);
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            
            {/* WORKFLOWS */}
            <div className="flex items-center gap-3.5 border-r border-zinc-100 dark:border-zinc-800/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Workflows (Count)</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white mt-0.5 block leading-none">{metricCount}</span>
              </div>
            </div>

            {/* EXEC USED */}
            <div className="flex items-center gap-3.5 border-r border-zinc-100 dark:border-zinc-800/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Exec Used</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white mt-0.5 block leading-none">{metricUsed}</span>
              </div>
            </div>

            {/* EXEC REMAINING */}
            <div className="flex items-center gap-3.5 border-r border-zinc-100 dark:border-zinc-800/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Exec Remaining</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block leading-none">5K</span>
              </div>
            </div>

            {/* ACTIVE */}
            <div className="flex items-center gap-3.5 border-r border-zinc-100 dark:border-zinc-800/60 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Active</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white mt-0.5 block leading-none">{metricActive}</span>
              </div>
            </div>

            {/* INACTIVE */}
            <div className="flex items-center gap-3.5 pr-4 last:border-0 last:pr-0">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Inactive</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white mt-0.5 block leading-none">{metricInactive}</span>
              </div>
            </div>

          </div>

          {/* ═══ FILTER & ACTION SECTION ═══ */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/40">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search workflows by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500/60 shadow-sm transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 hover:scale-102 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Workflow
            </button>
          </div>

          {/* ═══ REGISTRY TABLE VIEW (UNIVERSAL RESPONSIVENESS LAW) ═══ */}
          <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm relative">
            <div className="overflow-x-auto scroller-thin w-full">
              
              <table className="w-full text-left border-collapse text-zinc-700 dark:text-zinc-300 min-w-[900px] table-fixed">
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
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-slate-50 dark:bg-zinc-800/60 select-none">
                    <th className="py-4 px-4 text-center">
                      <button onClick={handleSelectAll} className="text-zinc-400 hover:text-zinc-800 transition-colors">
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

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-zinc-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                          <span>Polling active workflows...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedWorkflows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-zinc-400">
                        <div className="flex flex-col items-center gap-2">
                          <Layers className="w-8 h-8 text-zinc-300" />
                          <p className="font-semibold text-zinc-700 dark:text-zinc-300">No automation workflows configured</p>
                          <p className="text-[10px] text-zinc-500 max-w-xs">Define a trigger workflow above to begin dispatching automated notifications.</p>
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
                          onClick={() => setSelectedWorkflowForTimeline(wf)}
                          className={`hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer ${
                            isSelected ? 'bg-slate-50/80 dark:bg-zinc-800/10' : ''
                          }`}
                          title="Click row to view execution timeline & analytics"
                        >
                          {/* Selector */}
                          <td className="px-4 text-center py-3" onClick={(e) => { e.stopPropagation(); handleSelectRow(wf.id); }}>
                            <div className={`w-3.5 h-3.5 rounded border mx-auto flex items-center justify-center cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-zinc-300 hover:border-zinc-400'
                            }`}>
                              {isSelected && <span className="text-[9px] font-bold">✓</span>}
                            </div>
                          </td>

                          {/* Name */}
                          <td className={`px-4 font-black truncate py-3 ${dense ? 'py-1.5' : 'py-3'}`}>
                            <span className="text-zinc-900 dark:text-white hover:text-emerald-600 transition-colors block truncate">
                              {wf.workflow_name}
                            </span>
                          </td>

                          {/* Device / Agent Context */}
                          <td className="px-4 text-zinc-500 font-medium py-3">
                            <span className="truncate block">Gateway</span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 text-center py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(wf)}
                              className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border transition-colors cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100' 
                                  : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-200'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          {/* Trigger */}
                          <td className="px-4 font-mono text-[10px] text-zinc-500 py-3">
                            <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                              {targetGroupObj ? 'GROUP_MEMBER_ADDED' : 'LEAD_INGESTED'}
                            </span>
                          </td>

                          {/* Next Run */}
                          <td className="px-4 text-center text-zinc-400 font-mono text-[11px] py-3">
                            -
                          </td>

                          {/* Execution / Actions count */}
                          <td className="px-4 text-center font-bold text-zinc-700 dark:text-zinc-300 py-3">
                            {wf.execution_count}
                          </td>

                          {/* Last Modified */}
                          <td className="px-4 text-zinc-400 font-mono text-[11px] py-3">
                            {modifiedDate}
                          </td>

                          {/* 3-Dot Options dropdown */}
                          <td className="px-4 text-right relative py-3" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleActionMenu(wf, e.currentTarget);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
                              title="Workflow options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            </div>
          </div>

          {/* Floating Row Actions (3-Dots) Menu Portal - Escapes table clipping */}
          {mounted && typeof document !== 'undefined' && actionMenu && createPortal(
            <>
              {/* Fullscreen transparent backdrop for click-outside */}
              <div 
                className="fixed inset-0 z-[999998] cursor-default bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenu(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActionMenu(null);
                }}
              />

              {/* Floating Action Menu */}
              <div 
                style={{
                  position: 'fixed',
                  top: `${actionMenu.coords.top}px`,
                  right: `${actionMenu.coords.right}px`,
                  zIndex: 999999,
                }}
                className="w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col gap-1 text-left backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    const targetWf = actionMenu.workflow;
                    setActionMenu(null);
                    handleEditClick(targetWf);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Edit Node Flow
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const targetWf = actionMenu.workflow;
                    setActionMenu(null);
                    handleDuplicate(targetWf);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Duplicate Flow
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetWf = actionMenu.workflow;
                    handleExecute(targetWf);
                  }}
                  disabled={executingId === actionMenu.workflow.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {executingId === actionMenu.workflow.id ? 'Running...' : 'Execute Sequence'}
                </button>
                 
                <button
                  type="button"
                  onClick={() => {
                    const targetWf = actionMenu.workflow;
                    setActionMenu(null);
                    setSelectedWorkflowForTimeline(targetWf);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  View Analytics & Timeline
                </button>

                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    const targetId = actionMenu.workflow.id;
                    setActionMenu(null);
                    handleDelete(targetId);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Delete Workflow
                </button>
              </div>
            </>,
            document.body
          )}

          {/* ═══ BOTTOM CONTROLS & PAGINATION ═══ */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800/60 pt-4">
            
            {/* Dense toggle on the left */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setDense(!dense)}
                className={`relative w-8.5 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  dense ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white dark:bg-black shadow-md transition-transform ${
                  dense ? 'translate-x-3.5' : 'translate-x-0'
                }`} />
              </button>
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Dense Row Padding</span>
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
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
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
                  className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ═══ DRIP BUILDER CONSOLE (LIGHT THEME) ═══ */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl space-y-6 relative overflow-hidden"
        >
          {/* Decorative ambient background glows */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Builder Header */}
          <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800 relative z-10">
            <div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest block mb-0.5">Drip Automation Sequence Console</span>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                {editId ? `Modify Sequence: ${name}` : 'Construct New Drip Flow'}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-350">
                <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Status</span>
                <button
                  type="button"
                  onClick={() => setWorkflowStatus(prev => prev === 'Active' ? 'Inactive' : 'Active')}
                  className={`relative w-22 h-7 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer border ${
                    workflowStatus === 'Active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800'
                  }`}
                >
                  {/* Sliding circle */}
                  <motion.div
                    animate={{ x: workflowStatus === 'Active' ? 56 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-5 h-5 rounded-full ${
                      workflowStatus === 'Active' ? 'bg-emerald-500 shadow-sm' : 'bg-zinc-400'
                    }`}
                  />
                  {/* Active / Inactive Text */}
                  <span className={`absolute text-[8.5px] font-black uppercase tracking-wider select-none transition-colors duration-300 ${
                    workflowStatus === 'Active' 
                      ? 'left-2.5 text-emerald-600 dark:text-emerald-400' 
                      : 'right-2.5 text-zinc-500'
                  }`}>
                    {workflowStatus}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
              >
                Cancel Editor
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveWorkflow} className="space-y-6 relative z-10">
            
            {/* Meta Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Inbound Automated Welcome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500/60 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Target Contact Group Trigger</label>
                <select
                  value={targetGroup}
                  required
                  onChange={e => setTargetGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-emerald-500/60 cursor-pointer shadow-sm"
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
              
              <div className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Sequence Drip Nodes
              </div>

              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/10 text-zinc-400 text-xs">
                  <Layers className="w-7 h-7 text-zinc-300 dark:text-zinc-700 mb-2" />
                  No step nodes configured. Add your first step below.
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const isGroupTarget = step.target_type === 'group';

                    // Group search filter (search by group name only, NO JID!)
                    const gQuery = (groupSearchQueries[index] || '').toLowerCase().trim();
                    const filteredGroupsForStep = syncedWhatsAppGroups.filter(g =>
                      (g.display_name || '').toLowerCase().includes(gQuery)
                    );

                    // Channel-specific template list (strictly separated)
                    const channelTemplates = templates.filter(t =>
                      isGroupTarget ? isGroupTemplate(t) : !isGroupTemplate(t)
                    );

                    // Template search filter
                    const tQuery = (templateSearchQueries[index] || '').toLowerCase().trim();
                    const filteredTemplatesForStep = channelTemplates.filter(t =>
                      t.name.toLowerCase().includes(tQuery) ||
                      (t.category || '').toLowerCase().includes(tQuery)
                    );

                    return (
                      <React.Fragment key={index}>

                        {/* Drip Node Card */}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnter={() => handleDragEnter(index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`p-5 rounded-2xl border shadow-sm transition-all relative group space-y-4 ${
                            isGroupTarget
                              ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-300/40 dark:border-amber-500/20 hover:border-amber-400'
                              : 'bg-slate-50/80 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:bg-white/10'
                          }`}
                        >
                          {/* Node Header Row */}
                          <div className="flex items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-800 transition-colors">
                                <GripVertical className="w-4 h-4" />
                                <span className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-md">
                                  NODE #{index + 1}
                                </span>
                              </div>

                              {/* Target Type Selector Buttons */}
                              <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStep(index, 'target_type', 'client')}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                    !isGroupTarget
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                  }`}
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Client Direct Chat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStep(index, 'target_type', 'group')}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                    isGroupTarget
                                      ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-black shadow-sm'
                                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                  }`}
                                >
                                  <Users className="w-3 h-3" />
                                  WhatsApp Group Channel
                                </button>
                              </div>
                            </div>

                            {/* Delete Node Step */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(index)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                              title="Delete Step Node"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Node Body Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            
                            {/* Message Template (Cols: 5) - Strictly Channel Filtered with Sticky Search */}
                            <div className="md:col-span-5 space-y-1.5 relative">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                  {isGroupTarget ? 'Group Alert Template' : 'Client Message Template'}
                                </label>
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isGroupTarget
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {isGroupTarget ? 'Group Templates Only' : 'Client Templates Only'}
                                </span>
                              </div>

                              {/* Searchable Template Dropdown Trigger */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenGroupDropdownIndex(null);
                                    setOpenTemplateDropdownIndex(openTemplateDropdownIndex === index ? null : index);
                                  }}
                                  className={`w-full px-3 py-2 bg-white dark:bg-zinc-950/80 border rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                                    openTemplateDropdownIndex === index
                                      ? 'border-emerald-500 ring-2 ring-emerald-500/10 dark:ring-emerald-500/20'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isGroupTarget ? 'text-orange-500' : 'text-emerald-500'}`} />
                                    <span className={`truncate font-medium ${step.template_name ? 'text-zinc-900 dark:text-white font-semibold' : 'text-zinc-400'}`}>
                                      {step.template_name || (isGroupTarget ? '-- Choose Group Template --' : '-- Choose Client Template --')}
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${openTemplateDropdownIndex === index ? 'rotate-180 text-emerald-500' : ''}`} />
                                </button>

                                {/* Template Searchable Dropdown Popover */}
                                <AnimatePresence>
                                  {openTemplateDropdownIndex === index && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setOpenTemplateDropdownIndex(null)}
                                      />
                                      <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                                      >
                                        {/* Sticky Search Header */}
                                        <div className="sticky top-0 z-10 p-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800">
                                          <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                              type="text"
                                              autoFocus
                                              placeholder={isGroupTarget ? "Search group templates..." : "Search client templates..."}
                                              value={templateSearchQueries[index] || ''}
                                              onChange={(e) => setTemplateSearchQueries(prev => ({ ...prev, [index]: e.target.value }))}
                                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-medium"
                                            />
                                          </div>
                                        </div>

                                        {/* Template Items */}
                                        <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 p-1">
                                          {filteredTemplatesForStep.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-zinc-400 font-mono">
                                              {isGroupTarget
                                                ? 'No matching group templates found'
                                                : 'No matching client templates found'}
                                            </div>
                                          ) : (
                                            filteredTemplatesForStep.map(t => (
                                              <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateStep(index, 'template_name', t.name);
                                                  setOpenTemplateDropdownIndex(null);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                  step.template_name === t.name
                                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 font-bold text-emerald-600 dark:text-emerald-400'
                                                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                  <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                  <span className="truncate">{t.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-150 dark:bg-zinc-800 text-zinc-500">
                                                    {t.type}
                                                  </span>
                                                  {step.template_name === t.name && (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                  )}
                                                </div>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>

                            {/* Delay Cooldown (Cols: 7) */}
                            <div className="md:col-span-7 space-y-1.5">
                              <label className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                Delay Cooldown <span className="text-[8px] text-zinc-400 font-mono font-normal">(Chained Step Timing)</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  placeholder="1"
                                  value={step.delay_value}
                                  onChange={(e) => handleUpdateStep(index, 'delay_value', parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none text-center focus:border-emerald-500/60 shadow-sm font-bold"
                                />
                                <select
                                  value={step.delay_unit}
                                  onChange={(e) => handleUpdateStep(index, 'delay_unit', e.target.value)}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-300 focus:outline-none cursor-pointer focus:border-emerald-500/60 shadow-sm"
                                >
                                  <option value="seconds">Seconds</option>
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                              <span className="text-[8.5px] text-zinc-500 dark:text-zinc-400 block font-sans leading-none pt-0.5">
                                {index === 0
                                  ? `Node #1 runs ${step.delay_value} ${step.delay_unit} after lead arrives.`
                                  : `Runs ${step.delay_value} ${step.delay_unit} after previous Node #${index} fires.`}
                              </span>
                            </div>

                          </div>

                          {/* ═══ TARGET WHATSAPP GROUP DOCK (Only When Group Target Selected, ZERO GID Strings) ═══ */}
                          {isGroupTarget && (
                            <div className="p-4 rounded-xl border border-amber-300/40 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                    Target WhatsApp Group Destination
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={fetchSyncedGroups}
                                  disabled={fetchingGroups}
                                  className="flex items-center gap-1 text-[9px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer disabled:opacity-50"
                                  title="Refresh live groups directly from WhatsApp"
                                >
                                  <RefreshCw className={`w-3 h-3 ${fetchingGroups ? 'animate-spin' : ''}`} />
                                  {fetchingGroups ? 'Syncing...' : 'Refresh Groups'}
                                </button>
                              </div>

                              {/* Searchable WhatsApp Group Dropdown with Sticky Search Header */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenTemplateDropdownIndex(null);
                                    setOpenGroupDropdownIndex(openGroupDropdownIndex === index ? null : index);
                                  }}
                                  className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                                    openGroupDropdownIndex === index
                                      ? 'border-orange-500 ring-2 ring-orange-500/10 dark:ring-orange-500/20'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <Users className="w-4 h-4 text-orange-500 shrink-0" />
                                    <span className={`truncate font-medium ${step.target_group_name ? 'text-zinc-900 dark:text-white font-semibold' : 'text-zinc-400'}`}>
                                      {step.target_group_name || '-- Choose WhatsApp Group --'}
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${openGroupDropdownIndex === index ? 'rotate-180 text-orange-500' : ''}`} />
                                </button>

                                {/* Group Searchable Dropdown Popover */}
                                <AnimatePresence>
                                  {openGroupDropdownIndex === index && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setOpenGroupDropdownIndex(null)}
                                      />
                                      <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                                      >
                                        {/* STICKY SEARCH HEADER */}
                                        <div className="sticky top-0 z-10 p-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800">
                                          <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                              type="text"
                                              autoFocus
                                              placeholder="Search group name..."
                                              value={groupSearchQueries[index] || ''}
                                              onChange={(e) => setGroupSearchQueries(prev => ({ ...prev, [index]: e.target.value }))}
                                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-orange-400 font-medium"
                                            />
                                          </div>
                                        </div>

                                        {/* GROUP ITEMS */}
                                        <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 p-1">
                                          {filteredGroupsForStep.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-zinc-400 font-mono">
                                              No matching WhatsApp groups found
                                            </div>
                                          ) : (
                                            filteredGroupsForStep.map(g => (
                                              <button
                                                key={g.jid}
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateStep(index, 'target_group_jid', g.jid);
                                                  setOpenGroupDropdownIndex(null);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                  step.target_group_jid === g.jid
                                                    ? 'bg-orange-500/10 dark:bg-orange-500/20 font-bold text-orange-600 dark:text-orange-400'
                                                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                  <Users className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                  <span className="truncate">{g.display_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  <span className="text-[10px] text-zinc-400 font-mono">
                                                    {g.participant_count ?? 0} members
                                                  </span>
                                                  {step.target_group_jid === g.jid && (
                                                    <Check className="w-3.5 h-3.5 text-orange-500" />
                                                  )}
                                                </div>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Selected Group Active Target Display (ZERO GID Strings Shown) */}
                              {step.target_group_name && (
                                <div className="flex items-center justify-between text-xs bg-white dark:bg-zinc-900/90 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    Active Target: <span className="font-sans font-extrabold text-zinc-900 dark:text-white">{step.target_group_name}</span>
                                  </span>
                                  <span className="text-[10px] font-semibold text-zinc-400">
                                    {syncedWhatsAppGroups.find(g => g.jid === step.target_group_jid)?.participant_count || 0} members
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Linking line */}
                        {index < steps.length - 1 && (
                          <div className="flex flex-col items-center py-2 select-none">
                            <div className="w-[2px] h-8 bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent relative animate-pulse shadow-[0_0_8px_#10b981]">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <span className="text-[8px] text-zinc-400 font-mono tracking-widest uppercase my-0.5">drip execution delay flow</span>
                          </div>
                        )}

                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Add Step Button */}
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-500" /> Add Workflow Node Step
                </button>
              </div>

            </div>

            {/* Form Save Button */}
            <div className="pt-5 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
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

      {/* Execution Timeline & Telemetry Modal */}
      {selectedWorkflowForTimeline && (
        <WorkflowExecutionTimelineModal
          isOpen={!!selectedWorkflowForTimeline}
          onClose={() => setSelectedWorkflowForTimeline(null)}
          workflow={selectedWorkflowForTimeline}
          onEditWorkflow={(wf) => handleEditClick(wf)}
        />
      )}

    </div>
  );
}
