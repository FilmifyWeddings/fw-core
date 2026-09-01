-- ==============================================================================
-- Isolated Crew / Team Portal RPC Migration
-- Migration Date: 2026-09-02
-- ZERO IMPACT on Studio Owner Tables or RLS Policies
-- ==============================================================================

-- 1. Ensure auth_user_id exists on fw_team_members
ALTER TABLE IF EXISTS public.fw_team_members 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fw_team_members_auth_uid_idx ON public.fw_team_members(auth_user_id);
CREATE INDEX IF NOT EXISTS fw_team_members_email_idx ON public.fw_team_members(email);

-- 2. Clean, non-recursive Read-Only RPC to fetch assigned shoots for a crew member
CREATE OR REPLACE FUNCTION public.get_team_member_dashboard_shoots(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  assignment_id TEXT,
  sub_event_id TEXT,
  project_id TEXT,
  workspace_id UUID,
  studio_name TEXT,
  studio_logo TEXT,
  client_name TEXT,
  couple_name TEXT,
  event_name TEXT,
  event_date TEXT,
  end_date TEXT,
  is_overnight BOOLEAN,
  is_date_tbd BOOLEAN,
  start_time TEXT,
  end_time TEXT,
  venue_location TEXT,
  role_name TEXT,
  role_short_code TEXT,
  agreed_amount NUMERIC,
  advance_amount NUMERIC,
  paid_amount NUMERIC,
  balance_amount NUMERIC,
  payment_status TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_member_text_ids TEXT[];
  v_effective_email TEXT;
BEGIN
  -- Resolve email if user_id is passed
  IF p_email IS NOT NULL AND p_email <> '' THEN
    v_effective_email := LOWER(TRIM(p_email));
  ELSIF p_user_id IS NOT NULL THEN
    SELECT LOWER(TRIM(email)) INTO v_effective_email FROM auth.users WHERE id = p_user_id;
  END IF;

  -- Collect member IDs associated with this user
  SELECT ARRAY_AGG(DISTINCT id::TEXT) INTO v_member_text_ids
  FROM (
    SELECT id::TEXT FROM public.fw_team_members 
    WHERE (p_user_id IS NOT NULL AND auth_user_id = p_user_id)
       OR (v_effective_email IS NOT NULL AND LOWER(TRIM(email)) = v_effective_email)
    UNION
    SELECT id::TEXT FROM public.workspace_members 
    WHERE (p_user_id IS NOT NULL AND auth_user_id = p_user_id)
       OR (v_effective_email IS NOT NULL AND LOWER(TRIM(email)) = v_effective_email)
    UNION
    SELECT p_user_id::TEXT WHERE p_user_id IS NOT NULL
  ) sub;

  IF v_member_text_ids IS NULL OR ARRAY_LENGTH(v_member_text_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(a.id::TEXT, 'asg_' || se.id::TEXT || '_' || COALESCE(a.assigned_member_id, '')) AS assignment_id,
    se.id::TEXT AS sub_event_id,
    p.id::TEXT AS project_id,
    p.user_id AS workspace_id,
    COALESCE(w.name, prof.workspace_name, 'StudioCore Partner') AS studio_name,
    COALESCE(w.logo_url, '') AS studio_logo,
    COALESCE(p.client_name, p.couple_name, 'Private Client') AS client_name,
    COALESCE(p.couple_name, NULLIF(TRIM(COALESCE(p.bride_name, '') || ' & ' || COALESCE(p.groom_name, '')), '&'), p.client_name, 'Wedding Couple') AS couple_name,
    COALESCE(se.event_title, se.title, 'Wedding Function') AS event_name,
    COALESCE(se.event_date::TEXT, p.main_date::TEXT, 'TBD') AS event_date,
    se.end_date::TEXT AS end_date,
    COALESCE(se.is_overnight, false) AS is_overnight,
    COALESCE(se.is_date_tbd, false) AS is_date_tbd,
    COALESCE(se.start_time_12h, se.start_time, '09:00 AM') AS start_time,
    COALESCE(se.end_time_12h, se.end_time, '06:00 PM') AS end_time,
    COALESCE(se.venue, se.location, p.venue_location, 'Venue TBA') AS venue_location,
    COALESCE(a.required_role, a.role_name, 'Crew Specialist') AS role_name,
    COALESCE(a.role_short_code, SUBSTRING(COALESCE(a.required_role, 'CREW') FROM 1 FOR 4)) AS role_short_code,
    COALESCE(caf.agreed_amount, tep.agreed_amount, a.agreed_amount, 0)::NUMERIC AS agreed_amount,
    COALESCE(caf.advance_amount, a.advance_amount, 0)::NUMERIC AS advance_amount,
    COALESCE(caf.paid_amount, tep.paid_amount, a.paid_amount, 0)::NUMERIC AS paid_amount,
    COALESCE(caf.balance_amount, tep.balance_amount, a.balance_amount, 0)::NUMERIC AS balance_amount,
    COALESCE(caf.payment_status, tep.status, a.payment_status, 'pending')::TEXT AS payment_status,
    COALESCE(caf.payment_method, tep.payment_method, 'UPI')::TEXT AS payment_method,
    COALESCE(a.notes, caf.notes, '') AS notes,
    COALESCE(a.created_at, se.created_at, NOW()) AS created_at
  FROM public.fw_assignments a
  JOIN public.fw_sub_events se ON a.sub_event_id = se.id
  JOIN public.fw_projects p ON se.project_id = p.id
  LEFT JOIN public.workspaces w ON p.user_id = w.id
  LEFT JOIN public.profiles prof ON p.user_id = prof.id
  LEFT JOIN public.crew_assignments_finance caf ON (caf.sub_event_id = se.id AND caf.team_member_id = a.assigned_member_id)
  LEFT JOIN public.team_event_payouts tep ON (tep.sub_event_id = se.id::TEXT AND tep.member_id = a.assigned_member_id)
  WHERE a.assigned_member_id = ANY(v_member_text_ids)
  ORDER BY se.event_date DESC NULLS LAST, se.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
