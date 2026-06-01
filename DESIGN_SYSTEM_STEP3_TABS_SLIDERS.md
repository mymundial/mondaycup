# Design System Step 3C — Tabs / Slider Bars

Scope: tabs and slider bars only.

## Changed

- `PageTabs` is now the shared source for app tab/slider styling.
- Added `PageTabsSlot` and `PAGE_TABS_SLOT_CLASS` so tab vertical placement is standardised instead of hard-coded per screen.
- Schedule, standings, trophies and leaderboard now use the same tab slot spacing.
- The leaderboard clean/all icon slider now uses `PageTabs` with the `icon` size variant instead of a one-off local slider button.
- `SegmentedTabs` remains a compatibility wrapper around `PageTabs` for auth-style panels.

## Protected

Not touched:

- penalty mechanic
- tournament progression logic
- share export
- knockout bracket geometry
- match controls

## Notes

This pass intentionally does not migrate every possible toggle inside the app. It only standardises the page-level sliders that affect visual rhythm between pages.
