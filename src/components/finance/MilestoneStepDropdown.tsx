'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Plus, Sparkles, Check, 
  Coins, CreditCard, HeartHandshake, Layers, Edit3, X
} from 'lucide-react';

interface MilestoneStepDropdownProps {
  value: string;
  onChange: (value: string) => void;
  templates: string[];
  onAddTemplate: (newTemplate: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

const DEFAULT_ICONS: Record<string, React.ReactNode> = {
  'Token Amount': <Coins className="w-3 h-3 text-amber-600 shrink-0" />,
  'Advance Amount': <CreditCard className="w-3 h-3 text-emerald-600 shrink-0" />,
  'Advance Payment': <CreditCard className="w-3 h-3 text-emerald-600 shrink-0" />,
  'On Wedding Day': <HeartHandshake className="w-3 h-3 text-rose-600 shrink-0" />
};

export default function MilestoneStepDropdown({
  value,
  onChange,
  templates = ['Token Amount', 'Advance Amount', 'On Wedding Day'],
  onAddTemplate,
  placeholder = 'Select Milestone',
  className = ''
}: MilestoneStepDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [newInputText, setNewInputText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isCustomInline, setIsCustomInline] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 200) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setIsOpen(prev => !prev);
  };

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setIsAddingNew(false);
    setIsCustomInline(false);
  };

  const handleCreateNewStep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newInputText.trim();
    if (!clean) return;

    await onAddTemplate(clean);
    onChange(clean);
    setNewInputText('');
    setIsAddingNew(false);
    setIsOpen(false);
  };

  const getOptionBadgeColor = (opt: string) => {
    if (opt.toLowerCase().includes('token')) return 'bg-amber-50 text-amber-900 border-amber-200';
    if (opt.toLowerCase().includes('advance')) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    if (opt.toLowerCase().includes('wedding')) return 'bg-rose-50 text-rose-900 border-rose-200';
    return 'bg-purple-50 text-purple-900 border-purple-200';
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-[70]' : 'z-10'} ${className}`}>
      {/* ── SLEEK TRIGGER BUTTON ── */}
      {isCustomInline ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type milestone name..."
            autoFocus
            className="w-full h-6.5 px-2 bg-white border border-amber-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsCustomInline(false)}
            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Switch back to Dropdown"
          >
            <Layers className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center justify-between gap-1.5 h-6.5 sm:h-7 px-2 bg-white hover:bg-slate-50 border rounded-lg text-xs transition-all cursor-pointer ${
            isOpen
              ? 'border-amber-400 bg-amber-50/50 text-slate-900 shadow-xs'
              : 'border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {DEFAULT_ICONS[value] || <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />}
            <span className="truncate text-[11px] font-bold text-slate-900">
              {value || placeholder}
            </span>
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </button>
      )}

      {/* ── CLEAN DROPDOWN POPOVER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? -4 : 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? -3 : 3, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={`absolute left-0 ${
              dropUp ? 'bottom-full mb-1 shadow-xl' : 'top-full mt-1 shadow-xl'
            } w-64 bg-white border border-slate-200 rounded-xl p-2 z-[100] space-y-1.5 font-sans text-xs`}
          >
            {/* 1. Add New Step Bar */}
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 space-y-1">
              <form onSubmit={handleCreateNewStep} className="flex items-center gap-1">
                <input
                  type="text"
                  value={newInputText}
                  onChange={(e) => setNewInputText(e.target.value)}
                  placeholder="New milestone name..."
                  className="w-full px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-md focus:outline-none focus:border-amber-400 text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!newInputText.trim()}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-md shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

            {/* 2. Options List */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
              {templates.map((tpl) => {
                const isSelected = value === tpl;
                return (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => handleSelectOption(tpl)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 font-black'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {DEFAULT_ICONS[tpl] || <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />}
                      <span className="truncate">{tpl}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* 3. Custom Text Inline Trigger */}
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCustomInline(true);
                  setIsOpen(false);
                }}
                className="w-full text-center py-1 text-[10px] font-bold text-slate-500 hover:text-amber-700 hover:bg-amber-50/50 rounded transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Type custom name directly
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
