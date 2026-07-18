-- ============================================================================
-- I-AM Preparation Tool - 0003: append-only, hash-chained check-ins
-- ============================================================================
-- Run ONCE in the Supabase SQL Editor of the SYDNEY project, at the same
-- time the matching app update ships (the old app's in-place edit of a
-- synced check-in will be rejected by the new trigger - that is the point).
--
-- What this changes, in plain English
-- -----------------------------------
-- Check-in entries become a tamper-evident journal:
--   * The SERVER assigns each entry a sequence number, a receipt time,
--     and a hash that chains it to the previous entry. The device
--     cannot set or influence any of these.
--   * Once an entry has been received, its content can never be edited.
--     The app writes a CORRECTION (a new entry pointing at the old one
--     via supersedes_local_id) instead - both stay visible.
--   * An entry can be WITHDRAWN: its words and ratings are erased, but
--     the fact an entry existed on that date remains. The withdrawal
--     time is server-assigned.
--   * Single entries can never be deleted by any client. Whole-record
--     deletion (account deletion, "start fresh") still works - those
--     run as foreign-key cascades, which RLS does not apply to.
--
-- Why: the date-range export can then honestly attest "N entries exist
-- in this range, all N are included, none were edited after receipt" -
-- which is what makes the journal usable as evidence of fluctuating
-- support needs. received_at (server clock) proves an entry EXISTED BY
-- that moment; `at` (device clock) is the participant's CLAIMED writing
-- time. The export never conflates the two.
--
-- Threat model, honestly: this protects against participant-side
-- fabrication (backdating, retro-editing, silent deletion) - the thing
-- an assessor would doubt. It does not protect against the database
-- operator, and we make no such claim anywhere.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Clean start (Will's decision, 2026-07-18): every check-in row so far
--    is test-era data from development verification passes. The chain
--    begins here, so the first real attestation carries no
--    "entries before X were kept under a previous system" asterisk.
-- ---------------------------------------------------------------------------

delete from public.checkins;

-- ---------------------------------------------------------------------------
-- 1. Chain + lifecycle columns
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

alter table public.checkins
  add column if not exists seq                 bigint,
  add column if not exists received_at         timestamptz,
  add column if not exists prev_hash           text,
  add column if not exists entry_hash          text,
  add column if not exists supersedes_local_id text,
  add column if not exists withdrawn_at        timestamptz;

comment on column public.checkins.seq is
  'Server-assigned, per-assessment, gapless from 1. Order of RECEIPT, not of claimed writing time.';
comment on column public.checkins.received_at is
  'Server clock at first insert. The non-forgeable "existed by" anchor. Client-supplied values are overwritten.';
comment on column public.checkins.entry_hash is
  'sha256 over prev_hash + seq + received_at + at + content. Chains each entry to the one before it.';
comment on column public.checkins.supersedes_local_id is
  'Set when this entry is a correction of an earlier one (same assessment). Both remain visible.';
comment on column public.checkins.withdrawn_at is
  'Server clock when the participant withdrew the entry (content erased, existence preserved).';

create unique index if not exists checkins_chain_idx
  on public.checkins (assessment_id, seq);

-- ---------------------------------------------------------------------------
-- 2. Insert trigger: server assigns the chain fields, always
-- ---------------------------------------------------------------------------

create or replace function public.checkins_assign_chain()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  last_row record;
begin
  -- One writer per assessment at a time, so two devices syncing at once
  -- get distinct, gapless seq values instead of colliding.
  perform pg_advisory_xact_lock(hashtext(new.assessment_id::text));

  select seq, entry_hash into last_row
    from public.checkins
    where assessment_id = new.assessment_id
    order by seq desc
    limit 1;

  -- Overwrite whatever the client sent. These are server truths.
  new.seq         := coalesce(last_row.seq, 0) + 1;
  new.received_at := now();
  new.prev_hash   := coalesce(last_row.entry_hash, 'genesis');
  new.entry_hash  := encode(extensions.digest(
      new.prev_hash
      || '|' || new.seq::text
      || '|' || new.received_at::text
      || '|' || new.at::text
      || '|' || coalesce(new.mood::text, '')
      || '|' || coalesce(new.mood_word, '')
      || '|' || coalesce(new.fatigue::text, '')
      || '|' || coalesce(new.pain::text, '')
      || '|' || coalesce(new.clarity::text, '')
      || '|' || coalesce(new.note, ''),
      'sha256'), 'hex');

  -- Entries are born live, never pre-withdrawn; withdrawal is a
  -- separate, server-timestamped transition (see update trigger).
  new.withdrawn_at := null;
  return new;
end;
$$;

create trigger checkins_assign_chain
  before insert on public.checkins
  for each row execute function public.checkins_assign_chain();

-- ---------------------------------------------------------------------------
-- 3. Update trigger: only two transitions exist
--    (a) idempotent re-push - the sync engine re-upserting an entry the
--        server already has, content identical (client_updated_at may
--        differ; it is a sync bookkeeping stamp, not content)
--    (b) withdrawal - withdrawn_at goes null -> set, content is erased,
--        and the server assigns the withdrawal time
--    Everything else is rejected. Chain fields and the claimed writing
--    time (at) are force-restored from the stored row in all cases, so
--    no update can ever rewrite history even when it is permitted.
-- ---------------------------------------------------------------------------

create or replace function public.checkins_immutable()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- History is not negotiable, whatever else this update wants.
  new.seq                 := old.seq;
  new.received_at         := old.received_at;
  new.prev_hash           := old.prev_hash;
  new.entry_hash          := old.entry_hash;
  new.at                  := old.at;
  new.local_id            := old.local_id;
  new.assessment_id       := old.assessment_id;
  new.user_id             := old.user_id;
  new.supersedes_local_id := old.supersedes_local_id;

  if old.withdrawn_at is not null then
    -- Already withdrawn: stays withdrawn, stays erased, keeps its
    -- original server withdrawal time (a re-push must not shift it).
    new.withdrawn_at := old.withdrawn_at;
    new.mood := null; new.fatigue := null; new.pain := null; new.clarity := null;
    new.mood_word := ''; new.note := '';
    return new;
  end if;

  if new.withdrawn_at is not null then
    -- Withdrawal: erase the words and ratings, keep the existence.
    -- The server sets the time; the client's value is ignored.
    new.withdrawn_at := now();
    new.mood := null; new.fatigue := null; new.pain := null; new.clarity := null;
    new.mood_word := ''; new.note := '';
    return new;
  end if;

  -- Not a withdrawal: only an identical re-push is allowed.
  if new.mood      is distinct from old.mood
     or new.mood_word is distinct from old.mood_word
     or new.fatigue is distinct from old.fatigue
     or new.pain    is distinct from old.pain
     or new.clarity is distinct from old.clarity
     or new.note    is distinct from old.note then
    raise exception 'Check-in entries cannot be edited after backup - write a correction instead'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger checkins_immutable
  before update on public.checkins
  for each row execute function public.checkins_immutable();

-- ---------------------------------------------------------------------------
-- 4. No client deletes, ever. Dropping the RLS delete policy (and the
--    table privilege) is sufficient and safer than a trigger: foreign-key
--    cascades - account deletion via auth.users, "start fresh" via the
--    assessments row - are internal referential actions that RLS and
--    table privileges do not apply to, so whole-record deletion keeps
--    working exactly as before. A client delete() now matches 0 rows.
-- ---------------------------------------------------------------------------

drop policy if exists "delete own checkins" on public.checkins;
revoke delete on public.checkins from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Verification (run after applying; see also the app-side live tests)
-- ---------------------------------------------------------------------------
-- Expect 3 policies on checkins (select/insert/update, no delete):
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'checkins' order by cmd;
-- Expect both triggers present:
--   select tgname from pg_trigger
--   where tgrelid = 'public.checkins'::regclass and not tgisinternal;
-- Chain spot-check after the app has synced a few entries:
--   select seq, received_at, left(prev_hash, 12) prev, left(entry_hash, 12) hash,
--          withdrawn_at is not null as withdrawn
--   from public.checkins order by assessment_id, seq;
