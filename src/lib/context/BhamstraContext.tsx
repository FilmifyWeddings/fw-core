'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface MemberPermissions {
  leads_access: 'NONE' | 'ASSIGNED_ONLY' | 'VIEW_ALL' | 'FULL_EDIT';
  quotations_access: 'NONE' | 'VIEW_ONLY' | 'MANAGE';
  team_manager_access: 'NONE' | 'VIEW_ASSIGNED' | 'MANAGE_ALL';
  post_production_access: 'NONE' | 'ASSIGNED_ONLY' | 'FULL_ACCESS';
  finance_access: 'NONE' | 'VIEW_ONLY' | 'MANAGE';
}

export interface WorkspaceOption {
  workspaceId: string;
  studioName: string;
  userRole: 'OWNER' | 'MANAGER' | 'FREELANCER' | 'PHOTOGRAPHER' | 'CINEMATOGRAPHER' | 'EDITOR' | 'ALBUM_LAB' | string;
  isOwner: boolean;
  memberId?: string;
  roles?: string[];
  permissions?: MemberPermissions;
  avatarUrl?: string;
  ownerEmail?: string;
}

interface WorkspaceConfig {
  logoUrl?: string;
  themeColor?: string;
  customDomain?: string;
  pinLockEnabled?: boolean;
}

const DEFAULT_OWNER_PERMISSIONS: MemberPermissions = {
  leads_access: 'FULL_EDIT',
  quotations_access: 'MANAGE',
  team_manager_access: 'MANAGE_ALL',
  post_production_access: 'FULL_ACCESS',
  finance_access: 'MANAGE',
};

const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  leads_access: 'NONE',
  quotations_access: 'NONE',
  team_manager_access: 'VIEW_ASSIGNED',
  post_production_access: 'ASSIGNED_ONLY',
  finance_access: 'NONE',
};

interface BhamstraContextType {
  userId: string | null;
  userEmail: string | null;
  workspaceId: string | null;
  workspaceName: string;
  activeWorkspace: WorkspaceOption | null;
  availableWorkspaces: WorkspaceOption[];
  isOwner: boolean;
  userRole: string;
  permissions: MemberPermissions;
  activeEventId: string | null;
  currentClientStatus: 'lead' | 'client' | 'event' | null;
  sessionShootState: 'reached' | 'started' | 'end' | 'completed' | null;
  workspaceConfig: WorkspaceConfig;
  loading: boolean;
  setActiveEventId: (eventId: string | null) => void;
  setCurrentClientStatus: (status: 'lead' | 'client' | 'event' | null) => void;
  setSessionShootState: (state: 'reached' | 'started' | 'end' | 'completed' | null) => void;
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
}

const BhamstraContext = createContext<BhamstraContextType | undefined>(undefined);

