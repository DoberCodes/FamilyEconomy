# Redux Conversion Status

Last updated: 2026-06-01

This document tracks where the Redux Toolkit and RTK Query migration stands, what is already stable, and what work is still left.

## Goal

Move shared cross-route app state and shared Firestore-backed server state into Redux Toolkit and RTK Query where that reduces duplicate loading logic, inconsistent error handling, and repeated refresh behavior.

Keep local UI state local. Dialog visibility, form drafts, active tabs, and one-screen-only interaction state should stay in component state unless there is a clear cross-route need.

## Redux Design Principles

Redux exists to manage:

* Shared cross-route application state
* Authentication state
* Shared Firestore-backed server state
* Cached data used across multiple screens
* Shared data that benefits from centralized loading and invalidation behavior

Redux should not be used for:

* Dialog visibility
* Form draft values
* Temporary busy/loading indicators tied to a single screen
* Active tab selection
* One-screen presentation state
* UI-only interaction state with no cross-route value

RTK Query is the preferred solution for shared Firestore-backed reads and writes.

The Firebase service layer remains the business-rule boundary.

Business rules should continue to live in services and domain logic, not inside Redux reducers or RTK Query endpoint definitions.

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
8. Parent command-center reads in `ProfilePage` now load through RTK Query instead of repeated page-local service orchestration.
9. Parent command-center writes in `ProfilePage` now route through RTK Query mutations with cache invalidation.
10. Parent command-center endpoint wiring is wrapped by `src/hooks/useParentCommandCenterData.js`.
11. Page-level direct `familyEconomyService` imports have been removed from mobile pages; shared reads/writes now route through RTK Query hooks.
12. Parent command-center request queue derivations are extracted into `src/services/parentCommandCenterSelectors.js`.
13. Parent command-center analytics and audit derivations are extracted into `src/services/parentAnalyticsSelectors.js`.

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
7. `ProfilePage` household setup reads and parent command-center resource groups now use RTK Query-backed reads.
8. `useParentCommandCenterData` now owns the `ProfilePage` parent command-center query wiring.
9. `KidProfilePage` now uses RTK Query lazy reads for onboarding and kid profile session refreshes.

### Shared Mutations

Completed:

1. First job-claim and reward-request mutations moved to RTK Query.
2. Kid-facing job, reward, and savings write actions now route through shared RTK Query mutations instead of direct page-level service calls.
3. Child session PIN setup now routes through RTK Query.
4. Onboarding setup reads and writes now route through RTK Query.
5. Mutation boilerplate is centralized through `familyMutation(...)` in `src/store/familyEconomyApiUtils.js`.
6. `ProfilePage` parent queue, child profile, household setup, job/reward, savings review, notification, and feedback writes now use RTK Query mutations.
7. `useParentCommandCenterData` wraps parent command-center mutation hooks and exposes page-level action methods.
8. `KidProfilePage` kid-facing writes now use RTK Query mutations instead of direct service calls.

### Serialization And Stability Work

Completed:

1. Added shared date/auth serialization helpers in `src/utils/serializeUtils.js`.
2. Normalized Firestore timestamp fields before they enter Redux or RTK Query cache.
3. Fixed auth-flow regressions introduced during the Redux migration.
4. Preserved auth continuity even when Firestore profile hydration fails.

### Selector And Page Cleanup

Completed:

1. Parent command-center request queue, reward demand, and aggregate request count derivations moved out of `ProfilePage`.
2. Parent command-center consequence, audit report, dynamic pressure, review, and celebration analytics moved out of `ProfilePage`.
3. Focused selector tests cover parent command-center queue, reward-demand, and parent analytics behavior.

## What Is Left

### Highest Priority Remaining Work

1. Continue extracting selector/helper boundaries around dashboard, child profile, and analytics derivations where they reduce page complexity.
2. Add targeted tests for parent command-center and kid session hook/action boundaries if those hooks grow more conditional behavior.
3. Review whether remaining analytics-only service imports should stay separate from RTK Query because they are admin/export workflows rather than shared app state.

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

1. Extract smaller selector/helper modules from `KidProfilePage` and `ProfilePage` for derived dashboard, reward, savings, and badge calculations.
2. Move only future shared server-state paths into RTK Query; keep single-screen form and dialog state local.
3. Keep the Firebase service layer as the business-rule boundary and use RTK Query only as the shared server-state/cache layer.
4. Continue serializing Firestore values before anything is written into Redux state.

## Migration Completion Criteria

The Redux migration will be considered complete when:

1. Shared cross-route state is centralized appropriately.
2. Shared Firestore-backed reads and writes use RTK Query where appropriate.
3. Page-level service orchestration is minimized in favor of reusable hooks and query layers.
4. Large page components have extracted selectors and helper modules where complexity warrants it.
5. Business rules remain in the service/domain layer.
6. Remaining local state is intentionally local.
7. Critical Redux and RTK Query paths have targeted tests.
8. Documentation accurately reflects the architecture.

## Validation History

The Redux conversion work has already passed repeated build validations during the migration, including:

1. Redux store and RTK Query foundation.
2. Auth state stabilization after reducer fixes.
3. Firestore timestamp serialization hardening.
4. Shared query helper consolidation in `familyEconomyApiUtils.js`.
5. Parent command-center read and write migration for `ProfilePage`.
6. Parent command-center hook extraction.
7. Kid profile page service import removal and RTK Query read/write migration.
8. Parent command-center selector extraction and tests.
9. Parent analytics selector extraction and tests.

Current known engineering note:

1. Production builds still report the known large chunk warning. That is a bundling concern, not a Redux correctness blocker.

## Documentation Notes

When Redux-related architecture changes occur:

1. Update this document.
2. Update `ARCHITECTURE.md` if architectural boundaries change.
3. Update `ROADMAP.md` if migration priorities change.
4. Record significant architectural decisions in project documentation.
5. Keep implementation status synchronized with reality.

## Summary

The Redux conversion is past the risky foundation stage.

The store, auth state, shared selectors, core shared reads, parent command-center reads/writes, kid profile session reads/writes, and several shared mutations are already migrated and stable.

What remains is primarily cleanup, boundary refinement, selector extraction, targeted testing, and maintaining clear separation between business rules, RTK Query caching, and local UI state.

Future work should prioritize maintainability, consistency, and reducing page complexity without moving local UI concerns into Redux unnecessarily.
