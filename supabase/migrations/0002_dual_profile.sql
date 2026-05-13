-- Extend schema to support dual-profile household model and phase tracking

-- profiles: add name + partner_profile (JSONB) + weekly_budget
alter table public.profiles
  add column if not exists name text not null default '',
  add column if not exists partner_profile jsonb,
  add column if not exists weekly_budget_twd int not null default 1200;

-- goals: add phase tracking + partner_goal (JSONB)
alter table public.goals
  add column if not exists current_phase int not null default 0,
  add column if not exists phase_weeks int not null default 4,
  add column if not exists partner_goal jsonb;

-- progress_logs: add profile_id to distinguish primary vs partner entries
alter table public.progress_logs
  add column if not exists profile_id text not null default 'primary'
    check (profile_id in ('primary', 'partner'));

-- update unique constraint to include profile_id
alter table public.progress_logs
  drop constraint if exists progress_logs_user_id_log_date_key;

alter table public.progress_logs
  add constraint progress_logs_user_id_log_date_profile_key
    unique (user_id, log_date, profile_id);

-- meal_plans: add weekly_budget reference
alter table public.meal_plans
  add column if not exists weekly_budget_twd int not null default 1200;
