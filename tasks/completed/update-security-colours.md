# Update Security Spoke Colours -- Task

## Context

The Security Operations spoke (`SITE_CONFIGS['Security']`) currently uses a harsh red colour scheme. Updating to a dark teal palette for a more professional, sophisticated look.

Single patch. Run `npm run build` after to confirm.

---

## Patch 1: Update Security Colour Scheme

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In the `SITE_CONFIGS['Security']` entry, make the following replacements:

**Hero background:**
- `'#C41E3A'` → `'#0F4C5C'`

**Card backgroundColour values (in order):**

| Card | Old | New |
|------|-----|-----|
| Vulnerability Management | `'#8B0000'` | `'#0A3A47'` |
| Cloud Security Posture | `'#A0153E'` | `'#0F4C5C'` |
| Data Security & DLP | `'#B22222'` | `'#0D3D4A'` |
| Privileged Access (PAM) | `'#9B1B30'` | `'#0A3440'` |
| SIEM & Threat Detection | `'#800020'` | `'#083038'` |
| Security Awareness | `'#C41E3A'` | `'#0F4C5C'` |

Only change `backgroundColour` values within the `Security` config block. Do not touch any other site type configs. Do not change `colour` values (they should remain `'#ffffff'`).

### Verification
- `npm run build` passes
- All 7 colour values updated (1 hero + 6 cards)
- No other site type configs modified

---

## General Rules

1. Only modify the `Security` entry in `SITE_CONFIGS`.
2. Do not change any component files, SCSS, or other configs.
3. Test `npm run build` after the patch.