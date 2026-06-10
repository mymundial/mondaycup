import React from 'react';
import { Flag } from '../shared.jsx';

export default function TeamFlag({
  team,
  isUserTeam = false,
  className = 'h-4 w-6',
  fallbackRing = 'ring-[#F5F1E8]/35',
  userRing = 'ring-[#F7D117]/85',
}) {
  return (
    <Flag
      team={team}
      className={`${className} rounded-[4px] ring-1 ${isUserTeam ? userRing : fallbackRing}`}
    />
  );
}
