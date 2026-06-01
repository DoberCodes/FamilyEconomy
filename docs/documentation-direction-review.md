# Documentation Direction Review

## Summary

The provided direction is broadly aligned with the product but was only partially represented in the existing docs. The biggest gaps were explicit fictional-currency boundaries, family tax philosophy, community responsibility, anti-gamification guardrails, and missing reference docs for AI context, domain model, and economy rules.

## Documentation Issues Found

- `AI_CONTEXT.md`, `DOMAIN_MODEL.md`, and `ECONOMY_RULES.md` were referenced in the requested review prompt but did not exist.
- `VISION.md` used playful/game-like language without enough educational-first guardrails.
- Several docs used `coins`, `wallet`, or game-style phrasing without consistently clarifying that credits are fictional educational units.
- Tax and community responsibility existed in roadmap status, but not in the core product brief or active roadmap.
- Scarcity, streaks, seasonal events, dynamic pricing, and achievements were documented without enough guidance against artificial scarcity or engagement-first loops.
- Parent-owned mock child sessions were documented well in security/product docs and remained aligned.

## Implementation Alignment Observations

- Current implementation supports parent authority through parent auth, parent controls, approval settings, and parent-mediated child sessions.
- Savings goals are strongly represented and aligned with the educational mission.
- Reward requests, counters, and family pool resolution support decision making and negotiation.
- Dynamic pricing, streaks, and scarcity-related features need careful copy and controls so they remain educational rather than pressure mechanics.
- `familyEconomyService.js` remains a major technical debt point because business rules, normalization, Firestore operations, and policy logic are concentrated in one file.
- `ProfilePage.jsx` remains a large parent-admin surface and should continue moving toward reusable dialog/form primitives.
- `src/index.css` currently blocks production build due to an unclosed block around line 2841.

## Product Alignment Risks

- **Artificial scarcity risk:** Scarcity and dynamic pricing can teach tradeoffs, but may conflict with the mission if used as urgency or retention pressure.
- **Excessive streak risk:** Streaks can encourage consistency, but should not create shame, anxiety, or engagement pressure.
- **Currency confusion risk:** Words like wallet, balance, statement, tax, and allowance need fictional-credit framing.
- **Punishment risk:** Taxes and consequences should not blur together. Taxes teach shared responsibility; consequences address household rules.

## Updates Made

- Added [AI_CONTEXT.md](AI_CONTEXT.md).
- Added [DOMAIN_MODEL.md](DOMAIN_MODEL.md).
- Added [ECONOMY_RULES.md](ECONOMY_RULES.md).
- Updated [VISION.md](VISION.md) with educational-first principles, fictional currency, parent authority, goal centrality, tax philosophy, community responsibility, and gamification limits.
- Updated [product-brief.md](product-brief.md) with fictional currency and anti-bank/payment guardrails.
- Updated [FEATURES.md](FEATURES.md) to clarify fictional credits and add community/tax direction.
- Updated [ROADMAP.md](ROADMAP.md) to make educational direction a current priority and soften gamification language.
- Updated [roadmap-status.md](roadmap-status.md) to clarify tax/community concepts and guard against artificial scarcity.
- Updated [ARCHITECTURE.md](ARCHITECTURE.md) with shared domain/date modules and educational economy architecture guardrails.
- Updated [security-rules.md](security-rules.md) with fictional-credit and future-simulation guardrails.
- Updated [../README.md](../README.md) with the new active docs, product description, and fictional-credit warning.

## Recommendations

### High Impact / Low Effort

1. Fix the `src/index.css` unclosed block so `npm.cmd run build` works again.
2. Audit user-facing copy for `wallet`, `coins`, `balance`, `tax`, and `statement` to keep fictional-credit framing consistent.
3. Add brief parent-facing help text for any tax, dynamic pricing, scarcity, or consequence setting.
4. Keep `docs/reusability-status.md` current as reusable work lands.

### High Impact / Medium Effort

1. Extract parent admin dialog/form primitives from `ProfilePage.jsx`.
2. Add shared async action hooks for loading, saving, busy IDs, and refresh-after-write patterns.
3. Formalize child session context so all kid-facing writes use the same parent-mediated shape.
4. Extract dashboard selectors for activity feed, goal momentum, family summaries, and trend cards.

### High Impact / High Effort

1. Split `familyEconomyService.js` into domain services for jobs, rewards, savings goals, household settings, consequences, and analytics-facing helpers.
2. Introduce family tax and family fund workflows with explicit educational copy, parent controls, visibility into fund usage, and rules tests.
3. Build budgeting and teen-economy simulations without any real-money custody or payment implications.
