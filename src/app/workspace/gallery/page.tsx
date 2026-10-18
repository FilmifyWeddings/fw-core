'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  Plus,
  QrCode,
  ExternalLink,
  Trash2,
  Lock,
  Calendar,
  Image as ImageIcon,
  HardDrive,
  Users,
  Search,
  X,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Tag,
  ChevronDown,
  Layers,
} from 'lucide-react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { useWorkspace } from '@/lib/context/BhamstraContext';

interface EventGallery {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active: boolean;
  event_type?: string;
  photo_count?: number;
  total_size_bytes?: number;
  total_size_mb?: string;
  total_faces?: number;
  created_at: string;
}

interface EventTypeOption {
  id: string;
  label: string;
  icon: string;
}

const DEFAULT_EVENT_TYPES: EventTypeOption[] = [
  { id: 'wedding', label: 'Wedding', icon: '💍' },
  { id: 'engagement', label: 'Engagement', icon: '💎' },
  { id: 'haldi', label: 'Haldi Ceremony', icon: '💛' },
  { id: 'sangeet', label: 'Sangeet & Mehendi', icon: '🎶' },
  { id: 'reception', label: 'Grand Reception', icon: '🥂' },
  { id: 'pre_wedding', label: 'Pre-Wedding Shoot', icon: '📸' },
  { id: 'birthday', label: 'Birthday Celebration', icon: '🎂' },
  { id: 'baby_shower', label: 'Baby Shower', icon: '👶' },
  { id: 'corporate', label: 'Corporate Event', icon: '🏢' },
  { id: 'anniversary', label: 'Anniversary', icon: '💖' },
  { id: 'maternity', label: 'Maternity Shoot', icon: '🌸' },
];

