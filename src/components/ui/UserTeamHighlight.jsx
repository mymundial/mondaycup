import React from 'react';

export const USER_HIGHLIGHT = {
  text: 'text-[#F7D117]',
  border: 'border-[#F7D117]/72',
  ring: 'ring-[#F7D117]/32',
  flagRing: 'ring-[#F7D117]/85',
  glow: 'shadow-[0_0_12px_rgba(247,209,23,0.10)]',
};

export function userHighlightTextClass(active) {
  return active ? USER_HIGHLIGHT.text : '';
}

export function userHighlightFlagClass(active, fallback = 'ring-[#F5F1E8]/35') {
  return active ? USER_HIGHLIGHT.flagRing : fallback;
}

export function userHighlightCardClass(active, inactiveClass = 'border-[#F5F1E8] bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/30') {
  return active
    ? `${USER_HIGHLIGHT.border} bg-[#072D1D]/82 text-[#F5F1E8] ${USER_HIGHLIGHT.ring} ${USER_HIGHLIGHT.glow}`
    : inactiveClass;
}

export default function UserTeamHighlight({ active = false, as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`${active ? USER_HIGHLIGHT.text : ''} ${className}`} {...props}>
      {children}
    </Component>
  );
}
