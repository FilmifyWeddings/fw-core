'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Palette,
  Layout,
  Type,
  Activity,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Check,
  Save,
  RefreshCw,
  Eye,
  ChevronDown,
  Upload,
  ArrowDown,
  Calendar,
  Lock,
  Camera,
  Heart,
  Share2,
  Download,
  Sun,
  Moon,
  Maximize2,
  Sliders,
  Flame,
  CheckCircle2,
  Crown,
  Search,
  ExternalLink,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
    TYPES & DATA STRUCTURES
───────────────────────────────────────────────────────────── */

export type PresetLayoutId =
  | 'cinematic_bleed'      // Photo 3: KnotsbyAMP full-bleed widescreen hero
  | 'royal_medallion'     // Photo 4: KnotsbyAMP center circular portrait
  | 'haute_editorial'     // Photo 5: Terre Verde style top oversized serif + vertical portrait
  | 'grand_diptych'       // Split screen 50/50 couple story + full photo
  | 'floating_frame'      // Elevated framed photo with gold border over blur canvas
  | 'velvet_midnight'     // Dark moody contrast, spotlight framing
  | 'cathedral_arch'      // Arched palace window frame
  | 'minimalist_ivory'    // Clean airy whitespace, delicate serif letterspacing
  | 'parallax_canvas'     // Immersive depth with slow zoom
  | 'heritage_storybook'  // Double asymmetric overlapping photo frames
  | 'classic_heirloom'    // Traditional timeless layout with royal ornamental flourish
  | 'contemporary_vogue'; // Bold modern typography horizontal banner

export type MotionAnimationId =
  | 'fade_up'
  | 'cinematic_zoom'
  | 'curtain_reveal'
  | 'parallax_float'
  | 'soft_focus';

export interface GalleryDesignConfig {
  preset: PresetLayoutId;
  palette: {
    mode: 'light' | 'dark';
    presetId: string;
    canvasBg: string;
    textColor: string;
    accentColor: string;
    subtextColor: string;
    cardBg: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    fontPairingId?: string;
  };
  motion: {
    animation: MotionAnimationId;
  };
  cover: {
    url: string;
    focalPoint: { x: number; y: number };
    overlayOpacity: number; // 0 to 80
  };
}

export const DEFAULT_DESIGN_CONFIG: GalleryDesignConfig = {
  preset: 'cinematic_bleed',
  palette: {
    mode: 'light',
    presetId: 'ivory_charcoal',
    canvasBg: '#FAF9F5',
    textColor: '#18181B',
    accentColor: '#D97706',
    subtextColor: '#71717A',
    cardBg: '#FFFFFF',
  },
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Plus Jakarta Sans',
    fontPairingId: 'playfair_jakarta',
  },
  motion: {
    animation: 'cinematic_zoom',
  },
  cover: {
    url: '',
    focalPoint: { x: 50, y: 50 },
    overlayOpacity: 40,
  },
};

/* ─────────────────────────────────────────────────────────────
    PRESET METADATA (12 UNIQUE PRESETS)
───────────────────────────────────────────────────────────── */

export interface PresetOption {
  id: PresetLayoutId;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  animationDefault: MotionAnimationId;
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'cinematic_bleed',
    title: 'Cinematic Bleed',
    subtitle: 'Widescreen Edge-to-Edge Hero',
    description: 'Breathtaking full-bleed landscape hero with soft contrast overlay, regal serif title, event date badge, and down-scroll navigation.',
    badge: 'Knots Classic',
    animationDefault: 'cinematic_zoom',
  },
  {
    id: 'royal_medallion',
    title: 'Royal Medallion',
    subtitle: 'Centered Circular Emblem',
    description: 'Iconic luxury circular portrait floating majestically over warm ivory canvas with cursive calligraphy couple name and gold scroll arrow.',
    badge: 'Celebrity Choice',
    animationDefault: 'fade_up',
  },
  {
    id: 'haute_editorial',
    title: 'Haute Editorial',
    subtitle: 'Terre Verde Fashion Vogue',
    description: 'Ultra-high-fashion oversized headline at the top, vertical portrait artwork framed in warm textured linen canvas with gallery minimalism.',
    badge: 'High Fashion',
    animationDefault: 'soft_focus',
  },
  {
    id: 'grand_diptych',
    title: 'Grand Diptych',
    subtitle: '50/50 Split Story & Hero',
    description: 'Balanced dual-column layout with couple story, date and studio badge on left, and a full-height portrait photograph on right.',
    badge: 'Editorial Story',
    animationDefault: 'curtain_reveal',
  },
  {
    id: 'floating_frame',
    title: 'Floating Gallery Frame',
    subtitle: 'Elevated Picture Shadow Bezel',
    description: 'Elevated framed photograph with subtle gold bevel ring floating gracefully over a soft ambient blurred background canvas.',
    badge: 'Fine Art Luxury',
    animationDefault: 'parallax_float',
  },
  {
    id: 'velvet_midnight',
    title: 'Velvet Midnight',
    subtitle: 'Dramatic Noir Spotlight',
    description: 'Deep obsidian and charcoal backdrop with glowing spotlight focus, royal champagne gold typography, and cinematic mystery.',
    badge: 'Noir Elegance',
    animationDefault: 'fade_up',
  },
  {
    id: 'cathedral_arch',
    title: 'Cathedral Arch',
    subtitle: 'Palace Window Contour',
    description: 'Architectural arched window silhouette framing the royal couple, inspired by royal Indian palace heritage architecture.',
    badge: 'Heritage Palace',
    animationDefault: 'curtain_reveal',
  },
  {
    id: 'minimalist_ivory',
    title: 'Minimalist Ivory',
    subtitle: 'Airy Whitespace & Delicate Serif',
    description: 'Clean modern gallery aesthetic with generous breathing room, delicate wide letterspacing, and understated contemporary elegance.',
    badge: 'Pure Minimal',
    animationDefault: 'fade_up',
  },
  {
    id: 'parallax_canvas',
    title: 'Parallax Canvas',
    subtitle: 'Multi-Layer Depth Immersion',
    description: 'Dynamic multi-plane canvas where typography and imagery glide at different speeds with subtle hover zoom for 3D realism.',
    badge: '3D Depth',
    animationDefault: 'cinematic_zoom',
  },
  {
    id: 'heritage_storybook',
    title: 'Heritage Storybook',
    subtitle: 'Asymmetric Duo Frames',
    description: 'Two artistic overlapping photographs presenting bride and groom together with vintage calligraphic details and golden dates.',
    badge: 'Dual Portraits',
    animationDefault: 'parallax_float',
  },
  {
    id: 'classic_heirloom',
    title: 'Classic Heirloom',
    subtitle: 'Timeless Royal Filigree',
    description: 'Traditional heritage layout with ornate gold crown motif, delicate filigree divider lines, and centered Cormorant Garamond typography.',
    badge: 'Timeless Classic',
    animationDefault: 'fade_up',
  },
  {
    id: 'contemporary_vogue',
    title: 'Contemporary Vogue',
    subtitle: 'Bold Wide Horizontal Banner',
    description: 'Wide horizontal panoramic banner with oversized modern typography, filmic border accents, and high-impact luxury branding.',
    badge: 'Modern Vogue',
    animationDefault: 'curtain_reveal',
  },
];

