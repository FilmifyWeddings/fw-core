'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit3, 
  ArrowLeft, ArrowRight, Eye, Share2, Copy, Percent, DollarSign, 
  Palette, Type, Layout, ShieldCheck, Film, Video, Camera, BookOpen, 
  Calendar, MapPin, Users, AlertCircle, CheckCircle2, ChevronRight, 
  Download, Printer, RefreshCw, X, Layers, ExternalLink, ChevronUp, ChevronDown, Move, Image as ImageIcon, Sliders,
  ZoomIn, ZoomOut, Maximize2, Menu, ArrowUp, ArrowDown, Circle, MoveVertical, MoveHorizontal, AlignVerticalSpaceAround, AlignCenter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady } from '@/lib/font-loader';

// Exact Registered Color Palettes with Inverted Counterparts
export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  background: string;
  text: string;
  kicker: string;
  borderColor: string;
  boxBgColor: string;
  isDark?: boolean;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cherry-red-cream',
    name: 'Cherry Red & Cream',
    primary: '#750505',
    background: '#FBFCEB',
    text: '#750505',
    kicker: '#750505',
    borderColor: 'rgba(117, 5, 5, 0.2)',
    boxBgColor: 'rgba(117, 5, 5, 0.06)',
  },
  {
    id: 'cream-cherry-red',
    name: 'Cream & Cherry Red (Inverted)',
    primary: '#FBFCEB',
    background: '#750505',
    text: '#FBFCEB',
    kicker: '#FFECD1',
    borderColor: 'rgba(251, 252, 235, 0.25)',
    boxBgColor: 'rgba(251, 252, 235, 0.08)',
    isDark: true,
  },

  {
    id: 'cyprus-sand-dune',
    name: 'Cyprus & Sand Dune',
    primary: '#004643',
    background: '#F0EDE5',
    text: '#004643',
    kicker: '#004643',
    borderColor: 'rgba(0, 70, 67, 0.2)',
    boxBgColor: 'rgba(0, 70, 67, 0.06)',
  },
  {
    id: 'sand-dune-cyprus',
    name: 'Sand Dune & Cyprus (Inverted)',
    primary: '#F0EDE5',
    background: '#004643',
    text: '#F0EDE5',
    kicker: '#E6CFA7',
    borderColor: 'rgba(240, 237, 229, 0.25)',
    boxBgColor: 'rgba(240, 237, 229, 0.08)',
    isDark: true,
  },

  {
    id: 'plum-milk',
    name: 'Plum & Milk',
    primary: '#381932',
    background: '#FFF3E6',
    text: '#381932',
    kicker: '#381932',
    borderColor: 'rgba(56, 25, 50, 0.2)',
    boxBgColor: 'rgba(56, 25, 50, 0.06)',
  },
  {
    id: 'milk-plum',
    name: 'Milk & Plum (Inverted)',
    primary: '#FFF3E6',
    background: '#381932',
    text: '#FFF3E6',
    kicker: '#FFECD1',
    borderColor: 'rgba(255, 243, 230, 0.25)',
    boxBgColor: 'rgba(255, 243, 230, 0.08)',
    isDark: true,
  },

  {
    id: 'sand-chocolate',
    name: 'Sand & Chocolate',
    primary: '#3E000C',
    background: '#FFECD1',
    text: '#3E000C',
    kicker: '#3E000C',
    borderColor: 'rgba(62, 0, 12, 0.2)',
    boxBgColor: 'rgba(62, 0, 12, 0.06)',
  },
  {
    id: 'chocolate-sand',
    name: 'Chocolate & Sand (Inverted)',
    primary: '#FFECD1',
    background: '#3E000C',
    text: '#FFECD1',
    kicker: '#FFECD1',
    borderColor: 'rgba(255, 236, 209, 0.25)',
    boxBgColor: 'rgba(255, 236, 209, 0.08)',
    isDark: true,
  },

  {
    id: 'feldgrau-wheat',
    name: 'Feldgrau & Wheat',
    primary: '#3A4B41',
    background: '#E6CFA7',
    text: '#3A4B41',
    kicker: '#3A4B41',
    borderColor: 'rgba(58, 75, 65, 0.2)',
    boxBgColor: 'rgba(58, 75, 65, 0.06)',
  },
  {
    id: 'wheat-feldgrau',
    name: 'Wheat & Feldgrau (Inverted)',
    primary: '#E6CFA7',
    background: '#3A4B41',
    text: '#E6CFA7',
    kicker: '#E6CFA7',
    borderColor: 'rgba(230, 207, 167, 0.25)',
    boxBgColor: 'rgba(230, 207, 167, 0.08)',
    isDark: true,
  },

  {
    id: 'noctis-marigold',
    name: 'Noctis & Marigold',
    primary: '#1F2235',
    background: '#E3A419',
    text: '#1F2235',
    kicker: '#1F2235',
    borderColor: 'rgba(31, 34, 53, 0.2)',
    boxBgColor: 'rgba(31, 34, 53, 0.08)',
  },
  {
    id: 'marigold-noctis',
    name: 'Marigold & Noctis (Inverted)',
    primary: '#E3A419',
    background: '#1F2235',
    text: '#E3A419',
    kicker: '#E3A419',
    borderColor: 'rgba(227, 164, 25, 0.25)',
    boxBgColor: 'rgba(227, 164, 25, 0.08)',
    isDark: true,
  },

  {
    id: 'champagne-obsidian',
    name: 'Champagne & Obsidian',
    primary: '#111111',
    background: '#F7F4EF',
    text: '#111111',
    kicker: '#71717A',
    borderColor: 'rgba(228, 228, 231, 1)',
    boxBgColor: 'rgba(244, 244, 245, 1)',
  },
  {
    id: 'obsidian-champagne',
    name: 'Obsidian & Champagne (Inverted)',
    primary: '#F7F4EF',
    background: '#111111',
    text: '#F7F4EF',
    kicker: '#D4D4D8',
    borderColor: 'rgba(247, 244, 239, 0.25)',
    boxBgColor: 'rgba(247, 244, 239, 0.08)',
    isDark: true,
  },

  {
    id: 'forest-olive-ivory',
    name: 'Forest Olive & Ivory',
    primary: '#2C352E',
    background: '#F2EFE9',
    text: '#2C352E',
    kicker: '#58695C',
    borderColor: 'rgba(44, 53, 46, 0.2)',
    boxBgColor: 'rgba(44, 53, 46, 0.06)',
  },
  {
    id: 'ivory-forest-olive',
    name: 'Ivory & Forest Olive (Inverted)',
    primary: '#F2EFE9',
    background: '#2C352E',
    text: '#F2EFE9',
    kicker: '#E2DFD9',
    borderColor: 'rgba(242, 239, 233, 0.25)',
    boxBgColor: 'rgba(242, 239, 233, 0.08)',
    isDark: true,
  },

  {
    id: 'airy-white',
    name: 'Airy White (Pre-Wed)',
    primary: '#27272A',
    background: '#FFFFFF',
    text: '#27272A',
    kicker: '#A1A1AA',
    borderColor: 'rgba(228, 228, 231, 1)',
    boxBgColor: 'rgba(244, 244, 245, 1)',
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold (Classic)',
    primary: '#8A6D2F',
    background: '#FFF8EA',
    text: '#8A6D2F',
    kicker: '#8A6D2F',
    borderColor: 'rgba(138, 109, 47, 0.25)',
    boxBgColor: 'rgba(138, 109, 47, 0.08)',
  },
  {
    id: 'dark-studio',
    name: 'Dark Studio',
    primary: '#F3F4F6',
    background: '#141622',
    text: '#F3F4F6',
    kicker: '#E5C365',
    borderColor: '#232634',
    boxBgColor: '#0F1017',
    isDark: true,
  },
];

// Base Page Section Image Config Interface
interface PageImageConfig {
  photoUrl?: string;
  photo?: string;
  photoHeight: number;
  photoWidth: number;
  photoFocalY: number;
  bgOpacity?: number;
  frameShape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  imagePosition?: 'top' | 'center' | 'bottom';
}

