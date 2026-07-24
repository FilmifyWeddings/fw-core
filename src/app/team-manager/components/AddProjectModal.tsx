'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, User, Sparkles, AlertCircle, Loader2, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import EventBlock, { EventBlockData } from './EventBlock';
import { FWProject } from '@/types';

// Robust unique UUID generator for sub-event blocks
const generateUniqueId = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `se-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const DEFAULT_BLOCK: EventBlockData = {
  id: '',
  subEventNames: [],
  subEventDate: '',
  venueLocation: '',
  mapLink: '',
  startTime: '10:00',
  endTime: '18:00',
  roles: [],
  notes: '',
};

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: FWProject | null;
  onSave: (couplingName: string, blocks: EventBlockData[], projectId?: string) => Promise<boolean | void> | void;
  onDeleteProject?: (projectId: string) => void;
}

export default function AddProjectModal({
  isOpen,
  onClose,
  projectToEdit,
  onSave,
  onDeleteProject,
}: AddProjectModalProps) {
  const [couplingName, setCouplingName] = useState('');
  const [eventBlocks, setEventBlocks] = useState<EventBlockData[]>([
    { ...DEFAULT_BLOCK, id: generateUniqueId(), roles: [] },
  ]);
  const [customPrograms, setCustomPrograms] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Validation State
  const [validatedAttempt, setValidatedAttempt] = useState(false);
  const [validationAlert, setValidationAlert] = useState<{ title: string; issues: string[] } | null>(null);

  const resetFormState = () => {
    setCouplingName('');
    setEventBlocks([{ ...DEFAULT_BLOCK, id: generateUniqueId(), roles: [] }]);
    setCustomPrograms([]);
    setCustomRoles([]);
    setValidatedAttempt(false);
    setValidationAlert(null);
    setErrorMessage(null);
    setShowDeleteConfirm(false);
  };

  useEffect(() => {
    if (projectToEdit && isOpen) {
      setCouplingName(projectToEdit.client_name || '');
      if (projectToEdit.fw_sub_events && projectToEdit.fw_sub_events.length > 0) {
        const blocks: EventBlockData[] = projectToEdit.fw_sub_events.map(se => ({
          id: se.id || generateUniqueId(),
          subEventNames: se.event_title ? [se.event_title] : [],
          subEventDate: se.event_date || '',
          venueLocation: se.venue_name || '',
          mapLink: se.venue_map_link || '',
          startTime: se.roll_call_time || '10:00',
          endTime: se.dismissal_estimate_time || '18:00',
          roles: se.fw_assignments && se.fw_assignments.length > 0
            ? se.fw_assignments.map(a => a.required_role)
            : ((se as any).roles || (se as any).event_roles || []),
          notes: se.operational_notes || '',
        }));
        setEventBlocks(blocks);
      } else {
        setEventBlocks([{ ...DEFAULT_BLOCK, id: generateUniqueId(), roles: [] }]);
      }
    } else if (isOpen) {
      resetFormState();
    }
  }, [projectToEdit, isOpen]);

  const handleSubmit = async () => {
    setValidatedAttempt(true);
    const issues: string[] = [];

    if (!couplingName.trim()) {
      issues.push('Client Couple Name / Profile (Required)');
    }

    eventBlocks.forEach((block, idx) => {
      if (block.subEventNames.length === 0) {
        issues.push(`Event #${idx + 1}: Wedding Program Type (Required)`);
      }
      if (!block.subEventDate) {
        issues.push(`Event #${idx + 1}: Program Date (Required)`);
      }
    });

    if (issues.length > 0) {
      setValidationAlert({
        title: 'Missing Mandatory Information',
        issues,
      });
      return;
    }

    setValidationAlert(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await onSave(couplingName, eventBlocks, projectToEdit?.id);
      if (result !== false) {
        resetFormState();
        onClose();
      }
    } catch (err: any) {
      console.error('[AddProjectModal] Submit error:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmed = () => {
    if (projectToEdit && onDeleteProject) {
      onDeleteProject(projectToEdit.id);
      setShowDeleteConfirm(false);
      resetFormState();
      onClose();
    }
  };

  const addEventBlock = () => {
    setEventBlocks(prev => [
      ...prev,
      {
        ...DEFAULT_BLOCK,
        id: generateUniqueId(),
        subEventNames: [],
        roles: [],
      },
    ]);
  };

  const removeEventBlock = (id: string) => {
    setEventBlocks(prev => prev.filter(b => b.id !== id));
  };

  const duplicateEventBlock = (block: EventBlockData) => {
    setEventBlocks(prev => [
      ...prev,
      { ...block, id: generateUniqueId() },
    ]);
  };

  const updateEventBlock = (id: string, fields: Partial<EventBlockData>) => {
    setEventBlocks(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
  };

  const toggleRoleInBlock = (blockId: string, role: string) => {
    setEventBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const currentRoles = b.roles || [];
      const roles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      return { ...b, roles };
    }));
  };

  const handleAddCustomProgram = (name: string) => {
    setCustomPrograms(prev => prev.includes(name) ? prev : [...prev, name]);
  };

  const handleAddCustomRole = (blockId: string, role: string) => {
    setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
    setEventBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const currentRoles = b.roles || [];
      if (!currentRoles.includes(role)) {
        return { ...b, roles: [...currentRoles, role] };
      }
      return b;
    }));
  };

  const isCouplingNameError = validatedAttempt && !couplingName.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* MINIMAL MODAL HEADER */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#6C5CE7] flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0B111E] tracking-tight">
                    {projectToEdit ? 'Edit Project Configuration' : 'Create New Wedding Project'}
                  </h3>
                  <p className="text-xs text-[#4F5E74] font-semibold">
                    Set up client profile, sub-events, and crew allocations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {projectToEdit && onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Delete Project Card"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete Card</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* CLIENT NAME INPUT */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 space-y-2 shadow-2xs">
                <label className="text-xs font-black text-[#0B111E] uppercase tracking-wider block flex items-center gap-1">
                  <span>Client Couple Name / Profile</span>
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couplingName}
                    onChange={(e) => setCouplingName(e.target.value)}
                    placeholder="e.g. Prakash & Mage Wedding"
                    className={`w-full bg-[#F8F9FD] border-2 pl-10 pr-4 py-2.5 rounded-xl text-xs font-extrabold text-[#0B111E] placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                      isCouplingNameError
                        ? 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse bg-rose-50/50'
                        : 'border-slate-200 focus:border-[#6C5CE7] focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* MULTI SUB-EVENT BLOCKS LIST */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black text-[#0B111E] uppercase tracking-wider">
                    Sub-Events Breakdown ({eventBlocks.length})
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Required fields marked with <span className="text-rose-500 font-black">*</span>
                  </span>
                </div>

                {eventBlocks.map((block, idx) => (
                  <EventBlock
                    key={block.id}
                    block={block}
                    index={idx}
                    totalBlocks={eventBlocks.length}
                    onUpdate={updateEventBlock}
                    onRemove={removeEventBlock}
                    onDuplicate={duplicateEventBlock}
                    onAddCustomProgram={handleAddCustomProgram}
                    onAddCustomRole={(role) => handleAddCustomRole(block.id, role)}
                    onToggleRole={toggleRoleInBlock}
                    hasProgramTypeError={validatedAttempt && block.subEventNames.length === 0}
                    hasDateError={validatedAttempt && !block.subEventDate}
                  />
                ))}

                <button
                  type="button"
                  onClick={addEventBlock}
                  className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-[#6C5CE7] bg-indigo-50/50 hover:bg-indigo-50 text-[#6C5CE7] font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  + Add Another Sub-Event
                </button>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-black px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#6C5CE7]/25 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Project...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Project Configuration
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* VALIDATION ERROR ALERT POPUP MODAL */}
          {validationAlert && (
            <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#0B111E]">{validationAlert.title}</h3>
                  <p className="text-xs font-semibold text-[#4F5E74]">
                    Please complete all mandatory fields highlighted in <span className="text-rose-600 font-black">blinking red</span> before saving:
                  </p>
                  <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-left space-y-1 max-h-36 overflow-y-auto">
                    {validationAlert.issues.map((issue, idx) => (
                      <div key={idx} className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setValidationAlert(null)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  Understand & Fix Missing Fields
                </button>
              </motion.div>
            </div>
          )}

          {/* CONFIRMATION MODAL FOR DELETING CARD */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-[#0B111E]">Move Project to Trash?</h3>
                  <p className="text-xs font-semibold text-[#4F5E74]">
                    Are you sure you want to move <span className="font-extrabold text-slate-900">&quot;{couplingName}&quot;</span> to Trash? You can restore it anytime from the Trash tab.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirmed}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition shadow-md shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move to Trash
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
