'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Workflow,
  Loader2,
  ShieldAlert,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Lead } from '@/types';

interface BulkGroupEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  leads: Lead[];
  contactGroups: Array<{ id: string; group_name: string }>;
  workspaceId: string;
  onComplete: () => void;
}

export function BulkGroupEnrollModal({
  isOpen,
  onClose,
  selectedLeadIds,
  leads,
  contactGroups,
  workspaceId,
  onComplete,
}: BulkGroupEnrollModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [checkedWorkflowIds, setCheckedWorkflowIds] = useState<string[]>([]);
  const [delayValue, setDelayValue] = useState<number>(5);
  const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('minutes');
  const [loadingWorkflows, setLoadingWorkflows] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Selected leads objects
  const selectedLeads = useMemo(() => {
    return leads.filter(l => selectedLeadIds.includes(l.id));
  }, [leads, selectedLeadIds]);

  // Default to first contact group on open
  useEffect(() => {
    if (isOpen) {
      if (contactGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(contactGroups[0].id);
      }
    }
  }, [isOpen, contactGroups]);

  // Fetch workflows when target group changes
  useEffect(() => {
    if (!isOpen || !selectedGroupId || selectedGroupId === 'none') {
      setActiveWorkflows([]);
      setCheckedWorkflowIds([]);
      return;
    }

    setLoadingWorkflows(true);
    fetch(`/api/integrations/whatsapp/workflows?tenant_id=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.results)) {
          const matching = data.results.filter(
            (w: any) => w.target_group_id === selectedGroupId && w.status === 'Active'
          );
          setActiveWorkflows(matching);
          // Check all active workflows by default
          setCheckedWorkflowIds(matching.map((w: any) => w.id));
        } else {
          setActiveWorkflows([]);
          setCheckedWorkflowIds([]);
        }
      })
      .catch(() => {
        setActiveWorkflows([]);
        setCheckedWorkflowIds([]);
      })
      .finally(() => {
        setLoadingWorkflows(false);
      });
  }, [isOpen, selectedGroupId, workspaceId]);

  // Duplicate analysis
  const duplicateAnalysis = useMemo(() => {
    const seen = new Set<string>();
    let batchDuplicates = 0;
    const sampleDupPhones: string[] = [];

    selectedLeads.forEach(l => {
      const clean = (l.phone || '').replace(/[^0-9]/g, '');
      if (!clean) return;
      if (seen.has(clean)) {
        batchDuplicates++;
        if (sampleDupPhones.length < 3) sampleDupPhones.push(clean);
      } else {
        seen.add(clean);
      }
    });

    return {
      batchDuplicates,
      sampleDupPhones,
      uniqueCount: selectedLeads.length - batchDuplicates,
    };
  }, [selectedLeads]);

  // Toggle workflow checkbox
  const handleToggleWorkflow = (wfId: string) => {
    setCheckedWorkflowIds(prev =>
      prev.includes(wfId) ? prev.filter(id => id !== wfId) : [...prev, wfId]
    );
  };

  const handleSelectAllWorkflows = () => {
    if (checkedWorkflowIds.length === activeWorkflows.length) {
      setCheckedWorkflowIds([]);
    } else {
      setCheckedWorkflowIds(activeWorkflows.map(w => w.id));
    }
  };

  // Submit enrollment
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const targetGroup = selectedGroupId === 'none' ? null : selectedGroupId;
      const res = await fetch('/api/integrations/whatsapp/workflows/bulk-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          groupId: targetGroup,
          workflowIds: targetGroup ? checkedWorkflowIds : [],
          delayValue,
          delayUnit,
          workspaceId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to enroll leads');
      }

      alert(`✅ ${data.message || 'Leads successfully enrolled with anti-ban pacing!'}`);
      onComplete();
      onClose();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-xl bg-white dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />

          {/* Header */}
          <div className="p-5 border-b border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
                  Assign WA Group & Workflows
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {selectedLeadIds.length} Selected
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Select group, target drip workflows, pacing delay, and anti-ban safeguards.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scroller-thin">
            {/* 1. Target WhatsApp Group Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                Target Contact Group:
              </label>
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={e => setSelectedGroupId(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 pr-10 cursor-pointer"
                >
                  <option value="none">Unassigned / None (Remove from group)</option>
                  {contactGroups.map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.group_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. 3D Workflow Selector (Checkboxes) */}
            {selectedGroupId !== 'none' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Workflow className="w-4 h-4 text-amber-500" />
                    Automated Workflows to Trigger:
                  </label>
                  {activeWorkflows.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllWorkflows}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {checkedWorkflowIds.length === activeWorkflows.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {loadingWorkflows ? (
                  <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Loading group workflows...</span>
                  </div>
                ) : activeWorkflows.length === 0 ? (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center text-xs text-zinc-500">
                    No active workflows found for this group. Leads will be assigned to the group without automated drips.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeWorkflows.map(wf => {
                      const isChecked = checkedWorkflowIds.includes(wf.id);
                      const stepsCount = wf.workflow_steps?.length || 0;
                      return (
                        <div
                          key={wf.id}
                          onClick={() => handleToggleWorkflow(wf.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                isChecked
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                                {wf.workflow_name}
                              </span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate font-mono mt-0.5">
                                {stepsCount} steps · {wf.execution_count || 0} runs executed
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            Active
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. Inter-Lead Pacing Delay */}
            {selectedGroupId !== 'none' && checkedWorkflowIds.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Inter-Lead Pacing Delay:
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">Anti-Ban Spacing</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={delayValue}
                    onChange={e => setDelayValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <select
                    value={delayUnit}
                    onChange={e => setDelayUnit(e.target.value as any)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="seconds">Seconds (Paced)</option>
                    <option value="minutes">Minutes (Standard)</option>
                    <option value="hours">Hours (Drip)</option>
                    <option value="days">Days (Extended)</option>
                  </select>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  💡 Lead 1 will be triggered at <strong className="text-zinc-700 dark:text-zinc-300">T0</strong>. Subsequent leads will be staggered by{' '}
                  <strong className="text-zinc-700 dark:text-zinc-300">
                    {delayValue} {delayUnit}
                  </strong>{' '}
                  + random anti-ban jitter to ensure natural, humanized delivery.
                </p>
              </div>
            )}

            {/* 4. Duplicate Lead Phone Protection Banner */}
            {duplicateAnalysis.batchDuplicates > 0 && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block">
                    {duplicateAnalysis.batchDuplicates} Duplicate Phone(s) Detected
                  </span>
                  <p className="text-rose-600/90 dark:text-rose-400/80 text-[11px] mt-0.5">
                    Duplicate contacts ({duplicateAnalysis.sampleDupPhones.slice(0, 2).map(p => '+' + p).join(', ')}) will be tagged with{' '}
                    <span className="font-mono font-bold uppercase">"Duplicate"</span> on your CRM table. Workflows will NOT be re-dispatched to them to prevent spam flags.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[#E8E5DF] dark:border-[#2C2926] bg-zinc-50 dark:bg-[#161514] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enrolling Leads...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {selectedGroupId === 'none'
                      ? 'Unassign Selected Leads'
                      : `Assign & Enroll (${duplicateAnalysis.uniqueCount} Unique)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
