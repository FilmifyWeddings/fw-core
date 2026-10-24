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
} from 'lucide-react';
import { STATIC_CUSTOM_FONTS, registerFontFace } from '@/lib/font-loader';

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
    headingFont: "'Playfair Display', Georgia, serif",
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

// ── EXTENSIVE AESTHETIC FONTS (QUOTATION-GRADE CARDS) ──
interface FontOptionItem {
  name: string;
  family: string;
  category: 'Luxury Serif' | 'Custom Aesthetic' | 'Modern Sans';
  subFont: string;
}

const FONTS_CATALOG: FontOptionItem[] = [
  {
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Cormorant Garamond',
    family: "'Cormorant Garamond', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'Cinzel',
    family: "'Cinzel', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Cormorant Garamond', Georgia, serif",
  },
  {
    name: 'Italiana',
    family: "'Italiana', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Montserrat', sans-serif",
  },
  {
    name: 'Bodoni Moda',
    family: "'Bodoni Moda', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Outfit', sans-serif",
  },
  {
    name: 'Prata',
    family: "'Prata', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Marcellus',
    family: "'Marcellus', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'DM Serif Display',
    family: "'DM Serif Display', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Instrument Serif',
    family: "'Instrument Serif', Georgia, serif",
    category: 'Luxury Serif',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'Great Vibes',
    family: "'Great Vibes', cursive",
    category: 'Custom Aesthetic',
    subFont: "'Playfair Display', serif",
  },
  {
    name: 'Tenor Sans',
    family: "'Tenor Sans', sans-serif",
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    category: 'Modern Sans',
    subFont: "'Inter', sans-serif",
  },
  {
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    category: 'Modern Sans',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Inter',
    family: "'Inter', sans-serif",
    category: 'Modern Sans',
    subFont: "'Inter', sans-serif",
  },
  // Custom Aesthetic Fonts from font-loader
  {
    name: 'Aligin',
    family: "'Aligin', sans-serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Amida',
    family: "'Amida', sans-serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Bevola Demo',
    family: "'Bevola Demo Regular', sans-serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Soligant',
    family: "'Soligant', serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Tan Pearl',
    family: "'Tan Pearl', serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'The Baethmy',
    family: "'The Baethmy', serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Vigro',
    family: "'Vigro', serif",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
  },
  {
    name: 'Wondershine',
    family: "'Wondershine', cursive",
    category: 'Custom Aesthetic',
    subFont: "'Plus Jakarta Sans', sans-serif",
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
  const [fontFilter, setFontFilter] = useState<string>('All');
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'loading' } | null>(null);

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
  const studioSubtitle = studioBranding?.subtitle || studioBranding?.studio_subtitle || studioBranding?.tagline || 'Fine Art Wedding Photography & Films';
  const coupleName = gallery?.title || 'Siddhant & Vedika';
  const eventDateFormatted = gallery?.event_date
    ? new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'October 24, 2026';

  // Effective cover photo URL
  const effectiveCoverPhoto = useMemo(() => {
    return design.cover?.url || gallery?.cover_url || (photos.length > 0 ? (photos[0].preview_url || photos[0].thumbnail_url) : '');
  }, [design.cover?.url, gallery?.cover_url, photos]);

  // Real photos list to display in the live preview
  const previewPhotos = useMemo(() => {
    if (photos && photos.length > 0) {
      return photos.slice(0, 6).map((p) => p.preview_url || p.thumbnail_url || p.url);
    }
    return [];
  }, [photos]);

  // Register custom fonts on mount
  useEffect(() => {
    STATIC_CUSTOM_FONTS.forEach((f) => registerFontFace(f));
  }, []);

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

    setUploadingCover(true);
    showToast('Converting to lightweight WebP & uploading cover...', 'loading');

    try {
      // 1. Convert to high-quality compressed WebP client-side
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 2560;
            const MAX_HEIGHT = 1800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              if (width / height > MAX_WIDTH / MAX_HEIGHT) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              } else {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context unavailable'));
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('WebP compression failed'));
              },
              'image/webp',
              0.88
            );
          };
          img.onerror = () => reject(new Error('Could not read image file'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('File reader failed'));
        reader.readAsDataURL(file);
      });

      // 2. Request upload URL from server
      const filename = `cover_${Date.now()}.webp`;
      const upRes = await fetch('/api/gallery/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery?.id,
          filename,
          content_type: 'image/webp',
          size_bytes: webpBlob.size,
        }),
      });

      const upJson = await upRes.json();
      if (!upJson.success || !upJson.upload_url) {
        throw new Error(upJson.error || 'Failed to obtain upload authorization');
      }

      // 3. Upload binary directly to Cloudflare R2 / Backblaze B2
      const putRes = await fetch(upJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: webpBlob,
      });

      if (!putRes.ok) {
        throw new Error('Failed to upload file to cloud storage');
      }

      const newCoverUrl = upJson.public_url || `/api/gallery/image?key=${encodeURIComponent(upJson.file_key)}`;

      // 4. Update local state
      setDesign((prev) => ({
        ...prev,
        cover: {
          ...(prev.cover || { overlayOpacity: 45, focalPoint: { x: 50, y: 50 } }),
          url: newCoverUrl,
        },
      }));

      // 5. Update backend immediately
      if (gallery?.id) {
        await fetch('/api/gallery/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: gallery.id,
            cover_url: newCoverUrl,
          }),
        });
        if (onUpdateGallery) {
          onUpdateGallery({ ...gallery, cover_url: newCoverUrl });
        }
      }

      showToast('Cover photo uploaded & updated successfully!', 'success');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      showToast(`Cover upload failed: ${err.message}`, 'error');
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        // Save as studio-wide default gallery design in workspace_settings
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
        // Save specifically for this event gallery
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

  // Filtered fonts catalog
  const filteredFonts = useMemo(() => {
    if (fontFilter === 'All') return FONTS_CATALOG;
    return FONTS_CATALOG.filter((f) => f.category === fontFilter);
  }, [fontFilter]);

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
                
                {/* Cover Photo Status & Upload Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E2D8] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-zinc-900">Event Cover Photograph</span>
                    </div>
                    {effectiveCoverPhoto ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Cover Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        No Cover Set
                      </span>
                    )}
                  </div>

                  {effectiveCoverPhoto ? (
                    <div className="flex items-center gap-3 p-2 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8]">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                        <img src={effectiveCoverPhoto} alt="Cover" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-xs font-bold text-zinc-800 truncate block">Active Cover Photo</span>
                        <span className="text-[10px] text-zinc-400">High-resolution WebP format</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Change</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-5 text-center bg-amber-50/40 hover:bg-amber-50/70 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center mx-auto">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-amber-950">Upload Event Cover Photo</p>
                      <p className="text-[10px] text-amber-700/80">
                        Automatically compressed to high-efficiency WebP in KB size
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
                          {effectiveCoverPhoto && (
                            <img
                              src={effectiveCoverPhoto}
                              alt={preset.name}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                                preset.id === 'faded_luxe' ? 'opacity-40 filter brightness-110' : 'opacity-70'
                              }`}
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
                              <span className="text-[7px] uppercase font-mono tracking-widest text-amber-300">GALLERY BY</span>
                              <div className="text-[11px] font-serif font-normal capitalize">{coupleName}</div>
                              <span className="text-[7px] font-mono opacity-60">OCTOBER 24, 2026</span>
                            </div>
                          )}

                          {preset.id === 'editorial_canvas' && (
                            <div className="absolute inset-0 bg-[#F4EFEA] text-zinc-900 p-2 flex flex-col items-center justify-between">
                              <span className="text-[6px] font-mono uppercase tracking-widest opacity-60">TERRE VERDE</span>
                              <div className="text-[10px] font-serif tracking-[0.2em] uppercase font-bold">{coupleName}</div>
                              <div className="w-12 h-16 rounded-xs bg-zinc-800 overflow-hidden shadow-xs">
                                {effectiveCoverPhoto && <img src={effectiveCoverPhoto} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="text-[6px] font-mono opacity-50">OCTOBER 24, 2026</span>
                            </div>
                          )}

                          {preset.id === 'faded_luxe' && (
                            <div className="absolute inset-0 bg-white/70 text-zinc-900 p-2 flex flex-col items-center justify-center space-y-1">
                              <div className="w-3 h-3 rounded-full border border-zinc-400" />
                              <span className="text-[6px] font-mono uppercase tracking-widest text-zinc-500">GALLERY BY</span>
                              <div className="text-[9px] font-serif font-bold uppercase">{coupleName}</div>
                              <span className="text-[6px] font-mono text-zinc-400">OCTOBER 24, 2026</span>
                            </div>
                          )}

                          {preset.id === 'split_atelier' && (
                            <div className="absolute inset-0 grid grid-cols-2 bg-[#F4EFEA] text-zinc-900">
                              <div className="p-2 flex flex-col justify-center space-y-0.5">
                                <span className="text-[5px] font-mono uppercase tracking-widest opacity-60">GALLERY BY</span>
                                <div className="text-[9px] font-serif font-bold uppercase leading-tight">{coupleName}</div>
                                <span className="text-[5px] font-mono opacity-50">OCTOBER 24, 2026</span>
                              </div>
                              <div className="bg-zinc-800 overflow-hidden">
                                {effectiveCoverPhoto && <img src={effectiveCoverPhoto} alt="" className="w-full h-full object-cover" />}
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
                TAB 3: AESTHETIC FONTS (QUOTATION-GRADE CARDS)
            ───────────────────────────────────────────────────────── */}
            {activeTab === 'fonts' && (
              <div className="space-y-6">
                
                {/* Font Category Filter */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-zinc-900">Aesthetic Typography</h2>
                    <p className="text-xs text-zinc-500">
                      High-fashion editorial serif and modern sans-serif fonts.
                    </p>
                  </div>

                  <div className="flex items-center p-1 bg-[#F4F1EA] rounded-xl border border-[#E7E2D8] gap-1">
                    {['All', 'Luxury Serif', 'Custom Aesthetic', 'Modern Sans'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFontFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                          fontFilter === cat ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {cat === 'Custom Aesthetic' ? 'Custom' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Aesthetic Font Cards */}
                <div className="space-y-3">
                  {filteredFonts.map((font) => {
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
                              {font.category}
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
                    {/* 1. Header Bar */}
                    <div className="border-b border-black/10 px-6 py-3.5 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-20">
                      <div className="flex items-center gap-3">
                        {studioLogo ? (
                          <img src={studioLogo} alt={studioName} className="w-7 h-7 rounded-full object-cover ring-1 ring-black/10" />
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

                    {/* 2. Hero Preset Rendered */}
                    {renderPresetContent(design, coupleName, eventDateFormatted, studioName, effectiveCoverPhoto, photos.length)}

                    {/* 3. Sub-Events Bar */}
                    <div
                      className="px-6 py-3 border-y border-black/10 flex items-center justify-between text-xs font-bold"
                      style={{ backgroundColor: design.palette.cardBg || '#FFFFFF' }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-amber-600 border-b-2 border-amber-600 pb-0.5">Highlights</span>
                        <span className="opacity-50">Sangeet</span>
                        <span className="opacity-50">Haldi</span>
                        <span className="opacity-50">Wedding</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-50">AI Face Search Enabled</span>
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
                    <div className="border-b border-black/10 px-4 py-2.5 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-20">
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

                    {/* Mobile Hero Content */}
                    {renderPresetContent(design, coupleName, eventDateFormatted, studioName, effectiveCoverPhoto, photos.length, true)}

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
                            <div key={idx} className="aspect-square rounded-lg bg-black/5 flex items-center justify-center text-[9px] opacity-40">
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

// ── SUB-RENDERER FOR THE 4 EXACT PRESET LAYOUTS ──
function renderPresetContent(
  design: GalleryDesignConfig,
  coupleName: string,
  eventDateFormatted: string,
  studioName: string,
  coverPhoto: string,
  photoCount: number,
  isMobile: boolean = false
) {
  const headingFont = design.typography.headingFont;
  const countLabel = photoCount > 0 ? `${photoCount} PHOTOS` : '114 PHOTOS';

  switch (design.preset) {
    case 'cinematic_hero':
    default:
      return (
        <div className={`relative ${isMobile ? 'h-72' : 'h-96'} w-full flex flex-col justify-between overflow-hidden text-center`}>
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt="Hero"
              className="absolute inset-0 w-full h-full object-cover scale-100 transition-transform duration-1000"
              style={{ objectPosition: `${design.cover?.focalPoint.x || 50}% ${design.cover?.focalPoint.y || 50}%` }}
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

          {/* Bottom Typography */}
          <div className="relative z-10 p-4 space-y-1 text-white">
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-amber-200 block font-semibold">
              GALLERY BY {studioName.toUpperCase()}
            </span>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-normal tracking-tight text-white capitalize`} style={{ fontFamily: headingFont }}>
              {coupleName}
            </h2>
            <span className="text-[10px] text-zinc-300 font-mono tracking-wider block">{eventDateFormatted}</span>
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
            className={`${isMobile ? 'text-2xl tracking-[0.15em]' : 'text-5xl tracking-[0.2em]'} font-normal uppercase leading-tight`}
            style={{ fontFamily: headingFont, color: design.palette.textColor }}
          >
            {coupleName}
          </h2>

          <div className={`${isMobile ? 'w-40 aspect-[3/4]' : 'w-56 aspect-[3/4]'} rounded-xs overflow-hidden shadow-xl border-2 border-white bg-black`}>
            {coverPhoto && <img src={coverPhoto} alt="Artwork" className="w-full h-full object-cover" />}
          </div>

          <div className="text-[9px] font-mono tracking-widest uppercase opacity-60">
            <span>{eventDateFormatted}</span>
          </div>
        </div>
      );

    case 'faded_luxe':
      return (
        <div className={`relative ${isMobile ? 'h-72' : 'h-96'} w-full flex flex-col justify-between overflow-hidden bg-white text-zinc-900`}>
          {coverPhoto && (
            <img src={coverPhoto} alt="Misty" className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-105" />
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
            <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-normal uppercase leading-tight`} style={{ fontFamily: headingFont }}>
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
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'min-h-[280px]' : 'min-h-[340px]'} w-full border-b border-black/10`}>
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
            {coverPhoto && <img src={coverPhoto} alt="Artwork" className="w-full h-full object-cover" />}
          </div>
        </div>
      );
  }
}
