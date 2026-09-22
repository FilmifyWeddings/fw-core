'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Phone, Mail, Calendar, DollarSign, Clock, CheckCircle2, 
  AlertTriangle, ExternalLink, Share2, Copy, Check, X, Plus, 
  Trash2, Edit3, MessageSquare, Send, Bell, Film, BookOpen, 
  Camera, Layers, Lock, ShieldCheck, Sparkles, MapPin, Users, Users as UsersIcon,
  FileText, Download, Printer, RefreshCw, Key, MessageCircle, Link2,
  ArrowLeft, CheckSquare, Play, ChevronRight, ChevronLeft, Hash, Crown, Eye, Pencil, CheckCheck,
  Heart, Package, Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMediaUrl } from '@/lib/r2-storage';
import AiMicButton from '@/components/AiMicButton';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { fetchWorkspaceEventTypes, DEFAULT_EVENT_TYPES } from '@/lib/workspace-settings';
import { ClientFinanceCard } from '@/app/workspace/finance/components/ClientFinanceCard';
import PostProductionCard, { PostProductionProjectData } from '@/app/workspace/post-production/components/PostProductionCard';
import DeliverableCommentDrawer from '@/app/workspace/post-production/components/DeliverableCommentDrawer';
import { PostProductionDeliverable } from '@/app/workspace/post-production/components/DeliverableCategorySection';
import { 
  parseClientExtended, serializeClientExtended, type ClientEventItem, type ClientExtendedData, type StudioCommentItem 
} from '@/components/clients/client-insider-modal';
import { fetchWorkspaceTeamMembers, type WorkspaceMemberOption } from '@/lib/team-helpers';
import { extractFinancialsFromQuotation, normalizeToIsoDate } from '@/lib/quotation-finance-sync';
import type { 
  WorkspaceClient, PostProductionProject, DeliverableItem, ClientFinanceRecord, DeliverableStatus, DeliverableComment, FinanceMilestoneItem
} from '@/types';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import ClientStatusDropdown from '@/app/workspace/clients/components/ClientStatusDropdown';
import { compressMoodboardImage } from '@/lib/compressor';

