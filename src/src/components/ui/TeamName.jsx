import React from 'react';
import { teamCode } from '../../data/teams.js';

const SHORT_NAMES = {
  'Bosnia-Herzegovina': 'Bosnia',
  'United States': 'USA',
  'South Africa': 'S. Africa',
  'South Korea': 'S. Korea',
  'Czech Republic': 'Czech Rep.',
  'Ivory Coast': 'Ivory Coast',
  'Saudi Arabia': 'Saudi Arabia',
  'New Zealand': 'New Zealand',
};

export function getTeamDisplayName(team, context = 'default') {
  if (!team) return 'TBC';
  if (context === 'code' || context === 'bracket') return teamCode(team);
  if (context === 'compact' || context === 'badge' || context === 'flagWall') return SHORT_NAMES[team] || team;
  return team;
}

export default function TeamName({
  team,
  context = 'default',
  className = '',
  active = false,
  title,
}) {
  const label = getTeamDisplayName(team, context);
  return (
    <span
      className={`block min-w-0 truncate uppercase ${active ? 'text-[#F7D117]' : ''} ${className}`}
      title={title || team || label}
    >
      {label}
    </span>
  );
}
