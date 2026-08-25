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
  'Token Amount': <Coins className="w-3.5 h-3.5 text-amber-600" />,
  'Advance Amount': <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
  'On Wedding Day': <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
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
      // If space below is less than 280px or if placed low in viewport, open upwards
      if (spaceBelow < 280 && rect.top > 220) {
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
      {/* ── 3D TRIGGER BUTTON ── */}
      {isCustomInline ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type milestone name..."
            autoFocus
            className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded-xl text-xs font-bold text-slate-900 shadow-inner focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsCustomInline(false)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            title="Switch back to 3D Dropdown"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            isOpen
              ? 'bg-gradient-to-b from-amber-50 to-[#FAF5EC] border-amber-400 shadow-[0_4px_14px_rgba(200,148,53,0.22)]'
              : 'bg-gradient-to-b from-white via-[#FCFAF7] to-[#F5EFEB] border-[#E2D6C6] hover:border-[#C89435] shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_4px_12px_rgba(200,148,53,0.15)] active:translate-y-[0.5px]'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {DEFAULT_ICONS[value] || <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            <span className="truncate text-slate-900 font-black">
              {value || placeholder}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </button>
      )}

      {/* ── 3D FLOATING DROPDOWN POPOVER (SMART UP/DOWN PLACEMENT) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? -4 : 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 ${
              dropUp ? 'bottom-full mb-1.5 shadow-[0_-16px_36px_rgba(33,27,23,0.25)]' : 'top-full mt-1.5 shadow-[0_16px_36px_rgba(33,27,23,0.25)]'
            } w-72 bg-[#FFFDF9] border-2 border-[#E9DFD2] rounded-2xl p-2.5 z-[100] space-y-2 font-sans text-xs backdrop-blur-md`}
          >
            {/* ── 1. TOP 3D "+ ADD NEW STEP" BAR ── */}
            <div className="bg-gradient-to-br from-amber-50 to-[#FAF6EE] p-2 rounded-xl border border-amber-200/80 shadow-inner space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-900">
                <span className="flex items-center gap-1">
                  <Plus className="w-3 h-3 text-amber-600" /> Add New Step Name
                </span>
              </div>

              <form onSubmit={handleCreateNewStep} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Pre-Wedding Balance"
                  value={newInputText}
                  onChange={(e) => setNewInputText(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newInputText.trim()}
                  className="px-3 py-1 bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-black rounded-lg shadow-[0_2px_6px_rgba(217,119,6,0.3)] transition cursor-pointer shrink-0 active:scale-95"
                >
                  Add
                </button>
              </form>
            </div>

            {/* ── 2. PRESET & SAVED MILESTONES ── */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <div className="text-[10px] uppercase font-black tracking-wider text-[#99928A] px-1 py-0.5">
                Payment Milestones
              </div>

              {templates.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-400 font-black text-amber-950 shadow-2xs scale-[1.01]'
                        : 'bg-white hover:bg-amber-50/60 border-[#F0E8DC] hover:border-amber-300 font-bold text-slate-800 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {DEFAULT_ICONS[opt] || <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                      <span className="truncate">{opt}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-700 shrink-0 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── 3. MANUAL INLINE TEXT TOGGLE ── */}
            <div className="pt-1.5 border-t border-[#F0E8DC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCustomInline(true);
                  setIsOpen(false);
                }}
                className="w-full py-1 text-center text-[10.5px] font-bold text-slate-500 hover:text-amber-800 hover:underline flex items-center justify-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Type custom text directly
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
