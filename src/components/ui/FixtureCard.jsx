import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';
import AppPanel from './AppPanel.jsx';

export default function FixtureCard({
  code,
  home,
  away,
  homeFlag,
  awayFlag,
  score,
  meta,
  style,
}) {
  return (
    <AppPanel variant="compact"
      style={{
        minHeight: 44,
        padding: '8px 10px',
        display: 'grid',
        gridTemplateColumns: '44px 1fr 54px 1fr 44px',
        alignItems: 'center',
        columnGap: MC_SIZES.gapSm,
        ...style,
      }}
    >
      <div style={{ fontSize: 24, textAlign: 'center' }}>{homeFlag || '🏳️'}</div>
      <div style={{ textAlign: 'left', overflow: 'hidden' }}>
        {code ? <div style={{ fontSize: 9, color: 'rgba(245,241,232,0.58)', ...MC_TYPE.smallLabel }}>{code}</div> : null}
        <div style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: MC_COLORS.ivory, ...MC_TYPE.label }}>{home || 'TBC'}</div>
      </div>
      <div style={{ color: MC_COLORS.ivory, textAlign: 'center', fontSize: 13, ...MC_TYPE.led }}>{score || 'v'}</div>
      <div style={{ textAlign: 'right', overflow: 'hidden' }}>
        {meta ? <div style={{ fontSize: 9, color: 'rgba(245,241,232,0.58)', ...MC_TYPE.smallLabel }}>{meta}</div> : null}
        <div style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: MC_COLORS.ivory, ...MC_TYPE.label }}>{away || 'TBC'}</div>
      </div>
      <div style={{ fontSize: 24, textAlign: 'center' }}>{awayFlag || '🏳️'}</div>
    </AppPanel>
  );
}
