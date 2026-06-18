'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Users, Layers, Calendar, Wallet, Settings, LayoutGrid, ArrowLeft,
  ChevronRight, ArrowRight, Activity, ShieldCheck, Sparkles, FolderKanban,
  Image as ImageIcon, Printer, Landmark, Globe, RefreshCw, Plus, CheckCircle2,
  DollarSign, Clock, Check
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';

// Define the App items based on Sushant's uploaded image
interface AppItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  iconBg: string; // Tailored color classes
  route?: string; // If it maps to an existing Next.js page
  subAppId?: string; // If it renders an in-page sub-app viewport
}

const APPS_LIST: AppItem[] = [
  {
    id: 'studio-manager',
    title: 'Studio Manager',
    description: 'Manage clients, leads, bookings, and studio operations.',
    icon: Users,
    iconBg: 'bg-[#10b981]',
    route: '/leads'
  },
  {
    id: 'galleries',
    title: 'Galleries',
    description: 'AI photo sharing, album proofing, photo selection & storage.',
    icon: ImageIcon,
    iconBg: 'bg-[#10b981]',
    subAppId: 'galleries'
  },
  {
    id: 'workplace',
    title: 'Workplace',
    description: 'Collaborate with your team on tasks, shoots & deliverables.',
    icon: FolderKanban,
    iconBg: 'bg-[#10b981]',
    subAppId: 'workplace'
  },
  {
    id: 'finance',
    title: 'Finance & Invoices',
    description: 'Track bills, payments tracker, receipts, and financial insights.',
    icon: Wallet,
    iconBg: 'bg-[#10b981]',
    subAppId: 'finance'
  },
  {
    id: 'integrations',
    title: 'Integrations Hub',
    description: 'Connect WhatsApp Direct, Facebook Ads, Google Contacts & Sheets.',
    icon: Layers,
    iconBg: 'bg-[#10b981]',
    route: '/dashboard/integrations'
  },
  {
    id: 'website-builder',
    title: 'Website Builder',
    description: 'Create and manage your photography website portfolio.',
    icon: Globe,
    iconBg: 'bg-[#10b981]',
    subAppId: 'website-builder'
  }
];

