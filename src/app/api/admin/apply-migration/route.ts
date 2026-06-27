/**
 * POST /api/admin/apply-migration
 * One-shot endpoint to create integration_credentials table + add config JSONB column.
 * Secured with BAILEYS_WEBHOOK_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('meta', 'google', 'custom_website')),
    access_token TEXT,
    refresh_token TEXT,
    webhook_secret_key TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'integration_credentials'
      AND policyname = 'Users can manage their own credentials'
  ) THEN
    CREATE POLICY "Users can manage their own credentials"
      ON public.integration_credentials FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $do$;
CREATE INDEX IF NOT EXISTS idx_integration_credentials_webhook_secret
  ON public.integration_credentials(webhook_secret_key);
ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb NOT NULL;
`;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.BAILEYS_WEBHOOK_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Extract project ref from URL: https://<ref>.supabase.co
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

  try {
    // Try Supabase Management API (requires service role key as Bearer)
    const mgmtRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      }
    );

    const mgmtBody = await mgmtRes.text();
    console.log('[apply-migration] Management API:', mgmtRes.status, mgmtBody.slice(0, 300));

    if (mgmtRes.ok) {
      return NextResponse.json({
        success: true,
        method: 'management_api',
        message: 'integration_credentials table created and config column added.',
      });
    }

    // Both paths failed — return SQL so user can apply manually
    return NextResponse.json(
      {
        success: false,
        error: 'Automated migration failed. Apply the SQL below in Supabase Dashboard → SQL Editor.',
        managementApi: { status: mgmtRes.status, body: mgmtBody.slice(0, 300) },
        sql: MIGRATION_SQL,
      },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, sql: MIGRATION_SQL },
      { status: 500 }
    );
  }
}