-- ==============================================================================
-- StudioCore Comprehensive Dual-Identity & Freelancer Portal Migration
-- Migration Date: 2026-09-02
-- Supports: Studio Owner + Freelancer Hybrid Mode & Cross-Studio Hiring
-- ==============================================================================

-- 1. Ensure auth_user_id exists on team tables for zero-disruption account mapping
ALTER TABLE IF EXISTS public.fw_team_members 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.workspace_members 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fw_team_members_auth_uid_idx ON public.fw_team_members(auth_user_id);
CREATE INDEX IF NOT EXISTS fw_team_members_email_idx ON public.fw_team_members(email);
CREATE INDEX IF NOT EXISTS workspace_members_auth_uid_idx ON public.workspace_members(auth_user_id);
CREATE INDEX IF NOT EXISTS workspace_members_email_idx ON public.workspace_members(email);

-- 2. Function to check if an email has been invited as a freelancer/crew by any studio
CREATE OR REPLACE FUNCTION public.check_freelancer_invite_status(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_clean_email TEXT;
  v_member_name TEXT;
  v_studios TEXT[];
  v_is_invited BOOLEAN := false;
BEGIN
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object('is_invited', false);
  END IF;

  v_clean_email := LOWER(TRIM(p_email));

  -- Look up in fw_team_members
  SELECT 
    COALESCE(MAX(name), 'Crew Member'),
    ARRAY_AGG(DISTINCT COALESCE(w.name, prof.workspace_name, 'Studio Partner'))
  INTO v_member_name, v_studios
  FROM public.fw_team_members tm
  LEFT JOIN public.workspaces w ON tm.user_id = w.id::TEXT
  LEFT JOIN public.profiles prof ON tm.user_id = prof.id::TEXT
  WHERE LOWER(TRIM(tm.email)) = v_clean_email;

  IF v_studios IS NOT NULL AND ARRAY_LENGTH(v_studios, 1) > 0 THEN
    v_is_invited := true;
  ELSE
    -- Check workspace_members
    SELECT 
      COALESCE(MAX(wm.name), 'Crew Member'),
      ARRAY_AGG(DISTINCT COALESCE(w.name, 'Studio Partner'))
    INTO v_member_name, v_studios
    FROM public.workspace_members wm
    LEFT JOIN public.workspaces w ON wm.workspace_id = w.id
    WHERE LOWER(TRIM(wm.email)) = v_clean_email;

    IF v_studios IS NOT NULL AND ARRAY_LENGTH(v_studios, 1) > 0 THEN
      v_is_invited := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_invited', v_is_invited,
    'member_name', COALESCE(v_member_name, 'Crew Member'),
    'studios', COALESCE(v_studios, ARRAY[]::TEXT[])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to auto-link auth_user_id on account signup / activation
CREATE OR REPLACE FUNCTION public.link_team_member_auth_user(p_user_id UUID, p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_linked_count INT := 0;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid parameters');
  END IF;

  UPDATE public.fw_team_members
  SET auth_user_id = p_user_id,
      phone_number = COALESCE(NULLIF(phone_number, ''), p_phone)
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));
  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  UPDATE public.workspace_members
  SET auth_user_id = p_user_id,
      phone = COALESCE(NULLIF(phone, ''), p_phone)
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));

  RETURN jsonb_build_object('success', true, 'linked_count', v_linked_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get all portal identities for a user (Studio Owner + Freelancer Workspaces)
CREATE OR REPLACE FUNCTION public.get_user_portal_identities(p_user_id UUID, p_email TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_effective_email TEXT;
  v_owner_ws JSONB;
  v_memberships JSONB;
BEGIN
  IF p_email IS NOT NULL AND p_email <> '' THEN
    v_effective_email := LOWER(TRIM(p_email));
  ELSIF p_user_id IS NOT NULL THEN
    SELECT LOWER(TRIM(email)) INTO v_effective_email FROM auth.users WHERE id = p_user_id;
  END IF;

  -- 1. Check Owner Studio
  SELECT jsonb_build_object(
    'has_owner_workspace', COUNT(w.id) > 0,
    'workspace_id', COALESCE(MAX(w.id)::TEXT, p_user_id::TEXT),
    'studio_name', COALESCE(MAX(w.name), MAX(prof.workspace_name), 'My Studio')
  )
  INTO v_owner_ws
  FROM public.workspaces w
  FULL JOIN public.profiles prof ON prof.id = p_user_id
  WHERE w.owner_id = p_user_id OR w.id = p_user_id;

  -- 2. Check Freelancer / Partner Memberships
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'membership_id', sub.id,
    'workspace_id', sub.workspace_id,
    'studio_name', sub.studio_name,
    'role', sub.role,
    'status', sub.status
  )), '[]'::jsonb)
  INTO v_memberships
  FROM (
    SELECT 
      wm.id::TEXT,
      wm.workspace_id::TEXT,
      COALESCE(w.name, 'Partner Studio') AS studio_name,
      COALESCE(wm.primary_role, 'Crew') AS role,
      COALESCE(wm.status, 'ACTIVE') AS status
    FROM public.workspace_members wm
    LEFT JOIN public.workspaces w ON wm.workspace_id = w.id
    WHERE (p_user_id IS NOT NULL AND wm.auth_user_id = p_user_id)
       OR (v_effective_email IS NOT NULL AND LOWER(TRIM(wm.email)) = v_effective_email)
    UNION
    SELECT 
      tm.id::TEXT,
      tm.user_id::TEXT AS workspace_id,
      COALESCE(w.name, prof.workspace_name, 'Partner Studio') AS studio_name,
      COALESCE(tm.primary_role, 'Crew') AS role,
      'ACTIVE' AS status
    FROM public.fw_team_members tm
    LEFT JOIN public.workspaces w ON tm.user_id = w.id::TEXT
    LEFT JOIN public.profiles prof ON tm.user_id = prof.id::TEXT
    WHERE (p_user_id IS NOT NULL AND tm.auth_user_id = p_user_id)
       OR (v_effective_email IS NOT NULL AND LOWER(TRIM(tm.email)) = v_effective_email)
  ) sub;

  RETURN jsonb_build_object(
    'owner_workspace', v_owner_ws,
    'memberships', v_memberships,
    'has_memberships', jsonb_array_length(v_memberships) > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Dedicated Shoots RPC Function
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
  IF p_email IS NOT NULL AND p_email <> '' THEN
    v_effective_email := LOWER(TRIM(p_email));
  ELSIF p_user_id IS NOT NULL THEN
    SELECT LOWER(TRIM(email)) INTO v_effective_email FROM auth.users WHERE id = p_user_id;
  END IF;

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
    COALESCE(w.name, prof.workspace_name, 'Studio Partner') AS studio_name,
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
