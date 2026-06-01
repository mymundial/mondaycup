import React from 'react';
import { ASSETS } from '../../data/assets.js';

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

const pitchMowBackground = {
  backgroundColor: '#0B5F35',
  backgroundImage:
    'linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)',
  backgroundSize: '100% 100%',
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
          className="relative flex h-full w-full items-start justify-center overflow-visible"
          style={pitchMowBackground}
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
            className="relative z-[1] mt-[18px] h-[20px] w-auto max-w-[112px] object-contain opacity-95"
            draggable={false}
          />
        </div>
      </div>
    </footer>
  );
}
