# Analytics Event Tracking Plan

Status: draft complete for Phase 10 planning

## Goal

Track the minimum event set needed to measure onboarding completion, weekly engagement, and core loop adoption without exposing personal details.

## Measurement Questions

1. Are families finishing onboarding?
2. Are kids and parents using the core loop each week?
3. Which parts of the loop create friction or drop-off?
4. Are goals, jobs, and rewards being used in the intended order?

## Event Principles

- Capture behavior, not identity.
- Prefer IDs and roles over names or free text.
- Keep event names stable and descriptive.
- Use the same event shape across parent and kid screens.
- Make analytics optional and non-blocking so the app still works if tracking is unavailable.

## Event Schema

Every event should include:

- `eventName`
- `familyId`
- `userId`
- `userRole`
- `childId` when relevant
- `screen`
- `timestamp`
- `source` when the event comes from a specific flow or action

Useful optional properties:

- `itemId`
- `itemType`
- `status`
- `creditsBefore`
- `creditsAfter`
- `progressPercent`
- `limitType`
- `actionResult`

## Core Event Set

### Onboarding

- `onboarding_started`
- `onboarding_household_created`
- `onboarding_child_created`
- `onboarding_job_created`
- `onboarding_reward_created`
- `onboarding_completed`

### Parent actions

- `parent_dashboard_viewed`
- `job_created`
- `job_updated`
- `reward_created`
- `reward_updated`
- `goal_created`
- `goal_updated`
- `household_settings_updated`

### Child actions

- `child_dashboard_viewed`
- `job_claim_requested`
- `job_claimed`
- `job_check_requested`
- `reward_request_submitted`
- `reward_request_approved`
- `reward_request_denied`
- `goal_created`
- `goal_milestone_reached`
- `goal_completed`
- `savings_viewed`

### Engagement and retention

- `family_dashboard_viewed`
- `weekly_active_family`
- `credits_changed`
- `statement_viewed`

## Event Details

### `onboarding_completed`

- Fires when household setup, at least one child, at least one job, and at least one reward exist.
- Properties: `childCount`, `jobCount`, `rewardCount`.

### `job_claim_requested`

- Fires when a child taps Claim on an open job.
- Properties: `itemId`, `limitType`, `status`.

### `reward_request_submitted`

- Fires when a child requests a reward.
- Properties: `itemId`, `cost`, `creditsBefore`, `creditsAfter` not yet changed, `limitType`.

### `goal_milestone_reached`

- Fires when a goal crosses 25%, 50%, 75%, or 100%.
- Properties: `progressPercent`, `target`, `saved`.

### `credits_changed`

- Fires after money-affecting actions such as approved jobs or approved rewards.
- Properties: `creditsBefore`, `creditsAfter`, `delta`, `source`.

## Metrics To Build

### D2 Parent onboarding completion metric

- Definition: percentage of families that emit `onboarding_completed` after `onboarding_started`.

### D3 Weekly active family metric

- Definition: count of unique `familyId` values with at least one meaningful event in a 7-day window.
- Meaningful events: `family_dashboard_viewed`, `job_claimed`, `job_check_requested`, `reward_request_submitted`, `goal_milestone_reached`.

### Retention and adoption metrics

- Onboarding completion rate.
- Weekly active children per family.
- Reward request conversion rate.
- Job claim to completion conversion rate.
- Goal creation to milestone completion rate.

## Implementation Notes

- Add a thin analytics adapter with a no-op fallback.
- Keep tracking calls close to existing service actions so the event reflects the actual saved state.
- Avoid duplicating analytics logic in every page; prefer shared helpers for action-based events.
- Do not block user flows if analytics writes fail.

## Next Instrumentation Slice

1. Add a shared analytics helper.
2. Emit onboarding events from the existing onboarding service actions.
3. Emit core-loop events from job, reward, and goal service methods.
4. Add a simple readout or export path for weekly family counts.