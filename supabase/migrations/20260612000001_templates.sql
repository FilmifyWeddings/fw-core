-- Migration: Add WhatsApp Templates Schema
-- Creates a table for dynamic message templates

create table if not exists public.whatsapp_templates (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    category text not null check (category in ('utility', 'marketing', 'authentication')),
    language text not null default 'en_US',
    type text not null check (type in ('text', 'media', 'list', 'poll')),
    status text default 'pending' not null check (status in ('pending', 'approved', 'rejected')),
    
    -- JSONB content structure to store dynamic payload (body, footer, media parameters, list rows, or poll options)
    payload jsonb default '{}'::jsonb not null,
    
    -- Action buttons matrix (quick reply, url, or phone)
    buttons jsonb default '[]'::jsonb not null,
    
    meta_approval_required boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(workspace_id, name)
);

-- Indexes for search optimization
create index if not exists idx_whatsapp_templates_workspace_id on public.whatsapp_templates(workspace_id);
create index if not exists idx_whatsapp_templates_status on public.whatsapp_templates(status);

-- Enable Row Level Security (RLS)
alter table public.whatsapp_templates enable row level security;

-- Tenant Isolation Policies
create policy "Tenant whatsapp templates isolation" on public.whatsapp_templates
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);
