'use client';

import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Sparkles, LayoutTemplate, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import QuotationDocumentCanvas from '@/components/QuotationDocumentCanvas';
import { preloadActiveFont } from '@/lib/font-loader';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

export interface StudioTemplateItem {
  id: string;
  title: string;
  category?: string;
  is_default?: boolean;
  is_system_template?: boolean;
  content_json?: any;
}

// Global in-memory cache for instant 0ms access across modals and pages
const memoryTemplatesCache: Record<string, StudioTemplateItem[]> = {};

/**
 * Synchronously retrieves cached templates from Memory, localStorage, or sessionStorage.
 * Guaranteed 0ms response time with strictly only the studio's own templates and the System Template.
 */
export function getSynchronousCachedTemplates(workspaceId?: string): StudioTemplateItem[] {
  const wsKey = workspaceId || 'default';
  
  // 1. Direct memory cache (fastest, 0ms)
  if (memoryTemplatesCache[wsKey] && memoryTemplatesCache[wsKey].length > 0) {
    return memoryTemplatesCache[wsKey];
  }

  // 2. LocalStorage & SessionStorage cache (strictly scoped to active studio)
  if (typeof window !== 'undefined') {
    try {
      const activeUid = workspaceId || localStorage.getItem('sc_active_workspace_id') || localStorage.getItem('wg_last_active_user_id') || '';
      const keysToCheck = [
        activeUid ? `studio_templates_cache_${activeUid}` : '',
        'studio_templates_cache'
      ].filter(Boolean);

      for (const key of keysToCheck) {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strictly filter out lead quotations, cross-studio leaks, and demo templates
            const clean = parsed.filter((t: any) => {
              if (!t || !t.id) return false;
              const idStr = String(t.id);
              if (idStr.startsWith('FW-Q-') || idStr.startsWith('FW-L-') || idStr === 'FW-AIRY-DEFAULT') return false;
              // If template belongs to another studio, exclude it unless it is the authoritative system template
              if (t.workspace_id && activeUid && t.workspace_id !== activeUid && !t.is_system_template && t.id !== 'FW-USER-SJ05RN') {
                return false;
              }
              const tName = String(t.title || '').trim().toLowerCase();
              const dName = String(t.content_json?.designName || '').trim().toLowerCase();
              if (tName === 'minimalist airy proposal' || dName === 'minimalist airy proposal') return false;
              if (tName === 'wedding - design 1' || dName === 'wedding - design 1') return false;
              return true;
            });
            if (clean.length > 0) {
              memoryTemplatesCache[wsKey] = clean;
              return clean;
            }
          }
        }
      }
    } catch (_) {}
  }

  // Guaranteed instant 0ms fallback: Always provide the System Template so selector is never empty
  const defaultFallback: StudioTemplateItem = {
    id: 'FW-USER-SJ05RN',
    title: 'Premium',
    category: 'Wedding',
    is_default: true,
    is_system_template: true,
    content_json: DEFAULT_AIRY_PROPOSAL
  };
  memoryTemplatesCache[wsKey] = [defaultFallback];
  return [defaultFallback];
}

/**
 * Saves templates into Memory, localStorage, and sessionStorage simultaneously.
 */
export function persistTemplatesToCache(templates: StudioTemplateItem[], workspaceId?: string) {
  if (!Array.isArray(templates) || templates.length === 0) return;
  const wsKey = workspaceId || 'default';
  memoryTemplatesCache[wsKey] = templates;

  if (typeof window !== 'undefined') {
    try {
      const activeUid = workspaceId || localStorage.getItem('wg_last_active_user_id') || localStorage.getItem('sc_active_workspace_id') || '';
      const localKey = activeUid ? `studio_templates_cache_${activeUid}` : 'studio_templates_cache';
      const serialized = JSON.stringify(templates);
      localStorage.setItem(localKey, serialized);
      sessionStorage.setItem(localKey, serialized);
      // Guarantee global fallback key is also synced (0ms cross-workspace availability)
      localStorage.setItem('studio_templates_cache', serialized);
      sessionStorage.setItem('studio_templates_cache', serialized);
    } catch (_) {}
  }
}

/**
 * Asynchronously prefetches quotation templates in the background.
 */
