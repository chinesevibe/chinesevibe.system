# Cron Runbook — hr-payroll

Edge functions ถูกเรียกผ่าน **pg_cron + pg_net** โดยใช้ Vault secrets `project_url` และ `secret_key`.

## Schedules (ICT)

| Job | Cron (UTC) | ICT | Function |
|-----|------------|-----|----------|
| morning-push | `0 2 * * 1-5` | 09:00 Mon–Fri | `morning-push` |
| probation-alert | `30 2 * * *` | 09:30 daily | `probation-alert` |
| visa-alert | (see migration) | morning | `visa-alert` |
| evening-summary | `0 11 * * 1-5` | 18:00 Mon–Fri | `evening-summary` |
| **weekly-summary** | `0 1 * * 1` | **08:00 Monday** | `weekly-summary` |
| **monthly-summary** | `0 1 1 * *` | **08:00 วันที่ 1** | `monthly-summary` |
| **announcement-scheduler** | `*/10 * * * *` | ทุก 10 นาที | `announcement-scheduler` |

## Verify on remote

```sql
select jobname, schedule, active from cron.job order by jobname;
```

## Manual invoke (debug)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/weekly-summary" \
  -H "Content-Type: application/json" \
  -H "apiKey: $SUPABASE_SERVICE_ROLE_KEY"
```

## Rollback

```sql
select cron.unschedule('weekly-summary');
select cron.unschedule('monthly-summary');
select cron.unschedule('announcement-scheduler');
```
