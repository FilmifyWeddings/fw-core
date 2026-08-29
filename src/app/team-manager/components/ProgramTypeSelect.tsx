'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Plus, Search } from 'lucide-react';
import { WorkspaceEventType, fetchWorkspaceEventTypes, saveWorkspaceEventType, DEFAULT_EVENT_TYPES } from '@/lib/workspace-settings';

interface ProgramTypeSelectProps {
  selected: string[];
  onChange: (programs: string[]) => void;
  onAddCustom: (name: string) => void;
  hasError?: boolean;
}

export default function ProgramTypeSelect({ selected, onChange, onAddCustom, hasError }: ProgramTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [dbPrograms, setDbPrograms] = useState<WorkspaceEventType[]>(DEFAULT_EVENT_TYPES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPrograms = async () => {
      const fetched = await fetchWorkspaceEventTypes();
      if (fetched && fetched.length > 0) setDbPrograms(fetched);
    };
    loadPrograms();
    window.addEventListener('workspace_event_types_updated', loadPrograms);
    return () => window.removeEventListener('workspace_event_types_updated', loadPrograms);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProgram = (program: string) => {
    if (selected.includes(program)) {
      onChange(selected.filter(p => p !== program));
    } else {
      onChange([...selected, program]);
    }
  };

  const removeProgram = (program: string) => {
    onChange(selected.filter(p => p !== program));
  };

  const handleAddCustom = async () => {
    if (customInput.trim()) {
      const clean = customInput.trim();
      onAddCustom(clean);
      onChange([...selected, clean]);
      await saveWorkspaceEventType('', clean);
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  const availableProgramsList = Array.from(new Set([
    ...dbPrograms.map(p => p.name),
    ...selected
  ]));

  const filteredPrograms = availableProgramsList.filter(p => 
    p.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* RENAME TO EVENT TYPE */}
      <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
        <span>Event Type</span>
        <span className="text-rose-500 font-black">*</span>
      </label>

      {/* Selected tags display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((program) => (
            <span
              key={program}
              className="inline-flex items-center gap-1.5 bg-indigo-50/90 text-indigo-700 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-indigo-200/90 shadow-2xs shrink-0 max-h-7 leading-none"
            >
              <span>{program}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeProgram(program); }}
                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, padding: 0 }}
                className="rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition shrink-0 p-0 border-0 cursor-pointer shadow-2xs"
                title="Remove event type"
              >
                <X className="w-2.5 h-2.5 stroke-[3] text-white shrink-0" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none transition flex items-center justify-between shadow-2xs ${
          hasError
            ? 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse bg-rose-50/50'
            : 'border-slate-200 focus:border-[#6C5CE7]'
        }`}
      >
        <span className={selected.length === 0 ? 'text-slate-400 font-semibold' : ''}>
          {selected.length === 0 ? 'Select event types...' : `${selected.length} type(s) selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* FIXED BACKDROP TO CLOSE DROPDOWN ON ANY OUTSIDE CLICK */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setShowCustomInput(false);
          }} 
        />
      )}

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 bg-white border border-[#6C5CE7]/20 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* SEARCH FILTER BAR */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search event type..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6C5CE7] placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Add Custom Event Name - persistent header link */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#6C5CE7] hover:bg-[#6C5CE7]/5 transition border-b border-zinc-100"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Custom Event Name
            </button>

            {/* Custom input sub-modal */}
            <AnimatePresence>
              {showCustomInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-indigo-50/50 p-2 border-b border-zinc-100 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type custom event name..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
                    className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="bg-[#6C5CE7] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#5b4cd1] transition shadow-2xs"
                  >
                    Add
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Program types scrollable list */}
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {filteredPrograms.map((program) => {
                const isSelected = selected.includes(program);
                return (
                  <button
                    key={program}
                    type="button"
                    onClick={() => toggleProgram(program)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{program}</span>
                    {isSelected && <X className="w-3.5 h-3.5 text-[#6C5CE7]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
