# Attendance normalization audit draft

Scope: `public.hr_attendance` and `public.hr_attendance_submissions` in Supabase prod.

Canonical rule from runtime:
- Overnight shift `workDate` follows `shift_date` when it exists.
- The cutoff job uses `buildAttendanceWorkDate(row) = row.shift_date ?? ictDateFromUtc(check_in_at)`.

## Data anomalies found

### 3 completed rows with `work_hours = 0`

| attendance_id | employee | shift_date | check_in_at | check_out_at | submission |
|---|---|---|---|---|---|
| `38807fb7-1c8e-4b0c-a4ca-aeaf783b0ad6` | `CNV025 / KYI KYI SOE` | `null` | `2026-06-18T07:00:04.409+00:00` | `2026-06-18T19:00:51.837+00:00` | `eefaa186-d74b-4920-b603-c3023aa2165b` |
| `7ec51922-dd9d-4220-90d5-d330814e06a6` | `CVN005 / Nang Nge Nge` | `2026-06-18` | `2026-06-18T07:00:00+00:00` | `2026-06-18T19:00:00+00:00` | `6e78e773-2666-4015-9057-4f79470f92d3` |
| `4e6d9c39-0e00-4849-b624-795fd52ed940` | `CNV043 / XINQI QIN` | `2026-06-18` | `2026-06-18T05:01:00+00:00` | `2026-06-18T17:06:00+00:00` | none |

### 14 approved submissions with `work_date` shifted by 1 day

All 14 rows below have `shift_date = 2026-06-18` but `hr_attendance_submissions.work_date = 2026-06-19`.

| attendance_id | employee | submission_id |
|---|---|---|
| `bceae795-3962-4cc2-a942-081eec129c04` | `CNV032 / Htet naing Aung` | `c6d5d1a0-2131-40d2-8f05-93f567d830d2` |
| `560d9216-7f2f-40b7-a38b-0ab4532ea841` | `CNV004 / Nang Law Kham` | `e7f15b4a-53ac-4fad-84f3-81853dec1611` |
| `c0c38961-071b-4d00-88ab-6138562bb8ec` | `CNV007 / Khun Myo Thi Ha` | `5f4758f9-d0db-4980-bf3b-d800b5784584` |
| `818d4fc1-f6d4-4240-83e2-96e1ab8a40e2` | `CNV008 / Sai ice say` | `1c2e843e-a653-4e89-8d1d-c2387add0916` |
| `1d209e71-8d10-4905-8b62-fde1b52a1e3a` | `CNV015 / Su Hlaing Win` | `2be43e80-f4be-4347-bd11-65a799072be2` |
| `39ddae58-ad93-417e-b93d-b05f68f54736` | `CNV016 / Ma Sein Htay` | `17416102-ee1b-4178-ae56-a2a14d965b83` |
| `5fb7ca05-33ba-4d67-bb74-af483b5e942b` | `CNV020 / LOUNG WE` | `a5ea74ae-7697-4bf3-a061-79b7eb05e140` |
| `3f5a3e48-7190-4637-9e88-626964df183d` | `CNV021 / WILAI SAEMA` | `f08ecb6f-c097-4c9f-8bf7-bfbca13d8c67` |
| `06706409-610c-4397-8029-062b607e1dc3` | `CNV024 / THAN THAN AYE` | `9dfc1e62-5f43-44c2-95a5-588c78260276` |
| `95ca675a-611e-4c51-a5f3-af1bc0e9f46b` | `CNV028 / SAI AON KHAY` | `2decd441-e9c1-46ae-8b09-f23adde6b727` |
| `94fb8fae-c9a2-4c4f-9572-158c6b596394` | `CNV035 / Sai Aung Nai` | `2550c619-419c-4fad-8b4a-1cdd45241b2c` |
| `c533eaae-2aec-4470-844e-be64469e4a55` | `CNV039 / HninNu Swe` | `d9365855-7da1-4ec5-90b6-736e27b8e92c` |
| `46c46b7c-8c73-472f-922e-c695be8de642` | `CNV040 / YiWei Sun` | `7ac11076-25be-426e-a2b8-2e4fa1186c05` |
| `7ec51922-dd9d-4220-90d5-d330814e06a6` | `CVN005 / Nang Nge Nge` | `6e78e773-2666-4015-9057-4f79470f92d3` |

## What this draft does not change

- It does not insert the missing submission for `CNV043` / `attendance_id=4e6d9c39-0e00-4849-b624-795fd52ed940`.
- It does not touch payroll hour lines yet.
- It does not modify any schema.

## Next step if you want full replay

Replay the finalize flow for `CNV043` or add a second controlled backfill that inserts:
- `hr_attendance_submissions`
- `hr_payroll_hour_lines`
