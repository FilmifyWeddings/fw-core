'use client';

import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, CheckCircle2, AlertCircle, 
  Smartphone, Share2, Sparkles, Filter, Search, 
  ExternalLink, HardDrive, RefreshCw 
} from 'lucide-react';
import { StudioItem } from './StudiosMasterTable';

interface WhatsAppTelemetryViewProps {
  studios: StudioItem[];
  onInspectStudio: (studio: StudioItem) => void;
}

export default function WhatsAppTelemetryView({ studios, onInspectStudio }: WhatsAppTelemetryViewProps) {
  const [filterState, setFilterState] = useState<'all' | 'CONNECTED' | 'PAIRING_REQUIRED' | 'DISCONNECTED'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return studios.filter((s) => {
      if (filterState !== 'all' && s.integrations.whatsapp.status !== filterState) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.studio_name.toLowerCase().includes(q) ||
        s.owner_name.toLowerCase().includes(q) ||
        s.integrations.whatsapp.phone_number.includes(q)
      );
    });
  }, [studios, filterState, search]);

  const connectedCount = studios.filter(s => s.integrations.whatsapp.status === 'CONNECTED').length;
  const pairingCount = studios.filter(s => s.integrations.whatsapp.status === 'PAIRING_REQUIRED').length;
  const disconnectedCount = studios.filter(s => s.integrations.whatsapp.status === 'DISCONNECTED').length;

  return (
    <div className="space-y-4">
      {/* ── METRIC TILES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Connected & Active</span>
            <span className="text-2xl font-black text-emerald-700 font-mono">{connectedCount} Engines</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Pairing Required (QR)</span>
            <span className="text-2xl font-black text-amber-700 font-mono">{pairingCount} Studios</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Disconnected / Idle</span>
            <span className="text-2xl font-black text-slate-700 font-mono">{disconnectedCount} Studios</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── MATRIX TABLE ── */}
      <div className="bg-white border border-[#EAE5DA] rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            {[
              { id: 'all', label: 'All Engines' },
              { id: 'CONNECTED', label: 'Connected' },
              { id: 'PAIRING_REQUIRED', label: 'Pairing Required' },
              { id: 'DISCONNECTED', label: 'Disconnected' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterState(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  filterState === tab.id
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 font-black shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studio or phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Studio & Owner</th>
                <th className="py-2.5 px-3">Baileys Status</th>
                <th className="py-2.5 px-3">Linked WhatsApp Phone</th>
                <th className="py-2.5 px-3">Message Quota</th>
                <th className="py-2.5 px-3">Templates</th>
                <th className="py-2.5 px-3">Cloud Integrations</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const wa = s.integrations.whatsapp;
                return (
                  <tr key={s.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-3">
                      <span className="font-black text-slate-900 block">{s.studio_name}</span>
                      <span className="text-[11px] text-slate-500">{s.owner_name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 w-fit ${
                        wa.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        wa.status === 'PAIRING_REQUIRED' ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          wa.status === 'CONNECTED' ? 'bg-emerald-500' :
                          wa.status === 'PAIRING_REQUIRED' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <span>{wa.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {wa.phone_number ? `+${wa.phone_number.replace(/\D/g, '')}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1 w-32">
                        <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                          <span>{wa.messages_dispatched}</span>
                          <span className="text-slate-400 font-normal">/ {wa.quota_allowance}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${wa.usage_percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {wa.templates_count} / {wa.templates_quota}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          s.integrations.google_drive.connected ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          Google Drive
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          s.integrations.meta_ads.connected ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          Meta Ads
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectStudio(s)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
