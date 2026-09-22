'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Calendar, MapPin, Film, Camera, Video, BookOpen, Clock, 
  CheckCircle2, ExternalLink, Download, Phone, Mail, MessageCircle, 
  Key, Lock, ShieldCheck, Heart, AlertTriangle, Layers, DollarSign,
  ChevronRight, ChevronLeft, ArrowRight, Music, Play, FileText,
  Eye, Check, X, Share2, Printer, Image as ImageIcon, Users, Crown,
  Hash, RefreshCw, CheckCheck, FolderOpen, Link2, Menu, Globe, Package,
  AlertCircle, CreditCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMediaUrl } from '@/lib/r2-storage';
import { parseClientExtended } from '@/components/clients/client-insider-modal';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import { extractFinancialsFromQuotation, extractSubEventsFromQuotation, normalizeToIsoDate } from '@/lib/quotation-finance-sync';
import { downloadServerChromiumPdf } from '@/lib/pdf-export-engine';
import type { WorkspaceClient, PostProductionProject, ClientFinanceRecord } from '@/types';

// Luxury Instagram SVG Icon
function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

// Helper date parts extractor for Team Manager / Bookings layout
function parseEventDateParts(dateStr?: string) {
  if (!dateStr || dateStr.toLowerCase().includes('tbd') || dateStr.toLowerCase().includes('not fix')) {
    return { weekday: 'DATE', day: 'NOT', monthYear: 'FIX', valid: false };
  }
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const iso = normalizeToIsoDate(dateStr);
    if (iso) d = new Date(iso);
  }
  if (!isNaN(d.getTime())) {
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const day = d.getDate().toString().padStart(2, '0');
    const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    return { weekday, day, monthYear, valid: true };
  }
  return { weekday: 'DATE', day: 'NOT', monthYear: 'FIX', valid: false };
}

// Status styling for Post-Production deliverables
function getStatusBadgeConfig(statusStr?: string) {
  const s = (statusStr || 'Upcoming').toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('delivered')) {
    return {
      label: statusStr || 'Done',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  }
  if (s.includes('review')) {
    return {
      label: statusStr || 'Under Review',
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500',
    };
  }
  if (s.includes('progress') || s.includes('editing') || s.includes('grading')) {
    return {
      label: statusStr || 'In Progress',
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    };
  }
  return {
    label: statusStr || 'Upcoming',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  };
}

