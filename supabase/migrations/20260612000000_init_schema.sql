-- Supabase SQL DDL for FW Core Platform
-- Enables UUID generation and standard cron extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles / Workspaces Table
create table public.profiles (
    id uuid primary key default auth.uid(),
    workspace_name text not null,
    meta_verify_token text,
    meta_access_token text,
    google_access_token text,
    google_refresh_token text,
    whastboost_api_url text default 'https://api.whastboost.com',
    whastboost_token text,
    whastboost_device_id text,
    whastboost_status text default 'disconnected' check (whastboost_status in ('connected', 'disconnected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Leads Table
create table public.leads (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    name text,
    email text,
    phone text not null,
    source text default 'facebook' not null,
    status text default 'new' not null check (status in ('new', 'contacted', 'warm', 'hot', 'closed', 'lost')),
    score text default 'Cold ❄️' not null check (score in ('High-Value 🔥', 'Warm 👍', 'Cold ❄️')),
    score_reason text,
    raw_payload jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Field Mappings Table
create table public.field_mappings (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    meta_field_key text not null,
    system_field_key text not null, -- e.g., 'name', 'email', 'phone', 'budget', 'venue', 'event_date'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(workspace_id, meta_field_key)
);

-- 4. Sequences Table
create table public.sequences (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Sequence Steps Table
create table public.sequence_steps (
    id uuid primary key default gen_random_uuid(),
    sequence_id uuid references public.sequences(id) on delete cascade not null,
    step_number integer not null,
    delay_days integer not null default 0,
    message_template text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(sequence_id, step_number)
);

-- 6. Queue Messages Table
create table public.queue_messages (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    lead_id uuid references public.leads(id) on delete cascade not null,
    sequence_step_id uuid references public.sequence_steps(id) on delete set null,
    scheduled_for timestamp with time zone not null,
    message_body text not null,
    status text default 'pending' not null check (status in ('pending', 'processing', 'sent', 'failed')),
    retry_count integer default 0 not null,
    last_error text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Live Activity Logs Table
create table public.live_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.profiles(id) on delete cascade not null,
    lead_id uuid references public.leads(id) on delete set null,
    event_type text not null, -- e.g., 'webhook_ingested', 'drip_scheduled', 'whatsapp_sent', 'whatsapp_failed', 'sync_google'
    message text not null,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance optimization
create index idx_leads_workspace_id on public.leads(workspace_id);
create index idx_leads_phone on public.leads(phone);
create index idx_field_mappings_workspace_id on public.field_mappings(workspace_id);
create index idx_sequences_workspace_id on public.sequences(workspace_id);
create index idx_sequence_steps_sequence_id on public.sequence_steps(sequence_id);
create index idx_queue_messages_scheduled_status on public.queue_messages(status, scheduled_for);
create index idx_live_logs_workspace_created on public.live_logs(workspace_id, created_at desc);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.field_mappings enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.queue_messages enable row level security;
alter table public.live_logs enable row level security;

-- Row Level Security (RLS) Policies

-- Profiles: Users can select/update their own profile
create policy "Users can view own profile" on public.profiles 
    for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles 
    for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles 
    for insert with check (auth.uid() = id);

-- Leads: tenant isolation
create policy "Tenant leads isolation" on public.leads 
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- Field Mappings
create policy "Tenant field mappings isolation" on public.field_mappings 
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- Sequences
create policy "Tenant sequences isolation" on public.sequences 
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- Sequence Steps (accessed via sequences)
create policy "Tenant sequence steps isolation" on public.sequence_steps 
    for all using (
        exists (
            select 1 from public.sequences 
            where public.sequences.id = public.sequence_steps.sequence_id 
            and public.sequences.workspace_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.sequences 
            where public.sequences.id = public.sequence_steps.sequence_id 
            and public.sequences.workspace_id = auth.uid()
        )
    );

-- Queue Messages
create policy "Tenant queue messages isolation" on public.queue_messages 
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- Live Logs
create policy "Tenant live logs isolation" on public.live_logs 
    for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- Automated trigger to create profile row when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, workspace_name, whastboost_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1) || '''s Studio'),
    'disconnected'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
