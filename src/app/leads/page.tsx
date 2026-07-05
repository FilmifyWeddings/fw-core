'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database, RefreshCw, Settings, Bell, Check } from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import { LeadTable } from '@/components/dashboard/lead-table';
import { MasterSettingsHub } from '@/components/settings/master-settings-hub';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Amit Sharma',
    email: 'amit.sharma@example.com',
    phone: '+919876543210',
    source: 'facebook',
    status: 'new',
    score: 'High-Value 🔥',
    score_reason: 'High budget detected (₹2,50,000).',
    raw_payload: { budget: '2.5L', venue: 'Taj Udaipur', event_date: '2026-12-15' },
    created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
  },
  {
    id: '2',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+918765432109',
    source: 'facebook',
    status: 'contacted',
    score: 'High-Value 🔥',
    score_reason: 'Premium destination/venue (Leela Palace Goa) with budget of ₹1,80,000.',
    raw_payload: { budget: '1.8L', venue: 'Leela Palace Goa', event_date: '2026-11-20', functions: '3' },
    created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
  },
  {
    id: '3',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+917654321098',
    source: 'facebook',
    status: 'warm',
    score: 'Warm 👍',
    score_reason: 'Moderate budget detected (₹90,000).',
    raw_payload: { budget: '90k', venue: 'Marriott Jaipur', event_date: '2026-10-05' },
    created_at: new Date(Date.now() - 1000 * 3600 * 42).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 42).toISOString(),
  },
  {
    id: '4',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+919988776655',
    source: 'facebook',
    status: 'new',
    score: 'Cold ❄️',
    score_reason: 'Low budget detected (₹40,000).',
    raw_payload: { budget: '40,000 INR', venue: 'Local Banquet Hall', event_date: '2026-09-12' },
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
  },
];

const DEFAULT_STAGES = [
  { id: 'new', name: 'Inquiry', color: '#3b82f6', position: 0 },
  { id: 'contacted', name: 'Contacted', color: '#8b5cf6', position: 1 },
  { id: 'warm', name: 'Meeting Scheduled', color: '#ec4899', position: 2 },
  { id: 'hot', name: 'Proposal Sent', color: '#f59e0b', position: 3 },
  { id: 'closed', name: 'Contract Signed', color: '#10b981', position: 4 },
  { id: 'lost', name: 'Closed/Lost', color: '#6b7280', position: 5 }
];

const parseLeadComment = (comm: any): any => {
  if (comm && typeof comm === 'object') {
    return {
      id: comm.id || 'comm_' + Math.random().toString(36).substring(7),
      text: comm.text || comm.comment_text || '',
      authorName: comm.authorName || 'Rahul Sharma',
      authorRole: comm.authorRole || 'Lead Photographer',
      createdAt: comm.createdAt || comm.created_at || new Date().toISOString(),
      alert_flag: comm.alert_flag !== undefined ? !!comm.alert_flag : false,
      followup_at: comm.followup_at || null,
      replies: Array.isArray(comm.replies) ? comm.replies : []
    };
  }

  try {
    const rawText = String(comm);
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      const parsed = JSON.parse(rawText);
      return parseLeadComment(parsed);
    }
  } catch (_) {}

  return {
    id: 'comm_' + Math.random().toString(36).substring(7),
    text: String(comm),
    authorName: 'Rahul Sharma',
    authorRole: 'Lead Photographer',
    createdAt: new Date().toISOString(),
    alert_flag: false,
    followup_at: null,
    replies: []
  };
};

