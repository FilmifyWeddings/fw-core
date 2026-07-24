'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, ChevronDown, Check } from 'lucide-react';

const DURATION_HOURS_SLOTS = [
  { label: '1 Hour (+1h)', hours: 1 },
  { label: '2 Hours (+2h)', hours: 2 },
  { label: '3 Hours (+3h)', hours: 3 },
  { label: '4 Hours (+4h)', hours: 4 },
  { label: '6 Hours (+6h)', hours: 6 },
  { label: '8 Hours (+8h)', hours: 8 },
  { label: '10 Hours (+10h)', hours: 10 },
  { label: '12 Hours (+12h)', hours: 12 },
];

function addHoursToTime(timeStr: string, hours: number): string {
  if (!timeStr) return '18:00';
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 10;
  const m = parts[1] || 0;
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

interface SmartTimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  onSelectSlotDuration?: (durationHours: number) => void;
  slotReferenceTime?: string;
}

export default function SmartTimePicker({ 
  label, 
  value, 
  onChange,
  onSelectSlotDuration,
  slotReferenceTime 
}: SmartTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSlotSelect = (hours: number) => {
    if (onSelectSlotDuration) {
      onSelectSlotDuration(hours);
    } else {
      const refTime = slotReferenceTime || value || '10:00';
      const newTime = addHoursToTime(refTime, hours);
      onChange(newTime);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {/* TIME PICKER LABEL */}
      <label className="text-[10px] text-[#0B111E] font-black uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[#6C5CE7]" />
        <span>{label}</span>
      </label>

      {/* TIME INPUT & RIGHT SLOT ICON DROPDOWN BUTTON */}
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border-2 border-slate-200/90 focus:border-[#6C5CE7] pl-3 pr-2 py-2 rounded-xl text-xs font-black text-slate-900 focus:outline-none transition shadow-2xs"
          />
        </div>

        {/* 3D SLOT ICON DROPDOWN BUTTON ON RIGHT */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-[#6C5CE7] to-indigo-700 hover:from-[#5b4cd1] hover:to-indigo-800 text-white px-2.5 py-2 rounded-xl transition flex items-center gap-1 shadow-md shadow-[#6C5CE7]/30 active:scale-95 cursor-pointer shrink-0 border border-white/20"
          title="Select Shift Slot Duration"
        >
          <Zap className="w-3.5 h-3.5" />
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 3D GLASSMORPHISM POPUP DROPDOWN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.95, rotateX: -10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl border-2 border-indigo-100 rounded-2xl shadow-[0_20px_50px_rgba(108,92,231,0.25)] p-2 z-50 space-y-1"
          >
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-2 py-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#6C5CE7]" /> Shift Duration Slots
            </span>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
              {DURATION_HOURS_SLOTS.map((slot) => (
                <motion.button
                  key={slot.hours}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSlotSelect(slot.hours)}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-indigo-50 text-slate-800 hover:text-[#6C5CE7]"
                >
                  <span>{slot.label}</span>
                  <Zap className="w-3 h-3 text-indigo-400" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
