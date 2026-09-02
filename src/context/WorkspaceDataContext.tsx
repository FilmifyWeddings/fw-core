'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { 
  WorkspaceEventType, 
  WorkspaceCrewRole, 
  WorkspaceQuotationSettings,
  DEFAULT_EVENT_TYPES,
  DEFAULT_CREW_ROLES,
  fetchWorkspaceEventTypes,
  fetchWorkspaceCrewRoles,
  fetchWorkspaceQuotationSettings,
  getRoleShortCode as computeRoleShortCode
} from '@/lib/workspace-settings';
import { fetchWorkspaceMemberRatesMap } from '@/lib/team-finance-sync';

export interface WorkspaceDataContextType {
  workspaceMembers: any[];
  crewRoles: WorkspaceCrewRole[];
  eventTypes: WorkspaceEventType[];
  eventTypesList: string[];
  quotationSettings: WorkspaceQuotationSettings | null;
  memberRatesMap: Record<string, any>;
  loading: boolean;
  refreshCatalog: (catalog?: 'all' | 'members' | 'roles' | 'events' | 'settings') => Promise<void>;
  getMemberById: (id: string) => any | undefined;
  getRoleByName: (name: string) => WorkspaceCrewRole | undefined;
  getRoleShortCode: (name: string) => string;
}

const DEFAULT_CONTEXT: WorkspaceDataContextType = {
  workspaceMembers: [],
  crewRoles: DEFAULT_CREW_ROLES,
  eventTypes: DEFAULT_EVENT_TYPES,
  eventTypesList: DEFAULT_EVENT_TYPES.map(e => e.name),
  quotationSettings: null,
  memberRatesMap: {},
  loading: false,
  refreshCatalog: async () => {},
  getMemberById: () => undefined,
  getRoleByName: () => undefined,
  getRoleShortCode: (name: string) => name ? name.slice(0, 2).toUpperCase() : 'CR',
};

