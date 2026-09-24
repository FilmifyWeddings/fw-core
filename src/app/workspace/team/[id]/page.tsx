'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserX, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import VendorAlbumDeliverablesModal from '@/components/vendors/VendorAlbumDeliverablesModal';
import TeamMemberFinanceDrawer from '../components/TeamMemberFinanceDrawer';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  primary_role: string;
  role?: string;
  primary_type?: string;
  avatar_url?: string;
  default_daily_rate?: number;
  roles?: string[];
  member_types?: string[];
  [key: string]: any;
}

export default function DedicatedTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const memberId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const { workspaceId, workspaceName, activeWorkspace, isOwner } = useWorkspace();
  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || activeWorkspace?.studioSlug || '';
  const studioName = workspaceName || activeWorkspace?.studioName || 'StudioCore Partner Studio';

  const [member, setMember] = useState<TeamMember | null>(() => {
    if (typeof window !== 'undefined' && memberId) {
      try {
        const cached = sessionStorage.getItem(`sc_team_member_${memberId}`) || localStorage.getItem(`sc_team_member_${memberId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (_) {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!member);
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<TeamMember | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);

  const fetchMember = useCallback(async () => {
    if (!memberId) return;
    try {
      // 1. Try querying workspace_members table
      const { data: wsMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('id', memberId)
        .maybeSingle();

      if (wsMember) {
        const formatted: TeamMember = {
          id: wsMember.id,
          name: wsMember.name || 'Team Specialist',
          email: wsMember.email || '',
          phone: wsMember.phone || '',
          primary_role: wsMember.primary_role || 'FREELANCER',
          role: wsMember.primary_role || 'FREELANCER',
          primary_type: wsMember.primary_type || 'IN_HOUSE',
          avatar_url: wsMember.avatar_url || '',
          default_daily_rate: wsMember.default_daily_rate || 0,
          roles: wsMember.roles || [wsMember.primary_role || 'FREELANCER'],
          member_types: wsMember.member_types || [wsMember.primary_type || 'IN_HOUSE'],
        };
        setMember(formatted);
        try {
          sessionStorage.setItem(`sc_team_member_${memberId}`, JSON.stringify(formatted));
        } catch (_) {}
        setLoading(false);
        return;
      }

      // 2. Fallback to fw_team_members
      const { data: fwMember } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('id', memberId)
        .maybeSingle();

      if (fwMember) {
        const formatted: TeamMember = {
          id: fwMember.id,
          name: fwMember.name || 'Team Specialist',
          email: fwMember.email || '',
          phone: fwMember.phone_number ? `${fwMember.country_code || '+91'} ${fwMember.phone_number}` : '',
          primary_role: fwMember.primary_role || 'Crew',
          role: fwMember.primary_role || 'Crew',
          primary_type: fwMember.primary_type || 'IN_HOUSE',
          avatar_url: fwMember.avatar_url || '',
          default_daily_rate: fwMember.default_daily_rate || 0,
          roles: [fwMember.primary_role || 'Crew'],
          member_types: fwMember.member_types || ['IN_HOUSE'],
        };
        setMember(formatted);
        try {
          sessionStorage.setItem(`sc_team_member_${memberId}`, JSON.stringify(formatted));
        } catch (_) {}
        setLoading(false);
        return;
      }

      // 3. Fallback to /api/workspace/members
      if (effectiveWsId) {
        const res = await fetch(`/api/workspace/members?workspace_id=${encodeURIComponent(effectiveWsId)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          const found = json.members.find((m: any) => m.id === memberId);
          if (found) {
            setMember(found);
            try {
              sessionStorage.setItem(`sc_team_member_${memberId}`, JSON.stringify(found));
            } catch (_) {}
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[DedicatedTeamMemberPage] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [memberId, effectiveWsId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  if (loading && !member) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-[#FAF8F2]">
        <StudioCoreLiquidLoader label="Opening partner dashboard..." />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#FAF8F2] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
          <UserX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900">Member Not Found</h2>
        <p className="text-sm font-medium text-stone-600 max-w-md">
          The requested team member or partner assignment record could not be located in this workspace.
        </p>
        <button
          type="button"
          onClick={() => router.push('/workspace/team')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Team & Partners</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col bg-[#FAF8F2]">
      <VendorAlbumDeliverablesModal
        isOpen={true}
        isPageMode={true}
        workspaceId={effectiveWsId}
        vendor={member}
        studioName={studioName}
        onClose={() => router.push('/workspace/team')}
        onOpenSalaryDrawer={(m) => {
          setSelectedFinanceMember(m);
          setIsFinanceDrawerOpen(true);
        }}
      />

      {/* Financial & Event Compensation Drawer */}
      <TeamMemberFinanceDrawer
        isOpen={isFinanceDrawerOpen}
        onClose={() => {
          setIsFinanceDrawerOpen(false);
          setSelectedFinanceMember(null);
        }}
        workspaceId={effectiveWsId}
        workspaceName={studioName}
        member={selectedFinanceMember}
        initialSummary={null}
        onFinancialUpdate={() => {
          fetchMember();
        }}
      />
    </div>
  );
}
