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
  template_preset: 'royal_classic' | 'minimalist_ivory' | 'cinematic_velvet';
  accent_color: string;
  font_pairing: 'playfair_inter' | 'cormorant_jakarta' | 'cinzel_outfit' | 'syne_inter';
  show_branding_watermark: boolean;
  enable_client_favorites: boolean;
  enable_pin_protection_default: boolean;
  cover_focal_point: { x: number; y: number };
  cover_zoom: number;
  cover_overlay_opacity: number;
}

const DEFAULT_SETTINGS: GallerySettingsData = {
  studio_name: 'StudioCore Photography',
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
  const { workspaceId, activeWorkspace, userId, loading: wsLoading } = useWorkspace();
  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || userId || '';

  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [settings, setSettings] = useState<GallerySettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoInput, setLogoInput] = useState('');

  // Load existing gallery settings
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
          setSettings(json.settings);
          setLogoInput(json.settings.logo_url || '');
        }
      } catch (err) {
        console.error('Failed to load gallery settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [effectiveWsId, wsLoading]);

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!effectiveWsId) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        ...settings,
        logo_url: logoInput.trim() || settings.logo_url,
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
                <label className="block text-xs font-bold text-zinc-700">Studio Name *</label>
                <input
                  type="text"
                  value={settings.studio_name}
                  onChange={(e) => setSettings({ ...settings, studio_name: e.target.value })}
                  placeholder="e.g. Royal Wedding Cinema"
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
              <label className="block text-xs font-bold text-zinc-700">Brand Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                placeholder="e.g. Capturing timeless love stories and authentic emotions"
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
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

            {/* Studio Logo Setup */}
            <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-zinc-900 block">Portal Studio Logo</span>
                  <span className="text-[11px] text-zinc-400">High-resolution PNG/SVG with transparent background</span>
                </div>
                {logoInput && (
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E7E2D8] p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img src={logoInput} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>

              <input
                type="text"
                value={logoInput}
                onChange={(e) => {
                  setLogoInput(e.target.value);
                  setSettings({ ...settings, logo_url: e.target.value });
                }}
                placeholder="https://example.com/your-logo.png"
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-[#E7E2D8] text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-amber-500"
              />
              <p className="text-[10px] text-zinc-400">
                Tip: Enter your public image URL or paste an asset link. This logo appears in the top navigation of all client galleries.
              </p>
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

            {/* Social Channels with Authentic Logos */}
            <div className="p-5 rounded-3xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-4">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-zinc-900 block">Social Media Handles</span>
                <span className="text-[11px] text-zinc-400">Direct links displayed as luxury buttons on the client portal</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instagram */}
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E7E2D8]">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.instagram}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/yourhandle"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 focus:outline-hidden"
                  />
                </div>

                {/* Facebook */}
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E7E2D8]">
                  <div className="w-8 h-8 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <FacebookIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.facebook}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, facebook: e.target.value },
                      })
                    }
                    placeholder="https://facebook.com/yourpage"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 focus:outline-hidden"
                  />
                </div>

                {/* YouTube */}
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E7E2D8]">
                  <div className="w-8 h-8 rounded-xl bg-[#FF0000] flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <YoutubeIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.youtube}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, youtube: e.target.value },
                      })
                    }
                    placeholder="https://youtube.com/@channel"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 focus:outline-hidden"
                  />
                </div>

                {/* WhatsApp */}
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E7E2D8]">
                  <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={settings.social_links.whatsapp}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        social_links: { ...settings.social_links, whatsapp: e.target.value },
                      })
                    }
                    placeholder="+919876543210 (with country code)"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESIGN & TEMPLATES */}
        {activeTab === 'design' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-zinc-900">Client Portal Design &amp; Aesthetics</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Choose visual themes, accent colors, and typography styles for client galleries.
              </p>
            </div>

            {/* Template Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">Preset Theme Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'royal_classic',
                    name: 'Royal Classic',
                    desc: 'Regal warm gold highlights & timeless serif typography',
                    badge: 'Most Popular',
                  },
                  {
                    id: 'minimalist_ivory',
                    name: 'Minimalist Ivory',
                    desc: 'Clean ivory monochrome with subtle borders and serene whitespace',
                    badge: 'Modern',
                  },
                  {
                    id: 'cinematic_velvet',
                    name: 'Cinematic Velvet',
                    desc: 'High contrast visual drama with warm amber undertones',
                    badge: 'Dramatic',
                  },
                ].map((tpl) => {
                  const isSelected = settings.template_preset === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSettings({ ...settings, template_preset: tpl.id as any })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-amber-50/50 border-amber-500 shadow-xs'
                          : 'bg-[#FBF9F5] border-[#E7E2D8] hover:border-zinc-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-zinc-900">{tpl.name}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E7E2D8] text-amber-700">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium">{tpl.desc}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-300" />}
                        <span>{isSelected ? 'Active Template' : 'Select'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">Brand Accent Color</label>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { name: 'Amber Gold', hex: '#D97706' },
                  { name: 'Rose Gold', hex: '#E11D48' },
                  { name: 'Emerald', hex: '#059669' },
                  { name: 'Sapphire', hex: '#2563EB' },
                  { name: 'Midnight', hex: '#18181B' },
                ].map((col) => {
                  const isSelected = settings.accent_color.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setSettings({ ...settings, accent_color: col.hex })}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isSelected ? 'bg-white border-zinc-900 shadow-2xs' : 'bg-[#FBF9F5] border-[#E7E2D8]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: col.hex }} />
                      <span>{col.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-zinc-900" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Pairings */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">Typography Font Pairing</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'cormorant_jakarta', title: 'Cormorant + Plus Jakarta Sans', desc: 'Luxury editorial serif paired with modern crisp sans' },
                  { id: 'playfair_inter', title: 'Playfair Display + Inter', desc: 'Classic romance wedding titles with high-legibility body' },
                  { id: 'cinzel_outfit', title: 'Cinzel + Outfit', desc: 'Regal Roman capitals for monumental luxury weddings' },
                  { id: 'syne_inter', title: 'Syne + Inter', desc: 'Artistic contemporary aesthetic for fine art storytellers' },
                ].map((font) => {
                  const isSelected = settings.font_pairing === font.id;
                  return (
                    <div
                      key={font.id}
                      onClick={() => setSettings({ ...settings, font_pairing: font.id as any })}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected ? 'bg-amber-50/50 border-amber-500 shadow-xs' : 'bg-[#FBF9F5] border-[#E7E2D8]'
                      }`}
                    >
                      <span className="text-xs font-black text-zinc-900 block">{font.title}</span>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">{font.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="p-5 rounded-3xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-4">
              <span className="text-xs font-black text-zinc-900 block">Client Experience Toggles</span>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Show Studio Branding &amp; Watermark</span>
                    <span className="text-[11px] text-zinc-400">Display your studio stamp discretely in client photo lightbox</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_branding_watermark}
                    onChange={(e) => setSettings({ ...settings, show_branding_watermark: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Allow Client Favorites &amp; Selections</span>
                    <span className="text-[11px] text-zinc-400">Enable heart button for album selection lists</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_client_favorites}
                    onChange={(e) => setSettings({ ...settings, enable_client_favorites: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Default PIN Protection on New Events</span>
                    <span className="text-[11px] text-zinc-400">Require guests to enter 4-digit PIN before browsing full gallery</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_pin_protection_default}
                    onChange={(e) => setSettings({ ...settings, enable_pin_protection_default: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </label>
              </div>
            </div>
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
