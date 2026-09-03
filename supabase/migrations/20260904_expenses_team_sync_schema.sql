-- 1. Add all required sync columns to existing expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Crew & Team',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PAID',
ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'team_member',
ADD COLUMN IF NOT EXISTS team_member_id TEXT,
ADD COLUMN IF NOT EXISTS team_member_name TEXT,
ADD COLUMN IF NOT EXISTS reference_assignment_id TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Backfill expense_date if older date column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'date'
    ) THEN
        UPDATE public.expenses 
        SET expense_date = date 
        WHERE expense_date IS NULL;
    END IF;
END $$;

-- 3. Create performance index on expense_date
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_team_member_name ON public.expenses(team_member_name);
