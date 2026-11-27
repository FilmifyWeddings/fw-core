'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Sparkles, LayoutTemplate, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';
import { getThemeFromKey } from '@/lib/quotation-theme';

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
const inflightPrefetchMap = new Map<string, Promise<StudioTemplateItem[]>>();
const lastFetchTimestampMap = new Map<string, number>();
const prewarmedImageUrls = new Set<string>();
let lastPersistedSignature = '';

function prewarmTemplateCoverImages(templates: StudioTemplateItem[]) {
  if (typeof window === 'undefined' || !Array.isArray(templates)) return;
  for (const t of templates) {
    const url = t?.content_json?.cover?.photoUrl || t?.content_json?.cover?.photo;
    if (typeof url === 'string' && url.length > 0 && !url.startsWith('data:') && !prewarmedImageUrls.has(url)) {
      prewarmedImageUrls.add(url);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
    }
  }
}

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
  if (memoryTemplatesCache['default'] && memoryTemplatesCache['default'].length > 0) {
    return memoryTemplatesCache['default'];
  }

  // 2. LocalStorage & SessionStorage cache (strictly scoped to active studio)
  if (typeof window !== 'undefined') {
    try {
      const activeUid = workspaceId || localStorage.getItem('sc_active_workspace_id') || localStorage.getItem('wg_last_active_user_id') || '';
      const keysToCheck = [
        activeUid ? `studio_templates_cache_${activeUid}` : '',
        activeUid ? `wg_quotations_cache_${activeUid}` : '',
        'studio_templates_cache',
        'sc_system_template_cache',
        'wg_quotations_cache'
      ].filter(Boolean);

      for (const key of keysToCheck) {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strictly filter out lead quotations and demo templates
            const clean = parsed.filter((t: any) => {
              if (!t || !t.id) return false;
              const idStr = String(t.id);
              if (idStr.startsWith('FW-Q-') || idStr.startsWith('FW-L-') || idStr === 'FW-AIRY-DEFAULT') return false;
              const tName = String(t.title || '').trim().toLowerCase();
              const dName = String(t.content_json?.designName || '').trim().toLowerCase();
              if (tName === 'minimalist airy proposal' || dName === 'minimalist airy proposal') return false;
              if (tName === 'wedding - design 1' || dName === 'wedding - design 1') return false;
              return true;
            });
            if (clean.length > 0) {
              memoryTemplatesCache[wsKey] = clean;
              memoryTemplatesCache['default'] = clean;
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
  memoryTemplatesCache['default'] = templates;
  prewarmTemplateCoverImages(templates);

  if (typeof window !== 'undefined') {
    try {
      const activeUid = workspaceId || localStorage.getItem('wg_last_active_user_id') || localStorage.getItem('sc_active_workspace_id') || '';
      const localKey = activeUid ? `studio_templates_cache_${activeUid}` : 'studio_templates_cache';
      const serialized = JSON.stringify(templates);
      const sig = `${localKey}:${serialized.length}:${templates.map(t => t.id).join(',')}`;
      if (sig === lastPersistedSignature) return;
      lastPersistedSignature = sig;

      localStorage.setItem(localKey, serialized);
      localStorage.setItem('studio_templates_cache', serialized);
      sessionStorage.setItem('studio_templates_cache', serialized);
    } catch (_) {}
  }
}

/**
 * Asynchronously prefetches quotation templates in the background with 60s dedupe.
 */
export async function prefetchStudioTemplates(workspaceId?: string, forceRefresh = false): Promise<StudioTemplateItem[]> {
  const wsKey = workspaceId || 'default';
  const lastTs = lastFetchTimestampMap.get(wsKey) || 0;
  if (!forceRefresh && Date.now() - lastTs < 60_000 && memoryTemplatesCache[wsKey]?.length > 0) {
    return memoryTemplatesCache[wsKey];
  }

  const existingInflight = inflightPrefetchMap.get(wsKey);
  if (!forceRefresh && existingInflight) {
    return existingInflight;
  }

  const task = (async () => {
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
        lastFetchTimestampMap.set(wsKey, Date.now());
        persistTemplatesToCache(json.templates, currentUserId);
        return json.templates;
      }
    } catch (err) {
      console.warn('[QuotationTemplateSelector] Prefetch warning:', err);
    } finally {
      inflightPrefetchMap.delete(wsKey);
    }
    return getSynchronousCachedTemplates(workspaceId);
  })();

  inflightPrefetchMap.set(wsKey, task);
  return task;
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
 * 1:1 FIRST PAGE DESIGN THUMBNAIL (ULTRA-LIGHTWEIGHT 0MS RENDERER)
 * Pure CSS/HTML miniature cover preview matching the exact theme palette,
 * cover photo, frame shape, and typography with zero heavy canvas overhead.
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
        coupleName = isSys ? 'Groom & Bride' : (title || 'Rahul & Neha');
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
        coupleName: 'Groom & Bride',
        eventType: 'Wedding',
        brandName: 'Filmify Weddings',
        frameShape: 'arch',
        bgOpacity: 19,
        photoUrl: '/images/system-premium-cover.webp'
      }
    };
  }, [contentJson, title]);

  const themeTokens = useMemo(() => {
    const themeKey = fullDocData?.theme || fullDocData?.look || 'cyprus-sand-dune';
    const base = getThemeFromKey(themeKey);
    return {
      bg: fullDocData?.customColors?.pageBg || base?.background || '#F0EDE5',
      text: fullDocData?.customColors?.text || base?.text || '#004643',
      kicker: fullDocData?.customColors?.kicker || base?.kicker || '#004643',
    };
  }, [fullDocData]);

  // Precise A4 aspect ratio dimensions (ratio ~0.707)
  const sizeConfigs = {
    xs: { w: 30, h: 42, titleSize: '4px', subSize: '3px', imgW: 16, imgH: 18, pad: '3px' },
    sm: { w: 40, h: 56, titleSize: '5px', subSize: '3.5px', imgW: 22, imgH: 25, pad: '4px' },
    md: { w: 56, h: 79, titleSize: '6.5px', subSize: '4.5px', imgW: 32, imgH: 36, pad: '5px' },
    lg: { w: 72, h: 102, titleSize: '8px', subSize: '5.5px', imgW: 42, imgH: 48, pad: '6px' }
  };

  const cfg = sizeConfigs[size] || sizeConfigs.md;
  const cover = fullDocData.cover || {};
  const photoUrl = cover.photoUrl || cover.photo || '';
  const frameShape = cover.frameShape || 'arch';
  const isBgMode = frameShape === 'background';

  const frameRadiusClass =
    frameShape === 'circle'
      ? 'rounded-full'
      : frameShape === 'square'
      ? 'rounded-none'
      : frameShape === 'rounded'
      ? 'rounded-sm'
      : 'rounded-t-full';

  const coupleDisplay = String(cover.coupleName || title || 'Design').replace(/\n+/g, ' ').trim();
  const brandDisplay = String(cover.brandName || 'STUDIO').trim();

  return (
    <div
      style={{
        width: `${cfg.w}px`,
        height: `${cfg.h}px`,
        backgroundColor: themeTokens.bg,
        color: themeTokens.text,
        padding: cfg.pad
      }}
      className={`relative rounded-md overflow-hidden border border-zinc-200/90 dark:border-zinc-700/90 shrink-0 shadow-xs group-hover:border-amber-500/60 transition-colors select-none flex flex-col items-center justify-between text-center ${className}`}
    >
      {/* Background photo mode */}
      {isBgMode && photoUrl && (
        <img
          src={photoUrl}
          alt=""
          loading="eager"
          decoding="async"
          style={{ opacity: Math.max(0.15, Math.min(0.85, (cover.bgOpacity ?? 40) / 100)) }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Top couple/event title */}
      <div className="relative z-10 w-full flex flex-col items-center leading-none pt-0.5">
        <span
          style={{ fontSize: cfg.titleSize, fontFamily: fullDocData.primaryFont }}
          className="font-black uppercase tracking-wider truncate max-w-full leading-tight"
        >
          {coupleDisplay}
        </span>
        <span
          style={{ fontSize: cfg.subSize, color: themeTokens.kicker }}
          className="uppercase tracking-widest opacity-80 truncate max-w-full leading-none mt-[1px]"
        >
          {(cover.eventType || 'Wedding').toUpperCase()}
        </span>
      </div>

      {/* Center framed photo */}
      {!isBgMode && photoUrl ? (
        <div
          style={{ width: `${cfg.imgW}px`, height: `${cfg.imgH}px`, borderColor: `${themeTokens.text}33` }}
          className={`relative z-10 overflow-hidden border shrink-0 my-auto ${frameRadiusClass}`}
        >
          <img
            src={photoUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      ) : (
        <div className="relative z-10 w-3/4 h-[1px] opacity-30 my-auto" style={{ backgroundColor: themeTokens.text }} />
      )}

      {/* Bottom brand */}
      <div className="relative z-10 w-full truncate leading-none pb-0.5">
        <span
          style={{ fontSize: cfg.subSize, fontFamily: fullDocData.secondaryFont }}
          className="uppercase font-bold tracking-widest opacity-85 truncate block"
        >
          {brandDisplay}
        </span>
      </div>
    </div>
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
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [popoverRect, setPopoverRect] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxListHeight: number;
    openDirection: 'top' | 'bottom';
  }>({
    top: 0,
    left: 0,
    width: 340,
    maxListHeight: 320,
    openDirection: placement
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const width = Math.min(vw >= 640 ? 350 : 320, Math.max(240, vw - margin * 2));

    let left = align === 'left' ? rect.left : rect.right - width;
    if (left + width > vw - margin) {
      left = vw - margin - width;
    }
    if (left < margin) {
      left = margin;
    }

    const spaceAbove = rect.top - margin - gap;
    const spaceBelow = vh - rect.bottom - margin - gap;
    const openTop = placement === 'top'
      ? (spaceAbove >= 220 || spaceAbove >= spaceBelow)
      : (spaceBelow < 220 && spaceAbove > spaceBelow);

    if (openTop) {
      const availableHeight = Math.max(180, Math.min(380, spaceAbove));
      setPopoverRect({
        bottom: Math.max(margin, vh - rect.top + gap),
        left,
        width,
        maxListHeight: Math.max(130, availableHeight - 46),
        openDirection: 'top'
      });
    } else {
      const availableHeight = Math.max(180, Math.min(380, spaceBelow));
      setPopoverRect({
        top: Math.max(margin, rect.bottom + gap),
        left,
        width,
        maxListHeight: Math.max(130, availableHeight - 46),
        openDirection: 'bottom'
      });
    }
  }, [align, placement]);

  // Click outside to close + keep fixed portal synced on resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [isOpen, updatePopoverPosition]);

  const popoverNode = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={portalRef}
          initial={{ opacity: 0, y: popoverRect.openDirection === 'top' ? 4 : -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: popoverRect.openDirection === 'top' ? 3 : -3, scale: 0.98 }}
          transition={{ duration: 0.09, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            zIndex: 1000010,
            left: `${popoverRect.left}px`,
            width: `${popoverRect.width}px`,
            willChange: 'transform, opacity',
            ...(popoverRect.bottom !== undefined ? { bottom: `${popoverRect.bottom}px` } : { top: `${popoverRect.top ?? 0}px` })
          }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/90 rounded-2xl shadow-2xl p-1.5"
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
          <div
            style={{ maxHeight: `${popoverRect.maxListHeight}px` }}
            className="overflow-y-auto space-y-2 p-1.5 pr-2 overscroll-contain quotation-dropdown-scroll"
          >
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
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button with 1:1 Thumbnail + Title */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || templates.length === 0}
        onClick={() => {
          if (!isOpen) updatePopoverPosition();
          setIsOpen(!isOpen);
        }}
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

      {/* Portal Popover Menu rendered on document.body so parent modal overflow-hidden never clips it */}
      {mounted && typeof document !== 'undefined' ? createPortal(popoverNode, document.body) : null}
    </div>
  );
}
