# Decision Log

This document records major product, architecture, domain, roadmap, and UX decisions for Family Economy.

Use this file to preserve the reasoning behind important changes so future contributors understand not only **what** changed, but **why** it changed.

Product purpose and philosophy are defined in `VISION.md`.

If a decision conflicts with `VISION.md`, `VISION.md` is authoritative.

---

# 2026-06

## Decision: Treat `VISION.md` as the authoritative product philosophy document

### Context

Several documents repeated similar product philosophy, educational guardrails, and fictional-credit language.

### Decision

`VISION.md` is the authoritative source for:

* Product purpose
* Product principles
* Educational philosophy
* Family Economy guardrails

Other documents should reference `VISION.md` instead of duplicating its contents.

### Reasoning

This reduces documentation drift and gives future contributors a single source of truth for product direction.

### Impact

* Other docs should reference `VISION.md`.
* Conflicts should resolve in favor of `VISION.md`.
* Major philosophy changes should start in `VISION.md`.

### Related Documents

* `VISION.md`
* `AGENTS.md`
* `AI_CONTEXT.md`

---

## Decision: Family Dashboard should act as a family hub, not a management dashboard

### Context

The Family Dashboard included a Family Snapshot that emphasized participation metrics, active children, and focus-style summary cards.

### Decision

Remove Family Snapshot from the Family Dashboard direction and keep the dashboard focused on family-facing updates.

Preferred dashboard flow:

```text
Family News
↓
Family Goal
↓
Weekly Recognition
↓
Family Job Tracker
↓
Recent Activity
```

### Reasoning

The Family Dashboard should answer:

1. What is happening?
2. What are we working toward?
3. Who is being recognized?
4. What needs attention?
5. What happened recently?

Participation analytics belong in parent-focused views, not the shared family hub.

### Impact

* Family Snapshot should move to Parent Insights or Parent Dashboard concepts.
* Family Goal becomes more prominent.
* Weekly Recognition becomes a stronger family-facing section.

### Related Documents

* `VISION.md`
* `FEATURES.md`
* `ROADMAP.md`
* `ARCHITECTURE.md`

---

## Decision: Recognition is a core product pillar

### Context

Recognition started as a motivational layer but evolved into a major part of the Family Dashboard and family participation loop.

### Decision

Recognition should be treated as a first-class product domain.

Recognition includes:

* XP
* Levels
* Achievements
* Badges
* Weekly Recognition
* Recognition Categories
* Title-holder cards

### Reasoning

Recognition helps Family Economy celebrate effort, consistency, generosity, saving, goal completion, and family participation without focusing only on balances or spending.

### Impact

* Recognition belongs in `DOMAIN_MODEL.md`.
* Recognition logic should eventually be centralized in selectors/services.
* Recognition should avoid wealth-based rankings.

### Related Documents

* `VISION.md`
* `DOMAIN_MODEL.md`
* `ECONOMY_RULES.md`
* `FEATURES.md`
* `ARCHITECTURE.md`

---

## Decision: Weekly Recognition should use category-based carousel cards

### Context

A static recognition section risked becoming either too limited or too much like a leaderboard.

### Decision

Weekly Recognition should use a carousel that displays one recognition category at a time.

Initial categories include:

* Hardest Worker
* Most Helpful
* Goal Setter
* Most Generous
* Consistency Champion

Future categories may include:

* Rising Star
* Top Saver
* Community Builder

### Reasoning

A carousel allows the family to recognize different types of positive behavior without crowding the dashboard.

It also shows children multiple ways to succeed.

### Impact

* Weekly Recognition should not become a simple “highest balance” leaderboard.
* Empty states should use title-holder placeholders rather than oversized text.
* Category calculations should eventually be centralized.

### Related Documents

* `FEATURES.md`
* `ROADMAP.md`
* `DOMAIN_MODEL.md`
* `ECONOMY_RULES.md`

---

## Decision: Recent Achievements should be separated from the general Activity Feed

### Context

Achievements are milestones, while the Activity Feed contains ordinary events like job completions and reward activity.

### Decision

Recent Achievements should appear as a highlighted subsection above or within the Recent Activity area, separate from the standard feed items.

