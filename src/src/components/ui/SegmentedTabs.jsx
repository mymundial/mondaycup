import React from 'react';
import { MC_SIZES } from '../../styles/theme.js';
import PageTabs from './PageTabs.jsx';

export default function SegmentedTabs({ options = [], value, onChange, style }) {
  return (
    <PageTabs
      options={options}
      value={value}
      onChange={onChange}
      className="w-full"
      style={{
        maxWidth: MC_SIZES.contentMaxWidth,
        width: '100%',
        minHeight: MC_SIZES.sliderHeight,
        ...style,
      }}
    />
  );
}