const WorkspaceDataContext = createContext<WorkspaceDataContextType>(DEFAULT_CONTEXT);

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId, userId } = useWorkspace();
  const effectiveWsId = workspaceId || userId || '';

  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [crewRoles, setCrewRoles] = useState<WorkspaceCrewRole[]>(DEFAULT_CREW_ROLES);
  const [eventTypes, setEventTypes] = useState<WorkspaceEventType[]>(DEFAULT_EVENT_TYPES);
  const [quotationSettings, setQuotationSettings] = useState<WorkspaceQuotationSettings | null>(null);
  const [memberRatesMap, setMemberRatesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const initialLoadDone = useRef(false);

  // 1. Fetch Members & Isolated Rates
  const loadMembersCatalog = useCallback(async (targetWs: string) => {
    if (!targetWs) return;
    try {
      const [ratesMap, { data: { session } }] = await Promise.all([
        fetchWorkspaceMemberRatesMap(targetWs),
        supabase.auth.getSession()
      ]);

      setMemberRatesMap(ratesMap || {});

      let combined: any[] = [];
      try {
        const res = await fetch(`/api/workspace/members?workspace_id=${targetWs}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          combined = json.members.map((m: any) => ({
            ...m,
            default_daily_rate: typeof ratesMap[m.id] === 'object' ? ratesMap[m.id].rate : (ratesMap[m.id] != null ? ratesMap[m.id] : (m.default_daily_rate || 0)),
            payout_frequency: typeof ratesMap[m.id] === 'object' && ratesMap[m.id].frequency ? ratesMap[m.id].frequency : (m.payout_frequency || 'daily'),
          }));
        }
      } catch (_) {}

      // Fallback merge from fw_team_members
      try {
        const { data: fwData } = await supabase
          .from('fw_team_members')
          .select('*')
          .eq('user_id', targetWs);

        if (fwData && fwData.length > 0) {
          fwData.forEach(f => {
            const exists = combined.some(c => c.id === f.id || (f.email && c.email && c.email.trim().toLowerCase() === f.email.trim().toLowerCase()));
            if (!exists) {
              combined.push({
                id: f.id,
                name: f.name,
                email: f.email || '',
                phone: f.phone_number ? `${f.country_code || '+91'} ${f.phone_number}` : '',
                primary_role: f.primary_role || 'Crew',
                roles: [f.primary_role || 'Crew'],
                member_types: f.member_types || ['IN_HOUSE'],
                primary_type: f.primary_type || 'IN_HOUSE',
                avatar_url: f.avatar_url || '',
                status: 'ACTIVE',
                default_daily_rate: typeof ratesMap[f.id] === 'object' ? ratesMap[f.id].rate : (ratesMap[f.id] != null ? ratesMap[f.id] : (f.default_daily_rate || 0)),
                payout_frequency: typeof ratesMap[f.id] === 'object' && ratesMap[f.id].frequency ? ratesMap[f.id].frequency : (f.payout_frequency || 'daily'),
                default_currency: f.default_currency || 'INR',
              });
            }
          });
        }
      } catch (_) {}

      setWorkspaceMembers(combined);
    } catch (err) {
      console.warn('[WorkspaceData] loadMembersCatalog error:', err);
    }
  }, []);

  // 2. Fetch Crew Roles
  const loadRolesCatalog = useCallback(async (targetWs: string) => {
    try {
      const roles = await fetchWorkspaceCrewRoles(targetWs);
      if (roles && roles.length > 0) {
        setCrewRoles(roles);
      }
    } catch (err) {
      console.warn('[WorkspaceData] loadRolesCatalog error:', err);
    }
  }, []);

  // 3. Fetch Event Types
  const loadEventTypesCatalog = useCallback(async (targetWs: string) => {
    try {
      const evTypes = await fetchWorkspaceEventTypes(targetWs);
      if (evTypes && evTypes.length > 0) {
        setEventTypes(evTypes);
      }
    } catch (err) {
      console.warn('[WorkspaceData] loadEventTypesCatalog error:', err);
    }
  }, []);

  // 4. Fetch Quotation Settings
  const loadSettingsCatalog = useCallback(async (targetWs: string) => {
    try {
      const settings = await fetchWorkspaceQuotationSettings(targetWs);
      if (settings) {
        setQuotationSettings(settings);
      }
    } catch (err) {
      console.warn('[WorkspaceData] loadSettingsCatalog error:', err);
    }
  }, []);

  // Single Central Mount Fetcher
  const refreshCatalog = useCallback(async (catalog: 'all' | 'members' | 'roles' | 'events' | 'settings' = 'all') => {
    if (!effectiveWsId) return;

    if (catalog === 'all') {
      setLoading(true);
      await Promise.all([
        loadMembersCatalog(effectiveWsId),
        loadRolesCatalog(effectiveWsId),
        loadEventTypesCatalog(effectiveWsId),
        loadSettingsCatalog(effectiveWsId),
      ]);
      setLoading(false);
    } else if (catalog === 'members') {
      await loadMembersCatalog(effectiveWsId);
    } else if (catalog === 'roles') {
      await loadRolesCatalog(effectiveWsId);
    } else if (catalog === 'events') {
      await loadEventTypesCatalog(effectiveWsId);
    } else if (catalog === 'settings') {
      await loadSettingsCatalog(effectiveWsId);
    }
  }, [effectiveWsId, loadMembersCatalog, loadRolesCatalog, loadEventTypesCatalog, loadSettingsCatalog]);

  // Initial mount trigger
  useEffect(() => {
    if (effectiveWsId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      refreshCatalog('all');
    }
  }, [effectiveWsId, refreshCatalog]);

  // Listen for broadcast events across tabs / modules to update cache in-memory
  useEffect(() => {
    const handleEventsUpdate = () => refreshCatalog('events');
    const handleRolesUpdate = () => refreshCatalog('roles');
    const handleMembersUpdate = () => refreshCatalog('members');
    const handleSettingsUpdate = () => refreshCatalog('settings');

    window.addEventListener('workspace_event_types_updated', handleEventsUpdate);
    window.addEventListener('workspace_crew_roles_updated', handleRolesUpdate);
    window.addEventListener('team_members_updated', handleMembersUpdate);
    window.addEventListener('workspace_settings_updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('workspace_event_types_updated', handleEventsUpdate);
      window.removeEventListener('workspace_crew_roles_updated', handleRolesUpdate);
      window.removeEventListener('team_members_updated', handleMembersUpdate);
      window.removeEventListener('workspace_settings_updated', handleSettingsUpdate);
    };
  }, [refreshCatalog]);

  // Fast Lookups
  const getMemberById = useCallback((id: string) => {
    return workspaceMembers.find(m => m.id === id);
  }, [workspaceMembers]);

  const getRoleByName = useCallback((name: string) => {
    const clean = (name || '').trim().toLowerCase();
    return crewRoles.find(r => r.name.toLowerCase() === clean);
  }, [crewRoles]);

  const getRoleShortCode = useCallback((name: string) => {
    return computeRoleShortCode(name, crewRoles);
  }, [crewRoles]);

  const eventTypesList = React.useMemo(() => {
    return eventTypes.map(e => e.name);
  }, [eventTypes]);

  return (
    <WorkspaceDataContext.Provider
      value={{
        workspaceMembers,
        crewRoles,
        eventTypes,
        eventTypesList,
        quotationSettings,
        memberRatesMap,
        loading,
        refreshCatalog,
        getMemberById,
        getRoleByName,
        getRoleShortCode,
      }}
    >
      {children}
    </WorkspaceDataContext.Provider>
  );
}

export function useWorkspaceData() {
  const context = useContext(WorkspaceDataContext);
  if (!context) {
    return DEFAULT_CONTEXT;
  }
  return context;
}