function HomeCore() {
  const router = useRouter();
  const { workspaceName, userEmail } = useBhamstra();
  const [activeSubApp, setActiveSubApp] = useState<string | null>(null);

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

  // Trigger app open or route redirect
  const handleAppClick = (app: AppItem) => {
    if (app.route) {
      router.push(app.route);
    } else if (app.subAppId) {
      setActiveSubApp(app.subAppId);
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleToggleImage = (id: string) => {
    setProofingImages(prev => prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img));
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-emerald-500/20 flex flex-col font-sans overflow-x-hidden relative">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Hub Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center relative z-10">
        
        <AnimatePresence mode="wait">
          {!activeSubApp ? (
            <motion.div
              key="launcher"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Header Title */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" /> STUDIO WORKSPACE SYSTEM
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                  {workspaceName || 'Bhamstra OS'}
                </h1>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Select a workflow tool to manage client proofing, schedules, finances, and automations.
                </p>
              </div>

              {/* Launcher Main Frame */}
              <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-600 font-mono tracking-wider">
                  SYSTEM READY
                </div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 mb-6">
                  Available Applications
                </h3>

                {/* 3D-Animated Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {APPS_LIST.map((app) => {
                    const Icon = app.icon;
                    return (
                      <motion.div
                        key={app.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAppClick(app)}
                        className="p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
                      >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/[0.02] to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex items-center gap-4.5 min-w-0 z-10">
                          {/* App Icon matching diagram */}
                          <div className={`w-11 h-11 rounded-xl ${app.iconBg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                              {app.title}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-1 truncate max-w-[220px]">
                              {app.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 group-hover:border-emerald-500/30 text-zinc-500 group-hover:text-emerald-400 transition-all shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Panel */}
              <div className="flex justify-between items-center text-[10px] text-zinc-500 px-3 font-mono">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Multi-Tenant Architecture
                </span>
                <span>Workspace: {userEmail || 'Active'}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewport"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Back Button */}
              <button
                onClick={() => setActiveSubApp(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Application Hub
              </button>

              {/* ==================== GALLERIES SUB-APP ==================== */}
              {activeSubApp === 'galleries' && (
                <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-emerald-400" /> AI Galleries Proofing
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">
                        Client photo proofing workflow powered by Cloudflare R2 zero-egress bucket.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1 rounded-full">
                      {proofingImages.filter(i => i.selected).length} / 6 selected
                    </span>
                  </div>

                  {/* Dual-Resolution comments (Law 2: Zero-Egress Storage) */}
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-[10px] text-zinc-400 leading-normal font-mono">
                    <span className="text-emerald-400 font-bold">// Dual-Resolution CDN Egress:</span> Thumbnails serve via WebP R2 bucket, bypassing API server memory footprint to eliminate network costs.
                  </div>

                  {/* Photo selection grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {proofingImages.map(img => (
                      <div
                        key={img.id}
                        onClick={() => handleToggleImage(img.id)}
                        className={`aspect-[3/2] rounded-2xl overflow-hidden border cursor-pointer relative transition-all ${
                          img.selected ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' : 'border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/85 to-zinc-950 flex flex-col items-center justify-center p-3">
                          <ImageIcon className="w-6 h-6 text-zinc-600 mb-1" />
                          <span className="text-[10px] text-zinc-400 font-mono">Photo_{img.num}.webp</span>
                          <span className="text-[9px] text-zinc-500 font-mono mt-0.5">CF R2 Presigned</span>
                        </div>
                        {img.selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-zinc-900">
                    <button
                      onClick={() => setSelectionApproved(true)}
                      disabled={proofingImages.filter(i => i.selected).length === 0 || selectionApproved}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      {selectionApproved ? 'Proofing Selection Confirmed ✓' : 'Approve Selected Images'}
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== WORKPLACE SUB-APP ==================== */}
              {activeSubApp === 'workplace' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tasks list */}
                  <div className="md:col-span-2 p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-xl">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-emerald-400" /> Workplace Tasks
                    </h2>
                    <p className="text-xs text-zinc-500">Collaborate and manage project deliverables.</p>
                    
                    <div className="space-y-2.5">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center gap-3 cursor-pointer hover:border-zinc-700 transition-all"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            task.done ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'
                          }`}>
                            {task.done && <Check className="w-3 h-3" />}
                          </div>
                          <span className={`text-xs ${task.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crew info */}
                  <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Crew Tracker</h3>
                    <div className="space-y-3">
                      {crew.map(c => (
                        <div key={c.name} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-1">
                          <div className="text-xs font-bold text-zinc-200">{c.name}</div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500">{c.role}</span>
                            <span className={`font-mono font-bold ${c.status === 'Available' ? 'text-emerald-400' : 'text-amber-500'}`}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== FINANCE SUB-APP ==================== */}
              {activeSubApp === 'finance' && (
                <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-400" /> Finance & Invoices
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">Monitor billing revenue, installments, and receipts.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-mono">TOTAL REVENUE COLLECTED</span>
                      <div className="text-lg font-extrabold text-emerald-400 font-mono">₹{totalRevenue.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Payment history list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recent Collections</h3>
                    <div className="space-y-2.5">
                      {payments.map((pay, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">{pay.client}</div>
                            <p className="text-[10px] text-zinc-500 mt-1">{pay.type} | Date: {pay.date}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400">+₹{pay.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simulated trigger dispatch note */}
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-[10px] text-zinc-500 font-mono">
                    <span className="text-amber-500 font-bold">[DATABASE TRIGGER]</span> Invoice updates dynamically recalculate telemetry indices and dispatch receipts via WhatsApp.
                  </div>
                </div>
              )}

              {/* ==================== WEBSITE BUILDER SUB-APP ==================== */}
              {activeSubApp === 'website-builder' && (
                <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-400" /> Website Builder
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Host and maintain your photography portfolio domain.</p>
                  </div>

                  {/* Active theme card */}
                  <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                    <div className="text-xs font-mono text-zinc-500">CURRENT PORTFOLIO THEME</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-extrabold text-zinc-200">{activeTheme}</span>
                      <span className="text-[9px] bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Online
                      </span>
                    </div>
                  </div>

                  {/* Theme presets selection */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Change Portfolio Theme</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Glassmorphic Black', 'Minimalist White', 'Cyberpunk Amber'].map(theme => (
                        <button
                          key={theme}
                          onClick={() => setActiveTheme(theme)}
                          className={`p-4 rounded-xl border text-xs font-bold transition-all text-center ${
                            activeTheme === theme
                              ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400'
                              : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
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
          )}
        </AnimatePresence>

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
