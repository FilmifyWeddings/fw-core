'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Plug, ChevronRight, Shield, MessageSquare, Mail, Users, Calendar, Globe } from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { isSuperAdmin } from '@/lib/auth/admin-guard';

const INTEGRATIONS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Web',
    description: 'Socket gateway sessions, device connections, message logs, failed deliveries, and template analytics.',
    logo: '/images/integrations/whatsapp.png',
    accent: 'emerald',
    tags: ['Devices', 'Messages', 'Templates', 'Failed Logs'],
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    description: 'Facebook & Instagram lead form sync connections and workspace credential status.',
    logo: '/images/integrations/meta.png',
    accent: 'blue',
    tags: ['Lead Sync', 'Credentials'],
  },
  {
    id: 'gmail-smtp',
    name: 'Gmail SMTP Server',
    description: 'SMTP outbound email server credentials and dispatch configuration across workspaces.',
    logo: '/images/integrations/gmail.png',
    accent: 'red',
    tags: ['SMTP', 'Email Dispatch'],
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    description: 'Google Contacts auto-sync engine status and connected workspace profiles.',
    logo: '/images/integrations/google-contacts.png',
    accent: 'green',
    tags: ['Contacts Sync'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Calendar shoot-date blocker integration status and workspace connection health.',
    logo: '/images/integrations/google-calendar.png',
    accent: 'blue',
    tags: ['Events', 'Calendar Sync'],
  },
  {
    id: 'wordpress',
    name: 'WordPress Webhook',
    description: 'Personal website webhook ingress configuration and API key validation logs.',
    logo: '/images/integrations/wordpress.png',
    accent: 'purple',
    tags: ['Webhooks', 'API Keys'],
  },
];

function IntegrationListCore() {
  const { userEmail } = useBhamstra();
  const isAdmin = isSuperAdmin(userEmail);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-red-400">Unauthorized</h2>
          <Link href="/home" className="text-xs text-zinc-400 hover:text-white transition-colors">Return to Homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/sushant/dashboard" className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all">
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono tracking-wide">
              <Plug className="w-3.5 h-3.5" /> INTEGRATION LOGS CENTER
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
            Integration Control Hub
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Deep-dive into every integration across all workspaces. View device counts, message logs, failed deliveries, and credential status.
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INTEGRATIONS.map((integ, i) => (
            <motion.div
              key={integ.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
            >
              <Link
                href={`/admin/sushant/integrations/${integ.id}`}
                className="group flex items-start gap-5 p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all shadow-sm backdrop-blur-md"
              >
                {/* Logo */}
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shrink-0 p-3 group-hover:scale-110 transition-transform shadow-sm">
                  <img src={integ.logo} alt={integ.name} className="w-full h-full object-contain" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                      {integ.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors shrink-0" />
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{integ.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {integ.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function AdminIntegrationsListPage() {
  return (
    <BhamstraProvider>
      <IntegrationListCore />
    </BhamstraProvider>
  );
}
