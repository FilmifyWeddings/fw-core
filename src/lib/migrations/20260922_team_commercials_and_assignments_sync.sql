-- ==============================================================================
-- STUDIOCORE: TEAM COMMERCIALS, ASSIGNMENTS & LEDGER SYNC SCHEMA
-- Migration Date: 2026-09-22
-- Strict Idempotent / Non-Destructive SQL Migration
-- ==============================================================================

-- 1. Ensure fw_assignments has all required columns for commercial fee and payout tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'agreed_amount') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN agreed_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'paid_amount') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN paid_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'advance_amount') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN advance_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'balance_amount') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN balance_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'payment_status') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'payment_method') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN payment_method TEXT DEFAULT 'UPI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'payment_date') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN payment_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fw_assignments' AND column_name = 'notes') THEN
        ALTER TABLE public.fw_assignments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 2. Performance indexes on fw_assignments for sub-millisecond filtering
CREATE INDEX IF NOT EXISTS idx_fw_assign_member ON public.fw_assignments(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_fw_assign_workspace ON public.fw_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_assign_user ON public.fw_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_assign_proj ON public.fw_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_fw_assign_sub_event ON public.fw_assignments(sub_event_id);

-- 3. Ensure crew_assignments_finance has all required columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew_assignments_finance' AND column_name = 'final_agreed_amount') THEN
        ALTER TABLE public.crew_assignments_finance ADD COLUMN final_agreed_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew_assignments_finance' AND column_name = 'advance_paid_amount') THEN
        ALTER TABLE public.crew_assignments_finance ADD COLUMN advance_paid_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew_assignments_finance' AND column_name = 'payment_status') THEN
        ALTER TABLE public.crew_assignments_finance ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew_assignments_finance' AND column_name = 'payment_method') THEN
        ALTER TABLE public.crew_assignments_finance ADD COLUMN payment_method TEXT DEFAULT 'UPI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew_assignments_finance' AND column_name = 'payment_date') THEN
        ALTER TABLE public.crew_assignments_finance ADD COLUMN payment_date DATE;
    END IF;
END $$;

-- 4. Performance indexes on crew_assignments_finance
CREATE INDEX IF NOT EXISTS idx_crew_fin_member ON public.crew_assignments_finance(team_member_id);
CREATE INDEX IF NOT EXISTS idx_crew_fin_event ON public.crew_assignments_finance(event_id);
CREATE INDEX IF NOT EXISTS idx_crew_fin_sub_event ON public.crew_assignments_finance(sub_event_id);
