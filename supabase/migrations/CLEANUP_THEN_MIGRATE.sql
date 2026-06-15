-- CLEANUP + FULL MIGRATION (V3.1)
-- Step 1: Drop all tables (cascade)
-- Step 2: Run full migration

-- ============================================
-- CLEANUP: Drop all HR + Inventory tables
-- ============================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ============================================
-- Now run the full migration below
-- ============================================

