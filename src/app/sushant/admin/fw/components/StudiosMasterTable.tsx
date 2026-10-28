'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, Filter, ShieldCheck, 
  ExternalLink, User, Phone, Mail, ChevronRight, 
  HardDrive, MessageSquare, AlertCircle, Eye, 
  CheckCircle2, ArrowUpDown, Lock, Sparkles 
} from 'lucide-react';

export interface StudioItem {
  id: string;
  user_id: string;
  studio_name: string;
  studio_slug: string;
  owner_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  logo_url: string;
  address: string;
  instagram_handle: string;
  youtube_handle: string;
  facebook_handle: string;
  website_url: string;
  platform_role: string;
  subscription_plan: string;
  subscription_expires_at: string;
  is_platform_blocked: boolean;
  created_at: string;
  last_active_at: string;
  is_active_today: boolean;
  is_active_week: boolean;

  crm: {
    leads_count: number;
    quotations_count: number;
    bookings_count: number;
    conversion_rate: number;
    gross_revenue: number;
    advance_received: number;
    balance_pending: number;
  };

  team: {
    total_crew: number;
    in_house: number;
    freelancers: number;
    post_production_projects: number;
  };

  media: {
    gallery_collections: number;
    gallery_photos: number;
    gallery_storage_mb: number;
    video_review_cards: number;
    video_storage_mb: number;
    total_storage_mb: number;
    total_storage_gb: number;
    allocated_quota_gb: number;
    storage_usage_percent: number;
  };

  integrations: {
    whatsapp: {
      status: 'CONNECTED' | 'PAIRING_REQUIRED' | 'DISCONNECTED';
      phone_number: string;
      last_connected: string | null;
      messages_dispatched: number;
      quota_allowance: number;
      usage_percent: number;
      templates_count: number;
      templates_quota: number;
    };
    google_drive: {
      connected: boolean;
    };
    meta_ads: {
      connected: boolean;
    };
  };

  telemetry: {
    ip_address: string;
    user_agent: string;
    first_onboarding: string;
    last_sign_in: string;
  };
}

interface StudiosMasterTableProps {
  studios: StudioItem[];
  onInspectStudio: (studio: StudioItem) => void;
  onRefresh: () => void;
}

