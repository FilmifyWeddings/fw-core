'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Sparkles,
  Camera,
  Globe,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Save,
  Check,
  Palette,
  Layout,
  Smartphone,
  Monitor,
  Sliders,
  Shield,
  Heart,
  ChevronRight,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import GalleryDesignStudio from '@/components/gallery/GalleryDesignStudio';
import CountryPhoneInput from '@/components/ui/CountryPhoneInput';

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

interface GallerySettingsData {
  studio_name: string;
  studio_subtitle: string;
  owner_name: string;
  tagline: string;
  about_bio: string;
  logo_url: string;
  favicon_url: string;
  phone: string;
  email: string;
  website: string;
  google_maps_url: string;
  studio_address: string;
  social_links: {
    instagram: string;
    facebook: string;
    youtube: string;
    whatsapp: string;
  };
  social_visibility: {
    whatsapp: boolean;
    instagram: boolean;
    facebook: boolean;
    youtube: boolean;
  };
  template_preset: 'royal_classic' | 'minimalist_ivory' | 'cinematic_velvet';
  accent_color: string;
  font_pairing: 'playfair_inter' | 'cormorant_jakarta' | 'cinzel_outfit' | 'syne_inter';
  show_branding_watermark: boolean;
  enable_client_favorites: boolean;
  enable_pin_protection_default: boolean;
  cover_focal_point: { x: number; y: number };
  cover_zoom: number;
  cover_overlay_opacity: number;
  gallery_design?: any;
}

const DEFAULT_SETTINGS: GallerySettingsData = {
  studio_name: 'StudioCore Photography',
  studio_subtitle: 'Luxury Wedding Photography & Cinematography',
  owner_name: 'Lead Artist',
  tagline: 'Preserving Sacred & Timeless Celebrations',
  about_bio: 'Crafting heartfelt visual legacies for couples who cherish authentic emotion, cinematic beauty, and timeless romance.',
  logo_url: '',
  favicon_url: '',
  phone: '+91 98765 43210',
  email: 'studio@studiocore.in',
  website: 'https://studiocore.in',
  google_maps_url: '',
  studio_address: 'Bandra West, Mumbai, Maharashtra 400050',
  social_links: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/',
    whatsapp: '+919876543210',
  },
  social_visibility: {
    whatsapp: true,
    instagram: true,
    facebook: true,
    youtube: true,
  },
  template_preset: 'royal_classic',
  accent_color: '#D97706',
  font_pairing: 'cormorant_jakarta',
  show_branding_watermark: true,
  enable_client_favorites: true,
  enable_pin_protection_default: false,
  cover_focal_point: { x: 50, y: 50 },
  cover_zoom: 1,
  cover_overlay_opacity: 40,
};

type ActiveTab = 'profile' | 'branding' | 'design' | 'framing';

