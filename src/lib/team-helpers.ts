import { supabase } from '@/lib/supabase';

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
}

export async function fetchWorkspaceTeamMembers(workspaceId?: string): Promise<WorkspaceMemberOption[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;
    const effectiveWsId = workspaceId || currentUid;

    let members: WorkspaceMemberOption[] = [];

    // 1. Try workspace_members API
    try {
      if (effectiveWsId) {
        const res = await fetch(`/api/workspace/members?workspace_id=${encodeURIComponent(effectiveWsId)}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members) && json.members.length > 0) {
          members = json.members.map((m: any) => ({
            id: m.id || m.user_id,
            name: m.name || m.full_name || 'Team Member',
            email: m.email || '',
            phone: m.phone || '',
            role: m.primary_role || m.role || 'Project Manager',
            avatar_url: m.avatar_url || '',
          }));
        }
      }
    } catch (_) {}

    // 2. Also merge from fw_team_members
    if (currentUid) {
      const { data: fwData } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('user_id', currentUid);

      if (fwData && fwData.length > 0) {
        for (const f of fwData) {
          const exists = members.some(
            c => c.name.toLowerCase() === f.name.toLowerCase() || (f.email && c.email?.toLowerCase() === f.email.toLowerCase())
          );
          if (!exists) {
            members.push({
              id: f.id,
              name: f.name,
              email: f.email || '',
              phone: f.phone_number ? `${f.country_code || '+91'} ${f.phone_number}` : '',
              role: f.primary_role || 'Crew',
              avatar_url: f.avatar_url || '',
            });
          }
        }
      }
    }

    return members;
  } catch (err) {
    console.error('[fetchWorkspaceTeamMembers Error]:', err);
    return [];
  }
}
