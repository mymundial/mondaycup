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
  createNextKnockoutFixture,
  knockoutStageLabel,
  runSelfTests,
} from "./logic/tournament.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { HomeScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";

runSelfTests();

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

  const groupStageComplete = schedule.every((fixture) => fixture.played);
  const visibleKnockoutFixtures = groupStageComplete && !knockoutFixtures.length ? buildRound32Fixtures(table) : knockoutFixtures;
  const allGroups = useMemo(() => GROUP_LETTERS.map((group) => ({ group, rows: sortRows(GROUPS[group].map((name) => table[name])) })), [table]);
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(() => {
    if (!groupStageComplete) return new Set();
    const teams = GROUP_LETTERS.flatMap((group) => qualifiers.byGroup[group].slice(0, 2).map((row) => row.team)).concat(qualifiers.best3RDs.map((row) => row.team));
    return new Set(teams);
  }, [groupStageComplete, qualifiers]);

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

  const quickWin = () => {
    if (!team || !opponent) return;

    if (currentKnockoutMatch) {
      const match = currentKnockoutMatch;
      const homeGoals = match.home === team ? 1 : 0;
      const awayGoals = match.away === team ? 1 : 0;
      const playedMatch = { ...match, played: true, homeGoals, awayGoals };

      setScore([1, 0]);
      setKnockoutFixtures((current) => current.some((fixture) => fixture.matchNo === match.matchNo)
        ? current.map((fixture) => fixture.matchNo === match.matchNo ? playedMatch : fixture)
        : [...current, playedMatch]
      );
      setMatchResult({
        home: match.home,
        away: match.away,
        homeGoals,
        awayGoals,
        won: true,
        week: null,
        matchNo: match.matchNo,
        status: match.matchNo === 104 ? "champion" : "knockoutWin",
      });
      return;
    }

    const match = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)));
    if (!match) return;
    const homeGoals = match.home === team ? 1 : 0;
    const awayGoals = match.away === team ? 1 : 0;
    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals, awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, homeGoals, awayGoals);
    setScore([1, 0]);
    if (match.week === 3) {
      const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, 3);
      const qualified = didTeamQualify(team, updatedTable);
      setSchedule(updatedSchedule);
      setTable(updatedTable);
      setKnockoutFixtures(buildRound32Fixtures(updatedTable));
      setMatchResult({ home: match.home, away: match.away, homeGoals, awayGoals, won: true, week: match.week, status: qualified ? "qualified" : "eliminated" });
      return;
    }
    setSchedule(afterUserSchedule);
    setTable(afterUserTable);
    setMatchResult({ home: match.home, away: match.away, homeGoals, awayGoals, won: true, week: match.week });
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
      const playedCurrent = knockoutFixtures.find((fixture) => fixture.matchNo === matchResult.matchNo && fixture.played)
        || (currentKnockoutMatch ? { ...currentKnockoutMatch, played: true, homeGoals: matchResult.homeGoals, awayGoals: matchResult.awayGoals } : null);
      const fixturesForNext = playedCurrent && !knockoutFixtures.some((fixture) => fixture.matchNo === playedCurrent.matchNo)
        ? [...knockoutFixtures, playedCurrent]
        : knockoutFixtures;
      const nextFixture = createNextKnockoutFixture({ previousMatchNo: matchResult.matchNo, team, fixtures: fixturesForNext });
      if (nextFixture) {
        setKnockoutFixtures((current) => current.some((fixture) => fixture.matchNo === nextFixture.matchNo && (fixture.home === team || fixture.away === team)) ? current : [...current, nextFixture]);
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
  if (drawer === "groups") return <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} /></DrawerShell>;
  if (drawer === "fixtures") return <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>;
  return <MatchScreen team={team} opponent={opponent} score={score} matchResult={matchResult} onQuickWin={quickWin} onNextMatch={nextMatch} menuProps={menuProps} stageLabel={matchStage} />;
}
