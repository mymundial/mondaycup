import {
  applyFixtureResult,
  buildRound32Fixtures,
  completeKnockoutRound,
  completeMatchday,
  didTeamQualify,
  findTeamKnockoutFixture,
  getFixtureOpponent,
  knockoutStageLabel,
} from "./tournament.js";
import {
  resultBelongsToFixture,
  resultFormCode,
  userScoreFromFixtureResult,
} from "./gameFixture.js";
import { RESULT_STATUS, isTerminalResultStatus } from "./resultStatus.js";
import { getUserFinishStatus } from "./podium.js";

function findUpcomingGroupFixture({ schedule = [], selectedGroup, team }) {
  return schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));
}

function buildGoToKnockoutFixturePatch({ fixture, team }) {
  return {
    currentKnockoutMatch: fixture,
    opponent: getFixtureOpponent(team, fixture),
    score: [0, 0],
    matchStage: knockoutStageLabel(fixture.matchNo),
    matchResult: null,
    modalDismissed: false,
    drawer: null,
    screen: "match",
  };
}

function buildGroupCompletePatch(state, result) {
  const { schedule, table, selectedGroup, team, opponent, activeGroupFixture, knockoutFixtures, userForm } = state;
  const match = schedule.find((fixture) => fixture.id === result.fixtureId) || activeGroupFixture;
  if (!match) return null;

  const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : fixture);
  const afterUserTable = applyFixtureResult(table, match, result.homeGoals, result.awayGoals);
  const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
  const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
  const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
  const userScore = userScoreFromFixtureResult(result, team);

  return {
    score: userScore,
    schedule: updatedSchedule,
    table: updatedTable,
    knockoutFixtures: completedGroupStage ? buildRound32Fixtures(updatedTable) : knockoutFixtures,
    modalDismissed: false,
    userForm: [...userForm, resultFormCode(result)].filter(Boolean).slice(-8),
    matchResult: {
      home: match.home,
      away: match.away,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      won: result.userWon,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : (result.isDraw ? RESULT_STATUS.GROUP_DRAW : result.userWon ? RESULT_STATUS.GROUP_WIN : RESULT_STATUS.GROUP_LOSS),
      isDraw: result.isDraw || result.homeGoals === result.awayGoals,
      attempts: result.attempts,
    },
  };
}

function buildKnockoutCompletePatch(state, result) {
  const { currentKnockoutMatch, knockoutFixtures, team, podium, userForm } = state;
  const userPlayedMatch = {
    ...currentKnockoutMatch,
    played: true,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
  };

  const { updatedFixtures, playedUserMatch, nextUserFixture, podium: completedPodium } = completeKnockoutRound({
    fixtures: knockoutFixtures,
    currentMatch: currentKnockoutMatch,
    userTeam: team,
    userResult: userPlayedMatch,
  });

  const userScore = userScoreFromFixtureResult({
    homeTeam: playedUserMatch.home,
    awayTeam: playedUserMatch.away,
    homeGoals: playedUserMatch.homeGoals,
    awayGoals: playedUserMatch.awayGoals,
  }, team);

  const matchNo = playedUserMatch.matchNo;
  const status = getUserFinishStatus({ result, fixture: playedUserMatch, matchNo, userWon: result.userWon });

  return {
    score: userScore,
    knockoutFixtures: updatedFixtures,
    podium: completedPodium || podium,
    modalDismissed: false,
    userForm: [...userForm, resultFormCode(result)].filter(Boolean).slice(-8),
    matchResult: {
      home: playedUserMatch.home,
      away: playedUserMatch.away,
      homeGoals: playedUserMatch.homeGoals,
      awayGoals: playedUserMatch.awayGoals,
      won: result.userWon,
      week: null,
      matchNo,
      status,
      nextFixture: nextUserFixture,
      attempts: result.attempts,
    },
  };
}

function buildQuickWinPatch(state) {
  const { team, opponent, schedule, selectedGroup, table, knockoutFixtures, userForm } = state;
  if (!team || !opponent) return null;
  const match = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)));
  if (!match) return null;

  const homeGoals = match.home === team ? 1 : 0;
  const awayGoals = match.away === team ? 1 : 0;
  const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals, awayGoals } : fixture);
  const afterUserTable = applyFixtureResult(table, match, homeGoals, awayGoals);
  const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
  const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
  const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;

  return {
    score: [1, 0],
    schedule: updatedSchedule,
    table: updatedTable,
    knockoutFixtures: completedGroupStage ? buildRound32Fixtures(updatedTable) : knockoutFixtures,
    modalDismissed: false,
    userForm: [...userForm, "W"].slice(-8),
    matchResult: {
      home: match.home,
      away: match.away,
      homeGoals,
      awayGoals,
      won: true,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : RESULT_STATUS.GROUP_WIN,
      attempts: { user: ["G", "G", "G", "G", "G"], opponent: ["S", "S", "S", "S", "S"] },
    },
  };
}

function buildNextMatchPatch(state) {
  const { team, matchResult, knockoutFixtures, table, schedule, selectedGroup, groupStageComplete, standingsView } = state;
  if (!team || !matchResult) return null;

  if (matchResult.status === RESULT_STATUS.THIRD_PLACE_PENDING) {
    const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => fixture.matchNo === 103 && (fixture.home === team || fixture.away === team));
    if (nextFixture) return buildGoToKnockoutFixturePatch({ fixture: nextFixture, team });
  }

  if (isTerminalResultStatus(matchResult.status)) {
    return { resetTournament: true };
  }

  if (matchResult.status === RESULT_STATUS.QUALIFIED) {
    const round32 = knockoutFixtures.length ? knockoutFixtures : buildRound32Fixtures(table);
    const userFixture = findTeamKnockoutFixture(team, round32);
    if (userFixture) {
      return {
        knockoutFixtures: round32,
        ...buildGoToKnockoutFixturePatch({ fixture: userFixture, team }),
      };
    }
  }

  if (matchResult.status === RESULT_STATUS.KNOCKOUT_WIN) {
    const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => !fixture.played && (fixture.home === team || fixture.away === team));
    if (nextFixture) return buildGoToKnockoutFixturePatch({ fixture: nextFixture, team });
  }

  const upcoming = findUpcomingGroupFixture({ schedule, selectedGroup, team });
  if (upcoming) {
    return {
      matchResult: null,
      modalDismissed: false,
      opponent: upcoming.home === team ? upcoming.away : upcoming.home,
      score: [0, 0],
      currentKnockoutMatch: null,
      matchStage: "GROUP STAGE",
      drawer: null,
      screen: "match",
    };
  }

  return {
    matchResult: null,
    modalDismissed: false,
    fixtureView: groupStageComplete ? "knockout" : "group",
    standingsView: groupStageComplete ? "knockout" : standingsView,
    drawer: "fixtures",
  };
}

export function matchLifecycleReducer(state, action) {
  switch (action.type) {
    case "quick-win":
      return buildQuickWinPatch(state);
    case "complete-match": {
      const { result } = action;
      if (!result || !state.team) return null;
      if (state.currentKnockoutMatch && resultBelongsToFixture(result, state.currentKnockoutMatch)) {
        return buildKnockoutCompletePatch(state, result);
      }
      return buildGroupCompletePatch(state, result);
    }
    case "next-match":
      return buildNextMatchPatch(state);
    case "go-to-knockout-fixture":
      return buildGoToKnockoutFixturePatch({ fixture: action.fixture, team: state.team });
    default:
      return null;
  }
}
