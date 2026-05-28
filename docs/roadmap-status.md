# Family Economy Roadmap Status

Status legend: `not-started`, `in-progress`, `blocked`, `completed`

## Phase Tracker

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Define Product Clearly | in-progress | Product identity now kid-first with parent-protected controls. Formal brief tracked in `docs/product-brief.md`. |
| 1 | Core MVP Planning | in-progress | Core loop set: Earn -> Save -> Spend -> Goal. MVP backlog tracked in `docs/mvp-backlog.md`. |
| 2 | Technical Foundation | in-progress | Vite React frontend + Firebase Firestore/Auth integrated; Firestore rules added in `firestore.rules`. |
| 3 | Parent Experience First | in-progress | Parent create-job flow implemented and protected behind parent mode + PIN unlock. |
| 4 | Child Experience | in-progress | Child dashboard, jobs view, goals, and store scaffolded. |
| 5 | Household Dashboard | not-started | Needs shared family glance dashboard. |
| 6 | Dynamic Pricing | not-started | Planned as signature differentiator. |
| 7 | Economy Rules System | not-started | Modular rule toggles pending. |
| 8 | Simple Investment System | not-started | Simulated only, no real money. |
| 9 | Loans System | not-started | Small, safe parent-approved loans only. |
| 10 | Testing & Validation | not-started | Retention and usage analytics plan pending. |
| 11 | Refine Before Hardware | not-started | Gate before Pi efforts. |
| 12 | Prepare Local-First | not-started | Cloud/local architecture split pending. |
| 13 | Raspberry Pi Hub | not-started | Kiosk appliance stage. |
| 14 | Hybrid Local + Cloud Sync | not-started | Local-first + cloud assist sync plan pending. |
| 15 | Advanced Systems Expansion | not-started | Post-validation only. |
| 16 | Long-Term Vision | in-progress | Product identity pinned in product brief. |

## Current Sprint Focus

1. Harden Firestore permission model with emulator validation (Phase 2)
2. Ship reward approval request flow for kids (Phases 3-4)
3. Add household setup and child profile onboarding (Phase 3)
