-- Schema inicial para Supabase (Auth + Postgres + RLS).
-- Banco alvo: PostgreSQL 15+.
-- Este arquivo assume execucao no SQL Editor do Supabase.

create extension if not exists pgcrypto;

-- =========================
-- Helpers
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Cria perfil/estrutura minima ao criar usuario no auth.users.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.portfolios (user_id, name)
  values (new.id, 'Carteira principal')
  on conflict (user_id, name) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- =========================
-- Core de usuarios (Supabase Auth)
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- =========================
-- Carteira e configuracoes
-- =========================

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Carteira principal',
  base_currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolios_user_name_unique unique (user_id, name)
);

create trigger trg_portfolios_updated_at
before update on public.portfolios
for each row execute function public.set_updated_at();

create table if not exists public.portfolio_positions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  ticker text not null,
  asset_type text not null default 'FII',
  quotas numeric(18, 6) not null default 0,
  average_price numeric(18, 6) not null default 0,
  current_price numeric(18, 6),
  dividend_yield_12m numeric(8, 4),
  segment_type text,
  entry_date date,
  last_quote_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_positions_unique_ticker unique (portfolio_id, ticker)
);

create trigger trg_portfolio_positions_updated_at
before update on public.portfolio_positions
for each row execute function public.set_updated_at();

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dashboard_chart_type text not null default 'donut',
  dashboard_chart_show_legend boolean not null default true,
  dashboard_chart_show_labels boolean not null default true,
  income_goal_monthly numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- =========================
-- Planos e assinaturas
-- =========================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  billing_interval text not null,
  price_cents integer not null default 0,
  currency text not null default 'BRL',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_billing_interval_check check (billing_interval in ('monthly', 'yearly'))
);

create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  external_provider text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check check (status in ('trialing', 'active', 'past_due', 'canceled'))
);

create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create unique index if not exists subscriptions_external_id_unique
  on public.subscriptions (external_provider, external_subscription_id)
  where external_provider is not null and external_subscription_id is not null;

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  access_level text not null default 'enabled',
  usage_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_plan_feature_unique unique (plan_id, feature_key)
);

create trigger trg_entitlements_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- Indices
-- =========================

create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists portfolio_positions_portfolio_id_idx on public.portfolio_positions(portfolio_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscription_events_subscription_id_idx on public.subscription_events(subscription_id);
create index if not exists audit_events_user_id_idx on public.audit_events(user_id);

-- =========================
-- RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_positions enable row level security;
alter table public.user_settings enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.subscription_events enable row level security;
alter table public.audit_events enable row level security;

-- Profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Portfolios
drop policy if exists portfolios_select_own on public.portfolios;
create policy portfolios_select_own on public.portfolios
for select to authenticated
using (user_id = auth.uid());

drop policy if exists portfolios_insert_own on public.portfolios;
create policy portfolios_insert_own on public.portfolios
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists portfolios_update_own on public.portfolios;
create policy portfolios_update_own on public.portfolios
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists portfolios_delete_own on public.portfolios;
create policy portfolios_delete_own on public.portfolios
for delete to authenticated
using (user_id = auth.uid());

-- Portfolio positions (via ownership da carteira)
drop policy if exists positions_select_own on public.portfolio_positions;
create policy positions_select_own on public.portfolio_positions
for select to authenticated
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = portfolio_positions.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists positions_insert_own on public.portfolio_positions;
create policy positions_insert_own on public.portfolio_positions
for insert to authenticated
with check (
  exists (
    select 1
    from public.portfolios p
    where p.id = portfolio_positions.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists positions_update_own on public.portfolio_positions;
create policy positions_update_own on public.portfolio_positions
for update to authenticated
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = portfolio_positions.portfolio_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.portfolios p
    where p.id = portfolio_positions.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists positions_delete_own on public.portfolio_positions;
create policy positions_delete_own on public.portfolio_positions
for delete to authenticated
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = portfolio_positions.portfolio_id
      and p.user_id = auth.uid()
  )
);

-- User settings
drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Plans / Entitlements: leitura publica (landing/precos).
drop policy if exists plans_select_public on public.plans;
create policy plans_select_public on public.plans
for select to anon, authenticated
using (is_active = true);

drop policy if exists entitlements_select_public on public.entitlements;
create policy entitlements_select_public on public.entitlements
for select to anon, authenticated
using (true);

-- Subscriptions: usuario final pode somente ler a propria assinatura.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
for select to authenticated
using (user_id = auth.uid());

-- Subscription events: leitura do historico da propria assinatura.
drop policy if exists subscription_events_select_own on public.subscription_events;
create policy subscription_events_select_own on public.subscription_events
for select to authenticated
using (
  exists (
    select 1
    from public.subscriptions s
    where s.id = subscription_events.subscription_id
      and s.user_id = auth.uid()
  )
);

-- Audit events: usuario pode consultar os proprios eventos.
drop policy if exists audit_events_select_own on public.audit_events;
create policy audit_events_select_own on public.audit_events
for select to authenticated
using (user_id = auth.uid());
