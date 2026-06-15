-- ============================================================
-- SUPABASE DATABASE WEBHOOK SETUP SCRIPT
-- FW Core — Baileys Serverless Engine
-- ============================================================
--
-- HINDI EXPLANATION:
-- Yeh script Supabase ke "Database Webhooks" feature ko configure karta hai.
-- Jab bhi `baileys_action_queue` table mein naya row INSERT hota hai,
-- Supabase automatically hamari Vercel API ko HTTP POST bhejta hai.
--
-- Vercel API endpoint: https://fw-core.vercel.app/api/integrations/baileys/webhook-trigger
-- Secret header: x-webhook-secret: <BAILEYS_WEBHOOK_SECRET>
--
-- STEP-BY-STEP (Manual — Supabase Dashboard se karo):
-- =====================================================
-- 1. Supabase Dashboard → Database → Webhooks → "Create a new hook"
-- 2. Name: baileys_action_queue_trigger
-- 3. Table: baileys_action_queue
-- 4. Events: INSERT (only)
-- 5. Webhook URL: https://fw-core.vercel.app/api/integrations/baileys/webhook-trigger
-- 6. HTTP Headers: Add → x-webhook-secret: your-secret-here
-- 7. Save!
--
-- YA phir niche ka SQL use karo (Supabase SQL Editor mein):
-- ============================================================

-- Step 1: Enable pg_net extension (required for HTTP webhooks from SQL)
-- Note: Supabase pe yeh already enabled hota hai usually
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Enable supabase_functions schema access
-- (Supabase Dashboard webhooks internally use supabase_functions.http_request)
GRANT USAGE ON SCHEMA supabase_functions TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA supabase_functions TO postgres;

-- ============================================================
-- Step 3: Create the Webhook Trigger Function
-- Yeh function har INSERT pe Vercel endpoint ko call karega
-- ============================================================
CREATE OR REPLACE FUNCTION baileys_notify_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Read config from env (set these in Supabase secrets)
  webhook_url := current_setting('app.baileys_webhook_url', true);
  webhook_secret := current_setting('app.baileys_webhook_secret', true);

  -- If not configured via settings, use hardcoded URL
  -- REPLACE this with your actual Vercel deployment URL
  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := 'https://fw-core.vercel.app/api/integrations/baileys/webhook-trigger';
  END IF;
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    webhook_secret := 'your-webhook-secret-here'; -- CHANGE THIS
  END IF;

  -- Only trigger on pending INSERT events
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Build the payload (same format Supabase Dashboard webhooks use)
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)::jsonb,
      'old_record', NULL
    );

    -- Fire the HTTP request asynchronously (non-blocking)
    SELECT net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', webhook_secret
      ),
      body := payload,
      timeout_milliseconds := 30000
    ) INTO request_id;

    RAISE LOG '[baileys_webhook] Fired webhook for action_id=% request_id=%', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Step 4: Attach the trigger to baileys_action_queue table
-- ============================================================
DROP TRIGGER IF EXISTS on_baileys_action_insert ON public.baileys_action_queue;

CREATE TRIGGER on_baileys_action_insert
  AFTER INSERT ON public.baileys_action_queue
  FOR EACH ROW
  EXECUTE FUNCTION baileys_notify_webhook();

-- ============================================================
-- Step 5: Set the webhook URL and secret via Supabase Settings
-- (Optional — you can hardcode in the function above instead)
-- Run these ONE TIME in SQL Editor:
-- ============================================================

-- ALTER DATABASE postgres SET app.baileys_webhook_url = 'https://fw-core.vercel.app/api/integrations/baileys/webhook-trigger';
-- ALTER DATABASE postgres SET app.baileys_webhook_secret = 'your-secret-here-CHANGE-ME';

-- ============================================================
-- VERIFY: Test the trigger is active
-- ============================================================
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM
  pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
WHERE
  tgname = 'on_baileys_action_insert';

-- ============================================================
-- QUICK TEST: Insert a test action (it should fire the webhook)
-- Replace the workspace_id with a real UUID from auth.users
-- ============================================================
-- INSERT INTO baileys_action_queue (workspace_id, action_type, payload)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',  -- Replace with real user UUID
--   'send_text',
--   '{"to": "919876543210@s.whatsapp.net", "text": "Test from Supabase webhook!"}'
-- );

-- ============================================================
-- ALTERNATIVE: Use Supabase Dashboard (Recommended for alpha)
-- ============================================================
-- If pg_net or supabase_functions is not available, use the GUI:
--
-- Dashboard → Database → Webhooks → Create Webhook:
--   Name:    baileys_queue_trigger
--   Table:   public.baileys_action_queue
--   Events:  ✅ INSERT
--   URL:     https://fw-core.vercel.app/api/integrations/baileys/webhook-trigger
--   Headers:
--     Content-Type: application/json
--     x-webhook-secret: <your-secret>
--
-- Done! Every INSERT triggers your Vercel API automatically.
-- ============================================================
