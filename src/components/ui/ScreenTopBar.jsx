import React from 'react';
import AppTopBar from './AppTopBar.jsx';

export default function ScreenTopBar({
  title,
  logoSrc,
  left,
  right,
  logoAlt = 'Monday Cup',
  style,
}) {
  return (
    <AppTopBar
      title={title}
      logoSrc={left ? null : logoSrc}
      logoAlt={logoAlt}
      style={style}
      menu={right}
    />
  );
}
