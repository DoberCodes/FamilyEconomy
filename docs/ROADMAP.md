# Roadmap

## Current Priorities

0. **Keep the educational direction explicit**
   - Treat Family Economy as a financial literacy product first.
   - Keep all credits, balances, rewards, and statements clearly fictional.
   - Avoid banking, payment, gambling, loot-box, or engagement-loop patterns.

1. **Align child sessions with parent-owned auth**
   - Treat Firebase Auth as the parent household boundary.
   - Make child profile selection/session codes feel like kid login without implying independent child accounts.
   - Keep service and rules behavior explicit about which writes are parent-mediated and which future flows require true kid auth.

2. **Finish parent reward pool resolution workflow**
   - Complete the parent UI for converting reward proposals into family pool rewards.
   - Make the pool creation flow obvious, editable, and fast to use.
   - Preserve linked request semantics so redirected pool items do not appear as personal reward actions.

3. **Polish child reward and savings experience**
   - Prioritize actionable approved proposals at the top of reward history.
   - Ensure saved-for-this requests hide actions while the linked savings goal remains active.
   - Continue copy hygiene for Credit Wallet, fictional credits, and reward statuses.
   - Strengthen goal-based saving and delayed gratification cues.

4. **Make savings and job cards more educational and approachable**
   - Continue the guided savings experience.
   - Apply friendly language and visual energy to jobs, rewards, and family pool cards.
   - Reduce crowding and improve spacing for card header rows.

## Planned Features

- Better parent configuration for approval defaults across jobs, rewards, and savings.
- More flexible family pool rules with per-child and family claim limits.
- Expanded reward catalog and filtering to support easier reward discovery.
- Improved notifications and history for reward request lifecycle events.
- Analytics and progress summaries for family activity.
- Optional family tax, family fund, and community project workflows with explicit educational framing.
- Budgeting helpers that keep fictional credits separate from real-world accounts.

## Longer-Term Direction

- Support multiple children and shared pool dynamics more explicitly.
- Add lightweight achievements and habit-building mechanics tied to chores, savings, and rewards without excessive streak pressure.
- Consider offline resilience for Firebase state and local child sessions.
- Refine onboarding for families setting up their first jobs, goals, and reward pools.
- Add teen concepts such as budgeting categories, emergency savings, investing simulation, and entrepreneurship only as educational simulations with no real-money handling.
