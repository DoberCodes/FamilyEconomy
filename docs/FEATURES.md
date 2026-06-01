# Features

## Implemented

### Core Family Economy Flows

- Mobile-first child sessions with preconfigured dashboard, goals, rewards, jobs, and statements.
- Parent-owned authentication with child profile selection/mock login inside the household.
- Parent control center with family settings, reward approvals, job review, and onboarding.
- Firestore-backed family data store with parent user profiles, child profiles, and household relationships.
- Fictional educational credits only; no real-money balances, transfers, banking, or payment processing.

### Jobs And Tasks

- Parent-created jobs and job pool support.
- Kid claim flow for open jobs, including in-progress and done states.
- Job check requests and parent review paths.
- Pool job limit tracking for each child.

### Savings And Rewards

- Kid savings goal creation and progress tracking.
- Parent approval flows for savings goals where required.
- Reward request workflow that distinguishes proposal vs purchase requests.
- Parent review of rewards with approve, counter, deny, and `Add to Family Pool` options.
- Support for resolving reward proposals into shared family pool rewards.
- Child-facing reward claim and save-for-this actions with credit gating.

### UX Polish

- Child-friendly hero and Credit Wallet display that frames balances as fictional educational credits.
- Reward history and statement views.
- Dismissable reward notification support for auto-approved purchases.
- Credit-safe guardrails for claiming and saving actions.
- Learning-oriented language that keeps credits distinct from real money.

## Planned

### Experience Improvements

- Complete parent reward pool resolution UI and polish the parent review experience.
- Improve child reward discovery by prioritizing actionable requests and making pool/goal statuses clearer.
- Add celebratory feedback across savings and reward milestones while avoiding pressure-based streak loops.
- Extend reward and savings copy to be more engaging and educational throughout.

### Family Policy And Controls

- Clarify and harden parent-authenticated child session boundaries across service calls and Firestore writes.
- Add family-level approval defaults for jobs, rewards, and savings that are easier to configure.
- Add per-item approval overrides with clearer parent decision flows.
- Improve notification handling for rejected, countered, and redirected reward requests.
- Add optional family tax, family fund, and community project flows that teach shared responsibility without punishment framing.

### Product Expansion

- Add richer reward catalog and filtering for saver-friendly items.
- Add analytics and progress summaries for family performance.
- Support more flexible fictional credit economics, including recurring pool rewards and educational time-based limits.
- Add budgeting helpers that keep fictional credits separate from real-world accounts.
- Expand onboarding and parent/child session handoff flows.
