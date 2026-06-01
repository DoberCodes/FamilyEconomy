# Family Economy Agent Instructions

## Documentation Location

Project documentation is located in the `/docs` directory. The root `README.md` is the repo index and setup entry point.

Before making recommendations, architectural decisions, or code changes, review relevant documentation from:

- docs/AI_CONTEXT.md
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
