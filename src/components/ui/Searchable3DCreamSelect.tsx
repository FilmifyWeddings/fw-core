'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export interface Searchable3DCreamSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeClassName?: string;
  icon?: React.ReactNode;
  subLabel?: string;
  initials?: string;
  roleTag?: string;
}

export interface Searchable3DCreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Searchable3DCreamSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
  usePortal?: boolean;
  headerAction?: {
    label: string;
    onClick: () => void;
  };
  inlineAdd?: {
    isOpen: boolean;
    value: string;
    onChange: (val: string) => void;
    onSave: () => void;
    onCancel: () => void;
    placeholder?: string;
    isSaving?: boolean;
  };
}

export default function Searchable3DCreamSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = '🔍 Search...',
  searchable = false,
  className = '',
  disabled = false,
  label,
  usePortal = false,
  headerAction,
  inlineAdd,
}: Searchable3DCreamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 260 });
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownEstimatedHeight = 280;
      const fitsBelow = rect.bottom + dropdownEstimatedHeight <= window.innerHeight;
      const topPos = fitsBelow ? rect.bottom + 6 : Math.max(10, rect.top - dropdownEstimatedHeight - 6);

      setCoords({
        top: Math.round(topPos),
        left: Math.round(Math.max(10, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 10))),
        width: Math.round(Math.max(rect.width, 260)),
      });
    }
  };

  // Pre-calculate and sync coordinates synchronously when opened
  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  // Handle scroll and resize
  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updateCoords();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && !inlineAdd?.isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable, inlineAdd?.isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.roleTag && opt.roleTag.toLowerCase().includes(q))
    );
  }, [options, searchQuery, searchable]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value);
  }, [options, value]);

  const isCurrentUnassigned = selectedOption && (selectedOption.value === 'unassigned' || selectedOption.label.toLowerCase().includes('unassigned'));

  const handleSelect = (val: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(val);
    setIsOpen(false);
  };

  const menuContentBody = (
    <>
      {/* Sticky Header: Search and/or Header Action and/or Inline Add */}
      {(searchable || headerAction || inlineAdd?.isOpen) && (
        <div 
          className="sticky top-0 z-10 p-2 bg-[#FDFBF7] dark:bg-[#1C1917] border-b border-[#EAE5DA] dark:border-stone-800 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {headerAction && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-stone-500">
                Options
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  headerAction.onClick();
                }}
                className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+</span>
                <span>{headerAction.label}</span>
              </button>
            </div>
          )}

          {searchable && (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-7 text-xs font-semibold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-800 dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {inlineAdd?.isOpen && (
            <div 
              className="p-2 border border-amber-200 dark:border-amber-900/50 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg space-y-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={inlineAdd.value}
                onChange={e => inlineAdd.onChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={inlineAdd.placeholder || 'Enter category name...'}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    inlineAdd.onSave();
                  } else if (e.key === 'Escape') {
                    inlineAdd.onCancel();
                  }
                }}
                autoFocus
                className="w-full h-8 px-2.5 text-xs font-bold bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-md text-slate-800 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inlineAdd.onCancel();
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-stone-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inlineAdd.onSave();
                  }}
                  disabled={inlineAdd.isSaving || !inlineAdd.value.trim()}
                  className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white rounded cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {inlineAdd.isSaving ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options List */}
      <div className="p-1.5 space-y-0.5">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs font-medium text-slate-400 dark:text-stone-500">
            No matching options
          </div>
        ) : (
          filteredOptions.map(option => {
            const isSelected = option.value === value;
            const isUnassignedOpt = option.value === 'unassigned' || option.label.toLowerCase().includes('unassigned');
            return (
              <div
                key={option.value}
                onClick={(e) => handleSelect(option.value, e)}
                className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors select-none ${
                  isSelected
                    ? isUnassignedOpt
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-amber-500 text-white shadow-xs'
                    : isUnassignedOpt
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-slate-700 dark:text-stone-200 hover:bg-amber-500/10 dark:hover:bg-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  {option.initials ? (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white border border-white/40'
                        : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs'
                    }`}>
                      {option.initials}
                    </div>
                  ) : option.icon ? (
                    <span className={`shrink-0 ${isSelected ? 'text-white' : isUnassignedOpt ? 'text-rose-500' : 'text-slate-400 dark:text-stone-500'}`}>
                      {option.icon}
                    </span>
                  ) : null}

                  <div className="flex flex-col min-w-0 text-left">
                    <span className={`truncate font-bold ${!isSelected && isUnassignedOpt ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                      {option.label}
                    </span>
                    {option.subLabel && (
                      <span className={`text-[10px] truncate ${
                        isSelected ? 'text-white/80' : 'text-slate-400 dark:text-stone-500 font-medium'
                      }`}>
                        {option.subLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {option.roleTag && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}>
                      {option.roleTag}
                    </span>
                  )}
                  {option.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : option.badgeClassName
                          ? option.badgeClassName
                          : isUnassignedOpt
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-slate-600 dark:text-stone-300 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}

      {/* 3D Cream Luxury Button */}
      <button
        type="button"
        onMouseDown={() => {
          if (!disabled) {
            updateCoords();
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            updateCoords();
            setIsOpen(prev => !prev);
          }
        }}
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
          ${isCurrentUnassigned ? 'border-rose-300/80 dark:border-rose-900/60' : ''}
        `}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.initials ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs">
              {selectedOption.initials}
            </div>
          ) : selectedOption?.icon ? (
            <span className={`shrink-0 ${isCurrentUnassigned ? 'text-rose-500' : 'text-slate-500 dark:text-stone-400'}`}>
              {selectedOption.icon}
            </span>
          ) : null}
          <span className={`truncate ${isCurrentUnassigned ? 'text-rose-700 dark:text-rose-400 font-bold' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.roleTag && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              {selectedOption.roleTag}
            </span>
          )}
          {selectedOption?.badge && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                selectedOption.badgeClassName
                  ? selectedOption.badgeClassName
                  : isCurrentUnassigned
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-amber-600 dark:text-amber-400'
              : isCurrentUnassigned
              ? 'text-rose-400 dark:text-rose-500'
              : 'text-slate-400 dark:text-stone-500'
          }`}
        />
      </button>

      {/* Dropdown Menu (Inline or Portaled with top-tier stacking & backdrop) */}
      <AnimatePresence>
        {isOpen && isMounted && usePortal && (
          createPortal(
            <div
              className="custom-dropdown-portal fixed inset-0 z-[9998] pointer-events-auto bg-transparent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              <div
                ref={portalMenuRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  zIndex: 9999,
                  pointerEvents: 'auto',
                }}
                className="rounded-xl bg-[#FDFBF7] dark:bg-[#1C1917] border border-amber-900/15 dark:border-stone-800 shadow-2xl max-h-56 overflow-y-auto"
              >
                {menuContentBody}
              </div>
            </div>,
            document.body
          )
        )}
        {isOpen && (!usePortal || !isMounted) && (
          <>
            <div
              className="custom-dropdown-portal fixed inset-0 z-[9998] pointer-events-auto bg-transparent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <div
              ref={portalMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-full mt-1.5 z-[9999] min-w-full rounded-xl bg-[#FDFBF7] dark:bg-[#1C1917] border border-amber-900/15 dark:border-stone-800 shadow-2xl max-h-56 overflow-y-auto"
              style={{ pointerEvents: 'auto' }}
            >
              {menuContentBody}
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
