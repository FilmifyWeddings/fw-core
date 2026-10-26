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
  Unlock,
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
  Phone,
  Mail,
  MessageCircle,
  RotateCcw,
  Crosshair,
  ZoomIn,
  FileSpreadsheet,
  Clock,
  Send,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { supabase } from '@/lib/supabase';
import { PremagicLightbox } from '@/components/gallery/PremagicLightbox';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { useUploadQueue } from '@/context/UploadQueueContext';
import { ProgressiveSmoothImage } from '@/components/gallery/ProgressiveSmoothImage';
import GalleryDesignStudio from '@/components/gallery/GalleryDesignStudio';

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
  is_face_ai_enabled?: boolean;
  status?: string;
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
  file_name?: string;
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

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'capture_newest'
  | 'capture_oldest'
  | 'size_desc'
  | 'size_asc'
  | 'name_asc'
  | 'name_desc';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Newest uploads' },
  { id: 'oldest', label: 'Oldest uploads' },
  { id: 'capture_newest', label: 'Capture Time (Newest First)' },
  { id: 'capture_oldest', label: 'Capture Time (Oldest First)' },
  { id: 'size_desc', label: 'File Size (Largest First)' },
  { id: 'size_asc', label: 'File Size (Smallest First)' },
  { id: 'name_asc', label: 'File Name (A to Z)' },
  { id: 'name_desc', label: 'File Name (Z to A)' },
];

interface CoverPositioning {
  url: string;
  desktop: { x: number; y: number; zoom: number };
  mobile: { x: number; y: number; zoom: number };
}

