'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  name: string;
  label?: string;
  badge?: string;
  badgeClassName?: string;
  icon?: React.ReactNode;
  initials?: string;
  subLabel?: string;
  avatarUrl?: string;
  roleTag?: string;
  count?: number;
}

export interface MultiSelect3DCreamDropdownProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  maxDisplayCount?: number;
  showSelectAll?: boolean;
  emptyMessage?: string;
  icon?: React.ReactNode;
  usePortal?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onClose?: () => void;
}

export default function MultiSelect3DCreamDropdown({
  selectedValues = [],
  onChange,
  options = [],
  placeholder = 'Select options...',
  label,
  searchPlaceholder = '🔍 Search...',
  searchable = true,
  className = '',
  disabled = false,
  maxDisplayCount = 2,
  showSelectAll = true,
  emptyMessage = 'No matching options found',
  icon,
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
}: MultiSelect3DCreamDropdownProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : localIsOpen;

  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (onClose) onClose();
        else if (onToggle) onToggle(false);
        else setLocalIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, isControlled, onToggle, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        else if (onToggle) onToggle(false);
        else setLocalIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onToggle]);

  // Autofocus search when opened
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (onToggle) {
      onToggle(!isOpen);
    } else {
      setLocalIsOpen(prev => !prev);
    }
  };

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        (opt.name && opt.name.toLowerCase().includes(q)) ||
        (opt.label && opt.label.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.roleTag && opt.roleTag.toLowerCase().includes(q))
    );
  }, [options, searchQuery, searchable]);

  // Selected options objects
  const selectedOptionsList = useMemo(() => {
    const set = new Set(selectedValues);
    return options.filter(opt => set.has(opt.id));
  }, [options, selectedValues]);

  // Toggle single option
  const handleToggleOption = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(val => val !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  // Select all filtered options
  const handleSelectAll = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const allFilteredIds = filteredOptions.map(o => o.id);
    const merged = Array.from(new Set([...selectedValues, ...allFilteredIds]));
    onChange(merged);
  };

  // Clear all selections
  const handleClearAll = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onChange([]);
  };

  // Label text representation
  const renderTriggerLabel = () => {
    if (selectedValues.length === 0) {
      return (
        <span className="text-slate-400 dark:text-stone-500 font-normal truncate">
          {placeholder}
        </span>
      );
    }

    if (selectedValues.length === 1) {
      const single = selectedOptionsList[0] || options.find(o => o.id === selectedValues[0]);
      return (
        <span className="text-slate-900 dark:text-stone-100 font-bold truncate">
          {single ? single.name || single.label : selectedValues[0]}
        </span>
      );
    }

    const first = selectedOptionsList[0] ? (selectedOptionsList[0].name || selectedOptionsList[0].label) : selectedValues[0];
    return (
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <span className="text-slate-900 dark:text-stone-100 font-bold truncate">
          {first}
        </span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shrink-0">
          +{selectedValues.length - 1} more
        </span>
      </div>
    );
  };

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-slate-600 dark:text-stone-300 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}

      {/* 3D Cream Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer select-none text-left
          bg-[#FDFBF7] dark:bg-[#1C1917]
          text-slate-800 dark:text-stone-100
          border border-[#EAE5DA] dark:border-stone-800
          shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
          dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
          hover:border-amber-400/80 dark:hover:border-amber-500/50
          focus:outline-none focus:ring-2 focus:ring-amber-500/20
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isOpen ? 'ring-2 ring-amber-500/20 border-amber-500/80' : ''}
          ${selectedValues.length > 0 ? 'border-amber-300 dark:border-amber-800/60' : ''}
        `}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && (
            <span className="shrink-0 text-slate-500 dark:text-stone-400">
              {icon}
            </span>
          )}

          {renderTriggerLabel()}

          {selectedValues.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/60 shadow-2xs shrink-0">
              {selectedValues.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedValues.length > 0 && (
            <span
              onClick={handleClearAll}
              title="Clear selection"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-stone-500'
            }`}
          />
        </div>
      </button>

      {/* Inline Dropdown Menu (Always visible right under trigger, full width, high z-index) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 right-0 top-full mt-1.5 z-[100] min-w-full rounded-2xl bg-[#FDFBF7] dark:bg-[#1C1917] border border-amber-900/15 dark:border-stone-800 shadow-2xl overflow-hidden font-sans"
        >
          <div className="flex flex-col max-h-72 select-none">
            {/* Sticky Search Header */}
            {searchable && (
              <div className="p-2 border-b border-amber-900/10 dark:border-stone-800 bg-[#FAF7F2] dark:bg-[#23201D] shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-700 rounded-lg text-slate-800 dark:text-stone-200 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-stone-300 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Toolbar (Select All, Clear, Count) */}
            <div className="px-2.5 py-1.5 bg-[#F5EFEB] dark:bg-[#1E1B18] border-b border-amber-900/10 dark:border-stone-800/80 flex items-center justify-between text-[11px] font-bold shrink-0">
              <div className="flex items-center gap-2">
                {showSelectAll && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline cursor-pointer transition font-bold"
                  >
                    Select All
                  </button>
                )}
                {showSelectAll && selectedValues.length > 0 && (
                  <span className="text-slate-300 dark:text-stone-700">•</span>
                )}
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:underline cursor-pointer transition font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <span className="text-slate-500 dark:text-stone-400 font-semibold text-[10px]">
                {selectedValues.length} of {options.length} selected
              </span>
            </div>

            {/* Options List with 3D Cream Checkboxes */}
            <div className="overflow-y-auto max-h-52 p-1.5 space-y-0.5 scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-3 text-center text-xs font-semibold text-slate-400 dark:text-stone-500">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      onClick={(e) => handleToggleOption(opt.id, e)}
                      className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100 font-bold'
                          : 'text-slate-700 dark:text-stone-300 hover:bg-[#F3EDE2] dark:hover:bg-stone-800/60 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* 3D Cream Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-4 h-4 rounded border-amber-800/40 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shadow-xs shrink-0 pointer-events-none"
                        />

                        {/* Avatar / Initials / Icon */}
                        {opt.avatarUrl ? (
                          <img
                            src={opt.avatarUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-stone-700"
                          />
                        ) : opt.initials ? (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs">
                            {opt.initials}
                          </div>
                        ) : opt.icon ? (
                          <span className="shrink-0 text-slate-500 dark:text-stone-400">
                            {opt.icon}
                          </span>
                        ) : null}

                        {/* Text Details */}
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <span className="truncate text-xs">
                            {opt.name || opt.label}
                          </span>

                          {opt.subLabel && (
                            <span className="text-[10px] text-slate-400 dark:text-stone-500 font-normal truncate">
                              • {opt.subLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Badges / Role Tags */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.roleTag && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {opt.roleTag}
                          </span>
                        )}

                        {opt.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              opt.badgeClassName
                                ? opt.badgeClassName
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}

                        {typeof opt.count === 'number' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-400">
                            {opt.count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