/* ─────────────────────────────────────────────────────────────
    PALETTE OPTIONS (LIGHT & DARK CURATED SWATCHES)
───────────────────────────────────────────────────────────── */

export interface PaletteOption {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  canvasBg: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
  cardBg: string;
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  // Light Mode Palettes
  { id: 'ivory_charcoal', name: 'Warm Ivory', mode: 'light', canvasBg: '#FAF9F5', textColor: '#18181B', accentColor: '#D97706', subtextColor: '#71717A', cardBg: '#FFFFFF' },
  { id: 'royal_champagne', name: 'Royal Gold', mode: 'light', canvasBg: '#FBF8F1', textColor: '#292524', accentColor: '#B45309', subtextColor: '#78716C', cardBg: '#FFFFFF' },
  { id: 'imperial_emerald_light', name: 'Imperial Sage', mode: 'light', canvasBg: '#F4F7F4', textColor: '#14291B', accentColor: '#059669', subtextColor: '#4B6354', cardBg: '#FFFFFF' },
  { id: 'rose_burgundy_light', name: 'Rose Quartz', mode: 'light', canvasBg: '#FDF6F6', textColor: '#3B1219', accentColor: '#BE123C', subtextColor: '#884D58', cardBg: '#FFFFFF' },
  { id: 'slate_mist_light', name: 'Nordic Slate', mode: 'light', canvasBg: '#F8FAFC', textColor: '#0F172A', accentColor: '#3B82F6', subtextColor: '#64748B', cardBg: '#FFFFFF' },
  { id: 'terracotta_light', name: 'Warm Linen', mode: 'light', canvasBg: '#F8F5F0', textColor: '#2E1C14', accentColor: '#C2410C', subtextColor: '#7C675B', cardBg: '#FFFFFF' },
  { id: 'olive_sand_light', name: 'Tuscan Olive', mode: 'light', canvasBg: '#F5F6F2', textColor: '#1E2319', accentColor: '#65A30D', subtextColor: '#57634C', cardBg: '#FFFFFF' },
  { id: 'pure_white', name: 'All White', mode: 'light', canvasBg: '#FFFFFF', textColor: '#09090B', accentColor: '#71717A', subtextColor: '#71717A', cardBg: '#F4F4F5' },

  // Dark Mode Palettes
  { id: 'velvet_obsidian', name: 'Velvet Obsidian', mode: 'dark', canvasBg: '#09090B', textColor: '#F4F4F5', accentColor: '#F59E0B', subtextColor: '#A1A1AA', cardBg: '#18181B' },
  { id: 'midnight_velvet', name: 'Midnight Azure', mode: 'dark', canvasBg: '#0B132B', textColor: '#F8FAFC', accentColor: '#38BDF8', subtextColor: '#94A3B8', cardBg: '#1C2541' },
  { id: 'deep_espresso', name: 'Deep Espresso', mode: 'dark', canvasBg: '#1C1917', textColor: '#FAF7F5', accentColor: '#FBBF24', subtextColor: '#A8A29E', cardBg: '#292524' },
  { id: 'imperial_emerald_dark', name: 'Emerald Vault', mode: 'dark', canvasBg: '#061D12', textColor: '#ECFDF5', accentColor: '#10B981', subtextColor: '#6EE7B7', cardBg: '#0A2E1D' },
  { id: 'burgundy_dark', name: 'Royal Burgundy', mode: 'dark', canvasBg: '#1A070B', textColor: '#FFF1F2', accentColor: '#FB7185', subtextColor: '#FDA4AF', cardBg: '#2B0E14' },
  { id: 'charcoal_minimal', name: 'Charcoal Minimal', mode: 'dark', canvasBg: '#121212', textColor: '#E4E4E7', accentColor: '#E4E4E7', subtextColor: '#71717A', cardBg: '#1E1E1E' },
];

/* ─────────────────────────────────────────────────────────────
    TYPOGRAPHY OPTIONS (MATCHING QUOTATION FONTS)
───────────────────────────────────────────────────────────── */

export interface FontPairingOption {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  tag: string;
  previewHeading: string;
}

export const FONT_PAIRING_OPTIONS: FontPairingOption[] = [
  {
    id: 'cormorant_inter',
    name: 'Cormorant Garamond + Inter',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Inter',
    tag: 'Royal Heritage',
    previewHeading: 'Siddhant & Vedika',
  },
  {
    id: 'playfair_jakarta',
    name: 'Playfair Display + Plus Jakarta Sans',
    headingFont: 'Playfair Display',
    bodyFont: 'Plus Jakarta Sans',
    tag: 'Editorial Modern',
    previewHeading: 'Maitri & Aneesh',
  },
  {
    id: 'cinzel_outfit',
    name: 'Cinzel + Outfit',
    headingFont: 'Cinzel',
    bodyFont: 'Outfit',
    tag: 'Imperial Grandeur',
    previewHeading: 'AARAV & ANANYA',
  },
  {
    id: 'greatvibes_montserrat',
    name: 'Great Vibes + Montserrat',
    headingFont: 'Great Vibes',
    bodyFont: 'Montserrat',
    tag: 'Romantic Script',
    previewHeading: 'Rohan & Tanya',
  },
  {
    id: 'bodoni_inter',
    name: 'Bodoni Moda + Inter',
    headingFont: 'Bodoni Moda',
    bodyFont: 'Inter',
    tag: 'Haute Fashion',
    previewHeading: 'TERRE VERDE',
  },
  {
    id: 'prata_jakarta',
    name: 'Prata + Plus Jakarta Sans',
    headingFont: 'Prata',
    bodyFont: 'Plus Jakarta Sans',
    tag: 'Romantic Editorial',
    previewHeading: 'Kabir & Meera',
  },
  {
    id: 'italiana_outfit',
    name: 'Italiana + Outfit',
    headingFont: 'Italiana',
    bodyFont: 'Outfit',
    tag: 'Haute Vogue',
    previewHeading: 'DEV & ISHA',
  },
  {
    id: 'marcellus_inter',
    name: 'Marcellus + Inter',
    headingFont: 'Marcellus',
    bodyFont: 'Inter',
    tag: 'Classical Serene',
    previewHeading: 'Vihaan & Sanjana',
  },
];

