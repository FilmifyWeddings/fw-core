'use client';

import { COLOR_THEMES, getThemeFromKey } from '@/lib/quotation-theme';

export interface PageSequenceItem {
  id: string;
  type: string;
  label: string;
  customId?: string;
}

export interface CustomPageItem {
  id: string;
  heading: string;
  subheading?: string;
  content: string;
  imageUrl?: string;
  layout?: 'text-only' | 'text-image' | 'image-focus' | 'split';
}

export interface PaymentTermStep {
  id: string;
  date: string;
  stepName: string;
  amount: number;
  status: 'PENDING' | 'PAID';
}

export const DEFAULT_PAGE_SEQUENCE: PageSequenceItem[] = [
  { id: 'cover-std', type: 'cover', label: 'Cover Page' },
  { id: 'about-std', type: 'aboutUs', label: 'About Us' },
  { id: 'shoot-std', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { id: 'funcs-std', type: 'functionsPage', label: 'Functions & Coverage' },
  { id: 'deliv-std', type: 'deliverablesPage', label: 'Deliverables' },
  { id: 'sva-std', type: 'specialValueAdditions', label: 'Special Value Additions' },
  { id: 'price-std', type: 'pricingPage', label: 'Pricing Details' },
  { id: 'pay-std', type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { id: 'addons-std', type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { id: 'terms-std', type: 'termsPage', label: 'Terms & Conditions' },
  { id: 'thankyou-std', type: 'thankYouPage', label: 'Thank You Page' }
];

export const DEFAULT_AIRY_PROPOSAL: any = {
  theme: 'cyprus-sand-dune',
  primaryFont: 'Cormorant Garamond',
  secondaryFont: 'Plus Jakarta Sans',
  designName: 'Minimalist Airy Proposal',
  cover: {
    coupleName: 'YASH & TWINKLE',
    eventType: 'WEDDING',
    eventDate: 'DECEMBER 2026',
    location: 'MUMBAI',
    brandName: 'FILMIFY WEDDINGS'
  },
  aboutUs: {
    kicker: 'CREATIVE FILMMAKERS',
    heading: 'ABOUT US',
    text: 'We capture stories that move hearts.'
  },
  pageSequence: DEFAULT_PAGE_SEQUENCE
};

import React, { useState, useEffect, useRef } from 'react';
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
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { cacheDocumentLocal, getCachedDocumentLocal, queueOfflineMutation, flushOfflineOutbox } from '@/lib/indexeddb-cache';
import { downloadServerChromiumPdf } from '@/lib/pdf-export-engine';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady } from '@/lib/font-loader';
import { toPng, toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';

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







// Canva-Style Visual COLOR PALETTE Dropdown Component
interface CanvaThemeSelectorProps {
  value: string;
  onChange: (themeName: string) => void;
}

function CanvaThemeSelector({ value, onChange }: CanvaThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const themeList = Array.isArray(COLOR_THEMES) ? COLOR_THEMES : Object.values(COLOR_THEMES);
  const activeTheme = themeList.find((t: any) => t.name === value || t.id === value) || themeList[0];

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
            {(Array.isArray(COLOR_THEMES) ? COLOR_THEMES : Object.values(COLOR_THEMES)).map((theme: any) => {
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
        className={`overflow-hidden relative transition-all duration-200 border-none ${shapeClass}`}
        style={{
          width: `${photoWidth}%`,
          height: `${photoHeight}px`,
        }}
      >
        <img
          src={photo}
          alt={altText}
          className="w-full h-full object-cover bg-transparent border-none"
          style={{ objectPosition: `50% ${photoFocalY}%` }}
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
        {availableOptions.map((item: any) => {
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


function paginateFunctionItems(items: any[]): any[][] {
  if (!Array.isArray(items) || items.length === 0) return [[]];

  const pages: any[][] = [];
  let currentPage: any[] = [];
  let currentHeight = 0;
  const maxUsableHeight = 820;

  items.forEach((item) => {
    let cardHeight = 84;

    if (item.location || item.venue) {
      cardHeight += 24;
    }

    const reqs = Array.isArray(item.requirements) ? item.requirements : [];
    if (reqs.length > 0) {
      const rows = Math.ceil(reqs.length / 2);
      cardHeight += 18 + (rows * 24);
    } else if (item.team) {
      cardHeight += 24;
    }

    if (item.notes) {
      const notesStr = String(item.notes);
      const linesCount = Math.max(1, Math.ceil(notesStr.length / 60));
      cardHeight += 12 + (linesCount * 22);
    }

    if (currentPage.length === 0 || (currentHeight + cardHeight <= maxUsableHeight)) {
      currentPage.push(item);
      currentHeight += cardHeight;
    } else {
      pages.push(currentPage);
      currentPage = [item];
      currentHeight = cardHeight;
    }
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function normalizeQuotationData(loaded: any) {
  const d = DEFAULT_AIRY_PROPOSAL || {};
  if (!loaded || typeof loaded !== 'object') return d;

  return {
    ...d,
    ...loaded,
    cover: { ...(d?.cover || {}), ...(loaded.cover || {}) },
    aboutUs: { ...(d?.aboutUs || {}), ...(loaded.aboutUs || {}) },
    shootDetails: { ...(d?.shootDetails || {}), ...(loaded.shootDetails || {}) },
    functionsPage: {
      ...(d?.functionsPage || {}),
      ...(loaded.functionsPage || {}),
      items: Array.isArray(loaded.functionsPage?.items) ? loaded.functionsPage.items : (d?.functionsPage?.items || []),
    },
    deliverablesPage: {
      ...(d?.deliverablesPage || {}),
      ...(loaded.deliverablesPage || {}),
      selectedItems: Array.isArray(loaded.deliverablesPage?.selectedItems)
        ? loaded.deliverablesPage.selectedItems
        : (d?.deliverablesPage?.selectedItems || []),
      availableOptions: Array.isArray(loaded.deliverablesPage?.availableOptions)
        ? loaded.deliverablesPage.availableOptions
        : (d?.deliverablesPage?.availableOptions || []),
    },
    specialValueAdditions: {
      ...(d?.specialValueAdditions || {}),
      ...(loaded.specialValueAdditions || {}),
      selectedItems: Array.isArray(loaded.specialValueAdditions?.selectedItems)
        ? loaded.specialValueAdditions.selectedItems
        : (d?.specialValueAdditions?.selectedItems || []),
      availableOptions: Array.isArray(loaded.specialValueAdditions?.availableOptions)
        ? loaded.specialValueAdditions.availableOptions
        : (d?.specialValueAdditions?.availableOptions || []),
      note: loaded.specialValueAdditions?.note ?? d?.specialValueAdditions?.note ?? '',
      photo: loaded.specialValueAdditions?.photo ?? d?.specialValueAdditions?.photo ?? '',
      photoHeight: loaded.specialValueAdditions?.photoHeight ?? d?.specialValueAdditions?.photoHeight ?? 360,
      photoWidth: loaded.specialValueAdditions?.photoWidth ?? d?.specialValueAdditions?.photoWidth ?? 75,
      photoFocalY: loaded.specialValueAdditions?.photoFocalY ?? d?.specialValueAdditions?.photoFocalY ?? 50,
      bgOpacity: loaded.specialValueAdditions?.bgOpacity ?? d?.specialValueAdditions?.bgOpacity ?? 40,
      frameShape: loaded.specialValueAdditions?.frameShape ?? d?.specialValueAdditions?.frameShape ?? 'rounded',
      imagePosition: loaded.specialValueAdditions?.imagePosition ?? d?.specialValueAdditions?.imagePosition ?? 'bottom',
    },
    pricingPage: {
      ...(d?.pricingPage || {}),
      ...(loaded.pricingPage || {}),
      basePrice: typeof loaded.pricingPage?.basePrice === 'number' ? loaded.pricingPage.basePrice : (d?.pricingPage?.basePrice ?? 0),
      discountAmount: typeof loaded.pricingPage?.discountAmount === 'number' ? loaded.pricingPage.discountAmount : (d?.pricingPage?.discountAmount ?? 0),
      accommodationCharges: typeof loaded.pricingPage?.accommodationCharges === 'number' ? loaded.pricingPage.accommodationCharges : (d?.pricingPage?.accommodationCharges ?? 0),
      travelCharges: typeof loaded.pricingPage?.travelCharges === 'number' ? loaded.pricingPage.travelCharges : (d?.pricingPage?.travelCharges ?? 0),
      additionalCharges: typeof loaded.pricingPage?.additionalCharges === 'number' ? loaded.pricingPage.additionalCharges : (d?.pricingPage?.additionalCharges ?? 0),
      gstPct: typeof loaded.pricingPage?.gstPct === 'number' ? loaded.pricingPage.gstPct : (d?.pricingPage?.gstPct ?? 18),
      note: loaded.pricingPage?.note ?? d?.pricingPage?.note ?? '',
      photo: loaded.pricingPage?.photo ?? d?.pricingPage?.photo ?? '',
      photoHeight: loaded.pricingPage?.photoHeight ?? d?.pricingPage?.photoHeight ?? 360,
      photoWidth: loaded.pricingPage?.photoWidth ?? d?.pricingPage?.photoWidth ?? 75,
      photoFocalY: loaded.pricingPage?.photoFocalY ?? d?.pricingPage?.photoFocalY ?? 50,
      bgOpacity: loaded.pricingPage?.bgOpacity ?? d?.pricingPage?.bgOpacity ?? 40,
      frameShape: loaded.pricingPage?.frameShape ?? d?.pricingPage?.frameShape ?? 'rounded',
      imagePosition: loaded.pricingPage?.imagePosition ?? d?.pricingPage?.imagePosition ?? 'bottom',
    },
    paymentTermsPage: {
      ...(d?.paymentTermsPage || {}),
      ...(loaded.paymentTermsPage || {}),
      steps: Array.isArray(loaded.paymentTermsPage?.steps)
        ? loaded.paymentTermsPage.steps
        : (d?.paymentTermsPage?.steps || []),
      note: loaded.paymentTermsPage?.note ?? d?.paymentTermsPage?.note ?? '',
      photo: loaded.paymentTermsPage?.photo ?? d?.paymentTermsPage?.photo ?? '',
      photoHeight: loaded.paymentTermsPage?.photoHeight ?? d?.paymentTermsPage?.photoHeight ?? 360,
      photoWidth: loaded.paymentTermsPage?.photoWidth ?? d?.paymentTermsPage?.photoWidth ?? 75,
      photoFocalY: loaded.paymentTermsPage?.photoFocalY ?? d?.paymentTermsPage?.photoFocalY ?? 50,
      bgOpacity: loaded.paymentTermsPage?.bgOpacity ?? d?.paymentTermsPage?.bgOpacity ?? 40,
      frameShape: loaded.paymentTermsPage?.frameShape ?? d?.paymentTermsPage?.frameShape ?? 'rounded',
      imagePosition: loaded.paymentTermsPage?.imagePosition ?? d?.paymentTermsPage?.imagePosition ?? 'bottom',
    },
    addOnsPage: {
      ...(d?.addOnsPage || {}),
      ...(loaded.addOnsPage || {}),
      items: Array.isArray(loaded.addOnsPage?.items)
        ? loaded.addOnsPage.items
        : (d?.addOnsPage?.items || []),
      note: loaded.addOnsPage?.note ?? d?.addOnsPage?.note ?? '',
      photo: loaded.addOnsPage?.photo ?? d?.addOnsPage?.photo ?? '',
      photoHeight: loaded.addOnsPage?.photoHeight ?? d?.addOnsPage?.photoHeight ?? 360,
      photoWidth: loaded.addOnsPage?.photoWidth ?? d?.addOnsPage?.photoWidth ?? 75,
      photoFocalY: loaded.addOnsPage?.photoFocalY ?? d?.addOnsPage?.photoFocalY ?? 50,
      bgOpacity: loaded.addOnsPage?.bgOpacity ?? d?.addOnsPage?.bgOpacity ?? 40,
      frameShape: loaded.addOnsPage?.frameShape ?? d?.addOnsPage?.frameShape ?? 'rounded',
      imagePosition: loaded.addOnsPage?.imagePosition ?? d?.addOnsPage?.imagePosition ?? 'bottom',
    },

    // Backwards Compatibility Aliases
    deliverables: loaded.deliverables || loaded.deliverablesPage || { items: [], availableOptions: [], imagePosition: 'bottom' },
    valueAdditions: loaded.valueAdditions || loaded.specialValueAdditions || { items: [] },
    pricing: loaded.pricing || loaded.pricingPage || { basePrice: 0, discount: 0, accommodation: 0, travel: 0, additional: 0, gstPercent: 18 },
    paymentTerms: loaded.paymentTerms || loaded.paymentTermsPage || { steps: [], fixedAmount: 0, receivedAmount: 0, pendingAmount: 0 },
    addOns: loaded.addOns || loaded.addOnsPage || { subText: '', items: [] },
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
    .filter((s: any) => s && (s.status === 'Completed' || s.status === 'PAID'))
    .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
  const pendingAmount = Math.max(0, fixedAmount - receivedAmount);
  return { fixedAmount, receivedAmount, pendingAmount };
}



export default function QuotationDocumentCanvas({ documentData }: { documentData: any }) {
  const loadedData = documentData || {};
  const data = normalizeQuotationData(loadedData);
  const activeTheme = getThemeFromKey(data.theme);
  const pageBgColor = activeTheme.background;
  const textColor = activeTheme.text;
  const kickerColor = activeTheme.kicker || activeTheme.text;
  const isDarkTheme = activeTheme.isDark || false;

  const borderColor = activeTheme.borderColor || (isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)');
  const boxBgColor = activeTheme.boxBgColor || (isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');

  const pricingCalculated = calculatePricingTotals(data.pricingPage);
  const paymentTermsCalculated = calculatePaymentTermsSummary(
    data.paymentTermsPage?.steps || [],
    pricingCalculated.netTotal || 0
  );

  const pageSequence: PageSequenceItem[] = data.pageSequence || DEFAULT_PAGE_SEQUENCE;
  const customPages: Record<string, CustomPageItem> = data.customPages || {};

  return (
    <div id="quotation-full-canvas" style={{ width: '794px', minWidth: '794px', maxWidth: '794px', background: '#e5e7eb', margin: '0 auto' }}>
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

                  <div className={`space-y-3 ${data.cover.frameShape === 'full-width' || (data.cover.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
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

                  <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
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

                  <div className="text-center space-y-3 my-3">
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

                  <div className="space-y-3 max-w-lg mx-auto my-3 flex flex-col items-center">
                    <p className="text-base font-bold tracking-wide flex items-center justify-center gap-2 mb-1" style={{ color: textColor }}>
                      <Camera className="w-4 h-4" style={{ color: kickerColor }} />
                      <span>{data.shootDetails.daysText || '1 Day Shoot'}</span>
                    </p>
                    <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                      {(data.shootDetails.crewText || 'Candid Photography\nCinematography\nPortable Changing Room')
                        .split('\n').filter(Boolean).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 text-sm font-medium tracking-wide leading-tight" style={{ color: textColor }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: kickerColor }} />
                            <span>{item.trim()}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="pt-2 space-y-3 max-w-lg mx-auto my-3 flex flex-col items-center">
                    <h3 className="text-2xl tracking-wide font-normal text-center whitespace-nowrap mb-1" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.shootDetails.deliverablesHeading || 'Deliverables'}
                    </h3>
                    <div className="space-y-2 flex flex-col items-start max-w-md mx-auto">
                      {(data.shootDetails.deliverablesText || 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel')
                        .split('\n').filter(Boolean).map((item: any, idx: number) => (
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
                        const funcChunks = paginateFunctionItems(data.functionsPage?.items || []);
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
                                {/* TOP IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && data.functionsPage?.imagePosition === 'top' && (
                                  <SectionImageRenderer
                                    photo={data.functionsPage.photo}
                                    frameShape={data.functionsPage.frameShape}
                                    photoHeight={data.functionsPage.photoHeight}
                                    photoWidth={data.functionsPage.photoWidth}
                                    photoFocalY={data.functionsPage.photoFocalY}
                                    altText="Functions Banner"
                                  />
                                )}

                                <div className="text-center space-y-2 my-2">
                                  <span className="text-xs tracking-[0.25em] uppercase font-bold block whitespace-nowrap" style={{ color: kickerColor }}>
                                    {data.functionsPage?.kicker || 'EVENT SCHEDULE'} {funcChunks.length > 1 ? `(${chunkIdx + 1}/${funcChunks.length})` : ''}
                                  </span>
                                  <h2 className="text-3xl tracking-wide font-normal whitespace-nowrap" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                    {data.functionsPage?.heading || 'Functions & Coverage'}
                                  </h2>
                                </div>

                                {/* CENTER IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && data.functionsPage?.imagePosition === 'center' && (
                                  <SectionImageRenderer
                                    photo={data.functionsPage.photo}
                                    frameShape={data.functionsPage.frameShape}
                                    photoHeight={data.functionsPage.photoHeight}
                                    photoWidth={data.functionsPage.photoWidth}
                                    photoFocalY={data.functionsPage.photoFocalY}
                                    altText="Functions Banner"
                                  />
                                )}

                                <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                                  {funcChunk.map((func: any, index: number) => {
                                    const globalIdx = chunkIdx * 3 + index;
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
                                            {func.name || `Function ${globalIdx + 1}`}
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
                                          <p className="text-xs italic leading-relaxed opacity-85 pt-1 border-t" style={{ color: textColor, borderColor: borderColor || 'rgba(0,0,0,0.08)' }}>
                                            "{func.notes}"
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* BOTTOM FLUSH IMAGE POSITION - Only on 1st Page */}
                              {chunkIdx === 0 && data.functionsPage?.photo && data.functionsPage?.frameShape !== 'background' && (data.functionsPage?.imagePosition === 'bottom' || !data.functionsPage?.imagePosition) && (
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
                        const delivChunks = chunkArray(data.deliverablesPage?.selectedItems, 5);
                        return delivChunks.map((delivChunk, chunkIdx) => (
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
                            {chunkIdx === 0 && data.deliverablesPage?.photo && data.deliverablesPage?.frameShape === 'background' && (
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
                              
                              <div className={`flex flex-col items-center justify-center w-full ${data.deliverablesPage?.frameShape === 'full-width' || (data.deliverablesPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                                {/* TOP IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && data.deliverablesPage?.imagePosition === 'top' && (
                                  <SectionImageRenderer
                                    photo={data.deliverablesPage.photo}
                                    frameShape={data.deliverablesPage.frameShape}
                                    photoHeight={data.deliverablesPage.photoHeight}
                                    photoWidth={data.deliverablesPage.photoWidth}
                                    photoFocalY={data.deliverablesPage.photoFocalY}
                                    altText="Deliverables Photo"
                                  />
                                )}

                                <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                                  {data.deliverablesPage?.kicker || 'WHAT WE DELIVER'} {delivChunks.length > 1 ? `(${chunkIdx + 1}/${delivChunks.length})` : ''}
                                </span>
                                <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                                  {data.deliverablesPage?.heading || 'DELIVERABLES'}
                                </h2>

                                {/* CENTER IMAGE POSITION - Only on 1st Page */}
                                {chunkIdx === 0 && data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && data.deliverablesPage?.imagePosition === 'center' && (
                                  <SectionImageRenderer
                                    photo={data.deliverablesPage.photo}
                                    frameShape={data.deliverablesPage.frameShape}
                                    photoHeight={data.deliverablesPage.photoHeight}
                                    photoWidth={data.deliverablesPage.photoWidth}
                                    photoFocalY={data.deliverablesPage.photoFocalY}
                                    altText="Deliverables Photo"
                                  />
                                )}

                                <div className="w-full max-w-xl mx-auto space-y-3 text-left my-3">
                                  {delivChunk.map((item: any, idx: number) => (
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

                              {/* BOTTOM FLUSH IMAGE POSITION - Only on 1st Page */}
                              {chunkIdx === 0 && data.deliverablesPage?.photo && data.deliverablesPage?.frameShape !== 'background' && (data.deliverablesPage?.imagePosition === 'bottom' || !data.deliverablesPage?.imagePosition) && (
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
                              {isLastPage && chunkIdx === delivChunks.length - 1 && (
                                <div className="w-full text-center py-4 text-xs text-gray-400 font-medium tracking-wide border-t border-gray-100 mt-auto select-none">
                                  Created by StudioCore.in
                                </div>
                              )}
                            </div>
                          </section>
                        ));
                      })()}

                      {pageItem.type === 'specialValueAdditions' && (
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
              {data.specialValueAdditions?.photo && data.specialValueAdditions?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.specialValueAdditions.photo}
                  frameShape="background"
                  photoHeight={data.specialValueAdditions.photoHeight}
                  photoWidth={data.specialValueAdditions.photoWidth}
                  photoFocalY={data.specialValueAdditions.photoFocalY}
                  bgOpacity={data.specialValueAdditions.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Special Value Additions Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.specialValueAdditions?.frameShape === 'full-width' || (data.specialValueAdditions?.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.specialValueAdditions?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.specialValueAdditions?.frameShape === 'full-width' || (data.specialValueAdditions?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.specialValueAdditions?.photo && data.specialValueAdditions?.frameShape !== 'background' && data.specialValueAdditions?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.specialValueAdditions.photo}
                      frameShape={data.specialValueAdditions.frameShape}
                      photoHeight={data.specialValueAdditions.photoHeight}
                      photoWidth={data.specialValueAdditions.photoWidth}
                      photoFocalY={data.specialValueAdditions.photoFocalY}
                      altText="Special Value Additions Photo"
                    />
                  )}

                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.specialValueAdditions?.kicker || 'COMPLIMENTARY'}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.specialValueAdditions?.heading || 'SPECIAL VALUE ADDITIONS'}
                  </h2>

                  {/* CENTER IMAGE POSITION */}
                  {data.specialValueAdditions?.photo && data.specialValueAdditions?.frameShape !== 'background' && data.specialValueAdditions?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.specialValueAdditions.photo}
                      frameShape={data.specialValueAdditions.frameShape}
                      photoHeight={data.specialValueAdditions.photoHeight}
                      photoWidth={data.specialValueAdditions.photoWidth}
                      photoFocalY={data.specialValueAdditions.photoFocalY}
                      altText="Special Value Additions Photo"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-3 text-left my-3">
                    {(data.specialValueAdditions?.selectedItems || []).map((item: any, idx: number) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all"
                        style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                            <Gift className="w-4 h-4" style={{ color: kickerColor }} />
                          </div>
                          <span className="text-xs font-bold leading-relaxed">{item}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: textColor }}>
                          FREE
                        </span>
                      </div>
                    ))}

                    {data.specialValueAdditions?.note && (
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: textColor, borderColor }}>
                        "{data.specialValueAdditions.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.specialValueAdditions?.photo && data.specialValueAdditions?.frameShape !== 'background' && (data.specialValueAdditions?.imagePosition === 'bottom' || !data.specialValueAdditions?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.specialValueAdditions.photo}
                    frameShape={data.specialValueAdditions.frameShape}
                    photoHeight={data.specialValueAdditions.photoHeight}
                    photoWidth={data.specialValueAdditions.photoWidth}
                    photoFocalY={data.specialValueAdditions.photoFocalY}
                    isBottomFlush={true}
                    altText="Special Value Additions Photo"
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
              {data.pricingPage?.photo && data.pricingPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.pricingPage.photo}
                  frameShape="background"
                  photoHeight={data.pricingPage.photoHeight}
                  photoWidth={data.pricingPage.photoWidth}
                  photoFocalY={data.pricingPage.photoFocalY}
                  bgOpacity={data.pricingPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Pricing Details Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.pricingPage?.frameShape === 'full-width' || (data.pricingPage?.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.pricingPage?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.pricingPage?.frameShape === 'full-width' || (data.pricingPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.pricingPage?.photo && data.pricingPage?.frameShape !== 'background' && data.pricingPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.pricingPage.photo}
                      frameShape={data.pricingPage.frameShape}
                      photoHeight={data.pricingPage.photoHeight}
                      photoWidth={data.pricingPage.photoWidth}
                      photoFocalY={data.pricingPage.photoFocalY}
                      altText="Pricing Details Photo"
                    />
                  )}

                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.pricingPage?.kicker || 'INVESTMENT & BREAKDOWN'}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.pricingPage?.heading || 'PRICING DETAILS'}
                  </h2>

                  {/* CENTER IMAGE POSITION */}
                  {data.pricingPage?.photo && data.pricingPage?.frameShape !== 'background' && data.pricingPage?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.pricingPage.photo}
                      frameShape={data.pricingPage.frameShape}
                      photoHeight={data.pricingPage.photoHeight}
                      photoWidth={data.pricingPage.photoWidth}
                      photoFocalY={data.pricingPage.photoFocalY}
                      altText="Pricing Details Photo"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-4 my-3">
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

                    {data.pricingPage?.note && (
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: textColor, borderColor }}>
                        "{data.pricingPage.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.pricingPage?.photo && data.pricingPage?.frameShape !== 'background' && (data.pricingPage?.imagePosition === 'bottom' || !data.pricingPage?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.pricingPage.photo}
                    frameShape={data.pricingPage.frameShape}
                    photoHeight={data.pricingPage.photoHeight}
                    photoWidth={data.pricingPage.photoWidth}
                    photoFocalY={data.pricingPage.photoFocalY}
                    isBottomFlush={true}
                    altText="Pricing Details Photo"
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
              {data.paymentTermsPage?.photo && data.paymentTermsPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.paymentTermsPage.photo}
                  frameShape="background"
                  photoHeight={data.paymentTermsPage.photoHeight}
                  photoWidth={data.paymentTermsPage.photoWidth}
                  photoFocalY={data.paymentTermsPage.photoFocalY}
                  bgOpacity={data.paymentTermsPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Payment Terms Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.paymentTermsPage?.frameShape === 'full-width' || (data.paymentTermsPage?.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.paymentTermsPage?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.paymentTermsPage?.frameShape === 'full-width' || (data.paymentTermsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.paymentTermsPage?.photo && data.paymentTermsPage?.frameShape !== 'background' && data.paymentTermsPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.paymentTermsPage.photo}
                      frameShape={data.paymentTermsPage.frameShape}
                      photoHeight={data.paymentTermsPage.photoHeight}
                      photoWidth={data.paymentTermsPage.photoWidth}
                      photoFocalY={data.paymentTermsPage.photoFocalY}
                      altText="Payment Terms Photo"
                    />
                  )}

                  <span className="text-xs tracking-[0.25em] font-bold uppercase block whitespace-nowrap mb-2" style={{ color: kickerColor }}>
                    {data.paymentTermsPage?.kicker || 'SCHEDULE'}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal whitespace-nowrap mb-6" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.paymentTermsPage?.heading || 'PAYMENT TERMS & SCHEDULE'}
                  </h2>

                  {/* CENTER IMAGE POSITION */}
                  {data.paymentTermsPage?.photo && data.paymentTermsPage?.frameShape !== 'background' && data.paymentTermsPage?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.paymentTermsPage.photo}
                      frameShape={data.paymentTermsPage.frameShape}
                      photoHeight={data.paymentTermsPage.photoHeight}
                      photoWidth={data.paymentTermsPage.photoWidth}
                      photoFocalY={data.paymentTermsPage.photoFocalY}
                      altText="Payment Terms Photo"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-4 my-3">
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
                                    backgroundColor: (step.status as string) === 'Completed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
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
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: textColor, borderColor }}>
                        "{data.paymentTermsPage.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.paymentTermsPage?.photo && data.paymentTermsPage?.frameShape !== 'background' && (data.paymentTermsPage?.imagePosition === 'bottom' || !data.paymentTermsPage?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.paymentTermsPage.photo}
                    frameShape={data.paymentTermsPage.frameShape}
                    photoHeight={data.paymentTermsPage.photoHeight}
                    photoWidth={data.paymentTermsPage.photoWidth}
                    photoFocalY={data.paymentTermsPage.photoFocalY}
                    isBottomFlush={true}
                    altText="Payment Terms Photo"
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
              {data.addOnsPage?.photo && data.addOnsPage?.frameShape === 'background' && (
                <SectionImageRenderer
                  photo={data.addOnsPage.photo}
                  frameShape="background"
                  photoHeight={data.addOnsPage.photoHeight}
                  photoWidth={data.addOnsPage.photoWidth}
                  photoFocalY={data.addOnsPage.photoFocalY}
                  bgOpacity={data.addOnsPage.bgOpacity}
                  pageBgColor={pageBgColor}
                  altText="Add-Ons Background"
                />
              )}

              <div className={`relative z-10 mx-auto text-center flex flex-col h-full w-full py-14 ${
                data.addOnsPage?.frameShape === 'full-width' || (data.addOnsPage?.imagePosition as string) === 'full' 
                  ? 'px-0' 
                  : 'px-12'
              } ${!data.addOnsPage?.photo ? 'justify-center items-center' : 'justify-between'}`}>
                
                <div className={`flex flex-col items-center justify-center w-full ${data.addOnsPage?.frameShape === 'full-width' || (data.addOnsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
                  {/* TOP IMAGE POSITION */}
                  {data.addOnsPage?.photo && data.addOnsPage?.frameShape !== 'background' && data.addOnsPage?.imagePosition === 'top' && (
                    <SectionImageRenderer
                      photo={data.addOnsPage.photo}
                      frameShape={data.addOnsPage.frameShape}
                      photoHeight={data.addOnsPage.photoHeight}
                      photoWidth={data.addOnsPage.photoWidth}
                      photoFocalY={data.addOnsPage.photoFocalY}
                      altText="Add-Ons Photo"
                    />
                  )}

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

                  {/* CENTER IMAGE POSITION */}
                  {data.addOnsPage?.photo && data.addOnsPage?.frameShape !== 'background' && data.addOnsPage?.imagePosition === 'center' && (
                    <SectionImageRenderer
                      photo={data.addOnsPage.photo}
                      frameShape={data.addOnsPage.frameShape}
                      photoHeight={data.addOnsPage.photoHeight}
                      photoWidth={data.addOnsPage.photoWidth}
                      photoFocalY={data.addOnsPage.photoFocalY}
                      altText="Add-Ons Photo"
                    />
                  )}

                  <div className="w-full max-w-xl mx-auto space-y-4 my-3">
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
                      <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: textColor, borderColor }}>
                        "{data.addOnsPage.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTTOM FLUSH IMAGE POSITION */}
                {data.addOnsPage?.photo && data.addOnsPage?.frameShape !== 'background' && (data.addOnsPage?.imagePosition === 'bottom' || !data.addOnsPage?.imagePosition) && (
                  <SectionImageRenderer
                    photo={data.addOnsPage.photo}
                    frameShape={data.addOnsPage.frameShape}
                    photoHeight={data.addOnsPage.photoHeight}
                    photoWidth={data.addOnsPage.photoWidth}
                    photoFocalY={data.addOnsPage.photoFocalY}
                    isBottomFlush={true}
                    altText="Add-Ons Photo"
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

                      {pageItem.type === 'termsPage' && (() => {
                        const termsRaw = data.termsPage?.text || DEFAULT_AIRY_PROPOSAL.termsPage.text || '';
                        const termLines = termsRaw.split('\n').filter(Boolean);
                        const termsChunks = chunkArray(termLines, 5);
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
                              
                              <div className={`flex flex-col items-center justify-center w-full ${data.termsPage?.frameShape === 'full-width' || (data.termsPage?.imagePosition as string) === 'full' ? 'px-12' : ''}`}>
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

                                <div className="w-full max-w-xl mx-auto space-y-4 my-3 text-left">
                                  <div 
                                    className="p-6 rounded-2xl border shadow-xs leading-relaxed space-y-3"
                                    style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}
                                  >
                                    <p className="text-xs whitespace-pre-line leading-relaxed opacity-90 font-medium">
                                      {termsChunk.join('\n')}
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
  );
}
