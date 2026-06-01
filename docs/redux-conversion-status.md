# Redux Conversion Status

Last updated: 2026-06-01

This document tracks where the Redux Toolkit and RTK Query migration stands, what is already stable, and what work is still left.

## Goal

Move shared cross-route app state and shared Firestore-backed server state into Redux Toolkit and RTK Query where that reduces duplicate loading logic, inconsistent error handling, and repeated refresh behavior.

Keep local UI state local. Dialog visibility, form drafts, active tabs, and one-screen-only interaction state should stay in component state unless there is a clear cross-route need.

## Current Status

Overall status: `in-progress`

What is working now:

1. Redux store foundation is in place in `src/store/appStore.js`.
2. Auth state is centralized in `src/store/authSlice.js`.
3. Shared auth-derived logic is centralized in `src/store/authSelectors.js`.
4. Shared Firestore-backed reads are moving through RTK Query in `src/store/familyEconomyApi.js`.
5. Shared mutation flows are partially centralized in RTK Query via `src/store/familyEconomyMutationEndpoints.js`.
6. Firestore timestamp serialization is in place before Redux cache writes through `src/utils/serializeUtils.js` and service-layer normalizers.
7. Query endpoint boilerplate is now centralized through shared helpers in `src/store/familyEconomyApiUtils.js`.

## Completed Conversion Work

### Foundation

Completed:

1. Added Redux Toolkit store setup and RTK Query middleware.
2. Wired the app to the shared Redux provider.
3. Added shared API slice foundation for family data.

### Auth State

Completed:

1. Moved auth state into `authSlice`.
2. Fixed reducer payload handling so reducers consistently use `action.payload`.
3. Centralized auth snapshot logic and derived booleans in `authSelectors`.
4. Consolidated auth/profile serialization through `serializeAuthProfile(...)`.
5. Consolidated auth error normalization through shared error utilities.

### Shared Read Queries

Completed:

1. `useFamilyDashboard` now reads through RTK Query.
2. `useFamilyStoreData` now reads through RTK Query.
3. `useHouseholdOnboardingData` now reads through RTK Query.
4. `useFamilyHomeData` now reads through a composed RTK Query endpoint.
5. Kid profile session reads now use the shared `getKidProfileSessionData` RTK Query endpoint.
6. Query wrappers were consolidated with a shared `familyQuery(...)` helper so endpoint success/error/tag behavior is consistent.

### Shared Mutations

Completed:

1. First job-claim and reward-request mutations moved to RTK Query.
2. Kid-facing job, reward, and savings write actions now route through shared RTK Query mutations instead of direct page-level service calls.
3. Child session PIN setup now routes through RTK Query.
4. Onboarding setup reads and writes now route through RTK Query.
5. Mutation boilerplate is centralized through `familyMutation(...)` in `src/store/familyEconomyApiUtils.js`.

### Serialization And Stability Work

Completed:

1. Added shared date/auth serialization helpers in `src/utils/serializeUtils.js`.
2. Normalized Firestore timestamp fields before they enter Redux or RTK Query cache.
3. Fixed auth-flow regressions introduced during the Redux migration.
4. Preserved auth continuity even when Firestore profile hydration fails.

## What Is Left

### Highest Priority Remaining Work

1. Move deeper `ProfilePage` shared reads behind RTK Query so parent command-center data stops relying on repeated page-local fetch orchestration.
2. Add focused RTK Query-backed hooks/endpoints for remaining shared resource groups such as feedback entries, reward approval queues, family jobs, savings goals, job-check requests, and consequence events where they still rely on page-local coordination.
3. Continue replacing direct service imports inside large pages when the state is shared across routes or needs cache invalidation.

### Medium Priority Remaining Work

1. Review whether any remaining cross-route app state still belongs in a Redux slice instead of being recomputed or passed locally.
2. Expand selector extraction around dashboard and analytics derivations so RTK Query delivers normalized data and selectors handle view shaping.
3. Add targeted tests for new selector/helper boundaries as more logic moves out of pages.

### Not Planned For Redux

These should stay local unless requirements change:

1. Dialog open/close state.
2. Form draft fields.
3. Temporary busy flags tied to a single screen action.
4. Active tab selection.
5. PIN field visibility and similar one-screen presentation state.

## Recommended Next Redux Steps

1. Convert the highest-value `ProfilePage` shared reads into RTK Query endpoints first.
2. Add domain-specific hooks on top of those endpoints where they reduce page size without hiding cache ownership.
3. Keep the Firebase service layer as the business-rule boundary and use RTK Query only as the shared server-state/cache layer.
4. Continue serializing Firestore values before anything is written into Redux state.

## Validation History

The Redux conversion work has already passed repeated build validations during the migration, including:

1. Redux store and RTK Query foundation.
2. Auth state stabilization after reducer fixes.
3. Firestore timestamp serialization hardening.
4. Shared query helper consolidation in `familyEconomyApiUtils.js`.

Current known engineering note:

1. Production builds still report the known large chunk warning. That is a bundling concern, not a Redux correctness blocker.

## Summary

The Redux conversion is past the risky foundation stage.

The store, auth state, shared selectors, core shared reads, and several shared mutations are already migrated and stable.

What remains is the second-half migration: moving the larger parent command-center and remaining shared family data surfaces behind RTK Query where they benefit from centralized caching, invalidation, and consistent error handling.