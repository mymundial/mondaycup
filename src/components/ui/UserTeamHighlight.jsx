import React from 'react';

export const USER_HIGHLIGHT = {
  text: 'text-[#F7D117]',
  border: 'border-[#F7D117]/72',
  ring: 'ring-[#F7D117]/32',
  flagRing: 'ring-[#F7D117]/85',
};

export function userHighlightTextClass(active) {
  return active ? USER_HIGHLIGHT.text : '';
}

export function userHighlightFlagClass(active, fallback = 'ring-[#F5F1E8]/35') {
  return active ? USER_HIGHLIGHT.flagRing : fallback;
}

export function userHighlightCardClass(active, inactiveClass = 'border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10') {
  return active
    ? `${USER_HIGHLIGHT.border} bg-[#052D1D]/68 text-[#F5F1E8] ${USER_HIGHLIGHT.ring}`
    : inactiveClass;
}

export default function UserTeamHighlight({ active = false, as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`${active ? USER_HIGHLIGHT.text : ''} ${className}`} {...props}>
      {children}
    </Component>
  );
}
