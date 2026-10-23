-- =====================================================================
-- Hakim IQ Labs — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
--
-- Stores ONLY numbers (scores, ratios, plan progress). No photos and no
-- face landmark coordinates ever reach the database.
-- Every table uses row-level security: a user can only see and change
-- their own rows. Deleting a user cascades to all of their data.
-- =====================================================================

-- ---------- Analyses (score history) ----------
create table if not exists public.analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  overall     real not null check (overall between 0 and 10),
  scores      jsonb not null,          -- { symmetry: 9.1, thirds: 8.7, ... }
  metrics     jsonb not null,          -- measured values { symmetry: 96.4, eyeSpacing: 1.02, ... }
  face_shape  text,                    -- oval | round | square | oblong | heart | diamond
  quality     smallint check (quality between 0 and 100)
);

create index if not exists analyses_user_created_idx on public.analyses (user_id, created_at);

-- ---------- Glow-up plans ----------
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  timeline    text not null check (timeline in ('weeks', 'months', 'years')),
  plan        jsonb not null,          -- generated checklist (text + ids)
  completed   text[] not null default '{}',
  active      boolean not null default true
);

create index if not exists plans_user_active_idx on public.plans (user_id, active);

-- ---------- Row-level security ----------
alter table public.analyses enable row level security;
alter table public.plans enable row level security;

drop policy if exists "analyses: owner can select" on public.analyses;
drop policy if exists "analyses: owner can insert" on public.analyses;
drop policy if exists "analyses: owner can delete" on public.analyses;
create policy "analyses: owner can select" on public.analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy "analyses: owner can insert" on public.analyses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "analyses: owner can delete" on public.analyses for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "plans: owner can select" on public.plans;
drop policy if exists "plans: owner can insert" on public.plans;
drop policy if exists "plans: owner can update" on public.plans;
drop policy if exists "plans: owner can delete" on public.plans;
create policy "plans: owner can select" on public.plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "plans: owner can insert" on public.plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "plans: owner can update" on public.plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "plans: owner can delete" on public.plans for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Self-service account deletion ----------
-- The browser only has the public anon key, which can't delete auth users.
-- This SECURITY DEFINER function deletes *the caller's own* auth user; the
-- foreign keys above (on delete cascade) remove all of their rows with it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
