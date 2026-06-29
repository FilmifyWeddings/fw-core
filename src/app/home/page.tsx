'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Users, Layers, Calendar, Wallet, Settings, LayoutGrid, ArrowLeft,
  ChevronRight, ArrowRight, Activity, ShieldCheck, Sparkles, FolderKanban,
  Image as ImageIcon, Globe, RefreshCw, Plus, Check, CreditCard, Monitor, Link2, UserPlus, Database
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';

// Tooltip Wrapper Component using Framer Motion spring transition
function PremiumTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute z-50 px-2.5 py-1.5 text-[10px] font-medium text-white dark:text-[#121110] bg-[#1C1A18] dark:bg-[#FAF8F5] border border-[#2C2926] dark:border-[#E8E5DF] rounded-lg shadow-lg whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HomeCore() {
  const router = useRouter();
  const { workspaceName, userEmail } = useBhamstra();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Sub-App Interactive State Managers
  // 1. Galleries Proofing Mock
  const [proofingImages, setProofingImages] = useState([
    { id: 'img-1', num: 1, selected: false },
    { id: 'img-2', num: 2, selected: false },
    { id: 'img-3', num: 3, selected: false },
    { id: 'img-4', num: 4, selected: false },
    { id: 'img-5', num: 5, selected: false },
    { id: 'img-6', num: 6, selected: false },
  ]);
  const [selectionApproved, setSelectionApproved] = useState(false);

  // 2. Workplace / Crew Planner Mock
  const [tasks, setTasks] = useState([
    { id: 't-1', text: 'Assign Udaipur cinema crew', done: true },
    { id: 't-2', text: 'Generate presigned R2 gallery links', done: false },
    { id: 't-3', text: 'Send WhatsApp contract trigger to Sanjay', done: false },
  ]);
  const [crew, setCrew] = useState([
    { name: 'Amit Sharma', role: 'Lead Photographer', status: 'On Shoot' },
    { name: 'Rahul Verma', role: 'Lead Cinematographer', status: 'Available' },
  ]);

  // 3. Finance & Invoices Mock
  const [payments, setPayments] = useState([
    { client: 'Sanjay & Meera', amount: 50000, date: '2026-06-12', type: 'Advance' },
    { client: 'Amit & Ritu', amount: 150000, date: '2026-06-15', type: 'Installment' },
  ]);
  const [totalRevenue, setTotalRevenue] = useState(200000);

  // 4. Website Builder Mock
  const [activeTheme, setActiveTheme] = useState('Glassmorphic Black');

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleToggleImage = (id: string) => {
    setProofingImages(prev => prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img));
  };

  const handleTriggerTestSync = () => {
    alert('Manual Sheets sync triggered successfully!');
  };

  const handleAddTestLead = () => {
    alert('Test Lead "Simran Kaur" added successfully to queue!');
  };

  // Nav Menu Config
  const sidebarNavItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutGrid, desc: 'Overview, statuses & metrics' },
    { id: 'galleries', label: 'AI Galleries', icon: ImageIcon, desc: 'Client photo proofing portal' },
    { id: 'workplace', label: 'Workplace', icon: FolderKanban, desc: 'Tasks & crew calendar planner' },
    { id: 'finance', label: 'Finance & Bills', icon: Wallet, desc: 'Payments, collections & tracking' },
    { id: 'website-builder', label: 'Website Builder', icon: Globe, desc: 'Portfolio template settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors duration-300 flex font-sans overflow-hidden">
      {/* 1. FIXED LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] flex flex-col justify-between flex-shrink-0 h-screen">
        <div>
          {/* Logo Brand Header */}
          <div className="px-6 py-5 border-b border-[#E8E5DF] dark:border-[#2C2926] flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold text-xs text-white dark:text-black shadow-sm">
              S
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-[#1A1A1A] to-[#706E6A] dark:from-[#F5F5F5] dark:to-[#A09E9A] bg-clip-text text-transparent">
                StudioFlow
              </span>
              <span className="block text-[8px] text-[var(--accent)] font-bold tracking-widest uppercase mt-0.5">PLATFORM OS</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {sidebarNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <PremiumTooltip key={item.id} content={item.desc}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-bold transition-all relative border border-transparent ${
                      isActive 
                        ? 'bg-[#FAF8F5] dark:bg-[#121110] border-[#E8E5DF] dark:border-[#2C2926] text-[var(--accent)]' 
                        : 'text-[#706E6A] dark:text-[#A09E9A] hover:bg-[#FAF8F5] dark:hover:bg-[#121110]/50 hover:text-[#1A1A1A] dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeSideBorder"
                        className="absolute right-0 top-3 bottom-3 w-1 bg-[var(--accent)] rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                </PremiumTooltip>
              );
            })}

            <div className="pt-4 border-t border-[#E8E5DF] dark:border-[#2C2926] space-y-1.5">
              <PremiumTooltip content="View, search and manage client leads">
                <button
                  onClick={() => router.push('/leads')}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-bold text-[#706E6A] dark:text-[#A09E9A] hover:bg-[#FAF8F5] dark:hover:bg-[#121110]/50 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
                >
                  <Users className="w-4 h-4" />
                  <span>Leads Database</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </PremiumTooltip>

              <PremiumTooltip content="Configure sheets, webhooks & credentials">
                <button
                  onClick={() => router.push('/dashboard/integrations')}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-bold text-[#706E6A] dark:text-[#A09E9A] hover:bg-[#FAF8F5] dark:hover:bg-[#121110]/50 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Integrations Hub</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </PremiumTooltip>
            </div>
          </nav>
        </div>

        {/* Workspace Footer details */}
        <div className="p-4 border-t border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/30 dark:bg-[#121110]/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-center font-bold text-xs text-[var(--accent)] uppercase shadow-sm">
            {workspaceName ? workspaceName.substring(0, 2) : 'WS'}
          </div>
          <div className="truncate min-w-0">
            <span className="block text-xs font-extrabold truncate text-[#1A1A1A] dark:text-white">{workspaceName || 'My Studio'}</span>
            <span className="block text-[9px] text-[#706E6A] dark:text-[#A09E9A] truncate">{userEmail || 'Active Workspace'}</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN SCROLLABLE CONTENT PANEL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#FAF8F5] dark:bg-[#121110] relative z-10">
        {/* Top Header Navbar */}
        <header className="px-8 py-5 border-b border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF]/70 dark:bg-[#1C1A18]/70 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight capitalize text-[#1A1A1A] dark:text-[#F5F5F5]">
              {sidebarNavItems.find(t => t.id === activeTab)?.label || 'Command Center'}
            </h1>
            <p className="text-xs text-[#706E6A] dark:text-[#A09E9A] mt-0.5">
              {sidebarNavItems.find(t => t.id === activeTab)?.desc || 'Overview of your workspace operations.'}
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold tracking-wider font-mono uppercase">
              <Sparkles className="w-3 h-3" /> LUXE COMMAND
            </div>
          </div>
        </header>

        {/* Tab content area with dynamic animation transition wrapper */}
        <div className="p-8 max-w-5xl w-full mx-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              {/* ==================== COMMAND CENTER DASHBOARD ==================== */}
              {activeTab === 'dashboard' && (
                <>
                  {/* Dynamic Analytics Overview Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { label: 'Leads Ingested', val: '1,248', change: '+12% this month', icon: Users },
                      { label: 'WhatsApp Sequences', val: '48 active', change: '94.2% delivery rate', icon: Activity },
                      { label: 'Client Approvals', val: '18 pending', change: 'Galleries proofing', icon: ImageIcon },
                      { label: 'Total Revenue', val: '₹2,00,000', change: 'Invoice ledger', icon: Wallet },
                    ].map((card, idx) => {
                      const Icon = card.icon;
                      return (
                        <div 
                          key={idx}
                          className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:border-[var(--accent)]/30 hover:scale-[1.01] transition-all duration-300"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">{card.label}</span>
                            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-center text-[var(--accent)]">
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-4 tracking-tight">{card.val}</div>
                          <div className="text-[10px] text-[var(--accent)] font-semibold mt-1 font-mono">{card.change}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connected Channels & Quick Actions dual columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Channel statuses column */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-xs font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-widest px-1">
                        Connected Channels & Sync Pipelines
                      </h3>
                      
                      <div className="space-y-3">
                        {[
                          { name: 'WhatsApp Node Integration', status: 'Online & Connected', desc: 'Direct message drip queue agent active', type: 'whatsapp' },
                          { name: 'Google Sheets Influx Sync', status: 'Active (6 monitored sheets)', desc: 'Realtime sheet polling active', type: 'sheets' },
                          { name: 'Google Contacts Sync API', status: 'Connected & Configured', desc: 'Lead prefix tagging active', type: 'contacts' },
                          { name: 'Facebook Leads Webhook', status: 'Active listener', desc: 'Realtime form ingestion verified', type: 'fb' },
                        ].map((ch, idx) => (
                          <div 
                            key={idx}
                            className="p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] shadow-[0_4px_30px_rgba(0,0,0,0.03)] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                                {ch.type === 'whatsapp' && <Activity className="w-4.5 h-4.5" />}
                                {ch.type === 'sheets' && <Layers className="w-4.5 h-4.5" />}
                                {ch.type === 'contacts' && <Users className="w-4.5 h-4.5" />}
                                {ch.type === 'fb' && <Link2 className="w-4.5 h-4.5" />}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{ch.name}</h4>
                                <p className="text-[10px] text-[#706E6A] dark:text-[#A09E9A] mt-0.5">{ch.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                              <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider font-mono">{ch.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick actions Column */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-widest px-1">
                        Quick Operations
                      </h3>
                      
                      <div className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-3.5">
                        <PremiumTooltip content="Run direct polling on all active spreadsheet configurations">
                          <button 
                            onClick={handleTriggerTestSync}
                            className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 dark:bg-[#121110] dark:hover:bg-[#121110]/80 border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-bold text-[#1A1A1A] dark:text-white rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Trigger Sheets Sync
                          </button>
                        </PremiumTooltip>

                        <PremiumTooltip content="Add a simulation lead row to execute whatsapp drip automation flows">
                          <button 
                            onClick={handleAddTestLead}
                            className="w-full py-2.5 px-4 bg-[var(--accent)] hover:opacity-90 text-white dark:text-black text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Inject Test Lead
                          </button>
                        </PremiumTooltip>

                        <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2C2926] text-[10px] text-[#706E6A] dark:text-[#A09E9A] leading-normal font-mono flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          <span>Telemetry active. Auto-routing pipeline secure.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ==================== GALLERIES VIEW ==================== */}
              {activeTab === 'galleries' && (
                <div className="p-6 rounded-3xl border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-extrabold flex items-center gap-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                        <ImageIcon className="w-5 h-5 text-[var(--accent)]" /> AI Galleries Proofing
                      </h2>
                      <p className="text-xs text-[#706E6A] dark:text-[#A09E9A] mt-1">
                        Client photo proofing workflow powered by Cloudflare R2 zero-egress bucket.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] px-3.5 py-1 rounded-full font-mono">
                      {proofingImages.filter(i => i.selected).length} / 6 selected
                    </span>
                  </div>

                  <div className="p-4 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-2xl text-[10px] text-[#706E6A] dark:text-[#A09E9A] leading-normal font-mono">
                    <span className="text-[var(--accent)] font-bold">// Dual-Resolution CDN Egress:</span> Thumbnails serve via WebP R2 bucket, bypassing API server memory footprint to eliminate network costs.
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {proofingImages.map(img => (
                      <div
                        key={img.id}
                        onClick={() => handleToggleImage(img.id)}
                        className={`aspect-[3/2] rounded-2xl overflow-hidden border cursor-pointer relative transition-all ${
                          img.selected ? 'border-[var(--accent)] shadow-lg ring-1 ring-[var(--accent)]/20' : 'border-[#E8E5DF] dark:border-[#2C2926] hover:border-zinc-400'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF8F5] to-[#FFFFFF] dark:from-[#1C1A18] dark:to-[#121110] flex flex-col items-center justify-center p-3">
                          <ImageIcon className="w-6 h-6 text-[#706E6A] dark:text-[#A09E9A] mb-1" />
                          <span className="text-[10px] text-[#1A1A1A] dark:text-[#F5F5F5] font-mono">Photo_{img.num}.webp</span>
                          <span className="text-[9px] text-[#706E6A] dark:text-[#A09E9A] font-mono mt-0.5">CF R2 Presigned</span>
                        </div>
                        {img.selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent)] text-white dark:text-black flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-[#E8E5DF] dark:border-[#2C2926]">
                    <button
                      onClick={() => setSelectionApproved(true)}
                      disabled={proofingImages.filter(i => i.selected).length === 0 || selectionApproved}
                      className="px-5 py-2.5 bg-[var(--accent)] hover:opacity-95 text-white dark:text-black font-extrabold text-xs rounded-xl disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      {selectionApproved ? 'Proofing Selection Confirmed ✓' : 'Approve Selected Images'}
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== WORKPLACE VIEW ==================== */}
              {activeTab === 'workplace' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tasks list */}
                  <div className="md:col-span-2 p-6 rounded-3xl border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-4">
                    <h2 className="text-lg font-extrabold flex items-center gap-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                      <FolderKanban className="w-5 h-5 text-[var(--accent)]" /> Workplace Tasks
                    </h2>
                    <p className="text-xs text-[#706E6A] dark:text-[#A09E9A]">Collaborate and manage project deliverables.</p>
                    
                    <div className="space-y-2.5">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className="p-4 rounded-xl bg-[#FAF8F5]/50 dark:bg-[#121110]/50 border border-[#E8E5DF] dark:border-[#2C2926] flex items-center gap-3 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-650 transition-all"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            task.done ? 'bg-[var(--accent)] border-[var(--accent)] text-white dark:text-black' : 'border-[#E8E5DF] dark:border-[#2C2926]'
                          }`}>
                            {task.done && <Check className="w-3 h-3" />}
                          </div>
                          <span className={`text-xs ${task.done ? 'line-through text-[#706E6A] dark:text-[#A09E9A]' : 'text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold'}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crew info */}
                  <div className="p-6 rounded-3xl border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-4">
                    <h3 className="text-xs font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Crew Tracker</h3>
                    <div className="space-y-3">
                      {crew.map(c => (
                        <div key={c.name} className="p-3 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl space-y-1">
                          <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{c.name}</div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#706E6A] dark:text-[#A09E9A] font-medium">{c.role}</span>
                            <span className={`font-mono font-bold ${c.status === 'Available' ? 'text-emerald-500' : 'text-[var(--accent)]'}`}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== FINANCE VIEW ==================== */}
              {activeTab === 'finance' && (
                <div className="p-6 rounded-3xl border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-extrabold flex items-center gap-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                        <Wallet className="w-5 h-5 text-[var(--accent)]" /> Finance & Invoices
                      </h2>
                      <p className="text-xs text-[#706E6A] dark:text-[#A09E9A] mt-1">Monitor billing revenue, installments, and receipts.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#706E6A] dark:text-[#A09E9A] font-mono font-bold">TOTAL REVENUE COLLECTED</span>
                      <div className="text-lg font-extrabold text-[var(--accent)] font-mono">₹{totalRevenue.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Payment history list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Recent Collections</h3>
                    <div className="space-y-2.5">
                      {payments.map((pay, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{pay.client}</div>
                            <p className="text-[10px] text-[#706E6A] dark:text-[#A09E9A] mt-1">{pay.type} | Date: {pay.date}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-[var(--accent)]">+₹{pay.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simulated trigger dispatch note */}
                  <div className="p-3 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-[10px] text-[#706E6A] dark:text-[#A09E9A] font-mono">
                    <span className="text-[var(--accent)] font-bold">[DATABASE TRIGGER]</span> Invoice updates dynamically recalculate telemetry indices and dispatch receipts via WhatsApp.
                  </div>
                </div>
              )}

              {/* ==================== WEBSITE BUILDER VIEW ==================== */}
              {activeTab === 'website-builder' && (
                <div className="p-6 rounded-3xl border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold flex items-center gap-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                      <Globe className="w-5 h-5 text-[var(--accent)]" /> Website Builder
                    </h2>
                    <p className="text-xs text-[#706E6A] dark:text-[#A09E9A] mt-1">Host and maintain your photography portfolio domain.</p>
                  </div>

                  {/* Active theme card */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] space-y-3">
                    <div className="text-[10px] font-bold text-[#706E6A] dark:text-[#A09E9A] font-mono tracking-wider">CURRENT PORTFOLIO THEME</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">{activeTheme}</span>
                      <span className="text-[9px] bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                        Online
                      </span>
                    </div>
                  </div>

                  {/* Theme presets selection */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Change Portfolio Theme</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Glassmorphic Black', 'Minimalist White', 'Cyberpunk Amber'].map(theme => (
                        <button
                          key={theme}
                          onClick={() => setActiveTheme(theme)}
                          className={`p-4 rounded-xl border text-xs font-bold transition-all text-center ${
                            activeTheme === theme
                              ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                              : 'bg-[#FAF8F5]/50 dark:bg-[#121110]/50 border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] hover:border-zinc-400 dark:hover:border-zinc-550'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function HomeLayout() {
  return (
    <BhamstraProvider>
      <HomeCore />
    </BhamstraProvider>
  );
}
