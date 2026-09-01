'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import {
  Camera,
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle2,
  Building2,
  Sparkles,
  User,
  ChevronRight,
  Filter,
  Check,
  FileText,
  AlertCircle,
  Briefcase,
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
  const { workspaceName, isOwner, userRole, availableWorkspaces } = useWorkspace();
  const [shoots, setShoots] = useState<AssignedShoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');

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

  const today = new Date().toISOString().split('T')[0];

  const uniqueStudios = Array.from(new Set(shoots.map(s => s.studio_name).filter(Boolean)));

  const filteredShoots = shoots.filter((s) => {
    const matchesStudio = selectedStudio === 'all' || s.studio_name === selectedStudio;
    if (!matchesStudio) return false;

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
    <SidebarLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-[#92400e] border border-amber-200 font-black">
                Crew & Freelancer Portal
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-500">{userRole || 'Crew Member'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 tracking-tight">
              My Assigned Shoots & Schedule
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
              View live call times, venue locations, assigned roles, and payout statuses across all partner studios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL ASSIGNED SHOOTS</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-zinc-900 font-serif">{shoots.length}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">Events assigned across {uniqueStudios.length || 1} studio(s)</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL EARNINGS / AGREED FEE</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600 font-serif">₹{totalAgreed.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600/80 mt-1 font-bold">₹{totalPaid.toLocaleString('en-IN')} Received</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>PENDING PAYOUT BALANCE</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#b45309] font-serif">₹{totalBalance.toLocaleString('en-IN')}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">To be released by studio owners</p>
          </div>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Tabs */}
          <div className="flex p-1 bg-white border border-[#EBE7DF] rounded-xl text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'upcoming' ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Upcoming ({shoots.filter(s => s.event_date >= today || s.event_date === 'TBD').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'completed' ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Completed ({shoots.filter(s => s.event_date < today && s.event_date !== 'TBD').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'all' ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              All Events ({shoots.length})
            </button>
          </div>

          {/* Studio Filter Dropdown */}
          {uniqueStudios.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>Studio:</span>
              <select
                value={selectedStudio}
                onChange={(e) => setSelectedStudio(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#EBE7DF] text-xs font-bold text-zinc-800 outline-none cursor-pointer"
              >
                <option value="all">All Studios ({uniqueStudios.length})</option>
                {uniqueStudios.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Shoot Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-zinc-500">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold">Loading your assigned shoots...</p>
          </div>
        ) : filteredShoots.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white border border-[#EBE7DF] text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#b45309] mx-auto mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-serif">No Assigned Shoots Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto font-medium">
              You do not have any shoots in this category. When a studio owner assigns you to a wedding event in Team Manager, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShoots.map((shoot) => (
              <div
                key={shoot.assignment_id}
                className="p-5 rounded-2xl bg-white border border-[#EBE7DF] hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Studio & Role Badge */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F0ECE4]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800">{shoot.studio_name}</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#92400e] font-black">
                      {shoot.role_name}
                    </span>
                  </div>

                  {/* Couple Name & Event Title */}
                  <h3 className="text-base font-black text-zinc-900 tracking-tight font-serif leading-tight group-hover:text-[#b45309] transition-colors">
                    {shoot.couple_name}
                  </h3>
                  <p className="text-xs font-bold text-amber-700 mt-0.5">{shoot.event_name}</p>

                  {/* Schedule & Venue Details */}
                  <div className="mt-4 space-y-2 text-xs text-zinc-600">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-semibold text-zinc-800">{shoot.event_date}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{shoot.start_time} - {shoot.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{shoot.venue_location}</span>
                    </div>
                  </div>

                  {shoot.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EBE7DF] text-[11px] text-zinc-600">
                      <span className="font-bold text-zinc-700 block mb-0.5">Notes:</span>
                      <span>{shoot.notes}</span>
                    </div>
                  )}
                </div>

                {/* Footer Payout Info */}
                <div className="mt-5 pt-3 border-t border-[#F0ECE4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block">FEE / PAYOUT</span>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{(Number(shoot.agreed_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      shoot.payment_status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-[#92400e] border border-amber-200'
                    }`}>
                      {shoot.payment_status?.toUpperCase()}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
