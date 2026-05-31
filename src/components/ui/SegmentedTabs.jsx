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
        borderRadius: 15,
        background: 'rgba(11,95,53,0.82)',
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
              borderRadius: 15,
              background: active ? MC_COLORS.yellow : 'transparent',
              color: active ? MC_COLORS.greenDark : MC_COLORS.ivory,
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
