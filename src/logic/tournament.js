import { GROUPS, GROUP_LETTERS, TEAM_RANK } from "../data/teams.js";
import { MATCHDAY_PAIRINGS } from "../data/tournament.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

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
  return { byGroup, best3RDs: sortRows(thirds).slice(0, 8) };
}

export function didTeamQualify(team, table) {
  const { byGroup, best3RDs } = buildQualifiers(table);
  return GROUP_LETTERS.some((group) => byGroup[group].slice(0, 2).some((row) => row.team === team)) || best3RDs.some((row) => row.team === team);
}

export function buildRound32Fixtures(table) {
  const { byGroup, best3RDs } = buildQualifiers(table);
  const teams = GROUP_LETTERS.flatMap((group) => byGroup[group].slice(0, 2).map((row) => row.team)).concat(best3RDs.map((row) => row.team));
  return Array.from({ length: 16 }, (_, index) => ({ id: `M${73 + index}`, matchNo: 73 + index, home: teams[index * 2] || "TBC", away: teams[index * 2 + 1] || "TBC", played: false, homeGoals: null, awayGoals: null }));
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
  if (homeGoals > awayGoals) {
    home.won += 1;
    away.lost += 1;
    home.pts += 3;
  } else if (awayGoals > homeGoals) {
    away.won += 1;
    home.lost += 1;
    away.pts += 3;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.pts += 1;
    away.pts += 1;
  }
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
  console.assert(schedule.length === 72, "Expected 72 group fixtures");
  console.assert(Object.keys(table).length === 48, "Expected 48 teams in table");
  console.assert(buildQualifiers(table).best3RDs.length === 8, "Expected 8 best third-place teams");
  console.assert(buildRound32Fixtures(table).length === 16, "Expected 16 round-of-32 fixtures");
  console.assert(didTeamQualify("Mexico", table), "Expected a group top-two team to qualify");
  console.assert(applyFixtureResult(table, schedule[0], 1, 0)[schedule[0].home].pts === 3, "Expected winner to receive 3 points");
}
