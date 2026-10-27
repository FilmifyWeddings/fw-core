'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Plus, Search, Sparkles } from 'lucide-react';
import { 
  DEFAULT_RITUAL_TYPES, 
  fetchWorkspaceRitualTypes, 
  saveWorkspaceRitualType 
} from '@/lib/workspace-settings';

interface RitualTypeSelectProps {
  selected: string[];
  onChange: (rituals: string[]) => void;
  onAddCustom?: (name: string) => void;
  hasError?: boolean;
}

export default function RitualTypeSelect({
  selected = [],
  onChange,
  onAddCustom,
  hasError = false,
}: RitualTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [availableRituals, setAvailableRituals] = useState<string[]>(DEFAULT_RITUAL_TYPES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch studio-custom rituals on mount + listen to updates
  useEffect(() => {
    let isMounted = true;
    const loadRituals = async () => {
      try {
        const rituals = await fetchWorkspaceRitualTypes();
        if (isMounted && rituals && rituals.length > 0) {
          setAvailableRituals(rituals);
        }
      } catch (_) {}
    };

    loadRituals();

    const handleUpdate = () => loadRituals();
    window.addEventListener('workspace_ritual_types_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('workspace_ritual_types_updated', handleUpdate);
    };
  }, []);

  // Close dropdown on outside click
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

  const toggleRitual = (ritual: string) => {
    if (selected.includes(ritual)) {
      onChange(selected.filter((r) => r !== ritual));
    } else {
      onChange([...selected, ritual]);
    }
  };

  const removeRitual = (ritual: string) => {
    onChange(selected.filter((r) => r !== ritual));
  };

  const handleAddCustom = async () => {
    const clean = customInput.trim();
    if (clean) {
      if (onAddCustom) onAddCustom(clean);
      if (!selected.includes(clean)) {
        onChange([...selected, clean]);
      }
      if (!availableRituals.includes(clean)) {
        setAvailableRituals((prev) => [...prev, clean]);
      }
      await saveWorkspaceRitualType('', clean);
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  const combinedList = Array.from(new Set([...availableRituals, ...selected]));
  const filteredRituals = combinedList.filter((r) =>
    r.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[10px] font-black uppercase tracking-wider text-purple-700/80 block mb-1 flex items-center gap-1">
        <span>Type of Ritual</span>
      </label>

      {/* Selected tags display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((ritual) => (
            <span
              key={ritual}
              className="inline-flex items-center gap-1.5 bg-purple-50/90 text-purple-700 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-purple-200/90 shadow-2xs shrink-0 max-h-7 leading-none"
            >
              <span>{ritual}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRitual(ritual);
                }}
                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, padding: 0 }}
                className="rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition shrink-0 p-0 border-0 cursor-pointer shadow-2xs"
                title="Remove ritual"
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
            ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-50/50'
            : 'border-slate-200 focus:border-purple-600 hover:border-purple-300'
        }`}
      >
        <span className={selected.length === 0 ? 'text-slate-400 font-semibold' : ''}>
          {selected.length === 0
            ? 'Select rituals...'
            : `${selected.length} ritual(s) selected`}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-purple-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Fixed backdrop */}
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
            className="absolute z-50 w-full mt-1.5 bg-white border border-purple-200 rounded-2xl shadow-2xl overflow-hidden min-w-[220px]"
          >
            {/* Search filter bar */}
            <div className="p-2 border-b border-purple-100 bg-purple-50/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rituals..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white border border-purple-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Add Custom Ritual header */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-purple-700 hover:bg-purple-50 transition border-b border-purple-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Custom Ritual
            </button>

            {/* Custom input sub-modal */}
            <AnimatePresence>
              {showCustomInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-purple-50/70 p-2 border-b border-purple-100 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type ritual name..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddCustom())
                    }
                    className="flex-1 bg-white border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-purple-700 transition shadow-2xs cursor-pointer"
                  >
                    Add
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rituals list */}
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {filteredRituals.map((ritual) => {
                const isSelected = selected.includes(ritual);
                return (
                  <button
                    key={ritual}
                    type="button"
                    onClick={() => toggleRitual(ritual)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-purple-100 text-purple-800'
                        : 'text-slate-700 hover:bg-purple-50/60'
                    }`}
                  >
                    <span>{ritual}</span>
                    {isSelected && <X className="w-3.5 h-3.5 text-purple-600" />}
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
