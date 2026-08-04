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
  ZoomIn, ZoomOut, Maximize2, Menu, ArrowUp, ArrowDown, Circle, MoveVertical, MoveHorizontal, AlignVerticalSpaceAround, AlignCenter, Clock,
  Gift, CreditCard, PackageCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady } from '@/lib/font-loader';
// @ts-ignore
import html2canvasPro from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';

// Using imported BirdsSVG and MonogramSVG from QuotationSVGs

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

export interface PaymentTermStep {
  id: string;
  date: string;
  stepName: string;
  amount: number;
  status: 'Completed' | 'Pending';
}

export interface AddOnItem {
  id: string;
  title: string;
  price: number;
  selected: boolean;
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
    coupleName: 'YASH & TWINKLE',
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

  // 4. Functions Page Module State
  functionsPage: {
    kicker: 'EVENT SCHEDULE',
    heading: 'Functions & Coverage',
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 380,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
    items: [
      {
        id: 'func-1',
        name: 'Haldi & Sangeet',
        date: '4 MAR 26',
        dateNotFixed: false,
        startTime: '10:00 AM',
        endTime: '05:00 PM',
        durationSlot: '7 Hours',
        location: 'JW MARRIOTT, MUMBAI',
        requirements: [
          { name: 'Candid Photography', qty: 2 },
          { name: 'Cinematography', qty: 2 },
          { name: 'Drone', qty: 1 },
        ],
        notes: 'Includes traditional setup & evening sangeet performances coverage.',
      },
      {
        id: 'func-2',
        name: 'Wedding',
        date: '5 MAR 26',
        dateNotFixed: false,
        startTime: '04:00 PM',
        endTime: '11:00 PM',
        durationSlot: '7 Hours',
        location: 'PALACE GROUNDS, MUMBAI',
        requirements: [
          { name: 'Candid Photography', qty: 2 },
          { name: 'Cinematography', qty: 2 },
          { name: 'Drone', qty: 1 },
          { name: 'Traditional Video', qty: 1 },
        ],
        notes: 'Varmala & Pheras high speed cinema capture.',
      }
    ] as FunctionItem[]
  },

  // 5. Deliverables Page
  deliverablesPage: {
    kicker: 'WHAT WE DELIVER',
    heading: 'DELIVERABLES',
    selectedItems: [
      '1 Teaser Video (1-2 Min)',
      '1 Main Highlight Film (15-20 Min)',
      '3 Instagram Reels',
      'All Raw Photos & Footage in Hard Drive',
      '75-80 Retouched High-Res Images'
    ],
    availableOptions: [
      '1 Teaser Video (1-2 Min)',
      '1 Main Highlight Film (15-20 Min)',
      '3 Instagram Reels',
      'All Raw Photos & Footage in Hard Drive',
      '75-80 Retouched High-Res Images',
      'Pre-Wedding Teaser Video',
      'Traditional Long Video (2-3 Hours)',
      'Custom Printed Coffee Table Album'
    ],
    photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 6. Special Value Additions
  specialValueAdditions: {
    kicker: 'COMPLIMENTARY',
    heading: 'SPECIAL VALUE ADDITIONS',
    selectedItems: [
      'Complimentary Pre-Wedding Session (1 Day)',
      'Free Luxury Album Upgrade (40 Pages)',
      'Drone Coverage Included for Wedding & Sangeet',
      'Same Day Edit Reel for Instagram'
    ],
    availableOptions: [
      'Complimentary Pre-Wedding Session (1 Day)',
      'Free Luxury Album Upgrade (40 Pages)',
      'Drone Coverage Included for Wedding & Sangeet',
      'Same Day Edit Reel for Instagram',
      'Free Raw Data Hard Drive (1TB)',
      'Complimentary LED Wall Feed Live Output'
    ],
  },

  // 7. Pricing Details
  pricingPage: {
    kicker: 'INVESTMENT & BREAKDOWN',
    heading: 'PRICING DETAILS',
    basePrice: 150000,
    discountAmount: 10000,
    accommodationCharges: 15000,
    travelCharges: 10000,
    additionalCharges: 5000,
    gstPct: 18,
  },

  // 8. Payment Terms & Schedule
  paymentTermsPage: {
    kicker: 'SCHEDULE',
    heading: 'PAYMENT TERMS & SCHEDULE',
    steps: [
      { id: 'pt-1', date: '10 FEB 26', stepName: 'Token Booking Amount', amount: 25000, status: 'Completed' },
      { id: 'pt-2', date: '01 MAR 26', stepName: 'Advance Amount (Pre-Event)', amount: 75000, status: 'Pending' },
      { id: 'pt-3', date: '06 MAR 26', stepName: 'On Wedding Day', amount: 50000, status: 'Pending' },
      { id: 'pt-4', date: '25 MAR 26', stepName: 'Final Delivery Amount', amount: 20000, status: 'Pending' },
    ] as PaymentTermStep[],
  },

  // 9. Add-Ons & Upgrades
  addOnsPage: {
    kicker: "EMBRACE YOUR DAY — YOU'RE IN CONTROL",
    heading: 'ADD-ONS & UPGRADES',
    subText: 'Select extra services to enhance your wedding story package.',
    items: [
      { id: 'add-1', title: 'Additional Candid Photographer', price: 15000, selected: true },
      { id: 'add-2', title: 'Additional Cinematographer', price: 22000, selected: true },
      { id: 'add-3', title: 'FPV Drone Pilot (Per Event)', price: 18000, selected: false },
      { id: 'add-4', title: 'Live Streaming Setup (Per Event)', price: 25000, selected: false },
      { id: 'add-5', title: 'Extra Album Pages (Per 10 Pages)', price: 5000, selected: true },
      { id: 'add-6', title: 'Express 7-Day Video Edit Delivery', price: 20000, selected: false },
    ] as AddOnItem[],
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
      <div 
        className="absolute top-0 left-0 right-0 z-0 overflow-hidden w-full pointer-events-none select-none transition-all duration-200"
        style={{ height: photoHeight ? `${photoHeight}px` : '100%' }}
      >
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
      <div className={`w-full overflow-hidden ${isBottomFlush ? 'mt-auto mb-0' : 'my-0'}`}>
        <img
          src={photo}
          alt={altText}
          crossOrigin="anonymous"
          className="w-full block object-cover shadow-xs"
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
    <div className={`w-full flex justify-center ${isBottomFlush ? 'mt-4' : 'my-4'}`}>
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

function getDynamicPageHeight(sectionData?: { frameShape?: string; photoHeight?: number; bottomBannerHeight?: number }) {
  const h = sectionData?.photoHeight || sectionData?.bottomBannerHeight;
  if (sectionData?.frameShape === 'background' && h) {
    return `${h}px`;
  }
  return '1123px';
}

function ThreeDCurvedSelect({
  label,
  value,
  options,
  onChange,
  onAddCustom,
}: {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  onAddCustom?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { label: value || 'Select...', value };

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && <label className="block text-[10px] uppercase font-bold text-zinc-500">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 font-bold text-xs shadow-2xs flex items-center justify-between transition-all hover:border-amber-300 cursor-pointer"
      >
        <span className="truncate pr-2">{selectedOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-md shadow-xl p-1.5 space-y-1 max-h-56 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                value === opt.value
                  ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300'
                  : 'text-zinc-700 hover:bg-zinc-100/80'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
            </div>
          ))}
          {onAddCustom && (
            <div
              onClick={() => {
                setIsOpen(false);
                onAddCustom();
              }}
              className="flex items-center gap-1.5 p-2 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Add Custom...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreeDCurvedDatePicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
}) {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) return;
    const dateObj = new Date(rawVal + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDate();
      const monthStr = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const yearShort = dateObj.getFullYear().toString().slice(-2);
      const formatted = `${day} ${monthStr} ${yearShort}`;
      onChange(formatted);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        disabled={disabled}
        value={disabled ? 'DATE NOT FIXED' : value}
        placeholder="e.g. 4 MAR 26"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-2.5 pr-10 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 font-bold text-xs uppercase shadow-2xs transition-all ${
          disabled ? 'opacity-60 bg-zinc-100 cursor-not-allowed' : ''
        }`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (hiddenDateInputRef.current) {
            if ('showPicker' in hiddenDateInputRef.current && typeof (hiddenDateInputRef.current as any).showPicker === 'function') {
              (hiddenDateInputRef.current as any).showPicker();
            } else {
              hiddenDateInputRef.current.click();
            }
          }
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        title="Open 3D Calendar Date Picker"
      >
        <Calendar className="w-4 h-4 text-amber-600" />
      </button>

      <input
        ref={hiddenDateInputRef}
        type="date"
        className="sr-only absolute opacity-0 w-0 h-0 pointer-events-none"
        onChange={handleDateInputChange}
      />
    </div>
  );
}

function ThreeDCurvedTimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const hiddenTimeRef = useRef<HTMLInputElement>(null);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawTime = e.target.value;
    if (!rawTime) return;
    const [hStr, mStr] = rawTime.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = mStr || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const formatted = `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    onChange(formatted);
  };

  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase font-bold text-zinc-500">{label}</label>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => {
            if (hiddenTimeRef.current) {
              if ('showPicker' in hiddenTimeRef.current && typeof (hiddenTimeRef.current as any).showPicker === 'function') {
                (hiddenTimeRef.current as any).showPicker();
              } else {
                hiddenTimeRef.current.click();
              }
            }
          }}
          className="absolute left-2.5 p-1 rounded-md text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer z-10"
          title="Open 24-Hour Clock Picker"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
        </button>
        <input
          type="text"
          value={value}
          placeholder="10:00 AM"
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 pl-9 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 font-bold text-xs uppercase shadow-2xs"
        />
        <input
          ref={hiddenTimeRef}
          type="time"
          step="900"
          className="sr-only absolute opacity-0 w-0 h-0 pointer-events-none"
          onChange={handleTimeChange}
        />
      </div>
    </div>
  );
}

