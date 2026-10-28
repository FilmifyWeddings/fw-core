'use client';

import React from 'react';
import { 
  Building2, Users2, HardDrive, DollarSign, 
  MessageSquare, TrendingUp, Sparkles, ShieldCheck 
} from 'lucide-react';

interface HeroKpiGridProps {
  kpis: {
    totalStudios: number;
    activePaid: number;
    trialStudios: number;
    activeToday: number;
    activeThisWeek: number;
    suspendedCount: number;
    totalStorageGB: number;
    totalGrossRevenue: number;
    totalAdvanceReceived: number;
    totalLeads: number;
    totalQuotations: number;
    totalBookings: number;
    totalTeamMembers: number;
    totalGalleries: number;
    totalPhotos: number;
    whatsAppConnectedCount: number;
    whatsAppTotalMessages: number;
  };
}

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function HeroKpiGrid({ kpis }: HeroKpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      
      {/* 1. Total Studios */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Studios</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-[#1E2229] font-mono">
            {kpis.totalStudios}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500">
            <span className="text-emerald-700">{kpis.activePaid} Paid</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700">{kpis.trialStudios} Trial</span>
            {kpis.suspendedCount > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600">{kpis.suspendedCount} Locked</span>
              </>
            )}
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Platform Tenants</span>
          <span className="font-bold text-emerald-700">100% Isolated</span>
        </div>
      </div>

      {/* 2. Active Studios / Users */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Telemetry</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <Users2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono flex items-center gap-2">
            <span>{kpis.activeThisWeek}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            <span className="text-emerald-800 font-extrabold">{kpis.activeToday} active today</span>
            <span className="text-slate-400 font-normal"> (7-day active)</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Crew Mapped</span>
          <span className="font-bold text-slate-700">{kpis.totalTeamMembers} Staff</span>
        </div>
      </div>

      {/* 3. Total Cloud Storage */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cloud Storage</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono">
            {kpis.totalStorageGB} <span className="text-sm font-bold text-slate-400">GB</span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500 truncate">
            <span>{kpis.totalGalleries} Galleries</span>
            <span className="text-slate-300 mx-1">•</span>
            <span>{kpis.totalPhotos.toLocaleString('en-IN')} Photos</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>R2 / S3 Footprint</span>
          <span className="font-bold text-indigo-700">Multi-Region</span>
        </div>
      </div>

      {/* 4. CRM Gross Revenue Recorded */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CRM Revenue Recorded</span>
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200/60">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 font-mono">
            {formatCurrency(kpis.totalGrossRevenue)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500 truncate">
            <span>Adv: {formatCurrency(kpis.totalAdvanceReceived)}</span>
            <span className="text-slate-300 mx-1">•</span>
            <span className="text-slate-400">{kpis.totalBookings} Bookings</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Quotations</span>
          <span className="font-bold text-slate-700">{kpis.totalQuotations} Generated</span>
        </div>
      </div>

      {/* 5. WhatsApp Message Engine */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">WhatsApp Telemetry</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
            {kpis.whatsAppConnectedCount} <span className="text-sm font-bold text-slate-400">Online</span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.whatsAppTotalMessages.toLocaleString('en-IN')} Dispatches</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Engine Status</span>
          <span className="font-bold text-emerald-700">Baileys Multi-Device</span>
        </div>
      </div>

    </div>
  );
}
