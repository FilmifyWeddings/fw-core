'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Check, ArrowRight, ExternalLink,
  ShieldCheck, Sparkles, RefreshCw, Clock,
  Zap, CheckCircle2, AlertCircle, HardDrive,
  MessageSquare, FileSpreadsheet, Users, Calendar,
  Mail, Video, LayoutGrid, List, Layers, Activity,
  SlidersHorizontal, ChevronRight, CheckCheck, X
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import { WhatsAppBetaConnectModal } from '@/components/integrations/whatsapp-beta-connect-modal';

type IntegrationCategory = 'all' | 'marketing' | 'communication' | 'productivity' | 'storage';

interface IntegrationItem {
  id: string;
  name: string;
  category: 'marketing' | 'communication' | 'productivity' | 'storage';
  categoryLabel: string;
  description: string;
  logo: React.ReactNode;
  status: 'connected' | 'disconnected' | 'coming_soon';
  path: string;
  metaBadge?: string;
  isComingSoon?: boolean;
  onActionClick?: () => void;
  actionLabel?: string;
}

// ── Fallback Local Error Boundary Component ─────────────────────────────────────
class IntegrationsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[IntegrationsErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 sm:p-12 text-center max-w-lg mx-auto my-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">Unable to render Integrations Hub</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {this.state.error?.message || 'A transient error occurred while loading integration status.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              href="/workspace"
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
            >
              Back to Workspace
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Native Integrations Hub Component ──────────────────────────────────────────
function WorkspaceIntegrationsHub() {
  const router = useRouter();
  const { workspaceId, userId, activeWorkspace, workspaceName } = useWorkspace();
  const effectiveWs = (workspaceId && workspaceId !== 'all') ? workspaceId : (userId || '');

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);

  // Integration Connection States
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappBetaConnected, setWhatsappBetaConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [websiteConnected, setWebsiteConnected] = useState(false);
  const [contactsConnected, setGoogleContactsConnected] = useState(false);
  const [calendarConnected, setGoogleCalendarConnected] = useState(false);
  const [sheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [smtpConnected, setSmtpConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [driveAccountsCount, setDriveAccountsCount] = useState(0);

  const [betaModalOpen, setBetaModalOpen] = useState(false);

  // Mark client mounted for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state with database & storage accounts API
  const fetchAllStatuses = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const activeUser = session?.user?.id || effectiveWs;
      if (!activeUser) return;

      // 1. Check Google Drive Connected Accounts from storage_drive_accounts
      if (effectiveWs) {
        try {
          const driveRes = await fetch(`/api/storage/google/accounts?workspace_id=${encodeURIComponent(effectiveWs)}`, {
            cache: 'no-store'
          });
          if (driveRes.ok) {
            const driveData = await driveRes.json();
            if (driveData.success && Array.isArray(driveData.accounts) && driveData.accounts.length > 0) {
              setGoogleDriveConnected(true);
              setDriveAccountsCount(driveData.accounts.length);
            } else {
              setGoogleDriveConnected(false);
              setDriveAccountsCount(0);
            }
          }
        } catch (driveErr) {
          console.warn('[Integrations] Safe caught Drive accounts fetch error:', driveErr);
        }
      }

      // 2. Check Evolution Instances for WhatsApp Beta
      try {
        const { data: evoInst } = await supabase
          .from('evolution_instances')
          .select('connection_status')
          .eq('workspace_id', activeUser)
          .maybeSingle();

        if (evoInst?.connection_status === 'CONNECTED') {
          setWhatsappBetaConnected(true);
        } else {
          setWhatsappBetaConnected(false);
        }
      } catch (evoErr) {
        console.warn('[Integrations] Safe caught Evolution status error:', evoErr);
      }

      // 3. Check Baileys WhatsApp Web session status accurately
      if (effectiveWs) {
        try {
          const token = session?.access_token;
          if (token) {
            const waRes = await fetch(`/api/integrations/baileys/qr-status?workspace_id=${encodeURIComponent(effectiveWs)}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store'
            });
            if (waRes.ok) {
              const waData = await waRes.json();
              const isWaOpen = Boolean((waData.isConnected === true || waData.status === 'open' || waData.conn_state === 'open') && !waData.qr_string && !!waData.phone_number);
              setWhatsappConnected(isWaOpen);
            } else {
              setWhatsappConnected(false);
            }
          }
        } catch (waErr) {
          console.warn('[Integrations] Safe caught WhatsApp status error:', waErr);
          setWhatsappConnected(false);
        }

        // 4. Check Meta connection status strictly scoped to this workspace
        try {
          const token = session?.access_token;
          if (token) {
            const metaRes = await fetch(`/api/meta/status?workspace_id=${encodeURIComponent(effectiveWs)}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store'
            });
            if (metaRes.ok) {
              const metaData = await metaRes.json();
              setMetaConnected(Boolean(metaData.success && metaData.connection?.is_connected));
            } else {
              setMetaConnected(false);
            }
          }
        } catch (metaErr) {
          console.warn('[Integrations] Safe caught Meta status error:', metaErr);
          setMetaConnected(false);
        }
      }

      // 5. Check integration_credentials for other tools
      try {
        const { data: creds } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('user_id', activeUser);

        if (creds && Array.isArray(creds)) {
          creds.forEach(c => {
            if (c.provider === 'meta') setMetaConnected(c.status === 'connected');
            if (c.provider === 'custom_website') setWebsiteConnected(c.status === 'connected');
            if (c.provider === 'whatsapp') setWhatsappConnected(c.status === 'connected');
            if (c.provider === 'evolution_whatsapp') setWhatsappBetaConnected(c.status === 'connected');
            if (c.provider === 'smtp') setSmtpConnected(c.status === 'connected');
            if (c.provider === 'google_contacts') setGoogleContactsConnected(c.status === 'connected');
            if (c.provider === 'google_sheets') setGoogleSheetsConnected(c.status === 'connected');
            if (c.provider === 'google_calendar') setGoogleCalendarConnected(c.status === 'connected');
            if (c.provider === 'google') {
              const cfg = (c.config as any) || {};
              if (cfg.contacts_enabled !== undefined) {
                setGoogleContactsConnected(c.status === 'connected' && cfg.contacts_enabled !== false);
              }
              if (cfg.spreadsheet_id || cfg.active_sheets) {
                setGoogleSheetsConnected(c.status === 'connected');
              }
            }
          });
        }
      } catch (credErr) {
        console.warn('[Integrations] Safe caught credentials check error:', credErr);
      }
    } catch (err) {
      console.warn('[Integrations] Status sync skipped safely:', err);
    } finally {
      setRefreshing(false);
    }
  }, [effectiveWs]);

  useEffect(() => {
    if (mounted) {
      fetchAllStatuses();
    }
  }, [mounted, fetchAllStatuses]);

  // Master Integrations Directory
  const integrationsList: IntegrationItem[] = useMemo(() => [
    {
      id: 'whatsapp-web',
      name: 'WhatsApp Web',
      category: 'communication',
      categoryLabel: 'Communication',
      description: 'Trigger automated workflow drips, quotation PDF dispatches, booking alerts, and templates via serverless web socket.',
      logo: (
        <img src="/images/integrations/whatsapp.png" alt="WhatsApp" className="w-6 h-6 object-contain" />
      ),
      status: whatsappConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/whatsapp-web',
      metaBadge: whatsappConnected ? 'Socket Gateway Active' : 'QR Scan Ready',
      actionLabel: whatsappConnected ? 'Open Console' : 'Scan QR Code',
    },
    {
      id: 'meta-ads',
      name: 'Meta Ads Manager',
      category: 'marketing',
      categoryLabel: 'Marketing & Leads',
      description: 'Ingest leads automatically in real-time from Facebook & Instagram lead ad campaigns into your StudioCore CRM pipeline.',
      logo: (
        <img src="/images/integrations/meta.png" alt="Meta" className="w-6 h-6 object-contain" />
      ),
      status: metaConnected ? 'connected' : 'disconnected',
      path: '/workspace/integrations/meta',
      metaBadge: metaConnected ? 'Realtime Webhook Live' : 'Direct Sync',
      actionLabel: metaConnected ? 'Manage Campaigns' : 'Connect Meta Ads',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'storage',
      categoryLabel: 'Storage & Cloud',
      description: 'Seamlessly connect and sync shoot photos, raw cinema footage, editing drafts, and final client deliverables.',
      logo: (
        <svg viewBox="0 0 87.3 78" className="w-6 h-6">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      ),
      status: googleDriveConnected ? 'connected' : 'disconnected',
      path: '/workspace/integrations/google-drive',
      metaBadge: driveAccountsCount > 0 ? `${driveAccountsCount} account${driveAccountsCount > 1 ? 's' : ''} connected` : 'Multi-Account',
      actionLabel: googleDriveConnected ? 'Manage Files & Storage' : 'Connect Google Drive',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      category: 'productivity',
      categoryLabel: 'Productivity',
      description: 'Append rows, map custom columns, and sync spreadsheet databases with two-way automated client sync.',
      logo: (
        <img src="/images/integrations/google-sheets.png" alt="Google Sheets" className="w-6 h-6 object-contain" />
      ),
      status: sheetsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-sheets',
      metaBadge: sheetsConnected ? '2-Way Sheet Sync' : 'Live Sync',
      actionLabel: sheetsConnected ? 'Configure Sheet' : 'Connect Sheets',
    },
    {
      id: 'google-contacts',
      name: 'Google Contacts',
      category: 'productivity',
      categoryLabel: 'Productivity',
      description: 'Export and sync verified client phone numbers, names, and shoot event tags automatically to your Google Contacts.',
      logo: (
        <img src="/images/integrations/google-contacts.png" alt="Google Contacts" className="w-6 h-6 object-contain" />
      ),
      status: contactsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-contacts',
      metaBadge: contactsConnected ? 'Phonebook Synced' : 'Auto Export',
      actionLabel: contactsConnected ? 'Manage Contacts' : 'Connect Contacts',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'productivity',
      categoryLabel: 'Productivity',
      description: 'Automatically block shoot dates, sync sub-event timelines (Muhurtham, Reception, Haldi), and prevent team double-booking.',
      logo: (
        <img src="/images/integrations/google-calendar.png" alt="Google Calendar" className="w-6 h-6 object-contain" />
      ),
      status: calendarConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-calendar',
      metaBadge: calendarConnected ? 'Schedule Synced' : 'Shoot Timelines',
      actionLabel: calendarConnected ? 'Manage Calendar' : 'Connect Calendar',
    },
    {
      id: 'whatsapp-cloud-api',
      name: 'WhatsApp Cloud API (Beta)',
      category: 'communication',
      categoryLabel: 'Communication',
      description: 'Official Meta WhatsApp Business Cloud API with verified green badge support and high-throughput automated notification drips.',
      logo: (
        <div className="relative">
          <img src="/images/integrations/whatsapp.png" alt="WhatsApp Cloud" className="w-6 h-6 object-contain" />
          <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-zinc-900" />
        </div>
      ),
      status: whatsappBetaConnected ? 'connected' : 'disconnected',
      path: '#',
      metaBadge: whatsappBetaConnected ? 'Cloud API Active' : 'Official Meta API',
      actionLabel: whatsappBetaConnected ? 'Manage Cloud API' : 'Connect Cloud API',
      onActionClick: () => setBetaModalOpen(true),
    },
    {
      id: 'gmail-smtp',
      name: 'Gmail SMTP Server',
      category: 'communication',
      categoryLabel: 'Communication',
      description: 'Configure custom authenticated SMTP servers to dispatch official quotes, invoices, and client updates from your domain.',
      logo: (
        <img src="/images/integrations/gmail.png" alt="Gmail" className="w-6 h-6 object-contain" />
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
    {
      id: 'personal-website',
      name: 'Personal Website Webhook',
      category: 'marketing',
      categoryLabel: 'Marketing & Leads',
      description: 'Capture incoming inquiries from WordPress, Elementor, Webflow, Squarespace, and custom studio website forms.',
      logo: (
        <img src="/images/integrations/wordpress.png" alt="Website Webhook" className="w-6 h-6 object-contain" />
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
    {
      id: 'instagram-leads',
      name: 'Instagram Direct & Leads',
      category: 'marketing',
      categoryLabel: 'Marketing & Leads',
      description: 'Sync Instagram story replies, direct message inquiries, and profile link clicks directly into your lead pipeline.',
      logo: (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <defs>
            <radialGradient id="ig-grad-workspace" r="150%" cx="30%" cy="107%">
              <stop offset="0" stopColor="#fdf497" />
              <stop offset="5%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-grad-workspace)" />
          <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.8" fill="none" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="white" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8" fill="none" />
        </svg>
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
    {
      id: 'google-meet',
      name: 'Google Meet',
      category: 'communication',
      categoryLabel: 'Communication',
      description: 'Generate video consultation links automatically upon quote approval for virtual wedding and event planning sessions.',
      logo: (
        <img src="/images/integrations/google-meet.png" alt="Google Meet" className="w-6 h-6 object-contain" />
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
    {
      id: 'zoom-meetings',
      name: 'Zoom Meetings',
      category: 'communication',
      categoryLabel: 'Communication',
      description: 'Schedule discovery calls and client wedding consultations with 1-click video links and calendar sync.',
      logo: (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <rect width="24" height="24" rx="6" fill="#2D8CFF" />
          <path d="M5.5 8.5C5.5 7.67 6.17 7 7 7h7c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H7c-.83 0-1.5-.67-1.5-1.5v-7zm11.5 2.15l3-2.15v7l-3-2.15v-2.7z" fill="white" />
        </svg>
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
    {
      id: 'canva',
      name: 'Canva Design Hub',
      category: 'productivity',
      categoryLabel: 'Productivity',
      description: 'Export moodboards, proposal covers, story layouts, and print album proofs directly to your studio Canva workspace.',
      logo: (
        <img src="/images/integrations/canva.png" alt="Canva" className="w-6 h-6 object-contain rounded-md" />
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
  ], [
    whatsappConnected, metaConnected, googleDriveConnected, driveAccountsCount,
    sheetsConnected, contactsConnected, calendarConnected, whatsappBetaConnected
  ]);

  // Connected count & health metrics
  const connectedCount = useMemo(() => {
    return integrationsList.filter(item => item.status === 'connected').length;
  }, [integrationsList]);

  // Filtered items based on Category & Search
  const filteredIntegrations = useMemo(() => {
    return integrationsList.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
      
      if (selectedCategory === 'all') return matchesSearch;
      return matchesSearch && item.category === selectedCategory;
    });
  }, [integrationsList, searchQuery, selectedCategory]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: integrationsList.length,
      marketing: 0,
      communication: 0,
      productivity: 0,
      storage: 0,
    };
    integrationsList.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return counts;
  }, [integrationsList]);

  // Skeleton placeholder during initial SSR/hydration
  if (!mounted) {
    return (
      <div className="min-h-[85vh] w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-3xl" />
          ))}
        </div>
        <div className="h-12 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[88vh] w-full p-3 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto font-sans antialiased text-zinc-900 dark:text-zinc-100">
      
      {/* ── Top Header & Context ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          {/* Breadcrumb Pill */}
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
            <Link href="/workspace" className="hover:text-amber-500 transition-colors">
              Workspace
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-800 dark:text-zinc-200">Integrations Hub</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Integrations & Gateways
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3 h-3" />
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Connect marketing channels, automated client messaging, cloud storage deliverables, and productivity tools to power {workspaceName || 'your studio'}.
          </p>
        </div>

        {/* Top Actions: Refresh button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={() => fetchAllStatuses()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-250 dark:border-zinc-750 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh integration live statuses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : 'text-zinc-500'}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* ── Metric Stat Cards Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Active Gateways */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Connected Tools
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-950 dark:text-white">
              {connectedCount}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              of {integrationsList.length} services
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational gateways</span>
          </div>
        </div>

        {/* Card 2: Lead Ingestion */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Lead Ingest
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${metaConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {metaConnected ? 'Meta Ads Active' : 'Meta Ads Disconnected'}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-zinc-500 flex items-center gap-1">
            <Link href="/workspace/integrations/meta" className="text-amber-500 hover:underline">
              Configure Webhooks →
            </Link>
          </div>
        </div>

        {/* Card 3: Client Messaging */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Messaging
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${whatsappConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {whatsappConnected ? 'WhatsApp Socket Live' : 'WhatsApp Offline'}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-zinc-500 flex items-center gap-1">
            <Link href="/dashboard/integrations/whatsapp-web" className="text-amber-500 hover:underline">
              Open Socket Console →
            </Link>
          </div>
        </div>

        {/* Card 4: Cloud Deliverables */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Cloud Storage
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${googleDriveConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {googleDriveConnected ? `${driveAccountsCount} Drive Account${driveAccountsCount > 1 ? 's' : ''}` : 'No Drive Accounts'}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-zinc-500 flex items-center gap-1">
            <Link href="/workspace/integrations/google-drive" className="text-amber-500 hover:underline">
              Manage Deliverables →
            </Link>
          </div>
        </div>

      </div>

      {/* ── Category Filter Pills & Search Bar Toolbar ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 dark:bg-zinc-850/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'all', label: 'All Gateways', count: categoryCounts.all },
            { id: 'marketing', label: 'Marketing & Leads', count: categoryCounts.marketing },
            { id: 'communication', label: 'Communication', count: categoryCounts.communication },
            { id: 'productivity', label: 'Productivity', count: categoryCounts.productivity },
            { id: 'storage', label: 'Storage & Cloud', count: categoryCounts.storage },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as IntegrationCategory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedCategory === tab.id
                  ? 'bg-white dark:bg-zinc-750 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategory === tab.id
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar & View Mode Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-850/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-750 text-zinc-950 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-600'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition ${viewMode === 'list' ? 'bg-white dark:bg-zinc-750 text-zinc-950 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-600'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ── Integrations Cards Grid / List ─────────────────────────────── */}
      {filteredIntegrations.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No integrations match your search</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Try adjusting your category filter or search keywords.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredIntegrations.map((item) => {
            const isConnected = item.status === 'connected';
            const isComingSoon = item.status === 'coming_soon' || item.isComingSoon;

            return (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/40 dark:hover:border-amber-500/40 shadow-xs hover:shadow-lg hover:shadow-amber-500/5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Logo, Category, Status Pill */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700/60 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                      {item.logo}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isComingSoon ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          <Clock className="w-3 h-3" />
                          Coming Soon
                        </span>
                      ) : isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60">
                          Disconnected
                        </span>
                      )}

                      {item.metaBadge && (
                        <span className="text-[10px] font-medium text-zinc-400">
                          {item.metaBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      {item.categoryLabel}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom CTA Row */}
                <div className="pt-5 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                  {!isComingSoon ? (
                    <Link
                      href={item.path}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
                    >
                      <span>Settings</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-zinc-400">
                      In Development
                    </span>
                  )}

                  {isComingSoon ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-750 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </span>
                  ) : item.onActionClick ? (
                    <button
                      onClick={item.onActionClick}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                        isConnected
                          ? 'bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isConnected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{item.actionLabel || (isConnected ? 'Manage' : 'Connect')}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.path}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                        isConnected
                          ? 'bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isConnected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{item.actionLabel || (isConnected ? 'Manage' : 'Connect')}</span>
                    </Link>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-xs">
          {filteredIntegrations.map((item) => {
            const isConnected = item.status === 'connected';
            const isComingSoon = item.status === 'coming_soon' || item.isComingSoon;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-center p-2 shrink-0">
                    {item.logo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/60">
                        {item.categoryLabel}
                      </span>
                      {item.metaBadge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isConnected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {item.metaBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {isComingSoon ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-750 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Coming Soon</span>
                    </span>
                  ) : item.onActionClick ? (
                    <button
                      onClick={item.onActionClick}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                        isConnected
                          ? 'bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isConnected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{item.actionLabel || (isConnected ? 'Manage' : 'Connect')}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.path}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                        isConnected
                          ? 'bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isConnected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{item.actionLabel || (isConnected ? 'Manage' : 'Connect')}</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom Cloud Gateways Trust Banner ─────────────────────────── */}
      <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
              Enterprise Data Security & Strict Isolation
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Credentials and tokens are encrypted with AES-256 and strictly partitioned by studio workspace.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-zinc-400">
            StudioCore v2.4 Active
          </span>
        </div>
      </div>

      {/* WhatsApp Beta Connect Modal preserved */}
      {effectiveWs && (
        <WhatsAppBetaConnectModal
          isOpen={betaModalOpen}
          onClose={() => setBetaModalOpen(false)}
          workspaceId={effectiveWs}
          onConnectionChange={(status) => setWhatsappBetaConnected(status === 'CONNECTED')}
        />
      )}

    </div>
  );
}

// ── Default Export wrapped in local Error Boundary ─────────────────────────────
export default function WorkspaceIntegrationsPage() {
  return (
    <IntegrationsErrorBoundary>
      <WorkspaceIntegrationsHub />
    </IntegrationsErrorBoundary>
  );
}
