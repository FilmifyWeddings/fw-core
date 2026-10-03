'use client';

import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Sparkles, LayoutTemplate, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import QuotationDocumentCanvas from '@/components/QuotationDocumentCanvas';
import { preloadActiveFont } from '@/lib/font-loader';

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
 * Guaranteed 0ms response time with zero fake/demo templates.
 */
export function getSynchronousCachedTemplates(workspaceId?: string): StudioTemplateItem[] {
  const wsKey = workspaceId || 'default';
  
  // 1. Direct memory cache (fastest, 0ms)
  if (memoryTemplatesCache[wsKey] && memoryTemplatesCache[wsKey].length > 0) {
    return memoryTemplatesCache[wsKey];
  }

  // 2. LocalStorage & SessionStorage cache
  if (typeof window !== 'undefined') {
    try {
      const activeUid = workspaceId || localStorage.getItem('wg_last_active_user_id') || '';
      const keysToCheck = [
        activeUid ? `studio_templates_cache_${activeUid}` : '',
        'studio_templates_cache',
        activeUid ? `wg_quotations_cache_${activeUid}` : ''
      ].filter(Boolean);

      for (const key of keysToCheck) {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Filter out any lead quotations (FW-Q-*) just in case
            const clean = parsed.filter((t: any) => t && t.id && !t.id.startsWith('FW-Q-') && !t.id.startsWith('FW-L-'));
            if (clean.length > 0) {
              memoryTemplatesCache[wsKey] = clean;
              return clean;
            }
          }
        }
      }
    } catch (_) {}
  }

  return [];
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
      const activeUid = workspaceId || localStorage.getItem('wg_last_active_user_id') || '';
      const localKey = activeUid ? `studio_templates_cache_${activeUid}` : 'studio_templates_cache';
      const serialized = JSON.stringify(templates);
      localStorage.setItem(localKey, serialized);
      sessionStorage.setItem(localKey, serialized);
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
 * 1:1 FIRST PAGE DESIGN THUMBNAIL
 * Renders the exact first page design (canvas) of the quotation template,
 * identical to the Cards in the Quotations Gallery (/workspace/quotations).
 */
export function TemplateThumbnail({
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
    if (doc && typeof doc === 'object' && (doc.cover || doc.theme || doc.look)) {
      return {
        ...doc,
        designName: doc.designName || title || 'Wedding Quotation',
        cover: {
          ...doc.cover,
          coupleName: doc.cover?.coupleName !== undefined ? doc.cover.coupleName : (title || 'Rahul & Neha')
        }
      };
    }
    return {
      look: 'cyprus-sand-dune',
      theme: 'cyprus-sand-dune',
      primaryFont: 'Cormorant Garamond',
      secondaryFont: 'Plus Jakarta Sans',
      designName: title || 'Wedding Quotation',
      cover: {
        coupleName: title || 'Rahul & Neha',
        eventType: 'WEDDING',
        eventDate: 'DECEMBER 2026',
        location: 'MUMBAI',
        brandName: 'FILMIFY WEDDINGS',
        frameShape: 'arch',
        bgOpacity: 40
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

  // Precise A4 aspect ratio dimensions (794 x 1123)
  const sizeConfigs = {
    xs: { w: 26, h: 37, scale: 26 / 794 },
    sm: { w: 32, h: 45, scale: 32 / 794 },
    md: { w: 42, h: 60, scale: 42 / 794 },
    lg: { w: 56, h: 80, scale: 56 / 794 }
  };

  const cfg = sizeConfigs[size] || sizeConfigs.md;

  const fallbackMarkup = (
    <div
      style={{ width: `${cfg.w}px`, height: `${cfg.h}px` }}
      className={`relative rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700/80 bg-gradient-to-b ${bgGradient} shrink-0 shadow-2xs flex flex-col items-center justify-between p-0.5 select-none ${className}`}
    >
      <Sparkles className="w-2 h-2 opacity-60 mt-0.5" />
      <div className="w-full text-center truncate font-black tracking-tighter uppercase scale-75 opacity-80 leading-none text-[7px]">
        {title ? title.substring(0, 5) : 'FW'}
      </div>
      <div className="w-3/4 h-[1px] bg-current opacity-30 rounded-full mb-0.5" />
    </div>
  );

  return (
    <ThumbnailErrorBoundary fallback={fallbackMarkup}>
      <div
        style={{ width: `${cfg.w}px`, height: `${cfg.h}px` }}
        className={`relative rounded-md overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/90 shrink-0 shadow-2xs group-hover:border-amber-500/60 transition-all select-none ${className}`}
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
}

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

    window.addEventListener('quotation_template_updated', handleTemplateUpdate);
    window.addEventListener('wg_quotations_updated', handleTemplateUpdate);
    window.addEventListener('storage', handleTemplateUpdate);
    window.addEventListener('focus', handleTemplateUpdate);

    return () => {
      window.removeEventListener('quotation_template_updated', handleTemplateUpdate);
      window.removeEventListener('wg_quotations_updated', handleTemplateUpdate);
      window.removeEventListener('storage', handleTemplateUpdate);
      window.removeEventListener('focus', handleTemplateUpdate);
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
            className={`absolute ${popoverAlignClass} z-[150] w-[300px] sm:w-[330px] max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/90 rounded-2xl shadow-2xl p-1.5 ${popoverPositionClass} backdrop-blur-xl`}
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
            <div className="max-h-[300px] overflow-y-auto space-y-1.5 p-1 pr-1.5 overscroll-contain quotation-dropdown-scroll">
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
                    className={`w-full text-left p-1.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-transparent text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {/* 1:1 Actual First Page Design Thumbnail Preview */}
                    <TemplateThumbnail
                      contentJson={tmpl.content_json}
                      title={tmpl.title}
                      size="md"
                    />

                    {/* Template Meta Information */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs truncate ${isSelected ? 'font-black text-amber-600 dark:text-amber-300' : 'font-bold'}`}>
                          {tmpl.title}
                        </span>
                        {tmpl.is_default && (
                          <span className="shrink-0 text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Star className="w-2 h-2 fill-amber-500 text-amber-500" /> Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                        <span>{themeName}</span>
                        {tmpl.is_system_template && (
                          <>
                            <span>•</span>
                            <span className="text-purple-500 font-medium">System Preset</span>
                          </>
                        )}
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
