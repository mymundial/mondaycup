import React from 'react';
import { ASSETS } from '../../data/assets.js';
import { HamburgerIcon } from '../shared.jsx';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';

function CloseIcon() {
  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span className="absolute left-1/2 top-1/2 block h-[3px] w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
      <span className="absolute left-1/2 top-1/2 block h-[3px] w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
    </span>
  );
}

export default function AppTopBar({
  title,
  children,
  menuOpen = false,
  onMenuButtonClick,
  menu,
  logoSrc = ASSETS.branding.mondayLogo,
  logoAlt = 'Monday Cup',
  className = '',
  style,
  titleClassName = '',
}) {
  const heading = title ?? children;
  return (
    <section
      className={`relative z-[1000] flex shrink-0 items-center justify-center overflow-visible px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)] ${className}`}
      style={{ height: MC_SIZES.topBarHeight, background: MC_COLORS.greenDark, ...style }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={logoAlt}
          className="absolute left-3 top-1/2 z-[1] h-10 w-10 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
          draggable={false}
        />
      ) : null}
      <h2
        className={`relative z-[1] home-copy-bold text-center text-[clamp(25px,6.1vw,34px)] uppercase leading-none text-[#F5F1E8] ${titleClassName}`}
        style={MC_TYPE.title}
      >
        {heading}
      </h2>
      {onMenuButtonClick ? (
        <button
          onClick={onMenuButtonClick}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="absolute right-3 top-1/2 z-[1001] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F1E8]"
          type="button"
        >
          {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      ) : null}
      {menuOpen ? menu : null}
    </section>
  );
}
