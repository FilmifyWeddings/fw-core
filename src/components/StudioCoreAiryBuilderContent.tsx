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
  Gift, CreditCard, PackageCheck, Heart, Phone, Mail, Globe, GripVertical, CopyPlus, PlusCircle, Tag, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { cacheDocumentLocal, getCachedDocumentLocal, queueOfflineMutation, flushOfflineOutbox } from '@/lib/indexeddb-cache';
import { downloadServerChromiumPdf } from '@/lib/pdf-export-engine';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady } from '@/lib/font-loader';
import { toPng, toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';
import { paginateFunctionsPageItems } from '@/lib/functions-paginator';
import { paginateDeliverablesPageItems, paginateSpecialValueAdditionsPageItems } from '@/lib/deliverables-paginator';
import QuotationDocumentCanvas, { resolveFunctionTitle } from '@/components/QuotationDocumentCanvas';
import { DEFAULT_AIRY_PROPOSAL, calculatePricingTotals, normalizeQuotationData } from '@/lib/quotation-defaults';

interface CustomPageItem {
  id: string;
  title: string;
  photoUrl?: string;
  photoHeight?: number;
  photoWidth?: number;
  photoFocalY?: number;
  bgOpacity?: number;
  frameShape?: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  imagePosition?: 'top' | 'center' | 'bottom';
  content?: string;
}

interface PaymentTermStep {
  name: string;
  pct: string;
  amount: number;
  status: 'Completed' | 'Pending';
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

export interface StudioCoreAiryBuilderContentProps {
  mode?: 'user-template' | 'admin-system-template' | 'lead-quotation';
}

export function StudioCoreAiryBuilderContent({ mode = 'user-template' }: StudioCoreAiryBuilderContentProps = {}) {
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
  const activeRouteIdRef = useRef<string>(params?.id ? String(params.id) : 'FW-2WT85Y0');
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

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const setRawData = useCallback((updater: any) => {
    rawSetData((prevData: any) => {
      const nextData = typeof updater === 'function' ? updater(prevData) : updater;
      latestDataRef.current = nextData;
      return nextData;
    });
  }, []);

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
  }, []);

  useEffect(() => {
    async function initUserAndLoadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const userAccessToken = session?.access_token;
        const userStudioName = session?.user?.user_metadata?.studioName || session?.user?.user_metadata?.studio_name || (session?.user as any)?.studioName;

        if (!currentUserId && mode !== 'admin-system-template') {
          console.warn('[User Access Lock] No authenticated session found, redirecting to /workspace/quotations');
          router.push('/workspace/quotations');
          return;
        }

        setUserId(currentUserId || 'demo_user');

        const routeId = params?.id ? String(params.id) : 'FW-2WT85Y0';
        activeRouteIdRef.current = routeId;

        const isAdminMode = mode === 'admin-system-template';
        const fetchUrl = isAdminMode ? `/api/admin/quotation-templates/${routeId}` : `/api/templates/${routeId}`;

        const res = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${userAccessToken || ''}`
          }
        });

        if (res.status === 403) {
          alert('Access Denied: You do not have permission to view or edit this quotation template.');
          router.push(isAdminMode ? '/admin/quotation-templates' : '/workspace/quotations');
          return;
        }

        const json = await res.json();

        if (isAdminMode && json.template?.id && json.template.id !== routeId) {
          console.error('[ADMIN TEMPLATE BUILDER ERROR] Requested template ID mismatch', {
            requestedTemplateId: routeId,
            loadedTemplateId: json.template.id
          });
          alert(`Error: System Template ID mismatch (${routeId} !== ${json.template.id})`);
          router.push('/admin/quotation-templates');
          return;
        }

        if (isAdminMode) {
          console.log('[ADMIN TEMPLATE BUILDER]', {
            requestedTemplateId: routeId,
            loadedTemplateId: json.template?.id || routeId,
            isSystemTemplate: true,
            isGlobalDefault: !!json.template?.is_global_default,
            saveTargetId: routeId,
            builderMode: 'admin-system-template'
          });
        }

        let loadedData: any = null;
        const docContent = json.document?.content_json || json.document?.document_json || (json.document?.pages ? json.document : null);

        if (docContent) {
          loadedData = normalizeQuotationData(docContent);
          currentVersionRef.current = json.document?.version || 1;
        } else {
          const cachedLocal = await getCachedDocumentLocal(routeId);
          if (cachedLocal?.documentJson) {
            currentVersionRef.current = cachedLocal.version || 1;
            loadedData = normalizeQuotationData(cachedLocal.documentJson);
          }
        }

        if (!loadedData) {
          loadedData = { ...DEFAULT_AIRY_PROPOSAL };
        }

        if (userStudioName && (!loadedData.cover?.brandName || loadedData.cover.brandName === 'FILMIFY WEDDINGS')) {
          loadedData.cover = { ...loadedData.cover, brandName: userStudioName };
        }

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
        setTimeout(() => {
          isInitialLoadedRef.current = true;
          setIsDataReady(true);
          setAutoSaveStatus('Auto-saved to cloud');
        }, 100);
      }
    }
    initUserAndLoadData();
  }, [params, mode]);

  const triggerRevisionSave = async () => {
    if (!isInitialLoadedRef.current) return;

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
      const routeId = activeRouteIdRef.current || (params?.id ? String(params.id) : 'FW-2WT85Y0');

      const isAdminMode = mode === 'admin-system-template';
      const saveEndpoint = isAdminMode ? `/api/admin/quotation-templates/${routeId}` : `/api/templates/${routeId}`;

      const saveRes = await fetch(saveEndpoint, {
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
          title: snapshotData.designName || 'System Default Wedding Template',
          client_id: clientTabIdRef.current
        })
      });

      if (saveRes.ok) {
        const resJson = await saveRes.json();
        if (resJson.version) {
          currentVersionRef.current = resJson.version;
        }
        if (!isAdminMode && resJson.isAutoCloned && resJson.newTemplateId) {
          activeRouteIdRef.current = resJson.newTemplateId;
          window.history.replaceState(null, '', `/workspace/quotations/builder/templet/${resJson.newTemplateId}`);
        }
        cacheDocumentLocal(activeRouteIdRef.current, snapshotData, currentVersionRef.current);
      }

      if (isAdminMode) {
        console.log('[ADMIN TEMPLATE SAVE]', {
          templateId: routeId,
          isSystemTemplate: true,
          saveTargetId: routeId
        });
      } else {
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

  const isAdminMode = mode === 'admin-system-template';
  const routeId = activeRouteIdRef.current || (params?.id ? String(params.id) : '');

  return (
    <div className="h-screen w-screen bg-[#11100F] text-white flex flex-col overflow-hidden select-none">
      {/* Admin Mode Top Header Badge */}
      {isAdminMode && (
        <div className="bg-amber-500 text-black px-6 py-2 flex items-center justify-between font-black text-xs uppercase tracking-wider z-50 border-b border-amber-400 shadow-md">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 fill-black" />
            <span>ADMIN SYSTEM TEMPLATE BUILDER — DIRECT SYSTEM EDIT</span>
            <span className="bg-black text-amber-400 px-2 py-0.5 rounded-full font-mono text-[10px]">{routeId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-900 font-bold">1:1 Exact Builder Canvas & Engine</span>
            <button
              type="button"
              onClick={() => triggerRevisionSave()}
              className="px-3 py-1 bg-black hover:bg-zinc-900 text-amber-400 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              SAVE SYSTEM TEMPLATE
            </button>
            <Link
              href="/admin/quotation-templates"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-black rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
            >
              Exit to Admin
            </Link>
          </div>
        </div>
      )}

      {/* Main Full-Featured Builder UI */}
      <div className="flex-1 flex overflow-hidden">
        {/* Render Canvas & Controls */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#181716] relative">
          <div className="p-4 border-b border-zinc-800 bg-[#141312] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={isAdminMode ? "/admin/quotation-templates" : "/workspace/quotations"} className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h2 className="text-sm font-black text-white">{data.designName || 'System Default Wedding Template'}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{autoSaveStatus}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <QuotationDocumentCanvas documentData={data} onlyFirstPage={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioCoreAiryBuilderContent;
