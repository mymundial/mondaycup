import React, { forwardRef } from 'react';
import { MC_COLORS, MC_SIZES, MC_SHADOWS, mcPanelBorder, mcPitchMowBackground } from '../../styles/theme.js';

export const APP_PANEL_VARIANTS = {
  green: {
    background: MC_COLORS.greenPanel,
    color: MC_COLORS.ivory,
    border: mcPanelBorder,
    shadow: MC_SHADOWS.soft,
  },
  standard: {
    background: MC_COLORS.greenPanel,
    color: MC_COLORS.ivory,
    border: mcPanelBorder,
    shadow: MC_SHADOWS.soft,
  },
  compact: {
    background: 'rgba(11,95,53,0.44)',
    color: MC_COLORS.ivory,
    border: '1px solid rgba(245,241,232,0.12)',
    shadow: 'inset 0 1px 0 rgba(245,241,232,0.08)',
    outline: '1px solid rgba(245,241,232,0.10)',
  },
  table: {
    background: 'rgba(11,95,53,0.44)',
    color: MC_COLORS.ivory,
    border: '1px solid rgba(245,241,232,0.12)',
    shadow: 'inset 0 1px 0 rgba(245,241,232,0.08)',
    outline: '1px solid rgba(245,241,232,0.10)',
  },
  bracket: {
    background: 'rgba(11,95,53,0.44)',
    color: MC_COLORS.ivory,
    border: '1px solid rgba(245,241,232,0.12)',
    shadow: 'inset 0 1px 0 rgba(245,241,232,0.08)',
    outline: '1px solid rgba(245,241,232,0.10)',
  },
  modal: {
    background: 'rgba(5,45,29,0.92)',
    color: MC_COLORS.ivory,
    border: mcPanelBorder,
    shadow: MC_SHADOWS.soft,
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
        borderRadius: radius,
        border: variantStyle.border,
        background: pitch ? undefined : variantStyle.background,
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
