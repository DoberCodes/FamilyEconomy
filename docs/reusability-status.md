# Reusability Status

This tracks reusable component, hook, service, and shared type opportunities that should keep the codebase easier to maintain as Family Economy grows.

## File Size Direction

- Aim for roughly 200 lines or less for new reusable components, hooks, selectors, and feature modules.
- Existing large files should be reduced incrementally by extracting clean, scalable boundaries rather than preserving awkward legacy structure.
- Page files should trend toward orchestration only: data hooks, high-level layout, and route decisions.
- Prefer reusable components when two or more screens share form layouts, list rows, status chips, action rows, cards, or validation behavior.
- Exceptions are acceptable for dense domain constants or unavoidable integration files, but call them out in this tracker.

## Completed

- Shared domain constants, labels, tones, and lightweight JSDoc typedefs in `src/domain/familyEconomyTypes.js`.
- Shared date/window/formatting helpers in `src/utils/dateUtils.js`.
- Shared parent help UI primitives in `src/components/shared/InlineHelpButton.jsx` and `src/components/shared/InlineHelpDetailLine.jsx`.
- First consumer pass across `HomePage`, `KidProfilePage`, `ProfilePage`, `SavingsPage`, `familyEconomyService`, and `policyUtils`.
- Shared async action hook in `src/hooks/useAsyncAction.js`, first wired into `StorePage` and `MissionsPage`.
- Shared lightweight UI primitives in `src/components/shared/StatusNote.jsx`, `StatusPill.jsx`, and `EmptyState.jsx`, first wired into `StorePage`, `MissionsPage`, and `SavingsPage`.
- Shared family actor helper in `src/hooks/useFamilyActor.js`, first wired into `StorePage`, `MissionsPage`, and onboarding read flows.
- `StatusPill` now owns a neutral `status-pill` class instead of baking the reusable primitive into legacy `limit-chip` naming.
- Retired the interim `useFamilyResource` loader after moving shared family reads to RTK Query-backed hooks.
- Savings-goal dashboard selectors in `src/services/dashboardSelectors.js` for goal counts, sorting, progress, and spotlight calculations.
- Shared household/child-profile data hooks in `src/hooks/useHouseholdOnboardingData.js` and `src/hooks/useChildProfiles.js`, first wired into `ChildProfilesPage`.
- Shared `FamilyActorNotice` component for parent-viewing-child and child-selection status messaging, first wired into `StorePage`, `MissionsPage`, and `SavingsPage`.
- Shared home dashboard loader in `src/hooks/useFamilyHomeData.js`, wired into `HomePage` to centralize dashboard, store, onboarding, and family feature flag loading.
- Shared accessible `ProgressTrack` component in `src/components/shared/ProgressTrack.jsx`, wired across level, savings, home, and kid goal progress displays.
- First `KidProfilePage` size-reduction pass extracted child profile constants and the child-facing hero/navigation header into small reusable modules under `src/components/mobile/kidProfile`.
- Redux Toolkit and RTK Query foundation added in `src/store`, with `useFamilyHomeData`, `useFamilyDashboard`, `useFamilyStoreData`, and `useHouseholdOnboardingData` migrated to the shared query cache.
- First RTK Query mutations added for job claiming and reward requests, replacing manual page refresh calls with cache invalidation.
- Kid-facing job, reward, and savings write actions in `KidProfilePage` now route through shared RTK Query mutations instead of importing write services directly.

## Latest Reusability Review - 2026-06-01

Fresh scan notes:

- `ProfilePage.jsx` remains the largest frontend hotspot at roughly 5,499 lines.
- `familyEconomyService.js` remains the largest service hotspot at roughly 3,452 lines with 42 exported async functions.
- `KidProfilePage.jsx` remains a large child-facing workflow hotspot at roughly 2,883 lines after recent shared component passes.
- `OnboardingPage.jsx` and `HomePage.jsx` are still large enough to benefit from selector/hooks extraction, even after the first data-hook pass.
- `ProfilePage.jsx` still has heavy form/dialog duplication, including roughly 54 `form-label-row` usages, 55 `HelpButton` usages, and 16 `setDialogBusy(true)` action flows.
- Large parent/kid/onboarding pages still contain many hand-managed `try/finally` and busy-state patterns; these are good candidates for broader `useAsyncAction` adoption.
- Repeated `limit-chip`, `profile-list-item`, `button-row`, and `claim-button` patterns remain in large pages and should be migrated gradually to shared primitives.
- Component scan also found roughly 96 repeated form fields, 52 claim-button usages, 29 button rows, 68 limit-chip usages, 13 mission-list usages, and 10 profile-list-item usages across the larger mobile pages.
- Derived dashboard data still lives in pages, especially activity feeds, family trend cards, child summaries, recognition winners, family savings contributors, and parent insight cards.
- Shared family server-state loading is now starting to move into RTK Query. Continue using component state for local UI concerns such as active tabs, form drafts, dialog visibility, and PIN field visibility.
- No reviewed opportunity requires preserving existing test data shape for compatibility. Future clean refactors may restructure data or fixtures if documented, per `AGENTS.md`.

