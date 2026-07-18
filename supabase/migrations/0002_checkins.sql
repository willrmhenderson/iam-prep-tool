-- I-AM Preparation Tool - daily check-in / journal feature.
-- Purely additive: does not alter assessments, assessment_domains,
-- support_persons, or before_ratings. Follows the same pattern as
-- support_persons (local_id + client_updated_at, upsert on
-- (assessment_id, local_id), delete-sync for removed rows) so it
-- plugs into the existing proven sync design without inventing a new
-- pattern.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  at timestamptz not null,
  mood smallint,
  mood_word text default '',
  fatigue smallint,
  pain smallint,
  clarity smallint,
  note text default '',
  client_updated_at timestamptz not null default now(),
  unique (assessment_id, local_id)
);

comment on table public.checkins is 'Daily check-in / journal entries. Contains free-text notes that may include sensitive health information - never disable Row Level Security on this table.';

create index if not exists checkins_assessment_id_idx on public.checkins(assessment_id);

alter table public.checkins enable row level security;

create policy "select own checkins"
  on public.checkins for select
  using (auth.uid() = user_id);

create policy "insert own checkins"
  on public.checkins for insert
  with check (auth.uid() = user_id);

create policy "update own checkins"
  on public.checkins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own checkins"
  on public.checkins for delete
  using (auth.uid() = user_id);

revoke all on public.checkins from anon;
grant select, insert, update, delete on public.checkins to authenticated;
