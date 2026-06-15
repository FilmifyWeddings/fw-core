'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, BarChart3, Database, RefreshCw, LayoutDashboard, Layers } from 'lucide-react';
import { Lead, LiveLog, DashboardStats } from '@/types';
import { supabase } from '@/lib/supabase';
import { AnalyticsCards } from '@/components/dashboard/analytics-cards';
import { LeadFlowChart } from '@/components/dashboard/lead-flow-chart';
// LeadTable relocated to dedicated /leads page
import { ActivityTicker } from '@/components/dashboard/activity-ticker';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

// Beautiful simulated data for fallback
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

const MOCK_STATS: DashboardStats = {
  totalLeads: 24,
  highValueLeads: 12,
  warmLeads: 8,
  coldLeads: 4,
  deliveryRate: 94.2,
  totalMessagesSent: 48,
  totalMessagesPending: 15,
  totalMessagesFailed: 3,
};

const MOCK_LOGS: LiveLog[] = [
  {
    id: 'l1',
    workspace_id: MOCK_WORKSPACE_ID,
    lead_id: '1',
    event_type: 'webhook_ingested',
    message: 'Lead ingested: "Amit Sharma". Score: High-Value 🔥.',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
  },
  {
    id: 'l2',
    workspace_id: MOCK_WORKSPACE_ID,
    lead_id: '1',
    event_type: 'drip_scheduled',
    message: 'Scheduled 3 drip messages for lead "Amit Sharma".',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 3600 * 2 + 10).toISOString(),
  },
  {
    id: 'l3',
    workspace_id: MOCK_WORKSPACE_ID,
    lead_id: '1',
    event_type: 'whatsapp_sent',
    message: 'WhatsApp Drip sent to "Amit Sharma" (+919876543210) successfully.',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 3600 * 2 + 120).toISOString(),
  },
  {
    id: 'l4',
    workspace_id: MOCK_WORKSPACE_ID,
    lead_id: '2',
    event_type: 'sync_google_success',
    message: 'Successfully synced lead "Priya Patel" as a Google Contact.',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
  },
  {
    id: 'l5',
    workspace_id: MOCK_WORKSPACE_ID,
    lead_id: '4',
    event_type: 'whatsapp_failed',
    message: 'WhatsApp Drip failed to send to "Sneha Reddy" (Attempt 1/3). Error: Network Timeout.',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
  },
];

const MOCK_CHART_DATA = [
  { date: '06 Jun', leads: 2, whatsappSent: 3 },
  { date: '07 Jun', leads: 4, whatsappSent: 5 },
  { date: '08 Jun', leads: 3, whatsappSent: 7 },
  { date: '09 Jun', leads: 6, whatsappSent: 12 },
  { date: '10 Jun', leads: 5, whatsappSent: 8 },
  { date: '11 Jun', leads: 4, whatsappSent: 9 },
  { date: '12 Jun', leads: 8, whatsappSent: 15 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(MOCK_WORKSPACE_ID);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [logs, setLogs] = useState<LiveLog[]>(MOCK_LOGS);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);

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

      // Verify or auto-create profile row
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', uId)
        .maybeSingle();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: uId,
          workspace_name: `${session.user.email?.split('@')[0]}'s Studio`,
          whastboost_status: 'disconnected',
        });
      }

      setIsDemoMode(false);
      await loadDashboardData(uId);
    };

    checkAuth();
  }, [router]);

  const loadDashboardData = async (targetUserId: string) => {
    setLoading(true);
    try {
      // Fetch from real Supabase filtered by user's workspace
      const { data: dbLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('created_at', { ascending: false });

      const { data: dbLogs } = await supabase
        .from('live_logs')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: dbQueue } = await supabase
        .from('queue_messages')
        .select('status')
        .eq('workspace_id', targetUserId);

      if (!leadsErr && dbLeads && dbLeads.length > 0) {
        setLeads(dbLeads as Lead[]);
        if (dbLogs) setLogs(dbLogs as LiveLog[]);
        
        // Calculate real stats
        const high = dbLeads.filter(l => l.score === 'High-Value 🔥').length;
        const warm = dbLeads.filter(l => l.score === 'Warm 👍').length;
        const cold = dbLeads.filter(l => l.score === 'Cold ❄️').length;
        
        const sent = dbQueue?.filter(q => q.status === 'sent').length || 0;
        const pending = dbQueue?.filter(q => q.status === 'pending' || q.status === 'processing').length || 0;
        const failed = dbQueue?.filter(q => q.status === 'failed').length || 0;
        const delivery = sent + failed > 0 ? parseFloat(((sent / (sent + failed)) * 100).toFixed(1)) : 100;

        setStats({
          totalLeads: dbLeads.length,
          highValueLeads: high,
          warmLeads: warm,
          coldLeads: cold,
          deliveryRate: delivery,
          totalMessagesSent: sent,
          totalMessagesPending: pending,
          totalMessagesFailed: failed,
        });
      } else if (!leadsErr && dbLeads && dbLeads.length === 0) {
        // If profile exists but lead count is 0, empty stats
        setLeads([]);
        setLogs([]);
        setStats({
          totalLeads: 0,
          highValueLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          deliveryRate: 100,
          totalMessagesSent: 0,
          totalMessagesPending: 0,
          totalMessagesFailed: 0,
        });
      }
    } catch (err) {
      console.log('Database read error, falling back to mock dashboard data.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l));

    if (!isDemoMode) {
      await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-200">
      {/* Main Dashboard Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Platform Command Center</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Real-time Lead Scoring & WhatsApp Marketing Automation</p>
          </div>

          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1.5">
                <Database className="w-3 h-3" />
                SIMULATION MODE
              </span>
            )}
            <button
              onClick={() => loadDashboardData(userId)}
              disabled={loading}
              className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Analytics KPIs Section */}
        <AnalyticsCards stats={stats} />

        {/* Dynamic visual grid dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Analytics Flow chart */}
          <div className="lg:col-span-2">
            <LeadFlowChart data={MOCK_CHART_DATA} />
          </div>

          {/* Activity ticker */}
          <div>
            <ActivityTicker logs={logs} />
          </div>
        </div>

        {/* Lead Flow Database relocated to dedicated /leads sub-page */}
      </main>
    </div>
  );
}