export async function prefetchStudioTemplates(workspaceId?: string): Promise<StudioTemplateItem[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = workspaceId || session?.user?.id || '';
    const token = session?.access_token || '';

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (session?.user?.email) headers['x-user-email'] = session.user.email;

    const res = await fetch(`/api/quotation-templates?workspace_id=${currentUserId}`, { headers });
    if (!res.ok) return getSynchronousCachedTemplates(currentUserId);

    const json = await res.json().catch(() => ({}));
    if (json.success && Array.isArray(json.templates) && json.templates.length > 0) {
      persistTemplatesToCache(json.templates, currentUserId);
      return json.templates;
    }
  } catch (err) {
    console.warn('[QuotationTemplateSelector] Prefetch warning:', err);
  }
  return getSynchronousCachedTemplates(workspaceId);
}

/**
 * Lightweight Error Boundary for Canvas Thumbnail Preview
 */
interface ThumbnailErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ThumbnailErrorBoundaryState {
  hasError: boolean;
}

class ThumbnailErrorBoundary extends Component<ThumbnailErrorBoundaryProps, ThumbnailErrorBoundaryState> {
  constructor(props: ThumbnailErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ThumbnailErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ThumbnailErrorBoundary] Caught thumbnail error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 1:1 FIRST PAGE DESIGN THUMBNAIL (MEMOIZED FOR 0MS RESPONSIVENESS)
 * Renders the exact first page design (canvas) of the quotation template,
 * identical to the Cards in the Quotations Gallery (/workspace/quotations).
 */
export const TemplateThumbnail = React.memo(function TemplateThumbnail({
  contentJson,
  title,
  size = 'md',
  className = ''
}: {
  contentJson?: any;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [, setFontsReady] = useState(false);

  // Normalize full document data for QuotationDocumentCanvas
  const fullDocData = useMemo(() => {
    let doc = contentJson;
    if (typeof doc === 'string') {
      try {
        doc = JSON.parse(doc);
      } catch (_) {}
    }
    const isSys = title === 'Premium' || !doc || doc.id === 'FW-USER-SJ05RN' || doc.designName === 'Premium';
    const fallbackPhoto = isSys ? '/images/system-premium-cover.webp' : '';

    if (doc && typeof doc === 'object' && (doc.cover || doc.theme || doc.look)) {
      const coverPhoto = doc.cover?.photoUrl || doc.cover?.photo || fallbackPhoto;
      let coupleName = doc.cover?.coupleName;
      if (!coupleName || coupleName === 'YASH & TWINKLE' || coupleName === 'Valued Client') {
        coupleName = isSys ? 'Groom\n& \nBride' : (title || 'Rahul & Neha');
      }

      return {
        ...doc,
        designName: (doc.designName && doc.designName !== 'Wedding - Design 1') ? doc.designName : (title || 'Premium'),
        cover: {
          ...doc.cover,
          photoUrl: coverPhoto,
          coupleName,
          frameShape: doc.cover?.frameShape || 'arch',
          bgOpacity: typeof doc.cover?.bgOpacity === 'number' ? doc.cover.bgOpacity : 19
        }
      };
    }
    return {
      look: 'cyprus-sand-dune',
      theme: 'cyprus-sand-dune',
      primaryFont: 'Cormorant Garamond',
      secondaryFont: 'Plus Jakarta Sans',
      designName: title || 'Premium',
      cover: {
        coupleName: 'Groom\n& \nBride',
        eventType: 'Wedding',
        weddingDate: 'December 14, 2026',
        locationName: 'MUMBAI',
        brandName: 'Filmify Weddings',
        frameShape: 'arch',
        bgOpacity: 19,
        photoUrl: '/images/system-premium-cover.webp'
      }
    };
  }, [contentJson, title]);

  // Preload custom fonts in background
  useEffect(() => {
    let active = true;
    const fontsToLoad = [fullDocData.primaryFont, fullDocData.secondaryFont].filter(Boolean);
    if (fontsToLoad.length > 0) {
      Promise.all(fontsToLoad.map(f => preloadActiveFont(f)))
        .then(() => { if (active) setFontsReady(true); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [fullDocData.primaryFont, fullDocData.secondaryFont]);

  const themeName = fullDocData?.theme || fullDocData?.look || '';
  const bgGradient = useMemo(() => {
    const lower = String(themeName).toLowerCase();
    if (lower.includes('cyprus')) return 'from-stone-900 to-amber-950 text-amber-200';
    if (lower.includes('emerald') || lower.includes('forest')) return 'from-emerald-950 to-teal-900 text-emerald-200';
    if (lower.includes('royal') || lower.includes('blue') || lower.includes('navy')) return 'from-blue-950 to-indigo-950 text-blue-200';
    if (lower.includes('rose') || lower.includes('ruby')) return 'from-rose-950 to-pink-950 text-rose-200';
    if (lower.includes('sand') || lower.includes('dune')) return 'from-amber-900 to-stone-900 text-amber-100';
    return 'from-zinc-800 to-zinc-950 text-zinc-300';
  }, [themeName]);

  // Precise A4 aspect ratio dimensions (794 x 1123, ratio ~0.707)
  const sizeConfigs = {
    xs: { w: 30, h: 42, scale: 30 / 794 },
    sm: { w: 40, h: 56, scale: 40 / 794 },
    md: { w: 56, h: 79, scale: 56 / 794 },
    lg: { w: 72, h: 102, scale: 72 / 794 }
  };

  const cfg = sizeConfigs[size] || sizeConfigs.md;

  const fallbackMarkup = (
    <div
      style={{ width: `${cfg.w}px`, height: `${cfg.h}px` }}
      className={`relative rounded-md overflow-hidden border border-amber-500/40 bg-gradient-to-b ${bgGradient} shrink-0 shadow-2xs flex flex-col items-center justify-between p-1 select-none ${className}`}
    >
      <div className="w-full flex items-center justify-center pt-0.5">
        <Sparkles className="w-2.5 h-2.5 text-amber-300 opacity-90" />
      </div>
      <div className="w-full text-center px-0.5">
        <p className="font-serif font-bold text-[8px] leading-tight truncate tracking-tight text-white/95">
          {title || fullDocData.designName || 'Quotation'}
        </p>
        <span className="text-[6px] uppercase tracking-widest text-amber-300/80 font-black block scale-90">
          {fullDocData?.look || 'Design'}
        </span>
      </div>
      <div className="w-2/3 h-[1px] bg-amber-400/50 rounded-full mb-0.5" />
    </div>
  );

  return (
    <ThumbnailErrorBoundary fallback={fallbackMarkup}>
      <div
        style={{ width: `${cfg.w}px`, height: `${cfg.h}px` }}
        className={`relative rounded-md overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/90 shrink-0 shadow-xs group-hover:border-amber-500/60 transition-all select-none ${className}`}
      >
        <div
          className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
          style={{
            width: '794px',
            height: '1123px',
            transform: `scale(${cfg.scale})`,
            transformOrigin: 'top left',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <QuotationDocumentCanvas documentData={fullDocData} onlyFirstPage={true} />
        </div>
      </div>
    </ThumbnailErrorBoundary>
  );
});

interface QuotationTemplateSelectorProps {
  templates?: StudioTemplateItem[];
  selectedId: string | null;
  onSelect: (templateId: string) => void;
  workspaceId?: string;
  placement?: 'top' | 'bottom';
  align?: 'right' | 'left';
  className?: string;
  disabled?: boolean;
}

export function QuotationTemplateSelector({
  templates: incomingTemplates,
  selectedId,
  onSelect,
  workspaceId,
  placement = 'top',
  align = 'right',
  className = '',
  disabled = false
}: QuotationTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronous resolution of templates: guaranteed 0ms, no demo flickering
  const [internalTemplates, setInternalTemplates] = useState<StudioTemplateItem[]>(() => {
    if (incomingTemplates && incomingTemplates.length > 0) return incomingTemplates;
    return getSynchronousCachedTemplates(workspaceId);
  });

  // Sync state when incomingTemplates prop changes
  useEffect(() => {
    if (incomingTemplates && incomingTemplates.length > 0) {
      setInternalTemplates(incomingTemplates);
    }
  }, [incomingTemplates]);

  // Background fetch to ensure latest changes are fresh
  useEffect(() => {
    let active = true;
    prefetchStudioTemplates(workspaceId).then((fresh) => {
      if (active && Array.isArray(fresh) && fresh.length > 0) {
        setInternalTemplates(fresh);
      }
    });
    return () => { active = false; };
  }, [workspaceId]);

  // Real-time synchronization: listen for events when template is updated in builder or storage
  useEffect(() => {
    const handleTemplateUpdate = () => {
      const cached = getSynchronousCachedTemplates(workspaceId);
      if (cached.length > 0) {
        setInternalTemplates(cached);
      }
      prefetchStudioTemplates(workspaceId).then((fresh) => {
        if (Array.isArray(fresh) && fresh.length > 0) {
          setInternalTemplates(fresh);
        }
      });
    };

    const onStorageTmplSync = (e: Event) => {
      if (e && 'key' in e && (e as StorageEvent).key) {
        const key = (e as StorageEvent).key;
        if (key !== 'quotation_template_updated' && key !== 'wg_quotations_updated' && !key?.startsWith('studio_templates_cache_')) {
          return;
        }
      }
      handleTemplateUpdate();
    };

    window.addEventListener('quotation_template_updated', handleTemplateUpdate);
    window.addEventListener('wg_quotations_updated', handleTemplateUpdate);
    window.addEventListener('storage', onStorageTmplSync);

    return () => {
      window.removeEventListener('quotation_template_updated', handleTemplateUpdate);
      window.removeEventListener('wg_quotations_updated', handleTemplateUpdate);
      window.removeEventListener('storage', onStorageTmplSync);
    };
  }, [workspaceId]);

  const templates = internalTemplates;

  // Resolve currently selected template
  const currentSelected = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    if (selectedId) {
      const match = templates.find(t => t.id === selectedId);
      if (match) return match;
    }
    const def = templates.find(t => t.is_default);
    return def || templates[0];
  }, [templates, selectedId]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const popoverPositionClass = placement === 'top' 
    ? 'bottom-full mb-1.5' 
    : 'top-full mt-1.5';

  const popoverAlignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button with 1:1 Thumbnail + Title */}
      <button
        type="button"
        disabled={disabled || templates.length === 0}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-zinc-900 dark:text-white flex items-center gap-2 transition-all text-xs cursor-pointer shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-[0.98] ${
          isOpen ? 'ring-2 ring-amber-500/30 border-amber-500/80' : ''
        }`}
        title="Select Template Design"
      >
        {currentSelected ? (
          <>
            <TemplateThumbnail
              contentJson={currentSelected.content_json}
              title={currentSelected.title}
              size="xs"
            />
            <div className="flex flex-col text-left truncate max-w-[130px] sm:max-w-[160px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold truncate text-[11px] sm:text-xs">
                  {currentSelected.title}
                </span>
                {currentSelected.is_default && (
                  <span className="shrink-0 text-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold px-1.5 py-0.2 rounded-full border border-amber-500/20">
                    Default
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 py-0.5 text-zinc-400">
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Select Design...</span>
          </div>
        )}

        <ChevronDown 
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ml-0.5 ${
            isOpen ? 'rotate-180 text-amber-500' : ''
          }`} 
        />
      </button>

      {/* Floating Popover Menu with 1:1 Thumbnails for all Templates */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${popoverAlignClass} z-[150] w-[320px] sm:w-[350px] max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/90 rounded-2xl shadow-2xl p-1.5 ${popoverPositionClass} backdrop-blur-xl`}
          >
            {/* Popover Header */}
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <LayoutTemplate className="w-3 h-3 text-amber-500" />
                Select Template Design
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                {templates.length} Designs
              </span>
            </div>

            {/* List of Templates with 1:1 First Page Thumbnails & Smooth Custom Scrollbar */}
            <div className="max-h-[320px] overflow-y-auto space-y-2 p-1.5 pr-2 overscroll-contain quotation-dropdown-scroll">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === (currentSelected?.id || selectedId);
                const themeName = tmpl.content_json?.theme || tmpl.content_json?.look || tmpl.category || 'Wedding';

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      onSelect(tmpl.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-center gap-3 transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/50 text-amber-950 dark:text-amber-100 font-bold shadow-xs'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-transparent text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {/* 1:1 Actual First Page Design Thumbnail Preview */}
                    <div className="shrink-0 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs group-hover:border-amber-500/50 transition-colors">
                      <TemplateThumbnail
                        contentJson={tmpl.content_json}
                        title={tmpl.title}
                        size="md"
                      />
                    </div>

                    {/* Template Meta Information */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs truncate ${isSelected ? 'font-black text-amber-700 dark:text-amber-300' : 'font-bold'}`}>
                          {tmpl.title}
                        </span>
                        {tmpl.is_default && (
                          <span className="shrink-0 text-[8px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Star className="w-2 h-2 fill-amber-500 text-amber-500" /> Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 flex items-center gap-1 font-medium">
                        <span className="truncate">{themeName}</span>
                        <span>•</span>
                        <span className={tmpl.is_system_template ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                          {tmpl.is_system_template ? 'System Preset' : 'Studio Custom'}
                        </span>
                      </span>
                    </div>

                    {/* Active Selection Indicator */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
