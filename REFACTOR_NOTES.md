# Refactor Notes — Stability Pass

This pass keeps behaviour and visual layout the same, but splits the largest edit-prone files into smaller ownership areas so future fixes are less likely to overwrite each other.

## Share/export screen

- `src/components/share/ShareScreen.jsx` now owns share-screen state, editor panels, and export actions only.
- `src/components/share/SharePreviews.jsx` owns the visual preview/export surfaces: match, bracket, poster, and shirt.
- `src/components/share/ShareEditorControls.jsx` owns reusable editor controls.
- `src/components/share/shareConstants.js` owns share options, colours, default composition values, and pitch background constants.
- `src/components/share/shareUtils.jsx` owns score/marker/font/colour helpers.

For future match-share visual fixes, edit `SharePreviews.jsx` first, not `ShareScreen.jsx`.

## Match game

- `src/components/match/FootballGame.jsx` now focuses on the penalty mechanic/state machine.
- `src/components/match/FootballGameView.jsx` owns pitch, goal, crowd, controls, meters, temporary test buttons, and `MatchPitchPreview`.

For future visual pitch/crowd/goal/control positioning fixes, edit `FootballGameView.jsx` first.

## Profile screens

- `src/components/profile/ProfileScreens.jsx` is now a small barrel export.
- `src/components/profile/ClubhouseScreen.jsx` owns Clubhouse/profile/shop-card UI.
- `src/components/profile/TrophyCabinetScreen.jsx` owns badges, achievements, and flag wall.
- `src/components/profile/LeaderboardScreen.jsx` owns leaderboard rows, filters, and scoring explanation.

## App constants/helpers

- `src/app/appCore.js` owns app-level storage keys, achievement keys, cosmetic defaults, and small pure helpers.
- `src/App.jsx` still owns the main app state and tournament flow. This should be the next file to split if a larger architecture pass is needed.