/* ─────────────────────────────────────────────────────────────
    MOTION / ANIMATION OPTIONS
───────────────────────────────────────────────────────────── */

export interface MotionOption {
  id: MotionAnimationId;
  name: string;
  description: string;
  badge: string;
}

export const MOTION_OPTIONS: MotionOption[] = [
  {
    id: 'fade_up',
    name: 'Fade Up Elegance',
    description: 'Smooth upward emergence with delicate easing on load and scroll',
    badge: 'Smooth',
  },
  {
    id: 'cinematic_zoom',
    name: 'Cinematic Zoom (Ken Burns)',
    description: 'Slow continuous luxury zoom on the hero cover creating cinematic wonder',
    badge: 'Popular',
  },
  {
    id: 'curtain_reveal',
    name: 'Curtain Unveil',
    description: 'Architectural shutter reveal opening gracefully from center to edges',
    badge: 'Dramatic',
  },
  {
    id: 'parallax_float',
    name: 'Parallax Depth Float',
    description: 'Multi-layer depth with 3D floating title and smooth momentum scroll',
    badge: '3D Depth',
  },
  {
    id: 'soft_focus',
    name: 'Dreamy Soft Focus',
    description: 'Gentle dissolve from soft atmospheric blur into crystal sharp clarity',
    badge: 'Dreamy',
  },
];

/* ─────────────────────────────────────────────────────────────
    PROPS
───────────────────────────────────────────────────────────── */

interface GalleryDesignStudioProps {
  gallery: any;
  onUpdateGallery?: (updated: any) => void;
  photos?: any[];
  isStandalonePage?: boolean;
}

