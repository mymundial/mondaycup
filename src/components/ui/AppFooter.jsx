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

const pitchMowFooterBackground = {
  backgroundColor: '#0b5f35',
  backgroundImage: [
    'radial-gradient(ellipse at 50% 45%, rgba(245,241,232,0.10) 0%, rgba(245,241,232,0.04) 34%, rgba(3,27,18,0.10) 68%, rgba(3,27,18,0.18) 100%)',
    'linear-gradient(90deg, rgba(2,22,14,0.26) 0%, rgba(2,22,14,0.05) 23%, rgba(255,255,255,0.045) 50%, rgba(2,22,14,0.05) 77%, rgba(2,22,14,0.26) 100%)',
    'repeating-linear-gradient(90deg, #0f7042 0 39px, #0a5c36 39px 78px)',
  ].join(', '),
};

export default function AppFooter({ fixed = false, className = '' }) {
  const shellClass = fixed
    ? 'pointer-events-none fixed bottom-0 left-1/2 z-[2147483000] w-full max-w-md -translate-x-1/2'
    : 'relative mt-auto shrink-0 text-center';

  const innerClass = fixed
    ? 'h-full w-full'
    : 'h-full w-full';

  return (
    <footer
      className={`${shellClass} ${className}`}
      style={{ height: APP_FOOTER_HEIGHT_PX }}
      aria-label="Monday Cup footer"
    >
      <div className={innerClass}>
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={pitchMowFooterBackground}
        >
          <span
            className="pointer-events-none absolute inset-y-0 left-0 w-[36%] opacity-55"
            style={{
              backgroundImage: 'repeating-linear-gradient(74deg, rgba(255,255,255,0.08) 0 17px, rgba(3,27,18,0.10) 17px 39px)',
              maskImage: 'linear-gradient(90deg, #000, rgba(0,0,0,0.78) 56%, transparent)',
              WebkitMaskImage: 'linear-gradient(90deg, #000, rgba(0,0,0,0.78) 56%, transparent)',
            }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute inset-y-0 right-0 w-[36%] opacity-55"
            style={{
              backgroundImage: 'repeating-linear-gradient(106deg, rgba(255,255,255,0.08) 0 17px, rgba(3,27,18,0.10) 17px 39px)',
              maskImage: 'linear-gradient(270deg, #000, rgba(0,0,0,0.78) 56%, transparent)',
              WebkitMaskImage: 'linear-gradient(270deg, #000, rgba(0,0,0,0.78) 56%, transparent)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-[-30px] h-[30px]"
            style={{
              background: 'linear-gradient(180deg, rgba(3,27,18,0), rgba(3,27,18,0.18) 72%, rgba(3,27,18,0.30))',
            }}
            aria-hidden="true"
          />

          <img
            src={ASSETS.branding.myMundialLogo}
            alt="Brothers!"
            className="relative z-[1] h-[21px] w-auto max-w-[116px] object-contain opacity-95 drop-shadow-[0_2px_5px_rgba(0,0,0,0.26)]"
            draggable={false}
          />
        </div>
      </div>
    </footer>
  );
}
