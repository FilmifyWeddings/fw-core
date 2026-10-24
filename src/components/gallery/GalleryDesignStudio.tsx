'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Check,
  Smartphone,
  Monitor,
  ExternalLink,
  Save,
  Palette,
  Layout,
  Type,
  Sun,
  Moon,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  Loader2,
  RefreshCw,
  X,
  Crosshair,
  Sliders,
  Laptop,
  Camera,
} from 'lucide-react';
import { parseCoverUrl, buildCoverUrl, CoverPositioning } from '@/lib/gallery-cover-utils';

export type PresetId = 'cinematic_hero' | 'editorial_canvas' | 'faded_luxe' | 'split_atelier';

export interface GalleryDesignConfig {
  preset: PresetId;
  palette: {
    canvasBg: string;
    textColor: string;
    accentColor: string;
    subtextColor?: string;
    cardBg?: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    scale?: 'compact' | 'balanced' | 'grand';
  };
  cover?: {
    url?: string;
    overlayOpacity: number;
    focalPoint: { x: number; y: number };
  };
}

export const DEFAULT_DESIGN_CONFIG: GalleryDesignConfig = {
  preset: 'cinematic_hero',
  palette: {
    canvasBg: '#FAF9F5',
    textColor: '#18181B',
    accentColor: '#D97706',
    subtextColor: '#71717A',
    cardBg: '#FFFFFF',
  },
  typography: {
    headingFont: "'Italiana', 'Playfair Display', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    scale: 'balanced',
  },
  cover: {
    url: '',
    overlayOpacity: 45,
    focalPoint: { x: 50, y: 50 },
  },
};

// ── 4 EXACT HANDCRAFTED PRESETS (From User Photos 2, 3, 4, 5) ──
interface PresetItem {
  id: PresetId;
  name: string;
  subtitle: string;
  tag: string;
  description: string;
}

const PRESETS: PresetItem[] = [
  {
    id: 'cinematic_hero',
    name: 'Cinematic Hero',
    subtitle: 'Photo 4 Style',
    tag: 'Celebrity Choice',
    description: 'Edge-to-edge full-bleed hero with bottom romantic typography and golden vignette.',
  },
  {
    id: 'editorial_canvas',
    name: 'Editorial Canvas',
    subtitle: 'Photo 2 Terre Verde Style',
    tag: 'Haute Fashion',
    description: 'Oversized spaced headline at top with vertical portrait artwork below on warm canvas.',
  },
  {
    id: 'faded_luxe',
    name: 'Faded Luxe',
    subtitle: 'Photo 3 KnotsbyAMP Style',
    tag: 'Misty Romance',
    description: 'Misty soft-focus backdrop with centered ring emblem, stacked title, and gallery badge.',
  },
  {
    id: 'split_atelier',
    name: 'Split Atelier',
    subtitle: 'Photo 5 Diptych Style',
    tag: 'Modern Asymmetric',
    description: 'Split canvas with bold left editorial copy and right large framed portrait artwork.',
  },
];

// ── 20+ LUXURY WEDDING COLOR PALETTES ──
interface PaletteItem {
  id: string;
  name: string;
  category: 'Light Luxury' | 'Dark Regal';
  canvasBg: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
  cardBg: string;
}

const COLOR_PALETTES: PaletteItem[] = [
  {
    id: 'champagne_noir',
    name: 'Champagne & Noir',
    category: 'Light Luxury',
    canvasBg: '#FAF9F5',
    textColor: '#18181B',
    accentColor: '#D97706',
    subtextColor: '#71717A',
    cardBg: '#FFFFFF',
  },
  {
    id: 'tuscan_cream',
    name: 'Tuscan Cream',
    category: 'Light Luxury',
    canvasBg: '#F4EFEA',
    textColor: '#1A1918',
    accentColor: '#B45309',
    subtextColor: '#78716C',
    cardBg: '#FAF7F2',
  },
  {
    id: 'royal_ivory',
    name: 'Royal Ivory',
    category: 'Light Luxury',
    canvasBg: '#FAF8F5',
    textColor: '#262626',
    accentColor: '#B45309',
    subtextColor: '#737373',
    cardBg: '#FFFFFF',
  },
  {
    id: 'french_riviera',
    name: 'French Riviera',
    category: 'Light Luxury',
    canvasBg: '#F8FAFC',
    textColor: '#0F172A',
    accentColor: '#0284C7',
    subtextColor: '#64748B',
    cardBg: '#FFFFFF',
  },
  {
    id: 'rose_gold_blush',
    name: 'Rose Gold & Blush',
    category: 'Light Luxury',
    canvasBg: '#FDF2F4',
    textColor: '#27171B',
    accentColor: '#E11D48',
    subtextColor: '#881337',
    cardBg: '#FFFFFF',
  },
  {
    id: 'desert_sand',
    name: 'Desert Sand',
    category: 'Light Luxury',
    canvasBg: '#F7F3EE',
    textColor: '#292524',
    accentColor: '#C2410C',
    subtextColor: '#78716C',
    cardBg: '#FFFFFF',
  },
  {
    id: 'sage_olive',
    name: 'Sage & Olive',
    category: 'Light Luxury',
    canvasBg: '#F4F7F4',
    textColor: '#142318',
    accentColor: '#15803D',
    subtextColor: '#4B5563',
    cardBg: '#FFFFFF',
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Mist',
    category: 'Light Luxury',
    canvasBg: '#FAF5FF',
    textColor: '#1E1B4B',
    accentColor: '#9333EA',
    subtextColor: '#6B21A8',
    cardBg: '#FFFFFF',
  },
  {
    id: 'terracotta_sunset',
    name: 'Terracotta Sunset',
    category: 'Light Luxury',
    canvasBg: '#FAF5F0',
    textColor: '#271C17',
    accentColor: '#EA580C',
    subtextColor: '#78716C',
    cardBg: '#FFFFFF',
  },
  {
    id: 'vintage_sepia',
    name: 'Vintage Sepia',
    category: 'Light Luxury',
    canvasBg: '#F5EFE6',
    textColor: '#2B231D',
    accentColor: '#854D0E',
    subtextColor: '#713F12',
    cardBg: '#EFE6D8',
  },
  {
    id: 'pearl_lustre',
    name: 'Pearl Lustre',
    category: 'Light Luxury',
    canvasBg: '#FBFBFB',
    textColor: '#111827',
    accentColor: '#6366F1',
    subtextColor: '#6B7280',
    cardBg: '#FFFFFF',
  },
  {
    id: 'warm_cashmere',
    name: 'Warm Cashmere',
    category: 'Light Luxury',
    canvasBg: '#F6F2EC',
    textColor: '#1C1917',
    accentColor: '#78716C',
    subtextColor: '#A8A29E',
    cardBg: '#FFFFFF',
  },
  {
    id: 'aegean_blue',
    name: 'Aegean Blue',
    category: 'Light Luxury',
    canvasBg: '#F0F7FA',
    textColor: '#082F49',
    accentColor: '#0284C7',
    subtextColor: '#0369A1',
    cardBg: '#FFFFFF',
  },
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    category: 'Dark Regal',
    canvasBg: '#0A0A0B',
    textColor: '#F4F4F5',
    accentColor: '#F59E0B',
    subtextColor: '#A1A1AA',
    cardBg: '#18181B',
  },
  {
    id: 'emerald_gold',
    name: 'Emerald & Gold',
    category: 'Dark Regal',
    canvasBg: '#061E16',
    textColor: '#F0FDF4',
    accentColor: '#F59E0B',
    subtextColor: '#86EFAC',
    cardBg: '#0B2D21',
  },
  {
    id: 'nordic_slate',
    name: 'Nordic Slate',
    category: 'Dark Regal',
    canvasBg: '#0F172A',
    textColor: '#F8FAFC',
    accentColor: '#38BDF8',
    subtextColor: '#94A3B8',
    cardBg: '#1E293B',
  },
  {
    id: 'velvet_onyx',
    name: 'Velvet Onyx',
    category: 'Dark Regal',
    canvasBg: '#09090B',
    textColor: '#FAFAFA',
    accentColor: '#E4E4E7',
    subtextColor: '#71717A',
    cardBg: '#18181B',
  },
  {
    id: 'gothic_noir',
    name: 'Gothic Noir',
    category: 'Dark Regal',
    canvasBg: '#000000',
    textColor: '#E4E4E7',
    accentColor: '#A1A1AA',
    subtextColor: '#71717A',
    cardBg: '#121214',
  },
  {
    id: 'imperial_crimson',
    name: 'Imperial Crimson',
    category: 'Dark Regal',
    canvasBg: '#18080A',
    textColor: '#FFF1F2',
    accentColor: '#E11D48',
    subtextColor: '#FDA4AF',
    cardBg: '#240C10',
  },
  {
    id: 'forest_pine',
    name: 'Forest Pine',
    category: 'Dark Regal',
    canvasBg: '#0D1A14',
    textColor: '#ECFDF5',
    accentColor: '#10B981',
    subtextColor: '#6EE7B7',
    cardBg: '#13261D',
  },
];

