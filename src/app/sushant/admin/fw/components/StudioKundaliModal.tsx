'use client';

import React, { useState } from 'react';
import { 
  X, Copy, Check, Building2, User, Mail, Phone, 
  Calendar, Shield, ShieldAlert, HardDrive, DollarSign, 
  MessageSquare, Globe, LogOut, Clock, Sparkles, 
  ExternalLink, ChevronRight, AlertTriangle, RefreshCw, 
  Camera, Film, Users2 
} from 'lucide-react';
import { StudioItem } from './StudiosMasterTable';

interface StudioKundaliModalProps {
  studio: StudioItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

type KundaliTab = 'overview' | 'crm' | 'team' | 'media' | 'integrations' | 'overrides';

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function StudioKundaliModal({
  studio,
  isOpen,
  onClose,
  onRefreshData,
}: StudioKundaliModalProps) {
  const [activeTab, setActiveTab] = useState<KundaliTab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Override form states
  const [customPlan, setCustomPlan] = useState<string>('trial');
  const [customStorageGb, setCustomStorageGb] = useState<number>(50);
  const [customWhatsappQuota, setCustomWhatsappQuota] = useState<number>(5000);

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
      onRefreshData();
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

          {/* TAB 6: QUOTAS & OVERRIDES */}
          {activeTab === 'overrides' && (
            <div className="space-y-4">
              <div className="p-5 bg-white border border-[#EAE5DA] rounded-3xl space-y-4">
                <span className="text-xs font-black text-slate-900 block">1-Click Quota Bumps & Tier Overrides</span>
                
                {/* Bump Storage Quota */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Storage Quota Allowance (Current: {studio.media.allocated_quota_gb} GB)</label>
                  <div className="flex gap-2">
                    {[50, 100, 250, 500, 1000].map(gb => (
                      <button
                        key={gb}
                        type="button"
                        onClick={() => handleExecuteOverride('bump_quota', { storageQuotaGb: gb })}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-100 hover:text-amber-950 border border-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        Set {gb} GB
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bump WhatsApp Credits */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">WhatsApp Monthly Message Credits (Current: {studio.integrations.whatsapp.quota_allowance})</label>
                  <div className="flex gap-2">
                    {[5000, 10000, 25000, 50000].map(credits => (
                      <button
                        key={credits}
                        type="button"
                        onClick={() => handleExecuteOverride('bump_quota', { whatsappQuota: credits })}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-100 hover:text-emerald-950 border border-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        +{credits.toLocaleString('en-IN')} Msgs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Suspension / Unlock */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Platform Suspension</span>
                    <span className="text-[11px] text-slate-500">Locking prevents tenant from signing in or generating quotations.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteOverride('toggle_block', { isBlocked: !studio.is_platform_blocked })}
                    disabled={isUpdating}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      studio.is_platform_blocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {studio.is_platform_blocked ? 'Unlock & Restore Access' : 'Suspend Studio Access'}
                  </button>
                </div>
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
