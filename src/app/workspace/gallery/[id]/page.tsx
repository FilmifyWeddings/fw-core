'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  Upload,
  ArrowLeft,
  ExternalLink,
  QrCode,
  Lock,
  Calendar,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  HardDrive,
  Users,
  Download,
  Share2,
  Eye,
  RefreshCw,
  Plus,
  X,
  Printer,
  Copy,
  Check,
  Star,
  Edit2,
  Folder,
  FolderPlus,
  CheckSquare,
  Square,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Tag,
  Clock,
  Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { batchUploadPhotos } from '@/lib/imageProcessor';
import { getPublicGalleryUrl } from '@/lib/r2';
import { PremagicLightbox } from '@/components/gallery/PremagicLightbox';

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
  created_at: string;
}

interface GalleryCollection {
  id: string;
  gallery_id: string;
  name: string;
  cover_url: string | null;
  photo_count?: number;
  created_at: string;
}

interface PhotoItem {
  id: string;
  gallery_id: string;
  collection_id: string | null;
  original_key: string;
  preview_key: string;
  thumbnail_key: string;
  preview_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  size_bytes: number;
  face_count: number;
  created_at: string;
}

function AlbumStudioContent() {
  const params = useParams();
  const router = useRouter();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;

  const [gallery, setGallery] = useState<EventGallery | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Selected Photos for Bulk Actions
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGuestListModalOpen, setIsGuestListModalOpen] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null);
  const [registeredGuests, setRegisteredGuests] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexProgress, setReindexProgress] = useState<string>('');

  // Uploader State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTargetCollection, setUploadTargetCollection] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percentage: number; status: string }>({
    current: 0,
    total: 0,
    percentage: 0,
    status: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Safe Multi-Tier Gallery Fetch & Auto-Highlights Initialization
  const loadData = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      let gal: any = null;

      // Tier 1: Service Role API Fetch by ID
      try {
        const gRes = await fetch(`/api/gallery/events?id=${galleryId}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.gallery) {
          gal = gJson.gallery;
        }
      } catch (_) {}

      // Tier 2: Direct Supabase maybeSingle (Safe, no coerce error)
      if (!gal) {
        const { data, error } = await supabase
          .from('event_galleries')
          .select('*')
          .eq('id', galleryId)
          .maybeSingle();

        if (data) {
          gal = data;
        } else {
          // Tier 3: Lookup by slug as fallback
          const { data: slugData } = await supabase
            .from('event_galleries')
            .select('*')
            .eq('slug', galleryId)
            .maybeSingle();

          if (slugData) {
            gal = slugData;
          }
        }
      }

      if (!gal) {
        setGallery(null);
        setLoading(false);
        return;
      }

      setGallery(gal);
      setTitleInput(gal.title);

      // Fetch or Auto-Initialize Collections
      const cRes = await fetch(`/api/gallery/collections?gallery_id=${gal.id}`);
      const cJson = await cRes.json();
      let fetchedCols: GalleryCollection[] = [];

      if (cJson.success && Array.isArray(cJson.collections)) {
        fetchedCols = cJson.collections;
      }

      // If no collection exists yet, auto-create default 'Highlights'
      if (fetchedCols.length === 0) {
        try {
          const createColRes = await fetch('/api/gallery/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gallery_id: gal.id,
              name: 'Highlights',
            }),
          });
          const createColJson = await createColRes.json();
          if (createColJson.success && createColJson.collection) {
            fetchedCols = [{ ...createColJson.collection, photo_count: 0 }];
          }
        } catch (_) {}
      }

      setCollections(fetchedCols);
      loadPeople(gal.id);

      // Fetch Photos
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${gal.id}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setPhotos(pJson.photos);
      }
    } catch (err: any) {
      console.error('Error loading album workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPeople = async (galId: string) => {
    try {
      const res = await fetch(`/api/gallery/people?gallery_id=${galId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.people)) {
        setPeople(json.people);
      }
    } catch (_) {}
  };

  const loadRegisteredGuests = async () => {
    if (!gallery) return;
    try {
      const res = await fetch(`/api/gallery/guest/list?gallery_id=${gallery.id}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.guests)) {
        setRegisteredGuests(json.guests);
      }
    } catch (_) {}
  };

  const handleReindexFaces = async () => {
    if (!gallery || isReindexing) return;
    setIsReindexing(true);
    setReindexProgress('Starting AI Scan...');

    try {
      let offset = 0;
      const limit = 15;
      let hasMore = true;
      let totalFacesIndexed = 0;
      let totalPhotosProcessed = 0;
      let totalPhotos = photos.length || 60;

      while (hasMore) {
        setReindexProgress(
          totalPhotos > 0
            ? `Scanning ${Math.min(offset + limit, totalPhotos)} of ${totalPhotos} photos...`
            : `Scanning batch from ${offset}...`
        );

        const res = await fetch(`/api/gallery/reindex?gallery_id=${gallery.id}&offset=${offset}&limit=${limit}`, {
          method: 'POST',
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed batch reindex');
        }

        totalPhotos = json.totalPhotos || totalPhotos;
        totalFacesIndexed += json.totalFacesFound || 0;
        totalPhotosProcessed += json.indexedCount || 0;

        hasMore = json.hasMore === true;
        offset = json.nextOffset ?? (offset + limit);
      }

      await loadData();
      alert(`Face AI indexing complete! Found ${totalFacesIndexed} real faces across ${totalPhotos} photos.`);
    } catch (err: any) {
      alert(`Re-index notice: ${err.message}`);
      await loadData();
    } finally {
      setIsReindexing(false);
      setReindexProgress('');
    }
  };

  const handlePublishAndNotify = async () => {
    if (!gallery) return;
    setIsPublishing(true);
    try {
      const res = await fetch('/api/gallery/events/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId: gallery.id,
          similarityThreshold: 0.40,
          notifyChannels: ['WHATSAPP', 'EMAIL'],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPublishResult(json);
        setGallery(prev => prev ? { ...prev, is_active: true } : null);
        await loadRegisteredGuests();
      } else {
        alert(json.error || 'Failed to publish');
      }
    } catch (err: any) {
      alert(`Publish error: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // 2. Publish / Unpublish Toggle
  const handleTogglePublish = async () => {
    if (!gallery) return;
    const nextState = !gallery.is_active;

    setGallery(prev => (prev ? { ...prev, is_active: nextState } : null));

    try {
      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, is_active: nextState }),
      });
    } catch (err) {
      console.error('Failed to update publish state:', err);
    }
  };

  // 3. Save Edited Title
  const handleSaveTitle = async () => {
    if (!gallery || !titleInput.trim()) return;
    const newTitle = titleInput.trim();
    setIsEditingTitle(false);
    setGallery(prev => (prev ? { ...prev, title: newTitle } : null));

    try {
      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, title: newTitle }),
      });
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  // 4. Create New Collection / Sub-Event
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery || !newCollectionName.trim()) return;

    try {
      const res = await fetch('/api/gallery/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          name: newCollectionName.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.collection) {
        setCollections(prev => [...prev, { ...json.collection, photo_count: 0 }]);
        setSelectedCollectionId(json.collection.id);
        setNewCollectionName('');
        setIsAddCollectionModalOpen(false);
      }
    } catch (err: any) {
      alert(`Error creating collection: ${err.message}`);
    }
  };

  // 5. Batch Direct-to-R2 Upload with Instant UI Rendering
  const handleStartUpload = async () => {
    if (!gallery || uploadFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: uploadFiles.length,
      percentage: 0,
      status: 'Generating WebP previews & thumbnails in browser...',
    });

    const targetCol = uploadTargetCollection !== 'all' ? uploadTargetCollection : (collections[0]?.id || undefined);

    try {
      const result = await batchUploadPhotos(
        gallery.id,
        uploadFiles,
        (current, total, percentage, status) => {
          setUploadProgress({ current, total, percentage, status });
        },
        targetCol
      );

      if (result.success || result.uploadedCount > 0) {
        setUploadFiles([]);
        setIsUploadModalOpen(false);

        // Reload data to show photos instantly
        await loadData();
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 6. Delete Photos
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const res = await fetch(`/api/gallery/photos?photo_id=${photoId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }
    } catch (err: any) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  };

  // 7. Set Cover Photo
  const handleSetCover = async (photo: PhotoItem) => {
    if (!gallery) return;
    const coverUrl = photo.preview_url;

    try {
      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, cover_url: coverUrl }),
      });

      setGallery(prev => (prev ? { ...prev, cover_url: coverUrl } : null));
    } catch (err: any) {
      alert(`Failed to set cover: ${err.message}`);
    }
  };

  // 8. Download High-Res Original Photo
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    try {
      const res = await fetch(
        `/api/gallery/download-url?key=${encodeURIComponent(photo.original_key || photo.preview_url)}&name=wedding_${photo.id}.jpg`
      );
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const link = document.createElement('a');
        link.href = json.downloadUrl;
        link.download = `photo_${photo.id.slice(0, 8)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(photo.preview_url, '_blank');
      }
    } catch (_) {
      window.open(photo.preview_url, '_blank');
    }
  };

  // 9. Photo Selection Handlers
  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === filteredPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const handleBulkDownload = async () => {
    const selected = filteredPhotos.filter(p => selectedPhotoIds.has(p.id));
    for (const photo of selected) {
      await handleDownloadPhoto(photo);
      await new Promise(r => setTimeout(r, 350));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.size} selected photos?`)) return;
    const ids = Array.from(selectedPhotoIds);
    for (const id of ids) {
      try {
        await fetch(`/api/gallery/photos?photo_id=${id}`, { method: 'DELETE' });
      } catch (_) {}
    }
    setPhotos(prev => prev.filter(p => !selectedPhotoIds.has(p.id)));
    setSelectedPhotoIds(new Set());
  };

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  // Filter & Sort Photos
  const filteredPhotos = photos.filter(p => {
    if (selectedPersonId && selectedPerson) {
      if (!selectedPerson.photo_ids?.includes(p.id)) return false;
    }
    if (selectedCollectionId !== 'all' && p.collection_id !== selectedCollectionId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.original_key.toLowerCase().includes(q) || p.preview_url.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalFaces = photos.reduce((acc, p) => acc + (p.face_count || 0), 0);
  const totalSizeBytes = photos.reduce((acc, p) => acc + (Number(p.size_bytes) || 0), 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  if (loading && !gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-bold text-zinc-600">Loading Album Studio Workspace...</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-800">Album Not Found</h2>
        <Link href="/workspace/gallery" className="text-xs font-bold text-amber-600 hover:underline">
          &larr; Back to AI Galleries
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans flex flex-col">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP LUXURY STUDIO HEADER BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E7E2D8] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        {/* Left: Back & Editable Event Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/workspace/gallery"
            className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition shrink-0"
            title="Back to All Albums"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    autoFocus
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="px-2.5 py-1 bg-zinc-50 border border-amber-400 rounded-lg text-sm font-black text-zinc-900 focus:outline-hidden"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTitleInput(gallery.title);
                      setIsEditingTitle(false);
                    }}
                    className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  <h1 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                    {gallery.title}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-600 transition" />
                </div>
              )}

              {/* Live Publish Status Badge */}
              <button
                onClick={handleTogglePublish}
                className={'px-2.5 py-0.5 rounded-full text-[10.5px] font-black tracking-wide flex items-center gap-1.5 transition cursor-pointer border ' + (
                  gallery.is_active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                )}
              >
                <span className={'w-2 h-2 rounded-full ' + (gallery.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400')} />
                <span>{gallery.is_active ? 'Published' : 'Draft / Private'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                {new Date(gallery.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="text-zinc-600 font-bold">{photos.length} Photos</span>
              <span>•</span>
              <span className="text-blue-600 font-bold">{totalFaces} Faces</span>
              <span>•</span>
              <span className="text-purple-600 font-bold">{totalSizeMb} MB</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReindexFaces}
            disabled={isReindexing}
            className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
            title="Scan photos with AI and cluster unique people"
          >
            <Sparkles className={`w-4 h-4 text-purple-600 ${isReindexing ? 'animate-spin' : ''}`} />
            <span>{isReindexing ? (reindexProgress || 'Scanning Faces...') : 'AI Scan Faces'}</span>
          </button>

          <Link
            href={`/workspace/gallery/${gallery.id}/share`}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-zinc-900/10 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Share Links Center</span>
          </Link>

          <button
            onClick={() => {
              setUploadTargetCollection(selectedCollectionId);
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>

          <a
            href={`/g/${gallery.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
            title="Open Public Guest Portal"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. STUDIO SPLIT VIEWPORT (LEFT SIDEBAR & MAIN GALLERY)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* LEFT STUDIO SIDEBAR */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          
          {/* Cover Card */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-3 shadow-2xs space-y-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900">
              {gallery.cover_url ? (
                <img src={gallery.cover_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] uppercase font-bold">No Cover</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-black truncate">
                Event Cover
              </div>
            </div>
            <span className="text-[10.5px] text-zinc-400 block text-center">
              Hover on any photo to set as cover
            </span>
          </div>

          {/* Collections Section */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                Collections
              </span>
              <button
                onClick={() => setIsAddCollectionModalOpen(true)}
                className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                title="Add Sub-Event Collection"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCollectionId('all')}
                className={'w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ' + (
                  selectedCollectionId === 'all'
                    ? 'bg-amber-50 text-amber-900 font-black border border-amber-200'
                    : 'text-zinc-600 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>All Photos</span>
                </div>
                <span className="text-[10.5px] font-mono bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-600">
                  {photos.length}
                </span>
              </button>

              {collections.map(col => {
                const count = photos.filter(p => p.collection_id === col.id).length;

                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={'w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ' + (
                      selectedCollectionId === col.id
                        ? 'bg-amber-50 text-amber-900 font-black border border-amber-200'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate">{col.name}</span>
                    </div>
                    <span className="text-[10.5px] font-mono bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-600">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* People & Face AI Section (Google Photos Style Unique People) */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>People ({people.length})</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                {totalFaces} Faces
              </span>
            </div>

            {people.length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedPersonId(null)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    selectedPersonId === null
                      ? 'bg-purple-50 text-purple-900 border border-purple-200'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">
                      <Users className="w-3 h-3" />
                    </div>
                    <span>All People</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{photos.length}</span>
                </button>

                {people.map((p) => {
                  const isSel = selectedPersonId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonId(isSel ? null : p.id)}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isSel
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`relative w-6 h-6 rounded-full overflow-hidden shrink-0 border ${
                          isSel ? 'border-purple-600 ring-2 ring-purple-400/30' : 'border-zinc-200'
                        }`}>
                          <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="truncate text-left">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded-md shrink-0">
                        {p.photo_count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Faces are automatically indexed into 512-D vectors for sub-second guest selfie matching.
              </p>
            )}
          </div>
        </aside>

        {/* MAIN PHOTO VIEWPORT */}
        <main className="flex-1 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search photos by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-[#FBF9F5] rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:bg-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-[#FBF9F5] rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <button
                onClick={loadData}
                className="p-2 rounded-xl bg-[#FBF9F5] border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
                title="Refresh Grid"
              >
                <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
              </button>
            </div>
          </div>

          {/* Filter Indicator when Person is Selected */}
          {selectedPersonId && selectedPerson && (
            <div className="bg-purple-50 rounded-2xl border border-purple-200 p-3.5 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-300">
                  <img src={selectedPerson.avatar_url} alt={selectedPerson.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-purple-950">
                    Showing photos of {selectedPerson.name} ({filteredPhotos.length} photos)
                  </h4>
                  <span className="text-[10px] text-purple-700">Filtered by AI facial clustering</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://studiocore.in';
                    const link = `${origin}/g/${gallery.slug}?person=${selectedPerson.id}`;
                    navigator.clipboard.writeText(link);
                    setCopiedPersonId(selectedPerson.id);
                    setTimeout(() => setCopiedPersonId(null), 2500);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {copiedPersonId === selectedPerson.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy Person Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedPersonId(null)}
                  className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                  title="Clear Person Filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Bulk Selection Toolbar */}
          {selectedPhotoIds.size > 0 && (
            <div className="sticky top-2 z-30 bg-zinc-900 text-white rounded-2xl p-3 shadow-xl border border-zinc-800 flex items-center justify-between animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-amber-400 bg-zinc-800 px-3 py-1 rounded-xl">
                  {selectedPhotoIds.size} Selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-zinc-300 hover:text-white font-bold cursor-pointer underline"
                >
                  {selectedPhotoIds.size === filteredPhotos.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDownload}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Selected</span>
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* Premagic / FotoOwl Justified Dynamic Multi-Column Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-zinc-200 space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-800">
                  {selectedCollectionId === 'all' ? 'No Photos in this Album Yet' : 'No Photos in this Collection'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Drag and drop wedding photos to compress in the browser and stream directly to Cloudflare R2.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadTargetCollection(selectedCollectionId);
                  setIsUploadModalOpen(true);
                }}
                className="px-6 py-3 rounded-2xl bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-amber-600 transition cursor-pointer shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photos Now</span>
              </button>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-3 lg:columns-4 xl:columns-5 gap-3.5 space-y-3.5">
              {filteredPhotos.map((photo, idx) => {
                const isCover = gallery.cover_url === photo.preview_url;
                const isSelected = selectedPhotoIds.has(photo.id);

                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`group relative break-inside-avoid bg-zinc-100 rounded-2xl overflow-hidden border ${
                      isSelected ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-md' : 'border-zinc-200 shadow-2xs hover:shadow-lg'
                    } cursor-pointer transition-all duration-300`}
                  >
                    <img
                      src={photo.thumbnail_url || photo.preview_url}
                      alt={photo.original_key}
                      loading="lazy"
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* Top Left: Selection Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo.id);
                      }}
                      className={`absolute top-2.5 left-2.5 p-1 rounded-lg transition ${
                        isSelected ? 'bg-amber-500 text-white' : 'bg-black/40 backdrop-blur-md text-white/80 hover:bg-black/70 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Select photo"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>

                    {/* Top Right: Badges */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {isCover && (
                        <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black shadow-sm flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          <span>Cover</span>
                        </div>
                      )}
                      {photo.face_count > 0 && (
                        <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold border border-white/20">
                          👥 {photo.face_count}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCover(photo);
                          }}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isCover ? 'bg-amber-500 text-white' : 'bg-black/50 hover:bg-amber-500'
                          }`}
                          title="Set as Event Cover"
                        >
                          <Star className={`w-3.5 h-3.5 ${isCover ? 'fill-white' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(photo);
                          }}
                          className="p-1.5 rounded-lg bg-black/50 hover:bg-amber-500 transition cursor-pointer"
                          title="Download High-Res Original"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-rose-600 transition cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ADD COLLECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateCollection} className="bg-white rounded-3xl p-6 max-w-sm w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-zinc-900">Add Sub-Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCollectionModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Collection Name *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Haldi, Sangeet, Reception"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Create Collection
              </button>
              <button
                type="button"
                onClick={() => setIsAddCollectionModalOpen(false)}
                className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BATCH PHOTO UPLOADER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-zinc-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Upload Photos</h3>
                <span className="text-xs text-zinc-400">Direct-to-R2 WebP Pipeline</span>
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
                {/* Target Collection Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Target Collection</label>
                  <select
                    value={uploadTargetCollection}
                    onChange={(e) => setUploadTargetCollection(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800 cursor-pointer"
                  >
                    <option value="all">Default / Main Album</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-300 hover:border-amber-500 bg-[#FBF9F5] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-800">
                      Click or Drag &amp; Drop Wedding Photos
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      RAW / JPEG / PNG files are compressed locally and streamed to R2
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
                      <span>{uploadFiles.length} photos ready for upload</span>
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
                    className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. PREMAGIC / FOTOOWL TOUCH-SWIPE LIGHTBOX WITH SMART HD ZOOM
      ───────────────────────────────────────────────────────────── */}
      {selectedPhotoIndex !== null && (
        <PremagicLightbox
          photos={filteredPhotos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(idx) => setSelectedPhotoIndex(idx)}
          onDownload={handleDownloadPhoto}
          onToggleSelect={togglePhotoSelection}
          isSelected={filteredPhotos[selectedPhotoIndex] ? selectedPhotoIds.has(filteredPhotos[selectedPhotoIndex].id) : false}
          onSetCover={handleSetCover}
          isCover={filteredPhotos[selectedPhotoIndex] ? gallery.cover_url === filteredPhotos[selectedPhotoIndex].preview_url : false}
          onDelete={handleDeletePhoto}
          allowDownloads={gallery.allow_downloads ?? true}
        />
      )}

    </div>
  );
}

export default function AlbumStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center space-y-4 p-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <p className="text-sm font-black text-zinc-800 tracking-tight">Loading Album Studio...</p>
          <span className="text-xs text-zinc-400">Powered by StudioCore AI</span>
        </div>
      }
    >
      <AlbumStudioContent />
    </Suspense>
  );
}
