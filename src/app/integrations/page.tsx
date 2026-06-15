'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, LayoutDashboard, Database, RefreshCw, Layers, 
  MessageSquare, BarChart3, Grid, ChevronRight, ScanQrCode, FileText, X, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/auth/admin-guard';
import { WhatsappGateway } from '@/components/settings/whatsapp-gateway';
import { WhatsappTemplates } from '@/components/integrations/whatsapp-templates';
import { FacebookAds } from '@/components/integrations/facebook-ads';
import { WhatsappWelcomeMsg } from '@/components/integrations/whatsapp-welcome-msg';
import { WhatsappFollowups } from '@/components/integrations/whatsapp-followups';
// ── BAILEYS ENGINE (Isolated — Zero touch to WhastBoost) ──────────────────────
import { BaileysQrConnect } from '@/components/integrations/baileys/baileys-qr-connect';
import { BaileysWhatsappWeb } from '@/components/integrations/baileys/baileys-whatsapp-web';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>(MOCK_WORKSPACE_ID);
  const [whastboostStatus, setWhastboostStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<'whatsapp' | 'facebook' | 'google' | null>(null);
  const [activeTab, setActiveTab] = useState<'device' | 'templates' | 'welcome' | 'followups' | 'baileys-connect' | 'baileys-chat'>('device');

  // Admin and Release Control States
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBaileysReleased, setIsBaileysReleased] = useState<boolean>(false);
  const [togglingBaileys, setTogglingBaileys] = useState(false);

  const isUserAdmin = isSuperAdmin(userEmail);
  const showBaileysFeature = isUserAdmin || isBaileysReleased;

  // Sync tab param from URL query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('integration');
    if (tabParam === 'whatsapp') {
      setSelectedIntegration('whatsapp');
      setShowModal(false);
    } else if (tabParam === 'facebook') {
      setSelectedIntegration('facebook');
      setShowModal(false);
    } else if (tabParam === 'google') {
      setSelectedIntegration('google');
      setShowModal(false);
    } else if (!tabParam) {
      setSelectedIntegration(null);
      setShowModal(true);
    }
  }, [searchParams]);

  // Authenticate user & sync database profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const uId = session.user.id;
      setUserId(uId);
      setUserEmail(session.user.email || null);

      // Fetch Profile status
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('whastboost_status')
        .eq('id', uId)
        .maybeSingle();

      if (dbProfile) {
        setWhastboostStatus(dbProfile.whastboost_status || 'disconnected');
      }

      // Fetch Baileys release flag from app_features table
      try {
        const { data: featureData } = await supabase
          .from('app_features')
          .select('value_boolean')
          .eq('key', 'is_baileys_feature_released')
          .maybeSingle();

        if (featureData) {
          setIsBaileysReleased(featureData.value_boolean);
        }
      } catch (err) {
        console.error('Failed to load release flags:', err);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Redirect active tab if baileys is hidden for the current user
  useEffect(() => {
    if (!loading && !showBaileysFeature && (activeTab === 'baileys-connect' || activeTab === 'baileys-chat')) {
      setActiveTab('device');
    }
  }, [loading, showBaileysFeature, activeTab]);

  const handleToggleBaileysRelease = async () => {
    if (!isSuperAdmin(userEmail)) return;
    setTogglingBaileys(true);
    const newValue = !isBaileysReleased;
    try {
      const { error } = await supabase
        .from('app_features')
        .upsert({
          key: 'is_baileys_feature_released',
          value_boolean: newValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        alert(`Failed to update feature: ${error.message}`);
      } else {
        setIsBaileysReleased(newValue);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating feature release state.');
    } finally {
      setTogglingBaileys(false);
    }
  };

  const handleSelectIntegration = (type: 'whatsapp' | 'facebook' | 'google') => {
    setSelectedIntegration(type);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-200">
      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Integrations Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Cloud Integrations Center</h1>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">Connect third-party marketing tools, WhatsApp templates, and automated workflows</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all"
          >
            Show Integrations
          </button>
        </div>

        {/* Admin Release Control Banner */}
        {isUserAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-orange-500/5"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase tracking-wider">Admin Control Panel</span>
                <span className="text-xs text-zinc-400">• Logged in as: {userEmail}</span>
              </div>
              <h4 className="text-sm font-bold text-white">WhatsApp Web (Baileys) Release Management</h4>
              <p className="text-xs text-zinc-400 leading-normal">
                Determine when your live users see the WhatsApp direct connection update. Current status: 
                <span className={`font-bold ml-1 ${isBaileysReleased ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isBaileysReleased ? 'Live (Released to All Users)' : 'Staged (Hidden from Normal Users)'}
                </span>
              </p>
            </div>
            <button
              onClick={handleToggleBaileysRelease}
              disabled={togglingBaileys}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 shadow-lg ${
                isBaileysReleased 
                  ? 'bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-400 shadow-red-500/5' 
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black shadow-emerald-500/10'
              }`}
            >
              {togglingBaileys ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </span>
              ) : isBaileysReleased ? (
                'Hide Update From All Users'
              ) : (
                'Release WhatsApp Web Update to All Users'
              )}
            </button>
          </motion.div>
        )}

        {/* Selected View Space */}
        {selectedIntegration === 'whatsapp' ? (
          <div className="space-y-6">
            {/* WhatsApp sub-menu tabs */}
            <div className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800 gap-6 mb-6">
              <button
                onClick={() => setActiveTab('device')}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  activeTab === 'device' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ScanQrCode className="w-4 h-4" />
                  Add Device
                </span>
                {activeTab === 'device' && (
                  <motion.div 
                    layoutId="activeTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  activeTab === 'templates' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Create Template
                </span>
                {activeTab === 'templates' && (
                  <motion.div 
                    layoutId="activeTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('welcome')}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  activeTab === 'welcome' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Welcome Msg Instant
                </span>
                {activeTab === 'welcome' && (
                  <motion.div 
                    layoutId="activeTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('followups')}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  activeTab === 'followups' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Follow-ups
                </span>
                {activeTab === 'followups' && (
                  <motion.div 
                    layoutId="activeTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" 
                  />
                )}
              </button>

              {/* ── BAILEYS ENGINE TABS (Isolated) ───────────────────────── */}
              {showBaileysFeature && (
                <div className="flex items-center gap-1 ml-2 pl-4 border-l border-zinc-800">
                  <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest mr-1">Baileys</span>
                  <button
                    onClick={() => setActiveTab('baileys-connect')}
                    className={`pb-3 text-xs font-bold transition-all relative ${
                      activeTab === 'baileys-connect' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ScanQrCode className="w-4 h-4 text-emerald-500" />
                      QR Connect
                      <span className="text-[8px] font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">NEW</span>
                    </span>
                    {activeTab === 'baileys-connect' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" 
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('baileys-chat')}
                    className={`pb-3 text-xs font-bold transition-all relative ml-4 ${
                      activeTab === 'baileys-chat' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      Live Chat
                    </span>
                    {activeTab === 'baileys-chat' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" 
                      />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Sub-menu Content render */}
            <div>
              {loading ? (
                <div className="py-20 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
              ) : activeTab === 'device' ? (
                <WhatsappGateway 
                  workspaceId={userId} 
                  initialStatus={whastboostStatus} 
                />
              ) : activeTab === 'templates' ? (
                <WhatsappTemplates 
                  workspaceId={userId} 
                />
              ) : activeTab === 'welcome' ? (
                <WhatsappWelcomeMsg 
                  workspaceId={userId} 
                />
              ) : activeTab === 'baileys-connect' ? (
                /* ── BAILEYS: QR Connect (Isolated Engine) ── */
                <div className="rounded-2xl border border-emerald-500/20 bg-zinc-950/60 backdrop-blur-md overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-emerald-500/10 bg-gradient-to-r from-emerald-500/5 to-green-500/5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <ScanQrCode className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Baileys Direct Connect</h3>
                      <p className="text-[10px] text-emerald-400/70">Open-source WhatsApp engine — No API fees</p>
                    </div>
                    <span className="ml-auto text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest">ISOLATED ENGINE</span>
                  </div>
                  <BaileysQrConnect workspaceId={userId} />
                </div>
              ) : activeTab === 'baileys-chat' ? (
                /* ── BAILEYS: WhatsApp Web Clone (Isolated Engine) ── */
                <div className="rounded-2xl border border-emerald-500/20 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-emerald-500/10 bg-gradient-to-r from-emerald-500/5 to-green-500/5 bg-zinc-950/60">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Baileys Live Chat</h3>
                      <p className="text-[10px] text-emerald-400/70">Full WhatsApp Web clone powered by Baileys</p>
                    </div>
                  </div>
                  <BaileysWhatsappWeb workspaceId={userId} />
                </div>
              ) : (
                <WhatsappFollowups 
                  workspaceId={userId} 
                />
              )}
            </div>
          </div>
        ) : selectedIntegration === 'facebook' ? (
          <FacebookAds workspaceId={userId} />
        ) : selectedIntegration === 'google' ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl overflow-hidden">
            {/* Coming Soon Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/70 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-900/10 dark:to-teal-900/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Google Ads Integration</h3>
                <p className="text-[10px] text-zinc-500">Lead ingestion from Google Ads campaigns</p>
              </div>
            </div>
            {/* Coming Soon Body */}
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black animate-pulse">
                  SOON
                </span>
              </div>
              <div className="space-y-2 max-w-sm">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">Google Ads — Coming Soon</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Google Ads lead ingestion, form mapping, and real-time webhook integration is currently in development. Jald hi available hoga!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Lead Form Extensions', 'Auto Field Mapping', 'Conversion Tracking', 'GCLID Tagging'].map(f => (
                  <span key={f} className="text-[10px] px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium">{f}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-16 text-center bg-zinc-950/20 backdrop-blur-md space-y-4">
            <Layers className="w-12 h-12 text-zinc-700 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-white">No active integration workspace</h3>
              <p className="text-xs text-zinc-550 mt-1 max-w-sm mx-auto">Click "Show Integrations" to connect a third-party app and activate the marketing command space.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl"
            >
              Select Integration
            </button>
          </div>
        )}

      </main>

      {/* 3D Glassmorphic Popup Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-4xl p-8 rounded-3xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl shadow-[0_0_50px_rgba(251,146,60,0.05)] relative overflow-hidden"
            >
              {/* Abstract decorative grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0a09_1px,transparent_1px),linear-gradient(to_bottom,#0c0a09_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-zinc-900 pb-5 mb-8 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-orange-400" />
                    Activate Cloud Integrations
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Select a core service module to synchronize credentials and settings templates</p>
                </div>
                {selectedIntegration && (
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-900 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 3D card options grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 perspective-1000">
                {/* 1. WhatsApp Card */}
                <motion.div
                  onClick={() => handleSelectIntegration('whatsapp')}
                  whileHover={{ 
                    y: -10, 
                    rotateX: 6, 
                    rotateY: -6, 
                    boxShadow: "0px 25px 40px rgba(16,185,129,0.18)" 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-md cursor-pointer group flex flex-col justify-between min-h-[220px] transition-all"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/10 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <MessageSquare className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">WhatsApp Gateway</h4>
                      <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                        WhatsBoost API setup scanner, device link management, and custom drip message builders.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 mt-4">
                    Connect Now
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>

                {/* 2. Facebook Ads Card */}
                <motion.div
                  onClick={() => handleSelectIntegration('facebook')}
                  whileHover={{ 
                    y: -10, 
                    rotateX: 6, 
                    rotateY: -6, 
                    boxShadow: "0px 25px 40px rgba(59,130,246,0.18)" 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md cursor-pointer group flex flex-col justify-between min-h-[220px] transition-all opacity-80"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <BarChart3 className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Facebook Ads</h4>
                        <span className="text-[8px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Soon</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                        Ingest leads in real-time from Instant Forms, map custom fields, and classify budget values.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mt-4">
                    Coming Soon
                  </div>
                </motion.div>

                {/* 3. Google Sheets Card */}
                <motion.div
                  onClick={() => handleSelectIntegration('google')}
                  whileHover={{ 
                    y: -10, 
                    rotateX: 6, 
                    rotateY: -6, 
                    boxShadow: "0px 25px 40px rgba(34,197,94,0.18)" 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md cursor-pointer group flex flex-col justify-between min-h-[220px] transition-all opacity-80"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/10 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <Grid className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Google Sheets</h4>
                        <span className="text-[8px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Soon</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                        Export scored leads automatically to custom spreadsheet rows for team coordination.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mt-4">
                    Coming Soon
                  </div>
                </motion.div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#070708]">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    }>
      <IntegrationsContent />
    </React.Suspense>
  );
}
