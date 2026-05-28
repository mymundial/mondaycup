import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';

export default function UpgradeCard({
  title,
  subtitle,
  price = '£0.99',
  icon,
  active = false,
  disabled = false,
  onClick,
  style,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        border: 0,
        borderRadius: MC_SIZES.cardRadius,
        background: active ? MC_COLORS.greenDark : MC_COLORS.yellow,
        color: active ? MC_COLORS.ivory : MC_COLORS.greenDark,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        padding: '10px 8px',
        minHeight: 132,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 6,
        boxShadow: 'inset 0 -3px 0 rgba(6,53,31,0.16), inset 0 2px 0 rgba(255,255,255,0.22)',
        ...style,
      }}
    >
      <div style={{ minHeight: 42, display: 'grid', placeItems: 'center', fontSize: 34 }}>{icon}</div>
      <div style={{ marginTop: 6, fontSize: 11, ...MC_TYPE.label }}>{title}</div>
      {subtitle ? <div style={{ marginTop: -4, fontSize: 8.5, opacity: 0.72, ...MC_TYPE.smallLabel }}>{subtitle}</div> : null}
      <div style={{ marginTop: 8, fontSize: 13, ...MC_TYPE.label }}>{price}</div>
    </button>
  );
}
