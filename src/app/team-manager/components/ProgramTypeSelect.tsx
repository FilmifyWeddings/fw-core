'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Plus } from 'lucide-react';

const DEFAULT_PROGRAMS = [
  'Wedding Ceremony',
  'Pre-wedding Shoot',
  'Haldi Program',
  'Sangeet / Cocktails',
  'Reception Ceremony',
  'Engagement Ring',
  'Nikah Ceremony',
  'Haldi / Sangeet',
  'Bidai / Home Rituals',
];

interface ProgramTypeSelectProps {
  selected: string[];
  onChange: (programs: string[]) => void;
  onAddCustom: (name: string) => void;
}

export default function ProgramTypeSelect({ selected, onChange, onAddCustom }: ProgramTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleAddCustom = () => {
    if (customInput.trim()) {
      onAddCustom(customInput.trim());
      onChange([...selected, customInput.trim()]);
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block mb-1.5">
        Wedding Program Type
      </label>

      {/* Selected tags display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((program) => (
            <span
              key={program}
              className="inline-flex items-center gap-1 bg-[#6C5CE7]/8 text-[#6C5CE7] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#6C5CE7]/12"
            >
              {program}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeProgram(program); }}
                className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition ml-0.5"
              >
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#6C5CE7]/10 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7] transition flex items-center justify-between"
      >
        <span className={selected.length === 0 ? 'text-zinc-400' : ''}>
          {selected.length === 0 ? 'Select program types...' : `${selected.length} type(s) selected`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#4F5E74] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 bg-white border border-[#6C5CE7]/10 rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Add Custom Event Name - persistent header link */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-[#6C5CE7] hover:bg-[#6C5CE7]/5 transition border-b border-zinc-100"
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
                  className="overflow-hidden border-b border-zinc-100"
                >
                  <div className="px-3 py-2.5 flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                      placeholder="Enter custom event name..."
                      className="flex-1 bg-[#F8F9FD] border border-[#6C5CE7]/10 px-3 py-1.5 rounded-lg text-[11px] font-semibold focus:outline-none focus:border-[#6C5CE7] transition text-[#0B111E]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="bg-[#6C5CE7] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#5b4cd1] transition"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto p-1.5">
              {DEFAULT_PROGRAMS.map((program) => {
                const isSelected = selected.includes(program);
                return (
                  <button
                    key={program}
                    type="button"
                    onClick={() => toggleProgram(program)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold transition ${
                      isSelected
                        ? 'bg-[#6C5CE7]/8 text-[#6C5CE7]'
                        : 'text-[#0B111E] hover:bg-zinc-50'
                    }`}
                  >
                    <span>{program}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7]" />
                    )}
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
