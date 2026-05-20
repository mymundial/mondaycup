import { GROUPS, GROUP_LETTERS, TEAM_RANK } from "../data/teams.js";
import { MATCHDAY_PAIRINGS, ROUND_OF_32_SLOTS, KNOCKOUT_PLACEHOLDER_SLOTS } from "../data/tournament.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const seedPosition = (seed) => Number(seed.slice(0, 1)) - 1;
const seedGroup = (seed) => seed.slice(1, 2);
const isThirdSeed = (seed) => seed.startsWith("3");
const thirdAllowedGroups = (seed) => seed.slice(1).split("");
const isRealTeam = (value) => Boolean(value && TEAM_RANK[value]);

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

const ROUND_SLOTS = {
  "ROUND OF 32": ROUND_OF_32_SLOTS,
  "ROUND OF 16": KNOCKOUT_PLACEHOLDER_SLOTS["Round of 16"],
  "QUARTER-FINAL": KNOCKOUT_PLACEHOLDER_SLOTS["Quarter-finals"],
  "SEMI-FINAL": KNOCKOUT_PLACEHOLDER_SLOTS["Semi-finals"],
  "3RD PLACE PLAY-OFF": KNOCKOUT_PLACEHOLDER_SLOTS["3RD PLACE PLAY-OFF"],
  FINAL: KNOCKOUT_PLACEHOLDER_SLOTS.Final,
};

const ROUND_ORDER = ["ROUND OF 32", "ROUND OF 16", "QUARTER-FINAL", "SEMI-FINAL", "FINAL"];
const knockoutSlots = Object.values(ROUND_SLOTS).flat();

function fixtureWinner(fixture) {
  if (!fixture?.played) return null;
  if (fixture.homeGoals > fixture.awayGoals) return fixture.home;
  if (fixture.awayGoals > fixture.homeGoals) return fixture.away;
  return null;
}

function fixtureRunnerUp(fixture) {
  if (!fixture?.played) return null;
  if (fixture.homeGoals > fixture.awayGoals) return fixture.away;
  if (fixture.awayGoals > fixture.homeGoals) return fixture.home;
  return null;
}

function resolveKnockoutSeed(seed, fixtures) {
  if (!seed) return null;
  if (isRealTeam(seed)) return seed;
  const winnerMatch = String(seed).match(/^W(\d+)$/);
  if (winnerMatch) return fixtureWinner(fixtures.find((fixture) => fixture.matchNo === Number(winnerMatch[1])));
  const runnerUpMatch = String(seed).match(/^RU(\d+)$/);
  if (runnerUpMatch) return fixtureRunnerUp(fixtures.find((fixture) => fixture.matchNo === Number(runnerUpMatch[1])));
  return null;
}

function chooseFallbackKnockoutOpponent(fixtures, userTeam) {
  const usedTeams = new Set([userTeam]);
  fixtures.forEach((fixture) => {
    if (isRealTeam(fixture.home)) usedTeams.add(fixture.home);
    if (isRealTeam(fixture.away)) usedTeams.add(fixture.away);
  });
  return Object.keys(TEAM_RANK)
    .filter((candidate) => !usedTeams.has(candidate))
    .sort((a, b) => (TEAM_RANK[a] || 99) - (TEAM_RANK[b] || 99))[0] || "Opponent";
}

function roundNameForMatchNo(matchNo) {
  if (matchNo >= 73 && matchNo <= 88) return "ROUND OF 32";
  if (matchNo >= 89 && matchNo <= 96) return "ROUND OF 16";
  if (matchNo >= 97 && matchNo <= 100) return "QUARTER-FINAL";
  if (matchNo === 101 || matchNo === 102) return "SEMI-FINAL";
  if (matchNo === 104) return "FINAL";
  return "KNOCKOUT";
}

export function knockoutStageLabel(matchNo) {
  return roundNameForMatchNo(matchNo);
}

