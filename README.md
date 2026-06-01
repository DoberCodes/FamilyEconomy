# Family Economy

Family Economy is a mobile-first educational household economy for teaching children earning, saving, budgeting, goals, delayed gratification, taxes, community responsibility, and financial decision making with fictional credits.

## Documentation

### Active Docs

- Vision: [docs/VISION.md](docs/VISION.md)
- AI context: [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md)
- Agent instructions: [docs/AGENTS.md](docs/AGENTS.md)
- Features: [docs/FEATURES.md](docs/FEATURES.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Domain model: [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)
- Economy rules: [docs/ECONOMY_RULES.md](docs/ECONOMY_RULES.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Roadmap phase status: [docs/roadmap-status.md](docs/roadmap-status.md)
- Product brief (Phase 0): [docs/product-brief.md](docs/product-brief.md)
- Firestore security guide: [docs/security-rules.md](docs/security-rules.md)
- Reusability status: [docs/reusability-status.md](docs/reusability-status.md)

### Archived Docs

- Archive index: [docs/archive/README.md](docs/archive/README.md)
- MVP backlog archive (Phases 1-4): [docs/archive/mvp-backlog.md](docs/archive/mvp-backlog.md)
- Session progress log archive: [docs/archive/progress-log.md](docs/archive/progress-log.md)
- Analytics plan archive: [docs/archive/analytics-plan.md](docs/archive/analytics-plan.md)

## Scripts

- `npm run dev` starts the local dev server
- `npm run lint` runs ESLint
- `npm run build` creates a production build
- `npm run build:github-pages` creates a GitHub Pages-compatible build
- `npm run preview` serves the production build locally
- `npm run test:rules` runs Firestore security rules tests in emulator
- `npm test` runs the same rules suite

## GitHub Pages Deployment

This repo includes [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) to deploy automatically on every push to `main`.

Use these repository settings:

1. Go to GitHub repository Settings > Pages.
2. Under Build and deployment, set Source to `GitHub Actions`.
3. Keep your default branch as `main` (no extra deploy branch needed).

Notes:

- The workflow builds with `VITE_BASE_PATH=/FamilyEconomy/` for project-page hosting.
- It also enables hash routing for Pages so refresh and direct links keep working.

GitHub Actions must also receive your Firebase web app values at build time. Add these repository secrets in Settings > Secrets and variables > Actions:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Firebase Setup

1. Copy `.env.example` to `.env`
2. Fill in your Firebase web app values
3. Enable Email/Password sign-in in Firebase Auth
4. Run `npm run dev` and register in-app

If Firebase env values are missing, the app automatically uses seeded local data.

## Auth + Child Sessions

Family Economy is an educational household economy. Credits, balances, rewards, and statements are fictional learning tools only; the app is not a bank, payment processor, payroll tool, or real-money account system.

After registration, each parent gets a profile document:

Path: `users/{uid}`

```json
{
	"displayName": "Parent",
	"email": "parent@example.com",
	"familyId": "family-main",
	"role": "parent"
}
```

The app uses this profile for `familyId`, parent permissions, and household ownership.

- `parent`: authenticated Firebase account and trusted household boundary
- child session/mock kid login: selected child profile inside the parent household

## Parent-Owned Kid Mode

- Parents sign in first; kids use child profile selection/session codes inside that parent-owned household.
- The kid experience should feel like a lightweight kid login, but child sessions are local/mock sessions rather than independent Firebase accounts by default.
- Parent-only actions are protected and require parent unlock from Profile.
- Parents can lock parent controls and hand the app back to the kid-facing mode from Profile.

## Firestore Structure

Collection: `families`

Document: `families/{familyId}`

```json
{
	"profileName": "Alex",
	"streakDays": 5,
	"level": {
		"current": 7,
		"xp": 1250,
		"nextXp": 1800
	},
	"balance": {
		"credits": 1250
	}
}
```

Subcollection: `families/{familyId}/jobs`

```json
{
	"order": 1,
	"icon": "🛏️",
	"title": "Make your bed",
	"points": 50,
	"status": "open",
	"claimedBy": null,
	"createdBy": "parent-user-id"
}
```

Subcollection: `families/{familyId}/goals`

```json
{
	"name": "New Bike",
	"saved": 2750,
	"target": 4000
}
```

## Jobs Workflow

- Parents create jobs from the Jobs page.
- Kids claim open jobs from the Jobs page.
- Claimed jobs are tracked by `claimedBy` and `status`.

## Optional Fallback Context

You can still set `VITE_FAMILY_ID`, `VITE_USER_ID`, and `VITE_USER_ROLE` in `.env` for local fallback/testing.
