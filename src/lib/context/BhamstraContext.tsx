'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface WorkspaceConfig {
  logoUrl?: string;
  themeColor?: string; // HSL or Hex
  customDomain?: string;
  pinLockEnabled?: boolean;
}

interface BhamstraContextType {
  userId: string | null;
  userEmail: string | null;
  workspaceId: string | null;
  workspaceName: string;
  activeEventId: string | null;
  currentClientStatus: 'lead' | 'client' | 'event' | null;
  sessionShootState: 'reached' | 'started' | 'end' | 'completed' | null;
  workspaceConfig: WorkspaceConfig;
  loading: boolean;
  setActiveEventId: (eventId: string | null) => void;
  setCurrentClientStatus: (status: 'lead' | 'client' | 'event' | null) => void;
  setSessionShootState: (state: 'reached' | 'started' | 'end' | 'completed' | null) => void;
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => Promise<void>;
  refreshContext: () => Promise<void>;
}

const BhamstraContext = createContext<BhamstraContextType | undefined>(undefined);

export function BhamstraProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('My Studio');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [currentClientStatus, setCurrentClientStatus] = useState<'lead' | 'client' | 'event' | null>(null);
  const [sessionShootState, setSessionShootState] = useState<'reached' | 'started' | 'end' | 'completed' | null>(null);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>({});
  const [loading, setLoading] = useState(true);

  const refreshContext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUserId(null);
        setUserEmail(null);
        setWorkspaceId(null);
        setLoading(false);
        return;
      }

      const uId = session.user.id;
      setUserId(uId);
      setUserEmail(session.user.email || null);
      setWorkspaceId(uId); // Workspace maps to user ID in this architecture

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .maybeSingle();

      if (profile) {
        setWorkspaceName(profile.workspace_name || 'My Studio');
        setWorkspaceConfig({
          logoUrl: profile.whastboost_api_url || '', // Using config storage spaces
          themeColor: '#f97316', // Orange theme default
          pinLockEnabled: false,
        });
      }
    } catch (err) {
      console.error('[BhamstraContext] Refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshContext();
  }, []);

  const updateWorkspaceConfig = async (newConfig: Partial<WorkspaceConfig>) => {
    if (!userId) return;
    try {
      setWorkspaceConfig(prev => ({ ...prev, ...newConfig }));
      
      // Update in Supabase profiles
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString()
        })
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
        activeEventId,
        currentClientStatus,
        sessionShootState,
        workspaceConfig,
        loading,
        setActiveEventId,
        setCurrentClientStatus,
        setSessionShootState,
        updateWorkspaceConfig,
        refreshContext
      }}
    >
      {children}
    </BhamstraContext.Provider>
  );
}

export function useBhamstra() {
  const context = useContext(BhamstraContext);
  if (context === undefined) {
    throw new Error('useBhamstra must be used within a BhamstraProvider');
  }
  return context;
}
