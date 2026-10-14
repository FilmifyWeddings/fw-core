'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Check, ArrowRight, ArrowLeft, Plus, ExternalLink,
  ShieldCheck, Sparkles, RefreshCw
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
  status: 'connected' | 'disconnected';
  path: string;
  metaBadge?: string;
  actionType?: 'link' | 'modal' | 'toggle';
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
  const [websiteConnected, setWebsiteConnected] = useState(true);
  const [contactsConnected, setGoogleContactsConnected] = useState(false);
  const [calendarConnected, setGoogleCalendarConnected] = useState(false);
  const [sheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [smtpConnected, setSmtpConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [driveAccountsCount, setDriveAccountsCount] = useState(0);

  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state with database & Google Storage accounts API
  useEffect(() => {
    const fetchAllStatuses = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user?.id || effectiveWs;
        if (!activeUser) return;

        // 1. Check Google Drive Connected Accounts
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

        // 3. Check integration_credentials
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

  const integrationsList: IntegrationItem[] = useMemo(() => [
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
      path: '/workspace/storage',
      metaBadge: driveAccountsCount > 0 ? `${driveAccountsCount} account${driveAccountsCount > 1 ? 's' : ''} connected` : undefined,
    },
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
      id: 'personal-website',
      name: 'Personal Website Webhook',
      category: 'marketing',
      description: 'Capture incoming inquiries from WordPress, Elementor, and custom website forms.',
      logo: (
        <img src="/images/integrations/wordpress.png" alt="Website Webhook" className="w-6 h-6 object-contain" />
      ),
      status: websiteConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/personal-website',
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
      status: smtpConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/gmail-smtp',
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
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#090C10] text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 lg:p-8 flex items-center justify-center font-sans antialiased">
      
      {/* Outer Modern Card Container */}
      <div className="w-full max-w-6xl bg-white dark:bg-[#12161F] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl shadow-zinc-300/40 dark:shadow-none overflow-hidden flex flex-col lg:flex-row min-h-[740px]">
        
        {/* ── Left Hero Panel (Untitled UI Style) ────────────────────────── */}
        <div className="lg:w-[38%] bg-[#F9FAFC] dark:bg-[#0E121A] p-7 sm:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800/80 relative overflow-hidden">
          
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

          {/* Floating App Icon Collage */}
          <div className="my-8 relative select-none pointer-events-none">
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
                <div className="w-12 h-12 rounded-2xl bg-[#00897B] border border-emerald-600/30 shadow-md flex items-center justify-center text-white font-black text-sm">
                  W
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
                <div className="w-12 h-12 rounded-2xl bg-[#0061FF] shadow-md flex items-center justify-center p-2 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M6 3.5l6 3.9-6 3.9-6-3.9 6-3.9zm12 0l6 3.9-6 3.9-6-3.9 6-3.9zm-12 9.9l6 3.9-6 3.9-6-3.9 6-3.9zm12 0l6 3.9-6 3.9-6-3.9 6-3.9zm-6 4.7l6-3.9 6 3.9-6 3.9-6-3.9z"/>
                  </svg>
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
                <div className="w-12 h-12 rounded-2xl bg-[#5865F2] shadow-md flex items-center justify-center text-white font-bold text-sm">
                  💬
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-3 -ml-2">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 shadow-md flex items-center justify-center p-2.5">
                  <img src="/images/integrations/meta.png" alt="Meta" className="w-full h-full object-contain" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFE01B] shadow-md flex items-center justify-center p-2">
                  <span className="font-black text-black text-xs">MC</span>
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
                <div className="w-12 h-12 rounded-2xl bg-[#03363D] shadow-md flex items-center justify-center text-emerald-400 font-bold text-sm">
                  Z
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

          {/* Bottom Heading & Step Indicator */}
          <div className="space-y-4 z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Step 2
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight mt-1">
                Add integrations
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Supercharge your workflow and connect the tools you use every day to your account.
              </p>
            </div>

            {/* Step Progress Dash Indicators */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-1.5 w-12 rounded-full bg-zinc-900 dark:bg-white" />
              <div className="h-1.5 w-12 rounded-full bg-zinc-900 dark:bg-white" />
              <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
          </div>

        </div>

        {/* ── Right Integrations & Connected Apps Panel ─────────────────── */}
        <div className="lg:w-[62%] p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-[#12161F]">
          
          <div className="space-y-6">
            
            {/* Header: Title & "+ Custom integration" Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Integrations and connected apps
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Supercharge your workflow and connect the tool you use every day.
                </p>
              </div>

              <Link
                href="/dashboard/integrations/personal-website"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm transition-all shrink-0 w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom integration</span>
              </Link>
            </div>

            {/* Filter Pills & Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-850/80 rounded-xl overflow-x-auto border border-zinc-200/60 dark:border-zinc-800 scrollbar-none">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus:outline-none ${
                      selectedCategory === tab.id
                        ? 'bg-white dark:bg-zinc-750 text-zinc-950 dark:text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-850 border border-zinc-250 dark:border-zinc-750 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 shadow-sm transition-all"
                />
              </div>

            </div>

            {/* Integrations Table / List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850/70 border-t border-b border-zinc-100 dark:divide-zinc-850/70">
              {filteredIntegrations.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs font-mono">
                  No integrations found matching your filter criteria.
                </div>
              ) : (
                filteredIntegrations.map((item) => {
                  const isConnected = item.status === 'connected';

                  return (
                    <div
                      key={item.id}
                      className="py-4 px-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/40 rounded-xl transition-all flex items-center justify-between gap-4 group"
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
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                {item.metaBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Learn More & Action Button */}
                      <div className="flex items-center gap-4 shrink-0">
                        <Link
                          href={item.path}
                          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block"
                        >
                          Learn more
                        </Link>

                        {isConnected ? (
                          <Link
                            href={item.path}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Connected</span>
                          </Link>
                        ) : (
                          <Link
                            href={item.path}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-900 dark:text-white border border-zinc-250 dark:border-zinc-700 shadow-xs transition-all"
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

          {/* Bottom Navigation Buttons (Step Navigation) */}
          <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous step</span>
            </button>

            <Link
              href="/workspace/crm"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-sm transition-all"
            >
              <span>Next step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
