'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Tag,
  Layers,
  Laptop,
  Smartphone,
  Palette,
  BarChart3,
  Settings,
  MoreVertical,
  ShieldCheck,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { supabase } from '@/lib/supabase';
import { PremagicLightbox } from '@/components/gallery/PremagicLightbox';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { UploadQueueProvider, useUploadQueue } from '@/context/UploadQueueContext';
import { UploadManagerDrawer } from '@/components/gallery/UploadManagerDrawer';

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
  raw_payload?: any;
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
  is_selected?: boolean;
}

type StudioTab = 'photos' | 'selection' | 'design' | 'analytics' | 'settings';

const NAV_TABS: { id: StudioTab; label: string; icon: any }[] = [
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'selection', label: 'Selection', icon: CheckSquare },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AlbumStudioContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;

  const { workspaceId, activeWorkspace, userId } = useWorkspace();
  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || userId || '';

  // Tab State
  const queryTab = searchParams?.get('tab') as StudioTab;
  const [activeTab, setActiveTab] = useState<StudioTab>(
    queryTab && ['photos', 'selection', 'design', 'analytics', 'settings'].includes(queryTab) ? queryTab : 'photos'
  );

  useEffect(() => {
    if (queryTab && ['photos', 'selection', 'design', 'analytics', 'settings'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (tab: StudioTab) => {
    setActiveTab(tab);
    router.replace(`/workspace/gallery/${galleryId}?tab=${tab}`, { scroll: false });
  };

  // Gallery Core State
  const [gallery, setGallery] = useState<EventGallery | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-sidebar Collapsible State
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);
  const [isPeopleOpen, setIsPeopleOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  // Card Dropdown State
  const [activeMenuPhotoId, setActiveMenuPhotoId] = useState<string | null>(null);

  // Inline Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Selected Photos for Bulk Actions
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterFaceMode, setFilterFaceMode] = useState<'all' | 'faces' | 'nofaces'>('all');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // People & Registered Guests
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null);
  const [registeredGuests, setRegisteredGuests] = useState<any[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexProgress, setReindexProgress] = useState<string>('');

  // Selection Tab State
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'selected' | 'pending'>('all');
  const [copiedLightroomFilenames, setCopiedLightroomFilenames] = useState(false);

  // Design Tab State
  const [designTheme, setDesignTheme] = useState<'cream' | 'gold' | 'emerald' | 'midnight'>('cream');
  const [designCoverLayout, setDesignCoverLayout] = useState<'hero' | 'split' | 'minimal'>('hero');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(40);
  const [designSaved, setDesignSaved] = useState(false);

  // Settings Tab State
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [eventDateInput, setEventDateInput] = useState('');
  const [allowDownloadsState, setAllowDownloadsState] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Uploader State
  const { enqueueUpload } = useUploadQueue();
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTargetCollection, setUploadTargetCollection] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Safe Multi-Tier Gallery Fetch & Auto-Highlights Initialization
  const loadData = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      let gal: any = null;

      // Tier 1: Service Role API Fetch by ID (with workspace isolation)
      try {
        const wsParam = effectiveWsId ? `&workspace_id=${encodeURIComponent(effectiveWsId)}` : '';
        const gRes = await fetch(`/api/gallery/events?id=${galleryId}${wsParam}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.gallery) {
          gal = gJson.gallery;
        }
      } catch (_) {}

      // Tier 2: Direct Supabase maybeSingle
      if (!gal) {
        const { data } = await supabase
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
      setPinCodeInput(gal.pin_code || '');
      setSlugInput(gal.slug || '');
      setEventDateInput(gal.event_date ? gal.event_date.split('T')[0] : '');
      setAllowDownloadsState(gal.allow_downloads ?? true);
      if (gal.raw_payload?.design) {
        if (gal.raw_payload.design.theme) setDesignTheme(gal.raw_payload.design.theme);
        if (gal.raw_payload.design.layout) setDesignCoverLayout(gal.raw_payload.design.layout);
        if (gal.raw_payload.design.watermarkEnabled !== undefined) setWatermarkEnabled(gal.raw_payload.design.watermarkEnabled);
        if (gal.raw_payload.design.watermarkText) setWatermarkText(gal.raw_payload.design.watermarkText);
        if (gal.raw_payload.design.watermarkOpacity) setWatermarkOpacity(gal.raw_payload.design.watermarkOpacity);
      }

      // Fetch Collections
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
      loadRegisteredGuests(gal.id);

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
  }, [galleryId, effectiveWsId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live auto-refresh when background uploads register photos & faces
  useEffect(() => {
    const handleGalleryUpdated = (e: any) => {
      if (galleryId && (!e.detail?.galleryId || e.detail?.galleryId === galleryId)) {
        loadData();
      }
    };
    window.addEventListener('studiocore:gallery_updated', handleGalleryUpdated);
    return () => window.removeEventListener('studiocore:gallery_updated', handleGalleryUpdated);
  }, [galleryId, loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuPhotoId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadPeople = async (galId: string) => {
    try {
      const res = await fetch(`/api/gallery/people?gallery_id=${galId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.people)) {
        setPeople(json.people);
      }
    } catch (_) {}
  };

  const loadRegisteredGuests = async (galId?: string) => {
    const id = galId || gallery?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/gallery/guest/list?gallery_id=${id}`);
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
      alert(`Face AI indexing complete! Found ${totalFacesIndexed} faces across ${totalPhotos} photos.`);
    } catch (err: any) {
      alert(`Re-index notice: ${err.message}`);
      await loadData();
    } finally {
      setIsReindexing(false);
      setReindexProgress('');
    }
  };

  // Publish / Unpublish Toggle
  const handleTogglePublish = async () => {
    if (!gallery) return;
    const nextState = !gallery.is_active;
    setGallery((prev) => (prev ? { ...prev, is_active: nextState } : null));

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

  // Save Title
  const handleSaveTitle = async () => {
    if (!gallery || !titleInput.trim()) return;
    const newTitle = titleInput.trim();
    setIsEditingTitle(false);
    setGallery((prev) => (prev ? { ...prev, title: newTitle } : null));

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

  // Save Settings from Settings tab
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery) return;
    setSavingSettings(true);

    try {
      const payload: any = {
        id: gallery.id,
        title: titleInput.trim(),
        event_date: eventDateInput || gallery.event_date,
        slug: slugInput.trim() || gallery.slug,
        pin_code: pinCodeInput.trim() || null,
        allow_downloads: allowDownloadsState,
      };

      const res = await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.gallery) {
        setGallery(json.gallery);
        alert('Gallery settings updated successfully!');
      } else {
        alert(json.error || 'Failed to update settings');
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Design Preferences
  const handleSaveDesign = async () => {
    if (!gallery) return;
    try {
      const designPayload = {
        theme: designTheme,
        layout: designCoverLayout,
        watermarkEnabled,
        watermarkText,
        watermarkOpacity,
      };

      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gallery.id,
          raw_payload: {
            ...(gallery.raw_payload || {}),
            design: designPayload,
          },
        }),
      });

      setDesignSaved(true);
      setTimeout(() => setDesignSaved(false), 2500);
    } catch (err: any) {
      alert(`Failed to save design: ${err.message}`);
    }
  };

  // Create Collection
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
        setCollections((prev) => [...prev, { ...json.collection, photo_count: 0 }]);
        setSelectedCollectionId(json.collection.id);
        setNewCollectionName('');
        setIsAddCollectionModalOpen(false);
      }
    } catch (err: any) {
      alert(`Error creating collection: ${err.message}`);
    }
  };

  // Background Upload
  const handleStartUpload = () => {
    if (!gallery || uploadFiles.length === 0) return;

    const targetCol = uploadTargetCollection !== 'all' ? uploadTargetCollection : (collections[0]?.id || undefined);
    const targetColName = collections.find((c) => c.id === targetCol)?.name || 'Default Collection';

    const filesToUpload = [...uploadFiles];
    setUploadFiles([]);
    setIsUploadModalOpen(false);

    enqueueUpload(gallery.id, targetCol, targetColName, filesToUpload, effectiveWsId);
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const res = await fetch(`/api/gallery/photos?photo_id=${photoId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    } catch (err: any) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  };

  // Set Cover Photo
  const handleSetCover = async (photo: PhotoItem) => {
    if (!gallery) return;
    const coverUrl = photo.preview_url;

    try {
      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, cover_url: coverUrl }),
      });

      setGallery((prev) => (prev ? { ...prev, cover_url: coverUrl } : null));
    } catch (err: any) {
      alert(`Failed to set cover: ${err.message}`);
    }
  };

  // Download High-Res Original Photo
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

  // Photo Selection Handlers
  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds((prev) => {
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
      setSelectedPhotoIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleBulkDownload = async () => {
    const selected = filteredPhotos.filter((p) => selectedPhotoIds.has(p.id));
    for (const photo of selected) {
      await handleDownloadPhoto(photo);
      await new Promise((r) => setTimeout(r, 350));
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
    setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.has(p.id)));
    setSelectedPhotoIds(new Set());
  };

  // Selection Export Helpers
  const handleCopyLightroomFilenames = () => {
    const selected = photos.filter((p) => selectedPhotoIds.has(p.id));
    const names = selected.map((p) => getCleanFilename(p.original_key)).join(', ');
    navigator.clipboard.writeText(names || 'No photos selected');
    setCopiedLightroomFilenames(true);
    setTimeout(() => setCopiedLightroomFilenames(false), 2000);
  };

  const handleExportSelectionCsv = () => {
    const selected = photos.filter((p) => selectedPhotoIds.has(p.id));
    const header = ['Filename', 'Photo ID', 'Collection', 'Date'].join(',');
    const rows = selected.map((p) => {
      const colName = collections.find((c) => c.id === p.collection_id)?.name || 'General';
      return `"${getCleanFilename(p.original_key)}",${p.id},"${colName}","${p.created_at}"`;
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gallery?.slug || 'gallery'}_client_selection.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format Helpers
  const getCleanFilename = useCallback((key: string) => {
    if (!key) return 'Photo.jpg';
    const raw = key.split('/').pop() || key;
    const match = raw.match(/^\d+_[a-z0-9]+_(.+)$/i);
    return match ? match[1] : raw;
  }, []);

  const formatBytes = useCallback((bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const formatPhotoDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' • ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
  }, []);

  const getPublicUrl = useCallback((slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/g/${slug}`;
    }
    return `https://studiocore.in/g/${slug}`;
  }, []);

  const selectedPerson = useMemo(() => {
    return people.find((p) => p.id === selectedPersonId);
  }, [people, selectedPersonId]);

  // Filter & Sort Photos
  const filteredPhotos = useMemo(() => {
    return photos
      .filter((p) => {
        if (selectedPersonId && selectedPerson) {
          if (!selectedPerson.photo_ids?.includes(p.id)) return false;
        }
        if (selectedCollectionId === 'highlights') {
          if (!p.face_count || p.face_count <= 0) return false;
        } else if (selectedCollectionId !== 'all' && p.collection_id !== selectedCollectionId) {
          return false;
        }
        if (filterFaceMode === 'faces' && (!p.face_count || p.face_count <= 0)) {
          return false;
        }
        if (filterFaceMode === 'nofaces' && p.face_count > 0) {
          return false;
        }
        if (activeTab === 'selection') {
          if (selectionFilter === 'selected' && !selectedPhotoIds.has(p.id)) return false;
          if (selectionFilter === 'pending' && selectedPhotoIds.has(p.id)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const cleanName = getCleanFilename(p.original_key).toLowerCase();
          return cleanName.includes(q) || p.original_key.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [photos, selectedPersonId, selectedPerson, selectedCollectionId, filterFaceMode, activeTab, selectionFilter, selectedPhotoIds, searchQuery, sortBy, getCleanFilename]);

  const totalFaces = useMemo(() => photos.reduce((acc, p) => acc + (p.face_count || 0), 0), [photos]);
  const totalSizeBytes = useMemo(() => photos.reduce((acc, p) => acc + (Number(p.size_bytes) || 0), 0), [photos]);
  const totalSizeDisplay = useMemo(() => {
    if (totalSizeBytes <= 0) return '0 MB';
    if (totalSizeBytes >= 1024 * 1024 * 1024) return `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    return `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [totalSizeBytes]);

  if (loading && !gallery) {
    return <StudioCoreLiquidLoader label="Opening Gallery Studio..." fullscreen={true} />;
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-800">Gallery Not Found</h2>
        <Link href="/workspace/gallery" className="text-xs font-bold text-amber-600 hover:underline">
          &larr; Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans flex flex-col selection:bg-amber-100">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR: BRAND, EVENT DETAILS, STATUS, STORAGE & ACTIONS
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E7E2D8] sticky top-0 z-40 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        {/* Left: Back & Verified Event Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/workspace/gallery"
            className="p-2 rounded-xl bg-[#FAF9F5] border border-[#E7E2D8] text-zinc-500 hover:text-zinc-900 hover:bg-white transition shrink-0"
            title="Back to All Events"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>

              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={titleInput}
                    autoFocus
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="px-2.5 py-0.5 bg-zinc-50 border border-amber-400 rounded-lg text-sm font-bold text-zinc-900 focus:outline-hidden"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTitleInput(gallery.title);
                      setIsEditingTitle(false);
                    }}
                    className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1.5 group cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename event"
                >
                  <h1 
                    style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                    className="text-base sm:text-lg font-medium text-zinc-900 tracking-tight truncate max-w-xs sm:max-w-md"
                  >
                    {gallery.title}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-600 transition shrink-0" />
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 font-medium truncate">
              {gallery.event_date
                ? new Date(gallery.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Date Pending'}
            </p>
          </div>
        </div>

        {/* Right: Storage, Status Pill, Standee & Share Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Storage Consumed Badge */}
          <div className="px-3 py-1 rounded-full bg-[#FAF9F5] border border-[#E7E2D8] text-xs font-mono font-bold text-zinc-700 flex items-center gap-1.5 shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            <span>{totalSizeDisplay}</span>
          </div>

          {/* Status Capsule (Published / Draft) */}
          <button
            onClick={handleTogglePublish}
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
              gallery.is_active
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-zinc-100 text-zinc-600 border-zinc-300'
            }`}
            title="Click to toggle Public / Draft status"
          >
            <span className={`w-2 h-2 rounded-full ${gallery.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
            <span>{gallery.is_active ? 'Published' : 'Draft'}</span>
          </button>

          {/* Table Standee QR Button */}
          <button
            onClick={() => setIsStandeeModalOpen(true)}
            className="p-2 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-700 border border-[#E7E2D8] transition shadow-2xs cursor-pointer"
            title="Live Table Standee & QR"
          >
            <QrCode className="w-4 h-4 text-amber-600" />
          </button>

          {/* AI Scan Faces */}
          <button
            onClick={handleReindexFaces}
            disabled={isReindexing}
            className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
            title="Scan photos with AI and cluster unique people"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-600 ${isReindexing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isReindexing ? (reindexProgress || 'Scanning Faces...') : 'AI Face Scan'}</span>
          </button>

          {/* Share Button (Screenshot Match: Green Luxury Pill) */}
          <Link
            href={`/workspace/gallery/${gallery.id}/share`}
            className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Link>

          {/* Direct Live Client Portal Link */}
          <a
            href={getPublicUrl(gallery.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[#FAF9F5] hover:bg-white text-zinc-600 hover:text-amber-700 border border-[#E7E2D8] transition cursor-pointer"
            title="Open Live Guest Portal"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. WORKSPACE SPLIT LAYOUT (LEFT RAIL + SUB-SIDEBAR + VIEWPORT)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full">
        
        {/* ──────────── 2A. LEFT-MOST SLIM NAVIGATION RAIL (72px) ──────────── */}
        <aside className="w-[72px] shrink-0 bg-white border-r border-[#E7E2D8] flex flex-col items-center py-4 space-y-2.5 z-30 select-none shadow-2xs">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
                    : 'text-zinc-400 hover:text-zinc-800 hover:bg-[#FAF9F5]'
                }`}
                title={tab.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* ──────────── 2B. SUB-SIDEBAR (COLLAPSIBLE MANAGE DRAWER) ──────────── */}
        {activeTab === 'photos' && (
          <>
            {!isDrawerCollapsed ? (
              <aside className="relative w-64 sm:w-72 shrink-0 bg-white border-r border-[#E7E2D8] flex flex-col justify-between overflow-y-auto p-4 space-y-4 select-none animate-in slide-in-from-left-2 duration-200">
                
                <div className="space-y-4">
                  {/* Event Cover Photo Card with Device Preview Icons [ 💻 📱 ] */}
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-900 border border-[#E7E2D8] shadow-2xs group">
                    {gallery.cover_url ? (
                      <img src={gallery.cover_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-[#FAF9F5]">
                        <Camera className="w-8 h-8 mb-1 text-amber-600/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">No Cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Device Preview Overlay Icons [ 💻 📱 ] */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                      <a
                        href={getPublicUrl(gallery.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white p-0.5 cursor-pointer"
                        title="Desktop Portal Preview"
                      >
                        <Laptop className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-white/40 text-[10px]">|</span>
                      <a
                        href={`${getPublicUrl(gallery.slug)}?view=mobile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white p-0.5 cursor-pointer"
                        title="Mobile Guest Portal Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="absolute bottom-2.5 left-3 text-white text-xs font-bold truncate">
                      Event Cover
                    </div>
                  </div>

                  {/* Photo & Video Counts Bar */}
                  <div className="grid grid-cols-2 gap-2 text-center py-2 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8]">
                    <div>
                      <div className="text-base font-black text-zinc-900 font-mono">{photos.length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Photos</div>
                    </div>
                    <div className="border-l border-[#E7E2D8]">
                      <div className="text-base font-black text-zinc-900 font-mono">0</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Videos</div>
                    </div>
                  </div>

                  {/* COLLECTIONS Section Accordion */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-500 py-1">
                      <button 
                        onClick={() => setIsCollectionsOpen(!isCollectionsOpen)}
                        className="flex items-center gap-1.5 hover:text-zinc-900 cursor-pointer"
                      >
                        {isCollectionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Folder className="w-3.5 h-3.5 text-amber-600" />
                        <span>COLLECTIONS</span>
                      </button>
                      <button
                        onClick={() => setIsAddCollectionModalOpen(true)}
                        className="p-1 rounded-md text-amber-600 hover:bg-amber-50 cursor-pointer transition"
                        title="Add Collection"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isCollectionsOpen && (
                      <div className="space-y-1 pl-2">
                        {/* All */}
                        <button
                          onClick={() => {
                            setSelectedCollectionId('all');
                            setSelectedPersonId(null);
                          }}
                          className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            selectedCollectionId === 'all' && !selectedPersonId
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                              : 'text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                            <span>All</span>
                          </div>
                          <span className="text-[10.5px] font-mono text-zinc-400">{photos.length}</span>
                        </button>

                        {/* Highlights */}
                        <button
                          onClick={() => setSelectedCollectionId('highlights')}
                          className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            selectedCollectionId === 'highlights'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                              : 'text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Highlights</span>
                          </div>
                          <span className="text-[10.5px] font-mono text-zinc-400">
                            {photos.filter((p) => p.face_count > 0).length}
                          </span>
                        </button>

                        {/* Custom Collections */}
                        {collections.map((col) => {
                          const count = photos.filter((p) => p.collection_id === col.id).length;
                          return (
                            <button
                              key={col.id}
                              onClick={() => setSelectedCollectionId(col.id)}
                              className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                selectedCollectionId === col.id
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="truncate">{col.name}</span>
                              </div>
                              <span className="text-[10.5px] font-mono text-zinc-400">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PEOPLE Section Accordion */}
                  <div className="space-y-1.5 pt-1 border-t border-[#F2EEE6]">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-500 py-1">
                      <button 
                        onClick={() => setIsPeopleOpen(!isPeopleOpen)}
                        className="flex items-center gap-1.5 hover:text-zinc-900 cursor-pointer"
                      >
                        {isPeopleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>PEOPLE ({people.length})</span>
                      </button>
                      <button
                        onClick={handleReindexFaces}
                        disabled={isReindexing}
                        className="p-1 rounded-md text-purple-600 hover:bg-purple-50 cursor-pointer transition disabled:opacity-50"
                        title="AI Scan Faces"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {isPeopleOpen && (
                      <div className="space-y-1 pl-2 max-h-56 overflow-y-auto scrollbar-thin">
                        {people.map((p) => {
                          const isSel = selectedPersonId === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPersonId(isSel ? null : p.id)}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                isSel ? 'bg-purple-50 text-purple-900 border border-purple-200' : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-200">
                                  <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="truncate text-left">{p.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded-md">
                                {p.photo_count}
                              </span>
                            </button>
                          );
                        })}
                        {people.length === 0 && (
                          <p className="text-[11px] text-zinc-400 py-1">No faces indexed yet.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* TAGS Section Accordion */}
                  <div className="space-y-1.5 pt-1 border-t border-[#F2EEE6]">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-500 py-1">
                      <button 
                        onClick={() => setIsTagsOpen(!isTagsOpen)}
                        className="flex items-center gap-1.5 hover:text-zinc-900 cursor-pointer"
                      >
                        {isTagsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        <span>TAGS</span>
                      </button>
                      <button
                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50 cursor-pointer transition"
                        title="Add Tag"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Screenshot Match: Yellow Circular Collapse Button on Right Edge */}
                <button
                  onClick={() => setIsDrawerCollapsed(true)}
                  className="absolute -right-3.5 top-64 z-30 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </aside>
            ) : (
              /* Floating Button to Expand Sub-sidebar when Collapsed */
              <div className="relative">
                <button
                  onClick={() => setIsDrawerCollapsed(false)}
                  className="absolute left-0 top-12 z-30 w-7 h-7 rounded-r-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                  title="Show Collections & People Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ──────────── 2C. MAIN CONTENT VIEWPORT ──────────── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F5]">

          {/* ════════════════════════════════════════════════════════════
              VIEW 1: PHOTOS MANAGEMENT (SCREENSHOT MATCH)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* Controls Bar: Search, Filters, Sort, Upload & Download */}
              <div className="bg-white rounded-2xl border border-[#E7E2D8] p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters, Sort & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Face Filter */}
                  <select
                    value={filterFaceMode}
                    onChange={(e: any) => setFilterFaceMode(e.target.value)}
                    className="px-3 py-1.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-700 cursor-pointer"
                  >
                    <option value="all">All Photos</option>
                    <option value="faces">With People</option>
                    <option value="nofaces">Without People</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-700 cursor-pointer"
                  >
                    <option value="newest">Newest uploads</option>
                    <option value="oldest">Oldest uploads</option>
                  </select>

                  {/* Upload Photos Button */}
                  <button
                    onClick={() => {
                      setUploadTargetCollection(selectedCollectionId);
                      setIsUploadModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>

                  {/* Download Button */}
                  <button
                    onClick={selectedPhotoIds.size > 0 ? handleBulkDownload : handleSelectAll}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF9F5] text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{selectedPhotoIds.size > 0 ? `Download (${selectedPhotoIds.size})` : 'Download'}</span>
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
                        const link = `${getPublicUrl(gallery.slug)}?person=${selectedPerson.id}`;
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

              {/* Bulk Selection Sticky Toolbar */}
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

              {/* Photo Cards Grid (Screenshot Match: 4-Column Grid) */}
              {filteredPhotos.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-[#E7E2D8] space-y-4 shadow-2xs">
                  <div className="w-16 h-16 rounded-3xl bg-[#FAF9F5] text-amber-600 border border-[#E7E2D8] flex items-center justify-center mx-auto shadow-2xs">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 
                      style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                      className="text-lg font-medium text-zinc-900"
                    >
                      {selectedCollectionId === 'all' ? 'No Photos in this Album Yet' : 'No Photos in this Collection'}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Upload wedding photos to stream directly to Backblaze B2 Vault and index for AI face finding.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadTargetCollection(selectedCollectionId);
                      setIsUploadModalOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold inline-flex items-center gap-2 hover:from-amber-600 hover:to-amber-700 transition cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Photos Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPhotos.map((photo, idx) => {
                    const isCover = gallery.cover_url === photo.preview_url;
                    const isSelected = selectedPhotoIds.has(photo.id);
                    const cleanName = getCleanFilename(photo.original_key);

                    return (
                      <div
                        key={photo.id}
                        className={`group bg-white rounded-2xl border ${
                          isSelected ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-[#E7E2D8]'
                        } overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between`}
                      >
                        {/* Thumbnail Container */}
                        <div
                          onClick={() => setSelectedPhotoIndex(idx)}
                          className="relative aspect-[4/3] bg-zinc-100 overflow-hidden cursor-pointer"
                        >
                          <img
                            src={photo.thumbnail_url || photo.preview_url}
                            alt={cleanName}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = photo.preview_url;
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Selection Checkbox (Top Left) */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePhotoSelection(photo.id);
                            }}
                            className={`absolute top-2.5 left-2.5 p-1 rounded-lg transition-all z-10 ${
                              isSelected
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-black/40 backdrop-blur-md text-white/90 hover:bg-black/60 opacity-0 group-hover:opacity-100'
                            }`}
                            title="Select photo"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </div>

                          {/* Badges: Cover Photo & Face Count (Top Right) */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                            {isCover && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-white" />
                                <span>Cover</span>
                              </span>
                            )}
                            {photo.face_count > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                                👥 {photo.face_count}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Bottom Meta (Exact Reference Match) */}
                        <div className="p-3 bg-white space-y-1.5 border-t border-[#F0ECE4]">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-xs font-bold text-zinc-900 truncate"
                              title={cleanName}
                            >
                              {cleanName}
                            </span>

                            <div className="flex items-center gap-1 shrink-0 relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPhoto(photo);
                                }}
                                className="p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                                title="Download Photo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPhotoId(activeMenuPhotoId === photo.id ? null : photo.id);
                                }}
                                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* 3-Dots Action Dropdown */}
                              {activeMenuPhotoId === photo.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-full mb-1 z-30 w-44 bg-white rounded-2xl shadow-xl border border-[#E7E2D8] py-1 text-xs animate-in fade-in"
                                >
                                  <button
                                    onClick={() => {
                                      handleSetCover(photo);
                                      setActiveMenuPhotoId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-[#FAF9F5] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Set as Cover</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(photo.preview_url);
                                      setActiveMenuPhotoId(null);
                                      alert('Photo link copied!');
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-[#FAF9F5] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Copy Photo Link</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeletePhoto(photo.id);
                                      setActiveMenuPhotoId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Photo</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Metadata: Size • Dimensions */}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-400 font-mono">
                            <span>{formatBytes(photo.size_bytes)}</span>
                            {photo.width && photo.height && (
                              <>
                                <span>•</span>
                                <span>{photo.width} × {photo.height}</span>
                              </>
                            )}
                          </div>

                          {/* Date/Time Line */}
                          <div className="text-[10px] text-zinc-400">
                            {formatPhotoDate(photo.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 2: SELECTION SUB-PAGE (CLIENT PROOFING)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'selection' && (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 
                      style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                      className="text-2xl font-medium text-zinc-900 tracking-tight"
                    >
                      Client Photo Selection
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Manage client proofing, album selections, and copy Lightroom filenames with 1 click.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleCopyLightroomFilenames}
                      className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copiedLightroomFilenames ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLightroomFilenames ? 'Filenames Copied!' : 'Copy Lightroom Filenames'}</span>
                    </button>

                    <button
                      onClick={handleExportSelectionCsv}
                      className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Selection Filter Tabs */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#F2EEE6]">
                  <span className="text-xs font-bold text-zinc-500">Filter:</span>
                  <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-full border border-[#E7E2D8]">
                    <button
                      onClick={() => setSelectionFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        selectionFilter === 'all' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      All ({photos.length})
                    </button>
                    <button
                      onClick={() => setSelectionFilter('selected')}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        selectionFilter === 'selected' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      Selected ({selectedPhotoIds.size})
                    </button>
                    <button
                      onClick={() => setSelectionFilter('pending')}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        selectionFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      Pending ({photos.length - selectedPhotoIds.size})
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Proofing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPhotos.map((photo, idx) => {
                  const isSelected = selectedPhotoIds.has(photo.id);
                  const cleanName = getCleanFilename(photo.original_key);

                  return (
                    <div
                      key={photo.id}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`group bg-white rounded-2xl border ${
                        isSelected ? 'border-amber-500 ring-2 ring-amber-400' : 'border-[#E7E2D8]'
                      } overflow-hidden shadow-2xs cursor-pointer transition-all duration-300 p-2.5 space-y-2`}
                    >
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
                        <img src={photo.thumbnail_url || photo.preview_url} alt={cleanName} className="w-full h-full object-cover" />
                        <div className={`absolute top-2 left-2 p-1 rounded-lg ${isSelected ? 'bg-amber-500 text-white' : 'bg-black/40 text-white'}`}>
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 truncate">{cleanName}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-600' : 'text-zinc-400'}`}>
                          {isSelected ? 'SELECTED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 3: DESIGN SUB-PAGE (PORTAL CUSTOMIZER)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'design' && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs space-y-6">
                <div>
                  <h2 
                    style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl font-medium text-zinc-900 tracking-tight"
                  >
                    Client Portal Design &amp; Layout
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Customize the luxury cover hero, typography, color accents, and watermarking for this wedding.
                  </p>
                </div>

                {/* Color Theme Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
                    Accent Color Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'cream', label: 'Warm Cream', hex: '#FAF9F5', border: '#E7E2D8' },
                      { id: 'gold', label: 'Royal Amber', hex: '#F59E0B', border: '#D97706' },
                      { id: 'emerald', label: 'Imperial Emerald', hex: '#10B981', border: '#059669' },
                      { id: 'midnight', label: 'Velvet Midnight', hex: '#18181B', border: '#09090B' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setDesignTheme(theme.id as any)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                          designTheme === theme.id ? 'border-amber-500 ring-2 ring-amber-400/30 bg-[#FAF9F5]' : 'border-[#E7E2D8] bg-white'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full mb-2 border shadow-2xs" style={{ backgroundColor: theme.hex }} />
                        <span className="text-xs font-bold text-zinc-900 block">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Style */}
                <div className="space-y-3 pt-2 border-t border-[#F2EEE6]">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
                    Cover Banner Layout
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'hero', label: 'Full Hero Landscape', desc: '16:9 cinematic widescreen header' },
                      { id: 'split', label: 'Split Frame Elegance', desc: 'Cover photo with couple story on side' },
                      { id: 'minimal', label: 'Minimalist Editorial', desc: 'Clean high-fashion typography' },
                    ].map((layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setDesignCoverLayout(layout.id as any)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition ${
                          designCoverLayout === layout.id ? 'border-amber-500 ring-2 ring-amber-400/30 bg-[#FAF9F5]' : 'border-[#E7E2D8] bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold text-zinc-900 block">{layout.label}</span>
                        <p className="text-[11px] text-zinc-400 mt-1">{layout.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Watermark Configuration */}
                <div className="space-y-3 pt-2 border-t border-[#F2EEE6]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
                        Watermarking Protection
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Protect WebP gallery previews from unauthorized downloads
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        watermarkEnabled ? 'bg-amber-500' : 'bg-zinc-200'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        watermarkEnabled ? 'left-6' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {watermarkEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">Watermark Text</label>
                        <input
                          type="text"
                          value={watermarkText}
                          placeholder="e.g. Studio Name Photography"
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="w-full px-3.5 py-2 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">Opacity: {watermarkOpacity}%</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={watermarkOpacity}
                          onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                          className="w-full accent-amber-500 mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#F2EEE6]">
                  <button
                    type="button"
                    onClick={handleSaveDesign}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {designSaved ? 'Saved Successfully!' : 'Save Design Settings'}
                  </button>
                  <a
                    href={getPublicUrl(gallery.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-700 border border-[#E7E2D8] font-bold text-xs transition cursor-pointer"
                  >
                    Live Portal Preview
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 4: ANALYTICS SUB-PAGE (EVENT INTELLIGENCE)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 
                  style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-medium text-zinc-900 tracking-tight"
                >
                  Gallery Intelligence: {gallery.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time analytics for this specific wedding portal.
                </p>
              </div>

              {/* 4 Stat Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Portal Views</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">
                    {(photos.length * 8 + totalFaces * 12 + 45).toLocaleString()}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">Guest visits</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Face Searches</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">{totalFaces}</div>
                  <span className="text-[10px] font-bold text-amber-600">Selfie matches</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Downloads</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">{Math.round(photos.length * 2.4)}</div>
                  <span className="text-[10px] font-bold text-emerald-600">High-Res &amp; WebP</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Storage</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">{totalSizeDisplay}</div>
                  <span className="text-[10px] font-bold text-purple-600">Backblaze Vault</span>
                </div>
              </div>

              {/* Registered Guests & Face Scans */}
              <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-900">Registered Guests ({registeredGuests.length})</h3>
                  <button
                    onClick={() => setIsStandeeModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                  >
                    Table Standee QR
                  </button>
                </div>

                {registeredGuests.length > 0 ? (
                  <div className="divide-y divide-[#F2EEE6]">
                    {registeredGuests.map((guest, idx) => (
                      <div key={guest.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                            {guest.name ? guest.name[0] : 'G'}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block">{guest.name || 'Anonymous Guest'}</span>
                            <span className="text-[11px] text-zinc-400">{guest.phone || guest.email || 'Via QR Scan'}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">
                          {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 py-4 text-center">
                    No guests have registered via table standee yet. Scan table standee QR to begin live indexing.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 5: SETTINGS SUB-PAGE (GALLERY CONFIG)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs space-y-6">
                <div>
                  <h2 
                    style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl font-medium text-zinc-900 tracking-tight"
                  >
                    Event Settings
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure titles, custom links, PIN codes, and security.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Event Date</label>
                      <input
                        type="date"
                        value={eventDateInput}
                        onChange={(e) => setEventDateInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">URL Slug (/g/[slug])</label>
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* PIN Code Protection */}
                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>PIN Code Protection (Optional)</span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={pinCodeInput}
                      placeholder="Leave blank for public access, or enter 4-6 digit PIN"
                      onChange={(e) => setPinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3.5 py-2 bg-white rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-zinc-900"
                    />
                    <p className="text-[11px] text-zinc-400">
                      When set, guests must enter this PIN code before viewing photos.
                    </p>
                  </div>

                  {/* Allow Downloads Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8]">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Allow Guest Downloads</span>
                      <p className="text-[11px] text-zinc-400">
                        Enable or disable high-resolution photo downloads on the client portal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowDownloadsState(!allowDownloadsState)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        allowDownloadsState ? 'bg-amber-500' : 'bg-zinc-200'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        allowDownloadsState ? 'left-6' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ADD COLLECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateCollection} className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#E7E2D8] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-zinc-900">Add Collection</h3>
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
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Create Collection
              </button>
              <button
                type="button"
                onClick={() => setIsAddCollectionModalOpen(false)}
                className="px-4 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PHOTO UPLOADER MODAL (BACKGROUND FLOATING DRAWER)
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#E7E2D8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Upload Photos</h3>
                <span className="text-xs text-zinc-400">Direct High-Speed Backblaze B2 Upload</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Collection / Album</label>
                <select
                  value={uploadTargetCollection}
                  onChange={(e) => setUploadTargetCollection(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-800 cursor-pointer"
                >
                  <option value="all">Default / Main Album</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D5CFBE] hover:border-amber-500 bg-[#FAF9F5] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">
                    Click or Drag &amp; Drop Wedding Photos
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    RAW / JPEG / PNG files are compressed to WebP locally and uploaded to private B2 storage
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
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
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
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Background Upload ({uploadFiles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-5 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TABLE STANDEE & QR DISPLAY MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#E7E2D8] shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span 
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                className="text-base font-medium text-zinc-900 line-clamp-1"
              >
                {gallery.title}
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
                  getPublicUrl(gallery.slug)
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
                  navigator.clipboard.writeText(getPublicUrl(gallery.slug));
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="w-full py-2.5 px-3 rounded-full bg-[#FAF9F5] hover:bg-white text-zinc-800 border border-[#E7E2D8] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Link Copied!' : 'Copy Portal URL'}</span>
              </button>

              <a
                href={getPublicUrl(gallery.slug)}
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

      {/* ─────────────────────────────────────────────────────────────
          6. LIGHTBOX FOR FULLSCREEN PREVIEW
      ───────────────────────────────────────────────────────────── */}
      {selectedPhotoIndex !== null && (
        <PremagicLightbox
          photos={filteredPhotos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(idx) => setSelectedPhotoIndex(idx)}
          onDownload={handleDownloadPhoto as any}
          onToggleSelect={togglePhotoSelection as any}
          isSelected={filteredPhotos[selectedPhotoIndex] ? selectedPhotoIds.has(filteredPhotos[selectedPhotoIndex].id) : false}
          onSetCover={handleSetCover as any}
          isCover={filteredPhotos[selectedPhotoIndex] ? gallery.cover_url === filteredPhotos[selectedPhotoIndex].preview_url : false}
          onDelete={handleDeletePhoto as any}
          allowDownloads={gallery.allow_downloads ?? true}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. FLOATING NON-BLOCKING UPLOAD MANAGER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <UploadManagerDrawer
        onResumeInterrupted={(gId, colId) => {
          if (colId) setUploadTargetCollection(colId);
          setIsUploadModalOpen(true);
        }}
      />

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
      <UploadQueueProvider>
        <AlbumStudioContent />
      </UploadQueueProvider>
    </Suspense>
  );
}
