import React from 'react';

export const APP_FOOTER_HEIGHT_PX = 30;
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
        <div className="relative h-full w-full bg-[#0d6c3d]">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(245,241,232,0.045) 0%, rgba(245,241,232,0.045) 10%, rgba(11,45,29,0.12) 10%, rgba(11,45,29,0.12) 20%), linear-gradient(rgba(245,241,232,0.02), rgba(11,45,29,0.05))',
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-[-12%] top-[-19px] h-[31px] rounded-[0_0_50%_50%] border-b border-[#F5F1E8]/13 shadow-[0_10px_18px_rgba(0,0,0,0.28)]" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}
