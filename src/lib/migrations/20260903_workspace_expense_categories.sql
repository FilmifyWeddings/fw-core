-- ==============================================================================
-- SQL MIGRATION: WORKSPACE EXPENSE CATEGORIES & TEAM MEMBER EXPENSES
-- ==============================================================================

-- 1. Workspace Custom Expense Categories Table
CREATE TABLE IF NOT EXISTS public.workspace_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, category_name)
);

-- Index for instant lookup
CREATE INDEX IF NOT EXISTS idx_exp_cats_ws ON public.workspace_expense_categories(workspace_id);

-- Enable RLS
ALTER TABLE public.workspace_expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace categories access" ON public.workspace_expense_categories;
CREATE POLICY "Workspace categories access" ON public.workspace_expense_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default categories for existing workspaces
INSERT INTO public.workspace_expense_categories (workspace_id, category_name, is_default)
SELECT id, cat, true
FROM public.workspaces,
UNNEST(ARRAY['Travel & Fuel', 'Food & Catering', 'Equipment Rental', 'Stay & Hotel', 'Printing & Albums', 'Miscellaneous']) AS cat
ON CONFLICT (workspace_id, category_name) DO NOTHING;

-- 2. Ensure expenses table has team_member_id column
ALTER TABLE public.finance_expenses 
ADD COLUMN IF NOT EXISTS team_member_id UUID;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
