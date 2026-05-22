import { GROUPS, GROUP_LETTERS } from "../data/teams.js";
import { buildRound32Fixtures, sortRows } from "./tournament.js";
import { toGameFixture } from "./gameFixture.js";

export function isGroupStageComplete(schedule) {
  return schedule.every((fixture) => fixture.played);
}

export function selectVisibleKnockoutFixtures({ schedule, knockoutFixtures, table }) {
  return isGroupStageComplete(schedule) && !knockoutFixtures.length ? buildRound32Fixtures(table) : knockoutFixtures;
}

export function selectAllGroups(table) {
  return GROUP_LETTERS.map((group) => ({ group, rows: sortRows(GROUPS[group].map((name) => table[name])) }));
}

export function calculateEarlyQualifiedTeams(table, schedule, fullQualifiers, groupStageComplete) {
  const qualified = new Set();

  if (groupStageComplete) {
    GROUP_LETTERS.forEach((group) => {
      fullQualifiers.byGroup[group].slice(0, 2).forEach((row) => qualified.add(row.team));
    });
    fullQualifiers.best3RDs.forEach((row) => qualified.add(row.team));
    return qualified;
  }

  GROUP_LETTERS.forEach((group) => {
    const groupTeams = GROUPS[group];
    groupTeams.forEach((teamName) => {
      const row = table[teamName];
      if (row.pts >= 6) {
        qualified.add(teamName);
        return;
      }
      const challengers = groupTeams.filter((otherTeam) => {
        if (otherTeam === teamName) return false;
        const otherRow = table[otherTeam];
        const remaining = schedule.filter((fixture) => !fixture.played && fixture.group === group && (fixture.home === otherTeam || fixture.away === otherTeam)).length;
        return otherRow.pts + remaining * 3 >= row.pts;
      }).length;

      if (row.played > 0 && challengers < 2) qualified.add(teamName);
    });
  });

  return qualified;
}

export function selectActiveGroupFixture({ schedule, selectedGroup, team, opponent }) {
  if (!team || !opponent) return null;
  return schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
    || schedule.find((fixture) => fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
    || null;
}

export function selectCurrentGameFixture({ currentKnockoutMatch, activeGroupFixture }) {
  return currentKnockoutMatch ? toGameFixture(currentKnockoutMatch) : toGameFixture(activeGroupFixture);
}

export function selectSelectedGroupRows({ allGroups, selectedGroup }) {
  return allGroups.find((item) => item.group === selectedGroup)?.rows || [];
}
