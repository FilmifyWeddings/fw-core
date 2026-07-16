'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
}

export default function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    const dateStr = formatDate(viewYear, viewMonth, day);
    onChange(dateStr);
    setIsOpen(false);
  };

  const displayValue = selectedDate
    ? `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  return (
    <div className="relative" ref={calendarRef}>
      <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block mb-1.5">
        Program Date
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#6C5CE7]/10 px-3 py-2 rounded-xl text-xs font-semibold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7] transition flex items-center justify-between"
      >
        <span className={displayValue ? '' : 'text-zinc-400'}>
          {displayValue || 'Pick a date...'}
        </span>
        <Calendar className="w-3.5 h-3.5 text-[#4F5E74]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 bg-white border border-[#6C5CE7]/10 rounded-2xl shadow-xl p-3 w-full max-w-[280px]"
          >
            {/* Month/Year selector */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg bg-[#F8F9FD] border border-[#6C5CE7]/8 flex items-center justify-center hover:bg-[#6C5CE7]/8 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#4F5E74]" />
              </button>
              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="bg-[#F8F9FD] border border-[#6C5CE7]/8 px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B111E] focus:outline-none cursor-pointer"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="bg-[#F8F9FD] border border-[#6C5CE7]/8 px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B111E] focus:outline-none cursor-pointer w-16"
                >
                  {Array.from({ length: 20 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg bg-[#F8F9FD] border border-[#6C5CE7]/8 flex items-center justify-center hover:bg-[#6C5CE7]/8 transition"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#4F5E74]" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-[9px] font-black text-[#4F5E74] py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(viewYear, viewMonth, day);
                const isSelected = value === dateStr;
                const isToday = 
                  day === now.getDate() && 
                  viewMonth === now.getMonth() && 
                  viewYear === now.getFullYear();

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`relative w-full aspect-square rounded-xl text-[11px] font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#6C5CE7] text-white shadow-lg shadow-[#6C5CE7]/25 scale-105'
                        : isToday
                        ? 'bg-[#6C5CE7]/8 text-[#6C5CE7]'
                        : 'text-[#0B111E] hover:bg-zinc-50'
                    }`}
                  >
                    {day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#6C5CE7]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
