-- Run this in the Supabase SQL editor after creating your project

-- Enable RLS
alter table if exists public.user_settings enable row level security;
alter table if exists public.what_if_scenarios enable row level security;
alter table if exists public.cached_grades enable row level security;

-- user_settings: stores district URL and username (NOT password)
create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  district_url text not null,
  stu_username text not null,
  updated_at   timestamptz default now()
);

-- what_if_scenarios: stores what-if grade overrides per user
create table if not exists public.what_if_scenarios (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  overrides  jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cached_grades: optional cache of the last fetched gradebook
create table if not exists public.cached_grades (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  gradebook  jsonb not null,
  fetched_at timestamptz default now()
);

-- RLS policies: users can only see/modify their own data

create policy "Users can read their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);

create policy "Users can read their own scenarios"
  on public.what_if_scenarios for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scenarios"
  on public.what_if_scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own scenarios"
  on public.what_if_scenarios for update
  using (auth.uid() = user_id);

create policy "Users can delete their own scenarios"
  on public.what_if_scenarios for delete
  using (auth.uid() = user_id);

create policy "Users can read their own cached grades"
  on public.cached_grades for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own cached grades"
  on public.cached_grades for all
  using (auth.uid() = user_id);
