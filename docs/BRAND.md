# Brand System

Family Economy should feel warm, trustworthy, family-centered, and lightly playful without drifting into banking, corporate finance, or high-pressure game aesthetics.

## Core Palette

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Primary | Teal | `#0F766E` | Brand identity, app chrome, hero cards, active navigation, primary structural accents. |
| Accent | Gold | `#F59E0B` | Rewards, progress, achievements, celebratory accents, and credit-related warmth. |
| Positive | Success | `#22C55E` | Completed jobs, approvals, earned states, and healthy progress confirmation. |
| Surface | Light | `#F8FAFC` | App background, quiet panels, bottom chrome, and neutral surfaces. |
| Text | Slate | `#334155` | Primary body text, data labels, and calm parent-facing information. |

## Supporting Tokens

The app implements the palette in `src/index.css` as CSS custom properties:

- `--brand-teal`, `--brand-teal-dark`, `--brand-teal-deep`, `--brand-teal-soft`
- `--brand-gold`, `--brand-gold-dark`, `--brand-gold-soft`
- `--brand-success`, `--brand-success-dark`, `--brand-success-soft`
- `--brand-light`, `--brand-slate`, `--brand-slate-muted`, `--brand-line`
- Existing semantic aliases `--brand`, `--brand-2`, `--green`, `--green-soft`, `--gold`, and `--gold-soft`

Use semantic tokens before raw hex values when adding UI. New surfaces should generally use light backgrounds, slate text, teal structure, gold reward/progress accents, and success green only for positive state feedback. Keep gold as a small accent; avoid broad yellow washes on heroes, cards, and page backgrounds because they can make teal surfaces look muddy.

## Typography

The reference direction uses:

- Headings: Poppins, bold weights.
- Body: Inter, regular to semibold weights.

The app imports these fonts in `src/index.css`. Keep headings compact and clear; reserve larger playful type for kid-facing heroes and dashboard summaries.

## Product Fit

Color should reinforce the educational mission:

- Teal communicates trust, teamwork, and family stability.
- Gold makes fictional credits, rewards, and achievements feel warm without implying real-money value.
- Success green confirms healthy progress and completed responsibilities.
- Light surfaces keep the product approachable for kids and readable for parents.
- Slate avoids harsh black and keeps dense parent controls calm.

Avoid heavy purple/blue gradients, corporate finance blues, banking-style dark navy, and overly game-like neon palettes unless they are intentionally limited to a small state or illustration.