## Component Reuse Targets

Reusable components should be extracted when two or more screens share the same structure, state shape, validation pattern, or user intent. Prefer a clean generic component over preserving page-specific markup, as long as the component keeps Family Economy language and fictional-credit boundaries clear.

### Form Components

Targets:

- `FormField`: shared label, optional help button, validation/error note, and control layout.
- `HelpedLabel`: wraps label text plus `InlineHelpButton` so form sections do not manually repeat `form-label-row`.
- `NumberField`: numeric input with `min`, `max`, step, value parsing, and optional warning text.
- `SelectField`: select input with label/help/options and consistent disabled/error behavior.
- `ToggleSelect`: reusable yes/no or on/off select for parent-controlled settings.
- `MarkdownField`: wrapper around `MarkdownTextArea` with label/help and consistent save-state messaging.
- `PresetSelector`: reusable preset picker for policy, educational pricing, stale bonus, consequence, and recognition preset groups.

Good first use cases:

- Profile settings sections with repeated label/help/select/input blocks.
- Onboarding policy controls that mirror parent settings.
- Kid custom reward and savings contribution forms once action state is centralized.

### Dialog And Section Components

Targets:

- `DialogShell`: shared dialog container, title, close button, busy state, and accessible labels.
- `DialogSection`: section title, subtitle, optional action row, and consistent spacing.
- `DialogSubsection`: reusable `details`/`summary` block for advanced settings and insight groups.
- `StickyDialogActions`: sticky save/cancel/action footer used by parent settings dialogs.
- `WarningNote`: consistent warning/status copy for extreme pricing, high bonus, validation, and destructive actions.

Good first use cases:

- Parent family setup dialog.
- Parent rewards/jobs/savings dialogs.
- Insights and creator metrics sections that repeat `dialog-subsection` markup.

### List And Card Components

Targets:

- `ProfileListItem`: shared two-column list row with main text, subtext, status, and actions.
- `MissionList`: shared list shell for mission/job/reward/activity rows.
- `RequestCard`: shared parent/kid reward and savings request card with status, child, note, and action slots.
- `GoalCard`: shared savings goal display with status, credits, progress, and action slots.
- `JobCard`: shared job row/card for open, claimed, done, pool, and parent-admin job views.
- `InsightCard`: shared analytics card for parent insights, trends, consequence summaries, and metrics.
- `ChildAvatarName`: shared child identity display for lists, request cards, and family dashboards.

Good first use cases:

- Home family goal contributors and kids-at-a-glance cards.
- Kid jobs/rewards/savings lists.
- Parent pending reward, approved reward, savings goal, and current chore lists.

### Action Components

Targets:

- `ActionButton`: wraps `claim-button` variants with `busy`, `tone`, and accessible loading labels.
- `ActionRow`: shared layout for confirm/cancel groups and multi-button review decisions.
- `ConfirmInlineAction`: reusable two-step confirmation row for cancel/delete/deny actions.
- `ReviewDecisionActions`: approve/counter/deny/fulfill action slots for parent review flows.

Good first use cases:

- Reward review actions.
- Savings goal approval/counter/deny actions.
- Delete/cancel child, goal, job, and reward confirmations.

### Status And Metric Components

Targets:

- `StatusPillGroup`: maps arrays of labels/counts into consistent status pills.
- `MetricRow`: label/value/helper row for summaries.
- `MetricCard`: compact insight card for parent dashboard and analytics.
- `CreditAmount`: formats fictional credits consistently and avoids real-money language.
- `RewardCostSummary`: shows base/current/projected educational reward costs with guardrail language.

Good first use cases:

- Repeated pending/approved/fulfilled/denied count rows.
- Family dashboard trend cards.
- Educational pricing summaries in kid and parent reward views.

## Remaining Opportunities

