-- ==============================================================================
-- STUDIOCORE FIX: Ensure unique workspace_id on workspace_quotation_settings
-- and deduplicate any prior duplicate rows per studio, preserving the latest save.
-- Also enforce tenant-scoped RLS for authenticated studio owners & members.
-- ==============================================================================

-- 1. Deduplicate any existing duplicate workspace_id rows (keep latest updated_at / created_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_quotation_settings'
      AND column_name = 'id'
  ) THEN
    DELETE FROM public.workspace_quotation_settings a
    USING public.workspace_quotation_settings b
    WHERE a.workspace_id = b.workspace_id
      AND (
        COALESCE(a.updated_at, a.created_at, '1970-01-01'::timestamptz) < COALESCE(b.updated_at, b.created_at, '1970-01-01'::timestamptz)
        OR (
          COALESCE(a.updated_at, a.created_at, '1970-01-01'::timestamptz) = COALESCE(b.updated_at, b.created_at, '1970-01-01'::timestamptz)
          AND a.ctid < b.ctid
        )
      );
  ELSE
    DELETE FROM public.workspace_quotation_settings a
    USING public.workspace_quotation_settings b
    WHERE a.workspace_id = b.workspace_id
      AND a.ctid < b.ctid;
  END IF;
END $$;

-- 2. Guarantee a UNIQUE index on workspace_id so upserts with onConflict='workspace_id' never fail with 42P10
CREATE UNIQUE INDEX IF NOT EXISTS uniq_workspace_quotation_settings_workspace_id
  ON public.workspace_quotation_settings (workspace_id);

-- 3. Strict tenant-scoped RLS (service_role bypasses automatically via supabaseAdmin API)
ALTER TABLE public.workspace_quotation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public ws quotation settings" ON public.workspace_quotation_settings;
DROP POLICY IF EXISTS "Users can view their workspace quotation settings" ON public.workspace_quotation_settings;
DROP POLICY IF EXISTS "Users can insert their workspace quotation settings" ON public.workspace_quotation_settings;
DROP POLICY IF EXISTS "Users can update their workspace quotation settings" ON public.workspace_quotation_settings;
DROP POLICY IF EXISTS "Users can delete their workspace quotation settings" ON public.workspace_quotation_settings;

CREATE POLICY "Users can view their workspace quotation settings"
ON public.workspace_quotation_settings FOR SELECT
USING (
  auth.uid() = workspace_id
  OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  OR workspace_id IN (SELECT COALESCE(workspace_id, id) FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert their workspace quotation settings"
ON public.workspace_quotation_settings FOR INSERT
WITH CHECK (
  auth.uid() = workspace_id
  OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  OR workspace_id IN (SELECT COALESCE(workspace_id, id) FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their workspace quotation settings"
ON public.workspace_quotation_settings FOR UPDATE
USING (
  auth.uid() = workspace_id
  OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  OR workspace_id IN (SELECT COALESCE(workspace_id, id) FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete their workspace quotation settings"
ON public.workspace_quotation_settings FOR DELETE
USING (
  auth.uid() = workspace_id
  OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  OR workspace_id IN (SELECT COALESCE(workspace_id, id) FROM public.profiles WHERE id = auth.uid())
);
