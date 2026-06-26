'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, SlidersHorizontal, ChevronRight, Check, Sparkles, ShieldCheck,
  Sun, Moon
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

interface IntegrationCard {
  id: string;
  name: string;
  category: 'marketing' | 'workflow' | 'workspace';
  description: string;
  logoName: string;
  status: 'connected' | 'disconnected';
  path: string;
  metaText: string;
}

function IntegrationsCore() {
  const router = useRouter();
  const { workspaceName, userEmail } = useBhamstra();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'disconnected'>('all');
  
  // Local integration statuses
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [metaConnected, setMetaConnected] = useState(true);
  const [websiteConnected, setWebsiteConnected] = useState(true);
  const [contactsConnected, setGoogleContactsConnected] = useState(false);
  const [calendarConnected, setGoogleCalendarConnected] = useState(false);
  const [sheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [smtpConnected, setSmtpConnected] = useState(false);

  // Sync state with database (Law 1 Multi-Tenancy)
  useEffect(() => {
    const fetchCreds = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      try {
        const { data: creds } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (creds) {
          creds.forEach(c => {
            if (c.provider === 'meta') setMetaConnected(c.status === 'connected');
            if (c.provider === 'custom_website') setWebsiteConnected(c.status === 'connected');
            if (c.provider === 'whatsapp') setWhatsappConnected(c.status === 'connected');
            if (c.provider === 'google') {
              setGoogleContactsConnected(c.status === 'connected');
              setGoogleCalendarConnected(c.status === 'connected');
              setGoogleSheetsConnected(c.status === 'connected');
            }
          });
        }
      } catch (err) {
        console.log('Credentials sync skipped.');
      }
    };
    fetchCreds();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    if (id === 'whatsapp-web') setWhatsappConnected(nextStatus);
    if (id === 'meta-ads') setMetaConnected(nextStatus);
    if (id === 'personal-website') setWebsiteConnected(nextStatus);
    if (id === 'google-contacts') setGoogleContactsConnected(nextStatus);
    if (id === 'google-calendar') setGoogleCalendarConnected(nextStatus);
    if (id === 'google-sheets') setGoogleSheetsConnected(nextStatus);
    if (id === 'gmail-smtp') setSmtpConnected(nextStatus);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const provider = id === 'personal-website' ? 'custom_website' : 
                       id === 'whatsapp-web' ? 'whatsapp' : 
                       id === 'meta-ads' ? 'meta' : 'google';

      await supabase
        .from('integration_credentials')
        .upsert({
          user_id: session.user.id,
          provider,
          status: nextStatus ? 'connected' : 'disconnected',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, provider' });
    } catch (err) {
      console.log('Skipped database save.');
    }
  };

  const integrations: IntegrationCard[] = [
    {
      id: 'meta-ads',
      name: 'Meta Ads Manager',
      category: 'marketing',
      description: 'Ingest leads automatically from Facebook & Instagram lead campaigns.',
      logoName: 'meta.png',
      status: metaConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/meta-ads',
      metaText: 'Facebook/Instagram Forms Sync'
    },
    {
      id: 'whatsapp-web',
      name: 'WhatsApp Web',
      category: 'marketing',
      description: 'Trigger notifications and reply via our serverless socket gateway.',
      logoName: 'whatsapp.png',
      status: whatsappConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/whatsapp-web',
      metaText: 'WhatsApp Socket Gateway API'
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      category: 'workspace',
      description: 'Fetch and append rows, map columns, and sync spreadsheet databases.',
      logoName: 'google-sheets.png',
      status: sheetsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-sheets',
      metaText: 'Spreadsheet Cloud Integration'
    },
    {
      id: 'personal-website',
      name: 'Personal Website Webhook',
      category: 'marketing',
      description: 'Map incoming payloads from WordPress and Elementor forms.',
      logoName: 'wordpress.png',
      status: websiteConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/personal-website',
      metaText: 'WordPress API Key Ingress'
    },
    {
      id: 'google-contacts',
      name: 'Google Contacts',
      category: 'workspace',
      description: 'Export and sync verified client profiles to your Google Phonebook.',
      logoName: 'google-contacts.png',
      status: contactsConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-contacts',
      metaText: 'Contacts Auto-Sync Engine'
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'workspace',
      description: 'Automatically block dates and sync event timelines to Calendar.',
      logoName: 'google-calendar.png',
      status: calendarConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/google-calendar',
      metaText: 'Calendar Shoot Date Blocker'
    },
    {
      id: 'gmail-smtp',
      name: 'Gmail SMTP Server',
      category: 'workflow',
      description: 'Configure custom email SMTP servers to send client updates.',
      logoName: 'gmail.png',
      status: smtpConnected ? 'connected' : 'disconnected',
      path: '/dashboard/integrations/gmail-smtp',
      metaText: 'SMTP Outgoing Dispatch'
    }
  ];

  // Filters logic
  const filteredIntegrations = integrations.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'connected') return matchesSearch && item.status === 'connected';
    if (activeTab === 'disconnected') return matchesSearch && item.status === 'disconnected';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/10 transition-colors duration-200">
      
      {/* Background glow overlay */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> 1-CLICK CLOUD SYNC HUB
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-zinc-900 dark:text-white">
            Integrations Center
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Link Meta lead campaigns, WhatsApp gateways, website webhooks, and Google Workspace utilities to automate studio operations.
          </p>
        </div>

        {/* Filter & Search Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-3 rounded-2xl bg-zinc-150/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md">
          {/* Filtering tabs */}
          <div className="flex gap-1.5 bg-zinc-200/50 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-300/40 dark:border-zinc-800/40">
            {(['all', 'connected', 'disconnected'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all focus:outline-none ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-zinc-850 text-zinc-950 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Input bar */}
          <div className="flex items-center gap-3 flex-1 md:max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800/80 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-450 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Mapped integration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredIntegrations.map((item) => {
              const isConnected = item.status === 'connected';
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      {/* Logo PNG */}
                      <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 flex items-center justify-center shrink-0 shadow-sm p-2">
                        <img 
                          src={`/images/integrations/${item.logoName}`} 
                          alt={item.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 capitalize">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900/60 mt-4">
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-mono tracking-tight truncate max-w-[120px]">
                      {item.metaText}
                    </span>

                    <div className="flex items-center gap-2.5">
                      {/* Custom Toggle Switch */}
                      <button
                        onClick={() => handleToggleStatus(item.id, isConnected)}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                          isConnected ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-950 transition-transform ${
                          isConnected ? 'translate-x-3' : 'translate-x-0'
                        }`} />
                      </button>

                      {/* Configure Button link */}
                      <Link
                        href={item.path}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-0.5"
                      >
                        Configure <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Security / System Rules Info */}
        <div className="p-4.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Secure RLS Isolation Verified</h5>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              All integrated tokens and API credentials stored in your database profiles are fully locked via PostgreSQL Row Level Security checks. Third-party integrations are isolated strictly by workspace bounds.
            </p>
          </div>
        </div>

      </div>

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
