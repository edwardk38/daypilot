-- Run this once in Supabase: SQL Editor → New query → paste → Run.

-- One JSON document per user holds the whole app state (same shape as the Claude-artifact version).
create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security;
create policy "own state: read"   on app_state for select using (auth.uid() = user_id);
create policy "own state: insert" on app_state for insert with check (auth.uid() = user_id);
create policy "own state: update" on app_state for update using (auth.uid() = user_id);

-- Push subscriptions (one row per device). Only the server (service role) reads these.
create table if not exists push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);
alter table push_subs enable row level security;
-- no policies: browsers can't read or write this table directly; /api/push-subscribe uses the service role.