function ThreeDCurvedMultiSelect({
  title,
  availableOptions,
  selectedText,
  onChangeSelectedText,
  onAddCustomOption,
}: {
  title: string;
  availableOptions: string[];
  selectedText: string;
  onChangeSelectedText: (newText: string) => void;
  onAddCustomOption: (newItem: string) => void;
}) {
  const selectedItems = (selectedText || '').split('\n').map(s => s.trim()).filter(Boolean);

  const toggleItem = (item: string) => {
    let newSelected: string[];
    if (selectedItems.includes(item)) {
      newSelected = selectedItems.filter(i => i !== item);
    } else {
      newSelected = [...selectedItems, item];
    }
    onChangeSelectedText(newSelected.join('\n'));
  };

  const handleAdd = () => {
    const newItem = prompt(`Enter custom ${title.toLowerCase()} item:`);
    if (newItem && newItem.trim()) {
      const trimmed = newItem.trim();
      onAddCustomOption(trimmed);
      toggleItem(trimmed);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 via-amber-50/20 to-white shadow-md p-3 space-y-2.5 transition-all">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>{title}</span>
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="px-2.5 py-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all flex items-center gap-1"
        >
          <span>+ Add</span>
        </button>
      </div>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {availableOptions.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <div
              key={item}
              onClick={() => toggleItem(item)}
              className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                  : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100/80'
              }`}
            >
              <span className="leading-tight select-none pr-2">{item}</span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-zinc-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface FunctionItem {
  id: string;
  name: string;
  date: string;
  dateNotFixed?: boolean;
  startTime: string;
  endTime: string;
  durationSlot: string;
  location: string;
  requirements: { name: string; qty: number }[];
  notes: string;
}

function ThreeDCurvedFunctionEditor({
  func,
  index,
  availableFunctionNames,
  availableDurationSlots,
  availableRequirements,
  onUpdate,
  onDelete,
  onAddCustomFunctionName,
  onAddCustomDuration,
  onAddCustomRequirement,
}: {
  func: FunctionItem;
  index: number;
  availableFunctionNames: string[];
  availableDurationSlots: string[];
  availableRequirements: string[];
  onUpdate: (updated: FunctionItem) => void;
  onDelete: () => void;
  onAddCustomFunctionName: (name: string) => void;
  onAddCustomDuration: (dur: string) => void;
  onAddCustomRequirement: (req: string) => void;
}) {
  const selectedEventNames = (func.name || '').split(' + ').map(s => s.trim()).filter(Boolean);

  const toggleEventName = (evtName: string) => {
    let updated: string[];
    if (selectedEventNames.includes(evtName)) {
      updated = selectedEventNames.filter(n => n !== evtName);
    } else {
      updated = [...selectedEventNames, evtName];
    }
    const joined = updated.length > 0 ? updated.join(' + ') : 'Event';
    onUpdate({ ...func, name: joined });
  };

  const handleAddCustomEvent = () => {
    const customName = prompt('Enter custom event name (e.g. Cocktail, Pool Party):');
    if (customName && customName.trim()) {
      const trimmed = customName.trim();
      onAddCustomFunctionName(trimmed);
      toggleEventName(trimmed);
    }
  };

  const handleDurationChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      const customDur = prompt('Enter custom duration (e.g. 6 Hours, Half Day):');
      if (customDur && customDur.trim()) {
        const trimmed = customDur.trim();
        onAddCustomDuration(trimmed);
        onUpdate({ ...func, durationSlot: trimmed });
      }
    } else {
      onUpdate({ ...func, durationSlot: val });
    }
  };

  const toggleRequirement = (reqName: string) => {
    const exists = func.requirements.find(r => r.name === reqName);
    let newReqs: { name: string; qty: number }[];
    if (exists) {
      newReqs = func.requirements.filter(r => r.name !== reqName);
    } else {
      newReqs = [...func.requirements, { name: reqName, qty: 1 }];
    }
    onUpdate({ ...func, requirements: newReqs });
  };

  const changeRequirementQty = (reqName: string, qty: number) => {
    const newReqs = func.requirements.map(r => r.name === reqName ? { ...r, qty } : r);
    onUpdate({ ...func, requirements: newReqs });
  };

  const handleAddReq = () => {
    const customReq = prompt('Enter custom requirement item:');
    if (customReq && customReq.trim()) {
      const trimmed = customReq.trim();
      onAddCustomRequirement(trimmed);
      if (!func.requirements.find(r => r.name === trimmed)) {
        onUpdate({ ...func, requirements: [...func.requirements, { name: trimmed, qty: 1 }] });
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs shadow-xs">
            {index + 1}
          </span>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 drop-shadow-2xs">
            Function #{index + 1} ({func.name || 'Event'})
          </h4>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer text-[10px] font-bold flex items-center gap-1 transition-all"
          title="Delete Function"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 via-amber-50/20 to-white shadow-md p-3.5 space-y-3 relative transition-all">

      {/* Multi-Select Event Names Dropdown (Curved 3D UI) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" /> Event Name(s)
          </label>
          <button
            type="button"
            onClick={handleAddCustomEvent}
            className="px-2 py-0.5 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all"
          >
            + Add
          </button>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {availableFunctionNames.map((evtName) => {
            const isSelected = selectedEventNames.includes(evtName);
            return (
              <div
                key={evtName}
                onClick={() => toggleEventName(evtName)}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                    : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span className="leading-tight select-none pr-2">{evtName}</span>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-zinc-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Calendar & Date Not Fixed Toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Date</label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!func.dateNotFixed}
              onChange={(e) => onUpdate({ ...func, dateNotFixed: e.target.checked })}
              className="w-3.5 h-3.5 rounded-md border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">Date Not Fixed</span>
          </label>
        </div>

        <ThreeDCurvedDatePicker
          value={func.date}
          disabled={!!func.dateNotFixed}
          onChange={(val) => onUpdate({ ...func, date: val })}
        />
      </div>

      {/* 3D Clock Selectors for Start & End Time */}
      <div className="grid grid-cols-2 gap-2">
        <ThreeDCurvedTimePicker
          label="Start Time"
          value={func.startTime}
          onChange={(val) => onUpdate({ ...func, startTime: val })}
        />
        <ThreeDCurvedTimePicker
          label="End Time"
          value={func.endTime}
          onChange={(val) => onUpdate({ ...func, endTime: val })}
        />
      </div>

      {/* Standardized 3D Duration Dropdown */}
      <ThreeDCurvedSelect
        label="Duration Slot"
        value={func.durationSlot}
        options={availableDurationSlots.map(slot => ({ label: slot, value: slot }))}
        onChange={(val) => handleDurationChange(val)}
        onAddCustom={() => {
          const customDur = prompt('Enter custom duration (e.g. 6 Hours, Half Day):');
          if (customDur && customDur.trim()) {
            const trimmed = customDur.trim();
            onAddCustomDuration(trimmed);
            onUpdate({ ...func, durationSlot: trimmed });
          }
        }}
      />

      {/* Location Input */}
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Venue / Location</label>
        <textarea
          rows={2}
          value={func.location}
          placeholder="e.g. JW MARRIOTT, MUMBAI"
          onChange={(e) => onUpdate({ ...func, location: e.target.value })}
          className="w-full p-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 font-bold text-xs uppercase resize-none shadow-2xs"
        />
      </div>

      {/* Requirements with Quantity Selector */}
      <div className="space-y-2 pt-1 border-t border-amber-100">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1">
            <Camera className="w-3 h-3 text-amber-600" /> Requirements &amp; Crew
          </label>
          <button
            type="button"
            onClick={handleAddReq}
            className="px-2 py-0.5 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all"
          >
            + Add
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {availableRequirements.map((reqName) => {
            const reqObj = func.requirements.find(r => r.name === reqName);
            const isSelected = !!reqObj;
            return (
              <div
                key={reqName}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                    : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600'
                }`}
              >
                <div 
                  onClick={() => toggleRequirement(reqName)} 
                  className="flex items-center gap-2 cursor-pointer flex-1 select-none pr-1"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="leading-tight">{reqName}</span>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-amber-800">Qty:</span>
                    <select
                      value={reqObj?.qty || 1}
                      onChange={(e) => changeRequirementQty(reqName, Number(e.target.value) || 1)}
                      className="p-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-[11px]"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Function Notes */}
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Notes / Highlights</label>
        <textarea
          rows={2}
          value={func.notes}
          placeholder="Custom notes for this function..."
          onChange={(e) => onUpdate({ ...func, notes: e.target.value })}
          className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs resize-none"
        />
      </div>
    </div>
  </div>
);
}

