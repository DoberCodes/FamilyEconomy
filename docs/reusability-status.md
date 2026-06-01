# Reusability Status

This tracks reusable component, hook, service, and shared type opportunities that should keep the codebase easier to maintain as Family Economy grows.

## Completed

- Shared domain constants, labels, tones, and lightweight JSDoc typedefs in `src/domain/familyEconomyTypes.js`.
- Shared date/window/formatting helpers in `src/utils/dateUtils.js`.
- Shared parent help UI primitives in `src/components/shared/InlineHelpButton.jsx` and `src/components/shared/InlineHelpDetailLine.jsx`.
- First consumer pass across `HomePage`, `KidProfilePage`, `ProfilePage`, `SavingsPage`, `familyEconomyService`, and `policyUtils`.
- Shared async action hook in `src/hooks/useAsyncAction.js`, first wired into `StorePage` and `MissionsPage`.
- Shared lightweight UI primitives in `src/components/shared/StatusNote.jsx`, `StatusPill.jsx`, and `EmptyState.jsx`, first wired into `StorePage`, `MissionsPage`, and `SavingsPage`.
- Shared family actor helper in `src/hooks/useFamilyActor.js`, first wired into `StorePage`, `MissionsPage`, and onboarding read flows.
- `StatusPill` now owns a neutral `status-pill` class instead of baking the reusable primitive into legacy `limit-chip` naming.
- Shared family resource loader in `src/hooks/useFamilyResource.js`, with `useFamilyDashboard.js` and `useFamilyStoreData.js` wrappers first wired into `StorePage`, `MissionsPage`, and `SavingsPage`.
- Savings-goal dashboard selectors in `src/services/dashboardSelectors.js` for goal counts, sorting, progress, and spotlight calculations.
- Shared household/child-profile data hooks in `src/hooks/useHouseholdOnboardingData.js` and `src/hooks/useChildProfiles.js`, first wired into `ChildProfilesPage`.
- Shared `FamilyActorNotice` component for parent-viewing-child and child-selection status messaging, first wired into `StorePage`, `MissionsPage`, and `SavingsPage`.
- Shared home dashboard loader in `src/hooks/useFamilyHomeData.js`, wired into `HomePage` to centralize dashboard, store, onboarding, and family feature flag loading.

## Remaining Opportunities

| Priority | Opportunity | Type | Benefit | Risk | Notes |
|---:|---|---|---|---|---|
| 1 | Extract parent admin dialog/form primitives | Components/hooks | Very high | Medium | Build on the new help button with shared dialog shell, form field rows, preset selectors, warning notes, and sticky actions. Start in `ProfilePage.jsx`. |
| 2 | Expand shared async hooks | Hooks | Very high | Low-medium | Extend `useAsyncAction` into `ProfilePage`, `KidProfilePage`, and child profile screens; consider a companion data-loading hook for mounted-state refresh flows. `run()` now returns an explicit `{ ok, result, error }` object. |
| 3 | Expand family data hooks | Hooks/services | High | Medium | Build on `useFamilyResource`, `useFamilyDashboard`, `useFamilyStoreData`, `useHouseholdOnboardingData`, `useChildProfiles`, and `useFamilyHomeData`; add focused `useSavingsGoals`/`useRewardRequests` wrappers only where they simplify larger screens. |
| 4 | Formalize child session context | Hook/service/types | High | Medium | Build on `useFamilyActor` to centralize parent-auth-backed mock child session context, selected child ID, lock/unlock state, and write metadata. |
| 5 | Extract dashboard selectors | Services/selectors | High | Medium | Build on `dashboardSelectors.js`; continue moving derived views like activity feed, child summaries, goal momentum, family savings spotlight, and trend cards out of page components. |
| 6 | Split `familyEconomyService.js` by domain | Services | Very high | High | Separate jobs, rewards, savings goals, household, consequences, analytics-facing helpers, and shared normalizers. Do this after selectors/hooks reduce page coupling. |
| 7 | Expand reusable list/card/action UI primitives | Components | Medium-high | Low-medium | Build on `StatusNote`, `StatusPill`, and `EmptyState` with action row, progress track, child badge/avatar, metric row, and repeated list item patterns. |
| 8 | Centralize approval/policy configuration logic | Services/types/hooks | High | Medium | Move approval modes, preset detection/application, dynamic pricing presets, stale bonus presets, and consequence presets into shared policy helpers. |
| 9 | Expand shared domain types | Shared types | Medium-high | Low | Add more typedefs/constants for request kinds, recurrence modes, badge metrics, analytics event names, and session actor/write metadata. |
| 10 | Break up shared CSS into reusable style groups | Styles/components | Medium-high | Medium | `src/index.css` is large. Continue grouping styles by primitives/screens now that production builds pass. |

## Suggested Order

1. Continue applying `useAsyncAction`, family data hooks, and shared UI primitives to larger parent/kid flows.
2. Formalize full child session context before more kid-facing behavior is added.
3. Continue moving dashboard selectors into services/selectors.
4. Group `src/index.css` styles by primitives/screens to reduce future parser risk.
5. Split `familyEconomyService.js` once the shared hooks/selectors define cleaner boundaries.

## Verification Notes

- `npm.cmd run lint` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:logic` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:rules` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run build` passed after fixing CSS block balance in `src/index.css`.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the `useFamilyActor`, `useAsyncAction`, and `StatusPill` cleanup pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the family resource/data hooks and savings selector pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the household/child-profile hooks and `FamilyActorNotice` pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the `useFamilyHomeData` HomePage pass.

## Data Impact Notes

- Reusability passes so far have not changed Firestore paths, document shapes, auth persistence, or fixture data.
- No test data reset, migration, or relinking is required for the shared hook/component changes.
