-- I-AM Preparation Tool - initial schema.
-- Run this against a Supabase project created in the Sydney
-- (ap-southeast-2) region - see README.md "Supabase project setup".
--
-- One row per user, holding the whole in-progress assessment as
-- jsonb. This mirrors the app's existing single-document state model
-- (ST in state.js) rather than normalising into per-domain tables,
-- which keeps sync trivial: the client always upserts its one row by
-- user_id and reconciles by updated_at (last-write-wins).

create table if not exists public.assessments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.assessments is 'One in-progress I-AM assessment per user. Contains sensitive health information - never disable Row Level Security on this table.';

-- Keep created_at immutable and updated_at fresh on every write.
create or replace function public.set_assessments_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assessments_timestamps on public.assessments;
create trigger trg_assessments_timestamps
  before insert or update on public.assessments
  for each row execute function public.set_assessments_timestamps();

alter table public.assessments enable row level security;

-- Each user may only ever see or touch their own row. There is no
-- policy that allows reading any other user's data, and no policy
-- grants access to anon (unauthenticated) requests.
create policy "select own assessment"
  on public.assessments for select
  using (auth.uid() = user_id);

create policy "insert own assessment"
  on public.assessments for insert
  with check (auth.uid() = user_id);

create policy "update own assessment"
  on public.assessments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own assessment"
  on public.assessments for delete
  using (auth.uid() = user_id);

-- Belt-and-braces: revoke the broad default grants and grant back only
-- what authenticated users need. RLS above is the real gate, but this
-- keeps the anon key from ever touching the table even if a policy is
-- misconfigured later.
revoke all on public.assessments from anon;
grant select, insert, update, delete on public.assessments to authenticated;
