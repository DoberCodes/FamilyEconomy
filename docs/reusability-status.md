# Reusability Status

This tracks reusable component, hook, service, and shared type opportunities that should keep the codebase easier to maintain as Family Economy grows.

## Completed

- Shared domain constants, labels, tones, and lightweight JSDoc typedefs in `src/domain/familyEconomyTypes.js`.
- Shared date/window/formatting helpers in `src/utils/dateUtils.js`.
- Shared parent help UI primitives in `src/components/shared/InlineHelpButton.jsx` and `src/components/shared/InlineHelpDetailLine.jsx`.
- First consumer pass across `HomePage`, `KidProfilePage`, `ProfilePage`, `SavingsPage`, `familyEconomyService`, and `policyUtils`.

## Remaining Opportunities

| Priority | Opportunity | Type | Benefit | Risk | Notes |
|---:|---|---|---|---|---|
| 1 | Extract parent admin dialog/form primitives | Components/hooks | Very high | Medium | Build on the new help button with shared dialog shell, form field rows, preset selectors, warning notes, and sticky actions. Start in `ProfilePage.jsx`. |
| 2 | Create shared async action hooks | Hooks | Very high | Low-medium | Centralize loading, saving, error, busy ID, and refresh-after-write flows used by `ProfilePage`, `KidProfilePage`, `StorePage`, and child profile screens. |
| 3 | Build family data hooks | Hooks/services | High | Medium | Add `useFamilyDashboard`, `useFamilyStoreData`, `useSavingsGoals`, `useRewardRequests`, and `useChildProfiles` wrappers around service calls. |
| 4 | Formalize child session context | Hook/service/types | High | Medium | Centralize parent-auth-backed mock child session context, selected child ID, lock/unlock state, and write metadata. |
| 5 | Extract dashboard selectors | Services/selectors | High | Medium | Move derived views like activity feed, child summaries, goal momentum, family savings spotlight, and trend cards out of page components. |
| 6 | Split `familyEconomyService.js` by domain | Services | Very high | High | Separate jobs, rewards, savings goals, household, consequences, analytics-facing helpers, and shared normalizers. Do this after selectors/hooks reduce page coupling. |
| 7 | Add reusable list/card/action UI primitives | Components | Medium-high | Low-medium | Extract status pill, empty state, action row, progress track, child badge/avatar, metric row, and limit chip patterns. |
| 8 | Centralize approval/policy configuration logic | Services/types/hooks | High | Medium | Move approval modes, preset detection/application, dynamic pricing presets, stale bonus presets, and consequence presets into shared policy helpers. |
| 9 | Expand shared domain types | Shared types | Medium-high | Low | Add more typedefs/constants for request kinds, recurrence modes, badge metrics, analytics event names, and session actor/write metadata. |
| 10 | Break up shared CSS into reusable style groups | Styles/components | Medium-high | Medium | `src/index.css` is large. Continue grouping styles by primitives/screens now that production builds pass. |

## Suggested Order

1. Extract low-risk async action hooks and simple UI primitives.
2. Formalize child session context before more kid-facing behavior is added.
3. Move dashboard selectors into services/selectors.
4. Group `src/index.css` styles by primitives/screens to reduce future parser risk.
5. Split `familyEconomyService.js` once the shared hooks/selectors define cleaner boundaries.

## Verification Notes

- `npm.cmd run lint` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:logic` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:rules` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run build` passed after fixing CSS block balance in `src/index.css`.
