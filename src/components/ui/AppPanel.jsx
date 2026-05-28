import React, { forwardRef } from 'react';
import { MC_COLORS, MC_SIZES, MC_SHADOWS, mcPanelBorder, mcPitchMowBackground } from '../../styles/theme.js';

const AppPanel = forwardRef(function AppPanel({
  children,
  variant = 'green',
  pitch = false,
  className = '',
  style,
}, ref) {
  const isIvory = variant === 'ivory';
  const baseBg = isIvory ? MC_COLORS.ivory : pitch ? undefined : MC_COLORS.greenPanel;
  return (
    <section
      ref={ref}
      className={className}
      style={{
        width: '100%',
        maxWidth: MC_SIZES.contentMaxWidth,
        margin: '0 auto',
        borderRadius: MC_SIZES.panelRadius,
        border: isIvory ? '1px solid rgba(6,53,31,0.16)' : mcPanelBorder,
        background: baseBg,
        color: isIvory ? MC_COLORS.greenDark : MC_COLORS.ivory,
        boxShadow: MC_SHADOWS.soft,
        overflow: 'hidden',
        ...(pitch ? mcPitchMowBackground() : null),
        ...style,
      }}
    >
      {children}
    </section>
  );
});

export default AppPanel;
