# Visual Unification Pass 2

## Goal
Preserve the improved Club Store visual language, but stop repeating the pitch-mow texture inside normal page boxes.

## Changes
- Kept the full pitch-mow layered look for popup surfaces where the background is dimmed, especially the Club Store and main menu overlay.
- Updated the hamburger menu overlay to behave and look more like the Club Store:
  - darkened full-screen backdrop
  - same rounded pitch-mow popup shell
  - same header rhythm with logo, title and close button
  - menu actions moved into stacked translucent rows inside a subtle inner container
- Introduced shared `mcSoftPanelStyle` in `src/styles/theme.js`.
- Updated shared non-popup panels to use low-transparency dark green glass styling rather than their own pitch-mow texture.
- Updated home/selection menu shells to use the quieter low-transparency card style.

## Intentionally untouched
- Match gameplay
- Share/export logic
- Stripe/backend logic
- Text content
- Core screen structure
