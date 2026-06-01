# Architecture

## Technical Stack
- **Framework:** React 19
- **Bundler:** Vite
- **Routing:** React Router DOM 7
- **Client data cache:** Redux Toolkit + RTK Query
- **Backend:** Firebase (Firestore + Auth)
- **Testing:** Node test runner for service logic, Firebase rules emulator for security tests
- **Linting:** ESLint with React hooks and JSX support

## App Structure
- `src/main.jsx` bootstraps the React app and router.
- `src/App.jsx` contains the top-level app shell.
- `src/pages/mobile/` contains the main mobile experience screens:
  - `KidProfilePage.jsx` for child-facing dashboard and rewards workflows
  - `ProfilePage.jsx` for parent control center and approval management
  - `AuthPage.jsx` for registration/sign-in
- `src/components/mobile/` contains UI cards and controls used across the mobile views.
- `src/services/familyEconomyService.js` encapsulates business logic, Firestore reads/writes, normalization, and approval workflows.
- `src/services/policyUtils.js` contains claim countdown and policy helper logic.
- `src/domain/familyEconomyTypes.js` contains shared domain constants, status labels, and lightweight typedefs.
- `src/utils/dateUtils.js` contains reusable Firestore/date parsing and time-window helpers.
- `src/utils/serializeUtils.js` contains shared serialization helpers for Firestore timestamps and auth/profile payloads so Redux and logging stay serializable.
- `src/hooks/` contains reusable UI/data coordination hooks such as async action state, effective family actor context, and family resource/data loaders.
- `src/store/` contains the Redux store and RTK Query API layer for shared family data caching.
- `src/services/dashboardSelectors.js` contains derived dashboard and savings-goal view calculations.
- `src/context/AuthContext.jsx` manages parent authentication state, parent unlock state, and the active child profile/session context.

## Data Model
- Families are stored under `families/{familyId}`.
- Family subcollections include `jobs`, `goals`, `rewardRequests`, and other domain entities.
- Parent users are linked by `familyId` and role (`parent`).
- Child profiles live under the family and are selected through parent-controlled child sessions.
- The rules and service layer may still retain `kid` role support for future true child auth, but the current product direction treats kid access as a mock/local session under the parent account.
- Reward request objects support request kinds like `proposal` and `purchase`, with status transitions and optional pool linkage.
- Savings goals are normalized to explicit statuses such as `active`, `pending_parent_approval`, `ready_to_claim`, and `completed`.
- Credits are fictional educational units. The data model must not imply real-world custody, payment processing, banking, or stored monetary value.

## Key Architectural Decisions
- **Mobile-first UX:** The experience is designed for small screens and kids, with simple cards, quick actions, and easy navigation.
- **Parent-owned child sessions:** Parent and kid experiences are separated in the UI, but Firebase Auth remains parent-owned by default. Child identity is represented by the selected child profile/session context.
- **Service layer isolation:** Business rules are centralized in `familyEconomyService.js`, keeping React components focused on rendering and event handling.
- **Firestore as source of truth:** All persistent state is stored in Firestore to support live family data and per-family configuration.
- **RTK Query for shared server state:** Family-scoped Firestore reads should move behind RTK Query endpoints over time. Keep local UI state, form drafts, dialog state, and PIN visibility in component state unless multiple routes need them.
- **Approval and pool flows:** The app models both individual reward approvals and shared family pool resolution to support mixed saving/claiming behavior.
- **Educational economy first:** Business rules should reinforce earning, saving, budgeting, goal setting, delayed gratification, community responsibility, and parent-guided decision making.
- **Gamification restraint:** Recognition, streaks, XP, dynamic pricing, and scarcity concepts should remain educational and should not become manipulative engagement loops.
- **Scalable refactors over legacy compatibility:** The project currently has test users and development data, not production users. Refactors may rewrite, restructure, rename, or relink stored data when that produces a clearer architecture, as long as the data impact and any reset/migration/relink steps are documented.

## Deployment
- The app builds with Vite and supports GitHub Pages via `build:github-pages`.
- Environment variables are used for Firebase configuration.
- `firebase-tools` is used for Firestore rules testing and local emulation.
