'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import {
  IndianRupee,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Eye,
  Download,
  Filter,
  Sparkles,
  Receipt,
  User,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import VendorAlbumDeliverablesModal from '@/components/vendors/VendorAlbumDeliverablesModal';
import TeamMemberFinanceDrawer from '@/app/workspace/team/components/TeamMemberFinanceDrawer';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

interface ShootFinancial {
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

export default function TeamFinancePage() {
  const router = useRouter();
  const { workspaceName, activeWorkspace, userRole } = useWorkspace();
  const [shoots, setShoots] = useState<ShootFinancial[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [activeTab, setActiveTab] = useState<'shoots' | 'salaries'>('shoots');

  // Transparency Read-Only Modals
  const [selectedDeliverablesMember, setSelectedDeliverablesMember] = useState<any | null>(null);
  const [isDeliverablesModalOpen, setIsDeliverablesModalOpen] = useState(false);
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<any | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [financeInitialTab, setFinanceInitialTab] = useState<'bookings' | 'payroll' | 'analytics'>('bookings');
  const [currentMemberProfile, setCurrentMemberProfile] = useState<any | null>(null);

  // Load crew data and salaries
  const loadFinanceData = async () => {
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
      const res = await fetch('/api/team/shoots', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const loadedShoots = (json.success && Array.isArray(json.shoots)) ? json.shoots : [];
      setShoots(loadedShoots);

      // Fetch Salary Slips from team_salary_slips & team_salary_records
      let slipRows: any[] = [];
      try {
        const { data: slips } = await supabase
          .from('team_salary_slips')
          .select('*')
          .eq('member_id', activeUser.id)
          .order('month_year', { ascending: false });
        if (slips && slips.length > 0) {
          slipRows = slips;
        } else {
          const { data: recs } = await supabase
            .from('team_salary_records')
            .select('*')
            .eq('member_id', activeUser.id)
            .order('month_year', { ascending: false });
          if (recs) slipRows = recs;
        }
      } catch (_) {}
      setSalaries(slipRows);

      // Rate details
      let rateRow: any = null;
      try {
        const { data: r } = await supabase
          .from('workspace_member_rates')
          .select('default_daily_rate, payout_frequency')
          .eq('team_member_id', activeUser.id)
          .maybeSingle();
        if (r) rateRow = r;
      } catch (_) {}

      const rawName = activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'Team Member';
      const cleanRate = Number(rateRow?.default_daily_rate || 0);
      const cleanFreq = rateRow?.payout_frequency || 'daily';

      setCurrentMemberProfile({
        id: activeUser.id,
        name: rawName,
        email: activeUser.email || '',
        phone: activeUser.phone || activeUser.user_metadata?.phone || '',
        primary_role: userRole || 'Crew',
        primary_type: 'IN_HOUSE',
        default_daily_rate: cleanRate,
        daily_rate: cleanRate,
        payout_frequency: cleanFreq,
        workspace_id: activeWorkspace?.workspaceId || loadedShoots[0]?.workspace_id || '',
        assignments: loadedShoots,
      });
    } catch (err) {
      console.error('[Team Finance Page] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [router, activeWorkspace?.workspaceId]);

  const uniqueStudios = Array.from(new Set(shoots.map(s => s.studio_name).filter(Boolean)));

  const filteredShoots = useMemo(() => {
    return shoots.filter((s) => {
      const matchesStudio = selectedStudio === 'all' || s.studio_name === selectedStudio;
      if (!matchesStudio) return false;

      const isPaid = (Number(s.balance_amount) <= 0 && Number(s.agreed_amount) > 0) || s.payment_status === 'PAID';
      if (statusFilter === 'paid' && !isPaid) return false;
      if (statusFilter === 'pending' && isPaid) return false;

      return true;
    });
  }, [shoots, selectedStudio, statusFilter]);

  // Combined Totals (Shoots + Salaries)
  const totalShootAgreed = filteredShoots.reduce((acc, s) => acc + (Number(s.agreed_amount) || 0), 0);
  const totalShootPaid = filteredShoots.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0);
  const totalShootBalance = filteredShoots.reduce((acc, s) => acc + (Number(s.balance_amount) || 0), 0);

  const totalSalaryNet = salaries.reduce((acc, s) => acc + (Number(s.net_payable ?? s.base_salary) || 0), 0);
  const totalSalaryPaid = salaries.reduce((acc, s) => acc + (Number(s.paid_amount ?? s.net_payable) || 0), 0);
  const totalSalaryBalance = Math.max(0, totalSalaryNet - totalSalaryPaid);

  const grandAgreed = totalShootAgreed + totalSalaryNet;
  const grandPaid = totalShootPaid + totalSalaryPaid;
  const grandBalance = totalShootBalance + totalSalaryBalance;
  const payoutPercentage = grandAgreed > 0 ? Math.min(100, Math.round((grandPaid / grandAgreed) * 100)) : 100;

  if (loading) {
    return <StudioCoreLiquidLoader label="Synchronizing Studio Financials..." />;
  }

  return (
    <SidebarLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#166534] border border-emerald-200 font-black flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live Studio Synchronized (Read-Only)
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-500">{userRole || 'Team Member'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 tracking-tight">
              My Finances &amp; Commercial Statements
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
              View your total agreed commercials, advance payouts received, pending balance, and official salary vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
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
              title="Open full interactive ledger"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Financial Ledger</span>
            </button>

            <button
              type="button"
              onClick={loadFinanceData}
              className="p-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 transition shadow-2xs cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <WorkspaceSwitcher />
          </div>
        </div>

        {/* 2. Top Financial KPI Cards (Clean Light UI) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Agreed */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-zinc-400">Total Agreed (Commercials)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-900 font-mono tracking-tight">
                ₹{grandAgreed.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                Total contracted amount across all assignments &amp; slips
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Assignments:</span>
              <span className="font-bold text-zinc-700">{filteredShoots.length} Shoots</span>
            </div>
          </div>

          {/* Card 2: Total Paid / Received */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-zinc-400">Paid to You (Received)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
                ₹{grandPaid.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                Total amount disbursed by studio owner(s)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Payout Cleared:</span>
              <span className="font-bold text-emerald-700">{payoutPercentage}% Completed</span>
            </div>
          </div>

          {/* Card 3: Pending Balance ("Kitna Aana Baki Hai") */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 border border-amber-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-amber-800">Remaining Balance (Aana Baki)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300/80">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-600 font-mono tracking-tight">
                ₹{grandBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-amber-900/80 mt-1 font-medium">
                {grandBalance > 0 ? 'Pending payout from studio owner' : 'All accounts fully settled 🎉'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
              <span>Status:</span>
              <span className="font-black text-amber-800">
                {grandBalance > 0 ? 'Pending Collection' : 'Zero Due'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Studio & Status Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#EBE7DF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tabs: Shoots vs Salaries */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('shoots')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'shoots' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Assigned Shoots ({shoots.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('salaries')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'salaries' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Salary Slips ({salaries.length})</span>
            </button>
          </div>

          {/* Right Sub-filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Studio Filter */}
            {uniqueStudios.length > 1 && (
              <select
                value={selectedStudio}
                onChange={(e) => setSelectedStudio(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Partner Studios</option>
                {uniqueStudios.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {/* Status Filter for Shoots */}
            {activeTab === 'shoots' && (
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending Due' },
                  { id: 'paid', label: 'Fully Paid' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      statusFilter === tab.id ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Tab 1: Assigned Shoots List */}
        {activeTab === 'shoots' && (
          <div className="space-y-3">
            {filteredShoots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Calendar className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Shoots Matching Filter</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Either no shoots have been assigned to your profile yet, or none match the selected status filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredShoots.map((shoot) => {
                  const agreed = Number(shoot.agreed_amount) || 0;
                  const paid = Number(shoot.paid_amount) || 0;
                  const balance = Number(shoot.balance_amount) || 0;
                  const isSettled = balance <= 0 && agreed > 0;

                  return (
                    <div
                      key={shoot.assignment_id}
                      className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        {/* Studio Tag & Payment Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {shoot.studio_name || 'StudioCore'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isSettled ? '✓ Fully Paid' : `Pending ₹${balance.toLocaleString('en-IN')}`}
                          </span>
                        </div>

                        {/* Event & Couple */}
                        <h4 className="text-base font-black text-zinc-900">
                          {shoot.event_name || 'Wedding Event'}
                        </h4>
                        <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                          {shoot.couple_name || shoot.client_name || 'Client Shoot'}
                        </p>

                        {/* Details Grid */}
                        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-bold">{shoot.event_date || 'Date TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{shoot.start_time || 'Full Day'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{shoot.venue_location || 'Venue Details via Studio'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 text-amber-800 font-bold">
                            <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Assigned Role: {shoot.role_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Commercials Summary Bar */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block">Agreed</span>
                            <span className="font-black text-zinc-900 font-mono">₹{agreed.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-zinc-300">|</div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block">Paid</span>
                            <span className="font-black text-emerald-600 font-mono">₹{paid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-zinc-300">|</div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block">Balance</span>
                            <span className="font-black text-amber-600 font-mono">₹{balance.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (currentMemberProfile) {
                              setSelectedDeliverablesMember({
                                ...currentMemberProfile,
                                studio_name: shoot.studio_name
                              });
                              setIsDeliverablesModalOpen(true);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Tab 2: Salary Slips List */}
        {activeTab === 'salaries' && (
          <div className="space-y-3">
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
                        const netPayable = Number(s.net_payable ?? s.base_salary) || 0;
                        const isPaid = s.payment_status === 'PAID' || s.status === 'PAID';

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

      </div>

      {/* Transparency Modals (100% Read-Only) */}
      {isDeliverablesModalOpen && selectedDeliverablesMember && (
        <VendorAlbumDeliverablesModal
          isOpen={isDeliverablesModalOpen}
          onClose={() => setIsDeliverablesModalOpen(false)}
          member={selectedDeliverablesMember}
          workspaceId={selectedDeliverablesMember.workspace_id || ''}
          workspaceName={selectedDeliverablesMember.studio_name || workspaceName}
          isReadOnly={true}
        />
      )}

      {isFinanceDrawerOpen && selectedFinanceMember && (
        <TeamMemberFinanceDrawer
          isOpen={isFinanceDrawerOpen}
          onClose={() => setIsFinanceDrawerOpen(false)}
          member={selectedFinanceMember}
          workspaceId={selectedFinanceMember.workspace_id || ''}
          initialTab={financeInitialTab}
          isReadOnly={true}
        />
      )}
    </SidebarLayout>
  );
}