function nextRoundName(roundName) {
  const index = ROUND_ORDER.indexOf(roundName);
  return index >= 0 ? ROUND_ORDER[index + 1] || null : null;
}

function replaceFixtures(fixtures, replacements) {
  const byMatchNo = new Map(fixtures.map((fixture) => [fixture.matchNo, fixture]));
  replacements.forEach((fixture) => byMatchNo.set(fixture.matchNo, fixture));
  return Array.from(byMatchNo.values()).sort((a, b) => a.matchNo - b.matchNo);
}

function fixtureFromSlot(slot, fixtures) {
  const existing = fixtures.find((fixture) => fixture.matchNo === slot.matchNo);
  if (existing && isRealTeam(existing.home) && isRealTeam(existing.away)) return existing;

  const home = resolveKnockoutSeed(slot.homeSeed, fixtures) || existing?.home || slot.homeSeed;
  const away = resolveKnockoutSeed(slot.awaySeed, fixtures) || existing?.away || slot.awaySeed;
  return {
    id: `M${slot.matchNo}`,
    matchNo: slot.matchNo,
    home,
    away,
    homeSeed: slot.homeSeed,
    awaySeed: slot.awaySeed,
    played: existing?.played || false,
    homeGoals: existing?.homeGoals ?? null,
    awayGoals: existing?.awayGoals ?? null,
  };
}

function simulateKnockoutFixture(fixture) {
  if (fixture.played) return fixture;
  const homeRank = TEAM_RANK[fixture.home] || 99;
  const awayRank = TEAM_RANK[fixture.away] || 99;
  const homeWins = homeRank <= awayRank;
  return { ...fixture, played: true, homeGoals: homeWins ? 1 : 0, awayGoals: homeWins ? 0 : 1 };
}

function bronzeTeamFromThirdPlacePlayoff(fixtures) {
  return fixtureWinner(fixtures.find((fixture) => fixture.matchNo === 103));
}

function buildThirdPlacePlayoff(fixtures) {
  return fixtureFromSlot(KNOCKOUT_PLACEHOLDER_SLOTS["3RD PLACE PLAY-OFF"][0], fixtures);
}

function buildFinalFixture(fixtures) {
  return fixtureFromSlot(KNOCKOUT_PLACEHOLDER_SLOTS.Final[0], fixtures);
}

export function createNextKnockoutFixture({ previousMatchNo, team, fixtures }) {
  const roundName = roundNameForMatchNo(previousMatchNo);
  const nextRound = nextRoundName(roundName);
  if (!nextRound) return null;

  const nextSlots = ROUND_SLOTS[nextRound] || [];
  const winnerSeed = `W${previousMatchNo}`;
  const slot = nextSlots.find((candidate) => candidate.homeSeed === winnerSeed || candidate.awaySeed === winnerSeed);
  if (!slot) return null;

  const existing = fixtures.find((fixture) => fixture.matchNo === slot.matchNo && (fixture.home === team || fixture.away === team));
  if (existing) return existing;

  const generated = fixtureFromSlot(slot, fixtures);
  if (generated.home === team || generated.away === team) return generated;

  const userIsHome = slot.homeSeed === winnerSeed;
  const opponentSeed = userIsHome ? slot.awaySeed : slot.homeSeed;
  const opponent = resolveKnockoutSeed(opponentSeed, fixtures) || chooseFallbackKnockoutOpponent(fixtures, team);
  return {
    ...generated,
    home: userIsHome ? team : opponent,
    away: userIsHome ? opponent : team,
    played: false,
    homeGoals: null,
    awayGoals: null,
  };
}

