'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  X,
  Copy,
  Check,
  RefreshCw,
  Tag,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Video,
  Star,
  Activity,
  FolderPlus,
} from 'lucide-react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { ProgressiveSmoothImage } from '@/components/gallery/ProgressiveSmoothImage';

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
  status?: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'unpublished' | 'expired'>('all');

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
    is_face_ai_enabled: true,
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
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

  // Current Date Header Formatter
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Summary Metrics Computation (Image 2 Stats Bar)
  const totalPhotos = useMemo(() => {
    return galleries.reduce((acc, g) => acc + (g.photo_count || 0), 0);
  }, [galleries]);

  const totalFaces = useMemo(() => {
    return galleries.reduce((acc, g) => acc + (g.total_faces || 0), 0);
  }, [galleries]);

  const publishedCount = useMemo(() => {
    return galleries.filter((g) => {
      const s = g.status?.toUpperCase();
      return s === 'PUBLISHED' || (g.is_active && s !== 'UNPUBLISHED' && s !== 'EXPIRED');
    }).length;
  }, [galleries]);

  const unpublishedCount = useMemo(() => {
    return galleries.filter((g) => {
      const s = g.status?.toUpperCase();
      return s === 'UNPUBLISHED' || (!g.is_active && s !== 'EXPIRED');
    }).length;
  }, [galleries]);

  const expiredCount = useMemo(() => {
    return galleries.filter((g) => g.status?.toUpperCase() === 'EXPIRED').length;
  }, [galleries]);

  const totalStorageBytes = useMemo(() => {
    return galleries.reduce((acc, g) => {
      if (g.total_size_bytes && Number(g.total_size_bytes) > 0) {
        return acc + Number(g.total_size_bytes);
      }
      if (g.total_size_mb) {
        return acc + parseFloat(g.total_size_mb) * 1024 * 1024;
      }
      return acc;
    }, 0);
  }, [galleries]);

  const totalStorageDisplay = useMemo(() => {
    if (totalStorageBytes <= 0) return { value: '0', unit: 'MB' };
    if (totalStorageBytes >= 1024 * 1024 * 1024) {
      return {
        value: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2),
        unit: 'GB',
      };
    }
    return {
      value: (totalStorageBytes / (1024 * 1024)).toFixed(1),
      unit: 'MB',
    };
  }, [totalStorageBytes]);

  const formatStorageSize = useCallback((g: EventGallery) => {
    if (g.total_size_bytes && Number(g.total_size_bytes) > 0) {
      const bytes = Number(g.total_size_bytes);
      if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      }
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (g.total_size_mb) {
      const mb = parseFloat(g.total_size_mb);
      if (mb >= 1000) {
        return `${(mb / 1024).toFixed(2)} GB`;
      }
      return `${mb.toFixed(1)} MB`;
    }
    return '0 MB';
  }, []);

  // Filtered galleries by active tab and search query
  const filteredGalleries = useMemo(() => {
    let result = galleries;
    if (activeTab === 'published') {
      result = result.filter((g) => {
        const s = g.status?.toUpperCase();
        return s === 'PUBLISHED' || (g.is_active && s !== 'UNPUBLISHED' && s !== 'EXPIRED');
      });
    } else if (activeTab === 'unpublished') {
      result = result.filter((g) => {
        const s = g.status?.toUpperCase();
        return s === 'UNPUBLISHED' || (!g.is_active && s !== 'EXPIRED');
      });
    } else if (activeTab === 'expired') {
      result = result.filter((g) => g.status?.toUpperCase() === 'EXPIRED');
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        (g.event_type && g.event_type.toLowerCase().includes(q))
    );
  }, [galleries, activeTab, searchQuery]);

  return (
    <div className="w-full bg-[#FAF9F5] text-zinc-900 font-sans px-4 sm:px-6 lg:px-8 py-6 space-y-7">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR: DASHBOARD TITLE, DATE, SEARCH & + NEW EVENT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 
              style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight"
            >
              Events
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
              Gallery Studio
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            {todayDateStr}
          </p>
        </div>

        {/* Search & Main Action Button */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or clients..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-full border border-[#E7E2D8] text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setIsSlugManuallyEdited(false);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer shrink-0 select-none active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>NEW PROJECT</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC TILES: 4 CLEAN STAT CARDS (PROJECTS, PHOTOS, AI, STORAGE)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* PROJECTS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Projects</span>
            <Layers className="w-3.5 h-3.5 text-amber-600/70" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
              {galleries.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {publishedCount} published • {unpublishedCount} unpublished{expiredCount > 0 ? ` • ${expiredCount} expired` : ''}
            </p>
          </div>
        </div>

        {/* PHOTOS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Photos</span>
            <ImageIcon className="w-3.5 h-3.5 text-amber-600/70" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
              {totalPhotos.toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Indexed & search ready
            </p>
          </div>
        </div>

        {/* AI DISCOVERIES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">AI Discoveries</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600/70" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
              {totalFaces.toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Guest selfie matches
            </p>
          </div>
        </div>

        {/* STORAGE */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Storage</span>
            <HardDrive className="w-3.5 h-3.5 text-amber-600/70" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
              {totalStorageDisplay.value} <span className="text-xs font-normal text-zinc-400 font-sans">{totalStorageDisplay.unit}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              of 1,000 GB plan
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. "YOUR PROJECTS" SECTION WITH FILTER TABS (EXACT IMAGE 2)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE6DF] pb-3">
          <div className="flex items-center gap-3">
            <h2 
              style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              className="text-2xl font-medium text-zinc-900 tracking-tight"
            >
              Your Projects
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono">
              {filteredGalleries.length}
            </span>
          </div>

          {/* Capsule Filter Tabs (All / Published / Unpublished / Expired) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#E7E2D8] shadow-2xs self-start sm:self-center overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setActiveTab('unpublished')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === 'unpublished'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Unpublished ({unpublishedCount})
            </button>
            {expiredCount > 0 && (
              <button
                onClick={() => setActiveTab('expired')}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  activeTab === 'expired'
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Expired ({expiredCount})
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. EDITORIAL SERIF CARDS GRID (EXACT IMAGE 2 REFERENCE)
        ───────────────────────────────────────────────────────────── */}
        {loading && galleries.length === 0 ? (
          <StudioCoreLiquidLoader label="Loading Projects..." fullscreen={false} />
        ) : filteredGalleries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E2D8] space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-[#FAF9F5] text-amber-600 border border-[#E7E2D8] flex items-center justify-center mx-auto shadow-2xs">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                className="text-xl font-medium text-zinc-800"
              >
                {searchQuery ? 'No matching projects found' : 'No Projects Created Yet'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {searchQuery
                  ? `No event matched "${searchQuery}". Clear your search or create a new project.`
                  : 'Create your first luxury wedding gallery. Guests scan table standees, take a selfie, and discover their photos instantly.'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsSlugManuallyEdited(false);
                setIsCreateModalOpen(true);
              }}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold inline-flex items-center gap-2 hover:from-amber-600 hover:to-amber-700 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGalleries.map((gallery) => {
              const publicLink = getPublicUrl(gallery.slug);
              const eventTypeLabel = gallery.event_type || 'Wedding';
              const isPrivate = !!gallery.pin_code;
              const formattedDate = gallery.event_date
                ? new Date(gallery.event_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Date Pending';

              return (
                <div
                  key={gallery.id}
                  className="group bg-white rounded-3xl border border-[#E7E2D8] shadow-2xs overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-400/80"
                >
                  {/* Card Cover (16:10 Landscape Proportions) - Clickable to open project */}
                  <Link 
                    href={`/workspace/gallery/${gallery.id}`}
                    className="block relative aspect-[16/10] bg-[#F5F2EB] border-b border-[#E7E2D8] overflow-hidden cursor-pointer"
                    title={`Open ${gallery.title}`}
                  >
                    {/* Underlying placeholder: shown while loading or if cover image is missing/broken */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F5] to-[#EFECE4] text-zinc-400">
                      <div className="w-12 h-12 rounded-2xl bg-white/80 border border-[#E7E2D8] flex items-center justify-center shadow-2xs mb-1.5">
                        <Camera className="w-6 h-6 text-amber-600/70" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                        Cover Photo
                      </span>
                    </div>

                    {gallery.cover_url && (
                      <ProgressiveSmoothImage
                        src={gallery.cover_url}
                        alt={gallery.title}
                        className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    )}

                    {/* Subtle Gradient Scrim at top */}
                    <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

                    {/* Status Pill Badge (PUBLISHED / UNPUBLISHED / EXPIRED) */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-center justify-between pointer-events-none">
                      {(() => {
                        const s = gallery.status?.toUpperCase();
                        const isExpired = s === 'EXPIRED';
                        const isPublished = s === 'PUBLISHED' || (gallery.is_active && s !== 'UNPUBLISHED' && s !== 'EXPIRED');

                        if (isExpired) {
                          return (
                            <span className="px-2.5 py-1 rounded-md backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border shadow-xs bg-rose-600/90 text-white border-white/40">
                              EXPIRED
                            </span>
                          );
                        }
                        if (isPublished) {
                          return (
                            <span className="px-2.5 py-1 rounded-md backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border shadow-xs bg-emerald-600/90 text-white border-white/60">
                              PUBLISHED
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 rounded-md backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border shadow-xs bg-amber-500/90 text-white border-white/40">
                            UNPUBLISHED
                          </span>
                        );
                      })()}

                      {/* Event Type / Tag */}
                      <span className="px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px] font-medium border border-white/20">
                        {eventTypeLabel}
                      </span>
                    </div>
                  </Link>

                  {/* Card Body (High-End Editorial Typography - Image 2) */}
                  <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* 🌟 CARD NAME IN EDITORIAL SERIF FONT */}
                      <Link 
                        href={`/workspace/gallery/${gallery.id}`}
                        className="block group-hover:text-amber-800 transition"
                      >
                        <h3 
                          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                          className="text-xl sm:text-2xl font-normal text-zinc-900 tracking-tight leading-snug line-clamp-1"
                          title={gallery.title}
                        >
                          {gallery.title}
                        </h3>
                      </Link>

                      {/* Sub-line (Slug / Couple name) in clean subtle italic font */}
                      <p className="text-xs text-zinc-400 font-normal italic truncate mt-0.5">
                        /g/{gallery.slug}
                      </p>

                      {/* Metadata Row: Date & Photos */}
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{formattedDate}</span>
                        </div>
                        <span className="text-zinc-300">•</span>
                        <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                          <span>{gallery.photo_count || 0} photos</span>
                        </div>
                      </div>
                    </div>

                    {/* Storage Line (Image 2 style) */}
                    <div className="space-y-3">
                      <div className="border-t border-[#F2EEE6] pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                          Storage
                        </span>
                        <span className="font-mono font-semibold text-zinc-600 text-xs">
                          {formatStorageSize(gallery)}
                        </span>
                      </div>

                      {/* Card Action Pill Buttons */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#F2EEE6]">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/workspace/gallery/${gallery.id}`}
                            className="py-1.5 px-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setStandeeGallery(gallery);
                              setIsStandeeModalOpen(true);
                            }}
                            className="py-1.5 px-3 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
                            title="Table Standee & QR"
                          >
                            <QrCode className="w-3.5 h-3.5 text-amber-600" />
                            <span>Standee</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={publicLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                            title="Open Client Live Portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
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
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* ─────────────────────────────────────────────────────────────
          6. CREATE EVENT MODAL WITH 3D DROPDOWN & CUSTOM TYPE ADDER
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
                <h3 
                  style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                  className="text-lg font-medium text-zinc-900"
                >
                  Create New Event
                </h3>
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
                    slug: isSlugManuallyEdited ? prev.slug : autoSlug,
                  }));
                }}
                className="w-full px-4 py-2.5 bg-[#FBF9F5] rounded-2xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* Custom URL Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700">Custom URL Slug *</label>
                {isSlugManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlugManuallyEdited(false);
                      const autoSlug = createForm.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                      setCreateForm((prev) => ({ ...prev, slug: autoSlug }));
                    }}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                  >
                    Reset to Auto
                  </button>
                )}
              </div>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-[#F4F1EA] border border-r-0 border-[#E7E2D8] rounded-l-2xl text-xs text-zinc-500 font-mono">
                  studiocore.in/g/
                </span>
                <input
                  type="text"
                  required
                  placeholder="rohit-anjali"
                  value={createForm.slug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setIsSlugManuallyEdited(val.length > 0);
                    setCreateForm((prev) => ({
                      ...prev,
                      slug: val,
                    }));
                  }}
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

            {/* AI Face Recognition Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] flex items-center justify-between gap-3">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-zinc-900">AI Face Recognition &amp; Search</span>
                </div>
                <p className="text-[10.5px] text-zinc-500 leading-snug">
                  Automatically index faces so guests can find their photos via live selfie. Turn OFF for standard non-AI photo delivery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateForm((prev) => ({ ...prev, is_face_ai_enabled: !prev.is_face_ai_enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  createForm.is_face_ai_enabled ? 'bg-amber-600' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    createForm.is_face_ai_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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
          7. MODAL: TABLE STANDEE & QR DISPLAY
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && standeeGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#E7E2D8] shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span 
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                className="text-sm font-normal text-zinc-900 line-clamp-1"
              >
                {standeeGallery.title}
              </span>
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
                className="w-full py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
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
