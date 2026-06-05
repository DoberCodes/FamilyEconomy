# AI Context

Use this document when an AI assistant or contributor needs quick product and implementation context.

## Product Mission

Family Economy is a family-focused financial literacy platform designed to teach children responsible money management through a fictional household economy.

The platform teaches:

- Earning
- Saving
- Budgeting
- Goal setting
- Delayed gratification
- Taxes
- Community responsibility
- Financial decision making

Family Economy is educational first and a software product second.

## Non-Negotiable Product Boundaries

- Credits are fictional educational credits only.
- The app is not a bank, payment processor, payroll system, investment platform, or real-money account product.
- Do not design flows that imply stored real-world monetary value, deposits, withdrawals, payments, or account custody.
- Parents are the governing authority for household rules, jobs, rewards, taxes, allowances, approvals, and community spending.
- Child login is currently a mock/local child session under the parent-authenticated household, not an independent child Firebase account by default.

## Educational Principles

- Prioritize educational value over entertainment value.
- Strengthen goal-based learning and delayed gratification.
- Treat family tax as a lesson in shared responsibility, not punishment.
- Reinforce community impact through family funds, shared projects, and collaborative decisions.
- Keep economics age-appropriate and explainable by parents.

## Gamification Guardrails

Motivating UI is welcome, but avoid:

- Loot boxes
- Gambling mechanics
- Randomized rewards
- Manipulative engagement loops
- Excessive streak pressure
- Artificial scarcity
- Engagement-first design patterns

XP, streaks, achievements, dynamic pricing, and scarcity concepts should remain optional learning aids with parent controls.

## Current Architecture Notes

- React 19 + Vite frontend.
- Firebase Auth is the parent household authentication boundary.
- Firestore stores family-scoped data under `families/{familyId}`.
- Child profiles live under the family and are selected through local/mock child sessions.
- Core service logic is currently concentrated in `src/services/familyEconomyService.js`.
- Shared domain constants live in `src/domain/familyEconomyTypes.js`.
- Shared date helpers live in `src/utils/dateUtils.js`.
- Shared hooks live in `src/hooks`, including async action state, family actor/session helpers, and family data/resource loaders.

## Refactoring Direction

- Prefer clean, scalable architecture over preserving current implementation quirks.
- Rewriting, restructuring, renaming, or relinking data is acceptable when it improves long-term maintainability.
- There are currently no production users; existing backend data should be treated as development/test data.
- When changing stored data shapes, Firestore paths, auth/session assumptions, or fixtures, clearly explain the data impact and whether test data should be reset, migrated, or relinked.

## Current Known Issues

- `npm.cmd run build` currently passes; keep `src/index.css` block structure balanced when editing panel styles.
- `familyEconomyService.js` is large and should eventually be split by domain.
- Parent admin UI in `ProfilePage.jsx` remains large and should be decomposed into reusable dialog/form primitives.

## Documentation Authority

When making recommendations:

1. AI_CONTEXT.md defines product philosophy and constraints.
2. DOMAIN_MODEL.md defines terminology and entities.
3. FEATURES.md defines implemented and planned functionality.
4. ARCHITECTURE.md defines technical structure.
5. ROADMAP.md defines future priorities.
6. BRAND.md defines visual identity, palette, typography, and UI color guardrails.

If implementation differs from documentation, identify and report the discrepancy.

## Reference Docs

- Product vision: [VISION.md](VISION.md)
- Brand system: [BRAND.md](BRAND.md)
- Product brief: [product-brief.md](product-brief.md)
- Features: [FEATURES.md](FEATURES.md)
- Domain model: [DOMAIN_MODEL.md](DOMAIN_MODEL.md)
- Economy rules: [ECONOMY_RULES.md](ECONOMY_RULES.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Reusability status: [reusability-status.md](reusability-status.md)
