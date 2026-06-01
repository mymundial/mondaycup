# Monday Cup Design System — Step 3A Footer + Scroll Padding

Safe migration scope: footer and scroll padding only.

## What changed

- `AppFooter` now exports shared footer sizing/clearance constants.
- `PageScroll` now uses the same footer-aware padding logic everywhere instead of duplicating hard-coded `pb-[calc(...)]` classes.
- `AppFrameContent` now uses the shared footer content inset, so drawer pages reserve the fixed footer area consistently.
- Home/selection layout now uses the shared footer content inset instead of its own hard-coded footer padding.
- Trophy cabinet manual scroll wrapper was migrated to `PageScroll`.
- Leaderboard nested footer-padding scroll area was flattened so `DrawerContent`/`PageScroll` owns footer clearance once.

## Protected areas

Not touched:

- penalty mechanic
- match shot controls
- tournament progression logic
- share export logic
- knockout bracket geometry
- bracket fixture positioning

## Notes

The footer remains fixed on non-match screens through `App.jsx` and `AppFooter fixed`.
Scrollable page content should now use `PageScroll` rather than manual classes such as:

```txt
pb-[calc(66px+env(safe-area-inset-bottom))]
pb-[calc(30px+env(safe-area-inset-bottom))]
```

For future page work, use:

```jsx
<PageScroll>...</PageScroll>
```

For fixed frame content that must reserve footer space, use:

```jsx
<AppFrameContent footerAware>...</AppFrameContent>
```
