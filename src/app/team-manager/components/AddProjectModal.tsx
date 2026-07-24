'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, User, Sparkles, AlertCircle, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import EventBlock, { EventBlockData } from './EventBlock';
import { FWProject } from '@/types';

const DEFAULT_BLOCK: EventBlockData = {
  id: '',
  subEventNames: [],
  subEventDate: '',
  venueLocation: '',
  mapLink: '',
  startTime: '10:00',
  endTime: '18:00',
  roles: ['TP', 'Ass'],
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
    { ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) },
  ]);
  const [customPrograms, setCustomPrograms] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (projectToEdit && isOpen) {
      setCouplingName(projectToEdit.client_name || '');
      if (projectToEdit.fw_sub_events && projectToEdit.fw_sub_events.length > 0) {
        const blocks: EventBlockData[] = projectToEdit.fw_sub_events.map(se => ({
          id: se.id || Math.random().toString(36).slice(2),
          subEventNames: se.event_title ? [se.event_title] : [],
          subEventDate: se.event_date || '',
          venueLocation: se.venue_name || '',
          mapLink: se.venue_map_link || '',
          startTime: se.roll_call_time || '10:00',
          endTime: se.dismissal_estimate_time || '18:00',
          roles: se.fw_assignments?.map(a => a.required_role) || ['TP', 'Ass'],
          notes: se.operational_notes || '',
        }));
        setEventBlocks(blocks);
      } else {
        setEventBlocks([{ ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) }]);
      }
    } else if (isOpen) {
      setCouplingName('');
      setEventBlocks([{ ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) }]);
    }
    setShowDeleteConfirm(false);
  }, [projectToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!couplingName.trim()) {
      setErrorMessage('Please enter a valid Client Coupling Name / Couple Profile.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await onSave(couplingName, eventBlocks, projectToEdit?.id);
      if (result !== false) {
        setCouplingName('');
        setEventBlocks([{ ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) }]);
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
      onClose();
    }
  };

  const addEventBlock = () => {
    setEventBlocks(prev => [
      ...prev,
      {
        ...DEFAULT_BLOCK,
        id: Math.random().toString(36).slice(2),
        subEventNames: [],
      },
    ]);
  };

  const removeEventBlock = (id: string) => {
    setEventBlocks(prev => prev.filter(b => b.id !== id));
  };

  const duplicateEventBlock = (block: EventBlockData) => {
    setEventBlocks(prev => [
      ...prev,
      { ...block, id: Math.random().toString(36).slice(2) },
    ]);
  };

  const updateEventBlock = (id: string, fields: Partial<EventBlockData>) => {
    setEventBlocks(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
  };

  const toggleRoleInBlock = (blockId: string, role: string) => {
    setEventBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const roles = b.roles.includes(role)
        ? b.roles.filter(r => r !== role)
        : [...b.roles, role];
      return { ...b, roles };
    }));
  };

  const handleAddCustomProgram = (name: string) => {
    setCustomPrograms(prev => prev.includes(name) ? prev : [...prev, name]);
  };

  const handleAddCustomRole = (role: string) => {
    setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4">
          {/* GLASSMORPHISM BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* 3D MODAL CHASSIS */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-white w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-[24px] border border-slate-200 shadow-2xl"
          >
            {/* CLEAN PROFESSIONAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6C5CE7] flex items-center justify-center text-white shadow-md shadow-[#6C5CE7]/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B111E] tracking-tight">
                    {projectToEdit ? 'Edit Wedding Project' : 'Create Wedding Project'}
                  </h3>
                  <p className="text-xs text-[#4F5E74] font-semibold mt-0.5">
                    {projectToEdit ? `Updating configuration for ${projectToEdit.client_name}` : 'Configure client profile and program event blocks.'}
                  </p>
                </div>
              </div>

              {/* TOP RIGHT ACTIONS: DELETE BUTTON (WHEN EDITING) & CLOSE BUTTON */}
              <div className="flex items-center gap-2">
                {projectToEdit && onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200"
                    title="Move Project to Trash"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span className="hidden sm:inline">Delete Card</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#4F5E74] flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-bold shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="block font-extrabold">Database Operation Warning</span>
                  <span className="font-medium text-[11px] text-rose-700">{errorMessage}</span>
                </div>
                <button 
                  onClick={() => setErrorMessage(null)} 
                  className="text-rose-400 hover:text-rose-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/60">

              {/* CLIENT NAME INPUT CARD */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <label className="text-xs font-bold text-[#0B111E] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-[#6C5CE7]" />
                  Client Coupling Name / Couple Profile
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma & Malhotra"
                  value={couplingName}
                  onChange={(e) => {
                    setCouplingName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white px-4 py-3 rounded-xl text-[#0B111E] font-bold text-base placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* DYNAMIC SUB-EVENT BLOCKS CONTAINER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#0B111E] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#6C5CE7]" />
                    Wedding Sub-Events & Requirements
                  </span>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-[#6C5CE7] text-xs font-bold border border-indigo-100">
                    {eventBlocks.length} Block{eventBlocks.length === 1 ? '' : 's'} Configured
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  {eventBlocks.map((block, index) => (
                    <EventBlock
                      key={block.id}
                      block={block}
                      index={index}
                      totalBlocks={eventBlocks.length}
                      onUpdate={updateEventBlock}
                      onRemove={removeEventBlock}
                      onDuplicate={duplicateEventBlock}
                      onAddCustomProgram={handleAddCustomProgram}
                      onAddCustomRole={handleAddCustomRole}
                      onToggleRole={toggleRoleInBlock}
                    />
                  ))}
                </AnimatePresence>

                {/* ADD ANOTHER SUB-EVENT BLOCK BUTTON */}
                <button
                  type="button"
                  onClick={addEventBlock}
                  className="w-full py-3.5 px-4 bg-white hover:bg-indigo-50/50 border-2 border-dashed border-indigo-200 text-[#6C5CE7] font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#6C5CE7]" />
                  + Add Another Sub-Event Block
                </button>
              </div>
            </div>

            {/* FOOTER ACTIONS BAR */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#4F5E74] font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-md shadow-[#6C5CE7]/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Project...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Project Config
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CONFIRMATION MODAL POPUP FOR DELETING PROJECT CARD */}
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
                Are you sure you want to move <span className="font-extrabold text-slate-900">&quot;{couplingName || projectToEdit?.client_name}&quot;</span> to Trash? You can restore it anytime from the Trash tab.
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
    </AnimatePresence>
  );
}
