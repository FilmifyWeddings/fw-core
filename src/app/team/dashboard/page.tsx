'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Camera,
  Calendar,
  Clock,
  MapPin,
  LogOut,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  User,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface AssignedShoot {
  assignment_id: string;
  sub_event_id: string;
  project_id: string;
  workspace_id: string;
  studio_name: string;
  studio_logo?: string;
  client_name: string;
  couple_name: string;
  event_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_location: string;
  role_name: string;
  agreed_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  notes?: string;
}

export default function TeamDashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [shoots, setShoots] = useState<AssignedShoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  useEffect(() => {
    async function loadCrewData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        const activeUser = session?.user || user;

        if (!activeUser) {
          router.push('/team/login');
          return;
        }

        setUserEmail(activeUser.email || '');
        setUserName(activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || 'Crew Member');

        // Fetch assigned shoots
        const token = session?.access_token;
        const res = await fetch('/api/team/shoots', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.shoots)) {
          setShoots(json.shoots);
        }
      } catch (err) {
        console.error('Error loading team shoots:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCrewData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/team/login');
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredShoots = shoots.filter((s) => {
    if (activeTab === 'upcoming') {
      return s.event_date >= today || s.event_date === 'TBD';
    }
    if (activeTab === 'completed') {
      return s.event_date < today && s.event_date !== 'TBD';
    }
    return true;
  });

  const totalAgreed = shoots.reduce((acc, s) => acc + (Number(s.agreed_amount) || 0), 0);
  const totalPaid = shoots.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0);
  const totalBalance = shoots.reduce((acc, s) => acc + (Number(s.balance_amount) || 0), 0);

  return (
    <div className="min-h-screen w-full bg-[#0B1120] text-slate-100 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">StudioCore</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Crew Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{userName}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
              <span>TOTAL ASSIGNED SHOOTS</span>
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white">{shoots.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Events assigned by studios</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
              <span>TOTAL EARNINGS</span>
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">₹{totalAgreed.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-emerald-500/80 mt-1">₹{totalPaid.toLocaleString('en-IN')} Received</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
              <span>PENDING PAYOUTS</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">₹{totalBalance.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500 mt-1">To be released by studios</p>
          </div>
        </div>

        {/* Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Your Assigned Shoots</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live schedule, venue locations, and roles</p>
          </div>

          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'upcoming' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming ({shoots.filter(s => s.event_date >= today || s.event_date === 'TBD').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed ({shoots.filter(s => s.event_date < today && s.event_date !== 'TBD').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({shoots.length})
            </button>
          </div>
        </div>

        {/* Shoot Cards List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold">Loading your assigned shoots...</p>
          </div>
        ) : filteredShoots.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-center">
            <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Shoots Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any shoots in this category yet. When a studio owner assigns you to an event, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShoots.map((shoot) => (
              <div
                key={shoot.assignment_id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Studio Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-300">{shoot.studio_name}</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-black">
                      {shoot.role_name}
                    </span>
                  </div>

                  {/* Couple Name & Event */}
                  <h3 className="text-base font-black text-white tracking-tight leading-tight">
                    {shoot.couple_name}
                  </h3>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">{shoot.event_name}</p>

                  {/* Details Grid */}
                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{shoot.event_date}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{shoot.start_time} - {shoot.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{shoot.venue_location}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Payout Info */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">FEE / PAYOUT</span>
                    <span className="text-sm font-black text-emerald-400">
                      ₹{(Number(shoot.agreed_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      shoot.payment_status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {shoot.payment_status?.toUpperCase()}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
