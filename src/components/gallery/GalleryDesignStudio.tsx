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
import { SparkleStar, WashiTape, HandDrawnOval } from '@/components/gallery/CoverPresetEffects';

export type PresetId =
  | 'cinematic_hero'
  | 'editorial_canvas'
  | 'faded_luxe'
  | 'split_atelier'
  | 'monochrome_portal'
  | 'vintage_scrapbook'
  | 'grand_maison';

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

// ── LUXURY COVER HERO PRESETS ──
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
    subtitle: 'Classic Full Bleed',
    tag: 'Celebrity Choice',
    description: 'Edge-to-edge full-bleed hero with bottom romantic typography and golden vignette.',
  },
  {
    id: 'monochrome_portal',
    name: 'Monochrome Portal',
    subtitle: 'Cathedral Arch Style',
    tag: 'Fine Art Arch Duo',
    description: 'Dreamy black & white panorama background with a vibrant centerpiece cathedral arch portrait.',
  },
  {
    id: 'editorial_canvas',
    name: 'Editorial Canvas',
    subtitle: 'Vogue Terre Verde Style',
    tag: 'Haute Fashion',
    description: 'Oversized spaced headline at top with vertical portrait artwork below on warm canvas.',
  },
  {
    id: 'faded_luxe',
    name: 'Faded Luxe',
    subtitle: 'Misty High-Key Style',
    tag: 'Misty Romance',
    description: 'Misty soft-focus backdrop with centered ring emblem, stacked title, and gallery badge.',
  },
  {
    id: 'split_atelier',
    name: 'Split Atelier',
    subtitle: 'Modern Diptych Pair',
    tag: 'Modern Asymmetric',
    description: 'Split canvas with bold left editorial copy and right large framed portrait artwork.',
  },
  {
    id: 'vintage_scrapbook',
    name: 'Vintage Scrapbook',
    subtitle: 'Polaroid & Romance Notes',
    tag: 'Scrapbook Keepsake',
    description: 'Rotated polaroid photo card with frosted tape, crimson script calligraphy, and hand-drawn circled date.',
  },
  {
    id: 'grand_maison',
    name: 'Grand Maison',
    subtitle: 'High-Fashion Editorial Cover',
    tag: 'Vogue Haute Couture',
    description: 'Statuesque vertical portrait flanked by fine art quotes and a massive bottom luxury serif headline.',
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
  // ── LUXURY LIGHT EDITORIAL PALETTES ──
  {
    id: 'sahara_dune',
    name: 'Sahara Dune',
    category: 'Light Luxury',
    canvasBg: '#F5EFEB',
    textColor: '#3A2B1D',
    accentColor: '#9B5F19',
    subtextColor: '#73614F',
    cardBg: '#FCFAF6',
  },
  {
    id: 'eucalyptus_sage',
    name: 'Eucalyptus Sage',
    category: 'Light Luxury',
    canvasBg: '#EEF3EE',
    textColor: '#1E3125',
    accentColor: '#4A6D56',
    subtextColor: '#577060',
    cardBg: '#F7FAF7',
  },
  {
    id: 'tuscan_sienna',
    name: 'Tuscan Sienna',
    category: 'Light Luxury',
    canvasBg: '#FAF5F0',
    textColor: '#361F17',
    accentColor: '#933B2B',
    subtextColor: '#70534C',
    cardBg: '#FFFBF7',
  },
  {
    id: 'bordeaux_velvet',
    name: 'Bordeaux Velvet',
    category: 'Light Luxury',
    canvasBg: '#FAF2F4',
    textColor: '#3B1621',
    accentColor: '#781F34',
    subtextColor: '#784652',
    cardBg: '#FFF8F9',
  },
  {
    id: 'alabaster_white',
    name: 'Alabaster White',
    category: 'Light Luxury',
    canvasBg: '#FFFFFF',
    textColor: '#1C1D1F',
    accentColor: '#4B515D',
    subtextColor: '#71717A',
    cardBg: '#FAFAFA',
  },
  {
    id: 'nordic_pebble',
    name: 'Nordic Pebble',
    category: 'Light Luxury',
    canvasBg: '#F1F3EE',
    textColor: '#2A2F22',
    accentColor: '#59654C',
    subtextColor: '#5F6856',
    cardBg: '#F8FAF6',
  },
  {
    id: 'sedona_terra',
    name: 'Sedona Terra',
    category: 'Light Luxury',
    canvasBg: '#F8F2EC',
    textColor: '#3C1F17',
    accentColor: '#A14830',
    subtextColor: '#7A5248',
    cardBg: '#FCFAF7',
  },
  {
    id: 'celestial_navy',
    name: 'Celestial Navy',
    category: 'Light Luxury',
    canvasBg: '#EFF4FA',
    textColor: '#142339',
    accentColor: '#183466',
    subtextColor: '#4C6182',
    cardBg: '#F7FAFD',
  },
  {
    id: 'mocha_roast',
    name: 'Mocha Roast',
    category: 'Light Luxury',
    canvasBg: '#F6F1EA',
    textColor: '#2F1E16',
    accentColor: '#5C3729',
    subtextColor: '#69554B',
    cardBg: '#FAF6F0',
  },
  {
    id: 'highland_pine',
    name: 'Highland Pine',
    category: 'Light Luxury',
    canvasBg: '#EFF5F1',
    textColor: '#112C1E',
    accentColor: '#0C4C2B',
    subtextColor: '#496654',
    cardBg: '#F6FAF7',
  },
  {
    id: 'pacific_slate',
    name: 'Pacific Slate',
    category: 'Light Luxury',
    canvasBg: '#EFF4F8',
    textColor: '#1A2837',
    accentColor: '#3B5E78',
    subtextColor: '#51677D',
    cardBg: '#F7FAFC',
  },
  {
    id: 'umbrian_olive',
    name: 'Umbrian Olive',
    category: 'Light Luxury',
    canvasBg: '#F4F5EB',
    textColor: '#2A2E16',
    accentColor: '#555C23',
    subtextColor: '#616744',
    cardBg: '#FAFBF2',
  },
  {
    id: 'french_linen',
    name: 'French Linen',
    category: 'Light Luxury',
    canvasBg: '#F7F4ED',
    textColor: '#31271D',
    accentColor: '#745840',
    subtextColor: '#6D5D50',
    cardBg: '#FCFAF6',
  },
  {
    id: 'amethyst_plum',
    name: 'Amethyst Plum',
    category: 'Light Luxury',
    canvasBg: '#F7F1F8',
    textColor: '#2D162B',
    accentColor: '#63275A',
    subtextColor: '#6A4B68',
    cardBg: '#FCF8FC',
  },
  {
    id: 'onyx_graphite',
    name: 'Onyx Graphite',
    category: 'Light Luxury',
    canvasBg: '#F3F4F6',
    textColor: '#1C1D1F',
    accentColor: '#3F4347',
    subtextColor: '#6B7280',
    cardBg: '#FFFFFF',
  },

  // ── LUXURY DARK REGAL PALETTES ──
  {
    id: 'velvet_obsidian',
    name: 'Velvet Obsidian',
    category: 'Dark Regal',
    canvasBg: '#0D0E11',
    textColor: '#F5F5F7',
    accentColor: '#D4AF37',
    subtextColor: '#9CA3AF',
    cardBg: '#18191E',
  },
  {
    id: 'sahara_night',
    name: 'Sahara Night',
    category: 'Dark Regal',
    canvasBg: '#17130F',
    textColor: '#F8F4EE',
    accentColor: '#D97706',
    subtextColor: '#A8998C',
    cardBg: '#241D17',
  },
  {
    id: 'imperial_bordeaux',
    name: 'Imperial Bordeaux',
    category: 'Dark Regal',
    canvasBg: '#190A10',
    textColor: '#FDF2F4',
    accentColor: '#E11D48',
    subtextColor: '#B87A89',
    cardBg: '#261019',
  },
  {
    id: 'highland_forest',
    name: 'Highland Forest',
    category: 'Dark Regal',
    canvasBg: '#0A1811',
    textColor: '#F0FDF4',
    accentColor: '#10B981',
    subtextColor: '#6EE7B7',
    cardBg: '#12261B',
  },
  {
    id: 'royal_midnight',
    name: 'Royal Midnight',
    category: 'Dark Regal',
    canvasBg: '#0B1321',
    textColor: '#F0F4FA',
    accentColor: '#38BDF8',
    subtextColor: '#819BBF',
    cardBg: '#131E33',
  },
  {
    id: 'nordic_shadow',
    name: 'Nordic Shadow',
    category: 'Dark Regal',
    canvasBg: '#0F172A',
    textColor: '#F8FAFC',
    accentColor: '#94A3B8',
    subtextColor: '#64748B',
    cardBg: '#1E293B',
  },
  {
    id: 'deep_amethyst',
    name: 'Deep Amethyst',
    category: 'Dark Regal',
    canvasBg: '#170A18',
    textColor: '#FDF4FF',
    accentColor: '#C084FC',
    subtextColor: '#A880A8',
    cardBg: '#241026',
  },
  {
    id: 'dark_espresso',
    name: 'Dark Espresso',
    category: 'Dark Regal',
    canvasBg: '#16100D',
    textColor: '#F7EFEA',
    accentColor: '#B45309',
    subtextColor: '#9E857B',
    cardBg: '#241914',
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
      if ([
        'cinematic_hero',
        'editorial_canvas',
        'faded_luxe',
        'split_atelier',
        'monochrome_portal',
        'vintage_scrapbook',
        'grand_maison',
      ].includes(raw.preset)) {
        presetKey = raw.preset;
      } else if (raw.preset === 'cinematic_bleed' || raw.preset === 'torn_paper_edge' || raw.preset === 'flowing_silk_veil') {
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

  // Open live client gallery in new tab with instant auto-save & bypass pin/gate
  const handleOpenLivePreview = async () => {
    const target = gallery?.slug || gallery?.id;
    if (!target) {
      showToast('Please save the gallery to generate a public link.', 'info');
      return;
    }

    // Open a blank tab immediately to avoid popup blocker after async await
    const previewWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    if (previewWindow) {
      try {
        previewWindow.document.title = 'Opening Live Preview...';
        previewWindow.document.body.innerHTML = `
          <div style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#FAF9F5;color:#18181B;">
            <div style="text-align:center;">
              <div style="width:40px;height:40px;border:3px solid #D97706;border-top-color:transparent;border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite;"></div>
              <p style="font-size:16px;font-weight:bold;margin:0 0 6px;">Saving latest design changes...</p>
              <p style="font-size:12px;color:#71717A;margin:0;">Launching direct live preview...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
          </div>
        `;
      } catch (_) {}
    }

    try {
      // Auto-save and publish on the fly
      await handleSaveAndPublish();

      const previewUrl = `/g/${target}?preview=true`;
      if (previewWindow) {
        previewWindow.location.href = previewUrl;
      } else {
        window.open(previewUrl, '_blank');
      }
    } catch (err: any) {
      if (previewWindow) previewWindow.close();
      showToast(`Preview Error: ${err.message}`, 'error');
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

                          {/* Center / Layout Representation */}
                          {preset.id === 'cinematic_hero' && (
                            <div className="relative z-10 text-center pb-1 space-y-0.5 my-auto">
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

                          {preset.id === 'monochrome_portal' && (
                            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-between p-1.5">
                              {coverPositioning.url && (
                                <img
                                  src={coverPositioning.url}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-50"
                                  style={{
                                    objectPosition: `${coverPositioning.desktop.x}% ${coverPositioning.desktop.y}%`,
                                  }}
                                />
                              )}
                              <span className="relative z-10 text-[6px] font-mono uppercase tracking-widest text-white/80">✦ {studioName.slice(0, 8)} ✦</span>
                              <div className="w-14 h-18 rounded-t-full rounded-b-xs border border-white/50 overflow-hidden shadow-lg relative z-10 bg-zinc-900">
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
                              <span className="relative z-10 text-[7px] font-serif text-white capitalize font-semibold drop-shadow-sm">{coupleName}</span>
                            </div>
                          )}

                          {preset.id === 'vintage_scrapbook' && (
                            <div className="absolute inset-0 bg-[#FAF7F2] p-2 flex flex-col justify-between overflow-hidden">
                              <div className="flex justify-end items-start">
                                <div className="text-right">
                                  <span className="text-[5px] font-mono block text-stone-400">OUR</span>
                                  <span className="text-[7px] font-serif text-[#8B1E1E] italic leading-none block">Forever</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-1 my-auto">
                                <div className="text-[5px] text-stone-500 font-serif leading-tight max-w-[40px]">
                                  <span>Timeless vows</span>
                                  <div className="mt-1 px-1 py-0.5 rounded-full border border-[#8B1E1E] text-[5px] text-[#8B1E1E] font-mono inline-block">
                                    {eventDateFormatted.slice(0, 6)}
                                  </div>
                                </div>
                                <div className="relative w-14 h-18 bg-white p-1 pb-2 shadow-md rotate-3 border border-stone-200/60 shrink-0">
                                  <div className="absolute -top-1 left-1 w-5 h-1.5 bg-amber-100/90 -rotate-12 border-t border-amber-200/50" />
                                  <div className="w-full h-full bg-stone-900 overflow-hidden">
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
                              </div>
                              <span className="text-[5px] font-mono text-center text-stone-400">{coupleName}</span>
                            </div>
                          )}

                          {preset.id === 'grand_maison' && (
                            <div className="absolute inset-0 bg-[#540B13] p-1.5 flex flex-col items-center justify-between overflow-hidden text-white">
                              <div className="h-1" />
                              <div className="relative my-auto flex items-center justify-center w-full">
                                <span className="text-[5px] opacity-60 tracking-widest uppercase mr-1">fine art •</span>
                                <div className="w-12 h-16 bg-stone-900 overflow-hidden border border-white/20 shrink-0">
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
                                <span className="text-[5px] opacity-60 tracking-widest uppercase ml-1">• cinema</span>
                              </div>
                              <div className="w-full text-center relative z-10 -mt-2">
                                <div className="text-[8px] font-serif uppercase tracking-[0.1em] font-light truncate drop-shadow-md">{coupleName}</div>
                                <span className="text-[5px] font-mono opacity-60">{eventDateFormatted}</span>
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

                        {/* Title Only (Clean Headline) */}
                        <div className="pt-1">
                          <span className="text-xs font-black text-zinc-900">{preset.name}</span>
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

                {/* Palettes Grid (Circular 4-Column Swatches Matching User Photo 4) */}
                <div className="grid grid-cols-4 gap-y-5 gap-x-2 sm:gap-x-4 pt-1">
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
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        {/* 3-Band Circular Swatch Matching User Photo 4 */}
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/15 overflow-hidden flex flex-col transition-all duration-200 relative ${
                            isSelected
                              ? 'ring-2 ring-zinc-900 ring-offset-2 scale-105 shadow-md'
                              : 'group-hover:scale-105 group-hover:shadow-sm'
                          }`}
                        >
                          {/* Background (Top 48%) */}
                          <div className="h-[48%] w-full" style={{ backgroundColor: pal.canvasBg }} />
                          {/* Foreground / Text (Middle 26%) */}
                          <div className="h-[26%] w-full" style={{ backgroundColor: pal.textColor }} />
                          {/* Accent (Bottom 26%) */}
                          <div className="h-[26%] w-full" style={{ backgroundColor: pal.accentColor }} />
                        </div>

                        <span
                          className={`text-[11px] text-center tracking-tight truncate max-w-full ${
                            isSelected ? 'font-bold text-zinc-950' : 'font-medium text-zinc-600'
                          }`}
                        >
                          {pal.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* 16th Swatch: Custom Palette Circle */}
                  {(() => {
                    const matchesAnyPreset = COLOR_PALETTES.some(
                      (p) => p.canvasBg.toLowerCase() === design.palette.canvasBg.toLowerCase()
                    );
                    const isCustomSelected = !matchesAnyPreset;

                    return (
                      <div
                        onClick={() => {}}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/15 overflow-hidden flex flex-col transition-all duration-200 relative ${
                            isCustomSelected
                              ? 'ring-2 ring-zinc-900 ring-offset-2 scale-105 shadow-md'
                              : 'group-hover:scale-105 group-hover:shadow-sm'
                          }`}
                        >
                          <div className="h-[48%] w-full" style={{ backgroundColor: design.palette.canvasBg }} />
                          <div className="h-[26%] w-full" style={{ backgroundColor: design.palette.textColor }} />
                          <div className="h-[26%] w-full" style={{ backgroundColor: design.palette.accentColor }} />
                        </div>
                        <span
                          className={`text-[11px] text-center tracking-tight truncate max-w-full ${
                            isCustomSelected ? 'font-bold text-zinc-950' : 'font-medium text-zinc-600'
                          }`}
                        >
                          Custom
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Custom Palette Card (Matching User Photo 4) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E2D8] shadow-xs space-y-3.5 mt-6">
                  <div className="flex items-center gap-2 text-zinc-900">
                    <Palette className="w-4 h-4 text-zinc-700" />
                    <span className="text-xs font-bold">Custom palette</span>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                    Pick a canvas, a body text color, and an accent. We derive the muted tones, hairlines, and overlays from these three via color-mix in oklch space so they stay tonally linked.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* 1. Background */}
                    <div className="space-y-1.5">
                      <div className="relative h-14 sm:h-16 rounded-xl border border-zinc-200 shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer group">
                        <div
                          className="absolute inset-0 w-full h-full transition-transform group-hover:scale-105"
                          style={{ backgroundColor: design.palette.canvasBg }}
                        />
                        <input
                          type="color"
                          value={design.palette.canvasBg}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, canvasBg: e.target.value },
                            }))
                          }
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-medium text-zinc-700 block">Background</span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">{design.palette.canvasBg}</span>
                      </div>
                    </div>

                    {/* 2. Foreground */}
                    <div className="space-y-1.5">
                      <div className="relative h-14 sm:h-16 rounded-xl border border-zinc-200 shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer group">
                        <div
                          className="absolute inset-0 w-full h-full transition-transform group-hover:scale-105"
                          style={{ backgroundColor: design.palette.textColor }}
                        />
                        <input
                          type="color"
                          value={design.palette.textColor}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, textColor: e.target.value },
                            }))
                          }
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-medium text-zinc-700 block">Foreground</span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">{design.palette.textColor}</span>
                      </div>
                    </div>

                    {/* 3. Accent */}
                    <div className="space-y-1.5">
                      <div className="relative h-14 sm:h-16 rounded-xl border border-zinc-200 shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer group">
                        <div
                          className="absolute inset-0 w-full h-full transition-transform group-hover:scale-105"
                          style={{ backgroundColor: design.palette.accentColor }}
                        />
                        <input
                          type="color"
                          value={design.palette.accentColor}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              palette: { ...prev.palette, accentColor: e.target.value },
                            }))
                          }
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-medium text-zinc-700 block">Accent</span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">{design.palette.accentColor}</span>
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
                    <button
                      type="button"
                      onClick={handleOpenLivePreview}
                      className="truncate max-w-xs hover:text-zinc-900 flex items-center gap-1.5 transition text-left cursor-pointer"
                      title="Click to open live preview in new tab"
                    >
                      <span>https://studiocore.in/g/{gallery?.slug || 'wedding-gallery'}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                    </button>
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
                    {/* 1. Header Bar (Glassmorphic Blur matching Palette Canvas) */}
                    <div
                      className="border-b px-6 py-3.5 flex items-center justify-between backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-20 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `${design.palette.canvasBg}E6`,
                        borderColor: `${design.palette.textColor}18`,
                        color: design.palette.textColor,
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
                          <span className="text-xs font-bold block leading-none" style={{ fontFamily: design.typography.headingFont }}>{studioName}</span>
                          <span className="text-[9px] opacity-65 block leading-tight">{studioSubtitle}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-65">
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

                    {/* 3. Sub-Events Bar (Dynamically Colored by Selected Palette with Glassmorphism) */}
                    <div
                      className="px-6 py-2.5 border-y flex items-center justify-between text-xs font-bold transition-all shadow-2xs sticky top-[53px] z-10 backdrop-blur-xl"
                      style={{
                        backgroundColor: `${design.palette.canvasBg}F0`,
                        borderColor: `${design.palette.textColor}18`,
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
                    {/* Mobile Header Bar (Glassmorphic Blur matching Palette Canvas) */}
                    <div
                      className="border-b px-4 py-2.5 flex items-center justify-between backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-20 shadow-2xs"
                      style={{
                        backgroundColor: `${design.palette.canvasBg}E6`,
                        borderColor: `${design.palette.textColor}18`,
                        color: design.palette.textColor,
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
                        <span className="text-[11px] font-bold truncate max-w-[120px]" style={{ fontFamily: design.typography.headingFont }}>{studioName}</span>
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

    case 'faded_luxe': {
      const canvasBg = design.palette.canvasBg || '#FAF9F5';
      const textColor = design.palette.textColor || '#18181B';

      return (
        <div
          className={`relative ${
            isMobile ? 'h-[420px]' : 'h-[480px]'
          } w-full flex flex-col justify-between overflow-hidden transition-colors duration-500`}
          style={{ backgroundColor: canvasBg, color: textColor }}
        >
          {/* Clear Background Photo */}
          {coverPos.url && (
            <img
              src={coverPos.url}
              alt="Misty"
              className="absolute inset-0 w-full h-full object-cover opacity-85 sm:opacity-90 filter contrast-[1.02] brightness-[1.02]"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
                transform: `scale(${zoom / 100})`,
              }}
            />
          )}

          {/* Bottom-Up Gradient Fade (Creamy in Light mode, Black in Dark mode) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${canvasBg} 0%, ${canvasBg}E6 28%, ${canvasBg}66 55%, transparent 100%)`,
            }}
          />

          {/* Top spacing */}
          <div className="h-4 w-full" />

          {/* Center Content (Circle removed, clean centered typography) */}
          <div className="relative z-10 p-6 text-center space-y-2 my-auto">
            <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.25em] opacity-60 block font-semibold">
              GALLERY BY {studioName.toUpperCase()}
            </span>
            <h2
              className={`${isMobile ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'} font-normal uppercase leading-tight drop-shadow-xs`}
              style={{ fontFamily: headingFont }}
            >
              {coupleName}
            </h2>
            <span className="text-[10px] sm:text-xs font-mono tracking-wider opacity-75 block">{eventDateFormatted}</span>
          </div>

          {/* Bottom Animated Arrow */}
          <div className="relative z-10 pb-4 flex flex-col items-center">
            <ArrowDown className="w-3.5 h-3.5 opacity-60 animate-bounce" />
          </div>
        </div>
      );
    }

    case 'split_atelier':
      return (
        <div
          className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} ${
            isMobile ? 'min-h-[440px]' : 'min-h-[480px]'
          } w-full border-b border-black/10 transition-colors duration-500`}
          style={{ backgroundColor: design.palette.canvasBg, color: design.palette.textColor }}
        >
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-4">
            {/* Gallery by {studioName} subtitle */}
            <div className="pt-2">
              <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.25em] opacity-60 block font-bold">
                GALLERY BY {studioName.toUpperCase()}
              </span>
            </div>

            {/* Vertically centered couple name & date */}
            <div className="my-auto space-y-2">
              <h2
                className={`${isMobile ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} font-bold uppercase leading-tight`}
                style={{ fontFamily: headingFont }}
              >
                {coupleName}
              </h2>
              <span className="text-[10px] font-mono opacity-70 block">{eventDateFormatted}</span>
            </div>

            {/* Animated scroll down indicator */}
            <div className="pb-2">
              <ArrowDown className="w-3.5 h-3.5 opacity-60 animate-bounce" />
            </div>
          </div>

          <div className="overflow-hidden bg-zinc-900 min-h-[220px] sm:min-h-full">
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

    case 'monochrome_portal':
      return (
        <div
          className={`relative ${
            isMobile ? 'h-[460px]' : 'h-[520px]'
          } w-full flex flex-col justify-between items-center overflow-hidden text-center bg-zinc-950 p-4`}
        >
          {/* Grayscale Wide Panorama Background with 40% Opacity */}
          {coverPos.url && (
            <img
              src={coverPos.url}
              alt="Monochrome Backdrop"
              className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-40 transition-transform duration-1000 ease-out"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
                transform: `scale(${zoom / 100})`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85" />

          {/* Top Spacing (Brand name and fine art visuals removed per user request) */}
          <div className="h-4 w-full" />

          {/* Centerpiece Color Arch Portal Window (From User Photo 2) */}
          <div className="relative z-20 my-auto flex items-center justify-center">
            {/* Flanking Hairlines & Pill Badges */}
            <div className="absolute -left-16 sm:-left-24 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 text-[8px] font-mono tracking-widest text-white/70 uppercase">
              <span className="w-8 h-px bg-white/40" />
              <span className="px-2 py-0.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-xs">STORY</span>
            </div>
            <div className="absolute -right-16 sm:-right-24 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 text-[8px] font-mono tracking-widest text-white/70 uppercase">
              <span className="px-2 py-0.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-xs">GALLERY</span>
              <span className="w-8 h-px bg-white/40" />
            </div>

            {/* The Vibrant Color Arch Window Frame */}
            <div
              className={`${
                isMobile ? 'w-44 h-56' : 'w-56 h-72'
              } rounded-t-[100px] sm:rounded-t-[140px] rounded-b-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-2 border-white/40 relative bg-zinc-900 group`}
            >
              {coverPos.url && (
                <img
                  src={coverPos.url}
                  alt="Color Arch Portrait"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{
                    objectPosition: `${focalX}% ${focalY}%`,
                    transform: `scale(${zoom / 100})`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Bottom Romantic Flourish Typography (Enlarged font, star icons removed per user request) */}
          <div className="relative z-20 pb-2 space-y-1 text-white">
            <h2
              className={`${
                isMobile ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'
              } font-normal tracking-tight text-white uppercase drop-shadow-lg`}
              style={{ fontFamily: headingFont }}
            >
              {coupleName}
            </h2>
            <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-zinc-300 tracking-widest">
              <span>{eventDateFormatted}</span>
              <span>•</span>
              <span>{countLabel}</span>
            </div>
            <div className="pt-1">
              <ArrowDown className="w-3.5 h-3.5 mx-auto text-white/60 animate-bounce" />
            </div>
          </div>
        </div>
      );

    case 'vintage_scrapbook':
      return (
        <div
          className={`relative ${
            isMobile ? 'min-h-[480px] p-4' : 'min-h-[540px] p-8'
          } w-full flex flex-col justify-between overflow-hidden bg-[#FAF7F2] text-zinc-900 border-b border-black/10`}
        >
          {/* Subtle Paper Grain Effect */}
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#18181b 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />

          {/* Top Header Row (Studio name removed per user request) */}
          <div className="relative z-10 w-full flex justify-end">
            <div className="text-right leading-none space-y-0.5">
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-400 block font-bold">OUR</span>
              <span
                className="text-2xl sm:text-3xl font-normal block text-[#8B1E1E]"
                style={{ fontFamily: "'Great Vibes', cursive" }}
              >
                Forever
              </span>
              <span className="text-[7px] font-mono uppercase tracking-[0.25em] text-zinc-600 block font-semibold">
                CHAPTER
              </span>
            </div>
          </div>

          {/* Centerpiece Scrapbook Collage */}
          <div className={`relative z-10 my-auto ${isMobile ? 'flex flex-col items-center gap-5' : 'flex items-center justify-around gap-6'}`}>
            {/* Left Romantic Note & Circled Date */}
            <div className={`${isMobile ? 'text-center order-2 max-w-xs' : 'text-left max-w-[220px]'} space-y-3`}>
              <p className="text-[11px] sm:text-xs text-zinc-600 font-serif leading-relaxed italic">
                &ldquo;Every single chapter written with love, laughter, and timeless devotion.&rdquo;
              </p>
              <div className="pt-1 flex justify-center sm:justify-start">
                <HandDrawnOval className="text-[#8B1E1E]">
                  <span className="text-xs sm:text-sm font-serif italic tracking-wide text-[#8B1E1E] font-semibold">
                    {eventDateFormatted}
                  </span>
                </HandDrawnOval>
              </div>
            </div>

            {/* Right Tilted Polaroid Photo Card with Washi Tape */}
            <div className={`relative ${isMobile ? 'order-1' : ''}`}>
              {/* The White Bordered Photo Card */}
              <div
                className={`relative bg-white p-2.5 sm:p-3.5 pb-7 sm:pb-9 shadow-[0_22px_45px_rgba(0,0,0,0.18)] border border-stone-200/70 transform rotate-3 sm:rotate-4 hover:rotate-1 transition-transform duration-500 ${
                  isMobile ? 'w-48 sm:w-56' : 'w-56 sm:w-64'
                }`}
              >
                {/* Frosted Washi Tape Top-Left */}
                <div className="absolute -top-3 left-4 z-30">
                  <WashiTape className="transform -rotate-12" />
                </div>

                {/* Artwork Photo */}
                <div className="w-full aspect-[4/5] bg-stone-900 overflow-hidden relative">
                  {coverPos.url ? (
                    <img
                      src={coverPos.url}
                      alt="Scrapbook Memory"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                        transformOrigin: `${focalX}% ${focalY}%`,
                        transform: `scale(${zoom / 100})`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-200" />
                  )}
                </div>

                {/* Polaroid Bottom Caption */}
                <div className="pt-2 text-center">
                  <span
                    className="text-base sm:text-lg text-zinc-800 tracking-wide font-normal capitalize block px-1"
                    style={{ fontFamily: headingFont }}
                  >
                    {coupleName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Studio Attribution & Scroll Indicator */}
          <div className="relative z-10 w-full pt-2 flex flex-col items-center justify-center space-y-1 text-center">
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-zinc-400">
              GALLERY BY {studioName.toUpperCase()}
            </span>
            <ArrowDown className="w-3.5 h-3.5 text-zinc-400 animate-bounce" />
          </div>
        </div>
      );

    case 'grand_maison': {
      const bgColor = design.palette.canvasBg && design.palette.canvasBg !== '#FAF9F5' ? design.palette.canvasBg : '#540B13';
      const textColor = design.palette.textColor && design.palette.textColor !== '#18181B' ? design.palette.textColor : '#FAF7F2';

      return (
        <div
          className={`relative ${
            isMobile ? 'min-h-[500px] p-4' : 'min-h-[580px] p-8'
          } w-full flex flex-col justify-between items-center overflow-hidden transition-colors duration-500`}
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {/* Top Spacing / Mobile Header Quote (Per user photo: text on top for mobile) */}
          {isMobile ? (
            <div className="pt-2 pb-1 text-center">
              <span className="text-[10px] font-serif uppercase tracking-widest opacity-80 block">
                Creating your timeless love story
              </span>
            </div>
          ) : (
            <div className="h-2 sm:h-4 w-full" />
          )}

          {/* Center Visual: Portrait Image flanked by fine art quotes */}
          <div className="relative z-10 my-auto w-full max-w-4xl flex items-center justify-center sm:justify-around px-2">
            {/* Left Fine Art Quote (Desktop only) */}
            <div className="hidden sm:flex flex-col items-center text-center space-y-1.5 opacity-80 max-w-[140px]">
              <span className="text-[9px] font-serif uppercase tracking-widest leading-relaxed">
                Creating your timeless love story
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            </div>

            {/* Centered Vertical Portrait Frame */}
            <div
              className={`relative ${
                isMobile ? 'w-48 aspect-[3/4]' : 'w-56 sm:w-64 aspect-[3/4]'
              } overflow-hidden bg-stone-900 border border-white/20 shadow-md`}
            >
              {coverPos.url ? (
                <img
                  src={coverPos.url}
                  alt="Editorial Portrait"
                  className="w-full h-full object-cover transition-transform duration-1000 ease-out"
                  style={{
                    objectPosition: `${focalX}% ${focalY}%`,
                    transformOrigin: `${focalX}% ${focalY}%`,
                    transform: `scale(${zoom / 100})`,
                  }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Right Fine Art Quote (Desktop only, completely removed on mobile per user request) */}
            <div className="hidden sm:flex flex-col items-center text-center space-y-1.5 opacity-80 max-w-[140px]">
              <span className="text-[9px] font-serif uppercase tracking-widest leading-relaxed">
                Fine art wedding photography &amp; film
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            </div>
          </div>

          {/* Bottom Massive Haute-Couture Serif Typography - overlapping lower 25-30% of portrait photo */}
          <div className="relative z-20 w-full text-center -mt-12 sm:-mt-16 px-2 space-y-1">
            <h2
              className={`${
                isMobile ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
              } font-serif tracking-[0.12em] uppercase font-normal drop-shadow-xl leading-tight text-center max-w-full break-words`}
              style={{ fontFamily: headingFont }}
            >
              {coupleName}
            </h2>
            <div className="text-[9px] font-mono tracking-widest uppercase opacity-75 pt-1 text-center">
              {eventDateFormatted}
            </div>
            <div className="pt-1">
              <ArrowDown className="w-3.5 h-3.5 mx-auto opacity-70 animate-bounce" />
            </div>
          </div>
        </div>
      );
    }
  }
}
