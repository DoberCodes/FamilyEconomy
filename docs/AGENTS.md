# Family Economy Agent Instructions

## Documentation Location

Project documentation is located in the `/docs` directory. The root `README.md` is the repo index and setup entry point.

Before making recommendations, architectural decisions, or code changes, review relevant documentation from:

- docs/AI_CONTEXT.md
- docs/DOCUMENTATION_WORKFLOW.md
- docs/BRAND.md
- docs/VISION.md
- docs/FEATURES.md
- docs/DOMAIN_MODEL.md
- docs/ECONOMY_RULES.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md

If new documentation is created, place it in the `/docs` directory unless there is a strong reason not to.

## Documentation Authority

1. AI_CONTEXT.md defines product philosophy and constraints.
2. DOMAIN_MODEL.md defines terminology and entities.
3. FEATURES.md defines implemented and planned functionality.
4. ARCHITECTURE.md defines technical structure.
5. ROADMAP.md defines future priorities.

If implementation differs from documentation:

- Identify the discrepancy.
- Explain the impact.
- Recommend which source should be updated.

## Documentation Maintenance

When significant features, architecture, or domain concepts change:

- Update the appropriate documentation files.
- Do not allow documentation to drift from implementation.
- Call out outdated documentation when discovered.
- Use `docs/DOCUMENTATION_WORKFLOW.md` as the closeout checklist for roadmap, feature, domain, architecture, brand, security, and major UX documentation changes.

If a change affects:

- Product philosophy
- Educational outcomes
- Domain structure
- Architecture boundaries
- Roadmap direction
- UI hierarchy, navigation, or interaction model
- Infrastructure, deployment, integrations, or environment assumptions
- Security, permissions, parent authority, or child autonomy
- Existing feature purpose, removal, replacement, or deprecation

Update documentation before implementation is considered complete.

Before considering documentation work complete, explicitly check whether `docs/DECISION_LOG.md` needs an entry. Roadmap priority/status changes, domain model changes, architecture boundary changes, and major UX direction changes usually require one.

## Decision Log

When a product, architecture, domain, roadmap, or UX decision changes the direction of the app, update `docs/DECISION_LOG.md`.

Use the decision log for decisions that explain **why** something changed, not just what changed.

Good decision log candidates:

* Product direction changes
* Dashboard structure changes
* Domain model changes
* Roadmap priority changes
* Architecture boundary changes
* Infrastructure, deployment, integration, or environment assumption changes
* Major UX philosophy decisions
* UI hierarchy, navigation, layout, or interaction model changes
* Security, permission, parent authority, or child autonomy changes
* Feature removals, replacements, deprecations, or purpose changes
* Naming changes with long-term impact
* Feature scope decisions

Do not use the decision log for routine bug fixes, unintended behavior corrections, small styling changes, minor copy edits, or implementation details that do not affect product direction.

Bug fixes usually do not need decision-log entries when they restore the original intended behavior. If fixing the bug changes the intended behavior, record that new direction as a decision.

When unsure whether a change belongs in the decision log, prefer a concise entry if the change affects the original purpose of a feature, document, workflow, or system.

Each entry should include:

* Date
* Decision
* Context
* Reasoning
* Impact
* Related documents updated

## Refactoring And Scalability

When implementing refactors or architecture changes, prefer the cleanest scalable design over preserving an awkward structure for compatibility.

Family Economy currently has no production users, only test users and development data. It is acceptable to rewrite, restructure, rename, relink, or reset backend data shapes when that produces a clearer long-term architecture.

When a change affects stored data, Firestore paths, document shapes, auth/session assumptions, or test fixtures:

- Explain what changed.
- Explain whether existing test data should be reset, migrated, or relinked.
- Update docs and tests that describe the affected structure.
- Keep product boundaries clear: fictional credits, parent authority, and parent-owned child sessions remain non-negotiable.
