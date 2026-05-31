# Monday Cup Share Screen Archive

This document records the current share/export structure before the Share screen was removed from the live app navigation.

The Share screen code has **not** been deleted. It has only been disconnected from the live menu/routing so the main game can be tested without the export layer or share UI interfering with match, modal, footer, bracket, or menu behaviour.

## Live app status

As of this archive pass:

- `SHARE` is removed from the hamburger menu.
- `App.jsx` no longer imports `ShareScreen`.
- `App.jsx` no longer opens `drawer === "share"`.
- The share/export files remain in the project for later reuse.

## Archived share files

### `src/components/share/ShareScreen.jsx`

Main React screen for the share/export feature.

Current responsibilities:

- Renders the `EXPORT` page.
- Shows selectable export states.
- Renders the visible preview frame.
- Mounts a larger export frame only when saving.
- Provides edit controls for the admin/editor account.
- Provides simplified public shirt export state.
- Calls the export utility when the user presses `SAVE AS PHOTO`.

Important constants inside this file:

- `SHARE_DESIGN_SIZE` — base design size used by the internal frame.
- `SHARE_EXPORT_FRAME_SIZE` — high-resolution export frame size.
- `SHARE_EDITOR_EMAIL` — currently `alexjashworth@gmail.com`.
- `EXPORT_STATES` — list of possible share states.
- `PUBLIC_EXPORT_STATE_IDS` — share states visible to non-editor users.

Known template concepts currently in this file:

- Match result / moment card.
- Bracket card.
- Poster / coming soon card.
- Shirt-style poster.

### `src/utils/shareExport.js`

Export utility used by `ShareScreen.jsx`.

Current responsibilities:

- Converts the share frame into a PNG blob.
- Preloads images inside the export element.
- Waits for document fonts where supported.
- Tries multiple export methods:
  1. `html2canvas`
  2. SVG `foreignObject` clone
  3. `html-to-image`
- Composes the output to `SHARE_EXPORT_SIZE`.
- Adds a team-coloured border to the exported canvas.
- Handles download/share fallbacks:
  - native mobile file share where supported,
  - iPhone/Safari preview window fallback,
  - desktop direct download fallback,
  - final image-preview fallback.

Important constants inside this file:

- `SHARE_CANVAS_NAME`
- `SHARE_EXPORT_SIZE`
- `SHARE_TEAM_BORDER_COLORS`
- `SHARE_TEAM_EXPORT_STYLES`

## Why the Share screen was removed from live navigation

The share feature is strategically important, but it grew into a design/export subsystem inside the app. It was creating risk around:

- hidden export layers interfering with live app screens,
- preview/output drift,
- mobile Safari image-save limitations,
- large editable state inside one component,
- style/layout patches affecting unrelated match and modal screens.

Removing it from live navigation keeps the main tournament game stable while preserving the working image-save code for a cleaner rebuild.

## How to re-enable later

To restore the Share screen later:

1. Re-import the screen in `src/App.jsx`:

```js
import { ShareScreen } from "./components/share/ShareScreen.jsx";
```

2. Restore an open handler in `App.jsx`:

```js
const openShare = () => { closeMenu(); setDrawer("share"); };
```

3. Add it back to `menuProps`:

```js
onShare: openShare
```

4. Restore the drawer route in `App.jsx`:

```jsx
drawer === "share"
  ? <DrawerShell><ShareScreen menuProps={menuProps} team={team} opponent={opponent} score={score} matchResult={matchResult} stageLabel={matchStage} /></DrawerShell>
  : null
```

5. Restore the `SHARE` tile in `src/components/layout/Menu.jsx`.

## Recommended rebuild direction

When rebuilding the feature, split it into smaller files rather than extending the current single large screen:

```text
src/components/share/
  ShareScreen.jsx
  templates/
    MatchResultShare.jsx
    ShirtPosterShare.jsx
    ComingSoonPosterShare.jsx
    BracketShare.jsx
  controls/
    ShirtPosterControls.jsx
    MatchAdminControls.jsx
  export/
    exportDomFrame.js
```

Recommended product order:

1. Public shirt poster.
2. Match result card after completed matches.
3. Coming soon / promo poster.
4. Bracket card.

## Notes for future export work

The last known working direction was to use React/CSS as the visual source of truth and export a dedicated frame, rather than manually redrawing the poster on a canvas.

The key principle should be:

> Preview and output must be the same component/layout source.

Avoid rebuilding every visual manually on canvas unless the exact design can be replicated reliably.

For iPhone users, a web app generally cannot silently save directly into Photos. The practical fallback is to open/share the generated PNG so the user can save it from the native share sheet or image preview.

## Current remaining live share/export use

The standalone Share screen has been removed from navigation, but the app still uses `src/utils/shareExport.js` from the end-of-match modal.

Current live use:

- `src/components/match/EndMatchModal.jsx` imports:
  - `captureShareElementBlob`
  - `SHARE_CANVAS_NAME`
  - `shareOrDownloadResult`
- This is the result-sharing path that can currently save a picture.

Do not delete `src/utils/shareExport.js` unless the end-of-match modal share/export button is also removed or replaced.
