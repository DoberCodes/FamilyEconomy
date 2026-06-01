# Domain Model

This document describes the core Family Economy concepts. All balances and transactions are fictional educational credits, not real-world money.

## Identity And Access

### Parent User

- Authenticated Firebase user.
- Owns or administers a family household.
- Controls household rules, jobs, rewards, approvals, taxes, community spending, and child sessions.

### Child Profile

- Family-scoped profile stored under the family.
- Represents a child inside the household economy.
- Used for credits, goals, jobs, rewards, statements, achievements, and local child session handoff.

### Child Session

- Mock/local kid login under the parent-authenticated household.
- May use a child session code for local device handoff.
- Does not create a separate Firebase security boundary by default.
- Firestore writes from kid-facing flows should remain explicitly parent-mediated unless a future true child-auth model is introduced.

## Core Entities

### Family

The household container and policy authority.

Typical responsibilities:

- Family name and settings
- Approval modes
- Job/reward/savings rules
- Optional taxes and community fund settings
- Recognition and educational feature settings

### Job

A parent-created earning opportunity or responsibility task.

Important concepts:

- Assigned child jobs
- Shared pool jobs
- Fictional credit rewards or XP-only recognition
- Claim limits
- Parent check/approval settings
- Missed-job consequence settings

### Savings Goal

A personal or family goal that teaches delayed gratification and planning.

Important statuses:

- `active`
- `pending_parent_approval`
- `ready_to_claim`
- `countered`
- `completed`
- `denied`

Goals are core to the product and should remain prominent in child and parent workflows.

### Reward

A parent-defined option that children may request or save toward.

Important concepts:

- Fictional credit cost
- Per-child and family claim limits
- Approval overrides
- Shared family pool rewards
- Recurring or one-time availability

Rewards should reinforce decision making, not become randomized prizes.

### Reward Request

A child-initiated or parent-mediated request.

Important request kinds:

- `proposal`: child suggests a reward idea
- `purchase`: child requests or claims an available reward

Important statuses:

- `pending`
- `approved`
- `fulfilled`
- `denied`
- `countered`
- `redirected_to_pool`

### Family Fund

Planned community-oriented pool funded by optional taxes or contributions.

Purpose:

- Teach shared responsibility
- Show how collective resources benefit a group
- Support family-wide goals and projects

### Family Tax

Planned parent-configured fictional tax on earnings or selected activities.

Purpose:

- Teach how taxes function
- Teach community participation
- Fund shared family benefits

Taxes should not be framed as punishment or loss for bad behavior.

### Statement Entry

A child-facing record of fictional credit changes.

Purpose:

- Help children understand earning, saving, spending, and contribution history.
- Keep balances explainable.
- Avoid implying real-world banking statements.

## Shared Types And Constants

Shared domain constants and labels live in `src/domain/familyEconomyTypes.js`.

Use shared constants for:

- Job statuses
- Goal statuses
- Reward request statuses
- Reward types
- Approval modes
- Status labels and tones

## Modeling Guardrails

- Use `credits` for fictional educational units.
- Avoid names that imply real-world funds unless the docs/UI clearly frame them as fictional family learning tools.
- Keep parent authority explicit in model names and write flows.
- Keep child profile identity separate from Firebase Auth identity unless true child auth is intentionally introduced later.
