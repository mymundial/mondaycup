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


export const mcLayeredPitchBackground = () => ({
  backgroundColor: '#0B5F35',
  backgroundImage: [
    'radial-gradient(circle at 18% 8%, rgba(247,209,23,0.10), transparent 24%)',
    'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(0,0,0,0.09))',
    'linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)',
  ].join(', '),
  backgroundSize: '100% 100%',
});

export const mcSoftPanelStyle = {
  border: '1px solid rgba(245,241,232,0.12)',
  background: 'rgba(3,27,18,0.24)',
  boxShadow: '0 12px 28px rgba(0,0,0,0.14), inset 0 1px 0 rgba(245,241,232,0.04)',
  outline: '1px solid rgba(245,241,232,0.06)',
};

export const mcSoftPanelBackground = {
  background: 'rgba(3,27,18,0.24)',
};

export const mcTransparentPanelStyle = {
  border: '1px solid rgba(245,241,232,0.14)',
  background: 'rgba(3,27,18,0.24)',
  boxShadow: 'inset 0 1px 0 rgba(245,241,232,0.04)',
};

export const MC_GLASS_CLASSES = {
  row: 'border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10 shadow-[0_6px_14px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(245,241,232,0.06)]',
  rowActive: 'border-[#F7D117]/72 bg-[#052D1D]/84 text-[#F5F1E8] ring-[#F7D117]/30 shadow-[0_0_12px_rgba(247,209,23,0.12),0_6px_14px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(245,241,232,0.08)]',
  rowMuted: 'border-[#F5F1E8]/12 bg-[#031B12]/42 text-[#F5F1E8]/72 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.04)]',
};

export const mcPanelBorder = '1px solid rgba(244,239,226,0.16)';
export const mcIvoryBorder = '1px solid rgba(6,53,31,0.16)';


export const MC_SELECTION_LAYOUT = {
  // Home / team-selection camera. Kept separate from the live-match camera so
  // menu screens stay balanced while still sharing one editable layout source.
  topBarHeight: 50,
  scoreboardRatio: 0.15,
  tickerRatio: 0.24,
  goalTopPercent: 8,
  goalHeightPercent: 30,
  goalWidthPercent: 80,
  goalLeftPercent: 10,
  adBoardHeightPercent: 8,
  penaltySpotXPercent: 50,
  penaltySpotYPercent: 54.5,
  bottomBrandBottom: 'max(42px, calc(env(safe-area-inset-bottom) + 30px))',
};