// ── 14 TOP-TIER AESTHETIC WEDDING FONTS ──
interface AestheticFontItem {
  name: string;
  family: string;
  tag: string;
  category: 'Luxury Serif' | 'Modern Sans' | 'Calligraphy';
  subFont: string;
}

const AESTHETIC_FONTS: AestheticFontItem[] = [
  {
    name: 'Italiana',
    family: "'Italiana', Georgia, serif",
    tag: 'Haute Couture Vogue',
    category: 'Luxury Serif',
    subFont: "'Montserrat', sans-serif",
  },
  {
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    tag: 'Classic Editorial',
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Cormorant Garamond',
    family: "'Cormorant Garamond', Georgia, serif",
    tag: 'Old-Money Royal Serif',
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'Cinzel',
    family: "'Cinzel', Georgia, serif",
    tag: 'Roman Classical Monumental',
    category: 'Luxury Serif',
    subFont: "'Cormorant Garamond', serif",
  },
  {
    name: 'Bodoni Moda',
    family: "'Bodoni Moda', Georgia, serif",
    tag: 'High Fashion Drama',
    category: 'Luxury Serif',
    subFont: "'Outfit', sans-serif",
  },
  {
    name: 'Prata',
    family: "'Prata', Georgia, serif",
    tag: 'Romantic Teardrop Serif',
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Instrument Serif',
    family: "'Instrument Serif', Georgia, serif",
    tag: 'Modern Literary Magazine',
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'DM Serif Display',
    family: "'DM Serif Display', Georgia, serif",
    tag: 'Bold Editorial Headline',
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Great Vibes',
    family: "'Great Vibes', cursive",
    tag: 'Romantic Fluid Calligraphy',
    category: 'Calligraphy',
    subFont: "'Playfair Display', serif",
  },
  {
    name: 'Marcellus',
    family: "'Marcellus', Georgia, serif",
    tag: 'Artisan Heritage Flared',
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'Tenor Sans',
    family: "'Tenor Sans', sans-serif",
    tag: 'Warm Flared Minimalist',
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    tag: 'Contemporary Geometric',
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    tag: 'Architectural Clean Sans',
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    tag: 'Refined Modern Editorial',
    category: 'Modern Sans',
    subFont: "'Inter', sans-serif",
  },
];

interface GalleryDesignStudioProps {
  gallery?: any;
  photos?: any[];
  isGlobalDefault?: boolean;
  isStandalonePage?: boolean;
  onSaveSuccess?: () => void;
  onUpdateGallery?: (updated: any) => void;
}

