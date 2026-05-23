import { useEffect, useMemo, useReducer, useState } from "react";
import { buildQualifiers } from "../logic/tournament.js";
import { matchLifecycleReducer } from "../logic/matchLifecycleReducer.js";
import { selectScheduleFocus } from "../logic/schedulePositioningSelectors.js";
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
import { clearSavedCampaign, loadCampaignState, loadCampaignSummary, saveCampaignState } from "../logic/campaignStorage.js";

function clearSavedMatchState() {
  if (typeof window === "undefined") return;
  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("mondaycup-match-state:"))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export function useTournamentController() {
  const [state, dispatch] = useReducer(tournamentReducer, undefined, createInitialTournamentState);
  const [savedCampaign, setSavedCampaign] = useState(() => loadCampaignSummary());
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
    campaignId,
  } = flattenTournamentState(state);

  useEffect(() => {
    if (!state.campaign.team) return;
    saveCampaignState(state);
    setSavedCampaign(loadCampaignSummary());
  }, [state]);

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

  const scheduleFocus = selectScheduleFocus({
    matchResult,
    currentKnockoutMatch,
    activeGroupFixture,
    schedule,
    selectedGroup,
    team,
    groupStageComplete,
  });

  const closeMenu = () => patch({ menuOpen: false });
  const openMatch = () => patch({ menuOpen: false, drawer: null });
  const openFixtures = () => {
    patch({ menuOpen: false, fixtureView: scheduleFocus.view, drawer: "fixtures" });
  };
  const openGroups = () => patch({ menuOpen: false, standingsView: groupStageComplete ? "knockout" : standingsView, drawer: "groups" });

  const resetTournament = () => {
    clearSavedMatchState();
    clearSavedCampaign();
    dispatch(tournamentActions.reset());
    setSavedCampaign(null);
  };

  const openHostSelect = () => patch({ screen: "hosts", drawer: null, menuOpen: false });

  const newCampaign = () => {
    clearSavedMatchState();
    clearSavedCampaign();
    dispatch(tournamentActions.resetToHostSelect());
    setSavedCampaign(null);
  };

  const playAsGuest = () => openHostSelect();

  const continueCampaign = () => {
    const saved = loadCampaignState();
    if (!saved) {
      setSavedCampaign(null);
      return;
    }
    dispatch(tournamentActions.hydrate(saved));
    setSavedCampaign(loadCampaignSummary());
  };

  const selectGroup = (group) => patch({ selectedGroup: group, screen: "teams" });

  const startTeam = (name, groupOverride = selectedGroup) => {
    clearSavedMatchState();
    clearSavedCampaign();
    const fixture = schedule.find((item) => !item.played && item.group === groupOverride && (item.home === name || item.away === name))
      || schedule.find((item) => item.group === groupOverride && (item.home === name || item.away === name));

    patch({
      selectedGroup: groupOverride,
      campaignId: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  const lifecycleState = {
    schedule,
    table,
    selectedGroup,
    team,
    opponent,
    knockoutFixtures,
    currentKnockoutMatch,
    activeGroupFixture,
    podium,
    userForm,
    matchResult,
    groupStageComplete,
    standingsView,
  };

  const applyLifecycleAction = (action) => {
    const lifecyclePatch = matchLifecycleReducer(lifecycleState, action);
    if (!lifecyclePatch) return;
    if (lifecyclePatch.resetTournament) {
      resetTournament();
      return;
    }
    patch(lifecyclePatch);
  };

  const quickWin = () => applyLifecycleAction({ type: "quick-win" });

  const handleMatchComplete = (result) => applyLifecycleAction({ type: "complete-match", result });

  const nextMatch = () => applyLifecycleAction({ type: "next-match" });

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
    campaignId,
    podium,
    scheduleFocus,
    savedCampaign,
    menuProps,
    selectGroup,
    startTeam,
    continueCampaign,
    newCampaign,
    playAsGuest,
    setSelectedGroup: (group) => patch({ selectedGroup: group }),
    setFixtureView: (view) => patch({ fixtureView: view }),
    setStandingsView: (view) => patch({ standingsView: view }),
    dismissModal: () => patch({ modalDismissed: true }),
    quickWin,
    handleMatchComplete,
    nextMatch,
  };
}