export default function GallerySettingsPage() {
  const { workspaceId, activeWorkspace, workspaceName, workspaceConfig, userId, loading: wsLoading } = useWorkspace();
  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || userId || '';
  const effectiveLogo = workspaceConfig?.logoUrl || activeWorkspace?.avatarUrl || '';

  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [settings, setSettings] = useState<GallerySettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoInput, setLogoInput] = useState('');

  // Load existing gallery settings & auto-sync with CRM workspace profile
  useEffect(() => {
    async function loadSettings() {
      if (!effectiveWsId) {
        if (!wsLoading) setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/gallery/settings?workspace_id=${encodeURIComponent(effectiveWsId)}`);
        const json = await res.json();
        if (json.success && json.settings) {
          const syncedBrand = activeWorkspace?.studioName || workspaceName || json.settings.studio_name || '';
          const syncedLogo = workspaceConfig?.logoUrl || activeWorkspace?.avatarUrl || json.settings.logo_url || '';

          setSettings({
            ...DEFAULT_SETTINGS,
            ...json.settings,
            studio_name: json.settings.studio_name || syncedBrand,
            logo_url: json.settings.logo_url || syncedLogo,
            social_links: {
              ...DEFAULT_SETTINGS.social_links,
              ...(json.settings.social_links || {}),
            },
            social_visibility: {
              ...DEFAULT_SETTINGS.social_visibility,
              ...(json.settings.social_visibility || {}),
            },
          });
          setLogoInput(json.settings.logo_url || syncedLogo);
        }
      } catch (err) {
        console.error('Failed to load gallery settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [effectiveWsId, wsLoading, activeWorkspace, workspaceName, workspaceConfig]);

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!effectiveWsId) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const resolvedLogo = logoInput.trim() || effectiveLogo || settings.logo_url;
      const payload = {
        ...settings,
        logo_url: resolvedLogo,
      };

      const res = await fetch('/api/gallery/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWsId,
          settings: payload,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(json.error || 'Failed to save settings');
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: any; desc: string }[] = [
    { id: 'profile', label: 'Profile & Identity', icon: Camera, desc: 'Studio name, bio & guest portal logo' },
    { id: 'branding', label: 'Branding & Social', icon: Globe, desc: 'Contact info, phone & social channels' },
    { id: 'design', label: 'Design & Templates', icon: Palette, desc: 'Color palettes, typography & themes' },
    { id: 'framing', label: 'Cover Framing', icon: Layout, desc: 'Desktop vs. mobile responsive crop preview' },
  ];

  if (loading) {
    return <StudioCoreLiquidLoader label="Loading Gallery Settings..." fullscreen={false} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SAVE BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-2xs">
              <Settings className="w-4 h-4 text-amber-700" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider bg-[#F4F1EA] text-zinc-600 px-3 py-1 rounded-full border border-[#E7E2D8]">
              AI Gallery Customizer
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Gallery Brand Settings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">
            Customize how your studio looks and feels across all public client galleries and QR guest portals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/workspace/gallery"
            className="px-4 py-2.5 rounded-full bg-[#F4F1EA] hover:bg-white text-zinc-700 font-bold text-xs border border-[#E7E2D8] transition"
          >
            ← Back to Events
          </Link>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer select-none ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Save className="w-3.5 h-3.5 text-white" />
            )}
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved Perfectly!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LUXURY PILL TABS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 menu-scrollbar">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-zinc-900 border border-[#E7E2D8] shadow-xs'
                  : 'bg-[#F4F1EA]/80 text-zinc-500 hover:text-zinc-800 hover:bg-white/60 border border-transparent'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-zinc-400'}`} />
              <div className="text-left">
                <span className="block leading-none">{tab.label}</span>
                <span className="text-[10px] font-normal text-zinc-400 block mt-0.5">{tab.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TAB CONTENT PANELS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs space-y-6">

        {/* TAB 1: PROFILE & IDENTITY */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-zinc-900">Studio Profile &amp; Portal Identity</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Information displayed in client gallery footers, headers, and the mobile guest scanner.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700">Studio Brand Name *</label>
                <input
                  type="text"
                  value={settings.studio_name}
                  onChange={(e) => setSettings({ ...settings, studio_name: e.target.value })}
                  placeholder="e.g. Royal Wedding Cinema"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700">Studio Subtitle</label>
                <input
                  type="text"
                  value={settings.studio_subtitle || ''}
                  onChange={(e) => setSettings({ ...settings, studio_subtitle: e.target.value })}
                  placeholder="e.g. Luxury Wedding Photography & Cinematography"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700">Owner / Lead Photographer</label>
                <input
                  type="text"
                  value={settings.owner_name}
                  onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
                  placeholder="e.g. Rohan Verma"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">About Studio Bio</label>
              <textarea
                rows={3}
                value={settings.about_bio}
                onChange={(e) => setSettings({ ...settings, about_bio: e.target.value })}
                placeholder="Write a brief introduction about your studio's creative philosophy..."
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition resize-none"
              />
            </div>

            {/* Auto-Synced Studio Profile & Logo Card */}
            <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {(logoInput || effectiveLogo || settings.logo_url) ? (
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#E7E2D8] p-1.5 flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
                    <img
                      src={logoInput || effectiveLogo || settings.logo_url}
                      alt="Studio Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-serif font-black flex items-center justify-center text-xl shadow-xs shrink-0">
                    {(settings.studio_name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 block">{settings.studio_name || 'Studio Profile'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ✓ Auto-Synced
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Official studio logo &amp; brand name automatically synchronize from your CRM workspace profile across all client galleries, covers, and headers.
                  </p>
                </div>
              </div>

              <Link
                href="/workspace/settings"
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-amber-400 text-zinc-700 text-xs font-bold transition text-center shrink-0 shadow-2xs hover:text-amber-700"
              >
                Manage Studio Profile →
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: BRANDING & SOCIAL */}
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-zinc-900">Branding, Contacts &amp; Social Channels</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Provide contact info and authentic social handles so clients and event guests can connect directly with you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Studio Phone Number</span>
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Public Email Address</span>
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="hello@studio.in"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-600" />
                  <span>Website URL</span>
                </label>
                <input
                  type="url"
                  value={settings.website}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  placeholder="https://studiocore.in"
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Google Maps Review URL</span>
                </label>
                <input
                  type="url"
                  value={settings.google_maps_url}
                  onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">Studio Address</label>
              <input
                type="text"
                value={settings.studio_address}
                onChange={(e) => setSettings({ ...settings, studio_address: e.target.value })}
                placeholder="e.g. 402, Signature Tower, Mumbai, India"
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* Social Channels with Authentic Logos & Visibility Toggles */}
            <div className="p-5 rounded-3xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-4">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-zinc-900 block">Social Media Handles</span>
                <span className="text-[11px] text-zinc-400">Direct links displayed as luxury buttons on the client portal</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* 1. WhatsApp */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-3 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden p-1">
                        <img src="/assets/icons/Whatsapp.png" alt="WhatsApp" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 leading-tight">WhatsApp Contact</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Direct Connect
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">Click-to-chat button on gallery footer</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${settings.social_visibility?.whatsapp !== false ? 'text-emerald-700' : 'text-zinc-400'}`}>
                        {settings.social_visibility?.whatsapp !== false ? 'Shown' : 'Hidden'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.social_visibility?.whatsapp !== false}
                        onClick={() => {
                          const curr = settings.social_visibility?.whatsapp !== false;
                          setSettings({
                            ...settings,
                            social_visibility: {
                              ...settings.social_visibility,
                              whatsapp: !curr,
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          settings.social_visibility?.whatsapp !== false ? 'bg-[#25D366]' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.social_visibility?.whatsapp !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <CountryPhoneInput
                      value={settings.social_links.whatsapp}
                      onChange={(full) =>
                        setSettings({
                          ...settings,
                          social_links: { ...settings.social_links, whatsapp: full },
                        })
                      }
                      placeholder="98765 43210"
                      disabled={settings.social_visibility?.whatsapp === false}
                    />
                  </div>
                </div>

                {/* 2. Instagram */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-3 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 leading-tight">Instagram</span>
                          <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                            Profile
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">Link to studio Instagram portfolio</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${settings.social_visibility?.instagram !== false ? 'text-pink-600' : 'text-zinc-400'}`}>
                        {settings.social_visibility?.instagram !== false ? 'Shown' : 'Hidden'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.social_visibility?.instagram !== false}
                        onClick={() => {
                          const curr = settings.social_visibility?.instagram !== false;
                          setSettings({
                            ...settings,
                            social_visibility: {
                              ...settings.social_visibility,
                              instagram: !curr,
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          settings.social_visibility?.instagram !== false ? 'bg-pink-600' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.social_visibility?.instagram !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.instagram}
                    disabled={settings.social_visibility?.instagram === false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-pink-500 disabled:opacity-50 transition"
                  />
                </div>

                {/* 3. Facebook */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-3 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <FacebookIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 leading-tight">Facebook</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            Business Page
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">Link to studio Facebook page</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${settings.social_visibility?.facebook !== false ? 'text-blue-600' : 'text-zinc-400'}`}>
                        {settings.social_visibility?.facebook !== false ? 'Shown' : 'Hidden'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.social_visibility?.facebook !== false}
                        onClick={() => {
                          const curr = settings.social_visibility?.facebook !== false;
                          setSettings({
                            ...settings,
                            social_visibility: {
                              ...settings.social_visibility,
                              facebook: !curr,
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          settings.social_visibility?.facebook !== false ? 'bg-[#1877F2]' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.social_visibility?.facebook !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.facebook}
                    disabled={settings.social_visibility?.facebook === false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, facebook: e.target.value },
                      })
                    }
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-blue-500 disabled:opacity-50 transition"
                  />
                </div>

                {/* 4. YouTube */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-3 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FF0000] flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <YoutubeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 leading-tight">YouTube</span>
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            Cinematics
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">Link to films and wedding teasers</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${settings.social_visibility?.youtube !== false ? 'text-red-600' : 'text-zinc-400'}`}>
                        {settings.social_visibility?.youtube !== false ? 'Shown' : 'Hidden'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.social_visibility?.youtube !== false}
                        onClick={() => {
                          const curr = settings.social_visibility?.youtube !== false;
                          setSettings({
                            ...settings,
                            social_visibility: {
                              ...settings.social_visibility,
                              youtube: !curr,
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          settings.social_visibility?.youtube !== false ? 'bg-[#FF0000]' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.social_visibility?.youtube !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.youtube}
                    disabled={settings.social_visibility?.youtube === false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, youtube: e.target.value },
                      })
                    }
                    placeholder="https://youtube.com/@channel"
                    className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-red-500 disabled:opacity-50 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESIGN & TEMPLATES (GLOBAL STUDIO DEFAULTS) */}
        {activeTab === 'design' && (
          <div className="w-full -mx-4 sm:-mx-8 -my-6 bg-white rounded-3xl overflow-hidden border border-[#E7E2D8] shadow-xs">
            <GalleryDesignStudio
              isGlobalDefault={true}
              gallery={{
                title: 'Studio Wedding Archive',
                event_date: new Date().toISOString(),
                studio_branding: {
                  studio_name: settings.studio_name,
                  logo_url: settings.logo_url,
                  tagline: settings.tagline,
                  subtitle: settings.studio_subtitle,
                },
                raw_payload: {
                  design: (settings as any).gallery_design,
                },
              }}
              onSaveSuccess={() => {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
            />
          </div>
        )}

        {/* TAB 4: COVER FRAMING */}
        {activeTab === 'framing' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-zinc-900">Responsive Cover Framing Preview</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Test how your event hero banner frames seamlessly across wide desktop monitors and narrow mobile smartphone screens.
              </p>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-3xl bg-[#FBF9F5] border border-[#E7E2D8]">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-700">
                  <span>Horizontal Focal Point</span>
                  <span>{settings.cover_focal_point.x}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.cover_focal_point.x}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cover_focal_point: { ...settings.cover_focal_point, x: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-700">
                  <span>Vertical Focal Point</span>
                  <span>{settings.cover_focal_point.y}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.cover_focal_point.y}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cover_focal_point: { ...settings.cover_focal_point, y: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-700">
                  <span>Cover Dim Overlay</span>
                  <span>{settings.cover_overlay_opacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={settings.cover_overlay_opacity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cover_overlay_opacity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>
            </div>

            {/* Dual Screen Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Desktop Monitor Simulator */}
              <div className="lg:col-span-8 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-zinc-700">
                  <Monitor className="w-4 h-4 text-amber-600" />
                  <span>Desktop Widescreen View (16:9 Aspect)</span>
                </div>

                <div className="relative h-64 rounded-3xl overflow-hidden border border-[#E7E2D8] bg-zinc-900 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
                    alt="Desktop Cover Simulated"
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      objectPosition: `${settings.cover_focal_point.x}% ${settings.cover_focal_point.y}%`,
                    }}
                  />
                  <div
                    className="absolute inset-0 bg-black transition-opacity"
                    style={{ opacity: settings.cover_overlay_opacity / 100 }}
                  />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-300">
                      {settings.studio_name} Presents
                    </span>
                    <h3 className="text-xl font-black">Rohit &amp; Anjali Grand Wedding</h3>
                    <p className="text-xs text-white/80 mt-0.5">Taj Lake Palace, Udaipur • 24 Dec 2026</p>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Simulator */}
              <div className="lg:col-span-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-zinc-700">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Mobile Phone View (9:16 Portrait)</span>
                </div>

                <div className="relative h-64 w-48 mx-auto rounded-3xl overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
                    alt="Mobile Cover Simulated"
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      objectPosition: `${settings.cover_focal_point.x}% ${settings.cover_focal_point.y}%`,
                    }}
                  />
                  <div
                    className="absolute inset-0 bg-black transition-opacity"
                    style={{ opacity: settings.cover_overlay_opacity / 100 }}
                  />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end text-white text-center">
                    <span className="text-[8px] uppercase font-black tracking-wider text-amber-300 truncate">
                      {settings.studio_name}
                    </span>
                    <h4 className="text-xs font-black line-clamp-1">Rohit &amp; Anjali</h4>
                    <p className="text-[9px] text-white/70">Udaipur, Rajasthan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
