import { useMemo, useReducer } from "react";
import {
  applyFixtureResult,
  buildQualifiers,
  buildRound32Fixtures,
  completeKnockoutRound,
  completeMatchday,
  didTeamQualify,
  findTeamKnockoutFixture,
  getFixtureOpponent,
  knockoutStageLabel,
} from "../logic/tournament.js";
import {
  resultBelongsToFixture,
  resultFormCode,
  userScoreFromFixtureResult,
} from "../logic/gameFixture.js";
import {
  calculateEarlyQualifiedTeams,
  isGroupStageComplete,
  selectActiveGroupFixture,
  selectAllGroups,
  selectCurrentGameFixture,
  selectSelectedGroupRows,
  selectVisibleKnockoutFixtures,
} from "../logic/tournamentSelectors.js";
import { createInitialTournamentState, flattenTournamentState, tournamentActions, tournamentReducer } from "../store/tournamentStore.js";

function clearSavedMatchState() {
  if (typeof window === "undefined") return;
  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("mondaycup-match-state:"))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export function useTournamentController() {
  const [state, dispatch] = useReducer(tournamentReducer, undefined, createInitialTournamentState);
  const patch = (updates) => dispatch(tournamentActions.patch(updates));

  const {
    screen,
    drawer,
    menuOpen,
    fixtureView,
    standingsView,
    selectedGroup,
    team,
    opponent,
    score,
    matchResult,
    modalDismissed,
    table,
    schedule,
    knockoutFixtures,
    currentKnockoutMatch,
    podium,
    matchStage,
    userForm,
  } = flattenTournamentState(state);

  const groupStageComplete = isGroupStageComplete(schedule);
  const visibleKnockoutFixtures = selectVisibleKnockoutFixtures({ schedule, knockoutFixtures, table });

  const allGroups = useMemo(() => selectAllGroups(table), [table]);
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(
    () => calculateEarlyQualifiedTeams(table, schedule, qualifiers, groupStageComplete),
    [table, schedule, qualifiers, groupStageComplete],
  );

  const activeGroupFixture = useMemo(
    () => selectActiveGroupFixture({ schedule, selectedGroup, team, opponent }),
    [schedule, selectedGroup, team, opponent],
  );

  const currentFixture = selectCurrentGameFixture({ currentKnockoutMatch, activeGroupFixture });
  const selectedGroupRows = selectSelectedGroupRows({ allGroups, selectedGroup });

  const closeMenu = () => patch({ menuOpen: false });
  const openMatch = () => patch({ menuOpen: false, drawer: null });
  const openFixtures = () => patch({ menuOpen: false, fixtureView: groupStageComplete ? "knockout" : "group", drawer: "fixtures" });
  const openGroups = () => patch({ menuOpen: false, standingsView: groupStageComplete ? "knockout" : standingsView, drawer: "groups" });

  const resetTournament = () => {
    clearSavedMatchState();
    dispatch(tournamentActions.reset());
  };

  const selectGroup = (group) => patch({ selectedGroup: group, screen: "teams" });

  const startTeam = (name, groupOverride = selectedGroup) => {
    const fixture = schedule.find((item) => !item.played && item.group === groupOverride && (item.home === name || item.away === name))
      || schedule.find((item) => item.group === groupOverride && (item.home === name || item.away === name));

    patch({
      selectedGroup: groupOverride,
      team: name,
      opponent: fixture?.home === name ? fixture.away : fixture?.home || "Opponent",
      screen: "match",
      drawer: null,
      menuOpen: false,
      score: [0, 0],
      currentKnockoutMatch: null,
      matchStage: "GROUP STAGE",
      matchResult: null,
      modalDismissed: false,
    });
  };

  const quickWin = () => {
    if (!team || !opponent) return;
    const match = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)));
    if (!match) return;

    const homeGoals = match.home === team ? 1 : 0;
    const awayGoals = match.away === team ? 1 : 0;
    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals, awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, homeGoals, awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;

    patch({
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
        status: completedGroupStage ? (qualified ? "qualified" : "eliminated") : "groupWin",
        attempts: { user: ["G", "G", "G", "G", "G"], opponent: ["S", "S", "S", "S", "S"] },
      },
    });
  };

  const handleKnockoutComplete = (result) => {
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
    const lostSemiFinal = !result.userWon && (matchNo === 101 || matchNo === 102);
    let status = "eliminated";
    if (matchNo === 103) status = result.userWon ? "third" : "fourth";
    else if (matchNo === 104) status = result.userWon ? "champion" : "runnerUp";
    else if (result.userWon) status = "knockoutWin";
    else if (lostSemiFinal) status = "thirdPlace";

    patch({
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
    });
  };

  const handleGroupComplete = (result) => {
    const match = schedule.find((fixture) => fixture.id === result.fixtureId) || activeGroupFixture;
    if (!match) return;

    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, result.homeGoals, result.awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
    const userScore = userScoreFromFixtureResult(result, team);

    patch({
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
        status: completedGroupStage ? (qualified ? "qualified" : "eliminated") : (result.isDraw ? "groupDraw" : result.userWon ? "groupWin" : "groupLoss"),
        isDraw: result.isDraw || result.homeGoals === result.awayGoals,
        attempts: result.attempts,
      },
    });
  };

  const handleMatchComplete = (result) => {
    if (!result || !team) return;
    if (currentKnockoutMatch && resultBelongsToFixture(result, currentKnockoutMatch)) {
      handleKnockoutComplete(result);
      return;
    }
    handleGroupComplete(result);
  };

  const goToKnockoutFixture = (fixture) => {
    patch({
      currentKnockoutMatch: fixture,
      opponent: getFixtureOpponent(team, fixture),
      score: [0, 0],
      matchStage: knockoutStageLabel(fixture.matchNo),
      matchResult: null,
      modalDismissed: false,
      drawer: null,
      screen: "match",
    });
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;

    if (matchResult.status === "thirdPlace") {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => fixture.matchNo === 103 && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        goToKnockoutFixture(nextFixture);
        return;
      }
    }

    if (["champion", "runnerUp", "eliminated", "third", "fourth"].includes(matchResult.status)) {
      resetTournament();
      return;
    }

    if (matchResult.status === "qualified") {
      const round32 = knockoutFixtures.length ? knockoutFixtures : buildRound32Fixtures(table);
      const userFixture = findTeamKnockoutFixture(team, round32);
      if (userFixture) {
        patch({ knockoutFixtures: round32 });
        goToKnockoutFixture(userFixture);
        return;
      }
    }

    if (matchResult.status === "knockoutWin") {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => !fixture.played && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        goToKnockoutFixture(nextFixture);
        return;
      }
    }

    const upcoming = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));

    if (upcoming) {
      patch({
        matchResult: null,
        modalDismissed: false,
        opponent: upcoming.home === team ? upcoming.away : upcoming.home,
        score: [0, 0],
        currentKnockoutMatch: null,
        matchStage: "GROUP STAGE",
        drawer: null,
        screen: "match",
      });
    } else {
      patch({
        matchResult: null,
        modalDismissed: false,
        fixtureView: groupStageComplete ? "knockout" : "group",
        standingsView: groupStageComplete ? "knockout" : standingsView,
        drawer: "fixtures",
      });
    }
  };

  const menuProps = {
    menuOpen,
    onToggleMenu: () => dispatch(tournamentActions.toggleMenu()),
    onMatch: openMatch,
    onFixtures: openFixtures,
    onGroups: openGroups,
    onRestart: resetTournament,
  };

  return {
    screen,
    drawer,
    selectedGroup,
    fixtureView,
    standingsView,
    schedule,
    visibleKnockoutFixtures,
    allGroups,
    qualifiers,
    qualifiedTeams,
    team,
    opponent,
    score,
    matchResult,
    modalDismissed,
    matchStage,
    currentFixture,
    selectedGroupRows,
    userForm,
    podium,
    menuProps,
    selectGroup,
    startTeam,
    setSelectedGroup: (group) => patch({ selectedGroup: group }),
    setFixtureView: (view) => patch({ fixtureView: view }),
    setStandingsView: (view) => patch({ standingsView: view }),
    dismissModal: () => patch({ modalDismissed: true }),
    quickWin,
    handleMatchComplete,
    nextMatch,
  };
}
