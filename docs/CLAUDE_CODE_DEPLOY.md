# Claude Code Deploy Target

Use this when Claude Code needs to deploy `hr-app`.

## Deploy To

- App root: `/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app`
- Vercel project: `hr-app`
- Vercel account: `infochinesevibe-2769`
- Vercel team: `infochinesevibe-2769s-projects`
- Production alias: `https://hr-app-rho-blush.vercel.app`
- Git repo linked in Vercel: `github.com/chinesevibe/chinesevibe.system`
- Production branch: `main`

## Rules

- Run from `hr-app/`
- Prefix shell commands with `rtk`
- Treat `https://hr-app-rho-blush.vercel.app` as the live URL
- Treat the long `hr-*.vercel.app` URL as a temporary deploy artifact only
- Do not use old preview URLs as production

## Preferred Deploy Flow

```bash
rtk npm run build
rtk npm run typecheck
rtk npm run lint
rtk vercel --prod --yes
```

## Verify After Deploy

1. Check the Vercel CLI output contains `Aliased https://hr-app-rho-blush.vercel.app`
2. Open the live alias
3. Test the route you changed

## When To Use Git Deploy

Only use `git push main` if the local `origin` remote matches the Vercel-linked repo.

