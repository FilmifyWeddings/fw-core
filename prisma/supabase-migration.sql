-- ============================================================================
-- StudioCore Enterprise SaaS Architecture Migration (Clean Recreation)
-- Tables: quotation_templates, quotation_documents, quotation_versions, quotation_assets
-- ============================================================================

-- Drop partial/conflicting tables if present to resolve UUID vs TEXT column type mismatch
DROP TABLE IF EXISTS public.quotation_versions CASCADE;
DROP TABLE IF EXISTS public.quotation_assets CASCADE;
DROP TABLE IF EXISTS public.quotation_documents CASCADE;
DROP TABLE IF EXISTS public.quotation_templates CASCADE;

-- 1. QUOTATION TEMPLATES TABLE
CREATE TABLE public.quotation_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Wedding - Design 1',
  category TEXT NOT NULL DEFAULT 'Wedding',
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. QUOTATION DOCUMENTS TABLE (Single Source of Truth JSON Document)
CREATE TABLE public.quotation_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id TEXT NOT NULL UNIQUE REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version INT4 NOT NULL DEFAULT 1,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. QUOTATION VERSIONS TABLE (Append-Only Audit / Undo History)
CREATE TABLE public.quotation_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES public.quotation_documents(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version INT4 NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. QUOTATION ASSETS TABLE
CREATE TABLE public.quotation_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id TEXT NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  file_name TEXT,
  file_size INT4,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.quotation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON public.quotation_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.quotation_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_versions_template_id ON public.quotation_versions(template_id);

-- Enable Supabase Realtime on quotation_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotation_documents;
