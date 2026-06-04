import React from 'react';
import { ASSETS } from '../../data/assets.js';
import { MC_COLORS } from '../../styles/theme.js';

export const APP_FOOTER_HEIGHT_PX = 58;
export const APP_FOOTER_BREATHING_ROOM_PX = 34;
export const APP_FOOTER_CONTENT_INSET = `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom))`;
export const APP_FOOTER_SCROLL_CLEARANCE = `calc(${APP_FOOTER_HEIGHT_PX + APP_FOOTER_BREATHING_ROOM_PX}px + env(safe-area-inset-bottom))`;

export function footerAwareStyle(style = {}, mode = 'scroll') {
  const paddingBottom = mode === 'content' ? APP_FOOTER_CONTENT_INSET : APP_FOOTER_SCROLL_CLEARANCE;
  return {
    ...style,
    paddingBottom: style?.paddingBottom ?? paddingBottom,
  };
}

const titleBarFooterBackground = {
  background: MC_COLORS.greenDark,
};

export default function AppFooter({ fixed = false, className = '' }) {
  const shellClass = fixed
    ? 'pointer-events-none fixed inset-x-0 bottom-0 z-[1200]'
    : 'relative mt-auto shrink-0 text-center';

  const innerClass = fixed
    ? 'mx-auto h-full w-full max-w-md'
    : 'h-full w-full';

  return (
    <footer
      className={`${shellClass} ${className}`}
      style={{ height: APP_FOOTER_HEIGHT_PX }}
      aria-label="Monday Cup footer"
    >
      <div className={innerClass}>
        <div
          className="relative flex h-full w-full items-center justify-center overflow-visible"
          style={titleBarFooterBackground}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-[-30px] h-[30px]"
            style={{
              background: 'linear-gradient(180deg, rgba(3,27,18,0), rgba(3,27,18,0.32) 72%, rgba(3,27,18,0.50))',
            }}
            aria-hidden="true"
          />

          <img
            src={ASSETS.branding.myMundialLogo}
            alt="Brothers!"
            className="relative z-[1] h-[21px] w-auto max-w-[116px] object-contain opacity-95"
            draggable={false}
          />
        </div>
      </div>
    </footer>
  );
}