export default function MyEventsPage() {
  const { workspaceId, activeWorkspace, userId, loading: wsLoading } = useWorkspace();
  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || userId || '';

  const router = useRouter();

  const [galleries, setGalleries] = useState<EventGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [standeeGallery, setStandeeGallery] = useState<EventGallery | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Event Types & Custom Types
  const [customEventTypes, setCustomEventTypes] = useState<EventTypeOption[]>([]);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('✨');

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'Wedding',
  });
  const [creating, setCreating] = useState(false);

  // Load custom event types from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sc_custom_event_types');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomEventTypes(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Fetch galleries strictly scoped to current studio owner's workspace
  const fetchGalleries = useCallback(async () => {
    if (!effectiveWsId) return;

    try {
      const res = await fetch(`/api/gallery/events?workspace_id=${encodeURIComponent(effectiveWsId)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.galleries)) {
        setGalleries(json.galleries);
      }
    } catch (err) {
      console.error('Failed to load studio galleries:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId]);

  useEffect(() => {
    if (effectiveWsId) {
      fetchGalleries();
    } else if (!wsLoading) {
      setLoading(false);
    }
  }, [effectiveWsId, wsLoading, fetchGalleries]);

  // Combined list of event types
  const allEventTypes = useMemo(() => {
    return [...DEFAULT_EVENT_TYPES, ...customEventTypes];
  }, [customEventTypes]);

  // Handle adding custom event type
  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const newType: EventTypeOption = {
      id: newTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: newTypeName.trim(),
      icon: newTypeIcon.trim() || '✨',
    };

    const updated = [...customEventTypes, newType];
    setCustomEventTypes(updated);
    try {
      localStorage.setItem('sc_custom_event_types', JSON.stringify(updated));
    } catch (_) {}

    setCreateForm((prev) => ({ ...prev, event_type: newType.label }));
    setNewTypeName('');
    setIsAddingCustomType(false);
  };

  // Handle Create Gallery -> Redirects straight to collection studio
  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/gallery/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          workspace_id: effectiveWsId,
        }),
      });
      const json = await res.json();
      if (json.success && json.gallery) {
        setIsCreateModalOpen(false);
        router.push(`/workspace/gallery/${json.gallery.id}`);
      } else {
        alert(json.error || 'Failed to create gallery');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating gallery');
    } finally {
      setCreating(false);
    }
  };

  // Delete Gallery
  const handleDeleteGallery = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" and all its photos?`)) return;

    try {
      const res = await fetch(`/api/gallery/events?id=${id}&workspace_id=${encodeURIComponent(effectiveWsId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setGalleries((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err: any) {
      alert(`Error deleting gallery: ${err.message}`);
    }
  };

  const getPublicUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/g/${slug}`;
    }
    return `https://studiocore.in/g/${slug}`;
  };

  // Filtered galleries by search query
  const filteredGalleries = useMemo(() => {
    if (!searchQuery.trim()) return galleries;
    const q = searchQuery.toLowerCase();
    return galleries.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        (g.event_type && g.event_type.toLowerCase().includes(q))
    );
  }, [galleries, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER WITH ROUNDED SEARCH & "+ CREATE EVENT" PILL
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-2xs">
                <Camera className="w-4 h-4 text-amber-700" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider bg-[#F4F1EA] text-zinc-600 px-3 py-1 rounded-full border border-[#E7E2D8]">
                AI Client Portals
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              My Events
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
              Manage your wedding &amp; event collections, generate live table QR standees, and review guest face AI discovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer shrink-0 select-none active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Create Event</span>
            </button>
          </div>
        </div>

        {/* Real-Time Rounded Search Bar & Fast Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F2EEE6]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, couple name, or slug..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#FAF9F5] rounded-full border border-[#E7E2D8] text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 self-end sm:self-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{galleries.length} Total Events</span>
            </span>
            <button
              onClick={fetchGalleries}
              className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E7E2D8] text-zinc-500 hover:text-zinc-800 transition"
              title="Refresh Events"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MINIMALIST AESTHETIC EVENT CARDS (HOVER LIFT ANIMATION)
      ───────────────────────────────────────────────────────────── */}
      {loading && galleries.length === 0 ? (
        <StudioCoreLiquidLoader label="Loading Events..." fullscreen={false} />
      ) : filteredGalleries.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E2D8] space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF9F5] text-amber-600 border border-[#E7E2D8] flex items-center justify-center mx-auto shadow-2xs">
            <Camera className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-800">
              {searchQuery ? 'No matching events found' : 'No Events Created Yet'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {searchQuery
                ? `No event matched "${searchQuery}". Clear your search or create a new event.`
                : 'Create your first luxury event gallery. Guests scan table standees, take a selfie, and find all their photos instantly.'}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold inline-flex items-center gap-2 hover:from-amber-600 hover:to-amber-700 transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Create Event</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGalleries.map((gallery) => {
            const publicLink = getPublicUrl(gallery.slug);
            const eventTypeLabel = gallery.event_type || 'Wedding';

            return (
              <div
                key={gallery.id}
                className="group bg-white rounded-3xl border border-[#E7E2D8] shadow-2xs overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-400/80"
              >
                {/* Card Thumbnail / Header */}
                <div className="relative h-48 bg-[#F5F2EB] border-b border-[#E7E2D8] overflow-hidden">
                  {gallery.cover_url ? (
                    <img
                      src={gallery.cover_url}
                      alt={gallery.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F5] to-[#EFECE4] text-zinc-400">
                      <div className="w-12 h-12 rounded-2xl bg-white/80 border border-[#E7E2D8] flex items-center justify-center shadow-2xs mb-1.5">
                        <Camera className="w-6 h-6 text-amber-600/70" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                        Warm Cream Studio Cover
                      </span>
                    </div>
                  )}

                  {/* Gradient Scrim for Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badges on Cover */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-zinc-900 text-[10px] font-black border border-white/60 flex items-center gap-1 shadow-2xs">
                      <span>🏷️</span>
                      <span>{eventTypeLabel}</span>
                    </span>

                    {gallery.pin_code ? (
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-black border border-white/20 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>PIN Protected</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black shadow-2xs">
                        🟢 Live
                      </span>
                    )}
                  </div>

                  {/* Event Title on Cover */}
                  <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                    <h3 className="text-base font-black text-white line-clamp-1 drop-shadow-sm">
                      {gallery.title}
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-300 truncate">
                      /g/{gallery.slug}
                    </p>
                  </div>
                </div>

                {/* Card Body & Metrics */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        {gallery.event_date
                          ? new Date(gallery.event_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'No Date'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>{gallery.photo_count || 0} Photos</span>
                      <span className="text-zinc-300">•</span>
                      <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                      <span>{gallery.total_size_mb || 0} MB</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#F2EEE6]">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/workspace/gallery/${gallery.id}`}
                        className="py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Manage Gallery</span>
                      </Link>

                      <button
                        onClick={() => {
                          setStandeeGallery(gallery);
                          setIsStandeeModalOpen(true);
                        }}
                        className="py-2.5 px-3 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-600" />
                        <span>Table Standee</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={publicLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Open Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => handleDeleteGallery(gallery.id, gallery.title)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Gallery"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. CREATE EVENT MODAL WITH 3D DROPDOWN & CUSTOM TYPE ADDER
      ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateGallery}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E7E2D8] shadow-2xl space-y-4 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
                  <Camera className="w-4 h-4 text-amber-700" />
                </div>
                <h3 className="text-base font-black text-zinc-900">Create New Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Title */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rohit & Anjali's Grand Wedding"
                value={createForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const autoSlug = title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                  setCreateForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
                  }));
                }}
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* Custom URL Slug */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Custom URL Slug *</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-[#F4F1EA] border border-r-0 border-[#E7E2D8] rounded-l-2xl text-xs text-zinc-500 font-mono">
                  studiocore.in/g/
                </span>
                <input
                  type="text"
                  required
                  placeholder="rohit-anjali"
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] rounded-r-2xl border border-[#E7E2D8] text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={createForm.event_date}
                onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* 3D Styled Event Type Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700">Event Type</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomType(!isAddingCustomType)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Add Custom Type</span>
                </button>
              </div>

              <div className="relative">
                <select
                  value={createForm.event_type}
                  onChange={(e) => setCreateForm({ ...createForm, event_type: e.target.value })}
                  className="w-full appearance-none px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition cursor-pointer shadow-xs"
                >
                  {allEventTypes.map((type) => (
                    <option key={type.id} value={type.label}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Inline Custom Type Creator */}
              {isAddingCustomType && (
                <div className="mt-2 p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-700 block">Create Custom Event Type</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Icon e.g. 🎉"
                      value={newTypeIcon}
                      onChange={(e) => setNewTypeIcon(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-white rounded-xl border border-[#E7E2D8] text-xs text-center font-bold"
                    />
                    <input
                      type="text"
                      placeholder="e.g. Cocktail Night"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-[#E7E2D8] text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomType}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                <span>{creating ? 'Creating Album...' : 'Create Album & Open Studio'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-3 rounded-full bg-[#F4F1EA] hover:bg-[#EBE7DF] text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL: TABLE STANDEE & QR DISPLAY
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && standeeGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#E7E2D8] shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-900 line-clamp-1">{standeeGallery.title}</span>
              <button
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8] flex flex-col items-center justify-center space-y-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  getPublicUrl(standeeGallery.slug)
                )}`}
                alt="QR Code"
                className="w-40 h-40 rounded-xl bg-white p-2 shadow-2xs border border-zinc-200"
              />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Scan for Instant AI Face Find
              </span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getPublicUrl(standeeGallery.slug));
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="w-full py-2.5 px-3 rounded-full bg-[#FAF9F5] hover:bg-white text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Link Copied!' : 'Copy Portal URL'}</span>
              </button>

              <a
                href={getPublicUrl(standeeGallery.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Live Portal</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
