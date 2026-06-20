# Deploy Runbook

Source of truth for deploying `hr-app` after the production alias moved to the customer-owned Vercel project.

## Current Production Setup

- App root: `/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app`
- Vercel account used now: `infochinesevibe-2769`
- Vercel team: `infochinesevibe-2769s-projects`
- Vercel project: `hr-app`
- Project link file: `.vercel/project.json`
- Production alias in current use: `https://hr-app-rho-blush.vercel.app`
- Git repo linked in Vercel: `github.com/chinesevibe/chinesevibe.system`
- Vercel production branch: `main`

Do not treat old preview URLs as canonical production.

## Rules

- Run commands from `hr-app/`
- Prefix shell commands with `rtk`
- Verify local gates before production deploy
- Read the current Vercel project link before deploying
- Treat the alias/custom domain as the live entrypoint
- Treat the long deployment URL as a per-release artifact only
- Do not assume local `origin` is the same Git repo that Vercel listens to

## Two Real Deploy Paths

As of 2026-06-20, this project has two valid production paths:

1. manual Vercel production deploy from local CLI
2. Git-driven auto deploy from the GitHub repo linked in Vercel

They are not the same thing.

## Current Reality Check

Today the Vercel project is Git-linked to:

- Git provider: GitHub
- Repo: `chinesevibe/chinesevibe.system`
- Production branch: `main`

But this local workspace may not have the same `origin` remote.

Check before using any Git-based deploy assumption:

```bash
rtk git remote -v
```

If `origin` is not `github.com/chinesevibe/chinesevibe.system`, then:

- `git push origin main` will not be the same as "push to the Vercel-linked production repo"
- Vercel auto-deploy from Git may not trigger from this workspace push

## Safe Deploy Flow

This is the most reliable flow when you need to deploy from the current local state immediately.

1. Confirm you are in the right app root

```bash
rtk pwd
```

Expected path: `/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app`

2. Confirm the linked Vercel project

```bash
rtk cat .vercel/project.json
```

Expected project today:

```json
{"projectId":"prj_sFnipsmDvhVb3Ov61nw4ZqcEyEnU","orgId":"team_6B02jDzQxU1Ix4HzKu9CjjXh","projectName":"hr-app"}
```

3. Confirm the logged-in Vercel account

```bash
rtk vercel whoami
```

Expected account today: `infochinesevibe-2769`

4. Run local quality gates

```bash
rtk npm run build
rtk npm run typecheck
rtk npm run lint
```

If `typecheck` fails because `.next/types` is stale or missing, run `build` first, then rerun `typecheck`.

5. Inspect recent deployments if needed

```bash
rtk vercel ls --yes
```

Use this to confirm you are looking at `infochinesevibe-2769s-projects/hr-app`.

6. Deploy to production

```bash
rtk vercel --prod --yes
```

7. Wait for `READY`

Successful output will include:

- a deployment URL like `https://hr-xxxx-infochinesevibe-2769s-projects.vercel.app`
- a JSON block with `"readyState": "READY"`
- an alias line like `Aliased https://hr-app-rho-blush.vercel.app`

8. Verify the two URLs separately

- Deployment artifact URL: newest `hr-*.vercel.app`
- Live alias URL: `https://hr-app-rho-blush.vercel.app`

The deploy is not fully done until the alias points to the new ready deployment.

## Preview-First Flow

Use this when the change is risky or needs user review before production:

```bash
rtk vercel
```

Then test the preview URL, and only after approval either:

- deploy prod with `rtk vercel --prod --yes`, or
- promote via Vercel workflow if that becomes the team's standard later

## Git-Driven Auto-Deploy Flow

Use this only when the branch you are pushing lives in the GitHub repo that Vercel is actually linked to.

1. Confirm the linked repo in Vercel is still `chinesevibe/chinesevibe.system`
2. Confirm your local remote points to that same repo
3. Merge the intended branch into `main`
4. Push `main`
5. Wait for Vercel webhook build to finish
6. Verify the production alias moved to the newest ready deployment

Example:

```bash
rtk git remote -v
rtk git checkout main
rtk git merge <branch>
rtk git push origin main
```

Only use that flow if `origin` is the Vercel-linked repo.

## Which Flow To Prefer

- Use `rtk vercel --prod --yes` for urgent hotfixes, local-only validated state, or when Git remote setup is ambiguous
- Use `git push main` only when Git remote alignment is confirmed and you explicitly want Vercel webhook CI/CD to be the release path

## Post-Deploy Checks

Minimum checks:

1. Open the live alias
2. Open the route you changed
3. Verify there is no obvious runtime error
4. If the change is HR-specific, verify the real HR route, not an old removed route

Examples:

- employee form changes: `/admin/employees/new`
- attendance changes: `/liff/clock`
- leave changes: `/liff/leave`
- webhook-related changes: inspect Vercel deployment logs after smoke testing

## Canonical URL Rule

When AI or humans need the live web URL:

- prefer `NEXT_PUBLIC_BASE_URL` if it is intentionally maintained
- otherwise prefer the current production alias/custom domain
- do not hardcode old preview deployment URLs into code, docs, LIFF links, or handoff notes

## Common Failure Cases

### Wrong Vercel account

Symptom:

- `vercel whoami` shows the wrong user
- `vercel ls` shows the wrong team/project

Fix:

- re-login to Vercel CLI
- re-check `.vercel/project.json`

### Wrong linked project

Symptom:

- deploy succeeds but lands in the wrong Vercel project

Fix:

- inspect `.vercel/project.json`
- relink before deploying

### Wrong Git remote

Symptom:

- local branch looks correct
- `git push origin main` succeeds
- but Vercel does not deploy the expected project

Cause:

- local `origin` is not the GitHub repo linked in Vercel

Fix:

- compare `git remote -v` with the Vercel-linked repo
- if they differ, do not use Git-triggered deploy assumptions
- deploy with `rtk vercel --prod --yes` or fix remote alignment first

### `typecheck` fails on missing `.next/types`

Symptom:

- many `TS6053` errors for `.next/types/... not found`

Fix:

```bash
rtk npm run build
rtk npm run typecheck
```

### Alias not updated

Symptom:

- deployment URL is ready but the live alias still serves old code

Fix:

- wait for the alias step to complete
- inspect the deployment in Vercel
- verify the alias line appeared in CLI output

## Quick Command Set

```bash
cd /Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app
rtk vercel whoami
rtk cat .vercel/project.json
rtk git remote -v
rtk npm run build
rtk npm run typecheck
rtk npm run lint
rtk vercel --prod --yes
```

## One-Line Summary

Deploy from `hr-app`, verify both the linked Vercel project and the Git remote first, then either use manual `vercel --prod` or Git-driven `push main`, and trust the alias/custom domain as production, not the long deployment URL.
