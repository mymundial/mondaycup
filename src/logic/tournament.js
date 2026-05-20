import { GROUPS, GROUP_LETTERS, TEAM_RANK } from "../data/teams.js";
import { MATCHDAY_PAIRINGS, ROUND_OF_32_SLOTS } from "../data/tournament.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const seedPosition = (seed) => Number(seed.slice(0, 1)) - 1;
const seedGroup = (seed) => seed.slice(1, 2);
const isThirdSeed = (seed) => seed.startsWith("3");
const thirdAllowedGroups = (seed) => seed.slice(1).split("");

export const sortRows = (rows) => [...rows].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || 0);

export function buildSchedule() {
  return MATCHDAY_PAIRINGS.flatMap(({ week, pairings }) => GROUP_LETTERS.flatMap((group) => pairings.map(([homeIndex, awayIndex], index) => {
    const teams = GROUPS[group];
    return { id: `${group}-MD${week}-${index + 1}`, group, home: teams[homeIndex], away: teams[awayIndex], week, played: false, homeGoals: null, awayGoals: null };
  })));
}

export function blankTable() {
  const table = {};
  GROUP_LETTERS.forEach((group) => GROUPS[group].forEach((team) => {
    table[team] = { team, group, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }));
  return table;
}

export function buildQualifiers(table) {
  const byGroup = {};
  const thirds = [];
  GROUP_LETTERS.forEach((group) => {
    const rows = sortRows(GROUPS[group].map((team) => table[team]));
    byGroup[group] = rows;
    thirds.push(rows[2]);
  });
  const thirdPlaceRows = sortRows(thirds);
  return { byGroup, thirdPlaceRows, best3RDs: thirdPlaceRows.slice(0, 8) };
}

export function didTeamQualify(team, table) {
  const { byGroup, best3RDs } = buildQualifiers(table);
  return GROUP_LETTERS.some((group) => byGroup[group].slice(0, 2).some((row) => row.team === team)) || best3RDs.some((row) => row.team === team);
}

function resolveSeed(seed, byGroup) {
  const group = seedGroup(seed);
  const row = byGroup[group]?.[seedPosition(seed)];
  return row?.team || seed;
}

function assignThirdPlaceSeeds(slots, best3RDs) {
  const assignments = {};
  const usedGroups = new Set();
  const thirdSlots = slots
    .flatMap((slot) => [slot.homeSeed, slot.awaySeed].filter(isThirdSeed).map((seed) => ({ matchNo: slot.matchNo, seed })))
    .sort((a, b) => thirdAllowedGroups(a.seed).length - thirdAllowedGroups(b.seed).length);

  const trySlot = (index) => {
    if (index >= thirdSlots.length) return true;
    const { seed } = thirdSlots[index];
    const candidates = best3RDs.filter((row) => thirdAllowedGroups(seed).includes(row.group) && !usedGroups.has(row.group));

    for (const candidate of candidates) {
      assignments[seed] = candidate.team;
      usedGroups.add(candidate.group);
      if (trySlot(index + 1)) return true;
      usedGroups.delete(candidate.group);
      delete assignments[seed];
    }
    return false;
  };

  trySlot(0);
  return assignments;
}

export function buildRound32Fixtures(table) {
  const { byGroup, best3RDs } = buildQualifiers(table);
  const thirdAssignments = assignThirdPlaceSeeds(ROUND_OF_32_SLOTS, best3RDs);

  return ROUND_OF_32_SLOTS.map((slot) => {
    const home = isThirdSeed(slot.homeSeed) ? thirdAssignments[slot.homeSeed] : resolveSeed(slot.homeSeed, byGroup);
    const away = isThirdSeed(slot.awaySeed) ? thirdAssignments[slot.awaySeed] : resolveSeed(slot.awaySeed, byGroup);
    return {
      id: `M${slot.matchNo}`,
      matchNo: slot.matchNo,
      home: home || slot.homeSeed,
      away: away || slot.awaySeed,
      homeSeed: slot.homeSeed,
      awaySeed: slot.awaySeed,
      played: false,
      homeGoals: null,
      awayGoals: null,
    };
  });
}

export function buildRound32Placeholders() {
  return ROUND_OF_32_SLOTS.map((slot) => ({
    id: `M${slot.matchNo}`,
    matchNo: slot.matchNo,
    home: slot.homeSeed,
    away: slot.awaySeed,
    homeSeed: slot.homeSeed,
    awaySeed: slot.awaySeed,
    played: false,
    homeGoals: null,
    awayGoals: null,
  }));
}

export function findTeamKnockoutFixture(team, fixtures) {
  return fixtures.find((fixture) => fixture.home === team || fixture.away === team) || null;
}

export function getFixtureOpponent(team, fixture) {
  if (!fixture) return "Opponent";
  return fixture.home === team ? fixture.away : fixture.home;
}

export function applyFixtureResult(tableState, fixture, homeGoals, awayGoals) {
  const next = clone(tableState);
  const home = next[fixture.home];
  const away = next[fixture.away];
  if (!home || !away) return next;
  home.played += 1;
  away.played += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  home.gd = home.gf - home.ga;
  away.gd = away.gf - away.ga;
  if (homeGoals > awayGoals) { home.won += 1; away.lost += 1; home.pts += 3; }
  else if (awayGoals > homeGoals) { away.won += 1; home.lost += 1; away.pts += 3; }
  else { home.drawn += 1; away.drawn += 1; home.pts += 1; away.pts += 1; }
  return next;
}

export function simulateFixtureScore(home, away) {
  const homeRank = TEAM_RANK[home] || 48;
  const awayRank = TEAM_RANK[away] || 48;
  return {
    homeGoals: Math.max(0, Math.round(Math.random() * 2 + (homeRank < awayRank ? 0.7 : 0))),
    awayGoals: Math.max(0, Math.round(Math.random() * 2 + (awayRank < homeRank ? 0.7 : 0))),
  };
}

export function completeMatchday(scheduleState, tableState, week) {
  let updatedSchedule = scheduleState;
  let updatedTable = tableState;
  scheduleState.filter((fixture) => !fixture.played && fixture.week === week).forEach((fixture) => {
    const { homeGoals, awayGoals } = simulateFixtureScore(fixture.home, fixture.away);
    updatedSchedule = updatedSchedule.map((item) => item.id === fixture.id ? { ...item, played: true, homeGoals, awayGoals } : item);
    updatedTable = applyFixtureResult(updatedTable, fixture, homeGoals, awayGoals);
  });
  return { updatedSchedule, updatedTable };
}

export function runSelfTests() {
  const schedule = buildSchedule();
  const table = blankTable();
  const placeholders = buildRound32Placeholders();
  const round32 = buildRound32Fixtures(table);
  console.assert(schedule.length === 72, "Expected 72 group fixtures");
  console.assert(Object.keys(table).length === 48, "Expected 48 teams in table");
  const qualifierTest = buildQualifiers(table);
  console.assert(qualifierTest.best3RDs.length === 8, "Expected 8 best third-place teams");
  console.assert(qualifierTest.thirdPlaceRows.length === 12, "Expected all 12 third-place teams for qualification table");
  console.assert(placeholders.length === 16 && placeholders[0].matchNo === 74 && placeholders[0].home === "1E", "Expected official R32 placeholder order");
  console.assert(round32.length === 16 && round32[0].matchNo === 74, "Expected 16 official round-of-32 fixtures");
  console.assert(didTeamQualify("Mexico", table), "Expected a group top-two team to qualify");
  console.assert(applyFixtureResult(table, schedule[0], 1, 0)[schedule[0].home].pts === 3, "Expected winner to receive 3 points");
}
