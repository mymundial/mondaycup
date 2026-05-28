import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';

export default function SegmentedTabs({ options = [], value, onChange, style }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: MC_SIZES.contentMaxWidth,
        margin: '0 auto',
        height: MC_SIZES.sliderHeight,
        borderRadius: MC_SIZES.pillRadius,
        background: 'rgba(6,53,31,0.42)',
        padding: 4,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, 1fr)`,
        gap: 4,
        ...style,
      }}
    >
      {options.map((option) => {
        const key = option.value ?? option;
        const label = option.label ?? option;
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange?.(key)}
            style={{
              border: 0,
              borderRadius: MC_SIZES.pillRadius,
              background: active ? MC_COLORS.yellow : MC_COLORS.greenPanelSolid,
              color: active ? MC_COLORS.greenDark : 'rgba(244,239,226,0.70)',
              fontSize: 12,
              cursor: 'pointer',
              ...MC_TYPE.label,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
