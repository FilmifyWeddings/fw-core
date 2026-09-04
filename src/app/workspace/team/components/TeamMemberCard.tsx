'use client';

import React from 'react';
import { 
  Eye, 
  Pencil, 
  Trash2,
  UserCheck,      // Leads & CRM
  Users,          // Team & Partners
  FileText,       // Quotations & Proposals
  Film,           // Post-Production
  DollarSign,     // Finance & Payments
  ShieldCheck     // Admin / Full Access
} from 'lucide-react';

export interface TeamMemberCardProps {
  member: any;
  agreed?: number;
  paid?: number;
  balance?: number;
  handleOpenDetails: (member: any) => void;
  handleEditMember: (member: any) => void;
  handleDeleteMember: (memberId: string) => void;
}

export default function TeamMemberCard({
  member,
  agreed,
  paid,
  balance,
  handleOpenDetails,
  handleEditMember,
  handleDeleteMember,
}: TeamMemberCardProps) {
  const isFreelancer = member.type === 'freelancer' || member.primary_type === 'FREELANCER' || member.member_types?.includes('FREELANCER');
  const isPartner = member.type === 'partner' || member.primary_type === 'PARTNER' || member.member_types?.includes('PARTNER');
  const typeLabel = isPartner ? 'Partner' : isFreelancer ? 'Freelancer' : (member.type || member.primary_type || 'In-House');

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
  const rolesList: string[] = (member.roles && member.roles.length > 0) ? member.roles : (member.primary_role ? [member.primary_role] : []);

  // Safe portal access resolution - eliminates raw DB metadata dump completely
  const crmAccess = member.crm_access || member.permissions?.leads_access || member.permissions?.crm_access;
  const teamAccess = member.team_access || member.permissions?.team_manager_access || member.permissions?.team_access;
  const quotationsAccess = member.quotations_access || member.permissions?.quotations_access;
  const postProductionAccess = member.post_production_access || member.permissions?.post_production_access;
  const financeAccess = member.finance_access || member.permissions?.finance_access;
  const isAdmin = member.is_admin || member.role === 'admin' || member.role === 'owner' || member.primary_type === 'ADMIN' || member.permissions?.is_admin;

  const resolvedMember = {
    ...member,
    crm_access: crmAccess,
    team_access: teamAccess,
    quotations_access: quotationsAccess,
    post_production_access: postProductionAccess,
    finance_access: financeAccess,
    is_admin: isAdmin,
  };

  const hasAnyAccess = Boolean(
    resolvedMember.is_admin ||
    (resolvedMember.crm_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.crm_access).toLowerCase())) ||
    (resolvedMember.team_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.team_access).toLowerCase())) ||
    (resolvedMember.quotations_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.quotations_access).toLowerCase())) ||
    (resolvedMember.post_production_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.post_production_access).toLowerCase())) ||
    (resolvedMember.finance_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.finance_access).toLowerCase()))
  );

  return (
    <div 
      onClick={() => handleOpenDetails(member)}
      className="relative bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
    >
      {/* Top Header Row: Avatar + Name/Phone/Email + Top-Right Action Icons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-slate-200">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover"/>
            ) : (
              <span>{member.name?.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Name, Phone, and Email vertically stacked */}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">
              {member.name}
            </h4>
            {/* Phone number */}
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5 leading-tight">
              {member.phone || member.phone_number || 'No phone'}
            </p>
            {/* Email strictly below phone */}
            <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
              {member.email || 'No email'}
            </p>
          </div>
        </div>

        {/* Top Right Direct Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Details"
            onClick={() => handleOpenDetails(member)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5"/>
          </button>
          <button
            type="button"
            title="Edit"
            onClick={() => handleEditMember(member)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5"/>
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => handleDeleteMember(member.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>

      {/* Middle: Type, Roles & Commercials */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
            isPartner 
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : isFreelancer 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {typeLabel}
          </span>
          {rolesList.map((r: string, idx: number) => (
            <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600 font-medium">
              {r}
            </span>
          ))}
        </div>

        {/* Compact Commercials */}
        <div className="flex items-center gap-2 text-[10px]">
          <div><span className="text-slate-400 text-[8px] uppercase">Agr: </span><span className="font-bold text-slate-700">₹{displayAgreed.toLocaleString('en-IN')}</span></div>
          <div><span className="text-slate-400 text-[8px] uppercase">Paid: </span><span className="font-bold text-emerald-600">₹{displayPaid.toLocaleString('en-IN')}</span></div>
          <div><span className="text-slate-400 text-[8px] uppercase">Bal: </span><span className="font-bold text-amber-600">₹{displayBalance.toLocaleString('en-IN')}</span></div>
        </div>
      </div>

      {/* Bottom: Clean Portal Access Strip */}
      {hasAnyAccess && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-slate-50">
          {/* Admin / Full Access */}
          {resolvedMember.is_admin && (
            <div 
              title="Admin / Full Access"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/70 text-[10px] font-bold"
            >
              <ShieldCheck className="w-3 h-3 text-indigo-600"/>
              <span className="hidden sm:inline">Admin</span>
            </div>
          )}

          {/* Leads & CRM Access */}
          {resolvedMember.crm_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.crm_access).toLowerCase()) && (
            <div 
              title={`Leads / CRM: ${resolvedMember.crm_access}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/70 text-[10px] font-bold"
            >
              <UserCheck className="w-3 h-3 text-blue-600"/>
              <span className="hidden sm:inline">CRM</span>
            </div>
          )}

          {/* Team Portal Access */}
          {resolvedMember.team_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.team_access).toLowerCase()) && (
            <div 
              title={`Team Manager: ${resolvedMember.team_access}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/70 text-[10px] font-bold"
            >
              <Users className="w-3 h-3 text-purple-600"/>
              <span className="hidden sm:inline">Team</span>
            </div>
          )}

          {/* Quotations Access */}
          {resolvedMember.quotations_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.quotations_access).toLowerCase()) && (
            <div 
              title={`Quotations: ${resolvedMember.quotations_access}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/70 text-[10px] font-bold"
            >
              <FileText className="w-3 h-3 text-amber-600"/>
              <span className="hidden sm:inline">Quotes</span>
            </div>
          )}

          {/* Post-Production Access */}
          {resolvedMember.post_production_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.post_production_access).toLowerCase()) && (
            <div 
              title={`Post Production: ${resolvedMember.post_production_access}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/70 text-[10px] font-bold"
            >
              <Film className="w-3 h-3 text-rose-600"/>
              <span className="hidden sm:inline">Post</span>
            </div>
          )}

          {/* Finance Access */}
          {resolvedMember.finance_access && !['none', 'hidden', 'false'].includes(String(resolvedMember.finance_access).toLowerCase()) && (
            <div 
              title={`Finance: ${resolvedMember.finance_access}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-[10px] font-bold"
            >
              <DollarSign className="w-3 h-3 text-emerald-600"/>
              <span className="hidden sm:inline">Finance</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
