'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  ExternalLink,
  Receipt,
  Download,
  Film,
  FolderOpen
} from 'lucide-react';
import VendorAlbumDeliverablesModal from '@/components/vendors/VendorAlbumDeliverablesModal';
import TeamMemberFinanceDrawer from '@/app/workspace/team/components/TeamMemberFinanceDrawer';

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
  const { workspaceName, isOwner, userRole, activeWorkspace } = useWorkspace();
  const [shoots, setShoots] = useState<AssignedShoot[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'shoots' | 'deliverables' | 'salaries'>('shoots');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');

  // Transparency Read-Only Modals for Team Members & Partners
  const [selectedDeliverablesMember, setSelectedDeliverablesMember] = useState<any | null>(null);
  const [isDeliverablesModalOpen, setIsDeliverablesModalOpen] = useState(false);
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<any | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [financeInitialTab, setFinanceInitialTab] = useState<'bookings' | 'payroll' | 'analytics' | 'deliverables'>('bookings');
  const [currentMemberProfile, setCurrentMemberProfile] = useState<any | null>(null);

  useEffect(() => {
    async function loadCrewData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        const activeUser = session?.user || user;

        if (!activeUser) {
          router.push('/team/login');
          return;
        }

        const token = session?.access_token;
        const targetWs = activeWorkspace?.workspaceId || activeWorkspace?.studioSlug;
        const url = targetWs && targetWs !== 'all'
          ? `/api/team/portal-data?workspace_id=${encodeURIComponent(targetWs)}`
          : '/api/team/portal-data';

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();

        let loadedShoots = [];
        let loadedDelivs = [];
        let loadedSalaries = [];
        let profile = null;

        if (json.success) {
          loadedShoots = Array.isArray(json.shoots) ? json.shoots : [];
          loadedDelivs = Array.isArray(json.deliverables) ? json.deliverables : [];
          loadedSalaries = Array.isArray(json.salaries) ? json.salaries : [];
          profile = json.memberProfile || null;
        }

        setShoots(loadedShoots);
        setDeliverables(loadedDelivs);
        setSalaries(loadedSalaries);

        const rawName = profile?.name || activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'Team Member';
        const cleanRate = Number(profile?.default_daily_rate || 0);
        const cleanFreq = profile?.payout_frequency || 'daily';

        setCurrentMemberProfile({
          id: profile?.id || activeUser.id,
          name: rawName,
          email: profile?.email || activeUser.email || '',
          phone: profile?.phone || activeUser.phone || activeUser.user_metadata?.phone || '',
          primary_role: profile?.primary_role || userRole || 'Crew',
          primary_type: profile?.primary_type || 'IN_HOUSE',
          default_daily_rate: cleanRate,
          daily_rate: cleanRate,
          payout_frequency: cleanFreq,
          workspace_id: activeWorkspace?.workspaceId || loadedShoots[0]?.workspace_id || '',
          assignments: loadedShoots,
          salaries: loadedSalaries,
          deliverables: loadedDelivs,
        });
      } catch (err) {
        console.error('Error loading team portal data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCrewData();
  }, [router, activeWorkspace?.workspaceId]);

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const uniqueStudios = Array.from(new Set(shoots.map(s => s.studio_name).filter(Boolean)));

  const filteredShoots = useMemo(() => {
    return shoots.filter((s) => {
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
  }, [shoots, selectedStudio, activeTab, today]);

  // Combined Financial Metrics across Shoots + Deliverables + Salaries
  const totalShootAgreed = filteredShoots.reduce((acc, s) => acc + (Number(s.agreed_amount) || 0), 0);
  const totalShootPaid = filteredShoots.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0);
  const totalShootBalance = filteredShoots.reduce((acc, s) => acc + (Number(s.balance_amount) || 0), 0);

  const totalDelivAgreed = deliverables.reduce((acc, d) => acc + (Number(d.agreed_amount) || 0), 0);
  const totalDelivPaid = deliverables.reduce((acc, d) => acc + (Number(d.paid_amount) || 0), 0);
  const totalDelivBalance = deliverables.reduce((acc, d) => acc + (Number(d.balance_amount) || 0), 0);

  const totalSalaryAgreed = salaries.reduce((acc, s) => acc + (Number(s.base_salary) || 0), 0);
  const totalSalaryPaid = salaries.reduce((acc, s) => acc + (Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0), 0);

  const grandAgreed = totalShootAgreed + totalDelivAgreed + totalSalaryAgreed;
  const grandPaid = totalShootPaid + totalDelivPaid + totalSalaryPaid;
  const grandBalance = totalShootBalance + totalDelivBalance;

  const studioCode = activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || '';
  const attendanceUrl = studioCode ? `/team/attendance?studio=${encodeURIComponent(studioCode)}` : '/team/attendance';

  return (
    <SidebarLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-[#92400e] border border-amber-200 font-black">
                Crew &amp; Freelancer Portal
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-500">{userRole || 'Crew Member'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 tracking-tight">
              My Assigned Work &amp; Schedule
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
              View live call times, post-production edits, monthly salary slips, and payment statuses.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (currentMemberProfile) {
                  setSelectedDeliverablesMember({
                    ...currentMemberProfile,
                    studio_name: selectedStudio !== 'all' ? selectedStudio : (shoots[0]?.studio_name || workspaceName)
                  });
                  setIsDeliverablesModalOpen(true);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Open full assigned shoots, deliverables & invoices in Read-Only mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Deliverables &amp; Invoices</span>
            </button>

            <Link
              href="/team/finance"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              title="Open full transparent financial ledger and salary slips"
            >
              <IndianRupee className="w-3.5 h-3.5 text-emerald-200" />
              <span>Finance &amp; Payouts</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (currentMemberProfile) {
                  setSelectedFinanceMember({
                    ...currentMemberProfile,
                    studio_name: selectedStudio !== 'all' ? selectedStudio : (shoots[0]?.studio_name || workspaceName)
                  });
                  setFinanceInitialTab('bookings');
                  setIsFinanceDrawerOpen(true);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-amber-300 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-stone-800"
              title="Open financial breakdown, payments, and salary slips"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Financial Ledger</span>
            </button>

            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Smart Attendance Quick Access Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-emerald-950">Daily Smart Attendance &amp; Punch</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-bold">Live</span>
              </div>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Mark your daily shift punch-in/out, live timer, and view complete monthly calendar attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={attendanceUrl}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Open Attendance Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL ASSIGNED WORK</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-zinc-900 font-serif">
              {shoots.length + deliverables.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {shoots.length} Shoots • {deliverables.length} Deliverables • {salaries.length} Salary Slips
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL AGREED COMMERCIALS</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600 font-serif">₹{grandAgreed.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600/80 mt-1 font-bold">₹{grandPaid.toLocaleString('en-IN')} Received</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>PENDING BALANCE (AANA BAKI)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#b45309] font-serif">₹{grandBalance.toLocaleString('en-IN')}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              {grandBalance > 0 ? 'Pending disbursement from studio' : 'All payouts fully cleared'}
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs: Shoots vs Post-Production vs Salary Slips */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#EBE7DF] rounded-xl overflow-x-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setDashboardTab('shoots')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'shoots' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Assigned Shoots ({shoots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('deliverables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'deliverables' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Post-Production &amp; Edits ({deliverables.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('salaries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'salaries' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Salary Slips ({salaries.length})</span>
          </button>
        </div>

        {/* TAB 1: Assigned Shoots List */}
        {dashboardTab === 'shoots' && (
          <div className="space-y-4">
            {/* Sub-Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  All ({shoots.length})
                </button>
              </div>

              {uniqueStudios.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-bold uppercase">Studio:</span>
                  <select
                    value={selectedStudio}
                    onChange={(e) => setSelectedStudio(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-xl text-xs font-bold text-zinc-700 shadow-2xs focus:outline-none"
                  >
                    <option value="all">All Studios</option>
                    {uniqueStudios.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF]">
                <div className="animate-spin w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-xs font-bold text-zinc-500">Loading your assignments...</p>
              </div>
            ) : filteredShoots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Briefcase className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Shoots Found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {activeTab === 'upcoming' 
                    ? 'You have no upcoming shoots scheduled at this moment.' 
                    : 'No shoots found under the selected filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShoots.map((shoot) => (
                  <div
                    key={shoot.assignment_id}
                    onClick={() => {
                      if (currentMemberProfile) {
                        setSelectedDeliverablesMember({
                          ...currentMemberProfile,
                          studio_name: shoot.studio_name || workspaceName
                        });
                        setIsDeliverablesModalOpen(true);
                      }
                    }}
                    className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {shoot.studio_name}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          {shoot.role_name}
                        </span>
                      </div>

                      <h3 className="text-base font-serif font-black text-zinc-900 group-hover:text-amber-800 transition line-clamp-1">
                        {shoot.couple_name}
                      </h3>
                      <p className="text-xs font-bold text-amber-700 mt-0.5">{shoot.event_name}</p>

                      <div className="mt-4 space-y-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-bold">{shoot.event_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{shoot.start_time || 'TBD'} - {shoot.end_time || 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{shoot.venue_location || 'Venue TBD'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-black block">Agreed Fee</span>
                        <span className="text-sm font-black text-zinc-900 font-mono">
                          ₹{shoot.agreed_amount?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          shoot.payment_status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-[#92400e] border border-amber-200'
                        }`}>
                          {shoot.payment_status?.toUpperCase()}
                        </span>

                        <span className="text-xs font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Post-Production Deliverables List */}
        {dashboardTab === 'deliverables' && (
          <div className="space-y-4">
            {deliverables.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Sparkles className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Post-Production Deliverables Assigned</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When projects or deliverables (teaser, film, photos, albums) are assigned to you by the studio owner, they will be listed here with live statuses and due dates.
                </p>
                <Link
                  href="/workspace/post-production"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs mt-2"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Open Post-Production Suite</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliverables.map((deliv) => {
                  const agreed = Number(deliv.agreed_amount) || 0;
                  const paid = Number(deliv.paid_amount) || 0;
                  const balance = Number(deliv.balance_amount) || 0;
                  const isSettled = balance <= 0 && agreed > 0;

                  return (
                    <div
                      key={deliv.id}
                      className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {deliv.segment || 'Wedding'} • {deliv.category || 'Deliverable'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : agreed === 0
                              ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isSettled ? '✓ Fully Paid' : agreed === 0 ? 'Rate TBD' : `Pending ₹${balance.toLocaleString('en-IN')}`}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-zinc-900 group-hover:text-amber-800 transition line-clamp-1">
                          {deliv.client_name || 'Client Project'}
                        </h3>
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{deliv.title}</span>
                        </p>

                        <div className="mt-3.5 space-y-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 font-medium">Due Date:</span>
                            <span className="font-bold text-zinc-800">{deliv.due_date || 'TBD'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 font-medium">Production Status:</span>
                            <span className="font-bold text-amber-800">{deliv.status}</span>
                          </div>
                          {deliv.specs && (
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500 font-medium">Specs:</span>
                              <span className="font-bold text-zinc-800">{deliv.specs}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-[9px] text-zinc-400 uppercase font-black block">Agreed</span>
                            <span className="font-black text-zinc-900 font-mono text-sm">₹{agreed.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-zinc-200">|</div>
                          <div>
                            <span className="text-[9px] text-zinc-400 uppercase font-black block">Paid</span>
                            <span className="font-black text-emerald-600 font-mono text-sm">₹{paid.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <Link
                          href="/workspace/post-production"
                          className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <span>Open Suite</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Salary Slips List */}
        {dashboardTab === 'salaries' && (
          <div className="space-y-4">
            {salaries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Salary Slips Generated Yet</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When your studio owner generates a monthly salary slip or payout voucher, it will automatically appear here with a 1-click download button.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#EBE7DF] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 font-black uppercase text-[10px] border-b border-zinc-200">
                      <tr>
                        <th className="p-3.5">Month / Year</th>
                        <th className="p-3.5">Base Salary</th>
                        <th className="p-3.5">Incentives</th>
                        <th className="p-3.5">Deductions</th>
                        <th className="p-3.5">Net Paid</th>
                        <th className="p-3.5">Payment Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {salaries.map((s, idx) => {
                        const netPayable = Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0;
                        const isPaid = (s.status || s.payment_status || '').toUpperCase() === 'PAID';

                        return (
                          <tr key={s.id || idx} className="hover:bg-zinc-50/70 transition">
                            <td className="p-3.5 font-black text-zinc-900 font-mono">
                              {s.month_year || 'Current Month'}
                            </td>
                            <td className="p-3.5 text-zinc-700 font-mono font-bold">
                              ₹{(Number(s.base_salary) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-emerald-600 font-mono font-bold">
                              +₹{(Number(s.incentive_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-rose-500 font-mono font-bold">
                              -₹{(Number(s.deductions ?? s.deduction_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-900 font-mono font-black text-sm">
                              ₹{netPayable.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-500">
                              {s.paid_date || s.payout_date || 'Processing'}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {isPaid ? 'PAID' : 'PENDING'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentMemberProfile) {
                                    setSelectedFinanceMember(currentMemberProfile);
                                    setFinanceInitialTab('payroll');
                                    setIsFinanceDrawerOpen(true);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-amber-700" />
                                <span>Download Slip</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Read-Only Vendor & Crew Assignments, Deliverables & Invoicing Modal */}
        {selectedDeliverablesMember && (
          <VendorAlbumDeliverablesModal
            isOpen={isDeliverablesModalOpen}
            onClose={() => {
              setIsDeliverablesModalOpen(false);
              setSelectedDeliverablesMember(null);
            }}
            workspaceId={selectedDeliverablesMember.workspace_id || ''}
            vendor={selectedDeliverablesMember}
            studioName={selectedDeliverablesMember.studio_name || workspaceName || 'Partner Studio'}
            isReadOnly={true}
            onOpenSalaryDrawer={(m) => {
              setSelectedFinanceMember(m || selectedDeliverablesMember);
              setFinanceInitialTab('payroll');
              setIsFinanceDrawerOpen(true);
            }}
          />
        )}

        {/* Read-Only Financial Breakdown & Salary Slips Drawer */}
        <TeamMemberFinanceDrawer
          isOpen={isFinanceDrawerOpen}
          initialTab={financeInitialTab}
          onClose={() => {
            setIsFinanceDrawerOpen(false);
            setSelectedFinanceMember(null);
          }}
          workspaceId={selectedFinanceMember?.workspace_id || ''}
          workspaceName={selectedFinanceMember?.studio_name || workspaceName || 'StudioCore Partner Studio'}
          member={selectedFinanceMember || currentMemberProfile}
          isReadOnly={true}
        />

      </div>
    </SidebarLayout>
  );
}
