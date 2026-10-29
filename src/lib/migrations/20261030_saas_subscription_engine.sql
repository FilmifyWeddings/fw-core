-- ==============================================================================
-- SQL MIGRATION: SAAS SUBSCRIPTION ENGINE & GOD-MODE GOVERNANCE (PHASE 1)
-- Enterprise-grade schema for StudioCore scaling to 100,000+ Studios & Multi-Crore ARR
-- ==============================================================================

-- 1. Ensure custom_overrides JSONB and subscription columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_overrides JSONB DEFAULT '{
  "storage_quota_gb": null,
  "team_members_limit": null,
  "events_per_month_limit": null,
  "ai_scans_limit": null,
  "features": {
    "ai_face_search": true,
    "video_review": true,
    "team_payroll": true,
    "whatsapp_automation": true,
    "white_label": false,
    "client_portal": true
  },
  "admin_notes": ""
}'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'; -- 'active', 'past_due', 'grace_period', 'canceled', 'suspended'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'; -- 'monthly', 'yearly', 'lifetime'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'INR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;

-- 2. Master Subscription Plans Table (Configurable Tiers)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY, -- 'starter', 'pro', 'enterprise', 'vip'
    name TEXT NOT NULL,
    tagline TEXT,
    price_monthly INT NOT NULL, -- In INR rupees (e.g. 799)
    price_yearly INT NOT NULL,  -- In INR rupees (e.g. 7999)
    storage_bytes_limit BIGINT NOT NULL, -- e.g. 32212254720 for 30 GB
    team_members_limit INT NOT NULL DEFAULT 1,
    events_per_month_limit INT NOT NULL DEFAULT 3,
    ai_face_scans_limit INT NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans if not already present
INSERT INTO public.subscription_plans (id, name, tagline, price_monthly, price_yearly, storage_bytes_limit, team_members_limit, events_per_month_limit, ai_face_scans_limit, features)
VALUES 
(
  'trial', 
  'Free Trial', 
  '14-Day Full-Featured Exploration', 
  0, 
  0, 
  10737418240, -- 10 GB
  2, 
  2, 
  500, 
  '["gallery", "ai_face_search", "video_review", "crm_finance"]'::jsonb
),
(
  'starter', 
  'Starter Solo', 
  'Perfect for Independent Photographers', 
  799, 
  7999, 
  32212254720, -- 30 GB
  1, 
  5, 
  1500, 
  '["gallery", "ai_face_search", "crm_finance", "client_portal"]'::jsonb
),
(
  'pro', 
  'Studio Pro', 
  'Most Popular for Growing Wedding Studios', 
  1799, 
  17999, 
  161061273600, -- 150 GB
  5, 
  25, 
  10000, 
  '["gallery", "ai_face_search", "video_review", "crm_finance", "team_payroll", "whatsapp_automation", "client_portal"]'::jsonb
),
(
  'enterprise', 
  'Agency Enterprise', 
  'Uncapped Power for Multi-Crew Production Houses', 
  3499, 
  34999, 
  644245094400, -- 600 GB
  9999, 
  9999, 
  999999, 
  '["gallery", "ai_face_search", "video_review", "crm_finance", "team_payroll", "whatsapp_automation", "white_label", "client_portal", "custom_domain"]'::jsonb
),
(
  'vip', 
  'Lifetime VIP', 
  'Founder Privilege & Unlimited Access', 
  0, 
  0, 
  1099511627776, -- 1 TB
  9999, 
  9999, 
  999999, 
  '["gallery", "ai_face_search", "video_review", "crm_finance", "team_payroll", "whatsapp_automation", "white_label", "client_portal", "custom_domain"]'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  storage_bytes_limit = EXCLUDED.storage_bytes_limit,
  team_members_limit = EXCLUDED.team_members_limit,
  events_per_month_limit = EXCLUDED.events_per_month_limit,
  ai_face_scans_limit = EXCLUDED.ai_face_scans_limit,
  features = EXCLUDED.features,
  updated_at = NOW();

-- 3. Live Active Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'grace_period', 'canceled', 'expired'
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
    amount_paid_inr INT NOT NULL DEFAULT 0,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    razorpay_subscription_id TEXT UNIQUE,
    razorpay_customer_id TEXT,
    razorpay_plan_id TEXT,
    payment_method TEXT DEFAULT 'UPI', -- 'UPI', 'CARD', 'NETBANKING', 'MANUAL_OVERRIDE'
    last_payment_date TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Subscription Addons Table (Extra Storage, Extra AI Scans, Seats)
CREATE TABLE IF NOT EXISTS public.subscription_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    addon_type TEXT NOT NULL, -- 'storage_100gb', 'storage_500gb', 'ai_scans_5k', 'team_seat'
    quantity INT NOT NULL DEFAULT 1,
    extra_storage_bytes BIGINT DEFAULT 0,
    extra_ai_scans INT DEFAULT 0,
    extra_team_seats INT DEFAULT 0,
    price_paid_inr INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GST Compliant Invoices Table (Sequential, Legal SAC 998315)
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE, -- e.g. 'SC-2026-0001'
    workspace_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    amount_subtotal INT NOT NULL, -- Base amount in rupees
    tax_rate_percent NUMERIC(4,2) DEFAULT 18.00, -- 18% GST
    tax_amount INT NOT NULL, -- GST in rupees
    amount_total INT NOT NULL, -- Total charged
    currency TEXT DEFAULT 'INR',
    sac_code TEXT DEFAULT '998315', -- Hosting & IT Infrastructure Provisioning
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_gstin TEXT,
    customer_state TEXT,
    studio_name TEXT,
    payment_status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'failed', 'refunded'
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    pdf_download_url TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Webhook Idempotency Table (Prevents duplicate charging or double extension)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id TEXT PRIMARY KEY, -- event_id from Razorpay (e.g. 'evt_123456789')
    event_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. High-Performance Indexes for 100,000+ Scale
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at ON public.profiles(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON public.subscription_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.subscription_invoices(created_at);

-- 8. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
