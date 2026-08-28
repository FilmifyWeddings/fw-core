'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Plus,
  QrCode,
  ExternalLink,
  Trash2,
  Lock,
  Calendar,
  Image as ImageIcon,
  HardDrive,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { batchUploadPhotos } from '@/lib/imageProcessor';

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
  photo_count?: number;
  total_size_bytes?: number;
  total_size_mb?: string;
  total_faces?: number;
  created_at: string;
}

export default function GalleryManagerPage() {
  const [galleries, setGalleries] = useState<EventGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGallery, setSelectedGallery] = useState<EventGallery | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);

  // Standee State
  const [standeeGallery, setStandeeGallery] = useState<EventGallery | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    event_date: new Date().toISOString().split('T')[0],
    pin_code: '',
    allow_downloads: true,
  });
  const [creating, setCreating] = useState(false);

  // Upload Queue State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percentage: number; status: string }>({
    current: 0,
    total: 0,
    percentage: 0,
    status: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gallery/events');
      const json = await res.json();
      if (json.success && Array.isArray(json.galleries)) {
        setGalleries(json.galleries);
      }
    } catch (err) {
      console.error('Failed to load galleries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  // Handle Create Gallery
  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/gallery/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success && json.gallery) {
        setIsCreateModalOpen(false);
        setCreateForm({
          title: '',
          slug: '',
          event_date: new Date().toISOString().split('T')[0],
          pin_code: '',
          allow_downloads: true,
        });
        await fetchGalleries();
        // Automatically open upload modal for the newly created gallery
        setSelectedGallery(json.gallery);
        setIsUploadModalOpen(true);
      } else {
        alert(json.error || 'Failed to create gallery');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating gallery');
    } finally {
      setCreating(false);
    }
  };

  // Handle Batch File Selection & Direct R2 Upload
  const handleStartUpload = async () => {
    if (!selectedGallery || uploadFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: uploadFiles.length,
      percentage: 0,
      status: 'Starting WebP multi-variant compression...',
    });

    try {
      const result = await batchUploadPhotos(selectedGallery.id, uploadFiles, (current, total, percentage, status) => {
        setUploadProgress({ current, total, percentage, status });
      });

      if (result.success) {
        setUploadFiles([]);
        setIsUploadModalOpen(false);
        await fetchGalleries();
        alert(`🎉 Successfully uploaded and indexed ${result.uploadedCount} photos to Cloudflare R2!`);
      } else {
        alert(`Upload finished with some notices. Uploaded ${result.uploadedCount} photos.`);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Delete Gallery
  const handleDeleteGallery = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" and all its photos?`)) return;

    try {
      const res = await fetch(`/api/gallery/events?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setGalleries(prev => prev.filter(g => g.id !== id));
      }
    } catch (err: any) {
      alert(`Error deleting gallery: ${err.message}`);
    }
  };

  // Aggregate Metrics
  const totalGalleries = galleries.length;
  const totalPhotos = galleries.reduce((acc, g) => acc + (g.photo_count || 0), 0);
  const totalFaces = galleries.reduce((acc, g) => acc + (g.total_faces || 0), 0);
  const totalStorageGb = (
    galleries.reduce((acc, g) => acc + (g.total_size_bytes || 0), 0) / (1024 ** 3)
  ).toFixed(2);

  const getPublicUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/g/${slug}`;
    }
    return `https://studiocore.in/g/${slug}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. LUXURY HERO HEADER & METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                AI Wedding Galleries &amp; Face Search
              </span>
              <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                ⚡ Sub-Second pgvector Match
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Wedding Event AI Galleries
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl leading-relaxed">
              Create luxury guest portals with automated client-side WebP compression, direct Cloudflare R2 uploads, and instant selfie face recognition matching.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-zinc-900/10 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Create New Event Gallery</span>
          </button>
        </div>

        {/* Overview Storage & AI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-100">
          <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Galleries</span>
              <Camera className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-zinc-900">{totalGalleries}</p>
            <span className="text-[10px] font-bold text-zinc-400">Live Client Portals</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Photos</span>
              <ImageIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-zinc-900">{totalPhotos.toLocaleString('en-IN')}</p>
            <span className="text-[10px] font-bold text-emerald-600">WebP + RAW Variants</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Indexed Faces</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-zinc-900">{totalFaces.toLocaleString('en-IN')}</p>
            <span className="text-[10px] font-bold text-blue-600">512-D Vector Embeddings</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cloudflare R2</span>
              <HardDrive className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-zinc-900">{totalStorageGb} <span className="text-xs font-bold text-zinc-400">GB</span></p>
            <span className="text-[10px] font-bold text-purple-600">Zero Server Egress Cost</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. GALLERIES LIST & GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-zinc-900">Event Galleries</h2>
          <button
            onClick={fetchGalleries}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>

        {loading && galleries.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
            <p className="text-xs font-bold">Loading your AI event galleries...</p>
          </div>
        ) : galleries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-800">No Wedding Galleries Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Create your first AI Wedding Gallery. Guests can scan table standees, take a quick selfie, and instantly find all their photos in under a second!
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-zinc-800 transition cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Create First Gallery</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map(gallery => {
              const publicLink = getPublicUrl(gallery.slug);

              return (
                <div
                  key={gallery.id}
                  className="bg-white rounded-3xl border border-[#E7E2D8] shadow-2xs overflow-hidden flex flex-col justify-between hover:border-amber-400 transition-all group"
                >
                  {/* Gallery Cover Header */}
                  <div className="relative h-44 bg-zinc-900 overflow-hidden">
                    {gallery.cover_url ? (
                      <img
                        src={gallery.cover_url}
                        alt={gallery.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-500">
                        <Camera className="w-10 h-10 mb-1 text-zinc-600" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-500">No Cover Set</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      {gallery.pin_code ? (
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black border border-white/20 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>PIN Protected</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-black">
                          🟢 Public Access
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>{new Date(gallery.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </span>
                    </div>

                    {/* Title in Cover */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-black text-white line-clamp-1 drop-shadow-sm">
                        {gallery.title}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-300 truncate">
                        /g/{gallery.slug}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8]">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Photos</span>
                        <span className="text-sm font-black text-zinc-800">{gallery.photo_count || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8]">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">AI Faces</span>
                        <span className="text-sm font-black text-blue-600">{gallery.total_faces || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8]">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Storage</span>
                        <span className="text-sm font-black text-purple-600">{gallery.total_size_mb || 0} <span className="text-[9px]">MB</span></span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedGallery(gallery);
                            setIsUploadModalOpen(true);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>+ Upload Photos</span>
                        </button>

                        <button
                          onClick={() => {
                            setStandeeGallery(gallery);
                            setIsStandeeModalOpen(true);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>Table Standee</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`/g/${gallery.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>Open Guest Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => handleDeleteGallery(gallery.id, gallery.title)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CREATE EVENT GALLERY MODAL
      ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleCreateGallery} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-zinc-900">Create Event AI Gallery</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rohit & Anjali's Grand Wedding"
                value={createForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  setCreateForm(prev => ({
                    ...prev,
                    title,
                    slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
                  }));
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Custom URL Slug *</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-zinc-100 border border-r-0 border-zinc-200 rounded-l-xl text-xs text-zinc-500 font-mono">
                  studiocore.in/g/
                </span>
                <input
                  type="text"
                  required
                  placeholder="rohit-anjali"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-r-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={createForm.event_date}
                  onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Guest PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 2026"
                  value={createForm.pin_code}
                  onChange={(e) => setCreateForm({ ...createForm, pin_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 flex items-center justify-between">
              <div>
                <span className="font-bold block">Allow High-Res Downloads</span>
                <span className="text-[10px] text-amber-800">Guests can download full original photos directly from R2</span>
              </div>
              <input
                type="checkbox"
                checked={createForm.allow_downloads}
                onChange={(e) => setCreateForm({ ...createForm, allow_downloads: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                <span>{creating ? 'Creating Event...' : 'Create & Upload Photos'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BATCH PHOTO UPLOADER MODAL (CLIENT WEBP + DIRECT R2)
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && selectedGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-zinc-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Upload Photos: {selectedGallery.title}</h3>
                <span className="text-xs text-zinc-400">Client-Side WebP Compression + Direct R2 Pipeline</span>
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!uploading ? (
              <div className="space-y-4">
                {/* Drag & Drop Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-300 hover:border-amber-500 bg-[#FBF9F5] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-800">
                      Click or Drag &amp; Drop Wedding Photos Here
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Supports JPEG, JPG, PNG, WebP (Upload hundreds of photos in parallel)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>

                {uploadFiles.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{uploadFiles.length} photos ready for high-speed direct upload</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={uploadFiles.length === 0}
                    onClick={handleStartUpload}
                    className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Upload &amp; Auto-Index Faces ({uploadFiles.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Live Upload Progress Screen */
              <div className="py-8 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-zinc-900">
                    Uploading &amp; Compressing to Cloudflare R2...
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono">
                    {uploadProgress.status || `Processing photo ${uploadProgress.current} of ${uploadProgress.total}`}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 max-w-md mx-auto">
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                    <span>{uploadProgress.current} / {uploadProgress.total} uploaded</span>
                    <span>{uploadProgress.percentage}%</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-zinc-400">
                  ⚡ Client Web Workers are compressing WebP previews and streaming directly to R2 bucket.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TABLE STANDEE & QR CODE GENERATOR MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && standeeGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-zinc-900">Printable Wedding Table Standee</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Luxury Standee Card Preview */}
            <div id="standee-print-card" className="bg-[#FAF9F5] border-2 border-amber-400/60 rounded-3xl p-8 text-center space-y-5 shadow-inner">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
                  ✨ Instant AI Guest Gallery
                </span>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight pt-2">
                  {standeeGallery.title}
                </h2>
                <p className="text-xs text-zinc-500 font-serif italic">
                  Find all your wedding photos instantly with AI Selfie Search
                </p>
              </div>

              {/* QR Code */}
              <div className="w-44 h-44 bg-white p-3 rounded-2xl border-2 border-zinc-900 mx-auto shadow-md flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getPublicUrl(standeeGallery.slug))}`}
                  alt="Gallery QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-zinc-800">1. Scan QR with your phone camera</p>
                <p className="font-bold text-zinc-800">2. Take a quick selfie to find your photos</p>
                {standeeGallery.pin_code && (
                  <p className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-block border border-amber-300">
                    PIN Code: {standeeGallery.pin_code}
                  </p>
                )}
              </div>

              <div className="pt-2 text-[10px] font-bold text-zinc-400 tracking-wider uppercase border-t border-zinc-200">
                Powered by StudioCore AI
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Standee Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getPublicUrl(standeeGallery.slug));
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