| Priority | Opportunity | Type | Benefit | Risk | Notes |
|---:|---|---|---|---|---|
| 1 | Extract parent admin dialog/form primitives | Components/hooks | Very high | Medium | Start in `ProfilePage.jsx`. Create shared `DialogShell`, `DialogSection`, `DialogSubsection`, `FormField`, `HelpedLabel`, `SelectField`, `NumberField`, `ToggleSelect`, `PresetSelector`, `StickyDialogActions`, and warning/note primitives. |
| 2 | Apply `useAsyncAction` to large action flows | Hooks | Very high | Low-medium | Replace repeated `setSaving`, `setDialogBusy`, `setFeedbackBusy`, `setAccountBusy`, and kid action busy flows in `ProfilePage`, `KidProfilePage`, and `OnboardingPage`. Keep action return shape `{ ok, result, error }`. |
| 3 | Migrate shared server-state reads and writes to RTK Query | Store/API/hooks | Very high | Medium | Core family data hooks plus kid-facing job/reward/savings mutations are migrated. Continue with child-profile writes, consequence events, feedback entries, parent approval mutations, and eventually KidProfile read state. |
| 4 | Formalize full child session context | Hook/service/types | Very high | Medium | Build from `useFamilyActor` into a complete parent-auth-backed child session contract: selected child, session lock/unlock, child session code state, actor write metadata, and parent-viewing-child semantics. |
| 5 | Extract dashboard and analytics selectors | Services/selectors | High | Medium | Expand `dashboardSelectors.js` beyond savings goals. Move activity feed, family trend cards, child summaries, recognition winners, family savings contributors, celebration counts, and parent insight calculations out of pages. |
| 6 | Expand family data hooks for larger pages | Hooks/services | High | Medium | Add focused wrappers such as `useRewardRequests`, `useFamilyJobs`, `useSavingsGoals`, `useConsequenceEvents`, `useJobCheckRequests`, and `useFeedbackEntries` where they simplify `ProfilePage` and `KidProfilePage`. Prefer RTK Query-backed hooks for shared server state. |
| 7 | Extract reusable list/card/action primitives | Components | High | Low-medium | Build `ActionRow`, `ActionButton`, `ConfirmInlineAction`, `MetricRow`, `MetricCard`, `ChildAvatarName`, `RequestCard`, `GoalCard`, `JobCard`, `InsightCard`, `RequestStatusPill`, `StatusPillGroup`, `CreditAmount`, `RewardCostSummary`, and `ProfileListItem` on top of existing shared primitives. |
| 8 | Split `ProfilePage.jsx` into parent feature modules | Components/hooks | Very high | Medium-high | After primitives exist, split parent command center into modules for family setup, children, jobs, rewards, savings, approvals, recognition, insights, account, and feedback. This is the biggest frontend maintainability win. |
| 9 | Split `KidProfilePage.jsx` into child workflow modules | Components/hooks | High | Medium-high | First header/constants extraction is complete. Continue with child session lock UI, overview, jobs, statement, savings, rewards, family news, and child action handlers. Pair with child session context before changing behavior. |
| 10 | Centralize approval/policy configuration logic | Services/types/hooks | High | Medium | Move approval modes, preset detection/application, educational pricing presets, stale bonus presets, consequence presets, and family policy summaries into shared policy helpers. |
| 11 | Split `familyEconomyService.js` by domain | Services | Very high | High | Separate jobs, rewards, savings goals, household/children, child sessions, consequences, analytics-facing helpers, and shared normalizers. Do this once hooks/selectors define cleaner boundaries. |
| 12 | Expand shared domain types/constants | Shared types | Medium-high | Low | Add constants/typedefs for request kinds, recurrence modes, badge metrics, analytics event names, actor/write metadata, family policy presets, and educational pricing settings. |
| 13 | Break up shared CSS into reusable style groups | Styles/components | Medium-high | Medium | `src/index.css` is large. Group styles by primitives, cards, parent dialogs, kid pages, and analytics/insight surfaces. Prefer component-owned primitive class names over legacy page-specific names. |
| 14 | Add selector and hook tests | Tests | Medium-high | Low-medium | Add focused tests for `dashboardSelectors`, policy helpers, and hook-adjacent pure helpers before deeper page extraction. This keeps refactors quick and safe. |
| 15 | Plan route-level code splitting | Architecture | Medium | Medium | Production build passes but reports a large chunk. After page extraction, lazy-load large mobile routes such as parent profile and kid profile. |

## Suggested Order

1. Build parent dialog/form primitives and wire the safest `ProfilePage` sections first.
2. Continue RTK Query migration for shared family server state before adding more custom data hooks.
3. Apply `useAsyncAction` to repeated parent, kid, and onboarding action flows.
4. Formalize the full child session context on top of `useFamilyActor`.
5. Move Home/Kid/Profile derived dashboard data into selector modules.
6. Add focused RTK Query-backed family data hooks for reward requests, savings goals, job checks, consequence events, and feedback.
7. Split `ProfilePage.jsx` into feature modules after primitives and hooks reduce coupling.
8. Split `KidProfilePage.jsx` into child workflow modules after child session context is clearer.
9. Split `familyEconomyService.js` by domain once page-level callers rely on hooks/selectors rather than direct monolithic service imports.
10. Group `src/index.css` styles by primitives/screens and gradually retire legacy class names where shared components now exist.
11. Add tests for selector/helper layers before larger service and page splits.

