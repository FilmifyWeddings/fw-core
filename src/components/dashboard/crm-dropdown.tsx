'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CRMDropdownOption {
  value: string;
  label: string;
  color?: string;
  isCustom?: boolean;
  created_at?: string;
}

export interface CRMDropdownProps {
  value: string;
  options: CRMDropdownOption[];
  onChange: (val: string) => void;
  onAddCustomOption?: (name: string, color: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustomAdd?: boolean;
  customAddTitle?: string;
}

// ─────────────────────────────────────────────────────────────
// Dynamic Badge Theme Color Generator (No Hardcoding)
// Calculates badge background, border, text & dot colors from any hex
// ─────────────────────────────────────────────────────────────
export function getDynamicBadgeStyle(rawColor?: string) {
  const defaultColor = '#0866FF';
  let hex = (rawColor || defaultColor).trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    hex = '0866FF';
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isLightColor = brightness > 180;

  const dotColor = `#${hex}`;

  // Light Mode Badge Style
  const bgLight = `rgba(${r}, ${g}, ${b}, 0.12)`;
  const borderLight = `rgba(${r}, ${g}, ${b}, 0.28)`;
  const textLight = isLightColor 
    ? `rgb(${Math.max(0, Math.floor(r * 0.45))}, ${Math.max(0, Math.floor(g * 0.45))}, ${Math.max(0, Math.floor(b * 0.45))})`
    : `rgb(${Math.max(0, Math.floor(r * 0.75))}, ${Math.max(0, Math.floor(g * 0.75))}, ${Math.max(0, Math.floor(b * 0.75))})`;

  // Dark Mode Badge Style
  const bgDark = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const borderDark = `rgba(${r}, ${g}, ${b}, 0.4)`;
  const textDark = `rgb(${Math.min(255, Math.floor(r + (255 - r) * 0.4))}, ${Math.min(255, Math.floor(g + (255 - g) * 0.4))}, ${Math.min(255, Math.floor(b + (255 - b) * 0.4))})`;

  return {
    dot: dotColor,
    light: {
      backgroundColor: bgLight,
      borderColor: borderLight,
      color: textLight,
    },
    dark: {
      backgroundColor: bgDark,
      borderColor: borderDark,
      color: textDark,
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Reusable Global CRM Dropdown Component
// ─────────────────────────────────────────────────────────────
export function CRMDropdown({
  value,
  options = [],
  onChange,
  onAddCustomOption,
  placeholder = 'Select Option',
  disabled = false,
  className = '',
  allowCustomAdd = true,
  customAddTitle = 'Add Custom Option',
}: CRMDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('#0866FF');

  const containerRef = useRef<HTMLDivElement>(null);

  // ── 1. Custom Option Ordering (Requirement 4) ────────────────
  // Custom options are ordered: Newest custom first -> Older custom -> System options last
  const sortedOptions = useMemo(() => {
    const customs = options.filter(o => o.isCustom);
    const systems = options.filter(o => !o.isCustom);

    customs.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return [...customs, ...systems];
  }, [options]);

  // ── 2. Fixed Width Calculation (Requirement 1 & 6) ──────────
  // Calculates width based on longest option, max(170px, width + padding)
  // Memoized to prevent layout shifts
  // ── 2. Fixed Width Calculation (Requirement 1 & 6) ──────────
  // Calculates width based on longest option, snug and compact
  const fixedWidthPx = useMemo(() => {
    let maxChars = 0;
    sortedOptions.forEach(opt => {
      const label = opt.label || opt.value || '';
      if (label.length > maxChars) {
        maxChars = label.length;
      }
    });
    // Add snug padding space for badge dot and chevron icon
    const estimatedWidth = Math.ceil(maxChars * 7.2 + 42);
    return Math.max(115, Math.min(195, estimatedWidth));
  }, [sortedOptions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Selected Option Object
  const selectedOpt = useMemo(() => {
    return sortedOptions.find(o => o.value === value || o.label === value);
  }, [sortedOptions, value]);

  const displayLabel = selectedOpt?.label || value || placeholder;
  const themeStyle = getDynamicBadgeStyle(selectedOpt?.color);

  // Preset Colors for Add Custom Modal
  const PRESET_COLORS = [
    '#ef4444', // Red / Hot
    '#f97316', // Orange / Warm
    '#f59e0b', // Amber / Pending
    '#10b981', // Emerald / Won
    '#06b6d4', // Cyan / Contacted
    '#0866ff', // Meta Blue
    '#6366f1', // Indigo / VIP
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#64748b', // Slate / Closed
  ];

  const handleSaveNewOption = () => {
    if (!newOptionName.trim()) return;
    const name = newOptionName.trim();
    const color = newOptionColor;

    if (onAddCustomOption) {
      onAddCustomOption(name, color);
    }

    onChange(name);
    setShowAddModal(false);
    setNewOptionName('');
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {/* Premium Badge Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: `${fixedWidthPx}px`,
          backgroundColor: themeStyle.light.backgroundColor,
          borderColor: themeStyle.light.borderColor,
          color: themeStyle.light.color,
        }}
        className={`h-8 px-2.5 rounded-full border transition-all duration-200 shadow-2xs inline-flex items-center justify-between gap-1 select-none cursor-pointer font-sans text-xs font-bold text-center ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xs active:scale-[0.99]'
        } ${open ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
      >
        <div className="flex items-center justify-center gap-1.5 truncate text-center flex-1 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: themeStyle.dot }}
          />
          <span className="truncate text-center font-bold">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-70 ${
            open ? 'rotate-180 opacity-100 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Floating Animated Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ minWidth: `${fixedWidthPx}px` }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 max-h-64 overflow-y-auto z-50 rounded-2xl bg-white dark:bg-[#1A1816] border border-slate-200 dark:border-zinc-800 p-1.5 shadow-xl text-xs font-sans space-y-0.5"
          >
            {sortedOptions.map(opt => {
              const isSelected = opt.value === value || opt.label === value;
              const optStyle = getDynamicBadgeStyle(opt.color);

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-semibold transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: optStyle.dot }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2 stroke-[2.5]" />
                  )}
                </button>
              );
            })}

            {/* Add Custom Option Trigger */}
            {allowCustomAdd && (
              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>+ {customAddTitle}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Option Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99990]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-84 bg-white dark:bg-[#1A1816] border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-2xl z-[99995] space-y-4 font-sans text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                  <Tag className="w-4 h-4 text-orange-500" />
                  {customAddTitle}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Option Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Option Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIP Lead, Meeting Fixed"
                    value={newOptionName}
                    onChange={e => setNewOptionName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveNewOption()}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2.5 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    autoFocus
                  />
                </div>

                {/* Theme Color Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Badge Theme Color
                  </label>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewOptionColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newOptionColor === c
                            ? 'scale-110 border-white ring-2 ring-slate-400 dark:ring-zinc-600 shadow-md'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Badge Preview */}
                {newOptionName.trim() && (
                  <div className="pt-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Live Preview
                    </label>
                    <div className="flex justify-center p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      {(() => {
                        const previewStyle = getDynamicBadgeStyle(newOptionColor);
                        return (
                          <div
                            style={{
                              backgroundColor: previewStyle.light.backgroundColor,
                              borderColor: previewStyle.light.borderColor,
                              color: previewStyle.light.color,
                            }}
                            className="h-8 px-3.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: previewStyle.dot }}
                            />
                            <span>{newOptionName.trim()}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveNewOption}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-[0.99]"
                >
                  Save & Apply Option
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
