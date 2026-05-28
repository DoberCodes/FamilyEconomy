# FamilyEconomy

Minimal React app scaffolded with Vite.

## Roadmap Tracking

- Roadmap phase status: [docs/roadmap-status.md](docs/roadmap-status.md)
- Product brief (Phase 0): [docs/product-brief.md](docs/product-brief.md)
- MVP backlog (Phases 1-4): [docs/mvp-backlog.md](docs/mvp-backlog.md)
- Session progress log: [docs/progress-log.md](docs/progress-log.md)
- Firestore security guide: [docs/security-rules.md](docs/security-rules.md)

## Scripts

- `npm run dev` starts the local dev server
- `npm run lint` runs ESLint
- `npm run build` creates a production build
- `npm run preview` serves the production build locally
- `npm run test:rules` runs Firestore security rules tests in emulator
- `npm test` runs the same rules suite

## Firebase Setup

1. Copy `.env.example` to `.env`
2. Fill in your Firebase web app values
3. Enable Email/Password sign-in in Firebase Auth
4. Run `npm run dev` and register in-app

If Firebase env values are missing, the app automatically uses seeded local data.

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
