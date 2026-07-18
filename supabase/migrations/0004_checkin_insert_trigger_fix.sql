-- ============================================================================
-- I-AM Preparation Tool - 0004: fix a real Postgres trigger bug in 0003
-- ============================================================================
-- Run ONCE in the Supabase SQL Editor of the SYDNEY project, after 0003 has
-- already been applied.
--
-- The bug, found live: every check-in withdrawal was silently rejected as
-- "cannot be edited after backup" - even though the immutability trigger's
-- own logic for a withdrawal transition is correct (verified by running the
-- exact same multi-row update as raw SQL, which succeeded).
--
-- The real cause is a documented Postgres behaviour that is easy to miss:
-- for `INSERT ... ON CONFLICT DO UPDATE`, the table's BEFORE INSERT trigger
-- fires for EVERY candidate row BEFORE the conflict check happens - even
-- rows that turn out to already exist and get redirected to the UPDATE
-- path. checkins_assign_chain (0003's BEFORE INSERT trigger) unconditionally
-- set `new.withdrawn_at := null`. For a row that already exists (which is
-- every real-world case: the app only ever pushes a non-null withdrawn_at
-- for an entry that has already been received and given a seq, so it will
-- always be a conflict, never a genuine insert), that forced null becomes
-- part of the proposed row Postgres calls EXCLUDED - and the app's upsert
-- (via PostgREST) uses `withdrawn_at = EXCLUDED.withdrawn_at` in its UPDATE
-- SET clause. So the real client-sent withdrawal timestamp was overwritten
-- with null before checkins_immutable (BEFORE UPDATE) ever saw it, making
-- every withdrawal look like an ordinary (rejected) content edit.
--
-- The fix: stop forcing withdrawn_at to null in the insert trigger. It is
-- unnecessary for genuine inserts anyway - the app only ever creates a
-- draft with withdrawn_at unset, so a true first-time insert already
-- carries null from the client. Removing the force-null stops it from
-- corrupting conflict-redirected rows without changing behaviour for real
-- inserts at all.
-- ============================================================================

create or replace function public.checkins_assign_chain()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  last_row record;
begin
  perform pg_advisory_xact_lock(hashtext(new.assessment_id::text));

  select seq, entry_hash into last_row
    from public.checkins
    where assessment_id = new.assessment_id
    order by seq desc
    limit 1;

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

  -- Removed: `new.withdrawn_at := null;` - see header comment. A genuine
  -- insert already carries null from the client; forcing it here corrupted
  -- EXCLUDED.withdrawn_at for conflict-redirected (i.e. actual update) rows.
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Confirm the function body no longer contains the force-null line:
--   select prosrc from pg_proc where proname = 'checkins_assign_chain';
--   (should NOT contain "new.withdrawn_at := null")
-- Then re-test a real withdrawal through the app - it should succeed on
-- the first attempt with no "cannot be edited" error.
