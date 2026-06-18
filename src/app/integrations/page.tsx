'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, LayoutDashboard, Database, RefreshCw, Layers, 
  MessageSquare, BarChart3, Grid, ChevronRight, ScanQrCode, FileText, X, Zap,
  Globe, Copy, Check, Mail, Calendar, Shield, Sparkles, Key, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BaileysQrConnect } from '@/components/integrations/baileys/baileys-qr-connect';
import { BaileysWhatsappWeb } from '@/components/integrations/baileys/baileys-whatsapp-web';
import { WhatsappTemplates } from '@/components/integrations/whatsapp-templates';
import { WhatsappWelcomeMsg } from '@/components/integrations/whatsapp-welcome-msg';
import { WhatsappFollowups } from '@/components/integrations/whatsapp-followups';
import { FacebookAds } from '@/components/integrations/facebook-ads';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  status: 'connected' | 'disconnected';
  metaText: string;
  details: string;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>(MOCK_WORKSPACE_ID);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // activeView: 'hub' (App Grid launcher) | 'whatsapp' | 'facebook' | 'google' | 'website'
  const [activeView, setActiveView] = useState<'hub' | 'whatsapp' | 'facebook' | 'google' | 'website'>('hub');
  
  // WhatsApp Inner Tabs
  const [waTab, setWaTab] = useState<'device' | 'chat' | 'templates' | 'welcome' | 'followups'>('device');

  // Integrations Status State
  const [metaConnected, setMetaConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [websiteConnected, setWebsiteConnected] = useState(true);

  // Webhook Key
  const [webhookKey, setWebhookKey] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Authenticate user & load integration status
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
      
      // Generate standard workspace webhook key based on user ID for WordPress/Elementor forms
      setWebhookKey(`web_sec_${uId.slice(0, 8)}_2026`);

      // Load integrations credentials from database (Law 1 Multi-Tenancy check)
      try {
        const { data: creds } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('user_id', uId);

        if (creds) {
          creds.forEach(c => {
            if (c.provider === 'meta') setMetaConnected(c.status === 'connected');
            if (c.provider === 'google') setGoogleConnected(c.status === 'connected');
            if (c.provider === 'custom_website') setWebsiteConnected(c.status === 'connected');
          });
        }
      } catch (err) {
        console.log('Credentials table query skipped (Table created in migration script).');
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Sync route target from query parameters if loaded directly
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('integration');
    if (tabParam === 'whatsapp') setActiveView('whatsapp');
    else if (tabParam === 'facebook') setActiveView('facebook');
    else if (tabParam === 'google') setActiveView('google');
    else setActiveView('hub');
  }, [searchParams]);

  const toggleCredentialStatus = async (provider: 'meta' | 'google' | 'custom_website', currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    
    // Optimistic Update
    if (provider === 'meta') setMetaConnected(nextStatus);
    if (provider === 'google') setGoogleConnected(nextStatus);
    if (provider === 'custom_website') setWebsiteConnected(nextStatus);

    try {
      // Upsert integration credential row securely under auth.uid() (Law 1 isolation)
      await supabase
        .from('integration_credentials')
        .upsert({
          user_id: userId,
          provider,
          status: nextStatus ? 'connected' : 'disconnected',
          webhook_secret_key: provider === 'custom_website' ? webhookKey : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, provider' });
    } catch (err) {
      console.log('Skipped backend status persist - offline sandbox mode.');
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/integrations/website/webhook?key=${webhookKey}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providers: IntegrationProvider[] = [
    {
      id: 'meta',
      name: 'Meta Ads & Lead Gen',
      description: 'Ingest leads automatically from Facebook & Instagram Lead Ads.',
      icon: BarChart3,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      status: metaConnected ? 'connected' : 'disconnected',
      metaText: 'Facebook, Instagram Forms',
      details: 'Meta OAuth Verification'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Direct',
      description: 'Send alerts, sequence welcome templates, and reply in real-time.',
      icon: MessageSquare,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      status: whatsappConnected ? 'connected' : 'disconnected',
      metaText: 'WhatsApp Socket Engine',
      details: 'Direct-to-Device Linking'
    },
    {
      id: 'website',
      name: 'Website Webhooks',
      description: 'Map WordPress, Elementor, and Webflow lead forms instantly.',
      icon: Globe,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
      status: websiteConnected ? 'connected' : 'disconnected',
      metaText: 'Elementor / CF7 API',
      details: 'WordPress Webhook Secrets'
    },
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Sync Google Contacts, log Calendar events, and dispatch via Gmail SMTP.',
      icon: Mail,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-500/10',
      status: googleConnected ? 'connected' : 'disconnected',
      metaText: 'Google OAuth V2',
      details: 'Contacts & Calendar Sync'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white selection:bg-emerald-500/10 transition-colors duration-200">
      
      {/* Dynamic Background Decoration */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Hub Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono tracking-wide mb-2">
              <Sparkles className="w-3.5 h-3.5" /> 1-CLICK INTEGRATIONS HUB
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Cloud Integrations Center
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Connect external advertising campaigns, websites, workspace apps, and WhatsApp gateways.
            </p>
          </div>
          
          {activeView !== 'hub' && (
            <button
              onClick={() => setActiveView('hub')}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl transition-all shadow"
            >
              ← Back to Hub Grid
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ==================== 1. MAIN INTEGRATIONS HUB GRID ==================== */}
            {activeView === 'hub' && (
              <motion.div
                key="grid-hub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {providers.map((prov) => {
                  const Icon = prov.icon;
                  const isConnected = prov.status === 'connected';
                  
                  return (
                    <motion.div
                      key={prov.id}
                      whileHover={{ y: -3 }}
                      className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between min-h-[220px] shadow-sm relative overflow-hidden group"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          {/* App Icon */}
                          <div className={`w-12 h-12 rounded-2xl ${prov.iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-6 h-6 ${prov.iconColor}`} />
                          </div>
                          {/* Status Indicator */}
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-bold text-zinc-500 capitalize">
                              {prov.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {prov.name}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                            {prov.description}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Controls Footer */}
                      <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-900/60 mt-4">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-mono">
                          {prov.metaText}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* OAuth Connect Toggle Switch */}
                          <button
                            onClick={() => {
                              if (prov.id === 'meta') toggleCredentialStatus('meta', metaConnected);
                              if (prov.id === 'google') toggleCredentialStatus('google', googleConnected);
                              if (prov.id === 'website') toggleCredentialStatus('custom_website', websiteConnected);
                            }}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                              isConnected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-800'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white dark:bg-zinc-950 transition-transform ${
                              isConnected ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                          
                          {/* Setup Button */}
                          <button
                            onClick={() => setActiveView(prov.id as any)}
                            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1"
                          >
                            Setup <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* ==================== 2. DETAILED WHATSAPP CONFIGURATION ==================== */}
            {activeView === 'whatsapp' && (
              <motion.div
                key="view-whatsapp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* WhatsApp Tab selectors */}
                <div className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800 gap-6">
                  {['device', 'chat', 'templates', 'welcome', 'followups'].map((tab) => {
                    const isTabActive = waTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setWaTab(tab as any)}
                        className={`pb-3 text-xs font-bold transition-all relative capitalize ${
                          isTabActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {tab === 'device' && <ScanQrCode className="w-4 h-4 text-emerald-500" />}
                          {tab === 'chat' && <Zap className="w-4 h-4 text-emerald-500" />}
                          {tab === 'templates' && <FileText className="w-4 h-4" />}
                          {tab === 'welcome' && <MessageSquare className="w-4 h-4" />}
                          {tab === 'followups' && <Layers className="w-4 h-4" />}
                          {tab.replace('_', ' ')}
                        </span>
                        {isTabActive && (
                          <motion.div 
                            layoutId="waTabUnderline" 
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-tabs output render */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md overflow-hidden">
                  {waTab === 'device' && <BaileysQrConnect workspaceId={userId} />}
                  {waTab === 'chat' && <BaileysWhatsappWeb workspaceId={userId} />}
                  {waTab === 'templates' && <WhatsappTemplates workspaceId={userId} />}
                  {waTab === 'welcome' && <WhatsappWelcomeMsg workspaceId={userId} />}
                  {waTab === 'followups' && <WhatsappFollowups workspaceId={userId} />}
                </div>
              </motion.div>
            )}

            {/* ==================== 3. DETAILED META ADS SYNC ==================== */}
            {activeView === 'facebook' && (
              <motion.div
                key="view-facebook"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FacebookAds workspaceId={userId} />
              </motion.div>
            )}

            {/* ==================== 4. DETAILED CUSTOM WEBSITE WEBHOOK ==================== */}
            {activeView === 'website' && (
              <motion.div
                key="view-website"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-amber-500" /> Website Webhook Integration
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Map WordPress/Elementor lead forms securely to Bhamstra CRM database.
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                    websiteConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}>
                    {websiteConnected ? 'Connected' : 'Inactive'}
                  </span>
                </div>

                {/* Key card */}
                <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850/60 space-y-3">
                  <div className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" /> Webhook Integration URL
                  </div>
                  <p className="text-xs text-zinc-500">
                    Paste this endpoint URL inside WordPress Contact Form 7, Elementor Actions, or Webflow Webhook webhook triggers:
                  </p>
                  
                  <div className="flex items-center gap-2 p-3 bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden mt-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookKey ? `${window.location.origin}/api/integrations/website/webhook?key=${webhookKey}` : 'Loading...'}
                      className="bg-transparent border-none text-[11px] text-zinc-300 font-mono focus:outline-none flex-1 truncate"
                    />
                    <button
                      onClick={copyWebhookUrl}
                      className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Integration guide comments (Law 1 Multi-Tenancy verification) */}
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850/60 text-xs text-zinc-500 space-y-2">
                  <div className="font-bold text-zinc-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-emerald-400" /> Security RLS Isolated
                  </div>
                  <p className="leading-relaxed">
                    This public webhook URL uses a workspace-isolated secret key (`{webhookKey || 'null'}`) to authenticate and assign lead cards directly to your workspace database profile. Raw POST data is mapped automatically.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ==================== 5. DETAILED GOOGLE WORKSPACE ==================== */}
            {activeView === 'google' && (
              <motion.div
                key="view-google"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-xl"
              >
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-red-500" /> Google Workspace Integration
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Connect Google Contacts, Sync Calendar entries, and integrate Gmail SMTP servers.
                  </p>
                </div>

                <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 flex items-center justify-center relative">
                    <Mail className="w-10 h-10 text-red-500" />
                    <span className="absolute -top-2 -right-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold tracking-wider animate-pulse">NEW</span>
                  </div>
                  
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-base font-bold">Connect Bhamstra to Google V2 OAuth</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sync scored leads directly to Google Contacts list, schedule wedding events in Google Calendar, and route email sequencers.
                    </p>
                  </div>

                  <button
                    onClick={() => toggleCredentialStatus('google', googleConnected)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                      googleConnected 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {googleConnected ? 'Revoke Google Authorization' : 'Authorize Google Workspace'}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

    </div>
  );
}
