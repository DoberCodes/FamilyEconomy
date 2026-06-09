# Documentation Workflow

Use this workflow whenever a product, roadmap, domain, architecture, brand, or UX direction change is made.

The goal is to keep the active docs synchronized and prevent roadmap or decision-log drift.

---

# Change Classification

Before editing docs or code, classify the change:

* Product philosophy or educational direction
* Domain model or terminology
* Implemented or planned feature behavior
* Technical architecture or data shape
* Roadmap priority or delivery status
* Brand, visual identity, or UX direction
* UI structure, hierarchy, navigation, or interaction model
* Security, permission, or parent/child authority boundary
* Infrastructure, deployment, hosting, environment, or integration behavior
* Removal, replacement, or deprecation of an existing feature, workflow, or document

Use the classification to decide which docs need to be updated.

---

# Source-Of-Truth Map

Update the relevant source documents:

* Product philosophy: `VISION.md`
* Educational rules and guardrails: `ECONOMY_RULES.md`, `EDUCATIONAL_PROGRESSION.md`
* Domain terms and entities: `DOMAIN_MODEL.md`
* Implemented and planned features: `FEATURES.md`
* Technical structure and data boundaries: `ARCHITECTURE.md`
* Roadmap status and priorities: `ROADMAP.md`
* Brand system and visual direction: `BRAND.md`
* Contributor and AI operating context: `AGENTS.md`, `AI_CONTEXT.md`
* Security rules and permission model: `security-rules.md`

---

# Decision Log Gate

After any roadmap, product, architecture, domain, naming, or major UX change, ask:

> Would a future contributor need to know why this changed?

If yes, update `DECISION_LOG.md` in the same change.

Also update `DECISION_LOG.md` when a change:

* Changes the original purpose of a feature, workflow, or document
* Removes, replaces, or deprecates an existing capability
* Changes UI hierarchy, navigation, layout philosophy, or interaction model
* Changes infrastructure, deployment, data ownership, integrations, or environment assumptions
* Changes security, permissions, parent authority, child autonomy, or access boundaries
* Changes terminology, naming, status, or prioritization in a way that future work should preserve

Decision-log entries should capture:

* Context
* Decision
* Reasoning
* Impact
* Related documents

Do not use the decision log for routine bug fixes, minor styling tweaks, typo fixes, or implementation details that do not change product direction.

Bug fixes and unintended behavior corrections usually do not need a decision-log entry when they restore the original intended behavior.

If a bug fix reveals that the original intended behavior should change, then record that new direction as a decision.

When unsure, prefer a short decision-log entry. It is better to preserve a concise reason than to leave future contributors guessing.

---

# Documentation Closeout Checklist

Before considering documentation work complete:

* Confirm the primary source-of-truth doc was updated.
* Check whether `DECISION_LOG.md` needs an entry.
* Check whether `FEATURES.md` and `ROADMAP.md` now disagree.
* Check whether `DOMAIN_MODEL.md` needs terminology or entity updates.
* Check whether `AI_CONTEXT.md` or `AGENTS.md` should mention the new operating rule.
* Check whether `README.md` links still point to active docs.
* Check whether any removed, replaced, or repurposed behavior needs a decision-log entry.
* In the final response, mention which docs changed and whether tests were skipped because the change was docs-only.

---

# Advanced Setting Copy

Advanced parent settings should explain the setting without making the family economy feel like a complicated banking system.

For each advanced setting, the surrounding label, help text, or modal copy should answer:

1. What is it?
2. What happens?
3. Why might a family use it?

Prefer short, parent-friendly copy that connects the setting back to educational goals, shared family goals, or parent-controlled household expectations.

---

# Roadmap-Specific Flow

When updating `ROADMAP.md`:

1. Preserve existing ideas unless intentionally removing them.
2. Move items between `Shipped`, `In Progress / Needs Polish`, and `Future` based on implementation reality.
3. If a status changes materially, update `DECISION_LOG.md`.
4. If shipped or planned feature descriptions change, check `FEATURES.md`.
5. If terminology or entities change, check `DOMAIN_MODEL.md`.
