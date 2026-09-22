-- ==============================================================================
-- Migration: 20260924_crew_roles_sequential_numbering_and_unique_assignment.sql
-- Description:
--   1. Ensures independent slots for crew members in sub-events.
--   2. Enforces sequential numbering for duplicate roles:
--      - 1st instance: base name/abbreviation (e.g. 'Traditional Photographer', 'TV')
--      - 2nd instance: base name + ' 2' (e.g. 'Traditional Photographer 2', 'TV 2')
--      - 3rd instance: base name + ' 3' (e.g. 'Traditional Photographer 3', 'TV 3')
--   3. Prevents duplicate assignment of the same crew member within the same sub-event:
--      - Unassigns duplicate assignments if any exist.
--      - Adds a partial unique index on (sub_event_id, assigned_member_id).
--   4. Cleans and re-indexes existing duplicate roles in fw_assignments and fw_sub_events.roles.
--      (Supports both JSONB and ARRAY types for fw_sub_events.roles).
-- ==============================================================================

-- Step 1: Clean duplicate member assignments in the same sub-event
-- Keep the earliest assigned slot and set duplicate assignments to NULL (unassigned)
WITH ranked_member_assignments AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY sub_event_id, assigned_member_id 
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM public.fw_assignments
    WHERE sub_event_id IS NOT NULL 
      AND assigned_member_id IS NOT NULL
)
UPDATE public.fw_assignments
SET assigned_member_id = NULL
WHERE id IN (
    SELECT id FROM ranked_member_assignments WHERE rn > 1
);

-- Step 2: Create a partial unique index to enforce that a crew member can only be assigned once per sub-event
CREATE UNIQUE INDEX IF NOT EXISTS idx_fw_assignments_sub_event_member
ON public.fw_assignments (sub_event_id, assigned_member_id)
WHERE assigned_member_id IS NOT NULL;

-- Step 3: Sequentially renumber duplicate required_role strings in fw_assignments
-- Extracts base role by stripping trailing digits (e.g., 'TV 1' -> 'TV', 'TV 2' -> 'TV')
-- 1st instance gets base role (e.g., 'TV', 'Traditional Photographer')
-- 2nd+ instances get base role + ' 2', ' 3', etc.
WITH numbered_assignments AS (
    SELECT 
        id,
        REGEXP_REPLACE(required_role, '\s+\d+$', '') AS base_role,
        ROW_NUMBER() OVER (
            PARTITION BY sub_event_id, REGEXP_REPLACE(required_role, '\s+\d+$', '')
            ORDER BY created_at ASC, id ASC
        ) AS seq
    FROM public.fw_assignments
    WHERE sub_event_id IS NOT NULL AND required_role IS NOT NULL
)
UPDATE public.fw_assignments a
SET required_role = CASE 
    WHEN n.seq = 1 THEN n.base_role
    ELSE n.base_role || ' ' || n.seq
END
FROM numbered_assignments n
WHERE a.id = n.id
  AND a.required_role != CASE WHEN n.seq = 1 THEN n.base_role ELSE n.base_role || ' ' || n.seq END;

-- Step 4: Sequentially renumber duplicate roles in fw_sub_events
-- Dynamically checks column data_type to support both JSONB and native ARRAY/text[]
DO $$
DECLARE
    col_type text;
    r RECORD;
    new_roles_jsonb jsonb;
    new_roles_array text[];
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'fw_sub_events' 
      AND column_name = 'roles';

    IF col_type = 'jsonb' THEN
        FOR r IN 
            SELECT id, roles 
            FROM public.fw_sub_events 
            WHERE roles IS NOT NULL 
              AND jsonb_typeof(roles) = 'array' 
              AND jsonb_array_length(roles) > 0
        LOOP
            WITH role_elements AS (
                SELECT 
                    elem,
                    ordinality,
                    REGEXP_REPLACE(elem, '\s+\d+$', '') AS base_role,
                    ROW_NUMBER() OVER (
                        PARTITION BY REGEXP_REPLACE(elem, '\s+\d+$', '')
                        ORDER BY ordinality
                    ) AS seq
                FROM jsonb_array_elements_text(r.roles) WITH ORDINALITY AS t(elem, ordinality)
            )
            SELECT jsonb_agg(
                CASE 
                    WHEN seq = 1 THEN base_role 
                    ELSE base_role || ' ' || seq 
                END 
                ORDER BY ordinality
            )
            INTO new_roles_jsonb
            FROM role_elements;

            IF new_roles_jsonb IS NOT NULL AND new_roles_jsonb != r.roles THEN
                UPDATE public.fw_sub_events 
                SET roles = new_roles_jsonb 
                WHERE id = r.id;
            END IF;
        END LOOP;
    ELSIF col_type = 'ARRAY' THEN
        FOR r IN 
            SELECT id, roles 
            FROM public.fw_sub_events 
            WHERE roles IS NOT NULL 
              AND array_length(roles, 1) > 0
        LOOP
            WITH role_elements AS (
                SELECT 
                    elem,
                    ordinality,
                    REGEXP_REPLACE(elem, '\s+\d+$', '') AS base_role,
                    ROW_NUMBER() OVER (
                        PARTITION BY REGEXP_REPLACE(elem, '\s+\d+$', '')
                        ORDER BY ordinality
                    ) AS seq
                FROM unnest(r.roles) WITH ORDINALITY AS t(elem, ordinality)
            )
            SELECT array_agg(
                CASE 
                    WHEN seq = 1 THEN base_role 
                    ELSE base_role || ' ' || seq 
                END 
                ORDER BY ordinality
            )
            INTO new_roles_array
            FROM role_elements;

            IF new_roles_array IS NOT NULL AND new_roles_array != r.roles THEN
                UPDATE public.fw_sub_events 
                SET roles = new_roles_array 
                WHERE id = r.id;
            END IF;
        END LOOP;
    END IF;
END $$;
