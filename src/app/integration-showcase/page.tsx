'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, SlidersHorizontal, ChevronRight, Sparkles, ShieldCheck,
  X, CheckCircle2, Lock, ExternalLink, Info, RefreshCw, Zap
} from 'lucide-react';

interface ShowcaseIntegrationCard {
  id: string;
  name: string;
  category: 'marketing' | 'workflow' | 'workspace';
  description: string;
  logoName: string;
  status: 'connected' | 'disconnected';
  metaText: string;
  previewDetails: {
    syncType: string;
    lastSync: string;
    version: string;
    endpoint?: string;
  };
}

const INITIAL_INTEGRATIONS: ShowcaseIntegrationCard[] = [
  {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    category: 'marketing',
    description: 'Ingest leads automatically from Facebook & Instagram lead campaigns.',
    logoName: 'meta.png',
    status: 'connected',
    metaText: 'Facebook/Instagram Forms Sync',
    previewDetails: {
      syncType: 'Instant Webhook + Lead Ads API v20.0',
      lastSync: '2 minutes ago',
      version: 'v20.0 (Official Graph API)',
      endpoint: 'https://studiocore.in/api/webhooks/meta-leads',
    }
  },
  {
    id: 'whatsapp-web',
    name: 'WhatsApp Web',
    category: 'marketing',
    description: 'Trigger notifications and reply via our serverless socket gateway.',
    logoName: 'whatsapp.png',
    status: 'connected',
    metaText: 'WhatsApp Socket Gateway API',
    previewDetails: {
      syncType: 'Serverless Multi-Device Baileys Socket',
      lastSync: 'Live Connected',
      version: 'v6.7.0 (Auto-Reconnection Active)',
    }
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'workspace',
    description: 'Fetch and append rows, map columns, and sync spreadsheet databases.',
    logoName: 'google-sheets.png',
    status: 'disconnected',
    metaText: 'Spreadsheet Cloud Integration',
    previewDetails: {
      syncType: 'Google Drive & Sheets API v4',
      lastSync: 'Not configured',
      version: 'v4.0',
    }
  },
  {
    id: 'personal-website',
    name: 'Personal Website Webhook',
    category: 'marketing',
    description: 'Map incoming payloads from WordPress and Elementor forms.',
    logoName: 'wordpress.png',
    status: 'connected',
    metaText: 'WordPress API Key Ingress',
    previewDetails: {
      syncType: 'REST Webhook Ingress (Token Auth)',
      lastSync: '5 hours ago',
      version: 'v2.1',
      endpoint: 'https://studiocore.in/api/integrations/website/webhook',
    }
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    category: 'workspace',
    description: 'Export and sync verified client profiles to your Google Phonebook.',
    logoName: 'google-contacts.png',
    status: 'disconnected',
    metaText: 'Contacts Auto-Sync Engine',
    previewDetails: {
      syncType: 'Google People API v1',
      lastSync: 'Not connected',
      version: 'v1.0',
    }
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'workspace',
    description: 'Automatically block dates and sync event timelines to Calendar.',
    logoName: 'google-calendar.png',
    status: 'disconnected',
    metaText: 'Calendar Shoot Date Blocker',
    previewDetails: {
      syncType: 'Google Calendar API v3',
      lastSync: 'Not connected',
      version: 'v3.0',
    }
  },
  {
    id: 'gmail-smtp',
    name: 'Gmail SMTP Server',
    category: 'workflow',
    description: 'Configure custom email SMTP servers to send client updates.',
    logoName: 'gmail.png',
    status: 'disconnected',
    metaText: 'SMTP Outgoing Dispatch',
    previewDetails: {
      syncType: 'TLS 587 / SSL 465 SMTP Relay',
      lastSync: 'Not configured',
      version: 'SMTP v2',
    }
  }
];

