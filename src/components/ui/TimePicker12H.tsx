"use client";

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePicker12HProps {
  value?: string; // e.g. "10:00 AM", "06:30 PM", or "18:00"
  onChange: (formatted12h: string) => void;
  label?: string;
  hasError?: boolean;
  className?: string;
}

const HOURS = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Parse input string to { hour, minute, period }
function parseTimeTo12H(val?: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!val) return { hour: '00', minute: '00', period: 'AM' };
  
  // Format: "10:00 AM" or "06:30 PM" or "00:00 AM"
  const match12h = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12h) {
    const h = parseInt(match12h[1], 10);
    const p: 'AM' | 'PM' = match12h[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
    return {
      hour: h.toString().padStart(2, '0'),
      minute: match12h[2],
      period: p,
    };
  }

  // Format: "18:30" (24h)
  const match24h = val.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    let h = parseInt(match24h[1], 10);
    const minute = match24h[2];
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0 && (val.startsWith('12:') || val.startsWith('00:'))) {
      h = val.startsWith('12:') ? 12 : 0;
    }
    return {
      hour: h.toString().padStart(2, '0'),
      minute,
      period,
    };
  }

  return { hour: '00', minute: '00', period: 'AM' };
}

export default function TimePicker12H({
  value,
  onChange,
  label,
  hasError = false,
  className = '',
}: TimePicker12HProps) {
  const parsed = parseTimeTo12H(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  useEffect(() => {
    const p = parseTimeTo12H(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const updateTime = (newH: string, newM: string, newP: 'AM' | 'PM') => {
    setHour(newH);
    setMinute(newM);
    setPeriod(newP);
    onChange(`${newH}:${newM} ${newP}`);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider block">
          {label}
        </label>
      )}
      
      <div className={`flex items-center gap-1 h-7.5 px-2 bg-white border rounded-lg shadow-2xs transition-all ${
        hasError ? 'border-rose-400 bg-rose-50/20' : 'border-amber-200/90 focus-within:border-amber-500'
      }`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 ml-2 shrink-0" />
        
        {/* HOUR SELECTOR */}
        <select
          value={hour}
          onChange={(e) => updateTime(e.target.value, minute, period)}
          className="bg-transparent text-xs font-black text-zinc-900 px-1 py-1 focus:outline-none cursor-pointer rounded-lg hover:bg-amber-50"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <span className="text-xs font-black text-zinc-400">:</span>

        {/* MINUTE SELECTOR */}
        <select
          value={minute}
          onChange={(e) => updateTime(hour, e.target.value, period)}
          className="bg-transparent text-xs font-black text-zinc-900 px-1 py-1 focus:outline-none cursor-pointer rounded-lg hover:bg-amber-50"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* AM / PM PERIOD TOGGLE */}
        <div className="flex items-center bg-amber-50/80 p-0.5 rounded-xl border border-amber-200/80 ml-auto mr-1">
          <button
            type="button"
            onClick={() => updateTime(hour, minute, 'AM')}
            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
              period === 'AM'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => updateTime(hour, minute, 'PM')}
            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
              period === 'PM'
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}
