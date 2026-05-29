# Family Economy Roadmap Status

Status legend: `not-started`, `in-progress`, `blocked`, `completed`

## Phase Tracker

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Define Product Clearly | in-progress | Product identity now kid-first with parent-protected controls. Formal brief tracked in `docs/product-brief.md`. |
| 1 | Core MVP Planning | completed | Core loop set: Earn -> Save -> Spend -> Goal. MVP backlog phases 1-4 are complete in `docs/mvp-backlog.md`. |
| 2 | Technical Foundation | completed | Vite React frontend + Firebase Firestore/Auth integrated; emulator coverage includes analytics and consequence event permissions. |
| 3 | Parent Experience First | completed | Parent command center now centralizes protected controls, review actions, and household setup. |
| 4 | Child Experience | completed | Child dashboard now includes clearer jobs/rewards flows, transaction history, affordability/limit messaging, house rules tab, and policy previews. |
| 5 | Household Dashboard | completed | Home now includes family-overview cards, top-earner signals, daily and weekly trend comparisons, child credit totals, family job/reward snapshots, and deeper family insights cards. |
| 6 | Dynamic Pricing | in-progress | Optional demand-based reward pricing is implemented in household settings and service calculations. |
| 7 | Economy Rules System | completed | Personal/family limits, recurring rule controls, countdown timing rules, consequence presets, and parent/kid consequence visibility are now implemented end-to-end. |
| 8 | Simple Investment System | not-started | Simulated only, no real money. |
| 9 | Loans System | not-started | Small, safe parent-approved loans only. |
| 10 | Testing & Validation | completed | Analytics plan drafted in `docs/analytics-plan.md`; onboarding completion and weekly active family readouts are visible in the creator section of the parent command center, weekly snapshot is Firestore-backed, feedback loop is wired, and dashboard/statement view hooks are instrumented. |
| 11 | Refine Before Hardware | not-started | Gate before Pi efforts. |
| 12 | Prepare Local-First | not-started | Cloud/local architecture split pending. |
| 13 | Raspberry Pi Hub | not-started | Kiosk appliance stage. |
| 14 | Hybrid Local + Cloud Sync | not-started | Local-first + cloud assist sync plan pending. |
| 15 | Advanced Systems Expansion | not-started | Post-validation only. |
| 16 | Long-Term Vision | in-progress | Product identity pinned in product brief. |

## Current Sprint Focus

1. Finish goal milestone celebration UX and polish remaining child rewards copy (Phase 4) - `completed`
2. Expand household dashboard depth from daily and weekly trends into deeper family insights (Phase 5) - `completed`
3. Instrument analytics events and weekly family metrics (Phase 10) - `completed`
4. Expand parent visibility tooling with richer consequence audit details and exports (Phase 16 slice) - `completed`
