# Monday Cup Design System — Step 2 Safe Patch

This patch adds shared layout/UI primitives without changing penalty mechanics, tournament logic, share export, or bracket geometry.

## New / standardised primitives

- `AppTopBar` — shared top bar shell used by `ScreenTopBar` and `ScreenTitle` wrappers.
- `PageScroll` — footer-aware scroll container.
- `AppFooter` — one footer component used for fixed non-match footer and embedded selection footer.
- `AppPanel` — expanded with standard variants: `standard`, `compact`, `table`, `bracket`, `modal`, `ivory`.
- `PageTabs` — shared 2/3-option slider/tab styling.
- `UserTeamHighlight` helpers — shared LED-yellow user-team text/card/flag classes.
- `TeamFlag` — shared flag wrapper with user-team ring rules.
- `TeamName` — shared team-name display rules and long-name context handling.

## Migrated safely in this pass

- Top bars now share the same `AppTopBar` shell through existing wrappers.
- Non-match and selection footers now use `AppFooter`.
- Schedule / standings / profile scroll areas use `PageScroll`.
- Schedule, trophies and leaderboard view toggles use `PageTabs`.
- Group standings and schedule flags/team names use shared `TeamFlag` / `TeamName` helpers.

## Protected areas

The following were intentionally left alone or only touched through wrappers:

- penalty mechanic
- tournament progression logic
- share export logic
- knockout bracket geometry and fixture positioning
- match screen shot controls

## Future migration order

1. Move remaining one-off green panels to `AppPanel` variants.
2. Replace remaining local user-highlight classes with `UserTeamHighlight` helpers.
3. Move remaining long-name display cases to `TeamName` contexts.
4. Remove deprecated duplicate top-bar file once all imports point to the official wrapper.
