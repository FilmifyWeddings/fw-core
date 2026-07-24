'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface SmartTimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
}

export default function SmartTimePicker({ label, value, onChange }: SmartTimePickerProps) {
  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] text-[#0B111E] font-black uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[#6C5CE7]" />
        <span>{label}</span>
      </label>

      <div className="relative">
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border-2 border-slate-200/90 focus:border-[#6C5CE7] pl-3 pr-2 py-2 rounded-xl text-xs font-black text-slate-900 focus:outline-none transition shadow-2xs"
        />
      </div>
    </div>
  );
}
