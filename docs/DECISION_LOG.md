# Decision Log

This document records major product, architecture, domain, roadmap, and UX decisions for Family Economy.

Use this file to preserve the reasoning behind important changes so future contributors understand not only **what** changed, but **why** it changed.

Product purpose and philosophy are defined in `VISION.md`.

If a decision conflicts with `VISION.md`, `VISION.md` is authoritative.

---

# 2026-06

## Decision: Move child contribution source choices into destination goal cards

### Context

Child savings accounts introduced multiple paths for moving credits: wallet to savings, savings back to wallet, savings to a personal goal, and savings to the family goal or fund.

Putting all savings-account actions inside the savings account card made the account feel like the primary destination, even when the child was really deciding where to send credits.

### Decision

Keep the savings account card focused on moving credits between wallet and savings.

Move personal goal and family goal contributions into their destination sections, with a "Transfer From" selector that lets the child choose Wallet or Savings Account when savings accounts are enabled.

### Reasoning

This keeps the child flow destination-first:

* "I want to add to my goal."
* "I want to help the family goal."
* "Where should those credits come from?"

That better matches the educational goal of helping children make simple choices without turning the savings account into a complicated banking dashboard.

### Impact

* Personal savings goals can receive credits from Wallet or Savings Account.
* Family savings goals and the family fund can receive credits from Wallet or Savings Account.
* If child savings accounts are disabled, contribution forms fall back to Wallet-only behavior.
* Savings account controls now only handle moving credits into savings or back to wallet.

### Related Documents

* `FEATURES.md`

---

## Decision: Provide a resettable demo account for product walkthroughs

### Context

Family Economy needs a way for reviewers to experience a populated household without creating their own account.

The product is not ready for open registration or unmanaged public onboarding.

### Decision

Add a resettable demo parent account and seeded demo household.

Show the demo credentials on the login page and provide `npm run demo:reset` to recreate the demo user and baseline family data.

### Reasoning

A populated demo household lets reviewers see dashboard storytelling, child choices, savings, shared fund behavior, recognition, parent settings, jobs, rewards, and requests immediately.

Resetting the account keeps walkthrough data clean after reviewers make changes.

### Impact

* Demo credentials are visible on the login page unless `VITE_SHOW_DEMO_LOGIN=false`.
* `npm run demo:reset` uses Firebase Admin credentials to create/update the demo Auth user and reseed Firestore.
* Local resets require an explicit `FIREBASE_SERVICE_ACCOUNT_PATH` so it is clear the script modifies demo/prod data.
* Demo data should remain fictional and should not be mixed with real household data.
* Open self-service registration remains hidden behind the invite-only UI gate.

### Related Documents

* `FEATURES.md`
* `README.md`
* `.env.example`

---

## Decision: Make parent registration invite-only in the UI

### Context

The login screen previously exposed a public registration flow.

Family Economy is not ready for open self-service account creation or a public test-user path yet.

### Decision

Hide public parent registration by default.

Only show the create-account form after a configured invitation code is entered.

### Reasoning

This keeps early access intentional while the product is still being shaped and reviewed.

It also avoids inviting unknown families into the product before onboarding, sample/demo data, and account governance are ready.

### Impact

* Existing parents can still sign in normally.
* New parent account creation is hidden unless `VITE_REGISTRATION_INVITE_CODE` is configured and entered.
* This is a soft client-side gate, not a hardened security boundary.
* Before public launch, account creation should be restricted with Firebase/backend controls or a server-validated invite flow.

### Related Documents

* `FEATURES.md`
* `README.md`
* `.env.example`

---

## Decision: Use `/` as the marketing landing page

### Context

Family Economy previously treated the root route as an app entry that redirected into the authenticated mobile experience.

The product now needs a parent-facing marketing entry that explains the value of the family economy before sign-in.

### Decision

Use `/` for a marketing landing page.

Keep the authenticated product experience under `/mobile/...`, with parent sign-in and account creation available through `/auth`.

### Reasoning

The landing page gives new families a clear first impression before they encounter login, onboarding, or household setup.

It also creates space to explain the product's educational purpose and fictional-credit boundaries.

### Impact

* `/` now renders the marketing landing page.
* `/auth` remains the parent sign-in and account creation route.
* `/mobile/home` remains the family dashboard route.
* Product positioning should emphasize family financial literacy, parent control, fictional credits, and child-friendly choices.

### Related Documents

* `FEATURES.md`
* `ROADMAP.md`
* `BRAND.md`
* `VISION.md`

---

## Decision: Add a documentation workflow closeout checklist

### Context

Roadmap updates can affect the decision log, feature documentation, domain model, AI context, and README links.

Previously, those follow-up checks were described across multiple docs but were not captured as a single repeatable workflow.

### Decision

Add `DOCUMENTATION_WORKFLOW.md` as the documentation closeout checklist.

The workflow explicitly requires contributors to check whether `DECISION_LOG.md` needs an entry before documentation work is considered complete.

### Reasoning

A single checklist reduces missed documentation updates and makes roadmap/status changes easier to audit.

It also gives AI contributors and human contributors the same flow for keeping active docs synchronized.

### Impact

* `AGENTS.md` references the workflow during documentation maintenance.
* `AI_CONTEXT.md` references the workflow for documentation changes.
* `README.md` lists the workflow and decision log as active docs.
* Archived planning/status docs are listed under archived docs instead of active docs.

### Related Documents

* `DOCUMENTATION_WORKFLOW.md`
* `AGENTS.md`
* `AI_CONTEXT.md`
* `README.md`
* `DECISION_LOG.md`

---

## Decision: Reorganize roadmap by delivery status

### Context

The roadmap mixed shipped features, active polish work, and future expansion ideas in several sections.

This made it harder to tell what was already implemented, what still needed refinement, and what should remain future-facing.

### Decision

Organize `ROADMAP.md` into three delivery-status buckets:

* Shipped
* In Progress / Needs Polish
* Future

Shipped product surfaces may still receive polish, but they should not be presented as future-only work.

### Reasoning

Status-based buckets make the roadmap easier to audit against the codebase.

They also reduce documentation drift by separating:

* Existing product surface
* Current refinement priorities
* Longer-term expansion concepts

### Impact

* Child savings accounts move out of future-only Advanced Economy and into Shipped.
* Weekly Recognition's implemented categories are documented separately from future recognition ideas.
* Parent Insights are documented as an existing foundation that can continue expanding.
* Community projects, voting, full family templates, budgeting, loans, investing, family business, and ecosystem variants remain future or in-progress work.

### Related Documents

* `ROADMAP.md`
* `FEATURES.md`
* `DOMAIN_MODEL.md`
* `EDUCATIONAL_PROGRESSION.md`

---

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
