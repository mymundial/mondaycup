# Design System Step 3B — Top Bar / Menu Title

Scope: top bar and menu-title standardisation only.

## Changed

- Standardised all live drawer/page title bars to use `src/components/layout/ScreenTopBar.jsx`.
- Removed project usage of the legacy `ScreenTitle` wrapper from schedule, standings, and trophies.
- Removed the unused legacy `ScreenTitle` and `HeaderMenuButton` exports from `src/components/layout/Menu.jsx`.
- Aligned the shared top bar height token to the existing 54px app calculations used by the match/home scoreboard layouts.
- Moved hamburger menu spacing and max-height offsets onto shared sizing tokens instead of hard-coded `86px` / `106px` values.
- Aligned menu header title typography with the shared title token.

## Protected / not touched

- Penalty mechanic
- Match controls
- Tournament progression logic
- Share export logic
- Knockout bracket geometry
- Bracket team-name sizing rules

## Notes

This pass does not redesign page layouts. It only reduces duplicate top-bar wrappers and keeps the menu title using the same typography source as the page title bars.
