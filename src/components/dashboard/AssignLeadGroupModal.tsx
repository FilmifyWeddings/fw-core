'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Workflow,
  Sparkles,
  Phone,
  User,
  Clock,
} from 'lucide-react';
import { Lead } from '@/types';

interface AssignLeadGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  targetAction?: 'welcome' | 'followup' | null;
  contactGroups: Array<{ id: string; group_name: string }>;
  workspaceId: string;
  onAssigned: (leadId: string, groupId: string) => void;
}

export function AssignLeadGroupModal({
  isOpen,
  onClose,
  lead,
  targetAction,
  contactGroups,
  workspaceId,
  onAssigned,
}: AssignLeadGroupModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [checkedWorkflowIds, setCheckedWorkflowIds] = useState<string[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize group on open
  useEffect(() => {
    if (isOpen && contactGroups.length > 0) {
      if (!selectedGroupId || !contactGroups.some(g => g.id === selectedGroupId)) {
        setSelectedGroupId(contactGroups[0].id);
      }
      setErrorMsg(null);
    }
  }, [isOpen, contactGroups]);

  // Fetch workflows when group changes
  useEffect(() => {
    if (!isOpen || !selectedGroupId || !workspaceId) {
      setActiveWorkflows([]);
      setCheckedWorkflowIds([]);
      return;
    }

    let isMounted = true;
    setLoadingWorkflows(true);

    async function fetchGroupWorkflows() {
      try {
        const effectiveWs = workspaceId || lead?.workspace_id || '';
        const res = await fetch(
          `/api/integrations/whatsapp/workflows?tenant_id=${effectiveWs}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.success && Array.isArray(data.results)) {
          const wfs = data.results.filter(
            (w: any) => w.target_group_id === selectedGroupId && w.status === 'Active'
          );
          setActiveWorkflows(wfs);

          // If opened via specific action (e.g. welcome or followup), prefer that workflow
          if (targetAction === 'welcome') {
            const welcomeWf = wfs.find((w: any) =>
              (w.workflow_name || '').toLowerCase().includes('welcome')
            );
            setCheckedWorkflowIds(welcomeWf ? [welcomeWf.id] : wfs.map((w: any) => w.id));
          } else if (targetAction === 'followup') {
            const followWf = wfs.find((w: any) =>
              (w.workflow_name || '').toLowerCase().includes('follow')
            );
            setCheckedWorkflowIds(followWf ? [followWf.id] : wfs.map((w: any) => w.id));
          } else {
            setCheckedWorkflowIds(wfs.map((w: any) => w.id));
          }
        } else {
          if (isMounted) {
            setActiveWorkflows([]);
            setCheckedWorkflowIds([]);
          }
        }
      } catch (err: any) {
        console.error('Error fetching workflows for group:', err);
      } finally {
        if (isMounted) setLoadingWorkflows(false);
      }
    }

    fetchGroupWorkflows();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedGroupId, workspaceId, targetAction]);

  if (!isOpen || !lead) return null;

  const toggleWorkflow = (wfId: string) => {
    setCheckedWorkflowIds(prev =>
      prev.includes(wfId) ? prev.filter(id => id !== wfId) : [...prev, wfId]
    );
  };

  const handleAssign = async () => {
    if (!selectedGroupId) {
      setErrorMsg('Please select a WhatsApp Contact Group.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/integrations/whatsapp/workflows/bulk-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: [lead.id],
          groupId: selectedGroupId,
          workflowIds: checkedWorkflowIds,
          delayValue: 2,
          delayUnit: 'seconds',
          workspaceId: workspaceId || lead.workspace_id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign group');
      }

      onAssigned(lead.id, selectedGroupId);
      onClose();
    } catch (err: any) {
      console.error('Error assigning group to lead:', err);
      setErrorMsg(err.message || 'Failed to assign WhatsApp group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Creamy Minimal Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          className="relative z-10 w-full max-w-lg bg-[#FAF8F5] dark:bg-[#181614] border border-[#E8E5DF] dark:border-[#2C2926] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Amber-Emerald Accent Ribbon */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />

          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1816] dark:text-[#F4F2ED]">
                  Assign WhatsApp Contact Group
                </h3>
                <p className="text-xs text-[#7A756D] dark:text-[#9E988F]">
                  Select a Contact Group to activate automated WhatsApp workflows.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7A756D] hover:text-[#1A1816] dark:text-[#9E988F] dark:hover:text-[#F4F2ED] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* Soft Creamy Alert Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                  No Group Assigned
                </h4>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  This lead is not enrolled in any WhatsApp Contact Group yet. Assign a group below to start automated Welcome or Follow-up workflows.
                </p>
              </div>
            </div>

            {/* Lead Summary Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A756D] dark:text-[#9E988F] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" /> Lead Name
                </span>
                <span className="font-bold text-[#1A1816] dark:text-[#F4F2ED]">
                  {lead.name || 'Unnamed Client'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A756D] dark:text-[#9E988F] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" /> Phone
                </span>
                <span className="font-mono font-medium text-[#1A1816] dark:text-[#F4F2ED]">
                  {lead.phone}
                </span>
              </div>
            </div>

            {/* Group Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] flex items-center justify-between">
                <span>Select Target Contact Group</span>
                <span className="text-[11px] text-[#7A756D] dark:text-[#9E988F]">
                  WhatsApp Group
                </span>
              </label>

              {contactGroups.length === 0 ? (
                <div className="p-3 rounded-xl bg-white dark:bg-[#201E1B] border border-dashed border-[#E8E5DF] dark:border-[#2C2926] text-xs text-[#7A756D] text-center">
                  No Contact Groups found. Create one in WhatsApp Web &gt; Groups first.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-medium text-[#1A1816] dark:text-[#F4F2ED] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 pr-9 cursor-pointer shadow-2xs"
                  >
                    {contactGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        💬 {g.group_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7A756D] dark:text-[#9E988F] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Workflows Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#403C36] dark:text-[#C8C3BA] flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-emerald-500" />
                  Automated Workflow(s) to Trigger
                </span>
                <span className="text-[10px] text-[#7A756D] dark:text-[#9E988F]">
                  {checkedWorkflowIds.length} Selected
                </span>
              </div>

              {loadingWorkflows ? (
                <div className="p-4 rounded-xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-center gap-2 text-xs text-[#7A756D]">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  Loading group workflows...
                </div>
              ) : activeWorkflows.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#201E1B] border border-dashed border-[#E8E5DF] dark:border-[#2C2926] text-xs text-[#7A756D] text-center">
                  No active workflows attached to this group. Lead will be assigned to group only.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeWorkflows.map((wf) => {
                    const isChecked = checkedWorkflowIds.includes(wf.id);
                    return (
                      <div
                        key={wf.id}
                        onClick={() => toggleWorkflow(wf.id)}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                            : 'bg-white dark:bg-[#201E1B] border-[#E8E5DF] dark:border-[#2C2926] text-[#403C36] dark:text-[#C8C3BA] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleWorkflow(wf.id)}
                            className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                          />
                          <span className="font-bold truncate">{wf.workflow_name}</span>
                        </div>
                        <span className="text-[10px] text-[#7A756D] dark:text-[#9E988F] font-mono shrink-0">
                          {wf.workflow_steps?.length || 0} steps
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[#E8E5DF] dark:border-[#2C2926] bg-white dark:bg-[#1E1C19] flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-4 rounded-xl border border-[#E8E5DF] dark:border-[#2C2926] bg-white dark:bg-[#201E1B] hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting || !selectedGroupId}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Assign Group &amp; Start
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
