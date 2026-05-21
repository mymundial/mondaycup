# MONDAY CUP Vite app

Updated for Tailwind CSS v4 / Vercel builds.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

1. Push this folder to GitHub.
2. In Vercel, choose **Add New Project** or redeploy the existing project.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Tailwind v4 config

This package uses:

```txt
@tailwindcss/postcss
tailwindcss
```

`postcss.config.js` uses `@tailwindcss/postcss`, and `src/index.css` uses:

```css
@import "tailwindcss";
```
