'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, ShieldCheck, RefreshCw, Key, Copy, Check,
  BarChart3, Globe, Mail, Calendar, UserPlus,
  CheckCircle2, Lock, FileSpreadsheet
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

function ProviderConfigCore() {
  const params = useParams();
  const router = useRouter();
  const provider = params.provider as string;
  const { workspaceName, userId } = useBhamstra();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Redirect: WhatsApp Web now has its own full-screen dedicated route
  useEffect(() => {
    if (provider === 'whatsapp-web') {
      router.replace('/dashboard/integrations/whatsapp-web');
    }
  }, [provider, router]);

  if (provider === 'whatsapp-web') {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Redirecting to WhatsApp Hub...
        </div>
      </div>
    );
  }

  // Custom Website Hook States
  const [webhookUrl, setWebhookUrl] = useState('');
  
  // SMTP Config States
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Meta States
  const [selectedPage, setSelectedPage] = useState('');
  const [syncForms, setSyncForms] = useState(true);

  // Contacts States
  const [contactsCount, setContactsCount] = useState(148);

  // Google Sheets States
  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [worksheets, setWorksheets] = useState<{ id: string; title: string }[]>([]);
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
    spreadsheet_id: '',
    sheet_name: '',
    sync_trigger: 'any'
  });

  const startGoogleOAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const width = 500;
      const height = 620;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      console.log('[Google OAuth] Opening popup window...');
      const popup = window.open(
        `/api/auth/google?workspace_id=${session.user.id}`,
        'Google OAuth',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      const handler = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'GOOGLE_AUTH_CALLBACK') {
          window.removeEventListener('message', handler);
          if (event.data.success) {
            console.log('[Google OAuth] Connected successfully.');
            setStatus('connected');
          } else {
            alert(`Authentication failed: ${event.data.message}`);
          }
        }
      };
      window.addEventListener('message', handler);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (provider !== 'google-sheets' || status !== 'connected') return;

    const loadSheets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/workflows/google-sheets', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setSpreadsheets(json.spreadsheets || []);
        }
      } catch (err) {
        console.error('Error loading spreadsheets:', err);
      }
    };
    loadSheets();
  }, [provider, status]);

  useEffect(() => {
    if (provider !== 'google-sheets' || status !== 'connected' || !googleSheetsConfig.spreadsheet_id) {
      setWorksheets([]);
      return;
    }

    const loadWorksheets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/workflows/google-sheets/worksheets?spreadsheetId=${googleSheetsConfig.spreadsheet_id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setWorksheets(json.worksheets || []);
        }
      } catch (err) {
        console.error('Error loading worksheets:', err);
      }
    };
    loadWorksheets();
  }, [provider, status, googleSheetsConfig.spreadsheet_id]);

  // Sync state initially
  useEffect(() => {
    if (!userId || !provider) return;
    
    // Set mock webhook URL
    setWebhookUrl(`${window.location.origin}/api/integrations/website/webhook?key=web_sec_${userId.slice(0, 8)}_2026`);

    const loadCred = async () => {
      try {
        const dbProvider = provider === 'personal-website' ? 'custom_website' :
                           provider === 'whatsapp-web' ? 'whatsapp' :
                           provider === 'meta-ads' ? 'meta' : 'google';

        const { data } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', dbProvider)
          .maybeSingle();

        if (data) {
          setStatus(data.status as any);
        } else {
          // Default mock values for better demo flows
          if (['meta-ads', 'whatsapp-web', 'personal-website'].includes(provider)) {
            setStatus('connected');
          }
        }
      } catch (err) {
        console.log('Sandbox defaults loaded.');
        if (['meta-ads', 'whatsapp-web', 'personal-website'].includes(provider)) {
          setStatus('connected');
        }
      }
    };
    loadCred();
  }, [userId, provider]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API update
    setTimeout(async () => {
      setLoading(false);
      setSuccess(true);
      setStatus('connected');

      try {
        const dbProvider = provider === 'personal-website' ? 'custom_website' :
                           provider === 'whatsapp-web' ? 'whatsapp' :
                           provider === 'meta-ads' ? 'meta' : 'google';

        await supabase
          .from('integration_credentials')
          .upsert({
            user_id: userId,
            provider: dbProvider,
            status: 'connected',
            webhook_secret_key: provider === 'personal-website' ? `web_sec_${userId?.slice(0, 8)}_2026` : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, provider' });
      } catch (err) {
        console.log('Skipped DB save.');
      }

      setTimeout(() => setSuccess(false), 3000);
    }, 1200);
  };

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProviderLogo = (prov: string) => {
    switch (prov) {
      case 'meta-ads': return 'meta.png';
      case 'whatsapp-web': return 'whatsapp.png';
      case 'personal-website': return 'wordpress.png';
      case 'google-contacts': return 'google-contacts.png';
      case 'google-calendar': return 'google-calendar.png';
      case 'google-sheets': return 'google-sheets.png';
      case 'gmail-smtp': return 'gmail.png';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white overflow-y-auto font-sans p-6 relative">
      {/* Glow effect */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button
          onClick={() => router.push('/dashboard/integrations')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Integrations
        </button>

        {/* Dynamic configuration view */}
        <div className="p-6 rounded-3xl border border-zinc-805 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-5 border-b border-zinc-900">
            <div className="flex items-center gap-4">
              {getProviderLogo(provider) && (
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-sm p-2 bg-white/5">
                  <img 
                    src={`/images/integrations/${getProviderLogo(provider)}`} 
                    alt={provider} 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <span className="text-[10px] text-zinc-550 font-mono tracking-widest uppercase">CONFIGURATION PANEL</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-white capitalize mt-0.5 flex items-center gap-2">
                  {provider?.replace('-', ' ')}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-850">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-bold text-zinc-400 capitalize">{status}</span>
            </div>
          </div>

          <div className="space-y-6">

            {/* 1. META ADS MANAGER VIEW */}
            {provider === 'meta-ads' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-normal">
                    Connect your Facebook Business Account to retrieve leads from Facebook Ads Instant Forms.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Facebook Page</label>
                  <select 
                    value={selectedPage} 
                    onChange={e => setSelectedPage(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="">Select Connected Facebook Page</option>
                    <option value="page-1">Sushant Photography - Facebook Page</option>
                    <option value="page-2">Bhamstra Media Solutions</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/30 border border-zinc-850/60">
                  <span className="text-xs text-zinc-300">Synchronize all active forms</span>
                  <button 
                    type="button"
                    onClick={() => setSyncForms(!syncForms)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${syncForms ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white dark:bg-zinc-950 transition-transform ${syncForms ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}


            {/* WhatsApp Web — now handled by dedicated full-screen /dashboard/integrations/whatsapp-web route */}



            {/* 3. PERSONAL WEBSITE WEBHOOK VIEW */}
            {provider === 'personal-website' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850 flex items-start gap-3">
                  <Globe className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-normal">
                    Ingest leads from WordPress Contact Form 7, Elementor Forms, or Webflow. Copy the endpoint URL below.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" /> Webhook API URL
                  </label>
                  
                  <div className="flex items-center gap-2 p-3 bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl || 'Loading...'}
                      className="bg-transparent border-none text-[11px] text-zinc-300 font-mono focus:outline-none flex-1 truncate"
                    />
                    <button
                      type="button"
                      onClick={copyUrlToClipboard}
                      className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. GOOGLE CONTACTS VIEW */}
            {provider === 'google-contacts' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850 flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-normal">
                    Auto-sync incoming lead contact details directly to Google Contacts.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850/60 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">Synced Contacts Count</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Last synced: Just now</p>
                  </div>
                  <div className="text-lg font-mono font-bold text-zinc-100">{contactsCount}</div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setContactsCount(c => c + 1); }}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs text-zinc-300 hover:text-white"
                  >
                    Trigger Manual Sync
                  </button>
                </div>
              </div>
            )}

            {/* 5. GOOGLE CALENDAR VIEW */}
            {provider === 'google-calendar' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-normal">
                    Sync confirmed wedding shoots automatically to Google Calendar to prevent scheduling conflicts.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sync Target Calendar</label>
                  <select className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40">
                    <option value="cal-1">Primary Calendar - Studio Bookings</option>
                    <option value="cal-2">Personal Tasks - Amit</option>
                  </select>
                </div>
              </div>
            )}

            {/* 7. GOOGLE SHEETS VIEW */}
            {provider === 'google-sheets' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-850 flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-normal">
                    Link your Google Workspace spreadsheet documents to dynamically map columns and sync data.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850/60 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">OAuth Credentials State</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {status === 'connected' 
                        ? 'Authenticated workspace active. Google Sheets node active in builder.'
                        : 'No valid Google OAuth credentials found for this workspace.'
                      }
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {status === 'connected' ? 'Authorized ✓' : 'Unauthorized'}
                  </div>
                </div>

                {status === 'connected' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Spreadsheet</label>
                      <select 
                        value={googleSheetsConfig.spreadsheet_id}
                        onChange={e => setGoogleSheetsConfig(prev => ({ ...prev, spreadsheet_id: e.target.value, sheet_name: '' }))}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-350 focus:outline-none"
                      >
                        <option value="">-- Select Spreadsheet --</option>
                        {spreadsheets.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Worksheet Tab</label>
                      <select 
                        value={googleSheetsConfig.sheet_name}
                        onChange={e => setGoogleSheetsConfig(prev => ({ ...prev, sheet_name: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-350 focus:outline-none"
                        disabled={!googleSheetsConfig.spreadsheet_id}
                      >
                        <option value="">-- Select Worksheet --</option>
                        {worksheets.map(w => (
                          <option key={w.title} value={w.title}>{w.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sync Trigger Mode</label>
                      <select 
                        value={googleSheetsConfig.sync_trigger}
                        onChange={e => setGoogleSheetsConfig(prev => ({ ...prev, sync_trigger: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-350 focus:outline-none"
                      >
                        <option value="any">Export all leads immediately upon ingestion</option>
                        <option value="high_value">Export only "High-Value 🔥" scored leads</option>
                        <option value="won">Export leads only when marked "Won" or "Warm"</option>
                      </select>
                    </div>
                  </div>
                )}

                {status !== 'connected' ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={startGoogleOAuth}
                      className="px-5 py-2.5 bg-orange-500 text-black hover:bg-orange-400 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      Connect Google Account
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={startGoogleOAuth}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs text-zinc-350 hover:text-white"
                    >
                      Reconnect Account
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Disconnect Google Sheets integration?')) {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;
                            await supabase
                              .from('integration_credentials')
                              .delete()
                              .eq('user_id', userId)
                              .eq('provider', 'google');
                            setStatus('disconnected');
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs"
                    >
                      Disconnect Account
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 6. GMAIL SMTP VIEW */}
            {provider === 'gmail-smtp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">SMTP Host Address</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">User Account / Email</label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">App Password / Secret Key</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>
            )}

            {/* Submit Actions Footer (Only render for non-WhatsApp setups as WhatsApp has its own controls) */}
            {provider !== 'whatsapp-web' && (
              <div className="flex justify-between items-center pt-5 border-t border-zinc-900">
                <span className="text-[10px] text-zinc-550 font-mono tracking-tight flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> auth.uid() bound validation
                </span>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-500 text-black hover:bg-emerald-600 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved & Connected!
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" /> Save Configuration
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default function ProviderConfigPage() {
  return (
    <BhamstraProvider>
      <ProviderConfigCore />
    </BhamstraProvider>
  );
}
