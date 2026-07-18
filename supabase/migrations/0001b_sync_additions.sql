-- ============================================================================
-- I-AM Preparation Tool — Phase 3, Stage 3: schema additions for sync
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor (same project as before).
--
-- * cu: per-section client edit stamps (jsonb map like {"p":"2026-07-12T...",
--   "d3":"...", "s":"...", "b":"..."}), written by the app on every push and
--   used on every pull to merge section-by-section: for each section, the
--   newer edit wins, so a stale device reconnecting can never overwrite
--   newer work wholesale.
-- * consent_v: which version of the consent wording the user agreed to
--   (2 = the version that discloses online storage in Sydney, Australia).
-- ============================================================================

alter table public.assessments
  add column if not exists cu jsonb not null default '{}'::jsonb,
  add column if not exists consent_v smallint;

-- Verification: should list both new columns.
--   select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='assessments'
--     and column_name in ('cu','consent_v');
