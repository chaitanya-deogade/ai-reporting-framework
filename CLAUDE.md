# AI Reporting Hub — Claude Context

## What This Project Is
A React landing page (Vite + Tailwind) that consolidates all Amplitude reports (Tableau, Lovable, Claude-built, GitHub Pages) into a searchable, filterable catalog with certification governance.

## Repo & Hosting
- **Repo:** https://github.com/chaitanya-deogade/ai-reporting-framework
- **Live:** https://chaitanya-deogade.github.io/ai-reporting-framework/
- **Owner:** Chaitanya Deogade (chaitanya.deogade@amplitude.com)

## Key Files to Know
- `data/reports.json` — THE registry. All reports live here. Tableau reports auto-synced, others added manually via PR.
- `scripts/sync_tableau.py` — Pulls workbooks from Tableau Cloud [PROD] projects, parses XML, fetches view URLs, reads certification status.
- `src/utils/constants.js` — Okta config (CLIENT_ID needs to be set), source/certification configs.
- `src/contexts/AuthContext.jsx` — Auth logic. Currently any logged-in user can certify. Demo mode when Okta not configured.
- `src/components/ReportCard.jsx` — The main card component with certification dropdown, access modal, feedback.
- `.github/workflows/deploy.yml` — Auto-deploys to GitHub Pages on push to main.
- `.github/workflows/sync-tableau.yml` — Weekly Tableau sync (Monday 6am UTC) + manual trigger.

## Tableau Integration
- Server: `https://10ay.online.tableau.com`, Site: `amplitudeteamspace`
- Auth: Connected App (JWT) — secrets stored in GitHub repo secrets
- Only syncs `[PROD]` projects (31 workbooks currently, skips 442 non-prod)
- BU extracted from project name: `[PROD] Customer Intelligence` → `Customer Intelligence`
- Certification read from Tableau API `isCertified` + `certificationNote` (source of truth)
- View-level URLs: fetches `/workbooks/{id}/views` to build `/#/site/.../views/Workbook/View`

## What's Done (Phase 1 MVP)
- React + Vite + Tailwind app with search, filters, group-by
- Report cards with thumbnails, cert badges, source badges, freshness, feedback, view counts
- Tableau Cloud connected and syncing 31 [PROD] workbooks
- Certification auto-pulled from Tableau
- Access restricted modals for sensitive reports
- GitHub Pages deployment with CI/CD
- Demo mode (works without Okta)

## What's NOT Done (Phase 2)
- Okta SSO live (needs Client ID from Okta admin → set in constants.js)
- Backend for persistent usage tracking / feedback (currently localStorage)
- Auto-discovery of Lovable / GitHub Pages reports
- Slack notifications for new/stale reports
- In-app certification workflow with audit trail

## Build Commands
```
npm install
cp -r data/ public/data/
npm run dev          # local dev
npm run build        # production build
```

## Branch Rules
- Don't push directly to main — use feature branches + PRs
- Merges to main auto-trigger GitHub Pages deploy
