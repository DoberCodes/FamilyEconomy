# Domain Model

This document defines the major concepts and entities used throughout Family Economy.

Product purpose, educational philosophy, and platform guardrails are defined in `VISION.md`.

If there is a conflict between this document and `VISION.md`, `VISION.md` is authoritative.

---

# Domain Structure

Family Economy is organized around several primary domains:

```text
Family
├─ Children
├─ Jobs
├─ Rewards
├─ Goals
├─ Recognition
├─ Community
└─ Economy
```

Each domain represents a distinct educational concept and area of functionality.

---

# Household Domain

The Household Domain defines the family structure and ownership boundaries.

## Family

A Family represents the primary household.

A family contains:

* Parent account(s)
* Child profiles
* Family settings
* Community fund settings
* Recognition settings
* Economy configuration

Parents own and manage the household.

---

## Parent

Parents are the governing authority of the household economy.

Parents can:

* Create jobs
* Create rewards
* Approve requests
* Configure economy rules
* Manage community funds
* Manage recognition settings
* Configure advanced economy features

Parents authenticate through Firebase Authentication.

---

## Child

Children participate within the family economy.

Child profiles contain:

* Identity information
* Wallet balance
* XP and level progress
* Achievements
* Savings goals
* Activity history
* Recognition participation

Children currently participate through parent-controlled child sessions.

---

# Work Domain

The Work Domain teaches responsibility and contribution.

---

## Job

A Job represents a task that can be completed for educational credits, XP, recognition progress, or other rewards.

Jobs may be:

* Child-specific
* Family pool jobs
* Recurring
* One-time
* Helper jobs
* Community jobs

Jobs support:

* Credit rewards
* XP rewards
* Approval workflows
* Completion tracking

---

## Job Claim

Represents a child accepting responsibility for a job.

Possible states:

* Open
* Claimed
* In Progress
* Submitted
* Approved
* Denied

---

## Job Completion

Represents a completed job and serves as a historical record.

Completion history may contribute toward:

* Recognition categories
* Achievements
* XP progression
* Community contribution metrics

---

# Reward Domain

The Reward Domain teaches spending decisions and tradeoffs.

---

## Reward

A Reward represents something a child can redeem using fictional educational credits.

Examples:

* Extra screen time
* Dessert
* Family outing
* Toy
* Activity

Rewards may be:

* Child-specific
* Family pool rewards
* Parent-created
* Child-proposed

---

## Reward Request

Represents a child request for:

* Reward creation
* Reward purchase
* Reward modification

Requests may be:

* Pending
* Approved
* Countered
* Denied
* Redirected to Family Pool

---

## Family Reward Pool

A shared catalog of rewards available to the household.

Family pool rewards may include:

* Shared experiences
* Family activities
* Community rewards

---

# Goal Domain

The Goal Domain teaches delayed gratification and long-term planning.

---

## Savings Goal

A Savings Goal represents a target a child wants to achieve.

Goals contain:

* Name
* Description
* Target amount
* Current progress
* Completion state

Goals encourage intentional saving and planning.

---

## Family Goal

A Family Goal represents a shared household objective.

Examples:

* Family movie night
* Vacation fund
* New board game
* Community project

Family goals allow multiple children to contribute toward a common outcome.

---

## Goal Contribution

Represents credits allocated toward a goal.

Contributions may be:

* Individual
* Shared
* Community-supported

---

# Recognition Domain

The Recognition Domain celebrates participation, effort, and growth.

Recognition exists to encourage positive behaviors rather than create financial competition.

---

## XP

XP represents experience and participation.

XP may be earned through:

* Job completion
* Goal progress
* Community participation
* Achievements
* Positive contributions

XP is separate from credits.

---

## Level

A Level represents long-term progression.

Levels help visualize growth and participation over time.

Levels do not represent financial status.

---

## Achievement

Achievements recognize meaningful milestones.

Examples:

* First Goal Completed
* Family Helper
* Consistent Contributor
* Goal Champion

Achievements are permanent accomplishments.

---

## Badge

Badges provide recognition for specific behaviors or accomplishments.

Parents may define custom badges.

Badges are intended to reinforce positive family values and habits.

---

## Recognition Category

Recognition Categories support weekly family recognition.

Examples:

* Hardest Worker
* Most Helpful
* Goal Setter
* Most Generous
* Consistency Champion
* Rising Star
* Top Saver (future)

Recognition categories highlight participation and contribution.

---

## Recognition Winner

Represents the current holder of a recognition category.

Recognition winners reset based on family-defined recognition periods.

---

# Community Domain

The Community Domain teaches collaboration and shared responsibility.

---

## Community Fund

A shared family resource funded through:

* Contributions
* Community allocations
* Family economy settings

Community funds support shared family goals and experiences.

Community funds should never be framed as punishment.

---

## Contribution

Represents credits allocated toward a shared family purpose.

Contributions teach:

* Shared responsibility
* Community participation
* Collective benefit

---

## Family Project

A collaborative family objective.

Examples:

* Garden project
* Camping trip
* Family outing
* Shared reward

Projects allow families to work together toward common goals.

---

## Family News

Family News communicates updates and announcements.

Examples:

* Family events
* Goal updates
* Community project progress
* Recognition highlights

Family News serves as a central communication surface within the Family Dashboard.

---

# Economy Domain

The Economy Domain manages fictional educational credits and related systems.

---

## Wallet

A Wallet contains a child's available fictional educational credits.

Wallet balances are used for:

* Rewards
* Goal contributions
* Community contributions

Wallet balances do not represent real money.

---

## Credit

Credits are fictional educational units used throughout Family Economy.

Credits exist to teach:

* Earning
* Saving
* Spending
* Budgeting
* Decision-making

Credits are not currency and have no real-world value.

---

## Transaction

A Transaction records credit movement within the household economy.

Examples:

* Job rewards
* Goal contributions
* Reward purchases
* Community contributions

Transactions support educational visibility and family discussions.

---

# Dashboard Domain

The Dashboard Domain provides family-wide visibility into activity and progress.

---

## Family Dashboard

The Family Dashboard acts as the family hub.

Primary sections include:

* Family News
* Family Goal
* Weekly Recognition
* Family Job Tracker
* Recent Achievements
* Activity Feed

The dashboard should focus on family participation and progress rather than analytics.

---

## Activity Feed

A timeline of household activity.

Examples:

* Job completions
* Reward redemptions
* Goal contributions
* Community participation

---

## Recent Achievements

A curated view of recent milestones and accomplishments.

Recent achievements remain visible longer than standard activity feed items.

---

# Future Domain Concepts

These concepts are planned but may not yet be implemented.

---

## Savings Account

Separate from the Wallet.

Supports:

* General saving
* Emergency funds
* Advanced economy education

---

## Expenses

Optional recurring fictional expenses.

Examples:

* Housing Contribution
* Food Contribution
* Utilities Contribution
* Transportation Contribution

Used to teach budgeting and cash flow.

---

## Family Bank

Advanced family economy system supporting:

* Loans
* Repayment
* Credit concepts
* Financial planning

---

## Credit Score Simulation

Educational simulation designed to teach credit-related concepts.

No real-world credit reporting or financial activity exists.

---

## Investing Simulation

Educational investing concepts using fictional credits only.

No real-world investing or securities activity occurs.

---

## Family Business

Advanced entrepreneurship system.

May include:

* Equipment ownership
* Equipment rental
* Business expenses
* Business income
* Financial planning

All business concepts remain educational simulations.
