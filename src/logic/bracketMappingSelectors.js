import { KNOCKOUT_PLACEHOLDER_SLOTS } from "../data/tournament.js";
import { buildRound32Placeholders } from "./tournament.js";

export const isRealBracketTeam = (value) => value && value !== "TBC" && !/^[123][A-L]+$/.test(String(value)) && !/^(W|RU)\d+$/.test(String(value));

export function buildPlaceholderFixtures(label) {
  return (KNOCKOUT_PLACEHOLDER_SLOTS[label] || []).map((slot) => ({
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

export function mergeByMatchNo(placeholders = [], fixtures = []) {
  return placeholders.map((placeholder) => {
    const actual = fixtures.find((fixture) => fixture.matchNo === placeholder.matchNo);
    return actual ? { ...placeholder, ...actual } : placeholder;
  });
}

export function winnerOf(fixture) {
  if (!fixture?.played) return null;
  if (fixture.homeGoals > fixture.awayGoals) return fixture.home;
  if (fixture.awayGoals > fixture.homeGoals) return fixture.away;
  return null;
}

export function runnerUpOf(fixture) {
  if (!fixture?.played) return null;
  if (fixture.homeGoals > fixture.awayGoals) return fixture.away;
  if (fixture.awayGoals > fixture.homeGoals) return fixture.home;
  return null;
}

export function selectBracketModel({ knockoutFixtures = [], podium = {} }) {
  const r32 = mergeByMatchNo(buildRound32Placeholders(), knockoutFixtures);
  const r16 = mergeByMatchNo(buildPlaceholderFixtures("Round of 16"), knockoutFixtures);
  const qf = mergeByMatchNo(buildPlaceholderFixtures("Quarter-finals"), knockoutFixtures);
  const sf = mergeByMatchNo(buildPlaceholderFixtures("Semi-finals"), knockoutFixtures);
  const final = mergeByMatchNo(buildPlaceholderFixtures("Final"), knockoutFixtures);
  const third = mergeByMatchNo(buildPlaceholderFixtures("3RD PLACE PLAY-OFF"), knockoutFixtures);
  const finalFixture = final[0];
  const thirdFixture = third[0];

  return {
    r32,
    r16,
    qf,
    sf,
    final,
    third,
    finalFixture,
    thirdFixture,
    winner: podium.winner || winnerOf(finalFixture),
    runnerUp: podium.runnerUp || runnerUpOf(finalFixture),
    thirdPlace: podium.third || winnerOf(thirdFixture),
  };
}

const BRACKET_SIDE_BY_MATCH_NO = {
  // Visual top half
  74: "top",
  77: "top",
  73: "top",
  75: "top",
  83: "top",
  84: "top",
  81: "top",
  82: "top",
  89: "top",
  90: "top",
  93: "top",
  94: "top",
  97: "top",
  98: "top",
  101: "top",

  // Visual bottom half
  76: "bottom",
  78: "bottom",
  79: "bottom",
  80: "bottom",
  86: "bottom",
  88: "bottom",
  85: "bottom",
  87: "bottom",
  91: "bottom",
  92: "bottom",
  95: "bottom",
  96: "bottom",
  99: "bottom",
  100: "bottom",
  102: "bottom",
};

export function selectBracketSideForTeam(fixtures = [], userTeam = null) {
  if (!userTeam) return "top";

  const userFixtures = fixtures
    .filter((item) => item?.matchNo && (item.home === userTeam || item.away === userTeam))
    .sort((a, b) => (b.matchNo || 0) - (a.matchNo || 0));

  const sideFixture = userFixtures.find((fixture) => BRACKET_SIDE_BY_MATCH_NO[fixture.matchNo]);
  return sideFixture ? BRACKET_SIDE_BY_MATCH_NO[sideFixture.matchNo] : "top";
}

export function selectUserGroup(allGroups = [], userTeam = null) {
  return allGroups.find(({ rows }) => rows.some((row) => row.team === userTeam))?.group || null;
}
