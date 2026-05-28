import React from 'react';
import { MC_COLORS } from '../../styles/theme.js';

const resultColor = (result) => {
  const value = String(result || '').toUpperCase();
  if (value === 'W') return '#16a34a';
  if (value === 'L') return MC_COLORS.redLoss;
  if (value === 'D') return MC_COLORS.yellow;
  return 'rgba(244,239,226,0.34)';
};

export default function FormGuideDots({ form = [], size = 8, gap = 5, style }) {
  const dots = Array.from({ length: 8 }, (_, index) => form[index] || null);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap, ...style }}>
      {dots.map((result, index) => (
        <span
          key={`${result || 'empty'}-${index}`}
          title={result || 'No result'}
          style={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
            borderRadius: '50%',
            display: 'block',
            background: resultColor(result),
            boxShadow: '0 0 0 1px rgba(6,53,31,0.14)',
          }}
        />
      ))}
    </div>
  );
}
