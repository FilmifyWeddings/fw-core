-- Migration: Master Settings Tables (Services, Packages, Expenses)
-- Enforces multi-tenancy bounds via tenant_id and client_id (Law 1 & Mandate Compliance)

-- 1. Global Photography Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    base_price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant services isolation" ON public.services;
CREATE POLICY "Tenant services isolation" ON public.services
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);


-- 2. Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    description TEXT,
    services_included JSONB DEFAULT '[]'::jsonb NOT NULL, -- list of service ids or objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant packages isolation" ON public.packages;
CREATE POLICY "Tenant packages isolation" ON public.packages
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX IF NOT EXISTS idx_packages_tenant ON public.packages(tenant_id);


-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_id UUID, -- Optional client link (Client-wise isolation)
    amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant expenses isolation" ON public.expenses;
CREATE POLICY "Tenant expenses isolation" ON public.expenses
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_client ON public.expenses(tenant_id, client_id);