// Helper to compute initials from client name
function getClientInitials(name: string): string {
  if (!name) return 'CL';
  const clean = name.replace(/&/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface QuotationVersionItem {
  id?: string;
  template_id: string;
  lead_id?: string;
  version: number;
  version_label?: string;
  title: string;
  is_final?: boolean;
  updated_at: string;
  created_at: string;
  public_token?: string;
  total_amount?: number;
  financials?: {
    total_amount?: number;
  };
  content_json?: any;
}

export default function ClientWorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientIdOrCode = (params?.id as string) || '';

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [client, setClient] = useState<WorkspaceClient | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<WorkspaceMemberOption[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'events' | 'post_production' | 'finance' | 'moodboard' | 'tasks'>('overview');

  // ── Tab: Tasks & Post-Production State ──
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isSyncingPipeline, setIsSyncingPipeline] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [showClientTaskModal, setShowClientTaskModal] = useState(false);
  const [newClientTaskTitle, setNewClientTaskTitle] = useState('');
  const [newClientTaskCategory, setNewClientTaskCategory] = useState('POST_PRODUCTION');
  const [newClientTaskPriority, setNewClientTaskPriority] = useState('medium');
  const [newClientTaskDueDate, setNewClientTaskDueDate] = useState('');
  const [newClientTaskDesc, setNewClientTaskDesc] = useState('');

  // Extended fields state
  const [extended, setExtended] = useState<ClientExtendedData>({
    client_code: '',
    whatsapp_group_link: '',
    whatsapp_group_id: '',
    portal_token: '',
    portal_pin: '',
    portal_enabled: true,
    events: [],
    plain_notes: ''
  });

  // Profile Edit & PM fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [projectManagerName, setProjectManagerName] = useState('');
  const [projectManagerEmail, setProjectManagerEmail] = useState('');
  const [projectManagerPhone, setProjectManagerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab 2: Quotations & Versions (Synced with Leads CRM)
  const [quotationDocs, setQuotationDocs] = useState<QuotationVersionItem[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [settingFinalId, setSettingFinalId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  // Tab 3: Events & Bookings
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('Sangeet & Cocktail');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('06:00 PM');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('11:00 PM');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventCity, setNewEventCity] = useState('');
  const [newEventCrew, setNewEventCrew] = useState('2 Photographers, 2 Cinematographers, 1 Drone Pilot');

  // Tab 4: Post-Production
  const [postProductionProject, setPostProductionProject] = useState<PostProductionProject | null>(null);
  const [loadingPostProd, setLoadingPostProd] = useState(false);

  // Tab 5: Finance & Milestones
  const [financeRecord, setFinanceRecord] = useState<ClientFinanceRecord | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Complete Payment Modal State (Ported from Finance with Partial Rollover)
  const [showCompletePaymentModal, setShowCompletePaymentModal] = useState<{
    open: boolean;
    recordId: string;
    clientName: string;
    milestone: FinanceMilestoneItem | null;
  }>({
    open: false,
    recordId: '',
    clientName: '',
    milestone: null
  });
  const [completePaymentFormData, setCompletePaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    reference_id: '',
    status: 'completed' as 'completed' | 'pending',
    notes: ''
  });

  // ── Dynamic 3D Settings Event Types ──
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES.map(e => e.name));

  // ── Studio Notes & Timeline Comments ──
  const [newCommentText, setNewCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // ── Tab 4: Post-Production Active Segment & Drawer ──
  const [activePostProdSegment, setActivePostProdSegment] = useState<string>('All');
  const [activeDrawerDeliverable, setActiveDrawerDeliverable] = useState<PostProductionDeliverable | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'comments' | 'links'>('comments');

  // ── Tab 5: Finance Accordion State ──
  const [isFinanceExpanded, setIsFinanceExpanded] = useState<boolean>(true);

  // ── In-House Team Members for Project Manager Selection ──
  const inHouseTeamMembers = useMemo(() => {
    return teamMembers.filter((m: any) => {
      const typeStr = (m.primary_type || m.type || '').toUpperCase();
      const typesArr = (m.member_types || []).map((t: string) => String(t).toUpperCase());
      return typeStr === 'IN_HOUSE' || typesArr.includes('IN_HOUSE') || (!typeStr && typesArr.length === 0);
    });
  }, [teamMembers]);

  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts: Searchable3DCreamSelectOption[] = [
      {
        value: '',
        label: 'Unassigned (No PM)',
        badge: 'NONE',
        badgeClassName: 'bg-stone-100 text-stone-500',
      }
    ];

    inHouseTeamMembers.forEach(m => {
      opts.push({
        value: m.id,
        label: m.name,
        initials: m.name.slice(0, 2).toUpperCase()
      });
    });

    return opts;
  }, [inHouseTeamMembers]);

  // ── Event Types 3D Options ──
  const eventTypeOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const combined = Array.from(new Set([
      ...(eventType ? [eventType] : []),
      ...eventTypes
    ])).filter(Boolean);

    return combined.map(t => ({
      value: t,
      label: t,
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-600" />
    }));
  }, [eventTypes, eventType]);

  // ── Synced Final Quotation Doc ──
  const finalQuotationDoc = useMemo(() => {
    return quotationDocs.find(q => q.is_final) || quotationDocs[0] || null;
  }, [quotationDocs]);

  // ── Synced Multi-Day Events from Quotation / Extended ──
  const displayedEvents = useMemo(() => {
    const quoteItems = finalQuotationDoc?.content_json?.functionsPage?.items;
    if (Array.isArray(quoteItems) && quoteItems.length > 0) {
      return quoteItems.map((item: any, idx: number) => ({
        id: item.id || `quote_event_${idx}`,
        name: item.name || `Ceremony ${idx + 1}`,
        date: item.date || '',
        time_start: item.startTime || '',
        time_end: item.endTime || '',
        duration: item.durationSlot || '',
        venue: item.location || '',
        requirements: Array.isArray(item.requirements) ? item.requirements : [],
        notes: item.notes || '',
        source: 'quotation' as const,
      }));
    }
    return (extended.events || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      time_start: e.time_start,
      time_end: e.time_end,
      duration: '',
      venue: [e.venue, e.city].filter(Boolean).join(', '),
      requirements: e.assigned_crew ? [{ name: e.assigned_crew, qty: 1 }] : [],
      notes: '',
      source: 'manual' as const,
    }));
  }, [finalQuotationDoc, extended.events]);

  // ── Effective ClientFinanceRecord for ClientFinanceCard ──
  const effectiveFinanceRecord: ClientFinanceRecord = useMemo(() => {
    const totalPkg = financeRecord?.final_total_amount || client?.total_package_amount || 0;
    const paid = financeRecord?.received_amount || client?.paid_amount || 0;
    const pending = financeRecord?.pending_amount ?? Math.max(0, totalPkg - paid);

    return {
      id: financeRecord?.id || `fin_${client?.id || 'temp'}`,
      client_id: client?.id || '',
      workspace_id: client?.workspace_id || '',
      final_total_amount: totalPkg,
      received_amount: paid,
      pending_amount: pending,
      payment_status: (financeRecord?.payment_status as any) || (paid >= totalPkg && totalPkg > 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid'),
      milestones: financeRecord?.milestones || [],
      client: {
        id: client?.id,
        name: client?.name || name,
        event_type: client?.event_type || eventType,
        event_date: client?.event_date || eventDate,
        handled_by: projectManagerName || (client as any)?.handled_by || 'Studio PM',
        phone: client?.phone || phone,
        email: client?.email || email
      } as any,
      created_at: financeRecord?.created_at || client?.created_at || new Date().toISOString(),
      updated_at: financeRecord?.updated_at || new Date().toISOString()
    } as any;
  }, [financeRecord, client, projectManagerName, name, eventType, eventDate, phone, email]);

  // ── Effective PostProductionProjectData for PostProductionCard ──
  const postProdProjectData: PostProductionProjectData = useMemo(() => {
    const clientDelivs = Array.isArray(postProductionProject?.deliverables) ? postProductionProject.deliverables : [];
    return {
      id: postProductionProject?.id || `pp_${client?.id || 'temp'}`,
      project_id: (postProductionProject as any)?.project_id,
      workspace_id: client?.workspace_id,
      client_id: client?.id || '',
      client_name: client?.name || name || 'Client',
      couple_names: client?.name || name,
      event_date: client?.event_date || eventDate,
      event_type: client?.event_type || eventType,
      project_manager_id: projectManagerId || null,
      project_manager_name: projectManagerName || null,
      overall_status: (postProductionProject?.overall_status as any) || 'active',
      deliverables: clientDelivs.map((d: any) => ({
        ...d,
        segment: d.segment || 'Wedding',
        category: d.category || 'photos',
        title: d.title || d.name || 'Deliverable',
        specs: d.specs || d.count || '',
        status: d.status || 'Upcoming'
      })),
      quotation_id: finalQuotationDoc?.template_id || null,
      quotation_title: finalQuotationDoc?.title || null,
      enabled_segments: (postProductionProject as any)?.enabled_segments || ['Wedding'],
      disabled_categories: (postProductionProject as any)?.disabled_categories
    };
  }, [client, postProductionProject, projectManagerId, projectManagerName, finalQuotationDoc, name, eventDate, eventType]);

  // ── Instant 1-Click Header PM Assignment ──
  const handleQuickAssignPM = async (newPmId: string) => {
    setProjectManagerId(newPmId);
    const m = teamMembers.find(mem => mem.id === newPmId);
    const pmN = m?.name || '';
    const pmE = m?.email || '';
    const pmP = m?.phone || '';
    setProjectManagerName(pmN);
    setProjectManagerEmail(pmE);
    setProjectManagerPhone(pmP);

    if (client) {
      const updatedExtended: ClientExtendedData = {
        ...extended,
        project_manager_id: newPmId || undefined,
        project_manager_name: pmN || undefined,
        project_manager_email: pmE || undefined,
        project_manager_phone: pmP || undefined,
      };
      setExtended(updatedExtended);

      try {
        await supabase
          .from('workspace_clients')
          .update({
            project_manager_id: newPmId || null,
            notes: serializeClientExtended(updatedExtended),
            updated_at: new Date().toISOString()
          })
          .eq('id', client.id);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_client_updated', { detail: { clientId: client.id } }));
        }
      } catch (err) {
        console.error('Error updating PM:', err);
      }
    }
  };

  // ── Timeline Studio Notes Handlers ──
  const handleAddStudioComment = async (textToAdd?: string, isAi = false) => {
    const commentBody = (textToAdd !== undefined ? textToAdd : newCommentText).trim();
    if (!commentBody || !client) return;

    setIsAddingComment(true);
    const newComment: StudioCommentItem = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: commentBody,
      created_at: new Date().toISOString(),
      author_name: projectManagerName || 'Studio Team',
      is_ai: isAi
    };

    const currentComments = extended.studio_comments || [];
    const updatedComments = [newComment, ...currentComments];

    const updatedExtended: ClientExtendedData = {
      ...extended,
      plain_notes: commentBody,
      studio_comments: updatedComments
    };

    setExtended(updatedExtended);
    setNewCommentText('');

    try {
      await supabase
        .from('workspace_clients')
        .update({
          notes: serializeClientExtended(updatedExtended),
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);
    } catch (err) {
      console.error('Error adding studio comment:', err);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteStudioComment = async (commentId: string) => {
    if (!client) return;
    const currentComments = extended.studio_comments || [];
    const updatedComments = currentComments.filter(c => c.id !== commentId);

    const updatedExtended: ClientExtendedData = {
      ...extended,
      studio_comments: updatedComments
    };
    setExtended(updatedExtended);

    try {
      await supabase
        .from('workspace_clients')
        .update({
          notes: serializeClientExtended(updatedExtended),
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);
    } catch (err) {
      console.error('Error deleting studio comment:', err);
    }
  };

  // Tab 6: Multi-Event Mood Boards & Vision Prep
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [selectedMoodboardId, setSelectedMoodboardId] = useState<string>('');
  const [loadingMoodboard, setLoadingMoodboard] = useState(false);
  const [copiedMoodboardLink, setCopiedMoodboardLink] = useState(false);
  const [updatingMbStatus, setUpdatingMbStatus] = useState(false);
  const [showAddMoodboardModal, setShowAddMoodboardModal] = useState(false);
  const [newMbEventType, setNewMbEventType] = useState('Pre-Wedding');
  const [newMbTitle, setNewMbTitle] = useState('');
  const [isCreatingMb, setIsCreatingMb] = useState(false);
  const [isDeletingMb, setIsDeletingMb] = useState(false);
  const [uploadingMbPhoto, setUploadingMbPhoto] = useState<string | null>(null);

  const currentMoodboard = useMemo(() => {
    if (!moodboards || moodboards.length === 0) return null;
    if (selectedMoodboardId) {
      const found = moodboards.find(m => m.id === selectedMoodboardId);
      if (found) return found;
    }
    return moodboards[0];
  }, [moodboards, selectedMoodboardId]);

  // Full-Screen Image Lightbox / Modal for Moodboard
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

  // Helper date/time formatters
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const parts = timeStr.trim().split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const mins = parts[1].slice(0, 2);
        if (isNaN(hours)) return timeStr;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const computeMoodboardProgress = (mb: any): number => {
    if (!mb) return 0;
    const isPreWed = Boolean(
      (mb.event_type || mb.title || client?.event_type || '').toLowerCase().includes('pre-wedding') ||
      (mb.event_type || mb.title || client?.event_type || '').toLowerCase().includes('pre wedding')
    );
    if (isPreWed) {
      let score = 0;
      if (Array.isArray(mb.couple_photos) && mb.couple_photos.some((p: any) => p && typeof p.url === 'string' && p.url.trim())) score += 20;
      const coord = mb.shoot_coordination || {};
      const bCoord = coord.bride_coordinator || mb.bride_coordinator;
      const gCoord = coord.groom_coordinator || mb.groom_coordinator;
      if ((bCoord && (bCoord.name?.trim() || bCoord.phone?.trim())) || (gCoord && (gCoord.name?.trim() || gCoord.phone?.trim()))) score += 20;
      if (Array.isArray(mb.shoot_places) && mb.shoot_places.some((p: any) =>
        Boolean(
          p.couple_photo_url?.trim() ||
          p.bride_photo_url?.trim() ||
          p.groom_photo_url?.trim() ||
          p.location_notes?.trim() ||
          p.comments?.trim() ||
          (p.place_name?.trim() && !p.place_name.trim().match(/^Location \d+$/i))
        )
      )) score += 30;
      const inspos = Array.isArray(mb.photo_references) ? mb.photo_references : (Array.isArray(mb.inspiration_links) ? mb.inspiration_links : []);
      if (inspos.some((r: any) => r && (r.url?.trim() || r.pinterest_url?.trim()))) score += 15;
      if (Array.isArray(mb.video_references) && mb.video_references.some((v: any) => v && v.url?.trim())) score += 15;
      return Math.min(100, score);
    } else {
      let score = 0;
      if (Array.isArray(mb.couple_photos) && mb.couple_photos.some((p: any) => p && typeof p.url === 'string' && p.url.trim())) score += 15;
      if (mb.bride_instagram?.trim() || mb.groom_instagram?.trim() || mb.couple_instagram?.trim()) score += 10;
      const bCoords = Array.isArray(mb.bride_coordinator)
        ? mb.bride_coordinator
        : (Array.isArray(mb.bride_coordinators) ? mb.bride_coordinators : (mb.bride_coordinator ? [mb.bride_coordinator] : []));
      const gCoords = Array.isArray(mb.groom_coordinator)
        ? mb.groom_coordinator
        : (Array.isArray(mb.groom_coordinators) ? mb.groom_coordinators : (mb.groom_coordinator ? [mb.groom_coordinator] : []));
      if (bCoords.some((c: any) => c?.name?.trim() || c?.phone?.trim()) || gCoords.some((c: any) => c?.name?.trim() || c?.phone?.trim())) score += 15;
      if (Array.isArray(mb.close_family_photos) && mb.close_family_photos.some((f: any) => f && f.url?.trim())) score += 15;
      const inspos = Array.isArray(mb.photo_references) ? mb.photo_references : (Array.isArray(mb.inspiration_links) ? mb.inspiration_links : []);
      if (inspos.some((r: any) => r && (r.url?.trim() || r.pinterest_url?.trim()))) score += 15;
      if (Array.isArray(mb.video_references) && mb.video_references.some((v: any) => v && v.url?.trim())) score += 10;
      if (Array.isArray(mb.itinerary_schedule) && mb.itinerary_schedule.some((it: any) =>
        it && it.event_name?.trim() && Boolean(
          it.date?.trim() || it.venue_name?.trim() || it.start_time?.trim() || it.rituals_notes?.trim() || it.bride_outfit_url?.trim() || it.groom_outfit_url?.trim()
        )
      )) score += 15;
      const pContacts = Array.isArray(mb.payment_contact)
        ? mb.payment_contact
        : (Array.isArray(mb.payment_contacts) ? mb.payment_contacts : (mb.payment_contact ? [mb.payment_contact] : []));
      if (pContacts.some((c: any) => c?.name?.trim() || c?.phone?.trim())) score += 5;
      return Math.min(100, score);
    }
  };

  // Helper date parts extractor for Team Manager / Bookings card layout
  const parseEventDateParts = (dateStr?: string) => {
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
  };

  // ClientFinanceCard Milestones Handlers
  const handleMilestoneChange = async (recordId: string, milestoneId: string, field: string, value: any) => {
    if (!financeRecord || !client) return;
    const updatedMilestones = (financeRecord.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return { ...m, [field]: value };
      }
      return m;
    });

    const totalReceived = updatedMilestones
      .filter(m => m.status === 'completed' || m.status === 'paid' || (m.status as string) === 'Completed')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalPkg = financeRecord.final_total_amount || client.total_package_amount || 0;
    const newPending = Math.max(0, totalPkg - totalReceived);
    const newPaymentStatus = totalReceived >= totalPkg && totalPkg > 0 ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid';

    const updatedRecord: ClientFinanceRecord = {
      ...financeRecord,
      milestones: updatedMilestones,
      received_amount: totalReceived,
      pending_amount: newPending,
      payment_status: newPaymentStatus as any,
      updated_at: new Date().toISOString()
    };

    setFinanceRecord(updatedRecord);
    setClient(prev => prev ? ({ ...prev, paid_amount: totalReceived }) : null);

    try {
      await supabase.from('client_finance_records').update({
        milestones: updatedMilestones,
        received_amount: totalReceived,
        pending_amount: newPending,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      }).eq('client_id', client.id);
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  const handleDeleteMilestone = async (recordId: string, milestoneId: string) => {
    if (!financeRecord || !client) return;
    const updatedMilestones = (financeRecord.milestones || []).filter(m => m.id !== milestoneId);
    const totalReceived = updatedMilestones
      .filter(m => m.status === 'completed' || m.status === 'paid' || (m.status as string) === 'Completed')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const totalPkg = financeRecord.final_total_amount || client.total_package_amount || 0;
    const newPending = Math.max(0, totalPkg - totalReceived);
    const newPaymentStatus = totalReceived >= totalPkg && totalPkg > 0 ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid';

    const updatedRecord: ClientFinanceRecord = {
      ...financeRecord,
      milestones: updatedMilestones,
      received_amount: totalReceived,
      pending_amount: newPending,
      payment_status: newPaymentStatus as any,
      updated_at: new Date().toISOString()
    };

    setFinanceRecord(updatedRecord);
    try {
      await supabase.from('client_finance_records').update({
        milestones: updatedMilestones,
        received_amount: totalReceived,
        pending_amount: newPending,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      }).eq('client_id', client.id);
    } catch (err) {
      console.error('Error deleting milestone:', err);
    }
  };

  const handleAddMilestoneStep = async (recordId: string) => {
    if (!financeRecord || !client) return;
    const existing = financeRecord.milestones || [];
    const newMs: any = {
      id: `ms_${Date.now()}`,
      step_name: `Milestone ${existing.length + 1}`,
      amount: 0,
      percentage: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    const updatedMilestones = [...existing, newMs];
    const updatedRecord: ClientFinanceRecord = { ...financeRecord, milestones: updatedMilestones };
    setFinanceRecord(updatedRecord);
    try {
      await supabase.from('client_finance_records').update({
        milestones: updatedMilestones,
        updated_at: new Date().toISOString()
      }).eq('client_id', client.id);
    } catch (err) {
      console.error('Error adding milestone step:', err);
    }
  };

  // Open Record Payment Completion Modal
  const handleOpenCompletePaymentModal = (rec: ClientFinanceRecord, milestone: FinanceMilestoneItem) => {
    setCompletePaymentFormData({
      amount: String(milestone.amount || 0),
      payment_date: milestone.paid_date || new Date().toISOString().split('T')[0],
      payment_mode: milestone.payment_mode || 'UPI',
      reference_id: milestone.reference_id || '',
      status: (milestone.status === 'completed' || milestone.status === 'paid') ? 'completed' : 'completed',
      notes: milestone.notes || ''
    });
    setShowCompletePaymentModal({
      open: true,
      recordId: rec.id,
      clientName: rec.client?.name || name || 'Client',
      milestone
    });
  };

  // Save Payment Completion with Automatic Milestone Rollover
  const handleSaveCompletePaymentModal = async () => {
    const { recordId, milestone } = showCompletePaymentModal;
    if (!recordId || !milestone) return;

    const numAmt = Math.round(parseFloat(completePaymentFormData.amount) || 0);
    const isComp = completePaymentFormData.status === 'completed';

    if (financeRecord) {
      const updatedMilestones = [...(financeRecord.milestones || [])];
      const mIndex = updatedMilestones.findIndex(m => m.id === milestone.id);

      if (mIndex !== -1) {
        const originalAmt = Number(updatedMilestones[mIndex].amount) || 0;
        const diff = originalAmt - numAmt;

        updatedMilestones[mIndex] = {
          ...updatedMilestones[mIndex],
          amount: numAmt,
          status: (completePaymentFormData.status as any),
          paid_date: isComp ? (completePaymentFormData.payment_date || new Date().toISOString().split('T')[0]) : undefined,
          payment_mode: isComp ? completePaymentFormData.payment_mode : undefined,
          reference_id: completePaymentFormData.reference_id || null,
          notes: completePaymentFormData.notes || null
        };

        // Automatic Partial Rollover: Difference is added to the subsequent milestone
        if (diff !== 0 && mIndex + 1 < updatedMilestones.length) {
          const nextM = updatedMilestones[mIndex + 1];
          const nextOriginalAmt = Number(nextM.amount) || 0;
          const newNextAmt = Math.max(0, nextOriginalAmt + diff);
          updatedMilestones[mIndex + 1] = {
            ...nextM,
            amount: newNextAmt
          };
        }

        const totalReceived = updatedMilestones
          .filter(m => m.status === 'completed' || m.status === 'paid' || (m.status as string) === 'Completed')
          .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

        const totalPkg = financeRecord.final_total_amount || client?.total_package_amount || 0;
        const newPending = Math.max(0, totalPkg - totalReceived);
        const newPaymentStatus = totalReceived >= totalPkg && totalPkg > 0 ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid';

        const updatedRecord: ClientFinanceRecord = {
          ...financeRecord,
          milestones: updatedMilestones,
          received_amount: totalReceived,
          pending_amount: newPending,
          payment_status: newPaymentStatus as any,
          updated_at: new Date().toISOString()
        };

        setFinanceRecord(updatedRecord);
        setClient(prev => prev ? ({ ...prev, paid_amount: totalReceived }) : null);

        try {
          await supabase.from('client_finance_records').update({
            milestones: updatedMilestones,
            received_amount: totalReceived,
            pending_amount: newPending,
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          }).eq('id', updatedRecord.id);

          if (client) {
            await supabase.from('workspace_clients').update({
              paid_amount: totalReceived,
              updated_at: new Date().toISOString()
            }).eq('id', client.id);
          }
        } catch (err) {
          console.error('Error updating payment completion in DB:', err);
        }
      }
    }

    setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null });
  };

  // Post-Production Project Update Handler
  const handleUpdatePostProdProject = async (projectId: string, updated: Partial<PostProductionProjectData>) => {
    if (!client) return;
    const updatedProj = { ...postProductionProject, ...updated } as any;
    setPostProductionProject(updatedProj);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      await supabase
        .from('post_production_projects')
        .upsert({
          client_id: client.id,
          user_id: workspaceId,
          workspace_id: client.workspace_id || workspaceId,
          project_manager_id: updated.project_manager_id ?? projectManagerId,
          project_manager_name: updated.project_manager_name ?? projectManagerName,
          overall_status: updated.overall_status ?? postProductionProject?.overall_status ?? 'active',
          deliverables: updated.deliverables ?? postProductionProject?.deliverables ?? [],
          enabled_segments: updated.enabled_segments ?? (postProductionProject as any)?.enabled_segments,
          disabled_categories: updated.disabled_categories ?? (postProductionProject as any)?.disabled_categories,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id' });
    } catch (err) {
      console.error('Error saving post production project:', err);
    }
  };

  // Listen for event types settings updates
  useEffect(() => {
    const handleEventTypesUpdated = () => {
      if (client?.workspace_id) {
        fetchWorkspaceEventTypes(client.workspace_id).then(evs => {
          if (evs && evs.length > 0) setEventTypes(evs.map(e => e.name));
        });
      }
    };
    window.addEventListener('workspace_event_types_updated', handleEventTypesUpdated);
    return () => window.removeEventListener('workspace_event_types_updated', handleEventTypesUpdated);
  }, [client?.workspace_id]);

  // Load client data by ID or Code
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('sc_cached_clients');
      if (stored) {
        const parsed: WorkspaceClient[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const match = parsed.find(c => 
            c.id === clientIdOrCode || 
            parseClientExtended(c).client_code.toLowerCase() === clientIdOrCode.toLowerCase()
          );
          if (match && !client) {
            setClient(match);
            const ext = parseClientExtended(match);
            setExtended(ext);
            setName(match.name || '');
            setPhone(match.phone || '');
            setEmail(match.email || '');
            setEventType(match.event_type || 'Wedding');
            setEventDate(match.event_date || '');
            setStatus((match.status as any) || 'active');
            setProjectManagerId(match.project_manager_id || ext.project_manager_id || '');
            setProjectManagerName(match.project_manager_name || ext.project_manager_name || '');
            setProjectManagerEmail(match.project_manager_email || ext.project_manager_email || '');
            setProjectManagerPhone(match.project_manager_phone || ext.project_manager_phone || '');
            setLoading(false);
          }
        }
      }
    } catch (_) {}
    fetchClientFullData();
  }, [clientIdOrCode]);

  const fetchClientFullData = async () => {
    if (!client) setLoading(true);
    setErrorMsg(null);

    if (!clientIdOrCode) {
      setErrorMsg('Client identifier missing.');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Try finding client by id
      let { data: foundClient } = await supabase
        .from('workspace_clients')
        .select('*')
        .eq('id', clientIdOrCode)
        .maybeSingle();

      // If not found by id, search all clients for matching client_code in notes
      if (!foundClient) {
        let query = supabase.from('workspace_clients').select('*');
        if (workspaceId !== 'ws_demo') {
          query = query.eq('workspace_id', workspaceId);
        }
        const { data: allClients } = await query;
        if (allClients) {
          const match = allClients.find(c => {
            const ext = parseClientExtended(c);
            return ext.client_code.toLowerCase() === clientIdOrCode.toLowerCase() || c.id === clientIdOrCode;
          });
          if (match) foundClient = match;
        }
      }

      if (!foundClient) {
        setErrorMsg('Client record not found in workspace.');
        setLoading(false);
        return;
      }

      setClient(foundClient);
      const ext = parseClientExtended(foundClient);
      setExtended(ext);
      setName(foundClient.name || '');
      setPhone(foundClient.phone || '');
      setEmail(foundClient.email || '');
      setEventType(foundClient.event_type || 'Wedding');
      setEventDate(foundClient.event_date || '');
      setStatus(foundClient.status || 'active');

      const pmId = foundClient.project_manager_id || ext.project_manager_id || '';
      const pmName = foundClient.project_manager_name || ext.project_manager_name || '';
      const pmEmail = foundClient.project_manager_email || ext.project_manager_email || '';
      const pmPhone = foundClient.project_manager_phone || ext.project_manager_phone || '';

      setProjectManagerId(pmId);
      setProjectManagerName(pmName);
      setProjectManagerEmail(pmEmail);
      setProjectManagerPhone(pmPhone);

      // Fetch Workspace Team Members for PM Assignment
      try {
        const members = await fetchWorkspaceTeamMembers(foundClient.workspace_id);
        setTeamMembers(members);
      } catch (_) {}

      // Fetch Workspace Event Types from Settings
      try {
        const evs = await fetchWorkspaceEventTypes(foundClient.workspace_id);
        if (evs && evs.length > 0) {
          setEventTypes(evs.map(e => e.name));
        }
      } catch (_) {}

      // Fetch All Tabs Data
      await Promise.all([
        fetchLeadQuotationVersions(foundClient),
        fetchPostProduction(foundClient),
        fetchFinanceAndSyncMilestones(foundClient),
        fetchMoodboards(foundClient),
        fetchClientTasks(foundClient)
      ]);

    } catch (e) {
      console.error('Error fetching client workspace data:', e);
      setErrorMsg('Failed to load client details.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. FETCH QUOTATION VERSIONS (SYNCED WITH LEADS CRM)
  // ─────────────────────────────────────────────────────────────
  const fetchLeadQuotationVersions = async (c: WorkspaceClient) => {
    setLoadingQuotes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const targetLeadId = c.lead_id;

      if (targetLeadId) {
        // Fetch through identical Leads CRM endpoint
        const res = await fetch(`/api/leads/${targetLeadId}/quotations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (json.success && Array.isArray(json.quotations) && json.quotations.length > 0) {
          setQuotationDocs(json.quotations);
          setLoadingQuotes(false);
          return;
        }
      }

      // Fallback: Direct database query on quotation_documents & quotations
      let docsQuery = supabase.from('quotation_documents').select('*').order('created_at', { ascending: false });
      if (c.lead_id) {
        docsQuery = docsQuery.or(`lead_id.eq.${c.lead_id},template_id.ilike.%${c.lead_id.slice(0, 8)}%`);
      } else {
        docsQuery = docsQuery.eq('client_id', c.id);
      }

      const { data: docs } = await docsQuery;

      if (docs && docs.length > 0) {
        const formatted: QuotationVersionItem[] = docs.map((d, idx) => ({
          id: d.id,
          template_id: d.template_id || d.id,
          lead_id: d.lead_id,
          version: d.version || (idx + 1),
          version_label: `Version ${d.version || (idx + 1)}`,
          title: d.title || d.content_json?.heroPage?.coupleNames || `Quotation Version ${idx + 1}`,
          is_final: d.is_final || d.content_json?.is_final === true,
          updated_at: d.updated_at || d.created_at,
          created_at: d.created_at,
          public_token: d.public_token || d.content_json?.public_token,
          total_amount: d.content_json?.pricingPage?.finalAmount || d.content_json?.pricing?.finalAmount || c.total_package_amount,
          content_json: d.content_json
        }));
        setQuotationDocs(formatted);
      } else {
        // Check quotations table
        const { data: qRows } = await supabase.from('quotations').select('*').eq('client_id', c.id).order('created_at', { ascending: false });
        if (qRows && qRows.length > 0) {
          const formatted: QuotationVersionItem[] = qRows.map((q, idx) => ({
            id: q.id,
            template_id: q.quotation_number || q.id,
            version: idx + 1,
            title: q.title || `Quotation ${q.quotation_number || idx + 1}`,
            is_final: q.status === 'accepted' || q.status === 'final',
            updated_at: q.updated_at || q.created_at,
            created_at: q.created_at,
            public_token: q.public_token,
            total_amount: q.total_amount || c.total_package_amount
          }));
          setQuotationDocs(formatted);
        } else {
          setQuotationDocs([]);
        }
      }
    } catch (e) {
      console.error('Error fetching quotation versions:', e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SET FINAL QUOTATION (TWO-WAY SYNC WITH LEADS CRM)
  // ─────────────────────────────────────────────────────────────
  const handleSetFinalQuotation = async (q: QuotationVersionItem) => {
    if (!client || settingFinalId) return;
    setSettingFinalId(q.template_id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const targetLeadId = client.lead_id || client.id;

      // 1. Call standard set-final API
      await fetch('/api/quotations/set-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quotationId: q.template_id,
          leadId: targetLeadId
        })
      });

      // 2. Direct database update for instant reactive UI
      await supabase
        .from('quotation_documents')
        .update({ is_final: false })
        .or(`lead_id.eq.${targetLeadId},template_id.ilike.%${targetLeadId.slice(0, 8)}%`);

      await supabase
        .from('quotation_documents')
        .update({ is_final: true, updated_at: new Date().toISOString() })
        .eq('template_id', q.template_id);

      if (client.lead_id) {
        await supabase
          .from('leads')
          .update({ final_quotation_id: q.template_id, updated_at: new Date().toISOString() })
          .eq('id', client.lead_id);
      }

      // Update local state
      setQuotationDocs(prev => prev.map(item => ({
        ...item,
        is_final: item.template_id === q.template_id
      })));

      // Sync finance
      fetchFinanceAndSyncMilestones(client);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quotation_finalized', { detail: { clientId: client.id, quotationId: q.template_id } }));
        localStorage.setItem('post_production_updated', Date.now().toString());
      }
    } catch (e) {
      console.error('Error setting final quotation:', e);
    } finally {
      setSettingFinalId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. FETCH POST-PRODUCTION
  // ─────────────────────────────────────────────────────────────
  const fetchPostProduction = async (c: WorkspaceClient) => {
    setLoadingPostProd(true);
    try {
      const { data } = await supabase
        .from('post_production_projects')
        .select('*')
        .eq('client_id', c.id)
        .maybeSingle();

      if (data) {
        setPostProductionProject(data);
      }
    } catch (e) {
      console.error('Error fetching post production:', e);
    } finally {
      setLoadingPostProd(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. FETCH FINANCE & SYNC MILESTONES (PREVENT MISMATCH)
  // ─────────────────────────────────────────────────────────────
  const fetchFinanceAndSyncMilestones = async (c: WorkspaceClient) => {
    setLoadingFinance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch from client_finance_records
      let { data: finRow } = await supabase
        .from('client_finance_records')
        .select('*')
        .eq('client_id', c.id)
        .maybeSingle();

      const totalPkg = Number(c.total_package_amount) || 150000;
      const totalPaid = Number(c.paid_amount) || 0;

      // If no finance record exists or milestones empty, check quotation documents first!
      if (!finRow || !finRow.milestones || finRow.milestones.length === 0) {
        const targetLeadId = c.lead_id || c.id;
        const leadShort = targetLeadId ? targetLeadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : '';

        let docsQuery = supabase
          .from('quotation_documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (targetLeadId) {
          docsQuery = docsQuery.or(`lead_id.eq.${targetLeadId},client_id.eq.${c.id},template_id.ilike.%${leadShort}%`);
        } else {
          docsQuery = docsQuery.eq('client_id', c.id);
        }

        const { data: quoteDocs } = await docsQuery;
        const selectedQuoteDoc = quoteDocs?.find((d: any) => d.is_final === true || d.content_json?.is_final === true) || quoteDocs?.[0];

        if (selectedQuoteDoc?.content_json) {
          const financials = extractFinancialsFromQuotation(selectedQuoteDoc.content_json, c.event_date);
          const newRec = {
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            base_package_price: financials.base_package_price,
            discount_amount: financials.discount_amount,
            accommodation_charges: financials.accommodation_charges,
            travel_charges: financials.travel_charges,
            additional_charges: financials.additional_charges,
            subtotal_amount: financials.subtotal_amount,
            gst_rate: financials.gst_rate,
            gst_amount: financials.gst_amount,
            final_total_amount: financials.final_total_amount,
            received_amount: financials.received_amount || totalPaid,
            pending_amount: Math.max(0, financials.final_total_amount - (financials.received_amount || totalPaid)),
            payment_status: financials.payment_status,
            milestones: financials.milestones,
            updated_at: new Date().toISOString()
          };

          if (workspaceId !== 'ws_demo') {
            const { data: savedRec } = await supabase
              .from('client_finance_records')
              .upsert([newRec], { onConflict: 'client_id' })
              .select('*')
              .maybeSingle();

            if (savedRec) finRow = savedRec;
            else finRow = newRec as any;

            await supabase
              .from('workspace_clients')
              .update({
                total_package_amount: financials.final_total_amount,
                paid_amount: financials.received_amount || totalPaid,
                event_type: financials.event_type || c.event_type || undefined,
                updated_at: new Date().toISOString()
              })
              .eq('id', c.id);
          } else {
            finRow = newRec as any;
          }
        } else {
          const tokenAmt = Math.round(totalPkg * 0.15);
          const advAmt = Math.round(totalPkg * 0.35);
          const eventAmt = Math.round(totalPkg * 0.35);
          const finalAmt = Math.max(0, totalPkg - (tokenAmt + advAmt + eventAmt));

          const baseDate = c.event_date ? new Date(c.event_date) : new Date();
          const tokenDate = new Date().toISOString().split('T')[0];
          const preEventDate = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const weddingDate = baseDate.toISOString().split('T')[0];
          const deliveryDate = new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          // Cumulative milestone calculation
          const milestones = [
            {
              id: `m_1_${c.id.slice(0, 6)}`,
              step_name: 'Token Booking Amount (15%)',
              amount: tokenAmt,
              due_date: tokenDate,
              status: totalPaid >= tokenAmt ? 'completed' : 'pending',
              payment_mode: 'UPI',
              paid_date: totalPaid >= tokenAmt ? tokenDate : null
            },
            {
              id: `m_2_${c.id.slice(0, 6)}`,
              step_name: 'Advance Amount - Pre-Event (35%)',
              amount: advAmt,
              due_date: preEventDate,
              status: totalPaid >= (tokenAmt + advAmt) ? 'completed' : 'pending',
              payment_mode: 'Bank Transfer',
              paid_date: totalPaid >= (tokenAmt + advAmt) ? preEventDate : null
            },
            {
              id: `m_3_${c.id.slice(0, 6)}`,
              step_name: 'On Wedding Day (35%)',
              amount: eventAmt,
              due_date: weddingDate,
              status: totalPaid >= (tokenAmt + advAmt + eventAmt) ? 'completed' : 'pending',
              payment_mode: 'UPI',
              paid_date: totalPaid >= (tokenAmt + advAmt + eventAmt) ? weddingDate : null
            },
            {
              id: `m_4_${c.id.slice(0, 6)}`,
              step_name: 'Final Delivery & Album Handover (15%)',
              amount: finalAmt,
              due_date: deliveryDate,
              status: totalPaid >= totalPkg && totalPkg > 0 ? 'completed' : 'pending',
              payment_mode: 'Bank Transfer',
              paid_date: totalPaid >= totalPkg && totalPkg > 0 ? deliveryDate : null
            }
          ];

          const newRec = {
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            base_package_price: totalPkg,
            discount_amount: 0,
            accommodation_charges: 0,
            travel_charges: 0,
            additional_charges: 0,
            subtotal_amount: totalPkg,
            gst_rate: 0,
            gst_amount: 0,
            final_total_amount: totalPkg,
            received_amount: totalPaid,
            pending_amount: Math.max(0, totalPkg - totalPaid),
            payment_status: totalPaid >= totalPkg && totalPkg > 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid',
            milestones: milestones,
            updated_at: new Date().toISOString()
          };

          if (workspaceId !== 'ws_demo') {
            const { data: savedRec } = await supabase
              .from('client_finance_records')
              .upsert([newRec], { onConflict: 'client_id' })
              .select('*')
              .maybeSingle();

            if (savedRec) finRow = savedRec;
            else finRow = newRec as any;
          } else {
            finRow = newRec as any;
          }
        }
      }

      setFinanceRecord(finRow);
    } catch (e) {
      console.error('Error fetching finance:', e);
    } finally {
      setLoadingFinance(false);
    }
  };

  // Toggle Milestone Paid/Pending Status
  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    if (!client || !financeRecord) return;
    const newStatus = currentStatus === 'completed' || currentStatus === 'paid' ? 'pending' : 'completed';

    const updatedMilestones = (financeRecord.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: newStatus,
          paid_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return m;
    });

    // Recompute total received from completed milestones
    const totalReceived = updatedMilestones
      .filter(m => m.status === 'completed' || m.status === 'paid')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalPkg = financeRecord.final_total_amount || client.total_package_amount || 0;
    const newPending = Math.max(0, totalPkg - totalReceived);
    const newPaymentStatus = totalReceived >= totalPkg && totalPkg > 0 ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid';

    const updatedRecord = {
      ...financeRecord,
      received_amount: totalReceived,
      pending_amount: newPending,
      payment_status: newPaymentStatus,
      milestones: updatedMilestones,
      updated_at: new Date().toISOString()
    };

    setFinanceRecord(updatedRecord);
    setClient(prev => prev ? ({ ...prev, paid_amount: totalReceived }) : null);

    // Sync to Supabase
    try {
      await supabase
        .from('client_finance_records')
        .update({
          received_amount: totalReceived,
          pending_amount: newPending,
          payment_status: newPaymentStatus,
          milestones: updatedMilestones,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', client.id);

      await supabase
        .from('workspace_clients')
        .update({
          paid_amount: totalReceived,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);
    } catch (e) {
      console.error('Error updating milestone status:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. FETCH MULTI-EVENT MOOD BOARDS & PREP
  // ─────────────────────────────────────────────────────────────
  const fetchMoodboards = async (c: WorkspaceClient) => {
    setLoadingMoodboard(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${c.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = Array.isArray(data.moodboards) ? data.moodboards : data.moodboard ? [data.moodboard] : [];
        setMoodboards(list);
        if (list.length > 0) {
          setSelectedMoodboardId(prev => (prev && list.some((m: any) => m.id === prev) ? prev : list[0].id));
        }
      }
    } catch (e) {
      console.error('Error fetching moodboards:', e);
    } finally {
      setLoadingMoodboard(false);
    }
  };

  const handleCreateMoodboard = async () => {
    if (!client) return;
    setIsCreatingMb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'create',
          event_type: newMbEventType,
          title: newMbTitle.trim() || `${newMbEventType} Moodboard`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.moodboard) {
        setMoodboards(prev => [...prev, data.moodboard]);
        setSelectedMoodboardId(data.moodboard.id);
        setShowAddMoodboardModal(false);
        setNewMbTitle('');
      }
    } catch (e) {
      console.error('Error creating moodboard:', e);
    } finally {
      setIsCreatingMb(false);
    }
  };

  const handleDeleteMoodboard = async (mbId: string) => {
    if (!client || moodboards.length <= 1) {
      alert('You must have at least one event moodboard for this client.');
      return;
    }
    if (!confirm('Are you sure you want to delete this event moodboard?')) return;
    setIsDeletingMb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${client.id}?id=${mbId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const remaining = moodboards.filter(m => m.id !== mbId);
        setMoodboards(remaining);
        if (remaining.length > 0) {
          setSelectedMoodboardId(remaining[0].id);
        }
      }
    } catch (e) {
      console.error('Error deleting moodboard:', e);
    } finally {
      setIsDeletingMb(false);
    }
  };

  const handleUpdateMoodboardStatus = async (newStatus: string) => {
    if (!client || !currentMoodboard) return;
    setUpdatingMbStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: currentMoodboard.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.moodboard) {
        setMoodboards(prev => prev.map(m => m.id === data.moodboard.id ? data.moodboard : m));
      }
    } catch (e) {
      console.error('Error updating moodboard status:', e);
    } finally {
      setUpdatingMbStatus(false);
    }
  };

  const copyMoodboardLink = () => {
    if (!currentMoodboard?.token) return;
    const url = `${window.location.origin}/p/moodboard/${currentMoodboard.token}`;
    navigator.clipboard.writeText(url);
    setCopiedMoodboardLink(true);
    setTimeout(() => setCopiedMoodboardLink(false), 2500);
  };

  const shareMoodboardOnWhatsApp = () => {
    if (!currentMoodboard?.token) return;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const publicUrl = `${window.location.origin}/p/moodboard/${currentMoodboard.token}`;
    const coupleName = name || 'there';
    const mbTitle = currentMoodboard.title || `${currentMoodboard.event_type || 'Event'} Moodboard`;
    const text = `Hi ${coupleName}! ✨\n\nHere is your private *${mbTitle}* portal from our studio:\n🔗 ${publicUrl}\n\nPlease add your couple portraits, shoot locations, coordinators, and inspiration photos so our team can prepare your shot lists perfectly!\n\nLooking forward to capturing your celebrations! 📸`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleStudioUploadMbPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'couple' | 'place',
    placeId?: string,
    photoField?: 'couple_photo_url' | 'bride_photo_url' | 'groom_photo_url'
  ) => {
    if (!currentMoodboard || !e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      setUploadingMbPhoto(placeId ? `${placeId}-${photoField}` : 'couple');
      const compressed = await compressMoodboardImage(file, 1280, 0.72);
      const formData = new FormData();
      formData.append('file', compressed, compressed instanceof File ? compressed.name : 'photo.webp');
      formData.append('folder', `moodboards/${currentMoodboard.token}`);

      const uploadRes = await fetch('/api/upload/r2', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      const uploadedUrl = uploadData.url;

      if (type === 'couple') {
        const nextPhotos = [...(currentMoodboard.couple_photos || []), { url: uploadedUrl, caption: '' }];
        await handleSaveMoodboardFields({ couple_photos: nextPhotos });
      } else if (type === 'place' && placeId && photoField) {
        const nextPlaces = (currentMoodboard.shoot_places || []).map((p: any) =>
          p.id === placeId ? { ...p, [photoField]: uploadedUrl } : p
        );
        await handleSaveMoodboardFields({ shoot_places: nextPlaces });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.message || 'Error uploading image'));
    } finally {
      setUploadingMbPhoto(null);
      e.target.value = '';
    }
  };

  const handleSaveMoodboardFields = async (fields: Record<string, any>) => {
    if (!client || !currentMoodboard) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: currentMoodboard.id,
          ...fields,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.moodboard) {
        setMoodboards(prev => prev.map(m => m.id === data.moodboard.id ? data.moodboard : m));
      }
    } catch (e) {
      console.error('Error updating moodboard:', e);
    }
  };

  // Save Client Details & PM Assignment
  const handleSaveClientDetails = async () => {
    if (!client) return;
    setIsSaving(true);
    try {
      const assignedPm = teamMembers.find(m => m.id === projectManagerId);
      const updatedPmName = assignedPm ? assignedPm.name : (projectManagerId ? projectManagerName : '');
      const updatedPmEmail = assignedPm ? (assignedPm.email || '') : (projectManagerId ? projectManagerEmail : '');
      const updatedPmPhone = assignedPm ? (assignedPm.phone || '') : (projectManagerId ? projectManagerPhone : '');

      const updatedExtended = {
        ...extended,
        project_manager_id: projectManagerId || undefined,
        project_manager_name: updatedPmName || undefined,
        project_manager_email: updatedPmEmail || undefined,
        project_manager_phone: updatedPmPhone || undefined,
      };

      const serializedNotes = serializeClientExtended(updatedExtended);
      const updatedFields: any = {
        name,
        phone,
        email: email.trim() || null,
        event_type: eventType,
        event_date: eventDate || null,
        status,
        project_manager_id: projectManagerId || null,
        project_manager_name: updatedPmName || null,
        project_manager_email: updatedPmEmail || null,
        project_manager_phone: updatedPmPhone || null,
        notes: serializedNotes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('workspace_clients')
        .update(updatedFields)
        .eq('id', client.id);

      if (error) {
        // Fallback update if direct columns are not yet in DB schema
        delete updatedFields.project_manager_id;
        delete updatedFields.project_manager_name;
        delete updatedFields.project_manager_email;
        delete updatedFields.project_manager_phone;
        await supabase
          .from('workspace_clients')
          .update({ ...updatedFields, notes: serializedNotes })
          .eq('id', client.id);
      }

      // Direct dual-sync to fw_projects
      try {
        const { error: projErr } = await supabase
          .from('fw_projects')
          .update({
            project_manager_id: projectManagerId || null,
            project_manager_name: updatedPmName || null,
            updated_at: new Date().toISOString(),
          })
          .or(`client_id.eq.${client.id},client_name.ilike.${name.trim()}`);

        if (projErr) {
          await supabase
            .from('fw_projects')
            .update({
              project_manager_id: projectManagerId || null,
              project_manager_name: updatedPmName || null,
              updated_at: new Date().toISOString(),
            })
            .ilike('client_name', name.trim());
        }
      } catch {
        await supabase
          .from('fw_projects')
          .update({
            project_manager_id: projectManagerId || null,
            project_manager_name: updatedPmName || null,
            updated_at: new Date().toISOString(),
          })
          .ilike('client_name', name.trim());
      }

      setExtended(updatedExtended);
      setClient(prev => prev ? ({ ...prev, ...updatedFields, project_manager_name: updatedPmName }) : null);
      setProjectManagerName(updatedPmName);
      setProjectManagerEmail(updatedPmEmail);
      setProjectManagerPhone(updatedPmPhone);
      alert('Client details & Project Manager assignment saved successfully!');
    } catch (e: any) {
      console.error('Error saving client details:', e);
      alert(`Failed to save: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 🗑️ CASCADE SAFE DELETE CLIENT (DB LEVEL PURGE) ───
  const handleCascadeDeleteClient = async () => {
    if (!client) return;
    setIsDeleting(true);
    try {
      const clientId = client.id;
      const leadId = client.lead_id;

      // 1. Delete client finance record
      await supabase.from('client_finance_records').delete().eq('client_id', clientId);

      // 2. Delete finance audit logs
      await supabase.from('finance_audit_logs').delete().eq('client_id', clientId);

      // 3. Delete post-production project
      await supabase.from('post_production_projects').delete().eq('client_id', clientId);

      // 4. Delete quotation documents
      if (leadId) {
        await supabase.from('quotation_documents').delete().eq('lead_id', leadId);
      }
      await supabase.from('quotation_documents').delete().eq('lead_id', clientId);

      // 5. Delete workspace_clients record
      const { error: delErr } = await supabase.from('workspace_clients').delete().eq('id', clientId);
      if (delErr) throw delErr;

      setShowDeleteModal(false);
      router.push('/workspace/clients');
    } catch (err: any) {
      console.error('Cascade delete error:', err);
      alert(`Failed to delete client: ${err.message || 'Database error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Ceremony Event
  const handleAddEvent = () => {
    if (!newEventName.trim() || !client) return;

    const newEv: ClientEventItem = {
      id: `ev_${Date.now()}`,
      name: newEventName.trim(),
      date: newEventDate || eventDate || new Date().toISOString().split('T')[0],
      time_start: newEventTimeStart,
      time_end: newEventTimeEnd,
      venue: newEventVenue.trim() || 'Main Venue',
      city: newEventCity.trim() || 'Mumbai',
      assigned_crew: newEventCrew.trim()
    };

    const updatedEvents = [...extended.events, newEv];
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();

    setShowAddEventModal(false);
    setNewEventName('');
    setNewEventVenue('');
  };

  // Delete Ceremony Event
  const handleDeleteEvent = (evId: string) => {
    if (!client || !confirm('Are you sure you want to delete this ceremony?')) return;
    const updatedEvents = extended.events.filter(e => e.id !== evId);
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();
  };

  // Deliverable Update in Post-Production
  const handleDeliverableUpdate = (deliverableId: string, field: keyof DeliverableItem, value: any) => {
    if (!postProductionProject || !client) return;

    const updatedDeliverables = postProductionProject.deliverables.map(d => {
      if (d.id === deliverableId) return { ...d, [field]: value };
      return d;
    });

    const updatedProj = { ...postProductionProject, deliverables: updatedDeliverables };
    setPostProductionProject(updatedProj);

    supabase
      .from('post_production_projects')
      .update({ deliverables: updatedDeliverables, updated_at: new Date().toISOString() })
      .eq('id', postProductionProject.id)
      .then();
  };

  // Record Payment
  const handleRecordPayment = async () => {
    if (!client) return;
    const numAmt = parseFloat(payAmount) || 0;
    if (numAmt <= 0) return;

    const newPaid = (client.paid_amount || 0) + numAmt;
    const totalPkg = client.total_package_amount || 0;
    const newPaymentStatus = newPaid >= totalPkg ? 'paid' : 'partially_paid';

    try {
      await supabase
        .from('workspace_clients')
        .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      if (financeRecord) {
        const newPending = Math.max(0, (financeRecord.final_total_amount || totalPkg) - newPaid);
        
        // Update milestone status based on new paid amount
        let cumulative = 0;
        const updatedMilestones = (financeRecord.milestones || []).map(m => {
          cumulative += Number(m.amount) || 0;
          const isDone = newPaid >= cumulative;
          return {
            ...m,
            status: isDone ? 'completed' : m.status === 'completed' ? 'completed' : 'pending',
            paid_date: isDone && !m.paid_date ? payDate : m.paid_date
          };
        });

        await supabase
          .from('client_finance_records')
          .update({
            received_amount: newPaid,
            pending_amount: newPending,
            payment_status: newPaymentStatus,
            milestones: updatedMilestones,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', client.id);
      }

      setClient({ ...client, paid_amount: newPaid });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayRef('');
      fetchFinanceAndSyncMilestones(client);
    } catch (e) {
      console.error('Error recording payment:', e);
      alert('Error recording payment.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. TASKS & WORKFLOW MANAGEMENT (LUXURY CREAM TASK SYNC)
  // ─────────────────────────────────────────────────────────────
  const fetchClientTasks = async (targetClient?: WorkspaceClient) => {
    const c = targetClient || client;
    if (!c) return;
    setLoadingTasks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || '';
      const res = await fetch(`/api/workspace/tasks?workspaceId=${c.workspace_id}&clientId=${c.id}&userId=${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setClientTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching client tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleGeneratePipeline = async () => {
    if (!client || isSyncingPipeline) return;
    setIsSyncingPipeline(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || '';
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_client_pipeline',
          clientId: client.id,
          projectId: postProductionProject?.id || null,
          workspaceId: client.workspace_id,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchClientTasks();
      }
    } catch (err) {
      console.error('Error generating pipeline:', err);
    } finally {
      setIsSyncingPipeline(false);
    }
  };

  const handleToggleClientTask = async (taskId: string, currentStatus: string) => {
    const isCompleted = currentStatus !== 'completed';
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || '';
    
    // Optimistic update
    setClientTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: isCompleted ? 'completed' : 'todo' } : t));
    try {
      await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_completion',
          taskId,
          isCompleted,
          userId,
        }),
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      fetchClientTasks();
    }
  };

  const handleToggleClientChecklistItem = async (taskId: string, itemId: string, completed: boolean) => {
    const task = clientTasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedChecklist = (task.checklist_items || []).map((ci: any) =>
      ci.id === itemId ? { ...ci, is_completed: completed } : ci
    );
    // Optimistic update
    setClientTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist_items: updatedChecklist } : t));
    try {
      await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_checklist',
          taskId,
          checklistItems: updatedChecklist,
        }),
      });
    } catch (err) {
      console.error('Error updating checklist:', err);
      fetchClientTasks();
    }
  };

  const handleCreateClientTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newClientTaskTitle.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || '';
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          taskData: {
            workspace_id: client.workspace_id,
            client_id: client.id,
            created_by: userId,
            title: newClientTaskTitle.trim(),
            description: newClientTaskDesc.trim() || undefined,
            category: newClientTaskCategory,
            priority: newClientTaskPriority,
            due_date: newClientTaskDueDate || undefined,
            is_personal: false,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowClientTaskModal(false);
        setNewClientTaskTitle('');
        setNewClientTaskDesc('');
        setNewClientTaskDueDate('');
        fetchClientTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleDeleteClientTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setClientTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/workspace/tasks?type=task&id=${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchClientTasks();
    }
  };

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/client/${extended.portal_token}` : `/p/client/${extended.portal_token}`;

  const copyPortalLink = () => {
    const textToCopy = `StudioCore Wedding Portal\n🔗 Link: ${portalUrl}\n🔐 Access PIN: ${extended.portal_pin}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const msg = `Namaste ${name} Ji! 🙏\nHere is your personal StudioCore Wedding Portal to access your Event Schedule, Quotations, Post-Production status & Google Drive delivery links:\n\n🔗 *Portal Link:* ${portalUrl}\n🔐 *Access PIN:* ${extended.portal_pin}\n\nPlease enter your 4-digit PIN to access your wedding space anytime!`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` 
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Loading View (Consistent SSR & client hydration)
  if (!isMounted || (loading && !client)) {
    return <StudioCoreLiquidLoader label="Loading Client 360 Workspace..." />;
  }

  // Error View
  if (errorMsg || !client) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-12 text-center text-slate-900 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Client Workspace Not Found</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMsg || 'Please return to Clients Directory.'}</p>
        <Link
          href="/workspace/clients"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 font-black text-xs text-slate-900 rounded-xl shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients Directory
        </Link>
      </div>
    );
  }

  const clientInitials = getClientInitials(name);

  // Group deliverables by category
  const photoDeliverables = Array.isArray(postProductionProject?.deliverables) ? postProductionProject.deliverables.filter(d => d.category === 'photos') : [];
  const videoDeliverables = Array.isArray(postProductionProject?.deliverables) ? postProductionProject.deliverables.filter(d => d.category === 'videos') : [];
  const albumDeliverables = Array.isArray(postProductionProject?.deliverables) ? postProductionProject.deliverables.filter(d => d.category === 'albums') : [];
  const customDeliverables = Array.isArray(postProductionProject?.deliverables) ? postProductionProject.deliverables.filter(d => !['photos', 'videos', 'albums'].includes(d.category)) : [];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">

        {/* ── BREADCRUMB & BACK BUTTON ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/workspace/clients"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-amber-900 bg-white hover:bg-amber-50/70 border border-[#EAE5DA] px-3.5 py-2 rounded-xl transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            Back to Clients Directory
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Clients</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-black">{name}</span>
          </div>
        </div>

        {/* ── CLIENT HERO PROFILE CARD (INITIALS AVATAR - NO HEX CODE) ── */}
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* INITIALS GRADIENT AVATAR */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 shadow-md border border-amber-300 select-none tracking-wider">
              {clientInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{name}</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                  {extended.client_code}
                </span>
                <ClientStatusDropdown
                  status={status}
                  clientId={client?.id}
                  size="md"
                  onStatusChange={async (newStatus) => {
                    setStatus(newStatus);
                    if (client) {
                      setClient(prev => prev ? { ...prev, status: newStatus } : null);
                      try {
                        await supabase
                          .from('workspace_clients')
                          .update({ status: newStatus, updated_at: new Date().toISOString() })
                          .eq('id', client.id);
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('workspace_client_updated', { detail: { clientId: client.id, status: newStatus } }));
                        }
                      } catch (err) {
                        console.error('Error updating status:', err);
                      }
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {eventType}
                </span>
                {phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action: In-House PM Selector & Share Client Portal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* In-House Project Manager 3D Cream Dropdown */}
            <div className="min-w-[210px] max-w-[260px]">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-600" />
                <span>Project Manager (In-House)</span>
              </div>
              <Searchable3DCreamSelect
                options={pmOptions}
                value={projectManagerId}
                onChange={(val) => handleQuickAssignPM(val)}
                placeholder="Assign Project Manager..."
                searchPlaceholder="Search in-house team..."
              />
            </div>

            <div className="flex flex-col justify-end">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-5 py-3 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer h-[42px] whitespace-nowrap"
              >
                <Share2 className="w-4 h-4" />
                Share Client Portal & PIN
              </button>
            </div>
          </div>
        </div>

        {/* ── CLIENT WORKSPACE TABS NAVIGATION ── */}
        <div className="flex border-b border-[#EAE5DA] bg-[#FAF8F2] p-1.5 rounded-2xl gap-1 overflow-x-auto shadow-2xs">
          {[
            { id: 'overview', label: 'Overview & Profile', icon: User },
            { id: 'quotations', label: 'Quotations & Versions', icon: FileText },
            { id: 'events', label: 'Events & Bookings', icon: Calendar },
            { id: 'moodboard', label: 'Mood Board ✨', icon: Sparkles },
            { id: 'tasks', label: 'Tasks & Workflow', icon: CheckSquare },
            { id: 'post_production', label: 'Post-Production', icon: Film },
            { id: 'finance', label: 'Finance & Invoices', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'tasks' && clientTasks.length === 0) {
                    fetchClientTasks();
                  }
                }}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-amber-400 text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW & PROFILE
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Contact Info Card */}
              <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-amber-600" />
                  Client Profile & Contact Information
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Client / Couple Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email ID</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                      <Searchable3DCreamSelect
                        options={eventTypeOptions}
                        value={eventType}
                        onChange={(val) => setEventType(val)}
                        placeholder="Select Event Type..."
                        searchPlaceholder="Search event type..."
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Main Event Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Group & Portal Access Card */}
              <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    WhatsApp Group & Client Portal
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">WhatsApp Group Invite Link</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://chat.whatsapp.com/..."
                          value={extended.whatsapp_group_link}
                          onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_link: e.target.value }))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900 focus:outline-none"
                        />
                        {extended.whatsapp_group_link && (
                          <a
                            href={extended.whatsapp_group_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1 transition"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">WhatsApp Group ID (JID)</label>
                        <input
                          type="text"
                          placeholder="1203630...@g.us"
                          value={extended.whatsapp_group_id}
                          onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_id: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">4-Digit Security PIN</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={extended.portal_pin}
                          onChange={(e) => setExtended(prev => ({ ...prev, portal_pin: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono font-black text-amber-900 text-sm"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-black text-amber-900 text-xs">Public Client Portal</p>
                        <p className="text-[11px] text-amber-700 font-mono truncate max-w-[260px]">{portalUrl}</p>
                      </div>
                      <button
                        onClick={copyPortalLink}
                        className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={handleSaveClientDetails}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 font-black text-xs text-slate-900 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Client Details
                  </button>
                </div>
              </div>
            </div>

            {/* ─── INTERACTIVE STUDIO NOTES & TIMELINE COMMENTS ─── */}
            <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shadow-2xs">
                    <MessageSquare className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Internal Studio Notes & Timeline Comments
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Private studio records, voice memos, client requests, and production logs.
                    </p>
                  </div>
                </div>

                {/* Voice AI Note Button */}
                <AiMicButton
                  size="sm"
                  buttonText="AI Voice"
                  onInsertComment={(transcribedText) => {
                    if (transcribedText) {
                      handleAddStudioComment(transcribedText, true);
                    }
                  }}
                />
              </div>

              {/* Add New Comment Box */}
              <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE5DA] space-y-3 shadow-2xs">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStudioComment();
                    }
                  }}
                  placeholder="Add internal studio note, special instruction, or client update... (Press Ctrl+Enter to submit)"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Posting as: <strong className="text-slate-800 font-bold">{projectManagerName || 'Studio Team'}</strong></span>
                    <span className="text-slate-400 text-[10px] hidden sm:inline">(Ctrl + Enter to send)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddStudioComment()}
                    disabled={isAddingComment || !newCommentText.trim()}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAddingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Post Note</span>
                  </button>
                </div>
              </div>

              {/* Timeline Stream of Comments */}
              <div className="space-y-3 pt-1">
                {(!extended.studio_comments || extended.studio_comments.length === 0) ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-[#EAE5DA] text-slate-400 text-xs">
                    No internal notes recorded yet. Use the box above or Voice AI to log your first studio note.
                  </div>
                ) : (
                  extended.studio_comments.map((comment) => {
                    const d = new Date(comment.created_at);
                    const formattedDate = !isNaN(d.getTime())
                      ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '';
                    const formattedTime = !isNaN(d.getTime())
                      ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '';

                    return (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          comment.is_ai
                            ? 'bg-gradient-to-r from-amber-50/50 via-[#FFFDF9] to-amber-50/20 border-amber-200 shadow-2xs'
                            : 'bg-white border-[#EAE5DA] shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              {comment.is_ai ? (
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              {comment.author_name || 'Studio Team'}
                            </span>

                            {comment.is_ai && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                🎙️ Voice AI
                              </span>
                            )}

                            <span className="text-slate-300">•</span>

                            <span className="text-[11px] text-slate-500 font-medium">
                              {formattedDate} at {formattedTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(comment.text);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Copy Note"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudioComment(comment.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ─── 🗑️ DANGER ZONE: SAFE DELETE CLIENT ─── */}
            <div className="bg-rose-50/50 rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Danger Zone: Delete Client Workspace
                </h4>
                <p className="text-[11px] text-rose-700 font-medium max-w-lg">
                  Permanently delete <strong className="font-black text-rose-950">{name || client.name}</strong> and remove all associated finance cards, milestone schedules, quotations, deliverables, and invoices.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Client</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: QUOTATIONS & VERSIONS (TWO-WAY SYNCED WITH LEADS CRM)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'quotations' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Quotation Proposal Versions</h3>
                <p className="text-xs text-slate-500 font-medium">All proposal versions from CRM. The Final accepted quotation is highlighted in emerald green.</p>
              </div>
              <button
                onClick={() => fetchLeadQuotationVersions(client)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQuotes ? 'animate-spin text-amber-600' : ''}`} />
                Sync Versions
              </button>
            </div>

            {loadingQuotes ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading proposal versions from CRM...</p>
              </div>
            ) : quotationDocs.length === 0 ? (
              <div className="p-10 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3 shadow-xs">
                <FileText className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Quotations Found For This Client</h4>
                <p className="text-xs text-slate-500">Quotations created in the Leads CRM will appear here automatically.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {quotationDocs.map((doc, idx) => {
                  const isFinal = doc.is_final;
                  const qNum = doc.template_id || `Q-${idx + 1}`;
                  const totalAmt = doc.total_amount || doc.financials?.total_amount || doc.content_json?.pricingPage?.finalAmount || client.total_package_amount || 0;

                  return (
                    <div
                      key={doc.template_id || doc.id || idx}
                      className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                        isFinal 
                          ? 'bg-gradient-to-r from-emerald-50/90 via-[#FFFDF9] to-emerald-50/50 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md' 
                          : 'bg-[#FFFDF9] border-[#EAE5DA] hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Version Emblem */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs shrink-0 ${
                          isFinal ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          V{doc.version || (idx + 1)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{doc.title || `Quotation Version ${doc.version || (idx + 1)}`}</h4>
                            {isFinal ? (
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs flex items-center gap-1.5">
                                <Crown className="w-3.5 h-3.5 text-amber-200" />
                                FINAL APPROVED QUOTATION
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Draft Version
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            Updated: {new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Package Amount: <span className="font-black text-slate-900 font-mono">₹{totalAmt.toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {!isFinal ? (
                          <button
                            onClick={() => handleSetFinalQuotation(doc)}
                            disabled={settingFinalId === doc.template_id}
                            className="px-3.5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            {settingFinalId === doc.template_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Crown className="w-3.5 h-3.5 text-amber-200" />
                            )}
                            Finalize Quotation
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-emerald-600" /> Approved Final
                          </span>
                        )}

                        {/* Client Preview */}
                        <button
                          type="button"
                          onClick={() => {
                            const clientUrl = `/p/quotation/${doc.public_token || doc.template_id}`;
                            window.open(clientUrl, '_blank');
                          }}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#EAE5DA] transition text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          Client Preview
                        </button>

                        {/* Edit in Builder */}
                        <Link
                          href={`/workspace/quotations/builder/templet/${doc.template_id}`}
                          className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 transition text-xs font-black flex items-center gap-1.5 shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Builder
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: EVENTS & BOOKINGS (MULTI-DAY ITINERARY CARDS)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
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
                  Ceremony schedules, timings, venues, and crew requirements.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Add Ceremony / Event
                </button>
              </div>
            </div>

            {displayedEvents.length === 0 ? (
              <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Ceremonies Tracked Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add ceremonies manually using &quot;+ Add Ceremony&quot; or accept a Quotation to automatically sync your multi-day itinerary.
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
                                  Custom
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

                          {ev.source === 'manual' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Ceremony"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                              <Users className="w-3 h-3 text-indigo-500" />
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
            TAB: TASKS & WORKFLOW (LUXURY CREAM APPLE NOTES / GOOGLE KEEP)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (() => {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          const total = clientTasks.length;
          const completed = clientTasks.filter(t => t.status === 'completed').length;
          const pending = total - completed;
          const overdue = clientTasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < now).length;

          const filtered = clientTasks.filter(t => {
            const isOverdue = t.due_date && t.status !== 'completed' && new Date(t.due_date) < now;
            if (taskFilter === 'pending') return t.status !== 'completed';
            if (taskFilter === 'completed') return t.status === 'completed';
            if (taskFilter === 'overdue') return isOverdue;
            return true;
          });

          return (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                    <span>Tasks & Post-Production Workflow</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Apple Notes & Google Keep luxury cream task manager with interactive checklists, overdue tracking, and automated post-production pipeline sync.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGeneratePipeline}
                    disabled={isSyncingPipeline}
                    className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingPipeline ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-slate-900" />
                    )}
                    <span>⚡ Auto-Generate Post-Production Pipeline</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClientTaskModal(true)}
                    className="px-4 py-2 text-xs font-black text-slate-900 bg-white hover:bg-amber-50 border border-[#EAE5DA] rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-600" />
                    <span>+ New Task / Note</span>
                  </button>
                </div>
              </div>

              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#FFFDF9] rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">{total}</div>
                </div>

                <div className="p-4 bg-[#FFFDF9] rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending</div>
                  <div className="text-2xl font-black text-amber-800 font-mono mt-1">{pending}</div>
                </div>

                <div className="p-4 bg-[#FFFDF9] rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Completed</div>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{completed}</div>
                </div>

                <div className={`p-4 rounded-2xl border shadow-2xs ${
                  overdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-[#FFFDF9] border-[#EAE5DA]'
                }`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${
                    overdue > 0 ? 'text-rose-700 font-black' : 'text-slate-500'
                  }`}>
                    {overdue > 0 ? '⚠️ Overdue' : 'Overdue'}
                  </div>
                  <div className={`text-2xl font-black font-mono mt-1 ${
                    overdue > 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {overdue}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-3">
                {[
                  { id: 'all', label: `All (${total})` },
                  { id: 'pending', label: `Pending (${pending})` },
                  { id: 'completed', label: `Completed (${completed})` },
                  { id: 'overdue', label: `Overdue (${overdue})` },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      taskFilter === f.id
                        ? 'bg-amber-400 text-slate-900 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-[#EAE5DA]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Task Cards Grid */}
              {loadingTasks ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                  <p className="text-xs font-bold">Loading tasks & workflow...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-4 max-w-md mx-auto shadow-xs">
                  <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-2xs">
                    <CheckSquare className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">No Tasks in this View</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Auto-generate the standard 7-stage wedding post-production pipeline or add custom tasks for this client.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleGeneratePipeline}
                      disabled={isSyncingPipeline}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Auto-Generate Pipeline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClientTaskModal(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 border border-[#EAE5DA] text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Custom Task</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((task) => {
                    const isDone = task.status === 'completed';
                    const isOverdue = task.due_date && !isDone && new Date(task.due_date) < now;
                    const diffDays = isOverdue
                      ? Math.max(1, Math.floor((now.getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)))
                      : 0;

                    const checklist = Array.isArray(task.checklist_items) ? task.checklist_items : [];
                    const clCompleted = checklist.filter((ci: any) => ci.is_completed).length;
                    const clTotal = checklist.length;

                    return (
                      <div
                        key={task.id}
                        className={`p-5 rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${
                          isDone
                            ? 'bg-[#FAF8F5]/80 border-[#EAE5DA] opacity-80'
                            : isOverdue
                            ? 'bg-[#FFFDF9] border-rose-300 ring-1 ring-rose-300/40 shadow-xs'
                            : 'bg-[#FFFDF9] border-[#EAE5DA] hover:border-amber-300 shadow-xs'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Badges Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                {task.category?.replace(/_/g, ' ') || 'GENERAL'}
                              </span>

                              {task.priority === 'urgent' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                  Urgent
                                </span>
                              )}
                              {task.priority === 'high' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  High
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {isOverdue && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1">
                                  ⚠️ Overdue {diffDays}d
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteClientTask(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Task Title & Completion Checkbox */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleClientTask(task.id, task.status)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 hover:border-amber-500 bg-white'
                              }`}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-black text-slate-900 leading-snug ${
                                isDone ? 'line-through text-slate-400' : ''
                              }`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Interactive Checklist */}
                          {clTotal > 0 && (
                            <div className="p-3 bg-[#FAF8F2] rounded-2xl border border-[#EAE5DA] space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                <span>Checklist ({clCompleted}/{clTotal})</span>
                                <span className="font-mono">{Math.round((clCompleted / clTotal) * 100)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 transition-all duration-300"
                                  style={{ width: `${(clCompleted / clTotal) * 100}%` }}
                                />
                              </div>

                              <div className="space-y-1.5 pt-1">
                                {checklist.map((ci: any) => (
                                  <label
                                    key={ci.id}
                                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!ci.is_completed}
                                      onChange={(e) => handleToggleClientChecklistItem(task.id, ci.id, e.target.checked)}
                                      className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 border-slate-300 cursor-pointer"
                                    />
                                    <span className={`text-[11px] group-hover:text-slate-900 ${
                                      ci.is_completed ? 'line-through text-slate-400' : ''
                                    }`}>
                                      {ci.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Details */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          {task.due_date ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              <span>Due: {task.due_date}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">No deadline</span>
                          )}

                          <span className={`font-bold ${isDone ? 'text-emerald-600' : 'text-amber-800'}`}>
                            {isDone ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: POST-PRODUCTION CHECKLIST (FULL FEATURE ENGINE)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'post_production' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Post-Production Deliverables Card</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Segments (Pre-Wedding, Wedding, Reception), categories (Photos, Videos, Albums), deliverables, live status badges, and drive links.
                </p>
              </div>
              <Link
                href="/workspace/post-production"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-amber-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Film className="w-3.5 h-3.5 text-amber-600" />
                Open Master Post-Prod Board
              </Link>
            </div>

            {loadingPostProd ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading deliverables...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <PostProductionCard
                  project={postProdProjectData}
                  teamMembers={teamMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    isInHouse: true,
                    hasPMAccess: true
                  }))}
                  quotations={quotationDocs}
                  eventTypes={eventTypes.map(t => ({ name: t }))}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                  onUpdateProject={handleUpdatePostProdProject}
                  onOpenComments={(itemId, title) => {
                    const matched = postProdProjectData.deliverables.find(d => d.id === itemId);
                    if (matched) {
                      setActiveDrawerDeliverable(matched);
                      setDrawerInitialTab('comments');
                    }
                  }}
                  onOpenDrive={(itemId, currentLink) => {
                    const matched = postProdProjectData.deliverables.find(d => d.id === itemId);
                    if (matched) {
                      setActiveDrawerDeliverable(matched);
                      setDrawerInitialTab('links');
                    }
                  }}
                />

                {activeDrawerDeliverable && (
                  <DeliverableCommentDrawer
                    isOpen={!!activeDrawerDeliverable}
                    onClose={() => setActiveDrawerDeliverable(null)}
                    deliverable={activeDrawerDeliverable}
                    onUpdateDeliverable={(delivId, updates) => {
                      const updatedDelivs = postProdProjectData.deliverables.map(d => {
                        if (d.id === delivId) {
                          return { ...d, ...updates };
                        }
                        return d;
                      });
                      handleUpdatePostProdProject(postProdProjectData.id, { deliverables: updatedDelivs });
                      setActiveDrawerDeliverable(prev => prev ? ({ ...prev, ...updates }) : null);
                    }}
                    initialTab={drawerInitialTab}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: FINANCE & INVOICES (STANDARD WORKSPACE COMPONENT)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Client Finance & Milestone Billing</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Complete milestone schedule, payment statuses, GST calculation, and tax invoice generation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  View / Print Invoice
                </button>
              </div>
            </div>

            {loadingFinance ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading client finance & milestones...</p>
              </div>
            ) : (
              <ClientFinanceCard
                record={effectiveFinanceRecord}
                isExpanded={isFinanceExpanded}
                onToggle={() => setIsFinanceExpanded(prev => !prev)}
                todayStr={new Date().toISOString().split('T')[0]}
                teamMembersList={inHouseTeamMembers.map(m => m.name)}
                financeTeamMembers={teamMembers.map(m => ({ id: m.id, name: m.name, role: m.role }))}
                paymentMilestoneTemplates={[
                  'Standard 3-Step (20-60-20)',
                  'Advance + Delivery (50-50)',
                  'Equal 4-Part Schedule'
                ]}
                onAssignTeamMember={(cId, memberName) => {
                  const m = teamMembers.find(mem => mem.name === memberName);
                  if (m) handleQuickAssignPM(m.id);
                }}
                onAddNewTeamMember={() => {}}
                onOpenPricingEditModal={() => setShowPaymentModal(true)}
                onOpenRecordPayment={() => setShowPaymentModal(true)}
                onOpenInvoiceModal={() => setShowInvoiceModal(true)}
                onOpenCompletePaymentModal={(rec, milestone) => {
                  handleOpenCompletePaymentModal(rec, milestone);
                }}
                onOpenEditMilestone={(recId, milestone) => {
                  handleToggleMilestone(milestone.id, milestone.status);
                }}
                onDeleteMilestone={(recId, milestoneId) => {
                  handleDeleteMilestone(recId, milestoneId);
                }}
                onMilestoneChange={(recId, milestoneId, field, value) => {
                  handleMilestoneChange(recId, milestoneId, field, value);
                }}
                onAddMilestoneStep={(recId) => {
                  handleAddMilestoneStep(recId);
                }}
              />
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: CLIENT MOOD BOARD & WEDDING PREP PORTAL (MULTI-EVENT)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'moodboard' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {loadingMoodboard ? (
              <div className="p-16 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">Loading Client Mood Boards & Vision...</p>
              </div>
            ) : !currentMoodboard ? (
              <div className="p-12 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] text-center space-y-4 max-w-md mx-auto shadow-xs">
                <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                  <Sparkles className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900">No Event Moodboards Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create an event moodboard (Pre-Wedding, Wedding, Reception, etc.) to collaborate with the couple on outfits, locations, and pose inspiration.
                </p>
                <button
                  onClick={() => setShowAddMoodboardModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Event Moodboard</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ── MULTI-EVENT MOODBOARD SELECTOR TABS ── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {moodboards.map((mb) => {
                    const isSelected = mb.id === currentMoodboard.id;
                    const mbProgress = computeMoodboardProgress(mb);
                    return (
                      <button
                        key={mb.id}
                        onClick={() => setSelectedMoodboardId(mb.id)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-amber-50/60 border-[#EAE5DA]'
                        }`}
                      >
                        <span>
                          {mb.event_type === 'Pre-Wedding'
                            ? '💍'
                            : mb.event_type === 'Wedding'
                            ? '💒'
                            : mb.event_type === 'Reception'
                            ? '🎉'
                            : mb.event_type === 'Haldi' || mb.event_type === 'Mehendi'
                            ? '🌸'
                            : '✨'}
                        </span>
                        <span>{mb.title || `${mb.event_type || 'Event'} Moodboard`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          isSelected ? 'bg-black/15 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {mbProgress}%
                        </span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setShowAddMoodboardModal(true)}
                    className="px-3.5 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Add Event Moodboard</span>
                  </button>
                </div>

                {/* ── CURRENT MOODBOARD HEADER & SHARE LINKS ── */}
                <div className="p-6 sm:p-7 bg-gradient-to-r from-amber-50 via-[#FFFDF9] to-amber-50/50 rounded-3xl border border-amber-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
                          {currentMoodboard.title || `${currentMoodboard.event_type || 'Event'} Moodboard`}
                        </h2>
                        <span className="px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 font-bold text-xs">
                          {currentMoodboard.event_type || 'Shoot Vision'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          currentMoodboard.status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : currentMoodboard.status === 'IN_REVIEW'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {currentMoodboard.status || 'DRAFT'} ({computeMoodboardProgress(currentMoodboard)}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Private client portal for couple portraits, shoot locations, coordinators, and pose inspiration.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Copy Link */}
                      <button
                        onClick={copyMoodboardLink}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedMoodboardLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                        <span>{copiedMoodboardLink ? 'Link Copied!' : 'Copy Magic Link'}</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={shareMoodboardOnWhatsApp}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Share WhatsApp</span>
                      </button>

                      {/* Open Portal Preview */}
                      <a
                        href={`/p/moodboard/${currentMoodboard.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Client Portal</span>
                      </a>

                      {/* Delete Moodboard Button */}
                      {moodboards.length > 1 && (
                        <button
                          onClick={() => handleDeleteMoodboard(currentMoodboard.id)}
                          disabled={isDeletingMb}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer"
                          title="Delete this event moodboard"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar & Studio review status switcher */}
                  <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Shoot Prep Completion</span>
                        <span className="text-amber-800 font-mono font-bold">{computeMoodboardProgress(currentMoodboard)}% Complete</span>
                      </div>
                      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden border border-amber-200">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                          style={{ width: `${computeMoodboardProgress(currentMoodboard)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Review Status:</span>
                      <select
                        value={currentMoodboard.status || 'DRAFT'}
                        disabled={updatingMbStatus}
                        onChange={(e) => handleUpdateMoodboardStatus(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="DRAFT">Draft (Client Can Edit)</option>
                        <option value="IN_REVIEW">In Review (Crew Checking)</option>
                        <option value="SUBMITTED">Submitted (Locked for Client)</option>
                        <option value="APPROVED">Approved for Shoot</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── CONDITIONAL STRUCTURED SECTIONS (PRE-WEDDING VS OTHER EVENTS) ── */}
                {(() => {
                  const isPreWedding = Boolean(
                    (currentMoodboard.event_type || currentMoodboard.title || '').toLowerCase().includes('pre-wedding') ||
                    (currentMoodboard.event_type || currentMoodboard.title || '').toLowerCase().includes('pre wedding')
                  );

                  return isPreWedding ? (
                    /* ─────────────────────────────────────────────────────────── */
                    /* PRE-WEDDING MODE (5 CLEAN SECTIONS)                         */
                    /* ─────────────────────────────────────────────────────────── */
                    <div className="space-y-6">
                      {/* 1. COUPLE PORTRAITS / POSTERS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-600" />
                            <span>1. Couple Portraits / Posters</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                              {Array.isArray(currentMoodboard.couple_photos) ? currentMoodboard.couple_photos.length : 0} / 8
                            </span>
                          </h3>

                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition">
                            <Upload className="w-3.5 h-3.5 text-amber-600" />
                            <span>{uploadingMbPhoto === 'couple' ? 'Uploading...' : 'Studio Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingMbPhoto === 'couple'}
                              onChange={(e) => handleStudioUploadMbPhoto(e, 'couple')}
                            />
                          </label>
                        </div>

                        {Array.isArray(currentMoodboard.couple_photos) && currentMoodboard.couple_photos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {currentMoodboard.couple_photos.map((photo: any, idx: number) => (
                              <div
                                key={idx}
                                onClick={() =>
                                  openLightbox(
                                    currentMoodboard.couple_photos.map((p: any, i: number) => ({
                                      url: getMediaUrl(p.url),
                                      title: `Couple Portrait ${i + 1}`,
                                      notes: p.caption,
                                    })),
                                    idx
                                  )
                                }
                                className="group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer shadow-2xs hover:border-amber-400 transition"
                              >
                                <div className="aspect-[4/5] bg-slate-900 relative overflow-hidden">
                                  <img src={getMediaUrl(photo.url)} alt={`Couple ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-black/75 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs">
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
                          <p className="text-xs text-slate-400 italic py-3">No couple portraits uploaded yet.</p>
                        )}
                      </div>

                      {/* 2. SHOOT DAY COORDINATION (BRIDE & GROOM) */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-amber-600" />
                          <span>2. Shoot-Day Coordinators</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {/* Bride Side */}
                          {(() => {
                            const coord = currentMoodboard.shoot_coordination || {};
                            const bride = coord.bride_coordinator || currentMoodboard.bride_coordinator;
                            return (
                              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2.5">
                                <div className="font-bold text-rose-900">👰 Bride Side Coordinator</div>
                                {bride && (bride.name || bride.phone) ? (
                                  <div className="p-2.5 bg-white rounded-xl border border-rose-100 space-y-1">
                                    <div className="font-bold text-slate-900">{bride.name || 'Coordinator'}</div>
                                    <div className="text-[11px] text-slate-500">Relation: {bride.relation || 'Bride Coordinator'}</div>
                                    {bride.phone && (
                                      <div className="pt-1 flex items-center gap-2">
                                        <a
                                          href={`tel:${bride.phone}`}
                                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 font-bold flex items-center gap-1 text-[10px]"
                                        >
                                          <Phone className="w-3 h-3" /> Call
                                        </a>
                                        <a
                                          href={`https://wa.me/${bride.phone.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 text-[10px]"
                                        >
                                          <MessageCircle className="w-3 h-3" /> WhatsApp
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No bride coordinator provided yet.</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Groom Side */}
                          {(() => {
                            const coord = currentMoodboard.shoot_coordination || {};
                            const groom = coord.groom_coordinator || currentMoodboard.groom_coordinator;
                            return (
                              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5">
                                <div className="font-bold text-blue-900">🤵 Groom Side Coordinator</div>
                                {groom && (groom.name || groom.phone) ? (
                                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                                    <div className="font-bold text-slate-900">{groom.name || 'Coordinator'}</div>
                                    <div className="text-[11px] text-slate-500">Relation: {groom.relation || 'Groom Coordinator'}</div>
                                    {groom.phone && (
                                      <div className="pt-1 flex items-center gap-2">
                                        <a
                                          href={`tel:${groom.phone}`}
                                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-bold flex items-center gap-1 text-[10px]"
                                        >
                                          <Phone className="w-3 h-3" /> Call
                                        </a>
                                        <a
                                          href={`https://wa.me/${groom.phone.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 text-[10px]"
                                        >
                                          <MessageCircle className="w-3 h-3" /> WhatsApp
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No groom coordinator provided yet.</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 3. SHOOT PLACES / LOCATIONS (MULTIPLE PLACES SUPPORT) */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-600" />
                            <span>3. Shoot Places & Locations</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                              {Array.isArray(currentMoodboard.shoot_places) ? currentMoodboard.shoot_places.length : 0} Spots
                            </span>
                          </h3>
                        </div>

                        {Array.isArray(currentMoodboard.shoot_places) && currentMoodboard.shoot_places.length > 0 ? (
                          <div className="space-y-5">
                            {currentMoodboard.shoot_places.map((place: any, pIdx: number) => (
                              <div key={place.id || pIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                                      {pIdx + 1}
                                    </span>
                                    <span className="font-black text-slate-900 text-sm">
                                      {place.place_name || `Location ${pIdx + 1}`}
                                    </span>
                                  </div>
                                  {place.location_notes && (
                                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                                      📍 {place.location_notes}
                                    </span>
                                  )}
                                </div>

                                {/* 3 Photos: Bride, Groom, Couple */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Bride Photo */}
                                  <div className="p-2.5 bg-white rounded-xl border border-rose-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-rose-800">👰 Bride Photo</div>
                                    {place.bride_photo_url ? (
                                      <div
                                        onClick={() =>
                                          openLightbox([
                                            {
                                              url: getMediaUrl(place.bride_photo_url),
                                              title: `${place.place_name} • Bride Reference`,
                                              notes: place.comments,
                                            },
                                          ])
                                        }
                                        className="aspect-[4/5] rounded-lg overflow-hidden bg-slate-800 cursor-pointer group relative"
                                      >
                                        <img src={getMediaUrl(place.bride_photo_url)} alt="Bride" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      </div>
                                    ) : (
                                      <div className="aspect-[4/5] rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                        No photo
                                      </div>
                                    )}
                                  </div>

                                  {/* Groom Photo */}
                                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-blue-800">🤵 Groom Photo</div>
                                    {place.groom_photo_url ? (
                                      <div
                                        onClick={() =>
                                          openLightbox([
                                            {
                                              url: getMediaUrl(place.groom_photo_url),
                                              title: `${place.place_name} • Groom Reference`,
                                              notes: place.comments,
                                            },
                                          ])
                                        }
                                        className="aspect-[4/5] rounded-lg overflow-hidden bg-slate-800 cursor-pointer group relative"
                                      >
                                        <img src={getMediaUrl(place.groom_photo_url)} alt="Groom" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      </div>
                                    ) : (
                                      <div className="aspect-[4/5] rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                        No photo
                                      </div>
                                    )}
                                  </div>

                                  {/* Couple Photo */}
                                  <div className="p-2.5 bg-white rounded-xl border border-amber-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-amber-800">👩‍❤️‍👨 Couple Photo</div>
                                    {place.couple_photo_url ? (
                                      <div
                                        onClick={() =>
                                          openLightbox([
                                            {
                                              url: getMediaUrl(place.couple_photo_url),
                                              title: `${place.place_name} • Couple Reference`,
                                              notes: place.comments,
                                            },
                                          ])
                                        }
                                        className="aspect-[4/5] rounded-lg overflow-hidden bg-slate-800 cursor-pointer group relative"
                                      >
                                        <img src={getMediaUrl(place.couple_photo_url)} alt="Couple" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      </div>
                                    ) : (
                                      <div className="aspect-[4/5] rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                        No photo
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Place-wise Comments */}
                                {place.comments && (
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                                    <strong>Direction / Notes:</strong> {place.comments}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No shoot spots added yet.</p>
                        )}
                      </div>

                      {/* 4. INSPIRATION & POSE IDEAS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span>4. Inspiration & Pose Ideas</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                            {Array.isArray(currentMoodboard.photo_references) ? currentMoodboard.photo_references.length : 0}
                          </span>
                        </h3>

                        {Array.isArray(currentMoodboard.photo_references) && currentMoodboard.photo_references.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {currentMoodboard.photo_references.map((inspo: any, idx: number) => {
                              const url = typeof inspo === 'string' ? inspo : inspo.url;
                              const notes = typeof inspo === 'object' ? inspo.notes : '';
                              const isImage = url?.match(/\.(jpeg|jpg|png|webp|gif)/i) || url?.includes('/api/upload') || url?.includes('r2.cloudflarestorage.com') || url?.includes('studiocore.in');

                              return (
                                <div key={idx} className="p-2 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                                  {isImage ? (
                                    <div
                                      onClick={() =>
                                        openLightbox(
                                          currentMoodboard.photo_references.map((p: any, i: number) => ({
                                            url: getMediaUrl(typeof p === 'string' ? p : p.url),
                                            title: `Inspiration ${i + 1}`,
                                            notes: typeof p === 'object' ? p.notes : '',
                                          })),
                                          idx
                                        )
                                      }
                                      className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-800 cursor-pointer relative group"
                                    >
                                      <img src={getMediaUrl(url)} alt="Inspiration" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                    </div>
                                  ) : (
                                    <div className="aspect-[4/5] bg-amber-50 rounded-xl p-3 flex flex-col justify-between text-xs">
                                      <span className="text-amber-800 font-bold truncate">Link Reference</span>
                                      {url && (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-amber-900 font-bold flex items-center justify-center gap-1 text-[10px]"
                                        >
                                          <ExternalLink className="w-3 h-3" /> Open
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {notes && <p className="text-[11px] text-slate-600 truncate px-1">{notes}</p>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No inspiration poses added.</p>
                        )}
                      </div>

                      {/* 5. CINEMATIC VIDEO REFERENCES */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Film className="w-4 h-4 text-amber-600" />
                          <span>5. Cinematic Video References</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            {Array.isArray(currentMoodboard.video_references) ? currentMoodboard.video_references.length : 0}
                          </span>
                        </h3>

                        {Array.isArray(currentMoodboard.video_references) && currentMoodboard.video_references.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {currentMoodboard.video_references.map((vid: any, idx: number) => {
                              const url = typeof vid === 'string' ? vid : vid.url;
                              const notes = typeof vid === 'object' ? vid.notes : '';
                              return (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="text-slate-900 font-bold truncate">🎬 {notes || url}</div>
                                    {notes && <div className="text-[11px] text-slate-500 truncate break-all">{url}</div>}
                                  </div>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                                    >
                                      <Play className="w-3 h-3" /> Watch
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No cinematic references added.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ─────────────────────────────────────────────────────────── */
                    /* WEDDING & OTHER EVENTS MODE (ORIGINAL 8 SECTIONS RESTORED)   */
                    /* ─────────────────────────────────────────────────────────── */
                    <div className="space-y-6">
                      {/* 1. COUPLE PORTRAITS / POSTERS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-600" />
                            <span>1. Couple Portraits / Posters</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                              {Array.isArray(currentMoodboard.couple_photos) ? currentMoodboard.couple_photos.length : 0} / 6
                            </span>
                          </h3>

                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition">
                            <Upload className="w-3.5 h-3.5 text-amber-600" />
                            <span>{uploadingMbPhoto === 'couple' ? 'Uploading...' : 'Studio Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingMbPhoto === 'couple'}
                              onChange={(e) => handleStudioUploadMbPhoto(e, 'couple')}
                            />
                          </label>
                        </div>

                        {Array.isArray(currentMoodboard.couple_photos) && currentMoodboard.couple_photos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {currentMoodboard.couple_photos.map((photo: any, idx: number) => (
                              <div
                                key={idx}
                                onClick={() =>
                                  openLightbox(
                                    currentMoodboard.couple_photos.map((p: any, i: number) => ({
                                      url: getMediaUrl(p.url),
                                      title: `Couple Portrait ${i + 1}`,
                                      notes: p.caption,
                                    })),
                                    idx
                                  )
                                }
                                className="group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer shadow-2xs hover:border-amber-400 transition"
                              >
                                <div className="aspect-[4/5] bg-slate-900 relative overflow-hidden">
                                  <img src={getMediaUrl(photo.url)} alt={`Couple ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs">
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
                          <p className="text-xs text-slate-400 italic py-3">No couple portraits uploaded yet.</p>
                        )}
                      </div>

                      {/* 2. SOCIAL MEDIA HANDLES & HASHTAG */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Hash className="w-4 h-4 text-amber-600" />
                          <span>2. Social Handles & Wedding Hashtag</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <span className="text-slate-500 font-bold block mb-1">Bride IG</span>
                            {currentMoodboard.bride_instagram ? (
                              <a
                                href={currentMoodboard.bride_instagram.startsWith('http') ? currentMoodboard.bride_instagram : `https://instagram.com/${currentMoodboard.bride_instagram.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-pink-600 hover:underline flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{currentMoodboard.bride_instagram}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <span className="text-slate-500 font-bold block mb-1">Groom IG</span>
                            {currentMoodboard.groom_instagram ? (
                              <a
                                href={currentMoodboard.groom_instagram.startsWith('http') ? currentMoodboard.groom_instagram : `https://instagram.com/${currentMoodboard.groom_instagram.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-blue-600 hover:underline flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{currentMoodboard.groom_instagram}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <span className="text-slate-500 font-bold block mb-1">Hashtag</span>
                            <span className="font-bold text-amber-800 font-mono truncate block">
                              {currentMoodboard.couple_instagram || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. COORDINATION CONTACTS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-amber-600" />
                          <span>3. Shoot-Day Coordinators</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {/* Bride Side */}
                          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2.5">
                            <div className="font-bold text-rose-900">👰 Bride Side Coordinators</div>
                            {(Array.isArray(currentMoodboard.bride_coordinators) && currentMoodboard.bride_coordinators.length > 0
                              ? currentMoodboard.bride_coordinators
                              : currentMoodboard.bride_coordinator?.name
                              ? [currentMoodboard.bride_coordinator]
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
                            {(!currentMoodboard.bride_coordinators?.length && !currentMoodboard.bride_coordinator?.name) && (
                              <p className="text-[11px] text-slate-400 italic">No bride coordinators provided.</p>
                            )}
                          </div>

                          {/* Groom Side */}
                          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5">
                            <div className="font-bold text-blue-900">🤵 Groom Side Coordinators</div>
                            {(Array.isArray(currentMoodboard.groom_coordinators) && currentMoodboard.groom_coordinators.length > 0
                              ? currentMoodboard.groom_coordinators
                              : Array.isArray(currentMoodboard.groom_coordinator) && currentMoodboard.groom_coordinator.length > 0
                              ? currentMoodboard.groom_coordinator
                              : currentMoodboard.groom_coordinator?.name
                              ? [currentMoodboard.groom_coordinator]
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
                            {(!currentMoodboard.groom_coordinators?.length && !currentMoodboard.groom_coordinator?.name && (!Array.isArray(currentMoodboard.groom_coordinator) || currentMoodboard.groom_coordinator.length === 0)) && (
                              <p className="text-[11px] text-slate-400 italic">No groom coordinators provided.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 4. CLOSE FAMILY PHOTOS (VIP SHOT LIST) */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          <span>4. Close Family Photos (VIP Shot List)</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                            {Array.isArray(currentMoodboard.close_family_photos) ? currentMoodboard.close_family_photos.length : 0}
                          </span>
                        </h3>
                        {Array.isArray(currentMoodboard.close_family_photos) && currentMoodboard.close_family_photos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {currentMoodboard.close_family_photos.map((fam: any, idx: number) => (
                              <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col shadow-2xs">
                                <div
                                  onClick={() =>
                                    openLightbox(
                                      currentMoodboard.close_family_photos.map((f: any) => ({
                                        url: getMediaUrl(f.url),
                                        title: f.names || 'Family Member',
                                        subtitle: `${f.side} Side • ${f.relation || 'VIP'}`,
                                      })),
                                      idx
                                    )
                                  }
                                  className="aspect-[4/5] bg-slate-900 relative overflow-hidden cursor-pointer group"
                                >
                                  <img src={getMediaUrl(fam.url)} alt={fam.names || 'Family'} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded backdrop-blur-xs">
                                      View
                                    </span>
                                  </div>
                                </div>
                                <div className="p-2 space-y-0.5 text-xs bg-white">
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
                          <p className="text-xs text-slate-400 italic py-3">No family identification photos uploaded.</p>
                        )}
                      </div>

                      {/* 5. INSPIRATION & POSE IDEAS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span>5. Inspiration & Pose Ideas</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                            {Array.isArray(currentMoodboard.photo_references || currentMoodboard.inspiration_links) ? (currentMoodboard.photo_references || currentMoodboard.inspiration_links).length : 0}
                          </span>
                        </h3>
                        {Array.isArray(currentMoodboard.photo_references || currentMoodboard.inspiration_links) && (currentMoodboard.photo_references || currentMoodboard.inspiration_links).length > 0 ? (
                          <div className="space-y-2.5 text-xs">
                            {(currentMoodboard.photo_references || currentMoodboard.inspiration_links).map((inspo: any, idx: number) => {
                              const url = typeof inspo === 'string' ? inspo : inspo.url || inspo.pinterest_url;
                              const notes = typeof inspo === 'object' ? inspo.notes : '';
                              const isPinterest = url?.includes('pinterest');
                              const isInsta = url?.includes('instagram');
                              return (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs overflow-hidden">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        isPinterest ? 'bg-red-100 text-red-700' : isInsta ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isPinterest ? 'Pinterest' : isInsta ? 'Instagram' : 'Link'}
                                      </span>
                                      <span className="truncate">{notes || url}</span>
                                    </div>
                                    {notes && <div className="text-[11px] text-slate-500 truncate mt-0.5 break-all">{url}</div>}
                                  </div>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl flex items-center gap-1 shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" /> Open
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-3">No aesthetic inspiration links uploaded.</p>
                        )}
                      </div>

                      {/* 6. VIDEO & REEL REFERENCES */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Film className="w-4 h-4 text-amber-600" />
                          <span>6. Cinematic Video References</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            {Array.isArray(currentMoodboard.video_references) ? currentMoodboard.video_references.length : 0}
                          </span>
                        </h3>
                        {Array.isArray(currentMoodboard.video_references) && currentMoodboard.video_references.length > 0 ? (
                          <div className="space-y-2 text-xs">
                            {currentMoodboard.video_references.map((vid: any, idx: number) => {
                              const url = typeof vid === 'string' ? vid : vid.url;
                              const notes = typeof vid === 'object' ? vid.notes : '';
                              return (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs overflow-hidden">
                                  <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                                    <div className="text-slate-900 font-bold truncate">🎬 {notes || url}</div>
                                    {notes && <div className="text-[11px] text-slate-500 truncate break-all">{url}</div>}
                                  </div>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                                    >
                                      <Play className="w-3 h-3" /> Watch
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-3">No video references added.</p>
                        )}
                      </div>

                      {/* 7. EVENT ITINERARY & TIMINGS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 col-span-full">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>7. Event Schedule, Venues, Outfits & Rituals</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                            {Array.isArray(currentMoodboard.itinerary_schedule) ? currentMoodboard.itinerary_schedule.length : 0}
                          </span>
                        </h3>
                        {Array.isArray(currentMoodboard.itinerary_schedule) && currentMoodboard.itinerary_schedule.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentMoodboard.itinerary_schedule.map((item: any, idx: number) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                  <div>
                                    <span className="font-bold text-slate-900 text-sm">{item.event_name || item.event_type}</span>
                                    <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                                      📅 {formatEventDate(item.date)} • ⏰ {formatEventTime(item.start_time)} - {formatEventTime(item.end_time)}
                                    </div>
                                  </div>
                                </div>

                                {/* Venue & Map */}
                                {(item.venue_name || item.maps_url) && (
                                  <div className="text-xs text-slate-700 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80">
                                    <div className="truncate pr-2">
                                      <span className="font-bold">📍 {item.venue_name || 'Venue'}</span>
                                    </div>
                                    {item.maps_url && (
                                      <a
                                        href={item.maps_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg flex items-center gap-1 text-[10px] shrink-0"
                                      >
                                        <MapPin className="w-3 h-3" /> Map
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Bride & Groom Outfits */}
                                <div className="grid grid-cols-2 gap-2">
                                  {item.bride_outfit_url ? (
                                    <div
                                      onClick={() =>
                                        openLightbox([
                                          {
                                            url: getMediaUrl(item.bride_outfit_url),
                                            title: `${item.event_name || 'Ceremony'} • Bride's Outfit`,
                                            notes: item.rituals_notes,
                                          },
                                        ])
                                      }
                                      className="space-y-1 cursor-pointer group"
                                    >
                                      <span className="text-[10px] font-bold text-rose-700">Bride Outfit (Click)</span>
                                      <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 relative">
                                        <img src={getMediaUrl(item.bride_outfit_url)} alt="Bride" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-[4/3] rounded-xl bg-slate-200/50 flex items-center justify-center text-[10px] text-slate-400">
                                      No Bride Outfit
                                    </div>
                                  )}
                                  {item.groom_outfit_url ? (
                                    <div
                                      onClick={() =>
                                        openLightbox([
                                          {
                                            url: getMediaUrl(item.groom_outfit_url),
                                            title: `${item.event_name || 'Ceremony'} • Groom's Outfit`,
                                            notes: item.rituals_notes,
                                          },
                                        ])
                                      }
                                      className="space-y-1 cursor-pointer group"
                                    >
                                      <span className="text-[10px] font-bold text-blue-700">Groom Outfit (Click)</span>
                                      <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 relative">
                                        <img src={getMediaUrl(item.groom_outfit_url)} alt="Groom" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-[4/3] rounded-xl bg-slate-200/50 flex items-center justify-center text-[10px] text-slate-400">
                                      No Groom Outfit
                                    </div>
                                  )}
                                </div>

                                {item.rituals_notes && (
                                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                                    <span className="font-bold text-slate-700 block mb-0.5">Special Moments & Rituals:</span>
                                    {item.rituals_notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-3">No itinerary ceremonies added yet.</p>
                        )}
                      </div>

                      {/* 8. DAY-OF PAYMENT & VENDOR MANAGERS */}
                      <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 col-span-full">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-pink-600" />
                          <span>8. Day-of Payment & Vendor Managers</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {(Array.isArray(currentMoodboard.payment_contacts) && currentMoodboard.payment_contacts.length > 0
                            ? currentMoodboard.payment_contacts
                            : Array.isArray(currentMoodboard.payment_contact) && currentMoodboard.payment_contact.length > 0
                            ? currentMoodboard.payment_contact
                            : currentMoodboard.payment_contact?.name
                            ? [currentMoodboard.payment_contact]
                            : []
                          ).map((pay: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
                              <div className="font-bold text-slate-900">{pay.name}</div>
                              <div className="text-[11px] text-slate-500">Role: {pay.relation || 'Manager'}</div>
                              {pay.phone && (
                                <div className="pt-1 flex items-center gap-2">
                                  <a
                                    href={`tel:${pay.phone}`}
                                    className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold flex items-center gap-1 text-[10px]"
                                  >
                                    <Phone className="w-3 h-3" /> Call
                                  </a>
                                  <a
                                    href={`https://wa.me/${pay.phone.replace(/[^0-9]/g, '')}`}
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
                          {(!currentMoodboard.payment_contacts?.length && !currentMoodboard.payment_contact?.name && (!Array.isArray(currentMoodboard.payment_contact) || currentMoodboard.payment_contact.length === 0)) && (
                            <p className="text-xs text-slate-400 italic">No payment contacts provided.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: SHARE CLIENT PORTAL & PIN MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Share Client Portal</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Direct public link with 4-digit PIN security</p>
                  </div>
                </div>
                <button onClick={() => setShowShareModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Public Portal URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={portalUrl}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono text-[11px] text-slate-800"
                    />
                    <button
                      onClick={copyPortalLink}
                      className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">4-Digit Security Access PIN</label>
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black font-mono text-amber-900 tracking-widest">{extended.portal_pin}</span>
                      <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Client enters this PIN to unlock the portal</p>
                    </div>
                    <Key className="w-6 h-6 text-amber-600" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share Directly on WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      copyPortalLink();
                      setShowShareModal(false);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    Copy Link & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: ADD CEREMONY / EVENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddEventModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <h3 className="text-base font-black text-slate-900">Add Ceremony / Event Function</h3>
                <button onClick={() => setShowAddEventModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ceremony Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sangeet & Cocktail, Haldi, Reception, Phere..."
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Timings</label>
                    <input
                      type="text"
                      placeholder="06:00 PM - 11:00 PM"
                      value={newEventTimeStart}
                      onChange={(e) => setNewEventTimeStart(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Venue & Location</label>
                  <input
                    type="text"
                    placeholder="e.g. The Grand Palace, Mumbai"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Photographers, 2 Cinematographers, 1 Drone"
                    value={newEventCrew}
                    onChange={(e) => setNewEventCrew(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button onClick={() => setShowAddEventModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">
                    Cancel
                  </button>
                  <button onClick={handleAddEvent} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs">
                    Add Ceremony
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: RECORD PAYMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <h3 className="text-base font-black text-slate-900">Record Payment Installment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-base font-black text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    >
                      <option value="UPI">UPI / GooglePay</option>
                      <option value="Bank Transfer">NEFT / Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transaction Ref / Cheque No.</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref #492817291"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={!payAmount}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: INVOICE PRINT DIALOG
      ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          🗑️ MODAL: DOUBLE CONFIRMATION DELETE CLIENT (CASCADE)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-rose-200 shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  Delete Client & Associated Records?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900 font-black">{name || client?.name}</strong>?
                </p>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-left text-[11px] text-rose-800 space-y-1">
                  <p className="font-bold">⚠️ This action will permanently purge:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1 font-medium">
                    <li>Client Workspace & Event Schedules</li>
                    <li>Finance Cards, Installments & Balance Ledgers</li>
                    <li>Associated Quotation Versions & PDFs</li>
                    <li>Post-Production Task Checklists</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCascadeDeleteClient}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Yes, Delete Everything</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          FULL-SCREEN IMAGE LIGHTBOX / GALLERY MODAL (WITH NOTES & SWIPE)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox.isOpen && lightbox.items.length > 0 && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full flex flex-col items-center justify-center space-y-3"
            >
              {/* Close Button */}
              <button
                onClick={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Main Image Container */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[75vh] bg-black/50 rounded-3xl overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl">
                <img
                  src={lightbox.items[lightbox.currentIndex]?.url}
                  alt="Enlarged"
                  className="max-w-full max-h-full object-contain"
                />

                {/* Left Arrow */}
                {lightbox.items.length > 1 && (
                  <button
                    onClick={() =>
                      setLightbox((prev) => ({
                        ...prev,
                        currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
                      }))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition backdrop-blur-xs cursor-pointer shadow-lg active:scale-95"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Right Arrow */}
                {lightbox.items.length > 1 && (
                  <button
                    onClick={() =>
                      setLightbox((prev) => ({
                        ...prev,
                        currentIndex: (prev.currentIndex + 1) % prev.items.length,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition backdrop-blur-xs cursor-pointer shadow-lg active:scale-95"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Bottom Details Banner with Notes & Index */}
              <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-sm text-amber-300">
                    {lightbox.items[lightbox.currentIndex]?.title || 'Photo Preview'}
                  </div>
                  {lightbox.items[lightbox.currentIndex]?.subtitle && (
                    <div className="text-white/90 font-medium">
                      {lightbox.items[lightbox.currentIndex]?.subtitle}
                    </div>
                  )}
                  {lightbox.items[lightbox.currentIndex]?.notes && (
                    <p className="text-white/70 text-[11px] mt-0.5">
                      {lightbox.items[lightbox.currentIndex]?.notes}
                    </p>
                  )}
                </div>

                {lightbox.items.length > 1 && (
                  <span className="font-mono text-white/60 text-xs shrink-0 self-end sm:self-auto">
                    {lightbox.currentIndex + 1} of {lightbox.items.length}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RECORD PAYMENT COMPLETION WITH ROLLOVER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCompletePaymentModal.open && showCompletePaymentModal.milestone && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Record Payment Completion</h3>
                    <p className="text-xs text-slate-500 font-medium">{showCompletePaymentModal.clientName}</p>
                  </div>
                </div>
                <button onClick={() => setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800">
                  Milestone: <span className="text-slate-900">{showCompletePaymentModal.milestone.step_name || showCompletePaymentModal.milestone.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount Received (₹)</label>
                    <input
                      type="number"
                      value={completePaymentFormData.amount}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                    <select
                      value={completePaymentFormData.status}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="completed">Completed / Paid</option>
                      <option value="pending">Pending / Due</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Received Date</label>
                    <input
                      type="date"
                      value={completePaymentFormData.payment_date}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode Channel</label>
                    <select
                      value={completePaymentFormData.payment_mode}
                      onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">UTR / Transaction Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/2938102938"
                    value={completePaymentFormData.reference_id}
                    onChange={(e) => setCompletePaymentFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowCompletePaymentModal({ open: false, recordId: '', clientName: '', milestone: null })}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCompletePaymentModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Save & Update Milestone
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW EVENT MOODBOARD
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddMoodboardModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Add Event Moodboard</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Create a separate portal & magic link for this event</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMoodboardModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                  <select
                    value={newMbEventType}
                    onChange={(e) => {
                      setNewMbEventType(e.target.value);
                      if (!newMbTitle || newMbTitle.endsWith('Moodboard')) {
                        setNewMbTitle(`${e.target.value} Moodboard`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  >
                    <option value="Pre-Wedding">Pre-Wedding Shoot</option>
                    <option value="Wedding">Wedding Day</option>
                    <option value="Engagement">Engagement / Roka</option>
                    <option value="Reception">Reception</option>
                    <option value="Sangeet">Sangeet & Cocktail</option>
                    <option value="Haldi">Haldi & Mehendi</option>
                    <option value="Post-Wedding">Post-Wedding Shoot</option>
                    <option value="Custom">Custom Event</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Moodboard Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa Destination Pre-Wedding"
                    value={newMbTitle}
                    onChange={(e) => setNewMbTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
                  <span className="font-bold block">✨ What happens next:</span>
                  <p className="text-amber-800">
                    A unique magic link will be created for this event moodboard. The couple can upload their location spots, outfit references, and pose inspiration separately for each event.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddMoodboardModal(false)}
                    disabled={isCreatingMb}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateMoodboard}
                    disabled={isCreatingMb}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 font-black text-slate-950 rounded-xl shadow-xs cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCreatingMb ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Moodboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: CREATE CLIENT TASK MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showClientTaskModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">New Task for {name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientTaskModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClientTask} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Color Grade Wedding Film, Deliver Teaser..."
                    value={newClientTaskTitle}
                    onChange={(e) => setNewClientTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={newClientTaskCategory}
                      onChange={(e) => setNewClientTaskCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-800 outline-none"
                    >
                      <option value="POST_PRODUCTION">Post-Production</option>
                      <option value="CLIENT_WORKFLOW">Client Workflow</option>
                      <option value="DELIVERABLE">Deliverable</option>
                      <option value="GENERAL">General Task</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Priority</label>
                    <select
                      value={newClientTaskPriority}
                      onChange={(e) => setNewClientTaskPriority(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-800 outline-none"
                    >
                      <option value="urgent">🔴 Urgent</option>
                      <option value="high">🟡 High</option>
                      <option value="medium">🔵 Medium</option>
                      <option value="low">⚪ Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newClientTaskDueDate}
                    onChange={(e) => setNewClientTaskDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Add any specific guidelines, specs, or instructions..."
                    value={newClientTaskDesc}
                    onChange={(e) => setNewClientTaskDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-800 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EAE5DA]">
                  <button
                    type="button"
                    onClick={() => setShowClientTaskModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs transition"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showInvoiceModal && (
        <InvoiceModalDialog
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          client={client}
          financeRecord={financeRecord}
          totalPackage={financeRecord?.final_total_amount || client.total_package_amount || 0}
          paidAmount={financeRecord?.received_amount || client.paid_amount || 0}
          studioSettings={null}
        />
      )}

    </div>
  );
}
