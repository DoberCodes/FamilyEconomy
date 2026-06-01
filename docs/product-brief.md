# Product Brief (Phase 0)

## Product Definition

Family Economy is a kid-friendly household economy system that helps families build responsibility, saving habits, delayed gratification, community understanding, and healthy money behaviors through everyday tasks, goals, fictional credits, and rewards.

Family Economy is educational first. It is not a bank, payment processor, payroll system, or real-money account product.

## Core Principles

### Must Be

- Simple
- Playful without being manipulative
- Parent-controlled
- Educational through interaction
- Flexible
- Low-friction
- Explicit that credits are fictional educational units
- Goal-oriented
- Community-minded

### Must Not Feel Like

- Corporate software
- Accounting software
- A punitive system
- A technical finance product
- A rigid educational curriculum
- A banking or payment product
- A gambling, loot-box, or engagement-loop product

## Audience

### Primary

Parents with children ages 7-10.

### Secondary

- Families with children ages 6-12
- Homeschool families
- Tech-forward households
- Financially minded parents

## Product Identity Guardrails

1. The authenticated app belongs to the parent account; child access happens through parent-controlled child sessions.
2. Child sessions should feel like a simple kid login, but they are mock/local sessions under the parent account, not independent child Firebase accounts by default.
3. Parent powers are protected and intentionally gated.
4. Economic lessons are implicit in interactions, not lectures.
5. Complexity stays hidden behind simple UI.
6. Family engagement is a first-class objective.
7. Credits, balances, rewards, statements, and goals are fictional educational constructs.
8. Taxes and community funds should teach shared responsibility, not punishment.
9. Gamified elements should support learning outcomes and avoid manipulative retention patterns.

## Parent-Controlled Child Sessions

- Parents authenticate with Firebase and own the household boundary.
- Kids select or unlock their child profile inside that authenticated household.
- Child session codes are guardrails for local device handoff, not a substitute for parent account security.
- Code should treat parent auth as the trusted security boundary and child profile/session state as product context.

## Core Loop (MVP)

Earn -> Save -> Spend -> Goal

Everything in MVP must support this loop directly.

## Educational Concepts

- Earning through responsibility and contribution.
- Saving toward meaningful personal and family goals.
- Budgeting and spending decisions using fictional credits.
- Delayed gratification through progress tracking and credit gates.
- Parent-guided tax and community fund concepts.
- Collaborative decision making for shared family benefits.
