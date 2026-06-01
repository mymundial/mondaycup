# Design System Step 3D — Green Panels

Scope: green panel standardisation only.

## What changed

- Centralised the shared green panel surface in `src/components/ui/AppPanel.jsx`.
- Added exported panel variant styles so legacy wrappers can reuse the same green-panel values without duplicating hard-coded colours.
- Migrated safe panel wrappers to `AppPanel variant="table"`:
  - Schedule fixture sections
  - Group standings tables
  - Clubhouse panels, via the shared panel style helper
  - Trophy sections
  - Trophy progress meter
  - Leaderboard sections

## Protected areas

The following areas were intentionally not changed:

- Penalty mechanic
- Tournament progression logic
- Share export logic
- Knockout bracket geometry
- Match controls
- Internal bracket spacing / fixture positioning

## Notes

- The knockout bracket outer panel still uses its existing class composition to avoid accidental bracket geometry or spacing regressions.
- `AppPanel` now provides shared `compact`, `table`, and `bracket` variants for future migrations, but this pass only migrated low-risk repeated panel shells.
