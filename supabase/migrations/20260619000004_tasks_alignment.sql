-- Migration: Alignment of Team Tasks & Comments schema for Step 4
-- Aligns database fields with specific mandated names and enables follow-up reminders

-- 1. Alter client_comments to add followup_at for voice reminders/alerts
ALTER TABLE public.client_comments
  ADD COLUMN IF NOT EXISTS followup_at TIMESTAMP WITH TIME ZONE;

-- 2. Alter team_tasks to support exact user-requested schemas
ALTER TABLE public.team_tasks
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'Active/In-Field' CHECK (task_status IN ('Completed', 'Active/In-Field', 'Overdue'));

-- Sync any existing rows
UPDATE public.team_tasks SET assigned_to_user_id = assigned_to WHERE assigned_to_user_id IS NULL;
UPDATE public.team_tasks SET due_timestamp = deadline WHERE due_timestamp IS NULL;
UPDATE public.team_tasks SET task_status = 
  CASE 
    WHEN status = 'completed' THEN 'Completed'
    ELSE 'Active/In-Field'
  END 
WHERE task_status IS NULL;

-- 3. Create helper function to automatically compute and set 'Overdue' status and flags
CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_status <> 'Completed' AND NEW.due_timestamp < NOW() THEN
        NEW.task_status := 'Overdue';
        NEW.overdue_alert := true;
    ELSIF NEW.task_status = 'Completed' THEN
        NEW.overdue_alert := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_overdue_tasks ON public.team_tasks;
CREATE TRIGGER trigger_check_overdue_tasks
    BEFORE INSERT OR UPDATE ON public.team_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_overdue_tasks();
