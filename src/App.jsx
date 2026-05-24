import { useMemo, useState } from "react";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import { buildSchedule, blankTable, buildQualifiers, buildRound32Fixtures, sortRows, applyFixtureResult, completeMatchday, didTeamQualify, findTeamKnockoutFixture, getFixtureOpponent, completeKnockoutRound, knockoutStageLabel, runSelfTests } from "./logic/tournament.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { ScreenTitle } from "./components/layout/Menu.jsx";
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


function resultFormCode(result, userTeam) {
  if (!result) return null;
  if (result.isDraw || result.homeGoals === result.awayGoals) return "D";
  return result.userWon || result.won ? "W" : "L";
}

function calculateEarlyQualifiedTeams(table, schedule, fullQualifiers, groupStageComplete) {
  const qualified = new Set();

  if (groupStageComplete) {
    GROUP_LETTERS.forEach((group) => {
      fullQualifiers.byGroup[group].slice(0, 2).forEach((row) => qualified.add(row.team));
    });
    fullQualifiers.best3RDs.forEach((row) => qualified.add(row.team));
    return qualified;
  }

  // Early qualification check for top-two places. A team is marked Q as soon as
  // fewer than two teams in its group can still finish above or level with it on points.
  GROUP_LETTERS.forEach((group) => {
    const groupTeams = GROUPS[group];
    groupTeams.forEach((teamName) => {
      const row = table[teamName];
      if (row.pts >= 6) {
        qualified.add(teamName);
        return;
      }
      const challengers = groupTeams.filter((otherTeam) => {
        if (otherTeam === teamName) return false;
        const otherRow = table[otherTeam];
        const remaining = schedule.filter((fixture) => !fixture.played && fixture.group === group && (fixture.home === otherTeam || fixture.away === otherTeam)).length;
        return otherRow.pts + remaining * 3 >= row.pts;
      }).length;

      if (row.played > 0 && challengers < 2) qualified.add(teamName);
    });
  });

  return qualified;
}


function StatTile({ label, value }) {
  return <div className="rounded-[1.2rem] bg-[#F8F4EC] p-3 text-center text-[#0B5F35] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_18px_rgba(7,45,29,0.04)]"><div className="home-copy-bold text-[22px] uppercase leading-none">{value}</div><div className="home-copy-regular mt-1 text-[9px] uppercase tracking-[0.12em] text-[#0B5F35]/55">{label}</div></div>;
}

function UpgradeButton({ label, detail }) {
  return <button className="rounded-[1.1rem] border border-[#F7D117]/55 bg-[#0B5F35] p-3 text-left text-[#F5F1E8] shadow-[0_8px_18px_rgba(7,45,29,0.10)]"><div className="home-copy-bold text-[12px] uppercase tracking-[0.06em] text-[#F7D117]">{label}</div><div className="home-copy-regular mt-1 text-[8px] uppercase tracking-[0.08em] text-[#F5F1E8]/58">{detail}</div></button>;
}

function ClubhouseScreen({ menuProps, team, userForm, score }) {
  const wins = userForm.filter((item) => item === "W").length;
  const goals = Number(score?.[0] || 0);
  return <main className="home-main-font flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>CLUBHOUSE</ScreenTitle><section className="min-h-0 flex-1 overflow-auto px-4 pb-4"><div className="overflow-hidden rounded-[1.8rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.06)]"><div className="bg-[#0B5F35] px-5 py-4 text-center text-[#F5F1E8]"><div className="home-copy-bold text-[26px] uppercase leading-none">MY CLUBHOUSE</div><div className="home-copy-regular mt-2 text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/60">Edit profile · track campaigns · climb the table</div></div><div className="space-y-4 p-4"><div className="grid gap-2"><label className="home-copy-regular text-[10px] uppercase tracking-[0.14em] text-[#0B5F35]/55">Nickname</label><input className="h-11 rounded-[1rem] border border-[#0B5F35]/10 bg-white/65 px-4 home-copy-bold text-[16px] uppercase text-[#0B5F35] outline-none" defaultValue="MONDAY HERO" /><label className="home-copy-regular mt-1 text-[10px] uppercase tracking-[0.14em] text-[#0B5F35]/55">Favourite team</label><input className="h-11 rounded-[1rem] border border-[#0B5F35]/10 bg-white/65 px-4 home-copy-bold text-[16px] uppercase text-[#0B5F35] outline-none" defaultValue={team || "CANADA"} /></div><div className="grid grid-cols-2 gap-2"><StatTile label="Monday Cups won" value="0" /><StatTile label="Leaderboard rank" value="#--" /><StatTile label="Total goals" value={goals} /><StatTile label="Goals scored" value={goals ? "100%" : "0%"} /></div><div className="grid grid-cols-2 gap-2"><UpgradeButton label="Power upgrade" detail="+10%" /><UpgradeButton label="Accuracy upgrade" detail="+10%" /><UpgradeButton label="Goalkeeper upgrade" detail="+10%" /><UpgradeButton label="Brown Envelope" detail="Guaranteed campaign" /></div></div></div></section></main>;
}

