'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, RefreshCw, Database, Copy, Check, ShieldCheck, 
  Clock, Sliders, User, Info, Save, HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [workspaceId, setWorkspaceId] = useState('00000000-0000-0000-0000-000000000000');

  // Advanced Settings State
  const [studioName, setStudioName] = useState('Sahil Dhonde Studio');
  const [studioEmail, setStudioEmail] = useState('contact@sahildhonde.com');
  const [studioPhone, setStudioPhone] = useState('+91 98169 15978');
  const [currency, setCurrency] = useState('INR');
  const [minBudget, setMinBudget] = useState(150000);
  const [highKeywords, setHighKeywords] = useState('destination, Udaipur, Leela, Palace, Goa, beach, Taj, Marriott');
  const [lowKeywords, setLowKeywords] = useState('passport size, standard, basic portrait, corporate headshot');
  const [silentHoursEnabled, setSilentHoursEnabled] = useState(true);
  const [silentStart, setSilentStart] = useState('22:00');
  const [silentEnd, setSilentEnd] = useState('08:00');
  const [studioSignature, setStudioSignature] = useState('Warmly,\nSahil Dhonde Photography\nsahildhonde.com');
  const [apiKey, setApiKey] = useState('fw_studio_sec_7812903841bc90ff2e3b');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Authenticate user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const uId = session.user.id;
      setWorkspaceId(uId);
      setIsDemoMode(false);

      // Load profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_name')
        .eq('id', uId)
        .maybeSingle();

      if (profile?.workspace_name) {
        setStudioName(profile.workspace_name);
      }

      loadSavedSettings(uId);
    };

    checkAuth();
  }, [router]);

  const loadSavedSettings = (uId: string) => {
    setLoading(true);
    // Load from localStorage or default
    const savedStudioName = localStorage.getItem(`settings_studio_${uId}`);
    if (savedStudioName) setStudioName(savedStudioName);

    const savedEmail = localStorage.getItem(`settings_email_${uId}`);
    if (savedEmail) setStudioEmail(savedEmail);

    const savedPhone = localStorage.getItem(`settings_phone_${uId}`);
    if (savedPhone) setStudioPhone(savedPhone);

    const savedCurrency = localStorage.getItem(`settings_currency_${uId}`);
    if (savedCurrency) setCurrency(savedCurrency);

    const savedMinBudget = localStorage.getItem(`settings_budget_${uId}`);
    if (savedMinBudget) setMinBudget(Number(savedMinBudget));

    const savedHighKeys = localStorage.getItem(`settings_high_keys_${uId}`);
    if (savedHighKeys) setHighKeywords(savedHighKeys);

    const savedLowKeys = localStorage.getItem(`settings_low_keys_${uId}`);
    if (savedLowKeys) setLowKeywords(savedLowKeys);

    const savedSilent = localStorage.getItem(`settings_silent_enabled_${uId}`);
    if (savedSilent) setSilentHoursEnabled(savedSilent === 'true');

    const savedSilentStart = localStorage.getItem(`settings_silent_start_${uId}`);
    if (savedSilentStart) setSilentStart(savedSilentStart);

    const savedSilentEnd = localStorage.getItem(`settings_silent_end_${uId}`);
    if (savedSilentEnd) setSilentEnd(savedSilentEnd);

    const savedSignature = localStorage.getItem(`settings_signature_${uId}`);
    if (savedSignature) setStudioSignature(savedSignature);

    const savedKey = localStorage.getItem(`settings_api_key_${uId}`);
    if (savedKey) setApiKey(savedKey);

    setLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    // Persist settings
    localStorage.setItem(`settings_studio_${workspaceId}`, studioName);
    localStorage.setItem(`settings_email_${workspaceId}`, studioEmail);
    localStorage.setItem(`settings_phone_${workspaceId}`, studioPhone);
    localStorage.setItem(`settings_currency_${workspaceId}`, currency);
    localStorage.setItem(`settings_budget_${workspaceId}`, String(minBudget));
    localStorage.setItem(`settings_high_keys_${workspaceId}`, highKeywords);
    localStorage.setItem(`settings_low_keys_${workspaceId}`, lowKeywords);
    localStorage.setItem(`settings_silent_enabled_${workspaceId}`, String(silentHoursEnabled));
    localStorage.setItem(`settings_silent_start_${workspaceId}`, silentStart);
    localStorage.setItem(`settings_silent_end_${workspaceId}`, silentEnd);
    localStorage.setItem(`settings_signature_${workspaceId}`, studioSignature);
    localStorage.setItem(`settings_api_key_${workspaceId}`, apiKey);

    // Sync studio workspace name with Supabase Profiles table
    if (!isDemoMode) {
      try {
        await supabase
          .from('profiles')
          .update({ workspace_name: studioName, updated_at: new Date().toISOString() })
          .eq('id', workspaceId);
      } catch (err) {
        console.warn('Profile sync warning:', err);
      }
    }

    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 1000);
  };

  const regenerateApiKey = () => {
    if (confirm('Regenerate API key? Existing webhooks using the old key will stop working immediately.')) {
      const chars = 'abcdef0123456789';
      let randomHex = '';
      for (let i = 0; i < 20; i++) randomHex += chars[Math.floor(Math.random() * chars.length)];
      const newKey = `fw_studio_sec_${randomHex}`;
      setApiKey(newKey);
      localStorage.setItem(`settings_api_key_${workspaceId}`, newKey);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const copyWebhook = () => {
    const url = `https://api.whastboost.com/webhooks/ingest?token=${apiKey}&workspace_id=${workspaceId}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white transition-colors duration-200">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Settings Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Studio Settings</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure your photography studio branding and contact preferences</p>
          </div>

          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1.5">
                <Database className="w-3 h-3" />
                SIMULATION MODE
              </span>
            )}
            <button
              onClick={() => loadSavedSettings(workspaceId)}
              className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-150 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle Column - Settings Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Studio Profile settings */}
              <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-900 pb-3">
                  <User className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wider">Studio Branding</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Photography Studio Name</label>
                    <input 
                      type="text"
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Contact Email</label>
                    <input 
                      type="email"
                      value={studioEmail}
                      onChange={(e) => setStudioEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Contact Phone Number</label>
                    <input 
                      type="text"
                      value={studioPhone}
                      onChange={(e) => setStudioPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Currency Preference</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Save Controls */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving changes...' : 'Save Settings'}
                </button>

                {saveSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Settings saved successfully!</span>
                  </div>
                )}
              </div>
            </div>

          </form>
        )}
      </main>
    </div>
  );
}







