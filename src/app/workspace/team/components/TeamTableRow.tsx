'use client';

import React from 'react';
import { 
  ShieldCheck, UserCheck, Users, FileText, Film, DollarSign, Eye, Pencil, Trash2 
} from 'lucide-react';

interface TeamTableRowProps {
  member: any;
  handleOpenDetails: (member: any) => void;
  handleEditMember: (member: any) => void;
  handleDeleteMember: (memberId: string) => void;
  fin?: any;
}

export default function TeamTableRow({
  member,
  handleOpenDetails,
  handleEditMember,
  handleDeleteMember,
  fin,
}: TeamTableRowProps) {
  // Commercials must strictly show what is explicitly saved in the member's profile or sum of explicit event payouts:
  // If no agreed contract or event amount is set, IT MUST BE 0.
  
  // Calculate strictly from explicit event assignments where agreed_amount > 0:
  const explicitAgreed = Array.isArray(member.events)
    ? member.events.reduce((sum: number, ev: any) => {
        const raw = Number(ev.agreed_amount) || 0;
        const isSynthetic = raw === 18000 || (member.default_daily_rate && raw === Number(member.default_daily_rate));
        const val = isSynthetic ? (Number(ev.custom_payout) || 0) : raw;
        return sum + val;
      }, 0)
    : 0;

  // Outer Agreed Amount:
  const displayAgreed = Number(member.commercial_agreed) || explicitAgreed || 0;
  const displayPaid = displayAgreed === 0 ? 0 : (Number(member.commercial_paid) || 0);
  const displayBalance = displayAgreed === 0 ? 0 : Math.max(0, displayAgreed - displayPaid);

  const isFreelancer = member.primary_type === 'FREELANCER' || member.member_types?.includes('FREELANCER') || member.type === 'freelancer';
  const isPartner = member.primary_type === 'PARTNER' || member.member_types?.includes('PARTNER') || member.type === 'partner';
  const memberTypeLabel = isPartner ? 'Partner' : isFreelancer ? 'Freelancer' : (member.primary_type || 'In-House');

  // Safe portal access resolution - eliminates raw DB metadata dump completely
  const crmAccess = member.crm_access || member.permissions?.leads_access || member.permissions?.crm_access;
  const teamAccess = member.team_access || member.permissions?.team_manager_access || member.permissions?.team_access;
  const quotationsAccess = member.quotations_access || member.permissions?.quotations_access;
  const postProductionAccess = member.post_production_access || member.permissions?.post_production_access;
  const financeAccess = member.finance_access || member.permissions?.finance_access;
  const isAdmin = member.is_admin || member.role === 'admin' || member.role === 'owner' || member.primary_type === 'ADMIN' || member.permissions?.is_admin;

  const isGranted = (val: any) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return !['none', 'hidden', 'false', '0', 'undefined', 'null'].includes(s);
  };

  const hasAnyAccess = Boolean(
    isAdmin || 
    isGranted(crmAccess) || 
    isGranted(teamAccess) || 
    isGranted(quotationsAccess) || 
    isGranted(postProductionAccess) || 
    isGranted(financeAccess)
  );

  return (
    <div 
      onClick={() => handleOpenDetails(member)}
      className="px-4 py-3.5 sm:px-5 hover:bg-slate-50/70 transition-colors grid grid-cols-12 gap-4 items-center cursor-pointer"
    >
      {/* 1. Member Profile & Name (Clickable) */}
      <div className="col-span-4 flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-slate-200">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover"/>
          ) : (
            <span>{member.name?.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-bold text-xs sm:text-sm text-slate-800 hover:text-indigo-600 truncate block transition-colors">
            {member.name}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
            {member.phone && <span>{member.phone}</span>}
            {member.phone && member.email && <span>•</span>}
            {member.email && <span className="truncate">{member.email}</span>}
          </div>
        </div>
      </div>

      {/* 2. Type & Role */}
      <div className="col-span-2 flex flex-wrap items-center gap-1.5 w-full">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
          isPartner 
            ? 'bg-purple-100 text-purple-700' 
            : isFreelancer 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-emerald-100 text-emerald-700'
        }`}>
          {memberTypeLabel}
        </span>
        {(member.roles && member.roles.length > 0 ? member.roles : [member.primary_role]).filter(Boolean).map((r: string, idx: number) => (
          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
            {r}
          </span>
        ))}
      </div>

      {/* 3. Commercials (Agreed / Paid / Balance) */}
      <div className="col-span-3 w-full flex items-center gap-3 text-xs">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Agreed</span>
          <span className="font-bold text-slate-700">₹{displayAgreed.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-5 w-px bg-slate-200"></div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Paid</span>
          <span className="font-bold text-emerald-600">₹{displayPaid.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-5 w-px bg-slate-200"></div>
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Balance</span>
          <span className="font-bold text-amber-600">₹{displayBalance.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* 4. Portal Access (Clean Distinct Micro-Icon Badges) */}
      <div className="col-span-2 flex flex-wrap gap-1.5 items-center w-full">
        {/* Admin / Full Access */}
        {isAdmin && (
          <div 
            title="Admin / Full Access"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/70 text-[10px] font-bold"
          >
            <ShieldCheck className="w-3 h-3 text-indigo-600"/>
            <span className="hidden lg:inline">Admin</span>
          </div>
        )}

        {/* Leads & CRM Access */}
        {isGranted(crmAccess) && (
          <div 
            title={`Leads / CRM: ${crmAccess}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/70 text-[10px] font-bold"
          >
            <UserCheck className="w-3 h-3 text-blue-600"/>
            <span className="hidden lg:inline">CRM</span>
          </div>
        )}

        {/* Team Portal Access */}
        {isGranted(teamAccess) && (
          <div 
            title={`Team Manager: ${teamAccess}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/70 text-[10px] font-bold"
          >
            <Users className="w-3 h-3 text-purple-600"/>
            <span className="hidden lg:inline">Team</span>
          </div>
        )}

        {/* Quotations Access */}
        {isGranted(quotationsAccess) && (
          <div 
            title={`Quotations: ${quotationsAccess}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/70 text-[10px] font-bold"
          >
            <FileText className="w-3 h-3 text-amber-600"/>
            <span className="hidden lg:inline">Quotes</span>
          </div>
        )}

        {/* Post-Production Access */}
        {isGranted(postProductionAccess) && (
          <div 
            title={`Post Production: ${postProductionAccess}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/70 text-[10px] font-bold"
          >
            <Film className="w-3 h-3 text-rose-600"/>
            <span className="hidden lg:inline">Post</span>
          </div>
        )}

        {/* Finance Access */}
        {isGranted(financeAccess) && (
          <div 
            title={`Finance: ${financeAccess}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-[10px] font-bold"
          >
            <DollarSign className="w-3 h-3 text-emerald-600"/>
            <span className="hidden lg:inline">Finance</span>
          </div>
        )}

        {!hasAnyAccess && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-400 font-medium border border-slate-200/60">
            No Access
          </span>
        )}
      </div>

      {/* 5. Direct Action Icons */}
      <div className="col-span-1 flex items-center justify-end gap-1.5 w-full md:w-auto">
        <button
          type="button"
          title="View Details"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(member);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4"/>
        </button>
        <button
          type="button"
          title="Edit Member"
          onClick={(e) => {
            e.stopPropagation();
            handleEditMember(member);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
        >
          <Pencil className="w-4 h-4"/>
        </button>
        <button
          type="button"
          title="Delete Member"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteMember(member.id);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}