function normalizeQuotationData(loaded: any) {
  const d = DEFAULT_AIRY_PROPOSAL;
  if (!loaded || typeof loaded !== 'object') return d;

  return {
    ...d,
    ...loaded,
    cover: { ...d.cover, ...(loaded.cover || {}) },
    aboutUs: { ...d.aboutUs, ...(loaded.aboutUs || {}) },
    shootDetails: { ...d.shootDetails, ...(loaded.shootDetails || {}) },
    functionsPage: {
      ...d.functionsPage,
      ...(loaded.functionsPage || {}),
      items: Array.isArray(loaded.functionsPage?.items) ? loaded.functionsPage.items : d.functionsPage.items,
    },
    deliverablesPage: {
      ...d.deliverablesPage,
      ...(loaded.deliverablesPage || {}),
      selectedItems: Array.isArray(loaded.deliverablesPage?.selectedItems)
        ? loaded.deliverablesPage.selectedItems
        : d.deliverablesPage.selectedItems,
      availableOptions: Array.isArray(loaded.deliverablesPage?.availableOptions)
        ? loaded.deliverablesPage.availableOptions
        : d.deliverablesPage.availableOptions,
    },
    specialValueAdditions: {
      ...d.specialValueAdditions,
      ...(loaded.specialValueAdditions || {}),
      selectedItems: Array.isArray(loaded.specialValueAdditions?.selectedItems)
        ? loaded.specialValueAdditions.selectedItems
        : d.specialValueAdditions.selectedItems,
      availableOptions: Array.isArray(loaded.specialValueAdditions?.availableOptions)
        ? loaded.specialValueAdditions.availableOptions
        : d.specialValueAdditions.availableOptions,
    },
    pricingPage: {
      ...d.pricingPage,
      ...(loaded.pricingPage || {}),
      basePrice: typeof loaded.pricingPage?.basePrice === 'number' ? loaded.pricingPage.basePrice : d.pricingPage.basePrice,
      discountAmount: typeof loaded.pricingPage?.discountAmount === 'number' ? loaded.pricingPage.discountAmount : d.pricingPage.discountAmount,
      accommodationCharges: typeof loaded.pricingPage?.accommodationCharges === 'number' ? loaded.pricingPage.accommodationCharges : d.pricingPage.accommodationCharges,
      travelCharges: typeof loaded.pricingPage?.travelCharges === 'number' ? loaded.pricingPage.travelCharges : d.pricingPage.travelCharges,
      additionalCharges: typeof loaded.pricingPage?.additionalCharges === 'number' ? loaded.pricingPage.additionalCharges : d.pricingPage.additionalCharges,
      gstPct: typeof loaded.pricingPage?.gstPct === 'number' ? loaded.pricingPage.gstPct : d.pricingPage.gstPct,
    },
    paymentTermsPage: {
      ...d.paymentTermsPage,
      ...(loaded.paymentTermsPage || {}),
      steps: Array.isArray(loaded.paymentTermsPage?.steps)
        ? loaded.paymentTermsPage.steps
        : d.paymentTermsPage.steps,
    },
    addOnsPage: {
      ...d.addOnsPage,
      ...(loaded.addOnsPage || {}),
      items: Array.isArray(loaded.addOnsPage?.items)
        ? loaded.addOnsPage.items
        : d.addOnsPage.items,
    },

    // Backwards Compatibility Aliases
    deliverables: loaded.deliverables || loaded.deliverablesPage || { items: d.deliverablesPage.selectedItems, availableOptions: d.deliverablesPage.availableOptions, imagePosition: 'bottom' },
    valueAdditions: loaded.valueAdditions || loaded.specialValueAdditions || { items: d.specialValueAdditions.selectedItems },
    pricing: loaded.pricing || loaded.pricingPage || { basePrice: d.pricingPage.basePrice, discount: d.pricingPage.discountAmount, accommodation: d.pricingPage.accommodationCharges, travel: d.pricingPage.travelCharges, additional: d.pricingPage.additionalCharges, gstPercent: d.pricingPage.gstPct },
    paymentTerms: loaded.paymentTerms || loaded.paymentTermsPage || { steps: d.paymentTermsPage.steps, fixedAmount: 0, receivedAmount: 0, pendingAmount: 0 },
    addOns: loaded.addOns || loaded.addOnsPage || { subText: d.addOnsPage.subText, items: d.addOnsPage.items },
  };
}

function calculatePricingTotals(pricing: any) {
  const p = pricing || DEFAULT_AIRY_PROPOSAL.pricingPage;
  const base = Number(p?.basePrice ?? p?.base ?? 0);
  const disc = Number(p?.discountAmount ?? p?.discount ?? 0);
  const accom = Number(p?.accommodationCharges ?? p?.accommodation ?? 0);
  const travel = Number(p?.travelCharges ?? p?.travel ?? 0);
  const addl = Number(p?.additionalCharges ?? p?.additional ?? 0);
  const gross = Math.max(0, base - disc + accom + travel + addl);
  const gstPct = Number(p?.gstPct ?? p?.gstPercent ?? 18);
  const gstAmount = Math.round(gross * (gstPct / 100));
  const netTotal = gross + gstAmount;
  return { base, disc, accom, travel, addl, gross, gstPct, gstAmount, netTotal };
}