type TabKey = 'all' | 'paid' | 'trial' | 'active_today' | 'blocked';
type SortKey = 'active' | 'name' | 'plan' | 'revenue' | 'storage';

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return 'Never';
  const diffSec = Math.floor((Date.now() - time) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function StudiosMasterTable({
  studios,
  onInspectStudio,
  onRefresh,
}: StudiosMasterTableProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('active');

  const filteredStudios = useMemo(() => {
    return studios
      .filter((s) => {
        // Tab filter
        if (activeTab === 'paid') {
          if (!['pro', 'business', 'enterprise'].includes(s.subscription_plan)) return false;
        } else if (activeTab === 'trial') {
          if (s.subscription_plan !== 'trial') return false;
        } else if (activeTab === 'active_today') {
          if (!s.is_active_today) return false;
        } else if (activeTab === 'blocked') {
          if (!s.is_platform_blocked) return false;
        }

        // Search filter
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.studio_name.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.studio_slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.studio_name.localeCompare(b.studio_name);
        if (sortBy === 'plan') return a.subscription_plan.localeCompare(b.subscription_plan);
        if (sortBy === 'revenue') return b.crm.gross_revenue - a.crm.gross_revenue;
        if (sortBy === 'storage') return b.media.total_storage_mb - a.media.total_storage_mb;
        // Default: active
        return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
      });
  }, [studios, activeTab, search, sortBy]);

  return (
    <div className="bg-white border border-[#EAE5DA] rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden space-y-4 p-4 sm:p-6">
      
      {/* ── TOP CONTROLS & TABS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all', label: 'All Studios', count: studios.length },
            { id: 'paid', label: 'Paid Tier', count: studios.filter(s => ['pro', 'business', 'enterprise'].includes(s.subscription_plan)).length },
            { id: 'trial', label: 'Trial', count: studios.filter(s => s.subscription_plan === 'trial').length },
            { id: 'active_today', label: 'Active Today', count: studios.filter(s => s.is_active_today).length },
            { id: 'blocked', label: 'Suspended', count: studios.filter(s => s.is_platform_blocked).length },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs font-black'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200/60 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studio, owner, phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE5DA] text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-transparent text-xs font-bold text-slate-700 py-0.5 px-2 focus:outline-none cursor-pointer"
            >
              <option value="active">Sort: Last Active</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="revenue">Sort: Highest Revenue</option>
              <option value="storage">Sort: Cloud Storage</option>
              <option value="plan">Sort: Plan Tier</option>
            </select>
          </div>
        </div>

      </div>

      {/* ── TABLE VIEW ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Studio & Owner</th>
              <th className="py-2.5 px-3">Contacts & Socials</th>
              <th className="py-2.5 px-3">Plan & Status</th>
              <th className="py-2.5 px-3">CRM Load</th>
              <th className="py-2.5 px-3">Cloud Media (R2/S3)</th>
              <th className="py-2.5 px-3">WhatsApp Matrix</th>
              <th className="py-2.5 px-3">Activity</th>
              <th className="py-2.5 px-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudios.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-xs">No studios match the selected filter or search query.</p>
                </td>
              </tr>
            ) : (
              filteredStudios.map((s) => (
                <tr 
                  key={s.id} 
                  className="hover:bg-amber-50/30 transition-colors group"
                >
                  
                  {/* 1. Studio & Owner */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 overflow-hidden flex items-center justify-center font-black text-xs text-amber-900 shrink-0 shadow-2xs">
                        {s.logo_url || s.avatar_url ? (
                          <img src={s.logo_url || s.avatar_url} alt={s.studio_name} className="w-full h-full object-cover" />
                        ) : (
                          s.studio_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 truncate block text-xs">
                            {s.studio_name}
                          </span>
                          {s.is_platform_blocked && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 shrink-0">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{s.owner_name}</span>
                        </div>
                        <span className="text-[10px] text-amber-800/80 font-mono block truncate">
                          /{s.studio_slug}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Contacts & Socials */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-mono">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]" title={s.email}>{s.email}</span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
                        {s.instagram_handle && (
                          <span className="text-purple-600 font-bold" title={`Instagram: ${s.instagram_handle}`}>
                            IG: @{s.instagram_handle.replace('@', '')}
                          </span>
                        )}
                        {s.youtube_handle && (
                          <span className="text-rose-600 font-bold" title={`YouTube: ${s.youtube_handle}`}>
                            YT
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Plan & Status */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-block border ${
                        s.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                        s.subscription_plan === 'business' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                        s.subscription_plan === 'pro' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {s.subscription_plan}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Expires: {new Date(s.subscription_expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </td>

                  {/* 4. CRM Load */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-slate-800 text-xs">
                        {formatCurrency(s.crm.gross_revenue)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <span>{s.crm.leads_count} Leads</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-emerald-700">{s.crm.bookings_count} Booked</span>
                      </div>
                      {s.crm.leads_count > 0 && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          {s.crm.conversion_rate}% Conversion
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 5. Cloud Media (R2/S3) */}
                  <td className="py-3 px-3">
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-indigo-950 font-mono">{s.media.total_storage_gb} GB</span>
                        <span className="text-slate-400 font-normal">/ {s.media.allocated_quota_gb} GB</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            s.media.storage_usage_percent > 85 ? 'bg-rose-500' :
                            s.media.storage_usage_percent > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, s.media.storage_usage_percent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{s.media.gallery_collections} Gall.</span>
                        <span>{s.media.gallery_photos} Photos</span>
                      </div>
                    </div>
                  </td>

                  {/* 6. WhatsApp Matrix */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 w-fit ${
                        s.integrations.whatsapp.status === 'CONNECTED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : s.integrations.whatsapp.status === 'PAIRING_REQUIRED'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.integrations.whatsapp.status === 'CONNECTED' ? 'bg-emerald-500' :
                          s.integrations.whatsapp.status === 'PAIRING_REQUIRED' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <span>{s.integrations.whatsapp.status}</span>
                      </span>

                      <p className="text-[10px] text-slate-500 font-medium font-mono">
                        {s.integrations.whatsapp.messages_dispatched} / {s.integrations.whatsapp.quota_allowance} msgs
                      </p>
                    </div>
                  </td>

                  {/* 7. Activity & Relative Time */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                        {s.is_active_today && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        <span>{formatRelativeTime(s.last_active_at)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Joined {new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>

                  {/* 8. Action: Inspect Studio */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectStudio(s)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-500 hover:text-white border border-[#EAE5DA] text-slate-700 text-xs font-black transition-all shadow-2xs group-hover:border-amber-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 text-right text-[11px] text-slate-400 font-medium border-t border-slate-100">
        Displaying {filteredStudios.length} of {studios.length} Total Studios
      </div>

    </div>
  );
}
