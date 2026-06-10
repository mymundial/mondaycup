import React from 'react';
import { MC_COLORS } from '../../styles/theme.js';

const FORM_GUIDE_LENGTH = 8;

const resultColor = (result) => {
  const value = String(result || '').toUpperCase();
  if (value === 'W') return '#16a34a';
  if (value === 'L') return MC_COLORS.redLoss;
  if (value === 'D') return MC_COLORS.yellow;
  return 'rgba(244,239,226,0.34)';
};

export default function FormGuideDots({ form = [], size = 8, gap = 5, style }) {
  const dots = Array.from({ length: FORM_GUIDE_LENGTH }, (_, index) => form[index] || null);
  const numericSize = Number(size) || 8;
  const numericGap = Number(gap) || 5;
  const maxWidth = FORM_GUIDE_LENGTH * numericSize + (FORM_GUIDE_LENGTH - 1) * numericGap;

  return (
    <div
      style={{
        '--form-dot-size': `${numericSize}px`,
        '--form-dot-gap': `${numericGap}px`,
        display: 'grid',
        gridTemplateColumns: `repeat(${FORM_GUIDE_LENGTH}, minmax(0, 1fr))`,
        alignItems: 'center',
        justifyItems: 'center',
        gap: 'clamp(2px, 1.1vw, var(--form-dot-gap))',
        width: '100%',
        maxWidth,
        minWidth: 0,
        marginInline: 'auto',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      {dots.map((result, index) => (
        <span
          key={`${result || 'empty'}-${index}`}
          title={result || 'No result'}
          style={{
            width: 'min(100%, var(--form-dot-size))',
            maxWidth: 'var(--form-dot-size)',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            display: 'block',
            background: resultColor(result),
            boxShadow: '0 0 0 1px rgba(6,53,31,0.14)',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}
