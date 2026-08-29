-- Nitzanim budget system — initial schema

create extension if not exists "pgcrypto";

-- ===== Years (Hebrew activity years) =====
create table years (
  id uuid primary key default gen_random_uuid(),
  hebrew_name text not null unique, -- e.g. 'תשפ"ו'
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== General base data per year (Sep..Jun) =====
create table year_general_data (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references years(id) on delete cascade,
  calendar_month int not null check (calendar_month between 1 and 12),
  month_order int not null check (month_order between 1 and 10), -- 1=Sep .. 10=Jun
  activity_days int not null default 0,
  feeding_days int not null default 0,
  unique (year_id, calendar_month)
);

-- ===== Model catalog (not year-scoped) =====
create table models (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('גנים','בתי_ספר')),
  created_at timestamptz not null default now()
);

-- ===== Per-year base data per model =====
create table model_base_data (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references years(id) on delete cascade,
  model_id uuid not null references models(id) on delete cascade,
  lead_daily_hours numeric(6,2) default 0,
  lead_hourly_rate numeric(10,2) default 0,
  assistant_daily_hours numeric(6,2) default 0,
  assistant_hourly_rate numeric(10,2) default 0,
  inclusion_assistant_daily_hours numeric(6,2) default 0,
  inclusion_assistant_hourly_rate numeric(10,2) default 0,
  coordinator_daily_hours numeric(6,2) default 0,
  coordinator_hourly_rate numeric(10,2) default 0,
  avg_participants numeric(6,2) default 0,
  min_clubs int default 0,
  max_clubs int default 0,
  unique (year_id, model_id)
);

-- ===== Per-year income table by LAMAS (socio-economic) level, per model =====
create table model_lamas_income (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references years(id) on delete cascade,
  model_id uuid not null references models(id) on delete cascade,
  lamas_level int not null check (lamas_level between 1 and 10),
  participant_income_monthly numeric(10,2) default 0,
  ministry_income_monthly numeric(10,2) default 0,
  unique (year_id, model_id, lamas_level)
);

-- ===== Clients =====
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== Profiles (role mapping for Supabase Auth users) =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','client')),
  client_id uuid references clients(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- ===== Client <-> Year association (+ LAMAS level chosen) =====
create table client_years (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  year_id uuid not null references years(id) on delete cascade,
  lamas_level int check (lamas_level between 1 and 10),
  created_at timestamptz not null default now(),
  unique (client_id, year_id)
);

-- ===== Which models a client operates in a given year =====
create table client_models (
  id uuid primary key default gen_random_uuid(),
  client_year_id uuid not null references client_years(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade, -- denormalized for RLS
  model_id uuid not null references models(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_year_id, model_id)
);

-- ===== Sub-models (client's named operational variants of a model) =====
create table sub_models (
  id uuid primary key default gen_random_uuid(),
  client_model_id uuid not null references client_models(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade, -- denormalized for RLS
  name text not null,
  avg_weeks_per_month numeric(5,2) default 4.33,
  active_months_count int default 10,
  participants_count numeric(6,2) default 0,
  groups_count int default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Per-month overrides for a sub-model (defaults come from year_general_data) =====
create table sub_model_months (
  id uuid primary key default gen_random_uuid(),
  sub_model_id uuid not null references sub_models(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade, -- denormalized for RLS
  calendar_month int not null check (calendar_month between 1 and 12),
  month_order int not null check (month_order between 1 and 10),
  activity_days int,
  feeding_days int,
  short_camp_days int default 0,
  long_camp_days int default 0,
  unique (sub_model_id, calendar_month)
);

-- ===== Budget line items =====
create table budget_line_items (
  id uuid primary key default gen_random_uuid(),
  sub_model_id uuid not null references sub_models(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade, -- denormalized for RLS
  item_type text not null check (item_type in (
    'שכר','חוג_העשרה','מתכלים','הזנה','תקורה','הכנסה_משתתף','הכנסת_משרד'
  )),
  -- שכר fields
  role_label text, -- 'מוביל' | 'סייעת' | 'רכז' | 'סייעת_שילוב' | 'אחר' (+ notes for free text)
  hourly_rate numeric(10,2),
  employer_cost_multiplier numeric(5,3),
  hours_per_day numeric(6,2),
  hours_per_week numeric(6,2),
  calc_method text check (calc_method in ('ימים','שבועות')),
  spread_method text check (spread_method in ('לפי_ימים','לפי_חודשי_פעילות')),
  -- חוג_העשרה fields
  weekly_count numeric(6,2),
  session_cost numeric(10,2),
  -- מתכלים fields
  annual_cost numeric(10,2),
  -- הזנה fields
  meal_cost numeric(10,2),
  -- תקורה fields
  overhead_pct numeric(5,2) default 10,
  -- הכנסות fields (null = use model_lamas_income default via client's lamas_level)
  income_monthly_override numeric(10,2),
  notes text,
  source text not null default 'manual' check (source in ('base_default','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== RLS helper functions =====
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function public.current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid();
$$;

-- ===== Enable RLS =====
alter table years enable row level security;
alter table year_general_data enable row level security;
alter table models enable row level security;
alter table model_base_data enable row level security;
alter table model_lamas_income enable row level security;
alter table clients enable row level security;
alter table profiles enable row level security;
alter table client_years enable row level security;
alter table client_models enable row level security;
alter table sub_models enable row level security;
alter table sub_model_months enable row level security;
alter table budget_line_items enable row level security;

-- Reference/base data: any authenticated user can read, only admin can write
create policy "read_all_years" on years for select using (auth.role() = 'authenticated');
create policy "admin_write_years" on years for all using (is_admin()) with check (is_admin());

create policy "read_all_ygd" on year_general_data for select using (auth.role() = 'authenticated');
create policy "admin_write_ygd" on year_general_data for all using (is_admin()) with check (is_admin());

create policy "read_all_models" on models for select using (auth.role() = 'authenticated');
create policy "admin_write_models" on models for all using (is_admin()) with check (is_admin());

create policy "read_all_mbd" on model_base_data for select using (auth.role() = 'authenticated');
create policy "admin_write_mbd" on model_base_data for all using (is_admin()) with check (is_admin());

create policy "read_all_mli" on model_lamas_income for select using (auth.role() = 'authenticated');
create policy "admin_write_mli" on model_lamas_income for all using (is_admin()) with check (is_admin());

-- Profiles: self read, admin full
create policy "self_read_profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin_write_profiles" on profiles for all using (is_admin()) with check (is_admin());

-- Clients: admin full, client can read own row
create policy "client_read_own" on clients for select using (is_admin() or auth_user_id = auth.uid());
create policy "admin_write_clients" on clients for all using (is_admin()) with check (is_admin());

-- Client-scoped tables: admin full, client full on own rows
create policy "client_years_access" on client_years for all
  using (is_admin() or client_id = current_client_id())
  with check (is_admin() or client_id = current_client_id());

create policy "client_models_access" on client_models for all
  using (is_admin() or client_id = current_client_id())
  with check (is_admin() or client_id = current_client_id());

create policy "sub_models_access" on sub_models for all
  using (is_admin() or client_id = current_client_id())
  with check (is_admin() or client_id = current_client_id());

create policy "sub_model_months_access" on sub_model_months for all
  using (is_admin() or client_id = current_client_id())
  with check (is_admin() or client_id = current_client_id());

create policy "budget_line_items_access" on budget_line_items for all
  using (is_admin() or client_id = current_client_id())
  with check (is_admin() or client_id = current_client_id());
