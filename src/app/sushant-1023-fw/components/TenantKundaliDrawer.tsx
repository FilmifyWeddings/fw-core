'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldAlert,
  HardDrive,
  CalendarCheck,
  Users2,
  FileText,
  MessageSquare,
  Globe,
  LogOut,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

function InstagramIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" />
    </svg>
  );
}

export interface StudioTenant {
  id: string;
  user_id: string;
  studio_name: string;
  owner_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  logo_url: string;
  address: string;
  instagram_handle: string;
  youtube_handle: string;
  facebook_handle: string;
  platform_role: string;
  subscription_plan: 'trial' | 'pro' | 'business' | 'enterprise' | string;
  subscription_expires_at: string;
  is_platform_blocked: boolean;
  created_at: string;
  last_active_at: string;
  is_active_today: boolean;
  counts: {
    bookings: number;
    team_members: number;
    quotations: number;
    leads: number;
    storage_bytes: number;
  };
  telemetry: {
    ip_address: string;
    user_agent: string;
    active_sub_apps: string[];
  };
}

interface TenantKundaliDrawerProps {
  studio: StudioTenant | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenPlanModal: (studio: StudioTenant) => void;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function TenantKundaliDrawer({
  studio,
  isOpen,
  onClose,
  onRefresh,
  onOpenPlanModal,
}: TenantKundaliDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !studio) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleForceLogout = async () => {
    if (!confirm(`Are you sure you want to force terminate ALL sessions for "${studio.studio_name}"?`)) {
      return;
    }
    setActionLoading('logout');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/sushant-1023-fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_logout',
          targetUserId: studio.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to logout');
      setActionSuccess('All user sessions revoked successfully.');
    } catch (e: any) {
      setActionError(e.message || 'Logout action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async () => {
    const nextState = !studio.is_platform_blocked;
    const confirmMsg = nextState
      ? `CONFIRM FREEZE: Are you sure you want to SUSPEND "${studio.studio_name}"? They will be immediately locked out of their workspace.`
      : `RESTORE ACCESS: Unblock "${studio.studio_name}" and restore workspace access?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading('block');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/sushant-1023-fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_block',
          targetUserId: studio.id,
          payload: { is_platform_blocked: nextState },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Action failed');
      setActionSuccess(data.message || 'Updated status successfully.');
      onRefresh();
    } catch (e: any) {
      setActionError(e.message || 'Toggle block failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendDays = async (days: number) => {
    setActionLoading(`extend_${days}`);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/sushant-1023-fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_plan',
          targetUserId: studio.id,
          payload: { days },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Action failed');
      setActionSuccess(data.message);
      onRefresh();
    } catch (e: any) {
      setActionError(e.message || 'Extension failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Plan Quota Calculations
  const quotaBytes = studio.subscription_plan === 'enterprise'
    ? 2000 * 1024 * 1024 * 1024 // 2TB
    : studio.subscription_plan === 'business'
    ? 500 * 1024 * 1024 * 1024 // 500GB
    : studio.subscription_plan === 'pro'
    ? 100 * 1024 * 1024 * 1024 // 100GB
    : 10 * 1024 * 1024 * 1024; // 10GB Trial

  const storageUsed = studio.counts?.storage_bytes || 0;
  const storagePercent = Math.min(100, Math.round((storageUsed / quotaBytes) * 100));

  // WhatsApp Link
  const cleanPhone = studio.phone.replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${studio.owner_name}, this is StudioCore Platform Administration regarding your studio account "${studio.studio_name}".`
      )}`
    : null;

  // Days remaining
  const expiryTime = studio.subscription_expires_at ? new Date(studio.subscription_expires_at).getTime() : 0;
  const daysRemaining = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-[#09090b] border-l border-white/10 h-full flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] z-10 overflow-hidden font-sans selection:bg-rose-500/30">
        
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-850 flex items-start justify-between bg-zinc-950/60 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-xl shadow-lg relative overflow-hidden shrink-0">
              {studio.logo_url || studio.avatar_url ? (
                <img
                  src={studio.logo_url || studio.avatar_url}
                  alt={studio.studio_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{studio.studio_name.slice(0, 2).toUpperCase()}</span>
              )}
              {studio.is_platform_blocked && (
                <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-rose-500" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-serif tracking-tight">
                  {studio.studio_name}
                </h2>
                {studio.is_platform_blocked ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold uppercase">
                    Blocked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <User className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-300 font-medium">{studio.owner_name}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 font-mono">{studio.email}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Feedback Banners */}
        {actionSuccess && (
          <div className="px-6 py-2.5 bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="px-6 py-2.5 bg-rose-950/60 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Scrollable Kundali Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* SECTION 1: IDENTITY & METADATA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                Identity & Infrastructure Kundali
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">NODE ID: {studio.id.slice(0, 8)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* User UUID */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">User UUID</div>
                  <div className="text-xs font-mono text-zinc-300 truncate max-w-[190px]">{studio.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(studio.id, 'uuid')}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Copy UUID"
                >
                  {copiedField === 'uuid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Workspace ID */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Workspace Node</div>
                  <div className="text-xs font-mono text-zinc-300 truncate max-w-[190px]">{studio.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(studio.id, 'ws')}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Copy Workspace ID"
                >
                  {copiedField === 'ws' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Registered Date */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Onboarded</div>
                  <div className="text-xs text-zinc-200">
                    {new Date(studio.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Last Recorded IP */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">IP Address & Gateway</div>
                  <div className="text-xs font-mono text-zinc-200">{studio.telemetry?.ip_address || '127.0.0.1'}</div>
                </div>
              </div>
            </div>

            {/* Device User Agent */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 text-xs">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">Last Recorded Client Agent</div>
              <div className="text-zinc-400 font-mono text-[11px] break-all">
                {studio.telemetry?.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
              </div>
            </div>

            {/* Contacts & Social Handles */}
            <div className="flex flex-wrap gap-2 pt-1">
              {studio.phone && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  <Phone className="w-3 h-3 text-zinc-500" />
                  <span>{studio.phone}</span>
                </div>
              )}
              {studio.instagram_handle && (
                <a
                  href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-rose-400 transition-colors"
                >
                  <InstagramIcon className="w-3 h-3" />
                  <span>@{studio.instagram_handle.replace('@', '')}</span>
                </a>
              )}
              {studio.youtube_handle && (
                <a
                  href={`https://youtube.com/${studio.youtube_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-red-400 transition-colors"
                >
                  <YoutubeIcon className="w-3 h-3" />
                  <span>{studio.youtube_handle}</span>
                </a>
              )}
            </div>
          </div>

          {/* SECTION 2: LIVE USAGE METRICS */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
              Live Resource & Operational Aggregates
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {studio.counts?.bookings ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Events / Projects</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-1.5">
                  <Users2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {studio.counts?.team_members ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Crew Members</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {studio.counts?.quotations ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Quotations</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {studio.counts?.leads ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">CRM Leads</div>
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                  R2 Cloud Storage Allocation
                </span>
                <span className="font-mono text-zinc-300">
                  {formatBytes(storageUsed)} / {formatBytes(quotaBytes)} ({storagePercent}%)
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    storagePercent > 85 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SUBSCRIPTION & FINANCIAL STATUS */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Active Plan Tier</div>
                <div className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span className="capitalize">{studio.subscription_plan} Plan</span>
                  {studio.subscription_plan !== 'trial' ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                      PAID
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono">
                      TRIAL
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Days Remaining</div>
                <div className={`text-lg font-black font-mono ${daysRemaining <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired'}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExtendDays(14)}
                disabled={actionLoading === 'extend_14'}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                +14 Days Trial
              </button>
              <button
                type="button"
                onClick={() => handleExtendDays(30)}
                disabled={actionLoading === 'extend_30'}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                +30 Days Pro
              </button>
              <button
                type="button"
                onClick={() => onOpenPlanModal(studio)}
                className="ml-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-md transition-all"
              >
                Manage Full Plan Tier
              </button>
            </div>
          </div>

          {/* SECTION 4: GOD-MODE EMERGENCY CONTROLS */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              God-Mode Emergency Operations
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Force Logout */}
              <button
                type="button"
                onClick={handleForceLogout}
                disabled={actionLoading === 'logout'}
                className="p-3.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-left transition-all group"
              >
                <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs group-hover:text-white">
                  <LogOut className="w-4 h-4 text-amber-500" />
                  <span>Force Logout All Sessions</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Revoke refresh tokens and disconnect all active browsers & mobile devices.
                </p>
              </button>

              {/* Direct WhatsApp Alert */}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-850 hover:border-emerald-500/30 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs group-hover:text-emerald-400">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Send Direct WhatsApp Alert</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Launch official admin dialogue with owner on WhatsApp with prefilled message.
                  </p>
                </a>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-850/50 text-left opacity-60">
                  <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Unavailable</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                    Owner has not registered a verified WhatsApp phone number.
                  </p>
                </div>
              )}

              {/* Freeze / Unfreeze Studio */}
              <button
                type="button"
                onClick={handleToggleBlock}
                disabled={actionLoading === 'block'}
                className={`p-3.5 rounded-2xl border text-left transition-all col-span-1 sm:col-span-2 ${
                  studio.is_platform_blocked
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/30'
                    : 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Shield className={`w-4 h-4 ${studio.is_platform_blocked ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span>
                      {studio.is_platform_blocked ? 'Restore & Unblock Workspace' : 'Suspend / Freeze Studio Workspace'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-zinc-900 border-zinc-700 text-zinc-300">
                    {actionLoading === 'block' ? 'Processing...' : studio.is_platform_blocked ? 'RESTORE' : 'SUSPEND'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  {studio.is_platform_blocked
                    ? 'Removes administrative lock and allows tenant to log in and use StudioCore normally.'
                    : 'Immediate platform suspension. Tenant requests to /workspace will redirect to /blocked.'}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="font-mono">KUNDALI ENGINE // AUDIT COMPLETE</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