## Next Implementation Batches

### Batch A - Parent Form Primitives

- Add shared `DialogSection`, `FormField`, `HelpedLabel`, `WarningNote`, and `StickyDialogActions`.
- Convert one low-risk `ProfilePage` dialog section first, such as display controls or recognition thresholds.
- Data impact: none expected.

### Batch A2 - Generic Component Primitives

- Add `ActionButton`, `ActionRow`, `StatusPillGroup`, `MetricRow`, `ProfileListItem`, and `ChildAvatarName`.
- Convert simple repeated rows first: Home count chips, Kid reward status counts, and parent celebration counts.
- Then add domain cards (`RequestCard`, `GoalCard`, `JobCard`) only after the row/action primitives prove stable.
- Data impact: none expected.

### Batch B - Async Action Adoption

- Convert repeated `setDialogBusy(true) -> try/finally -> setDialogBusy(false)` flows to `useAsyncAction`.
- Start with isolated actions like family announcement, feedback, account update, or child profile settings before reward/savings approval flows.
- Data impact: none expected.

### Batch B2 - RTK Query Migration

- Keep Firebase service functions as the business-rule boundary, but route shared read state through RTK Query.
- Add query endpoints and tags before migrating each hook so future mutations can invalidate cached family data.
- `useFamilyDashboard`, `useFamilyStoreData`, and `useHouseholdOnboardingData` now use RTK Query.
- Kid-facing job, reward, and savings mutations now use RTK Query.
- Add domain-specific endpoints for consequence events, feedback, child profile writes, and parent approval actions next.
- Use Redux slices only for cross-route app state; keep local UI state local.
- Data impact: none expected while Firestore paths and document shapes stay unchanged.

### Batch C - Child Session Context

- Move child session lock/unlock state, session code validation, selected child lookup, and child actor metadata out of `KidProfilePage`.
- Document any auth/session semantic changes in `AI_CONTEXT.md`, `ARCHITECTURE.md`, and `DOMAIN_MODEL.md`.
- Data impact: possible session metadata reset only if stored child-session fields are renamed; document reset/migration if that happens.

### Batch C2 - Kid Profile File Size Reduction

- Keep extracted kid profile modules near the 200-line target where practical.
- Extract `KidSessionGate`, `KidPinSetupCard`, and child session helpers before moving larger tab bodies.
- Extract tab components in this order: overview, family news, jobs, statement, savings, rewards.
- Move derived child dashboard selectors out of `KidProfilePage` as tab components become smaller.
- Data impact: none expected for component-only extraction; document any session field cleanup before changing stored data.

### Batch D - Dashboard Selectors

- Extract pure selectors for activity feeds, family trend cards, recognition winners, family savings contributors, and parent insight cards.
- Add unit tests for selector inputs/outputs before wiring large pages.
- Data impact: none expected.

### Batch E - Service Domain Split

- Split `familyEconomyService.js` into domain services after callers are routed through hooks/selectors.
- Proposed modules: `familyContextService`, `jobsService`, `rewardsService`, `savingsGoalsService`, `householdService`, `childSessionService`, `consequenceService`, and `normalizers`.
- Data impact: none required if Firestore paths stay the same; if document shapes are cleaned up, explicitly document reset/migration/relink steps.

## Verification Notes

- `npm.cmd run lint` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:logic` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run test:rules` passed after the fictional-credit copy and CSS fixes.
- `npm.cmd run build` passed after fixing CSS block balance in `src/index.css`.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the `useFamilyActor`, `useAsyncAction`, and `StatusPill` cleanup pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the family resource/data hooks and savings selector pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the household/child-profile hooks and `FamilyActorNotice` pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the `useFamilyHomeData` HomePage pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the `ProgressTrack` shared component pass.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the first `KidProfilePage` header/constants extraction. Build still reports the known large chunk warning.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after the Redux Toolkit and RTK Query foundation. Build still reports the known large chunk warning.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after migrating dashboard/store/onboarding hooks and first job/reward mutations to RTK Query. Build still reports the known large chunk warning.
- `npm.cmd run lint`, `npm.cmd run test:logic`, and `npm.cmd run build` passed after routing `KidProfilePage` job, reward, and savings writes through RTK Query mutations. Build still reports the known large chunk warning.

## Data Impact Notes

- Reusability passes so far have not changed Firestore paths, document shapes, auth persistence, or fixture data.
- No test data reset, migration, or relinking is required for the shared hook/component changes.
- The RTK Query foundation changes client-side caching only. No Firestore paths, document shapes, auth persistence, fixture data, reset, migration, or relinking are required.
