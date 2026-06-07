import React from 'react';
import { ASSETS } from '../../data/assets.js';

export const APP_FOOTER_HEIGHT_PX = 58;
export const APP_FOOTER_BREATHING_ROOM_PX = 46;
export const APP_FOOTER_CONTENT_INSET = `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom))`;
export const APP_FOOTER_SCROLL_CLEARANCE = `calc(${APP_FOOTER_HEIGHT_PX + APP_FOOTER_BREATHING_ROOM_PX}px + env(safe-area-inset-bottom))`;

export function footerAwareStyle(style = {}, mode = 'scroll') {
  const paddingBottom = mode === 'content' ? APP_FOOTER_CONTENT_INSET : APP_FOOTER_SCROLL_CLEARANCE;
  return {
    ...style,
    paddingBottom: style?.paddingBottom ?? paddingBottom,
  };
}

const pagePitchMowBackground = {
  backgroundColor: '#0d6c3d',
  backgroundImage:
    'repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))',
};

const softEnvelopeShadow = {
  background: [
    'linear-gradient(0deg, rgba(3,27,18,0.52) 0%, rgba(3,27,18,0.28) 34%, rgba(3,27,18,0.12) 64%, rgba(3,27,18,0) 100%)',
    'radial-gradient(ellipse at 50% 100%, rgba(3,27,18,0.44) 0%, rgba(3,27,18,0.24) 42%, rgba(3,27,18,0) 76%)',
  ].join(', '),
};

export default function AppFooter({ fixed = false, className = '' }) {
  const shellClass = fixed
    ? 'pointer-events-none fixed bottom-0 left-1/2 z-[2147483000] w-full max-w-md -translate-x-1/2'
    : 'relative mt-auto shrink-0 text-center';

  return (
    <footer
      className={`${shellClass} ${className}`}
      style={{ height: `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom))` }}
      aria-label="Monday Cup footer"
    >
      <div className="relative h-full w-full overflow-visible">
        <div
          className="pointer-events-none absolute inset-x-0 top-[-76px] h-[78px] overflow-hidden"
          style={softEnvelopeShadow}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-[-18px] h-[24px]"
          style={{
            background: 'linear-gradient(0deg, rgba(3,27,18,0.34), rgba(3,27,18,0.12) 52%, rgba(3,27,18,0))',
            filter: 'blur(5px)',
          }}
          aria-hidden="true"
        />
        <div
          className="relative h-full w-full overflow-hidden border-t border-[#F5F1E8]/28 shadow-[0_-18px_34px_rgba(3,27,18,0.42),0_-4px_12px_rgba(3,27,18,0.30)]"
          style={pagePitchMowBackground}
        >
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/42 shadow-[0_1px_0_rgba(3,27,18,0.34)]"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-[76%]"
            style={{
              background: 'linear-gradient(180deg, rgba(3,27,18,0.34) 0%, rgba(3,27,18,0.16) 35%, rgba(3,27,18,0.03) 100%)',
            }}
            aria-hidden="true"
          />
          <div className="relative z-[1] flex h-[58px] w-full items-center justify-center pb-[env(safe-area-inset-bottom)]">
            <img
              src={ASSETS.branding.myMundialLogo}
              alt="Brothers!"
              className="h-[20px] w-auto max-w-[112px] object-contain opacity-82 drop-shadow-[0_2px_5px_rgba(0,0,0,0.24)]"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