export default function GalleryDesignStudio({
  gallery,
  onUpdateGallery,
  photos = [],
  isStandalonePage = false,
}: GalleryDesignStudioProps) {
  // Navigation Steps
  type StepId = 'presets' | 'palette' | 'cover' | 'typography' | 'motion';
  const [activeStep, setActiveStep] = useState<StepId>('presets');

  // Preview Mode: Desktop vs Mobile
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Design State initialized from gallery.raw_payload?.design
  const initialConfig = useMemo<GalleryDesignConfig>(() => {
    const saved = gallery?.raw_payload?.design;
    if (!saved) {
      return {
        ...DEFAULT_DESIGN_CONFIG,
        cover: {
          ...DEFAULT_DESIGN_CONFIG.cover,
          url: gallery?.cover_url || '',
        },
      };
    }
    return {
      preset: saved.preset || DEFAULT_DESIGN_CONFIG.preset,
      palette: {
        ...DEFAULT_DESIGN_CONFIG.palette,
        ...(saved.palette || {}),
      },
      typography: {
        ...DEFAULT_DESIGN_CONFIG.typography,
        ...(saved.typography || {}),
      },
      motion: {
        ...DEFAULT_DESIGN_CONFIG.motion,
        ...(saved.motion || {}),
      },
      cover: {
        ...DEFAULT_DESIGN_CONFIG.cover,
        url: saved.cover?.url || gallery?.cover_url || '',
        focalPoint: saved.cover?.focalPoint || DEFAULT_DESIGN_CONFIG.cover.focalPoint,
        overlayOpacity: saved.cover?.overlayOpacity ?? DEFAULT_DESIGN_CONFIG.cover.overlayOpacity,
      },
    };
  }, [gallery]);

  const [design, setDesign] = useState<GalleryDesignConfig>(initialConfig);
  const [paletteMode, setPaletteMode] = useState<'light' | 'dark'>(initialConfig.palette.mode || 'light');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customPaletteOpen, setCustomPaletteOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if gallery prop changes
  useEffect(() => {
    setDesign(initialConfig);
    setPaletteMode(initialConfig.palette.mode || 'light');
  }, [initialConfig]);

  // Filtered Palettes by mode
  const currentPalettes = useMemo(() => {
    return PALETTE_OPTIONS.filter((p) => p.mode === paletteMode);
  }, [paletteMode]);

  // Selected Cover Photo (fallback to first event photo or placeholder)
  const effectiveCoverPhoto = design.cover.url || gallery?.cover_url || photos?.[0]?.preview_url || photos?.[0]?.storage_path || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80';
  const coupleName = gallery?.title || 'Siddhant & Vedika';
  const eventDateFormatted = gallery?.event_date
    ? new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'December 18, 2026';
  const studioName = gallery?.studio_branding?.studio_name || 'Studio Core';

  // Apply Palette Preset
  const handleSelectPalette = (pal: PaletteOption) => {
    setDesign((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        presetId: pal.id,
        canvasBg: pal.canvasBg,
        textColor: pal.textColor,
        accentColor: pal.accentColor,
        subtextColor: pal.subtextColor,
        cardBg: pal.cardBg,
      },
    }));
  };

  // Toggle Mode (Light / Dark)
  const handleToggleMode = (mode: 'light' | 'dark') => {
    setPaletteMode(mode);
    const firstMatching = PALETTE_OPTIONS.find((p) => p.mode === mode) || PALETTE_OPTIONS[0];
    handleSelectPalette(firstMatching);
  };

  // Select Typography Pairing
  const handleSelectTypography = (pair: FontPairingOption) => {
    setDesign((prev) => ({
      ...prev,
      typography: {
        headingFont: pair.headingFont,
        bodyFont: pair.bodyFont,
        fontPairingId: pair.id,
      },
    }));
  };

  // Select Cover Photo from Gallery Photos
  const handleSelectCoverPhoto = (photoUrl: string) => {
    setDesign((prev) => ({
      ...prev,
      cover: {
        ...prev.cover,
        url: photoUrl,
      },
    }));
  };

  // Custom Cover Photo File Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gallery?.id) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('gallery_id', gallery.id);

      const res = await fetch('/api/gallery/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const resJson = await res.json();
      if (resJson?.uploadUrl) {
        await fetch(resJson.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        const finalUrl = resJson.publicUrl || resJson.previewUrl || resJson.storage_path;
        if (finalUrl) {
          handleSelectCoverPhoto(finalUrl);
        }
      }
    } catch (err) {
      console.error('Cover upload failed:', err);
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Save Design Settings to Backend
  const handleSaveDesign = async () => {
    if (!gallery?.id) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedPayload = {
        ...(gallery.raw_payload || {}),
        design: design,
      };

      const patchBody: Record<string, any> = {
        id: gallery.id,
        raw_payload: updatedPayload,
      };

      // Also sync cover_url if changed
      if (design.cover.url && design.cover.url !== gallery.cover_url) {
        patchBody.cover_url = design.cover.url;
      }

      const res = await fetch('/api/gallery/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Failed to save design');
      }

      setSaveSuccess(true);
      if (onUpdateGallery) {
        onUpdateGallery({
          ...gallery,
          raw_payload: updatedPayload,
          cover_url: design.cover.url || gallery.cover_url,
        });
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const publicGalleryLink = gallery?.slug ? `/g/${gallery.slug}` : `/g/${gallery?.id}`;

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-80px)] bg-[#F8F6F0] text-zinc-900 font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP LUXURY STUDIO HEADER BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E7E2D8] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          {isStandalonePage && (
            <Link
              href={`/workspace/gallery/${gallery?.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 text-xs font-bold border border-[#E7E2D8] transition flex items-center gap-1.5"
            >
              <span>← Back to Gallery</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center border border-amber-300/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            </span>
            <div className="leading-tight">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                Visual Experience Studio
              </span>
              <h1 className="text-sm sm:text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span>{coupleName}</span>
                <span className="text-[11px] font-normal text-zinc-400">• Design Customizer</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Device View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F4F1EA] border border-[#E7E2D8]">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              previewDevice === 'desktop'
                ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              previewDevice === 'mobile'
                ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href={publicGalleryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-[#FAF9F5] hover:bg-white text-zinc-700 font-bold text-xs border border-[#E7E2D8] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Preview Live</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          <button
            type="button"
            onClick={handleSaveDesign}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer select-none ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-600/20 active:scale-98'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Published Perfectly!' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN STUDIO SPLIT VIEW (LEFT CONTROLS + RIGHT PREVIEW)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ── LEFT CONFIGURATION PANEL (Fixed width on large screens) ── */}
        <div className="w-full lg:w-[480px] xl:w-[520px] bg-white border-r border-[#E7E2D8] flex flex-col shrink-0 overflow-y-auto">
          
          {/* Top Step Selector Pills */}
          <div className="p-3 border-b border-[#E7E2D8] bg-[#FBF9F5] flex items-center gap-1.5 overflow-x-auto menu-scrollbar">
            {[
              { id: 'presets' as StepId, label: '1. Presets', icon: Layout },
              { id: 'palette' as StepId, label: '2. Palette', icon: Palette },
              { id: 'cover' as StepId, label: '3. Cover', icon: ImageIcon },
              { id: 'typography' as StepId, label: '4. Fonts', icon: Type },
              { id: 'motion' as StepId, label: '5. Motion', icon: Activity },
            ].map((step) => {
              const isSelected = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-zinc-900 border border-[#E7E2D8] shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/60'
                  }`}
                >
                  <step.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-zinc-400'}`} />
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* STEP CONTENT CONTAINER */}
          <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            
            {/* ══════════════════════════════════════════════════════════
                STEP 1: PRESETS (12 LUXURY COVER TEMPLATES)
            ══════════════════════════════════════════════════════════ */}
            {activeStep === 'presets' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Step 1 of 5
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">12 Handcrafted Presets</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Cover Hero Layout Presets</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Select how the opening cover and couple introduction appears when guests and clients open the gallery.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {PRESET_OPTIONS.map((p) => {
                    const isSelected = design.preset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDesign((prev) => ({
                            ...prev,
                            preset: p.id,
                            motion: { animation: p.animationDefault },
                          }));
                        }}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 space-y-2.5 relative group ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-400/30 bg-amber-50/20 shadow-xs'
                            : 'border-[#E7E2D8] bg-white hover:border-zinc-400 hover:shadow-2xs'
                        }`}
                      >
                        {/* Mini Diagram Visualizer of the Preset Layout */}
                        <div className="h-24 rounded-xl bg-zinc-900 overflow-hidden relative flex items-center justify-center p-2 border border-black/10">
                          {effectiveCoverPhoto && (
                            <img
                              src={effectiveCoverPhoto}
                              alt={p.title}
                              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                            />
                          )}

                          {/* Overlay depending on preset */}
                          {p.id === 'royal_medallion' ? (
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-10 h-10 rounded-full border-2 border-amber-400 overflow-hidden shadow-lg mb-1">
                                <img src={effectiveCoverPhoto} alt="Circle" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[8px] font-serif text-white tracking-wider">Cursive Title</span>
                            </div>
                          ) : p.id === 'haute_editorial' ? (
                            <div className="relative z-10 flex flex-col items-center w-full">
                              <span className="text-[9px] font-black tracking-widest text-white uppercase mb-1">VOGUE TITLE</span>
                              <div className="w-12 h-14 rounded-sm border border-white/40 overflow-hidden">
                                <img src={effectiveCoverPhoto} alt="Vertical" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          ) : p.id === 'grand_diptych' ? (
                            <div className="relative z-10 grid grid-cols-2 gap-1 w-full h-full">
                              <div className="bg-black/60 rounded flex flex-col justify-center p-1 text-[7px] text-white font-serif">
                                <span>Story</span>
                                <span className="text-amber-400 text-[6px]">Date</span>
                              </div>
                              <div className="rounded overflow-hidden">
                                <img src={effectiveCoverPhoto} alt="Right" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          ) : p.id === 'floating_frame' ? (
                            <div className="relative z-10 w-20 h-14 rounded-lg bg-black/40 border-2 border-amber-400/80 p-0.5 shadow-xl overflow-hidden">
                              <img src={effectiveCoverPhoto} alt="Frame" className="w-full h-full object-cover rounded-sm" />
                            </div>
                          ) : p.id === 'cathedral_arch' ? (
                            <div className="relative z-10 w-12 h-16 rounded-t-full border-2 border-amber-300 overflow-hidden shadow-lg">
                              <img src={effectiveCoverPhoto} alt="Arch" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="relative z-10 text-center space-y-0.5">
                              <span className="text-[7px] font-mono uppercase tracking-widest text-amber-300 block">
                                {eventDateFormatted}
                              </span>
                              <span className="text-[10px] font-black text-white block drop-shadow-md">
                                {coupleName}
                              </span>
                            </div>
                          )}

                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Preset Titles & Description */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-black text-zinc-900 block leading-tight">{p.title}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#F4F1EA] text-zinc-600 border border-[#E7E2D8]">
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 line-clamp-2 leading-snug">{p.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2: PALETTE (COLORS - LIGHT / DARK + SWATCHES)
            ══════════════════════════════════════════════════════════ */}
            {activeStep === 'palette' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Step 2 of 5
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">Curated Luxury Themes</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Color Palette &amp; Canvas Tone</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Controls canvas background, display typography color, and accent button highlights.
                  </p>
                </div>

                {/* Light vs Dark Mode Switch */}
                <div className="p-1 rounded-2xl bg-[#F4F1EA] border border-[#E7E2D8] flex items-center">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('light')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      paletteMode === 'light'
                        ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span>Light Mode (Ivory &amp; Pastel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('dark')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      paletteMode === 'dark'
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dark Mode (Velvet &amp; Noir)</span>
                  </button>
                </div>

                {/* Palette Swatches Grid (Split circles as shown in Photo 2) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentPalettes.map((pal) => {
                    const isSelected = design.palette.presetId === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => handleSelectPalette(pal)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 relative ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-400/30 bg-white shadow-xs'
                            : 'border-[#E7E2D8] bg-[#FBF9F5] hover:bg-white hover:border-zinc-300'
                        }`}
                      >
                        {/* Dual-tone split swatch icon (Matching Samaro Photo 2) */}
                        <div className="w-10 h-10 rounded-full border border-black/10 shadow-xs overflow-hidden relative">
                          {/* Top Half: Canvas Background */}
                          <div className="w-full h-1/2" style={{ backgroundColor: pal.canvasBg }} />
                          {/* Bottom Half: Accent Color */}
                          <div className="w-full h-1/2" style={{ backgroundColor: pal.accentColor }} />
                        </div>

                        <span className="text-[11px] font-bold text-zinc-900 leading-tight block">
                          {pal.name}
                        </span>

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Palette Toggle & Pickers */}
                <div className="pt-2 border-t border-[#E7E2D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-900">Custom Brand Colors</span>
                    <button
                      type="button"
                      onClick={() => setCustomPaletteOpen(!customPaletteOpen)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                    >
                      {customPaletteOpen ? 'Collapse' : 'Customize Hex Codes →'}
                    </button>
                  </div>

                  {customPaletteOpen && (
                    <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                      {/* Canvas Background */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Canvas Background</label>
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2D8]">
                          <input
                            type="color"
                            value={design.palette.canvasBg}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                palette: { ...design.palette, canvasBg: e.target.value, presetId: 'custom' },
                              })
                            }
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                          />
                          <span className="text-xs font-mono font-bold text-zinc-700 uppercase">{design.palette.canvasBg}</span>
                        </div>
                      </div>

                      {/* Heading Text */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Foreground Text</label>
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2D8]">
                          <input
                            type="color"
                            value={design.palette.textColor}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                palette: { ...design.palette, textColor: e.target.value, presetId: 'custom' },
                              })
                            }
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                          />
                          <span className="text-xs font-mono font-bold text-zinc-700 uppercase">{design.palette.textColor}</span>
                        </div>
                      </div>

                      {/* Accent / Highlights */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Button / Accent</label>
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2D8]">
                          <input
                            type="color"
                            value={design.palette.accentColor}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                palette: { ...design.palette, accentColor: e.target.value, presetId: 'custom' },
                              })
                            }
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                          />
                          <span className="text-xs font-mono font-bold text-zinc-700 uppercase">{design.palette.accentColor}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 3: COVER (HERO IMAGE & FRAMING)
            ══════════════════════════════════════════════════════════ */}
            {activeStep === 'cover' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Step 3 of 5
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">Hero Image &amp; Focal Point</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Hero Header Photograph</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Pick a photo from your event gallery or upload a dedicated high-resolution cover photo.
                  </p>
                </div>

                {/* Current Active Cover Photo Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-[#E7E2D8] bg-zinc-900 h-44 shadow-xs">
                  <img
                    src={effectiveCoverPhoto}
                    alt="Current Cover"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${design.cover.focalPoint.x}% ${design.cover.focalPoint.y}%`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                        Active Cover
                      </span>
                      <p className="text-xs font-bold text-white mt-1 drop-shadow-sm">{coupleName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isUploadingCover ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isUploadingCover ? 'Uploading...' : 'Upload New Cover'}</span>
                    </button>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Focal Point Alignment */}
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-2.5">
                  <span className="text-xs font-black text-zinc-900 block">Focal Point Alignment</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Top', x: 50, y: 15 },
                      { label: 'Center', x: 50, y: 50 },
                      { label: 'Bottom', x: 50, y: 85 },
                    ].map((focal) => {
                      const isSelected = design.cover.focalPoint.y === focal.y;
                      return (
                        <button
                          key={focal.label}
                          type="button"
                          onClick={() =>
                            setDesign({
                              ...design,
                              cover: { ...design.cover, focalPoint: { x: focal.x, y: focal.y } },
                            })
                          }
                          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-white border border-[#E7E2D8] text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          {focal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Overlay Opacity Slider */}
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-zinc-900">Contrast Overlay Opacity</span>
                    <span className="font-mono font-bold text-amber-700">{design.cover.overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={design.cover.overlayOpacity}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        cover: { ...design.cover, overlayOpacity: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-400">
                    Controls dark vignette density so couple names stay crystal clear regardless of photo lighting.
                  </p>
                </div>

                {/* Gallery Photos Selection Strip */}
                {photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black text-zinc-900 block">
                      Select Cover from Event Photos ({photos.length} photos)
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 menu-scrollbar">
                      {photos.slice(0, 24).map((p, i) => {
                        const url = p.preview_url || p.storage_path;
                        const isChosen = design.cover.url === url;
                        return (
                          <button
                            key={p.id || i}
                            type="button"
                            onClick={() => handleSelectCoverPhoto(url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 relative cursor-pointer group transition ${
                              isChosen ? 'border-amber-600 ring-2 ring-amber-400/40 scale-95' : 'border-transparent hover:border-zinc-300'
                            }`}
                          >
                            <img src={url} alt={`Photo ${i}`} className="w-full h-full object-cover" />
                            {isChosen && (
                              <div className="absolute inset-0 bg-amber-600/30 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 4: TYPOGRAPHY (MATCHING SYSTEM & QUOTATION FONTS)
            ══════════════════════════════════════════════════════════ */}
            {activeStep === 'typography' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Step 4 of 5
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">Curated Font Pairings</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Luxury Wedding Typography</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Harmonious combinations from our official quotation fonts to preserve your studio’s signature aesthetic.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {FONT_PAIRING_OPTIONS.map((pair) => {
                    const isSelected = design.typography.fontPairingId === pair.id;
                    return (
                      <div
                        key={pair.id}
                        onClick={() => handleSelectTypography(pair)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-400/30 bg-amber-50/20 shadow-xs'
                            : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-900">{pair.name}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F4F1EA] text-zinc-600 border border-[#E7E2D8]">
                              {pair.tag}
                            </span>
                          </div>
                          <p
                            className="text-lg text-zinc-800 leading-tight"
                            style={{ fontFamily: pair.headingFont }}
                          >
                            {coupleName}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Heading: {pair.headingFont} • Body: {pair.bodyFont}
                          </span>
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
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 5: MOTION & ANIMATIONS
            ══════════════════════════════════════════════════════════ */}
            {activeStep === 'motion' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Step 5 of 5
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">Entrance &amp; Scroll Motion</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Cinematic Motion &amp; Animation</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Choose how the hero image and couple titles glide into view when guests open the portal.
                  </p>
                </div>

                <div className="space-y-3">
                  {MOTION_OPTIONS.map((mot) => {
                    const isSelected = design.motion.animation === mot.id;
                    return (
                      <div
                        key={mot.id}
                        onClick={() =>
                          setDesign({
                            ...design,
                            motion: { animation: mot.id },
                          })
                        }
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-400/30 bg-amber-50/20 shadow-xs'
                            : 'border-[#E7E2D8] bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-900">{mot.name}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {mot.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-snug">{mot.description}</p>
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
              </div>
            )}

          </div>

          {/* Bottom Save Reminder Bar */}
          <div className="p-4 bg-white border-t border-[#E7E2D8] flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400 font-medium">
              Changes render live on the right.
            </span>
            <button
              type="button"
              onClick={handleSaveDesign}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT LIVE INTERACTIVE PREVIEW SIMULATOR ── */}
        <div className="flex-1 bg-[#EBE7DF] p-4 sm:p-8 flex items-center justify-center overflow-y-auto">
          
          {/* DESKTOP BROWSER MOCKUP FRAME */}
          {previewDevice === 'desktop' && (
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col transition-all duration-300">
              
              {/* Chrome Browser Header Bar */}
              <div className="bg-[#FAF9F5] border-b border-[#E7E2D8] px-4 py-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 max-w-md mx-auto bg-white rounded-lg px-3 py-1 border border-[#E7E2D8] text-[10px] font-mono text-zinc-400 text-center truncate">
                  https://studiocore.in/{gallery?.slug || 'wedding-gallery'}
                </div>
              </div>

              {/* LIVE SIMULATED CLIENT VIEW */}
              <div
                className="overflow-y-auto max-h-[640px] select-none"
                style={{ backgroundColor: design.palette.canvasBg, color: design.palette.textColor }}
              >
                {/* 1. Header Bar */}
                <div className="border-b border-black/10 px-6 py-3 flex items-center justify-between bg-white/40 backdrop-blur-md sticky top-0 z-20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center">
                      {studioName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-none">{studioName}</span>
                      <span className="text-[9px] opacity-60">Photography &amp; Films</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-black/5 border border-black/10">
                    Client Portal
                  </span>
                </div>

                {/* 2. DYNAMIC HERO COVER PRESET RENDERER */}
                <div className="relative overflow-hidden">
                  
                  {/* PRESET 1: CINEMATIC BLEED (Photo 3) */}
                  {design.preset === 'cinematic_bleed' && (
                    <div className="relative h-96 w-full flex items-center justify-center text-center overflow-hidden">
                      <img
                        src={effectiveCoverPhoto}
                        alt="Hero"
                        className={`absolute inset-0 w-full h-full object-cover ${
                          design.motion.animation === 'cinematic_zoom' ? 'scale-105 transition-transform duration-1000' : ''
                        }`}
                        style={{
                          objectPosition: `${design.cover.focalPoint.x}% ${design.cover.focalPoint.y}%`,
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: design.cover.overlayOpacity / 100 }}
                      />
                      <div className="relative z-10 p-6 space-y-2 text-white max-w-lg">
                        <span className="text-[10px] tracking-widest uppercase font-mono text-amber-300">
                          {eventDateFormatted}
                        </span>
                        <h2
                          className="text-4xl sm:text-5xl font-normal tracking-tight drop-shadow-md"
                          style={{ fontFamily: design.typography.headingFont }}
                        >
                          {coupleName}
                        </h2>
                        <div className="pt-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-white backdrop-blur-md animate-bounce">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRESET 2: ROYAL MEDALLION (Photo 4) */}
                  {design.preset === 'royal_medallion' && (
                    <div className="py-12 px-6 text-center space-y-4 flex flex-col items-center">
                      <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-amber-400/30 shadow-2xl relative">
                        <img
                          src={effectiveCoverPhoto}
                          alt="Medallion"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${design.cover.focalPoint.x}% ${design.cover.focalPoint.y}%`,
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-bold opacity-60">
                          GALLERY BY {studioName.toUpperCase()}
                        </span>
                        <h2
                          className="text-3xl sm:text-4xl font-normal italic tracking-tight"
                          style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}
                        >
                          {coupleName}
                        </h2>
                        <span className="text-xs font-mono opacity-60 block">{eventDateFormatted}</span>
                      </div>
                      <span className="inline-block pt-2 animate-bounce">
                        <ArrowDown className="w-4 h-4 text-amber-600" />
                      </span>
                    </div>
                  )}

                  {/* PRESET 3: HAUTE EDITORIAL (Photo 5 Terre Verde Style) */}
                  {design.preset === 'haute_editorial' && (
                    <div className="py-10 px-6 text-center space-y-4 flex flex-col items-center">
                      <h2
                        className="text-4xl sm:text-5xl font-black tracking-widest uppercase"
                        style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}
                      >
                        {coupleName}
                      </h2>
                      <div className="w-56 h-72 rounded-sm overflow-hidden shadow-2xl border-4 border-white bg-black">
                        <img
                          src={effectiveCoverPhoto}
                          alt="Vogue Portrait"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${design.cover.focalPoint.x}% ${design.cover.focalPoint.y}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono tracking-widest opacity-60 uppercase">{eventDateFormatted}</span>
                    </div>
                  )}

                  {/* PRESET 4: GRAND DIPTYCH (Split 50/50) */}
                  {design.preset === 'grand_diptych' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 min-h-80 w-full">
                      <div className="p-8 flex flex-col justify-center space-y-3">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-amber-600 font-bold">
                          {eventDateFormatted}
                        </span>
                        <h2
                          className="text-3xl sm:text-4xl font-bold tracking-tight"
                          style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}
                        >
                          {coupleName}
                        </h2>
                        <p className="text-xs opacity-75 font-serif italic max-w-sm">
                          Preserving authentic visual poetry, cherished laughter, and timeless celebrations.
                        </p>
                      </div>
                      <div className="h-64 sm:h-auto overflow-hidden">
                        <img
                          src={effectiveCoverPhoto}
                          alt="Diptych"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${design.cover.focalPoint.x}% ${design.cover.focalPoint.y}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* PRESET 5: FLOATING FRAME */}
                  {design.preset === 'floating_frame' && (
                    <div className="relative py-14 px-6 flex items-center justify-center overflow-hidden">
                      <img
                        src={effectiveCoverPhoto}
                        alt="Ambient Blur"
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30"
                      />
                      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-amber-400/40 shadow-2xl space-y-3 text-center">
                        <div className="aspect-video rounded-xl overflow-hidden shadow-sm">
                          <img src={effectiveCoverPhoto} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: design.typography.headingFont }}>
                          {coupleName}
                        </h2>
                        <span className="text-xs font-mono text-zinc-500 block">{eventDateFormatted}</span>
                      </div>
                    </div>
                  )}

                  {/* PRESET 6: VELVET MIDNIGHT */}
                  {design.preset === 'velvet_midnight' && (
                    <div className="relative h-96 w-full flex items-center justify-center text-center bg-black overflow-hidden">
                      <div className="absolute inset-0 bg-radial from-amber-500/20 via-black to-black" />
                      <div className="relative z-10 space-y-3 p-6 text-white">
                        <span className="text-[10px] tracking-widest uppercase font-mono text-amber-400">
                          {eventDateFormatted}
                        </span>
                        <h2 className="text-4xl sm:text-5xl font-light tracking-wide text-amber-100" style={{ fontFamily: design.typography.headingFont }}>
                          {coupleName}
                        </h2>
                        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />
                      </div>
                    </div>
                  )}

                  {/* PRESET 7: CATHEDRAL ARCH */}
                  {design.preset === 'cathedral_arch' && (
                    <div className="py-12 px-6 flex flex-col items-center text-center space-y-4">
                      <div className="w-44 h-64 rounded-t-full overflow-hidden border-4 border-amber-500/30 shadow-2xl">
                        <img src={effectiveCoverPhoto} alt="Arch" className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-3xl font-bold" style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}>
                        {coupleName}
                      </h2>
                      <span className="text-xs font-mono opacity-60">{eventDateFormatted}</span>
                    </div>
                  )}

                  {/* PRESET 8: MINIMALIST IVORY */}
                  {design.preset === 'minimalist_ivory' && (
                    <div className="py-16 px-6 text-center space-y-3">
                      <span className="text-[10px] tracking-widest uppercase font-mono opacity-50 block">WEDDING CELEBRATION</span>
                      <h2 className="text-4xl sm:text-5xl font-light tracking-widest uppercase" style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}>
                        {coupleName}
                      </h2>
                      <span className="text-xs font-mono opacity-60 block">{eventDateFormatted}</span>
                    </div>
                  )}

                  {/* PRESET 9: PARALLAX CANVAS */}
                  {design.preset === 'parallax_canvas' && (
                    <div className="relative h-96 w-full flex items-center justify-center text-center overflow-hidden">
                      <img src={effectiveCoverPhoto} alt="Parallax" className="absolute inset-0 w-full h-full object-cover scale-110" />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-10 text-white space-y-2">
                        <span className="text-xs font-mono tracking-widest text-amber-300 uppercase">{eventDateFormatted}</span>
                        <h2 className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: design.typography.headingFont }}>
                          {coupleName}
                        </h2>
                      </div>
                    </div>
                  )}

                  {/* PRESET 10: HERITAGE STORYBOOK */}
                  {design.preset === 'heritage_storybook' && (
                    <div className="py-12 px-6 flex flex-col items-center text-center space-y-4">
                      <div className="flex items-center justify-center -space-x-8">
                        <div className="w-32 h-44 rounded-xl overflow-hidden border-2 border-white shadow-xl -rotate-6">
                          <img src={effectiveCoverPhoto} alt="Duo 1" className="w-full h-full object-cover" />
                        </div>
                        <div className="w-32 h-44 rounded-xl overflow-hidden border-2 border-white shadow-xl rotate-6 z-10">
                          <img src={effectiveCoverPhoto} alt="Duo 2" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <h2 className="text-3xl font-serif italic" style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}>
                        {coupleName}
                      </h2>
                      <span className="text-xs font-mono opacity-60">{eventDateFormatted}</span>
                    </div>
                  )}

                  {/* PRESET 11: CLASSIC HEIRLOOM */}
                  {design.preset === 'classic_heirloom' && (
                    <div className="py-12 px-6 text-center space-y-3 flex flex-col items-center">
                      <Crown className="w-6 h-6 text-amber-600" />
                      <div className="w-16 h-0.5 bg-amber-400 mx-auto" />
                      <h2 className="text-3xl sm:text-4xl font-normal tracking-wide" style={{ fontFamily: design.typography.headingFont, color: design.palette.textColor }}>
                        {coupleName}
                      </h2>
                      <span className="text-xs font-mono opacity-60">{eventDateFormatted}</span>
                      <div className="w-full max-w-sm h-48 rounded-xl overflow-hidden shadow-lg mt-2">
                        <img src={effectiveCoverPhoto} alt="Heirloom" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* PRESET 12: CONTEMPORARY VOGUE */}
                  {design.preset === 'contemporary_vogue' && (
                    <div className="relative h-72 w-full flex items-center justify-between p-8 bg-zinc-900 text-white overflow-hidden">
                      <img src={effectiveCoverPhoto} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="relative z-10 space-y-1">
                        <span className="text-[10px] font-mono tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                          {eventDateFormatted}
                        </span>
                        <h2 className="text-4xl font-black uppercase tracking-tight" style={{ fontFamily: design.typography.headingFont }}>
                          {coupleName}
                        </h2>
                      </div>
                      <div className="relative z-10 hidden sm:block">
                        <span className="px-4 py-2 rounded-full border border-white/30 text-xs font-bold uppercase tracking-wider">
                          View Gallery
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Sub-Events Scene Divider Bar */}
                <div
                  className="px-6 py-3 border-y border-black/10 flex items-center justify-between text-xs font-bold"
                  style={{ backgroundColor: design.palette.cardBg }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-amber-600 border-b-2 border-amber-600 pb-1">Highlights</span>
                    <span className="opacity-50">Sangeet</span>
                    <span className="opacity-50">Haldi</span>
                    <span className="opacity-50">Wedding</span>
                  </div>
                  <span className="text-[11px] opacity-60 font-mono">114 Photos</span>
                </div>

                {/* 4. AI Face Search Banner Teaser */}
                <div className="p-6 text-center space-y-2 border-b border-black/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">
                    PEOPLE &amp; GUESTS
                  </span>
                  <h3 className="text-xl font-normal" style={{ fontFamily: design.typography.headingFont }}>
                    Find yourself with AI Selfie
                  </h3>
                  <div className="pt-2 flex justify-center">
                    <div className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-bold shadow-sm">
                      Take a Selfie to Match Photos
                    </div>
                  </div>
                </div>

                {/* 5. Sample Photo Grid Preview */}
                <div className="p-6 grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="aspect-square rounded-xl bg-black/5 overflow-hidden shadow-2xs">
                      <img
                        src={`https://images.unsplash.com/photo-${1519741497674 + idx * 1000}?auto=format&fit=crop&w=400&q=80`}
                        alt="Sample"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* MOBILE PHONE MOCKUP FRAME (iPhone 16 Pro Style) */}
          {previewDevice === 'mobile' && (
            <div className="w-[360px] h-[720px] bg-black rounded-[50px] p-3 shadow-2xl border-4 border-zinc-700 relative flex flex-col transition-all duration-300">
              
              {/* Dynamic Island Pill */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-blue-900/40" />
              </div>

              {/* Screen Container */}
              <div
                className="w-full h-full rounded-[40px] overflow-hidden flex flex-col select-none overflow-y-auto"
                style={{ backgroundColor: design.palette.canvasBg, color: design.palette.textColor }}
              >
                {/* Mobile Status Bar */}
                <div className="pt-3 px-6 pb-1 flex items-center justify-between text-[11px] font-bold opacity-60">
                  <span>9:41</span>
                  <span>5G • 100%</span>
                </div>

                {/* Mobile Gallery Header */}
                <div className="px-4 py-2 border-b border-black/10 flex items-center justify-between">
                  <span className="text-xs font-bold truncate max-w-[150px]">{studioName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5">
                    Mobile View
                  </span>
                </div>

                {/* Mobile Hero Render */}
                <div className="relative overflow-hidden">
                  {design.preset === 'royal_medallion' ? (
                    <div className="py-8 px-4 text-center space-y-3 flex flex-col items-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-amber-400/30 shadow-xl">
                        <img src={effectiveCoverPhoto} alt="Medallion" className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-serif italic" style={{ fontFamily: design.typography.headingFont }}>
                        {coupleName}
                      </h2>
                      <span className="text-[10px] font-mono opacity-60">{eventDateFormatted}</span>
                    </div>
                  ) : design.preset === 'haute_editorial' ? (
                    <div className="py-6 px-4 text-center space-y-3 flex flex-col items-center">
                      <h2 className="text-2xl font-black uppercase tracking-widest" style={{ fontFamily: design.typography.headingFont }}>
                        {coupleName}
                      </h2>
                      <div className="w-40 h-52 rounded-sm overflow-hidden shadow-xl border-2 border-white">
                        <img src={effectiveCoverPhoto} alt="Editorial" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-64 w-full flex items-center justify-center text-center p-4">
                      <img src={effectiveCoverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-10 text-white space-y-1">
                        <span className="text-[9px] font-mono tracking-widest text-amber-300 uppercase">{eventDateFormatted}</span>
                        <h2 className="text-2xl font-bold" style={{ fontFamily: design.typography.headingFont }}>
                          {coupleName}
                        </h2>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Sub-Events Bar */}
                <div className="px-4 py-2 border-y border-black/10 flex items-center gap-3 text-[11px] font-bold overflow-x-auto whitespace-nowrap">
                  <span className="text-amber-600">Highlights</span>
                  <span className="opacity-50">Sangeet</span>
                  <span className="opacity-50">Haldi</span>
                  <span className="opacity-50">Wedding</span>
                </div>

                {/* Mobile Sample Photos */}
                <div className="p-4 grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="aspect-square rounded-xl bg-black/10 overflow-hidden">
                      <img
                        src={`https://images.unsplash.com/photo-${1519741497674 + idx * 1000}?auto=format&fit=crop&w=300&q=80`}
                        alt="Sample"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