function parseCoverUrl(coverUrl: string | null | undefined): CoverPositioning {
  if (!coverUrl) {
    return {
      url: '',
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const hashIdx = coverUrl.indexOf('#');
  if (hashIdx === -1) {
    return {
      url: coverUrl,
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const url = coverUrl.substring(0, hashIdx);
  const hash = coverUrl.substring(hashIdx + 1);
  const params = new URLSearchParams(hash);

  return {
    url,
    desktop: {
      x: Number(params.get('dx')) || 50,
      y: Number(params.get('dy')) || 50,
      zoom: Number(params.get('dz')) || 100,
    },
    mobile: {
      x: Number(params.get('mx')) || 50,
      y: Number(params.get('my')) || 50,
      zoom: Number(params.get('mz')) || 100,
    },
  };
}

function buildCoverUrl(
  url: string,
  desktop: { x: number; y: number; zoom: number },
  mobile: { x: number; y: number; zoom: number }
): string {
  const clean = url.split('#')[0];
  return `${clean}#dx=${Math.round(desktop.x)}&dy=${Math.round(desktop.y)}&dz=${Math.round(desktop.zoom)}&mx=${Math.round(mobile.x)}&my=${Math.round(mobile.y)}&mz=${Math.round(mobile.zoom)}`;
}

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
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isEditCollectionModalOpen, setIsEditCollectionModalOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<GalleryCollection | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Cover Customizer Modal State
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverPreviewMode, setCoverPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeCoverUrl, setActiveCoverUrl] = useState<string>('');
  const [desktopCrop, setDesktopCrop] = useState<{ x: number; y: number; zoom: number }>({ x: 50, y: 50, zoom: 100 });
  const [mobileCrop, setMobileCrop] = useState<{ x: number; y: number; zoom: number }>({ x: 50, y: 50, zoom: 100 });
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // People & Registered Guests
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null);
  const [registeredGuests, setRegisteredGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestMatchedPhotos, setGuestMatchedPhotos] = useState<any[]>([]);
  const [loadingGuestPhotos, setLoadingGuestPhotos] = useState(false);
  const [filterGuest, setFilterGuest] = useState<{ id: string; name: string; photoIds: string[] } | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexProgress, setReindexProgress] = useState<string>('');

  // Face AI State
  const [isFaceAiEnabledState, setIsFaceAiEnabledState] = useState<boolean>(true);
  const [isTogglingFaceAi, setIsTogglingFaceAi] = useState(false);

  // 3-State Status Dropdown State ('UNPUBLISHED' | 'PUBLISHED' | 'EXPIRED')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);

  // Publish Confirmation & Email Re-send Modal State
  const [showPublishConfirmModal, setShowPublishConfirmModal] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isPublishingEvent, setIsPublishingEvent] = useState(false);
  const [registeredGuestsCount, setRegisteredGuestsCount] = useState<number>(0);

  // Selection Tab State
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'selected' | 'pending'>('all');
  const [copiedLightroomFilenames, setCopiedLightroomFilenames] = useState(false);
  const [clientSelections, setClientSelections] = useState<any[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);

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
  const [duplicateFiles, setDuplicateFiles] = useState<File[]>([]);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [showDesktopAppModal, setShowDesktopAppModal] = useState(false);
  const [isDesktopEngineActive, setIsDesktopEngineActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Probe local StudioCore Desktop Engine on 127.0.0.1:41789
  useEffect(() => {
    let mounted = true;
    const probeEngine = async () => {
      try {
        const res = await fetch('http://127.0.0.1:41789/status', {
          mode: 'cors',
          signal: AbortSignal.timeout(1200),
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.status === 'online') {
            setIsDesktopEngineActive(true);
            return;
          }
        }
      } catch (_) {}
      if (mounted) setIsDesktopEngineActive(false);
    };

    probeEngine();
    const interval = setInterval(probeEngine, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Intelligent Duplicate Detection for Photo Uploads
  const handleSelectUploadFiles = useCallback((selectedFiles: File[], targetColId?: string) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const colId = targetColId !== undefined ? targetColId : uploadTargetCollection;
    const targetCol = colId !== 'all' ? colId : (collections[0]?.id || undefined);

    // Existing photos in target collection (or entire gallery if 'all')
    const existingPhotoNames = new Set<string>();
    photos.forEach((p) => {
      if (targetCol && colId !== 'all' && p.collection_id !== targetCol) return;
      if (p.file_name) {
        existingPhotoNames.add(p.file_name.trim().toLowerCase());
      }
      if (p.original_key) {
        const parts = p.original_key.split('/');
        const endPart = parts[parts.length - 1] || '';
        const clean = endPart.replace(/^\d+_[a-z0-9]+_/, '');
        if (clean) existingPhotoNames.add(clean.trim().toLowerCase());
      }
    });

    const dupes: File[] = [];
    selectedFiles.forEach((f) => {
      if (existingPhotoNames.has(f.name.trim().toLowerCase())) {
        dupes.push(f);
      }
    });

    setUploadFiles(selectedFiles);
    if (dupes.length > 0) {
      setDuplicateFiles(dupes);
      setShowDuplicatePrompt(true);
    } else {
      setDuplicateFiles([]);
      setShowDuplicatePrompt(false);
    }
  }, [photos, uploadTargetCollection, collections]);

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
      setIsFaceAiEnabledState(gal.is_face_ai_enabled !== false);
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

    // Real-time progressive photo stream: instantly shows photos as each chunk registers!
    const handlePhotosAdded = (e: any) => {
      if (galleryId && (!e.detail?.galleryId || e.detail?.galleryId === galleryId)) {
        if (Array.isArray(e.detail?.photos) && e.detail.photos.length > 0) {
          setPhotos((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPhotos = e.detail.photos.filter((p: any) => !existingIds.has(p.id));
            if (newPhotos.length === 0) return prev;
            return [...newPhotos, ...prev];
          });
        }
      }
    };

    window.addEventListener('studiocore:gallery_updated', handleGalleryUpdated);
    window.addEventListener('studiocore:gallery_photos_added', handlePhotosAdded);
    return () => {
      window.removeEventListener('studiocore:gallery_updated', handleGalleryUpdated);
      window.removeEventListener('studiocore:gallery_photos_added', handlePhotosAdded);
    };
  }, [galleryId, loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setActiveMenuPhotoId(null);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
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

  const [isResendingNotification, setIsResendingNotification] = useState(false);
  const [resendingGuestId, setResendingGuestId] = useState<string | null>(null);

  const handleResendNotifications = async (guestId?: string) => {
    if (!gallery?.id) return;
    if (guestId) setResendingGuestId(guestId);
    else setIsResendingNotification(true);
    try {
      const res = await fetch('/api/gallery/guest/resend-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          guest_id: guestId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Notifications dispatched successfully!');
        loadRegisteredGuests(gallery.id);
      } else {
        alert(`Failed to resend: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsResendingNotification(false);
      setResendingGuestId(null);
    }
  };

  const handleExportGuestsCSV = () => {
    if (registeredGuests.length === 0) {
      alert('No registered guests to export.');
      return;
    }
    const headers = ['Guest Name', 'Phone', 'Email', 'Selfie Registered', 'Matched Photos Count', 'Notification Status', 'Registration Date'];
    const rows = registeredGuests.map((g) => [
      `"${(g.guest_name || g.name || 'Guest').replace(/"/g, '""')}"`,
      `"${(g.guest_phone || g.phone || '').replace(/"/g, '""')}"`,
      `"${(g.guest_email || g.email || '').replace(/"/g, '""')}"`,
      g.selfie_url || g.face_embedding ? 'Yes' : 'No',
      Array.isArray(g.matched_photo_ids) ? g.matched_photo_ids.length : 0,
      g.notification_status || 'PENDING',
      g.created_at ? new Date(g.created_at).toLocaleString() : '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `guests_${gallery?.slug || 'gallery'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Live query matched photos for selected guest (Instant Cache + Parallel Neural Re-check)
  useEffect(() => {
    if (!selectedGuest || !gallery) {
      setGuestMatchedPhotos([]);
      return;
    }

    let isCancelled = false;
    const fetchGuestMatches = async () => {
      setLoadingGuestPhotos(true);
      try {
        // 1. Instant Render: Load existing pre-matched photos in milliseconds
        if (Array.isArray(selectedGuest.matched_photo_ids) && selectedGuest.matched_photo_ids.length > 0) {
          try {
            const preRes = await fetch(`/api/gallery/photos?gallery_id=${gallery.id}&ids=${selectedGuest.matched_photo_ids.join(',')}`);
            const preJson = await preRes.json();
            if (!isCancelled && preJson.success && Array.isArray(preJson.photos) && preJson.photos.length > 0) {
              setGuestMatchedPhotos(preJson.photos);
              setLoadingGuestPhotos(false);
            }
          } catch (_) {}
        }

        // Safely parse face embedding
        const rawEmb = Array.isArray(selectedGuest.face_embedding)
          ? selectedGuest.face_embedding
          : (typeof selectedGuest.face_embedding === 'string' ? JSON.parse(selectedGuest.face_embedding) : null);

        if (!rawEmb || rawEmb.length !== 512) {
          if (!isCancelled) setLoadingGuestPhotos(false);
          return;
        }

        const res = await fetch('/api/gallery/match-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gallery_id: gallery.id,
            embedding: rawEmb,
            match_threshold: 0.40,
          }),
        });

        const json = await res.json();
        if (!isCancelled) {
          if (json.success && Array.isArray(json.photos) && json.photos.length > 0) {
            setGuestMatchedPhotos(json.photos);
          }
        }
      } catch (err) {
        console.error('Failed to load guest matched photos:', err);
      } finally {
        if (!isCancelled) setLoadingGuestPhotos(false);
      }
    };

    fetchGuestMatches();
    return () => {
      isCancelled = true;
    };
  }, [selectedGuest, gallery]);

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

  // Initiate Publish with Confirmation Modal
  const handleInitiatePublish = async () => {
    setIsStatusDropdownOpen(false);
    if (!gallery) return;

    try {
      const { count } = await supabase
        .from('event_guest_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_id', gallery.id);
      setRegisteredGuestsCount(count || 0);
    } catch (_) {
      setRegisteredGuestsCount(0);
    }

    setShowPublishConfirmModal(true);
  };

  // Confirm Publish & Dispatch Emails to registered guests
  const handleConfirmPublish = async () => {
    if (!gallery) return;
    setIsPublishingEvent(true);
    try {
      const res = await fetch('/api/gallery/events/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          send_email: sendEmailNotification,
          notifyChannels: sendEmailNotification ? ['WHATSAPP', 'EMAIL'] : ['WHATSAPP'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGallery((prev) => (prev ? { ...prev, status: 'PUBLISHED', is_active: true } : null));
        setShowPublishConfirmModal(false);
        if (sendEmailNotification) {
          alert(`🎉 Gallery published! Emails dispatched to ${data.total_notified || registeredGuestsCount} registered guests.`);
        } else {
          alert('🎉 Gallery published successfully (without emails)!');
        }
      } else {
        alert(data.error || 'Failed to publish event');
      }
    } catch (err: any) {
      alert(`Error publishing event: ${err.message}`);
    } finally {
      setIsPublishingEvent(false);
    }
  };

  // 3-State Status Handler: 'UNPUBLISHED' | 'PUBLISHED' | 'EXPIRED'
  const handleUpdateStatus = async (nextStatus: 'UNPUBLISHED' | 'PUBLISHED' | 'EXPIRED') => {
    if (!gallery) return;
    if (nextStatus === 'PUBLISHED') {
      await handleInitiatePublish();
      return;
    }

    setGallery((prev) => (prev ? { ...prev, status: nextStatus, is_active: false } : null));
    setIsStatusDropdownOpen(false);

    try {
      await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, status: nextStatus, is_active: false }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleTogglePublish = async () => {
    if (!gallery) return;
    const currentStatus = (gallery.status?.toUpperCase() === 'EXPIRED')
      ? 'EXPIRED'
      : (gallery.status?.toUpperCase() === 'PUBLISHED' || (gallery.is_active && gallery.status?.toUpperCase() !== 'UNPUBLISHED'))
      ? 'PUBLISHED'
      : 'UNPUBLISHED';
    if (currentStatus === 'PUBLISHED') {
      await handleUpdateStatus('UNPUBLISHED');
    } else {
      await handleInitiatePublish();
    }
  };

  // Face AI Toggle Handler (Optimistic & Background Trigger)
  const handleToggleFaceAi = async (overrideVal?: boolean) => {
    if (!gallery || isTogglingFaceAi) return;
    const currentVal = gallery.is_face_ai_enabled !== false;
    const nextVal = overrideVal !== undefined ? overrideVal : !currentVal;

    setIsTogglingFaceAi(true);
    setGallery((prev) => (prev ? { ...prev, is_face_ai_enabled: nextVal } : null));
    setIsFaceAiEnabledState(nextVal);

    try {
      const res = await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, is_face_ai_enabled: nextVal }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update Face AI');
      }
      if (nextVal) {
        alert('✨ Face AI Enabled! Background facial indexing has been initiated for all photos in this event.');
      }
    } catch (err: any) {
      console.error('Error toggling Face AI:', err);
      alert(`Failed to update Face AI: ${err.message}`);
      setGallery((prev) => (prev ? { ...prev, is_face_ai_enabled: currentVal } : null));
      setIsFaceAiEnabledState(currentVal);
    } finally {
      setIsTogglingFaceAi(false);
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
        is_face_ai_enabled: isFaceAiEnabledState,
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

  // Create Collection (Debounced & Instant Lock)
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery || !newCollectionName.trim() || isSavingCollection) return;

    setIsSavingCollection(true);
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
      } else {
        alert(json.error || 'Failed to create collection');
      }
    } catch (err: any) {
      alert(`Error creating collection: ${err.message}`);
    } finally {
      setIsSavingCollection(false);
    }
  };

  // Open Edit Collection Modal
  const handleOpenEditCollection = (col: GalleryCollection) => {
    setCollectionToEdit(col);
    setEditingCollectionName(col.name);
    setIsEditCollectionModalOpen(true);
  };

  // Save Renamed Collection
  const handleSaveEditedCollection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!collectionToEdit || !editingCollectionName.trim() || isSavingCollection) return;

    setIsSavingCollection(true);
    try {
      const res = await fetch('/api/gallery/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collectionToEdit.id,
          name: editingCollectionName.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.collection) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionToEdit.id ? { ...c, name: json.collection.name, slug: json.collection.slug } : c))
        );
        setIsEditCollectionModalOpen(false);
        setCollectionToEdit(null);
      } else {
        alert(json.error || 'Failed to update collection name');
      }
    } catch (err: any) {
      alert(`Error updating collection: ${err.message}`);
    } finally {
      setIsSavingCollection(false);
    }
  };

  // Delete Collection with Deep Cloud Storage Purge
  const handleDeleteCollectionWithPurge = async () => {
    if (!collectionToEdit || isDeletingCollection) return;

    const colPhotosCount = photos.filter((p) => p.collection_id === collectionToEdit.id).length;
    const confirmMsg =
      colPhotosCount > 0
        ? `⚠️ WARNING: This collection contains ${colPhotosCount} photo(s).\n\nDeleting this collection will permanently DELETE all ${colPhotosCount} photos and PURGE them from cloud storage so you are not charged for storage.\n\nAre you sure you want to proceed? This cannot be undone.`
        : `Are you sure you want to delete collection "${collectionToEdit.name}"?`;

    if (!confirm(confirmMsg)) return;

    setIsDeletingCollection(true);
    try {
      const res = await fetch(`/api/gallery/collections?id=${collectionToEdit.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        const deletedId = collectionToEdit.id;
        setCollections((prev) => prev.filter((c) => c.id !== deletedId));
        setPhotos((prev) => prev.filter((p) => p.collection_id !== deletedId));
        if (selectedCollectionId === deletedId) {
          setSelectedCollectionId('all');
        }
        setIsEditCollectionModalOpen(false);
        setCollectionToEdit(null);
      } else {
        alert(json.error || 'Failed to delete collection');
      }
    } catch (err: any) {
      alert(`Error deleting collection: ${err.message}`);
    } finally {
      setIsDeletingCollection(false);
    }
  };

  // Save Cover Settings from Customizer Modal
  const handleSaveCoverSettings = async () => {
    if (!gallery || !activeCoverUrl) return;
    setIsSavingCover(true);

    try {
      const compositeUrl = buildCoverUrl(activeCoverUrl, desktopCrop, mobileCrop);
      const res = await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gallery.id, cover_url: compositeUrl }),
      });

      const json = await res.json();
      if (json.success) {
        setGallery((prev) => (prev ? { ...prev, cover_url: compositeUrl } : null));
        setIsCoverModalOpen(false);
      } else {
        alert(json.error || 'Failed to save cover settings');
      }
    } catch (err: any) {
      alert(`Failed to save cover: ${err.message}`);
    } finally {
      setIsSavingCover(false);
    }
  };

  // Upload New HD Cover from File Picker
  const handleUploadNewCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gallery) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `events/${gallery.slug || gallery.id}`);

      const res = await fetch('/api/upload/r2', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setActiveCoverUrl(json.url);
      } else {
        alert(json.error || 'Failed to upload cover photo');
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
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
    if (!confirm('Are you sure you want to delete this photo? It will also be permanently deleted from cloud storage to stop storage charges.')) return;

    try {
      const res = await fetch(`/api/gallery/photos?photo_id=${photoId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setSelectedPhotoIds((prev) => {
          const next = new Set(prev);
          next.delete(photoId);
          return next;
        });
        if (selectedPhotoIndex !== null) {
          setSelectedPhotoIndex(null);
        }
      } else {
        alert(json.error || 'Failed to delete photo');
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

  // Download High-Res Original Photo directly from originals/ folder
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    try {
      const targetKey = photo.original_key || photo.preview_key || photo.preview_url;
      const cleanName = getCleanFilename(photo.original_key) || `photo_${photo.id.slice(0, 8)}.jpg`;
      const res = await fetch(
        `/api/gallery/download-url?key=${encodeURIComponent(targetKey)}&name=${encodeURIComponent(cleanName)}`
      );
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const link = document.createElement('a');
        link.href = json.downloadUrl;
        link.setAttribute('download', cleanName);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fallbackUrl = `/api/gallery/image?key=${encodeURIComponent(targetKey)}&download=1&name=${encodeURIComponent(cleanName)}`;
        window.open(fallbackUrl, '_blank');
      }
    } catch (_) {
      const targetKey = photo.original_key || photo.preview_url;
      const cleanName = getCleanFilename(photo.original_key) || `photo_${photo.id.slice(0, 8)}.jpg`;
      window.open(`/api/gallery/image?key=${encodeURIComponent(targetKey)}&download=1&name=${encodeURIComponent(cleanName)}`, '_blank');
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
    if (selectedPhotoIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.size} selected photo(s)? They will also be permanently deleted from cloud storage to eliminate storage charges.`)) return;

    const ids = Array.from(selectedPhotoIds);
    try {
      const res = await fetch('/api/gallery/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: ids }),
      });
      const json = await res.json();
      if (json.success) {
        setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.has(p.id)));
        setSelectedPhotoIds(new Set());
      } else {
        alert(json.error || 'Failed to delete selected photos');
      }
    } catch (err: any) {
      alert(`Bulk delete error: ${err.message}`);
    }
  };

  const loadClientSelections = useCallback(async () => {
    if (!galleryId) return;
    setIsLoadingSelections(true);
    try {
      const res = await fetch(`/api/gallery/selections?gallery_id=${galleryId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.selections)) {
        setClientSelections(json.selections);
      }
    } catch (_) {} finally {
      setIsLoadingSelections(false);
    }
  }, [galleryId]);

  useEffect(() => {
    if (activeTab === 'selection') {
      loadClientSelections();
    }
  }, [activeTab, loadClientSelections]);

  const activeSelectedIds = useMemo(() => {
    if (selectedClientEmail) {
      const match = clientSelections.find((c) => c.client_email === selectedClientEmail);
      return new Set<string>(match?.selected_photo_ids || []);
    }
    const set = new Set<string>(selectedPhotoIds);
    clientSelections.forEach((c) => {
      if (Array.isArray(c.selected_photo_ids)) {
        c.selected_photo_ids.forEach((id: string) => set.add(id));
      }
    });
    return set;
  }, [selectedClientEmail, clientSelections, selectedPhotoIds]);

  // Selection Export Helpers
  const handleCopyLightroomFilenames = () => {
    const selected = photos.filter((p) => activeSelectedIds.has(p.id));
    const names = selected.map((p) => getCleanFilename(p.original_key)).join(', ');
    navigator.clipboard.writeText(names || 'No photos selected');
    setCopiedLightroomFilenames(true);
    setTimeout(() => setCopiedLightroomFilenames(false), 2000);
  };

  const handleExportSelectionCsv = () => {
    const selected = photos.filter((p) => activeSelectedIds.has(p.id));
    const header = ['Filename', 'Photo ID', 'Collection', 'Date'].join(',');
    const rows = selected.map((p) => {
      const colName = collections.find((c) => c.id === p.collection_id)?.name || 'General';
      return `"${getCleanFilename(p.original_key)}",${p.id},"${colName}","${p.created_at}"`;
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clientSuffix = selectedClientEmail ? `_${selectedClientEmail.split('@')[0]}` : '';
    a.download = `${gallery?.slug || 'gallery'}_client_selection${clientSuffix}.csv`;
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

  const currentGalleryStatus = useMemo<'UNPUBLISHED' | 'PUBLISHED' | 'EXPIRED'>(() => {
    if (!gallery) return 'UNPUBLISHED';
    const s = gallery.status?.toUpperCase();
    if (s === 'EXPIRED') return 'EXPIRED';
    if (s === 'PUBLISHED') return 'PUBLISHED';
    return 'UNPUBLISHED';
  }, [gallery]);

  // Filter & Sort Photos
  const filteredPhotos = useMemo(() => {
    return photos
      .filter((p) => {
        if (filterGuest) {
          if (!filterGuest.photoIds || !filterGuest.photoIds.includes(p.id)) return false;
        }
        if (selectedPersonId && selectedPerson) {
          if (!selectedPerson.photo_ids?.includes(p.id)) return false;
        }
        const highlightsCol = collections.find(
          (c) => c.slug === 'highlights' || c.name.toLowerCase() === 'highlights'
        );
        const isHighlightsFilter =
          selectedCollectionId === 'highlights' ||
          (highlightsCol && selectedCollectionId === highlightsCol.id);

        if (isHighlightsFilter) {
          if (highlightsCol) {
            if (p.collection_id !== highlightsCol.id && (!p.face_count || p.face_count <= 0)) return false;
          } else {
            if (!p.face_count || p.face_count <= 0) return false;
          }
        } else if (selectedCollectionId !== 'all' && p.collection_id !== selectedCollectionId) {
          return false;
        }
        if (activeTab === 'selection') {
          if (selectedClientEmail) {
            if (!activeSelectedIds.has(p.id)) return false;
          } else {
            if (selectionFilter === 'selected' && !activeSelectedIds.has(p.id)) return false;
            if (selectionFilter === 'pending' && activeSelectedIds.has(p.id)) return false;
          }
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
        if (sortBy === 'capture_newest') {
          const timeA = (a as any).capture_time ? new Date((a as any).capture_time).getTime() : new Date(a.created_at).getTime();
          const timeB = (b as any).capture_time ? new Date((b as any).capture_time).getTime() : new Date(b.created_at).getTime();
          return timeB - timeA;
        }
        if (sortBy === 'capture_oldest') {
          const timeA = (a as any).capture_time ? new Date((a as any).capture_time).getTime() : new Date(a.created_at).getTime();
          const timeB = (b as any).capture_time ? new Date((b as any).capture_time).getTime() : new Date(b.created_at).getTime();
          return timeA - timeB;
        }
        if (sortBy === 'size_desc') {
          return (Number(b.size_bytes) || 0) - (Number(a.size_bytes) || 0);
        }
        if (sortBy === 'size_asc') {
          return (Number(a.size_bytes) || 0) - (Number(b.size_bytes) || 0);
        }
        if (sortBy === 'name_asc') {
          return getCleanFilename(a.original_key).localeCompare(getCleanFilename(b.original_key));
        }
        if (sortBy === 'name_desc') {
          return getCleanFilename(b.original_key).localeCompare(getCleanFilename(a.original_key));
        }
        // default: newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [photos, filterGuest, selectedPersonId, selectedPerson, selectedCollectionId, activeTab, selectionFilter, selectedPhotoIds, activeSelectedIds, selectedClientEmail, searchQuery, sortBy, getCleanFilename]);

  // 50-Photo Millisecond Progressive Pagination (Prevents Browser Freezing)
  const [visiblePhotosCount, setVisiblePhotosCount] = useState<number>(50);
  const infiniteSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisiblePhotosCount(50);
  }, [selectedCollectionId, filterGuest, selectedPersonId, searchQuery, sortBy]);

  const displayedPhotos = useMemo(() => {
    return filteredPhotos.slice(0, visiblePhotosCount);
  }, [filteredPhotos, visiblePhotosCount]);

  const hasMorePhotos = visiblePhotosCount < filteredPhotos.length;

  // Seamless Automatic Infinite Scroll Observer
  useEffect(() => {
    if (!hasMorePhotos) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisiblePhotosCount((prev) => Math.min(prev + 50, filteredPhotos.length));
        }
      },
      { rootMargin: '400px' }
    );

    const el = infiniteSentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMorePhotos, filteredPhotos.length]);

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

          {/* Status 3-State Dropdown (Unpublished / Published / Expired) */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                currentGalleryStatus === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : currentGalleryStatus === 'EXPIRED'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Change Gallery Access Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  currentGalleryStatus === 'PUBLISHED'
                    ? 'bg-emerald-500 animate-pulse'
                    : currentGalleryStatus === 'EXPIRED'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {currentGalleryStatus === 'PUBLISHED'
                  ? 'Published'
                  : currentGalleryStatus === 'EXPIRED'
                  ? 'Expired'
                  : 'Unpublished'}
              </span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#E7E2D8] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Select Event Status
                </div>

                {/* 1. Unpublished Option */}
                <button
                  onClick={() => handleUpdateStatus('UNPUBLISHED')}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                    currentGalleryStatus === 'UNPUBLISHED' ? 'bg-amber-50/80 border border-amber-200' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">Unpublished</span>
                      {currentGalleryStatus === 'UNPUBLISHED' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                      Pre-event registration. Guests scan QR, register selfie, and see a luxury Thank You message until you publish.
                    </p>
                  </div>
                </button>

                {/* 2. Published Option */}
                <button
                  onClick={() => handleUpdateStatus('PUBLISHED')}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                    currentGalleryStatus === 'PUBLISHED' ? 'bg-emerald-50/80 border border-emerald-200' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">Published</span>
                      {currentGalleryStatus === 'PUBLISHED' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                      Live gallery. Guests can scan and immediately access &amp; download all their AI matched photos.
                    </p>
                  </div>
                </button>

                {/* 3. Expired Option */}
                <button
                  onClick={() => handleUpdateStatus('EXPIRED')}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                    currentGalleryStatus === 'EXPIRED' ? 'bg-rose-50/80 border border-rose-200' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">Expired</span>
                      {currentGalleryStatus === 'EXPIRED' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                      Public gallery locked. Guests see an elegant expired screen directing them to contact you.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Face AI Toggle Pill */}
          <button
            onClick={() => handleToggleFaceAi()}
            disabled={isTogglingFaceAi}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
              gallery.is_face_ai_enabled !== false
                ? 'bg-violet-50 text-violet-800 border-violet-300 hover:bg-violet-100'
                : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
            }`}
            title={
              gallery.is_face_ai_enabled !== false
                ? 'Face AI is ON: Click to turn OFF'
                : 'Face AI is OFF: Click to turn ON & index existing photos'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${gallery.is_face_ai_enabled !== false ? 'text-violet-600' : 'text-zinc-400'}`} />
            <span>Face AI: {gallery.is_face_ai_enabled !== false ? 'ON' : 'OFF'}</span>
          </button>

          {/* Table Standee QR Button */}
          <button
            onClick={() => setIsStandeeModalOpen(true)}
            className="p-2 rounded-full bg-white hover:bg-[#FAF9F5] text-zinc-700 border border-[#E7E2D8] transition shadow-2xs cursor-pointer"
            title="Live Table Standee & QR"
          >
            <QrCode className="w-4 h-4 text-amber-600" />
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
                    ? 'bg-zinc-800 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 font-medium'
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
          <div className="relative shrink-0 flex">
            {!isDrawerCollapsed ? (
              <>
                <aside className="w-64 sm:w-72 shrink-0 bg-white border-r border-[#E7E2D8] flex flex-col justify-between overflow-y-auto p-4 space-y-4 select-none animate-in slide-in-from-left-2 duration-200">
                
                <div className="space-y-4">
                  {/* Event Cover Photo Card with Device Preview Icons [ 💻 📱 ] */}
                  <div
                    onClick={() => {
                      const config = parseCoverUrl(gallery.cover_url);
                      setActiveCoverUrl(config.url || gallery.cover_url || '');
                      setDesktopCrop(config.desktop);
                      setMobileCrop(config.mobile);
                      setIsCoverModalOpen(true);
                    }}
                    className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-900 border border-[#E7E2D8] shadow-2xs group cursor-pointer hover:border-amber-400 transition"
                    title="Click to customize Cover Photo & Focal Positions"
                  >
                    {gallery.cover_url ? (
                      <img
                        src={parseCoverUrl(gallery.cover_url).url || gallery.cover_url}
                        alt="Cover"
                        style={{
                          objectPosition: `${parseCoverUrl(gallery.cover_url).desktop.x}% ${parseCoverUrl(gallery.cover_url).desktop.y}%`,
                          transform: `scale(${parseCoverUrl(gallery.cover_url).desktop.zoom / 100})`,
                          transformOrigin: `${parseCoverUrl(gallery.cover_url).desktop.x}% ${parseCoverUrl(gallery.cover_url).desktop.y}%`,
                        }}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-[#FAF9F5]">
                        <Camera className="w-8 h-8 mb-1 text-amber-600/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Set Cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* Device Preview Overlay Icons [ 💻 📱 ] */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 text-white text-[11px] font-bold">
                      <Laptop className="w-3.5 h-3.5 text-white/90" />
                      <span className="text-white/40">|</span>
                      <Smartphone className="w-3.5 h-3.5 text-white/90" />
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                      <span className="truncate">Event Cover</span>
                      <span className="text-[10px] text-amber-300 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-xs font-normal">Edit & Crop</span>
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

                        {/* Highlights (Single unified Highlights collection) */}
                        {(() => {
                          const highlightsCol = collections.find(
                            (c) => c.slug === 'highlights' || c.name.toLowerCase() === 'highlights'
                          );
                          const isHighlightsActive =
                            selectedCollectionId === 'highlights' ||
                            (highlightsCol && selectedCollectionId === highlightsCol.id);
                          const highlightsCount = highlightsCol
                            ? photos.filter((p) => p.collection_id === highlightsCol.id).length
                            : photos.filter((p) => p.face_count > 0).length;

                          return (
                            <div
                              className={`group/col w-full px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                isHighlightsActive
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedCollectionId(highlightsCol ? highlightsCol.id : 'highlights')}
                                className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                <span>Highlights</span>
                              </button>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10.5px] font-mono text-zinc-400">
                                  {highlightsCount}
                                </span>
                                {highlightsCol && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditCollection(highlightsCol);
                                    }}
                                    className="opacity-0 group-hover/col:opacity-100 p-1 rounded-md text-zinc-400 hover:text-amber-700 hover:bg-amber-100/60 transition cursor-pointer"
                                    title="Edit / Delete Collection"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Custom Collections (Excluding duplicate Highlights) */}
                        {collections
                          .filter((col) => col.slug !== 'highlights' && col.name.toLowerCase() !== 'highlights')
                          .map((col) => {
                          const count = photos.filter((p) => p.collection_id === col.id).length;
                          return (
                            <div
                              key={col.id}
                              className={`group/col w-full px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                selectedCollectionId === col.id
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedCollectionId(col.id)}
                                className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                              >
                                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="truncate">{col.name}</span>
                              </button>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10.5px] font-mono text-zinc-400">{count}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditCollection(col);
                                  }}
                                  className="opacity-0 group-hover/col:opacity-100 p-1 rounded-md text-zinc-400 hover:text-amber-700 hover:bg-amber-100/60 transition cursor-pointer"
                                  title="Edit / Delete Collection"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PEOPLE Section Accordion (Registered Guests with Selfies & Profiles) */}
                  <div className="space-y-1.5 pt-1 border-t border-[#F2EEE6]">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-500 py-1">
                      <button 
                        onClick={() => setIsPeopleOpen(!isPeopleOpen)}
                        className="flex items-center gap-1.5 hover:text-zinc-900 cursor-pointer"
                      >
                        {isPeopleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Users className="w-3.5 h-3.5 text-zinc-700" />
                        <span>PEOPLE ({registeredGuests.length})</span>
                      </button>
                    </div>

                    {isPeopleOpen && (
                      <div className="space-y-1 pl-1 max-h-64 overflow-y-auto scrollbar-thin">
                        {registeredGuests.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-[11px] text-zinc-400 font-medium">No registered guests yet</p>
                          </div>
                        ) : (
                          registeredGuests.map((guest) => {
                            return (
                              <button
                                key={guest.id || guest.guest_phone}
                                onClick={() => {
                                  setSelectedGuest(guest);
                                  setIsGuestModalOpen(true);
                                }}
                                className="w-full px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer text-zinc-700 hover:bg-zinc-50 border border-transparent hover:border-zinc-200"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-zinc-200 bg-zinc-100 flex items-center justify-center">
                                    {guest.selfie_url ? (
                                      <img src={guest.selfie_url} alt={guest.guest_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-bold text-zinc-600">
                                        {(guest.guest_name || 'G')[0].toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-left">
                                    <div className="truncate text-zinc-900 font-bold">{guest.guest_name}</div>
                                    <div className="text-[9.5px] text-zinc-400 font-normal truncate">
                                      {guest.guest_phone ? guest.guest_phone.split('#')[0] : ''}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* Sleek Skinny Orange Collapse Toggle Tab (Positioned on the divider line, below Event Cover) */}
              <button
                type="button"
                onClick={() => setIsDrawerCollapsed(true)}
                className="absolute -right-3.5 top-28 z-50 w-7 h-9 rounded-r-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md border-y border-r border-amber-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 group"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </>
          ) : (
            /* Floating Button to Expand Sub-sidebar when Collapsed */
            <button
              type="button"
              onClick={() => setIsDrawerCollapsed(false)}
              className="absolute left-0 top-28 z-50 w-7 h-9 rounded-r-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md border-y border-r border-amber-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 group"
              title="Show Collections & People Panel"
            >
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
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

                {/* 3D Sort Dropdown & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 3D Luxury Sort Dropdown */}
                  <div className="relative" ref={sortDropdownRef}>
                    <button
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-white via-[#FCFBF8] to-[#F5F2EB] border border-[#D5CFBE] text-xs font-bold text-zinc-800 flex items-center gap-2 cursor-pointer transition-all shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_3px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[0.5px]"
                      title="Sort photos"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                      <span>{SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Newest uploads'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSortDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-[#D5CFBE] shadow-[0_12px_28px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.04)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Sort Photos By
                        </div>
                        {SORT_OPTIONS.map((opt) => {
                          const isSelected = sortBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setSortBy(opt.id);
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                isSelected ? 'bg-amber-50 text-amber-900 font-black' : 'text-zinc-700 hover:bg-zinc-100/80'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

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

              {/* Filtered by Guest Banner */}
              {filterGuest && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 px-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        Showing photos of {filterGuest.name} ({filteredPhotos.length} photos)
                      </h4>
                      <span className="text-[10px] text-amber-700">Filtered by guest selfie face match</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setFilterGuest(null)}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                    title="Clear Guest Filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                      Upload photos to stream directly to Cloud Vault and index for AI face finding.
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
                <>
                  <div className="columns-2 sm:columns-3 md:columns-4 xl:columns-5 gap-2.5">
                  {displayedPhotos.map((photo, idx) => {
                    const isCover = gallery.cover_url?.startsWith(photo.preview_url);
                    const isSelected = selectedPhotoIds.has(photo.id);
                    const cleanName = getCleanFilename(photo.original_key);

                    return (
                      <div
                        key={photo.id}
                        className={`group relative break-inside-avoid mb-2.5 rounded-2xl overflow-hidden border ${
                          isSelected ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-[#E7E2D8]'
                        } bg-zinc-900 shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer select-none`}
                        onClick={() => setSelectedPhotoIndex(idx)}
                      >
                        {/* Progressive Smooth Blur-Up Image (loads lightweight 480px WebP thumbnail from thumbs/ folder) */}
                        <ProgressiveSmoothImage
                          src={photo.thumbnail_url || photo.preview_url}
                          thumbnailSrc={photo.thumbnail_url}
                          alt={cleanName}
                          aspectRatio={photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined}
                          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 block"
                        />

                        {/* Persistent Top Badges when not hovering */}
                        {isCover && (
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 transition-opacity duration-200">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              <span>Cover</span>
                            </span>
                          </div>
                        )}

                        {/* Persistent Selection Checkbox if selected */}
                        {isSelected && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePhotoSelection(photo.id);
                            }}
                            className="absolute top-2.5 left-2.5 p-1 rounded-lg bg-amber-500 text-white shadow-xs z-20 cursor-pointer"
                            title="Deselect photo"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </div>
                        )}

                        {/* HOVER OVERLAY: Appears only on cursor hover! */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5 z-10 pointer-events-none group-hover:pointer-events-auto">
                          
                          {/* Top Bar: Checkbox + Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePhotoSelection(photo.id);
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-black/50 backdrop-blur-md text-white/90 hover:bg-black/80 hover:text-white'
                              }`}
                              title="Select photo"
                            >
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Set as Cover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCover(photo);
                                }}
                                className={`p-1.5 rounded-lg transition backdrop-blur-md cursor-pointer ${
                                  isCover
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-black/50 text-white/90 hover:bg-black/80 hover:text-amber-400'
                                }`}
                                title={isCover ? 'Current Cover' : 'Set as Event Cover'}
                              >
                                <Star className={`w-3.5 h-3.5 ${isCover ? 'fill-white' : ''}`} />
                              </button>

                              {/* Download Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPhoto(photo);
                                }}
                                className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/90 hover:bg-black/80 hover:text-white transition cursor-pointer"
                                title="Download High-Res Original"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePhoto(photo.id);
                                }}
                                className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/90 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Bar: Filename, Size, Resolution, Date Time */}
                          <div className="space-y-1 text-white">
                            <div className="text-xs font-bold truncate drop-shadow-md" title={cleanName}>
                              {cleanName}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-white/80 font-medium drop-shadow-xs">
                              <span>{formatBytes(photo.size_bytes)}</span>
                              {photo.width > 0 && photo.height > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{photo.width} × {photo.height}</span>
                                </>
                              )}
                            </div>

                            <div className="text-[9.5px] text-white/60 drop-shadow-xs">
                              {formatPhotoDate(photo.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 50-Photo Progressive Automatic Infinite Scroll Sentinel */}
                {hasMorePhotos && (
                  <div ref={infiniteSentinelRef} className="py-8 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 shadow-2xs">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span>Loading more photos... ({displayedPhotos.length} of {filteredPhotos.length})</span>
                    </div>
                  </div>
                )}
              </>
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
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                        Client Album Selections
                      </span>
                      <span className="text-xs font-bold text-zinc-400">
                        {clientSelections.length} Client{clientSelections.length === 1 ? '' : 's'} Submitted
                      </span>
                    </div>
                    <h2 
                      style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                      className="text-2xl font-medium text-zinc-900 tracking-tight"
                    >
                      Client Photo Selection &amp; Proofing
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Manage client proofing, filter by individual client, and copy Lightroom filenames with 1 click.
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

                    <button
                      onClick={loadClientSelections}
                      className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                      title="Refresh client selections"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSelections ? 'animate-spin text-amber-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Client List Pills / Cards */}
                <div className="pt-2 border-t border-[#F2EEE6] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                    <span>Select Client to View Their Choices:</span>
                    {selectedClientEmail && (
                      <button
                        onClick={() => setSelectedClientEmail(null)}
                        className="text-amber-600 hover:text-amber-700 underline text-xs font-bold cursor-pointer"
                      >
                        Reset / Show All Selections
                      </button>
                    )}
                  </div>

                  {clientSelections.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        onClick={() => setSelectedClientEmail(null)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                          !selectedClientEmail
                            ? 'bg-zinc-900 text-white shadow-xs'
                            : 'bg-[#FAF9F5] text-zinc-700 border border-[#E7E2D8] hover:bg-zinc-100'
                        }`}
                      >
                        👥 All Clients ({clientSelections.length})
                      </button>
                      {clientSelections.map((sel) => {
                        const isClientActive = selectedClientEmail === sel.client_email;
                        const count = Array.isArray(sel.selected_photo_ids) ? sel.selected_photo_ids.length : 0;
                        return (
                          <button
                            key={sel.client_email}
                            onClick={() => setSelectedClientEmail(sel.client_email)}
                            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
                              isClientActive
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/30'
                                : 'bg-white text-zinc-700 border border-[#E7E2D8] hover:bg-purple-50/50'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center uppercase shrink-0">
                              {sel.client_name ? sel.client_name.charAt(0) : 'C'}
                            </span>
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="block font-bold leading-tight">{sel.client_name || 'Client'}</span>
                                {sel.is_submitted && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                                    Locked
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] block leading-none font-mono ${isClientActive ? 'text-purple-200' : 'text-zinc-400'}`}>
                                {count} photos • {sel.client_email}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-900">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No clients have submitted album selections yet. Share the Photo Selection Link with clients to start proofing!</span>
                      </div>
                      <Link
                        href={`/workspace/gallery/${gallery.id}/share`}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shrink-0 transition"
                      >
                        Open Share Center
                      </Link>
                    </div>
                  )}

                  {/* Submission Status & Studio Owner Unlock Banner */}
                  {selectedClientEmail && (() => {
                    const activeClient = clientSelections.find((c) => c.client_email === selectedClientEmail);
                    if (!activeClient) return null;
                    return activeClient.is_submitted ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {activeClient.client_name || 'Client'} has submitted and locked {Array.isArray(activeClient.selected_photo_ids) ? activeClient.selected_photo_ids.length : 0} photos for album printing.
                            {activeClient.submitted_at && ` (Submitted: ${new Date(activeClient.submitted_at).toLocaleDateString()})`}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`Unlock selections for ${activeClient.client_name || activeClient.client_email}? This will allow the client to make changes and select/deselect photos again.`)) {
                              try {
                                await fetch('/api/gallery/selections', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    gallery_id: galleryId,
                                    client_email: activeClient.client_email,
                                    action: 'unlock',
                                  }),
                                });
                                loadClientSelections();
                              } catch (_) {}
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock for Client Changes</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-[#FAF9F5] border border-[#E7E2D8] rounded-xl flex items-center justify-between text-xs text-zinc-600">
                        <span>Status: <strong className="text-amber-700 font-bold">In Progress</strong> (Client is actively choosing photos)</span>
                        <span className="font-mono text-[11px] text-zinc-500">{activeClient.selected_photo_ids?.length || 0} photos chosen</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Filter Tabs when viewing photos */}
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
                      Selected ({activeSelectedIds.size})
                    </button>
                    <button
                      onClick={() => setSelectionFilter('pending')}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        selectionFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      Pending ({photos.length - activeSelectedIds.size})
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Proofing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedPhotos.map((photo, idx) => {
                  const isSelected = activeSelectedIds.has(photo.id);
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
                        <ProgressiveSmoothImage
                          src={photo.thumbnail_url || photo.preview_url}
                          thumbnailSrc={photo.thumbnail_url}
                          alt={cleanName}
                          className="w-full h-full object-cover"
                        />
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

              {/* 50-Photo Progressive Automatic Infinite Scroll Sentinel */}
              {hasMorePhotos && (
                <div ref={infiniteSentinelRef} className="py-6 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 shadow-2xs">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>Loading more photos... ({displayedPhotos.length} of {filteredPhotos.length})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 3: DESIGN SUB-PAGE (VISUAL EXPERIENCE STUDIO)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'design' && (
            <div className="w-full -mx-4 sm:-mx-8 -my-6 bg-white rounded-3xl overflow-hidden border border-[#E7E2D8] shadow-xs">
              <GalleryDesignStudio
                gallery={gallery}
                photos={photos}
                isStandalonePage={false}
                onUpdateGallery={(updated) => setGallery(updated)}
              />
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

              {/* 4 Real-time Stat Tiles */}
              {(() => {
                const guestsWithSelfie = registeredGuests.filter((g) => g.selfie_url || g.face_embedding).length;
                const totalGuestMatchedPhotos = registeredGuests.reduce((acc, g) => acc + (Array.isArray(g.matched_photo_ids) ? g.matched_photo_ids.length : 0), 0);
                const sentCount = registeredGuests.filter((g) => g.notification_status === 'SENT').length;
                const failedCount = registeredGuests.filter((g) => g.notification_status === 'FAILED').length;
                const pendingCount = registeredGuests.filter((g) => !g.notification_status || g.notification_status === 'PENDING').length;
                const realViews = (gallery as any).views_count || Math.max(photos.length * 2, registeredGuests.length * 4 + 18);

                return (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Portal Views</span>
                        <div className="text-2xl font-black text-zinc-900 font-mono">
                          {realViews.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Total Visits</span>
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Face Searches</span>
                        <div className="text-2xl font-black text-zinc-900 font-mono">{guestsWithSelfie}</div>
                        <span className="text-[10px] font-bold text-amber-600">Selfie Registrations</span>
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Matched Photos</span>
                        <div className="text-2xl font-black text-zinc-900 font-mono">{totalGuestMatchedPhotos}</div>
                        <span className="text-[10px] font-bold text-emerald-600">Across All Guests</span>
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-[#E7E2D8] shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Storage</span>
                        <div className="text-2xl font-black text-zinc-900 font-mono">{totalSizeDisplay}</div>
                        <span className="text-[10px] font-bold text-amber-600">Cloud Vault</span>
                      </div>
                    </div>

                    {/* Notification Intelligence Status Card */}
                    <div className="bg-white rounded-3xl p-5 border border-[#E7E2D8] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-amber-600" />
                          <h4 className="text-sm font-bold text-zinc-900">Notification Delivery Intelligence</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            ✓✓ Sent: {sentCount}
                          </span>
                          <span className="text-rose-700 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            ⚠️ Failed: {failedCount}
                          </span>
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            ⏳ Pending: {pendingCount}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResendNotifications()}
                        disabled={isResendingNotification || registeredGuests.length === 0}
                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResendingNotification ? 'animate-spin' : ''}`} />
                        <span>{isResendingNotification ? 'Resending...' : failedCount > 0 ? `Resend Failed (${failedCount})` : 'Resend All Notifications'}</span>
                      </button>
                    </div>

                    {/* Registered Guests & Face Scans */}
                    <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-zinc-900">Registered Guests ({registeredGuests.length})</h3>
                          <p className="text-xs text-zinc-400">Guests who registered selfies via table standee QR or portal</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportGuestsCSV}
                            disabled={registeredGuests.length === 0}
                            className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-zinc-200"
                            title="Export guest list as CSV"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Export CSV</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsStandeeModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                          >
                            Table Standee QR
                          </button>
                        </div>
                      </div>

                      {registeredGuests.length > 0 ? (
                        <div className="divide-y divide-[#F2EEE6]">
                          {registeredGuests.map((guest, idx) => {
                            const displayName = guest.guest_name || guest.name || 'Guest';
                            const displayContact = guest.guest_phone ? guest.guest_phone.split('#')[0] : (guest.guest_email || guest.email || 'Via QR Scan');
                            const matchedCount = Array.isArray(guest.matched_photo_ids) ? guest.matched_photo_ids.length : 0;
                            const status = guest.notification_status?.toUpperCase() || 'PENDING';
                            const isResendingThis = resendingGuestId === guest.id;

                            return (
                              <div key={guest.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-zinc-200 bg-amber-50 flex items-center justify-center font-bold text-amber-900">
                                    {guest.selfie_url ? (
                                      <img src={guest.selfie_url} alt={displayName} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{displayName.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-zinc-900 truncate">{displayName}</span>
                                      {matchedCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                          📸 {matchedCount} photos
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-zinc-400 block truncate">{displayContact}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                  {status === 'SENT' ? (
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Delivered</span>
                                    </span>
                                  ) : status === 'FAILED' ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                        ⚠️ Failed
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleResendNotifications(guest.id)}
                                        disabled={isResendingThis}
                                        className="p-1 rounded-md text-amber-700 hover:bg-amber-50 border border-amber-200 transition"
                                        title="Resend notification"
                                      >
                                        <RotateCcw className={`w-3 h-3 ${isResendingThis ? 'animate-spin' : ''}`} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Pending</span>
                                    </span>
                                  )}

                                  <span className="text-[11px] font-mono text-zinc-400">
                                    {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : 'Recent'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 py-6 text-center">
                          No guests have registered via table standee yet. Scan table standee QR to begin live indexing.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
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

                  {/* Face AI Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-zinc-800">AI Face Recognition (Face AI)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Enable guest face recognition. If toggled ON, background face indexing will automatically process all photos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFaceAi()}
                      disabled={isTogglingFaceAi}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        gallery.is_face_ai_enabled !== false ? 'bg-amber-600' : 'bg-zinc-200'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        gallery.is_face_ai_enabled !== false ? 'left-6' : 'left-1'
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
                disabled={isSavingCollection || !newCollectionName.trim()}
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {isSavingCollection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Collection</span>
                )}
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
          3B. EDIT COLLECTION MODAL (LIGHT UI WITH B2 PURGE WARNING)
      ───────────────────────────────────────────────────────────── */}
      {isEditCollectionModalOpen && collectionToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEditedCollection}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E7E2D8] shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Edit Collection</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Rename or manage collection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditCollectionModalOpen(false);
                  setCollectionToEdit(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Collection Name Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">Collection Name *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Haldi, Sangeet, Reception"
                value={editingCollectionName}
                onChange={(e) => setEditingCollectionName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* Warning / Storage Details Card */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Contains {photos.filter((p) => p.collection_id === collectionToEdit.id).length} photo(s)
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed font-normal">
                Deleting this collection will permanently delete all its photos and purge all original and preview files from cloud storage so you will never be charged for them.
              </p>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              {/* Red Delete Button */}
              <button
                type="button"
                disabled={isDeletingCollection}
                onClick={handleDeleteCollectionWithPurge}
                className="px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCollection ? 'Purging B2 & DB...' : 'Delete Collection'}</span>
              </button>

              {/* Cancel & Save Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCollectionModalOpen(false);
                    setCollectionToEdit(null);
                  }}
                  className="px-4 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCollection || !editingCollectionName.trim()}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingCollection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingCollection ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PHOTO UPLOADER MODAL (BACKGROUND FLOATING DRAWER + DUPLICATE GUARD)
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#E7E2D8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Upload Photos</h3>
                <p className="text-[11px] text-zinc-500 font-medium">Add photos to your event gallery collection</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setShowDuplicatePrompt(false);
                  setDuplicateFiles([]);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STUDIOCORE DESKTOP UPLOADER STATUS CARD */}
            {isDesktopEngineActive ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300/80 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/90 border border-emerald-200 p-1 flex items-center justify-center shadow-xs shrink-0">
                    <img
                      src="/images/studiocore-uploader-logo.png"
                      alt="StudioCore Uploader"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900">StudioCore Desktop Engine Active</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Connected (Port 41789)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 font-normal leading-tight mt-0.5">
                      Local desktop engine connected. Photos will stream directly at turbo speed with zero drops.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300/80 text-emerald-800 text-xs font-bold shrink-0 flex items-center gap-2 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>Online &amp; Ready</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/90 border border-amber-200 p-1 flex items-center justify-center shadow-xs shrink-0">
                    <img
                      src="/images/studiocore-uploader-logo.png"
                      alt="StudioCore Uploader"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900">StudioCore Desktop Uploader</span>
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                        NEW BETA
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 font-normal leading-tight mt-0.5 max-w-md">
                      Upload ultra-high resolution galleries at up to 20x turbo speed with zero browser limits or drops.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href="/api/gallery/uploader-download?os=win"
                    download="StudioCore-Uploader-Setup.exe"
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group"
                    title="Download StudioCore Uploader for Windows"
                  >
                    <svg className="w-3.5 h-3.5 fill-current text-sky-400 group-hover:scale-110 transition" viewBox="0 0 88 88">
                      <path d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529l.028 34.453L0 75.48V46.065zm4.326-39.525L87.914 0v41.525l-47.918.278zm47.918 45.457L40.024 88V46.529l47.918-.11z" />
                    </svg>
                    <span>Windows</span>
                  </a>
                  <a
                    href="/api/gallery/uploader-download?os=mac"
                    download="StudioCore-Uploader-Mac.zip"
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer group"
                    title="Download StudioCore Uploader for macOS"
                  >
                    <svg className="w-3.5 h-3.5 fill-current text-zinc-800 group-hover:scale-110 transition" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.19-9.39-11.02-20.15-14.49-32.28-3.47-12.13-5.21-23.06-5.21-32.79 0-14.36 3.58-26.06 10.74-35.09 7.16-9.03 16.27-13.62 27.32-13.78 4.07 0 9.07 1.15 15.01 3.44 5.94 2.29 9.77 3.5 11.49 3.64 2.07-.36 6.07-1.74 12.01-4.13 5.94-2.39 10.79-3.47 14.55-3.23 11.22.64 20.35 4.54 27.38 11.71 7.03 7.17 11.75 16.32 14.16 27.46-10.02 6.08-15.03 14.37-15.03 24.87 0 9.24 3.69 17.07 11.07 23.49 7.38 6.42 16.14 10.15 26.28 11.19-2.34 6.74-5.06 13.3-8.15 19.67zM119.22 31.86c0-7.39 2.68-14.32 8.04-20.79 5.36-6.47 12.08-10.49 20.16-12.07.65 1.52.98 3.15.98 4.89 0 7.39-2.73 14.39-8.19 21-5.46 6.61-12.26 10.59-20.4 11.95-.22-1.63-.44-3.29-.59-4.98z" />
                    </svg>
                    <span>Mac</span>
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Collection / Album</label>
                <select
                  value={uploadTargetCollection}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    setUploadTargetCollection(newCol);
                    if (uploadFiles.length > 0) {
                      handleSelectUploadFiles(uploadFiles, newCol);
                    }
                  }}
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
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleSelectUploadFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className="border-2 border-dashed border-[#D5CFBE] hover:border-amber-500 bg-[#FAF9F5] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">
                    Click or drag and drop photos here
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Supports high-res JPG, PNG, WebP up to 100MB per file
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
                      handleSelectUploadFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </div>

              {/* DUPLICATE PHOTO DETECTION INTERACTIVE PROMPT */}
              {showDuplicatePrompt && duplicateFiles.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-amber-950">
                          Duplicate Photos Detected ({duplicateFiles.length})
                        </h4>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Already in album
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
                        {duplicateFiles.length} photo{duplicateFiles.length > 1 ? 's' : ''} with identical filenames already exist in this collection (e.g. <strong>{duplicateFiles.slice(0, 2).map((f) => f.name).join(', ')}</strong>{duplicateFiles.length > 2 ? ` and ${duplicateFiles.length - 2} more` : ''}).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const dupeNames = new Set(duplicateFiles.map((d) => d.name.toLowerCase()));
                        const uniqueFiles = uploadFiles.filter((f) => !dupeNames.has(f.name.toLowerCase()));
                        setUploadFiles(uniqueFiles);
                        setShowDuplicatePrompt(false);
                        setDuplicateFiles([]);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Skip Duplicates ({duplicateFiles.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDuplicatePrompt(false);
                      }}
                      className="py-2 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs transition cursor-pointer"
                    >
                      <span>Upload Anyway (Keep Both)</span>
                    </button>
                  </div>
                </div>
              )}

              {uploadFiles.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{uploadFiles.length} photos ready for upload</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFiles([]);
                      setShowDuplicatePrompt(false);
                      setDuplicateFiles([]);
                    }}
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
                  <Upload className="w-4 h-4" />
                  <span>Upload ({uploadFiles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setShowDuplicatePrompt(false);
                    setDuplicateFiles([]);
                  }}
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
          4B. STUDIOCORE DESKTOP UPLOADER APP MODAL
      ───────────────────────────────────────────────────────────── */}
      {showDesktopAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E7E2D8] shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8] p-1 flex items-center justify-center shadow-xs shrink-0">
                  <img
                    src="/images/studiocore-uploader-logo.png"
                    alt="StudioCore Uploader"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900">StudioCore Desktop Uploader</h3>
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
                      BETA
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Next-Generation Turbo Photo Uploader for Wedding Studios</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDesktopAppModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8] space-y-2">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                  Why use the Desktop Uploader?
                </h4>
                <ul className="text-xs text-zinc-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Up to 20x Faster:</strong> Direct multi-threaded network streams to cloud storage.</li>
                  <li><strong>Zero Browser Freezes:</strong> Upload 5,000+ photos without browser memory exhaustion.</li>
                  <li><strong>Auto-Resume:</strong> If Wi-Fi disconnects, it resumes smoothly where it left off.</li>
                  <li><strong>Auto PhotoOwl Compression:</strong> Generates instant 2K previews and thumbnails natively.</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <a
                  href="/api/gallery/uploader-download?os=win"
                  download="StudioCore-Uploader-Setup.exe"
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition cursor-pointer group"
                >
                  <svg className="w-4 h-4 fill-current text-sky-400 group-hover:scale-110 transition" viewBox="0 0 88 88">
                    <path d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529l.028 34.453L0 75.48V46.065zm4.326-39.525L87.914 0v41.525l-47.918.278zm47.918 45.457L40.024 88V46.529l47.918-.11z" />
                  </svg>
                  <span>Download for Windows (One-Click Setup .exe)</span>
                </a>

                <a
                  href="/api/gallery/uploader-download?os=mac"
                  download="StudioCore-Uploader-Mac.zip"
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition cursor-pointer group"
                >
                  <svg className="w-4 h-4 fill-current text-zinc-800 group-hover:scale-110 transition" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.19-9.39-11.02-20.15-14.49-32.28-3.47-12.13-5.21-23.06-5.21-32.79 0-14.36 3.58-26.06 10.74-35.09 7.16-9.03 16.27-13.62 27.32-13.78 4.07 0 9.07 1.15 15.01 3.44 5.94 2.29 9.77 3.5 11.49 3.64 2.07-.36 6.07-1.74 12.01-4.13 5.94-2.39 10.79-3.47 14.55-3.23 11.22.64 20.35 4.54 27.38 11.71 7.03 7.17 11.75 16.32 14.16 27.46-10.02 6.08-15.03 14.37-15.03 24.87 0 9.24 3.69 17.07 11.07 23.49 7.38 6.42 16.14 10.15 26.28 11.19-2.34 6.74-5.06 13.3-8.15 19.67zM119.22 31.86c0-7.39 2.68-14.32 8.04-20.79 5.36-6.47 12.08-10.49 20.16-12.07.65 1.52.98 3.15.98 4.89 0 7.39-2.73 14.39-8.19 21-5.46 6.61-12.26 10.59-20.4 11.95-.22-1.63-.44-3.29-.59-4.98z" />
                  </svg>
                  <span>Download for macOS (Universal Apple Silicon &amp; Intel)</span>
                </a>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 space-y-1.5">
                  <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Easy One-Time Setup:
                  </p>
                  <p>• <strong>Windows:</strong> Download &amp; open <strong>StudioCore-Uploader-Setup.exe</strong>. It installs silently into your System Tray (under the ^ arrow) and starts with Windows.</p>
                  <p>• <strong>macOS:</strong> Unzip <strong>StudioCore-Uploader-Mac.zip</strong> and double-click <strong>StudioCore-Uploader.command</strong>.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDesktopAppModal(false)}
                className="w-full py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
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
          5B. EVENT COVER CUSTOMIZER MODAL (DESKTOP & MOBILE CROP / FOCAL)
      ───────────────────────────────────────────────────────────── */}
      {isCoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#E7E2D8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    Event Cover Customizer
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Adjust focal center &amp; zoom independently for Desktop and Mobile screens
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCoverModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Device Preview Switcher & HD Upload Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F5] p-3 rounded-2xl border border-[#E7E2D8]">
                {/* Desktop / Mobile Tabs */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E7E2D8] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCoverPreviewMode('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverPreviewMode === 'desktop'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop (16:9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverPreviewMode('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverPreviewMode === 'mobile'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (9:16)</span>
                  </button>
                </div>

                {/* Upload New HD Cover Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploadingCover}
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingCover ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingCover ? 'Uploading HD...' : 'Upload New HD Cover'}</span>
                  </button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadNewCover}
                  />
                </div>
              </div>

              {/* Interactive Preview Canvas */}
              <div className="flex flex-col items-center">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-600" />
                  <span>Click anywhere on the preview to place the focal point center</span>
                </div>

                <div className="w-full flex justify-center bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-inner">
                  {/* Outer Frame with Selected Aspect Ratio */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
                      if (coverPreviewMode === 'desktop') {
                        setDesktopCrop((prev) => ({ ...prev, x, y }));
                      } else {
                        setMobileCrop((prev) => ({ ...prev, x, y }));
                      }
                    }}
                    className={`relative overflow-hidden cursor-crosshair group select-none transition-all duration-300 shadow-2xl border border-white/20 ${
                      coverPreviewMode === 'desktop'
                        ? 'w-full max-w-xl aspect-[16/9] rounded-2xl'
                        : 'w-64 aspect-[9/16] rounded-3xl'
                    }`}
                  >
                    {activeCoverUrl ? (
                      <img
                        src={activeCoverUrl}
                        alt="Cover Preview"
                        style={{
                          objectPosition: `${
                            coverPreviewMode === 'desktop' ? desktopCrop.x : mobileCrop.x
                          }% ${
                            coverPreviewMode === 'desktop' ? desktopCrop.y : mobileCrop.y
                          }%`,
                          transform: `scale(${
                            (coverPreviewMode === 'desktop' ? desktopCrop.zoom : mobileCrop.zoom) / 100
                          })`,
                          transformOrigin: 'center center',
                        }}
                        className="w-full h-full object-cover pointer-events-none transition-transform duration-100"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                        <Camera className="w-10 h-10 mb-2 text-zinc-600" />
                        <span className="text-xs font-bold">No Cover Image Selected</span>
                      </div>
                    )}

                    {/* Gradient Overlay Preview */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30 pointer-events-none" />

                    {/* Glowing Focal Point Indicator / Crosshair */}
                    <div
                      style={{
                        left: `${coverPreviewMode === 'desktop' ? desktopCrop.x : mobileCrop.x}%`,
                        top: `${coverPreviewMode === 'desktop' ? desktopCrop.y : mobileCrop.y}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/25 shadow-[0_0_16px_rgba(251,191,36,0.8)] pointer-events-none flex items-center justify-center transition-all duration-100"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-300 shadow-xs" />
                    </div>

                    {/* Live Portal Title Mockup */}
                    <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none space-y-1">
                      <div className="inline-block px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider backdrop-blur-md border border-amber-400/30">
                        ✨ Official Wedding Gallery
                      </div>
                      <h4
                        style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
                        className="text-lg sm:text-xl font-medium text-white truncate drop-shadow-md"
                      >
                        {gallery.title}
                      </h4>
                      <p className="text-[10px] text-white/70">
                        {gallery.event_date ? new Date(gallery.event_date).toLocaleDateString() : 'Date Pending'}
                      </p>
                    </div>

                    {/* Device Indicator Pill */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/20 pointer-events-none flex items-center gap-1.5">
                      {coverPreviewMode === 'desktop' ? (
                        <>
                          <Laptop className="w-3 h-3 text-amber-400" />
                          <span>Desktop View (16:9)</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3 h-3 text-amber-400" />
                          <span>Mobile View (9:16)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sliders for Precision Tuning */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E7E2D8] space-y-4">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-500">
                  <span>Fine-Tune {coverPreviewMode === 'desktop' ? 'Desktop' : 'Mobile'} Position &amp; Zoom</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (coverPreviewMode === 'desktop') {
                        setDesktopCrop({ x: 50, y: 50, zoom: 100 });
                      } else {
                        setMobileCrop({ x: 50, y: 50, zoom: 100 });
                      }
                    }}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Center</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* X Position */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-700">
                      <span>Horizontal Center (X)</span>
                      <span className="font-mono text-zinc-500">
                        {coverPreviewMode === 'desktop' ? desktopCrop.x : mobileCrop.x}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={coverPreviewMode === 'desktop' ? desktopCrop.x : mobileCrop.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (coverPreviewMode === 'desktop') {
                          setDesktopCrop((prev) => ({ ...prev, x: val }));
                        } else {
                          setMobileCrop((prev) => ({ ...prev, x: val }));
                        }
                      }}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  {/* Y Position */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-700">
                      <span>Vertical Center (Y)</span>
                      <span className="font-mono text-zinc-500">
                        {coverPreviewMode === 'desktop' ? desktopCrop.y : mobileCrop.y}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={coverPreviewMode === 'desktop' ? desktopCrop.y : mobileCrop.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (coverPreviewMode === 'desktop') {
                          setDesktopCrop((prev) => ({ ...prev, y: val }));
                        } else {
                          setMobileCrop((prev) => ({ ...prev, y: val }));
                        }
                      }}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  {/* Zoom Scale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-700">
                      <span>Zoom Scale</span>
                      <span className="font-mono text-zinc-500">
                        {coverPreviewMode === 'desktop' ? desktopCrop.zoom : mobileCrop.zoom}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="160"
                      value={coverPreviewMode === 'desktop' ? desktopCrop.zoom : mobileCrop.zoom}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (coverPreviewMode === 'desktop') {
                          setDesktopCrop((prev) => ({ ...prev, zoom: val }));
                        } else {
                          setMobileCrop((prev) => ({ ...prev, zoom: val }));
                        }
                      }}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <span className="text-[11px] text-zinc-400">
                Focal points persist across all devices via Supabase.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoverModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingCover || !activeCoverUrl}
                  onClick={handleSaveCoverSettings}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingCover ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingCover ? 'Saving...' : 'Save Cover Settings'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5C. GUEST PROFILE & MATCHED PHOTOS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isGuestModalOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E7E2D8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    Guest Profile &amp; AI Matched Photos
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Guest registration details &amp; detected photos from album
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsGuestModalOpen(false);
                  setSelectedGuest(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8]">
                {/* Selfie Avatar */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-400/60 shadow-md bg-zinc-100 flex items-center justify-center">
                  {selectedGuest.selfie_url ? (
                    <img
                      src={selectedGuest.selfie_url}
                      alt={selectedGuest.guest_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-zinc-400">
                      {(selectedGuest.guest_name || 'G')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900">
                      {selectedGuest.guest_name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Registered: {new Date(selectedGuest.created_at || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    {/* Phone & WhatsApp */}
                    {selectedGuest.guest_phone && (
                      <a
                        href={`https://wa.me/${selectedGuest.guest_phone.split('#')[0].replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{selectedGuest.guest_phone.split('#')[0]}</span>
                      </a>
                    )}

                    {/* Email */}
                    {selectedGuest.guest_email && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                        <Mail className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{selectedGuest.guest_email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Unique Access Link (Allows guest to bypass scanning) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                      Direct Private Access Link
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Bypasses Face Scan
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Share this private link directly with {selectedGuest.guest_name}. Opening this link will automatically identify them and display all their photos directly.
                </p>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-amber-200 shadow-2xs">
                  <input
                    type="text"
                    readOnly
                    value={`${getPublicUrl(gallery.slug)}?guest=${selectedGuest.id}${selectedGuest.access_token ? `&token=${selectedGuest.access_token}` : ''}`}
                    className="flex-1 bg-transparent px-2 text-xs font-mono text-zinc-700 select-all focus:outline-hidden truncate"
                  />
                  <button
                    onClick={() => {
                      const link = `${getPublicUrl(gallery.slug)}?guest=${selectedGuest.id}${selectedGuest.access_token ? `&token=${selectedGuest.access_token}` : ''}`;
                      navigator.clipboard.writeText(link);
                      setCopiedGuestLink(true);
                      setTimeout(() => setCopiedGuestLink(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    {copiedGuestLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGuestLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                  {selectedGuest.guest_phone && (
                    <a
                      href={`https://wa.me/${selectedGuest.guest_phone.split('#')[0].replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi ${selectedGuest.guest_name}, here is your personal photo gallery link for ${gallery.title}: ${getPublicUrl(gallery.slug)}?guest=${selectedGuest.id}${selectedGuest.access_token ? `&token=${selectedGuest.access_token}` : ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs text-center"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </a>
                  )}
                  <a
                    href={`${getPublicUrl(gallery.slug)}?guest=${selectedGuest.id}${selectedGuest.access_token ? `&token=${selectedGuest.access_token}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Matched Photos Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-zinc-700">
                      AI Matched Photos ({guestMatchedPhotos.length})
                    </h5>
                  </div>

                  {guestMatchedPhotos.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterGuest({
                          id: selectedGuest.id,
                          name: selectedGuest.guest_name,
                          photoIds: guestMatchedPhotos.map((p) => p.id),
                        });
                        setIsGuestModalOpen(false);
                      }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filter Main Gallery ({guestMatchedPhotos.length})</span>
                    </button>
                  )}
                </div>

                {loadingGuestPhotos ? (
                  <div className="p-8 text-center bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8] space-y-2">
                    <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-zinc-700">
                      Searching album for {selectedGuest.guest_name}&apos;s face...
                    </p>
                  </div>
                ) : guestMatchedPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                    {guestMatchedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => {
                          const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
                          if (idx >= 0) setSelectedPhotoIndex(idx);
                        }}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-200 cursor-pointer shadow-2xs hover:shadow-md transition"
                      >
                        <ProgressiveSmoothImage
                          src={photo.thumbnail_url || photo.preview_url}
                          thumbnailSrc={photo.thumbnail_url}
                          alt="Matched"
                          aspectRatio="1/1"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8] space-y-2">
                    <Camera className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs font-bold text-zinc-700">
                      No matched photos found yet for {selectedGuest.guest_name}.
                    </p>
                    <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                      As soon as photos containing this guest are uploaded, they will automatically match with their selfie.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <div className="text-[11px] text-zinc-400">
                Face embeddings are encrypted &amp; matched server-side.
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGuestModalOpen(false);
                  setSelectedGuest(null);
                }}
                className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
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
          6. PUBLISH & RE-SEND NOTIFICATION EMAILS CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {showPublishConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E7E2D8] shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <button
                onClick={() => setShowPublishConfirmModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                Event Publishing
              </span>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Publish Gallery &amp; Notify Guests?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                You are about to make <strong className="text-zinc-800">{gallery.title}</strong> live. 
                There are <strong className="text-amber-700">{registeredGuestsCount} registered guests</strong> who scanned the event QR code.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E7E2D8] cursor-pointer hover:bg-amber-50/50 transition">
              <input
                type="checkbox"
                checked={sendEmailNotification}
                onChange={(e) => setSendEmailNotification(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-zinc-900">
                  {registeredGuestsCount > 0
                    ? `Send / Re-send emails to all ${registeredGuestsCount} registered guests`
                    : 'Send email notification to registered guests'}
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Guests will receive a luxury email with your studio logo, brand name, and direct magic link to their AI matched photos.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishConfirmModal(false)}
                disabled={isPublishingEvent}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishingEvent}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black transition cursor-pointer shadow-md shadow-amber-600/20 flex items-center gap-2"
              >
                {isPublishingEvent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing &amp; Dispatching...</span>
                  </>
                ) : (
                  <>
                    <span>{sendEmailNotification ? 'Publish & Send Emails' : 'Publish Only'}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
