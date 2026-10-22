'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Check, ArrowRight, ArrowLeft, ExternalLink,
  ShieldCheck, Sparkles, RefreshCw, Clock
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import { WhatsAppBetaConnectModal } from '@/components/integrations/whatsapp-beta-connect-modal';

type IntegrationCategory = 'all' | 'marketing' | 'communication' | 'productivity' | 'storage';

interface IntegrationItem {
  id: string;
  name: string;
  category: 'marketing' | 'communication' | 'productivity' | 'storage';
  description: string;
  logo: React.ReactNode;
  status: 'connected' | 'disconnected' | 'coming_soon';
  path: string;
  metaBadge?: string;
  isComingSoon?: boolean;
}

function IntegrationsCore() {
  const router = useRouter();
  const { workspaceId, userId } = useBhamstra();
  const effectiveWs = (workspaceId && workspaceId !== 'all') ? workspaceId : (userId || '');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>('all');

  // Integration Connection States
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [whatsappBetaConnected, setWhatsappBetaConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(true);
  const [websiteConnected, setWebsiteConnected] = useState(false);
  const [contactsConnected, setGoogleContactsConnected] = useState(false);
  const [calendarConnected, setGoogleCalendarConnected] = useState(false);
  const [sheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [smtpConnected, setSmtpConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [driveAccountsCount, setDriveAccountsCount] = useState(0);

  const [betaModalOpen, setBetaModalOpen] = useState(false);

  // Sync state with database & Google Storage accounts API
  useEffect(() => {
    const fetchAllStatuses = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user?.id || effectiveWs;
        if (!activeUser) return;

        // 1. Check Google Drive Connected Accounts from storage_drive_accounts
        if (effectiveWs) {
          try {
            const driveRes = await fetch(`/api/storage/google/accounts?workspace_id=${encodeURIComponent(effectiveWs)}`);
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
            console.warn('Drive accounts fetch error:', driveErr);
          }
        }

        // 2. Check Evolution Instances for WhatsApp Beta
        const { data: evoInst } = await supabase
          .from('evolution_instances')
          .select('connection_status')
          .eq('workspace_id', activeUser)
          .maybeSingle();

        if (evoInst?.connection_status === 'CONNECTED') {
          setWhatsappBetaConnected(true);
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
          } catch (_) {
            setWhatsappConnected(false);
          }

          // Check Meta connection status strictly scoped to this workspace
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
          } catch (_) {
            setMetaConnected(false);
          }
        }

        // 4. Check integration_credentials for other tools
        const { data: creds } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('user_id', activeUser);

        if (creds) {
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
      } catch (err) {
        console.warn('Integrations status sync skipped:', err);
      }
    };

    fetchAllStatuses();
  }, [effectiveWs]);

  // Exact Order Requested by User:
  // 1. WhatsApp Web
  // 2. Meta Ads Manager
  // 3. Google Drive
  // 4. Google Sheets
  // 5. Google Contacts
  // 6. Google Calendar
  // 7. Gmail SMTP Server (Coming Soon)
  // 8. Personal Website Webhook (Coming Soon)
  // 9. Instagram (Coming Soon)
  // 10. Google Meet (Coming Soon)
  // 11. Zoom (Coming Soon)
  // 12. Canva (Coming Soon)
  const integrationsList: IntegrationItem[] = useMemo(() => [
    {
      id: 'whatsapp-web',
      name: 'WhatsApp Web',
      category: 'communication',
      description: 'Trigger automated workflow drips, booking alerts, and templates via serverless socket.',
      logo: (
        <img src="/images/integrations/whatsapp.png" alt="WhatsApp" className="w-6 h-6 object-contain" />
      ),
      status: whatsappConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/whatsapp-web',
      metaBadge: whatsappConnected ? 'Socket Gateway Active' : undefined,
    },
    {
      id: 'meta-ads',
      name: 'Meta Ads Manager',
      category: 'marketing',
      description: 'Ingest leads automatically in real-time from Facebook & Instagram lead campaigns.',
      logo: (
        <img src="/images/integrations/meta.png" alt="Meta" className="w-6 h-6 object-contain" />
      ),
      status: metaConnected ? 'connected' : 'disconnected',
      path: '/workspace/integrations/meta',
      metaBadge: metaConnected ? 'Realtime Webhook Live' : undefined,
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'storage',
      description: 'Seamlessly connect and sync event photos, videos, and client deliverables.',
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
      metaBadge: driveAccountsCount > 0 ? `${driveAccountsCount} account${driveAccountsCount > 1 ? 's' : ''} connected` : undefined,
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      category: 'productivity',
      description: 'Append rows, map custom columns, and sync spreadsheet databases with 2-way sync.',
      logo: (
        <img src="/images/integrations/google-sheets.png" alt="Google Sheets" className="w-6 h-6 object-contain" />
      ),
      status: sheetsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-sheets',
    },
    {
      id: 'google-contacts',
      name: 'Google Contacts',
      category: 'productivity',
      description: 'Export and sync verified client profiles automatically to your Google Phonebook.',
      logo: (
        <img src="/images/integrations/google-contacts.png" alt="Google Contacts" className="w-6 h-6 object-contain" />
      ),
      status: contactsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-contacts',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'productivity',
      description: 'Automatically block shoot dates and sync sub-event timelines to your calendar.',
      logo: (
        <img src="/images/integrations/google-calendar.png" alt="Google Calendar" className="w-6 h-6 object-contain" />
      ),
      status: calendarConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-calendar',
    },
    {
      id: 'gmail-smtp',
      name: 'Gmail SMTP Server',
      category: 'communication',
      description: 'Configure custom email SMTP servers to dispatch official quotes and client updates.',
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
      description: 'Capture incoming inquiries from WordPress, Elementor, and custom website forms.',
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
      description: 'Sync story replies, direct messages, and Instagram ad form inquiries.',
      logo: (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <defs>
            <radialGradient id="ig-grad" r="150%" cx="30%" cy="107%">
              <stop offset="0" stopColor="#fdf497" />
              <stop offset="5%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
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
      description: 'Generate video consultation links automatically upon quote or booking approval.',
      logo: (
        <img src="/integrations/google-meet.png" alt="Google Meet" className="w-6 h-6 object-contain" />
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
      description: 'Schedule discovery calls and client wedding consultations with 1-click calendar sync.',
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
      description: 'Export moodboards, quotation covers, and client story layouts directly to Canva.',
      logo: (
        <img src="/integrations/canva.png" alt="Canva" className="w-6 h-6 object-contain" />
      ),
      status: 'coming_soon',
      path: '#',
      isComingSoon: true,
      metaBadge: 'Coming Soon',
    },
  ], [googleDriveConnected, driveAccountsCount, whatsappConnected, metaConnected, sheetsConnected, websiteConnected, contactsConnected, calendarConnected, smtpConnected]);

  // Filter integrations based on category & search query
  const filteredIntegrations = useMemo(() => {
    return integrationsList.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedCategory === 'all') return matchesSearch;
      return matchesSearch && item.category === selectedCategory;
    });
  }, [integrationsList, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#090C10] text-zinc-900 dark:text-zinc-100 p-2 sm:p-5 lg:p-7 flex items-center justify-center font-sans antialiased">
      
      {/* Outer Modern Card Container */}
      <div className="w-full max-w-6xl bg-white dark:bg-[#12161F] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl shadow-zinc-300/40 dark:shadow-none overflow-hidden flex flex-col lg:flex-row min-h-[720px]">
        
        {/* ── Left Hero Panel (Untitled UI Style) ────────────────────────── */}
        <div className="lg:w-[32%] bg-[#F9FAFC] dark:bg-[#0E121A] p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800/80 relative overflow-hidden">
          
          {/* Top Brand Logo */}
          <div className="flex items-center gap-2.5 z-10">
            {/* Sunburst Asterisk Brand Mark */}
            <div className="w-7 h-7 flex items-center justify-center text-zinc-900 dark:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-950 dark:text-white">
              Studio Core
            </span>
          </div>

          {/* Floating App Icon Collage - Includes Drive, Gmail, WhatsApp, Instagram, Meet, Zoom, Canva */}
          <div className="my-6 relative select-none pointer-events-none">
            {/* Top & Bottom Gradient Fades */}
            <div className="absolute -top-4 inset-x-0 h-10 bg-gradient-to-b from-[#F9FAFC] dark:from-[#0E121A] to-transparent z-10" />
            <div className="absolute -bottom-4 inset-x-0 h-10 bg-gradient-to-t from-[#F9FAFC] dark:from-[#0E121A] to-transparent z-10" />

            <div className="space-y-3 opacity-95">
              {/* Row 1 */}
              <div className="flex items-center gap-3 -ml-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <svg viewBox="0 0 87.3 78" className="w-full h-full">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/gmail.png" alt="Gmail" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/whatsapp.png" alt="WhatsApp" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2">
                  <svg viewBox="0 0 24 24" className="w-full h-full">
                    <defs>
                      <radialGradient id="ig-hero-grad" cx="20%" cy="105%" r="130%">
                        <stop offset="0" stopColor="#fdf497" />
                        <stop offset="5%" stopColor="#fdf497" />
                        <stop offset="45%" stopColor="#fd5949" />
                        <stop offset="60%" stopColor="#d6249f" />
                        <stop offset="90%" stopColor="#285AEB" />
                      </radialGradient>
                    </defs>
                    <rect width="24" height="24" rx="6" fill="url(#ig-hero-grad)" />
                    <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.8" fill="none" />
                    <circle cx="17.2" cy="6.8" r="1.1" fill="white" />
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/google-calendar.png" alt="Calendar" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-md flex items-center justify-center text-orange-500 font-bold text-xs">
                  ⚡
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-3 ml-2">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/integrations/google-meet.png" alt="Google Meet" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/google-contacts.png" alt="Contacts" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/google-sheets.png" alt="Sheets" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#000000] dark:bg-white text-white dark:text-black shadow-md flex items-center justify-center font-bold text-sm">
                  N
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#2D8CFF] shadow-md flex items-center justify-center p-2.5 text-white">
                  <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                    <path d="M5.5 8.5C5.5 7.67 6.17 7 7 7h7c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H7c-.83 0-1.5-.67-1.5-1.5v-7zm11.5 2.15l3-2.15v7l-3-2.15v-2.7z" />
                  </svg>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-3 -ml-2">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/meta.png" alt="Meta" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2">
                  <img src="/integrations/canva.png" alt="Canva" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/wordpress.png" alt="WordPress" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2] shadow-md flex items-center justify-center text-white font-bold text-xs">
                  Linear
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#E24329] shadow-md flex items-center justify-center text-white font-bold text-xs">
                  🦊
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center gap-3 ml-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4A154B] shadow-md flex items-center justify-center text-white font-bold text-sm">
                  #
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#2D8CFF] shadow-md flex items-center justify-center text-white font-bold text-sm">
                  Zoom
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#625DF5] shadow-md flex items-center justify-center text-white font-bold text-xs">
                  Loom
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F06A6A] shadow-md flex items-center justify-center text-white font-bold text-xs">
                  Asana
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FF4F00] shadow-md flex items-center justify-center text-white font-bold text-xs">
                  *
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Heading */}
          <div className="space-y-2 z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              Add integrations
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Supercharge your workflow and connect the tools you use every day to your account.
            </p>
          </div>

        </div>

        {/* ── Right Integrations & Connected Apps Panel ─────────────────── */}
        <div className="lg:w-[68%] p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#12161F]">
          
          <div className="space-y-5">
            
            {/* Header: Title */}
            <div className="pb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Integrations and connected apps
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Supercharge your workflow and connect the tool you use every day.
              </p>
            </div>

            {/* Filter Pills & Search Bar Row - 1 SINGLE LINE with NO scrollbar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              
              {/* Category Filter Pills - Strict single line without scroll */}
              <div className="flex items-center gap-1 p-1 bg-zinc-100/90 dark:bg-zinc-850/90 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shrink-0">
                {[
                  { id: 'all', label: 'All integrations' },
                  { id: 'marketing', label: 'Marketing & Leads' },
                  { id: 'communication', label: 'Communication' },
                  { id: 'productivity', label: 'Productivity' },
                  { id: 'storage', label: 'Storage & Cloud' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id as IntegrationCategory)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all focus:outline-none cursor-pointer shrink-0 ${
                      selectedCategory === tab.id
                        ? 'bg-white dark:bg-zinc-750 text-zinc-950 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-44 shrink-0">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps..."
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 shadow-2xs transition-all"
                />
              </div>
            </div>

            {/* Integrations Table / Smooth Scrolling List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850/70 border-t border-b border-zinc-100 dark:border-zinc-850/70 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {filteredIntegrations.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs font-mono">
                  No integrations found matching your filter criteria.
                </div>
              ) : (
                filteredIntegrations.map((item) => {
                  const isConnected = item.status === 'connected';
                  const isComingSoon = item.status === 'coming_soon' || item.isComingSoon;

                  return (
                    <div
                      key={item.id}
                      className="py-3.5 px-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/40 rounded-xl transition-all flex items-center justify-between gap-4 group"
                    >
                      {/* Left Side: Logo & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700/60 shadow-xs flex items-center justify-center shrink-0">
                          {item.logo}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                              {item.name}
                            </span>
                            {item.metaBadge && (
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                                isComingSoon 
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {item.metaBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Action Button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {!isComingSoon && (
                          <Link
                            href={item.path}
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block"
                          >
                            Learn more
                          </Link>
                        )}

                        {isComingSoon ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 cursor-not-allowed">
                            <Clock className="w-3 h-3" />
                            <span>Coming soon</span>
                          </span>
                        ) : isConnected ? (
                          <Link
                            href={item.path}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-xs transition-all"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Connected</span>
                          </Link>
                        ) : (
                          <Link
                            href={item.path}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-900 dark:text-white border border-zinc-250 dark:border-zinc-700 shadow-xs transition-all"
                          >
                            <span>Connect</span>
                          </Link>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Bottom Step Buttons completely removed per user request */}
          <div className="pt-2 text-right">
            <span className="text-[11px] text-zinc-400 font-mono">
              Studio Core Cloud Gateways
            </span>
          </div>

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

export default function IntegrationsPage() {
  return (
    <BhamstraProvider>
      <IntegrationsCore />
    </BhamstraProvider>
  );
}
