export const stageKeyFromMatchNo = (matchNo) => {
  if (matchNo >= 73 && matchNo <= 88) return "round32";
  if (matchNo >= 89 && matchNo <= 96) return "round16";
  if (matchNo >= 97 && matchNo <= 100) return "quarterFinal";
  if (matchNo === 101 || matchNo === 102) return "semiFinal";
  if (matchNo === 103) return "thirdPlace";
  if (matchNo === 104) return "final";
  return "round32";
};

export function toGameFixture(fixture, fallbackStage = "group") {
  if (!fixture) return null;
  const isKnockout = Boolean(fixture.matchNo);
  return {
    id: fixture.id,
    matchNo: fixture.matchNo ?? null,
    stage: isKnockout ? stageKeyFromMatchNo(fixture.matchNo) : fallbackStage,
    homeTeamId: fixture.home,
    awayTeamId: fixture.away,
    allowDraw: !isKnockout,
    requiresWinner: isKnockout,
  };
}

export function resultBelongsToFixture(result, fixture) {
  if (!result || !fixture) return false;
  if (result.fixtureId && fixture.id) return result.fixtureId === fixture.id;
  if (result.matchNo && fixture.matchNo) return result.matchNo === fixture.matchNo;
  return result.homeTeam === fixture.home && result.awayTeam === fixture.away;
}

export function userScoreFromFixtureResult(result, userTeam) {
  const userIsHome = result.homeTeam === userTeam || result.home === userTeam;
  return userIsHome ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals];
}

export function resultFormCode(result) {
  if (!result) return null;
  if (result.isDraw || result.homeGoals === result.awayGoals) return "D";
  return result.userWon || result.won ? "W" : "L";
}
