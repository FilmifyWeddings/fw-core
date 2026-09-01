-- ==============================================================================
-- StudioCore Freelancer Invite Check & Auto-Link Migration
-- Migration Date: 2026-09-02
-- ==============================================================================

-- 1. Function to check if an email has been invited by any studio
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
    ARRAY_AGG(DISTINCT COALESCE(w.name, prof.workspace_name, 'StudioCore Studio'))
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
      ARRAY_AGG(DISTINCT COALESCE(w.name, 'StudioCore Studio'))
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

-- 2. Function to auto-link auth_user_id on account activation
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