function TrophyCabinetScreen({ menuProps }) {
  const trophies = ["Host hero", "Group winner", "Knockout king", "Finalist", "Champion", "Golden boot", "Perfect power", "Perfect accuracy", "Clean sweep", "Underdog", "48-team master", "Monday legend"];
  return <main className="home-main-font flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>TROPHY CABINET</ScreenTitle><section className="min-h-0 flex-1 overflow-auto px-4 pb-4"><div className="overflow-hidden rounded-[1.8rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8"><div className="bg-[#0B5F35] px-5 py-4 text-center text-[#F5F1E8]"><div className="home-copy-bold text-[25px] uppercase leading-none">COLLECTION</div><div className="home-copy-regular mt-2 text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/60">12 trophy slots to start · expandable later</div></div><div className="grid grid-cols-3 gap-3 p-4">{trophies.map((name, index) => <div key={name} className="flex h-[96px] flex-col items-center justify-center rounded-[1.2rem] bg-[#F8F4EC] p-2 text-center ring-1 ring-[#0B5F35]/8"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#0B5F35]/8 text-[#0B5F35]/30 home-copy-bold text-[22px]">🏆</div><div className="home-copy-bold mt-2 text-[8px] uppercase leading-tight tracking-[0.06em] text-[#0B5F35]/55">{name}</div><div className="home-copy-regular mt-1 text-[6px] uppercase tracking-[0.10em] text-[#0B5F35]/35">{index < 5 ? "Free" : "Locked"}</div></div>)}</div></div></section></main>;
}

function LeaderboardScreen({ menuProps }) {
  const rows = [
    [1, "MONDAYHERO", 1840], [2, "PANENKA12", 1710], [3, "NETFINDER", 1625], [4, "GROUPKING", 1510], [5, "YOU", "--"]
  ];
  return <main className="home-main-font flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>LEADERBOARD</ScreenTitle><section className="min-h-0 flex-1 overflow-auto px-4 pb-4"><div className="overflow-hidden rounded-[1.8rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8"><div className="bg-[#0B5F35] px-5 py-4 text-center text-[#F5F1E8]"><div className="home-copy-bold text-[25px] uppercase leading-none">BEST CAMPAIGN POINTS</div><div className="home-copy-regular mt-2 text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/60">Single-campaign high score only</div></div><div className="p-4"><div className="mb-3 rounded-[1.2rem] bg-[#F8F4EC] p-3 text-[9px] uppercase leading-relaxed tracking-[0.06em] text-[#0B5F35]/60">Scoring model: 50 for centre power, 50 for centre accuracy, 50 per goal, 10 woodwork, 50 per match win, 50 group qualification, 100 champion, 50 runner-up, 25 third.</div><div className="space-y-2">{rows.map(([rank, name, points]) => <div key={rank} className="grid grid-cols-[40px_1fr_70px] items-center rounded-[1rem] bg-[#F8F4EC] px-3 py-3 ring-1 ring-[#0B5F35]/8"><div className="home-copy-bold text-[16px] text-[#0B5F35]/55">#{rank}</div><div className="home-copy-bold text-[15px] uppercase text-[#0B5F35]">{name}</div><div className="home-copy-bold text-right text-[16px] text-[#0B5F35]">{points}</div></div>)}</div></div></div></section></main>;
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
  const [modalDismissed, setModalDismissed] = useState(false);
  const [table, setTable] = useState(blankTable());
  const [schedule, setSchedule] = useState(buildSchedule());
  const [knockoutFixtures, setKnockoutFixtures] = useState([]);
  const [currentKnockoutMatch, setCurrentKnockoutMatch] = useState(null);
  const [podium, setPodium] = useState({});
  const [matchStage, setMatchStage] = useState("GROUP STAGE");
  const [userForm, setUserForm] = useState([]);

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
  const resetTournament = () => { setScreen("home"); setDrawer(null); setMenuOpen(false); setFixtureView("group"); setStandingsView("group"); setSelectedGroup("A"); setTeam(null); setOpponent(""); setScore([0, 0]); setMatchResult(null); setModalDismissed(false); setTable(blankTable()); setSchedule(buildSchedule()); setKnockoutFixtures([]); setCurrentKnockoutMatch(null); setPodium({}); setMatchStage("GROUP STAGE"); setUserForm([]); };
  const openMatch = () => { closeMenu(); setDrawer(null); };
  const openFixtures = () => { closeMenu(); setFixtureView(groupStageComplete ? "knockout" : "group"); setDrawer("fixtures"); };
  const openGroups = () => { closeMenu(); setStandingsView(groupStageComplete ? "knockout" : standingsView); setDrawer("groups"); };
  const openClubhouse = () => { closeMenu(); setDrawer("clubhouse"); };
  const openTrophyCabinet = () => { closeMenu(); setDrawer("trophyCabinet"); };
  const openLeaderboard = () => { closeMenu(); setDrawer("leaderboard"); };
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
    setModalDismissed(false);
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
    setModalDismissed(false);
    setUserForm((form) => [...form, "W"].slice(-8));
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

      setScore(userScore);
      setKnockoutFixtures(updatedFixtures);
      if (completedPodium) setPodium(completedPodium);
      const matchNo = playedUserMatch.matchNo;
      const lostSemiFinal = !result.userWon && (matchNo === 101 || matchNo === 102);
      let status = "eliminated";
      if (matchNo === 103) status = result.userWon ? "third" : "fourth";
      else if (matchNo === 104) status = result.userWon ? "champion" : "runnerUp";
      else if (result.userWon) status = "knockoutWin";
      else if (lostSemiFinal) status = "thirdPlace";
      setModalDismissed(false);
      setUserForm((form) => [...form, resultFormCode(result, team)].filter(Boolean).slice(-8));
      setMatchResult({
        home: playedUserMatch.home,
        away: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
        won: result.userWon,
        week: null,
        matchNo,
        status,
        nextFixture: nextUserFixture,
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
    setModalDismissed(false);
    setUserForm((form) => [...form, resultFormCode(result, team)].filter(Boolean).slice(-8));
    setMatchResult({
      home: match.home,
      away: match.away,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      won: result.userWon,
      week: match.week,
      status: completedGroupStage ? (qualified ? "qualified" : "eliminated") : (result.isDraw ? "groupDraw" : result.userWon ? "groupWin" : "groupLoss"),
      isDraw: result.isDraw || result.homeGoals === result.awayGoals,
    });
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;

    if (matchResult.status === "thirdPlace") {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => fixture.matchNo === 103 && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (["eliminated", "runnerUp", "third", "fourth"].includes(matchResult.status)) { resetTournament(); return; }

    if (matchResult.status === "champion") {
      setCurrentKnockoutMatch(null);
      setStandingsView("knockout");
      setDrawer("groups");
      setMatchResult(null);
      setModalDismissed(false);
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
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (matchResult.status === "knockoutWin") {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => !fixture.played && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    const upcoming = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));

    setMatchResult(null);
    setModalDismissed(false);
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

  const menuProps = { menuOpen, onToggleMenu: () => setMenuOpen((open) => !open), onMatch: openMatch, onFixtures: openFixtures, onGroups: openGroups, onClubhouse: openClubhouse, onTrophyCabinet: openTrophyCabinet, onLeaderboard: openLeaderboard, onRestart: resetTournament };

  if (screen === "home") return <HomeScreen onSelectGroup={selectGroup} onSelectTeam={startTeam} />;
  if (screen === "teams") return <TeamSelectScreen selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} onSelectTeam={startTeam} />;
  if (drawer === "groups") return <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} podium={podium} /></DrawerShell>;
  if (drawer === "clubhouse") return <DrawerShell><ClubhouseScreen menuProps={menuProps} team={team} userForm={userForm} score={score} /></DrawerShell>;
  if (drawer === "trophyCabinet") return <DrawerShell><TrophyCabinetScreen menuProps={menuProps} /></DrawerShell>;
  if (drawer === "leaderboard") return <DrawerShell><LeaderboardScreen menuProps={menuProps} /></DrawerShell>;
  if (drawer === "fixtures") return <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>;
  return <MatchScreen team={team} opponent={opponent} score={score} matchResult={matchResult} modalDismissed={modalDismissed} onDismissModal={() => setModalDismissed(true)} onQuickWin={quickWin} onMatchComplete={handleMatchComplete} onNextMatch={nextMatch} menuProps={menuProps} stageLabel={matchStage} fixture={currentFixture} groupRows={allGroups.find((item) => item.group === selectedGroup)?.rows || []} qualifiedTeams={qualifiedTeams} selectedGroup={selectedGroup} userForm={userForm} />;
}
