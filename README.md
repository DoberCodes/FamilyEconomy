# FamilyEconomy

Minimal React app scaffolded with Vite.

## Documentation

### Active Docs

- Vision: [docs/VISION.md](docs/VISION.md)
- Brand system: [docs/BRAND.md](docs/BRAND.md)
- Documentation workflow: [docs/DOCUMENTATION_WORKFLOW.md](docs/DOCUMENTATION_WORKFLOW.md)
- Features: [docs/FEATURES.md](docs/FEATURES.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Redux conversion status: [docs/redux-conversion-status.md](docs/redux-conversion-status.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Decision log: [docs/DECISION_LOG.md](docs/DECISION_LOG.md)
- Firestore security guide: [docs/security-rules.md](docs/security-rules.md)

### Archived Docs

- Archive index: [docs/archive/README.md](docs/archive/README.md)
- Product brief archive: [docs/archive/product-brief.md](docs/archive/product-brief.md)
- Roadmap phase status archive: [docs/archive/roadmap-status.md](docs/archive/roadmap-status.md)
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

Firestore-backed analytics event writes are opt-in. Set `VITE_FIRESTORE_ANALYTICS_ENABLED=true` only when you want Creator analytics events persisted to Firestore; leave it false for quieter local development.

Parent registration is private by default. Invited families can open `/auth?invite` to enter a code, or `/auth?invite=CODE` to unlock the create-account form directly.

Invite codes live in Firestore under `registrationInvites/{CODE}`. Create one with:

```powershell
npm run invite:create -- --days 30 --max-uses 1 --note "Smith family"
```

The script prints an invite URL path you can send. It requires `FIREBASE_SERVICE_ACCOUNT_PATH` because it writes invite documents to Firebase.

If you create a code manually in Firebase, use this shape:

```json
{
  "code": "FE-EXAMPLE",
  "active": true,
  "status": "active",
  "maxUses": 1,
  "usedCount": 0,
  "expiresAt": "Firestore Timestamp in the future",
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp",
  "createdBy": "manual",
  "note": "Optional note"
}
```

This is still a client-visible early-access gate; use a backend function before public launch if invite consumption needs to be fully tamper-resistant.

## Demo Account

The login screen can show a resettable demo account for product walkthroughs.

Default demo credentials:

- Email: `demo@familyeconomy.app`
- Password: `FamilyDemo123!`

Reset the demo Auth user and reseed the demo family:

```powershell
npm run demo:reset
```

The reset script:

- Creates or updates the demo parent Auth user.
- Resets that user's password to the configured demo password.
- Deletes and recreates the demo family data.
- Seeds children, jobs, rewards, requests, savings goals, shared fund activity, recognition inputs, transactions, and parent settings.

Admin credentials are required. Set:

- `FIREBASE_SERVICE_ACCOUNT_PATH`

This explicit path is intentional because the script modifies Firebase Auth and Firestore demo data.

For CI only, `FIREBASE_SERVICE_ACCOUNT_JSON` is also supported.

Use `VITE_DEMO_PARENT_EMAIL`, `VITE_DEMO_PARENT_PASSWORD`, `VITE_SHOW_DEMO_LOGIN`, and `DEMO_FAMILY_ID` to customize or hide the demo login.

## Auth + User Profiles

After registration, each user gets a profile document:

Path: `users/{uid}`

```json
{
	"displayName": "Alex",
	"email": "alex@example.com",
	"familyId": "family-main",
	"role": "kid"
}
```

The app uses this profile for `familyId` and role-based permissions.

- `parent`: can create jobs
- `kid`: can claim open jobs

## Kid-First Mode

- The app opens in kid-friendly mode by default (no login wall).
- Parent-only actions are protected and require parent unlock from Profile.
- Parents can lock back to kid mode from Profile.

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
