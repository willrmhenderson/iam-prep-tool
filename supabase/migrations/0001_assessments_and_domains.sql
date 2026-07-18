-- ============================================================================
-- I-AM Preparation Tool — Phase 3, Stage 1: Schema + Row-Level Security
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor of the SYDNEY (ap-southeast-2)
-- project. It is idempotent-ish: safe to re-run on a fresh project; if you
-- need to start over, drop the four tables first.
--
-- Design notes
-- ------------
-- * One assessment row per user (UNIQUE on user_id). "Start fresh" in the app
--   deletes the row and its children rather than creating a second one.
-- * Column names mirror the localStorage (iam_v6) keys 1:1 wherever possible,
--   so migration code is a direct field-for-field copy:
--     assessments.participant  <- ST.p      (name, dob, ndis, disability, by,
--                                            role, date, goals, barriers)
--     assessments.adv          <- ST.adv    (typical, hard, risks, informal,
--                                            equip, history, worked, failed, myword)
--     assessments.psych        <- ST.psych  (overview, goals, notes, readiness)
--     assessments.preq         <- ST.preq   (dayRating, dayNote, disabilityDesc,
--                                            trajectory, changeNote, dayVariation,
--                                            assessHistory, assessDifficulty,
--                                            commPref, commBarrier, commAdjust,
--                                            sessionFlag)
--     assessment_domains       <- ST.d[i]   one row per domain, i = 0..11
--     support_persons          <- ST.sups[] one row per support person
--     before_ratings           <- ST.brate + ST.brateLockedAt
--       items is a jsonb map of "d{domain}i{item}" -> integer 0..4,
--       exactly as produced by brKey() in the app.
-- * client_updated_at is set by the APP from the device clock at edit time.
--   Offline sync (Stage 4) compares it section-by-section so a stale device
--   reconnecting cannot clobber newer work with older data.
-- * Every child row carries user_id (not just assessment_id) so RLS is a
--   single indexed equality check, no joins.
-- * Account deletion: every table references auth.users ON DELETE CASCADE.
--   When the delete-account Edge Function (Stage 2) removes the auth user,
--   Postgres wipes every row that belonged to them. No orphans possible.
-- * The before-ratings lock is enforced SERVER-SIDE by a trigger: once
--   locked = true, items / locked / locked_at can never change again, even
--   by a malicious or buggy client. Deleting the row (account deletion or
--   DELETE-confirmed reset) remains allowed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  role              text,                          -- ST.role: participant | support | psych
  step              jsonb,                         -- ST.step: string or {t:"d", i:n}
  participant       jsonb not null default '{}'::jsonb,  -- ST.p
  adv               jsonb not null default '{}'::jsonb,  -- ST.adv
  psych             jsonb not null default '{}'::jsonb,  -- ST.psych
  preq              jsonb not null default '{}'::jsonb,  -- ST.preq
  consent_date      timestamptz,                   -- ST.consentDate
  saved_at          timestamptz,                   -- ST.savedAt (client save stamp)
  client_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint assessments_one_per_user unique (user_id)
);

create table public.assessment_domains (
  assessment_id     uuid not null
                      references public.assessments (id) on delete cascade,
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  domain_index      smallint not null check (domain_index between 0 and 11),
  -- Field names below are the exact iam_v6 keys for ST.d[domain_index]:
  gs                text not null default '',      -- good-day story
  bs                text not null default '',      -- bad/hard-day story
  tab               text not null default 'good',  -- which tab was open
  freq              text not null default '',      -- support frequency
  stype             text not null default '',      -- support type
  impact            text not null default '',      -- impact level
  change            text not null default '',      -- what has changed
  notes             text not null default '',      -- extra notes
  so                text not null default '',      -- support person observation
  sf                boolean not null default false,-- support person flag (view differs)
  sfn               text not null default '',      -- support person flag note
  pn                text not null default '',      -- psychologist notes
  pf                boolean not null default false,-- psychologist flag
  client_updated_at timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (assessment_id, domain_index)
);

create table public.support_persons (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null
                      references public.assessments (id) on delete cascade,
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  local_id          integer not null,              -- ST.sups[n].id (client SID)
  position          smallint not null default 0,   -- order in the list
  name              text not null default '',
  rel               text not null default '',      -- relationship
  dur               text not null default '',      -- duration of support
  support           text not null default '',      -- what they do
  without_support   text not null default '',      -- ST.sups[n].without
  msg               text not null default '',      -- message / daily reality
  client_updated_at timestamptz,
  updated_at        timestamptz not null default now(),
  constraint support_persons_local_unique unique (assessment_id, local_id)
);

create table public.before_ratings (
  assessment_id     uuid primary key
                      references public.assessments (id) on delete cascade,
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  items             jsonb not null default '{}'::jsonb, -- {"d0i0": 3, ...} 0..4
  locked            boolean not null default false,     -- ST.brate.locked
  locked_at         timestamptz,                        -- ST.brateLockedAt
  client_updated_at timestamptz,
  updated_at        timestamptz not null default now()
);

-- Indexes for the RLS predicate and child lookups
create index assessment_domains_user_idx on public.assessment_domains (user_id);
create index support_persons_user_idx    on public.support_persons (user_id);
create index support_persons_assess_idx  on public.support_persons (assessment_id);
create index before_ratings_user_idx     on public.before_ratings (user_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger assessments_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();
create trigger assessment_domains_updated_at
  before update on public.assessment_domains
  for each row execute function public.set_updated_at();
create trigger support_persons_updated_at
  before update on public.support_persons
  for each row execute function public.set_updated_at();
create trigger before_ratings_updated_at
  before update on public.before_ratings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Server-side enforcement of the before-ratings lock
--    (the clinical baseline must be immutable once locked)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_before_ratings_lock()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.locked then
    if new.items     is distinct from old.items
       or new.locked is distinct from old.locked
       or new.locked_at is distinct from old.locked_at then
      raise exception 'Before ratings are locked and cannot be changed'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger before_ratings_lock_guard
  before update on public.before_ratings
  for each row execute function public.enforce_before_ratings_lock();

-- ---------------------------------------------------------------------------
-- 4. Row-Level Security: a user can only ever touch their own rows
-- ---------------------------------------------------------------------------

alter table public.assessments        enable row level security;
alter table public.assessment_domains enable row level security;
alter table public.support_persons    enable row level security;
alter table public.before_ratings     enable row level security;

-- assessments
create policy "select own"  on public.assessments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own"  on public.assessments for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own"  on public.assessments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own"  on public.assessments for delete to authenticated
  using ((select auth.uid()) = user_id);

-- assessment_domains
create policy "select own"  on public.assessment_domains for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own"  on public.assessment_domains for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own"  on public.assessment_domains for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own"  on public.assessment_domains for delete to authenticated
  using ((select auth.uid()) = user_id);

-- support_persons
create policy "select own"  on public.support_persons for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own"  on public.support_persons for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own"  on public.support_persons for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own"  on public.support_persons for delete to authenticated
  using ((select auth.uid()) = user_id);

-- before_ratings
create policy "select own"  on public.before_ratings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own"  on public.before_ratings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own"  on public.before_ratings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own"  on public.before_ratings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No policies are created for the anon role: logged-out visitors can read and
-- write NOTHING. RLS denies by default.

-- ---------------------------------------------------------------------------
-- 5. Verification (run these after the script; both should succeed)
-- ---------------------------------------------------------------------------
-- Expect 4 rows, all with rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Expect 16 policies (4 per table):
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' order by tablename, cmd;
