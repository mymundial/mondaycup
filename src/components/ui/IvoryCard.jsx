import React from 'react';
import { MC_COLORS, MC_SIZES, MC_SHADOWS, mcIvoryBorder } from '../../styles/theme.js';

export default function IvoryCard({ children, active = false, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: MC_SIZES.cardRadius,
        background: active ? MC_COLORS.greenDark : MC_COLORS.ivory,
        color: active ? MC_COLORS.ivory : MC_COLORS.greenDark,
        border: active ? '1px solid rgba(244,239,226,0.18)' : mcIvoryBorder,
        boxShadow: MC_SHADOWS.insetLight,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
