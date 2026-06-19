#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parent
raw = (root / "prod-hr_attendance.json").read_text()
start = raw.find("{")
end = raw.rfind("}")
data = json.loads(raw[start : end + 1])["rows"]
print("ROW_COUNT", len(data))

cols = [
    "id",
    "employee_id",
    "check_in_at",
    "check_out_at",
    "check_in_location",
    "is_late",
    "work_hours",
    "created_at",
    "work_shift_id",
    "shift_date",
    "check_out_location",
    "location_review_status",
    "location_review_flags",
    "location_review_note",
    "location_reviewed_by",
    "location_reviewed_at",
]


def sql_literal(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        if not v:
            return "ARRAY[]::text[]"
        inner = ",".join("'" + str(x).replace("'", "''") + "'" for x in v)
        return f"ARRAY[{inner}]::text[]"
    if isinstance(v, dict):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    s = str(v).replace("'", "''")
    return f"'{s}'"


lines = ["BEGIN;", "SET session_replication_role = replica;"]
for item in data:
    r = item["row"]
    vals = ", ".join(sql_literal(r.get(c)) for c in cols)
    collist = ", ".join(f'"{c}"' for c in cols)
    lines.append(
        f"INSERT INTO public.hr_attendance ({collist}) VALUES ({vals}) "
        "ON CONFLICT (id) DO UPDATE SET "
        "employee_id = EXCLUDED.employee_id, "
        "check_in_at = EXCLUDED.check_in_at, "
        "check_out_at = EXCLUDED.check_out_at, "
        "check_in_location = EXCLUDED.check_in_location, "
        "is_late = EXCLUDED.is_late, "
        "work_hours = EXCLUDED.work_hours, "
        "created_at = EXCLUDED.created_at, "
        "work_shift_id = EXCLUDED.work_shift_id, "
        "shift_date = EXCLUDED.shift_date, "
        "check_out_location = EXCLUDED.check_out_location, "
        "location_review_status = EXCLUDED.location_review_status, "
        "location_review_flags = EXCLUDED.location_review_flags, "
        "location_review_note = EXCLUDED.location_review_note, "
        "location_reviewed_by = EXCLUDED.location_reviewed_by, "
        "location_reviewed_at = EXCLUDED.location_reviewed_at;"
    )
lines.append("SET session_replication_role = origin;")
lines.append("COMMIT;")

out = root / "sync-hr_attendance.sql"
out.write_text("\n".join(lines) + "\n")
print("WROTE", out, "bytes", out.stat().st_size)
