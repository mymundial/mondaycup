import React from 'react';
import { MC_SIZES } from '../../styles/theme.js';

export default function IvoryCard({ children, active = false, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: MC_SIZES.cardRadius,
        background: active ? 'rgba(5,45,29,0.84)' : 'rgba(5,45,29,0.68)',
        color: '#F5F1E8',
        border: active ? '1px solid rgba(247,209,23,0.72)' : '1px solid rgba(245,241,232,0.14)',
        boxShadow: active
          ? '0 0 12px rgba(247,209,23,0.12), 0 8px 18px rgba(0,0,0,0.14), inset 0 1px 0 rgba(245,241,232,0.08)'
          : '0 6px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(245,241,232,0.06)',
        outline: active ? '1px solid rgba(247,209,23,0.32)' : '1px solid rgba(245,241,232,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
