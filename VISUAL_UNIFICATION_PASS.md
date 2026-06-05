# Visual Unification Pass

This pass uses the Club Store modal as the master UI reference without changing the app structure, screen positions, text, or match/gameplay logic.

## Preserved

- Existing screen structure and navigation
- Existing text content
- Existing component positions
- Live match/gameplay screen behaviour
- Stripe checkout/error handling
- Share/export logic

## Updated

- Shared `AppPanel` variants now use the layered pitch-mow surface from the shop.
- Menu/profile/trophy/leaderboard/schedule/standings panels now share translucent dark-green layers.
- Fixture, table, leaderboard, achievement, flag-wall, stat, and campaign summary rows now use shop-style transparent cards instead of solid ivory cards.
- Active/user-selected states use yellow borders/glow on dark transparent panels, matching the shop selected row style.
- Tabs were softened to the shop-style dark translucent base.
- Home menu shell and saved campaign card were aligned to the shop layer/depth style.

## Main files touched

- `src/styles/theme.js`
- `src/components/ui/AppPanel.jsx`
- `src/components/layout/MenuPanel.jsx`
- `src/components/ui/PageTabs.jsx`
- `src/components/ui/UserTeamHighlight.jsx`
- `src/components/ui/IvoryCard.jsx`
- `src/components/ui/FixtureCard.jsx`
- `src/components/selection/SelectionScreens.jsx`
- `src/components/schedule/ScheduleScreens.jsx`
- `src/components/standings/StandingsScreens.jsx`
- `src/components/profile/ClubhouseScreen.jsx`
- `src/components/profile/LeaderboardScreen.jsx`
- `src/components/profile/TrophyCabinetScreen.jsx`

## Build check

`npm run build` passes. The existing Vite large bundle warning remains unchanged in meaning.
