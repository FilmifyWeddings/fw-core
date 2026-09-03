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
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hideLabel?: boolean;
  label?: string;
}

export default function CalendarPicker({
  value,
  onChange,
  hasError,
  disabled = false,
  placeholder = 'Pick a date...',
  hideLabel = false,
  label = 'Program Date',
}: CalendarPickerProps) {
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
      {!hideLabel && (
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1">
          <span>{label}</span>
          <span className="text-red-500 font-black">*</span>
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`h-9 w-full px-3 text-xs rounded-lg border border-slate-200 bg-white transition-all flex items-center justify-between shadow-2xs ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
            : hasError
            ? 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse bg-rose-50/50'
            : 'border-slate-200 focus:border-[#6C5CE7]'
        }`}
      >
        <span className={displayValue && !disabled ? 'text-slate-900 font-bold' : 'text-slate-400 font-semibold'}>
          {disabled ? placeholder : (displayValue || placeholder)}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-64 mt-1.5 p-3 bg-white border border-[#6C5CE7]/10 rounded-2xl shadow-xl space-y-2 text-[#0B111E]"
          >
            {/* Header: month/year & nav */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-xs font-bold text-[#0B111E]">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 text-[#4F5E74] hover:text-[#6C5CE7] hover:bg-zinc-100 rounded-lg transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 text-[#4F5E74] hover:text-[#6C5CE7] hover:bg-zinc-100 rounded-lg transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="text-[10px] font-bold text-[#4F5E74]/70">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid of days */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected =
                  selectedDate &&
                  selectedDate.getFullYear() === viewYear &&
                  selectedDate.getMonth() === viewMonth &&
                  selectedDate.getDate() === day;

                const isToday =
                  now.getFullYear() === viewYear &&
                  now.getMonth() === viewMonth &&
                  now.getDate() === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-[#6C5CE7] text-white font-bold'
                        : isToday
                        ? 'bg-[#6C5CE7]/15 text-[#6C5CE7] font-bold'
                        : 'text-[#0B111E] hover:bg-zinc-100'
                    }`}
                  >
                    {day}
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
