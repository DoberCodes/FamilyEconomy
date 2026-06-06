# Architecture

This document defines the technical architecture, application structure, and architectural boundaries of Family Economy.

Product purpose, educational philosophy, and platform guardrails are defined in `VISION.md`.

Domain concepts are defined in `DOMAIN_MODEL.md`.

Future priorities are defined in `ROADMAP.md`.

If implementation differs from documentation, the discrepancy should be identified and documented.

---

# Technical Stack

- **Framework:** React 19
- **Bundler:** Vite
- **Routing:** React Router DOM 7
- **Client State:** Redux Toolkit + RTK Query
- **Backend:** Firebase (Firestore + Auth)
- **Testing:** Node test runner and Firebase rules emulator
- **Linting:** ESLint

---

# Architectural Principles

## Educational First

Architecture should support educational outcomes rather than engagement optimization.

Business rules should reinforce:

- Responsibility
- Saving
- Goal Setting
- Delayed Gratification
- Community Contribution
- Recognition
- Financial Literacy

See `VISION.md`.

---

## Parent Authority

Firebase authentication represents the parent household boundary.

Parents own:

- Household settings
- Child profiles
- Economy configuration
- Community configuration
- Recognition configuration

Children participate through parent-controlled child sessions.

---

## Service Layer Ownership

Business rules belong in services and domain logic.

React components should focus on:

- Presentation
- User interaction
- Navigation
- Form state

Business logic should not be duplicated across components.

---

## Firestore As Source Of Truth

Persistent state lives in Firestore.

Client state should be treated as a cached representation of Firestore state.

---

## Scalability Over Compatibility

The project currently has development and test users only.

When architecture improvements require restructuring:

- Firestore documents
- Collection paths
- Service boundaries
- Domain structures

Prefer the cleaner long-term architecture.

Document any required data resets, migrations, or relinking.

---

# Product Domains

Family Economy is organized into several primary application domains.

```text
Family
├─ Household
├─ Jobs
├─ Rewards
├─ Goals
├─ Recognition
├─ Community
├─ Dashboard
└─ Economy
```

These domains should guide future architecture, service extraction, and data ownership decisions.

---

# Application Structure

## Core Application

```text
src/
├─ pages/
├─ components/
├─ hooks/
├─ services/
├─ store/
├─ domain/
├─ utils/
└─ context/
```

---

## Pages

Pages should primarily coordinate:

- Data loading
- Route-level decisions
- High-level layout

Large pages should gradually be decomposed into reusable feature modules.

Current hotspots:

- `ProfilePage.jsx`
- `KidProfilePage.jsx`

See `reusability-status.md`.

---

## Components

Reusable UI building blocks.

Examples:

- Cards
- Progress displays
- Status indicators
- Dialog primitives
- Dashboard widgets

Components should remain presentation-focused whenever possible.

---

## Hooks

Hooks coordinate:

- Data loading
- Shared interaction patterns
- Session context
- Async actions

Business rules should remain in services.

---

## Services

Services contain business logic.

Current major service:

```text
familyEconomyService.js
```

Long-term direction:

```text
services/
├─ householdService
├─ jobsService
├─ rewardsService
├─ goalsService
├─ recognitionService
├─ communityService
├─ economyService
└─ analyticsService
```

See `ROADMAP.md` and `reusability-status.md`.

---

## Store

Redux Toolkit and RTK Query manage:

- Shared application state
- Shared server state
- Cached Firestore data

See `redux-conversion-status.md`.

---

## Domain

The domain layer defines:

- Shared types
- Constants
- Status values
- Entity definitions

See `DOMAIN_MODEL.md`.

---

## Utilities

Utilities contain:

- Date helpers
- Serialization helpers
- Formatting helpers
- Shared pure functions

Utilities should not contain business rules.

---

# Data Model

## Authentication Boundary

Firebase Auth represents the parent household boundary.

Current model:

```text
Parent Account
    ↓
Family
    ↓
Child Profiles
```

Children do not currently authenticate independently.

Child participation occurs through parent-controlled child sessions.

---

## Family Structure

```text
families/{familyId}
```

Contains:

```text
children
jobs
goals
rewards
rewardRequests
transactions
community
recognition
dashboard
settings
```

Exact collection structure may evolve as domains mature.

---

# Dashboard Architecture

The Family Dashboard functions as the family hub.

See `VISION.md`.

The dashboard should answer:

1. What is happening?
2. What are we working toward?
3. Who is being recognized?
4. What needs attention?
5. What happened recently?

---

## Dashboard Aggregation

Dashboard views should be generated through selector layers rather than page-level calculations.

Examples:

- Recognition summaries
- Goal progress summaries
- Contributor rankings
- Family activity summaries
- Family participation indicators

---

## Activity Feed

Activity feed data should be derived from domain events rather than duplicated records whenever practical.

Potential event sources:

- Job completion
- Reward redemption
- Goal contribution
- Achievement earned
- Community contribution

---

# Recognition Architecture

Recognition is a first-class domain.

See `DOMAIN_MODEL.md`.

Recognition includes:

- XP
- Levels
- Achievements
- Badges
- Weekly Recognition
- Recognition Categories

---

## Recognition Calculations

Recognition calculations should be centralized.

Examples:

- Weekly winners
- Recognition standings
- Achievement qualification
- XP progression

These calculations should not be duplicated across pages.

---

# Community Architecture

Community systems include:

- Community Funds
- Family Contributions
- Family Projects
- Shared Goals
- Family News

Community features should emphasize collaboration and shared participation.

---

# Economy Architecture

Economy systems manage fictional educational credits.

See:

- `VISION.md`
- `ECONOMY_RULES.md`

Credits should never imply:

- Banking
- Stored monetary value
- Real-world payments
- Investment custody

---

# RTK Query Direction

Shared Firestore-backed state should continue migrating toward RTK Query.

Good candidates:

- Dashboard data
- Recognition data
- Community data
- Goal data
- Reward data

Local UI state should remain local.

Examples:

- Dialog visibility
- Active tabs
- Form drafts
- Temporary busy indicators

---

# Future Architecture Direction

## Service Extraction

Long-term goal:

```text
familyEconomyService.js
↓
Domain Services
```

Potential extraction order:

1. Jobs
2. Rewards
3. Goals
4. Recognition
5. Community
6. Analytics

---

## Selector Extraction

Continue moving derived calculations into selector modules.

Examples:

- Dashboard summaries
- Recognition calculations
- Community metrics
- Parent insights

---

## Route-Level Code Splitting

Future opportunities:

- Parent Control Center
- Child Dashboard
- Analytics
- Community Features

To reduce bundle size and improve startup performance.

---

# Deployment

The application is deployed as a Vite application.

Current infrastructure:

- Firebase Authentication
- Firestore
- Firebase Security Rules
- GitHub-based deployment workflow

Environment-specific configuration should remain isolated through environment variables.

---

# Related Documentation

- `VISION.md`
- `DOMAIN_MODEL.md`
- `FEATURES.md`
- `ECONOMY_RULES.md`
- `EDUCATIONAL_PROGRESSION.md`
- `ROADMAP.md`
- `redux-conversion-status.md`
- `reusability-status.md`
- `security-rules.md`