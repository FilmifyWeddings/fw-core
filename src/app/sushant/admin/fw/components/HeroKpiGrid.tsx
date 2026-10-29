'use client';

import React from 'react';
import { 
  Building2, Users2, HardDrive, DollarSign, 
  MessageSquare, TrendingUp, Sparkles, ShieldCheck 
} from 'lucide-react';

interface HeroKpiGridProps {
  kpis: {
    totalStudios: number;
    newSignupsThisMonth?: number;
    activePaid: number;
    trialStudios: number;
    monthlyRecurringRevenue?: number;
    expiringIn7Days?: number;
    paidBreakdown?: {
      starter: number;
      pro: number;
      enterprise: number;
      vip: number;
    };
    activeToday: number;
    activeThisWeek: number;
    suspendedCount: number;
    totalStorageGB: number;
    totalStorageAllocatedGB?: number;
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
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function HeroKpiGrid({ kpis, isLoading = false }: HeroKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`kpi-skel-${i}`} className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-2.5 bg-slate-200 rounded w-20" />
              <div className="w-8 h-8 rounded-lg bg-slate-100" />
            </div>
            <div className="h-7 bg-slate-200 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  const signupsThisMonth = kpis.newSignupsThisMonth ?? 0;
  const mrr = kpis.monthlyRecurringRevenue ?? 0;
  const expiringSoon = kpis.expiringIn7Days ?? 0;
  const allocatedStorageGB = kpis.totalStorageAllocatedGB || (kpis.totalStudios * 50);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      
      {/* 1. Total Studios & Monthly Signups */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Platform Studios</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#1E2229] font-mono">
              {kpis.totalStudios}
            </span>
            {signupsThisMonth > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                +{signupsThisMonth} this mo
              </span>
            )}
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
          <span>Tenant Growth</span>
          <span className="font-bold text-emerald-700">100% Isolated</span>
        </div>
      </div>

      {/* 2. Monthly Recurring Revenue (MRR) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subscription MRR</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {formatCurrency(mrr)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.paidBreakdown?.pro || 0} Pro</span>
            <span className="text-slate-300 mx-1">•</span>
            <span>{kpis.paidBreakdown?.starter || 0} Starter</span>
            <span className="text-slate-300 mx-1">•</span>
            <span>{kpis.paidBreakdown?.enterprise || 0} Agency</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Monthly Recurring</span>
          <span className="font-bold text-emerald-700">Auto-Renew</span>
        </div>
      </div>

      {/* 3. Subscription Status & Expiring Soon Alert */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Telemetry</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
            <Users2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono">
              {kpis.activeThisWeek}
            </span>
            <span className="text-xs font-bold text-slate-400">7-Day Active</span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            {expiringSoon > 0 ? (
              <span className="text-amber-700 font-extrabold flex items-center gap-1">
                ⚠️ {expiringSoon} Expiring in 7 Days
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">
                ✓ All subscriptions healthy
              </span>
            )}
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Crew Mapped</span>
          <span className="font-bold text-slate-700">{kpis.totalTeamMembers} Staff</span>
        </div>
      </div>

      {/* 4. Total Cloud Storage (Used vs Allocated Quota) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">B2 Cloud Storage</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {kpis.totalStorageGB} <span className="text-sm font-bold text-slate-400">/ {allocatedStorageGB} GB</span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500 truncate">
            <span>{kpis.totalGalleries} Galleries</span>
            <span className="text-slate-300 mx-1">•</span>
            <span>{kpis.totalPhotos.toLocaleString('en-IN')} Photos</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Backblaze Footprint</span>
          <span className="font-bold text-blue-700">Bandwidth Optimized</span>
        </div>
      </div>

      {/* 5. WhatsApp Telemetry & CRM Volume */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE5DA] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">WhatsApp Engine</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
            {kpis.whatsAppConnectedCount} <span className="text-sm font-bold text-slate-400">Linked</span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.whatsAppTotalMessages.toLocaleString('en-IN')} Dispatches</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>CRM Bookings Vol</span>
          <span className="font-bold text-slate-700">{formatCurrency(kpis.totalGrossRevenue)}</span>
        </div>
      </div>

    </div>
  );
}
