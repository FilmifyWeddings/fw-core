'use client';

import React from 'react';
import { 
  Shield, LogOut, Calendar, Activity, 
  RefreshCw, Sparkles, Server, CheckCircle2 
} from 'lucide-react';

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom';

interface SuperAdminHeaderProps {
  adminEmail: string;
  selectedPreset: DateFilterPreset;
  onSelectPreset: (preset: DateFilterPreset) => void;
  startDate: string;
  endDate: string;
  onChangeStartDate: (val: string) => void;
  onChangeEndDate: (val: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
  onlineWorkersCount?: number;
  totalWorkersCount?: number;
}

export default function SuperAdminHeader({
  adminEmail,
  selectedPreset,
  onSelectPreset,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onRefresh,
  onLogout,
  isRefreshing = false,
  onlineWorkersCount = 3,
  totalWorkersCount = 3,
}: SuperAdminHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#EAE5DA] sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Branding & Status Pulse */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-[#1E2229] tracking-tight">
                StudioCore Super Admin
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                PROD VAULT
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{onlineWorkersCount}/{totalWorkersCount} Daemons Online</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-sm">
              Session active: <span className="font-semibold text-slate-600">{adminEmail}</span>
            </p>
          </div>
        </div>

        {/* Right: Date Range Filter & Logout */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Preset Buttons */}
          <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE5DA] text-xs font-bold">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id as DateFilterPreset)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedPreset === p.id
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 text-xs bg-white border border-[#EAE5DA] rounded-xl px-2.5 py-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { onChangeStartDate(e.target.value); onSelectPreset('custom'); }}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
            />
            <span className="text-slate-300">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { onChangeEndDate(e.target.value); onSelectPreset('custom'); }}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-[#EAE5DA] text-slate-600 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {/* Super Admin Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Exit Admin Vault"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
