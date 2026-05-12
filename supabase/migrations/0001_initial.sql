-- EatPlan schema: profiles, goals, progress logs, meal plans
-- RLS: only the owning user (auth.uid()) can read/write their rows.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text check (sex in ('male','female')) not null,
  age int not null check (age between 13 and 100),
  height_cm numeric not null check (height_cm between 100 and 230),
  activity_level text not null check (activity_level in ('sedentary','light','moderate','active','very_active')),
  restrictions text[] not null default '{}',
  equipment text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_weight_kg numeric not null,
  current_body_fat_pct numeric not null,
  target_weight_kg numeric not null,
  target_body_fat_pct numeric not null,
  target_date date not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_progress_user_date on public.progress_logs (user_id, log_date desc);

create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  entries jsonb not null,
  total_cost_twd numeric not null,
  total_calories int not null,
  total_protein_g int not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.progress_logs enable row level security;
alter table public.meal_plans enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goal" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own progress" on public.progress_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own meal plan" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