// StudioCore Presets & Full Dynamic State
const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Pre-Wedding – Airy White (Pre-Wedding)',
  eventGroup: 'Pre-Wedding',
  look: 'Cherry Red & Cream',
  primaryFont: "'Cormorant Garamond', serif",
  secondaryFont: "'Plus Jakarta Sans', sans-serif",

  // 1. Cover Page State
  cover: {
    groomName: 'YASH',
    brideName: 'TWINKLE',
    eventType: 'Wedding',
    sideOption: 'Both Sides',
    locationName: 'MUMBAI',
    brandName: 'FILMIFY WEDDINGS',
    brandLogoUrl: '',
    brandLogoSize: 64,
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 450,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'center' as 'top' | 'center' | 'bottom',
  },
  
  // 2. About Us
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever',
    signature: 'FOUNDER & DIRECTOR, AS',
    bottomBannerPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    bottomBannerHeight: 380,
    frameShape: 'full-width' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    photoFocalY: 50,
    photoWidth: 100,
    bgOpacity: 40,
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 3. Pre-Wedding Shoot Details
  shootDetails: {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot',
    crewText: 'Candid Photography\nCinematography\nPortable Changing Room',
    deliverablesHeading: 'Deliverables',
    deliverablesText: 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoHeight: 380,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 4. What's Included
  whatsIncluded: {
    kicker: 'YOUR PACKAGE',
    heading: 'INCLUDED',
    deliverablesText: '75-80 retouched high-res images\n1 min teaser\n2-3 reels\n1 main film',
    photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 5. Price & Payment
  pricePayment: {
    kicker: 'INVESTMENT',
    heading: 'WEDDING GOLD',
    packagePrice: 135000,
    discountPct: 0,
    gstPct: 18,
    paymentHeading: 'PAYMENT',
    paymentTerms: '50% booking • 40% post-shoot • 10% on final delivery',
    photo: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80',
    photoHeight: 300,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 6. Add-ons Table
  addOnsTable: {
    heading: 'ADD ONS',
    kicker: "EMBRACE YOUR DAY — YOU'RE IN CONTROL",
    rows: [
      { id: 'a1', service: 'Additional photographer', charge: '₹15,000 per day' },
      { id: 'a2', service: 'Additional cinematographer', charge: '₹22,000 per day' },
      { id: 'a3', service: 'Drone pilot', charge: '₹12,000 per day' },
      { id: 'a4', service: 'Pre-wedding session', charge: '₹20,000 per session' },
      { id: 'a5', service: 'Album', charge: '₹550 per page' },
      { id: 'a6', service: 'Instagram reel', charge: '₹2,000 per reel' },
    ],
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 280,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 7. Delivery Time & Timeline Table
  timelineTable: {
    heading: 'Timeframe for delivery',
    rows: [
      { id: 't1', result: 'Quick edits (20 photos)', timeline: 'On the shoot day', revisions: 'No' },
      { id: 't2', result: 'Edited photos', timeline: 'Twenty-five days', revisions: 'No' },
      { id: 't3', result: 'Teaser / reels', timeline: 'A couple of months', revisions: 'No' },
      { id: 't4', result: 'Full film', timeline: 'Around two months', revisions: 'One cycle within a month' },
    ],
    photo: '',
    photoHeight: 280,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 8. Terms & Thank You
  termsAndThankYou: {
    termsHeading: 'TERMS',
    termsText: 'Dates are blocked only after the booking advance. Travel and stay outside the city are billed at actuals. Raw files are not shared.',
    thankYouHeading: 'THANK YOU',
    thankYouText: 'We would love to tell your story.',
    studioContact: 'FW Studio • +91 9876543210 • studio@studiocore.com',
    photo: '',
    photoHeight: 280,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  }
};

// Canva-Style Visual COLOR PALETTE Dropdown Component
interface CanvaThemeSelectorProps {
  value: string;
  onChange: (themeName: string) => void;
}

function CanvaThemeSelector({ value, onChange }: CanvaThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTheme = COLOR_THEMES.find(t => t.name === value || t.id === value) || COLOR_THEMES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-1 w-full" ref={containerRef}>
      <label className="block text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">COLOR PALETTE</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 font-bold text-xs flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition-all shadow-2xs"
      >
        <div className="flex items-center gap-2.5 truncate">
          {/* Side-by-Side Dual Color Swatch */}
          <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-300 flex shrink-0 shadow-2xs">
            <div className="w-1/2 h-full" style={{ backgroundColor: activeTheme.primary }} />
            <div className="w-1/2 h-full" style={{ backgroundColor: activeTheme.background }} />
          </div>
          <span className="truncate text-xs font-black">{activeTheme.name}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1 max-h-64 overflow-y-auto"
          >
            {COLOR_THEMES.map(theme => {
              const isSelected = activeTheme.name === theme.name;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    onChange(theme.name);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {/* Side-by-Side Dual Swatch Pill */}
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-300 flex shrink-0 shadow-xs">
                      <div className="w-1/2 h-full" style={{ backgroundColor: theme.primary }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: theme.background }} />
                    </div>
                    <span className="truncate font-bold">{theme.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Off-White System Theme Photo Layout Style Selector
interface Photo3DLayoutSelectorProps {
  value: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  onChange: (newShape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background') => void;
}

const PHOTO_SHAPE_OPTIONS = [
  { value: 'arch', label: 'Arch', icon: '⋂' },
  { value: 'rounded', label: 'Rounded', icon: '▣' },
  { value: 'rectangle', label: 'Rectangle', icon: '▬' },
  { value: 'full-width', label: 'Full Width', icon: '◻' },
  { value: 'background', label: 'Background', icon: '⊡' },
] as const;

function Photo3DLayoutSelector({ value, onChange }: Photo3DLayoutSelectorProps) {
  const currentVal = value || 'arch';
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
        <Layout className="w-3.5 h-3.5 text-amber-600" /> Photo Layout Style
      </label>
      <div className="grid grid-cols-5 gap-1 p-1.5 rounded-xl border border-slate-200 bg-slate-100/70 shadow-inner">
        {PHOTO_SHAPE_OPTIONS.map(opt => {
          const isActive = currentVal === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`py-1.5 px-0.5 rounded-lg text-[8px] font-black transition-all duration-200 flex flex-col items-center justify-center gap-0.5 leading-tight cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border border-slate-900 shadow-sm font-black scale-95'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
              }`}
            >
              <span className="text-[13px] leading-none font-bold">{opt.icon}</span>
              <span className="text-center truncate w-full text-[8px] font-extrabold">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Off-White System Theme Image Position Alignment Selector
interface ImagePositionSelectorProps {
  value: 'top' | 'center' | 'bottom';
  onChange: (pos: 'top' | 'center' | 'bottom') => void;
}

function ImagePositionSelector({ value, onChange }: ImagePositionSelectorProps) {
  const currentVal = value || 'bottom';
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
        <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-amber-600" /> Page Position Alignment
      </label>
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl border border-slate-200 bg-slate-100/70 shadow-inner">
        {[
          { id: 'top', label: 'Top', icon: ArrowUp },
          { id: 'center', label: 'Center', icon: Circle },
          { id: 'bottom', label: 'Bottom', icon: ArrowDown },
        ].map(opt => {
          const isActive = currentVal === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id as 'top' | 'center' | 'bottom')}
              className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border border-slate-900 shadow-xs font-black'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Off-White System Theme Unified Photo Controls Panel
interface UnifiedPhotoControlsProps {
  photoUrl?: string;
  frameShape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  photoHeight: number;
  photoWidth: number;
  photoFocalY: number;
  bgOpacity?: number;
  imagePosition?: 'top' | 'center' | 'bottom';
  onOpenAddModal: () => void;
  onDeletePhoto: () => void;
  onChangeShape: (shape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background') => void;
  onChangePosition?: (pos: 'top' | 'center' | 'bottom') => void;
  onChangeFocalY: (focalY: number) => void;
  onChangeBgOpacity?: (opacity: number) => void;
  onChangeHeight: (height: number) => void;
  onChangeWidth: (width: number) => void;
}

function UnifiedPhotoControls({
  photoUrl,
  frameShape,
  photoHeight,
  photoWidth,
  photoFocalY,
  bgOpacity = 40,
  imagePosition = 'bottom',
  onOpenAddModal,
  onDeletePhoto,
  onChangeShape,
  onChangePosition,
  onChangeFocalY,
  onChangeBgOpacity,
  onChangeHeight,
  onChangeWidth
}: UnifiedPhotoControlsProps) {
  return (
    <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <span className="text-[10px] uppercase font-black tracking-wider text-slate-900 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-600" /> Photo &amp; Layout Controls
        </span>
        {photoUrl && (
          <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            Active Image
          </span>
        )}
      </div>

      {/* Add / Change / Delete Image */}
      <div className="flex items-center gap-2">
        {photoUrl && (
          <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-xs">
            <img src={photoUrl} alt="Thumbnail" crossOrigin="anonymous" className="w-full h-full object-cover bg-transparent" />
          </div>
        )}

        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#B88E4C] to-[#967236] hover:opacity-95 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <ImageIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{photoUrl ? 'Change Photo' : '+ Select Photo'}</span>
        </button>

        {photoUrl && (
          <button
            type="button"
            onClick={onDeletePhoto}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0 transition-all"
            title="Delete Photo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {photoUrl && (
        <>
          {/* Photo Layout Style Selector */}
          <Photo3DLayoutSelector
            value={frameShape}
            onChange={onChangeShape}
          />

          {/* Page Image Position Alignment (Top / Center / Bottom) */}
          {onChangePosition && frameShape !== 'background' && (
            <ImagePositionSelector
              value={imagePosition}
              onChange={onChangePosition}
            />
          )}

          {/* Smooth Photo Focus (Up / Down) Percentage Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[10px] text-slate-700 font-extrabold">
              <span className="flex items-center gap-1 text-slate-900">
                <MoveVertical className="w-3.5 h-3.5 text-amber-600" /> Photo Focus (Up / Down)
              </span>
              <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{photoFocalY}%</span>
            </div>
            
            <input
              type="range" min="0" max="100"
              value={photoFocalY}
              onChange={(e) => onChangeFocalY(Number(e.target.value))}
              className="w-full accent-amber-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Background Opacity Blending Slider */}
          {frameShape === 'background' && onChangeBgOpacity && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80">
              <div className="flex items-center justify-between text-[10px] text-amber-950 font-extrabold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Background Opacity
                </span>
                <span className="font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">{bgOpacity}%</span>
              </div>
              <input
                type="range" min="0" max="100"
                value={bgOpacity}
                onChange={(e) => onChangeBgOpacity(Number(e.target.value))}
                className="w-full accent-amber-600 bg-amber-200 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          )}

          {/* Photo Height / Background Page Height Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[10px] text-slate-700 font-extrabold">
              <span className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" /> 
                {frameShape === 'background' ? 'Background Page Height' : 'Photo Height'}
              </span>
              <span className="font-mono text-amber-900">{photoHeight}px</span>
            </div>
            <input
              type="range" min={frameShape === 'background' ? '400' : '100'} max={frameShape === 'background' ? '1400' : '800'}
              value={photoHeight}
              onChange={(e) => onChangeHeight(Number(e.target.value))}
              className="w-full accent-amber-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Photo Width Slider */}
          {['arch', 'rounded', 'rectangle'].includes(frameShape) && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-[10px] text-slate-700 font-extrabold">
                <span className="flex items-center gap-1">
                  <MoveHorizontal className="w-3.5 h-3.5 text-amber-600" /> Photo Width
                </span>
                <span className="font-mono text-amber-900">{photoWidth}%</span>
              </div>
              <input
                type="range" min="30" max="100"
                value={photoWidth}
                onChange={(e) => onChangeWidth(Number(e.target.value))}
                className="w-full accent-amber-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Unified Section Image Slot Component
interface SectionImageRendererProps {
  photo?: string;
  frameShape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  photoHeight: number;
  photoWidth: number;
  photoFocalY: number;
  bgOpacity?: number;
  pageBgColor?: string;
  isBottomFlush?: boolean;
  altText?: string;
}

function SectionImageRenderer({
  photo,
  frameShape,
  photoHeight,
  photoWidth,
  photoFocalY,
  bgOpacity = 40,
  pageBgColor = '#FFFFFF',
  isBottomFlush = false,
  altText = 'Section Photo'
}: SectionImageRendererProps) {
  if (!photo) return null;

  if (frameShape === 'background') {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden w-full h-full pointer-events-none select-none">
        <img
          src={photo}
          alt={altText}
          crossOrigin="anonymous"
          className="w-full h-full object-cover block"
          style={{ objectPosition: `50% ${photoFocalY}%` }}
        />
        {/* Background Opacity Blends cleanly with pageBgColor */}
        <div 
          className="absolute inset-0 z-0 transition-opacity duration-200" 
          style={{ 
            backgroundColor: pageBgColor, 
            opacity: 1 - ((bgOpacity ?? 40) / 100) 
          }} 
        />
      </div>
    );
  }

  if (frameShape === 'full-width') {
    return (
      <div className={`-mx-12 w-[794px] overflow-hidden ${isBottomFlush ? '-mb-10 mt-4' : 'my-4'}`}>
        <img
          src={photo}
          alt={altText}
          crossOrigin="anonymous"
          className="w-full object-cover block shadow-xs"
          style={{ height: `${photoHeight}px`, objectPosition: `50% ${photoFocalY}%` }}
        />
      </div>
    );
  }

  const shapeClass =
    frameShape === 'arch' ? 'rounded-t-[999px] rounded-b-none' :
    frameShape === 'rectangle' ? 'rounded-none' :
    'rounded-2xl';

  return (
    <div className={`w-full flex justify-center ${isBottomFlush ? '-mb-10 mt-4' : 'my-4'}`}>
      <div
        className={`overflow-hidden shadow-md relative transition-all duration-200 ${shapeClass}`}
        style={{
          width: `${photoWidth}%`,
          height: `${photoHeight}px`,
        }}
      >
        <img
          src={photo}
          alt={altText}
          crossOrigin="anonymous"
          className="w-full h-full object-cover bg-transparent"
          style={{ objectPosition: `50% ${photoFocalY}%` }}
        />
      </div>
    </div>
  );
}

function StudioCoreAiryBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState(DEFAULT_AIRY_PROPOSAL);
  const [userId, setUserId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [openCard, setOpenCard] = useState<string | null>('cover');

  // Custom Event Types State
  const [customEventTypes, setCustomEventTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wg_custom_event_types');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return ['Wedding', 'Pre-Wedding', 'Destination Wedding', 'Engagement', 'Haldi & Sangeet'];
  });

  // Mobile Bottom Sheet Drawer State
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Viewport Zoom & Scaling Engine
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [pdfToastMessage, setPdfToastMessage] = useState<string | null>(null);

  // Responsive Auto-Scale Calculation
  const autoFitScale = () => {
    if (mainContainerRef.current) {
      const availableWidth = mainContainerRef.current.clientWidth - 32;
      if (availableWidth < 794 && availableWidth > 200) {
        const fitScale = Math.max(0.35, Math.min(1.0, Number((availableWidth / 794).toFixed(2))));
        setZoomScale(fitScale);
      } else {
        setZoomScale(1.0);
      }
    }
  };

  useEffect(() => {
    autoFitScale();
    window.addEventListener('resize', autoFitScale);
    return () => window.removeEventListener('resize', autoFitScale);
  }, []);

  // Media Gallery Modal State
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeTargetField, setActiveTargetField] = useState<string | null>(null);

  // Load Custom Fonts from API on initial mount
  useEffect(() => {
    loadCustomFontsFromAPI();
  }, []);

  useEffect(() => {
    if (data.primaryFont) registerFontFace({ name: data.primaryFont.replace(/['"]/g, '').split(',')[0], family: data.primaryFont, category: 'Luxury Serif' });
    if (data.secondaryFont) registerFontFace({ name: data.secondaryFont.replace(/['"]/g, '').split(',')[0], family: data.secondaryFont, category: 'Minimal Sans-Serif' });
  }, [data.primaryFont, data.secondaryFont]);

  // Handle Event Type Selection
  const handleEventTypeChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      const newType = prompt('Enter custom event type name (e.g. Sangeet Shoot, Destination Pre-Wedding):');
      if (newType && newType.trim()) {
        const trimmed = newType.trim();
        const updatedList = Array.from(new Set([...customEventTypes, trimmed]));
        setCustomEventTypes(updatedList);
        localStorage.setItem('wg_custom_event_types', JSON.stringify(updatedList));
        setData(prev => ({ ...prev, cover: { ...prev.cover, eventType: trimmed } }));
      }
    } else {
      setData(prev => ({ ...prev, cover: { ...prev.cover, eventType: val } }));
    }
  };

  // BULLETPROOF FAIL-SAFE DYNAMIC HEIGHT PDF EXPORT ENGINE
  const handleDownloadPDFCanvas = async () => {
    if (!canvasRef.current) return;
    const previousScale = zoomScale;
    setIsExportingPDF(true);
    setPdfToastMessage('Generating High-Res PDF...');

    // Lock zoomScale to 1.0 & enable PDF capture CSS
    setZoomScale(1.0);
    document.body.classList.add('pdf-capture-active');

    try {
      // Fast font readiness timeout (max 500ms) to ensure execution never hangs
      await Promise.race([
        ensureFontsReady(),
        new Promise(r => setTimeout(r, 500))
      ]);

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const pageElements = document.querySelectorAll('.quotation-page');
      if (!pageElements.length) throw new Error('No quotation pages found');

      let pdf: InstanceType<typeof jsPDF> | null = null;

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        const widthPx = 794;
        const heightPx = pageEl.offsetHeight || 1123;

        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: activeTheme.background || '#FFFFFF',
            windowWidth: widthPx,
            onclone: (clonedDoc, clonedElement) => {
              // 1. Flatten essential computed styles to inline attributes on all elements
              const allElements = clonedElement.querySelectorAll('*');
              const propertiesToCopy = [
                'color', 'backgroundColor', 'borderColor', 'borderStyle', 'borderWidth', 'borderRadius',
                'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
                'whiteSpace', 'wordBreak',
                'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap', 'flexGrow', 'flexShrink',
                'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
                'position', 'top', 'right', 'bottom', 'left', 'zIndex',
                'opacity', 'visibility', 'overflow', 'boxShadow',
                'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'
              ];

              allElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                try {
                  const style = window.getComputedStyle(htmlEl);
                  const isHeading = ['H1', 'H2', 'H3'].includes(htmlEl.tagName) || 
                                    htmlEl.classList.contains('brand-name-heading') || 
                                    htmlEl.classList.contains('couple-name-heading');
                  propertiesToCopy.forEach((prop) => {
                    // @ts-ignore
                    let val = style[prop];
                    if (isHeading && prop === 'letterSpacing') {
                      val = 'normal';
                    }
                    if (isHeading && prop === 'whiteSpace') {
                      val = 'nowrap';
                    }
                    if (isHeading && prop === 'wordBreak') {
                      val = 'keep-all';
                    }
                    if (val) {
                      if (val.includes('oklch') || val.includes('oklab') || val.includes('okl')) {
                        // Replace oklch/oklab color with grey/text standard color values if computed style returns it
                        const sanitized = val
                          .replace(/oklch\([^)]+\)/g, 'rgb(128, 128, 128)')
                          .replace(/oklab\([^)]+\)/g, 'rgb(128, 128, 128)');
                        // @ts-ignore
                        htmlEl.style[prop] = sanitized;
                      } else {
                        // @ts-ignore
                        htmlEl.style[prop] = val;
                      }
                    }
                  });
                } catch (e) {
                  // ignore style read errors
                }
              });

              // 2. Completely remove all style tags and link tags to prevent html2canvas from fetching/parsing oklab/oklch colors!
              try {
                const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
                styles.forEach((node) => {
                  node.parentNode?.removeChild(node);
                });
              } catch (err) {
                console.warn('Stylesheet removal warning:', err);
              }
            }
          });
        } catch (canvasErr) {
          console.warn(`Fallback render for page ${i + 1}:`, canvasErr);
          // Fallback render without CORS strictness
          canvas = await html2canvas(pageEl, { scale: 1.5, logging: false });
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i === 0) {
          pdf = new jsPDF({
            unit: 'px',
            format: [widthPx, heightPx],
            orientation: 'portrait',
            compress: true
          });
        } else {
          pdf?.addPage([widthPx, heightPx], 'portrait');
        }

        pdf?.addImage(imgData, 'JPEG', 0, 0, widthPx, heightPx, undefined, 'FAST');
      }

      if (pdf) {
        pdf.save(`${data?.designName || 'StudioCore_Quotation'}.pdf`);
        setPdfToastMessage('PDF Downloaded Successfully!');
        setTimeout(() => setPdfToastMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('PDF Final Error:', err);
      alert('PDF Generation Fallback: ' + (err?.message || 'Unknown error'));
      setPdfToastMessage(null);
    } finally {
      document.body.classList.remove('pdf-capture-active');
      setZoomScale(previousScale);
      setIsExportingPDF(false);
    }
  };

  // Load User Session & Proposal
  useEffect(() => {
    async function initUserAndLoadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);

        const { data: qData } = await supabase
          .from('quotations')
          .select('content_json, title')
          .eq('workspace_id', currentUserId)
          .eq('quotation_number', 'FW-2026-001')
          .maybeSingle();

        if (qData?.content_json) {
          setData(qData.content_json);
        } else {
          const localSaved = localStorage.getItem(`wg_proposal_draft_${currentUserId}`);
          if (localSaved) {
            try {
              setData(JSON.parse(localSaved));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Initialization error:', err);
      }
    }
    initUserAndLoadData();
  }, []);

  // Real-Time Auto Save
  useEffect(() => {
    if (!userId) return;

    setAutoSaveStatus('Saving...');
    setHasUnsavedChanges(true);

    const timer = setTimeout(async () => {
      try {
        localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(data));
        
        const subtotal = data.pricePayment.packagePrice;
        const discountAmt = (subtotal * data.pricePayment.discountPct) / 100;
        const discountedSubtotal = subtotal - discountAmt;
        const gstAmt = (discountedSubtotal * data.pricePayment.gstPct) / 100;
        const grandTotal = Math.round(discountedSubtotal + gstAmt);

        await supabase.from('quotations').upsert({
          workspace_id: userId,
          quotation_number: 'FW-2026-001',
          title: data.designName,
          client_name: `${data.cover.groomName} & ${data.cover.brideName}`,
          content_json: data,
          financials: { total_amount: grandTotal, subtotal, gst_rate: data.pricePayment.gstPct },
          status: 'draft',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,quotation_number' });

        setHasUnsavedChanges(false);
        setAutoSaveStatus('Auto-saved');
      } catch (err) {
        setAutoSaveStatus('Saved locally');
        setHasUnsavedChanges(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, userId]);

  const openAddImageModal = (target: string) => {
    setActiveTargetField(target);
    setMediaModalOpen(true);
  };

  const handleSelectImageFromGallery = (url: string) => {
    if (!activeTargetField) return;

    if (activeTargetField === 'coverLogo') {
      setData(prev => ({ ...prev, cover: { ...prev.cover, brandLogoUrl: url } }));
    } else if (activeTargetField === 'coverPhoto') {
      setData(prev => ({ ...prev, cover: { ...prev.cover, photoUrl: url } }));
    } else if (activeTargetField === 'aboutUsBanner') {
      setData(prev => ({ ...prev, aboutUs: { ...prev.aboutUs, bottomBannerPhoto: url } }));
    } else if (activeTargetField === 'shootPhoto') {
      setData(prev => ({ ...prev, shootDetails: { ...prev.shootDetails, photo: url } }));
    } else if (activeTargetField === 'includedPhoto') {
      setData(prev => ({ ...prev, whatsIncluded: { ...prev.whatsIncluded, photo: url } }));
    } else if (activeTargetField === 'pricePhoto') {
      setData(prev => ({ ...prev, pricePayment: { ...prev.pricePayment, photo: url } }));
    } else if (activeTargetField === 'addOnsPhoto') {
      setData(prev => ({ ...prev, addOnsTable: { ...prev.addOnsTable, photo: url } }));
    } else if (activeTargetField === 'timelinePhoto') {
      setData(prev => ({ ...prev, timelineTable: { ...prev.timelineTable, photo: url } }));
    } else if (activeTargetField === 'termsPhoto') {
      setData(prev => ({ ...prev, termsAndThankYou: { ...prev.termsAndThankYou, photo: url } }));
    }

    setMediaModalOpen(false);
  };

  // Smart Dynamic Theme Resolution
  const activeTheme = COLOR_THEMES.find(t => t.name === data.look || t.id === data.look) || COLOR_THEMES[0];
  
  const pageBgColor = activeTheme.background;
  const textColor = activeTheme.primary || activeTheme.text;
  const kickerColor = activeTheme.kicker;
  const borderColor = activeTheme.borderColor;
  const boxBgColor = activeTheme.boxBgColor;
  const isDark = !!activeTheme.isDark;

  const subtotal = data.pricePayment.packagePrice;
  const discountAmt = (subtotal * data.pricePayment.discountPct) / 100;
  const discountedSubtotal = subtotal - discountAmt;
  const gstAmt = (discountedSubtotal * data.pricePayment.gstPct) / 100;
  const grandTotal = Math.round(discountedSubtotal + gstAmt);

  const handleManualSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(data));

      await supabase.from('quotations').upsert({
        workspace_id: userId || 'demo_user',
        quotation_number: 'FW-2026-001',
        title: data.designName,
        client_name: `${data.cover.groomName} & ${data.cover.brideName}`,
        content_json: data,
        financials: { total_amount: grandTotal, subtotal, gst_rate: data.pricePayment.gstPct },
        status: 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,quotation_number' });

      setHasUnsavedChanges(false);
      setAutoSaveStatus('Saved');
      alert('Quotation proposal saved to your workspace!');
    } catch {
      alert('Saved locally!');
    } finally {
      setSaving(false);
    }
  };

  // Sidebar Controls JSX block
  const renderSidebarControls = () => (
    <div className="space-y-4">
      {/* Design Name & COLOR PALETTE */}
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Design name</label>
          <input
            type="text"
            value={data.designName}
            onChange={(e) => setData({ ...data, designName: e.target.value })}
            className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
          />
        </div>

        {/* Canva-Style Visual COLOR PALETTE Selector (Full Width) */}
        <CanvaThemeSelector
          value={data.look}
          onChange={(themeName) => setData({ ...data, look: themeName })}
        />

        {/* Canva-Style Typography Customizers */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <span className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
            <Type className="w-3 h-3" /> Typography Engine
          </span>

          <CanvaFontSelector
            label="Main Font (Headings & Names)"
            value={data.primaryFont}
            onChange={(family, fontItem) => {
              registerFontFace(fontItem);
              setData({ ...data, primaryFont: family });
            }}
          />

          <CanvaFontSelector
            label="Sub Font (Body Text & Tables)"
            value={data.secondaryFont}
            onChange={(family, fontItem) => {
              registerFontFace(fontItem);
              setData({ ...data, secondaryFont: family });
            }}
          />
        </div>
      </div>

      {/* Accordion Cards */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-100">
        
        {/* 1. COVER PAGE CARD */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'cover' ? null : 'cover')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>1. Cover Page</span>
            </div>
            {openCard === 'cover' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'cover' && (
            <div className="p-3 space-y-3 bg-white">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Couple Names</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400">Groom Name</label>
                    <input
                      type="text"
                      value={data.cover.groomName}
                      placeholder="e.g. YASH"
                      onChange={(e) => setData({ ...data, cover: { ...data.cover, groomName: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400">Bride Name</label>
                    <input
                      type="text"
                      value={data.cover.brideName}
                      placeholder="e.g. TWINKLE"
                      onChange={(e) => setData({ ...data, cover: { ...data.cover, brideName: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Event Type Dropdown with Custom Event Option */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-400">Event Type</label>
                <select
                  value={data.cover.eventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                >
                  {customEventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add Custom Event Type...</option>
                </select>
              </div>

              {/* Brand Logo Section */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Brand Name &amp; Logo</span>
                <input
                  type="text"
                  value={data.cover.brandName}
                  placeholder="Brand Name (e.g. FILMIFY WEDDINGS)"
                  onChange={(e) => setData({ ...data, cover: { ...data.cover, brandName: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                />

                <div className="flex items-center gap-2">
                  {data.cover.brandLogoUrl && (
                    <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                      <img src={data.cover.brandLogoUrl} alt="Logo" crossOrigin="anonymous" className="w-full h-full object-contain bg-transparent" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openAddImageModal('coverLogo')}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    <span>{data.cover.brandLogoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  </button>

                  {data.cover.brandLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setData({ ...data, cover: { ...data.cover, brandLogoUrl: '' } })}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cover Unified Photo Controls */}
              <UnifiedPhotoControls
                photoUrl={data.cover.photoUrl}
                frameShape={data.cover.frameShape}
                photoHeight={data.cover.photoHeight}
                photoWidth={data.cover.photoWidth}
                photoFocalY={data.cover.photoFocalY}
                bgOpacity={data.cover.bgOpacity}
                imagePosition={data.cover.imagePosition}
                onOpenAddModal={() => openAddImageModal('coverPhoto')}
                onDeletePhoto={() => setData({ ...data, cover: { ...data.cover, photoUrl: '' } })}
                onChangeShape={(shape) => setData({ ...data, cover: { ...data.cover, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, cover: { ...data.cover, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, cover: { ...data.cover, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, cover: { ...data.cover, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, cover: { ...data.cover, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, cover: { ...data.cover, photoWidth: w } })}
              />

            </div>
          )}
        </div>

        {/* 2. About us Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'about' ? null : 'about')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span>2. About us</span>
            </div>
            {openCard === 'about' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'about' && (
            <div className="p-3 space-y-3 bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Text</label>
                <textarea
                  rows={3}
                  value={data.aboutUs.text}
                  onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, text: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                />
              </div>

              <UnifiedPhotoControls
                photoUrl={data.aboutUs.bottomBannerPhoto}
                frameShape={data.aboutUs.frameShape}
                photoHeight={data.aboutUs.bottomBannerHeight}
                photoWidth={data.aboutUs.photoWidth}
                photoFocalY={data.aboutUs.photoFocalY}
                bgOpacity={data.aboutUs.bgOpacity}
                imagePosition={data.aboutUs.imagePosition}
                onOpenAddModal={() => openAddImageModal('aboutUsBanner')}
                onDeletePhoto={() => setData({ ...data, aboutUs: { ...data.aboutUs, bottomBannerPhoto: '' } })}
                onChangeShape={(shape) => setData({ ...data, aboutUs: { ...data.aboutUs, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, aboutUs: { ...data.aboutUs, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, aboutUs: { ...data.aboutUs, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, aboutUs: { ...data.aboutUs, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, aboutUs: { ...data.aboutUs, bottomBannerHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, aboutUs: { ...data.aboutUs, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 3. Pre-Wedding Shoot Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'shoot' ? null : 'shoot')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-amber-700" />
              <span>3. Pre-Wedding</span>
            </div>
            {openCard === 'shoot' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'shoot' && (
            <div className="p-3 space-y-3 bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                <input
                  type="text"
                  value={data.shootDetails.heading || 'Pre-Wedding Shoot'}
                  onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, heading: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables Items</label>
                <textarea
                  rows={4}
                  value={data.shootDetails.deliverablesText || ''}
                  onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, deliverablesText: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none text-[11px]"
                />
              </div>

              <UnifiedPhotoControls
                photoUrl={data.shootDetails.photo}
                frameShape={data.shootDetails.frameShape}
                photoHeight={data.shootDetails.photoHeight}
                photoWidth={data.shootDetails.photoWidth}
                photoFocalY={data.shootDetails.photoFocalY}
                bgOpacity={data.shootDetails.bgOpacity}
                imagePosition={data.shootDetails.imagePosition}
                onOpenAddModal={() => openAddImageModal('shootPhoto')}
                onDeletePhoto={() => setData({ ...data, shootDetails: { ...data.shootDetails, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, shootDetails: { ...data.shootDetails, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, shootDetails: { ...data.shootDetails, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, shootDetails: { ...data.shootDetails, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, shootDetails: { ...data.shootDetails, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, shootDetails: { ...data.shootDetails, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, shootDetails: { ...data.shootDetails, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 4. What's included Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'included' ? null : 'included')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>4. What's included</span>
            </div>
            {openCard === 'included' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'included' && (
            <div className="p-3 space-y-3 bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables List</label>
                <textarea
                  rows={4}
                  value={data.whatsIncluded.deliverablesText}
                  onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, deliverablesText: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                />
              </div>

              <UnifiedPhotoControls
                photoUrl={data.whatsIncluded.photo}
                frameShape={data.whatsIncluded.frameShape}
                photoHeight={data.whatsIncluded.photoHeight}
                photoWidth={data.whatsIncluded.photoWidth}
                photoFocalY={data.whatsIncluded.photoFocalY}
                bgOpacity={data.whatsIncluded.bgOpacity}
                imagePosition={data.whatsIncluded.imagePosition}
                onOpenAddModal={() => openAddImageModal('includedPhoto')}
                onDeletePhoto={() => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 5. Price & Payment Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'price' ? null : 'price')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
              <span>5. Price &amp; payment</span>
            </div>
            {openCard === 'price' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'price' && (
            <div className="p-3 space-y-3 bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Package Price (₹)</label>
                <input
                  type="number"
                  value={data.pricePayment.packagePrice}
                  onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, packagePrice: Number(e.target.value) || 0 } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                />
              </div>

              <UnifiedPhotoControls
                photoUrl={data.pricePayment.photo}
                frameShape={data.pricePayment.frameShape}
                photoHeight={data.pricePayment.photoHeight}
                photoWidth={data.pricePayment.photoWidth}
                photoFocalY={data.pricePayment.photoFocalY}
                bgOpacity={data.pricePayment.bgOpacity}
                imagePosition={data.pricePayment.imagePosition}
                onOpenAddModal={() => openAddImageModal('pricePhoto')}
                onDeletePhoto={() => setData({ ...data, pricePayment: { ...data.pricePayment, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, pricePayment: { ...data.pricePayment, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, pricePayment: { ...data.pricePayment, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, pricePayment: { ...data.pricePayment, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, pricePayment: { ...data.pricePayment, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, pricePayment: { ...data.pricePayment, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, pricePayment: { ...data.pricePayment, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 6. Add-ons Table Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'addons' ? null : 'addons')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>6. Add-ons table</span>
            </div>
            {openCard === 'addons' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'addons' && (
            <div className="p-3 space-y-3 bg-white">
              <UnifiedPhotoControls
                photoUrl={data.addOnsTable.photo}
                frameShape={data.addOnsTable.frameShape}
                photoHeight={data.addOnsTable.photoHeight}
                photoWidth={data.addOnsTable.photoWidth}
                photoFocalY={data.addOnsTable.photoFocalY}
                bgOpacity={data.addOnsTable.bgOpacity}
                imagePosition={data.addOnsTable.imagePosition}
                onOpenAddModal={() => openAddImageModal('addOnsPhoto')}
                onDeletePhoto={() => setData({ ...data, addOnsTable: { ...data.addOnsTable, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, addOnsTable: { ...data.addOnsTable, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, addOnsTable: { ...data.addOnsTable, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, addOnsTable: { ...data.addOnsTable, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, addOnsTable: { ...data.addOnsTable, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, addOnsTable: { ...data.addOnsTable, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, addOnsTable: { ...data.addOnsTable, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 7. Timeline & Terms Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'terms' ? null : 'terms')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>7. Timeline &amp; Terms</span>
            </div>
            {openCard === 'terms' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'terms' && (
            <div className="p-3 space-y-3 bg-white">
              <UnifiedPhotoControls
                photoUrl={data.termsAndThankYou.photo}
                frameShape={data.termsAndThankYou.frameShape}
                photoHeight={data.termsAndThankYou.photoHeight}
                photoWidth={data.termsAndThankYou.photoWidth}
                photoFocalY={data.termsAndThankYou.photoFocalY}
                bgOpacity={data.termsAndThankYou.bgOpacity}
                imagePosition={data.termsAndThankYou.imagePosition}
                onOpenAddModal={() => openAddImageModal('termsPhoto')}
                onDeletePhoto={() => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, termsAndThankYou: { ...data.termsAndThankYou, photoWidth: w } })}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 font-sans flex flex-col overflow-hidden selection:bg-black selection:text-white relative">
      
      {/* ── SLEEK PDF TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {pdfToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700"
          >
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>{pdfToastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRINT & STRICT PRINT-COLOR ADJUST CSS ── */}
      <style jsx global>{`
        @media print, .pdf-capture-active {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .pdf-capture-active h1,
        .pdf-capture-active h2,
        .pdf-capture-active h3,
        .pdf-capture-active .brand-name-heading,
        .pdf-capture-active .couple-name-heading {
          white-space: nowrap !important;
          word-break: keep-all !important;
          letter-spacing: normal !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, .no-print, button, nav, .page-indicator {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .proposal-canvas-container {
            transform: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page-section.cover-page, .quotation-page.cover-page {
            width: 794px !important;
            height: 1123px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .a4-page-section.content-page, .quotation-page.content-page {
            width: 794px !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <header className="h-12 bg-white border-b border-zinc-200 px-3 sm:px-5 flex items-center justify-between shrink-0 z-50 shadow-xs no-print">
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="text"
            value={data.designName}
            onChange={(e) => { setData({ ...data, designName: e.target.value }); }}
            className="text-xs font-bold text-zinc-900 bg-transparent focus:outline-none focus:border-b border-black py-0.5 max-w-[150px] sm:max-w-[320px] truncate"
          />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border hidden sm:inline-block ${
            hasUnsavedChanges ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {autoSaveStatus}
          </span>
        </div>

        {/* Viewport Zoom Controls */}
        <div className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-full border border-zinc-200 text-[10px] font-bold text-zinc-700">
          <button 
            type="button" 
            onClick={() => setZoomScale(s => Math.max(0.35, Number((s - 0.1).toFixed(2))))} 
            className="p-1 hover:bg-zinc-200 rounded-full transition-all cursor-pointer" 
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3 text-zinc-600" />
          </button>
          <span className="w-8 sm:w-10 text-center font-mono font-bold text-zinc-800 text-[10px]">{Math.round(zoomScale * 100)}%</span>
          <button 
            type="button" 
            onClick={() => setZoomScale(s => Math.min(1.5, Number((s + 0.1).toFixed(2))))} 
            className="p-1 hover:bg-zinc-200 rounded-full transition-all cursor-pointer" 
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3 text-zinc-600" />
          </button>
          <button 
            type="button" 
            onClick={autoFitScale} 
            className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded-md text-[9px] hover:bg-zinc-50 cursor-pointer transition-all hidden sm:inline-block" 
          >
            Fit
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleDownloadPDFCanvas}
            disabled={isExportingPDF}
            className="px-3 sm:px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-[10px] sm:text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Download High-Res PDF"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" /> <span>Download PDF</span>
          </button>

          <button
            onClick={handleManualSave}
            disabled={saving}
            className="px-3 sm:px-4 py-1 rounded-full bg-black hover:bg-zinc-800 text-white text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" /> {saving ? '...' : 'Save'}
          </button>

          <Link
            href="/workspace/quotations"
            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE VIEWPORT ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR PANEL (>= 768px) */}
        <aside className="w-[320px] bg-white border-r border-zinc-200 p-4 overflow-y-auto shrink-0 text-xs shadow-sm no-print hidden md:block">
          {renderSidebarControls()}
        </aside>

        {/* CENTER LIVE PROPOSAL DOCUMENT CANVAS */}
        <main 
          ref={mainContainerRef}
          className="flex-1 bg-[#EBECEF] p-2 sm:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start space-y-8 pb-20 md:pb-8"
        >
          
          {/* Scaled A4 Container Wrapper */}
          <div 
            id="quotation-canvas-container"
            className="proposal-canvas-container flex flex-col items-center space-y-12 transition-transform duration-200 origin-top"
            style={{ 
              transform: `scale(${zoomScale})`, 
              transformOrigin: 'top center',
              width: '794px',
              marginBottom: `${(zoomScale - 1) * 2000}px`
            }}
            ref={canvasRef}
          >

            {/* PAGE 1: COVER PAGE */}
            <div 
              className="quotation-page a4-page-section cover-page w-[794px] h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col items-center justify-between text-center transition-colors duration-300 border border-zinc-300/60 select-none"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.cover.frameShape === 'background' ? `${data.cover.photoHeight || 1123}px` : '1123px'
              }}
            >
              {data.cover.photoUrl && data.cover.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.cover.photoUrl}
                  frameShape="background"
                  photoHeight={data.cover.photoHeight}
                  photoWidth={data.cover.photoWidth}
                  photoFocalY={data.cover.photoFocalY}
                  bgOpacity={data.cover.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Cover Background"
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-between h-full w-full p-12 py-16 text-center my-auto">
                <div className="w-full flex flex-col items-center justify-center space-y-2">
                  {data.cover.brandLogoUrl ? (
                    <img 
                      src={data.cover.brandLogoUrl} 
                      alt={data.cover.brandName}
                      crossOrigin="anonymous"
                      className="bg-transparent object-contain drop-shadow-xs"
                      style={{ height: `${data.cover.brandLogoSize || 64}px` }}
                    />
                  ) : (
                    <div className="text-center space-y-0.5">
                      <div className="brand-name-heading text-xl tracking-[0.25em] uppercase font-black whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                        {data.cover.brandName || 'FILMIFY WEDDINGS'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-6 flex flex-col items-center justify-center my-auto">
                  
                  {/* TOP POSITION IMAGE */}
                  {data.cover.photoUrl && data.cover.frameShape !== 'background' && data.cover.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.cover.photoUrl}
                      frameShape={data.cover.frameShape}
                      photoHeight={data.cover.photoHeight}
                      photoWidth={data.cover.photoWidth}
                      photoFocalY={data.cover.photoFocalY}
                      altText="Wedding Couple"
                    />
                  )}

                  <div className="space-y-1">
                    <h1 className="couple-name-heading text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.cover.groomName || 'YASH'}
                    </h1>
                    <div className="text-2xl font-serif opacity-75 my-1" style={{ color: kickerColor }}>&amp;</div>
                    <h1 className="couple-name-heading text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.cover.brideName || 'TWINKLE'}
                    </h1>
                  </div>

                  {/* CENTER POSITION IMAGE (DEFAULT) */}
                  {data.cover.photoUrl && data.cover.frameShape !== 'background' && (data.cover.imagePosition === 'center' || !data.cover.imagePosition) && (
                    <SectionImageRenderer
                      photo={data.cover.photoUrl}
                      frameShape={data.cover.frameShape}
                      photoHeight={data.cover.photoHeight}
                      photoWidth={data.cover.photoWidth}
                      photoFocalY={data.cover.photoFocalY}
                      altText="Wedding Couple"
                    />
                  )}

                  <div className="space-y-2 pt-2">
                    <h3 className="text-base tracking-[0.2em] uppercase font-bold whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                    </h3>
                    <p className="text-xs tracking-[0.18em] uppercase font-medium opacity-90 whitespace-nowrap" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                      {`${(data.cover.sideOption || 'BOTH SIDES').toUpperCase()} – ${(data.cover.locationName || 'MUMBAI').toUpperCase()}`}
                    </p>
                  </div>

                  {/* BOTTOM POSITION IMAGE */}
                  {data.cover.photoUrl && data.cover.frameShape !== 'background' && data.cover.imagePosition === 'bottom' && (
                    <SectionImageRenderer
                      photo={data.cover.photoUrl}
                      frameShape={data.cover.frameShape}
                      photoHeight={data.cover.photoHeight}
                      photoWidth={data.cover.photoWidth}
                      photoFocalY={data.cover.photoFocalY}
                      altText="Wedding Couple"
                    />
                  )}

                </div>

                <div className="w-full pt-4 text-[10px] tracking-[0.2em] font-mono font-bold uppercase opacity-80 whitespace-nowrap" style={{ color: kickerColor }}>
                  EXCLUSIVELY PREPARED FOR YOU
                </div>
              </div>
            </div>

            {/* PAGE 2: ABOUT US */}
            <div 
              className={`quotation-page a4-page-section content-page w-[794px] h-auto min-h-0 shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 ${data.aboutUs.imagePosition === 'bottom' ? 'px-12 pt-10 pb-0' : 'p-12 py-10'}`}
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.aboutUs.frameShape === 'background' ? `${data.aboutUs.bottomBannerHeight || 500}px` : undefined
              }}
            >
              {data.aboutUs.bottomBannerPhoto && data.aboutUs.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.aboutUs.bottomBannerPhoto}
                  frameShape="background"
                  photoHeight={data.aboutUs.bottomBannerHeight}
                  photoWidth={data.aboutUs.photoWidth}
                  photoFocalY={data.aboutUs.photoFocalY}
                  bgOpacity={data.aboutUs.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="About Us Background"
                />
              )}

              <div className="absolute top-6 right-10 pointer-events-none opacity-85 z-10">
                <img 
                  src="/images/Birds.svg" 
                  alt="Birds" 
                  crossOrigin="anonymous"
                  className="w-[220px] h-auto object-contain block" 
                  style={{ 
                    filter: isDark ? 'brightness(0) invert(1)' : 'none',
                    color: textColor
                  }} 
                />
              </div>

              <div className="space-y-6 my-auto text-center w-full relative z-10 pt-4">
                
                {/* TOP IMAGE POSITION */}
                {data.aboutUs.bottomBannerPhoto && data.aboutUs.frameShape !== 'background' && data.aboutUs.imagePosition === 'top' && (
                  <SectionImageRenderer
                    photo={data.aboutUs.bottomBannerPhoto}
                    frameShape={data.aboutUs.frameShape}
                    photoHeight={data.aboutUs.bottomBannerHeight}
                    photoWidth={data.aboutUs.photoWidth}
                    photoFocalY={data.aboutUs.photoFocalY}
                    altText="About Us Banner"
                  />
                )}

                <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.aboutUs.kicker || 'INTRODUCTION'}
                </span>
                
                <h2 className="text-3xl tracking-widest uppercase font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.aboutUs.heading || 'ABOUT US'}
                </h2>

                {/* CENTER IMAGE POSITION */}
                {data.aboutUs.bottomBannerPhoto && data.aboutUs.frameShape !== 'background' && data.aboutUs.imagePosition === 'center' && (
                  <SectionImageRenderer
                    photo={data.aboutUs.bottomBannerPhoto}
                    frameShape={data.aboutUs.frameShape}
                    photoHeight={data.aboutUs.bottomBannerHeight}
                    photoWidth={data.aboutUs.photoWidth}
                    photoFocalY={data.aboutUs.photoFocalY}
                    altText="About Us Banner"
                  />
                )}

                <div className="flex flex-col items-center justify-center my-4 select-none">
                  <img 
                    src="/images/A%26U.svg" 
                    alt="Monogram" 
                    crossOrigin="anonymous"
                    className="w-[260px] h-auto object-contain block mx-auto" 
                    style={{ 
                      filter: isDark ? 'brightness(0) invert(1)' : 'none',
                      color: textColor
                    }} 
                  />
                </div>

                <div className="my-6 px-6 flex items-center justify-center gap-3 max-w-xl mx-auto text-center">
                  <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>“</span>
                  <p className="text-sm leading-relaxed font-normal opacity-90 tracking-wide" style={{ color: textColor, fontFamily: data.secondaryFont }}>
                    {data.aboutUs.text}
                  </p>
                  <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>”</span>
                </div>

                <div className="text-xs tracking-[0.2em] font-bold uppercase pt-2 whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.aboutUs.signature}
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.aboutUs.bottomBannerPhoto && data.aboutUs.frameShape !== 'background' && (data.aboutUs.imagePosition === 'bottom' || !data.aboutUs.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.aboutUs.bottomBannerPhoto}
                    frameShape={data.aboutUs.frameShape}
                    photoHeight={data.aboutUs.bottomBannerHeight}
                    photoWidth={data.aboutUs.photoWidth}
                    photoFocalY={data.aboutUs.photoFocalY}
                    isBottomFlush={true}
                    altText="About Us Banner"
                  />
                )}
              </div>
            </div>

            {/* PAGE 3: PRE-WEDDING SHOOT */}
            <div 
              className={`quotation-page a4-page-section content-page w-[794px] h-auto min-h-0 shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 ${data.shootDetails.imagePosition === 'bottom' ? 'px-12 pt-10 pb-0' : 'p-12 py-10'}`}
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.shootDetails.frameShape === 'background' ? `${data.shootDetails.photoHeight || 500}px` : undefined
              }}
            >
              {data.shootDetails.photo && data.shootDetails.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.shootDetails.photo}
                  frameShape="background"
                  photoHeight={data.shootDetails.photoHeight}
                  photoWidth={data.shootDetails.photoWidth}
                  photoFocalY={data.shootDetails.photoFocalY}
                  bgOpacity={data.shootDetails.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Pre-Wedding Background"
                />
              )}

              <div className="relative z-10 space-y-6 my-auto w-full pt-2">
                
                {/* TOP IMAGE POSITION */}
                {data.shootDetails.photo && data.shootDetails.frameShape !== 'background' && data.shootDetails.imagePosition === 'top' && (
                  <SectionImageRenderer
                    photo={data.shootDetails.photo}
                    frameShape={data.shootDetails.frameShape}
                    photoHeight={data.shootDetails.photoHeight}
                    photoWidth={data.shootDetails.photoWidth}
                    photoFocalY={data.shootDetails.photoFocalY}
                    altText="Pre-Wedding Photo"
                  />
                )}

                <div className="text-center space-y-2">
                  <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap" style={{ color: kickerColor }}>
                    {data.shootDetails.kicker || 'WHAT WE DO'}
                  </span>
                  <h2 className="text-4xl tracking-wide font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.shootDetails.heading || 'Pre-Wedding Shoot'}
                  </h2>
                </div>

                {/* CENTER IMAGE POSITION */}
                {data.shootDetails.photo && data.shootDetails.frameShape !== 'background' && data.shootDetails.imagePosition === 'center' && (
                  <SectionImageRenderer
                    photo={data.shootDetails.photo}
                    frameShape={data.shootDetails.frameShape}
                    photoHeight={data.shootDetails.photoHeight}
                    photoWidth={data.shootDetails.photoWidth}
                    photoFocalY={data.shootDetails.photoFocalY}
                    altText="Pre-Wedding Photo"
                  />
                )}

                <div className="space-y-3 max-w-lg mx-auto pl-4">
                  <p className="text-base font-bold tracking-wide flex items-center gap-2" style={{ color: textColor }}>
                    <Camera className="w-4 h-4" style={{ color: kickerColor }} />
                    <span>{data.shootDetails.daysText || '1 Day Shoot'}</span>
                  </p>
                  <ul className="space-y-2 list-disc list-inside text-sm font-normal opacity-90 leading-relaxed">
                    {(data.shootDetails.crewText || 'Candid Photography\nCinematography\nPortable Changing Room')
                      .split('\n').filter(Boolean).map((item, idx) => (
                        <li key={idx} className="tracking-wide" style={{ color: textColor }}><span className="font-medium ml-1">{item.trim()}</span></li>
                      ))}
                  </ul>
                </div>

                <div className="pt-2 space-y-3 max-w-lg mx-auto pl-4">
                  <h3 className="text-2xl tracking-wide font-normal text-left whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.shootDetails.deliverablesHeading || 'Deliverables'}
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm font-normal opacity-90 leading-relaxed">
                    {(data.shootDetails.deliverablesText || 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel')
                      .split('\n').filter(Boolean).map((item, idx) => (
                        <li key={idx} className="tracking-wide" style={{ color: textColor }}><span className="font-medium ml-1">{item.trim()}</span></li>
                      ))}
                  </ul>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.shootDetails.photo && data.shootDetails.frameShape !== 'background' && (data.shootDetails.imagePosition === 'bottom' || !data.shootDetails.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.shootDetails.photo}
                    frameShape={data.shootDetails.frameShape}
                    photoHeight={data.shootDetails.photoHeight}
                    photoWidth={data.shootDetails.photoWidth}
                    photoFocalY={data.shootDetails.photoFocalY}
                    isBottomFlush={true}
                    altText="Pre-Wedding Photo"
                  />
                )}
              </div>
            </div>

            {/* PAGE 4: WHAT'S INCLUDED */}
            <div 
              className={`quotation-page a4-page-section content-page w-[794px] h-auto min-h-0 shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 ${data.whatsIncluded.imagePosition === 'bottom' ? 'px-12 pt-10 pb-0' : 'p-12 py-10'}`}
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.whatsIncluded.frameShape === 'background' ? `${data.whatsIncluded.photoHeight || 500}px` : undefined
              }}
            >
              {data.whatsIncluded.photo && data.whatsIncluded.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.whatsIncluded.photo}
                  frameShape="background"
                  photoHeight={data.whatsIncluded.photoHeight}
                  photoWidth={data.whatsIncluded.photoWidth}
                  photoFocalY={data.whatsIncluded.photoFocalY}
                  bgOpacity={data.whatsIncluded.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Included Background"
                />
              )}

              <div className="relative z-10 space-y-6 my-auto w-full pt-2">
                
                {/* TOP IMAGE POSITION */}
                {data.whatsIncluded.photo && data.whatsIncluded.frameShape !== 'background' && data.whatsIncluded.imagePosition === 'top' && (
                  <SectionImageRenderer
                    photo={data.whatsIncluded.photo}
                    frameShape={data.whatsIncluded.frameShape}
                    photoHeight={data.whatsIncluded.photoHeight}
                    photoWidth={data.whatsIncluded.photoWidth}
                    photoFocalY={data.whatsIncluded.photoFocalY}
                    altText="Package Deliverables"
                  />
                )}

                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.whatsIncluded.kicker}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.whatsIncluded.heading}
                </h2>

                {/* CENTER IMAGE POSITION */}
                {data.whatsIncluded.photo && data.whatsIncluded.frameShape !== 'background' && data.whatsIncluded.imagePosition === 'center' && (
                  <SectionImageRenderer
                    photo={data.whatsIncluded.photo}
                    frameShape={data.whatsIncluded.frameShape}
                    photoHeight={data.whatsIncluded.photoHeight}
                    photoWidth={data.whatsIncluded.photoWidth}
                    photoFocalY={data.whatsIncluded.photoFocalY}
                    altText="Package Deliverables"
                  />
                )}

                <div className="p-8 rounded-2xl leading-relaxed whitespace-pre-line text-sm border" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                  {data.whatsIncluded.deliverablesText}
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.whatsIncluded.photo && data.whatsIncluded.frameShape !== 'background' && (data.whatsIncluded.imagePosition === 'bottom' || !data.whatsIncluded.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.whatsIncluded.photo}
                    frameShape={data.whatsIncluded.frameShape}
                    photoHeight={data.whatsIncluded.photoHeight}
                    photoWidth={data.whatsIncluded.photoWidth}
                    photoFocalY={data.whatsIncluded.photoFocalY}
                    isBottomFlush={true}
                    altText="Package Deliverables"
                  />
                )}
              </div>
            </div>

            {/* PAGE 5: PRICE & PAYMENT */}
            <div 
              className={`quotation-page a4-page-section content-page w-[794px] h-auto min-h-0 shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 ${data.pricePayment.imagePosition === 'bottom' ? 'px-12 pt-10 pb-0' : 'p-12 py-10'}`}
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.pricePayment.frameShape === 'background' ? `${data.pricePayment.photoHeight || 500}px` : undefined
              }}
            >
              {data.pricePayment.photo && data.pricePayment.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.pricePayment.photo}
                  frameShape="background"
                  photoHeight={data.pricePayment.photoHeight}
                  photoWidth={data.pricePayment.photoWidth}
                  photoFocalY={data.pricePayment.photoFocalY}
                  bgOpacity={data.pricePayment.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Price Background"
                />
              )}

              <div className="relative z-10 space-y-6 my-auto w-full pt-2">
                
                {/* TOP IMAGE POSITION */}
                {data.pricePayment.photo && data.pricePayment.frameShape !== 'background' && data.pricePayment.imagePosition === 'top' && (
                  <SectionImageRenderer
                    photo={data.pricePayment.photo}
                    frameShape={data.pricePayment.frameShape}
                    photoHeight={data.pricePayment.photoHeight}
                    photoWidth={data.pricePayment.photoWidth}
                    photoFocalY={data.pricePayment.photoFocalY}
                    altText="Payment Photo"
                  />
                )}

                <div className="space-y-4 border-b pb-6" style={{ borderColor }}>
                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                    {data.pricePayment.kicker}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.pricePayment.heading}
                  </h2>

                  <div className="text-4xl font-black whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </div>

                  <div className="pt-1">
                    <span className="text-xs font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>{data.pricePayment.paymentHeading}</span>
                    <p className="text-xs font-medium" style={{ color: textColor }}>{data.pricePayment.paymentTerms}</p>
                  </div>
                </div>

                {/* CENTER IMAGE POSITION */}
                {data.pricePayment.photo && data.pricePayment.frameShape !== 'background' && data.pricePayment.imagePosition === 'center' && (
                  <SectionImageRenderer
                    photo={data.pricePayment.photo}
                    frameShape={data.pricePayment.frameShape}
                    photoHeight={data.pricePayment.photoHeight}
                    photoWidth={data.pricePayment.photoWidth}
                    photoFocalY={data.pricePayment.photoFocalY}
                    altText="Payment Photo"
                  />
                )}

                <div className="space-y-3 pt-2">
                  <h2 className="text-2xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.addOnsTable.heading}
                  </h2>
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor }}>
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                        <tr>
                          <th className="py-3 px-4">Services</th>
                          <th className="py-3 px-4 text-right">Charges</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium" style={{ color: textColor }}>
                        {data.addOnsTable.rows.map(row => (
                          <tr key={row.id}>
                            <td className="py-3 px-4 font-semibold">{row.service}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">{row.charge}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.pricePayment.photo && data.pricePayment.frameShape !== 'background' && (data.pricePayment.imagePosition === 'bottom' || !data.pricePayment.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.pricePayment.photo}
                    frameShape={data.pricePayment.frameShape}
                    photoHeight={data.pricePayment.photoHeight}
                    photoWidth={data.pricePayment.photoWidth}
                    photoFocalY={data.pricePayment.photoFocalY}
                    isBottomFlush={true}
                    altText="Payment Photo"
                  />
                )}
              </div>
            </div>

            {/* PAGE 6: DELIVERY TIMELINE & TERMS */}
            <div 
              className={`quotation-page a4-page-section content-page w-[794px] h-auto min-h-0 shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 ${data.termsAndThankYou.imagePosition === 'bottom' ? 'px-12 pt-10 pb-0' : 'p-12 py-10'}`}
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor, 
                fontFamily: data.secondaryFont,
                minHeight: data.termsAndThankYou.frameShape === 'background' ? `${data.termsAndThankYou.photoHeight || 500}px` : undefined
              }}
            >
              {data.termsAndThankYou.photo && data.termsAndThankYou.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.termsAndThankYou.photo}
                  frameShape="background"
                  photoHeight={data.termsAndThankYou.photoHeight}
                  photoWidth={data.termsAndThankYou.photoWidth}
                  photoFocalY={data.termsAndThankYou.photoFocalY}
                  bgOpacity={data.termsAndThankYou.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Terms Background"
                />
              )}

              <div className="relative z-10 space-y-6 my-auto w-full pt-2">
                
                {/* TOP IMAGE POSITION */}
                {data.termsAndThankYou.photo && data.termsAndThankYou.frameShape !== 'background' && data.termsAndThankYou.imagePosition === 'top' && (
                  <SectionImageRenderer
                    photo={data.termsAndThankYou.photo}
                    frameShape={data.termsAndThankYou.frameShape}
                    photoHeight={data.termsAndThankYou.photoHeight}
                    photoWidth={data.termsAndThankYou.photoWidth}
                    photoFocalY={data.termsAndThankYou.photoFocalY}
                    altText="Terms Photo"
                  />
                )}

                <div className="space-y-3">
                  <h2 className="text-2xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.timelineTable.heading}
                  </h2>

                  <div className="rounded-xl overflow-hidden border" style={{ borderColor }}>
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                        <tr>
                          <th className="py-3 px-4">Result</th>
                          <th className="py-3 px-4">Timeline</th>
                          <th className="py-3 px-4">Revisions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium" style={{ color: textColor }}>
                        {data.timelineTable.rows.map(row => (
                          <tr key={row.id}>
                            <td className="py-3 px-4 font-semibold">{row.result}</td>
                            <td className="py-3 px-4">{row.timeline}</td>
                            <td className="py-3 px-4 font-mono opacity-80">{row.revisions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CENTER IMAGE POSITION */}
                {data.termsAndThankYou.photo && data.termsAndThankYou.frameShape !== 'background' && data.termsAndThankYou.imagePosition === 'center' && (
                  <SectionImageRenderer
                    photo={data.termsAndThankYou.photo}
                    frameShape={data.termsAndThankYou.frameShape}
                    photoHeight={data.termsAndThankYou.photoHeight}
                    photoWidth={data.termsAndThankYou.photoWidth}
                    photoFocalY={data.termsAndThankYou.photoFocalY}
                    altText="Terms Photo"
                  />
                )}

                <div className="space-y-5 pt-4 border-t" style={{ borderColor }}>
                  <div className="space-y-1.5">
                    <h2 className="text-xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.termsAndThankYou.termsHeading}
                    </h2>
                    <p className="text-xs leading-relaxed opacity-90">{data.termsAndThankYou.termsText}</p>
                  </div>

                  <div className="text-center pt-6 border-t space-y-2" style={{ borderColor }}>
                    <h2 className="text-2xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.termsAndThankYou.thankYouHeading}
                    </h2>
                    <p className="text-xs">{data.termsAndThankYou.thankYouText}</p>
                    <p className="text-[10px] font-mono font-bold pt-2 opacity-80 whitespace-nowrap" style={{ color: kickerColor }}>{data.termsAndThankYou.studioContact}</p>
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.termsAndThankYou.photo && data.termsAndThankYou.frameShape !== 'background' && (data.termsAndThankYou.imagePosition === 'bottom' || !data.termsAndThankYou.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.termsAndThankYou.photo}
                    frameShape={data.termsAndThankYou.frameShape}
                    photoHeight={data.termsAndThankYou.photoHeight}
                    photoWidth={data.termsAndThankYou.photoWidth}
                    photoFocalY={data.termsAndThankYou.photoFocalY}
                    isBottomFlush={true}
                    altText="Terms Photo"
                  />
                )}
              </div>
            </div>

          </div>
        </main>

      </div>

      {/* ── MOBILE APP FLOATING BOTTOM BAR (< 768px) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-4 py-2 flex items-center justify-between md:hidden shadow-2xl no-print">
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Customize &amp; Controls</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPDFCanvas}
          className="ml-2 py-2.5 px-4 rounded-xl bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>PDF</span>
        </button>
      </div>

      {/* ── MOBILE BOTTOM SHEET DRAWER (< 768px) ── */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-zinc-200"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-extrabold text-zinc-900">Page Controls &amp; Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="p-1 rounded-full bg-zinc-200 text-zinc-600 font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {renderSidebarControls()}
              </div>

              <div className="p-3 border-t border-zinc-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
                >
                  Apply &amp; Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── UNIFIED MASTER MEDIA MODAL ── */}
      <MasterMediaModal 
        isOpen={mediaModalOpen} 
        onClose={() => setMediaModalOpen(false)} 
        onSelectImage={handleSelectImageFromGallery} 
        userId={userId} 
      />

    </div>
  );
}

export default function QuotationBuilderPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-600">Loading StudioCore Editor...</p>
        </div>
      </div>
    }>
      <StudioCoreAiryBuilderContent />
    </React.Suspense>
  );
}
