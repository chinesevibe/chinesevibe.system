-- Migration: Add default check-in / check-out time columns to hr_employees
-- Task: T150 — Fix Default Check-in/Check-out Time Backend Implementation
-- These fields allow HR to set per-employee default attendance times
-- when no fixed work shift (work_shift_id) is assigned.

ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS default_check_in_time  time,
  ADD COLUMN IF NOT EXISTS default_check_out_time time;

COMMENT ON COLUMN hr_employees.default_check_in_time  IS 'Employee-level default check-in time. Used as attendance fallback when no shift is assigned.';
COMMENT ON COLUMN hr_employees.default_check_out_time IS 'Employee-level default check-out time. Used as attendance fallback when no shift is assigned.';
