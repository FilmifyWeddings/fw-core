'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ScanQrCode, Zap, FileText, MessageSquare, Layers,
  ShieldCheck, Wifi, WifiOff, RefreshCw, Building2,
  ChevronDown, Check, Sparkles, Lock, Globe
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

type WaTab = 'device' | 'chat' | 'templates' | 'workflows' | 'groups';
type ShootCategory = 'all' | 'wedding' | 'commercial';

const TABS: { id: WaTab; label: string; icon: React.ReactNode; path: string }[] = [
  {
    id: 'device',
    label: 'Device Link',
    icon: <ScanQrCode className="w-4 h-4" />,
    path: '/dashboard/integrations/whatsapp-web'
  },
  {
    id: 'chat',
    label: 'Quick Send',
    icon: <Zap className="w-4 h-4" />,
    path: '/dashboard/integrations/whatsapp-web/chat'
  },
  {
    id: 'templates',
    label: 'Template Hub',
    icon: <FileText className="w-4 h-4" />,
    path: '/dashboard/integrations/whatsapp-web/templates'
  },
  {
    id: 'workflows',
    label: 'Workflow Builder',
    icon: <Layers className="w-4 h-4" />,
    path: '/dashboard/integrations/whatsapp-web/workflows'
  },
  {
    id: 'groups',
    label: 'Contact Groups',
    icon: <MessageSquare className="w-4 h-4" />,
    path: '/dashboard/integrations/whatsapp-web/groups'
  }
];

const SHOOT_CATEGORIES: { value: ShootCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all',        label: 'All Categories',   icon: <Globe className="w-3.5 h-3.5" />,    color: 'text-zinc-400' },
  { value: 'wedding',    label: 'Wedding Shoots',    icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-rose-400' },
  { value: 'commercial', label: 'Commercial Shoots', icon: <Building2 className="w-3.5 h-3.5" />, color: 'text-sky-400' }
];

function WhatsAppLayoutCore({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId } = useBhamstra();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Determine active tab based on pathname
  let activeTab: WaTab = 'device';
  if (pathname === '/dashboard/integrations/whatsapp-web/chat') activeTab = 'chat';
  else if (pathname === '/dashboard/integrations/whatsapp-web/templates') activeTab = 'templates';
  else if (pathname === '/dashboard/integrations/whatsapp-web/workflows') activeTab = 'workflows';
  else if (pathname === '/dashboard/integrations/whatsapp-web/groups') activeTab = 'groups';

  const shootCategory = (searchParams.get('category') || 'all') as ShootCategory;
  const activeCategory = SHOOT_CATEGORIES.find(c => c.value === shootCategory) || SHOOT_CATEGORIES[0];

  const handleCategoryChange = (val: ShootCategory) => {
    setShootCategory(val);
    setCategoryOpen(false);
  };

  const setShootCategory = (cat: ShootCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', cat);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sync WA connection status from DB
  useEffect(() => {
    if (!userId) return;
    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('integration_credentials')
          .select('status')
          .eq('user_id', userId)
          .eq('provider', 'whatsapp')
          .maybeSingle();
        setWsStatus(data?.status === 'connected' ? 'connected' : 'disconnected');
      } catch {
        setWsStatus('disconnected');
      }
    };
    checkStatus();
  }, [userId]);

  return (
    <div className="w-full min-h-screen bg-[#070708] text-white flex flex-col overflow-hidden font-sans">
      
      {/* ═══ TOPBAR ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/70 bg-[#070708]/90 backdrop-blur-lg z-30">
        
        {/* Left: Back + Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/integrations')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <img src="/images/integrations/whatsapp.png" alt="WA" className="w-4.5 h-4.5 object-contain" />
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase block">Integration</span>
              <span className="text-sm font-extrabold text-white tracking-tight leading-none">WhatsApp Web Gateway</span>
            </div>
          </div>
        </div>

        {/* Right: Shoot Category Selector + Status */}
        <div className="flex items-center gap-3">

          {/* Shoot Category Filter */}
          {(activeTab === 'templates' || activeTab === 'workflows') && (
            <div className="relative">
              <button
                onClick={() => setCategoryOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                <span className={activeCategory.color}>{activeCategory.icon}</span>
                <span>{activeCategory.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {categoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {SHOOT_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => handleCategoryChange(cat.value)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span className={cat.color}>{cat.icon}</span>
                        <span className="text-zinc-300">{cat.label}</span>
                        {shootCategory === cat.value && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Connection Status Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
            wsStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : wsStatus === 'checking'
              ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {wsStatus === 'connected' ? (
              <><Wifi className="w-3 h-3" /> Socket Live</>
            ) : wsStatus === 'checking' ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Checking...</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Disconnected</>
            )}
          </div>

          {/* RLS Badge */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-500 font-mono">
            <Lock className="w-3 h-3 text-emerald-500" />
            RLS Bound
          </div>
        </div>
      </div>

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex-shrink-0 flex items-end gap-0 border-b border-zinc-800/60 bg-zinc-950/40 bg-[#070708] px-5 z-20">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path + (searchParams.toString() ? `?${searchParams.toString()}` : ''))}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'text-emerald-400 border-emerald-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-zinc-600'}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-0 right-1/3 w-[600px] h-[400px] bg-emerald-500/4 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* ═══ STATUS BAR FOOTER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2 border-t border-zinc-900 bg-zinc-950/60 text-[9px] text-zinc-600 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          BRAHMASTRA LAW 1 — tenant_id RLS bound · workspace/{userId?.slice(0, 8) || '--------'}
        </span>
        <span>WhatsApp Socket Gateway · Baileys Engine v2</span>
      </div>

    </div>
  );
}

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BhamstraProvider>
      <WhatsAppLayoutCore>{children}</WhatsAppLayoutCore>
    </BhamstraProvider>
  );
}
