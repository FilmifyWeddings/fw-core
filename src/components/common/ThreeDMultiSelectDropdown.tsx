'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Search, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  badge?: string;
  badgeClass?: string;
}

interface ThreeDMultiSelectDropdownProps {
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  searchPlaceholder?: string;
  maxDisplayPills?: number;
  className?: string;
}

export default function ThreeDMultiSelectDropdown({
  label,
  icon,
  placeholder = 'Select options...',
  options,
  selectedValues,
  onChange,
  searchPlaceholder = 'Search...',
  maxDisplayPills = 2,
  className = '',
}: ThreeDMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  // Toggle single item
  const toggleOption = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  // Select all filtered
  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredIds = filteredOptions.map(o => o.id);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredIds]));
    onChange(combined);
  };

  // Clear all
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Quick remove pill
  const removePill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== id));
  };

  // Selected labels map
  const selectedOptions = useMemo(() => {
    return options.filter(o => selectedValues.includes(o.id));
  }, [options, selectedValues]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-1.5">
          {icon}
          <span>{label}</span>
          {selectedValues.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs font-mono ml-1">
              {selectedValues.length}
            </span>
          )}
        </label>
      )}

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full min-h-[42px] px-3 py-2 bg-white rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs hover:border-amber-400 ${
          isOpen ? 'border-amber-500 ring-2 ring-amber-200/60' : 'border-stone-200/90'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {selectedValues.length === 0 ? (
            <span className="text-xs text-stone-400 font-medium select-none truncate">
              {placeholder}
            </span>
          ) : (
            <>
              {selectedOptions.slice(0, maxDisplayPills).map(opt => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-black shadow-2xs"
                >
                  <span className="truncate max-w-[120px]">{opt.label}</span>
                  <button
                    type="button"
                    onClick={(e) => removePill(opt.id, e)}
                    className="hover:text-rose-600 rounded p-0.5"
                  >
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                </span>
              ))}

              {selectedValues.length > maxDisplayPills && (
                <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-black border border-stone-200">
                  +{selectedValues.length - maxDisplayPills} more
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-stone-400">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </div>
      </div>

      {/* 3D Creamy Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-[180] bg-[#FAF8F5] rounded-2xl border-2 border-amber-300 shadow-2xl overflow-hidden flex flex-col max-h-72 text-stone-900"
          >
            {/* Top Search Bar */}
            <div className="p-2.5 bg-white border-b border-amber-200/70 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs font-semibold text-stone-800 placeholder-stone-400 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-stone-400 hover:text-stone-700 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="px-3 py-1.5 bg-amber-50/70 border-b border-amber-200/50 flex items-center justify-between text-[11px] font-bold text-stone-600">
              <span className="font-mono text-[10px] text-stone-500">
                {selectedValues.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-amber-800 hover:text-amber-950 font-black hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-stone-500 hover:text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable Checkbox Options */}
            <div className="p-1.5 overflow-y-auto max-h-48 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 font-medium italic">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={(e) => toggleOption(opt.id, e)}
                      className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2.5 transition cursor-pointer select-none text-xs font-bold ${
                        isChecked
                          ? 'bg-amber-100/70 text-amber-950 shadow-2xs'
                          : 'hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isChecked
                          ? 'bg-amber-500 border-amber-600 text-white shadow-2xs'
                          : 'border-stone-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span className="flex-1 truncate">
                        {opt.label}
                      </span>

                      {opt.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black ${
                          opt.badgeClass || 'bg-stone-100 text-stone-600'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
