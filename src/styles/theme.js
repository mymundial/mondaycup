// src/styles/theme.js
// Monday Cup shared design tokens. Change repeated spacing/colour/radius here first.

export const MC_COLORS = {
  greenDark: '#06351f',
  greenDeep: '#052b1b',
  greenPanel: 'rgba(5, 62, 32, 0.78)',
  greenPanelSolid: '#0b4a2a',
  greenMowA: '#0b4a2a',
  greenMowB: '#0a4025',
  ivory: '#f4efe2',
  ivorySoft: '#fff7e8',
  yellow: '#f4d33e',
  yellowDeep: '#d9ae1f',
  redLoss: '#b83a33',
  gold: '#d6aa3b',
  silver: '#c6c6c6',
  bronze: '#b5743c',
  blackish: '#102014',
  white: '#ffffff',
};

export const MC_SIZES = {
  appMaxWidth: 430,
  contentMaxWidth: 400,
  pagePaddingX: 12,
  panelRadius: 24,
  cardRadius: 18,
  pillRadius: 999,
  topBarHeight: 54,
  buttonHeight: 52,
  inputHeight: 46,
  sliderHeight: 42,
  gapXs: 4,
  gapSm: 8,
  gapMd: 12,
  gapLg: 16,
  gapXl: 22,
};

export const MC_TYPE = {
  title: {
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  label: {
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  smallLabel: {
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  led: {
    fontFamily: 'IntoDotMatrix, monospace',
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
  },
};

export const MC_SHADOWS = {
  soft: '0 10px 24px rgba(0,0,0,0.22)',
  insetLight: 'inset 0 1px 0 rgba(255,255,255,0.20)',
  yellowInset: 'inset 0 -3px 0 rgba(6,53,31,0.18), inset 0 2px 0 rgba(255,255,255,0.25)',
};

export const mcPitchMowBackground = ({ angle = '90deg' } = {}) => ({
  background: `repeating-linear-gradient(${angle}, ${MC_COLORS.greenMowA} 0 42px, ${MC_COLORS.greenMowB} 42px 84px)`,
});

export const mcPanelBorder = '1px solid rgba(244,239,226,0.16)';
export const mcIvoryBorder = '1px solid rgba(6,53,31,0.16)';
