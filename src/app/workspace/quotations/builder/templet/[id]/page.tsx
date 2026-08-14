'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit3, 
  ArrowLeft, ArrowRight, Eye, Share2, Copy, Percent, DollarSign, 
  Palette, Type, Layout, ShieldCheck, Film, Video, Camera, BookOpen, 
  Calendar, MapPin, Users, AlertCircle, CheckCircle2, ChevronRight, 
  Download, Printer, RefreshCw, X, Layers, ExternalLink, ChevronUp, ChevronDown, Move, Image as ImageIcon, Sliders,
  ZoomIn, ZoomOut, Maximize2, Menu, ArrowUp, ArrowDown, Circle, MoveVertical, MoveHorizontal, AlignVerticalSpaceAround, AlignCenter, Clock,
  Gift, CreditCard, PackageCheck, Heart, Phone, Mail, Globe, GripVertical, CopyPlus, PlusCircle, Tag
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { cacheDocumentLocal, getCachedDocumentLocal, queueOfflineMutation, flushOfflineOutbox } from '@/lib/indexeddb-cache';
import { downloadServerChromiumPdf } from '@/lib/pdf-export-engine';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady, preloadActiveFont } from '@/lib/font-loader';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';

const MasterMediaModal = dynamic(
  () => import('@/components/MasterMediaModal').then(m => m.MasterMediaModal),
  { ssr: false }
);
import { paginateFunctionsPageItems } from '@/lib/functions-paginator';
import { paginateDeliverablesPageItems, paginateSpecialValueAdditionsPageItems } from '@/lib/deliverables-paginator';
import { resolveFunctionTitle } from '@/components/QuotationDocumentCanvas';

// Using imported BirdsSVG and MonogramSVG from QuotationSVGs

