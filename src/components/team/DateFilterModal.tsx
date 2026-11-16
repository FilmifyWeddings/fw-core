'use client';

import React, { useState } from 'react';
import { X, Calendar, Filter, Check, RotateCcw } from 'lucide-react';

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onReset: () => void;
}

export default function DateFilterModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApply,
  onReset,
}: DateFilterModalProps) {
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  if (!isOpen) return null;

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const handlePreset = (preset: 'all' | 'this_month' | 'last_3_months' | 'this_year') => {
    if (preset === 'all') {
      setTempStart('');
      setTempEnd('');
    } else if (preset === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setTempStart(firstDay.toISOString().split('T')[0]);
      setTempEnd(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'last_3_months') {
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      setTempStart(threeMonthsAgo.toISOString().split('T')[0]);
      setTempEnd(today);
    } else if (preset === 'this_year') {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      setTempStart(startOfYear.toISOString().split('T')[0]);
      setTempEnd(endOfYear.toISOString().split('T')[0]);
    }
  };

  const handleApply = () => {
    onApply(tempStart, tempEnd);
    onClose();
  };

  const handleReset = () => {
    setTempStart('');
    setTempEnd('');
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-stone-900 to-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight font-josefin text-white">Filter by Date Range</h3>
              <p className="text-[11px] text-stone-400 font-josefin">Select a timeframe for workload and financials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 font-josefin">
          {/* Quick Presets */}
          <div>
            <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-2">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePreset('all')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition text-left"
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handlePreset('this_month')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition text-left"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset('last_3_months')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition text-left"
              >
                Last 3 Months
              </button>
              <button
                type="button"
                onClick={() => handlePreset('this_year')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition text-left"
              >
                This Year
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <label className="text-[11px] uppercase font-bold text-zinc-400 block">Custom Date Range</label>
            
            <div className="space-y-1">
              <span className="text-xs text-zinc-600 font-bold block">Start Date:</span>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-roboto font-bold text-zinc-900 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs text-zinc-600 font-bold block">End Date:</span>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-roboto font-bold text-zinc-900 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between font-josefin">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold border border-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
