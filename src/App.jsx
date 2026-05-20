import { useMemo, useState } from "react";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import {
  buildSchedule,
  blankTable,
  buildQualifiers,
  buildRound32Fixtures,
  sortRows,
  applyFixtureResult,
  completeMatchday,
  didTeamQualify,
  findTeamKnockoutFixture,
  getFixtureOpponent,
  completeKnockoutRound,
  knockoutStageLabel,
  runSelfTests,
} from "./logic/tournament.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { HomeScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";

runSelfTests();

const stageFromMatchNo = (matchNo) => {
  if (matchNo >= 73 && matchNo <= 88) return "round32";
  if (matchNo >= 89 && matchNo <= 96) return "round16";
  if (matchNo >= 97 && matchNo <= 100) return "quarterFinal";
  if (matchNo === 101 || matchNo === 102) return "semiFinal";
  if (matchNo === 103) return "thirdPlace";
  if (matchNo === 104) return "final";
  return "round32";
};

function userScoreFromFixtureResult(result, userTeam) {
  const userIsHome = result.homeTeam === userTeam;
  return userIsHome ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals];
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [drawer, setDrawer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fixtureView, setFixtureView] = useState("group");
  const [standingsView, setStandingsView] = useState("group");
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [team, setTeam] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState([0, 0]);
  const [matchResult, setMatchResult] = useState(null);
  const [table, setTable] = useState(blankTable());
  const [schedule, setSchedule] = useState(buildSchedule());
  const [knockoutFixtures, setKnockoutFixtures] = useState([]);
  const [currentKnockoutMatch, setCurrentKnockoutMatch] = useState(null);
  const [matchStage, setMatchStage] = useState("GROUP STAGE");
  const [podium, setPodium] = useState({});

  const groupStageComplete = schedule.every((fixture) => fixture.played);
  const visibleKnockoutFixtures = groupStageComplete && !knockoutFixtures.length ? buildRound32Fixtures(table) : knockoutFixtures;
  const allGroups = useMemo(() => GROUP_LETTERS.map((group) => ({ group, rows: sortRows(GROUPS[group].map((name) => table[name])) })), [table]);
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(() => {
    if (!groupStageComplete) return new Set();
    const teams = GROUP_LETTERS.flatMap((group) => qualifiers.byGroup[group].slice(0, 2).map((row) => row.team)).concat(qualifiers.best3RDs.map((row) => row.team));
    return new Set(teams);
  }, [groupStageComplete, qualifiers]);

  const currentGroupFixture = useMemo(() => {
    if (!team || !opponent || currentKnockoutMatch) return null;
    return schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team))) || null;
  }, [currentKnockoutMatch, opponent, schedule, selectedGroup, team]);

  const currentFixture = currentKnockoutMatch
    ? {
        id: currentKnockoutMatch.id || `M${currentKnockoutMatch.matchNo}`,
        matchNo: currentKnockoutMatch.matchNo ?? null,
        stage: stageFromMatchNo(currentKnockoutMatch.matchNo),
        homeTeamId: currentKnockoutMatch.home,
        awayTeamId: currentKnockoutMatch.away,
        allowDraw: false,
        requiresWinner: true,
      }
    : currentGroupFixture
      ? {
          id: currentGroupFixture.id,
          matchNo: null,
          stage: "group",
          homeTeamId: currentGroupFixture.home,
          awayTeamId: currentGroupFixture.away,
          allowDraw: true,
          requiresWinner: false,
        }
      : matchResult?.fixtureId
        ? {
            id: matchResult.fixtureId,
            matchNo: null,
            stage: "group",
            homeTeamId: matchResult.home,
            awayTeamId: matchResult.away,
            allowDraw: true,
            requiresWinner: false,
          }
        : null;

  const closeMenu = () => setMenuOpen(false);
  const resetTournament = () => {
    setScreen("home");
    setDrawer(null);
    setMenuOpen(false);
    setFixtureView("group");
    setStandingsView("group");
    setSelectedGroup("A");
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    setTable(blankTable());
    setSchedule(buildSchedule());
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setMatchStage("GROUP STAGE");
    setPodium({});
  };
  const openMatch = () => { closeMenu(); setDrawer(null); };
  const openFixtures = () => { closeMenu(); setFixtureView(groupStageComplete ? "knockout" : "group"); setDrawer("fixtures"); };
  const openGroups = () => { closeMenu(); setStandingsView(groupStageComplete ? "knockout" : standingsView); setDrawer("groups"); };
  const selectGroup = (group) => { setSelectedGroup(group); setScreen("teams"); };

  const startTeam = (name, groupOverride = selectedGroup) => {
    const fixture = schedule.find((item) => !item.played && item.group === groupOverride && (item.home === name || item.away === name)) || schedule.find((item) => item.group === groupOverride && (item.home === name || item.away === name));
    setSelectedGroup(groupOverride);
    setTeam(name);
    setOpponent(fixture?.home === name ? fixture.away : fixture?.home || "Opponent");
    setScreen("match");
    setDrawer(null);
    setMenuOpen(false);
    setScore([0, 0]);
    setCurrentKnockoutMatch(null);
    setMatchStage("GROUP STAGE");
    setMatchResult(null);
  };

  const handleMatchComplete = (result) => {
    if (!team || !opponent || !result) return;

    setScore(userScoreFromFixtureResult(result, team));

    if (currentKnockoutMatch) {
      const { updatedFixtures, playedUserMatch, podium: completedPodium } = completeKnockoutRound({
        fixtures: knockoutFixtures,
        currentMatch: currentKnockoutMatch,
        userTeam: team,
        playedResult: result,
      });

      setKnockoutFixtures(updatedFixtures);
      if (completedPodium) setPodium(completedPodium);
      setMatchResult({
        home: playedUserMatch.home,
        away: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
        won: result.userWon,
        isDraw: result.isDraw,
        week: null,
        matchNo: playedUserMatch.matchNo,
        status: result.userWon ? (playedUserMatch.matchNo === 104 ? "champion" : "knockoutWin") : "eliminated",
      });
      return;
    }

    const match = schedule.find((fixture) => fixture.id === result.fixtureId) || currentGroupFixture;
    if (!match) return;

    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, result.homeGoals, result.awayGoals);

    if (match.week === 3) {
      const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, 3);
      const qualified = didTeamQualify(team, updatedTable);
      setSchedule(updatedSchedule);
      setTable(updatedTable);
      setKnockoutFixtures(buildRound32Fixtures(updatedTable));
      setMatchResult({ fixtureId: match.id, home: match.home, away: match.away, homeGoals: result.homeGoals, awayGoals: result.awayGoals, won: result.userWon, isDraw: result.isDraw, week: match.week, status: qualified ? "qualified" : "eliminated" });
      return;
    }

    setSchedule(afterUserSchedule);
    setTable(afterUserTable);
    setMatchResult({ fixtureId: match.id, home: match.home, away: match.away, homeGoals: result.homeGoals, awayGoals: result.awayGoals, won: result.userWon, isDraw: result.isDraw, week: match.week });
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;
    if (matchResult.status === "eliminated") { resetTournament(); return; }
    if (matchResult.status === "champion") {
      setCurrentKnockoutMatch(null);
      setStandingsView("knockout");
      setDrawer("groups");
      setMatchResult(null);
      return;
    }

    if (matchResult.status === "qualified") {
      const round32 = knockoutFixtures.length ? knockoutFixtures : buildRound32Fixtures(table);
      const userFixture = findTeamKnockoutFixture(team, round32);
      if (userFixture) {
        setKnockoutFixtures(round32);
        setCurrentKnockoutMatch(userFixture);
        setOpponent(getFixtureOpponent(team, userFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(userFixture.matchNo));
        setMatchResult(null);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (matchResult.status === "knockoutWin") {
      const nextFixture = knockoutFixtures.find((fixture) => !fixture.played && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    let updatedSchedule = schedule;
    let updatedTable = table;
    if (matchResult.week !== 3) {
      const completed = completeMatchday(schedule, table, matchResult.week);
      updatedSchedule = completed.updatedSchedule;
      updatedTable = completed.updatedTable;
    }
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const upcoming = updatedSchedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));
    const round32 = completedGroupStage ? buildRound32Fixtures(updatedTable) : knockoutFixtures;
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    setKnockoutFixtures(round32);
    setMatchResult(null);
    if (upcoming) {
      setOpponent(upcoming.home === team ? upcoming.away : upcoming.home);
      setScore([0, 0]);
      setCurrentKnockoutMatch(null);
      setMatchStage("GROUP STAGE");
      setDrawer(null);
      setScreen("match");
    } else {
      setFixtureView(completedGroupStage ? "knockout" : "group");
      setStandingsView(completedGroupStage ? "knockout" : standingsView);
      setDrawer("fixtures");
    }
  };

  const menuProps = { menuOpen, onToggleMenu: () => setMenuOpen((open) => !open), onMatch: openMatch, onFixtures: openFixtures, onGroups: openGroups, onRestart: resetTournament };

  if (screen === "home") return <HomeScreen onSelectGroup={selectGroup} onSelectTeam={startTeam} />;
  if (screen === "teams") return <TeamSelectScreen selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} onSelectTeam={startTeam} />;
  if (drawer === "groups") return <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} podium={podium} /></DrawerShell>;
  if (drawer === "fixtures") return <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>;
  return <MatchScreen team={team} opponent={opponent} currentFixture={currentFixture} matchResult={matchResult} onMatchComplete={handleMatchComplete} onNextMatch={nextMatch} menuProps={menuProps} stageLabel={matchStage} />;
}