export function BhamstraProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('My Studio');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceOption | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('OWNER');
  const [permissions, setPermissions] = useState<MemberPermissions>(DEFAULT_OWNER_PERMISSIONS);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [currentClientStatus, setCurrentClientStatus] = useState<'lead' | 'client' | 'event' | null>(null);
  const [sessionShootState, setSessionShootState] = useState<'reached' | 'started' | 'end' | 'completed' | null>(null);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>({});
  const [loading, setLoading] = useState(true);

  const refreshContext = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUserId(null);
        setUserEmail(null);
        setWorkspaceId(null);
        setAvailableWorkspaces([]);
        setActiveWorkspace(null);
        setLoading(false);
        return;
      }

      const uId = session.user.id;
      const uEmail = session.user.email || '';
      setUserId(uId);
      setUserEmail(uEmail || null);

      // 1. Fetch user's own profile (Primary Studio)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .maybeSingle();

      const ownerStudioName = profile?.workspace_name || session.user.user_metadata?.workspace_name || 'My Studio';

      const ownerOption: WorkspaceOption = {
        workspaceId: uId,
        studioName: ownerStudioName,
        userRole: 'OWNER',
        isOwner: true,
        permissions: DEFAULT_OWNER_PERMISSIONS,
        avatarUrl: profile?.avatar_url || profile?.logo_url || session.user.user_metadata?.avatar_url || '',
        ownerEmail: uEmail,
      };

      const workspaceList: WorkspaceOption[] = [ownerOption];

      // 2. Fetch Partner Workspaces (where user is invited as a team member/partner)
      try {
        const { data: memberships, error: memErr } = await supabase
          .from('workspace_members')
          .select(`
            id,
            workspace_id,
            email,
            name,
            primary_role,
            roles,
            status,
            avatar_url
          `)
          .or(`email.eq.${uEmail},user_id.eq.${uId}`)
          .eq('status', 'ACTIVE');

        if (!memErr && memberships && memberships.length > 0) {
          for (const mem of memberships) {
            // Skip if this is their own workspace
            if (mem.workspace_id === uId) continue;

            // Fetch workspace name
            let partnerStudioName = 'Partner Studio';
            const { data: wsProfile } = await supabase
              .from('profiles')
              .select('workspace_name, full_name')
              .eq('id', mem.workspace_id)
              .maybeSingle();

            if (wsProfile?.workspace_name) {
              partnerStudioName = wsProfile.workspace_name;
            }

            // Fetch member permissions
            let memberPerms = DEFAULT_MEMBER_PERMISSIONS;
            const { data: permData } = await supabase
              .from('member_permissions')
              .select('*')
              .eq('member_id', mem.id)
              .maybeSingle();

            if (permData) {
              memberPerms = {
                leads_access: permData.leads_access || 'NONE',
                quotations_access: permData.quotations_access || 'NONE',
                team_manager_access: permData.team_manager_access || 'VIEW_ASSIGNED',
                post_production_access: permData.post_production_access || 'ASSIGNED_ONLY',
                finance_access: permData.finance_access || 'NONE',
              };
            }

            workspaceList.push({
              workspaceId: mem.workspace_id,
              studioName: partnerStudioName,
              userRole: mem.primary_role || 'FREELANCER',
              isOwner: false,
              memberId: mem.id,
              roles: mem.roles || [],
              permissions: memberPerms,
              avatarUrl: mem.avatar_url,
            });
          }
        }
      } catch (memFetchErr) {
        console.warn('[BhamstraContext] Partner workspaces fetch skipped:', memFetchErr);
      }

      setAvailableWorkspaces(workspaceList);

      // 3. Determine Active Workspace from localStorage or cookies
      let savedWsId: string | null = null;
      if (typeof window !== 'undefined') {
        savedWsId = localStorage.getItem('sc_active_workspace_id');
      }

      const active = workspaceList.find(w => w.workspaceId === savedWsId) || ownerOption;
      setActiveWorkspace(active);
      setWorkspaceId(active.workspaceId);
      setWorkspaceName(active.studioName);
      setIsOwner(active.isOwner);
      setUserRole(active.userRole);
      setPermissions(active.permissions || (active.isOwner ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS));

      // 4. Update Workspace Config
      setWorkspaceConfig({
        logoUrl: profile?.whastboost_api_url || '',
        themeColor: '#f97316',
        pinLockEnabled: false,
      });

    } catch (err) {
      console.error('[BhamstraContext] Refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  // Workspace Switcher Action
  const switchWorkspace = async (targetWsId: string) => {
    const target = availableWorkspaces.find(w => w.workspaceId === targetWsId);
    if (!target) return;

    setActiveWorkspace(target);
    setWorkspaceId(target.workspaceId);
    setWorkspaceName(target.studioName);
    setIsOwner(target.isOwner);
    setUserRole(target.userRole);
    setPermissions(target.permissions || (target.isOwner ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS));

    if (typeof window !== 'undefined') {
      localStorage.setItem('sc_active_workspace_id', target.workspaceId);
      document.cookie = `sc_active_workspace_id=${target.workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('sc_workspace_switched', { detail: target }));
    }
  };

  const updateWorkspaceConfig = async (newConfig: Partial<WorkspaceConfig>) => {
    if (!userId) return;
    try {
      setWorkspaceConfig(prev => ({ ...prev, ...newConfig }));
      await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (err) {
      console.error('[BhamstraContext] Config update error:', err);
    }
  };

  return (
    <BhamstraContext.Provider
      value={{
        userId,
        userEmail,
        workspaceId,
        workspaceName,
        activeWorkspace,
        availableWorkspaces,
        isOwner,
        userRole,
        permissions,
        activeEventId,
        currentClientStatus,
        sessionShootState,
        workspaceConfig,
        loading,
        setActiveEventId,
        setCurrentClientStatus,
        setSessionShootState,
        updateWorkspaceConfig,
        switchWorkspace,
        refreshContext,
      }}
    >
      {children}
    </BhamstraContext.Provider>
  );
}

export function useBhamstra() {
  const context = useContext(BhamstraContext);
  if (!context) {
    throw new Error('useBhamstra must be used within a BhamstraProvider');
  }
  return context;
}

export const useWorkspace = useBhamstra;