// Exact Registered Color Palettes with Inverted Counterparts
interface ColorTheme {
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

const COLOR_THEMES: ColorTheme[] = [
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

interface PaymentTermStep {
  id: string;
  date: string;
  stepName: string;
  amount: number;
  status: 'Completed' | 'Pending';
}

interface AddOnItem {
  id: string;
  title: string;
  price: number;
  selected: boolean;
}

interface PageSequenceItem {
  id: string;
  type: string;
  label: string;
  isStandard?: boolean;
  customId?: string;
}

interface CustomPageItem {
  id: string;
  heading: string;
  kicker?: string;
  subtitle?: string;
  text?: string;
  photo?: string;
  photoHeight?: number;
  photoWidth?: number;
  photoFocalY?: number;
  bgOpacity?: number;
  frameShape?: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  imagePosition?: 'top' | 'center' | 'bottom' | 'full';
}

const STANDARD_PAGE_DEFINITIONS: { type: string; label: string }[] = [
  { type: 'cover', label: 'Cover Page' },
  { type: 'aboutUs', label: 'About Us' },
  { type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { type: 'functionsPage', label: 'Functions & Coverage' },
  { type: 'deliverablesPage', label: 'Deliverables' },
  { type: 'specialValueAdditions', label: 'Special Value Additions' },
  { type: 'pricingPage', label: 'Pricing Details' },
  { type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { type: 'termsPage', label: 'Terms & Conditions' },
  { type: 'thankYouPage', label: 'Thank You Page' },
];

const DEFAULT_PAGE_SEQUENCE: PageSequenceItem[] = STANDARD_PAGE_DEFINITIONS.map(std => ({
  id: std.type,
  type: std.type,
  label: std.label,
  isStandard: true,
}));

// StudioCore Presets & Full Dynamic State
const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Wedding - Design 1',
  eventGroup: 'Wedding',
  look: 'Cyprus & Sand Dune',
  primaryFont: "'Cormorant Garamond', serif",
  secondaryFont: "'Plus Jakarta Sans', sans-serif",
  pageSequence: DEFAULT_PAGE_SEQUENCE,
  customPages: {} as Record<string, CustomPageItem>,

  // 1. Cover Page State
  cover: {
    groomName: 'Rahul',
    brideName: 'Neha',
    coupleName: 'Rahul & Neha',
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
    showExclusionsNote: false,
    exclusionsNote: 'This excludes travel, accommodation, food & any add-on services.',
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
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
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
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
    showExclusionsNote: false,
    exclusionsNote: 'This excludes travel, accommodation, food & any add-on services.',
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
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
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
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 10. Terms & Conditions Page State
  termsPage: {
    kicker: 'POLICIES & RULES',
    heading: 'TERMS & CONDITIONS',
    text: `1. Advance payment is non-refundable upon booking confirmation.
2. Travel and accommodation charges outside the base city shall be borne by the client or billed at actuals.
3. Raw footage and unedited photos will be delivered as per agreed timelines.
4. One cycle of revision is included for final video edits within 30 days of delivery.
5. All copyright of photographs and films remains with the studio unless explicitly transferred.`,
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  // 11. Thank You Page State
  thankYouPage: {
    heading: 'THANK YOU',
    subHeading: 'LOOKING FORWARD TO CREATING MAGIC',
    message: 'We would be honored to capture your celebration and create memories for a lifetime.',
    brandLogoUrl: '',
    brandName: 'FILMIFY WEDDINGS',
    contactNumber: '+91 98765 43210',
    email: 'contact@filmifyweddings.com',
    website: 'www.filmifyweddings.com',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
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
              <span className="font-mono text-amber-900">{photoHeight || (frameShape === 'background' ? 1123 : 380)}px</span>
            </div>
            <input
              type="range"
              min={frameShape === 'background' ? 1123 : 100}
              max={frameShape === 'background' ? 2500 : 800}
              step={10}
              value={photoHeight || (frameShape === 'background' ? 1123 : 380)}
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
        className="absolute inset-0 z-0 overflow-hidden w-full h-full pointer-events-none select-none transition-all duration-200"
        style={{ height: '100%', width: '100%', backgroundColor: pageBgColor }}
      >
        <img
          src={photo}
          alt={altText}
          className="w-full h-full object-cover block absolute inset-0 z-0"
          style={{ 
            objectPosition: `50% ${photoFocalY}%`, 
            height: '100%', 
            width: '100%',
            opacity: (bgOpacity ?? 40) / 100 
          }}
        />
      </div>
    );
  }

  if (frameShape === 'full-width') {
    return (
      <div className={`w-full overflow-hidden ${isBottomFlush ? 'mt-6 mb-0' : 'mt-6 mb-4'}`}>
        <img
          src={photo}
          alt={altText}
          className="w-full block object-cover border-none"
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
        className={`overflow-hidden relative transition-all duration-200 border-none bg-transparent ${shapeClass}`}
        style={{
          width: `${photoWidth}%`,
          height: `${photoHeight}px`,
          backgroundColor: 'transparent'
        }}
      >
        <img
          src={photo}
          alt={altText}
          className="w-full h-full object-cover bg-transparent border-none"
          style={{ objectPosition: `50% ${photoFocalY}%`, backgroundColor: 'transparent' }}
        />
      </div>
    </div>
  );
}

function getDynamicPageHeight(sectionData?: { 
  frameShape?: string; 
  imageLayout?: string; 
  imagePosition?: string; 
  photoHeight?: number; 
  bottomBannerHeight?: number;
  backgroundPageHeight?: number;
}) {
  return '1123px';
}

function chunkArray<T>(arr: T[] | undefined | null, size: number): T[][] {
  if (!arr || arr.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const handleTriggerPicker = () => {
    if (disabled) return;
    try {
      dateInputRef.current?.showPicker?.();
    } catch (_) {
      dateInputRef.current?.focus();
    }
  };

  return (
    <div 
      onClick={handleTriggerPicker}
      className={`relative w-full rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 shadow-2xs transition-all flex items-center justify-between p-2.5 ${disabled ? 'opacity-60 bg-zinc-100 cursor-not-allowed' : 'cursor-pointer hover:border-amber-300'}`}
    >
      <input
        type="text"
        value={disabled ? 'DATE NOT FIXED' : (value || '')}
        placeholder="e.g. 15 DEC 26"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-transparent text-xs font-bold uppercase text-zinc-900 focus:outline-none placeholder:text-zinc-400 select-text"
      />
      <Calendar className="w-4 h-4 text-amber-600 shrink-0 ml-2 select-none cursor-pointer" />

      {!disabled && (
        <input
          ref={dateInputRef}
          type="date"
          onChange={handleDateInputChange}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
        />
      )}
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
  const timeInputRef = useRef<HTMLInputElement>(null);

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

  const handleTriggerTimePicker = () => {
    try {
      timeInputRef.current?.showPicker?.();
    } catch (_) {
      timeInputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-[10px] uppercase font-bold text-zinc-500">{label}</label>}
      <div 
        onClick={handleTriggerTimePicker}
        className="relative w-full rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-zinc-900 shadow-2xs transition-all flex items-center justify-between p-2 cursor-pointer hover:border-amber-300"
      >
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 select-none mr-1.5 cursor-pointer" />
        <input
          type="text"
          value={value || ''}
          placeholder="e.g. 07:00 PM"
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-xs font-bold uppercase text-zinc-900 focus:outline-none placeholder:text-zinc-400 select-text"
        />
        <input
          ref={timeInputRef}
          type="time"
          step="900"
          onChange={handleTimeChange}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
        />
      </div>
    </div>
  );
}

function ThreeDCurvedMultiSelect({
  title,
  availableOptions,
  selectedItems,
  onChangeSelectedItems,
  onAddCustomOption,
  onEditOption,
  onDeleteOption,
}: {
  title: string;
  availableOptions: string[];
  selectedItems: string[];
  onChangeSelectedItems: (newSelectedItems: string[]) => void;
  onAddCustomOption: (newItem: string) => void;
  onEditOption?: (oldItem: string, newItem: string) => void;
  onDeleteOption?: (itemToDelete: string) => void;
}) {
  const toggleItem = (item: string) => {
    let newSelected: string[];
    if (selectedItems.includes(item)) {
      newSelected = selectedItems.filter((i: any) => i !== item);
    } else {
      newSelected = [...selectedItems, item];
    }
    onChangeSelectedItems(newSelected);
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

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {availableOptions.length === 0 ? (
          <div className="text-[11px] text-zinc-400 italic p-2 text-center">No options available. Click + Add to create one.</div>
        ) : (
          availableOptions.map((item: any) => {
            const isSelected = selectedItems.includes(item);
            return (
              <div
                key={item}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all group ${
                  isSelected
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                    : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100/80'
                }`}
              >
                {/* 1. Checkbox at the START (Left side) */}
                <button
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-zinc-300 bg-white hover:border-amber-400'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* 2. Item Text (Clickable to toggle) */}
                <span 
                  onClick={() => toggleItem(item)} 
                  className="flex-1 cursor-pointer select-none leading-tight truncate"
                >
                  {item}
                </span>

                {/* 3. Action Buttons: Edit (✏️) + Delete (🗑️) */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const edited = prompt(`Edit ${title} item:`, item);
                      if (edited && edited.trim() && edited.trim() !== item) {
                        const trimmed = edited.trim();
                        if (onEditOption) {
                          onEditOption(item, trimmed);
                        } else {
                          onAddCustomOption(trimmed);
                          const updatedSel = selectedItems.map(s => s === item ? trimmed : s);
                          onChangeSelectedItems(updatedSel);
                        }
                      }
                    }}
                    className="p-1 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition-all cursor-pointer"
                    title={`Edit ${item}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {onDeleteOption && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOption(item);
                      }}
                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all cursor-pointer"
                      title={`Delete ${item}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface FunctionItem {
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
  onEditCustomFunctionName,
  onDeleteCustomFunctionName,
  onAddCustomDuration,
  onAddCustomRequirement,
  onEditCustomRequirement,
  onDeleteCustomRequirement,
}: {
  func: FunctionItem;
  index: number;
  availableFunctionNames: string[];
  availableDurationSlots: string[];
  availableRequirements: string[];
  onUpdate: (updated: FunctionItem) => void;
  onDelete: () => void;
  onAddCustomFunctionName: (name: string) => void;
  onEditCustomFunctionName?: (oldName: string, newName: string) => void;
  onDeleteCustomFunctionName?: (name: string) => void;
  onAddCustomDuration: (dur: string) => void;
  onAddCustomRequirement: (req: string) => void;
  onEditCustomRequirement?: (oldReq: string, newReq: string) => void;
  onDeleteCustomRequirement?: (req: string) => void;
}) {
  const selectedEventNames = (func.name || '')
    .split(' + ')
    .map((s: any) => s.trim())
    .filter((s: string) => Boolean(s) && s.toLowerCase() !== 'event');

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

  const safeRequirements = Array.isArray(func.requirements) ? func.requirements : [];

  const toggleRequirement = (reqName: string) => {
    const exists = safeRequirements.find(r => r.name === reqName);
    let newReqs: { name: string; qty: number }[];
    if (exists) {
      newReqs = safeRequirements.filter(r => r.name !== reqName);
    } else {
      newReqs = [...safeRequirements, { name: reqName, qty: 1 }];
    }
    onUpdate({ ...func, requirements: newReqs });
  };

  const changeRequirementQty = (reqName: string, qty: number) => {
    const newReqs = safeRequirements.map(r => r.name === reqName ? { ...r, qty } : r);
    onUpdate({ ...func, requirements: newReqs });
  };

  const handleAddReq = () => {
    const customReq = prompt('Enter custom requirement item:');
    if (customReq && customReq.trim()) {
      const trimmed = customReq.trim();
      onAddCustomRequirement(trimmed);
      if (!safeRequirements.find(r => r.name === trimmed)) {
        onUpdate({ ...func, requirements: [...safeRequirements, { name: trimmed, qty: 1 }] });
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
            Function #{index + 1} ({resolveFunctionTitle(func.name)})
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
              className="px-2 py-0.5 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all flex items-center gap-1"
            >
              + Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {availableFunctionNames.map((evtName) => {
              const isSelected = selectedEventNames.includes(evtName);
              return (
                <div
                  key={evtName}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all group ${
                    isSelected
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                      : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {/* 1. Checkbox at the START */}
                  <button
                    type="button"
                    onClick={() => toggleEventName(evtName)}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-300 bg-white hover:border-amber-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* 2. Event Name Text */}
                  <span 
                    onClick={() => toggleEventName(evtName)}
                    className="flex-1 cursor-pointer select-none leading-tight truncate"
                  >
                    {evtName}
                  </span>

                  {/* 3. Action Buttons: Edit (✏️) + Delete (🗑️) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const edited = prompt('Edit Event Name:', evtName);
                        if (edited && edited.trim() && edited.trim() !== evtName) {
                          const trimmed = edited.trim();
                          if (onEditCustomFunctionName) {
                            onEditCustomFunctionName(evtName, trimmed);
                          }
                          if (selectedEventNames.includes(evtName)) {
                            const updated = selectedEventNames.map((n: any) => n === evtName ? trimmed : n);
                            onUpdate({ ...func, name: updated.join(' + ') });
                          }
                        }
                      }}
                      className="p-1 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition-all cursor-pointer"
                      title={`Edit ${evtName}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteCustomFunctionName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomFunctionName(evtName);
                          if (selectedEventNames.includes(evtName)) {
                            const updated = selectedEventNames.filter((n: any) => n !== evtName);
                            onUpdate({ ...func, name: updated.length > 0 ? updated.join(' + ') : 'Event' });
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all cursor-pointer"
                        title={`Delete ${evtName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
          options={availableDurationSlots.map((slot: any) => ({ label: slot, value: slot }))}
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
              className="px-2 py-0.5 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all flex items-center gap-1"
            >
              + Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {availableRequirements.map((reqName) => {
              const reqObj = safeRequirements.find(r => r.name === reqName);
              const isSelected = !!reqObj;
              return (
                <div
                  key={reqName}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all group ${
                    isSelected
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-bold'
                      : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {/* 1. Checkbox at START */}
                  <button
                    type="button"
                    onClick={() => toggleRequirement(reqName)}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-300 bg-white hover:border-amber-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* 2. Requirement Name */}
                  <span 
                    onClick={() => toggleRequirement(reqName)}
                    className="flex-1 cursor-pointer select-none leading-tight truncate"
                  >
                    {reqName}
                  </span>

                  {/* 3. Quantity Selector (when selected) */}
                  {isSelected && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-amber-800">Qty:</span>
                      <select
                        value={reqObj?.qty || 1}
                        onChange={(e) => changeRequirementQty(reqName, Number(e.target.value) || 1)}
                        className="p-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-[11px]"
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map((num: any) => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 4. Edit & Delete Buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const edited = prompt('Edit Requirement item:', reqName);
                        if (edited && edited.trim() && edited.trim() !== reqName) {
                          const trimmed = edited.trim();
                          if (onEditCustomRequirement) {
                            onEditCustomRequirement(reqName, trimmed);
                          }
                          if (isSelected) {
                            const updated = safeRequirements.map((r: any) => r.name === reqName ? { ...r, name: trimmed } : r);
                            onUpdate({ ...func, requirements: updated });
                          }
                        }
                      }}
                      className="p-1 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition-all cursor-pointer"
                      title={`Edit ${reqName}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteCustomRequirement && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomRequirement(reqName);
                          if (isSelected) {
                            const updated = safeRequirements.filter((r: any) => r.name !== reqName);
                            onUpdate({ ...func, requirements: updated });
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all cursor-pointer"
                        title={`Delete ${reqName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
      note: loaded.specialValueAdditions?.note ?? d.specialValueAdditions.note ?? '',
      photo: loaded.specialValueAdditions?.photo ?? d.specialValueAdditions.photo ?? '',
      photoHeight: loaded.specialValueAdditions?.photoHeight ?? d.specialValueAdditions.photoHeight ?? 360,
      photoWidth: loaded.specialValueAdditions?.photoWidth ?? d.specialValueAdditions.photoWidth ?? 75,
      photoFocalY: loaded.specialValueAdditions?.photoFocalY ?? d.specialValueAdditions.photoFocalY ?? 50,
      bgOpacity: loaded.specialValueAdditions?.bgOpacity ?? d.specialValueAdditions.bgOpacity ?? 40,
      frameShape: loaded.specialValueAdditions?.frameShape ?? d.specialValueAdditions.frameShape ?? 'rounded',
      imagePosition: loaded.specialValueAdditions?.imagePosition ?? d.specialValueAdditions.imagePosition ?? 'bottom',
    },
    pricingPage: {
      ...d.pricingPage,
      ...(loaded.pricingPage || {}),
      basePrice: typeof loaded.pricingPage?.basePrice === 'number' ? loaded.pricingPage.basePrice : d.pricingPage.basePrice,
      discountAmount: typeof loaded.pricingPage?.discountAmount === 'number' ? loaded.pricingPage.discountAmount : d.pricingPage.discountAmount,
      accommodationCharges: typeof loaded.pricingPage?.accommodationCharges === 'number' ? loaded.pricingPage.accommodationCharges : d.pricingPage.accommodationCharges,
      travelCharges: typeof loaded.pricingPage?.travelCharges === 'number' ? loaded.pricingPage.travelCharges : d.pricingPage.travelCharges,
      additionalCharges: typeof loaded.pricingPage?.additionalCharges === 'number' ? loaded.pricingPage.additionalCharges : d.pricingPage.additionalCharges,
      additionalChargesList: Array.isArray(loaded.pricingPage?.additionalChargesList) ? loaded.pricingPage.additionalChargesList : [],
      gstPct: typeof loaded.pricingPage?.gstPct === 'number' ? loaded.pricingPage.gstPct : d.pricingPage.gstPct,
      note: loaded.pricingPage?.note ?? d.pricingPage.note ?? '',
      photo: loaded.pricingPage?.photo ?? d.pricingPage.photo ?? '',
      photoHeight: loaded.pricingPage?.photoHeight ?? d.pricingPage.photoHeight ?? 360,
      photoWidth: loaded.pricingPage?.photoWidth ?? d.pricingPage.photoWidth ?? 75,
      photoFocalY: loaded.pricingPage?.photoFocalY ?? d.pricingPage.photoFocalY ?? 50,
      bgOpacity: loaded.pricingPage?.bgOpacity ?? d.pricingPage.bgOpacity ?? 40,
      frameShape: loaded.pricingPage?.frameShape ?? d.pricingPage.frameShape ?? 'rounded',
      imagePosition: loaded.pricingPage?.imagePosition ?? d.pricingPage.imagePosition ?? 'bottom',
    },
    paymentTermsPage: {
      ...d.paymentTermsPage,
      ...(loaded.paymentTermsPage || {}),
      steps: Array.isArray(loaded.paymentTermsPage?.steps)
        ? loaded.paymentTermsPage.steps
        : d.paymentTermsPage.steps,
      note: loaded.paymentTermsPage?.note ?? d.paymentTermsPage.note ?? '',
      photo: loaded.paymentTermsPage?.photo ?? d.paymentTermsPage.photo ?? '',
      photoHeight: loaded.paymentTermsPage?.photoHeight ?? d.paymentTermsPage.photoHeight ?? 360,
      photoWidth: loaded.paymentTermsPage?.photoWidth ?? d.paymentTermsPage.photoWidth ?? 75,
      photoFocalY: loaded.paymentTermsPage?.photoFocalY ?? d.paymentTermsPage.photoFocalY ?? 50,
      bgOpacity: loaded.paymentTermsPage?.bgOpacity ?? d.paymentTermsPage.bgOpacity ?? 40,
      frameShape: loaded.paymentTermsPage?.frameShape ?? d.paymentTermsPage.frameShape ?? 'rounded',
      imagePosition: loaded.paymentTermsPage?.imagePosition ?? d.paymentTermsPage.imagePosition ?? 'bottom',
    },
    addOnsPage: {
      ...d.addOnsPage,
      ...(loaded.addOnsPage || {}),
      items: Array.isArray(loaded.addOnsPage?.items)
        ? loaded.addOnsPage.items
        : d.addOnsPage.items,
      note: loaded.addOnsPage?.note ?? d.addOnsPage.note ?? '',
      photo: loaded.addOnsPage?.photo ?? d.addOnsPage.photo ?? '',
      photoHeight: loaded.addOnsPage?.photoHeight ?? d.addOnsPage.photoHeight ?? 360,
      photoWidth: loaded.addOnsPage?.photoWidth ?? d.addOnsPage.photoWidth ?? 75,
      photoFocalY: loaded.addOnsPage?.photoFocalY ?? d.addOnsPage.photoFocalY ?? 50,
      bgOpacity: loaded.addOnsPage?.bgOpacity ?? d.addOnsPage.bgOpacity ?? 40,
      frameShape: loaded.addOnsPage?.frameShape ?? d.addOnsPage.frameShape ?? 'rounded',
      imagePosition: loaded.addOnsPage?.imagePosition ?? d.addOnsPage.imagePosition ?? 'bottom',
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
  const customAddl = Array.isArray(p?.additionalChargesList)
    ? p.additionalChargesList.reduce((sum: number, c: any) => sum + (Number(c?.amount) || 0), 0)
    : 0;
  const totalAddl = addl + customAddl;
  const gross = Math.max(0, base - disc + accom + travel + totalAddl);
  const gstPct = Number(p?.gstPct ?? p?.gstPercent ?? 18);
  const gstAmount = Math.round(gross * (gstPct / 100));
  const netTotal = gross + gstAmount;
  return { base, disc, accom, travel, addl, customAddl, totalAddl, gross, gstPct, gstAmount, netTotal };
}

function calculatePaymentTermsSummary(steps: PaymentTermStep[], totalProjectAmount: number) {
  const fixedAmount = Number(totalProjectAmount || 0);
  const stepList = Array.isArray(steps) ? steps : [];
  const receivedAmount = stepList
    .filter((s: any) => s && s.status === 'Completed')
    .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
  const pendingAmount = Math.max(0, fixedAmount - receivedAmount);
  return { fixedAmount, receivedAmount, pendingAmount };
}

function StudioCoreAiryBuilderContent() {
  const [isDataReady, setIsDataReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [data, rawSetData] = useState<any>(DEFAULT_AIRY_PROPOSAL);
  const [userId, setUserId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Auto-saved to cloud');
  const isInitialLoadedRef = useRef<boolean>(false);
  const currentVersionRef = useRef<number>(1);
  const clientTabIdRef = useRef<string>(`tab_${Math.random().toString(36).substring(2, 9)}`);
  const realtimeChannelRef = useRef<any>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);

  // ── REVISION-SAFE AUTOSAVE & REALTIME CONCURRENCY CONTROL ──
  const localRevisionRef = useRef<number>(1);
  const lastSavedRevisionRef = useRef<number>(1);
  const latestDataRef = useRef<any>(data);
  const isDirtyRef = useRef<boolean>(false);
  const isSaveInFlightRef = useRef<boolean>(false);
  const pendingSaveTimeoutRef = useRef<any>(null);

  // Synchronously sync latestDataRef on every React state update
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // setRawData updates React state without scheduling autosave or marking local edits dirty
  const setRawData = useCallback((updater: any) => {
    rawSetData((prevData: any) => {
      const nextData = typeof updater === 'function' ? updater(prevData) : updater;
      latestDataRef.current = nextData;
      return nextData;
    });
  }, []);

  // setData wrapper for user edits: updates state, increments revision, marks dirty, and schedules debounced autosave
  const setData = useCallback((updater: any) => {
    rawSetData((prevData: any) => {
      const nextData = typeof updater === 'function' ? updater(prevData) : updater;
      latestDataRef.current = nextData;
      localRevisionRef.current += 1;
      isDirtyRef.current = true;
      setHasUnsavedChanges(true);
      setAutoSaveStatus('Editing...');

      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }
      pendingSaveTimeoutRef.current = setTimeout(() => {
        triggerRevisionSave();
      }, 750);

      return nextData;
    });
  }, [userId]);

  const tokenParam = searchParams?.get('token') || '';
  const isPublicPreview = searchParams?.get('preview') === 'public' || !!tokenParam;

  // Modals & Actions for Public Preview
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [budgetRequested, setBudgetRequested] = useState<number | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Accept Form States
  const [clientAcceptName, setClientAcceptName] = useState('');
  const [clientAcceptPhone, setClientAcceptPhone] = useState('');
  const [clientAcceptNotes, setClientAcceptNotes] = useState('');
  const [acceptValidationError, setAcceptValidationError] = useState<string | null>(null);

  // Budget Form States
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const triggerInstantConfetti = () => {
    setShowConfetti(true);
    try {
      const launchConfetti = () => {
        if ((window as any).confetti) {
          (window as any).confetti({ zIndex: 999999, particleCount: 100, spread: 80, origin: { x: 0.2, y: 0.5 } });
          (window as any).confetti({ zIndex: 999999, particleCount: 100, spread: 80, origin: { x: 0.8, y: 0.5 } });
          (window as any).confetti({ zIndex: 999999, particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.4 } });
        }
      };

      if ((window as any).confetti) {
        launchConfetti();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js';
        script.onload = launchConfetti;
        document.body.appendChild(script);
      }
    } catch (e) {
      console.warn('Confetti notice:', e);
    }
  };

  const handleAcceptSubmit = async () => {
    if (!tokenParam) return;
    setAcceptValidationError(null);

    if (!clientAcceptName.trim()) {
      setAcceptValidationError('Please enter your full name');
      return;
    }
    if (!clientAcceptPhone.trim() || clientAcceptPhone.trim().length < 8) {
      setAcceptValidationError('Please enter a valid phone number');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch('/api/quotations/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam,
          responseType: 'accepted',
          clientName: clientAcceptName.trim(),
          clientPhone: clientAcceptPhone.trim(),
          clientNotes: clientAcceptNotes.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        setAccepted(true);
        setShowAcceptModal(false);
        triggerInstantConfetti();
        setShowSuccessModal(true);
        setTimeout(() => setShowConfetti(false), 6000);
      } else {
        alert(json.error || 'Failed to accept quotation.');
      }
    } catch (e) {
      console.error('Accept proposal error:', e);
      alert('Network error submitting response.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBudgetSubmit = async () => {
    if (!tokenParam) return;
    if (!budgetValue || isNaN(Number(budgetValue))) {
      alert('Please enter a valid budget amount');
      return;
    }
    setSubmittingAction(true);
    try {
      const amountNum = Number(budgetValue);
      const res = await fetch('/api/quotations/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam,
          responseType: 'budget_discussion',
          budgetAmount: amountNum,
          clientNotes: budgetNotes
        })
      });

      const json = await res.json();
      if (json.success) {
        setBudgetRequested(amountNum);
        setShowBudgetModal(false);
        setActionSuccessMsg(`Budget discussion request submitted for ₹${amountNum.toLocaleString('en-IN')}`);
      } else {
        alert(json.error || 'Failed to submit budget discussion.');
      }
    } catch (e) {
      console.error('Budget proposal error:', e);
      alert('Network error submitting request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const [openCard, setOpenCard] = useState<string | null>('cover');
  // ── DYNAMIC PAGE SEQUENCE & CUSTOM PAGE CONTROLS ──
  const [isAddPageModalOpen, setAddPageModalOpen] = useState(false);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);

  const pageSequence: PageSequenceItem[] = data?.pageSequence || DEFAULT_PAGE_SEQUENCE;

  const updatePageSequence = (newSeq: PageSequenceItem[]) => {
    setData((prev: any) => ({ ...prev, pageSequence: newSeq }));
  };

  const movePageUp = (index: number) => {
    if (index <= 0) return;
    const newSeq = [...pageSequence];
    const temp = newSeq[index];
    newSeq[index] = newSeq[index - 1];
    newSeq[index - 1] = temp;
    updatePageSequence(newSeq);
  };

  const movePageDown = (index: number) => {
    if (index >= pageSequence.length - 1) return;
    const newSeq = [...pageSequence];
    const temp = newSeq[index];
    newSeq[index] = newSeq[index + 1];
    newSeq[index + 1] = temp;
    updatePageSequence(newSeq);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropPage = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) return;
    const newSeq = [...pageSequence];
    const [draggedItem] = newSeq.splice(draggedPageIndex, 1);
    newSeq.splice(targetIndex, 0, draggedItem);
    setDraggedPageIndex(null);
    updatePageSequence(newSeq);
  };

  const duplicatePage = (index: number) => {
    const target = pageSequence[index];
    const newId = `${target.type}_copy_${Date.now()}`;
    const newLabel = `${target.label} (Copy)`;

    let newCustomId = target.customId;
    let newCustomPages = { ...(data.customPages || {}) };

    if (target.type === 'custom') {
      newCustomId = `custom_${Date.now()}`;
      const sourceData = (target.customId ? newCustomPages[target.customId] : {}) as CustomPageItem;
      newCustomPages[newCustomId] = {
        ...sourceData,
        id: newCustomId,
        heading: `${sourceData?.heading || 'Custom Page'} (Copy)`,
      };
    }

    const newItem: PageSequenceItem = {
      id: newId,
      type: target.type,
      label: newLabel,
      isStandard: false,
      customId: newCustomId,
    };

    const newSeq = [...pageSequence];
    newSeq.splice(index + 1, 0, newItem);
    setData((prev: any) => ({
      ...prev,
      pageSequence: newSeq,
      customPages: newCustomPages,
    }));
    setHasUnsavedChanges(true);
  };

  const deletePage = (index: number) => {
    const newSeq = [...pageSequence];
    newSeq.splice(index, 1);
    updatePageSequence(newSeq);
  };

  const addCustomBlankPage = () => {
    const cId = `custom_${Date.now()}`;
    const newItem: PageSequenceItem = {
      id: cId,
      type: 'custom',
      label: 'Custom Page',
      isStandard: false,
      customId: cId,
    };

    const newSeq = [...pageSequence, newItem];
    const newCustoms = {
      ...(data.customPages || {}),
      [cId]: {
        id: cId,
        heading: 'NEW CUSTOM PAGE',
        subtitle: 'Add optional subtitle or description',
        text: 'Enter your custom block description or special terms here...',
        frameShape: 'rounded' as const,
        photoHeight: 380,
        photoWidth: 75,
        photoFocalY: 50,
        bgOpacity: 40,
        imagePosition: 'bottom' as const,
      },
    };

    setData((prev: any) => ({
      ...prev,
      pageSequence: newSeq,
      customPages: newCustoms,
    }));
    setHasUnsavedChanges(true);
    setOpenCard(cId);
    setAddPageModalOpen(false);
  };

  const restoreStandardPage = (stdType: string) => {
    const stdDef = STANDARD_PAGE_DEFINITIONS.find((s: any) => s.type === stdType);
    if (!stdDef) return;

    const newItem: PageSequenceItem = {
      id: stdDef.type,
      type: stdDef.type,
      label: stdDef.label,
      isStandard: true,
    };

    const newSeq = [...pageSequence, newItem];
    updatePageSequence(newSeq);
    setOpenCard(stdDef.type);
    setAddPageModalOpen(false);
  };

  const deletedStandardPages = STANDARD_PAGE_DEFINITIONS.filter(
    std => !pageSequence.some(p => p.type === std.type)
  );

  const getPageIcon = (type: string) => {
    switch (type) {
      case 'cover':
        return <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'aboutUs':
        return <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'shootDetails':
        return <Camera className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'functionsPage':
        return <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'deliverablesPage':
        return <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'specialValueAdditions':
        return <Gift className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
      case 'pricingPage':
        return <Tag className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
      case 'paymentTermsPage':
        return <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
      case 'addOnsPage':
        return <PlusCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
      case 'termsPage':
        return <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;
      case 'thankYouPage':
        return <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
  };



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

  // Dynamically derived Deliverables options list (Single Source of Truth)
  const dynamicDeliverablesMenu = (
    Array.isArray(data?.deliverablesPage?.selectedItems) && data.deliverablesPage.selectedItems.length > 0
      ? data.deliverablesPage.selectedItems
      : (Array.isArray(data?.deliverablesPage?.availableOptions) && data.deliverablesPage.availableOptions.length > 0
          ? data.deliverablesPage.availableOptions
          : availableDeliverables)
  ).filter(Boolean);

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

  // Viewport Zoom & Scaling Engine (Device-Specific Persistence: Mobile=45%, Desktop=90%)
  const [zoomScale, setZoomScale] = useState<number>(0.90);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('Compiling A4 PDF...');
  const [pdfToastMessage, setPdfToastMessage] = useState<string | null>(null);

  // Initialize device-specific zoom default & load saved preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';
      const isMobile = window.innerWidth < 768;
      const key = isMobile ? `quotationZoom_mobile_${routeId}` : `quotationZoom_desktop_${routeId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.25 && parsed <= 2.0) {
          setZoomScale(parsed);
          return;
        }
      }
      setZoomScale(isMobile ? 0.45 : 0.90);
    }
  }, [params]);

  // Helper to change zoom and persist preference per device
  const updateZoomScale = (newScaleVal: number | ((prev: number) => number)) => {
    setZoomScale((prev) => {
      const targetVal = typeof newScaleVal === 'function' ? newScaleVal(prev) : newScaleVal;
      const clamped = Number(Math.max(0.25, Math.min(1.5, targetVal)).toFixed(2));
      if (typeof window !== 'undefined') {
        const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';
        const isMobile = window.innerWidth < 768;
        const key = isMobile ? `quotationZoom_mobile_${routeId}` : `quotationZoom_desktop_${routeId}`;
        try {
          localStorage.setItem(key, clamped.toString());
        } catch (e) {}
      }
      return clamped;
    });
  };

  // Responsive Auto-Scale Calculation
  const autoFitScale = () => {
    if (mainContainerRef.current) {
      const availableWidth = mainContainerRef.current.clientWidth - 32;
      if (availableWidth < 794 && availableWidth > 200) {
        const fitScale = Math.max(0.35, Math.min(1.0, Number((availableWidth / 794).toFixed(2))));
        updateZoomScale(fitScale);
      } else {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        updateZoomScale(isMobile ? 0.45 : 0.90);
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
        setData((prev: any) => ({ ...prev, cover: { ...prev.cover, eventType: trimmed } }));
      }
    } else {
      setData((prev: any) => ({ ...prev, cover: { ...prev.cover, eventType: val } }));
    }
  };

  // DANKA KA SYSTEM: HIGH-SPEED VECTOR A4 PDF DOWNLOAD ENGINE (PC & MOBILE)
  const handleDownloadPDFCanvas = async () => {
    setIsExportingPDF(true);
    setExportProgress(15);
    setExportStatusText('Quotation downloading...');

    const routeId = params?.id ? String(params.id) : '';

    const progressTimer = setInterval(() => {
      setExportProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      setExportStatusText('Optimizing image payload...');
      
      // Inline helper to compress large base64 data URLs to prevent HTTP 413 Payload Too Large
      const compressDataUrlForPDF = async (dataUrl: string, maxDim = 1200, quality = 0.82): Promise<string> => {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image') || dataUrl.length < 200000) {
          return dataUrl;
        }
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            const isPng = dataUrl.startsWith('data:image/png');
            if (isPng) {
              ctx.clearRect(0, 0, width, height);
            } else {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality));
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      };

      const optimizeObjectForPDF = async (obj: any): Promise<any> => {
        if (!obj) return obj;
        if (typeof obj === 'string') {
          if (obj.startsWith('data:image') && obj.length > 200000) {
            return await compressDataUrlForPDF(obj);
          }
          return obj;
        }
        if (Array.isArray(obj)) {
          return await Promise.all(obj.map(item => optimizeObjectForPDF(item)));
        }
        if (typeof obj === 'object') {
          const result: any = {};
          for (const key of Object.keys(obj)) {
            result[key] = await optimizeObjectForPDF(obj[key]);
          }
          return result;
        }
        return obj;
      };

      const sanitizedData = await optimizeObjectForPDF(data);

      // Construct lightweight JSON payload (< 500KB)
      const payload = {
        quotationId: routeId,
        templateId: routeId,
        content_json: sanitizedData,
        filename: `Quotation-${routeId || 'document'}.pdf`
      };

      const payloadString = JSON.stringify(payload);
      const payloadSize = payloadString.length;

      console.log('[Client PDF Export] ==================================================');
      console.log('[Client PDF Export] Initiating Lightweight JSON Server PDF Generation');
      console.log('[Client PDF Export] Quotation ID:', routeId);
      console.log('[Client PDF Export] Payload Size:', payloadSize, 'bytes (~' + (payloadSize / 1024).toFixed(2) + ' KB)');
      console.log('[Client PDF Export] Base64 pageImages Omitted: YES (Eliminates HTTP 413 Payload Too Large)');
      console.log('[Client PDF Export] ==================================================');

      setExportProgress(40);
      setExportStatusText('Generating Server-Side Vector PDF...');

      // Direct authenticated fetch POST to /api/quotations/pdf
      const res = await fetch('/api/quotations/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'Authorization': `Bearer ${userId}` } : {})
        },
        body: payloadString
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        let errDetail = 'PDF Server Pipeline Failed';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errJson.error || errJson.message || errDetail;
        } catch (e) {}
        throw new Error(`HTTP ${res.status}: ${errDetail}`);
      }

      const blob = await res.blob();
      setExportProgress(100);
      setExportStatusText('100% Complete! Downloading PDF...');

      const url = window.URL.createObjectURL(blob);
      const fileName = `Quotation-${routeId || 'document'}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 15000);
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('[PDF Export Error]:', err);
      alert(`PDF Generation Notice: ${err.message || 'Server rendering unavailable'}`);
    } finally {
      setTimeout(() => {
        setIsExportingPDF(false);
        setExportProgress(0);
      }, 1500);
    }
  };

    // Load User Session, User Isolation Check & Proposal
  useEffect(() => {
    async function initUserAndLoadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const userAccessToken = session?.access_token;
        const userStudioName = session?.user?.user_metadata?.studioName || session?.user?.user_metadata?.studio_name || (session?.user as any)?.studioName;

        const isPublicPreview = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('preview') === 'public' || !!new URLSearchParams(window.location.search).get('token'));

        if (!currentUserId && !isPublicPreview) {
          console.warn('[User Access Lock] No authenticated session found, redirecting to /workspace/quotations');
          router.push('/workspace/quotations');
          return;
        }

        setUserId(currentUserId || 'PUBLIC_USER');

        const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';

        // 1. INSTANT LOCAL CACHE HYDRATION (<5ms First Contentful Render)
        const cachedLocal = await getCachedDocumentLocal(routeId);
        if (cachedLocal?.documentJson) {
          currentVersionRef.current = cachedLocal.version || 1;
          const localNormalized = normalizeQuotationData(cachedLocal.documentJson);
          if (localNormalized.primaryFont) preloadActiveFont(localNormalized.primaryFont);
          if (localNormalized.secondaryFont) preloadActiveFont(localNormalized.secondaryFont);
          setRawData(localNormalized);
          setIsDataReady(true);
        }

        // 2. Parallel Network Fetch for Canonical DB Document
        const fetchUrl = isPublicPreview ? `/api/templates/${routeId}?preview=public` : `/api/templates/${routeId}`;
        const res = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${userAccessToken || ''}`
          }
        });

        if (res.status === 403) {
          alert('Access Denied: You do not have permission to view or edit this quotation template.');
          router.push('/workspace/quotations');
          return;
        }

        const json = await res.json();
        let loadedData: any = null;

        const docContent = json.document?.content_json || json.document?.document_json || (json.document?.pages ? json.document : null);

        if (docContent) {
          // CANONICAL SUPABASE DB DOCUMENT (Primary Source of Truth)
          loadedData = normalizeQuotationData(docContent);
          currentVersionRef.current = json.document?.version || 1;
        } else if (cachedLocal?.documentJson) {
          loadedData = normalizeQuotationData(cachedLocal.documentJson);
        }

        if (!loadedData) {
          loadedData = { ...DEFAULT_AIRY_PROPOSAL };
        }

        if (userStudioName && (!loadedData.cover?.brandName || loadedData.cover.brandName === 'FILMIFY WEDDINGS')) {
          loadedData.cover = { ...loadedData.cover, brandName: userStudioName };
        }

        // Preload active fonts
        if (loadedData.primaryFont) preloadActiveFont(loadedData.primaryFont);
        if (loadedData.secondaryFont) preloadActiveFont(loadedData.secondaryFont);

        // Cache canonical state locally and hydrate editor
        cacheDocumentLocal(routeId, loadedData, currentVersionRef.current);
        try {
          localStorage.setItem(`wg_proposal_draft_${currentUserId}`, JSON.stringify(loadedData));
        } catch (e) {}

        isRemoteUpdateRef.current = true;
        setRawData(loadedData);
      } catch (err) {
        console.warn('[Quotation Initialization Error]:', err);
        setIsDataReady(true);
      } finally {
        isInitialLoadedRef.current = true;
        setIsDataReady(true);
        setAutoSaveStatus('Auto-saved to cloud');
      }
    }
    initUserAndLoadData();
  }, [params]);

  // Flush state to localStorage on tab unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userId && data) {
        try {
          localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(data));
        } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, userId]);

  // ── 2. REALTIME WEBSOCKET SUBSCRIPTION & LOOP-FREE MULTI-DEVICE SYNC ──
  useEffect(() => {
    const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';

    const handleRemoteData = (remoteContent: any, remoteVersion?: number, senderId?: string, clientId?: string) => {
      // 1. Ignore self-broadcasts or self-changes
      if ((senderId && senderId === clientTabIdRef.current) || (clientId && clientId === clientTabIdRef.current)) {
        return;
      }

      // 2. Ignore remote updates if user is actively typing / editing locally (isDirtyRef is true)
      if (isDirtyRef.current || localRevisionRef.current > lastSavedRevisionRef.current) {
        console.log('[Realtime Sync] Suppressed remote overwrite: active local user edits present');
        return;
      }

      // 3. Ignore outdated versions
      if (remoteVersion && remoteVersion <= currentVersionRef.current) {
        console.log(`[Realtime Sync] Ignored outdated update v${remoteVersion} <= current v${currentVersionRef.current}`);
        return;
      }

      console.log(`[Realtime Sync] Applying remote live update v${remoteVersion || 'latest'}`);
      if (remoteVersion) {
        currentVersionRef.current = remoteVersion;
      }

      const normalized = normalizeQuotationData(remoteContent);
      latestDataRef.current = normalized;
      isRemoteUpdateRef.current = true;
      setRawData(normalized);
      try {
        localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(normalized));
      } catch (e) {}
      cacheDocumentLocal(routeId, normalized, currentVersionRef.current);
      setAutoSaveStatus('Synced in real-time');
    };

    const channel = supabase
      .channel(`doc_sync_${routeId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on('broadcast', { event: 'doc_update' }, (payload: any) => {
        if (payload?.payload?.data) {
          handleRemoteData(payload.payload.data, payload.payload.version, payload.payload.senderId, payload.payload.clientId);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotation_documents',
        filter: `template_id=eq.${routeId}`
      }, (payload: any) => {
        if (payload.new && payload.new.content_json) {
          if (payload.new.client_id === clientTabIdRef.current) return;
          handleRemoteData(payload.new.content_json, payload.new.version, undefined, payload.new.client_id);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotations',
        filter: `quotation_number=eq.${routeId}`
      }, (payload: any) => {
        if (payload.new && payload.new.content_json) {
          handleRemoteData(payload.new.content_json);
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    const handleOnline = () => {
      flushSaveImmediately();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
      window.removeEventListener('online', handleOnline);
    };
  }, [params, userId]);

  // ── 3. REVISION-SAFE SERIALIZED AUTOSAVE ENGINE ──
  const triggerRevisionSave = async () => {
    if (!userId || !isInitialLoadedRef.current) return;

    if (isSaveInFlightRef.current) {
      if (pendingSaveTimeoutRef.current) clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = setTimeout(() => {
        triggerRevisionSave();
      }, 350);
      return;
    }

    const targetRevision = localRevisionRef.current;
    if (targetRevision <= lastSavedRevisionRef.current && !isDirtyRef.current) {
      setAutoSaveStatus('Auto-saved to cloud');
      setHasUnsavedChanges(false);
      return;
    }

    isSaveInFlightRef.current = true;
    setAutoSaveStatus('Saving...');
    setSaving(true);

    const snapshotData = typeof structuredClone === 'function'
      ? structuredClone(latestDataRef.current)
      : JSON.parse(JSON.stringify(latestDataRef.current));

    try {
      const calc = calculatePricingTotals(snapshotData.pricingPage);
      const grandTotal = calc.netTotal;
      const subtotal = calc.gross;

      const { data: { session } } = await supabase.auth.getSession();
      const userAccessToken = session?.access_token;
      const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';

      const saveRes = await fetch(`/api/templates/${routeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAccessToken || ''}`
        },
        body: JSON.stringify({
          user_id: userId,
          version: currentVersionRef.current,
          revision: targetRevision,
          content_json: snapshotData,
          client_id: clientTabIdRef.current
        })
      });

      if (saveRes.ok) {
        const resJson = await saveRes.json();
        if (resJson.version) {
          currentVersionRef.current = resJson.version;
        }
        if (resJson.isAutoCloned && resJson.newTemplateId) {
          window.history.replaceState(null, '', `/workspace/quotations/builder/templet/${resJson.newTemplateId}`);
        }
        cacheDocumentLocal(routeId, snapshotData, currentVersionRef.current);
      }

      await fetch(`/api/quotations/${routeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAccessToken || ''}`
        },
        body: JSON.stringify({
          workspace_id: userId || 'demo_user',
          title: snapshotData.designName || 'Wedding - Design 1',
          client_name: `${snapshotData.cover?.coupleName || (snapshotData.cover?.groomName ? `${snapshotData.cover.groomName} & ${snapshotData.cover.brideName}` : 'Rahul & Neha')}`,
          content_json: snapshotData,
          financials: { total_amount: grandTotal, subtotal, gst_rate: calc.gstPct },
          status: 'draft'
        })
      });

      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'doc_update',
          payload: {
            data: snapshotData,
            version: currentVersionRef.current,
            revision: targetRevision,
            senderId: clientTabIdRef.current,
            clientId: clientTabIdRef.current
          }
        }).catch(() => {});
      }

      lastSavedRevisionRef.current = Math.max(lastSavedRevisionRef.current, targetRevision);

      if (localRevisionRef.current === targetRevision) {
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        setAutoSaveStatus('Auto-saved to cloud');
      } else {
        if (pendingSaveTimeoutRef.current) clearTimeout(pendingSaveTimeoutRef.current);
        pendingSaveTimeoutRef.current = setTimeout(() => {
          triggerRevisionSave();
        }, 500);
      }
    } catch (err) {
      console.warn('[Autosave Notice]:', err);
      setAutoSaveStatus('Offline / Retrying');
    } finally {
      isSaveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const flushSaveImmediately = async () => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    await triggerRevisionSave();
  };

  const openAddImageModal = (target: string) => {
    setActiveTargetField(target);
    setMediaModalOpen(true);
  };

  const handleSelectImageFromGallery = (url: string) => {
    if (!activeTargetField) return;

    if (activeTargetField === 'coverLogo') {
      setData((prev: any) => ({ ...prev, cover: { ...prev.cover, brandLogoUrl: url } }));
    } else if (activeTargetField === 'coverPhoto') {
      setData((prev: any) => ({ ...prev, cover: { ...prev.cover, photoUrl: url } }));
    } else if (activeTargetField === 'aboutUsBanner') {
      setData((prev: any) => ({ ...prev, aboutUs: { ...prev.aboutUs, bottomBannerPhoto: url } }));
    } else if (activeTargetField === 'shootPhoto') {
      setData((prev: any) => ({ ...prev, shootDetails: { ...prev.shootDetails, photo: url } }));
    } else if (activeTargetField === 'functionsPhoto') {
      setData((prev: any) => ({ ...prev, functionsPage: { ...prev.functionsPage, photo: url } }));
    } else if (activeTargetField === 'deliverablesPhoto') {
      setData((prev: any) => ({ ...prev, deliverablesPage: { ...prev.deliverablesPage, photo: url } }));
    } else if (activeTargetField === 'specialValuePhoto') {
      setData((prev: any) => ({ ...prev, specialValueAdditions: { ...(prev.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions), photo: url } }));
    } else if (activeTargetField === 'pricingPhoto') {
      setData((prev: any) => ({ ...prev, pricingPage: { ...(prev.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage), photo: url } }));
    } else if (activeTargetField === 'paymentTermsPhoto') {
      setData((prev: any) => ({ ...prev, paymentTermsPage: { ...(prev.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage), photo: url } }));
    } else if (activeTargetField === 'addOnsPhoto') {
      setData((prev: any) => ({ ...prev, addOnsPage: { ...(prev.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage), photo: url } }));
    } else if (activeTargetField === 'termsPhoto') {
      setData((prev: any) => ({ ...prev, termsPage: { ...(prev.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), photo: url } }));
    } else if (activeTargetField === 'thankYouPhoto') {
      setData((prev: any) => ({ ...prev, thankYouPage: { ...(prev.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), photo: url } }));
    } else if (activeTargetField === 'thankYouLogo') {
      setData((prev: any) => ({ ...prev, thankYouPage: { ...(prev.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), brandLogoUrl: url } }));
    } else if (activeTargetField.startsWith('customPhoto_')) {
      const cKey = activeTargetField.replace('customPhoto_', '');
      setData((prev: any) => {
        const customObj = (prev.customPages || {})[cKey] || {};
        return {
          ...prev,
          customPages: {
            ...(prev.customPages || {}),
            [cKey]: {
              ...customObj,
              photo: url
            }
          }
        };
      });
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
    try {
      await flushSaveImmediately();
      alert('Quotation proposal saved to your workspace!');
    } catch {
      alert('Saved locally!');
      setAutoSaveStatus('Saved locally');
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

      {/* Dynamic Page Sequence Header & + Add Page Action Button */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 pb-1">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-zinc-700">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>Page Sequence ({pageSequence.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setAddPageModalOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3 stroke-[3]" />
          <span>Add Page</span>
        </button>
      </div>

      {/* Dynamic Accordion Cards List */}
      <div className="space-y-2.5">
        {pageSequence.map((pageItem, pIdx) => {
                  const isLastPage = pIdx === pageSequence.length - 1;
          const isFirst = pIdx === 0;
          const isLast = pIdx === pageSequence.length - 1;
          const isOpen = openCard === pageItem.id;

          return (
            <div 
              key={pageItem.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, pIdx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropPage(e, pIdx)}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden shadow-2xs transition-all"
            >
              {/* Card Header with Controls */}
              <div 
                className="p-2.5 bg-zinc-100/90 flex flex-row items-center justify-between gap-2 font-bold text-zinc-800 select-none cursor-pointer"
                onClick={() => setOpenCard(isOpen ? null : pageItem.id)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                  <div 
                    className="p-1 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 shrink-0" 
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => movePageUp(pIdx)}
                      className="p-0.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => movePageDown(pIdx)}
                      className="p-0.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0 ml-1 flex-1 text-left">
                    {getPageIcon(pageItem.type)}
                    <span className="text-xs truncate font-bold text-zinc-800 text-left">
                      {pIdx + 1}. {pageItem.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => duplicatePage(pIdx)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 transition-colors"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deletePage(pIdx)}
                    className="p-1 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div onClick={() => setOpenCard(isOpen ? null : pageItem.id)} className="p-1 text-zinc-500">
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Form Content Body for each Page Type */}
              {isOpen && (
                <div className="p-3 space-y-3 bg-white">
                  {pageItem.type === 'cover' && (
                    <div className="space-y-3">
                      
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
                onChangeShape={(shape) => {
                  const currentH = data.cover.photoHeight || 450;
                  const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 450 : currentH);
                  setData({ ...data, cover: { ...data.cover, frameShape: shape, photoHeight: newH } });
                }}
                onChangePosition={(pos) => setData({ ...data, cover: { ...data.cover, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, cover: { ...data.cover, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, cover: { ...data.cover, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, cover: { ...data.cover, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, cover: { ...data.cover, photoWidth: w } })}
              />

            
                    </div>
                  )}

                  {pageItem.type === 'aboutUs' && (
                    <div className="space-y-3">
                      
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
                onChangeShape={(shape) => {
                  const currentH = data.aboutUs.bottomBannerHeight || 380;
                  const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 380 : currentH);
                  setData({ ...data, aboutUs: { ...data.aboutUs, frameShape: shape, bottomBannerHeight: newH } });
                }}
                onChangePosition={(pos) => setData({ ...data, aboutUs: { ...data.aboutUs, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, aboutUs: { ...data.aboutUs, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, aboutUs: { ...data.aboutUs, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, aboutUs: { ...data.aboutUs, bottomBannerHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, aboutUs: { ...data.aboutUs, photoWidth: w } })}
              />
            
                    </div>
                  )}

                  {pageItem.type === 'shootDetails' && (
                    <div className="space-y-3">
                      
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
                selectedItems={(data.shootDetails.crewText !== undefined ? data.shootDetails.crewText : 'Candid Photography\nCinematography\nPortable Changing Room').split('\n').map((s: string) => s.trim()).filter(Boolean)}
                onChangeSelectedItems={(newSelected) => setData({ ...data, shootDetails: { ...data.shootDetails, crewText: newSelected.join('\n') } })}
                onAddCustomOption={(newItem) => setAvailableRequirements(prev => Array.from(new Set([...prev, newItem])))}
                onEditOption={(oldItem, newItem) => {
                  setAvailableRequirements(prev => prev.map(r => r === oldItem ? newItem : r));
                  const currentCrew = (data.shootDetails.crewText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
                  const updatedCrew = currentCrew.map(c => c === oldItem ? newItem : c);
                  setData({ ...data, shootDetails: { ...data.shootDetails, crewText: updatedCrew.join('\n') } });
                }}
                onDeleteOption={(itemToDelete) => {
                  setAvailableRequirements(prev => prev.filter(r => r !== itemToDelete));
                  const currentCrew = (data.shootDetails.crewText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
                  const updatedCrew = currentCrew.filter(c => c !== itemToDelete);
                  setData({ ...data, shootDetails: { ...data.shootDetails, crewText: updatedCrew.join('\n') } });
                }}
              />

              {/* 3D Curved UI Multi-Select Dropdown: Deliverables */}
              <ThreeDCurvedMultiSelect
                title="Deliverables"
                availableOptions={Array.from(new Set([
                  ...(data.deliverablesPage?.availableOptions || DEFAULT_AIRY_PROPOSAL.deliverablesPage.availableOptions),
                  ...(data.deliverablesPage?.selectedItems || [])
                ])).filter(Boolean)}
                selectedItems={
                  data.shootDetails.deliverablesText !== undefined
                    ? (data.shootDetails.deliverablesText ? data.shootDetails.deliverablesText.split('\n').map((s: string) => s.trim()).filter(Boolean) : [])
                    : ['Full Ultra HD Super-Fine Raw Photos', 'Approx. 50 High Resolution Edited Images', '3 Save The Dates Photos', '1 count Down Reel', '1 video Reel']
                }
                onChangeSelectedItems={(newSelectedArr) => setData({ ...data, shootDetails: { ...data.shootDetails, deliverablesText: newSelectedArr.join('\n') } })}
                onAddCustomOption={(newItem) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = currentObj.selectedItems || [];
                  const currentOpts = currentObj.availableOptions || [];
                  const updatedItems = currentItems.includes(newItem) ? currentItems : [...currentItems, newItem];
                  const updatedOpts = currentOpts.includes(newItem) ? currentOpts : [...currentOpts, newItem];
                  setData({
                    ...data,
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: updatedItems,
                      availableOptions: updatedOpts
                    }
                  });
                }}
                onEditOption={(oldItem, newItem) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = (currentObj.selectedItems || []).map((i: string) => i === oldItem ? newItem : i);
                  const currentOpts = (currentObj.availableOptions || []).map((i: string) => i === oldItem ? newItem : i);
                  const currentShootDeliv = (data.shootDetails.deliverablesText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
                  const updatedShootDeliv = currentShootDeliv.map(d => d === oldItem ? newItem : d);
                  setData({
                    ...data,
                    shootDetails: { ...data.shootDetails, deliverablesText: updatedShootDeliv.join('\n') },
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
                onDeleteOption={(itemToDelete) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = (currentObj.selectedItems || []).filter((i: string) => i !== itemToDelete);
                  const currentOpts = (currentObj.availableOptions || []).filter((i: string) => i !== itemToDelete);
                  const currentShootDeliv = (data.shootDetails.deliverablesText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
                  const updatedShootDeliv = currentShootDeliv.filter(d => d !== itemToDelete);
                  setData({
                    ...data,
                    shootDetails: { ...data.shootDetails, deliverablesText: updatedShootDeliv.join('\n') },
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
              />

              {/* Yellow Theme Exclusions Note Control Box */}
              <div className="p-3 rounded-xl border border-amber-400/80 bg-amber-50 shadow-2xs space-y-2.5 my-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="shootDetailsExclusions"
                    checked={!!data.shootDetails?.showExclusionsNote}
                    onChange={(e) => {
                      const currentObj = data.shootDetails || {};
                      setData({
                        ...data,
                        shootDetails: {
                          ...currentObj,
                          showExclusionsNote: e.target.checked,
                          exclusionsNote: currentObj.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'
                        }
                      });
                    }}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    Show Exclusions Note
                  </span>
                </label>

                {data.shootDetails?.showExclusionsNote && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[9px] uppercase font-extrabold text-amber-800 tracking-wider">Exclusions Note Text</label>
                    <textarea
                      rows={2}
                      value={data.shootDetails?.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                      onChange={(e) => {
                        const currentObj = data.shootDetails || {};
                        setData({ ...data, shootDetails: { ...currentObj, exclusionsNote: e.target.value } });
                      }}
                      className="w-full p-2 rounded-lg bg-white border border-amber-300 text-zinc-900 font-medium text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      placeholder="Exclusions note text..."
                    />
                  </div>
                )}
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
                onChangeShape={(shape) => {
                  const currentH = data.shootDetails.photoHeight || 380;
                  const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 380 : currentH);
                  setData({ ...data, shootDetails: { ...data.shootDetails, frameShape: shape, photoHeight: newH } });
                }}
                onChangePosition={(pos) => setData({ ...data, shootDetails: { ...data.shootDetails, imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, shootDetails: { ...data.shootDetails, photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, shootDetails: { ...data.shootDetails, bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, shootDetails: { ...data.shootDetails, photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, shootDetails: { ...data.shootDetails, photoWidth: w } })}
              />
            
                    </div>
                  )}

                  {pageItem.type === 'functionsPage' && (
                    <div className="space-y-3">
                      
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
                {(data.functionsPage?.items || []).map((funcItem: any, fIdx: number) => (
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
                      const filtered = (data.functionsPage?.items || []).filter((_: any, i: number) => i !== fIdx);
                      setData({ ...data, functionsPage: { ...data.functionsPage, items: filtered } });
                    }}
                    onAddCustomFunctionName={(newName) => setAvailableFunctionNames(prev => Array.from(new Set([...prev, newName])))}
                    onEditCustomFunctionName={(oldName, newName) => {
                      setAvailableFunctionNames(prev => prev.map(n => n === oldName ? newName : n));
                    }}
                    onDeleteCustomFunctionName={(nameToDelete) => {
                      setAvailableFunctionNames(prev => prev.filter(n => n !== nameToDelete));
                    }}
                    onAddCustomDuration={(newDur) => setAvailableDurationSlots(prev => Array.from(new Set([...prev, newDur])))}
                    onAddCustomRequirement={(newReq) => setAvailableRequirements(prev => Array.from(new Set([...prev, newReq])))}
                    onEditCustomRequirement={(oldReq, newReq) => {
                      setAvailableRequirements(prev => prev.map(r => r === oldReq ? newReq : r));
                    }}
                    onDeleteCustomRequirement={(reqToDelete) => {
                      setAvailableRequirements(prev => prev.filter(r => r !== reqToDelete));
                    }}
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

              
            
                    </div>
                  )}

                  {pageItem.type === 'deliverablesPage' && (
                    <div className="space-y-3">
                      
              <ThreeDCurvedMultiSelect
                title="Deliverables"
                availableOptions={Array.from(new Set([
                  ...(data.deliverablesPage?.availableOptions || DEFAULT_AIRY_PROPOSAL.deliverablesPage.availableOptions),
                  ...(data.deliverablesPage?.selectedItems || [])
                ])).filter(Boolean)}
                selectedItems={data.deliverablesPage?.selectedItems || DEFAULT_AIRY_PROPOSAL.deliverablesPage.selectedItems}
                onChangeSelectedItems={(newSelected) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  setData({ ...data, deliverablesPage: { ...currentObj, selectedItems: newSelected } });
                }}
                onAddCustomOption={(newItem) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = currentObj.selectedItems || [];
                  const currentOpts = currentObj.availableOptions || [];
                  const updatedItems = currentItems.includes(newItem) ? currentItems : [...currentItems, newItem];
                  const updatedOpts = currentOpts.includes(newItem) ? currentOpts : [...currentOpts, newItem];
                  setData({
                    ...data,
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: updatedItems,
                      availableOptions: updatedOpts
                    }
                  });
                }}
                onEditOption={(oldItem, newItem) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = (currentObj.selectedItems || []).map((i: string) => i === oldItem ? newItem : i);
                  const currentOpts = (currentObj.availableOptions || []).map((i: string) => i === oldItem ? newItem : i);
                  setData({
                    ...data,
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
                onDeleteOption={(itemToDelete) => {
                  const currentObj = data.deliverablesPage || DEFAULT_AIRY_PROPOSAL.deliverablesPage;
                  const currentItems = (currentObj.selectedItems || []).filter((i: string) => i !== itemToDelete);
                  const currentOpts = (currentObj.availableOptions || []).filter((i: string) => i !== itemToDelete);
                  setData({
                    ...data,
                    deliverablesPage: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
              />

              {/* Photo controls removed for Deliverables - purely content/card based */}
            </div>
          )}

          {pageItem.type === 'specialValueAdditions' && (
            <div className="space-y-3">
              
              <ThreeDCurvedMultiSelect
                title="Complimentary Value Additions"
                availableOptions={Array.from(new Set([
                  ...(data.specialValueAdditions?.availableOptions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions.availableOptions),
                  ...(data.specialValueAdditions?.selectedItems || [])
                ])).filter(Boolean)}
                selectedItems={data.specialValueAdditions?.selectedItems || DEFAULT_AIRY_PROPOSAL.specialValueAdditions.selectedItems}
                onChangeSelectedItems={(newSelected) => {
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  setData({ ...data, specialValueAdditions: { ...currentObj, selectedItems: newSelected } });
                }}
                onAddCustomOption={(newItem) => {
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  const currentItems = currentObj.selectedItems || [];
                  const currentOpts = currentObj.availableOptions || [];
                  const updatedItems = currentItems.includes(newItem) ? currentItems : [...currentItems, newItem];
                  const updatedOpts = currentOpts.includes(newItem) ? currentOpts : [...currentOpts, newItem];
                  setData({
                    ...data,
                    specialValueAdditions: {
                      ...currentObj,
                      selectedItems: updatedItems,
                      availableOptions: updatedOpts
                    }
                  });
                }}
                onEditOption={(oldItem, newItem) => {
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  const currentItems = (currentObj.selectedItems || []).map((i: string) => i === oldItem ? newItem : i);
                  const currentOpts = (currentObj.availableOptions || []).map((i: string) => i === oldItem ? newItem : i);
                  setData({
                    ...data,
                    specialValueAdditions: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
                onDeleteOption={(itemToDelete) => {
                  const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                  const currentItems = (currentObj.selectedItems || []).filter((i: string) => i !== itemToDelete);
                  const currentOpts = (currentObj.availableOptions || []).filter((i: string) => i !== itemToDelete);
                  setData({
                    ...data,
                    specialValueAdditions: {
                      ...currentObj,
                      selectedItems: currentItems,
                      availableOptions: currentOpts
                    }
                  });
                }}
              />

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Page Note (Optional)</label>
                <textarea
                  rows={2}
                  value={data.specialValueAdditions?.note || ''}
                  onChange={(e) => {
                    const currentObj = data.specialValueAdditions || DEFAULT_AIRY_PROPOSAL.specialValueAdditions;
                    setData({ ...data, specialValueAdditions: { ...currentObj, note: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                  placeholder="Add optional note at bottom of page..."
                />
              </div>

              {/* Photo controls removed for Special Value Additions - purely content/card based */}
            </div>
          )}

          {pageItem.type === 'pricingPage' && (
                    <div className="space-y-3">
                      
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

              {/* Custom Additional Charges Manager */}
              <div className="p-3 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-amber-50/10 to-white shadow-2xs space-y-2.5 my-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>Additional Charges</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const chargeName = prompt('Enter charge name (e.g. Drone License, Drone Setup, Extra Crew):');
                      if (chargeName && chargeName.trim()) {
                        const currentList = Array.isArray(data.pricingPage?.additionalChargesList) ? data.pricingPage.additionalChargesList : [];
                        const newCharge = {
                          id: `charge-${Date.now()}`,
                          name: chargeName.trim(),
                          amount: 0
                        };
                        const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                        setData({
                          ...data,
                          pricingPage: {
                            ...currentObj,
                            additionalChargesList: [...currentList, newCharge]
                          }
                        });
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full shadow-2xs cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-900 stroke-[3]" />
                    <span>+ Add Charge</span>
                  </button>
                </div>

                {Array.isArray(data.pricingPage?.additionalChargesList) && data.pricingPage.additionalChargesList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {data.pricingPage.additionalChargesList.map((charge: any, cIdx: number) => (
                      <div key={charge.id || cIdx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-amber-200 shadow-2xs">
                        <input
                          type="text"
                          value={charge.name || ''}
                          placeholder="Charge Name"
                          onChange={(e) => {
                            const updated = [...(data.pricingPage?.additionalChargesList || [])];
                            updated[cIdx] = { ...updated[cIdx], name: e.target.value };
                            const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                            setData({ ...data, pricingPage: { ...currentObj, additionalChargesList: updated } });
                          }}
                          className="flex-1 text-xs font-bold text-zinc-900 bg-transparent focus:outline-none"
                        />
                        <div className="relative flex items-center w-24">
                          <span className="absolute left-2 text-[11px] font-bold text-amber-700">₹</span>
                          <input
                            type="number"
                            value={charge.amount ?? 0}
                            placeholder="Amount"
                            onChange={(e) => {
                              const updated = [...(data.pricingPage?.additionalChargesList || [])];
                              updated[cIdx] = { ...updated[cIdx], amount: Number(e.target.value) || 0 };
                              const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                              setData({ ...data, pricingPage: { ...currentObj, additionalChargesList: updated } });
                            }}
                            className="w-full p-1 pl-5 text-right rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (data.pricingPage?.additionalChargesList || []).filter((_: any, idx: number) => idx !== cIdx);
                            const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                            setData({ ...data, pricingPage: { ...currentObj, additionalChargesList: updated } });
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Charge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yellow Theme Exclusions Note Control Box */}
              <div className="p-3 rounded-xl border border-amber-400/80 bg-amber-50 shadow-2xs space-y-2.5 my-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="pricingExclusions"
                    checked={!!data.pricingPage?.showExclusionsNote}
                    onChange={(e) => {
                      const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                      setData({
                        ...data,
                        pricingPage: {
                          ...currentObj,
                          showExclusionsNote: e.target.checked,
                          exclusionsNote: currentObj.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'
                        }
                      });
                    }}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    Show Exclusions Note
                  </span>
                </label>

                {data.pricingPage?.showExclusionsNote && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[9px] uppercase font-extrabold text-amber-800 tracking-wider">Exclusions Note Text</label>
                    <textarea
                      rows={2}
                      value={data.pricingPage?.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                      onChange={(e) => {
                        const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                        setData({ ...data, pricingPage: { ...currentObj, exclusionsNote: e.target.value } });
                      }}
                      className="w-full p-2 rounded-lg bg-white border border-amber-300 text-zinc-900 font-medium text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      placeholder="Exclusions note text..."
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Page Note (Optional)</label>
                <textarea
                  rows={2}
                  value={data.pricingPage?.note || ''}
                  onChange={(e) => {
                    const currentObj = data.pricingPage || DEFAULT_AIRY_PROPOSAL.pricingPage;
                    setData({ ...data, pricingPage: { ...currentObj, note: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                  placeholder="Add optional note at bottom of page..."
                />
              </div>

              {/* Photo controls removed for Pricing Details - purely text/table based */}
            </div>
          )}

          {pageItem.type === 'paymentTermsPage' && (
                    <div className="space-y-3">
                      
              <div className="space-y-2">
                {(data.paymentTermsPage?.steps || DEFAULT_AIRY_PROPOSAL.paymentTermsPage.steps).map((step: any, idx: number) => (
                  <div key={step?.id || idx} className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-950">Installment #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const steps = data.paymentTermsPage?.steps || [];
                          const updated = steps.filter((s: any) => s.id !== step.id);
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
                          const updated = steps.map((s: any) => s.id === step.id ? { ...s, date: val } : s);
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
                          const updated = steps.map((s: any) => s.id === step.id ? { ...s, stepName: e.target.value } : s);
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
                            const updated = steps.map((s: any) => s.id === step.id ? { ...s, amount: Number(e.target.value) || 0 } : s);
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
                            const updated = steps.map((s: any) => s.id === step.id ? { ...s, status: val as 'Completed' | 'Pending' } : s);
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

              <div className="space-y-1 pt-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Page Note (Optional)</label>
                <textarea
                  rows={2}
                  value={data.paymentTermsPage?.note || ''}
                  onChange={(e) => {
                    const currentObj = data.paymentTermsPage || DEFAULT_AIRY_PROPOSAL.paymentTermsPage;
                    setData({ ...data, paymentTermsPage: { ...currentObj, note: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                  placeholder="Add optional note at bottom of page..."
                />
              </div>
            </div>
          )}

                  {pageItem.type === 'addOnsPage' && (
                    <div className="space-y-3">
                      
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
                {(data.addOnsPage?.items || DEFAULT_AIRY_PROPOSAL.addOnsPage.items).map((item: any, idx: number) => (
                  <div key={item?.id || idx} className="p-2.5 rounded-xl border border-amber-200/80 bg-zinc-50/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!item?.selected}
                          onChange={(e) => {
                            const items = data.addOnsPage?.items || [];
                            const updated = items.map((i: any) => i.id === item.id ? { ...i, selected: e.target.checked } : i);
                            const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                            setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                          }}
                          className="w-4 h-4 rounded-md border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-extrabold text-zinc-900">{item.title}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const items = data.addOnsPage?.items || [];
                          const updated = items.filter((i: any) => i.id !== item.id);
                          const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                          setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-amber-700">₹</span>
                      <input
                        type="number"
                        value={item?.price ?? 0}
                        onChange={(e) => {
                          const items = data.addOnsPage?.items || [];
                          const updated = items.map((i: any) => i.id === item.id ? { ...i, price: Number(e.target.value) || 0 } : i);
                          const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                          setData({ ...data, addOnsPage: { ...currentObj, items: updated } });
                        }}
                        className="w-full p-2 pl-7 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-bold text-xs"
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

              <div className="space-y-1 pt-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Page Note (Optional)</label>
                <textarea
                  rows={2}
                  value={data.addOnsPage?.note || ''}
                  onChange={(e) => {
                    const currentObj = data.addOnsPage || DEFAULT_AIRY_PROPOSAL.addOnsPage;
                    setData({ ...data, addOnsPage: { ...currentObj, note: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                  placeholder="Add optional note at bottom of page..."
                />
              </div>
            </div>
          )}

                  {pageItem.type === 'termsPage' && (
                    <div className="space-y-3">
                      
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Heading</label>
                <input
                  type="text"
                  value={data.termsPage?.heading || 'TERMS & CONDITIONS'}
                  onChange={(e) => {
                    const currentObj = data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage;
                    setData({ ...data, termsPage: { ...currentObj, heading: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Terms &amp; Conditions Text (Multi-line supported)</label>
                <textarea
                  rows={6}
                  value={data.termsPage?.text || ''}
                  onChange={(e) => {
                    const currentObj = data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage;
                    setData({ ...data, termsPage: { ...currentObj, text: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs leading-relaxed"
                  placeholder="Enter or paste your terms & conditions here..."
                />
              </div>

              <UnifiedPhotoControls
                photoUrl={data.termsPage?.photo}
                frameShape={data.termsPage?.frameShape || 'arch'}
                photoHeight={data.termsPage?.photoHeight || 360}
                photoWidth={data.termsPage?.photoWidth || 75}
                photoFocalY={data.termsPage?.photoFocalY || 50}
                bgOpacity={data.termsPage?.bgOpacity || 40}
                imagePosition={data.termsPage?.imagePosition || 'bottom'}
                onOpenAddModal={() => openAddImageModal('termsPhoto')}
                onDeletePhoto={() => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), photo: '' } })}
                onChangeShape={(shape) => {
                  const currentObj = data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage;
                  const currentH = currentObj.photoHeight || 360;
                  const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 360 : currentH);
                  setData({ ...data, termsPage: { ...currentObj, frameShape: shape, photoHeight: newH } });
                }}
                onChangePosition={(pos) => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, termsPage: { ...(data.termsPage || DEFAULT_AIRY_PROPOSAL.termsPage), photoWidth: w } })}
              />
            
                    </div>
                  )}

                  {pageItem.type === 'thankYouPage' && (
                    <div className="space-y-3">
                      
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Title / Heading</label>
                <input
                  type="text"
                  value={data.thankYouPage?.heading || 'THANK YOU'}
                  onChange={(e) => {
                    const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                    setData({ ...data, thankYouPage: { ...currentObj, heading: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={data.thankYouPage?.subHeading || 'LOOKING FORWARD TO CREATING MAGIC'}
                  onChange={(e) => {
                    const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                    setData({ ...data, thankYouPage: { ...currentObj, subHeading: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-zinc-500">Closing Message</label>
                <textarea
                  rows={2}
                  value={data.thankYouPage?.message || ''}
                  onChange={(e) => {
                    const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                    setData({ ...data, thankYouPage: { ...currentObj, message: e.target.value } });
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                />
              </div>

              {/* Brand Footer Info Inputs */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Footer Branding &amp; Contact Info</span>
                
                <div className="flex items-center gap-2">
                  {data.thankYouPage?.brandLogoUrl && (
                    <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                      <img src={data.thankYouPage.brandLogoUrl} alt="Logo" crossOrigin="anonymous" className="w-full h-full object-contain bg-transparent" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openAddImageModal('thankYouLogo')}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    <span>{data.thankYouPage?.brandLogoUrl ? 'Change Footer Logo' : 'Upload Footer Logo'}</span>
                  </button>

                  {data.thankYouPage?.brandLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                        setData({ ...data, thankYouPage: { ...currentObj, brandLogoUrl: '' } });
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0 transition-all"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Brand Name</label>
                  <input
                    type="text"
                    value={data.thankYouPage?.brandName || ''}
                    onChange={(e) => {
                      const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                      setData({ ...data, thankYouPage: { ...currentObj, brandName: e.target.value } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Contact Number</label>
                    <input
                      type="text"
                      value={data.thankYouPage?.contactNumber || ''}
                      onChange={(e) => {
                        const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                        setData({ ...data, thankYouPage: { ...currentObj, contactNumber: e.target.value } });
                      }}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Email ID</label>
                    <input
                      type="text"
                      value={data.thankYouPage?.email || ''}
                      onChange={(e) => {
                        const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                        setData({ ...data, thankYouPage: { ...currentObj, email: e.target.value } });
                      }}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Website URL</label>
                  <input
                    type="text"
                    value={data.thankYouPage?.website || ''}
                    onChange={(e) => {
                      const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                      setData({ ...data, thankYouPage: { ...currentObj, website: e.target.value } });
                    }}
                    className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                  />
                </div>
              </div>

              <UnifiedPhotoControls
                photoUrl={data.thankYouPage?.photo}
                frameShape={data.thankYouPage?.frameShape || 'arch'}
                photoHeight={data.thankYouPage?.photoHeight || 360}
                photoWidth={data.thankYouPage?.photoWidth || 75}
                photoFocalY={data.thankYouPage?.photoFocalY || 50}
                bgOpacity={data.thankYouPage?.bgOpacity || 40}
                imagePosition={data.thankYouPage?.imagePosition || 'bottom'}
                onOpenAddModal={() => openAddImageModal('thankYouPhoto')}
                onDeletePhoto={() => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), photo: '' } })}
                onChangeShape={(shape) => {
                  const currentObj = data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage;
                  const currentH = currentObj.photoHeight || 360;
                  const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 360 : currentH);
                  setData({ ...data, thankYouPage: { ...currentObj, frameShape: shape, photoHeight: newH } });
                }}
                onChangePosition={(pos) => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), imagePosition: pos } })}
                onChangeFocalY={(focalY) => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), photoFocalY: focalY } })}
                onChangeBgOpacity={(op) => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), bgOpacity: op } })}
                onChangeHeight={(h) => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), photoHeight: h } })}
                onChangeWidth={(w) => setData({ ...data, thankYouPage: { ...(data.thankYouPage || DEFAULT_AIRY_PROPOSAL.thankYouPage), photoWidth: w } })}
              />
            
                    </div>
                  )}

                  {pageItem.type === 'custom' && (() => {
                    const cKey = pageItem.customId || pageItem.id;
                    const customObj = (data.customPages || {})[cKey] || {};
                    return (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-amber-700">Page Heading</label>
                      <input
                        type="text"
                        value={customObj.heading || ''}
                        onChange={(e) => {
                          const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, heading: e.target.value } };
                          setData({ ...data, customPages: updatedCustoms });
                        }}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs"
                        placeholder="Enter Page Title..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-zinc-400">Kicker / Top Tagline</label>
                      <input
                        type="text"
                        value={customObj.kicker || ''}
                        onChange={(e) => {
                          const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, kicker: e.target.value } };
                          setData({ ...data, customPages: updatedCustoms });
                        }}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-xs"
                        placeholder="e.g. SPECIAL HIGHLIGHT"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-zinc-400">Subtitle</label>
                      <input
                        type="text"
                        value={customObj.subtitle || ''}
                        onChange={(e) => {
                          const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, subtitle: e.target.value } };
                          setData({ ...data, customPages: updatedCustoms });
                        }}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs"
                        placeholder="e.g. Cinematic Film & Details"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-zinc-500">Text Content / Description</label>
                      <textarea
                        rows={4}
                        value={customObj.text || ''}
                        onChange={(e) => {
                          const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, text: e.target.value } };
                          setData({ ...data, customPages: updatedCustoms });
                        }}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium text-xs leading-relaxed"
                        placeholder="Enter detailed custom text block..."
                      />
                    </div>

                    <UnifiedPhotoControls
                      photoUrl={customObj.photo}
                      frameShape={customObj.frameShape || 'rounded'}
                      photoHeight={customObj.photoHeight || 380}
                      photoWidth={customObj.photoWidth || 75}
                      photoFocalY={customObj.photoFocalY || 50}
                      bgOpacity={customObj.bgOpacity || 40}
                      imagePosition={(customObj.imagePosition === 'full' ? 'bottom' : customObj.imagePosition) || 'bottom'}
                      onOpenAddModal={() => openAddImageModal(`customPhoto_${cKey}`)}
                      onDeletePhoto={() => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, photo: '' } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangeShape={(shape) => {
                        const currentH = customObj.photoHeight || 380;
                        const newH = shape === 'background' ? Math.max(1123, currentH) : (currentH > 800 ? 380 : currentH);
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, frameShape: shape, photoHeight: newH } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangePosition={(pos) => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, imagePosition: pos } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangeFocalY={(focalY) => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, photoFocalY: focalY } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangeBgOpacity={(op) => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, bgOpacity: op } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangeHeight={(h) => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, photoHeight: h } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                      onChangeWidth={(w) => {
                        const updatedCustoms = { ...(data.customPages || {}), [cKey]: { ...customObj, photoWidth: w } };
                        setData({ ...data, customPages: updatedCustoms });
                      }}
                    />
                  </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Guard: Never show default proposal on refresh while loading saved quotation
  if (!isDataReady) {
    return (
      <div className="h-screen w-screen bg-[#EBECEF] flex flex-col items-center justify-center space-y-4 select-none">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-extrabold tracking-widest text-zinc-600 uppercase">Loading Saved Quotation...</p>
      </div>
    );
  }

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
        .canvas-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px !important;
          padding: 0 0 32px 0 !important;
          background-color: #e5e7eb;
        }
        .quotation-canvas-page, .quotation-page {
          width: 794px !important;
          height: 1123px !important;
          min-height: 1123px !important;
          max-height: 1123px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: none !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
          margin: 0 auto !important;
        }
        @media print, .pdf-capture-active {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;

          .canvas-wrapper, #quotation-full-canvas, #quotation-document {
            gap: 0 !important;
            padding: 0 !important;
            margin: 0 auto !important;
            background-color: transparent !important;
          }
          .quotation-canvas-page, .quotation-page, #quotation-document section {
            width: 794px !important;
            height: 1123px !important;
            min-height: 1123px !important;
            max-height: 1123px !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
          }
          .canva-page-label {
            display: none !important;
          }
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
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside, nav, header, footer, .sidebar-container, .builder-sidebar, .platform-header, .no-print, .canva-page-label, .mobile-bottom-bar, #builder-sidebar-panel {
            display: none !important;
          }
          main, .flex-1, #quotation-canvas-container, .proposal-canvas-container, .canvas-wrapper {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .quotation-canvas-page, .quotation-page, section {
            width: 794px !important;
            height: 1123px !important;
            min-height: 1123px !important;
            max-height: 1123px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .quotation-canvas-page:last-child, .quotation-page:last-child, section:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-after: unset !important;
            break-after: unset !important;
          }
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      {!isPublicPreview && (
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
              onClick={() => updateZoomScale(s => s - 0.05)} 
              className="p-1 hover:bg-zinc-200 rounded-full transition-all cursor-pointer" 
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3 text-zinc-600" />
            </button>
            <span className="w-8 sm:w-10 text-center font-mono font-bold text-zinc-800 text-[10px]">{Math.round(zoomScale * 100)}%</span>
            <button 
              type="button" 
              onClick={() => updateZoomScale(s => s + 0.05)} 
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
              onClick={() => {
                const previewUrl = `/workspace/quotations/builder/templet/${templateId || 'templet'}?preview=public`;
                window.open(previewUrl, '_blank');
              }}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[10px] sm:text-[11px] font-extrabold transition-all items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg active:scale-95 hidden md:flex"
              title="Preview Template"
            >
              <Eye className="w-3.5 h-3.5 stroke-[2.5]" /> <span>Preview</span>
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
      )}

      {/* ── MAIN WORKSPACE VIEWPORT ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR PANEL (>= 768px) */}
        {!isPublicPreview && (
          <aside className="w-[420px] bg-white border-r border-zinc-200 p-4 overflow-y-auto shrink-0 text-xs shadow-sm no-print hidden md:block">
            {renderSidebarControls()}
          </aside>
        )}

        {/* CENTER LIVE PROPOSAL DOCUMENT CANVAS */}
        <main 
          ref={mainContainerRef}
          className="flex-1 bg-[#EBECEF] p-2 sm:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start pb-28 md:pb-12"
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
              className="w-full overflow-x-auto min-w-0 flex flex-col items-center justify-start py-8 bg-[#e5e7eb] min-h-screen"
            >
              <div 
                id="quotation-full-canvas" 
                style={{ width: '794px', minWidth: '794px', maxWidth: '794px' }} 
                className="canvas-wrapper flex flex-col shrink-0 mx-auto bg-[#e5e7eb]"
              >
                {pageSequence.map((pageItem, pIdx) => {
                  const isLastPage = pIdx === pageSequence.length - 1;
                  const isLast = pIdx === pageSequence.length - 1;

                  return (
                    <React.Fragment key={pageItem.id}>
                      {pageItem.type === 'cover' && (
                        <section 
                  className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                  style={{
                    width: '794px',
                    minWidth: '794px',
                    maxWidth: '794px',
                    height: '1123px',
                    minHeight: '1123px',
                    maxHeight: '1123px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflow: 'hidden',
                    margin: '0 auto',
                    boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
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

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.cover.photoUrl ? 'justify-center items-center' : 'justify-between'}`}>
                <div className={`w-full space-y-6 flex flex-col items-center justify-center my-auto ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-0' : ''}`}>
                  <div className={`space-y-3 ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                    <h1 className="couple-name-heading text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm whitespace-pre-line text-center" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.cover.coupleName !== undefined ? data.cover.coupleName : (data.cover.groomName ? `${data.cover.groomName} & ${data.cover.brideName}` : 'YASH & TWINKLE')}
                    </h1>
                    <h3 className="text-base tracking-[0.2em] uppercase font-bold whitespace-nowrap pt-1" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                    </h3>
                  </div>

                  <div className={`space-y-3 pt-1 ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-12' : ''}`}>

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
                </div>

                {/* BOTTOM POSITION IMAGE */}
                {data.cover.photoUrl && data.cover.frameShape !== 'background' && (
                  <SectionImageRenderer
                    photo={data.cover.photoUrl}
                    frameShape={data.cover.frameShape}
                    photoHeight={data.cover.photoHeight}
                    photoWidth={data.cover.photoWidth}
                    photoFocalY={data.cover.photoFocalY}
                    isBottomFlush={true}
                    altText="Wedding Couple"
                  />
                )}

                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
                      )}

                      {pageItem.type === 'aboutUs' && (
                        <section 
              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
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

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.aboutUs.frameShape === 'full-width' || (data.aboutUs.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.aboutUs.bottomBannerPhoto ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.aboutUs.frameShape === 'full-width' || (data.aboutUs.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.aboutUs.kicker || 'INTRODUCTION'}
                  </span>

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
                {data.aboutUs.bottomBannerPhoto && data.aboutUs.frameShape !== 'background' && (
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

                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
                      )}

                      {pageItem.type === 'shootDetails' && (
                        <section 
              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
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

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.shootDetails.frameShape === 'full-width' || (data.shootDetails.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.shootDetails.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.shootDetails.frameShape === 'full-width' || (data.shootDetails.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  <div className="text-center space-y-3 my-3">
                    <h2 className="text-4xl tracking-wide font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.shootDetails.heading || 'Pre-Wedding Shoot'}
                    </h2>
                  </div>

                  {Boolean(data.shootDetails.crewText?.trim()) && (
                    <div className="space-y-3 max-w-lg mx-auto my-3 flex flex-col items-center">
                      <p className="text-base font-bold tracking-wide flex items-center justify-center gap-2 mb-1" style={{ color: textColor }}>
                        <Camera className="w-4 h-4" style={{ color: kickerColor }} />
                        <span>{data.shootDetails.daysText || '1 Day Shoot'}</span>
                      </p>
                      <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                        {data.shootDetails.crewText
                          .split('\n').filter(Boolean).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2.5 text-sm font-medium tracking-wide leading-tight" style={{ color: textColor }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: kickerColor }} />
                              <span>{item.trim()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {Boolean(data.shootDetails.deliverablesText?.trim()) && (
                    <div className="pt-2 space-y-3 max-w-lg mx-auto my-3 flex flex-col items-center">
                      <h3 className="text-2xl tracking-wide font-normal text-center whitespace-nowrap mb-1" style={{ color: textColor, fontFamily: data.primaryFont }}>
                        {data.shootDetails.deliverablesHeading || 'Deliverables'}
                      </h3>
                      <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                        {data.shootDetails.deliverablesText
                          .split('\n').filter(Boolean).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2.5 text-sm font-medium tracking-wide leading-tight" style={{ color: textColor }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: kickerColor }} />
                              <span>{item.trim()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* EXCLUSIONS CALLOUT BOX (BEFORE PHOTO) */}
                  {data.shootDetails?.showExclusionsNote && (
                    <div 
                      className="w-full max-w-lg mx-auto my-3 p-3 rounded-xl border text-center text-xs font-semibold shadow-2xs transition-all"
                      style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                    >
                      <span className="opacity-90 font-medium">
                        {data.shootDetails.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.shootDetails.photo && data.shootDetails.frameShape !== 'background' && (
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

                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
                      )}

                      {pageItem.type === 'functionsPage' && (() => {
                        const hasPhoto = !!(data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background');
                        const photoHeight = data.functionsPage?.photoHeight || 200;
                        const funcChunks = paginateFunctionsPageItems(data.functionsPage?.items || [], hasPhoto, photoHeight);
                        return funcChunks.map((funcChunk, chunkIdx) => (
                          <section 
                            key={`func-chunk-${chunkIdx}`}
                            className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                            style={{
                              width: '794px',
                              minWidth: '794px',
                              maxWidth: '794px',
                              height: '1123px',
                              minHeight: '1123px',
                              maxHeight: '1123px',
                              boxSizing: 'border-box',
                              position: 'relative',
                              overflow: 'hidden',
                              margin: '0 auto',
                              boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                              backgroundColor: pageBgColor || '#FFFFFF',
                              color: textColor,
                              fontFamily: data.secondaryFont,
                            }}
                          >
                            {chunkIdx === 0 && data.functionsPage?.photo && data.functionsPage?.frameShape === 'background' && (
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

                            <div className={`relative z-10 mx-auto flex flex-col h-full w-full py-10 ${
                              data.functionsPage?.frameShape === 'full-width' || (data.functionsPage?.imagePosition as string) === 'full' 
                                ? 'px-0' 
                                : 'px-12'
                            } justify-between`}>
                              
                              <div className={`flex flex-col items-center justify-start w-full ${data.functionsPage?.frameShape === 'full-width' || (data.functionsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                                <div className="text-center space-y-2 my-2">
                                  <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap" style={{ color: kickerColor }}>
                                    {data.functionsPage?.kicker || 'EVENT SCHEDULE'} {funcChunks.length > 1 ? `(${chunkIdx + 1}/${funcChunks.length})` : ''}
                                  </span>
                                  <h2 className="text-3xl tracking-wide font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                    {data.functionsPage?.heading || 'Functions & Coverage'}
                                  </h2>
                                </div>

                                <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                                  {funcChunk.map((func: any, index: number) => {
                                    const previousCardsCount = funcChunks.slice(0, chunkIdx).reduce((sum, chunk) => sum + chunk.length, 0);
                                    const globalIdx = previousCardsCount + index;
                                    return (
                                      <div 
                                        key={func.id || globalIdx} 
                                        className="p-4 rounded-2xl border transition-all space-y-2.5 shadow-xs"
                                        style={{ 
                                          borderColor: borderColor || 'rgba(0,0,0,0.12)',
                                          backgroundColor: boxBgColor || 'rgba(0,0,0,0.03)'
                                        }}
                                      >
                                        {/* Function Name & Timing Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2" style={{ borderColor: borderColor || 'rgba(0,0,0,0.1)' }}>
                                          <h3 className="text-xl tracking-wider font-semibold uppercase" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                            {resolveFunctionTitle(func.name)}
                                          </h3>
                                          <div className="text-[10px] tracking-widest uppercase font-bold font-sans px-2.5 py-0.5 rounded-full border shadow-2xs inline-flex items-center gap-1 self-start sm:self-auto" style={{ color: kickerColor, borderColor: borderColor || 'rgba(0,0,0,0.15)', backgroundColor: pageBgColor }}>
                                            <Calendar className="w-3 h-3" />
                                            <span className="font-sans font-medium tracking-tight">
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
                                          <div className="space-y-1 pt-0.5">
                                            <span className="text-[10px] uppercase font-bold tracking-widest block opacity-75" style={{ color: kickerColor }}>
                                              Crew &amp; Requirements:
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-medium">
                                              {func.requirements.map((req: any, rIdx: number) => {
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
                                                  <div key={rIdx} className="flex items-center gap-1.5" style={{ color: textColor }}>
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
                                          <p 
                                            className="text-xs italic leading-relaxed opacity-85 pt-1 border-t whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]" 
                                            style={{ 
                                              color: textColor, 
                                              borderColor: borderColor || 'rgba(0,0,0,0.08)',
                                              whiteSpace: 'pre-wrap',
                                              overflowWrap: 'anywhere',
                                              wordBreak: 'break-word'
                                            }}
                                          >
                                            "{func.notes}"
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* BOTTOM FLUSH IMAGE POSITION - Only on 1st Page */}
                              {chunkIdx === 0 && data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && (
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

                              {/* CANVAS FOOTER WATERMARK */}
                              {isLastPage && chunkIdx === funcChunks.length - 1 && (
                                <div className="w-full text-center py-3 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                  Created by StudioCore.in
                                </div>
                              )}
                            </div>
                          </section>
                        ));
                      })()}

                      {pageItem.type === 'deliverablesPage' && (() => {
                        const delivPhoto = data.deliverablesPage?.photo;
                        const delivChunks = paginateDeliverablesPageItems(
                          data.deliverablesPage?.selectedItems,
                          delivPhoto,
                          data.deliverablesPage?.frameShape || 'arch',
                          data.deliverablesPage?.photoHeight || 200
                        );
                        return delivChunks.map((delivChunk, chunkIdx) => {
                          const isLastChunk = chunkIdx === delivChunks.length - 1;
                          return (
                            <section 
                              key={`deliv-chunk-${chunkIdx}`}
                              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                              style={{
                                width: '794px',
                                minWidth: '794px',
                                maxWidth: '794px',
                                height: '1123px',
                                minHeight: '1123px',
                                maxHeight: '1123px',
                                boxSizing: 'border-box',
                                position: 'relative',
                                overflow: 'hidden',
                                margin: '0 auto',
                                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
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

                              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 ${
                                data.deliverablesPage?.frameShape === 'full-width' || (data.deliverablesPage?.imagePosition as string) === 'full' 
                                  ? 'px-0' 
                                  : 'px-12'
                              } justify-between`}>
                                
                                <div className={`flex flex-col items-center justify-start w-full ${data.deliverablesPage?.frameShape === 'full-width' || (data.deliverablesPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                                    {data.deliverablesPage?.kicker || 'WHAT WE DELIVER'} {delivChunks.length > 1 ? `(${chunkIdx + 1}/${delivChunks.length})` : ''}
                                  </span>
                                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                    {data.deliverablesPage?.heading || 'DELIVERABLES'}
                                  </h2>

                                  <div className="w-full max-w-xl mx-auto space-y-3 text-left my-0">
                                    {delivChunk.map((item: any, idx: number) => (
                                      <div 
                                        key={idx}
                                        className="p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs"
                                        style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                                      >
                                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                                          <CheckCircle2 className="w-4 h-4 text-amber-700" style={{ color: kickerColor }} />
                                        </div>
                                        <span className="text-xs font-bold leading-snug whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* BOTTOM FLUSH IMAGE POSITION - ONLY ON FINAL DELIVERABLES PAGE */}
                                {isLastChunk && data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && (
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

                                {/* CANVAS FOOTER WATERMARK */}
                                {isLastPage && isLastChunk && (
                                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                    Created by StudioCore.in
                                  </div>
                                )}
                              </div>
                            </section>
                          );
                        });
                      })()}

                      {pageItem.type === 'specialValueAdditions' && (() => {
                        const addValChunks = paginateSpecialValueAdditionsPageItems(data.specialValueAdditions?.selectedItems);
                        return addValChunks.map((addValChunk, chunkIdx) => {
                          const isLastChunk = chunkIdx === addValChunks.length - 1;
                          return (
                            <section 
                              key={`addval-chunk-${chunkIdx}`}
                              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                              style={{
                                width: '794px',
                                minWidth: '794px',
                                maxWidth: '794px',
                                height: '1123px',
                                minHeight: '1123px',
                                maxHeight: '1123px',
                                boxSizing: 'border-box',
                                position: 'relative',
                                overflow: 'hidden',
                                margin: '0 auto',
                                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                                backgroundColor: pageBgColor || '#FFFFFF',
                                color: textColor,
                                fontFamily: data.secondaryFont,
                              }}
                            >
                              <div className="relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 px-12 justify-between">
                                <div className="flex flex-col items-center justify-start w-full px-12">
                                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                                    {data.specialValueAdditions?.kicker || 'COMPLIMENTARY GIFTS & BONUSES'} {addValChunks.length > 1 ? `(${chunkIdx + 1}/${addValChunks.length})` : ''}
                                  </span>
                                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                    {data.specialValueAdditions?.heading || 'SPECIAL VALUE ADDITIONS'}
                                  </h2>

                                  <div className="w-full max-w-xl mx-auto space-y-3 text-left my-0">
                                    {addValChunk.map((item: any, idx: number) => (
                                      <div 
                                        key={idx}
                                        className="p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all"
                                        style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                            <Gift className="w-4 h-4" style={{ color: kickerColor }} />
                                          </div>
                                          <span className="text-xs font-bold leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">{item}</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: textColor }}>
                                          FREE
                                        </span>
                                      </div>
                                    ))}

                                    {isLastChunk && data.specialValueAdditions?.note && (
                                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: textColor, borderColor }}>
                                        "{data.specialValueAdditions.note}"
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* CANVAS FOOTER WATERMARK */}
                                {isLastPage && isLastChunk && (
                                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                    Created by StudioCore.in
                                  </div>
                                )}
                              </div>
                            </section>
                          );
                        });
                      })()}

                      {pageItem.type === 'pricingPage' && (
                        <section 
                          className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                          style={{
                            width: '794px',
                            minWidth: '794px',
                            maxWidth: '794px',
                            height: '1123px',
                            minHeight: '1123px',
                            maxHeight: '1123px',
                            boxSizing: 'border-box',
                            position: 'relative',
                            overflow: 'hidden',
                            margin: '0 auto',
                            boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                            backgroundColor: pageBgColor || '#FFFFFF',
                            color: textColor,
                            fontFamily: data.secondaryFont,
                          }}
                        >
                          <div className="relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 px-12 justify-between">
                            <div className="flex flex-col items-center justify-start w-full px-12">
                              <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                                {data.pricingPage?.kicker || 'INVESTMENT & BREAKDOWN'}
                              </span>
                              <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                {data.pricingPage?.heading || 'PRICING DETAILS'}
                              </h2>

                              <div className="w-full max-w-xl mx-auto space-y-4 my-0">
                                <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor }}>
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: kickerColor }}>
                                      <tr>
                                        <th className="py-3.5 px-5">Financial Item / Particulars</th>
                                        <th className="py-3.5 px-5 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y font-semibold" style={{ color: textColor, borderColor }}>
                                      <tr style={{ borderColor }}>
                                        <td className="py-3 px-5">Base Package Price</td>
                                        <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{pricingCalculated.base.toLocaleString('en-IN')}</td>
                                      </tr>
                                      {pricingCalculated.disc > 0 && (
                                        <tr style={{ borderColor, backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                                          <td className="py-3 px-5 font-bold" style={{ color: textColor }}>Discount (Complimentary)</td>
                                          <td className="py-3 px-5 text-right font-sans font-bold tracking-tight">-₹{pricingCalculated.disc.toLocaleString('en-IN')}</td>
                                        </tr>
                                      )}
                                      {pricingCalculated.accom > 0 && (
                                        <tr style={{ borderColor }}>
                                          <td className="py-3 px-5">Accommodation Charges</td>
                                          <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{pricingCalculated.accom.toLocaleString('en-IN')}</td>
                                        </tr>
                                      )}
                                      {pricingCalculated.travel > 0 && (
                                        <tr style={{ borderColor }}>
                                          <td className="py-3 px-5">Travel Charges</td>
                                          <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{pricingCalculated.travel.toLocaleString('en-IN')}</td>
                                        </tr>
                                      )}
                                      {pricingCalculated.addl > 0 && (
                                        <tr style={{ borderColor }}>
                                          <td className="py-3 px-5">Additional Charges</td>
                                          <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{pricingCalculated.addl.toLocaleString('en-IN')}</td>
                                        </tr>
                                      )}
                                      {Array.isArray(data.pricingPage?.additionalChargesList) && data.pricingPage.additionalChargesList.map((ch: any, idx: number) => {
                                        if (!ch?.name && !ch?.amount) return null;
                                        return (
                                          <tr key={ch.id || `custom-charge-${idx}`} style={{ borderColor }}>
                                            <td className="py-3 px-5">{ch.name || 'Additional Charge'}</td>
                                            <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{Number(ch.amount || 0).toLocaleString('en-IN')}</td>
                                          </tr>
                                        );
                                      })}
                                      <tr className="border-t font-bold" style={{ backgroundColor: boxBgColor, borderColor }}>
                                        <td className="py-3 px-5 uppercase text-[11px] font-black">Subtotal (Gross Total)</td>
                                        <td className="py-3 px-5 text-right font-sans font-black tracking-tight">₹{pricingCalculated.gross.toLocaleString('en-IN')}</td>
                                      </tr>
                                      {pricingCalculated.gstPct > 0 && (
                                        <tr style={{ borderColor }}>
                                          <td className="py-3 px-5">GST ({pricingCalculated.gstPct}%)</td>
                                          <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{pricingCalculated.gstAmount.toLocaleString('en-IN')}</td>
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
                                  <div className="text-3xl font-black font-sans tracking-tight" style={{ color: textColor }}>
                                    ₹{pricingCalculated.netTotal.toLocaleString('en-IN')}
                                  </div>
                                </div>

                                {data.pricingPage?.showExclusionsNote && (
                                  <div 
                                    className="w-full max-w-xl mx-auto my-3 p-3 rounded-xl border text-center text-xs font-semibold shadow-2xs transition-all"
                                    style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                                  >
                                    <span className="opacity-90 font-medium">
                                      {data.pricingPage.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                                    </span>
                                  </div>
                                )}

                                {data.pricingPage?.note && (
                                  <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]" style={{ color: textColor, borderColor }}>
                                    "{data.pricingPage.note}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* CANVAS FOOTER WATERMARK */}
                            {isLastPage && (
                              <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                Created by StudioCore.in
                              </div>
                            )}
                          </div>
                        </section>
                      )}

                      {pageItem.type === 'paymentTermsPage' && (
                        <section 
              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 px-12 justify-between">
                <div className="flex flex-col items-center justify-start w-full px-12">
                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.paymentTermsPage?.kicker || 'SCHEDULE'}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.paymentTermsPage?.heading || 'PAYMENT TERMS & SCHEDULE'}
                  </h2>

                  <div className="w-full max-w-xl mx-auto space-y-4 my-0">
                    {/* Structured Table matching reference design */}
                    <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor }}>
                      <table className="w-full text-left border-collapse">
                        <thead className="text-[11px] uppercase tracking-wider font-extrabold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: kickerColor }}>
                          <tr>
                            <th className="py-3.5 px-4 w-[24%]">DATE</th>
                            <th className="py-3.5 px-4 w-[38%]">STEPS</th>
                            <th className="py-3.5 px-4 w-[20%] text-right">AMOUNT</th>
                            <th className="py-3.5 px-4 w-[18%] text-center">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs font-semibold" style={{ borderColor, color: textColor }}>
                          {(data.paymentTermsPage?.steps || []).map((step: any) => (
                            <tr key={step.id} style={{ borderColor }}>
                              <td className="py-3 px-4 font-sans font-medium tracking-tight uppercase">{step.date}</td>
                              <td className="py-3 px-4 font-bold">{step.stepName}</td>
                              <td className="py-3 px-4 text-right font-sans font-medium tracking-tight">₹{Number(step.amount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-center">
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border"
                                  style={{
                                    backgroundColor: step.status === 'Completed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                    borderColor: step.status === 'Completed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                                    color: textColor
                                  }}
                                >
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
                    <div className="grid grid-cols-3 gap-3 w-full text-center pt-1">
                      <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: kickerColor }}>FIXED AMOUNT</span>
                        <span className="text-base font-black font-sans tracking-tight">₹{paymentTermsCalculated.fixedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: textColor }}>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: kickerColor }}>RECEIVED AMOUNT</span>
                        <span className="text-base font-black font-sans tracking-tight">₹{paymentTermsCalculated.receivedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: textColor }}>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: kickerColor }}>PENDING AMOUNT</span>
                        <span className="text-base font-black font-sans tracking-tight">₹{paymentTermsCalculated.pendingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {data.paymentTermsPage?.note && (
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]" style={{ color: textColor, borderColor }}>
                        "{data.paymentTermsPage.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
          )}

                      {pageItem.type === 'addOnsPage' && (
                        <section 
              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              <div className="relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 px-12 justify-between">
                <div className="flex flex-col items-center justify-start w-full px-12">
                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.addOnsPage?.kicker || "EMBRACE YOUR DAY — YOU'RE IN CONTROL"}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-2" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.addOnsPage?.heading || 'ADD-ONS & UPGRADES'}
                  </h2>
                  {data.addOnsPage?.subText && (
                    <p className="text-xs font-medium opacity-80 mb-6" style={{ color: textColor }}>
                      {data.addOnsPage.subText}
                    </p>
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-4 my-0">
                    <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor }}>
                      <table className="w-full text-left border-collapse">
                        <thead className="text-[11px] uppercase tracking-wider font-extrabold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: kickerColor }}>
                          <tr>
                            <th className="py-3.5 px-5">ADD-ON SERVICE / PARTICULAR</th>
                            <th className="py-3.5 px-5 text-right">PRICE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs font-semibold" style={{ borderColor, color: textColor }}>
                          {(data.addOnsPage?.items || []).filter((item: any) => item.selected).map((item: any) => (
                            <tr key={item.id} style={{ borderColor }}>
                              <td className="py-3.5 px-5 font-bold">{item.title}</td>
                              <td className="py-3.5 px-5 text-right font-sans font-medium tracking-tight">₹{Number(item.price || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {data.addOnsPage?.note && (
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]" style={{ color: textColor, borderColor }}>
                        "{data.addOnsPage.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
          )}

                      {pageItem.type === 'termsPage' && (() => {
                        const termsRaw = data.termsPage?.text || DEFAULT_AIRY_PROPOSAL.termsPage.text || '';
                        const termLines = termsRaw.split('\n').filter(Boolean);
                        const termsChunks = chunkArray(termLines, 13);
                        return termsChunks.map((termsChunk, chunkIdx) => (
                          <section 
                            key={`terms-chunk-${chunkIdx}`}
                            className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                            style={{
                              width: '794px',
                              minWidth: '794px',
                              maxWidth: '794px',
                              height: '1123px',
                              minHeight: '1123px',
                              maxHeight: '1123px',
                              boxSizing: 'border-box',
                              position: 'relative',
                              overflow: 'hidden',
                              margin: '0 auto',
                              boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                              backgroundColor: pageBgColor || '#FFFFFF',
                              color: textColor,
                              fontFamily: data.secondaryFont,
                            }}
                          >
                            {chunkIdx === 0 && data.termsPage?.photo && data.termsPage?.frameShape === 'background' && (
                              <SectionImageRenderer
                                photo={data.termsPage.photo}
                                frameShape="background"
                                photoHeight={data.termsPage.photoHeight}
                                photoWidth={data.termsPage.photoWidth}
                                photoFocalY={data.termsPage.photoFocalY}
                                bgOpacity={data.termsPage.bgOpacity}
                                pageBgColor={pageBgColor}
                                altText="Terms & Conditions Background"
                              />
                            )}

                            <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-12 ${
                              data.termsPage?.frameShape === 'full-width' || (data.termsPage?.imagePosition as string) === 'full' 
                                ? 'px-0' 
                                : 'px-12'
                            } justify-between`}>
                              
                              <div className={`flex flex-col items-center justify-start w-full ${data.termsPage?.frameShape === 'full-width' || (data.termsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                                {/* TOP IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.termsPage?.photo && data.termsPage?.frameShape !== 'background' && data.termsPage?.imagePosition === 'top' && (
                                  <SectionImageRenderer
                                    photo={data.termsPage.photo}
                                    frameShape={data.termsPage.frameShape}
                                    photoHeight={data.termsPage.photoHeight}
                                    photoWidth={data.termsPage.photoWidth}
                                    photoFocalY={data.termsPage.photoFocalY}
                                    altText="Terms & Conditions Photo"
                                  />
                                )}

                                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                                  {data.termsPage?.kicker || 'POLICIES & RULES'} {termsChunks.length > 1 ? `(${chunkIdx + 1}/${termsChunks.length})` : ''}
                                </span>
                                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                  {data.termsPage?.heading || 'TERMS & CONDITIONS'}
                                </h2>

                                {/* CENTER IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.termsPage?.photo && data.termsPage?.frameShape !== 'background' && data.termsPage?.imagePosition === 'center' && (
                                  <SectionImageRenderer
                                    photo={data.termsPage.photo}
                                    frameShape={data.termsPage.frameShape}
                                    photoHeight={data.termsPage.photoHeight}
                                    photoWidth={data.termsPage.photoWidth}
                                    photoFocalY={data.termsPage.photoFocalY}
                                    altText="Terms & Conditions Photo"
                                  />
                                )}

                                <div className="w-full max-w-xl mx-auto space-y-4 my-0 text-left">
                                  <div 
                                    className="p-6 rounded-2xl border shadow-xs leading-relaxed space-y-3"
                                    style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                                  >
                                    <p className="text-xs whitespace-pre-line leading-relaxed opacity-90 font-medium">
                                      {termsChunk.join('\n\n')}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* BOTTOM FLUSH IMAGE POSITION - Only on 1st Page */}
                              {chunkIdx === 0 && data.termsPage?.photo && data.termsPage?.frameShape !== 'background' && (data.termsPage?.imagePosition === 'bottom' || !data.termsPage?.imagePosition) && (
                                <SectionImageRenderer
                                  photo={data.termsPage.photo}
                                  frameShape={data.termsPage.frameShape}
                                  photoHeight={data.termsPage.photoHeight}
                                  photoWidth={data.termsPage.photoWidth}
                                  photoFocalY={data.termsPage.photoFocalY}
                                  isBottomFlush={true}
                                  altText="Terms & Conditions Photo"
                                />
                              )}

                              {/* CANVAS FOOTER WATERMARK */}
                              {isLastPage && chunkIdx === termsChunks.length - 1 && (
                                <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                  Created by StudioCore.in
                                </div>
                              )}
                            </div>
                          </section>
                        ));
                      })()}

                      {pageItem.type === 'thankYouPage' && (
                        <section 
              className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                backgroundColor: pageBgColor || '#FFFFFF',
                color: textColor,
                fontFamily: data.secondaryFont,
              }}
            >
              {data.thankYouPage?.photo && data.thankYouPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.thankYouPage.photo}
                  frameShape="background"
                  photoHeight={data.thankYouPage.photoHeight}
                  photoWidth={data.thankYouPage.photoWidth}
                  photoFocalY={data.thankYouPage.photoFocalY}
                  bgOpacity={data.thankYouPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Thank You Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.thankYouPage?.frameShape === 'full-width' || (data.thankYouPage?.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } justify-between`}>
                
                <div className={`flex flex-col items-center justify-center w-full my-auto ${data.thankYouPage?.frameShape === 'full-width' || (data.thankYouPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.thankYouPage?.photo && data.thankYouPage?.frameShape !== 'background' && data.thankYouPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.thankYouPage.photo}
                      frameShape={data.thankYouPage.frameShape}
                      photoHeight={data.thankYouPage.photoHeight}
                      photoWidth={data.thankYouPage.photoWidth}
                      photoFocalY={data.thankYouPage.photoFocalY}
                      altText="Thank You Photo"
                    />
                  )}

                  <div className="space-y-4 max-w-xl mx-auto my-auto">
                    <h1 className="text-5xl uppercase tracking-[0.2em] font-black leading-tight" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.thankYouPage?.heading || 'THANK YOU'}
                    </h1>
                    <h3 className="text-xs uppercase tracking-[0.25em] font-bold" style={{ color: kickerColor }}>
                      {data.thankYouPage?.subHeading || 'LOOKING FORWARD TO CREATING MAGIC'}
                    </h3>

                    {data.thankYouPage?.message && (
                      <p className="text-sm leading-relaxed opacity-90 pt-3 max-w-md mx-auto" style={{ color: textColor }}>
                        "{data.thankYouPage.message}"
                      </p>
                    )}
                  </div>

                  {/* CENTER OR BOTTOM IMAGE POSITION */}
                  {data.thankYouPage?.photo && data.thankYouPage?.frameShape !== 'background' && (data.thankYouPage?.imagePosition === 'center' || data.thankYouPage?.imagePosition === 'bottom' || !data.thankYouPage?.imagePosition) && (
                    <SectionImageRenderer
                      photo={data.thankYouPage?.photo}
                      frameShape={data.thankYouPage?.frameShape}
                      photoHeight={data.thankYouPage?.photoHeight}
                      photoWidth={data.thankYouPage?.photoWidth}
                      photoFocalY={data.thankYouPage?.photoFocalY}
                      isBottomFlush={data.thankYouPage?.imagePosition === 'bottom'}
                      altText="Thank You Photo"
                    />
                  )}
                </div>

                {/* BOTTOM FLUSH BRANDING FOOTER */}
                <div className={`w-full pt-6 border-t ${data.thankYouPage?.frameShape === 'full-width' || (data.thankYouPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`} style={{ borderColor }}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
                    
                    {/* Brand Logo & Name */}
                    <div className="flex items-center gap-3">
                      {(data.thankYouPage?.brandLogoUrl || data.cover?.brandLogoUrl) ? (
                        <img 
                          src={data.thankYouPage?.brandLogoUrl || data.cover?.brandLogoUrl} 
                          alt="Brand Logo" 
                          crossOrigin="anonymous"
                          className="h-10 w-auto object-contain bg-transparent"
                        />
                      ) : null}
                      <span className="font-extrabold uppercase tracking-widest text-sm" style={{ color: textColor, fontFamily: data.primaryFont }}>
                        {data.thankYouPage?.brandName || data.cover?.brandName || 'FILMIFY WEDDINGS'}
                      </span>
                    </div>

                    {/* Contact details list */}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                      {data.thankYouPage?.contactNumber && (
                        <div className="flex items-center gap-1.5" style={{ color: textColor }}>
                          <Phone className="w-3.5 h-3.5 text-amber-600" style={{ color: kickerColor }} />
                          <span className="font-sans font-medium">{data.thankYouPage.contactNumber}</span>
                        </div>
                      )}
                      {data.thankYouPage?.email && (
                        <div className="flex items-center gap-1.5" style={{ color: textColor }}>
                          <Mail className="w-3.5 h-3.5 text-amber-600" style={{ color: kickerColor }} />
                          <span className="font-sans font-medium">{data.thankYouPage.email}</span>
                        </div>
                      )}
                      {data.thankYouPage?.website && (
                        <div className="flex items-center gap-1.5" style={{ color: textColor }}>
                          <Globe className="w-3.5 h-3.5 text-amber-600" style={{ color: kickerColor }} />
                          <span className="font-sans font-medium">{data.thankYouPage.website}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>


                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
                      )}

                      {pageItem.type === 'custom' && (() => {
                        const cKey = pageItem.customId || pageItem.id;
                        const customObj = (data.customPages || {})[cKey] || {};
                        return (
                          <section 
                            className="quotation-page relative w-[794px] overflow-hidden transition-none mx-auto select-none flex flex-col"
                            style={{
                              width: '794px',
                              minWidth: '794px',
                              maxWidth: '794px',
                              height: '1123px',
                              minHeight: '1123px',
                              maxHeight: '1123px',
                              boxSizing: 'border-box',
                              position: 'relative',
                              overflow: 'hidden',
                              margin: '0 auto',
                              boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -5px rgba(0,0,0,0.3)',
                              backgroundColor: pageBgColor || '#FFFFFF',
                              color: textColor,
                              fontFamily: data.secondaryFont,
                            }}
                          >
                            {customObj.photo && customObj.frameShape === 'background' && (
                              <SectionImageRenderer
                                photo={customObj.photo}
                                frameShape="background"
                                photoHeight={customObj.photoHeight || 1123}
                                photoWidth={customObj.photoWidth || 100}
                                photoFocalY={customObj.photoFocalY || 50}
                                bgOpacity={customObj.bgOpacity || 40}
                                pageBgColor={pageBgColor}
                                altText={customObj.heading || "Custom Page Background"}
                              />
                            )}

                            <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                              customObj.frameShape === 'full-width' || customObj.imagePosition === 'full' 
                                ? 'px-0' 
                                : 'px-12'
                            } ${!customObj.photo ? 'justify-center items-center' : 'justify-between'}`}>
                              <div className={`w-full space-y-6 flex flex-col items-center justify-center my-auto ${
                                customObj.frameShape === 'full-width' || customObj.imagePosition === 'full' ? 'px-0' : ''
                              }`}>
                                
                                {/* TOP POSITION IMAGE */}
                                {customObj.photo && customObj.frameShape !== 'background' && customObj.imagePosition === 'top' && (
                                  <SectionImageRenderer
                                    photo={customObj.photo}
                                    frameShape={customObj.frameShape || 'rounded'}
                                    photoHeight={customObj.photoHeight || 380}
                                    photoWidth={customObj.photoWidth || 75}
                                    photoFocalY={customObj.photoFocalY || 50}
                                    altText="Custom Photo"
                                  />
                                )}

                                <div className={`space-y-3 ${customObj.frameShape === 'full-width' || customObj.imagePosition === 'full' ? 'px-12' : ''}`}>
                                  {customObj.kicker && (
                                    <p className="text-xs tracking-[0.25em] uppercase font-bold" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                                      {customObj.kicker}
                                    </p>
                                  )}
                                  
                                  <h2 className="text-3xl tracking-[0.2em] uppercase font-black" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                    {customObj.heading || 'CUSTOM PAGE'}
                                  </h2>

                                  {customObj.subtitle && (
                                    <p className="text-sm tracking-[0.15em] uppercase font-semibold opacity-90" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                                      {customObj.subtitle}
                                    </p>
                                  )}
                                </div>

                                {/* CENTER POSITION IMAGE */}
                                {customObj.photo && customObj.frameShape !== 'background' && customObj.imagePosition === 'center' && (
                                  <SectionImageRenderer
                                    photo={customObj.photo}
                                    frameShape={customObj.frameShape || 'rounded'}
                                    photoHeight={customObj.photoHeight || 380}
                                    photoWidth={customObj.photoWidth || 75}
                                    photoFocalY={customObj.photoFocalY || 50}
                                    altText="Custom Photo"
                                  />
                                )}

                                {customObj.text && (
                                  <div className={`pt-2 max-w-xl mx-auto ${customObj.frameShape === 'full-width' || customObj.imagePosition === 'full' ? 'px-12' : ''}`}>
                                    <p className="text-xs leading-relaxed font-normal whitespace-pre-line text-zinc-700" style={{ fontFamily: data.secondaryFont }}>
                                      {customObj.text}
                                    </p>
                                  </div>
                                )}

                                {/* BOTTOM POSITION IMAGE */}
                                {customObj.photo && customObj.frameShape !== 'background' && (customObj.imagePosition === 'bottom' || !customObj.imagePosition) && (
                                  <SectionImageRenderer
                                    photo={customObj.photo}
                                    frameShape={customObj.frameShape || 'rounded'}
                                    photoHeight={customObj.photoHeight || 380}
                                    photoWidth={customObj.photoWidth || 75}
                                    photoFocalY={customObj.photoFocalY || 50}
                                    isBottomFlush={true}
                                    altText="Custom Photo"
                                  />
                                )}
                              </div>
              
                {/* CANVAS FOOTER WATERMARK */}
                {isLastPage && (
                  <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                    Created by StudioCore.in
                  </div>
                )}
              </div>
            </section>
          );
        })()}
      </React.Fragment>
    );
  })}
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
          disabled={isExportingPDF}
          className="ml-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-500 active:to-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isExportingPDF ? 'Exporting...' : 'PDF'}</span>
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
                  onClick={() => {
                    setHasUnsavedChanges(true);
                    setData((prev: any) => ({ ...prev }));
                    setMobileSheetOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-black hover:bg-zinc-900 active:scale-98 text-white font-bold text-xs transition-transform cursor-pointer"
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

      {/* ── SMART + ADD PAGE MODAL ── */}
      <AnimatePresence>
        {isAddPageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200"
            >
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wider">Add Page</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAddPageModalOpen(false)}
                  className="p-1 rounded-full hover:bg-amber-100 text-zinc-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Custom Page Option (Always Visible) */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wide">
                    <PlusCircle className="w-4 h-4 text-amber-600" />
                    <span>Custom Flexible Page</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-normal">
                    Add a flexible blank custom page with Heading, Subtitle, Text block, and Photo Layout controls.
                  </p>
                  <button
                    type="button"
                    onClick={addCustomBlankPage}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Create Blank Custom Page</span>
                  </button>
                </div>

                {/* Dynamic Restoration List */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center justify-between border-b pb-1.5 border-zinc-100">
                    <span>Restore Deleted Standard Pages</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {deletedStandardPages.length} Available
                    </span>
                  </h4>

                  {deletedStandardPages.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-center text-xs font-semibold text-zinc-500 space-y-1">
                      <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                      <p className="text-zinc-700 font-bold">All standard pages are active</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Deleting any of the 11 built-in standard template pages will add them here so you can restore them anytime with their original layout.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deletedStandardPages.map(stdDef => (
                        <div
                          key={stdDef.type}
                          className="p-3 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-2">
                            {getPageIcon(stdDef.type)}
                            <span className="text-xs font-bold text-zinc-800">{stdDef.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => restoreStandardPage(stdDef.type)}
                            className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-black text-white font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                            <span>+ Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LUXURY ANIMATED SEGMENTED PROGRESS MODAL (EXACT MATCH TO USER UI DESIGN) ── */}
      <AnimatePresence>
        {isExportingPDF && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/95 dark:bg-zinc-900/95 border border-amber-400/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 relative overflow-hidden"
            >
              {/* Header Title with Sparkles (Matching User Uploaded UI) */}
              <div className="flex items-center justify-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="font-sans font-bold tracking-tight">
                  {'Quotation downloading...'}
                </span>
              </div>

              {/* Segmented Glowing Pill Progress Bar (Matching User Design) */}
              <div className="flex items-center justify-center gap-1.5 px-2 py-1">
                {/* Left Pill Endcap */}
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-bold shadow-xs">
                  ←
                </div>

                {/* 4 Segmented Glowing Progress Bars */}
                <div className="flex-1 flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((segmentIndex) => {
                    const segmentProgress = Math.min(100, Math.max(0, (exportProgress - (segmentIndex - 1) * 25) * 4));
                    return (
                      <div
                        key={segmentIndex}
                        className="flex-1 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative border border-zinc-300/40 dark:border-zinc-700/40 shadow-inner"
                      >
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                          initial={{ width: '0%' }}
                          animate={{ width: `${segmentProgress}%` }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Right Pill Endcap */}
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-bold shadow-xs">
                  →
                </div>
              </div>

              {/* Live Percentage Number & App Text */}
              <div className="flex items-center justify-between px-2 text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                
                <span className="text-amber-500 font-extrabold text-sm">{exportProgress}%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PUBLIC PREVIEW LIQUID GLASS BOTTOM CLIENT ACTION BAR ── */}
      {isPublicPreview && (
        <div className="fixed bottom-4 left-0 right-0 z-[9000] px-4 pointer-events-none flex justify-center no-print">
          <div className="pointer-events-auto bg-white/75 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-full px-5 py-2.5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowBudgetModal(true)}
              disabled={accepted}
              className="px-4 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>{budgetRequested ? `Budget: ₹${budgetRequested.toLocaleString('en-IN')}` : 'Discuss Budget'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAcceptModal(true)}
              disabled={accepted}
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{accepted ? '✓ Proposal Accepted' : 'Accept Proposal'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CELEBRATION CONFETTI ANIMATION (INSTANT DUAL CANNON BLAST OVERLAY) ── */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden no-print">
            {/* Left Cannon Blast */}
            {Array.from({ length: 45 }).map((_, i) => {
              const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#F43F5E', '#EAB308'];
              const color = colors[i % colors.length];
              const isCircle = i % 3 === 0;
              const angle = (Math.random() * 50 + 20) * (Math.PI / 180);
              const speed = Math.random() * 60 + 50;
              const vx = Math.cos(angle) * speed;
              const vy = -Math.sin(angle) * speed;

              return (
                <motion.div
                  key={`confetti-l-${i}`}
                  initial={{
                    x: '0vw',
                    y: '100vh',
                    scale: Math.random() * 0.9 + 0.5,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: [`0vw`, `${vx * 0.9}vw`, `${vx * 1.3}vw`],
                    y: [`100vh`, `${100 + vy * 0.8}vh`, '110vh'],
                    rotate: Math.random() * 1080 - 540,
                    opacity: [1, 1, 1, 0]
                  }}
                  transition={{
                    duration: Math.random() * 1.5 + 2.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className={`absolute left-0 bottom-0 shadow-xs ${isCircle ? 'w-3.5 h-3.5 rounded-full' : 'w-3 h-4 rounded-xs'}`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
            {/* Right Cannon Blast */}
            {Array.from({ length: 45 }).map((_, i) => {
              const colors = ['#F59E0B', '#10B981', '#8B5CF6', '#3B82F6', '#F43F5E', '#EC4899', '#EAB308'];
              const color = colors[i % colors.length];
              const isCircle = i % 3 === 0;
              const angle = (Math.random() * 50 + 20) * (Math.PI / 180);
              const speed = Math.random() * 60 + 50;
              const vx = -Math.cos(angle) * speed;
              const vy = -Math.sin(angle) * speed;

              return (
                <motion.div
                  key={`confetti-r-${i}`}
                  initial={{
                    x: '100vw',
                    y: '100vh',
                    scale: Math.random() * 0.9 + 0.5,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: [`100vw`, `${100 + vx * 0.9}vw`, `${100 + vx * 1.3}vw`],
                    y: [`100vh`, `${100 + vy * 0.8}vh`, '110vh'],
                    rotate: Math.random() * 1080 - 540,
                    opacity: [1, 1, 1, 0]
                  }}
                  transition={{
                    duration: Math.random() * 1.5 + 2.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className={`absolute right-0 bottom-0 shadow-xs ${isCircle ? 'w-3.5 h-3.5 rounded-full' : 'w-3 h-4 rounded-xs'}`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── LIGHT THEME ACCEPT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showAcceptModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-emerald-200 space-y-4 text-center text-zinc-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">Accept This Quotation</h3>
                <p className="text-xs text-zinc-600 mt-1">
                  Please enter your details to confirm booking and block your dates.
                </p>
              </div>

              {acceptValidationError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                  {acceptValidationError}
                </div>
              )}

              <div className="space-y-2.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={clientAcceptName}
                    onChange={(e) => setClientAcceptName(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-bold text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number (+91...)"
                    value={clientAcceptPhone}
                    onChange={(e) => setClientAcceptPhone(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-bold text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Special Notes / Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any specific requests or date details..."
                    value={clientAcceptNotes}
                    onChange={(e) => setClientAcceptNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-medium text-xs outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAcceptSubmit}
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Confirm &amp; Accept</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LIGHT THEME SUCCESS CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm bg-[#FAF9F6] rounded-3xl p-6 shadow-2xl border border-emerald-300 space-y-4 text-center text-zinc-900"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="w-7 h-7 text-amber-500 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-zinc-900 leading-tight">
                  Thank You for Accepting Our Proposal! 🎉
                </h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Our team will connect with you shortly to finalize your dates and details.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 text-left text-xs space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">Accepted Details</span>
                <p className="font-bold text-zinc-900">Name: {clientAcceptName}</p>
                <p className="font-semibold text-zinc-700">Phone: {clientAcceptPhone}</p>
                {clientAcceptNotes && <p className="text-[11px] text-zinc-500 italic mt-1">"{clientAcceptNotes}"</p>}
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Close &amp; View Proposal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LIGHT THEME DISCUSS BUDGET MODAL ── */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-amber-200 space-y-4 text-center text-zinc-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">Tell Us Your Budget</h3>
                <p className="text-xs text-zinc-600 mt-1">We will see what we can do to accommodate your vision.</p>
              </div>

              <div className="space-y-2.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Target Budget Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 250000"
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-300 text-amber-900 font-extrabold text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Additional Notes / Custom Requirements (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what changes or adjustments you would prefer..."
                    value={budgetNotes}
                    onChange={(e) => setBudgetNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-medium text-xs outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBudgetSubmit}
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Submit Budget Request</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 z-[10000] px-5 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 no-print"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