export default function GalleryDesignStudio({
  gallery,
  photos = [],
  isGlobalDefault = false,
  isStandalonePage = false,
  onSaveSuccess,
  onUpdateGallery,
}: GalleryDesignStudioProps) {
  // Top 3 Tabs: Presets, Palette, Fonts
  const [activeTab, setActiveTab] = useState<'presets' | 'palette' | 'fonts'>('presets');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [paletteMode, setPaletteMode] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverModalMode, setCoverModalMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Floating in-component toast state
  const [toastNotification, setToastNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info' | 'loading';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' | 'loading' = 'success', duration = 3500) => {
    setToastNotification({ text, type });
    if (type !== 'loading') {
      setTimeout(() => {
        setToastNotification((prev) => (prev?.text === text ? null : prev));
      }, duration);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize design configuration from gallery raw_payload or fallback
  const initialDesign: GalleryDesignConfig = useMemo(() => {
    const raw = gallery?.raw_payload?.design;
    if (raw) {
      let presetKey: PresetId = 'cinematic_hero';
      if (['cinematic_hero', 'editorial_canvas', 'faded_luxe', 'split_atelier'].includes(raw.preset)) {
        presetKey = raw.preset;
      } else if (raw.preset === 'cinematic_bleed') {
        presetKey = 'cinematic_hero';
      } else if (raw.preset === 'haute_editorial') {
        presetKey = 'editorial_canvas';
      } else if (raw.preset === 'royal_medallion') {
        presetKey = 'faded_luxe';
      } else if (raw.preset === 'grand_diptych') {
        presetKey = 'split_atelier';
      }

      return {
        ...DEFAULT_DESIGN_CONFIG,
        ...raw,
        preset: presetKey,
        palette: {
          ...DEFAULT_DESIGN_CONFIG.palette,
          ...(raw.palette || {}),
        },
        typography: {
          ...DEFAULT_DESIGN_CONFIG.typography,
          ...(raw.typography || {}),
        },
        cover: {
          ...DEFAULT_DESIGN_CONFIG.cover,
          ...(raw.cover || {}),
        },
      };
    }
    return DEFAULT_DESIGN_CONFIG;
  }, [gallery]);

  const [design, setDesign] = useState<GalleryDesignConfig>(initialDesign);

  // Studio branding details
  const studioBranding = gallery?.studio_branding;
  const studioName = studioBranding?.studio_name || 'StudioCore';
  const studioLogo = studioBranding?.logo_url;
  const studioSubtitle =
    studioBranding?.subtitle ||
    studioBranding?.studio_subtitle ||
    studioBranding?.tagline ||
    'Fine Art Wedding Photography & Films';
  const coupleName = gallery?.title || 'Navnath & Priya';
  const eventDateFormatted = gallery?.event_date
    ? new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'October 24, 2026';

  // Effective cover photo URL and positioning from hash
  const effectiveCoverPhoto = useMemo(() => {
    return (
      design.cover?.url ||
      gallery?.cover_url ||
      (photos.length > 0 ? photos[0].preview_url || photos[0].thumbnail_url : '')
    );
  }, [design.cover?.url, gallery?.cover_url, photos]);

  const coverPositioning = useMemo(() => {
    return parseCoverUrl(effectiveCoverPhoto);
  }, [effectiveCoverPhoto]);

  // Modal crop state
  const [modalDesktopCrop, setModalDesktopCrop] = useState<{ x: number; y: number; zoom: number }>({
    x: coverPositioning.desktop.x,
    y: coverPositioning.desktop.y,
    zoom: coverPositioning.desktop.zoom,
  });
  const [modalMobileCrop, setModalMobileCrop] = useState<{ x: number; y: number; zoom: number }>({
    x: coverPositioning.mobile.x,
    y: coverPositioning.mobile.y,
    zoom: coverPositioning.mobile.zoom,
  });

  // Keep modal crop synced with cover position
  useEffect(() => {
    setModalDesktopCrop({
      x: coverPositioning.desktop.x,
      y: coverPositioning.desktop.y,
      zoom: coverPositioning.desktop.zoom,
    });
    setModalMobileCrop({
      x: coverPositioning.mobile.x,
      y: coverPositioning.mobile.y,
      zoom: coverPositioning.mobile.zoom,
    });
  }, [coverPositioning]);

  // Real photos list to display in the live preview
  const previewPhotos = useMemo(() => {
    if (photos && photos.length > 0) {
      return photos.slice(0, 6).map((p) => p.preview_url || p.thumbnail_url || p.url);
    }
    return [];
  }, [photos]);

  // Update theme mode when palette changes
  useEffect(() => {
    const isDark = COLOR_PALETTES.find(
      (p) => p.canvasBg.toLowerCase() === design.palette.canvasBg.toLowerCase() && p.category === 'Dark Regal'
    );
    if (isDark) {
      setPaletteMode('dark');
    }
  }, [design.palette.canvasBg]);

  // Handle Cover Photo Upload (with WebP compression and direct back-end persistence)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetGalleryId = gallery?.id;
    if (!targetGalleryId && !isGlobalDefault) {
      showToast('Missing gallery identification', 'error');
      return;
    }

    setIsUploadingCover(true);
    showToast('Uploading high-resolution cover photo...', 'loading');

    try {
      const filename = `cover_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // 1. Request upload authorization URL (accepts both galleryId and gallery_id)
      const upRes = await fetch('/api/gallery/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId: targetGalleryId || 'global-default',
          filename,
          originalType: file.type || 'image/jpeg',
          size_bytes: file.size,
        }),
      });

      const upJson = await upRes.json();
      if (!upJson.success || !upJson.upload_url) {
        throw new Error(upJson.error || 'Failed to obtain upload authorization');
      }

      // 2. Upload binary directly to Cloudflare R2 / Backblaze B2
      const putRes = await fetch(upJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error('Failed to upload file to cloud storage');
      }

      const newCoverUrl = upJson.public_url || `/api/gallery/image?key=${encodeURIComponent(upJson.file_key)}`;

      // 3. Update local state with default center focal point
      const compositeUrl = buildCoverUrl(newCoverUrl, { x: 50, y: 25, zoom: 100 }, { x: 50, y: 25, zoom: 100 });

      setDesign((prev) => ({
        ...prev,
        cover: {
          ...(prev.cover || { overlayOpacity: 45, focalPoint: { x: 50, y: 25 } }),
          url: compositeUrl,
        },
      }));

      // 4. Update backend immediately
      if (targetGalleryId) {
        await fetch('/api/gallery/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetGalleryId,
            cover_url: compositeUrl,
          }),
        });
        if (onUpdateGallery) {
          onUpdateGallery({ ...gallery, cover_url: compositeUrl });
        }
      }

      showToast('HD cover photo uploaded & ready!', 'success');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      showToast(`Cover upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Focal Point & Zoom from Customizer Modal
  const handleSaveModalFocalSettings = async () => {
    if (!effectiveCoverPhoto) return;

    const compositeUrl = buildCoverUrl(coverPositioning.url, modalDesktopCrop, modalMobileCrop);

    setDesign((prev) => ({
      ...prev,
      cover: {
        ...(prev.cover || { overlayOpacity: 45, focalPoint: { x: 50, y: 50 } }),
        url: compositeUrl,
        focalPoint: { x: modalDesktopCrop.x, y: modalDesktopCrop.y },
      },
    }));

    if (gallery?.id) {
      try {
        await fetch('/api/gallery/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: gallery.id,
            cover_url: compositeUrl,
          }),
        });
        if (onUpdateGallery) {
          onUpdateGallery({ ...gallery, cover_url: compositeUrl });
        }
      } catch (_) {}
    }

    setIsCoverModalOpen(false);
    showToast('Focal position & crop applied!', 'success');
  };

  // Save & Publish Handler (Dual-Mode: Global Default or Event-Specific)
  const handleSaveAndPublish = async () => {
    setSaving(true);
    showToast(
      isGlobalDefault ? 'Saving global studio gallery design...' : 'Saving event gallery visual presentation...',
      'loading'
    );

    try {
      if (isGlobalDefault) {
        const res = await fetch('/api/gallery/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              gallery_design: design,
            },
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to save global design');
        showToast('Default gallery design saved for all events!', 'success');
      } else {
        if (!gallery?.id) throw new Error('Missing Gallery ID');

        const res = await fetch('/api/gallery/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: gallery.id,
            raw_payload: {
              ...(gallery?.raw_payload || {}),
              design,
            },
            cover_url: design.cover?.url || gallery?.cover_url,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to save event design');

        if (onUpdateGallery) {
          onUpdateGallery({
            ...gallery,
            raw_payload: {
              ...(gallery?.raw_payload || {}),
              design,
            },
            cover_url: design.cover?.url || gallery?.cover_url,
          });
        }
        showToast('Gallery visual presentation saved & published!', 'success');
      }

      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error('Save design error:', err);
      showToast(`Save Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open live client gallery in new tab
  const handleOpenLivePreview = () => {
    if (gallery?.slug) {
      window.open(`/g/${gallery.slug}`, '_blank');
    } else {
      showToast('Please save the gallery to generate a public link.', 'info');
    }
  };

  return (
    <div className="w-full bg-[#FAF9F5] text-zinc-900 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ── TOP HEADER ACTION BAR ── */}
      <div className="border-b border-[#E7E2D8] bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-zinc-900 tracking-tight">
                {isGlobalDefault ? 'Global Gallery Design & Defaults' : `${coupleName} Design Studio`}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                {isGlobalDefault ? 'Studio Default' : 'Event Customizer'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium hidden sm:block">
              {isGlobalDefault
                ? 'Sets default visual cover layout, color palette & typography for all upcoming events.'
                : 'Custom visual identity, layout & fonts tailored specifically for this wedding.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isGlobalDefault && gallery?.slug && (
            <button
              type="button"
              onClick={handleOpenLivePreview}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
              <span>Preview Live</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isGlobalDefault ? 'Save Studio Defaults' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN STUDIO WORKSPACE ── */}
      <div className="max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ═════════════════════════════════════════════════════════════
              LEFT COLUMN: DESIGN CONTROLS (INDEPENDENT SCROLL)
          ═════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 xl:col-span-5 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 space-y-6 scrollbar-thin">
            
            {/* 3 Main Tabs: Presets, Palette, Fonts */}
            <div className="flex items-center p-1.5 bg-[#F4F1EA] rounded-2xl border border-[#E7E2D8] gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-white text-zinc-950 shadow-sm border border-black/5'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Layout className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Presets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('palette')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'palette'
                    ? 'bg-white text-zinc-950 shadow-sm border border-black/5'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Palette</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fonts')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'fonts'
                    ? 'bg-white text-zinc-950 shadow-sm border border-black/5'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Fonts</span>
              </button>
            </div>

            {/* ─────────────────────────────────────────────────────────
                TAB 1: 4 HANDCRAFTED PRESETS
            ───────────────────────────────────────────────────────── */}
            {activeTab === 'presets' && (
              <div className="space-y-6">
                
                {/* Cover Photo Status & Event Cover Customizer Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E2D8] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-zinc-900">Event Cover Photograph</span>
                    </div>
                    {coverPositioning.url ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Focal Set
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        No Cover Set
                      </span>
                    )}
                  </div>

                  {coverPositioning.url ? (
                    <div className="flex items-center gap-3 p-2 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8]">
                      <div
                        onClick={() => setIsCoverModalOpen(true)}
                        className="w-20 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0 cursor-pointer relative group"
                        title="Click to open Event Cover Customizer"
                      >
                        <img
                          src={coverPositioning.url}
                          alt="Cover"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${coverPositioning.desktop.x}% ${coverPositioning.desktop.y}%`,
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Crosshair className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-xs font-bold text-zinc-800 truncate block">Active HD Cover</span>
                        <span className="text-[10px] text-zinc-400">
                          Desktop focal: {coverPositioning.desktop.x}%, {coverPositioning.desktop.y}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCoverModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Customize Focal &amp; Crop</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsCoverModalOpen(true)}
                      className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-5 text-center bg-amber-50/40 hover:bg-amber-50/70 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center mx-auto">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-amber-950">Upload &amp; Customize Event Cover Photo</p>
                      <p className="text-[10px] text-amber-700/80">
                        Adjust focal centers &amp; zoom independently for Desktop and Mobile
                      </p>
                    </div>
                  )}
                </div>

                {/* Presets List Header */}
                <div className="space-y-1">
                  <h2 className="text-sm font-black text-zinc-900">Cover Hero Layout Presets</h2>
                  <p className="text-xs text-zinc-500">
                    Select how the opening cover and couple introduction appears when guests open the gallery.
                  </p>
                </div>

                {/* 4 Handcrafted Presets Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PRESETS.map((preset) => {
                    const isSelected = design.preset === preset.id;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => setDesign((prev) => ({ ...prev, preset: preset.id }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/30 shadow-md ring-2 ring-amber-600/20'
                            : 'border-[#E7E2D8] bg-white hover:border-zinc-400'
                        }`}
                      >
                        {/* Mini Visual Diagram Representation */}
                        <div className="w-full h-32 rounded-xl bg-zinc-950 overflow-hidden relative flex flex-col justify-between p-2.5 text-white">
                          {coverPositioning.url && (
                            <img
                              src={coverPositioning.url}
                              alt={preset.name}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                                preset.id === 'faded_luxe' ? 'opacity-40 filter brightness-110' : 'opacity-70'
                              }`}
                              style={{
                                objectPosition: `${coverPositioning.desktop.x}% ${coverPositioning.desktop.y}%`,
                              }}
                            />
                          )}

                          {/* Top Bar Representation */}
                          <div className="relative z-10 flex items-center justify-between text-[8px] font-mono tracking-widest uppercase opacity-70">
                            <span>{studioName.slice(0, 10)}</span>
                            <span>PHOTOS</span>
                          </div>

                          {/* Center / Layout Representation */}
                          {preset.id === 'cinematic_hero' && (
                            <div className="relative z-10 text-center pb-1 space-y-0.5">
                              <span className="text-[7px] uppercase font-mono tracking-widest text-amber-300">
                                GALLERY BY
                              </span>
                              <div className="text-[11px] font-serif font-normal capitalize">{coupleName}</div>
                              <span className="text-[7px] font-mono opacity-60">{eventDateFormatted}</span>
                            </div>
                          )}

                          {preset.id === 'editorial_canvas' && (
                            <div className="absolute inset-0 bg-[#F4EFEA] text-zinc-900 p-2 flex flex-col items-center justify-between">
                              <span className="text-[6px] font-mono uppercase tracking-widest opacity-60">TERRE VERDE</span>
                              <div className="text-[10px] font-serif tracking-[0.2em] uppercase font-bold">{coupleName}</div>
                              <div className="w-12 h-16 rounded-xs bg-zinc-800 overflow-hidden shadow-xs">
                                {coverPositioning.url && (
                                  <img
                                    src={coverPositioning.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    style={{
                                      objectPosition: `${coverPositioning.desktop.x}% ${coverPositioning.desktop.y}%`,
                                    }}
                                  />
                                )}
                              </div>
                              <span className="text-[6px] font-mono opacity-50">{eventDateFormatted}</span>
                            </div>
                          )}

                          {preset.id === 'faded_luxe' && (
                            <div className="absolute inset-0 bg-white/70 text-zinc-900 p-2 flex flex-col items-center justify-center space-y-1">
                              <div className="w-3 h-3 rounded-full border border-zinc-400" />
                              <span className="text-[6px] font-mono uppercase tracking-widest text-zinc-500">
                                GALLERY BY
                              </span>
                              <div className="text-[9px] font-serif font-bold uppercase">{coupleName}</div>
                              <span className="text-[6px] font-mono text-zinc-400">{eventDateFormatted}</span>
                            </div>
                          )}

                          {preset.id === 'split_atelier' && (
                            <div className="absolute inset-0 grid grid-cols-2 bg-[#F4EFEA] text-zinc-900">
                              <div className="p-2 flex flex-col justify-center space-y-0.5">
                                <span className="text-[5px] font-mono uppercase tracking-widest opacity-60">
                                  GALLERY BY
                                </span>
                                <div className="text-[9px] font-serif font-bold uppercase leading-tight">{coupleName}</div>
                                <span className="text-[5px] font-mono opacity-50">{eventDateFormatted}</span>
                              </div>
                              <div className="bg-zinc-800 overflow-hidden">
                                {coverPositioning.url && (
                                  <img
                                    src={coverPositioning.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    style={{
                                      objectPosition: `${coverPositioning.desktop.x}% ${coverPositioning.desktop.y}%`,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md z-20">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-zinc-900">{preset.name}</span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-700 text-[9px] font-mono font-bold">
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{preset.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                TAB 2: 20+ LUXURY COLOR PALETTES
            ───────────────────────────────────────────────────────── */}
            {activeTab === 'palette' && (
              <div className="space-y-6">
                
                {/* Light vs. Dark Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-zinc-900">Curated Color Palettes</h2>
                    <p className="text-xs text-zinc-500">Fine-tuned background, typography & accent colors.</p>
                  </div>

                  <div className="flex items-center p-1 bg-[#F4F1EA] rounded-xl border border-[#E7E2D8] gap-1">
                    <button
                      type="button"
                      onClick={() => setPaletteMode('light')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        paletteMode === 'light' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaletteMode('dark')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        paletteMode === 'dark' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Palettes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COLOR_PALETTES.filter(
                    (p) => (paletteMode === 'light' ? p.category === 'Light Luxury' : p.category === 'Dark Regal')
                  ).map((pal) => {
                    const isSelected = design.palette.canvasBg.toLowerCase() === pal.canvasBg.toLowerCase();

                    return (
                      <div
                        key={pal.id}
                        onClick={() =>
                          setDesign((prev) => ({
                            ...prev,
                            palette: {
                              canvasBg: pal.canvasBg,
                              textColor: pal.textColor,
                              accentColor: pal.accentColor,
                              subtextColor: pal.subtextColor,
                              cardBg: pal.cardBg,
                            },
                          }))
                        }
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/40 shadow-xs ring-2 ring-amber-600/20'
                            : 'border-[#E7E2D8] bg-white hover:border-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Color Swatch Tri-dots */}
                          <div className="flex items-center -space-x-1.5">
                            <div
                              className="w-6 h-6 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: pal.canvasBg }}
                            />
                            <div
                              className="w-6 h-6 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: pal.textColor }}
                            />
                            <div
                              className="w-6 h-6 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: pal.accentColor }}
                            />
                          </div>

                          <div>
                            <span className="text-xs font-bold text-zinc-900 block">{pal.name}</span>
                            <span className="text-[10px] font-mono text-zinc-400">{pal.canvasBg}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Hex Color Pickers */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2D8] shadow-xs space-y-3">
                  <span className="text-xs font-bold text-zinc-900 block">Custom Hex Color Pickers</span>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Canvas Background */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Background
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[#E7E2D8] bg-[#FAF9F5]">
                        <input
                          type="color"
                          value={design.palette.canvasBg}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, canvasBg: e.target.value },
                            }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-mono font-bold">{design.palette.canvasBg}</span>
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Text
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[#E7E2D8] bg-[#FAF9F5]">
                        <input
                          type="color"
                          value={design.palette.textColor}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, textColor: e.target.value },
                            }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-mono font-bold">{design.palette.textColor}</span>
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Accent
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[#E7E2D8] bg-[#FAF9F5]">
                        <input
                          type="color"
                          value={design.palette.accentColor}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, accentColor: e.target.value },
                            }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-mono font-bold">{design.palette.accentColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                TAB 3: 14 TOP-TIER AESTHETIC WEDDING FONTS
            ───────────────────────────────────────────────────────── */}
            {activeTab === 'fonts' && (
              <div className="space-y-6">
                
                <div>
                  <h2 className="text-sm font-black text-zinc-900">14 Aesthetic Typography Selections</h2>
                  <p className="text-xs text-zinc-500">
                    Hand-curated high-fashion editorial serif and modern sans-serif fonts.
                  </p>
                </div>

                {/* Big Aesthetic Font Cards */}
                <div className="space-y-3">
                  {AESTHETIC_FONTS.map((font) => {
                    const isSelected =
                      design.typography.headingFont.toLowerCase().includes(font.name.toLowerCase()) ||
                      design.typography.headingFont === font.family;

                    return (
                      <div
                        key={font.name}
                        onClick={() =>
                          setDesign((prev) => ({
                            ...prev,
                            typography: {
                              ...prev.typography,
                              headingFont: font.family,
                              bodyFont: font.subFont,
                            },
                          }))
                        }
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative bg-white hover:border-zinc-400 ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/20 shadow-sm ring-2 ring-amber-600/20'
                            : 'border-[#E7E2D8]'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-black/5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{font.name}</span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 text-[9px] font-mono">
                              {font.tag}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Large Headline Text Sample */}
                        <div className="pt-3 pb-1">
                          <p
                            className="text-2xl sm:text-3xl text-zinc-900 truncate leading-snug"
                            style={{ fontFamily: font.family }}
                          >
                            {coupleName}
                          </p>
                          <p
                            className="text-xs text-zinc-500 italic mt-0.5"
                            style={{ fontFamily: font.subFont }}
                          >
                            Fine Art Wedding Memories &bull; {eventDateFormatted}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

          {/* ═════════════════════════════════════════════════════════════
              RIGHT COLUMN: LIVE DUAL SIMULATOR (STICKY & RESPONSIVE)
          ═════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 xl:col-span-7 sticky top-4 self-start">
            
            {/* Simulator Header with Embedded Device Toggle */}
            <div className="bg-[#18181B] text-white rounded-t-3xl px-6 py-3.5 flex items-center justify-between border-t border-x border-zinc-700 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                  Client Simulator Live Preview
                </span>
              </div>

              {/* Exact Device Switcher inside Preview Bar */}
              <div className="flex items-center p-1 bg-zinc-800 rounded-xl border border-zinc-700 gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-zinc-100 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-zinc-100 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Simulator Frame Container */}
            <div className="bg-[#E7E2D8] border-b border-x border-[#D5CFC3] rounded-b-3xl p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[580px]">
              
              {/* ── DESKTOP BROWSER FRAME ── */}
              {previewDevice === 'desktop' && (
                <div className="w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-black/10 transition-all duration-300">
                  {/* Browser Address Bar */}
                  <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <div className="truncate max-w-xs">
                      https://studiocore.in/{gallery?.slug || 'wedding-gallery'}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Official Guest Portal</span>
                  </div>

                  {/* Desktop Content Scroll Area */}
                  <div
                    className="overflow-y-auto max-h-[620px] select-none transition-colors duration-500"
                    style={{
                      backgroundColor: design.palette.canvasBg,
                      color: design.palette.textColor,
                      fontFamily: design.typography.bodyFont,
                    }}
                  >
                    {/* 1. Header Bar (Glassmorphic Blur matching Light/Dark Palette) */}
                    <div
                      className="border-b px-6 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 transition-all"
                      style={{
                        backgroundColor:
                          paletteMode === 'light' ? 'rgba(255, 255, 255, 0.82)' : 'rgba(9, 9, 11, 0.88)',
                        borderColor:
                          paletteMode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
                        color: paletteMode === 'light' ? '#18181B' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {studioLogo ? (
                          <img
                            src={studioLogo}
                            alt={studioName}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-black/10"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-black flex items-center justify-center">
                            {studioName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold block leading-none">{studioName}</span>
                          <span className="text-[9px] opacity-60 block leading-tight">{studioSubtitle}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-60">
                        {photos.length > 0 ? `${photos.length} PHOTOS` : '114 PHOTOS'}
                      </span>
                    </div>

                    {/* 2. Hero Preset Rendered with Exact Focal Point & Zoom */}
                    {renderPresetContent(
                      design,
                      coupleName,
                      eventDateFormatted,
                      studioName,
                      coverPositioning,
                      photos.length,
                      false
                    )}

                    {/* 3. Sub-Events Bar (Dynamically Colored by Selected Palette) */}
                    <div
                      className="px-6 py-2.5 border-y flex items-center justify-between text-xs font-bold transition-all shadow-2xs sticky top-[53px] z-10"
                      style={{
                        backgroundColor: `${design.palette.cardBg || design.palette.canvasBg}F0`,
                        borderColor: `${design.palette.textColor}1A`,
                        color: design.palette.textColor,
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-x-auto py-0.5">
                        <span
                          className="px-3 py-1 rounded-full text-[11px] font-bold shadow-xs whitespace-nowrap"
                          style={{ backgroundColor: design.palette.accentColor, color: '#FFFFFF' }}
                        >
                          All Photos ({photos.length > 0 ? photos.length : 18})
                        </span>
                        <span className="opacity-70 hover:opacity-100 cursor-pointer whitespace-nowrap">Highlights</span>
                        <span className="opacity-70 hover:opacity-100 cursor-pointer whitespace-nowrap">Sangeet</span>
                        <span className="opacity-70 hover:opacity-100 cursor-pointer whitespace-nowrap">Haldi</span>
                        <span className="opacity-70 hover:opacity-100 cursor-pointer whitespace-nowrap">Wedding</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-50 whitespace-nowrap hidden sm:inline">
                        AI Face Search Enabled
                      </span>
                    </div>

                    {/* 4. Real Photos Grid in Preview */}
                    <div className="p-6">
                      {previewPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          {previewPhotos.map((url, idx) => (
                            <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-xs bg-black/5">
                              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-xl bg-black/5 border border-black/10 flex flex-col items-center justify-center p-3 text-center"
                            >
                              <ImageIcon className="w-5 h-5 opacity-20 mb-1" />
                              <span className="text-[9px] opacity-40 font-mono">Photo {idx}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* ── MOBILE PHONE FRAME (iPhone 16 Pro Style) ── */}
              {previewDevice === 'mobile' && (
                <div className="w-[340px] h-[680px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-zinc-800 relative flex flex-col transition-all duration-300">
                  {/* Dynamic Island */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-40 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                  </div>

                  {/* Mobile Screen Area */}
                  <div
                    className="w-full h-full rounded-[38px] overflow-y-auto select-none flex flex-col relative transition-colors duration-500 pt-7 scrollbar-none"
                    style={{
                      backgroundColor: design.palette.canvasBg,
                      color: design.palette.textColor,
                      fontFamily: design.typography.bodyFont,
                    }}
                  >
                    {/* Mobile Header Bar */}
                    <div
                      className="border-b px-4 py-2.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-20"
                      style={{
                        backgroundColor:
                          paletteMode === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 9, 11, 0.88)',
                        borderColor:
                          paletteMode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
                        color: paletteMode === 'light' ? '#18181B' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {studioLogo ? (
                          <img src={studioLogo} alt={studioName} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white text-[9px] font-black flex items-center justify-center">
                            {studioName.charAt(0)}
                          </div>
                        )}
                        <span className="text-[11px] font-bold truncate max-w-[120px]">{studioName}</span>
                      </div>
                      <span className="text-[9px] font-mono opacity-60">
                        {photos.length > 0 ? `${photos.length}P` : '114P'}
                      </span>
                    </div>

                    {/* Mobile Hero Content with Mobile Focal Positioning */}
                    {renderPresetContent(
                      design,
                      coupleName,
                      eventDateFormatted,
                      studioName,
                      coverPositioning,
                      photos.length,
                      true
                    )}

                    {/* Mobile Sub-Events Bar */}
                    <div
                      className="px-3 py-2 border-y flex items-center gap-2 overflow-x-auto text-[10px] font-bold"
                      style={{
                        backgroundColor: `${design.palette.cardBg || design.palette.canvasBg}F0`,
                        borderColor: `${design.palette.textColor}1A`,
                        color: design.palette.textColor,
                      }}
                    >
                      <span
                        className="px-2.5 py-1 rounded-full text-[9px] font-bold shadow-xs whitespace-nowrap"
                        style={{ backgroundColor: design.palette.accentColor, color: '#FFFFFF' }}
                      >
                        All ({photos.length > 0 ? photos.length : 18})
                      </span>
                      <span className="opacity-70 whitespace-nowrap">Highlights</span>
                      <span className="opacity-70 whitespace-nowrap">Sangeet</span>
                    </div>

                    {/* Mobile Photo Grid */}
                    <div className="p-3">
                      {previewPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {previewPhotos.slice(0, 4).map((url, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-black/5 shadow-2xs">
                              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {[1, 2, 3, 4].map((idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-lg bg-black/5 flex items-center justify-center text-[9px] opacity-40"
                            >
                              Photo {idx}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Home Indicator Bar */}
                    <div className="sticky bottom-1 left-0 right-0 py-2 flex justify-center pointer-events-none">
                      <div className="w-28 h-1 bg-black/30 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          5B. EXACT EVENT COVER CUSTOMIZER MODAL (DESKTOP & MOBILE)
      ═════════════════════════════════════════════════════════════ */}
      {isCoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#E7E2D8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Event Cover Customizer</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Adjust focal center &amp; zoom independently for Desktop and Mobile screens
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition cursor-pointer"
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
                    onClick={() => setCoverModalMode('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalMode === 'desktop'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop (16:9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverModalMode('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalMode === 'mobile'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (9:16)</span>
                  </button>
                </div>

                {/* Upload New HD Cover Button */}
                <button
                  type="button"
                  disabled={isUploadingCover}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUploadingCover ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploadingCover ? 'Uploading HD...' : 'Upload New HD Cover'}</span>
                </button>
              </div>

              {/* Interactive Preview Canvas */}
              <div className="flex flex-col items-center">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-600" />
                  <span>Click anywhere on the preview to place the focal point center</span>
                </div>

                <div className="w-full flex justify-center bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-inner">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
                      if (coverModalMode === 'desktop') {
                        setModalDesktopCrop((prev) => ({ ...prev, x, y }));
                      } else {
                        setModalMobileCrop((prev) => ({ ...prev, x, y }));
                      }
                    }}
                    className={`relative overflow-hidden cursor-crosshair group select-none transition-all duration-300 shadow-2xl border border-white/20 ${
                      coverModalMode === 'desktop' ? 'w-full max-w-xl aspect-[16/9] rounded-2xl' : 'w-64 aspect-[9/16] rounded-3xl'
                    }`}
                  >
                    {coverPositioning.url ? (
                      <img
                        src={coverPositioning.url}
                        alt="Cover Preview"
                        style={{
                          objectPosition: `${coverModalMode === 'desktop' ? modalDesktopCrop.x : modalMobileCrop.x}% ${
                            coverModalMode === 'desktop' ? modalDesktopCrop.y : modalMobileCrop.y
                          }%`,
                          transform: `scale(${
                            (coverModalMode === 'desktop' ? modalDesktopCrop.zoom : modalMobileCrop.zoom) / 100
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
                        left: `${coverModalMode === 'desktop' ? modalDesktopCrop.x : modalMobileCrop.x}%`,
                        top: `${coverModalMode === 'desktop' ? modalDesktopCrop.y : modalMobileCrop.y}%`,
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
                        style={{ fontFamily: design.typography.headingFont }}
                        className="text-lg sm:text-xl font-medium text-white truncate drop-shadow-md"
                      >
                        {coupleName}
                      </h4>
                      <p className="text-[10px] text-white/70">{eventDateFormatted}</p>
                    </div>

                    {/* Device Indicator Pill */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/20 pointer-events-none flex items-center gap-1.5">
                      {coverModalMode === 'desktop' ? (
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

              {/* Controls Grid: Zoom & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F5] p-4 rounded-2xl border border-[#E7E2D8]">
                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      <span>{coverModalMode === 'desktop' ? 'Desktop Zoom' : 'Mobile Zoom'}</span>
                    </span>
                    <span className="font-mono text-amber-700">
                      {coverModalMode === 'desktop' ? modalDesktopCrop.zoom : modalMobileCrop.zoom}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    step="5"
                    value={coverModalMode === 'desktop' ? modalDesktopCrop.zoom : modalMobileCrop.zoom}
                    onChange={(e) => {
                      const zoom = parseInt(e.target.value);
                      if (coverModalMode === 'desktop') {
                        setModalDesktopCrop((prev) => ({ ...prev, zoom }));
                      } else {
                        setModalMobileCrop((prev) => ({ ...prev, zoom }));
                      }
                    }}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* Quick Focal Presets */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-700 block">Quick Focal Presets</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'Faces (Top 25%)', y: 25 },
                      { label: 'Center (50%)', y: 50 },
                      { label: 'Lower (75%)', y: 75 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          if (coverModalMode === 'desktop') {
                            setModalDesktopCrop((prev) => ({ ...prev, x: 50, y: p.y }));
                          } else {
                            setModalMobileCrop((prev) => ({ ...prev, x: 50, y: p.y }));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2D8] hover:border-amber-400 text-[11px] font-bold text-zinc-700 cursor-pointer transition shadow-2xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E7E2D8] flex items-center justify-between bg-[#FAF9F5]">
              <span className="text-[11px] text-zinc-500 font-medium">
                Focal points persist across all devices.
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
                  onClick={handleSaveModalFocalSettings}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs transition shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  Apply &amp; Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-zinc-950 text-white shadow-2xl border border-white/15 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {toastNotification.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
          {toastNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toastNotification.type === 'info' && <Sparkles className="w-4 h-4 text-amber-400" />}
          <span className="text-xs font-bold tracking-wide">{toastNotification.text}</span>
        </div>
      )}
    </div>
  );
}

// ── SUB-RENDERER FOR THE 4 EXACT PRESET LAYOUTS WITH EXACT FOCAL POSITIONING ──
function renderPresetContent(
  design: GalleryDesignConfig,
  coupleName: string,
  eventDateFormatted: string,
  studioName: string,
  coverPos: CoverPositioning,
  photoCount: number,
  isMobile: boolean = false
) {
  const headingFont = design.typography.headingFont;
  const countLabel = photoCount > 0 ? `${photoCount} PHOTOS` : '114 PHOTOS';
  const focalX = isMobile ? coverPos.mobile.x : coverPos.desktop.x;
  const focalY = isMobile ? coverPos.mobile.y : coverPos.desktop.y;
  const zoom = isMobile ? coverPos.mobile.zoom : coverPos.desktop.zoom;

  switch (design.preset) {
    case 'cinematic_hero':
    default:
      return (
        <div
          className={`relative ${
            isMobile ? 'h-72' : 'h-96'
          } w-full flex flex-col justify-between overflow-hidden text-center`}
        >
          {coverPos.url ? (
            <img
              src={coverPos.url}
              alt="Hero"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
                transformOrigin: `${focalX}% ${focalY}%`,
                transform: `scale(${zoom / 100})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

          {/* Top Bar inside image */}
          <div className="relative z-10 px-4 py-3 flex items-center justify-between text-white/90 text-[10px] font-mono tracking-widest uppercase">
            <span style={{ fontFamily: headingFont }}>{studioName}</span>
            <span>{countLabel}</span>
          </div>

          {/* Bottom Typography with Slide Animation */}
          <div className="relative z-10 p-4 space-y-1 text-white">
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-amber-200 block font-semibold animate-in fade-in slide-in-from-bottom-2 duration-500">
              GALLERY BY {studioName.toUpperCase()}
            </span>
            <h2
              className={`${
                isMobile ? 'text-2xl' : 'text-4xl'
              } font-normal tracking-tight text-white capitalize animate-in fade-in slide-in-from-bottom-4 duration-700`}
              style={{ fontFamily: headingFont }}
            >
              {coupleName}
            </h2>
            <span className="text-[10px] text-zinc-300 font-mono tracking-wider block animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              {eventDateFormatted}
            </span>
            <div className="pt-2">
              <ArrowDown className="w-3.5 h-3.5 mx-auto text-white/70 animate-bounce" />
            </div>
          </div>
        </div>
      );

    case 'editorial_canvas':
      return (
        <div className={`p-6 text-center flex flex-col items-center justify-center space-y-4`}>
          <div className="w-full flex items-center justify-between text-[9px] font-mono uppercase tracking-widest opacity-60">
            <span>{studioName}</span>
            <span>{countLabel}</span>
          </div>

          <h2
            className={`${
              isMobile ? 'text-2xl tracking-[0.15em]' : 'text-5xl tracking-[0.2em]'
            } font-normal uppercase leading-tight`}
            style={{ fontFamily: headingFont, color: design.palette.textColor }}
          >
            {coupleName}
          </h2>

          <div
            className={`${
              isMobile ? 'w-40 aspect-[3/4]' : 'w-56 aspect-[3/4]'
            } rounded-xs overflow-hidden shadow-xl border-2 border-white bg-black`}
          >
            {coverPos.url && (
              <img
                src={coverPos.url}
                alt="Artwork"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${focalX}% ${focalY}%`,
                  transform: `scale(${zoom / 100})`,
                }}
              />
            )}
          </div>

          <div className="text-[9px] font-mono tracking-widest uppercase opacity-60">
            <span>{eventDateFormatted}</span>
          </div>
        </div>
      );

    case 'faded_luxe':
      return (
        <div
          className={`relative ${
            isMobile ? 'h-72' : 'h-96'
          } w-full flex flex-col justify-between overflow-hidden bg-white text-zinc-900`}
        >
          {coverPos.url && (
            <img
              src={coverPos.url}
              alt="Misty"
              className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-105"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
                transform: `scale(${zoom / 100})`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/95" />

          <div className="relative z-10 px-4 py-3 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
            <span className="font-bold">{studioName}</span>
            <span>{countLabel}</span>
          </div>

          <div className="relative z-10 p-4 text-center space-y-2 my-auto">
            <div className="w-4 h-4 rounded-full border border-zinc-400 mx-auto" />
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-zinc-500 block font-semibold">
              GALLERY BY {studioName.toUpperCase()}
            </span>
            <h2
              className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-normal uppercase leading-tight`}
              style={{ fontFamily: headingFont }}
            >
              {coupleName}
            </h2>
            <span className="text-[10px] text-zinc-600 font-mono tracking-wider block">{eventDateFormatted}</span>
          </div>

          <div className="relative z-10 pb-3 flex flex-col items-center">
            <ArrowDown className="w-3.5 h-3.5 text-zinc-500 animate-bounce" />
          </div>
        </div>
      );

    case 'split_atelier':
      return (
        <div
          className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} ${
            isMobile ? 'min-h-[280px]' : 'min-h-[340px]'
          } w-full border-b border-black/10`}
        >
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest opacity-60">
              <span className="font-bold">{studioName}</span>
              <span>{countLabel}</span>
            </div>

            <div className="my-auto space-y-1">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] opacity-60 block font-bold">
                GALLERY BY {studioName.toUpperCase()}
              </span>
              <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold uppercase`} style={{ fontFamily: headingFont }}>
                {coupleName}
              </h2>
              <span className="text-[9px] font-mono opacity-70 block">{eventDateFormatted}</span>
            </div>

            <div>
              <ArrowDown className="w-3.5 h-3.5 opacity-60 animate-bounce" />
            </div>
          </div>

          <div className="overflow-hidden bg-zinc-900 min-h-[160px]">
            {coverPos.url && (
              <img
                src={coverPos.url}
                alt="Artwork"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${focalX}% ${focalY}%`,
                  transform: `scale(${zoom / 100})`,
                }}
              />
            )}
          </div>
        </div>
      );
  }
}
