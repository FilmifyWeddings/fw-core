'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Layers, Sparkles, ChevronDown, Check } from 'lucide-react';

const QUICK_TIME_SLOTS = [
  { label: '08:00 AM (Morning)', value: '08:00' },
  { label: '10:00 AM (Standard)', value: '10:00' },
  { label: '01:00 PM (Afternoon)', value: '13:00' },
  { label: '04:00 PM (Evening)', value: '16:00' },
  { label: '06:00 PM (Night)', value: '18:00' },
];

const DURATION_SHIFT_SLOTS = [
  { label: '4 Hours Shift', hours: 4 },
  { label: '6 Hours Shift', hours: 6 },
  { label: '8 Hours Full Shift', hours: 8 },
  { label: '10 Hours Overtime Cover', hours: 10 },
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

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

interface SmartTimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  showSlots?: boolean;
  slotReferenceTime?: string;
}

export default function SmartTimePicker({ 
  label, 
  value, 
  onChange, 
  showSlots = false, 
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

  const handleShiftSelect = (hours: number) => {
    if (slotReferenceTime) {
      const endTime = addHoursToTime(slotReferenceTime, hours);
      onChange(endTime);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {/* LABEL WITH 3D SHIFT SLOTS ICON BADGE */}
      <div className="flex items-center justify-between gap-1">
        <label className="text-[10px] text-[#0B111E] font-black uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#6C5CE7]" />
          <span>{label}</span>
        </label>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-[#6C5CE7] text-[9px] font-black border border-indigo-200/80 shadow-2xs">
          <Zap className="w-2.5 h-2.5" /> Shift Slots
        </span>
      </div>

      {/* 3D TRIGGER INPUT BUTTON */}
      <div className="relative flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border-2 border-slate-200/90 focus:border-[#6C5CE7] pl-3 pr-2 py-2 rounded-xl text-xs font-black text-slate-900 focus:outline-none transition shadow-2xs"
          />
        </div>

        {/* 3D DROPDOWN TRIGGER BUTTON */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-2.5 py-2 rounded-xl transition flex items-center gap-1 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer shrink-0"
          title="Open 3D Time & Shift Slots Picker"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 3D ANIMATED TRANSLUCENT TIME PICKER POPUP DROPDOWN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.95, rotateX: -10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl border-2 border-indigo-100 rounded-2xl shadow-[0_20px_50px_rgba(108,92,231,0.25)] p-3 z-50 space-y-3"
          >
            {/* QUICK PRESET TIME SLOTS */}
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6C5CE7]" /> Quick Roll Call Presets
              </span>
              <div className="grid grid-cols-1 gap-1">
                {QUICK_TIME_SLOTS.map((slot) => {
                  const isSelected = value === slot.value;
                  return (
                    <motion.button
                      key={slot.value}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        onChange(slot.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                          : 'bg-slate-50 hover:bg-indigo-50 text-slate-800'
                      }`}
                    >
                      <span>{slot.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* DURATION SHIFT CALCULATOR SLOTS */}
            {showSlots && slotReferenceTime && (
              <div className="border-t border-slate-100 pt-2">
                <span className="text-[9px] font-black text-[#6C5CE7] uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Auto Shift Duration (From {formatTimeDisplay(slotReferenceTime)})
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {DURATION_SHIFT_SLOTS.map((shift) => (
                    <motion.button
                      key={shift.hours}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => handleShiftSelect(shift.hours)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200/80 p-2 rounded-xl text-[10px] font-black text-center transition cursor-pointer shadow-2xs"
                    >
                      +{shift.hours} hrs ({addHoursToTime(slotReferenceTime, shift.hours)})
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