export default function IntegrationShowcasePage() {
  const [integrations, setIntegrations] = useState<ShowcaseIntegrationCard[]>(INITIAL_INTEGRATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [selectedPreview, setSelectedPreview] = useState<ShowcaseIntegrationCard | null>(null);

  // UI-only toggle handler (does not touch database or external APIs)
  const handleToggle = (id: string) => {
    setIntegrations(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'connected' ? 'disconnected' : 'connected' }
          : item
      )
    );
  };

  // Filter logic for UI tabs & search input
  const filteredIntegrations = integrations.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.metaText.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'connected') return matchesSearch && item.status === 'connected';
    if (activeTab === 'disconnected') return matchesSearch && item.status === 'disconnected';
    return matchesSearch;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const disconnectedCount = integrations.filter(i => i.status === 'disconnected').length;

  return (
    <div className="min-h-screen bg-white dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/10 transition-colors duration-200 font-sans">
      
      {/* Background subtle radial glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 relative z-10">
        
        {/* ═══ Header Section ═══ */}
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

        {/* ═══ Filter & Search Controls Bar ═══ */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md">
          
          {/* Filtering tabs */}
          <div className="flex gap-1.5 bg-zinc-200/60 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-300/40 dark:border-zinc-800/40">
            <button
              onClick={() => setActiveTab('all')}
              className={'px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all focus:outline-none cursor-pointer ' + (
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              All ({integrations.length})
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={'px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all focus:outline-none cursor-pointer ' + (
                activeTab === 'connected'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              Connected ({connectedCount})
            </button>
            <button
              onClick={() => setActiveTab('disconnected')}
              className={'px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all focus:outline-none cursor-pointer ' + (
                activeTab === 'disconnected'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              Disconnected ({disconnectedCount})
            </button>
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
                className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800/80 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div 
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all shrink-0"
              title="Filter Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* ═══ Mapped Integration Cards Grid ═══ */}
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
                          src={'/images/integrations/' + item.logoName} 
                          alt={item.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850">
                        <span className={'w-1.5 h-1.5 rounded-full ' + (isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
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
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tight truncate max-w-[120px]">
                      {item.metaText}
                    </span>

                    <div className="flex items-center gap-2.5">
                      {/* Custom Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={'w-8 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 cursor-pointer ' + (
                          isConnected ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
                        )}
                        title={isConnected ? 'Click to disable' : 'Click to enable'}
                      >
                        <div className={'w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-950 transition-transform ' + (
                          isConnected ? 'translate-x-3' : 'translate-x-0'
                        )} />
                      </button>

                      {/* Configure Button (Opens Showcase Preview Modal) */}
                      <button
                        type="button"
                        onClick={() => setSelectedPreview(item)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-0.5 cursor-pointer shadow-xs"
                      >
                        Configure <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ═══ Security / System Rules Info Panel ═══ */}
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

      {/* ═══ Showcase Configure Preview Modal (UI-Only Mock) ═══ */}
      <AnimatePresence>
        {selectedPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 flex items-center justify-center">
                    <img
                      src={'/images/integrations/' + selectedPreview.logoName}
                      alt={selectedPreview.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedPreview.name} Configuration
                    </h3>
                    <p className="text-xs text-zinc-400">UI Showcase & Architecture Preview</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 text-xs">
                
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Isolated Showcase Instance
                    </span>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                      This is an isolated UI demonstration view. It operates with mock state and does not trigger real credentials or API dispatches.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-zinc-400 font-medium">Integration Mode</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedPreview.previewDetails.syncType}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-zinc-400 font-medium">Live Telemetry</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {selectedPreview.previewDetails.lastSync}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-zinc-400 font-medium">API Specification</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {selectedPreview.previewDetails.version}
                    </span>
                  </div>

                  {selectedPreview.previewDetails.endpoint && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-zinc-400 font-medium block">Ingress Webhook Endpoint</span>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-800 dark:text-zinc-300 truncate select-all">
                        {selectedPreview.previewDetails.endpoint}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-zinc-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/40 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500" /> PostgreSQL RLS Secured
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Close Preview
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
