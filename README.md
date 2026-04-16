# AI Reporting Hub — Amplitude

A unified landing page that consolidates reports from Tableau, Lovable, Claude, and GitHub Pages with governance, certification badges, search, filtering, and usage tracking.

**Live site:** https://chaitanya-deogade.github.io/ai-reporting-framework/

---

## Problem Statement

Amplitude uses Tableau as the enterprise reporting platform with certified and BU-managed reports. However, users are also building reports using Claude, Lovable, and other AI tools. These AI-generated reports lack governance — unlike Tableau, they have no certification process, no single catalog, and no way to track usage or freshness.

### Goals
1. **Single landing page** consolidating all reports from all sources
2. **Certification governance** — Enterprise Certified, BU Certified, or Ungoverned badges
3. **Tableau certification synced automatically** from the Tableau Cloud API (source of truth)
4. **Search and filter** by Business Unit, source platform, certification status
5. **Report cards** with thumbnail previews, descriptions, owner info, freshness indicators
6. **Access control** — restricted reports show a modal instead of opening
7. **Feedback** — thumbs up/down on each report
8. **Usage tracking** — view counts per report
9. **Okta SSO** integration (PKCE flow via `https://amplitude.okta.com/`)

---

## Architecture

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Icons | Lucide React |
| Auth | Okta OIDC (PKCE) via `@okta/okta-auth-js` |
| Data store | `data/reports.json` (flat file in repo) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (auto-deploy on push to main) |
| Tableau sync | Python script + GitHub Actions (weekly + manual) |

### Project Structure
```
ai-reporting-framework/
├── index.html                          # Entry point
├── vite.config.js                      # Vite config (base path for GitHub Pages)
├── src/
│   ├── main.jsx                        # React entry
│   ├── index.css                       # Tailwind imports + theme
│   ├── App.jsx                         # Main app (AuthProvider + Dashboard)
│   ├── components/
│   │   ├── Header.jsx                  # Logo, user info, Okta login/logout
│   │   ├── StatsBar.jsx                # Summary stats (total, certified, etc.)
│   │   ├── FilterBar.jsx               # Search + dropdown filters + group-by
│   │   ├── ReportCard.jsx              # Individual report card with cert dropdown
│   │   ├── ReportGroup.jsx             # Collapsible group of cards
│   │   └── EmptyState.jsx              # No results state
│   ├── contexts/
│   │   └── AuthContext.jsx             # Okta auth + role management
│   ├── hooks/
│   │   └── useReports.js              # Load, filter, group, stats for reports
│   └── utils/
│       ├── constants.js                # Source configs, cert configs, Okta config
│       └── helpers.js                  # Freshness calc, localStorage, formatting
├── data/
│   └── reports.json                    # THE REGISTRY — all reports live here
├── public/
│   ├── data/reports.json               # Copy for dev server
│   ├── favicon.svg                     # Amplitude logo favicon
│   └── thumbnails/                     # Report preview images (SVG + PNG)
├── scripts/
│   └── sync_tableau.py                 # Tableau Cloud sync script
└── .github/workflows/
    ├── deploy.yml                      # Build + deploy to GitHub Pages
    └── sync-tableau.yml                # Weekly Tableau sync (Monday 6am UTC)
```

---

## Current State (as of April 16, 2026)

### What's Working
- **43 total reports** (31 from Tableau [PROD] projects + 12 sample reports)
- **Tableau Cloud connected** via Connected App (JWT auth)
- **Only [PROD] projects synced** — skips dev/staging/personal workbooks
- **BU names auto-extracted** from project names: `[PROD] Finance` → `Finance`
- **Certification pulled from Tableau API** — `isCertified` + `certificationNote`
- **View-level URLs** — links open the correct Tableau view (not workbook)
- **GitHub Pages deployed** at https://chaitanya-deogade.github.io/ai-reporting-framework/
- **Weekly auto-sync** every Monday at 6am UTC
- **Demo mode** — app works without Okta config (shows all features)

### Business Units from Tableau
Customer Intelligence (5), Customer Success (3), Engineering (1), Finance (11), Finance Archive (3), GTM S&O (1), Marketing (9), People Ops (1), Product (4)

### What's NOT Done Yet (Phase 2)
- [ ] Okta SSO live (needs Client ID from Okta admin — see setup below)
- [ ] Real backend for persistent usage tracking and feedback (currently localStorage)
- [ ] In-app certification workflow with audit trail
- [ ] Auto-discovery of Lovable/GitHub Pages reports
- [ ] Slack notifications for new/stale reports
- [ ] Remove sample reports and add real Lovable/Claude reports

---

