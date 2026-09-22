'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Camera,
  CheckCircle,
  Building,
  Film,
  Calendar,
  Layers,
} from 'lucide-react';
import { PHOTOGRAPHY_TEMPLATES } from '@/lib/services/taskService';

interface PhotographyTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (templateId: string, clientId?: string, projectId?: string) => Promise<void>;
  clients: Array<{ id: string; name: string; event_type?: string }>;
}

export function PhotographyTemplatesModal({
  isOpen,
  onClose,
  onApplyTemplate,
  clients,
}: PhotographyTemplatesModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(PHOTOGRAPHY_TEMPLATES[0].id);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const currentTemplate = PHOTOGRAPHY_TEMPLATES.find((t) => t.id === selectedTemplateId) || PHOTOGRAPHY_TEMPLATES[0];

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyTemplate(selectedTemplateId, selectedClientId || undefined);
      onClose();
    } catch (err) {
      console.error('Error applying template:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-xl shadow-xs">
              ✨
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Photography Workflow Templates
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Apply pre-built studio pipelines with all stages and checklists in 1 click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Select Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PHOTOGRAPHY_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 shadow-xs'
                      : 'bg-white dark:bg-stone-800 border-slate-200 dark:border-stone-700 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{tmpl.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-600 mt-2 block">
                    {tmpl.stages.length} Stages Included
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Link to Client */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Link to Client (Optional)
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
          >
            <option value="">No Client Linked (Create General Tasks)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.event_type ? `(${c.event_type})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Preview Stages */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Stages Preview
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-stone-950 border border-slate-100 dark:border-stone-800 text-xs">
            {currentTemplate.stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white dark:bg-stone-900 border border-slate-100 dark:border-stone-800">
                <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                  {stage.title}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-400 uppercase">
                  {stage.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {isApplying ? 'Creating Tasks...' : 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
