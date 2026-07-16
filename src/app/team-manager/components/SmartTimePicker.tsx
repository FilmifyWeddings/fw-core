'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';

const HOURLY_SLOTS = [
  { label: '4 Hours Slot', hours: 4 },
  { label: '6 Hours Slot', hours: 6 },
  { label: '8 Hours Slot', hours: 8 },
  { label: 'Full Day Cover', hours: 10 },
];

function addHoursToTime(timeStr: string, hours: number): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '--:--';
  const [h, m] = timeStr.split(':').map(Number);
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
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSlotDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSlotSelect = (hours: number) => {
    if (slotReferenceTime) {
      const endTime = addHoursToTime(slotReferenceTime, hours);
      onChange(endTime);
    }
    setShowSlotDropdown(false);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className="text-[8px] text-[#4F5E74] font-semibold block">
        {label}
      </label>
      <div className="relative flex gap-1.5">
        <div className="relative flex-1">
          <Clock className="w-3 h-3 text-[#4F5E74]/50 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-[#6C5CE7]/10 pl-7 pr-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7] transition appearance-none"
          />
        </div>
        {showSlots && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSlotDropdown(!showSlotDropdown)}
              className="h-full bg-[#6C5CE7]/8 hover:bg-[#6C5CE7]/12 text-[#6C5CE7] px-2 py-1.5 rounded-lg transition flex items-center gap-1 border border-[#6C5CE7]/10"
              title="Quick time slots"
            >
              <Zap className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showSlotDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-[#6C5CE7]/10 rounded-xl shadow-xl overflow-hidden z-50 w-36"
                >
                  {HOURLY_SLOTS.map((slot) => (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => handleSlotSelect(slot.hours)}
                      className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#0B111E] hover:bg-[#6C5CE7]/5 transition flex items-center justify-between"
                    >
                      <span>{slot.label}</span>
                      <span className="text-[#4F5E74] text-[9px]">{slot.hours}h</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
