import React from 'react';
import { ASSETS } from '../../data/assets.js';

export const APP_FOOTER_HEIGHT_PX = 38;
export const APP_FOOTER_BREATHING_ROOM_PX = 36;
export const APP_FOOTER_CONTENT_INSET = `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom))`;
export const APP_FOOTER_SCROLL_CLEARANCE = `calc(${APP_FOOTER_HEIGHT_PX + APP_FOOTER_BREATHING_ROOM_PX}px + env(safe-area-inset-bottom))`;

export function footerAwareStyle(style = {}, mode = 'scroll') {
  const paddingBottom = mode === 'content' ? APP_FOOTER_CONTENT_INSET : APP_FOOTER_SCROLL_CLEARANCE;
  return {
    ...style,
    paddingBottom: style?.paddingBottom ?? paddingBottom,
  };
}

export default function AppFooter({ fixed = false, className = '' }) {
  const shellClass = fixed
    ? 'pointer-events-none fixed inset-x-0 bottom-0 z-[1200] overflow-hidden'
    : 'relative mt-auto shrink-0 overflow-hidden text-center';
  const innerClass = fixed ? 'mx-auto h-full w-full max-w-md overflow-hidden' : 'h-full w-full overflow-hidden';

  return (
    <footer
      className={`${shellClass} ${className}`}
      style={{ height: APP_FOOTER_HEIGHT_PX }}
      aria-label="Monday Cup footer"
    >
      <div className={innerClass}>
        <div
          className="relative flex h-full w-full items-center justify-center bg-[#0B5F35]"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)',
            backgroundSize: '100% 100%',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/12" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-[-10%] top-[-20px] h-[28px] rounded-[0_0_50%_50%] shadow-[0_12px_18px_rgba(0,0,0,0.24)]" aria-hidden="true" />
          <img
            src={ASSETS.branding.myMundialLogo}
            alt="Brothers!"
            className="relative z-[1] h-[20px] w-auto max-w-[108px] object-contain opacity-95 drop-shadow-[0_3px_7px_rgba(0,0,0,0.24)]"
            draggable={false}
          />
        </div>
      </div>
    </footer>
  );
}
