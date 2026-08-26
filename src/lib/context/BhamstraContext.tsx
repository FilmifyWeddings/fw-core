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

export const DEFAULT_OWNER_PERMISSIONS: MemberPermissions = {
  leads_access: 'FULL_EDIT',
  quotations_access: 'MANAGE',
  team_manager_access: 'MANAGE_ALL',
  post_production_access: 'FULL_ACCESS',
  finance_access: 'MANAGE',
};

export const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  leads_access: 'NONE',
  quotations_access: 'NONE',
  team_manager_access: 'VIEW_ASSIGNED',
  post_production_access: 'ASSIGNED_ONLY',
  finance_access: 'NONE',
};

export interface BhamstraContextType {
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

// Fail-Safe Fallback State (Ensures ZERO crash if accessed outside Provider)
const DEFAULT_FALLBACK_CONTEXT: BhamstraContextType = {
  userId: null,
  userEmail: null,
  workspaceId: null,
  workspaceName: 'StudioCore',
  activeWorkspace: null,
  availableWorkspaces: [],
  isOwner: true,
  userRole: 'OWNER',
  permissions: DEFAULT_OWNER_PERMISSIONS,
  activeEventId: null,
  currentClientStatus: null,
  sessionShootState: null,
  workspaceConfig: {},
  loading: false,
  setActiveEventId: () => {},
  setCurrentClientStatus: () => {},
  setSessionShootState: () => {},
  updateWorkspaceConfig: async () => {},
  switchWorkspace: async () => {},
  refreshContext: async () => {},
};

const BhamstraContext = createContext<BhamstraContextType>(DEFAULT_FALLBACK_CONTEXT);

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

      // 2. Fetch Multi-Tenant Workspaces (Owner Studio + Partner Workspaces)
      try {
        if (session?.access_token) {
          const apiRes = await fetch('/api/workspace/my-workspaces', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const apiJson = await apiRes.json();
          if (apiJson.success && Array.isArray(apiJson.workspaces) && apiJson.workspaces.length > 0) {
            workspaceList.splice(0, workspaceList.length, ...apiJson.workspaces);
          }
        }
      } catch (wsApiErr) {
        console.warn('[BhamstraContext] my-workspaces API fallback to direct query:', wsApiErr);
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

// 🛡️ Fail-Safe Hook: Returns DEFAULT_FALLBACK_CONTEXT instead of throwing unhandled error
export function useBhamstra() {
  const context = useContext(BhamstraContext);
  return context || DEFAULT_FALLBACK_CONTEXT;
}

export const useWorkspace = useBhamstra;
export const WorkspaceProvider = BhamstraProvider;
