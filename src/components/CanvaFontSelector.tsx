'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, Type, Sparkles, X, Crown, Zap, ShieldCheck } from 'lucide-react';
import { 
  FontItem, 
  STATIC_CUSTOM_FONTS, 
  SYSTEM_LUXURY_SERIF_FONTS, 
  SYSTEM_SANS_SERIF_FONTS, 
  SYSTEM_DISPLAY_FONTS, 
  registerFontFace, 
  loadCustomFontsFromAPI 
} from '@/lib/font-loader';

// Flag PRO fonts
const PRO_FONT_NAMES = new Set([
  'Cormorant Garamond (High Fashion)',
  'Playfair Display (Classic Luxury)',
  'Bodoni Moda (Vogue Editorial)',
  'Cinzel (Royal Roman)',
  'Prata (Refined Minimalist)',
  'Italiana (Italian Couture)',
  'Bevola Demo Regular',
  'Tenor Sans (Fashion Minimal)',
  'DM Serif Display (Modern Editorial)'
]);

interface CanvaFontSelectorProps {
  label?: string;
  value: string; // The font family string or name e.g. "'Bevola Demo Regular', sans-serif"
  onChange: (selectedFontFamily: string, fontItem: FontItem) => void;
  isUserPro?: boolean; // User subscription status (default false)
  onUpgradeProClick?: () => void;
  className?: string;
  buttonClassName?: string;
}

export function CanvaFontSelector({
  label,
  value,
  onChange,
  isUserPro = false,
  onUpgradeProClick,
  className = '',
  buttonClassName = '',
}: CanvaFontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const [customFonts, setCustomFonts] = useState<FontItem[]>(STATIC_CUSTOM_FONTS);
  const [showProModal, setShowProModal] = useState(false);
  const [pendingProFont, setPendingProFont] = useState<FontItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load custom fonts from API on mount
  useEffect(() => {
    loadCustomFontsFromAPI().then((loaded) => {
      setCustomFonts(loaded);
    });
  }, []);

  // Register all loaded fonts so browser previews render smoothly
  useEffect(() => {
    customFonts.forEach(f => registerFontFace(f));
  }, [customFonts]);

  // Combine all font items with isPro flags
  const allFonts = useMemo(() => {
    const rawList = [
      ...customFonts,
      ...SYSTEM_LUXURY_SERIF_FONTS,
      ...SYSTEM_SANS_SERIF_FONTS,
      ...SYSTEM_DISPLAY_FONTS,
    ];

    return rawList.map(font => {
      const isProFont = font.category === 'Custom Fonts' || font.category === 'Luxury Serif' || PRO_FONT_NAMES.has(font.name);
      return {
        ...font,
        isPro: isProFont,
      };
    });
  }, [customFonts]);

  // Find currently selected font item
  const activeFontItem = useMemo(() => {
    if (!value) return allFonts[0];
    const cleanVal = value.replace(/['"]/g, '').trim().toLowerCase();
    
    const found = allFonts.find(f => {
      const cleanName = f.name.toLowerCase();
      const cleanFam = f.family.replace(/['"]/g, '').toLowerCase();
      return cleanVal === cleanName || cleanVal === cleanFam || cleanVal.startsWith(cleanName) || cleanVal.includes(cleanName);
    });

    const displayName = cleanVal.split(',')[0].trim();
    const formattedName = displayName ? displayName.charAt(0).toUpperCase() + displayName.slice(1) : 'Select Font';

    return found || { name: formattedName, family: value, category: 'Luxury Serif', isPro: false };
  }, [value, allFonts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtered fonts based on search & category tab
  const filteredFonts = useMemo(() => {
    return allFonts.filter(font => {
      if (selectedTab !== 'All' && font.category !== selectedTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return font.name.toLowerCase().includes(q) || font.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allFonts, searchQuery, selectedTab]);

  const handleSelectFont = (font: FontItem & { isPro?: boolean }) => {
    // If PRO font and user is not PRO, trigger subscription modal
    if (font.isPro && !isUserPro) {
      setPendingProFont(font);
      setShowProModal(true);
      return;
    }

    registerFontFace(font);
    onChange(font.family, font);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[9px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:border-amber-400 shadow-xs flex items-center justify-between text-left transition-all cursor-pointer group ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Type className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span 
            className="truncate text-xs font-bold text-zinc-900"
            style={{ fontFamily: activeFontItem.family }}
          >
            {activeFontItem.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {activeFontItem.isPro && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-xs">
              <Crown className="w-2.5 h-2.5 fill-black" /> PRO
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            {activeFontItem.category === 'Custom Fonts' ? 'Custom' : activeFontItem.category}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-700' : ''}`} />
        </div>
      </button>

      {/* Dropdown Modal / Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[380px] min-w-[280px] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Bar */}
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fonts by name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium text-zinc-800 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
              {['All', 'Custom Fonts', 'Luxury Serif', 'Minimal Sans-Serif', 'Display'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-all ${
                    selectedTab === tab 
                      ? 'bg-amber-900 text-amber-50 shadow-xs' 
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {tab === 'Custom Fonts' ? '✨ Custom' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Font List View */}
          <div className="overflow-y-auto flex-1 p-1.5 divide-y divide-zinc-50">
            {filteredFonts.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-xs font-medium">
                No matching fonts found
              </div>
            ) : (
              filteredFonts.map((font) => {
                const isSelected = activeFontItem.name.toLowerCase() === font.name.toLowerCase();

                return (
                  <button
                    key={`${font.category}-${font.name}`}
                    type="button"
                    onClick={() => handleSelectFont(font)}
                    onMouseEnter={() => registerFontFace(font)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200' 
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    {/* Live Font Name Preview */}
                    <div className="flex flex-col gap-0.5 overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-base truncate leading-snug tracking-wide"
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </span>
                        {font.isPro && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-black shadow-2xs shrink-0">
                            <Crown className="w-2.5 h-2.5 fill-black" /> PRO
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {font.category}
                      </span>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* PRO Subscription Upgrade Modal */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Crown className="w-6 h-6 fill-amber-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">Upgrade to Pro</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowProModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                The font <strong className="text-amber-400 font-bold">{pendingProFont?.name}</strong> is an exclusive Pro typography asset.
              </p>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" /> Unlock 50+ Exclusive Luxury Serif & Display Fonts
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" /> Custom Brand TTF/OTF Font Uploads
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" /> High-Res 300 DPI Multi-Page PDF Downloads
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" /> Remove WedGrapher Studio Watermarks
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProModal(false);
                  if (onUpgradeProClick) {
                    onUpgradeProClick();
                  } else {
                    window.open('/pricing', '_blank');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-600 text-black font-black text-xs shadow-lg hover:opacity-95 transition-all flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Upgrade to Pro Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