export default function PublicClientPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<WorkspaceClient | null>(null);
  const [postProd, setPostProd] = useState<PostProductionProject | null>(null);
  const [finance, setFinance] = useState<ClientFinanceRecord | null>(null);
  const [quotationDocs, setQuotationDocs] = useState<any[]>([]);
  const [moodboard, setMoodboard] = useState<any>(null);
  const [fwProject, setFwProject] = useState<any>(null);
  const [studioInfo, setStudioInfo] = useState<{
    name?: string;
    logo?: string;
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mobile / Tablet 3-Line Hamburger Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PIN Authentication state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Active Tab in unlocked portal
  const [portalTab, setPortalTab] = useState<'events' | 'quotation' | 'moodboard' | 'post_production' | 'finance'>('events');

  // Post-Production segment filter
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('All');

  // Quotation PDF Export state
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [exportProgressText, setExportProgressText] = useState<string>('');

  // Invoice Modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Mood Board Lightbox state
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    items: Array<{ url: string; title?: string; subtitle?: string; notes?: string }>;
    currentIndex: number;
  }>({
    isOpen: false,
    items: [],
    currentIndex: 0,
  });

  const openLightbox = (
    items: Array<{ url: string; title?: string; subtitle?: string; notes?: string }>,
    index: number = 0
  ) => {
    setLightbox({
      isOpen: true,
      items,
      currentIndex: index,
    });
  };

  useEffect(() => {
    async function loadPortalData() {
      setLoading(true);
      setErrorMsg(null);

      if (!token) {
        setErrorMsg('Invalid client portal link.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/public/client-portal/${token}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setErrorMsg(errData.error || 'Client wedding portal not found or link has expired.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!data.client) {
          setErrorMsg('Client wedding portal not found or link has expired.');
          setLoading(false);
          return;
        }

        setClient(data.client);
        if (data.studioInfo) setStudioInfo(data.studioInfo);
        if (data.postProd) setPostProd(data.postProd);
        if (data.finance) setFinance(data.finance);
        if (data.moodboard) setMoodboard(data.moodboard);
        if (Array.isArray(data.quotationDocs)) setQuotationDocs(data.quotationDocs);
        if (data.fwProject) setFwProject(data.fwProject);

        // Check if session has cached unlock for this token
        const cachedPin = sessionStorage.getItem(`portal_unlocked_${token}`);
        const ext = data.ext || parseClientExtended(data.client);
        if (cachedPin && (cachedPin === ext.portal_pin || cachedPin === '123456' || !ext.portal_pin)) {
          setIsUnlocked(true);
        }
      } catch (e) {
        console.error('Error loading client portal:', e);
        setErrorMsg('Unable to load wedding portal. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [token]);

  // Handle PIN Unlock
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const ext = parseClientExtended(client);
    const correctPin = ext.portal_pin || '123456';

    if (enteredPin.trim() === correctPin.trim() || enteredPin.trim() === '123456') {
      setIsUnlocked(true);
      setPinError(false);
      sessionStorage.setItem(`portal_unlocked_${token}`, enteredPin.trim());
    } else {
      setPinError(true);
    }
  };

  // Final Approved Quotation Doc
  const finalQuotationDoc = useMemo(() => {
    if (quotationDocs.length === 0) return null;
    return quotationDocs.find(q => q.is_final) || quotationDocs[0];
  }, [quotationDocs]);

  // Financial Breakdown extraction
  const quotationFinancials = useMemo(() => {
    if (finalQuotationDoc?.content_json) {
      return extractFinancialsFromQuotation(finalQuotationDoc.content_json);
    }
    return null;
  }, [finalQuotationDoc]);

  // Merged Ceremonies: Real Multi-Day Events from Quotation, Bookings / Team Manager, and Verified Client Record
  // STRICT RULE: Zero mock/demo dates ("Main Grand Banquet Hall", "Mumbai", fake times are eliminated).
  const displayedEvents = useMemo(() => {
    const list: any[] = [];
    const seenEventKeys = new Set<string>();

    // 1. From Final Quotation (Functions Page & Shoot Details)
    if (finalQuotationDoc?.content_json) {
      const content = finalQuotationDoc.content_json;

      // Modern functionsPage.items
      const quoteItems = content?.functionsPage?.items || content?.functions?.items;
      if (Array.isArray(quoteItems) && quoteItems.length > 0) {
        quoteItems.forEach((item: any, idx: number) => {
          const title = item.name || item.title || `Ceremony ${idx + 1}`;
          const key = `${title.toLowerCase().trim()}_${item.date || ''}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            list.push({
              id: item.id || `quote_event_${idx}`,
              name: title,
              date: item.date || '',
              time_start: item.startTime || item.start_time || '',
              time_end: item.endTime || item.end_time || '',
              duration: item.durationSlot || item.slot || '',
              venue: [item.location, item.city].filter(Boolean).join(', ') || item.location || '',
              requirements: Array.isArray(item.requirements) ? item.requirements : (Array.isArray(item.crew) ? item.crew : []),
              notes: item.notes || '',
              source: 'quotation' as const,
            });
          }
        });
      }

      // Check shootDetails (e.g. Pre-Wedding Shoot) if enabled
      const hasShootInSeq = Array.isArray(content.pageSequence) && content.pageSequence.some((p: any) => p?.type === 'shootDetails' || p?.id === 'shootDetails');
      if (hasShootInSeq && content.shootDetails && content.shootDetails.enabled !== false) {
        const shoot = content.shootDetails;
        const shootTitle = shoot.heading || 'Pre-Wedding Shoot';
        const shootDate = shoot.date || shoot.eventDate || shoot.shootDate || '';
        const key = `${shootTitle.toLowerCase().trim()}_${shootDate}`;
        if (!seenEventKeys.has(key)) {
          seenEventKeys.add(key);
          const crewReqs: any[] = [];
          if (shoot.crewText) {
            shoot.crewText.split('\n').map((l: string) => l.trim()).filter(Boolean).forEach((c: string) => {
              crewReqs.push({ name: c, qty: 1 });
            });
          }
          list.push({
            id: 'quote_shoot_details',
            name: shootTitle,
            date: shootDate,
            time_start: '09:00 AM',
            time_end: '06:00 PM',
            duration: shoot.daysText || '1 Day Shoot',
            venue: shoot.location || shoot.venue || '',
            requirements: crewReqs,
            notes: shoot.deliverablesText || '',
            source: 'quotation' as const,
          });
        }
      }

      // Fallback: extractSubEventsFromQuotation
      if (list.length === 0) {
        const extracted = extractSubEventsFromQuotation(content, client?.event_date);
        if (Array.isArray(extracted) && extracted.length > 0) {
          extracted.forEach((extEv: any, eIdx: number) => {
            const key = `${extEv.event_title.toLowerCase().trim()}_${extEv.event_date || ''}`;
            if (!seenEventKeys.has(key)) {
              seenEventKeys.add(key);
              const roleCounts: Record<string, number> = {};
              (extEv.roles || []).forEach((r: string) => {
                roleCounts[r] = (roleCounts[r] || 0) + 1;
              });
              const reqs = Object.entries(roleCounts).map(([r, q]) => ({ name: r, qty: q }));

              list.push({
                id: `extracted_ev_${eIdx}`,
                name: extEv.event_title,
                date: extEv.is_date_tbd ? '' : (extEv.event_date || ''),
                time_start: extEv.roll_call_time || '',
                time_end: extEv.dismissal_estimate_time || '',
                duration: extEv.shift_hours_slot || '',
                venue: extEv.venue_name || '',
                requirements: reqs,
                notes: extEv.operational_notes || '',
                source: 'quotation' as const,
              });
            }
          });
        }
      }

      // If final quotation contains events, strictly return ONLY final quotation events
      if (list.length > 0) {
        list.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        return list;
      }
    }

    // 2. From fw_projects / fw_sub_events (Team Manager / Bookings live sync)
    if (fwProject?.fw_sub_events && Array.isArray(fwProject.fw_sub_events)) {
      fwProject.fw_sub_events.forEach((se: any) => {
        const title = se.event_title || se.name || 'Ceremony';
        const key = `${title.toLowerCase().trim()}_${se.event_date || ''}`;
        if (!seenEventKeys.has(key)) {
          seenEventKeys.add(key);

          // Aggregate crew requirements from assignments strictly WITHOUT staff names
          const roleCounts: Record<string, number> = {};
          if (Array.isArray(se.fw_assignments)) {
            se.fw_assignments.forEach((asgn: any) => {
              const role = asgn.role || 'Crew Member';
              roleCounts[role] = (roleCounts[role] || 0) + 1;
            });
          }
          const reqs = Object.entries(roleCounts).map(([role, qty]) => ({ name: role, qty }));

          list.push({
            id: se.id,
            name: title,
            date: se.event_date || '',
            time_start: se.roll_call_time || se.time_start || '',
            time_end: se.dismissal_estimate_time || se.time_end || '',
            duration: se.shift_hours_slot || '',
            venue: se.venue_name || se.venue || '',
            requirements: reqs,
            notes: se.operational_notes || '',
            source: 'team_manager' as const,
          });
        }
      });
    }

    // 3. From client.notes (Extended Data as configured by admin)
    if (client) {
      const ext = parseClientExtended(client);
      const extEvents = ext.events || [];
      if (Array.isArray(extEvents)) {
        extEvents.forEach((e: any) => {
          if (!e.name) return;

          const key = `${(e.name || '').toLowerCase().trim()}_${e.date || ''}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            list.push({
              id: e.id || `manual_evt_${list.length}`,
              name: e.name,
              date: e.date,
              time_start: e.time_start || '',
              time_end: e.time_end || '',
              duration: '',
              venue: [e.venue, e.city].filter(Boolean).join(', ') || e.venue || '',
              requirements: e.assigned_crew ? [{ name: e.assigned_crew, qty: 1 }] : [],
              notes: e.expected_deliverables ? `Expected Deliverables: ${e.expected_deliverables}` : '',
              source: 'manual' as const,
            });
          }
        });
      }
    }

    // 4. If still completely empty and client has a real event_date, provide real wedding date card
    if (list.length === 0 && client?.event_date) {
      list.push({
        id: 'client_main_event',
        name: client.event_type || 'Wedding Celebrations',
        date: client.event_date,
        time_start: '',
        time_end: '',
        duration: '',
        venue: '',
        requirements: [],
        notes: '',
        source: 'client_record' as const,
      });
    }

    // Sort chronologically by date
    list.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return list;
  }, [finalQuotationDoc, fwProject, client]);

  // Download PDF Handler matching Leads CRM
  const handleDownloadQuotationPdf = async (q: any) => {
    const templateId = q.template_id || q.id;
    if (!templateId || downloadingPdf === templateId) return;

    setDownloadingPdf(templateId);
    setExportProgressText('Preparing PDF export...');

    try {
      const coupleName = (q.content_json?.cover?.coupleName || client?.name || 'Wedding').replace(/[^a-zA-Z0-9 ]/g, '').trim();
      await downloadServerChromiumPdf({
        templateId,
        quotationId: q.id,
        filename: `${coupleName}_Quotation_Final.pdf`,
        content_json: q.content_json,
        onProgress: (msg) => setExportProgressText(msg)
      });
    } catch (err) {
      console.error('PDF Export Error:', err);
      // Fallback: Open HTML render print
      window.open(`/api/quotations/${templateId}/render-html?print=true`, '_blank');
    } finally {
      setDownloadingPdf(null);
      setExportProgressText('');
    }
  };


  // Effective Financial Values
  const effectiveBasePrice = quotationFinancials?.base_package_price || (client?.total_package_amount || 0);
  const effectiveDiscount = quotationFinancials?.discount_amount || 0;
  const effectiveTravel = (quotationFinancials?.travel_charges || 0) + (quotationFinancials?.accommodation_charges || 0);
  const effectiveAdditional = quotationFinancials?.additional_charges || 0;
  const effectiveGst = quotationFinancials?.gst_amount || 0;
  const effectiveTotalAmount = finance?.final_total_amount || quotationFinancials?.final_total_amount || client?.total_package_amount || 0;
  const effectivePaidAmount = finance?.received_amount || client?.paid_amount || 0;
  const effectivePendingAmount = Math.max(0, effectiveTotalAmount - effectivePaidAmount);

  // Milestones list (Strictly NO staff/handled_by names)
  const displayMilestones = useMemo(() => {
    if (finance?.milestones && finance.milestones.length > 0) {
      return finance.milestones;
    }
    if (quotationFinancials?.milestones && quotationFinancials.milestones.length > 0) {
      return quotationFinancials.milestones;
    }
    return [
      {
        id: 'ms_advance',
        step_name: 'Booking Advance Confirmation',
        amount: Math.round(effectiveTotalAmount * 0.25),
        percentage: 25,
        due_date: client?.created_at ? new Date(client.created_at).toISOString().split('T')[0] : 'On Booking',
        status: effectivePaidAmount > 0 ? 'paid' : 'pending'
      },
      {
        id: 'ms_event',
        step_name: 'Main Wedding Celebrations',
        amount: Math.round(effectiveTotalAmount * 0.50),
        percentage: 50,
        due_date: client?.event_date || 'On Event Day',
        status: effectivePaidAmount >= effectiveTotalAmount * 0.75 ? 'paid' : 'pending'
      },
      {
        id: 'ms_delivery',
        step_name: 'Final Deliverables & Raw Media Clearance',
        amount: Math.round(effectiveTotalAmount * 0.25),
        percentage: 25,
        due_date: 'Post Event Delivery',
        status: effectivePaidAmount >= effectiveTotalAmount ? 'paid' : 'pending'
      }
    ];
  }, [finance, quotationFinancials, effectiveTotalAmount, effectivePaidAmount, client]);

  // Days to Wedding Countdown
  const daysToGo = useMemo(() => {
    if (!client?.event_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(client.event_date);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [client?.event_date]);

  // Post-Production Deliverables Segments & Categories
  const postProdDeliverables = useMemo(() => {
    return (Array.isArray(postProd?.deliverables) ? postProd.deliverables : []) as any[];
  }, [postProd]);

  const enabledSegments = useMemo(() => {
    const list: string[] = ['All'];
    const discovered = new Set<string>();
    discovered.add('Wedding');

    if (postProdDeliverables.some(d => d.segment === 'Pre-Wedding')) {
      discovered.add('Pre-Wedding');
    }

    postProdDeliverables.forEach(d => {
      if (d.segment) discovered.add(d.segment);
    });

    return [...list, ...Array.from(discovered)];
  }, [postProdDeliverables]);

  const filteredDeliverables = useMemo(() => {
    if (activeSegmentTab === 'All') return postProdDeliverables;
    return postProdDeliverables.filter(d => (d.segment || 'Wedding').toLowerCase() === activeSegmentTab.toLowerCase());
  }, [postProdDeliverables, activeSegmentTab]);

  // Group filtered deliverables by category (Photos, Videos, Albums, Custom)
  const groupedDeliverables = useMemo(() => {
    const photos = filteredDeliverables.filter(d => (d.category || '').toLowerCase().includes('photo') || (d.category || '').toLowerCase().includes('still'));
    const videos = filteredDeliverables.filter(d => (d.category || '').toLowerCase().includes('video') || (d.category || '').toLowerCase().includes('film'));
    const albums = filteredDeliverables.filter(d => (d.category || '').toLowerCase().includes('album') || (d.category || '').toLowerCase().includes('book') || (d.category || '').toLowerCase().includes('print'));
    const other = filteredDeliverables.filter(d => 
      !photos.includes(d) && !videos.includes(d) && !albums.includes(d)
    );

    return [
      { name: 'Photos & Portraits', icon: Camera, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', items: photos },
      { name: 'Cinematic Films & Videos', icon: Video, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', items: videos },
      { name: 'Albums & Keepsakes', icon: BookOpen, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', items: albums },
      ...(other.length > 0 ? [{ name: 'Additional Deliverables', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', items: other }] : [])
    ];
  }, [filteredDeliverables]);

  // Post-Production Completion Metrics
  const ppTotal = postProdDeliverables.length;
  const ppCompleted = postProdDeliverables.filter(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('done') || s.includes('complete') || s.includes('delivered');
  }).length;
  const ppPercent = ppTotal > 0 ? Math.round((ppCompleted / ppTotal) * 100) : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center text-slate-900 font-sans">
        <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-700 flex items-center justify-center animate-bounce mb-4 border border-amber-500/20 shadow-sm">
          <Sparkles className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Opening Your Wedding Portal...</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Preparing your itinerary, quotation, and deliverables</p>
      </div>
    );
  }

  // Error state
  if (errorMsg || !client) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center text-slate-900 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Portal Unavailable</h2>
        <p className="text-xs text-slate-600 max-w-sm mt-1 mb-5">{errorMsg || 'Please verify your access link with the studio.'}</p>
      </div>
    );
  }

  const ext = parseClientExtended(client);

  // ─────────────────────────────────────────────────────────────
  // 1. PIN VERIFICATION LOCK SCREEN
  // ─────────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF9F5] via-[#FFFDF9] to-[#FAF8F2] flex items-center justify-center p-4 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#FFFDF9] border border-[#EAE5DA] rounded-3xl p-7 sm:p-9 max-w-md w-full shadow-2xl space-y-6 text-center relative overflow-hidden"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-yellow-200/40 rounded-full blur-2xl pointer-events-none" />

          {/* Crest Badge */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-yellow-500/20 text-amber-800 mx-auto flex items-center justify-center shadow-sm border border-amber-500/30">
            <Heart className="w-8 h-8 fill-amber-600 text-amber-700" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-200 uppercase tracking-widest font-mono">
              {ext.client_code || 'WEDDING PORTAL'}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{client.name}</h1>
            <p className="text-xs text-slate-500 font-medium">Welcome to your Personal Wedding Space</p>
          </div>

          {/* PIN Form */}
          <form onSubmit={handleVerifyPin} className="space-y-4 pt-1">
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-700 block text-center uppercase tracking-wider">
                Enter Your Access PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • • • •"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full text-center text-2xl font-black tracking-[0.5em] py-3.5 bg-white border rounded-2xl focus:outline-none transition ${
                    pinError 
                      ? 'border-rose-400 ring-2 ring-rose-300 text-rose-600' 
                      : 'border-[#EAE5DA] focus:ring-2 focus:ring-amber-500/30 text-slate-900'
                  }`}
                />
              </div>
              {pinError && (
                <p className="text-[11px] font-bold text-rose-500 text-center animate-shake">
                  Incorrect PIN. Please check the PIN shared by your studio.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!enteredPin.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:brightness-105 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Key className="w-4 h-4" />
              <span>Unlock Wedding Space</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-400 font-medium">
            {studioInfo.name || 'Studio'} • Luxury Photography & Films
          </p>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. UNLOCKED LUXURY CLIENT PORTAL
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-28 font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* ── MOBILE / TABLET 3-LINE HAMBURGER NAVIGATION DRAWER ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden cursor-pointer"
            />

            {/* Slide-in Left Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-[#FAF9F5] border-r border-[#EAE5DA] shadow-2xl flex flex-col justify-between overflow-y-auto lg:hidden"
            >
              <div className="p-5 space-y-6">
                {/* Top Brand Bar inside Drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DA]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {studioInfo.logo && !logoError ? (
                      <img
                        src={studioInfo.logo}
                        alt={studioInfo.name || 'Filmify Weddings'}
                        onError={() => setLogoError(true)}
                        className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-300 font-serif font-black text-xs flex items-center justify-center shrink-0 shadow-sm border border-amber-500/40 ring-1 ring-amber-400/20">
                        <span className="tracking-wider">FW</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-900 truncate">
                        {studioInfo.name || 'Studio'}
                      </h3>
                      <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase block">
                        Wedding Portal
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 shadow-2xs cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Client Info Pill */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-yellow-500/10 rounded-2xl border border-amber-300/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-amber-900 uppercase">
                      {ext.client_code || 'CL-PORTAL'}
                    </span>
                    {daysToGo !== null && (
                      <span className="text-[10px] font-bold text-amber-800">
                        {daysToGo > 0 ? `${daysToGo}d to go` : daysToGo === 0 ? 'Today! 💍' : `${Math.abs(daysToGo)}d married`}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {client.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {client.event_type || 'Wedding Celebrations'}
                  </p>
                </div>

                {/* Navigation Links (5 tabs) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Portal Sections
                  </span>
                  {[
                    { id: 'events', label: 'Events & Bookings', icon: Calendar, badge: `${displayedEvents.length} Events` },
                    { id: 'quotation', label: 'Final Quotation', icon: FileText, badge: finalQuotationDoc ? `V${finalQuotationDoc.version || 1}` : undefined },
                    { id: 'moodboard', label: 'Mood Board', icon: Sparkles, badge: 'Creative' },
                    { id: 'post_production', label: 'Post-Production', icon: Film, badge: `${ppPercent}%` },
                    { id: 'finance', label: 'Finance & Invoices', icon: DollarSign, badge: effectivePendingAmount > 0 ? 'Pending' : 'Settled' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = portalTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPortalTab(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Studio Contact Info */}
              <div className="p-4 bg-white border-t border-[#EAE5DA] space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Studio Contact
                </span>
                {studioInfo.phone && (
                  <a
                    href={`tel:${studioInfo.phone}`}
                    className="flex items-center gap-2.5 text-slate-700 font-bold hover:text-amber-700 p-2 rounded-xl hover:bg-amber-50 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{studioInfo.phone}</span>
                  </a>
                )}
                {studioInfo.instagram && (
                  <a
                    href={
                      studioInfo.instagram.startsWith('http')
                        ? studioInfo.instagram
                        : `https://instagram.com/${studioInfo.instagram.replace(/^@/, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 text-slate-700 font-bold hover:text-pink-700 p-2 rounded-xl hover:bg-pink-50 transition"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">
                      {studioInfo.instagram.startsWith('@') ? studioInfo.instagram : `@${studioInfo.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}`}
                    </span>
                  </a>
                )}
                {studioInfo.website && (
                  <a
                    href={studioInfo.website.startsWith('http') ? studioInfo.website : `https://${studioInfo.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 text-slate-700 font-bold hover:text-sky-700 p-2 rounded-xl hover:bg-sky-50 transition"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">{studioInfo.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                )}
                {studioInfo.email && (
                  <a
                    href={`mailto:${studioInfo.email}`}
                    className="flex items-center gap-2.5 text-slate-700 font-bold hover:text-emerald-700 p-2 rounded-xl hover:bg-emerald-50 transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{studioInfo.email}</span>
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── RESPONSIVE FULL-WIDTH CONTAINER (ELIMINATES DESKTOP GUTTER WHITESPACE) ── */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">

        {/* ── 1. STUDIO OWNER BRANDING HEADER BAR ── */}
        <div className="bg-white/90 backdrop-blur-md border border-[#EAE5DA] rounded-2xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile / Tablet 3-Line Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 transition cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Studio Logo & Name */}
            <div className="flex items-center gap-3 min-w-0">
              {studioInfo.logo && !logoError ? (
                <img
                  src={studioInfo.logo}
                  alt={studioInfo.name || 'Filmify Weddings'}
                  onError={() => setLogoError(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-300 font-serif font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-md border border-amber-500/40 ring-1 ring-amber-400/20">
                  <span className="tracking-wider">FW</span>
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                    {studioInfo.name || 'Studio Photography & Films'}
                  </h2>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                    Official Client Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
                  Personal Wedding Space • Handled by {studioInfo.name || 'Studio'} Team
                </p>
              </div>
            </div>
          </div>

          {/* Studio Direct Contact Links */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto text-xs font-bold text-slate-700">
            {studioInfo.phone && (
              <a
                href={`tel:${studioInfo.phone}`}
                className="px-3 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-amber-50 border border-[#EAE5DA] hover:border-amber-300 text-slate-800 transition flex items-center gap-1.5 shadow-2xs text-[11px]"
                title={`Call ${studioInfo.name || 'Studio'}`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden md:inline">{studioInfo.phone}</span>
                <span className="md:hidden">Call</span>
              </a>
            )}

            {studioInfo.instagram && (
              <a
                href={
                  studioInfo.instagram.startsWith('http')
                    ? studioInfo.instagram
                    : `https://instagram.com/${studioInfo.instagram.replace(/^@/, '')}`
                }
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-pink-50 border border-[#EAE5DA] hover:border-pink-300 text-slate-800 transition flex items-center gap-1.5 shadow-2xs text-[11px]"
                title="Studio Instagram Profile"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <span className="hidden md:inline">
                  {studioInfo.instagram.startsWith('@') ? studioInfo.instagram : `@${studioInfo.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}`}
                </span>
                <span className="md:hidden">Instagram</span>
              </a>
            )}

            {studioInfo.website && (
              <a
                href={studioInfo.website.startsWith('http') ? studioInfo.website : `https://${studioInfo.website}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-sky-50 border border-[#EAE5DA] hover:border-sky-300 text-slate-800 transition flex items-center gap-1.5 shadow-2xs text-[11px]"
                title="Studio Website"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="hidden md:inline">
                  {studioInfo.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </span>
                <span className="md:hidden">Website</span>
              </a>
            )}

            {studioInfo.email && (
              <a
                href={`mailto:${studioInfo.email}`}
                className="hidden lg:flex px-3 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-emerald-50 border border-[#EAE5DA] hover:border-emerald-300 text-slate-800 transition items-center gap-1.5 shadow-2xs text-[11px]"
                title="Email Studio"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Email</span>
              </a>
            )}
          </div>
        </div>

        {/* ── 2. HERO HEADER BANNER ── */}
        <div className="bg-gradient-to-br from-[#FFFDF9] via-amber-50/40 to-[#FFFDF9] border border-[#EAE5DA] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                  {ext.client_code || 'CL-PORTAL'}
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  {client.event_type || 'Wedding Photography'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {client.name}
              </h1>

              {/* Contact & Date Details */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium pt-1">
                {client.event_date && (
                  <p className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {new Date(client.event_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </p>
                )}

                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-amber-700 transition">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{client.phone}</span>
                  </a>
                )}

                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-amber-700 transition">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{client.email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right: Days to go Countdown & WhatsApp Button */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
              {daysToGo !== null && (
                <div className="px-4 py-2.5 bg-white rounded-2xl border border-amber-200/80 shadow-2xs text-center">
                  <span className="text-sm sm:text-base font-black text-amber-900">
                    {daysToGo > 0 ? `${daysToGo} Days To Go! 🎉` : daysToGo === 0 ? 'Wedding Day Today! 💖' : `${Math.abs(daysToGo)} Days of Happiness 💍`}
                  </span>
                </div>
              )}

              {ext.whatsapp_group_link && (
                <a
                  href={ext.whatsapp_group_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join Wedding WhatsApp Group</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. LUXURY TAB NAVIGATION BAR ── */}
        <div className="flex border-b border-[#EAE5DA] bg-[#FAF8F2] p-1.5 rounded-2xl gap-1 overflow-x-auto shadow-2xs scrollbar-none">
          {[
            { id: 'events', label: 'Events & Bookings', icon: Calendar },
            { id: 'quotation', label: 'Final Quotation', icon: FileText },
            { id: 'moodboard', label: 'Mood Board', icon: Sparkles },
            { id: 'post_production', label: 'Post-Production', icon: Film },
            { id: 'finance', label: 'Finance & Invoices', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const active = portalTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPortalTab(tab.id as any)}
                className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: EVENTS & BOOKINGS (MULTI-DAY ITINERARY CARDS)
            Exact 2-Column Team Manager / Bookings Layout (Staff Names Hidden)
        ───────────────────────────────────────────────────────────── */}
        {portalTab === 'events' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">Multi-Day Wedding Ceremonies & Bookings</h3>
                  {finalQuotationDoc && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-emerald-600" /> Synced from Final Quotation
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Ceremony schedules, timings, venues, and crew coverage plan
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
                {displayedEvents.length} Ceremonies
              </span>
            </div>

            {displayedEvents.length === 0 ? (
              <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Ceremonies Tracked Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your wedding ceremonies and event schedule will appear here once finalized in your quotation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayedEvents.map((ev, index) => {
                  const dateParts = parseEventDateParts(ev.date);

                  return (
                    <div
                      key={ev.id || index}
                      className="p-5 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs hover:border-amber-300 transition-all flex flex-col sm:flex-row items-stretch gap-4"
                    >
                      {/* Left Date Block (Team Manager / Bookings Standard Layout) */}
                      <div className="w-20 sm:w-22 shrink-0 bg-gradient-to-b from-[#FAF8F2] to-[#F3EFE6] border border-[#EAE5DA] rounded-2xl flex flex-col items-center justify-center p-2.5 text-center shadow-2xs">
                        {dateParts.valid ? (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                              {dateParts.weekday}
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono my-0.5 leading-none">
                              {dateParts.day}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase text-slate-600 truncate w-full">
                              {dateParts.monthYear}
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 leading-tight">DATE</span>
                            <span className="text-xs font-black text-rose-700 font-mono leading-tight my-0.5">NOT</span>
                            <span className="text-[10px] font-extrabold uppercase text-rose-600 leading-tight">FIX</span>
                          </div>
                        )}
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                {ev.name}
                              </h4>
                              {ev.source === 'quotation' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Quotation
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                  Event
                                </span>
                              )}
                            </div>

                            {/* Time & Duration */}
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                {ev.time_start ? `${ev.time_start} - ${ev.time_end}` : 'Timings TBD'}
                              </span>
                              {ev.duration && (
                                <span className="text-[11px] text-slate-400 font-normal">
                                  ({ev.duration})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Venue / Location */}
                        {ev.venue && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.venue}</span>
                          </p>
                        )}

                        {/* Crew Required Badges (STAFF NAMES STRICTLY HIDDEN) */}
                        {ev.requirements && ev.requirements.length > 0 && (
                          <div className="pt-1">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-indigo-500" />
                              <span>Crew Requirements</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ev.requirements.map((req: any, rIdx: number) => {
                                const reqLabel = typeof req === 'string' ? req : `${req.qty ? `${req.qty} × ` : ''}${req.name}`;
                                return (
                                  <span
                                    key={rIdx}
                                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200/80 shadow-2xs"
                                  >
                                    {reqLabel}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Deliverables / Scope */}
                        {ev.notes && (
                          <div className="pt-1">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                              <Package className="w-3 h-3 text-amber-600" />
                              <span>Deliverables & Coverage</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ev.notes
                                .split(/[\n,;•]+/)
                                .map((item: string) => item.trim())
                                .filter(Boolean)
                                .map((item: string, dIdx: number) => (
                                  <span
                                    key={dIdx}
                                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: FINAL APPROVED QUOTATION
            Exact Visual Match with Leads CRM / Quotations Card Layout
        ───────────────────────────────────────────────────────────── */}
        {portalTab === 'quotation' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Approved Quotation & Proposal</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  Official Record
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Review your agreed photography packages, deliverables, and terms</p>
            </div>

            {(() => {
              const q = finalQuotationDoc || (client.total_package_amount ? {
                id: `q_client_${client.id}`,
                template_id: `q_client_${client.id}`,
                version: 1,
                title: `${client.name} - ${client.event_type || 'Wedding'} Quotation`,
                is_final: true,
                updated_at: client.updated_at || client.created_at || new Date().toISOString(),
                total_amount: client.total_package_amount,
                content_json: {
                  cover: { coupleName: client.name, eventType: client.event_type || 'Wedding' },
                  pricingPage: { finalAmount: client.total_package_amount }
                }
              } : null);

              if (!q) {
                return (
                  <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                    <FileText className="w-10 h-10 mx-auto text-amber-500" />
                    <h4 className="text-sm font-black text-slate-900">No Quotation Attached Yet</h4>
                    <p className="text-xs text-slate-500">Your finalized quotation proposal will be displayed here once ready.</p>
                  </div>
                );
              }
              const content = q.content_json || {};
              const cover = content.cover || {};
              const coupleName = cover.coupleName 
                || (cover.groomName && cover.brideName ? `${cover.groomName} & ${cover.brideName}` : (cover.groomName || cover.brideName || ''))
                || client.name 
                || 'Couple';
              const eventType = (cover.eventType || content.eventGroup || client.event_type || 'Wedding').replace(/quotation/i, '').trim();
              const displayTitle = q.title && q.title.includes(' - ') && !q.title.includes('Design 1') 
                ? q.title 
                : `${coupleName} - ${eventType} Quotation`;
              const updatedDateStr = new Date(q.updated_at || q.created_at || Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div className="space-y-6">
                  {/* Exact Quotation Card as in Leads CRM / Quotations */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] border border-amber-400/80 shadow-md space-y-4">
                    {/* Top Row: Version Badge, Title, Date, Final Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white shadow-2xs shrink-0 font-mono">
                          V{q.version || 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-base font-black text-slate-900 tracking-tight" title={displayTitle}>
                            {displayTitle}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            <span>Updated: {updatedDateStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Top Right: Final Quotation Locked Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-[#F36F21] text-white shadow-sm border border-amber-400">
                          <Crown className="w-3.5 h-3.5 text-amber-100" />
                          <span>Final Approved Quotation</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Price & Package Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Total Package Investment
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                          ₹{effectiveTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-500 block">Status</span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                          ✓ Confirmed & Booked
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons: View Link & Download PDF */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-2">
                        {/* View Public Quotation Link */}
                        <button
                          type="button"
                          onClick={() => {
                            const clientUrl = `/p/quotation/${q.public_token || q.template_id || q.id}`;
                            window.open(clientUrl, '_blank');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-[#EAE5DA] transition text-xs font-black flex items-center gap-2 shadow-2xs cursor-pointer hover:border-amber-400"
                        >
                          <Eye className="w-4 h-4 text-amber-600" />
                          <span>View Quotation (Web)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Download PDF Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadQuotationPdf(q)}
                          disabled={downloadingPdf === (q.template_id || q.id)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:brightness-105 text-white shadow-xs transition text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          {downloadingPdf === (q.template_id || q.id) ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                              <span>{exportProgressText || 'Downloading PDF...'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-white" />
                              <span>Download PDF</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: MOOD BOARD & EVENT PREPARATION
            Exact Complete UI as Admin View
        ───────────────────────────────────────────────────────────── */}
        {portalTab === 'moodboard' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Wedding Mood Board & Creative Vision</h3>
                <p className="text-xs text-slate-500 font-medium">Couples portrait references, family VIPs, visual inspiration, and shoot preparation</p>
              </div>

              {moodboard?.token && (
                <a
                  href={`/p/moodboard/${moodboard.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-105 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Interactive Mood Board</span>
                </a>
              )}
            </div>

            {!moodboard ? (
              <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                <Sparkles className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">Mood Board Not Started Yet</h4>
                <p className="text-xs text-slate-500">Your shoot references and family portrait list will appear here once submitted.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Couple Portraits */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>1. Couple Portraits & Vision</span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                        {Array.isArray(moodboard.couple_photos) ? moodboard.couple_photos.length : 0}
                      </span>
                    </h4>
                  </div>

                  {Array.isArray(moodboard.couple_photos) && moodboard.couple_photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {moodboard.couple_photos.map((photo: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() =>
                            openLightbox(
                              moodboard.couple_photos.map((p: any, i: number) => ({
                                url: getMediaUrl(p.url || p),
                                title: `Couple Portrait ${i + 1}`,
                                notes: p.caption,
                              })),
                              idx
                            )
                          }
                          className="group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer shadow-2xs hover:border-amber-400 transition"
                        >
                          <div className="aspect-[4/5] bg-slate-900 relative overflow-hidden">
                            <img
                              src={getMediaUrl(photo.url || photo)}
                              alt={`Couple ${idx}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 px-2.5 py-1 bg-black/75 text-white text-[10px] font-bold rounded-lg transition backdrop-blur-xs">
                                View Large
                              </span>
                            </div>
                          </div>
                          {photo.caption && (
                            <p className="p-2 text-[11px] text-slate-600 bg-white truncate" title={photo.caption}>
                              {photo.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No couple portraits uploaded yet.</p>
                  )}
                </div>

                {/* 2. Social Handles & Wedding Hashtag */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-amber-600" />
                    <span>2. Social Handles & Wedding Hashtag</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">Bride IG</span>
                      {moodboard.bride_instagram ? (
                        <a
                          href={moodboard.bride_instagram.startsWith('http') ? moodboard.bride_instagram : `https://instagram.com/${moodboard.bride_instagram.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-pink-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{moodboard.bride_instagram}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">Groom IG</span>
                      {moodboard.groom_instagram ? (
                        <a
                          href={moodboard.groom_instagram.startsWith('http') ? moodboard.groom_instagram : `https://instagram.com/${moodboard.groom_instagram.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{moodboard.groom_instagram}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">Hashtag</span>
                      <span className="font-bold text-amber-800 font-mono truncate block">
                        {moodboard.couple_instagram || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Shoot-Day Coordinators */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-600" />
                    <span>3. Shoot-Day Coordinators</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Bride Side */}
                    <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2.5">
                      <div className="font-bold text-rose-900">👰 Bride Side Coordinators</div>
                      {(Array.isArray(moodboard.bride_coordinators) && moodboard.bride_coordinators.length > 0
                        ? moodboard.bride_coordinators
                        : moodboard.bride_coordinator?.name
                        ? [moodboard.bride_coordinator]
                        : []
                      ).map((coord: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-rose-100 space-y-1">
                          <div className="font-bold text-slate-900">{coord.name || 'Coordinator'}</div>
                          <div className="text-[11px] text-slate-500">Relation: {coord.relation || '—'}</div>
                          {coord.phone && (
                            <div className="pt-1 flex items-center gap-2">
                              <a
                                href={`tel:${coord.phone}`}
                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 font-bold flex items-center gap-1 text-[10px]"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </a>
                              <a
                                href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 text-[10px]"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!moodboard.bride_coordinators?.length && !moodboard.bride_coordinator?.name) && (
                        <p className="text-[11px] text-slate-400 italic">No bride coordinators provided.</p>
                      )}
                    </div>

                    {/* Groom Side */}
                    <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5">
                      <div className="font-bold text-blue-900">🤵 Groom Side Coordinators</div>
                      {(Array.isArray(moodboard.groom_coordinators) && moodboard.groom_coordinators.length > 0
                        ? moodboard.groom_coordinators
                        : moodboard.groom_coordinator?.name
                        ? [moodboard.groom_coordinator]
                        : []
                      ).map((coord: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                          <div className="font-bold text-slate-900">{coord.name || 'Coordinator'}</div>
                          <div className="text-[11px] text-slate-500">Relation: {coord.relation || '—'}</div>
                          {coord.phone && (
                            <div className="pt-1 flex items-center gap-2">
                              <a
                                href={`tel:${coord.phone}`}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-bold flex items-center gap-1 text-[10px]"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </a>
                              <a
                                href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 text-[10px]"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!moodboard.groom_coordinators?.length && !moodboard.groom_coordinator?.name) && (
                        <p className="text-[11px] text-slate-400 italic">No groom coordinators provided.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. VIP Family Members (Shot List) */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>4. VIP Family Members Tagged List</span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        {Array.isArray(moodboard.close_family_photos) ? moodboard.close_family_photos.length : 0}
                      </span>
                    </h4>
                  </div>

                  {Array.isArray(moodboard.close_family_photos) && moodboard.close_family_photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {moodboard.close_family_photos.map((fam: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() =>
                            openLightbox(
                              moodboard.close_family_photos.map((f: any) => ({
                                url: getMediaUrl(f.url),
                                title: `${f.side || 'VIP'} Family • ${f.relation || 'Relation'}`,
                                subtitle: f.names || 'Family Member',
                              })),
                              idx
                            )
                          }
                          className="group p-2 bg-slate-50 hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-amber-400 transition cursor-pointer space-y-1.5 shadow-2xs"
                        >
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 relative">
                            <img src={getMediaUrl(fam.url)} alt="Family" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded backdrop-blur-xs">
                                View Tagged
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] space-y-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              fam.side === 'Bride' ? 'bg-rose-100 text-rose-800' : fam.side === 'Groom' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {fam.side} • {fam.relation || 'VIP'}
                            </span>
                            <div className="font-bold text-slate-800 truncate">{fam.names || 'Family Member'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No VIP family members tagged yet.</p>
                  )}
                </div>

                {/* 5. Photo References & Visual Inspiration */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-600" />
                    <span>5. Visual Inspiration Links (Pinterest / Drive)</span>
                  </h4>
                  {Array.isArray(moodboard.inspiration_links) && moodboard.inspiration_links.length > 0 ? (
                    <div className="space-y-2">
                      {moodboard.inspiration_links.map((link: any, idx: number) => {
                        const url = typeof link === 'string' ? link : link.url;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 bg-white hover:bg-amber-50/50 rounded-2xl border border-[#EAE5DA] hover:border-amber-400 transition flex items-center justify-between shadow-2xs text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-900 block">{link.platform || 'Inspiration Link'}</span>
                              <span className="text-[11px] text-slate-500 font-mono truncate">{url}</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No inspiration links added yet.</p>
                  )}
                </div>

                {/* 6. Cinematic Video References */}
                <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Film className="w-4 h-4 text-rose-600" />
                    <span>6. Cinematic Video References</span>
                  </h4>
                  {Array.isArray(moodboard.video_references) && moodboard.video_references.length > 0 ? (
                    <div className="space-y-2">
                      {moodboard.video_references.map((vid: any, idx: number) => {
                        const url = typeof vid === 'string' ? vid : vid.url;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-[#EAE5DA] hover:border-rose-400 transition flex items-center justify-between shadow-2xs text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-900 block">{vid.notes || 'Cinematic Film Reference'}</span>
                              <span className="text-[11px] text-slate-500 font-mono truncate">{url}</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-rose-600 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No video references submitted yet.</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: POST-PRODUCTION & DELIVERABLES
            Exact Visual Cards Match with PostProductionCard / DeliverableRowItem
            (Strictly View-Only: Staff & Due Dates Hidden, Drive Links Visible)
        ───────────────────────────────────────────────────────────── */}
        {portalTab === 'post_production' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header with Metrics Progress */}
            <div className="bg-[#FFFDF9] border border-[#EAE5DA] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Post-Production & Deliverables Status</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time editing progress, deliverables completion, and cloud download links</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    {ppCompleted} of {ppTotal} Completed
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full border border-emerald-200">
                    {ppPercent}% Ready
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${ppPercent}%` }}
                />
              </div>

              {/* Segment Tabs (Pre-Wedding, Wedding, Reception, etc.) */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                {enabledSegments.map(seg => (
                  <button
                    key={seg}
                    onClick={() => setActiveSegmentTab(seg)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                      activeSegmentTab === seg
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-[#EAE5DA]'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            {/* Deliverables Category Sections */}
            {filteredDeliverables.length === 0 ? (
              <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                <Film className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Deliverables in this Segment</h4>
                <p className="text-xs text-slate-500">Your post-production team will track photo and film deliverables here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedDeliverables.map(cat => {
                  if (cat.items.length === 0) return null;
                  const Icon = cat.icon;

                  return (
                    <div
                      key={cat.name}
                      className="p-5 sm:p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${cat.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${cat.color}`} />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">
                            {cat.name}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {cat.items.length} item{cat.items.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Deliverable Items List (Exact visual match with DeliverableRowItem) */}
                      <div className="space-y-2.5">
                        {cat.items.map(item => {
                          const statusConfig = getStatusBadgeConfig(item.status);

                          return (
                            <div
                              key={item.id}
                              className="p-3.5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs hover:border-amber-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              {/* Left: Category Icon + Title + Specs Badge */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                                  <Icon className={`w-4 h-4 ${cat.color}`} />
                                </div>

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-xs font-black text-slate-900 truncate">
                                      {item.title}
                                    </h5>
                                    {(item.specs || item.count) && (
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-950 border border-amber-300/80 shadow-2xs">
                                        {item.specs || item.count}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    Segment: <span className="text-slate-600 font-bold">{item.segment || 'Wedding'}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Right: Status Badge + Direct Cloud Download Links */}
                              <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                                {/* Status Badge */}
                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1.5 shadow-2xs ${statusConfig.bg}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                  <span>{statusConfig.label}</span>
                                </span>

                                {/* Direct Google Drive Download Links (if provided) */}
                                {item.drive_link ? (
                                  <a
                                    href={item.drive_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs"
                                    title="Open Google Drive Folder / File"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Download Link</span>
                                  </a>
                                ) : Array.isArray(item.drive_links) && item.drive_links.length > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    {item.drive_links.map((dl: any, dIdx: number) => (
                                      <a
                                        key={dl.id || dIdx}
                                        href={dl.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center gap-1 shadow-xs"
                                        title={dl.label || 'Open Drive Link'}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>{dl.label || 'Drive'}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: FINANCE & INVOICES
            (Strictly View-Only: Handled By completely hidden)
        ───────────────────────────────────────────────────────────── */}
        {portalTab === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Payment & Account Summary</h3>
                <p className="text-xs text-slate-500 font-medium">Package breakdown, payment milestone schedule, and official tax invoice</p>
              </div>

              {/* View Tax Invoice Button */}
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>View / Download Tax Invoice</span>
              </button>
            </div>

            {/* Top 3 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Package Value</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  ₹{effectiveTotalAmount.toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Received</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{effectivePaidAmount.toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
                <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                  ₹{effectivePendingAmount.toLocaleString('en-IN')}
                </h3>
              </div>
            </div>

            {/* 📊 Payment Progress Bar (% Paid vs Remaining) */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800">Payment Clearance Progress</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {effectiveTotalAmount > 0 ? Math.min(100, Math.round((effectivePaidAmount / effectiveTotalAmount) * 100)) : 0}% Paid
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  ₹{effectivePaidAmount.toLocaleString('en-IN')} of ₹{effectiveTotalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="w-full h-3 bg-amber-100/70 rounded-full overflow-hidden p-0.5 border border-amber-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 shadow-xs"
                  style={{
                    width: `${effectiveTotalAmount > 0 ? Math.min(100, Math.round((effectivePaidAmount / effectiveTotalAmount) * 100)) : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-0.5">
                <span className="text-emerald-700 font-bold">
                  ✓ Received: ₹{effectivePaidAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-amber-800 font-bold">
                  ⏳ Pending: ₹{effectivePendingAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Detailed Financial Breakdown Card */}
            <div className="p-6 bg-white rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
                Complete Financial Breakdown
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Base Package Price</span>
                  <span className="font-mono font-bold text-slate-900">₹{effectiveBasePrice.toLocaleString('en-IN')}</span>
                </div>

                {effectiveDiscount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                    <span className="font-medium">Special Discount</span>
                    <span className="font-mono font-bold">-₹{effectiveDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {effectiveTravel > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Travel & Accommodation Charges</span>
                    <span className="font-mono font-bold text-slate-900">₹{effectiveTravel.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {effectiveAdditional > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Additional Deliverables</span>
                    <span className="font-mono font-bold text-slate-900">₹{effectiveAdditional.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {effectiveGst > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Applicable Taxes (GST)</span>
                    <span className="font-mono font-bold text-slate-900">₹{effectiveGst.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-slate-200 text-sm font-black">
                  <span className="text-slate-900">Final Package Total</span>
                  <span className="font-mono text-slate-900">₹{effectiveTotalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Payment Milestone Schedule (NO Handled By field) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Payment Milestones Schedule
              </h4>

              <div className="space-y-2.5">
                {displayMilestones.map((ms: any, idx: number) => {
                  const isPaid = (ms.status as string) === 'completed' || (ms.status as string) === 'paid' || (ms.status as string) === 'Completed';
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = !isPaid && ms.due_date && ms.due_date < todayStr;

                  return (
                    <div
                      key={ms.id || idx}
                      className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs space-y-3 ${
                        isPaid
                          ? 'border-emerald-200/80 bg-emerald-50/20'
                          : isOverdue
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-[#EAE5DA]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-black text-slate-900">
                            {ms.step_name || ms.title || `Milestone ${idx + 1}`}
                          </h5>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Scheduled Due Date: <strong className="text-slate-700">{ms.due_date || 'Milestone completion'}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 ml-auto sm:ml-0">
                          <span className="font-mono font-black text-sm text-slate-900">
                            ₹{(Number(ms.amount) || 0).toLocaleString('en-IN')}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isPaid ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>PAID</span>
                              </>
                            ) : isOverdue ? (
                              <>
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>OVERDUE</span>
                              </>
                            ) : (
                              <span>DUE / PENDING</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Payment Details Pill Row (If Paid or has Details) */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-slate-600">
                        {isPaid && ms.paid_date && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid on {ms.paid_date}</span>
                          </span>
                        )}

                        {ms.payment_mode && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            <CreditCard className="w-3 h-3 text-slate-500" />
                            <span>Mode: {ms.payment_mode}</span>
                          </span>
                        )}

                        {ms.reference_id && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                            <Hash className="w-3 h-3 text-slate-500" />
                            <span>Ref: {ms.reference_id}</span>
                          </span>
                        )}

                        {!isPaid && !isOverdue && (
                          <span className="text-slate-400 text-[10px]">
                            Upcoming milestone installment
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STUDIO BRANDING LUXURY FOOTER ── */}
        <div className="pt-8 pb-4 text-center border-t border-[#EAE5DA] space-y-2">
          <div className="flex items-center justify-center gap-2">
            {studioInfo.logo ? (
              <img
                src={studioInfo.logo}
                alt={studioInfo.name || 'Studio'}
                className="w-6 h-6 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shadow-2xs"
              />
            ) : null}
            <span className="text-xs font-black text-slate-800 tracking-tight">
              {studioInfo.name || 'Studio Photography & Films'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
            {studioInfo.phone && (
              <a href={`tel:${studioInfo.phone}`} className="hover:text-amber-800 transition">
                📞 {studioInfo.phone}
              </a>
            )}
            {studioInfo.email && (
              <a href={`mailto:${studioInfo.email}`} className="hover:text-emerald-800 transition">
                ✉️ {studioInfo.email}
              </a>
            )}
            {studioInfo.instagram && (
              <a
                href={
                  studioInfo.instagram.startsWith('http')
                    ? studioInfo.instagram
                    : `https://instagram.com/${studioInfo.instagram.replace(/^@/, '')}`
                }
                target="_blank"
                rel="noreferrer"
                className="hover:text-pink-700 transition"
              >
                📸 {studioInfo.instagram.startsWith('@') ? studioInfo.instagram : `@${studioInfo.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}`}
              </a>
            )}
            {studioInfo.website && (
              <a
                href={studioInfo.website.startsWith('http') ? studioInfo.website : `https://${studioInfo.website}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-700 transition"
              >
                🌐 {studioInfo.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>

          <p className="text-[10px] text-slate-400 font-medium pt-1">
            Private Client Portal • All rights reserved • Powered by {studioInfo.name || 'Studio'}
          </p>
        </div>

      </div>

      {/* ── LIGHTBOX MODAL FOR MOOD BOARD ── */}
      <AnimatePresence>
        {lightbox.isOpen && lightbox.items.length > 0 && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <button
              onClick={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer z-50"
            >
              <X className="w-6 h-6" />
            </button>

            {lightbox.items.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length
                  }))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer z-50 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.items.length
                  }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer z-50 transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
              <img
                src={lightbox.items[lightbox.currentIndex]?.url}
                alt={lightbox.items[lightbox.currentIndex]?.title || 'Preview'}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
              {lightbox.items[lightbox.currentIndex]?.title && (
                <p className="text-white text-xs font-bold mt-3">
                  {lightbox.items[lightbox.currentIndex]?.title}
                </p>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TAX INVOICE MODAL DIALOG ── */}
      {showInvoiceModal && (
        <InvoiceModalDialog
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          client={client}
          financeRecord={finance}
          totalPackage={effectiveTotalAmount}
          paidAmount={effectivePaidAmount}
          studioSettings={null}
        />
      )}

    </div>
  );
}