export default function LeadsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(MOCK_WORKSPACE_ID);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [stages, setStages] = useState<any[]>(DEFAULT_STAGES);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifiedCommentIds, setNotifiedCommentIds] = useState<string[]>([]);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Authenticate user & load leads
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      let uId = session.user.id;
      setUserEmail(session.user.email || null);
      // Admin impersonation override
      if (session.user.email === 'sushantnawale700@gmail.com') {
        const impId = localStorage.getItem('impersonated_tenant_id');
        if (impId) {
          uId = impId;
        }
      }
      setUserId(uId);
      setIsDemoMode(false);
      await loadLeadsAndPreferences(uId);
    };

    checkAuth();
  }, [router]);

  // Request browser Notification permissions and load already notified IDs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      try {
        const stored = localStorage.getItem('leads_notified_comment_ids');
        if (stored) {
          setNotifiedCommentIds(JSON.parse(stored));
        }
      } catch (_) {}
    }
  }, []);

  // Periodic Reminder Alert scanner (checks local leads state comments every 10 seconds)
  useEffect(() => {
    const scanReminders = async () => {
      const now = new Date().getTime();
      const triggeredList: any[] = [];
      const newNotified = [...notifiedCommentIds];

      leads.forEach(lead => {
        if (Array.isArray(lead.comments)) {
          lead.comments.forEach((c: any) => {
            const comment = parseLeadComment(c);
            if (comment.alert_flag && comment.followup_at) {
              const fTime = new Date(comment.followup_at).getTime();
              if (fTime <= now && !notifiedCommentIds.includes(comment.id)) {
                newNotified.push(comment.id);
                triggeredList.push({
                  id: comment.id,
                  leadId: lead.id,
                  leadName: lead.name || 'Unspecified Lead',
                  text: comment.text,
                  time: comment.followup_at,
                  read: false
                });

                // Trigger browser push notification card
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Lead Reminder: ${lead.name || 'Unspecified'}`, {
                    body: comment.text,
                    icon: '/favicon.ico'
                  });
                }

                if (!isDemoMode) {
                  // Run logging query asynchronously
                  (async () => {
                    const { error } = await supabase.from('live_logs').insert({
                      workspace_id: lead.workspace_id,
                      lead_id: lead.id,
                      event_type: 'reminder_triggered',
                      message: `Reminder triggered for client '${lead.name || lead.phone}': ${comment.text}`,
                      metadata: { comment_id: comment.id }
                    });
                    if (error) console.error('Error logging reminder trigger:', error);
                  })();
                }
              }
            }
          });
        }
      });

      if (triggeredList.length > 0) {
        localStorage.setItem('leads_notified_comment_ids', JSON.stringify(newNotified));
        setNotifiedCommentIds(newNotified);
        setNotifications(prev => [...triggeredList, ...prev]);
      }
    };

    const interval = setInterval(scanReminders, 10000);
    scanReminders();

    return () => clearInterval(interval);
  }, [leads, notifiedCommentIds, isDemoMode]);

  const loadLeadsAndPreferences = async (targetUserId: string) => {
    setLoading(true);
    try {
      // Load Leads
      const { data: dbLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('created_at', { ascending: false });

      if (!leadsErr && dbLeads) {
        setLeads(dbLeads as Lead[]);
      }

      // Load CRM Stages
      const { data: dbStages, error: stagesErr } = await supabase
        .from('crm_stages')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('position', { ascending: true });

      if (!stagesErr && dbStages && dbStages.length > 0) {
        setStages(dbStages);
      } else {
        setStages(DEFAULT_STAGES);
      }

      // Load Layout Configurations (try table_layouts first, fallback to profiles)
      const { data: layout, error: layoutErr } = await supabase
        .from('table_layouts')
        .select('columns')
        .eq('workspace_id', targetUserId)
        .eq('layout_name', 'default')
        .single();

      if (!layoutErr && layout?.columns) {
        setPreferences(layout.columns);
      } else {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('leads_table_preferences')
          .eq('id', targetUserId)
          .single();

        if (!profileErr && profile?.leads_table_preferences) {
          setPreferences(profile.leads_table_preferences);
        }
      }
    } catch (err) {
      console.log('Database read error, falling back to mock leads data.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    handleLeadUpdate(leadId, { status: newStatus });
  };

  const handleLeadUpdate = async (leadId: string, updatedFields: Partial<Lead>) => {
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields, updated_at: new Date().toISOString() } : l));

    if (!isDemoMode) {
      try {
        await supabase
          .from('leads')
          .update({ ...updatedFields, updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } catch (err) {
        console.error("Database update error:", err);
      }
    }
  };

  const handleCreateLead = async (newLeadData: Partial<Lead>) => {
    const tempId = Math.random().toString(36).substring(7);
    const newLead: Lead = {
      id: tempId,
      workspace_id: userId,
      name: newLeadData.name || 'New Lead',
      email: newLeadData.email || '',
      phone: newLeadData.phone || '',
      source: newLeadData.source || 'Manual',
      status: newLeadData.status || 'new',
      score: newLeadData.score || 'Cold ❄️',
      score_reason: newLeadData.score_reason || 'Manually added lead.',
      raw_payload: newLeadData.raw_payload || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newLeadData
    };

    if (isDemoMode) {
      setLeads(prev => [newLead, ...prev]);

      // Seed mock welcome automation in localStorage
      try {
        const welcomeConfigStr = localStorage.getItem(`wa_config_welcome_${userId}`);
        if (welcomeConfigStr) {
          const welcomeConfig = JSON.parse(welcomeConfigStr);
          if (welcomeConfig.isActive && Array.isArray(welcomeConfig.steps) && welcomeConfig.steps.length > 0) {
            let cumulativeDelay = 0;
            const newLogs: any[] = [];
            const baseTime = new Date();

            welcomeConfig.steps.forEach((step: any, idx: number) => {
              cumulativeDelay += parseInt(step.delay_seconds || '0', 10);
              const scheduledTime = new Date(baseTime.getTime() + cumulativeDelay * 1000);
              const isImmediate = cumulativeDelay <= 2;

              // Fail ~15% randomly to let the user test Retry buttons
              const status = isImmediate ? (Math.random() < 0.15 ? 'failed' : 'sent') : 'pending';
              const error_message = status === 'failed' ? 'WhatsBoost API Error: Device session disconnected (mock fallback trigger).' : null;

              newLogs.push({
                id: `mock-log-${Math.random().toString(36).substring(5)}`,
                lead_id: newLead.id,
                lead_name: newLead.name,
                phone: newLead.phone || '919988776655',
                step_number: idx + 1,
                template_name: step.template_name,
                scheduled_for: scheduledTime.toISOString(),
                sent_at: isImmediate && status === 'sent' ? new Date().toISOString() : null,
                status,
                error_message
              });
            });

            const existingLogsStr = localStorage.getItem(`wa_logs_welcome_${userId}`);
            const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
            localStorage.setItem(`wa_logs_welcome_${userId}`, JSON.stringify([...newLogs, ...existingLogs]));
          }
        }

        // Seed mock followups in localStorage
        const followupConfigStr = localStorage.getItem(`wa_config_followup_${userId}`);
        if (followupConfigStr) {
          const followupConfig = JSON.parse(followupConfigStr);
          if (followupConfig.isActive && Array.isArray(followupConfig.steps) && followupConfig.steps.length > 0) {
            const newLogs: any[] = [];
            const baseTime = new Date();

            followupConfig.steps.forEach((step: any, idx: number) => {
              const days = parseInt(step.day || '1', 10);
              const scheduledTime = new Date(baseTime.getTime());
              scheduledTime.setDate(scheduledTime.getDate() + days);

              newLogs.push({
                id: `mock-flog-${Math.random().toString(36).substring(5)}`,
                lead_id: newLead.id,
                lead_name: newLead.name,
                phone: newLead.phone || '919988776655',
                step_number: idx + 1,
                template_name: step.template_name,
                scheduled_for: scheduledTime.toISOString(),
                sent_at: null,
                status: 'pending',
                error_message: null
              });
            });

            const existingLogsStr = localStorage.getItem(`wa_logs_followup_${userId}`);
            const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
            localStorage.setItem(`wa_logs_followup_${userId}`, JSON.stringify([...newLogs, ...existingLogs]));
          }
        }
      } catch (err) {
        console.error('Demo simulation seeding failed:', err);
      }
    } else {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([{
            workspace_id: userId,
            name: newLead.name,
            email: newLead.email,
            phone: newLead.phone,
            source: newLead.source,
            status: newLead.status,
            score: newLead.score,
            score_reason: newLead.score_reason,
            raw_payload: newLead.raw_payload,
            custom_color: (newLead as any).custom_color || null,
            comments: (newLead as any).comments || [],
            wa_welcome_sent: (newLead as any).wa_welcome_sent || false,
            google_synced: (newLead as any).google_synced || false,
            wgl_dispatched: (newLead as any).wgl_dispatched || false,
            followup_timeline: (newLead as any).followup_timeline || []
          }])
          .select();

        if (!error && data && data.length > 0) {
          const savedLead = data[0] as Lead;
          setLeads(prev => [savedLead, ...prev]);

          // Trigger real database automation endpoint
          fetch('/api/whatsapp/trigger-automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead: savedLead })
          }).catch(err => console.error('Error triggering WhatsApp automation:', err));
        } else {
          console.error("Database create error:", error);
          alert("Failed to save lead to database: " + (error?.message || "Unknown error"));
        }
      } catch (err: any) {
        console.error("Database create error:", err);
        alert("Failed to save lead to database: " + (err?.message || err));
      }
    }
  };

  const handlePreferencesChange = async (newPrefs: any) => {
    setPreferences(newPrefs);
    if (!isDemoMode && userId) {
      try {
        // Try saving layout to table_layouts first
        const { error } = await supabase
          .from('table_layouts')
          .upsert({
            workspace_id: userId,
            layout_name: 'default',
            columns: newPrefs,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id,layout_name' });

        if (error) {
          // Fallback to profiles table if table_layouts is not created yet
          await supabase
            .from('profiles')
            .update({ leads_table_preferences: newPrefs })
            .eq('id', userId);
        }
      } catch (err) {
        console.error("Preferences sync error:", err);
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-[#070708] text-slate-900 dark:text-white selection:bg-slate-100 dark:selection:bg-zinc-850 transition-colors duration-200">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        
        {/* Lead Table Container */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <LeadTable 
            leads={leads} 
            stages={stages}
            onStatusChange={handleStatusChange} 
            onLeadUpdate={handleLeadUpdate}
            onCreateLead={handleCreateLead}
            initialPreferences={preferences}
            onPreferencesChange={handlePreferencesChange}
            userEmail={userEmail}
            activeLeadId={activeLeadId}
            onDrawerClose={() => setActiveLeadId(null)}
            renderHeader={() => (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Lead Flow Database</h1>
                  <p className="text-xs text-[#706E6A] dark:text-zinc-400 mt-1 font-semibold">Manage deal statuses, scoring reasons, and metadata</p>
                </div>

                <div className="flex items-center gap-3">
                  {isDemoMode && (
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1.5 select-none">
                      <Database className="w-3 h-3" />
                      SIMULATION MODE
                    </span>
                  )}

                  {/* Bell Notification center */}
                  <div className="relative" ref={notifContainerRef}>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center shadow-xs relative"
                      title="Workspace Reminders"
                    >
                      <Bell className="w-4 h-4" />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse border border-white dark:border-zinc-900">
                          {notifications.filter(n => !n.read).length}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown Panel (Premium 3D Popover style) */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-3.5 w-80 max-h-96 overflow-y-auto z-[999999] rounded-2xl bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] p-4 shadow-xl dark:shadow-2xl space-y-3 text-slate-800 dark:text-zinc-200 select-none">
                        <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2C2926] pb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-[#D4AF37]" />
                            Reminder Alerts
                          </span>
                          {notifications.length > 0 && (
                            <button
                              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                              className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 italic">
                              No active reminders triggered yet.
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 hover:translate-x-0.5 ${
                                  n.read 
                                    ? 'bg-slate-50/50 dark:bg-zinc-900/20 border-slate-200/50 dark:border-zinc-900/60' 
                                    : 'bg-[#D4AF37]/5 dark:bg-[#C5A059]/5 border-[#D4AF37]/20 dark:border-[#C5A059]/20 shadow-xs'
                                }`}
                              >
                                {/* Clickable Area to Open Workspace Drawer */}
                                <div
                                  onClick={() => {
                                    setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                    setShowNotifications(false);
                                    setActiveLeadId(n.leadId);
                                  }}
                                  className="flex-1 min-w-0 text-left cursor-pointer"
                                >
                                  <div className="flex items-start gap-1.5 min-w-0">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-rose-500 animate-ping'}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs truncate font-bold text-slate-500 dark:text-zinc-400">
                                          For: <span className="font-extrabold text-[#D4AF37] dark:text-[#C5A059] ml-0.5">{n.leadName}</span>
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 shrink-0">
                                          {new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-900 dark:text-white font-bold leading-normal mt-1 break-words whitespace-normal font-sans">{n.text}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Complete & Hide Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                                    const newNotified = [...notifiedCommentIds];
                                    if (!newNotified.includes(n.id)) {
                                      newNotified.push(n.id);
                                      setNotifiedCommentIds(newNotified);
                                      localStorage.setItem('leads_notified_comment_ids', JSON.stringify(newNotified));
                                    }
                                  }}
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg shrink-0 transition-all flex items-center gap-0.5 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/5"
                                  title="Mark Complete & Hide"
                                >
                                  <Check className="w-3 h-3" />
                                  <span className="text-[9px] font-black uppercase tracking-wider px-0.5 font-sans">Done</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center shadow-xs"
                    title="Workspace Config Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => loadLeadsAndPreferences(userId)}
                    disabled={loading}
                    className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center shadow-xs"
                    title="Refresh leads data"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          />
        )}

        <MasterSettingsHub
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          workspaceId={userId}
          onStagesUpdated={() => loadLeadsAndPreferences(userId)}
        />

      </div>
    </div>
  );
}