function calculatePaymentTermsSummary(steps: PaymentTermStep[], totalProjectAmount: number) {
  const fixedAmount = Number(totalProjectAmount || 0);
  const stepList = Array.isArray(steps) ? steps : [];
  const receivedAmount = stepList
    .filter(s => s && s.status === 'Completed')
    .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
  const pendingAmount = Math.max(0, fixedAmount - receivedAmount);
  return { fixedAmount, receivedAmount, pendingAmount };
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

  // Pre-Wedding Multi-Select Available Options States
  const [availableRequirements, setAvailableRequirements] = useState<string[]>([
    'Candid Photography',
    'Cinematography',
    'Drone',
    'Traditional Video',
    'Pre-Wedding Film',
    'Portable Changing Room',
  ]);

  const [availableDeliverables, setAvailableDeliverables] = useState<string[]>([
    'Full Ultra HD Super-Fine Raw Photos',
    'Approx. 50 High Resolution Edited Images',
    '3 Save The Dates Photos',
    '1 Countdown Reel',
    '1 Video Reel',
    'Teaser Video (1-2 Min)',
    'Main Highlight Film (15-20 Min)',
  ]);

  // Functions Page Module Available Dropdown States
  const [availableFunctionNames, setAvailableFunctionNames] = useState<string[]>([
    'Wedding',
    'Haldi',
    'Sangeet',
    'Mehendi',
    'Reception',
    'Haldi & Sangeet',
    'Cocktail',
    'Engagement',
  ]);

  const [availableDurationSlots, setAvailableDurationSlots] = useState<string[]>([
    'None',
    '2 Hours',
    '3 Hours',
    '4 Hours',
    '5 Hours',
    '6 Hours',
    '7 Hours',
    '8 Hours',
    '10 Hours',
    '12 Hours',
    'Full Day',
  ]);

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

  // PIXEL-PERFECT STANDARD A4 SINGLE CONTINUOUS LONG-PAGE PDF EXPORTER Engine
  const handleDownloadPDFCanvas = async () => {
    if (!canvasRef.current) return;
    const previousScale = zoomScale;
    setIsExportingPDF(true);
    setPdfToastMessage('Generating High-Res A4 PDF...');

    // Lock zoomScale to 1.0 & enable PDF capture CSS
    setZoomScale(1.0);
    document.body.classList.add('pdf-capture-active');

    try {
      // @ts-ignore
      const html2canvasPro = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const container = document.querySelector('#quotation-full-canvas') || document.querySelector('.quotation-container');
      if (!container) throw new Error('No quotation container found (#quotation-full-canvas)');

      // Capture entire long container in high DPI
      const canvas = await html2canvasPro(container as HTMLElement, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgWidth = 794; // Fixed standard UI width
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Dynamic full height

      // Create a custom single-page PDF with exact dynamic height
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      const clientName = (data?.cover as any)?.clientName || data?.designName || 'Quotation';
      const cleanClientName = clientName
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-')
        .replace(/[^\x20-\x7E]/g, '-');

      pdf.save(`${cleanClientName}-Full.pdf`);

      setPdfToastMessage('Full PDF Downloaded Successfully!');
      setTimeout(() => setPdfToastMessage(null), 3000);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      alert(`PDF Export Failed: ${err?.message || err}`);
    } finally {
      setIsExportingPDF(false);
      document.body.classList.remove('pdf-capture-active');
      setZoomScale(previousScale);
    }
  };

  // Load User Session & Proposal
  useEffect(() => {
    console.log('=== TEMPLET_A4_STRICT_REVERT_V7 ===');
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
          setData(normalizeQuotationData(qData.content_json));
        } else {
          const localSaved = localStorage.getItem(`wg_proposal_draft_${currentUserId}`);
          if (localSaved) {
            try {
              setData(normalizeQuotationData(JSON.parse(localSaved)));
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
        
        const calc = calculatePricingTotals(data.pricingPage);
        const grandTotal = calc.netTotal;
        const subtotal = calc.gross;

        await supabase.from('quotations').upsert({
          workspace_id: userId,
          quotation_number: 'FW-2026-001',
          title: data.designName,
          client_name: `${data.cover.groomName} & ${data.cover.brideName}`,
          content_json: data,
          financials: { total_amount: grandTotal, subtotal, gst_rate: calc.gstPct },
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
    } else if (activeTargetField === 'functionsPhoto') {
      setData(prev => ({ ...prev, functionsPage: { ...prev.functionsPage, photo: url } }));
    } else if (activeTargetField === 'deliverablesPhoto') {
      setData(prev => ({ ...prev, deliverablesPage: { ...prev.deliverablesPage, photo: url } }));
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

  const calc = calculatePricingTotals(data.pricingPage);
  const grandTotal = calc.netTotal;
  const subtotal = calc.gross;

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
        financials: { total_amount: grandTotal, subtotal, gst_rate: calc.gstPct },
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
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-amber-700">Couple Names (Multi-line supported)</label>
                <textarea
                  rows={2}
                  value={data.cover.coupleName !== undefined ? data.cover.coupleName : (data.cover.groomName ? `${data.cover.groomName} & ${data.cover.brideName}` : 'YASH & TWINKLE')}
                  placeholder="e.g. YASH & TWINKLE or YASH&#10;&amp;&#10;TWINKLE"
                  onChange={(e) => setData({ ...data, cover: { ...data.cover, coupleName: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold uppercase resize-y min-h-[50px]"
                />
              </div>

              {/* Event Type Dropdown with Custom Event Option */}
              <ThreeDCurvedSelect
                label="Event Type"
                value={data.cover.eventType}
                options={customEventTypes.map(type => ({ label: type, value: type }))}
                onChange={(val) => handleEventTypeChange(val)}
                onAddCustom={() => {
                  const custom = prompt('Enter custom event type (e.g. Destination Wedding, Reception):');
                  if (custom && custom.trim()) {
                    const trimmed = custom.trim();
                    if (!customEventTypes.includes(trimmed)) {
                      setCustomEventTypes(prev => [...prev, trimmed]);
                    }
                    handleEventTypeChange(trimmed);
                  }
                }}
              />

              {/* Side Type & Location 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2">
                <ThreeDCurvedSelect
                  label="Side Type"
                  value={data.cover.sideOption || 'Both Sides'}
                  options={[
                    { label: 'Both Sides', value: 'Both Sides' },
                    { label: 'Bride Side', value: 'Bride Side' },
                    { label: 'Groom Side', value: 'Groom Side' },
                    { label: 'None (Hidden)', value: '' },
                  ]}
                  onChange={(val) => setData({ ...data, cover: { ...data.cover, sideOption: val } })}
                />
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400">Location</label>
                  <input
                    type="text"
                    value={data.cover.locationName || ''}
                    placeholder="e.g. MUMBAI"
                    onChange={(e) => setData({ ...data, cover: { ...data.cover, locationName: e.target.value } })}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs uppercase"
                  />
                </div>
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

              {/* Editable Day Shoot Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">Day Shoot Label</label>
                <input
                  type="text"
                  value={data.shootDetails.daysText !== undefined ? data.shootDetails.daysText : '1 Day Shoot'}
                  placeholder="e.g. 1 Day Shoot or 2 Days Shoot"
                  onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, daysText: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                />
              </div>

              {/* 3D Curved UI Multi-Select Dropdown: Requirements */}
              <ThreeDCurvedMultiSelect
                title="Requirements"
                availableOptions={availableRequirements}
                selectedText={data.shootDetails.crewText || 'Candid Photography\nCinematography\nPortable Changing Room'}
                onChangeSelectedText={(newText) => setData({ ...data, shootDetails: { ...data.shootDetails, crewText: newText } })}
                onAddCustomOption={(newItem) => setAvailableRequirements(prev => Array.from(new Set([...prev, newItem])))}
              />

              {/* 3D Curved UI Multi-Select Dropdown: Deliverables */}
              <ThreeDCurvedMultiSelect
                title="Deliverables"
                availableOptions={availableDeliverables}
                selectedText={data.shootDetails.deliverablesText || 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 Countdown Reel\n1 Video Reel'}
                onChangeSelectedText={(newText) => setData({ ...data, shootDetails: { ...data.shootDetails, deliverablesText: newText } })}
                onAddCustomOption={(newItem) => setAvailableDeliverables(prev => Array.from(new Set([...prev, newItem])))}
              />

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

        {/* 4. Functions & Coverage Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'functions' ? null : 'functions')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>4. Functions &amp; Coverage</span>
            </div>
            {openCard === 'functions' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'functions' && (
            <div className="p-3 space-y-3 bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                <input
                  type="text"
                  value={data.functionsPage?.heading || 'Functions & Coverage'}
                  onChange={(e) => setData({ ...data, functionsPage: { ...data.functionsPage, heading: e.target.value } })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                />
              </div>

              <div className="space-y-3">
                {(data.functionsPage?.items || []).map((funcItem, fIdx) => (
                  <ThreeDCurvedFunctionEditor
                    key={funcItem.id || fIdx}
                    func={funcItem}
                    index={fIdx}
                    availableFunctionNames={availableFunctionNames}
                    availableDurationSlots={availableDurationSlots}
                    availableRequirements={availableRequirements}
                    onUpdate={(updatedFunc) => {
                      const updatedItems = [...(data.functionsPage?.items || [])];
                      updatedItems[fIdx] = updatedFunc;
                      setData({ ...data, functionsPage: { ...data.functionsPage, items: updatedItems } });
                    }}
                    onDelete={() => {
                      const filtered = (data.functionsPage?.items || []).filter((_, i) => i !== fIdx);
                      setData({ ...data, functionsPage: { ...data.functionsPage, items: filtered } });
                    }}
                    onAddCustomFunctionName={(newName) => setAvailableFunctionNames(prev => Array.from(new Set([...prev, newName])))}
                    onAddCustomDuration={(newDur) => setAvailableDurationSlots(prev => Array.from(new Set([...prev, newDur])))}
                    onAddCustomRequirement={(newReq) => setAvailableRequirements(prev => Array.from(new Set([...prev, newReq])))}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const newFunc: FunctionItem = {
                      id: `func-${Date.now()}`,
                      name: 'Sangeet',
                      date: '4 MAR 26',
                      startTime: '06:00 PM',
                      endTime: '11:00 PM',
                      durationSlot: '5 Hours',
                      location: 'PALACE GROUNDS, MUMBAI',
                      requirements: [
                        { name: 'Candid Photography', qty: 2 },
                        { name: 'Cinematography', qty: 2 }
                      ],
                      notes: 'Sangeet performance & stage lighting coverage.'
                    };
                    setData({ ...data, functionsPage: { ...data.functionsPage, items: [...(data.functionsPage?.items || []), newFunc] } });
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg border border-amber-300 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>+ Add Function</span>
                </button>
              </div>

              <UnifiedPhotoControls
                photoUrl={data.functionsPage?.photo}
                frameShape={data.functionsPage?.frameShape}
                photoHeight={data.functionsPage?.photoHeight}
                photoWidth={data.functionsPage?.photoWidth}
                photoFocalY={data.functionsPage?.photoFocalY}
                bgOpacity={data.functionsPage?.bgOpacity}
                imagePosition={data.functionsPage?.imagePosition}
                onOpenAddModal={() => openAddImageModal('functionsPhoto')}
                onDeletePhoto={() => setData({ ...data, functionsPage: { ...data.functionsPage, photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, functionsPage: { ...data.functionsPage, frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, functionsPage: { ...data.functionsPage, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, functionsPage: { ...data.functionsPage, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, functionsPage: { ...data.functionsPage, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, functionsPage: { ...data.functionsPage, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, functionsPage: { ...data.functionsPage, photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 5. Deliverables Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'deliverables' ? null : 'deliverables')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>5. Deliverables</span>
            </div>
            {openCard === 'deliverables' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'deliverables' && (
            <div className="p-3 space-y-3 bg-white">
              <ThreeDCurvedMultiSelect
                title="Deliverables"
                availableOptions={data.deliverablesPage?.availableOptions || DEFAULT_AIRY_PROPOSAL.deliverablesPage.availableOptions}
                selectedText={(data.deliverablesPage?.selectedItems || DEFAULT_AIRY_PROPOSAL.deliverablesPage.selectedItems).join('\n')}
                onChangeSelectedText={(newText) => {
                  const arr = newText.split('\n').map(s => s.trim()).filter(Boolean);
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  setData({ ...data, deliverablesPage: { ...currentObj, selectedItems: arr } });
                }}
                onAddCustomOption={(newItem) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const opts = currentObj.availableOptions || [];
                  if (!opts.includes(newItem)) {
                    setData({
                      ...data,
                      deliverablesPage: {
                        ...currentObj,
                        availableOptions: [...opts, newItem]
                      }
                    });
                  }
                }}
              />

              <UnifiedPhotoControls
                photoUrl={data.deliverablesPage?.photo}
                frameShape={data.deliverablesPage?.frameShape}
                photoHeight={data.deliverablesPage?.photoHeight}
                photoWidth={data.deliverablesPage?.photoWidth}
                photoFocalY={data.deliverablesPage?.photoFocalY}
                bgOpacity={data.deliverablesPage?.bgOpacity}
                imagePosition={data.deliverablesPage?.imagePosition}
                onOpenAddModal={() => openAddImageModal('deliverablesPhoto')}
                onDeletePhoto={() => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), photo: '' } })}
                onChangeShape={(shape) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), frameShape: shape } })}
                onChangePosition={(pos) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, deliverablesPage: { ...(data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage), photoWidth: w } })}
              />
            </div>
          )}
        </div>

        {/* 6. Special Value Additions Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'specialValue' ? null : 'specialValue')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-zinc-500" />
              <span>6. Special Value Additions</span>
            </div>
            {openCard === 'specialValue' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'specialValue' && (
            <div className="p-3 space-y-3 bg-white">
              <ThreeDCurvedMultiSelect
                title="Complimentary Value Additions"
                availableOptions={data.specialValueAdditions?.availableOptions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions.availableOptions}
                selectedText={(data.specialValueAdditions?.selectedItems || DEFAULT_AIRY_PROPOSAL.specialValueAdditions.selectedItems).join('\n')}
                onChangeSelectedText={(newText) => {
                  const arr = newText.split('\n').map(s => s.trim()).filter(Boolean);
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  setData({ ...data, specialValueAdditions: { ...currentObj, selectedItems: arr } });
                }}
                onAddCustomOption={(newItem) => {
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  const opts = currentObj.availableOptions || [];
                  if (!opts.includes(newItem)) {
                    setData({
                      ...data,
                      specialValueAdditions: {
                        ...currentObj,
                        availableOptions: [...opts, newItem]
                      }
                    });
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* 7. Pricing Details Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'pricing' ? null : 'pricing')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
              <span>7. Pricing Details</span>
            </div>
            {openCard === 'pricing' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'pricing' && (
            <div className="p-3 space-y-3 bg-white">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Base Package Price (₹)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-amber-700">₹</span>
                  <input
                    type="number"
                    value={data.pricingPage?.basePrice ?? 0}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, basePrice: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 pl-7 rounded-xl border border-amber-200/80 bg-zinc-50 text-zinc-900 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-zinc-500">Discount Input (₹)</label>
                  <input
                    type="number"
                    value={data.pricingPage?.discountAmount ?? 0}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, discountAmount: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-zinc-500">GST (%)</label>
                  <input
                    type="number"
                    value={data.pricingPage?.gstPct ?? 18}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, gstPct: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Accommodation</label>
                  <input
                    type="number"
                    value={data.pricingPage?.accommodationCharges ?? 0}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, accommodationCharges: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Travel Charges</label>
                  <input
                    type="number"
                    value={data.pricingPage?.travelCharges ?? 0}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, travelCharges: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Additional</label>
                  <input
                    type="number"
                    value={data.pricingPage?.additionalCharges ?? 0}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({ ...data, pricingPage: { ...currentObj, additionalCharges: Number(e.target.value) || 0 } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8. Payment Terms Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'paymentTerms' ? null : 'paymentTerms')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
              <span>8. Payment Terms &amp; Schedule</span>
            </div>
            {openCard === 'paymentTerms' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'paymentTerms' && (
            <div className="p-3 space-y-3 bg-white">
              <div className="space-y-2">
                {(data.paymentTermsPage?.steps || DEFAULT_AIRY_PROPOSAL.paymentTermsPage.steps).map((step, idx) => (
                  <div key={step?.id || idx} className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-950">Installment #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const steps = data.paymentTermsPage?.steps || [];
                          const updated = steps.filter(s => s.id !== step.id);
                          const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                          setData({ ...data, paymentTermsPage: { ...currentObj, steps: updated } });
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Date</label>
                      <ThreeDCurvedDatePicker
                        value={step?.date || ''}
                        disabled={false}
                        onChange={(val) => {
                          const steps = data.paymentTermsPage?.steps || [];
                          const updated = steps.map(s => s.id === step.id ? { ...s, date: val } : s);
                          const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                          setData({ ...data, paymentTermsPage: { ...currentObj, steps: updated } });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Step / Stage Name</label>
                      <input
                        type="text"
                        value={step?.stepName || ''}
                        onChange={(e) => {
                          const steps = data.paymentTermsPage?.steps || [];
                          const updated = steps.map(s => s.id === step.id ? { ...s, stepName: e.target.value } : s);
                          const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                          setData({ ...data, paymentTermsPage: { ...currentObj, steps: updated } });
                        }}
                        className="w-full p-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-bold text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-bold text-zinc-500">Amount (₹)</label>
                        <input
                          type="number"
                          value={step?.amount ?? 0}
                          onChange={(e) => {
                            const steps = data.paymentTermsPage?.steps || [];
                            const updated = steps.map(s => s.id === step.id ? { ...s, amount: Number(e.target.value) || 0 } : s);
                            const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                            setData({ ...data, paymentTermsPage: { ...currentObj, steps: updated } });
                          }}
                          className="w-full p-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-bold text-zinc-500">Status</label>
                        <ThreeDCurvedSelect
                          value={step?.status || 'Pending'}
                          options={[
                            { label: 'Completed', value: 'Completed' },
                            { label: 'Pending', value: 'Pending' },
                          ]}
                          onChange={(val) => {
                            const steps = data.paymentTermsPage?.steps || [];
                            const updated = steps.map(s => s.id === step.id ? { ...s, status: val as 'Completed' | 'Pending' } : s);
                            const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                            setData({ ...data, paymentTermsPage: { ...currentObj, steps: updated } });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const steps = data.paymentTermsPage?.steps || [];
                    const newStep: PaymentTermStep = {
                      id: `pt_${Date.now()}`,
                      date: '10 MAR 26',
                      stepName: 'Stage Payment',
                      amount: 25000,
                      status: 'Pending'
                    };
                    const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                    setData({
                      ...data,
                      paymentTermsPage: {
                        ...currentObj,
                        steps: [...steps, newStep]
                      }
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />
                  <span>+ Add Installment Step</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 9. Add-Ons Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
          <div 
            onClick={() => setOpenCard(openCard === 'addons' ? null : 'addons')}
            className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>9. Add-Ons &amp; Upgrades</span>
            </div>
            {openCard === 'addons' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {openCard === 'addons' && (
            <div className="p-3 space-y-3 bg-white">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Sub-Text Header</label>
                <input
                  type="text"
                  value={data.addOnsPage?.subText || ''}
                  onChange={(e) => {
                    const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                    setData({ ...data, addOnsPage: { ...currentObj, subText: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                />
              </div>

              <div className="space-y-2">
                {(data.addOnsPage?.items || DEFAULT_AIRY_PROPOSAL.addOnsPage.items).map((item, idx) => (
                  <div key={item?.id || idx} className="p-2.5 rounded-xl border border-amber-200/80 bg-zinc-50/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!item?.selected}
                          onChange={(e) => {
                            const items = data.addOnsPage?.items || [];
                            const updated = items.map(i => i.id === item.id ? { ...i, selected: e.target.checked } : i);
                            const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                            setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                          }}
                          className="w-4 h-4 rounded-md border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-900">Include Add-On</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const items = data.addOnsPage?.items || [];
                          const updated = items.filter(i => i.id !== item.id);
                          const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                          setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item?.title || ''}
                        onChange={(e) => {
                          const items = data.addOnsPage?.items || [];
                          const updated = items.map(i => i.id === item.id ? { ...i, title: e.target.value } : i);
                          const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                          setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                        }}
                        className="w-full p-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-bold text-xs"
                        placeholder="Add-on Title"
                      />
                      <input
                        type="number"
                        value={item?.price ?? 0}
                        onChange={(e) => {
                          const items = data.addOnsPage?.items || [];
                          const updated = items.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) || 0 } : i);
                          const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                          setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                        }}
                        className="w-full p-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-bold text-xs"
                        placeholder="Price (₹)"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const items = data.addOnsPage?.items || [];
                    const newItem: AddOnItem = {
                      id: `add_${Date.now()}`,
                      title: 'Custom Service Upgrade',
                      price: 10000,
                      selected: true
                    };
                    const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                    setData({
                      ...data,
                      addOnsPage: {
                        ...currentObj,
                        items: [...items, newItem]
                      }
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />
                  <span>+ Add Custom Add-On</span>
                </button>
              </div>
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

  // Financial Calculations for Pricing & Payment Terms
  const pricingCalculated = calculatePricingTotals(data.pricingPage);
  const paymentTermsCalculated = calculatePaymentTermsSummary(
    data.paymentTermsPage?.steps || [],
    pricingCalculated.netTotal
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
        #quotation-document {
          width: 794px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        #quotation-document section {
          width: 794px !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: unset !important;
          break-after: auto !important;
        }
        .pdf-capture-active #quotation-document img {
          object-fit: cover !important;
          max-width: 100% !important;
        }
        .pdf-capture-active svg,
        .pdf-capture-active img {
          transform-box: fill-box !important;
        }
        .pdf-capture-active h1,
        .pdf-capture-active h2,
        .pdf-capture-active h3,
        .pdf-capture-active p,
        .pdf-capture-active .brand-name-heading,
        .pdf-capture-active .couple-name-heading {
          white-space: normal !important;
          word-break: keep-all !important;
          letter-spacing: normal !important;
        }
        @media print {
          @page {
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
          className="flex-1 bg-[#EBECEF] p-2 sm:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start pb-20 md:pb-8"
        >
          
          {/* Scaled Continuous Canvas Container Wrapper */}
          <div 
            id="quotation-canvas-container"
            className="proposal-canvas-container flex flex-col items-center gap-0 transition-transform duration-200 origin-top"
            style={{ 
              transform: `scale(${zoomScale})`, 
              transformOrigin: 'top center',
              width: '794px',
              marginBottom: `${(zoomScale - 1) * 2000}px`
            }}
            ref={canvasRef}
          >

            <div 
              id="quotation-document"
              className="w-full flex flex-col items-center justify-start py-8 bg-[#f3f4f6] min-h-screen overflow-y-auto"
            >
              <div 
                id="quotation-full-canvas" 
                style={{ width: '794px' }} 
                className="flex flex-col gap-0"
              >
                <section 
                  className="quotation-page cover-page flex flex-col transition-colors duration-300 select-none"
                style={{
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  minHeight: getDynamicPageHeight(data.cover),
                  height: getDynamicPageHeight(data.cover),
                  boxSizing: 'border-box',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '0 auto', // Center alignment guarantee
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  backgroundColor: pageBgColor || '#FFFFFF',
                  color: textColor,
                  fontFamily: data.secondaryFont,
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

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full ${
                data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' 
                  ? 'px-0 pt-10 pb-0' 
                  : 'p-12'
              } ${!data.cover.photoUrl ? 'justify-center items-center' : 'justify-between'}`}>
                <div className={`w-full space-y-6 flex flex-col items-center justify-center my-auto ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-0' : ''}`}>
                  
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

                  <div className={`space-y-2 ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                    <h1 className="couple-name-heading text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm whitespace-pre-line text-center" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.cover.coupleName !== undefined ? data.cover.coupleName : (data.cover.groomName ? `${data.cover.groomName} & ${data.cover.brideName}` : 'YASH & TWINKLE')}
                    </h1>
                    <h3 className="text-base tracking-[0.2em] uppercase font-bold whitespace-nowrap pt-1" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                    </h3>
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

                  <div className={`space-y-2 pt-1 ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-12' : ''}`}>

                    {/* Brand Name & Logo Shifted Directly Below Event Type */}
                    <div className="w-full flex flex-col items-center justify-center space-y-1 py-1">
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
                          <div className="brand-name-heading text-lg tracking-[0.25em] uppercase font-black whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                            {data.cover.brandName || 'FILMIFY WEDDINGS'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subtitle Side Type & Location with blank filtering */}
                    {(() => {
                      const sideText = (data.cover.sideOption || '').trim().toUpperCase();
                      const locText = (data.cover.locationName || '').trim().toUpperCase();
                      const subtitleText = [sideText, locText].filter(Boolean).join(' – ');
                      if (!subtitleText) return null;
                      return (
                        <p className="text-xs tracking-[0.18em] uppercase font-medium opacity-90 whitespace-nowrap" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                          {subtitleText}
                        </p>
                      );
                    })()}
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
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 2: ABOUT US */}
            <section 
              className="quotation-page content-page flex flex-col transition-colors duration-300"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: getDynamicPageHeight(data.aboutUs),
                height: getDynamicPageHeight(data.aboutUs),
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto', // Center alignment guarantee
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
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
                <BirdsSVG textColor={textColor} className="w-[220px] h-auto object-contain block" />
              </div>

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full ${
                data.aboutUs.frameShape === 'full-width' || (data.aboutUs.imagePosition as string) === 'full' 
                  ? 'px-0 pt-10 pb-0' 
                  : 'p-12'
              } ${!data.aboutUs.bottomBannerPhoto ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.aboutUs.frameShape === 'full-width' || (data.aboutUs.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
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
                    <MonogramSVG textColor={textColor} className="w-[260px] h-auto object-contain block mx-auto" />
                  </div>

                  <div className="my-6 px-6 flex items-center justify-center gap-3 max-w-xl mx-auto text-center">
                    <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>“</span>
                    <p className="text-sm leading-relaxed font-normal opacity-90 tracking-wide whitespace-pre-line" style={{ color: textColor, fontFamily: data.secondaryFont }}>
                      {data.aboutUs.text}
                    </p>
                    <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>”</span>
                  </div>
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
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 3: PRE-WEDDING SHOOT */}
            <section 
              className="quotation-page content-page flex flex-col transition-colors duration-300"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: getDynamicPageHeight(data.shootDetails),
                height: getDynamicPageHeight(data.shootDetails),
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
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

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full ${
                data.shootDetails.frameShape === 'full-width' || (data.shootDetails.imagePosition as string) === 'full' 
                  ? 'px-0 pt-10 pb-0' 
                  : 'p-12'
              } ${!data.shootDetails.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.shootDetails.frameShape === 'full-width' || (data.shootDetails.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
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

                  <div className="text-center space-y-2 mb-6">
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

                  <div className="space-y-3 max-w-lg mx-auto mt-6 flex flex-col items-center">
                    <p className="text-base font-bold tracking-wide flex items-center justify-center gap-2 mb-1" style={{ color: textColor }}>
                      <Camera className="w-4 h-4" style={{ color: kickerColor }} />
                      <span>{data.shootDetails.daysText || '1 Day Shoot'}</span>
                    </p>
                    <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                      {(data.shootDetails.crewText || 'Candid Photography\nCinematography\nPortable Changing Room')
                        .split('\n').filter(Boolean).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-sm font-medium tracking-wide leading-tight" style={{ color: textColor }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: kickerColor }} />
                            <span>{item.trim()}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="pt-2 space-y-3 max-w-lg mx-auto mb-8 flex flex-col items-center">
                    <h3 className="text-2xl tracking-wide font-normal text-center whitespace-nowrap mb-1" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.shootDetails.deliverablesHeading || 'Deliverables'}
                    </h3>
                    <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                      {(data.shootDetails.deliverablesText || 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel')
                        .split('\n').filter(Boolean).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-sm font-medium tracking-wide leading-tight" style={{ color: textColor }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: kickerColor }} />
                            <span>{item.trim()}</span>
                          </div>
                        ))}
                    </div>
                  </div>
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
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 4: FUNCTIONS & COVERAGE */}
            <section 
              className="quotation-page content-page flex flex-col transition-colors duration-300"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: getDynamicPageHeight(data.functionsPage),
                height: getDynamicPageHeight(data.functionsPage),
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              {data.functionsPage?.photo && data.functionsPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.functionsPage.photo}
                  frameShape="background"
                  photoHeight={data.functionsPage.photoHeight}
                  photoWidth={data.functionsPage.photoWidth}
                  photoFocalY={data.functionsPage.photoFocalY}
                  bgOpacity={data.functionsPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Functions Background"
                />
              )}

              <div className={`relative z-10 mx-auto flex flex-col h-full w-full ${
                data.functionsPage?.frameShape === 'full-width' || (data.functionsPage?.imagePosition as string) === 'full' 
                  ? 'px-0 pt-10 pb-0' 
                  : 'p-12'
              } ${!data.functionsPage?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-start w-full ${data.functionsPage?.frameShape === 'full-width' || (data.functionsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && data.functionsPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.functionsPage.photo}
                      frameShape={data.functionsPage.frameShape}
                      photoHeight={data.functionsPage.photoHeight}
                      photoWidth={data.functionsPage.photoWidth}
                      photoFocalY={data.functionsPage.photoFocalY}
                      altText="Functions Banner"
                    />
                  )}

                  <div className="text-center space-y-2 mb-6">
                    <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap" style={{ color: kickerColor }}>
                      {data.functionsPage?.kicker || 'EVENT SCHEDULE'}
                    </span>
                    <h2 className="text-4xl tracking-wide font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.functionsPage?.heading || 'Functions & Coverage'}
                    </h2>
                  </div>

                  {/* CENTER IMAGE POSITION */}
                  {data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && data.functionsPage?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.functionsPage.photo}
                      frameShape={data.functionsPage.frameShape}
                      photoHeight={data.functionsPage.photoHeight}
                      photoWidth={data.functionsPage.photoWidth}
                      photoFocalY={data.functionsPage.photoFocalY}
                      altText="Functions Banner"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-5 my-auto">
                    {(data.functionsPage?.items || []).map((func, index) => (
                      <div 
                        key={func.id || index} 
                        className="p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs"
                        style={{ 
                          borderColor: borderColor || 'rgba(0,0,0,0.12)',
                          backgroundColor: boxBgColor || 'rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Function Name & Timing Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-3" style={{ borderColor: borderColor || 'rgba(0,0,0,0.1)' }}>
                          <h3 className="text-2xl tracking-wider font-semibold uppercase" style={{ color: textColor, fontFamily: data.primaryFont }}>
                            {func.name || `Function ${index + 1}`}
                          </h3>
                          <div className="text-[11px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border shadow-2xs inline-flex items-center gap-1.5 self-start sm:self-auto" style={{ color: kickerColor, borderColor: borderColor || 'rgba(0,0,0,0.15)', backgroundColor: pageBgColor }}>
                            <Calendar className="w-3 h-3" />
                            <span>
                              {[
                                (func as FunctionItem).dateNotFixed ? 'DATE NOT FIXED' : func.date,
                                func.startTime && func.endTime ? `${func.startTime} TO ${func.endTime}` : null,
                                (func.durationSlot && func.durationSlot !== 'None') ? `(${func.durationSlot})` : null
                              ].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        </div>

                        {/* Venue Location */}
                        {func.location && (
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90" style={{ color: textColor }}>
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-600" style={{ color: kickerColor }} />
                            <span>{func.location}</span>
                          </div>
                        )}

                        {/* Requirements & Crew List */}
                        {func.requirements && func.requirements.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest block opacity-75" style={{ color: kickerColor }}>
                              Crew &amp; Requirements:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                              {func.requirements.map((req, rIdx) => {
                                const q = req.qty || 1;
                                let label = req.name;
                                if (q > 1) {
                                  if (req.name.toLowerCase().includes('photography') || req.name.toLowerCase().includes('photographer')) {
                                    label = req.name.replace(/photography/i, 'Photographers').replace(/photographer/i, 'Photographers');
                                  } else if (req.name.toLowerCase().includes('cinematography') || req.name.toLowerCase().includes('cinematographer')) {
                                    label = req.name.replace(/cinematography/i, 'Cinematographers').replace(/cinematographer/i, 'Cinematographers');
                                  }
                                }
                                return (
                                  <div key={rIdx} className="flex items-center gap-2" style={{ color: textColor }}>
                                    <Camera className="w-3.5 h-3.5 shrink-0" style={{ color: kickerColor }} />
                                    <span>{`${q} × ${label}`}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom Notes */}
                        {func.notes && (
                          <p className="text-xs italic leading-relaxed opacity-85 pt-1 border-t" style={{ color: textColor, borderColor: borderColor || 'rgba(0,0,0,0.08)' }}>
                            "{func.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && (data.functionsPage?.imagePosition === 'bottom' || !data.functionsPage?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.functionsPage.photo}
                    frameShape={data.functionsPage.frameShape}
                    photoHeight={data.functionsPage.photoHeight}
                    photoWidth={data.functionsPage.photoWidth}
                    photoFocalY={data.functionsPage.photoFocalY}
                    isBottomFlush={true}
                    altText="Functions Banner"
                  />
                )}
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 5: DELIVERABLES */}
            <section 
              className="quotation-page content-page flex flex-col transition-colors duration-300"
              style={{
                width: '794px',
                height: getDynamicPageHeight(data.deliverablesPage),
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: getDynamicPageHeight(data.deliverablesPage),
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              {data.deliverablesPage?.photo && data.deliverablesPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.deliverablesPage.photo}
                  frameShape="background"
                  photoHeight={data.deliverablesPage.photoHeight}
                  photoWidth={data.deliverablesPage.photoWidth}
                  photoFocalY={data.deliverablesPage.photoFocalY}
                  bgOpacity={data.deliverablesPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Deliverables Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full ${
                data.deliverablesPage?.frameShape === 'full-width' || (data.deliverablesPage?.imagePosition as string) === 'full' 
                  ? 'px-0 pt-10 pb-0' 
                  : 'p-12'
              } ${!data.deliverablesPage?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.deliverablesPage?.frameShape === 'full-width' || (data.deliverablesPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && data.deliverablesPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.deliverablesPage.photo}
                      frameShape={data.deliverablesPage.frameShape}
                      photoHeight={data.deliverablesPage.photoHeight}
                      photoWidth={data.deliverablesPage.photoWidth}
                      photoFocalY={data.deliverablesPage.photoFocalY}
                      altText="Deliverables Photo"
                    />
                  )}

                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                    {data.deliverablesPage?.kicker || 'WHAT WE DELIVER'}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.deliverablesPage?.heading || 'DELIVERABLES'}
                  </h2>

                  {/* CENTER IMAGE POSITION */}
                  {data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && data.deliverablesPage?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.deliverablesPage.photo}
                      frameShape={data.deliverablesPage.frameShape}
                      photoHeight={data.deliverablesPage.photoHeight}
                      photoWidth={data.deliverablesPage.photoWidth}
                      photoFocalY={data.deliverablesPage.photoFocalY}
                      altText="Deliverables Photo"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-3 text-left">
                    {(data.deliverablesPage?.selectedItems || []).map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs"
                        style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-amber-700" style={{ color: kickerColor }} />
                        </div>
                        <span className="text-xs font-bold leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && (data.deliverablesPage?.imagePosition === 'bottom' || !data.deliverablesPage?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.deliverablesPage.photo}
                    frameShape={data.deliverablesPage.frameShape}
                    photoHeight={data.deliverablesPage.photoHeight}
                    photoWidth={data.deliverablesPage.photoWidth}
                    photoFocalY={data.deliverablesPage.photoFocalY}
                    isBottomFlush={true}
                    altText="Deliverables Photo"
                  />
                )}
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 6: SPECIAL VALUE ADDITIONS */}
            <section 
              className="quotation-page content-page flex flex-col justify-center items-center text-center p-12 transition-colors duration-300"
              style={{
                width: '794px',
                height: '1123px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-6">
                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.specialValueAdditions?.kicker || 'COMPLIMENTARY'}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.specialValueAdditions?.heading || 'SPECIAL VALUE ADDITIONS'}
                </h2>

                <div className="w-full space-y-3 text-left pt-2">
                  {(data.specialValueAdditions?.selectedItems || []).map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all"
                      style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Gift className="w-4 h-4 text-amber-600" style={{ color: kickerColor }} />
                        </div>
                        <span className="text-xs font-bold leading-relaxed">{item}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 shrink-0">
                        FREE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 7: PRICING DETAILS */}
            <section 
              className="quotation-page content-page flex flex-col justify-center items-center text-center p-12 transition-colors duration-300"
              style={{
                width: '794px',
                height: '1123px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-6">
                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.pricingPage?.kicker || 'INVESTMENT & BREAKDOWN'}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.pricingPage?.heading || 'PRICING DETAILS'}
                </h2>

                <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor }}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                      <tr>
                        <th className="py-3.5 px-5">Financial Item / Particulars</th>
                        <th className="py-3.5 px-5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-semibold" style={{ color: textColor, borderColor }}>
                      <tr>
                        <td className="py-3 px-5">Base Package Price</td>
                        <td className="py-3 px-5 text-right font-mono">₹{pricingCalculated.base.toLocaleString('en-IN')}</td>
                      </tr>
                      {pricingCalculated.disc > 0 && (
                        <tr className="text-emerald-700 bg-emerald-50/30">
                          <td className="py-3 px-5">Discount (Complimentary)</td>
                          <td className="py-3 px-5 text-right font-mono">-₹{pricingCalculated.disc.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {pricingCalculated.accom > 0 && (
                        <tr>
                          <td className="py-3 px-5">Accommodation Charges</td>
                          <td className="py-3 px-5 text-right font-mono">₹{pricingCalculated.accom.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {pricingCalculated.travel > 0 && (
                        <tr>
                          <td className="py-3 px-5">Travel Charges</td>
                          <td className="py-3 px-5 text-right font-mono">₹{pricingCalculated.travel.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {pricingCalculated.addl > 0 && (
                        <tr>
                          <td className="py-3 px-5">Additional Charges</td>
                          <td className="py-3 px-5 text-right font-mono">₹{pricingCalculated.addl.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      <tr className="border-t font-bold" style={{ backgroundColor: boxBgColor }}>
                        <td className="py-3 px-5 uppercase text-[11px] font-black">Subtotal (Gross Total)</td>
                        <td className="py-3 px-5 text-right font-mono font-black">₹{pricingCalculated.gross.toLocaleString('en-IN')}</td>
                      </tr>
                      {pricingCalculated.gstPct > 0 && (
                        <tr>
                          <td className="py-3 px-5">GST ({pricingCalculated.gstPct}%)</td>
                          <td className="py-3 px-5 text-right font-mono">₹{pricingCalculated.gstAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="w-full p-5 rounded-2xl border flex items-center justify-between shadow-md" style={{ backgroundColor: boxBgColor, borderColor }}>
                  <div className="text-left">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest block" style={{ color: kickerColor }}>FINAL NET INVESTMENT</span>
                    <span className="text-xs font-medium opacity-80" style={{ color: textColor }}>Inclusive of all Taxes &amp; Fees</span>
                  </div>
                  <div className="text-3xl font-black font-mono tracking-tight" style={{ color: textColor }}>
                    ₹{pricingCalculated.netTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 8: PAYMENT TERMS & SCHEDULE */}
            <section 
              className="quotation-page content-page flex flex-col justify-center items-center text-center p-12 transition-colors duration-300"
              style={{
                width: '794px',
                height: '1123px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-6">
                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.paymentTermsPage?.kicker || 'SCHEDULE'}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.paymentTermsPage?.heading || 'PAYMENT TERMS & SCHEDULE'}
                </h2>

                {/* Structured Table matching reference design */}
                <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-extrabold">
                      <tr>
                        <th className="py-3.5 px-4 w-[24%]">DATE</th>
                        <th className="py-3.5 px-4 w-[38%]">STEPS</th>
                        <th className="py-3.5 px-4 w-[20%] text-right">AMOUNT</th>
                        <th className="py-3.5 px-4 w-[18%] text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/80 text-xs font-semibold text-zinc-800 bg-white">
                      {(data.paymentTermsPage?.steps || []).map((step) => (
                        <tr key={step.id} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900 uppercase">{step.date}</td>
                          <td className="py-3 px-4 font-bold text-zinc-900">{step.stepName}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">₹{Number(step.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                              step.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              {step.status === 'Completed' ? <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> : <Clock className="w-3 h-3 text-amber-600" />}
                              <span>{step.status}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Automatic Summary Cards */}
                <div className="grid grid-cols-3 gap-3 w-full text-center pt-2">
                  <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/80 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 block mb-1">FIXED AMOUNT</span>
                    <span className="text-base font-black font-mono text-zinc-900">₹{paymentTermsCalculated.fixedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">RECEIVED AMOUNT</span>
                    <span className="text-base font-black font-mono text-emerald-800">₹{paymentTermsCalculated.receivedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1">PENDING AMOUNT</span>
                    <span className="text-base font-black font-mono text-amber-900">₹{paymentTermsCalculated.pendingAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 9: ADD-ONS & UPGRADES */}
            <section 
              className="quotation-page content-page flex flex-col justify-center items-center text-center p-12 transition-colors duration-300"
              style={{
                width: '794px',
                height: '1123px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-6">
                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap" style={{ color: kickerColor }}>
                  {data.addOnsPage?.kicker || "EMBRACE YOUR DAY — YOU'RE IN CONTROL"}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.addOnsPage?.heading || 'ADD-ONS & UPGRADES'}
                </h2>
                {data.addOnsPage?.subText && (
                  <p className="text-xs font-medium opacity-80 -mt-3" style={{ color: textColor }}>
                    {data.addOnsPage.subText}
                  </p>
                )}

                <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-extrabold">
                      <tr>
                        <th className="py-3.5 px-5">ADD-ON SERVICE / PARTICULAR</th>
                        <th className="py-3.5 px-5 text-right">PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/80 text-xs font-semibold text-zinc-800 bg-white">
                      {(data.addOnsPage?.items || []).filter(item => item.selected).map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/50">
                          <td className="py-3.5 px-5 font-bold text-zinc-900">{item.title}</td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-zinc-900">₹{Number(item.price || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Inter-page Gap Spacer */}
            <div 
              className="w-[794px] h-4 mx-auto shrink-0"
              style={{ backgroundColor: '#f9e4cc' }}
            />

            {/* SECTION 6: DELIVERY TIMELINE & TERMS */}
            <section 
              className="quotation-page content-page flex flex-col transition-colors duration-300"
              style={{
                width: '794px',
                height: '1123px',
                minWidth: '794px',
                maxWidth: '794px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto', // Center alignment guarantee
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
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

              <div className={`relative z-10 mx-auto text-center flex flex-col p-12 h-full w-full ${!data.termsAndThankYou.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
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
            </section>

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

export default function TemplateQuotationBuilderPage() {
  useEffect(() => {
    console.log('=== TEMPLET_A4_STRICT_REVERT_V7 ===');
  }, []);

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
