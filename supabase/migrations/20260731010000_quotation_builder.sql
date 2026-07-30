-- Migration: Complete Quotation Builder & Dynamic Proposal Engine
-- Creates quotation_templates and quotations tables

CREATE TABLE IF NOT EXISTS public.quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'Royal Wedding Package',
    theme_config JSONB DEFAULT '{
        "accent_color": "#D4AF37",
        "primary_font": "Playfair Display",
        "cover_style": "cinematic_dark",
        "background_style": "studio_gradient",
        "logo_url": ""
    }'::jsonb,
    sections_config JSONB DEFAULT '[
        {"id": "cover", "title": "Cover Page", "enabled": true},
        {"id": "about", "title": "About Our Studio", "enabled": true},
        {"id": "events", "title": "Event Breakdown & Crew", "enabled": true},
        {"id": "deliverables", "title": "What Is Included", "enabled": true},
        {"id": "add_ons", "title": "Add-On Extras", "enabled": true},
        {"id": "financials", "title": "Pricing & Taxes", "enabled": true},
        {"id": "payment_milestones", "title": "Payment Schedule", "enabled": true},
        {"id": "terms", "title": "Terms & Conditions", "enabled": true}
    ]'::jsonb,
    default_terms TEXT DEFAULT '1. 30% advance deposit to lock event dates. 2. Balance 60% on event day. 3. Remaining 10% upon final deliverable handover. 4. Raw data retained for 60 days.',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    client_id UUID REFERENCES public.workspace_clients(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.quotation_templates(id) ON DELETE SET NULL,
    quotation_number TEXT NOT NULL DEFAULT 'FW-2026-001',
    title TEXT NOT NULL DEFAULT 'Wedding Photography Proposal',
    client_name TEXT NOT NULL DEFAULT 'Valued Client',
    client_phone TEXT,
    client_email TEXT,
    event_date DATE,
    theme_config JSONB DEFAULT '{
        "accent_color": "#D4AF37",
        "primary_font": "Playfair Display",
        "cover_style": "cinematic_dark"
    }'::jsonb,
    sections_config JSONB DEFAULT '[
        {"id": "cover", "enabled": true},
        {"id": "about", "enabled": true},
        {"id": "events", "enabled": true},
        {"id": "deliverables", "enabled": true},
        {"id": "add_ons", "enabled": true},
        {"id": "financials", "enabled": true},
        {"id": "payment_milestones", "enabled": true},
        {"id": "terms", "enabled": true}
    ]'::jsonb,
    events JSONB DEFAULT '[
        {
            "id": "ev_1",
            "title": "Pre-Wedding Shoot",
            "days": 1,
            "venue": "Udaipur Location",
            "crew": "2 Photographers, 1 Cinematographer",
            "deliverables": ["Cinematic Teaser", "50 Edited Photos"],
            "rate": 75000
        },
        {
            "id": "ev_2",
            "title": "Wedding & Reception",
            "days": 2,
            "venue": "Palace Resort",
            "crew": "2 Candid Photographers, 2 Cinematographers, 1 Drone Pilot",
            "deliverables": ["Full Length Film", "Insta Reels", "400 Edited Photos", "Flush Mount Album"],
            "rate": 225000
        }
    ]'::jsonb,
    add_ons JSONB DEFAULT '[
        {
            "id": "addon_1",
            "title": "Extra Instagram Reels (2x)",
            "rate": 15000,
            "selected": true
        },
        {
            "id": "addon_2",
            "title": "48-Hour Express Teaser Delivery",
            "rate": 20000,
            "selected": false
        }
    ]'::jsonb,
    financials JSONB DEFAULT '{
        "subtotal": 315000,
        "discount_type": "flat",
        "discount_value": 15000,
        "gst_rate": 18,
        "total_amount": 354000
    }'::jsonb,
    payment_milestones JSONB DEFAULT '[
        {"label": "Booking Deposit", "percentage": 30, "amount": 106200, "due_description": "Upon signing proposal"},
        {"label": "Event Day Advance", "percentage": 60, "amount": 212400, "due_description": "On main event morning"},
        {"label": "Final Handover", "percentage": 10, "amount": 35400, "due_description": "Before album & film delivery"}
    ]'::jsonb,
    terms TEXT DEFAULT '1. 30% advance deposit to lock event dates. 2. Balance 60% on event day. 3. Remaining 10% upon final deliverable handover. 4. Travel & lodging borne by client unless specified.',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined')),
    client_notes TEXT,
    public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_quotation_templates_workspace ON public.quotation_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotations_workspace ON public.quotations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotations_public_token ON public.quotations(public_token);

-- Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow workspace access to quotation_templates" ON public.quotation_templates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow workspace access to quotations" ON public.quotations
    FOR ALL USING (true) WITH CHECK (true);
