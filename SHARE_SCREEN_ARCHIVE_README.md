# Monday Cup Share / Poster Generator Notes

This file records the share/export structure so the feature can be rebuilt without repeating the previous drift.

## Current live status

The standalone Share screen has been restored as a **focused poster generator only**.

The live menu now includes `SHARE`, which opens:

```text
src/components/share/ShareScreen.jsx
```

This rebuilt version does **not** restore the old multi-state share suite. It is intentionally limited to a pitch-style poster generator.

## Current poster generator scope

The current screen provides:

- A square pitch-mow poster frame.
- Monday Cup logo.
- Brothers! logo.
- Up to five editable text lines.
- Font selection per line.
- Colour selection per line.
- Text glow toggle per line.
- X/Y positioning per line.
- Size scaling per line.
- X/Y/scale controls for Monday Cup logo.
- X/Y/scale controls for Brothers! logo.
- Border colour control.
- Preview size controls.
- `SAVE AS PHOTO` export.

The visual principle is unchanged from the archive decision:

> Preview and output must use the same React/CSS layout source.

The screen captures the visible poster frame rather than maintaining a second permanently mounted hidden export layer.

## Export utility

The screen still uses:

```text
src/utils/shareExport.js
```

This utility remains shared with the existing end-of-match modal export path.

Important exports:

- `captureShareElementBlob`
- `reserveShareWindow`
- `shareOrDownloadResult`

The export utility has one additive compatibility update: it can accept an object with `shareBorderColor` so the poster border colour can match the preview. Existing team-name usage from end-of-match sharing is preserved.

## Files involved in current poster generator

```text
src/App.jsx
src/components/layout/Menu.jsx
src/components/layout/ScreenTopBar.jsx
src/components/share/ShareScreen.jsx
src/utils/shareExport.js
```

## Previous archived share concepts not restored yet

The following older concepts remain deliberately out of scope:

- Match result card.
- Bracket card.
- Shirt-style poster.
- Admin design suite.
- Hidden 800x800 always-mounted export layer.

Recommended future rebuild order remains:

1. Public shirt poster.
2. Match result card after completed matches.
3. Promo poster variants.
4. Bracket card.

## iPhone / mobile note

A web app usually cannot silently save directly into Photos. The practical mobile path is:

```text
SAVE AS PHOTO → create PNG → native share sheet or image preview → user saves image
```


## Poster / shirt generator rebuild note

The current focused rebuild restores the `EXPORT` page as two adjacent templates:

1. `POSTER` — pitch-mow square poster with Monday Cup logo, Brothers! logo, editable text lines, text colours, fonts, shadow controls, optional border, manual X/Y/scale controls, and an auto-align button for a balanced starting layout.
2. `SHIRT PRINT` — back-of-shirt style social image with team-driven background/print colours, fixed centred Monday Cup logo, prominent name/number, and smaller Brothers! logo at the bottom.

This keeps the archived rule that preview and output should use the same React/CSS frame source rather than separate manual canvas drawing.
