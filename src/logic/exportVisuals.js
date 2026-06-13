// Shared visual configuration for the match-result share/export pitch.
//
// Route lock:
// EndMatchModal.jsx opens ShareMatchPreview, then createMatchShareBlob()
// captures the rendered pitch DOM when possible. src/utils/matchShareCanvas.js
// uses the manual canvas pitch only as a fallback if that DOM capture fails.
//
// This Pass 1 file intentionally preserves the current active/fallback visuals.
// Later passes should change these values from here rather than hard-coding
// separate values into the rendered preview path and the canvas fallback path.

export const EXPORT_PITCH_CROP_RATIO = 100 / 38;

export const MATCH_RESULT_EXPORT_VISUALS = Object.freeze({
  cropRatio: EXPORT_PITCH_CROP_RATIO,

  rendered: Object.freeze({
    crowd: Object.freeze({
      // Slightly fuller than the default rows because the cleaner member opacity
      // reads less dense in the square export crop. Live match default remains 1.
      density: 1,
      rowCount: 16,
      personOpacityScale: 1.22,
    }),
    goal: Object.freeze({
      netOpacity: 0.55,
    }),
    adBoard: Object.freeze({
      maxWidthPercent: 61,
      logoHeightPercent: 69,
      logoOpacity: 0.84,
      logoFilter: "brightness(0.94) drop-shadow(0 0 9px rgba(245,241,232,0.20))",
      glow: Object.freeze({
        enabled: false,
        widthPercent: 112,
        heightPercent: 82,
        opacity: 0.055,
        blurPx: 10,
      }),
    }),
    badge: Object.freeze({
      scaleMultiplier: 1.15,
      glowOpacityScale: 0.58,
    }),
  }),

  fallback: Object.freeze({
    crowd: Object.freeze({
      density: 1,
      rowCount: 16,
      personOpacityScale: 1,
    }),
    goal: Object.freeze({
      netOpacity: 0.55,
      showDiagonalNet: false,
    }),
    adBoard: Object.freeze({
      logoWidthRatio: 0.671,
      logoHeightRatio: 0.759,
      logoOpacity: 0.84,
      logoFilter: "brightness(0.94)",
      shadowColor: "rgba(245,241,232,0.20)",
      shadowBlur: 9,
    }),
  }),
});

export function resolveExportVisuals(value) {
  if (!value) return null;
  if (value === true) return MATCH_RESULT_EXPORT_VISUALS;
  if (typeof value === "object") return value;
  return null;
}

export function resolveRenderedExportVisuals(value) {
  return resolveExportVisuals(value)?.rendered || null;
}

export function resolveFallbackExportVisuals(value = MATCH_RESULT_EXPORT_VISUALS) {
  return resolveExportVisuals(value)?.fallback || MATCH_RESULT_EXPORT_VISUALS.fallback;
}
