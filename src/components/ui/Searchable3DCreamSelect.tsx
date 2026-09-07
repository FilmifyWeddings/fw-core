'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Searchable3DCreamSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeClassName?: string;
  icon?: React.ReactNode;
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
}: Searchable3DCreamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 240 });
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
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 240),
      });
    }
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!portalMenuRef.current || !portalMenuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      if (usePortal) updateCoords();
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, usePortal]);

  // Handle scroll and resize for portal mode
  useEffect(() => {
    if (!isOpen || !usePortal) return;
    const handleReposition = () => updateCoords();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, usePortal]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery, searchable]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value);
  }, [options, value]);

  const isCurrentUnassigned = selectedOption && (selectedOption.value === 'unassigned' || selectedOption.label.toLowerCase().includes('unassigned'));

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const menuContent = (
    <motion.div
      ref={portalMenuRef}
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 2, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={
        usePortal
          ? {
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }
          : undefined
      }
      className={`${
        usePortal
          ? 'rounded-xl bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE5DA] dark:border-stone-800 shadow-2xl overflow-hidden'
          : 'absolute top-full left-0 mt-1.5 w-full min-w-[240px] z-50 rounded-xl bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE5DA] dark:border-stone-800 shadow-2xl overflow-hidden'
      }`}
    >
      {/* Sticky Search Header */}
      {searchable && (
        <div className="sticky top-0 z-10 p-2 bg-[#FDFBF7] dark:bg-[#1C1917] border-b border-[#EAE5DA] dark:border-stone-800">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500 absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-7 text-xs font-semibold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-800 dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 cursor-pointer p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-stone-700">
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
                onClick={() => handleSelect(option.value)}
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
                <div className="flex items-center gap-2 truncate min-w-0">
                  {option.icon && (
                    <span className={`shrink-0 ${isSelected ? 'text-white' : isUnassignedOpt ? 'text-rose-500' : 'text-slate-400 dark:text-stone-500'}`}>
                      {option.icon}
                    </span>
                  )}
                  <span className={`truncate ${!isSelected && isUnassignedOpt ? 'font-black text-rose-600 dark:text-rose-400' : ''}`}>
                    {option.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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
    </motion.div>
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
        onClick={() => {
          if (!disabled) {
            if (!isOpen && usePortal) updateCoords();
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
          {selectedOption?.icon && (
            <span className={`shrink-0 ${isCurrentUnassigned ? 'text-rose-500' : 'text-slate-500 dark:text-stone-400'}`}>
              {selectedOption.icon}
            </span>
          )}
          <span className={`truncate ${isCurrentUnassigned ? 'text-rose-700 dark:text-rose-400 font-bold' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
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

      {/* Dropdown Menu (Inline or Portaled) */}
      <AnimatePresence>
        {isOpen && (
          usePortal && isMounted
            ? createPortal(menuContent, document.body)
            : menuContent
        )}
      </AnimatePresence>
    </div>
  );
}

