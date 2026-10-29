'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, HardDrive, Users, Calendar, Cpu, ShieldCheck, 
  ArrowUpRight, Download, Clock, AlertTriangle, CheckCircle2, 
  CreditCard, RefreshCw, FileText, ChevronRight, Zap
} from 'lucide-react';
import UpgradePlanModal from './UpgradePlanModal';

interface BillingData {
  currentPlan: {
    id: string;
    name: string;
    tagline: string;
    status: string;
    billingCycle: string;
    expiresAt: string;
    daysRemaining: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  quotas: {
    storageGB: { used: number; total: number; percent: number };
    teamSeats: { used: number; total: number };
    eventsPerMonth: { used: number; total: number };
    aiScans: { used: number; total: number };
  };
  features: Record<string, boolean>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    plan_name: string;
    amount_total: number;
    currency: string;
    status: string;
    pdf_url?: string;
    created_at: string;
  }>;
}

interface SubscriptionManagementCardProps {
  userId?: string;
  workspaceId?: string;
}

export default function SubscriptionManagementCard({
  userId,
  workspaceId,
}: SubscriptionManagementCardProps) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (workspaceId) params.set('workspaceId', workspaceId);

      const res = await fetch(`/api/billing/current-plan?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load plan details');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('[Billing Info Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, [userId, workspaceId]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D9822B] mx-auto mb-3" />
        <p className="text-xs text-zinc-500 font-medium">Loading cloud subscription quotas...</p>
      </div>
    );
  }

  const plan = data?.currentPlan;
  const quotas = data?.quotas;
  const isExpiringSoon = plan?.isExpiringSoon;
  const isExpired = plan?.isExpired;

  return (
    <div className="space-y-6 text-[#1E2229]">
      {/* ─────────────────────────────────────────────────────────────
          1. ACTIVE PLAN HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF6EE] via-[#FFFDF9] to-[#F5EFE3] border border-[#EAE5DA] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white shadow-xs">
                {plan?.name || 'Studio Plan'}
              </span>

              {isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3 h-3" />
                  Plan Expired
                </span>
              ) : isExpiringSoon ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3 h-3" />
                  Expiring in {plan?.daysRemaining} days
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                  <CheckCircle2 className="w-3 h-3" />
                  Active · Renews {plan?.billingCycle === 'yearly' ? 'Annually' : 'Monthly'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-[#1E2229] tracking-tight">
              {plan?.tagline || 'StudioCore Creative Cloud Workspace'}
            </h2>

            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span>Next billing date:</span>
              <strong className="text-zinc-800 font-semibold">
                {plan?.expiresAt
                  ? new Date(plan.expiresAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </strong>
              {plan?.daysRemaining !== undefined && !isExpired && (
                <span className="text-zinc-400">({plan.daysRemaining} days remaining)</span>
              )}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>{isExpired ? 'Reactivate Subscription' : 'Upgrade / Change Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. RESOURCE QUOTAS & LIMITS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Quota */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cloud Storage (B2)</span>
              <HardDrive className="w-4 h-4 text-[#D9822B]" />
            </div>
            <div className="text-xl font-black text-[#1E2229]">
              {quotas?.storageGB.used || 0} GB <span className="text-xs font-semibold text-zinc-400">/ {quotas?.storageGB.total || 30} GB</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-[#EAE5DA] h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quotas?.storageGB.percent || 5}%` }}
                className={`h-full rounded-full transition-all ${
                  (quotas?.storageGB.percent || 0) > 85
                    ? 'bg-rose-500'
                    : (quotas?.storageGB.percent || 0) > 65
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium text-right">
              {quotas?.storageGB.percent || 0}% utilized
            </p>
          </div>
        </div>

        {/* Team Seats */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Crew Seats</span>
              <Users className="w-4 h-4 text-[#D9822B]" />
            </div>
            <div className="text-xl font-black text-[#1E2229]">
              {quotas?.teamSeats.used || 1}{' '}
              <span className="text-xs font-semibold text-zinc-400">
                / {quotas?.teamSeats.total && quotas.teamSeats.total > 50 ? 'Unlimited' : `${quotas?.teamSeats.total || 1}`}
              </span>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-zinc-500 font-medium">
            Freelancer portal & shooter access active.
          </div>
        </div>

        {/* Event Galleries / Month */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Events</span>
              <Calendar className="w-4 h-4 text-[#D9822B]" />
            </div>
            <div className="text-xl font-black text-[#1E2229]">
              {quotas?.eventsPerMonth.used || 0}{' '}
              <span className="text-xs font-semibold text-zinc-400">
                / {quotas?.eventsPerMonth.total && quotas.eventsPerMonth.total > 50 ? 'Unlimited' : `${quotas?.eventsPerMonth.total || 5}`}
              </span>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-zinc-500 font-medium">
            High-speed AI face scans included.
          </div>
        </div>

        {/* AI Face Scans */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">AI Face Search</span>
              <Cpu className="w-4 h-4 text-[#D9822B]" />
            </div>
            <div className="text-xl font-black text-[#1E2229]">
              {quotas?.aiScans.used || 0}{' '}
              <span className="text-xs font-semibold text-zinc-400">
                / {quotas?.aiScans.total && quotas.aiScans.total > 50000 ? 'Uncapped' : `${quotas?.aiScans.total || 1500}`}
              </span>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
            <span>GPU-Accelerated Recognition</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. GST TAX INVOICES & BILLING HISTORY
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#EAE5DA] p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-[#1E2229]">Tax Invoices & Billing History</h3>
            <p className="text-xs text-zinc-500">
              Sequential GST compliant invoices (SAC 998315) for your studio accounts & tax filing.
            </p>
          </div>
          <button
            onClick={fetchBillingInfo}
            className="p-2 rounded-xl border border-[#EAE5DA] text-zinc-500 hover:text-zinc-800 hover:bg-[#FAF7F2] transition"
            title="Refresh Invoices"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {data?.invoices && data.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Invoice #</th>
                  <th className="pb-3">Plan / Description</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DA]">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF7F2]/60 transition">
                    <td className="py-3 pl-2 font-mono font-bold text-zinc-800">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 font-medium text-zinc-800">
                      {inv.plan_name}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 font-semibold text-zinc-900">
                      ₹{inv.amount_total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                        Paid
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE5DA] text-zinc-600 hover:bg-white text-[11px] font-semibold transition cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-[#D9822B]" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center rounded-2xl bg-[#FAF7F2]/60 border border-dashed border-[#EAE5DA]">
            <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-600">No invoices generated yet</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Invoices will automatically appear here once you upgrade or renew your plan.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlanId={plan?.id || 'trial'}
        userId={userId}
        onSuccess={() => {
          fetchBillingInfo();
        }}
      />
    </div>
  );
}
