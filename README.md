# hr-app

Next.js app for CNV WorkHub HR, payroll-hours, portal, LIFF, and inventory surfaces

> Current owner: Codex. Production web may move over time; read `NEXT_PUBLIC_BASE_URL` and the current Vercel deployment instead of hardcoding old preview links.

## Read First

1. [../GROUND_TRUTH.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/GROUND_TRUTH.md)
2. [../orchestration/CURRENT_TASK.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/orchestration/CURRENT_TASK.md)
3. [../MILESTONES.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/MILESTONES.md)

## App Surfaces

- Admin: `src/app/admin/*`
- API routes: `src/app/api/*`
- LIFF: `src/app/liff/*`
- Portal: `src/app/portal/*`
- Supabase: `supabase/*`

## Local Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

## Deploy

- Production domain: current customer-owned deployment (see `NEXT_PUBLIC_BASE_URL`)
- Vercel project link is stored in `.vercel/project.json`
- Deploy runbook: [docs/DEPLOY_RUNBOOK.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/docs/DEPLOY_RUNBOOK.md)
- Speed Insights is installed in `src/app/layout.tsx`

## Docs Map

- Runbooks: [docs/README.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/docs/README.md)
- Reports and audits: [reports/README.md](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/reports/README.md)

## Notes

- `reports/` contains many historical snapshots; do not treat every file there as active truth
- active scope always comes from root orchestration docs, not from ad-hoc reports
