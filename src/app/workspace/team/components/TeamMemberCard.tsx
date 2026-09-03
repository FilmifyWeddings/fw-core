'use client';

import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

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

  const agreedVal = agreed ?? member.agreed ?? 0;
  const paidVal = paid ?? member.paid ?? 0;
  const balanceVal = balance ?? member.balance ?? 0;
  const rolesList: string[] = (member.roles && member.roles.length > 0) ? member.roles : (member.primary_role ? [member.primary_role] : []);

  // Filter and map permissions micro-badges
  const activePermissions = useMemo(() => {
    const list: { key: string; val: string }[] = [];
    const p = member.permissions || {};

    Object.entries(p).forEach(([k, v]) => {
      const valStr = String(v);
      if (!valStr || valStr.toLowerCase().includes('hidden') || valStr.toLowerCase() === 'false' || valStr.toLowerCase() === 'none') return;
      const cleanKey = k.replace(/_access$/i, '').replace(/_/g, ' ');
      const cleanVal = valStr.replace(/_/g, ' ');
      list.push({ key: cleanKey, val: cleanVal });
    });

    if (member.crm_access && !list.some(item => item.key.toLowerCase().includes('crm') || item.key.toLowerCase().includes('lead'))) {
      const valStr = String(member.crm_access);
      if (!valStr.toLowerCase().includes('hidden') && !valStr.toLowerCase().includes('none')) {
        list.push({ key: 'CRM', val: valStr });
      }
    }

    if (member.team_access && !list.some(item => item.key.toLowerCase().includes('team'))) {
      const valStr = String(member.team_access);
      if (!valStr.toLowerCase().includes('hidden') && !valStr.toLowerCase().includes('none')) {
        list.push({ key: 'Team', val: valStr });
      }
    }

    return list;
  }, [member]);

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
          <div><span className="text-slate-400 text-[8px] uppercase">Agr: </span><span className="font-bold text-slate-700">₹{agreedVal.toLocaleString('en-IN')}</span></div>
          <div><span className="text-slate-400 text-[8px] uppercase">Paid: </span><span className="font-bold text-emerald-600">₹{paidVal.toLocaleString('en-IN')}</span></div>
          <div><span className="text-slate-400 text-[8px] uppercase">Bal: </span><span className="font-bold text-amber-600">₹{balanceVal.toLocaleString('en-IN')}</span></div>
        </div>
      </div>

      {/* Bottom: All Granted Portal Access Micro Badges */}
      {activePermissions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {activePermissions.map(({ key, val }) => (
            <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200/60 capitalize">
              {key}: {val}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
