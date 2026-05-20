import { useMemo, useState } from "react";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import { buildSchedule, blankTable, buildQualifiers, buildRound32Fixtures, sortRows, applyFixtureResult, completeMatchday, didTeamQualify, findTeamKnockoutFixture, getFixtureOpponent, completeKnockoutRound, knockoutStageLabel, runSelfTests } from "./logic/tournament.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { HomeScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";

runSelfTests();

const stageKeyFromMatchNo = (matchNo) => {
  if (matchNo >= 73 && matchNo <= 88) return "round32";
  if (matchNo >= 89 && matchNo <= 96) return "round16";
  if (matchNo >= 97 && matchNo <= 100) return "quarterFinal";
  if (matchNo === 101 || matchNo === 102) return "semiFinal";
  if (matchNo === 103) return "thirdPlace";
  if (matchNo === 104) return "final";
  return "round32";
};

function toGameFixture(fixture, fallbackStage = "group") {
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

function resultBelongsToFixture(result, fixture) {
  if (!result || !fixture) return false;
  if (result.fixtureId && fixture.id) return result.fixtureId === fixture.id;
  if (result.matchNo && fixture.matchNo) return result.matchNo === fixture.matchNo;
  return result.homeTeam === fixture.home && result.awayTeam === fixture.away;
}


function userScoreFromFixtureResult(result, userTeam) {
  const userIsHome = result.homeTeam === userTeam || result.home === userTeam;
  return userIsHome ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals];
}

function calculateEarlyQualifiedTeams(table, schedule, fullQualifiers, groupStageComplete) {
  if (groupStageComplete) {
    const teams = GROUP_LETTERS.flatMap((group) => fullQualifiers.byGroup[group].slice(0, 2).map((row) => row.team))
      .concat(fullQualifiers.best3RDs.map((row) => row.team));
    return new Set(teams);
  }

  const qualified = new Set();

  GROUP_LETTERS.forEach((group) => {
    const groupTeams = GROUPS[group];
    groupTeams.forEach((teamName) => {
      const row = table[teamName];
      const possibleCatchers = groupTeams.filter((otherTeam) => {
        if (otherTeam === teamName) return false;
        const otherRow = table[otherTeam];
        const remaining = schedule.filter((fixture) => !fixture.played && fixture.group === group && (fixture.home === otherTeam || fixture.away === otherTeam)).length;
        return otherRow.pts + remaining * 3 >= row.pts;
      }).length;

      if (possibleCatchers < 2) qualified.add(teamName);
    });
  });

  return qualified;
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
  const [podium, setPodium] = useState({});
  const [matchStage, setMatchStage] = useState("GROUP STAGE");

  const groupStageComplete = schedule.every((fixture) => fixture.played);
  const visibleKnockoutFixtures = groupStageComplete && !knockoutFixtures.length ? buildRound32Fixtures(table) : knockoutFixtures;
  const allGroups = useMemo(() => GROUP_LETTERS.map((group) => ({ group, rows: sortRows(GROUPS[group].map((name) => table[name])) })), [table]);
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(() => calculateEarlyQualifiedTeams(table, schedule, qualifiers, groupStageComplete), [table, schedule, qualifiers, groupStageComplete]);

  const activeGroupFixture = useMemo(() => {
    if (!team || !opponent) return null;
    return schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
      || schedule.find((fixture) => fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
      || null;
  }, [schedule, selectedGroup, team, opponent]);

  const currentFixture = currentKnockoutMatch ? toGameFixture(currentKnockoutMatch) : toGameFixture(activeGroupFixture);

  const closeMenu = () => setMenuOpen(false);
  const resetTournament = () => { setScreen("home"); setDrawer(null); setMenuOpen(false); setFixtureView("group"); setStandingsView("group"); setSelectedGroup("A"); setTeam(null); setOpponent(""); setScore([0, 0]); setMatchResult(null); setTable(blankTable()); setSchedule(buildSchedule()); setKnockoutFixtures([]); setCurrentKnockoutMatch(null); setPodium({}); setMatchStage("GROUP STAGE"); };
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
    const match = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)));
    if (!match) return;
    const homeGoals = match.home === team ? 1 : 0;
    const awayGoals = match.away === team ? 1 : 0;
    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals, awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, homeGoals, awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
    setScore([1, 0]);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) setKnockoutFixtures(buildRound32Fixtures(updatedTable));
    setMatchResult({
      home: match.home,
      away: match.away,
      homeGoals,
      awayGoals,
      won: true,
      week: match.week,
      status: completedGroupStage ? (qualified ? "qualified" : "eliminated") : "groupWin",
    });
  };

  const handleMatchComplete = (result) => {
    if (!result || !team) return;

    if (currentKnockoutMatch && resultBelongsToFixture(result, currentKnockoutMatch)) {
      const userPlayedMatch = {
        ...currentKnockoutMatch,
        played: true,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
      };

      const { updatedFixtures, playedUserMatch, podium: completedPodium } = completeKnockoutRound({
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

      setScore(userScore);
      setKnockoutFixtures(updatedFixtures);
      if (completedPodium) setPodium(completedPodium);
      setMatchResult({
        home: playedUserMatch.home,
        away: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
        won: result.userWon,
        week: null,
        matchNo: playedUserMatch.matchNo,
        status: playedUserMatch.matchNo === 104 ? "champion" : "knockoutWin",
      });
      return;
    }

    const match = schedule.find((fixture) => fixture.id === result.fixtureId) || activeGroupFixture;
    if (!match) return;

    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, result.homeGoals, result.awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
    const userScore = userScoreFromFixtureResult(result, team);

    setScore(userScore);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) setKnockoutFixtures(buildRound32Fixtures(updatedTable));
    setMatchResult({
      home: match.home,
      away: match.away,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      won: result.userWon,
      week: match.week,
      status: completedGroupStage ? (qualified ? "qualified" : "eliminated") : (result.userWon ? "groupWin" : "groupLoss"),
    });
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

    const upcoming = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));

    setMatchResult(null);
    if (upcoming) {
      setOpponent(upcoming.home === team ? upcoming.away : upcoming.home);
      setScore([0, 0]);
      setCurrentKnockoutMatch(null);
      setMatchStage("GROUP STAGE");
      setDrawer(null);
      setScreen("match");
    } else {
      setFixtureView(groupStageComplete ? "knockout" : "group");
      setStandingsView(groupStageComplete ? "knockout" : standingsView);
      setDrawer("fixtures");
    }
  };

  const menuProps = { menuOpen, onToggleMenu: () => setMenuOpen((open) => !open), onMatch: openMatch, onFixtures: openFixtures, onGroups: openGroups, onRestart: resetTournament };

  if (screen === "home") return <HomeScreen onSelectGroup={selectGroup} onSelectTeam={startTeam} />;
  if (screen === "teams") return <TeamSelectScreen selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} onSelectTeam={startTeam} />;
  if (drawer === "groups") return <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} podium={podium} /></DrawerShell>;
  if (drawer === "fixtures") return <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>;
  return <MatchScreen team={team} opponent={opponent} score={score} matchResult={matchResult} onQuickWin={quickWin} onMatchComplete={handleMatchComplete} onNextMatch={nextMatch} menuProps={menuProps} stageLabel={matchStage} fixture={currentFixture} groupRows={allGroups.find((item) => item.group === selectedGroup)?.rows || []} qualifiedTeams={qualifiedTeams} selectedGroup={selectedGroup} />;
}