export function completeKnockoutRound({ fixtures, currentMatch, userTeam, playedResult = null }) {
  const roundName = roundNameForMatchNo(currentMatch.matchNo);
  const currentSlots = ROUND_SLOTS[roundName] || [];
  const homeGoals = playedResult ? playedResult.homeGoals : currentMatch.home === userTeam ? 1 : 0;
  const awayGoals = playedResult ? playedResult.awayGoals : currentMatch.away === userTeam ? 1 : 0;
  const playedUserMatch = { ...currentMatch, played: true, homeGoals, awayGoals };
  let workingFixtures = replaceFixtures(fixtures, [playedUserMatch]);

  const completedRoundFixtures = currentSlots.map((slot) => {
    const fixture = fixtureFromSlot(slot, workingFixtures);
    if (fixture.matchNo === playedUserMatch.matchNo) return playedUserMatch;
    return simulateKnockoutFixture(fixture);
  });

  workingFixtures = replaceFixtures(workingFixtures, completedRoundFixtures);

  let nextRoundFixtures = [];
  const nextRound = nextRoundName(roundName);

  if (roundName === "SEMI-FINAL") {
    nextRoundFixtures = [buildThirdPlacePlayoff(workingFixtures), buildFinalFixture(workingFixtures)];
  } else if (roundName === "FINAL") {
    const thirdPlaceFixture = simulateKnockoutFixture(buildThirdPlacePlayoff(workingFixtures));
    workingFixtures = replaceFixtures(workingFixtures, [thirdPlaceFixture]);
  } else {
    nextRoundFixtures = nextRound ? (ROUND_SLOTS[nextRound] || []).map((slot) => fixtureFromSlot(slot, workingFixtures)) : [];
  }

  const updatedFixtures = replaceFixtures(workingFixtures, nextRoundFixtures);
  const nextUserFixture = nextRoundFixtures.find((fixture) => fixture.home === userTeam || fixture.away === userTeam) || null;
  const finalFixture = updatedFixtures.find((fixture) => fixture.matchNo === 104);
  const podium = finalFixture?.played ? {
    winner: fixtureWinner(finalFixture),
    runnerUp: fixtureRunnerUp(finalFixture),
    third: bronzeTeamFromThirdPlacePlayoff(updatedFixtures),
  } : null;

  return { updatedFixtures, playedUserMatch, nextUserFixture, podium };
}

export function mergeKnockoutFixtures(slots, fixtures) {
  return slots.map((slot) => fixtureFromSlot(slot, fixtures));
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
  console.assert(knockoutStageLabel(104) === "FINAL", "Expected final stage label without match number");
  const testNext = createNextKnockoutFixture({ previousMatchNo: 74, team: "Mexico", fixtures: [{ matchNo: 74, home: "Mexico", away: "Qatar", played: true, homeGoals: 1, awayGoals: 0 }] });
  console.assert(testNext?.matchNo === 89, "Expected M74 winner to progress to M89");
  const testComplete = completeKnockoutRound({ fixtures: round32, currentMatch: round32[0], userTeam: round32[0].home });
  console.assert(testComplete.updatedFixtures.some((fixture) => fixture.matchNo === 89), "Expected R16 fixtures after completing R32");
  const semiFixtures = [
    { matchNo: 101, home: "Spain", away: "France", played: false, homeGoals: null, awayGoals: null },
    { matchNo: 102, home: "Argentina", away: "Brazil", played: false, homeGoals: null, awayGoals: null },
  ];
  const semiComplete = completeKnockoutRound({ fixtures: semiFixtures, currentMatch: semiFixtures[0], userTeam: "Spain" });
  console.assert(semiComplete.updatedFixtures.some((fixture) => fixture.matchNo === 103), "Expected third-place play-off fixture after semi-finals");
  const finalFixture = semiComplete.updatedFixtures.find((fixture) => fixture.matchNo === 104);
  const finalComplete = completeKnockoutRound({ fixtures: semiComplete.updatedFixtures, currentMatch: finalFixture, userTeam: "Spain" });
  console.assert(finalComplete.updatedFixtures.find((fixture) => fixture.matchNo === 103)?.played, "Expected third-place play-off to be played when final is completed");
  console.assert(finalComplete.podium?.third, "Expected bronze team to come from M103 winner");
}
