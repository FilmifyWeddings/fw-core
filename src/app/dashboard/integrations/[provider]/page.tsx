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

  // Google Account Profile State
  const [connectedEmail, setConnectedEmail] = useState('');
  const [connectedName, setConnectedName] = useState('');
  const [connectedPicture, setConnectedPicture] = useState('');

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
  const [contactsCount, setContactsCount] = useState(0);
  const [contactsLabelId, setContactsLabelId] = useState('');
  const [contactsLabelName, setContactsLabelName] = useState('');
  const [contactsPrefix, setContactsPrefix] = useState('');
  const [contactsSuffix, setContactsSuffix] = useState('');
  const [contactsEnabled, setContactsEnabled] = useState(true);
  const [labelsList, setLabelsList] = useState<{ id: string; name: string; memberCount: number }[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [contactsTab, setContactsTab] = useState<'configure' | 'status'>('configure');
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);

  // Google Sheets States
  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [worksheets, setWorksheets] = useState<{ id: string; title: string }[]>([]);
  const [spreadsheetSearch, setSpreadsheetSearch] = useState('');
  const [showSpreadsheetDropdown, setShowSpreadsheetDropdown] = useState(false);
  const [sheetHeaders, setSheetHeaders] = useState<Record<string, string[]>>({});
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'configure' | 'active'>('configure');
  interface CustomMappingEntry {
    id: string;
    key: string;
    value: string;
  }

  const [sheetsConfig, setSheetsConfig] = useState<{
    spreadsheet_id: string;
    sync_trigger: string;
    active_sheets: Record<string, {
      spreadsheet_id: string;
      spreadsheet_name: string;
      sheet_name: string;
      enabled: boolean;
      mappings: Record<string, string>;
      last_row_count?: number;
    }>;
  }>({
    spreadsheet_id: '',
    sync_trigger: 'any',
    active_sheets: {}
  });

  const [customMappingsState, setCustomMappingsState] = useState<Record<string, CustomMappingEntry[]>>({});

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

  const fetchHeadersForSheet = async (spreadsheetId: string, sheetName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/workflows/google-sheets/columns?spreadsheetId=${spreadsheetId}&sheetName=${encodeURIComponent(sheetName)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const headers = (json.columns || []).map((c: any) => c.name);
        setSheetHeaders(prev => ({ ...prev, [`${spreadsheetId}:${sheetName}`]: headers }));
      }
    } catch (err) {
      console.error(`Error loading columns for ${sheetName}:`, err);
    }
  };

  const triggerInitialSync = async (spreadsheetId: string, sheetName: string, mappings: Record<string, string>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await fetch('/api/workflows/google-sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ spreadsheetId, sheetName, mappings })
      });
    } catch (err) {
      console.error('[Google Sync] Exception during initial sync:', err);
    }
  };

  const registerDriveWatch = async (spreadsheetId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await fetch('/api/workflows/google-sheets/watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ spreadsheetId })
      });
    } catch (err) {
      console.error('[Google Watch] Exception during registering drive watch:', err);
    }
  };

  const updateMapping = (spreadsheetId: string, spreadsheetName: string, sheetName: string, field: string, value: string) => {
    const compositeKey = `${spreadsheetId}:${sheetName}`;
    setSheetsConfig(prev => {
      const activeSheets = { ...prev.active_sheets };
      if (!activeSheets[compositeKey]) {
        activeSheets[compositeKey] = {
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: spreadsheetName,
          sheet_name: sheetName,
          enabled: true,
          mappings: { name: '', phone: '', email: '' }
        };
      }
      activeSheets[compositeKey].mappings = {
        ...activeSheets[compositeKey].mappings,
        [field]: value
      };
      return { ...prev, active_sheets: activeSheets };
    });
  };

  const addCustomField = (spreadsheetId: string, sheetName: string) => {
    const compositeKey = `${spreadsheetId}:${sheetName}`;
    const newEntry = {
      id: `c_${Math.random().toString(36).substr(2, 9)}`,
      key: '',
      value: ''
    };
    setCustomMappingsState(prev => ({
      ...prev,
      [compositeKey]: [...(prev[compositeKey] || []), newEntry]
    }));
  };

  const handleCustomKeyChange = (compositeKey: string, id: string, newKey: string) => {
    setCustomMappingsState(prev => {
      const list = prev[compositeKey] || [];
      return {
        ...prev,
        [compositeKey]: list.map(item => item.id === id ? { ...item, key: newKey } : item)
      };
    });
  };

  const handleCustomValueChange = (compositeKey: string, id: string, newValue: string) => {
    setCustomMappingsState(prev => {
      const list = prev[compositeKey] || [];
      return {
        ...prev,
        [compositeKey]: list.map(item => item.id === id ? { ...item, value: newValue } : item)
      };
    });
  };

  const removeCustomField = (compositeKey: string, id: string) => {
    setCustomMappingsState(prev => {
      const list = prev[compositeKey] || [];
      return {
        ...prev,
        [compositeKey]: list.filter(item => item.id !== id)
      };
    });
  };

  const deactivateSheetSync = (compositeKey: string) => {
    setSheetsConfig(prev => {
      const activeSheets = { ...prev.active_sheets };
      if (activeSheets[compositeKey]) {
        activeSheets[compositeKey] = {
          ...activeSheets[compositeKey],
          enabled: false
        };
      }
      return { ...prev, active_sheets: activeSheets };
    });
  };

  const fetchContactsLabels = async () => {
    try {
      setIsLoadingLabels(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/workflows/google-contacts/labels', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setLabelsList(json.labels || []);
        setSheetsError(null);
      } else {
        const json = await res.json();
        setSheetsError(json.error || 'Failed to load labels');
      }
    } catch (err) {
      console.error('Error loading labels:', err);
      setSheetsError('Error fetching labels list');
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const createNewLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      setIsCreatingLabel(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/workflows/google-contacts/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: newLabelName })
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.label;
        setLabelsList(prev => [...prev, created]);
        setContactsLabelId(created.id);
        setContactsLabelName(created.name);
        setNewLabelName('');
        setSheetsError(null);
      } else {
        const json = await res.json();
        setSheetsError(json.error || 'Failed to create new label');
      }
    } catch (err) {
      console.error('Error creating label:', err);
      setSheetsError('Error creating new label');
    } finally {
      setIsCreatingLabel(false);
    }
  };

  useEffect(() => {
    if (provider !== 'google-contacts' || status !== 'connected') return;
    fetchContactsLabels();
  }, [provider, status]);

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
          setSheetsError(null);
        } else {
          const json = await res.json();
          setSheetsError(json.error || 'Failed to load spreadsheets');
        }
      } catch (err) {
        console.error('Error loading spreadsheets:', err);
        setSheetsError('Error fetching spreadsheets list');
      }
    };
    loadSheets();
  }, [provider, status]);

  useEffect(() => {
    if (provider !== 'google-sheets' || status !== 'connected' || !sheetsConfig.spreadsheet_id) {
      setWorksheets([]);
      return;
    }

    const loadWorksheets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/workflows/google-sheets/worksheets?spreadsheetId=${sheetsConfig.spreadsheet_id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setWorksheets(json.worksheets || []);
          setSheetsError(null);
        } else {
          const json = await res.json();
          setSheetsError(json.error || 'Failed to load worksheets');
        }
      } catch (err) {
        console.error('Error loading worksheets:', err);
        setSheetsError('Error fetching worksheets list');
      }
    };
    loadWorksheets();
  }, [provider, status, sheetsConfig.spreadsheet_id]);

  useEffect(() => {
    if (sheetsConfig.spreadsheet_id && spreadsheets.length > 0) {
      const match = spreadsheets.find(s => s.id === sheetsConfig.spreadsheet_id);
      if (match) {
        setSpreadsheetSearch(match.name);
      }
    }
  }, [sheetsConfig.spreadsheet_id, spreadsheets]);

  // Sync state initially
  useEffect(() => {
    if (!userId || !provider) return;
    
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
          const cfg = (data.config as any) || {};
          const meta = (data.metadata as any) || {};
          const email = cfg.connected_email || meta.email || data.account_id || '';
          const name = cfg.connected_name || meta.name || '';
          const pic = cfg.connected_picture || meta.picture || '';
          setConnectedEmail(email);
          setConnectedName(name);
          setConnectedPicture(pic);

          if (provider === 'google-sheets' && data.config && typeof data.config === 'object') {
            const restoredConfig = {
              spreadsheet_id: cfg.spreadsheet_id || '',
              sync_trigger: cfg.sync_trigger || 'any',
              active_sheets: cfg.active_sheets || {}
            };
            setSheetsConfig(restoredConfig);
            
            // Populate custom mappings arrays and fetch headers
            const newCustomMappings: Record<string, CustomMappingEntry[]> = {};
            Object.entries(restoredConfig.active_sheets).forEach(([compKey, sheet]: [string, any]) => {
              if (sheet.mappings) {
                const entries: CustomMappingEntry[] = [];
                Object.entries(sheet.mappings).forEach(([k, v]) => {
                  if (!['name', 'phone', 'email'].includes(k)) {
                    entries.push({
                      id: `c_${Math.random().toString(36).substr(2, 9)}`,
                      key: k,
                      value: v as string
                    });
                  }
                });
                newCustomMappings[compKey] = entries;
              }
              if (sheet.enabled) {
                fetchHeadersForSheet(sheet.spreadsheet_id, sheet.sheet_name);
              }
            });
            setCustomMappingsState(newCustomMappings);
          }

          if (provider === 'google-contacts') {
            if (data.config && typeof data.config === 'object') {
              const cfg = data.config as any;
              setContactsLabelId(cfg.contacts_label_id || '');
              setContactsLabelName(cfg.contacts_label_name || '');
              setContactsPrefix(cfg.contacts_prefix || '');
              setContactsSuffix(cfg.contacts_suffix || '');
              setContactsEnabled(cfg.contacts_enabled !== false);
            }
            
            // Load synced contacts count from live_logs
            const { count } = await supabase
              .from('live_logs')
              .select('*', { count: 'exact', head: true })
              .eq('workspace_id', userId)
              .eq('event_type', 'sync_google_contacts_success');
            setContactsCount(count || 0);
          }
        } else {
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

        // Build upsert payload
        const upsertPayload: Record<string, unknown> = {
          user_id: userId,
          provider: dbProvider,
          status: 'connected',
          webhook_secret_key: provider === 'personal-website' ? `web_sec_${userId?.slice(0, 8)}_2026` : null,
          updated_at: new Date().toISOString(),
        };

        if (provider === 'google-sheets' || provider === 'google-contacts') {
          // Load existing config to merge
          const { data: existing } = await supabase
            .from('integration_credentials')
            .select('config')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .maybeSingle();

          const existingConfig = (existing?.config as Record<string, any>) || {};

          let finalConfig = { ...existingConfig };

          if (provider === 'google-sheets') {
            // Construct mappings for each active sheet incorporating custom mappings
            const finalActiveSheets: Record<string, any> = {};
            
            Object.entries(sheetsConfig.active_sheets).forEach(([compKey, sheet]: [string, any]) => {
              const customEntries = customMappingsState[compKey] || [];
              const mappingsObj: Record<string, string> = {
                name: sheet.mappings.name || '',
                phone: sheet.mappings.phone || '',
                email: sheet.mappings.email || ''
              };
              
              customEntries.forEach(entry => {
                const cleanKey = entry.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                if (cleanKey) {
                  mappingsObj[cleanKey] = entry.value;
                }
              });

              finalActiveSheets[compKey] = {
                ...sheet,
                mappings: mappingsObj
              };
            });

            finalConfig = {
              ...finalConfig,
              spreadsheet_id: sheetsConfig.spreadsheet_id,
              sync_trigger: sheetsConfig.sync_trigger,
              active_sheets: finalActiveSheets
            };
          } else {
            // google-contacts
            finalConfig = {
              ...finalConfig,
              contacts_label_id: contactsLabelId,
              contacts_label_name: contactsLabelName,
              contacts_prefix: contactsPrefix,
              contacts_suffix: contactsSuffix,
              contacts_enabled: contactsEnabled
            };
          }

          const { error: saveErr } = await supabase
            .from('integration_credentials')
            .update({
              status: 'connected',
              config: finalConfig,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('provider', 'google');

          if (saveErr) {
            console.error('[Save Config] DB Update Error:', saveErr);
          }

          if (provider === 'google-sheets') {
            // Trigger sync for enabled sheets immediately (Initial Data Pull)
            const finalActiveSheets = finalConfig.active_sheets || {};
            Object.entries(finalActiveSheets).forEach(([_, sheet]: [string, any]) => {
              if (sheet.enabled) {
                triggerInitialSync(sheet.spreadsheet_id, sheet.sheet_name, sheet.mappings);
              }
            });

            // Register Drive webhook watch channel
            if (sheetsConfig.spreadsheet_id) {
              registerDriveWatch(sheetsConfig.spreadsheet_id);
            }

            // Register custom columns in table_layouts or profiles
            if (userId) {
              const customKeys = new Set<string>();
              Object.values(finalActiveSheets).forEach((sheet: any) => {
                if (sheet.enabled && sheet.mappings) {
                  Object.keys(sheet.mappings).forEach(key => {
                    if (!['name', 'phone', 'email'].includes(key)) {
                      customKeys.add(key);
                    }
                  });
                }
              });

              if (customKeys.size > 0) {
                let currentPrefs: Record<string, any> = {};
                
                const { data: layout } = await supabase
                  .from('table_layouts')
                  .select('columns')
                  .eq('workspace_id', userId)
                  .eq('layout_name', 'default')
                  .maybeSingle();

                if (layout?.columns) {
                  currentPrefs = layout.columns;
                } else {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('leads_table_preferences')
                    .eq('id', userId)
                    .maybeSingle();

                  if (profile?.leads_table_preferences) {
                    currentPrefs = profile.leads_table_preferences;
                  }
                }

                const updatedPrefs = { ...currentPrefs };
                let hasChanged = false;
                customKeys.forEach(k => {
                  const colId = `meta_${k}`;
                  if (updatedPrefs[colId] === undefined) {
                    updatedPrefs[colId] = true;
                    hasChanged = true;
                  }
                });

                if (hasChanged) {
                  await supabase
                    .from('table_layouts')
                    .upsert({
                      workspace_id: userId,
                      layout_name: 'default',
                      columns: updatedPrefs,
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'workspace_id,layout_name' });

                  await supabase
                    .from('profiles')
                    .update({ leads_table_preferences: updatedPrefs })
                    .eq('id', userId);
                }
              }
            }
          }
        } else {
          await supabase
            .from('integration_credentials')
            .upsert(upsertPayload, { onConflict: 'user_id, provider' });
        }
      } catch (err) {
        console.log('Skipped DB save.', err);
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
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 overflow-y-auto font-sans p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button
          onClick={() => router.push('/dashboard/integrations')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Integrations
        </button>

        {/* Dynamic configuration view */}
        <div className="p-6 sm:p-8 rounded-3xl border border-zinc-200 bg-white shadow-xs space-y-6 relative overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-5 border-b border-zinc-100">
            <div className="flex items-center gap-4">
              {getProviderLogo(provider) && (
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 shadow-2xs p-2.5">
                  <img 
                    src={`/images/integrations/${getProviderLogo(provider)}`} 
                    alt={provider} 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase font-semibold">CONFIGURATION PANEL</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 capitalize mt-0.5 flex items-center gap-2">
                  {provider?.replace('-', ' ')}
                </h1>
              </div>
            </div>
            
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold capitalize ${
              status === 'connected' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span>{status}</span>
            </div>
          </div>

          <div className="space-y-6">

            {/* 1. META ADS MANAGER VIEW */}
            {provider === 'meta-ads' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 leading-normal">
                    Connect your Facebook Business Account to retrieve leads from Facebook Ads Instant Forms.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Facebook Page</label>
                  <select 
                    value={selectedPage} 
                    onChange={e => setSelectedPage(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Connected Facebook Page</option>
                    <option value="page-1">Sushant Photography - Facebook Page</option>
                    <option value="page-2">Bhamstra Media Solutions</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs font-semibold text-zinc-800">Synchronize all active forms</span>
                  <button 
                    type="button"
                    onClick={() => setSyncForms(!syncForms)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${syncForms ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${syncForms ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* 3. PERSONAL WEBSITE WEBHOOK VIEW */}
            {provider === 'personal-website' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-3">
                  <Globe className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-normal">
                    Ingest leads from WordPress Contact Form 7, Elementor Forms, or Webflow. Copy the endpoint URL below.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" /> Webhook API URL
                  </label>
                  
                  <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl || 'Loading...'}
                      className="bg-transparent border-none text-[11px] text-zinc-800 font-mono focus:outline-none flex-1 truncate font-semibold"
                    />
                    <button
                      type="button"
                      onClick={copyUrlToClipboard}
                      className="p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. GOOGLE CONTACTS VIEW */}
            {provider === 'google-contacts' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-900 leading-normal font-medium">
                    Auto-sync incoming lead contact details directly to Google Contacts with custom labels and prefix/suffix name formatting rules.
                  </p>
                </div>

                {sheetsError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-normal">
                    <strong className="block font-bold">Error:</strong>
                    <p className="opacity-90">{sheetsError}</p>
                  </div>
                )}

                {status !== 'connected' ? (
                  <div className="p-8 rounded-2xl border border-zinc-200 bg-zinc-50/50 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-sky-100/80 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-zinc-900">Google Account Not Connected</h3>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Authorize your Google account to enable automatic sync to Google Contacts and create contact labels.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startGoogleOAuth}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Connect Google Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Connected Account Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-extrabold text-sm uppercase overflow-hidden shrink-0">
                          {connectedPicture ? (
                            <img src={connectedPicture} alt={connectedName || 'Google User'} className="w-full h-full object-cover" />
                          ) : (
                            connectedEmail ? connectedEmail[0].toUpperCase() : 'G'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{connectedName || 'Google Account'}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 font-mono mt-0.5 font-medium">
                            {connectedEmail || 'Google Contacts OAuth Connected'}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          type="button"
                          onClick={startGoogleOAuth}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                        >
                          Switch Account
                        </button>
                      </div>
                    </div>

                    {/* Standalone Tabbed Sub-navigation */}
                    <div className="flex border-b border-zinc-200 mb-6">
                      <button
                        type="button"
                        onClick={() => setContactsTab('configure')}
                        className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
                          contactsTab === 'configure'
                            ? 'border-sky-600 text-sky-700'
                            : 'border-transparent text-zinc-400 hover:text-zinc-700'
                        }`}
                      >
                        Configuration
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactsTab('status')}
                        className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
                          contactsTab === 'status'
                            ? 'border-sky-600 text-sky-700'
                            : 'border-transparent text-zinc-400 hover:text-zinc-700'
                        }`}
                      >
                        Status &amp; History
                      </button>
                    </div>

                    {contactsTab === 'configure' && (
                      <div className="space-y-6">
                        {/* 1. Global Enable Ingest Switch */}
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900">Enable Google Contacts Ingestion Sync</h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Automatically sync all newly captured leads into your phone contacts in real-time.</p>
                          </div>
                          
                          {/* Premium Animated iOS Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setContactsEnabled(!contactsEnabled)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 focus:outline-none ${
                              contactsEnabled ? 'bg-sky-600' : 'bg-zinc-300'
                            }`}
                          >
                            <motion.div
                              layout
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="bg-white w-5 h-5 rounded-full shadow-md"
                              animate={{ x: contactsEnabled ? 20 : 0 }}
                            />
                          </button>
                        </div>

                        {contactsEnabled && (
                          <div className="space-y-6">
                            
                            {/* 2. Contact Label Selector (Combobox) */}
                            <div className="space-y-2 relative">
                              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Contact Group / Label</label>
                              <p className="text-[11px] text-zinc-500">Associate synced contacts with a specific group/label for easier phone filtering.</p>
                              
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="Search and select contact group..."
                                    value={contactsSearchQuery}
                                    onChange={e => {
                                      setContactsSearchQuery(e.target.value);
                                      setShowLabelsDropdown(true);
                                    }}
                                    onFocus={() => setShowLabelsDropdown(true)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                                  />
                                  {contactsLabelName && !contactsSearchQuery && (
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200">
                                      {contactsLabelName}
                                    </span>
                                  )}
                                  {showLabelsDropdown && (
                                    <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-xl">
                                      {isLoadingLabels ? (
                                        <div className="px-4 py-3 text-xs text-zinc-500 italic flex items-center gap-2">
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading labels...
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            key="no-label-default"
                                            type="button"
                                            onClick={() => {
                                              setContactsLabelId('');
                                              setContactsLabelName('');
                                              setContactsSearchQuery('');
                                              setShowLabelsDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors border-b border-zinc-100 font-medium cursor-pointer"
                                          >
                                            -- No Label / Default Group --
                                          </button>
                                          {labelsList
                                            .filter(l => l.name.toLowerCase().includes(contactsSearchQuery.toLowerCase()))
                                            .map(l => (
                                              <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => {
                                                  setContactsLabelId(l.id);
                                                  setContactsLabelName(l.name);
                                                  setContactsSearchQuery('');
                                                  setShowLabelsDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-800 hover:bg-sky-50 hover:text-sky-900 transition-colors flex justify-between items-center font-medium cursor-pointer"
                                              >
                                                <span>{l.name}</span>
                                                <span className="text-[10px] text-zinc-400 font-mono font-bold">{l.memberCount} members</span>
                                              </button>
                                            ))}
                                          {labelsList.filter(l => l.name.toLowerCase().includes(contactsSearchQuery.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-3 text-xs text-zinc-400 italic">No labels found. Create one below!</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={fetchContactsLabels}
                                  title="Refresh label list"
                                  className="p-3 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl text-zinc-600 hover:text-zinc-900 transition-all shrink-0 cursor-pointer shadow-2xs"
                                >
                                  <RefreshCw className={`w-4 h-4 ${isLoadingLabels ? 'animate-spin' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* 3. Inline Label Provisioning Portal */}
                            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                              <h4 className="text-xs font-bold text-zinc-900">Create New Label</h4>
                              <p className="text-[11px] text-zinc-500">Type a name to instantly create and select a new label group in your Google Account.</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g., Studio Leads 2026"
                                  value={newLabelName}
                                  onChange={e => setNewLabelName(e.target.value)}
                                  className="flex-1 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:outline-none focus:border-sky-500"
                                />
                                <button
                                  type="button"
                                  onClick={createNewLabel}
                                  disabled={isCreatingLabel || !newLabelName.trim()}
                                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-xs text-white rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  {isCreatingLabel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Create Label'}
                                </button>
                              </div>
                            </div>

                            {/* 4. Name Template Configuration (Prefix/Suffix) */}
                            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">Name Customization Template</h4>
                              <p className="text-[11px] text-zinc-500">Configure naming prefix/postfix structures to tag contacts in your address book.</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-600 uppercase">Prefix Template</label>
                                  <input
                                    type="text"
                                    placeholder="e.g., FW "
                                    value={contactsPrefix}
                                    onChange={e => setContactsPrefix(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-600 uppercase">Suffix Template</label>
                                  <input
                                    type="text"
                                    placeholder="e.g.,  Lead 2026"
                                    value={contactsSuffix}
                                    onChange={e => setContactsSuffix(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                              </div>

                              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
                                <span className="text-[9px] text-sky-600 uppercase font-mono tracking-wider font-bold">Contact Preview</span>
                                <div className="text-xs font-extrabold text-sky-900 mt-1">
                                  {contactsPrefix || ''}Sushant Nawale{contactsSuffix || ''}
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )}

                    {contactsTab === 'status' && (
                      <div className="space-y-4">
                        {/* Status Check card */}
                        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900">OAuth Credentials State</h4>
                            <p className="text-[11px] text-zinc-500 mt-1">
                              {status === 'connected' 
                                ? 'Authorized ✓. Real-time background People API sync active.'
                                : 'No valid Google OAuth credentials connected.'
                              }
                            </p>
                          </div>
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            status === 'connected' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {status === 'connected' ? 'Authorized ✓' : 'Unauthorized'}
                          </div>
                        </div>

                        {/* Total Synced Contacts Counter */}
                        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900">Synced Contacts Count</h4>
                            <p className="text-[11px] text-zinc-500 mt-1">Total leads provisioned in Google Contacts.</p>
                          </div>
                          <div className="text-xl font-mono font-extrabold text-sky-600">{contactsCount}</div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                const { data: latestLeads } = await supabase
                                  .from('leads')
                                  .select('id')
                                  .eq('workspace_id', userId)
                                  .limit(1);

                                if (latestLeads && latestLeads.length > 0) {
                                  const leadId = latestLeads[0].id;
                                  const { data: { session } } = await supabase.auth.getSession();
                                  if (!session) return;
                                  
                                  const res = await fetch('/api/workflows/google-contacts/sync-lead', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${session.access_token}`
                                    },
                                    body: JSON.stringify({ leadId })
                                  });

                                  if (res.ok) {
                                    alert('Manual test sync triggered successfully!');
                                    const { count } = await supabase
                                      .from('live_logs')
                                      .select('*', { count: 'exact', head: true })
                                      .eq('workspace_id', userId)
                                      .eq('event_type', 'sync_google_contacts_success');
                                    setContactsCount(count || 0);
                                  } else {
                                    const text = await res.text();
                                    alert(`Test Sync failed: ${text}`);
                                  }
                                } else {
                                  alert('No leads available in this workspace to sync.');
                                }
                              } catch (err: any) {
                                alert(`Error: ${err.message}`);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-2xs"
                          >
                            Trigger Manual Test Sync
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. GOOGLE CALENDAR VIEW */}
            {provider === 'google-calendar' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-900 leading-normal font-medium">
                    Sync confirmed wedding shoots automatically to Google Calendar to prevent scheduling conflicts.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Sync Target Calendar</label>
                  <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-red-500">
                    <option value="cal-1">Primary Calendar - Studio Bookings</option>
                    <option value="cal-2">Personal Tasks - Amit</option>
                  </select>
                </div>
              </div>
            )}

            {/* 7. GOOGLE SHEETS VIEW */}
            {provider === 'google-sheets' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-900 leading-normal font-medium">
                    Link your Google Workspace spreadsheet documents to dynamically map columns and sync data.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">OAuth Credentials State</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {status === 'connected' 
                        ? 'Authenticated workspace active. Google Sheets node active in builder.'
                        : 'No valid Google OAuth credentials found for this workspace.'
                      }
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    status === 'connected' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {status === 'connected' ? 'Authorized ✓' : 'Unauthorized'}
                  </div>
                </div>

                {sheetsError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-normal space-y-1">
                    <strong className="block font-bold">Google API Integration Error:</strong>
                    <p className="opacity-90">{sheetsError}</p>
                    <p className="text-[10px] opacity-75 mt-1">
                      If the error mentions a disabled API, please click the Google activation link shown above, enable the Google Drive API in Google Cloud Console, and reconnect your account.
                    </p>
                  </div>
                )}

                {status === 'connected' && (
                  <div className="space-y-6">
                    {/* Connected Account Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold text-sm uppercase overflow-hidden shrink-0">
                          {connectedPicture ? (
                            <img src={connectedPicture} alt={connectedName || 'Google User'} className="w-full h-full object-cover" />
                          ) : (
                            connectedEmail ? connectedEmail[0].toUpperCase() : 'G'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{connectedName || 'Google Account'}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 font-mono mt-0.5 font-medium">
                            {connectedEmail || 'Google Workspace Sheets Linked'}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          type="button"
                          onClick={startGoogleOAuth}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                        >
                          Switch Account
                        </button>
                      </div>
                    </div>

                    {/* Standalone Tabbed Sub-navigation */}
                    <div className="flex border-b border-zinc-200 mb-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab('configure')}
                        className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
                          activeTab === 'configure'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-zinc-400 hover:text-zinc-700'
                        }`}
                      >
                        Connect &amp; Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('active')}
                        className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
                          activeTab === 'active'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-zinc-400 hover:text-zinc-700'
                        }`}
                      >
                        Currently Active Syncs
                        {Object.values(sheetsConfig.active_sheets || {}).filter((s: any) => s.enabled).length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            {Object.values(sheetsConfig.active_sheets || {}).filter((s: any) => s.enabled).length}
                          </span>
                        )}
                      </button>
                    </div>

                    {activeTab === 'configure' && (
                      <div className="space-y-6">
                        {/* Searchable Spreadsheet Selector */}
                        <div className="space-y-1.5 relative">
                          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Spreadsheet</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search and select spreadsheet..."
                              value={spreadsheetSearch}
                              onChange={e => {
                                setSpreadsheetSearch(e.target.value);
                                setShowSpreadsheetDropdown(true);
                              }}
                              onFocus={() => setShowSpreadsheetDropdown(true)}
                              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                            />
                            {showSpreadsheetDropdown && (
                              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-xl">
                                {spreadsheets
                                  .filter(s => s.name.toLowerCase().includes(spreadsheetSearch.toLowerCase()))
                                  .map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setSheetsConfig(prev => ({ ...prev, spreadsheet_id: s.id }));
                                        setSpreadsheetSearch(s.name);
                                        setShowSpreadsheetDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-3 text-xs text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors font-medium cursor-pointer"
                                    >
                                      {s.name}
                                    </button>
                                  ))}
                                {spreadsheets.filter(s => s.name.toLowerCase().includes(spreadsheetSearch.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-xs text-zinc-400 italic">No spreadsheets found</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Worksheets Toggle List & Mapping */}
                        {sheetsConfig.spreadsheet_id && worksheets.length > 0 && (
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Worksheet Configurations</label>
                            <div className="space-y-4">
                              {worksheets.map(w => {
                                const spreadsheetName = spreadsheets.find(s => s.id === sheetsConfig.spreadsheet_id)?.name || 'Spreadsheet';
                                const compositeKey = `${sheetsConfig.spreadsheet_id}:${w.title}`;
                                const sheetConf = sheetsConfig.active_sheets[compositeKey] || { enabled: false, mappings: {} };
                                const isEnabled = sheetConf.enabled;
                                const mappings = sheetConf.mappings || {};
                                const headers = sheetHeaders[compositeKey] || [];
                                const customMappings = customMappingsState[compositeKey] || [];

                                return (
                                  <div key={w.title} className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                                        <span className="text-sm font-bold text-zinc-900">{w.title}</span>
                                      </div>
                                      
                                      {/* Premium Animated iOS Toggle switch */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextVal = !isEnabled;
                                          setSheetsConfig(prev => {
                                            const activeSheets = { ...prev.active_sheets };
                                            if (!activeSheets[compositeKey]) {
                                              activeSheets[compositeKey] = {
                                                spreadsheet_id: sheetsConfig.spreadsheet_id,
                                                spreadsheet_name: spreadsheetName,
                                                sheet_name: w.title,
                                                enabled: false,
                                                mappings: { name: '', phone: '', email: '' }
                                              };
                                            }
                                            activeSheets[compositeKey].enabled = nextVal;
                                            return { ...prev, active_sheets: activeSheets };
                                          });
                                          if (nextVal && !sheetHeaders[compositeKey]) {
                                            fetchHeadersForSheet(sheetsConfig.spreadsheet_id, w.title);
                                          }
                                        }}
                                        className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 focus:outline-none ${
                                          isEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                                        }`}
                                      >
                                        <motion.div
                                          layout
                                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                          className="bg-white w-5 h-5 rounded-full shadow-md"
                                          animate={{ x: isEnabled ? 20 : 0 }}
                                        />
                                      </button>
                                    </div>

                                    {isEnabled && (
                                      <div className="space-y-4 pt-4 border-t border-zinc-200">
                                        <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Column Mapping</h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Name Field</label>
                                            <select
                                              value={mappings.name || ''}
                                              onChange={e => updateMapping(sheetsConfig.spreadsheet_id, spreadsheetName, w.title, 'name', e.target.value)}
                                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-medium focus:outline-none focus:border-emerald-500"
                                            >
                                              <option value="">-- Select Header --</option>
                                              {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Phone Field</label>
                                            <select
                                              value={mappings.phone || ''}
                                              onChange={e => updateMapping(sheetsConfig.spreadsheet_id, spreadsheetName, w.title, 'phone', e.target.value)}
                                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-medium focus:outline-none focus:border-emerald-500"
                                            >
                                              <option value="">-- Select Header --</option>
                                              {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Email Field</label>
                                            <select
                                              value={mappings.email || ''}
                                              onChange={e => updateMapping(sheetsConfig.spreadsheet_id, spreadsheetName, w.title, 'email', e.target.value)}
                                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-medium focus:outline-none focus:border-emerald-500"
                                            >
                                              <option value="">-- Select Header --</option>
                                              {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                          </div>
                                        </div>

                                        {/* Custom columns */}
                                        <div className="space-y-3 pt-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Metadata Fields</span>
                                            <button
                                              type="button"
                                              onClick={() => addCustomField(sheetsConfig.spreadsheet_id, w.title)}
                                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold uppercase hover:bg-emerald-100 cursor-pointer"
                                            >
                                              + Add Custom Mapping
                                            </button>
                                          </div>

                                          <div className="space-y-2">
                                            {customMappings.map(entry => (
                                              <div key={entry.id} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={entry.key}
                                                  onChange={e => handleCustomKeyChange(compositeKey, entry.id, e.target.value)}
                                                  placeholder="Field Name (e.g. venue)"
                                                  className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-medium focus:outline-none focus:border-emerald-500"
                                                />
                                                <select
                                                  value={entry.value}
                                                  onChange={e => handleCustomValueChange(compositeKey, entry.id, e.target.value)}
                                                  className="w-1/2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 font-medium focus:outline-none focus:border-emerald-500"
                                                >
                                                  <option value="">-- Map to Header --</option>
                                                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                <button
                                                  type="button"
                                                  onClick={() => removeCustomField(compositeKey, entry.id)}
                                                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sync Trigger Mode */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Sync Trigger Mode</label>
                          <select 
                            value={sheetsConfig.sync_trigger}
                            onChange={e => setSheetsConfig(prev => ({ ...prev, sync_trigger: e.target.value }))}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="any">Export all leads immediately upon ingestion</option>
                            <option value="high_value">Export only &quot;High-Value 🔥&quot; scored leads</option>
                            <option value="won">Export leads only when marked &quot;Won&quot; or &quot;Warm&quot;</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {activeTab === 'active' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-900 leading-normal font-medium">
                            All sheets listed below are actively synced in the background. You can turn off any sheet sync directly by clicking the Deactivate button.
                          </p>
                        </div>

                        {Object.entries(sheetsConfig.active_sheets || {}).filter(([_, s]) => s.enabled).length === 0 ? (
                          <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center text-xs text-zinc-400 italic">
                            No worksheets are currently synced. Go to the &quot;Connect &amp; Configure&quot; tab to set up a new sheet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {Object.entries(sheetsConfig.active_sheets || {})
                              .filter(([_, s]) => s.enabled)
                              .map(([key, s]) => (
                                <div key={key} className="flex justify-between items-center p-5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                                  <div className="space-y-1">
                                    <div className="text-xs font-bold text-zinc-900">{s.spreadsheet_name || 'Spreadsheet'}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">Worksheet: {s.sheet_name}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deactivateSheetSync(key)}
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                  >
                                    Deactivate
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {status !== 'connected' ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={startGoogleOAuth}
                      className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      Connect Google Account
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={startGoogleOAuth}
                      className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-2xs"
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
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">SMTP Host Address</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">User Account / Email</label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">App Password / Secret Key</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Actions Footer (Only render for non-WhatsApp setups as WhatsApp has its own controls) */}
            {provider !== 'whatsapp-web' && (
              <div className="flex justify-between items-center pt-5 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 font-mono tracking-tight flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> auth.uid() bound validation
                </span>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved &amp; Connected!
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
