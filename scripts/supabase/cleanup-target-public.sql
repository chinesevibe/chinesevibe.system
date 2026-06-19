-- Clear all user data on TARGET project (e.g. cpyuibcrpfslgcazozid) before migration restore.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Modes (uncomment ONE block):
--   A) TRUNCATE — keeps tables/RLS/functions; use before pg_restore data-only or re-seed
--   B) DROP public — wipes schema; use before full pg_restore or `supabase db push`

-- =============================================================================
-- A) TRUNCATE all public tables (recommended if schema already matches prod)
-- =============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
    RAISE NOTICE 'truncated public.%', r.tablename;
  END LOOP;
END $$;

-- Optional: clear storage metadata (files in buckets — run only if re-uploading files)
-- DELETE FROM storage.objects;
-- Buckets/policies remain; re-copy files separately if needed.

-- Optional: reset migration history if you will `supabase db push` again from scratch
-- TRUNCATE supabase_migrations.schema_migrations;

-- =============================================================================
-- B) NUCLEAR — drop entire public schema (uncomment instead of block A)
-- =============================================================================
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
-- GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Verify empty:
SELECT count(*) AS public_tables
FROM pg_tables
WHERE schemaname = 'public';
