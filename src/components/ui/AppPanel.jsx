import React, { forwardRef } from 'react';
import { MC_COLORS, MC_SIZES, MC_SHADOWS, mcPitchMowBackground, mcLayeredPitchBackground, mcSoftPanelStyle } from '../../styles/theme.js';

export const APP_PANEL_VARIANTS = {
  green: {
    ...mcSoftPanelStyle,
    color: MC_COLORS.ivory,
  },
  standard: {
    ...mcSoftPanelStyle,
    color: MC_COLORS.ivory,
  },
  compact: {
    ...mcSoftPanelStyle,
    background: 'rgba(3,27,18,0.28)',
    color: MC_COLORS.ivory,
    shadow: 'inset 0 1px 0 rgba(245,241,232,0.06), 0 10px 22px rgba(0,0,0,0.16)',
  },
  table: {
    ...mcSoftPanelStyle,
    color: MC_COLORS.ivory,
  },
  bracket: {
    ...mcSoftPanelStyle,
    color: MC_COLORS.ivory,
  },
  modal: {
    background: 'rgba(11,95,53,0.94)',
    backgroundStyle: mcLayeredPitchBackground(),
    color: MC_COLORS.ivory,
    border: '1px solid rgba(245,241,232,0.14)',
    shadow: '0 24px 54px rgba(0,0,0,0.35), inset 0 1px 0 rgba(245,241,232,0.05)',
  },
  ivory: {
    background: MC_COLORS.ivory,
    color: MC_COLORS.greenDark,
    border: '1px solid rgba(6,53,31,0.16)',
    shadow: MC_SHADOWS.soft,
  },
};

export function appPanelStyleForVariant(variant = 'green') {
  const variantStyle = APP_PANEL_VARIANTS[variant] || APP_PANEL_VARIANTS.green;
  return {
    border: variantStyle.border,
    background: variantStyle.background,
    ...(variantStyle.backgroundStyle || {}),
    color: variantStyle.color,
    boxShadow: variantStyle.shadow,
    outline: variantStyle.outline,
  };
}

const AppPanel = forwardRef(function AppPanel({
  children,
  variant = 'green',
  pitch = false,
  className = '',
  style,
  maxWidth = MC_SIZES.contentMaxWidth,
  radius = MC_SIZES.panelRadius,
  overflow = 'hidden',
}, ref) {
  const variantStyle = APP_PANEL_VARIANTS[variant] || APP_PANEL_VARIANTS.green;
  return (
    <section
      ref={ref}
      className={className}
      style={{
        width: '100%',
        maxWidth,
        margin: '0 auto',
        position: 'relative',
        borderRadius: radius,
        border: variantStyle.border,
        background: pitch ? undefined : variantStyle.background,
        ...(pitch ? null : (variantStyle.backgroundStyle || {})),
        color: variantStyle.color,
        boxShadow: variantStyle.shadow,
        outline: variantStyle.outline,
        overflow,
        ...(pitch ? mcPitchMowBackground() : null),
        ...style,
      }}
    >
      {children}
    </section>
  );
});

export default AppPanel;
