"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, User, Sparkles, AlertCircle, Loader2, Save, Trash2, 
  AlertTriangle, CheckCircle2, RotateCcw, ShieldCheck 
} from 'lucide-react';
import EventBlock, { EventBlockData } from './EventBlock';
import { FWProject } from '@/types';
import { supabase } from '@/lib/supabase';

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
  isDateTbd: false,
  isOvernight: false,
  endDate: '',
  venueLocation: '',
  mapLink: '',
  startTime: '00:00 AM',
  endTime: '00:00 AM',
  roles: [],
  notes: '',
};

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: FWProject | null;
  initialDate?: string;
  onSave: (couplingName: string, blocks: EventBlockData[], projectId?: string) => Promise<boolean | void> | void;
  onDeleteProject?: (projectId: string) => void;
  workspaceId?: string;
}

const DRAFT_KEY_PREFIX = 'fw_event_form_draft_';

export default function AddProjectModal({
  isOpen,
  onClose,
  projectToEdit,
  initialDate,
  onSave,
  onDeleteProject,
  workspaceId = 'default',
}: AddProjectModalProps) {
  const [couplingName, setCouplingName] = useState('');
  const [eventBlocks, setEventBlocks] = useState<EventBlockData[]>([
    { ...DEFAULT_BLOCK, id: generateUniqueId(), subEventDate: initialDate || '', roles: [] },
  ]);
  const [customPrograms, setCustomPrograms] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Validation State
  const [validatedAttempt, setValidatedAttempt] = useState(false);
  const [validationAlert, setValidationAlert] = useState<{ title: string; issues: string[] } | null>(null);

  const draftKey = `${DRAFT_KEY_PREFIX}${workspaceId}`;

  const resetFormState = () => {
    setCouplingName('');
    setEventBlocks([{ ...DEFAULT_BLOCK, id: generateUniqueId(), subEventDate: initialDate || '', roles: [] }]);
    setCustomPrograms([]);
    setCustomRoles([]);
    setValidatedAttempt(false);
    setValidationAlert(null);
    setErrorMessage(null);
    setShowDeleteConfirm(false);
    setIsDraftRestored(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }
  };

  // Load project or restore draft
  useEffect(() => {
    if (projectToEdit && isOpen) {
      setCouplingName(projectToEdit.client_name || '');
      if (projectToEdit.fw_sub_events && projectToEdit.fw_sub_events.length > 0) {
        const blocks: EventBlockData[] = projectToEdit.fw_sub_events.map(se => ({
          id: se.id || generateUniqueId(),
          subEventNames: se.event_title ? [se.event_title] : [],
          subEventDate: se.event_date || '',
          isDateTbd: Boolean((se as any).is_date_tbd),
          isOvernight: Boolean((se as any).is_overnight),
          endDate: (se as any).end_date || '',
          venueLocation: se.venue_name || '',
          mapLink: se.venue_map_link || '',
          startTime: (se as any).start_time_12h || se.roll_call_time || '10:00 AM',
          endTime: (se as any).end_time_12h || se.dismissal_estimate_time || '06:00 PM',
          shiftSlot: (se as any).shift_hours_slot || '',
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
      // Check for saved local draft for new projects
      let hasDraft = false;
      if (typeof window !== 'undefined') {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.couplingName || (parsed.eventBlocks && parsed.eventBlocks.length > 0)) {
              setCouplingName(parsed.couplingName || '');
              setEventBlocks(parsed.eventBlocks || [{ ...DEFAULT_BLOCK, id: generateUniqueId(), roles: [] }]);
              setIsDraftRestored(true);
              hasDraft = true;
            }
          } catch (_) {}
        }
      }
      if (!hasDraft) {
        resetFormState();
      }
    }
  }, [projectToEdit, isOpen, draftKey]);

  // Debounced auto-save draft for new events
  useEffect(() => {
    if (!isOpen || projectToEdit) return;

    const timer = setTimeout(() => {
      if (couplingName.trim() || eventBlocks.some(b => b.subEventNames.length > 0 || b.venueLocation)) {
        if (typeof window !== 'undefined') {
          const payload = { couplingName, eventBlocks, updatedAt: Date.now() };
          localStorage.setItem(draftKey, JSON.stringify(payload));
        }

        // Silent Supabase draft save if user authenticated
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && workspaceId) {
              await supabase.from('event_form_drafts').upsert({
                workspace_id: workspaceId,
                user_id: session.user.id,
                draft_payload: { couplingName, eventBlocks },
                updated_at: new Date().toISOString(),
              }, { onConflict: 'workspace_id, user_id' });
            }
          } catch (_) {}
        })();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [couplingName, eventBlocks, isOpen, projectToEdit, draftKey, workspaceId]);

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
      if (!block.isDateTbd && !block.subEventDate) {
        issues.push(`Event #${idx + 1}: Program Date (Required or mark Date Not Fixed)`);
      }
    });

    if (issues.length > 0) {
      setValidationAlert({
        title: 'Missing Mandatory Information',
        issues,
      });

      // Smooth scroll directly to the first invalid field or error block
      setTimeout(() => {
        const errorInput = document.querySelector('[data-has-error="true"]') || 
                           document.querySelector('.border-rose-500') ||
                           document.querySelector('.border-rose-400') ||
                           document.getElementById('coupling-name-input');
        if (errorInput) {
          errorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (errorInput instanceof HTMLElement) {
            errorInput.focus();
          }
        }
      }, 100);
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
      { ...DEFAULT_BLOCK, id: generateUniqueId(), roles: [] },
    ]);
  };

  const updateEventBlock = (id: string, fields: Partial<EventBlockData>) => {
    setEventBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, ...fields } : b))
    );
  };

  const removeEventBlock = (id: string) => {
    if (eventBlocks.length <= 1) return;
    setEventBlocks(prev => prev.filter(b => b.id !== id));
  };

  const duplicateEventBlock = (sourceBlock: EventBlockData) => {
    setEventBlocks(prev => [
      ...prev,
      {
        ...sourceBlock,
        id: generateUniqueId(),
      },
    ]);
  };

  const handleAddCustomProgram = (name: string) => {
    if (name && !customPrograms.includes(name)) {
      setCustomPrograms(prev => [...prev, name]);
    }
  };

  const handleAddCustomRole = (role: string) => {
    if (role && !customRoles.includes(role)) {
      setCustomRoles(prev => [...prev, role]);
    }
  };

  const handleToggleRole = (blockId: string, role: string) => {
    setEventBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockId) return b;
        const exists = b.roles.includes(role);
        return {
          ...b,
          roles: exists ? b.roles.filter(r => r !== role) : [...b.roles, role],
        };
      })
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#FEFDF8] border-2 border-amber-200/90 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* ABSOLUTE TOP-RIGHT CORNER CRISP CLOSE BUTTON */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-30 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center cursor-pointer shadow-md transition"
            title="Close Modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* HEADER BAR */}
          <div className="p-3 sm:p-4 border-b border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/60 flex items-center justify-between pr-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-amber-950">
                    {projectToEdit ? 'Edit Event' : 'Add New Event'}
                  </h3>
                  {isDraftRestored && !projectToEdit && (
                    <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                      Auto-Draft
                    </span>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] font-medium text-zinc-500">
                  Configure client couple profile, multi-day functions, overnight shoots, and crew placements.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isDraftRestored && !projectToEdit && (
                <button
                  type="button"
                  onClick={resetFormState}
                  className="px-2 py-0.5 text-[9px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                  title="Discard cached draft"
                >
                  Discard
                </button>
              )}
            </div>
          </div>

          {/* SCROLLABLE BODY CONTENT */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* 1. CLIENT COUPLE PROFILE INPUT */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-amber-200/90 shadow-2xs space-y-1.5">
              <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider block flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                <span>Client Couple Name / Project Title</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul & Sneha (Wedding)"
                value={couplingName}
                onChange={(e) => setCouplingName(e.target.value)}
                className={`w-full h-8 px-3 bg-[#FEFDF8] border rounded-lg text-sm sm:text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition ${
                  validatedAttempt && !couplingName.trim()
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-amber-200/90 focus:border-amber-500'
                }`}
              />
            </div>

            {/* 2. VALIDATION ALERT IF ANY */}
            {validationAlert && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-black text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{validationAlert.title}</span>
                </div>
                <ul className="list-disc list-inside text-[11px] font-bold text-rose-700 pl-2">
                  {validationAlert.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. SUB-EVENT BLOCKS LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <span>Wedding Programs & Coverage Breakdown ({eventBlocks.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={addEventBlock}
                  className="h-7 px-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5"/>
                  <span>Add Event</span>
                </button>
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
                  onAddCustomRole={handleAddCustomRole}
                  onToggleRole={handleToggleRole}
                  hasProgramTypeError={validatedAttempt && block.subEventNames.length === 0}
                  hasDateError={validatedAttempt && !block.isDateTbd && !block.subEventDate}
                />
              ))}

              {/* BOTTOM ADD EVENT BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={addEventBlock}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/60 hover:bg-amber-100/80 text-amber-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Add Event</span>
                </button>
              </div>
            </div>
          </div>

          {/* FOOTER ACTION BAR */}
          <div className="p-2.5 sm:p-3 border-t border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/60 flex items-center justify-between gap-2">
            {projectToEdit && onDeleteProject ? (
              <div>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-700">Are you sure?</span>
                    <button
                      type="button"
                      onClick={handleDeleteConfirmed}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project</span>
                  </button>
                )}
              </div>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-7.5 px-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="h-7.5 px-4 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Project...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{projectToEdit ? 'Save Changes' : 'Create Project'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
