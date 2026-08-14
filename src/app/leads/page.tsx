'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, RefreshCw, Settings, Bell, Check, ArrowLeft, Globe, X } from 'lucide-react';
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
  { id: 'new', name: 'Inquiry / New', color: '#6366f1', position: 0 },
  { id: 'contacted', name: 'Contacted', color: '#8b5cf6', position: 1 },
  { id: 'cool', name: 'Cool / Warm', color: '#06b6d4', position: 2 },
  { id: 'hot', name: 'Hot 🔥', color: '#ef4444', position: 3 },
  { id: 'booked', name: 'Booked', color: '#10b981', position: 4 },
  { id: 'won', name: 'Won 🎉', color: '#10b981', position: 5 },
  { id: 'lost', name: 'Lost ❌', color: '#f43f5e', position: 6 }
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
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const PAGE_SIZE = 100;
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
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showNotifications]);

  const loadingMoreRef = useRef<boolean>(false);

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

  // Settings sync listener
  useEffect(() => {
    const handleSync = () => {
      if (userId) {
        loadLeadsAndPreferences(userId);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('settings_updated', handleSync);
      window.addEventListener('storage', handleSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('settings_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }, [userId]);

  // Realtime subscription for leads (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!userId || isDemoMode) return;

    const channel = supabase
      .channel(`realtime-leads-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            setLeads(prev => {
              if (prev.some(l => l.id === newLead.id)) return prev;
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setLeads(prev => prev.filter(l => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode]);

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

  const loadLeadsAndPreferences = async (targetUserId: string, pageNum = 0) => {
    if (pageNum === 0) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Load Leads batch of 100 with deterministic ordering
      const { data: dbLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (!leadsErr && dbLeads) {
        if (dbLeads.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (pageNum === 0) {
          setLeads(dbLeads as Lead[]);
        } else {
          setLeads(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLeads = (dbLeads as Lead[]).filter(l => !existingIds.has(l.id));
            return [...prev, ...newLeads];
          });
        }
      }

      if (pageNum === 0) {
        // Load CRM Stages synchronized with Settings
        let loadedStages: any[] = [];
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || '';
          const res = await fetch(`/api/settings?workspace_id=${targetUserId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.settings?.lead_stages) && data.settings.lead_stages.length > 0) {
              loadedStages = data.settings.lead_stages.map((st: any, idx: number) => ({
                id: st.id || `st_${idx}`,
                name: st.name,
                color: st.color || '#3b82f6',
                position: typeof st.position === 'number' ? st.position : idx,
              }));
            }
          }
        } catch (_) {}

        if (loadedStages.length === 0) {
          const { data: dbStages } = await supabase
            .from('crm_stages')
            .select('*')
            .eq('workspace_id', targetUserId)
            .order('position', { ascending: true });

          if (dbStages && dbStages.length > 0) {
            loadedStages = dbStages;
          }
        }

        if (loadedStages.length === 0) {
          const localStages = localStorage.getItem('leads_workspace_stages') || localStorage.getItem(`settings_stages_${targetUserId}`);
          if (localStages) {
            try {
              const parsed = JSON.parse(localStages);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedStages = parsed;
              }
            } catch (_) {}
          }
        }

        if (loadedStages.length === 0) {
          loadedStages = DEFAULT_STAGES;
        }

        setStages(loadedStages);
        try {
          localStorage.setItem('leads_workspace_stages', JSON.stringify(loadedStages));
        } catch (_) {}

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
      }
    } catch (err) {
      console.log('Database read error, falling back to mock leads data.', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || loadingMoreRef.current || !hasMore || isDemoMode) return;
    loadingMoreRef.current = true;
    const nextPage = page + 1;
    setPage(nextPage);
    loadLeadsAndPreferences(userId, nextPage);
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    handleLeadUpdate(leadId, { status: newStatus });
  };

  // Helper to automatically create/sync client when lead stage is set to "Booked"
  const autoSyncBookedLeadToClient = async (leadId: string, targetLead: Lead, updatedFields: Partial<Lead>) => {
    try {
      const mergedLead: Lead = { ...targetLead, ...updatedFields };
      const currentWorkspaceId = mergedLead.workspace_id || userId;
      if (!currentWorkspaceId) return;

      // 1. Check if client already exists for this lead
      const { data: existingClients } = await supabase
        .from('workspace_clients')
        .select('id')
        .eq('lead_id', leadId);

      if (existingClients && existingClients.length > 0) {
        console.log('[LeadToClient] Client already exists for lead:', leadId);
        return;
      }

      // 2. Extract best possible values from lead and raw payload
      const raw = mergedLead.raw_payload || {};
      const clientName = mergedLead.name || raw.groom_name || raw.bride_name || 'Booked Client';
      const clientPhone = mergedLead.phone || raw.phone || raw.contact || '';
      const clientEmail = mergedLead.email || raw.email || null;
      
      const eventType = raw.shoot_type || raw.event_type || raw.service || 'Wedding';
      
      // Parse event date if present (YYYY-MM-DD or parseable string)
      let parsedEventDate: string | null = null;
      if (raw.event_date || raw.wedding_date || raw.date) {
        const rawDate = raw.event_date || raw.wedding_date || raw.date;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedEventDate = d.toISOString().split('T')[0];
        }
      }

      // Parse budget / package amount
      let packageAmount = 0;
      if (raw.budget || raw.package_amount || raw.amount) {
        const numStr = String(raw.budget || raw.package_amount || raw.amount).replace(/[^0-9.]/g, '');
        packageAmount = parseFloat(numStr) || 0;
      }

      const clientPayload = {
        user_id: currentWorkspaceId,
        workspace_id: currentWorkspaceId,
        lead_id: leadId,
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        event_type: eventType,
        event_date: parsedEventDate,
        total_package_amount: packageAmount,
        paid_amount: 0,
        status: 'active'
      };

      const { data: newClient, error: clientErr } = await supabase
        .from('workspace_clients')
        .insert([clientPayload])
        .select('id')
        .single();

      if (clientErr) {
        console.error('[LeadToClient] Error creating client from booked lead:', clientErr.message);
      } else if (newClient) {
        console.log('[LeadToClient] Successfully auto-created client from booked lead:', newClient.id);
        // Link client_id on leads table
        await supabase
          .from('leads')
          .update({ client_id: newClient.id })
          .eq('id', leadId);

        // Also auto-create Post-Production Project for this client
        const defaultDeliverables = [
          {
            id: `deliv_photo_1_${Date.now()}`,
            title: 'Edited Photos',
            category: 'photos',
            count: '500 Photos',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 15 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_photo_2_${Date.now()}`,
            title: 'Save the Date Photo',
            category: 'photos',
            count: '5 Photos',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() - 10 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_photo_3_${Date.now()}`,
            title: 'Instagram Posts',
            category: 'photos',
            count: '10 Posts',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 5 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_1_${Date.now()}`,
            title: 'Cinematic Film',
            category: 'videos',
            count: '25 Mins',
            assigned_to: 'Amit (Senior Video Editor)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 30 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_2_${Date.now()}`,
            title: 'Cinematic Teaser',
            category: 'videos',
            count: '1 Min',
            assigned_to: 'Rahul (Teaser Specialist)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 7 * 86400000).toISOString().split('T')[0] : '',
            status: 'in_progress',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_3_${Date.now()}`,
            title: 'Traditional Full Video',
            category: 'videos',
            count: '2 Hours',
            assigned_to: 'Suresh (Traditional Editor)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 45 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_4_${Date.now()}`,
            title: 'Viral Instagram Reels',
            category: 'videos',
            count: '3 Reels',
            assigned_to: 'Priya (Reels Specialist)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 10 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_album_1_${Date.now()}`,
            title: 'Main Wedding Album',
            category: 'albums',
            count: '40 Pages',
            assigned_to: 'Rohan (Album Designer)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_album_2_${Date.now()}`,
            title: 'Parent / Mini Album',
            category: 'albums',
            count: '20 Pages',
            assigned_to: 'Rohan (Album Designer)',
            deadline: parsedEventDate ? new Date(new Date(parsedEventDate).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          }
        ];

        await supabase
          .from('post_production_projects')
          .insert([{
            user_id: currentWorkspaceId,
            workspace_id: currentWorkspaceId,
            client_id: newClient.id,
            project_manager_name: 'Sushant (Lead Manager)',
            overall_status: 'active',
            deliverables: defaultDeliverables
          }]);
      }
    } catch (e) {
      console.error('[LeadToClient] autoSyncBookedLeadToClient Exception:', e);
    }
  };

  const handleLeadUpdate = async (leadId: string, updatedFields: Partial<Lead>) => {
    // Optimistic UI Update
    const currentLead = leads.find(l => l.id === leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields, updated_at: new Date().toISOString() } : l));

    if (!isDemoMode) {
      try {
        await supabase
          .from('leads')
          .update({ ...updatedFields, updated_at: new Date().toISOString() })
          .eq('id', leadId);

        // AUTO-CONVERT TO CLIENT WHEN STAGE IS "BOOKED"
        const isBooked = 
          (updatedFields.stage_id && updatedFields.stage_id.toLowerCase().includes('book')) ||
          (typeof updatedFields.status === 'string' && updatedFields.status.toLowerCase().includes('book')) ||
          (updatedFields.stage_id && stages.some(s => s.id === updatedFields.stage_id && s.name.toLowerCase().includes('book')));

        if (isBooked && currentLead) {
          await autoSyncBookedLeadToClient(leadId, currentLead, updatedFields);
        }
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
      <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col overflow-hidden">
        
        {/* Lead Table Container */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <React.Suspense fallback={<div className="py-20 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-zinc-500" /></div>}>
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
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              loadingMore={loadingMore}
              renderHeader={() => (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-md">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                      Leads Integration CRM & Webhooks
                    </h1>
                    <p className="text-[10px] text-[#706E6A] dark:text-zinc-400 font-semibold">Manage deal statuses, webhook configuration, and metadata</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">

                  {isDemoMode && (
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1.5 select-none">
                      <Database className="w-3.5 h-3.5" />
                      SIMULATION MODE
                    </span>
                  )}

                  {/* Bell Notification center */}
                  <div className="relative z-50" ref={notifContainerRef}>
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

                    {/* Centered Notifications Modal Popup with Backdrop */}
                    {showNotifications && (
                      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
                        <div 
                          className="w-full max-w-md max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-[#1C1A18] border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                                <Bell className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                                  Reminder Alerts
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                  {notifications.filter(n => !n.read).length} unread alerts
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {notifications.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                  className="text-[10px] font-bold text-[#D4AF37] hover:underline px-2 py-1 cursor-pointer"
                                >
                                  Mark all read
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowNotifications(false)}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="p-4 overflow-y-auto space-y-2.5 max-h-[60vh]">
                            {notifications.length === 0 ? (
                              <div className="text-center py-10 text-xs text-slate-400">
                                <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700 mb-2 opacity-50" />
                                No active reminders triggered yet.
                              </div>
                            ) : (
                              notifications.map(n => (
                                <div
                                  key={n.id}
                                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    n.read 
                                      ? 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200/60 dark:border-zinc-850' 
                                      : 'bg-[#D4AF37]/5 dark:bg-[#C5A059]/5 border-[#D4AF37]/30 dark:border-[#C5A059]/30 shadow-xs'
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
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-xs font-bold text-[#D4AF37] dark:text-[#C5A059] truncate">
                                        {n.leadName}
                                      </span>
                                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                        {new Date(n.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-zinc-200 font-medium line-clamp-2">
                                      {n.text}
                                    </p>
                                  </div>

                                  {/* Complete & Hide Button */}
                                  <button
                                    type="button"
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
                                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl shrink-0 transition-all border border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/10 cursor-pointer"
                                    title="Complete & Hide"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
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
          </React.Suspense>
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