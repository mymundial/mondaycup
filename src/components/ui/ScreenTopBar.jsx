import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';

export default function ScreenTopBar({
  title,
  logoSrc,
  left,
  right,
  logoAlt = 'Monday Cup',
  style,
}) {
  return (
    <header
      style={{
        width: '100%',
        height: MC_SIZES.topBarHeight,
        display: 'grid',
        gridTemplateColumns: '56px 1fr 56px',
        alignItems: 'center',
        padding: '0 10px',
        color: MC_COLORS.ivory,
        background: MC_COLORS.greenDark,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {left || (logoSrc ? <img src={logoSrc} alt={logoAlt} style={{ width: 34, height: 34, objectFit: 'contain' }} /> : null)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 17, ...MC_TYPE.title }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{right}</div>
    </header>
  );
}