### Reasoning

Achievements should remain visible longer than ordinary activity items.

This prevents meaningful milestones from being buried by routine events.

### Impact

* Recent Activity may contain:

  * Recent Achievements
  * Activity Feed
* Achievements should remain visually distinct from routine activity.

### Related Documents

* `FEATURES.md`
* `DOMAIN_MODEL.md`
* `ARCHITECTURE.md`

---

## Decision: Separate Core Economy from Advanced Economy

### Context

Family Economy currently supports jobs, rewards, goals, community contribution, recognition, and family dashboard experiences.

Newer ideas such as savings accounts, expenses, emergency funds, loans, investing, and family business systems introduce more advanced financial education.

### Decision

Family Economy should distinguish between:

## Core Economy

* Jobs
* Rewards
* Savings Goals
* Family Goals
* Community Fund
* Recognition
* XP
* Achievements
* Family Dashboard

## Advanced Economy

* Savings Accounts
* Emergency Funds
* Expenses
* Budgeting
* Family Bank
* Loans
* Credit Simulation
* Investing Simulation
* Family Business

### Reasoning

Core Economy should remain simple and approachable for younger children.

Advanced Economy should introduce deeper financial concepts for older children and premium/future experiences.

### Impact

* Advanced concepts should not complicate the core experience.
* Premium features should add depth rather than make the core product feel incomplete.
* Educational progression should guide feature timing.

### Related Documents

* `ROADMAP.md`
* `EDUCATIONAL_PROGRESSION.md`
* `ECONOMY_RULES.md`
* `FEATURES.md`

---

## Decision: Add Savings Account as an Advanced Economy concept

### Context

Current saving is goal-based. A child can save toward a specific goal, but there is no general savings account for credits they want to set aside without assigning a goal.

### Decision

Savings Account should be treated as an Advanced Economy concept.

It should allow children to save credits without immediately attaching them to a specific goal.

### Reasoning

This teaches a more realistic financial concept:

> Saving before knowing exactly what the money is for.

It also supports future emergency fund and budgeting features.

### Impact

* Core savings goals remain simple and available.
* Savings Account becomes part of Advanced Economy.
* Top Saver recognition can eventually be based on credits moved into savings during the recognition period.

### Related Documents

* `ROADMAP.md`
* `EDUCATIONAL_PROGRESSION.md`
* `DOMAIN_MODEL.md`
* `ECONOMY_RULES.md`

---

## Decision: Add Expenses as an Advanced Economy concept

### Context

To teach budgeting and emergency funds, children need to understand that income is not only for spending and saving. Life also includes recurring obligations.

### Decision

Expenses should be introduced as an optional Advanced Economy feature.

Examples:

* Housing Contribution
* Food Contribution
* Utilities Contribution
* Transportation Contribution

### Reasoning

Expenses teach:

* Budgeting
* Cash flow
* Planning
* Emergency preparedness

This also makes Savings Accounts and Emergency Funds more meaningful.

### Impact

* Expenses should be fictional and educational.
* Expenses should not feel punitive.
* Expenses should be parent-configurable.
* Copy should avoid making the app feel like a stress simulator.

### Related Documents

* `ROADMAP.md`
* `EDUCATIONAL_PROGRESSION.md`
* `ECONOMY_RULES.md`
* `DOMAIN_MODEL.md`

---

## Decision: Archive Phase 0 product brief and roadmap status documents

### Context

`product-brief.md` and `roadmap-status.md` were useful during early definition but became duplicative after creating stronger source-of-truth documents.

### Decision

Move outdated planning/status documents into an archive.

### Reasoning

The active documentation set should stay focused and avoid competing sources of truth.

### Impact

Active docs should include:

* `VISION.md`
* `DOMAIN_MODEL.md`
* `FEATURES.md`
* `ECONOMY_RULES.md`
* `EDUCATIONAL_PROGRESSION.md`
* `ROADMAP.md`
* `ARCHITECTURE.md`
* `BRAND.md`
* `AI_CONTEXT.md`
* `AGENTS.md`
* `security-rules.md`

### Related Documents

* `ROADMAP.md`
* `VISION.md`
* `AGENTS.md`
