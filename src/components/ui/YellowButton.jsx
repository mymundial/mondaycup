import React from 'react';
import { MC_COLORS, MC_SIZES, MC_SHADOWS, MC_TYPE } from '../../styles/theme.js';

export default function YellowButton({
  children,
  onClick,
  disabled = false,
  variant = 'yellow',
  fullWidth = true,
  style,
  className = '',
  type = 'button',
  ariaLabel,
}) {
  const isRed = variant === 'red';
  const isDark = variant === 'dark';
  const bg = isRed ? MC_COLORS.redLoss : isDark ? MC_COLORS.greenDark : MC_COLORS.yellow;
  const color = isRed ? MC_COLORS.ivory : isDark ? MC_COLORS.yellow : MC_COLORS.greenDark;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={className}
      style={{
        width: fullWidth ? '100%' : undefined,
        minHeight: MC_SIZES.buttonHeight,
        border: 0,
        borderRadius: MC_SIZES.pillRadius,
        background: bg,
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.34 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: MC_SIZES.gapSm,
        padding: '0 18px',
        boxShadow: isRed || isDark ? MC_SHADOWS.insetLight : MC_SHADOWS.yellowInset,
        fontSize: 15,
        ...MC_TYPE.label,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
