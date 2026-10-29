'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, Building2, User, Mail, Phone, 
  Calendar, Shield, ShieldAlert, HardDrive, DollarSign, 
  MessageSquare, Globe, LogOut, Clock, Sparkles, 
  ExternalLink, ChevronRight, AlertTriangle, RefreshCw, 
  Camera, Film, Users2, Zap, CheckCircle2, Lock, Unlock, Crown
} from 'lucide-react';
import { StudioItem } from './StudiosMasterTable';

interface StudioKundaliModalProps {
  studio: StudioItem | null;
  isOpen?: boolean;
  initialTab?: KundaliTab;
  onClose: () => void;
  onRefreshData?: () => void;
  onStudioUpdated?: () => void;
}

type KundaliTab = 'overview' | 'crm' | 'team' | 'media' | 'integrations' | 'overrides';

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function StudioKundaliModal({
  studio,
  isOpen = true,
  initialTab = 'overview',
  onClose,
  onRefreshData,
  onStudioUpdated,
}: StudioKundaliModalProps) {
  const [activeTab, setActiveTab] = useState<KundaliTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, studio?.id]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master God-Mode Form States
  const [customPlan, setCustomPlan] = useState<string>('trial');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [customStorageGb, setCustomStorageGb] = useState<number>(50);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [featureOverrides, setFeatureOverrides] = useState({
    ai_face_search: true,
    video_review: true,
    team_payroll: true,
    whatsapp_automation: true,
    white_label: false,
    client_portal: true,
  });
  const [customLimits, setCustomLimits] = useState({
    team_members: 5,
    events_per_month: 25,
    ai_scans: 10000,
  });
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Sync state whenever selected studio changes
  useEffect(() => {
    if (studio) {
      setCustomPlan(studio.subscription_plan || 'trial');
      setCustomExpiresAt(
        studio.subscription_expires_at
          ? new Date(studio.subscription_expires_at).toISOString().slice(0, 10)
          : ''
      );
      setCustomStorageGb(studio.media?.allocated_quota_gb || 50);
      setIsBlocked(Boolean(studio.is_platform_blocked));

      const overrides = (studio as any).custom_overrides || {};
      const f = overrides.features || {};
      setFeatureOverrides({
        ai_face_search: f.ai_face_search ?? true,
        video_review: f.video_review ?? true,
        team_payroll: f.team_payroll ?? true,
        whatsapp_automation: f.whatsapp_automation ?? true,
        white_label: f.white_label ?? false,
        client_portal: f.client_portal ?? true,
      });

      const lim = overrides.custom_limits || {};
      setCustomLimits({
        team_members: lim.team_members ?? (studio.subscription_plan === 'starter' ? 1 : studio.subscription_plan === 'pro' ? 5 : 99),
        events_per_month: lim.events_per_month ?? (studio.subscription_plan === 'starter' ? 5 : studio.subscription_plan === 'pro' ? 25 : 999),
        ai_scans: lim.ai_scans ?? (studio.subscription_plan === 'starter' ? 1500 : studio.subscription_plan === 'pro' ? 10000 : 99999),
      });

      setAdminNotes(overrides.admin_notes || '');
    }
  }, [studio]);

  const handleAddDays = (days: number) => {
    const currentBase = customExpiresAt ? new Date(customExpiresAt).getTime() : Date.now();
    const base = currentBase > Date.now() ? currentBase : Date.now();
    const newDate = new Date(base + days * 24 * 60 * 60 * 1000);
    setCustomExpiresAt(newDate.toISOString().slice(0, 10));
  };

  if (!isOpen || !studio) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExecuteOverride = async (action: string, payload: any) => {
    try {
      setIsUpdating(true);
      setStatusMsg(null);
      const res = await fetch('/api/sushant/admin/fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studioId: studio.id,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply override');
      }
      setStatusMsg({ type: 'success', text: data.message || 'Override applied successfully!' });
      if (onRefreshData) onRefreshData();
      if (onStudioUpdated) onStudioUpdated();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100020] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm font-sans overflow-y-auto">
      <div 
        className="bg-[#FFFDF9] text-slate-900 w-full max-w-4xl rounded-3xl border border-[#EAE5DA] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-800 bg-white/80 border border-slate-200 z-30 transition cursor-pointer shadow-2xs"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── TOP HEADER (Brand Identity) ── */}
        <div className="px-6 py-5 bg-[#FAF9F5] border-b border-[#EAE5DA] pr-16 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 border-2 border-white overflow-hidden flex items-center justify-center font-black text-lg text-white shadow-md shrink-0">
            {studio.logo_url || studio.avatar_url ? (
              <img src={studio.logo_url || studio.avatar_url} alt={studio.studio_name} className="w-full h-full object-cover" />
            ) : (
              studio.studio_name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900">{studio.studio_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                {studio.subscription_plan.toUpperCase()}
              </span>
              {studio.is_platform_blocked && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                  🚫 SUSPENDED
                </span>
              )}
              {studio.is_active_today && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium flex-wrap">
              <span>Owner: <strong className="text-slate-800">{studio.owner_name}</strong></span>
              <span>Email: <strong className="text-slate-800 font-mono">{studio.email}</strong></span>
              {studio.phone && <span>Phone: <strong className="text-slate-800 font-mono">{studio.phone}</strong></span>}
              <span className="text-amber-800 font-mono">/{studio.studio_slug}</span>
            </div>
          </div>
        </div>

        {/* ── TABS NAVIGATION ── */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-100 bg-white overflow-x-auto text-xs font-bold">
          {[
            { id: 'overview', label: '1. Identity & Telemetry' },
            { id: 'crm', label: '2. CRM & Financials' },
            { id: 'team', label: '3. Team & Production' },
            { id: 'media', label: '4. Gallery & Video' },
            { id: 'integrations', label: '5. WhatsApp & Cloud' },
            { id: 'overrides', label: '⚡ Quotas & Overrides' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as KundaliTab)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── STATUS MESSAGE ── */}
        {statusMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="p-1 hover:bg-black/5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── TAB CONTENT BODY ── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#FFFDF9]">
          
          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#EAE5DA] space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Account Lifecycle</span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">First Onboarded:</span>
                      <span className="font-bold text-slate-800">{new Date(studio.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Sign-In:</span>
                      <span className="font-bold text-slate-800">{new Date(studio.telemetry.last_sign_in).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan Tier:</span>
                      <span className="font-black text-amber-900 uppercase">{studio.subscription_plan}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#EAE5DA] space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Auditing & Device Telemetry</span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Latest IP:</span>
                      <span className="font-bold text-slate-800">{studio.telemetry.ip_address}</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-slate-500">User Agent:</span>
                      <span className="text-slate-700 truncate max-w-[200px]" title={studio.telemetry.user_agent}>
                        {studio.telemetry.user_agent}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="p-4 rounded-2xl bg-white border border-[#EAE5DA] space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Social Branding Profiles</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                    <span className="text-purple-950 font-bold">Instagram:</span>
                    <span className="font-mono text-purple-700 font-bold">{studio.instagram_handle || 'Not set'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                    <span className="text-rose-950 font-bold">YouTube:</span>
                    <span className="font-mono text-rose-700 font-bold">{studio.youtube_handle || 'Not set'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center justify-between">
                    <span className="text-sky-950 font-bold">Facebook:</span>
                    <span className="font-mono text-sky-700 font-bold">{studio.facebook_handle || 'Not set'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CRM & FINANCIALS */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Total Leads</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{studio.crm.leads_count}</span>
                </div>
                <div className="p-3.5 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Booked Projects</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">{studio.crm.bookings_count}</span>
                </div>
                <div className="p-3.5 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Quotations Generated</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{studio.crm.quotations_count}</span>
                </div>
                <div className="p-3.5 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Conversion Rate</span>
                  <span className="text-2xl font-black text-amber-700 font-mono">{studio.crm.conversion_rate}%</span>
                </div>
              </div>

              {/* Financial Ledger */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Financial Breakdown</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Gross Quotation Value</span>
                    <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(studio.crm.gross_revenue)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <span className="text-[10px] text-emerald-800 block">Advance Received</span>
                    <span className="text-xl font-black text-emerald-800 font-mono">{formatCurrency(studio.crm.advance_received)}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <span className="text-[10px] text-amber-800 block">Balance Pending</span>
                    <span className="text-xl font-black text-amber-900 font-mono">{formatCurrency(studio.crm.balance_pending)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEAM & PRODUCTION */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Total Crew Mapped</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{studio.team.total_crew}</span>
                </div>
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">In-House Staff</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">{studio.team.in_house}</span>
                </div>
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Post-Production Projects</span>
                  <span className="text-2xl font-black text-purple-700 font-mono">{studio.team.post_production_projects}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GALLERY & VIDEO REVIEW */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">AI Gallery Collections</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{studio.media.gallery_collections}</span>
                  <p className="text-[11px] text-slate-400 mt-1">{studio.media.gallery_photos} Photos Uploaded</p>
                </div>
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Video Review Cards</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{studio.media.video_review_cards}</span>
                  <p className="text-[11px] text-slate-400 mt-1">{studio.media.video_storage_mb} MB Video Storage</p>
                </div>
                <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Total Storage Used</span>
                  <span className="text-2xl font-black text-indigo-900 font-mono">{studio.media.total_storage_gb} GB</span>
                  <p className="text-[11px] text-slate-400 mt-1">Quota: {studio.media.allocated_quota_gb} GB ({studio.media.storage_usage_percent}%)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WHATSAPP & CLOUD */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">WhatsApp Engine (Baileys)</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    studio.integrations.whatsapp.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    studio.integrations.whatsapp.status === 'PAIRING_REQUIRED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {studio.integrations.whatsapp.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Linked Phone:</span>
                    <span className="font-mono font-bold text-slate-800">{studio.integrations.whatsapp.phone_number || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Messages Dispatched:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {studio.integrations.whatsapp.messages_dispatched} / {studio.integrations.whatsapp.quota_allowance}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-[#EAE5DA] rounded-xl flex items-center justify-between">
                  <span>Google Drive Sync:</span>
                  <span className={`font-bold ${studio.integrations.google_drive.connected ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {studio.integrations.google_drive.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <div className="p-3 bg-white border border-[#EAE5DA] rounded-xl flex items-center justify-between">
                  <span>Meta Lead-Gen Ads:</span>
                  <span className={`font-bold ${studio.integrations.meta_ads.connected ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {studio.integrations.meta_ads.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GOD-MODE GOVERNANCE CONSOLE */}
          {activeTab === 'overrides' && (
            <div className="space-y-4">
              
              {/* Status & Notification Banner */}
              {statusMsg && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
                  statusMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border border-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{statusMsg.text}</span>
                  </div>
                  <button type="button" onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 1. Subscription Plan Tier */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" /> Subscription Plan Tier
                    </span>
                    <span className="text-[11px] text-slate-500">Overrides the tenant's current billing plan.</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                    Active: {customPlan.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { id: 'trial', name: 'Free Trial', price: '₹0 (14d)', quota: '10GB' },
                    { id: 'starter', name: 'Starter Solo', price: '₹799/mo', quota: '30GB' },
                    { id: 'pro', name: 'Studio Pro', price: '₹1,799/mo', quota: '150GB', popular: true },
                    { id: 'enterprise', name: 'Agency Ent.', price: '₹3,499/mo', quota: '600GB' },
                    { id: 'vip', name: 'Lifetime VIP', price: 'Founder Gift', quota: '1TB' },
                  ].map((p) => {
                    const isSelected = customPlan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setCustomPlan(p.id);
                          if (p.id === 'starter') {
                            setCustomStorageGb(30);
                            setCustomLimits(prev => ({ ...prev, team_members: 1, events_per_month: 5 }));
                          } else if (p.id === 'pro') {
                            setCustomStorageGb(150);
                            setCustomLimits(prev => ({ ...prev, team_members: 5, events_per_month: 25 }));
                          } else if (p.id === 'enterprise') {
                            setCustomStorageGb(600);
                            setCustomLimits(prev => ({ ...prev, team_members: 99, events_per_month: 999 }));
                          } else if (p.id === 'vip') {
                            setCustomStorageGb(1000);
                            setCustomLimits(prev => ({ ...prev, team_members: 999, events_per_month: 999 }));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                          isSelected 
                            ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-2 ring-amber-500/20' 
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        {p.popular && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-black rounded-md uppercase">
                            Popular
                          </span>
                        )}
                        <div>
                          <span className={`text-xs font-black block ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{p.price}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 mt-2 block">{p.quota}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Subscription Validity & Expiry Extender */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" /> Subscription Expiry & Validity Extender
                    </span>
                    <span className="text-[11px] text-slate-500">Add bonus days or set exact expiry date.</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {customExpiresAt ? new Date(customExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry Set'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                    {[
                      { label: '+2 Days', days: 2 },
                      { label: '+7 Days', days: 7 },
                      { label: '+15 Days', days: 15 },
                      { label: '+30 Days (1 Mo)', days: 30 },
                      { label: '+90 Days (3 Mo)', days: 90 },
                      { label: '+1 Year', days: 365 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handleAddDays(btn.days)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[11px] font-bold text-slate-500">Custom Date:</span>
                    <input
                      type="date"
                      value={customExpiresAt}
                      onChange={(e) => setCustomExpiresAt(e.target.value)}
                      className="px-3 py-1.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Storage Quota Allowance (Backblaze B2) */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-indigo-600" /> B2 Cloud Storage Quota
                    </span>
                    <span className="text-[11px] text-slate-500">Enter custom GB limit or select a preset chip.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Custom Limit:</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="5"
                        max="5000"
                        value={customStorageGb}
                        onChange={(e) => setCustomStorageGb(Math.max(5, Number(e.target.value)))}
                        className="w-24 px-3 py-1.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 text-right pr-8"
                      />
                      <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">GB</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[30, 50, 100, 150, 250, 500, 1000].map(gb => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setCustomStorageGb(gb)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        customStorageGb === gb 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                          : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-950 border-slate-200 text-slate-700'
                      }`}
                    >
                      {gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Granular Feature Toggles (6 Switches) */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-3">
                <div>
                  <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-purple-600" /> Granular Feature Switches
                  </span>
                  <span className="text-[11px] text-slate-500">Turn specific features ON or OFF for this workspace regardless of base tier.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { key: 'ai_face_search', label: '3D AI Face Search', icon: Sparkles, desc: 'Modal GPU face clustering & guest selfie match' },
                    { key: 'video_review', label: 'Video Proofing Portal', icon: Film, desc: 'Client review cards & frame comments' },
                    { key: 'team_payroll', label: 'Team Payroll & Staff', icon: Users2, desc: 'In-house staff, freelancers & commercial payouts' },
                    { key: 'whatsapp_automation', label: 'WhatsApp Workflows', icon: MessageSquare, desc: 'Auto-lead enrollment & dispatch sequences' },
                    { key: 'white_label', label: 'White-Label Branding', icon: Shield, desc: 'Remove "Powered by StudioCore" watermark' },
                    { key: 'client_portal', label: 'Branded Client Portal', icon: Globe, desc: 'Client moodboards & selection portals' },
                  ].map((feat) => {
                    const isEnabled = Boolean((featureOverrides as any)[feat.key]);
                    const Icon = feat.icon;
                    return (
                      <div
                        key={feat.key}
                        onClick={() => {
                          setFeatureOverrides(prev => ({
                            ...prev,
                            [feat.key]: !isEnabled,
                          }));
                        }}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 select-none ${
                          isEnabled 
                            ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-300/40' 
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEnabled ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black truncate ${isEnabled ? 'text-purple-950' : 'text-slate-600'}`}>
                              {feat.label}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                              isEnabled ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isEnabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{feat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Custom Limits & Audit Notes */}
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-4">
                <span className="text-xs font-black text-slate-900 block">Custom Quotas & Administrative Record</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Max Team Seats</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={customLimits.team_members}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, team_members: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Max Events / Month</label>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={customLimits.events_per_month}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, events_per_month: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Monthly AI Scans Limit</label>
                    <input
                      type="number"
                      min="100"
                      max="999999"
                      value={customLimits.ai_scans}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, ai_scans: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Founder / Admin Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Granted special 150GB quota & VIP features for annual partnership"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Suspension Zone */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Platform Suspension Switch</span>
                    <span className="text-[11px] text-slate-500">Instantly revoke studio login access across all crew members.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBlocked(!isBlocked)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      isBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {isBlocked ? '✓ Account Blocked (Click to Unlock)' : '🚫 Suspend Studio Access'}
                  </button>
                </div>
              </div>

              {/* Master Save Button Bar */}
              <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-950 block">Apply All God-Mode Changes</span>
                  <span className="text-[11px] text-amber-800">Saves plan, storage, expiry, features, and custom limits atomically.</span>
                </div>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    handleExecuteOverride('save_god_mode', {
                      plan: customPlan,
                      expiresAt: customExpiresAt ? new Date(customExpiresAt + 'T23:59:59.999Z').toISOString() : undefined,
                      storageQuotaGb: Number(customStorageGb),
                      isBlocked,
                      features: featureOverrides,
                      customLimits,
                      adminNotes,
                    });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs hover:from-amber-600 hover:to-orange-600 shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Apply God-Mode Overrides
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FAF9F5] border-t border-[#EAE5DA] flex items-center justify-between text-xs text-slate-500">
          <span>Studio ID: <strong className="font-mono text-slate-700">{studio.id}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
