# Monday Cup Source Hygiene

This package is intended to be the clean source handoff for the current Monday Cup beta.

## Source of truth

Use this project folder as the current base. Do not patch from older generated zips.

## Excluded from handoff zips

The following generated or local files should not be committed or included in source handoffs:

- `node_modules/`
- `dist/`
- `.vite/`
- `__MACOSX/`
- `.DS_Store`
- editor folders such as `.vscode/` and `.idea/`
- temporary `.zip` files inside the project

## Setup after unzipping

```bash
npm install
npm run dev
```

## Build check

Before creating this clean handoff, the project was rebuilt from a fresh `npm install` and passed:

```bash
npm run build
```

## Share screen status

The standalone Share screen is currently removed from live navigation, but the archived share/export documentation is retained in `SHARE_SCREEN_ARCHIVE_README.md`.