## Tableau Cloud Integration

### Connection Details
| Setting | Value |
|---|---|
| Server | `https://10ay.online.tableau.com` |
| Site | `amplitudeteamspace` |
| Auth method | Connected App (Direct Trust) + JWT |
| User | `CHAITANYA.DEOGADE@AMPLITUDE.COM` |
| API version | 3.24 |

### How the Sync Works
1. Creates a JWT signed with the Connected App secret
2. Signs in to Tableau REST API (XML-based)
3. Fetches all workbooks, filters to `[PROD]` projects only
4. For each workbook, fetches its views to get the correct view URL
5. Parses `isCertified` and `certificationNote` from XML
6. Maps certification: Tableau certified → enterprise_certified; note contains "BU" → bu_certified
7. Extracts BU name from project: strips `[PROD]` prefix
8. Merges with existing reports.json (preserves non-Tableau entries)
9. Commits and pushes updated reports.json

### GitHub Secrets (already configured)
```
TABLEAU_CONNECTED_APP_CLIENT_ID   = 577bf406-6a1c-4260-8533-d70b199d3fe4
TABLEAU_CONNECTED_APP_SECRET_ID   = e5d4b1ef-0fad-418c-8a70-633044e8b719
TABLEAU_CONNECTED_APP_SECRET_VALUE = (stored as secret)
TABLEAU_SERVER                    = https://10ay.online.tableau.com
TABLEAU_SITE                      = amplitudeteamspace
TABLEAU_USER                      = CHAITANYA.DEOGADE@AMPLITUDE.COM
```

### Manual Sync Trigger
Go to: https://github.com/chaitanya-deogade/ai-reporting-framework/actions/workflows/sync-tableau.yml → "Run workflow"

---

## Okta Integration (TODO)

### Current State
Running in **Demo Mode** — any visitor sees all features with a simulated admin user.

### To Enable Okta SSO
1. Go to https://amplitude.okta.com/ → Admin → Applications
2. Create new app: **SPA (Single Page Application)**, OIDC
3. Set redirect URI: `https://chaitanya-deogade.github.io/ai-reporting-framework/callback`
4. Enable PKCE
5. Copy the **Client ID**
6. Edit `src/utils/constants.js` → replace `YOUR_OKTA_CLIENT_ID` with the actual ID
7. Push to main → auto-deploys

### Roles
Currently **any logged-in user can certify** reports (no group restrictions). To add role-based access later, create Okta groups: `report-hub-admin`, `report-hub-bu-lead`, `report-hub-viewer` and update `canCertify()` in `AuthContext.jsx`.

---

## How to Add Reports

### Adding a Tableau Report
Automatic — any workbook in a `[PROD]` folder gets synced weekly. To force sync, trigger the workflow manually.

### Adding a Lovable / Claude / GitHub Pages Report
Edit `data/reports.json` and add an entry:
```json
{
  "id": "unique-id",
  "name": "Report Name",
  "description": "What this report shows.",
  "thumbnail": "thumbnails/your-thumbnail.svg",
  "url": "https://your-report-url.lovable.app",
  "source": "lovable",
  "bu": "Finance",
  "category": "Revenue",
  "tags": ["tag1", "tag2"],
  "owner": { "name": "Your Name", "email": "you@amplitude.com" },
  "certification": { "status": "none", "certified_by": null, "certified_at": null },
  "access": { "restricted": false },
  "last_refreshed_at": "2026-04-15T06:00:00Z",
  "created_at": "2026-04-15",
  "updated_at": "2026-04-15"
}
```
Submit as a PR → merges → auto-deploys.

---

## Local Development

```bash
cd ai-reporting-framework
npm install
cp -r data/ public/data/    # copy registry for dev server
npm run dev                  # http://localhost:5173/ai-reporting-framework/
```

### Build for Production
```bash
npm run build     # outputs to dist/
```

---

## Key Design Decisions

1. **Flat JSON file over database** — keeps Phase 1 simple, editable via PR, version-controlled
2. **GitHub Pages over other hosts** — free, integrated with the repo, auto-deploy via Actions
3. **Tableau certification as source of truth** — avoids double-maintenance; sync script reads it directly from the API
4. **Only [PROD] projects** — filters out hundreds of dev/test/personal workbooks
5. **View-level URLs** — fetches views per workbook so links open correctly in Tableau
6. **localStorage for MVP features** — view counts, feedback, and certification overrides stored client-side until Phase 2 adds a backend
7. **Demo mode** — app is fully functional without Okta so stakeholders can preview immediately
8. **Any user can certify** — simplified for Phase 1; group-based roles can be added later via Okta groups
