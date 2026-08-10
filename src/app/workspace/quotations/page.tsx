'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Lock, FileText, Image as ImageIcon, Folder, 
  ChevronRight, ExternalLink, Download, Copy, Sparkles, Eye, 
  Upload, HardDrive, CheckCircle2, ArrowRight, X, Trash2,
  Search, Shield, Check, Layers, Sliders, RefreshCw, Zap, AlertTriangle, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { removeCachedDocumentLocal } from '@/lib/indexeddb-cache';

import { getThemeFromKey } from '@/lib/quotation-theme';
import QuotationDocumentCanvas from '@/components/QuotationDocumentCanvas';

interface SavedQuotation {
  id: string;
  title: string;
  client_name: string;
  quotation_number: string;
  financials: { total_amount?: number };
  status: string;
  updated_at: string;
  content_json?: any;
  is_default?: boolean;
  is_system_template?: boolean;
}

interface UserGalleryImage {
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  compression_quality: string;
  created_at: string;
}

// 1:1 ACTUAL FIRST PAGE DESIGN CARD THUMBNAIL PREVIEW (DYNAMIC FOR EACH TEMPLATE ID)
function QuotationCardThumbnail({ contentJson, title, coupleName }: { contentJson?: any; title?: string; coupleName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.28);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setScale(width / 794);
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const baseData = contentJson ? { ...contentJson } : {
    look: 'cyprus-sand-dune',
    theme: 'cyprus-sand-dune',
    primaryFont: 'Cormorant Garamond',
    secondaryFont: 'Plus Jakarta Sans',
    designName: title || 'Wedding - Design 1',
    cover: {
      coupleName: title || coupleName || 'RAHUL & NEHA',
      eventType: 'WEDDING',
      eventDate: 'DECEMBER 2026',
      location: 'MUMBAI',
      brandName: 'FILMIFY WEDDINGS'
    }
  };

  const coverObj = baseData.cover || {};
  const currentCoupleName = coverObj.coupleName;
  const isGenericName = !currentCoupleName || currentCoupleName === 'RAHUL & NEHA' || currentCoupleName === 'Rahul & Neha';

  const displayCoupleName = (isGenericName && title && title !== 'Wedding - Design 1' && title !== 'System Default Wedding Template')
    ? title.toUpperCase()
    : (currentCoupleName || title || coupleName || 'RAHUL & NEHA');

  const coverPhoto = coverObj.photoUrl || coverObj.photo || coverObj.imageUrl || '';

  const data = {
    ...baseData,
    cover: {
      ...coverObj,
      coupleName: displayCoupleName,
      photoUrl: coverPhoto,
      photo: coverPhoto,
      frameShape: coverPhoto ? 'background' : (coverObj.frameShape || 'arch'),
      bgOpacity: coverPhoto ? Math.max(Number(coverObj.bgOpacity) || 60, 60) : 40
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-52 sm:h-56 bg-slate-200 dark:bg-zinc-800 overflow-hidden shadow-inner flex items-center justify-center select-none"
    >
      <div 
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{
          width: '794px',
          height: '1123px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        <QuotationDocumentCanvas documentData={data} onlyFirstPage={true} />
      </div>
    </div>
  );
}

function generateUniqueCopyName(requestedTitle: string, existingTitles: string[]): string {
  const cleanTitle = (requestedTitle || 'Wedding - Design 1').trim();
  
  // Base name without any trailing " Copy" or " Copy N"
  const baseTitle = cleanTitle
    .replace(/\s*\(?Copy\s*\d*\)?$/i, '')
    .trim() || 'Wedding - Design 1';

  let candidate = `${baseTitle} Copy`;
  if (!existingTitles.includes(candidate)) {
    return candidate;
  }

  let counter = 2;
  while (existingTitles.includes(`${baseTitle} Copy ${counter}`)) {
    counter++;
  }
  return `${baseTitle} Copy ${counter}`;
}

export default function WorkspaceQuotationsGalleryPage() {
  const router = useRouter();

  // User Session & Security
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Data States
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [activeQuotationId, setActiveQuotationId] = useState<string>('1');
  const [activeCoverPhoto, setActiveCoverPhoto] = useState<string>('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80');
  const [activeCoupleName, setActiveCoupleName] = useState<string>('Rahul & Neha');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [togglingSystemId, setTogglingSystemId] = useState<string | null>(null);
  const [cloningGlobalId, setCloningGlobalId] = useState<string | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<SavedQuotation | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSuperAdminUser = userEmail.toLowerCase() === 'sushantnawale700@gmail.com';

  const handleToggleSystemTemplate = async (targetQuote: SavedQuotation) => {
    const targetId = targetQuote.quotation_number || targetQuote.id;
    setTogglingSystemId(targetId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/templates/${targetId}/toggle-system`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle system template');

      setQuotations(prev => prev.map(q => {
        if ((q.quotation_number || q.id) === targetId) {
          return {
            ...q,
            is_system_template: data.is_system_template,
            status: data.status
          };
        }
        return q;
      }));

      setToastMessage(data.is_system_template ? 'Published as System Template for Users!' : 'Removed from System Templates');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Error toggling system template: ' + (err.message || 'Unknown error'));
    } finally {
      setTogglingSystemId(null);
    }
  };

  // FLOW B Lead Selection Modal States
  const [selectingLeadForTemplate, setSelectingLeadForTemplate] = useState<SavedQuotation | null>(null);
  const [leadOptions, setLeadOptions] = useState<any[]>([]);
  const [leadSearchText, setLeadSearchText] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [creatingForLead, setCreatingForLead] = useState<boolean>(false);

  const openLeadSelectionModal = async (quote: SavedQuotation) => {
    setSelectingLeadForTemplate(quote);
    setSelectedLeadId(null);
    setLeadSearchText('');
    setLoadingLeads(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId || 'demo_user';

      const { data: fetchedLeads } = await supabase
        .from('leads')
        .select('id, name, email, phone, status, raw_payload')
        .or(`workspace_id.eq.${currentUserId},workspace_id.eq.00000000-0000-0000-0000-000000000000`)
        .order('created_at', { ascending: false });

      if (fetchedLeads && fetchedLeads.length > 0) {
        setLeadOptions(fetchedLeads);
      } else {
        setLeadOptions([
          { id: '1', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919876543210' },
          { id: '2', name: 'Priya Patel', email: 'priya@example.com', phone: '+918765432109' },
          { id: '3', name: 'Amit Verma', email: 'amit@example.com', phone: '+917654321098' },
        ]);
      }
    } catch (err) {
      console.warn('[Fetch Leads Warning]:', err);
      setLeadOptions([
        { id: '1', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919876543210' },
        { id: '2', name: 'Priya Patel', email: 'priya@example.com', phone: '+918765432109' },
      ]);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleCreateQuotationForSelectedLead = async () => {
    if (!selectingLeadForTemplate || !selectedLeadId || creatingForLead) return;

    const templateId = selectingLeadForTemplate.quotation_number || selectingLeadForTemplate.id;
    setCreatingForLead(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userEmail) headers['x-user-email'] = userEmail;

      const res = await fetch('/api/quotations/create-for-lead', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: selectedLeadId,
          explicitTemplateId: templateId,
          templateId: templateId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create quotation for lead');

      const targetQuotationId = data.quotationId || data.templateId;
      setSelectingLeadForTemplate(null);
      router.push(`/workspace/quotations/builder/templet/${targetQuotationId}`);
    } catch (err: any) {
      console.error('[Create Quotation For Lead Error]:', err);
      alert('Could not create quotation: ' + (err.message || 'Unknown error'));
    } finally {
      setCreatingForLead(false);
    }
  };

  const handleSetAsDefault = async (targetQuote: SavedQuotation) => {
    const targetId = targetQuote.quotation_number || targetQuote.id;
    setSettingDefaultId(targetId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userEmail) headers['x-user-email'] = userEmail;

      const res = await fetch(`/api/templates/${targetId}/set-default`, {
        method: 'POST',
        headers
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to set default template');

      const returnedDefaultId = resData.defaultTemplateId || targetId;

      setQuotations(prev => prev.map(q => {
        const qId = q.quotation_number || q.id;
        return {
          ...q,
          is_default: qId === returnedDefaultId || qId === targetId
        };
      }));

      setToastMessage('Default quotation template updated');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('[Set Default Error]:', err);
      alert('Failed to set default: ' + (err.message || 'Unknown error'));
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleEditTemplate = async (quote: SavedQuotation) => {
    const quoteId = quote.quotation_number || quote.id;

    // RULE: Super Admin (sushantnawale700@gmail.com) ALWAYS edits System Templates directly!
    if (isSuperAdminUser) {
      router.push(`/workspace/quotations/builder/templet/${quoteId}`);
      return;
    }

    if (quote.is_system_template || quoteId === 'FW-2WT85Y0' || quoteId === 'SYSTEM_DEFAULT_WEDDING') {
      setCloningGlobalId(quoteId);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (userEmail) headers['x-user-email'] = userEmail;

        const res = await fetch('/api/templates/duplicate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sourceTemplateId: quoteId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize user template');

        const newId = data.newTemplateId;
        router.push(`/workspace/quotations/builder/templet/${newId}`);
      } catch (err: any) {
        console.error('[Edit Global Template Error]:', err);
        alert('Could not prepare template: ' + (err.message || 'Unknown error'));
      } finally {
        setCloningGlobalId(null);
      }
    } else {
      router.push(`/workspace/quotations/builder/templet/${quoteId}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuote) return;
    const targetId = deletingQuote.quotation_number || deletingQuote.id;
    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userEmail) headers['x-user-email'] = userEmail;

      const res = await fetch(`/api/templates/${targetId}`, {
        method: 'DELETE',
        headers
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template');

      removeCachedDocumentLocal(targetId);
      try {
        localStorage.removeItem(`wg_proposal_draft_${targetId}`);
      } catch (e) {}

      setQuotations(prev => {
        const next = prev.filter(q => (q.quotation_number || q.id) !== targetId);
        const hasAnyDefault = next.some(q => q.is_default);
        if (!hasAnyDefault) {
          return next.map(q => ({
            ...q,
            is_default: (q.quotation_number || q.id) === 'FW-2WT85Y0'
          }));
        }
        return next;
      });

      setToastMessage('Template deleted successfully');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('[Delete Error]:', err);
      alert('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setDeletingQuote(null);
    }
  };

  const [userImages, setUserImages] = useState<UserGalleryImage[]>(() => {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wg_gallery_cache_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {}
        }
      }
    }
    return [];
  });

  // Modals & Drawers States
  const [showQuotationsModal, setShowQuotationsModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [quotationSearch, setQuotationSearch] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDuplicateDesign = async (sourceQuote: SavedQuotation) => {
    const sourceId = sourceQuote.quotation_number || sourceQuote.id;
    setDuplicatingId(sourceId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userEmail) headers['x-user-email'] = userEmail;

      const res = await fetch('/api/templates/duplicate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceTemplateId: sourceId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Duplication failed');

      const duplicatedRecord: SavedQuotation = {
        id: data.newTemplateId,
        quotation_number: data.newTemplateId,
        title: data.template?.title || data.quotation?.title || `${sourceQuote.title} (Copy)`,
        client_name: data.quotation?.client_name || sourceQuote.client_name || 'Rahul & Neha',
        financials: sourceQuote.financials || {},
        content_json: data.document?.content_json || data.quotation?.content_json,
        status: data.template?.status || 'draft',
        is_default: false,
        is_system_template: data.template?.is_system_template ?? isSuperAdminUser,
        updated_at: new Date().toISOString()
      };

      setQuotations(prev => {
        const sourceIndex = prev.findIndex(q => (q.quotation_number || q.id) === sourceId);
        if (sourceIndex !== -1) {
          const nextList = [...prev];
          nextList.splice(sourceIndex + 1, 0, duplicatedRecord);
          return nextList;
        }
        return [duplicatedRecord, ...prev];
      });

      setToastMessage('Design duplicated successfully');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('[Duplicate Error]:', err);
      alert('Duplication failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setDuplicatingId(null);
    }
  };

  // Active Unlocked Templates
  const activeDesigns = [
    {
      id: '1',
      title: 'Wedding - Mocha & Gold',
      subtitle: 'Wedding - 11 pages',
      category: 'Wedding',
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      badge: 'Popular',
      isUnlocked: true,
      editUrl: '/workspace/quotations/builder/templet/1'
    },
    {
      id: '2',
      title: 'Pre-Wedding - Airy White',
      subtitle: 'Pre-Wedding - 11 pages',
      category: 'Pre-Wedding',
      coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      badge: 'Minimal',
      isUnlocked: true,
      editUrl: '/workspace/quotations/builder/templet/1'
    }
  ];

  // Locked Premium Templates
  const lockedDesigns = [
    {
      id: '3',
      title: 'Engagement — In Black, Rose',
      subtitle: 'Engagement - 8 pages',
      price: '₹799/mo',
      category: 'Engagement'
    },
    {
      id: '4',
      title: 'Maternity — Peach & Bronze',
      subtitle: 'Maternity - 6 pages',
      price: '₹799/mo',
      category: 'Maternity'
    },
    {
      id: '5',
      title: 'Baby / Newborn — Dynamic Trend',
      subtitle: 'Newborn - 7 pages',
      price: '₹799/mo',
      category: 'Baby & Kids'
    },
    {
      id: '6',
      title: 'Birthday — Gold Hues',
      subtitle: 'Birthday - 5 pages',
      price: '₹799/mo',
      category: 'Events'
    }
  ];

  useEffect(() => {
    console.log('=== GLOBAL_SITE_SYNC_VERIFIED_799 ===');
    async function loadUserDataSilently() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }

        const cached = localStorage.getItem(`wg_gallery_cache_${currentUserId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setUserImages(parsed);
            }
          } catch {}
        }

        // 1. Fetch user & system quotation templates & content_json from authoritative API (bypasses RLS locks)
        const token = session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (session?.user?.email) headers['x-user-email'] = session.user.email;

        const res = await fetch(`/api/quotation-templates?workspace_id=${currentUserId}`, { headers });
        const apiData = await res.json();
        const tmplData = apiData.templates || [];

        const docsMap: Record<string, any> = {};
        tmplData.forEach((t: any) => {
          if (!t.id) return;
          let docJson = t.content_json;

          // Read latest builder draft from localStorage if available
          if (typeof window !== 'undefined') {
            try {
              const localDraftStr = localStorage.getItem(`wg_proposal_draft_${t.id}`);
              if (localDraftStr) {
                const parsedDraft = JSON.parse(localDraftStr);
                if (parsedDraft && typeof parsedDraft === 'object') {
                  docJson = parsedDraft;
                }
              }
            } catch (e) {}
          }

          if (docJson) {
            docsMap[t.id] = docJson;
          }
        });

        // 3. Fetch user quotations from quotations table
        const { data: qData } = await supabase
          .from('quotations')
          .select('id, title, client_name, quotation_number, financials, status, updated_at')
          .eq('workspace_id', currentUserId)
          .order('updated_at', { ascending: false });

        const filteredTmplData = (tmplData || []).filter((t: any) => {
          if (!t.id) return false;
          // Exclude lead quotation instances from Your Designs gallery
          if (t.id.startsWith('FW-Q-') || t.id.startsWith('FW-L-')) return false;
          return true;
        });

        const templateMap: Record<string, any> = {};
        const validTemplateIds = new Set<string>();

        if (filteredTmplData.length > 0) {
          filteredTmplData.forEach((t: any) => {
            templateMap[t.id] = t;
            validTemplateIds.add(t.id);
          });
        }
        validTemplateIds.add('FW-2WT85Y0');

        let combined: SavedQuotation[] = [];

        // Global System Default Wedding Template definition
        const globalSystemTemplate: SavedQuotation = {
          id: 'FW-2WT85Y0',
          quotation_number: 'FW-2WT85Y0',
          title: 'System Default Wedding Template',
          client_name: 'Rahul & Neha',
          financials: {},
          status: 'published',
          is_system_template: true,
          is_default: false,
          updated_at: new Date().toISOString()
        };

        if (filteredTmplData.length > 0) {
          combined = filteredTmplData.map((t: any) => ({
            id: t.id,
            quotation_number: t.id,
            title: t.title || 'Wedding - Design 1',
            client_name: 'Rahul & Neha',
            financials: {},
            status: 'draft',
            content_json: docsMap[t.id] || null,
            is_default: t.is_default || false,
            is_system_template: t.is_system_template || t.id === 'FW-2WT85Y0',
            updated_at: t.updated_at
          }));
        } else if (qData && qData.length > 0) {
          combined = qData
            .filter((q: any) => {
              const qNum = q.quotation_number || q.id;
              return validTemplateIds.has(qNum) || validTemplateIds.has(q.id);
            })
            .map((q: any) => {
              const qNum = q.quotation_number || q.id;
              const tmplMeta = templateMap[qNum] || templateMap[q.id];
              return {
                ...q,
                content_json: docsMap[qNum] || docsMap[q.id] || null,
                is_default: tmplMeta?.is_default || false,
                is_system_template: tmplMeta?.is_system_template || qNum === 'FW-2WT85Y0'
              };
            });
        }

        // Ensure Global System Default is included
        if (!combined.some(q => (q.quotation_number || q.id) === 'FW-2WT85Y0')) {
          combined.unshift(globalSystemTemplate);
        }

        // Check if any template has is_default = true; if none at all, default to global system template
        const hasAnyDefault = combined.some(q => q.is_default);
        if (!hasAnyDefault) {
          combined = combined.map(q => ({
            ...q,
            is_default: (q.quotation_number || q.id) === 'FW-2WT85Y0'
          }));
        }

        setQuotations(combined);
        const primary = combined[0];
        const primaryId = primary.quotation_number || primary.id;
        setActiveQuotationId(primaryId);

        if (primary.client_name) {
          setActiveCoupleName(primary.client_name);
        }

        if (primary.content_json?.cover?.photoUrl) {
          setActiveCoverPhoto(primary.content_json.cover.photoUrl);
        }

        const { data: imgData } = await supabase
          .from('user_gallery_images')
          .select('*')
          .eq('workspace_id', currentUserId)
          .order('created_at', { ascending: false });

        if (imgData) {
          setUserImages(imgData as UserGalleryImage[]);
          localStorage.setItem(`wg_gallery_cache_${currentUserId}`, JSON.stringify(imgData));
        }
      } catch (err) {
        console.warn('[QuotationsPage] Silent background sync error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserDataSilently();
  }, []);

  useEffect(() => {
    const handleGalleryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setUserImages(customEvent.detail);
      }
    };
    window.addEventListener('wg_gallery_updated', handleGalleryUpdate);
    return () => window.removeEventListener('wg_gallery_updated', handleGalleryUpdate);
  }, []);

  const triggerFileSelection = () => {
    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(50);
      const uploadResult = await uploadMasterImage(supabase, file, {
        bucket: 'whatsapp_templates_media',
        folder: userId || 'user_uploads',
        cacheControl: '31536000',
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.92,
      });

      setUploadProgress(80);

      if (!uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed.');
      }

      const { data: newImg } = await supabase
        .from('user_gallery_images')
        .insert({
          workspace_id: userId || 'demo_user',
          url: uploadResult.url,
          file_name: file.name,
          file_size: file.size,
          compression_quality: '92% WebP',
        })
        .select()
        .single();

      setUploadProgress(100);

      const finalImgObj: UserGalleryImage = newImg || {
        id: Math.random().toString(),
        url: uploadResult.url,
        file_name: file.name,
        file_size: file.size,
        compression_quality: '92% WebP',
        created_at: new Date().toISOString(),
      };

      setUserImages(prev => {
        const updated = [finalImgObj, ...prev];
        localStorage.setItem(`wg_gallery_cache_${userId}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('wg_gallery_updated', { detail: updated }));
        return updated;
      });
    } catch (err: any) {
      console.error('[QuotationsPage] Automatic upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.title?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(quotationSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#070708] text-slate-800 dark:text-zinc-100 p-4 lg:p-8 space-y-6 lg:space-y-8 pb-24 lg:pb-8">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Quotation Designs
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 font-semibold leading-relaxed max-w-4xl">
          Win more bookings with a presentation that feels premium. Customize cover images, pricing, deliverables, and payment schedules.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
        
        {/* CARD 1: QUOTATIONS */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => setShowQuotationsModal(true)}
          className="rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-200/80 dark:border-indigo-900/50 p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
              Auto-saved
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-indigo-900/70 dark:text-indigo-300">Quotations</span>
            <h4 className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-white mt-0.5">
              {quotations.length} <span className="text-xs sm:text-sm font-normal text-indigo-700/60 dark:text-indigo-400">/ 10 Limit</span>
            </h4>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-indigo-200/70 dark:bg-indigo-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (quotations.length / 10) * 100)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
            <span>View All Quotations ({quotations.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 2: IMAGES / USER GALLERY */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="rounded-2xl bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] dark:from-pink-950/40 dark:to-pink-900/20 border border-pink-200/80 dark:border-pink-900/50 p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-pink-900/70 text-pink-600 dark:text-pink-300 flex items-center justify-center shadow-sm">
              <ImageIcon className="w-5 h-5" />
            </div>

            <button 
              type="button"
              onClick={triggerFileSelection}
              disabled={isUploading || userImages.length >= 10}
              className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer ${
                userImages.length >= 10 
                  ? 'bg-zinc-400 cursor-not-allowed opacity-75' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              {userImages.length >= 10 ? <AlertTriangle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isUploading ? `Uploading... ${uploadProgress}%` : userImages.length >= 10 ? `Limit (${userImages.length}/10)` : 'Add Image'}
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-pink-900/70 dark:text-pink-300">Your Images</span>
            <h4 className="text-xl sm:text-2xl font-black text-pink-950 dark:text-white mt-0.5">
              {userImages.length} <span className="text-xs sm:text-sm font-normal text-pink-700/60 dark:text-pink-400">/ 10 Images</span>
            </h4>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-pink-200/70 dark:bg-pink-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (userImages.length / 10) * 100)}%` }}
              />
            </div>
          </div>

          <div 
            onClick={() => setShowGalleryModal(true)}
            className="pt-2 border-t border-pink-200/60 dark:border-pink-900/50 flex items-center justify-between text-xs font-bold text-pink-950 dark:text-pink-200 cursor-pointer hover:text-pink-600"
          >
            <span>Open Image Gallery ({userImages.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

      </div>

      <input 
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Designs Header & Desktop Button */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Your Designs
        </h2>
      </div>

      {/* Responsive Designs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
        
        {/* DYNAMIC USER QUOTATION CARDS (1:1 Thumbnail Sync, Dynamic Custom Title, Instant Duplication) */}
        {quotations.length > 0 ? (
          quotations.map((quote, idx) => {
            const quoteId = quote.quotation_number || quote.id;
            const customTitle = quote.title || (quote as any).content_json?.designName || 'Wedding - Design 1';
            const clientName = quote.client_name || activeCoupleName;

            return (
              <motion.div 
                key={quoteId || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* REAL DESIGN PAGE 1 PREVIEW THUMBNAIL */}
                  <div className="relative w-full overflow-hidden">
                    <QuotationCardThumbnail 
                      contentJson={(quote as any).content_json}
                      title={customTitle}
                      coupleName={clientName}
                    />
                    <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm z-30 ${
                      quote.is_system_template ? 'bg-amber-600/90' : 'bg-emerald-600/90'
                    }`}>
                      {quote.is_system_template ? 'System Preset' : (quote.is_default ? 'User Default' : (idx === 0 ? 'Active' : 'Saved'))}
                    </span>

                    {/* Top-Right DEFAULT Badge */}
                    {quote.is_default && (
                      <span className={`absolute top-2.5 ${!quote.is_system_template && quoteId !== 'FW-2WT85Y0' ? 'right-9' : 'right-2.5'} px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[9px] uppercase tracking-wider shadow-md z-30 flex items-center gap-1 border border-amber-300`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>DEFAULT</span>
                      </span>
                    )}

                    {/* Top-Right Delete Button (Enabled for User-Owned Templates AND Super Admin) */}
                    {(!quote.is_system_template || isSuperAdminUser) && (
                      <button
                        type="button"
                        title="Delete Template"
                        onClick={() => setDeletingQuote(quote)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-md backdrop-blur-xs transition-colors z-30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dynamic Custom Title & Base Preset Subtitle */}
                  <div className="p-3.5 space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" title={customTitle}>
                      {customTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                      {quote.is_system_template ? 'Global Default Wedding' : `Royale • Wedding (${clientName})`}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      type="button"
                      disabled={cloningGlobalId === quoteId}
                      onClick={() => handleEditTemplate(quote)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      {cloningGlobalId === quoteId ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                      ) : null}
                      <span>Preview</span>
                    </button>
                    
                    {/* Instant Duplication placed immediately after original design */}
                    <button 
                      type="button"
                      disabled={duplicatingId === quoteId}
                      onClick={() => handleDuplicateDesign(quote)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {duplicatingId === quoteId ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                          <span>Duplicating...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Duplicate</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Set as Default Button */}
                    <button 
                      type="button"
                      disabled={quote.is_default || settingDefaultId === quoteId}
                      onClick={() => handleSetAsDefault(quote)}
                      className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        quote.is_default
                          ? 'border-amber-300 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-extrabold cursor-default'
                          : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200'
                      }`}
                    >
                      {settingDefaultId === quoteId ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                      ) : quote.is_default ? (
                        <Check className="w-3 h-3 text-amber-600 stroke-[3]" />
                      ) : null}
                      <span>{quote.is_default ? 'Default' : 'Set Default'}</span>
                    </button>

                    {/* For Leads Button (FLOW B) */}
                    <button 
                      type="button"
                      onClick={() => openLeadSelectionModal(quote)}
                      className="px-2 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold text-center transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>For Leads</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={cloningGlobalId === quoteId}
                    onClick={() => handleEditTemplate(quote)}
                    className="w-full py-1.5 rounded-xl border border-amber-600/40 bg-gradient-to-r from-[#B88E4C] to-[#967236] text-white text-[11px] font-extrabold text-center flex items-center justify-center gap-1 shadow-xs hover:brightness-105 transition-all cursor-pointer"
                  >
                    {cloningGlobalId === quoteId ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    <span>Edit Template</span>
                  </button>

                  {/* SUPER ADMIN CONTROL BUTTON (Only for sushantnawale700@gmail.com) */}
                  {isSuperAdminUser && (
                    <button
                      type="button"
                      disabled={togglingSystemId === quoteId}
                      onClick={() => handleToggleSystemTemplate(quote)}
                      className={`w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        quote.is_system_template
                          ? 'bg-amber-500 hover:bg-amber-600 text-black border border-amber-400 font-extrabold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 font-bold'
                      }`}
                    >
                      {togglingSystemId === quoteId ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Crown className="w-3 h-3 fill-current" />
                      )}
                      <span>{quote.is_system_template ? 'System Template [ACTIVE]' : 'Publish for Users'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          /* Default Active Royale Card Fallback */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
          >
            <div>
              <div className="relative w-full overflow-hidden">
                <QuotationCardThumbnail 
                  title="Wedding - Design 1"
                  coupleName={activeCoupleName}
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm z-30">
                  Active
                </span>
              </div>

              <div className="p-3.5 space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  Wedding - Design 1
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  Royale • Wedding ({activeCoupleName})
                </p>
              </div>
            </div>

            <div className="p-3.5 pt-0 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => router.push(`/workspace/quotations/builder/templet/${activeQuotationId}`)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer"
                >
                  Preview
                </button>
                <button 
                  type="button"
                  disabled={duplicatingId === activeQuotationId}
                  onClick={() => handleDuplicateDesign({
                    id: activeQuotationId,
                    quotation_number: activeQuotationId,
                    title: 'Wedding - Design 1',
                    client_name: activeCoupleName,
                    financials: {},
                    status: 'draft',
                    updated_at: new Date().toISOString()
                  })}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {duplicatingId === activeQuotationId ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                      <span>Duplicating...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Duplicate</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => router.push('/workspace/clients')}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[10px] font-bold text-center transition-colors cursor-pointer"
                >
                  Use for Lead
                </button>

                <Link
                  href={`/workspace/quotations/builder/templet/${activeQuotationId}`}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-600/40 bg-gradient-to-r from-[#B88E4C] to-[#967236] text-white text-[11px] font-extrabold text-center block shadow-sm hover:brightness-105 transition-all"
                >
                  Edit
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* CARDS 2-5: Coming Soon Templates */}
        {[
          {
            id: 'cinematic',
            title: 'Cinematic',
            subtitle: 'Wedding & Film - 12 pages',
            image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'heritage',
            title: 'Heritage',
            subtitle: 'Royal & Classic - 10 pages',
            image: 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'heirloom',
            title: 'Heirloom',
            subtitle: 'Vintage & Fine Art - 14 pages',
            image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'vows',
            title: 'Vows',
            subtitle: 'Modern & Minimalist - 8 pages',
            image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80'
          }
        ].map(tmpl => (
          <motion.div 
            key={tmpl.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-sm flex flex-col justify-between relative select-none"
          >
            <div>
              <div className="relative h-40 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <img 
                  src={tmpl.image} 
                  alt={tmpl.title}
                  className="w-full h-full object-cover grayscale opacity-50 backdrop-blur-md"
                />
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase tracking-wider shadow-md border border-amber-300/40 select-none">
                    Coming Soon
                  </span>
                </div>
              </div>

              <div className="p-3.5 space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {tmpl.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  {tmpl.subtitle}
                </p>
              </div>
            </div>

            <div className="p-3.5 pt-0 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Preview
                </button>
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Duplicate
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Use for Lead
                </button>

                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-xl border border-amber-600/30 bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[11px] font-extrabold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Edit
                </button>
              </div>
            </div>
          </motion.div>
        ))}

      </div>

      {/* Saved Quotations List Drawer Modal */}
      <AnimatePresence>
        {showQuotationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Your Saved Quotations ({quotations.length} / 10)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    All created quotations are automatically saved to your account.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowQuotationsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search quotation..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredQuotations.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No saved quotations found.</p>
                    <button 
                      type="button"
                      onClick={() => { setShowQuotationsModal(false); router.push('/workspace/quotations/builder/templet/1'); }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      + Create New Quotation
                    </button>
                  </div>
                ) : (
                  filteredQuotations.map(q => (
                    <div 
                      key={q.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{q.title}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                            {q.quotation_number || 'FW-2026'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Client: <span className="font-bold text-slate-700 dark:text-zinc-200">{q.client_name}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {q.financials?.total_amount && (
                          <span className="text-xs font-black text-slate-900 dark:text-white hidden sm:inline">
                            ₹{q.financials.total_amount.toLocaleString()}
                          </span>
                        )}
                        <Link 
                          href="/workspace/quotations/builder/templet/1"
                          onClick={() => setShowQuotationsModal(false)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-zinc-800 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">Limit: Max 10 saved quotations</span>
                <button 
                  type="button"
                  onClick={() => setShowQuotationsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MasterMediaModal 
        isOpen={showGalleryModal} 
        onClose={() => setShowGalleryModal(false)} 
        userId={userId} 
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingQuote && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2.5 rounded-full bg-red-50 dark:bg-red-950/50">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Template?</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-slate-900 dark:text-white">"{deletingQuote.title}"</span>? This template will be permanently removed from your workspace. Existing client quotations created from it will remain intact.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingQuote(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Template</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Lead Selection Modal (FLOW B) */}
        {selectingLeadForTemplate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Create Quotation for Lead</h3>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[240px]">
                      Template: {selectingLeadForTemplate.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectingLeadForTemplate(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={leadSearchText}
                  onChange={(e) => setLeadSearchText(e.target.value)}
                  placeholder="Search leads by name..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Leads List */}
              <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[260px] space-y-2 pr-1">
                {loadingLeads ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className="text-xs font-semibold">Loading leads...</span>
                  </div>
                ) : leadOptions.filter(l => l.name?.toLowerCase().includes(leadSearchText.toLowerCase())).length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No leads found matching "{leadSearchText}".
                  </div>
                ) : (
                  leadOptions
                    .filter(l => l.name?.toLowerCase().includes(leadSearchText.toLowerCase()))
                    .map(lead => {
                      const isSelected = selectedLeadId === lead.id;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 shadow-sm'
                              : 'border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs font-extrabold truncate">{lead.name}</h4>
                            <p className="text-[10px] opacity-70 truncate">{lead.email || lead.phone || 'No contact details'}</p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-zinc-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Selected Lead Summary & Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                {selectedLeadId && (
                  <div className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                    <span>Selected Lead:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                      {leadOptions.find(l => l.id === selectedLeadId)?.name}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!selectedLeadId || creatingForLead}
                  onClick={handleCreateQuotationForSelectedLead}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-40 cursor-pointer"
                >
                  {creatingForLead ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Quotation...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>CREATE QUOTATION</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
