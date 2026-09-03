-- ====================================================================
-- QUOTATION FINALIZATION AUTOMATION & FINANCE PIPELINE SYNC
-- ====================================================================

-- Function to automatically create Finance, Project, and Booking cards upon quotation finalization
CREATE OR REPLACE FUNCTION public.handle_quotation_finalized_pipeline()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_client_phone TEXT;
  v_workspace_id UUID;
  v_total_amount NUMERIC;
BEGIN
  -- Trigger only when is_finalized changes to TRUE
  IF (NEW.is_finalized = true AND (OLD.is_finalized IS DISTINCT FROM true)) THEN
    v_workspace_id := NEW.workspace_id;
    v_total_amount := COALESCE(NEW.grand_total, NEW.total_amount, 0);

    -- 1. Fetch Client Info
    SELECT full_name, phone INTO v_client_name, v_client_phone 
    FROM public.workspace_clients 
    WHERE id = NEW.client_id;

    IF v_client_name IS NULL THEN
      v_client_name := COALESCE(NEW.client_name, 'Client ' || SUBSTRING(NEW.id::text, 1, 6));
    END IF;

    -- 2. Upsert into client_finance_records (Auto-create Finance Card)
    INSERT INTO public.client_finance_records (
      workspace_id,
      client_id,
      client_name,
      client_phone,
      total_amount,
      received_amount,
      pending_amount,
      handled_by,
      status,
      created_at
    ) VALUES (
      v_workspace_id,
      NEW.client_id,
      v_client_name,
      v_client_phone,
      v_total_amount,
      0,
      v_total_amount,
      NEW.created_by_name,
      'PENDING',
      NOW()
    )
    ON CONFLICT (client_id, workspace_id) DO UPDATE 
    SET total_amount = EXCLUDED.total_amount,
        pending_amount = EXCLUDED.total_amount - client_finance_records.received_amount,
        updated_at = NOW();

    -- 3. Upsert Project / Booking Card if not exists
    INSERT INTO public.fw_projects (
      workspace_id,
      client_id,
      client_name,
      project_name,
      status,
      total_budget
    ) VALUES (
      v_workspace_id,
      NEW.client_id,
      v_client_name,
      v_client_name || ' Wedding Project',
      'CONFIRMED',
      v_total_amount
    )
    ON CONFLICT DO NOTHING;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on quotations table
DROP TRIGGER IF EXISTS trg_quotation_finalized_pipeline ON public.quotations;
CREATE TRIGGER trg_quotation_finalized_pipeline
AFTER UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.handle_quotation_finalized_pipeline();
