import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { auth } from "./firebase.js";
import { buildSchedule, blankTable, buildQualifiers, buildRound32Fixtures, sortRows, applyFixtureResult, completeMatchday, didTeamQualify, findTeamKnockoutFixture, getFixtureOpponent, completeKnockoutRound, knockoutStageLabel, simulateGoldenTicketFinalRun, runSelfTests } from "./logic/tournament.js";
import { RESULT_STATUS } from "./logic/resultStatus.js";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import { getUserFinishStatus } from "./logic/podium.js";
import { LEADERBOARD_POINTS, applyCompletedMatchScore, createLeaderboardEntry, createScoringState } from "./logic/leaderboardScoring.js";
import { HomeScreen, HostSelectScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { ensureUserDocument, isNicknameTaken, loadCurrentProgress, loadLeaderboardRows, loadUserProfile, saveAllTeamsUnlocked, saveCurrentProgress, saveLeaderboardHighScore, saveUserNickname, saveUserProfile, unlockCosmetic, consumeGoldenTicket, createDefaultAchievements } from "./lib/firebaseUser.js";
import { ClubhouseScreen, TrophyCabinetScreen, LeaderboardScreen } from "./components/profile/ProfileScreens.jsx";
import {
  BEST_CAMPAIGN_SCORE_KEY,
  BEST_CAMPAIGN_SUMMARY_KEY,
  MONDAY_CUPS_WON_KEY,
  ALL_TIME_GOALS_KEY,
  ALL_TIME_SHOTS_KEY,
  COSMETICS_KEY,
  ALL_TEAMS_UNLOCKED_KEY,
  ACHIEVEMENTS_KEY,
  NATION_CUP_WINS_KEY,
  safeReadNumber,
  safeWriteNumber,
  safeReadJson,
  safeWriteJson,
  isTerminalLeaderboardStatus,
  toGameFixture,
  resultBelongsToFixture,
  userScoreFromFixtureResult,
  resultFormCode,
  roundLabelForResult,
  buildCampaignSummary,
  countShotStats,
  calculatePreviewLeaderboardRank,
  calculateEarlyQualifiedTeams,
} from "./logic/appState.js";

runSelfTests();

export default function App() {
  const [screen, setScreen] = useState("home");
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuInitialView, setMenuInitialView] = useState("menu");
  const [menuInitialAuthMode, setMenuInitialAuthMode] = useState("signin");
  const [menuAuthShowLogoBack, setMenuAuthShowLogoBack] = useState(false);
  const [menuAuthRequestId, setMenuAuthRequestId] = useState(0);
  const [fixtureView, setFixtureView] = useState("group");
  const [standingsView, setStandingsView] = useState("group");
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [allTeamsUnlocked, setAllTeamsUnlocked] = useState(() => Boolean(safeReadJson(ALL_TEAMS_UNLOCKED_KEY, false)));
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
  const [scoringState, setScoringState] = useState(() => createScoringState());
  const [bestCampaignScore, setBestCampaignScore] = useState(() => safeReadNumber(BEST_CAMPAIGN_SCORE_KEY, 0));
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [bestCampaignSummary, setBestCampaignSummary] = useState(() => safeReadJson(BEST_CAMPAIGN_SUMMARY_KEY, null));
  const [mondayCupsWon, setMondayCupsWon] = useState(() => safeReadNumber(MONDAY_CUPS_WON_KEY, 0));
  const [allTimeGoals, setAllTimeGoals] = useState(() => safeReadNumber(ALL_TIME_GOALS_KEY, 0));
  const [allTimeShots, setAllTimeShots] = useState(() => safeReadNumber(ALL_TIME_SHOTS_KEY, 0));
  const [activeCosmetics, setActiveCosmetics] = useState(() => safeReadJson(COSMETICS_KEY, { goldenBoot: false, goldenBall: false, goldenGlove: false, goldenTicket: false, goldenTicketQuantity: 0 }));
  const [firebaseProfile, setFirebaseProfile] = useState(null);
  const [achievements, setAchievements] = useState(() => safeReadJson(ACHIEVEMENTS_KEY, createDefaultAchievements()));
  const [nationCupWins, setNationCupWins] = useState(() => safeReadJson(NATION_CUP_WINS_KEY, {}));
  const [campaignPlayedMatches, setCampaignPlayedMatches] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      if (user) {
        try {
          await ensureUserDocument(user, user.displayName || user.email?.split("@")[0] || "Player", {
            source: "auth-state",
          });
          const profile = await loadUserProfile(user.uid);
          setFirebaseProfile(profile || null);
          if (profile?.achievements) {
            syncAchievementState({ ...createDefaultAchievements(), ...(profile.achievements || {}) });
          }
          if (profile?.nationCupWins) {
            syncNationCupWinsState(profile.nationCupWins || {});
          }
          if (profile?.unlocks?.allTeams) {
            setAllTeamsUnlocked(true);
            safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
          }
          if (profile?.cosmetics) {
            setActiveCosmetics((current) => {
              const next = { ...(current || {}), ...(profile.cosmetics || {}) };
              safeWriteJson(COSMETICS_KEY, next);
              return next;
            });
          }
          if (profile?.bestCampaign?.points || profile?.bestCampaign?.campaignPoints) {
            const profileBestScore = Number(profile.bestCampaign.points ?? profile.bestCampaign.campaignPoints ?? 0);
            setBestCampaignScore(profileBestScore);
            const summary = {
              team: profile.bestCampaign.team || "NO TEAM",
              form: profile.bestCampaign.form || [],
              campaignPoints: profileBestScore,
              roundLabel: profile.bestCampaign.roundLabel || profile.bestCampaign.stage || "NO CAMPAIGN",
              updatedAt: profile.bestCampaign.updatedAt || Date.now(),
            };
            setBestCampaignSummary(summary);
            safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, profileBestScore);
            safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, summary);
          }
          if (profile?.stats) {
            setMondayCupsWon(Number(profile.stats.mondayCupsWon || 0));
            setAllTimeGoals(Number(profile.stats.totalGoalsScored || 0));
            setAllTimeShots(Number(profile.stats.totalShotsTaken || profile.stats.totalShots || 0));
          }
        } catch (error) {
          console.warn("User profile sync failed", error);
        }
      } else {
        setFirebaseProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLeaderboardRows(50)
      .then((rows) => {
        if (!cancelled) setLeaderboardRows(rows);
      })
      .catch((error) => {
        console.warn("Cloud leaderboard load failed", error);
        if (!cancelled) setLeaderboardRows([]);
      });

    return () => { cancelled = true; };
  }, []);

  const handleAuthComplete = async (user, options = {}) => {
    const nextUser = user || auth.currentUser || null;
    const guestSnapshot = buildGameSnapshot();
    const hasGuestProgress = Boolean(guestSnapshot?.active && guestSnapshot?.team);
    setCurrentUser(nextUser);

    if (nextUser) {
      try {
        await ensureUserDocument(nextUser, nextUser.displayName || nextUser.email?.split("@")[0] || "Player", {
          source: "auth-complete",
        });

        if (hasGuestProgress) {
          const currentCampaignPayload = {
            active: true,
            team: team || guestSnapshot.team || null,
            opponent: opponent || guestSnapshot.opponent || null,
            stage: currentRoundLabel || matchStage || "Group Stage",
            points: Number(scoringState.campaignPoints || guestSnapshot.scoringState?.campaignPoints || 0),
            form: userForm || guestSnapshot.userForm || [],
            score: Array.isArray(score) ? score : guestSnapshot.score || [0, 0],
            matchResult: matchResult ? {
              status: matchResult.status || null,
              matchNo: matchResult.matchNo || null,
              winner: matchResult.winner || null,
              loser: matchResult.loser || null,
              userScore: matchResult.userScore ?? null,
              opponentScore: matchResult.opponentScore ?? null,
            } : null,
          };

          await saveUserProfile(nextUser.uid, {
            currentCampaign: currentCampaignPayload,
            currentProgress: guestSnapshot,
            cosmetics: activeCosmetics || { goldenBoot: false, goldenBall: false, goldenGlove: false, goldenTicket: false, goldenTicketQuantity: 0 },
            unlocks: { allTeams: Boolean(allTeamsUnlocked) },
          });
          await saveCurrentProgress(nextUser.uid, guestSnapshot);
        }

        const profile = await loadUserProfile(nextUser.uid);
        setFirebaseProfile(profile || null);
        if (profile?.achievements) {
          syncAchievementState({ ...createDefaultAchievements(), ...(profile.achievements || {}) });
        }
        if (profile?.nationCupWins) {
          syncNationCupWinsState(profile.nationCupWins || {});
        }
        if (profile?.unlocks?.allTeams) {
          setAllTeamsUnlocked(true);
          safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
        }
      } catch (error) {
        console.warn("User profile setup failed", error);
      }
    }

    if (options?.navigate !== false) {
      setScreen("teams");
      setDrawer(null);
    }
  };

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
  const currentRoundLabel = team ? roundLabelForResult(matchResult, matchStage) : "NO CAMPAIGN";

  const leaderboardCosmeticsApplied = (source = activeCosmetics) => ({
    goldenBoot: Boolean(source?.goldenBoot || source?.cosmetic3),
    goldenBall: Boolean(source?.goldenBall || source?.cosmeticBallEquipped),
    goldenGlove: Boolean(source?.goldenGlove || source?.cosmeticGloveEquipped),
  });

  const sanitizeCloudData = (value) => JSON.parse(JSON.stringify(value ?? null));

  const syncAchievementState = (nextAchievements) => {
    setAchievements(nextAchievements);
    safeWriteJson(ACHIEVEMENTS_KEY, nextAchievements);
  };

  const syncNationCupWinsState = (nextNationCupWins) => {
    setNationCupWins(nextNationCupWins);
    safeWriteJson(NATION_CUP_WINS_KEY, nextNationCupWins);
  };

  const unlockProgressForResult = (result, userTeam, options = {}) => {
    const status = result?.status;
    const matchNo = Number(result?.matchNo);
    const didWin = result?.userWon ?? result?.won;
    const isDraw = Boolean(result?.isDraw || result?.homeGoals === result?.awayGoals);
    const userShotEvents = Array.isArray(options.userShotEvents) ? options.userShotEvents : [];
    const opponentShotEvents = Array.isArray(result?.attempts?.opponent) ? result.attempts.opponent : [];
    const nextUserForm = Array.isArray(options.nextUserForm) ? options.nextUserForm : userForm;
    const playedMatches = Number(options.playedMatches ?? campaignPlayedMatches ?? 0);
    const isChampionFinish = matchNo === 104 && didWin === true && status === RESULT_STATUS.CHAMPION;
    const isRunnerUpFinish = matchNo === 104 && didWin === false && status === RESULT_STATUS.RUNNER_UP;
    const isThirdPlaceFinish = matchNo === 103 && didWin === true && status === RESULT_STATUS.THIRD_PLACE;
    const userIsHome = result?.home === userTeam || result?.homeTeam === userTeam;
    const opponentGoals = Number(userIsHome ? result?.awayGoals : result?.homeGoals);
    const shotStats = countShotStats(userShotEvents);
    const nextAllTimeGoalCount = Number(allTimeGoals || 0) + Number(shotStats.goals || 0);

    const wasBehindBeforeWin = (() => {
      if (didWin !== true) return false;
      let userGoals = 0;
      let opponentGoalsRunning = 0;
      const maxShots = Math.max(userShotEvents.length, opponentShotEvents.length);
      for (let index = 0; index < maxShots; index += 1) {
        if (userShotEvents[index]?.goal) userGoals += 1;
        if (opponentShotEvents[index]?.goal) opponentGoalsRunning += 1;
        if (opponentGoalsRunning > userGoals) return true;
      }
      return false;
    })();

    const now = Date.now();
    const nextAchievements = { ...createDefaultAchievements(), ...(achievements || {}) };
    let nextNationCupWins = nationCupWins || {};
    const unlock = (key) => {
      if (!nextAchievements[key]) nextAchievements[key] = true;
    };

    if (["Canada", "Mexico", "United States"].includes(userTeam)) unlock("ourTime");
    unlock("kickOff");
    if (userShotEvents.some((event) => ["postLeft", "postRight", "crossbarCentre"].includes(event?.accuracyOutcome))) unlock("woodwork");
    if (shotStats.goals > 0) unlock("targetMan");
    if (!matchNo && (didWin === true || isDraw)) unlock("ptsOnTheBoard");
    if (didWin === true) unlock("victory");
    if (status === RESULT_STATUS.QUALIFIED) unlock("qualified");
    if (status === RESULT_STATUS.QUALIFIED && nextUserForm.length >= 3 && nextUserForm.slice(0, 3).every((code) => code === "W")) unlock("cleanSweep");
    if (didWin === true && matchNo >= 73 && matchNo <= 88) unlock("tko");
    if (didWin === true && matchNo >= 89 && matchNo <= 96) unlock("quarterFinalist");
    if (didWin === true && matchNo >= 97 && matchNo <= 100) unlock("semiFinalist");
    if (didWin === true && (matchNo === 101 || matchNo === 102)) unlock("finalist");
    if (Number.isFinite(opponentGoals) && opponentGoals === 0) unlock("cleanSheet");
    if (userShotEvents.length > 0 && userShotEvents.every((event) => Boolean(event?.goal))) unlock("perfect");
    if (wasBehindBeforeWin) unlock("comebackKing");
    if (didWin === true && userShotEvents.some((event) => Boolean(event?.isSuddenDeath))) unlock("iceCold");
    if (didWin === true && (activeCosmetics?.goldenBoot || activeCosmetics?.goldenBall || activeCosmetics?.goldenGlove)) unlock("goldenTouch");
    if (isChampionFinish && Number(mondayCupsWon || 0) + 1 >= 5) unlock("mondayLegend");
    if (isChampionFinish && playedMatches >= 8 && nextUserForm.length >= 8 && nextUserForm.every((code) => code === "W")) unlock("invincible");
    if (nextAllTimeGoalCount >= 1000) unlock("siuuu");

    if (isChampionFinish) unlock("championFinish");
    if (isRunnerUpFinish) unlock("runnerUpFinish");
    if (isThirdPlaceFinish) unlock("thirdPlaceFinish");
    if (nextAchievements.championFinish && nextAchievements.runnerUpFinish && nextAchievements.thirdPlaceFinish) unlock("nationalTreasure");

    if (isChampionFinish && userTeam) {
      const previous = nextNationCupWins?.[userTeam] || {};
      nextNationCupWins = {
        ...(nextNationCupWins || {}),
        [userTeam]: {
          unlocked: true,
          wins: Number(previous.wins || 0) + 1,
          firstWonAt: previous.firstWonAt || now,
          lastWonAt: now,
        },
      };
    }

    const completedNationCount = Object.values(nextNationCupWins || {}).filter((entry) => entry?.unlocked).length;
    if (completedNationCount >= 48) unlock("globalIcon");

    const requiredForGoat = [
      "ourTime", "kickOff", "woodwork", "targetMan", "ptsOnTheBoard", "victory", "cleanSweep", "qualified", "tko", "quarterFinalist", "semiFinalist", "finalist", "cleanSheet", "perfect", "comebackKing", "iceCold", "goldenTouch", "corruptionScandal", "mondayLegend", "invincible", "nationalTreasure", "globalIcon", "siuuu", "championFinish", "runnerUpFinish", "thirdPlaceFinish",
    ];
    if (requiredForGoat.every((key) => Boolean(nextAchievements[key]))) unlock("goat");

    syncAchievementState(nextAchievements);
    if (nextNationCupWins !== nationCupWins) syncNationCupWinsState(nextNationCupWins);
  };

  const buildGameSnapshot = () => sanitizeCloudData({
    version: 1,
    active: Boolean(team),
    savedAt: Date.now(),
    selectedGroup,
    team: team || null,
    opponent: opponent || null,
    score,
    matchStage,
    userForm,
    scoringState,
    fixtureView,
    standingsView,
    table,
    schedule,
    knockoutFixtures,
    currentKnockoutMatch,
    podium,
    matchResult,
    modalDismissed,
    activeCosmetics,
    campaignPlayedMatches,
  });

  const restoreGameSnapshot = (snapshot) => {
    if (!snapshot?.active || !snapshot?.team) return false;
    setSelectedGroup(snapshot.selectedGroup || "A");
    setTeam(snapshot.team || null);
    setOpponent(snapshot.opponent || "Opponent");
    setScore(Array.isArray(snapshot.score) ? snapshot.score : [0, 0]);
    setMatchStage(snapshot.matchStage || "GROUP STAGE");
    setUserForm(Array.isArray(snapshot.userForm) ? snapshot.userForm : []);
    setScoringState(snapshot.scoringState || createScoringState());
    setCampaignPlayedMatches(Number(snapshot.campaignPlayedMatches || 0));
    setFixtureView(snapshot.fixtureView || "group");
    setStandingsView(snapshot.standingsView || "group");
    setTable(snapshot.table || blankTable());
    setSchedule(Array.isArray(snapshot.schedule) ? snapshot.schedule : buildSchedule());
    setKnockoutFixtures(Array.isArray(snapshot.knockoutFixtures) ? snapshot.knockoutFixtures : []);
    setCurrentKnockoutMatch(snapshot.currentKnockoutMatch || null);
    setPodium(snapshot.podium || {});
    setMatchResult(snapshot.matchResult || null);
    const terminalStatuses = new Set([
      RESULT_STATUS.ELIMINATED,
      RESULT_STATUS.CHAMPION,
      RESULT_STATUS.RUNNER_UP,
      RESULT_STATUS.THIRD_PLACE,
      RESULT_STATUS.FOURTH_PLACE,
    ]);
    setModalDismissed(snapshot.matchResult?.status && terminalStatuses.has(snapshot.matchResult.status) ? false : Boolean(snapshot.modalDismissed));
    if (snapshot.activeCosmetics) {
      setActiveCosmetics(snapshot.activeCosmetics);
      safeWriteJson(COSMETICS_KEY, snapshot.activeCosmetics);
    }
    setDrawer(null);
    setMenuOpen(false);
    setScreen("match");
    return true;
  };
  const myLeaderboardRank = calculatePreviewLeaderboardRank({
    rows: leaderboardRows,
    user: currentUser,
    currentCampaignScore: scoringState.campaignPoints,
    bestCampaignScore,
    team,
  });

  useEffect(() => {
    if (!authReady || !currentUser?.uid) return;

    const attempts = Number(allTimeShots || 0);
    const goals = Number(allTimeGoals || 0);
    const conversionPercentage = attempts > 0 ? Math.round((goals / attempts) * 100) : 0;

    const payload = {
      nickname: currentUser.displayName || currentUser.email?.split("@")[0] || "Player",
      email: currentUser.email || "",
      currentCampaign: {
        active: Boolean(team),
        team: team || null,
        opponent: opponent || null,
        stage: currentRoundLabel || matchStage || "No Campaign",
        points: Number(scoringState.campaignPoints || 0),
        form: userForm || [],
        score,
        matchResult: matchResult ? {
          status: matchResult.status || null,
          matchNo: matchResult.matchNo || null,
          winner: matchResult.winner || null,
          loser: matchResult.loser || null,
          userScore: matchResult.userScore ?? null,
          opponentScore: matchResult.opponentScore ?? null,
        } : null,
      },
      currentProgress: buildGameSnapshot(),
      bestCampaign: {
        ...(bestCampaignSummary || {}),
        points: Number(bestCampaignScore || 0),
        campaignPoints: Number(bestCampaignScore || 0),
        tournamentProgress: bestCampaignSummary?.tournamentProgress || bestCampaignSummary?.form || [],
        form: bestCampaignSummary?.form || [],
        team: bestCampaignSummary?.team || null,
        stage: bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "No Campaign",
        roundLabel: bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "No Campaign",
        cosmeticBootEquipped: Boolean(bestCampaignSummary?.cosmeticBootEquipped ?? bestCampaignSummary?.cosmeticsApplied?.goldenBoot ?? activeCosmetics?.goldenBoot),
        cosmeticBallEquipped: Boolean(bestCampaignSummary?.cosmeticBallEquipped ?? bestCampaignSummary?.cosmeticsApplied?.goldenBall ?? activeCosmetics?.goldenBall),
        cosmeticGloveEquipped: Boolean(bestCampaignSummary?.cosmeticGloveEquipped ?? bestCampaignSummary?.cosmeticsApplied?.goldenGlove ?? activeCosmetics?.goldenGlove),
        cosmeticsApplied: bestCampaignSummary?.cosmeticsApplied || leaderboardCosmeticsApplied(activeCosmetics),
      },
      stats: {
        mondayCupsWon: Number(mondayCupsWon || 0),
        totalGoalsScored: goals,
        totalShotsTaken: attempts,
        conversionPercentage,
        leaderboardRank: myLeaderboardRank || null,
      },
      achievements,
      nationCupWins,
      cosmetics: activeCosmetics || { goldenBoot: false, goldenBall: false, goldenGlove: false, goldenTicket: false, goldenTicketQuantity: 0 },
      leaderboard: {
        points: Number(Math.max(scoringState.campaignPoints || 0, bestCampaignScore || 0)),
        rank: myLeaderboardRank || null,
        team: bestCampaignSummary?.team || null,
      },
      unlocks: {
        allTeams: Boolean(allTeamsUnlocked),
      },
    };

    const timeout = window.setTimeout(() => {
      saveUserProfile(currentUser.uid, payload)
        .then(() => {
          const highScore = Number(Math.max(scoringState.campaignPoints || 0, bestCampaignScore || 0));
          if (highScore > 0) {
            return saveLeaderboardHighScore(currentUser.uid, {
              username: currentUser.displayName || currentUser.email?.split("@")[0] || "YOU",
              team: bestCampaignSummary?.team || null,
              campaignPoints: highScore,
              bestCampaign: bestCampaignSummary || null,
              cosmeticsApplied: bestCampaignSummary?.cosmeticsApplied || leaderboardCosmeticsApplied(activeCosmetics),
              status: bestCampaignSummary?.status || bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "inProgress",
              podium: bestCampaignSummary?.podium || null,
              podiumAchieved: /champion|runner|third/i.test(String(bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "")),
              rank: myLeaderboardRank || null,
            }).then(() => loadLeaderboardRows(50).then(setLeaderboardRows));
          }
          return null;
        })
        .catch((error) => {
          console.warn("Cloud profile save failed", error);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    achievements,
    activeCosmetics,
    allTeamsUnlocked,
    allTimeGoals,
    allTimeShots,
    authReady,
    bestCampaignScore,
    bestCampaignSummary,
    currentRoundLabel,
    currentUser,
    campaignPlayedMatches,
    matchResult,
    matchStage,
    mondayCupsWon,
    myLeaderboardRank,
    nationCupWins,
    opponent,
    score,
    scoringState.campaignPoints,
    team,
    userForm,
  ]);

  const applyLeaderboardScore = (baseResult, userShotEvents = []) => {
    const nextScoringState = applyCompletedMatchScore({
      scoringState,
      result: baseResult,
      userShotEvents,
    });
    const enrichedResult = {
      ...baseResult,
      userShotEvents,
      attempts: baseResult.attempts || { user: userShotEvents, opponent: [] },
      campaignPoints: nextScoringState.campaignPoints,
      pointsAwarded: nextScoringState.lastMatchPoints,
      pointsBreakdown: nextScoringState.lastBreakdown,
    };

    setScoringState(nextScoringState);
    const nextFormCode = resultFormCode(enrichedResult, team);
    const nextUserForm = [...userForm, nextFormCode].filter(Boolean).slice(-8);
    const nextCampaignPlayedMatches = Number(campaignPlayedMatches || 0) + 1;
    setCampaignPlayedMatches(nextCampaignPlayedMatches);

    const shotStats = countShotStats(userShotEvents);
    if (shotStats.shots > 0) {
      setAllTimeGoals((value) => {
        const next = Number(value || 0) + shotStats.goals;
        safeWriteNumber(ALL_TIME_GOALS_KEY, next);
        return next;
      });
      setAllTimeShots((value) => {
        const next = Number(value || 0) + shotStats.shots;
        safeWriteNumber(ALL_TIME_SHOTS_KEY, next);
        return next;
      });
    }

    if (baseResult.status === RESULT_STATUS.CHAMPION) {
      setMondayCupsWon((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(MONDAY_CUPS_WON_KEY, next);
        return next;
      });
    }

    unlockProgressForResult(baseResult, team, { userShotEvents, nextUserForm, playedMatches: nextCampaignPlayedMatches });

    if (nextScoringState.campaignPoints > bestCampaignScore) {
      const summary = {
        ...buildCampaignSummary({
          team,
          userForm: nextUserForm,
          campaignPoints: nextScoringState.campaignPoints,
          result: enrichedResult,
          fallbackRound: matchStage,
        }),
        points: Number(nextScoringState.campaignPoints || 0),
        tournamentProgress: nextUserForm,
        cosmeticBootEquipped: Boolean(activeCosmetics?.goldenBoot),
        cosmeticBallEquipped: Boolean(activeCosmetics?.goldenBall),
        cosmeticGloveEquipped: Boolean(activeCosmetics?.goldenGlove),
        cosmeticsApplied: leaderboardCosmeticsApplied(activeCosmetics),
        status: enrichedResult.status || baseResult.status || null,
        podium: podium || null,
      };
      setBestCampaignScore(nextScoringState.campaignPoints);
      setBestCampaignSummary(summary);
      safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, nextScoringState.campaignPoints);
      safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, summary);
    }

    if (isTerminalLeaderboardStatus(baseResult.status) && currentUser?.uid) {
      const nextIsBest = nextScoringState.campaignPoints > Number(bestCampaignScore || 0);
      const leaderboardBestScore = Number(Math.max(nextScoringState.campaignPoints || 0, bestCampaignScore || 0));
      const leaderboardBestTeam = nextIsBest ? team : (bestCampaignSummary?.team || null);
      const entry = createLeaderboardEntry({
        user: currentUser,
        team: leaderboardBestTeam,
        campaignPoints: leaderboardBestScore,
        status: baseResult.status,
        podium,
        cosmeticsApplied: leaderboardCosmeticsApplied(activeCosmetics),
      });
      setLeaderboardRows((rows) => {
        const withoutUser = rows.filter((row) => row.userId !== currentUser.uid);
        return [entry, ...withoutUser].sort((a, b) => Number(b.campaignPoints || 0) - Number(a.campaignPoints || 0)).slice(0, 50);
      });
      saveLeaderboardHighScore(currentUser.uid, {
        ...entry,
        cosmeticsApplied: entry.cosmeticsApplied || leaderboardCosmeticsApplied(activeCosmetics),
        podiumAchieved: entry.podiumAchieved || /champion|runner|third/i.test(String(baseResult.status || "")),
        bestCampaign: nextIsBest ? {
          ...buildCampaignSummary({
            team,
            userForm: nextUserForm,
            campaignPoints: nextScoringState.campaignPoints,
            result: enrichedResult,
            fallbackRound: matchStage,
          }),
          points: Number(nextScoringState.campaignPoints || 0),
          tournamentProgress: nextUserForm,
          cosmeticBootEquipped: Boolean(activeCosmetics?.goldenBoot),
          cosmeticBallEquipped: Boolean(activeCosmetics?.goldenBall),
          cosmeticGloveEquipped: Boolean(activeCosmetics?.goldenGlove),
          cosmeticsApplied: leaderboardCosmeticsApplied(activeCosmetics),
          status: enrichedResult.status || baseResult.status || null,
          podium: podium || null,
        } : bestCampaignSummary,
      })
        .then(() => loadLeaderboardRows(50).then(setLeaderboardRows))
        .catch((error) => console.warn("Leaderboard high-score save failed", error));
    }

    return enrichedResult;
  };

  const closeMenu = () => { setMenuOpen(false); setMenuInitialView("menu"); setMenuInitialAuthMode("signin"); setMenuAuthShowLogoBack(false); };
  const openAuthMenu = (mode = "signin", options = {}) => {
    setMenuInitialView("auth");
    setMenuInitialAuthMode(mode || "signin");
    setMenuAuthShowLogoBack(Boolean(options?.showLogoBack));
    setMenuAuthRequestId((id) => id + 1);
    setMenuOpen(true);
  };
  const resetTournament = () => { setScreen("home"); setDrawer(null); setMenuOpen(false); setFixtureView("group"); setStandingsView("group"); setSelectedGroup("A"); setTeam(null); setOpponent(""); setScore([0, 0]); setMatchResult(null); setModalDismissed(false); setTable(blankTable()); setSchedule(buildSchedule()); setKnockoutFixtures([]); setCurrentKnockoutMatch(null); setPodium({}); setMatchStage("GROUP STAGE"); setUserForm([]); setScoringState(createScoringState()); setCampaignPlayedMatches(0); };
  const handleResumeCampaign = async () => {
    const snapshot = currentUser?.uid
      ? await loadCurrentProgress(currentUser.uid).catch(() => firebaseProfile?.currentProgress || firebaseProfile?.savedGames?.current || null)
      : (firebaseProfile?.currentProgress || firebaseProfile?.savedGames?.current || null);
    const restored = restoreGameSnapshot(snapshot);
    if (!restored) setScreen("home");
  };

  const openMatch = () => { closeMenu(); setDrawer(null); };
  const openFixtures = () => { closeMenu(); setFixtureView(groupStageComplete ? "knockout" : "group"); setDrawer("fixtures"); };
  const openGroups = () => { closeMenu(); setStandingsView(groupStageComplete ? "knockout" : standingsView); setDrawer("groups"); };
  const openClubhouse = () => { closeMenu(); setDrawer("clubhouse"); };
  const openTrophyCabinet = () => { closeMenu(); setDrawer("trophyCabinet"); };
  const openLeaderboard = () => { closeMenu(); setDrawer("leaderboard"); };
  const unlockAllTeams = () => {
    setAllTeamsUnlocked(true);
    safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
    if (currentUser?.uid) {
      saveAllTeamsUnlocked(currentUser.uid, true).catch((error) => console.warn("Unlock-all-teams save failed", error));
    }
  };

  const selectGroup = (group) => {
    unlockAllTeams();
    setSelectedGroup(group);
    setScreen("teams");
  };

  const consumeLocalGoldenTicket = () => {
    setActiveCosmetics((current) => {
      const next = { ...(current || {}), goldenTicket: false, goldenTicketQuantity: 0 };
      safeWriteJson(COSMETICS_KEY, next);
      return next;
    });

    if (currentUser?.uid) {
      consumeGoldenTicket(currentUser.uid).catch((error) => {
        console.warn("Golden Ticket consume failed", error);
      });
    }
  };

  const startTeam = (name, groupOverride = selectedGroup) => {
    if (["Canada", "Mexico", "United States"].includes(name)) {
      const nextAchievements = { ...createDefaultAchievements(), ...(achievements || {}), ourTime: true };
      syncAchievementState(nextAchievements);
    }
    setCampaignPlayedMatches(0);
    const ticketQuantity = Number(activeCosmetics?.goldenTicketQuantity ?? (activeCosmetics?.goldenTicket ? 1 : 0));
    const canUseGoldenTicket = Boolean(activeCosmetics?.goldenTicket) && ticketQuantity > 0;
    const useGoldenTicket = canUseGoldenTicket && window.confirm("Use Golden Ticket and advance straight to the final? This consumes 1 ticket.");

    if (useGoldenTicket) {
      const ticketRun = simulateGoldenTicketFinalRun(name, groupOverride);
      if (ticketRun?.currentFinalFixture) {
        setSelectedGroup(ticketRun.selectedGroup || groupOverride);
        setTeam(name);
        setOpponent(ticketRun.opponent || getFixtureOpponent(name, ticketRun.currentFinalFixture));
        setSchedule(ticketRun.schedule || buildSchedule());
        setTable(ticketRun.table || blankTable());
        setKnockoutFixtures(ticketRun.knockoutFixtures || []);
        setCurrentKnockoutMatch(ticketRun.currentFinalFixture);
        setScreen("match");
        setDrawer(null);
        setMenuOpen(false);
        setScore([0, 0]);
        setMatchStage("FINAL");
        setMatchResult(null);
        setModalDismissed(false);
        setUserForm(["W", "W", "W", "W", "W", "W", "W"].slice(-8));
        setScoringState(createScoringState());
        setFixtureView("knockout");
        setStandingsView("knockout");
        const nextAchievements = { ...createDefaultAchievements(), ...(achievements || {}), corruptionScandal: true };
        syncAchievementState(nextAchievements);
        consumeLocalGoldenTicket();
        return;
      }
    }

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
    setUserForm([]);
    setScoringState(createScoringState());
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
    const displayResult = applyLeaderboardScore({
      home: match.home,
      away: match.away,
      homeGoals,
      awayGoals,
      userWon: true,
      won: true,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : RESULT_STATUS.GROUP_WIN,
      isDraw: false,
    }, []);
    setMatchResult(displayResult);
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
      const status = getUserFinishStatus({ result, fixture: playedUserMatch, matchNo, userWon: result.userWon });
      setModalDismissed(false);
      setUserForm((form) => [...form, resultFormCode(result, team)].filter(Boolean).slice(-8));
      const displayResult = applyLeaderboardScore({
        home: playedUserMatch.home,
        away: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
        userWon: result.userWon,
        won: result.userWon,
        week: null,
        matchNo,
        status,
        nextFixture: nextUserFixture,
        isDraw: false,
        attempts: result.attempts || null,
      }, result.userShotEvents || []);
      setMatchResult(displayResult);
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
    const displayResult = applyLeaderboardScore({
      home: match.home,
      away: match.away,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      userWon: result.userWon,
      won: result.userWon,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : (result.isDraw ? RESULT_STATUS.GROUP_DRAW : result.userWon ? RESULT_STATUS.GROUP_WIN : RESULT_STATUS.GROUP_LOSS),
      isDraw: result.isDraw || result.homeGoals === result.awayGoals,
      attempts: result.attempts || null,
    }, result.userShotEvents || []);
    setMatchResult(displayResult);
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;

    if (matchResult.status === RESULT_STATUS.THIRD_PLACE_PENDING) {
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

    if ([RESULT_STATUS.ELIMINATED, RESULT_STATUS.RUNNER_UP, RESULT_STATUS.THIRD_PLACE, RESULT_STATUS.FOURTH_PLACE].includes(matchResult.status)) { resetTournament(); return; }

    if (matchResult.status === RESULT_STATUS.CHAMPION) {
      setCurrentKnockoutMatch(null);
      setStandingsView("knockout");
      setDrawer("groups");
      setMatchResult(null);
      setModalDismissed(false);
      return;
    }

    if (matchResult.status === RESULT_STATUS.QUALIFIED) {
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

    if (matchResult.status === RESULT_STATUS.KNOCKOUT_WIN) {
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

  const toggleCosmetic = (id) => {
    setActiveCosmetics((current) => {
      let next;

      if (id === "goldenTicket") {
        const currentQuantity = Number(current?.goldenTicketQuantity ?? (current?.goldenTicket ? 1 : 0));
        const nextActive = !current?.goldenTicket;
        const nextQuantity = nextActive ? Math.max(1, currentQuantity) : currentQuantity;
        next = { ...(current || {}), goldenTicket: nextActive, goldenTicketQuantity: nextQuantity };
      } else {
        next = { ...(current || {}), [id]: !current?.[id] };
      }

      safeWriteJson(COSMETICS_KEY, next);

      if (currentUser?.uid) {
        unlockCosmetic(currentUser.uid, id, Boolean(next[id])).catch((error) => {
          console.warn("Cosmetic save failed", error);
        });
      }

      return next;
    });
  };

  const handleNicknameUpdate = async (nickname) => {
    const clean = String(nickname || "").trim().toUpperCase();
    if (!currentUser?.uid) throw new Error("Please sign in first.");
    if (!/^[A-Z0-9]{1,10}$/.test(clean)) throw new Error("Use 1-10 letters or numbers.");
    const taken = await isNicknameTaken(clean, currentUser.uid);
    if (taken) throw new Error("Username already taken.");
    await updateProfile(currentUser, { displayName: clean });
    await saveUserNickname(currentUser.uid, clean);
    setCurrentUser({ ...currentUser, displayName: clean });
  };

  const clearAccountSessionState = () => {
    setFirebaseProfile(null);
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    setModalDismissed(false);
    setTable(blankTable());
    setSchedule(buildSchedule());
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setPodium({});
    setMatchStage("GROUP STAGE");
    setUserForm([]);
    setScoringState(createScoringState());
    setCampaignPlayedMatches(0);
    setBestCampaignScore(0);
    setBestCampaignSummary(null);
    setMondayCupsWon(0);
    setAllTimeGoals(0);
    setAllTimeShots(0);
    setActiveCosmetics({ goldenBoot: false, goldenBall: false, goldenGlove: false, goldenTicket: false, goldenTicketQuantity: 0 });
    syncAchievementState(createDefaultAchievements());
    syncNationCupWinsState({});

    try {
      window.localStorage.removeItem(BEST_CAMPAIGN_SCORE_KEY);
      window.localStorage.removeItem(BEST_CAMPAIGN_SUMMARY_KEY);
      window.localStorage.removeItem(MONDAY_CUPS_WON_KEY);
      window.localStorage.removeItem(ALL_TIME_GOALS_KEY);
      window.localStorage.removeItem(ALL_TIME_SHOTS_KEY);
      window.localStorage.removeItem(COSMETICS_KEY);
      window.localStorage.removeItem(ACHIEVEMENTS_KEY);
      window.localStorage.removeItem(NATION_CUP_WINS_KEY);
      window.localStorage.removeItem("mondayCup.localLeaderboardRows");
    } catch (error) {
      console.warn("Could not clear local account session cache", error);
    }
  };

  const handleSignOut = async () => {
    closeMenu();

    if (currentUser?.uid) {
      await saveCurrentProgress(currentUser.uid, buildGameSnapshot()).catch((error) => {
        console.warn("Could not save current progress before sign out", error);
      });
    }

    await signOut(auth);
    setCurrentUser(null);
    clearAccountSessionState();
    setDrawer(null);
    setScreen("home");
  };

  const menuProps = { menuOpen, menuInitialView, menuInitialAuthMode, menuAuthShowLogoBack, menuAuthRequestId, onToggleMenu: () => { setMenuInitialView("menu"); setMenuInitialAuthMode("signin"); setMenuAuthShowLogoBack(false); setMenuOpen((open) => !open); }, onCloseMenu: closeMenu, onOpenAuthMenu: openAuthMenu, onMatch: openMatch, onFixtures: openFixtures, onGroups: openGroups, onClubhouse: openClubhouse, onTrophyCabinet: openTrophyCabinet, onLeaderboard: openLeaderboard, onRestart: resetTournament, onSignOut: handleSignOut, canSignOut: Boolean(currentUser), onAuthComplete: handleAuthComplete };

  const drawerElement = drawer === "groups"
    ? <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} podium={podium} /></DrawerShell>
    : drawer === "clubhouse"
      ? (
        <DrawerShell>
          <ClubhouseScreen
            menuProps={menuProps}
            team={team}
            userForm={userForm}
            campaignPoints={scoringState.campaignPoints}
            bestCampaignSummary={bestCampaignSummary}
            currentRoundLabel={currentRoundLabel}
            leaderboardRank={myLeaderboardRank}
            mondayCupsWon={mondayCupsWon}
            allTimeGoals={allTimeGoals}
            allTimeShots={allTimeShots}
            activeCosmetics={activeCosmetics}
            onToggleCosmetic={toggleCosmetic}
            allTeamsUnlocked={allTeamsUnlocked}
            onUnlockAllTeams={unlockAllTeams}
            currentUser={currentUser}
            onNicknameUpdate={handleNicknameUpdate}
          />
        </DrawerShell>
      )
      : drawer === "trophyCabinet"
        ? <DrawerShell><TrophyCabinetScreen menuProps={menuProps} achievements={achievements} nationCupWins={nationCupWins} /></DrawerShell>
        : drawer === "leaderboard"
          ? <DrawerShell><LeaderboardScreen menuProps={menuProps} rows={leaderboardRows} currentCampaignScore={scoringState.campaignPoints} bestCampaignScore={bestCampaignScore} team={team} bestCampaignSummary={bestCampaignSummary} currentUser={currentUser} /></DrawerShell>
          : drawer === "fixtures"
            ? <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>
            : null;

  if (screen === "home") {
    if (drawerElement) return drawerElement;
    return <HomeScreen allTeamsUnlocked={allTeamsUnlocked} onSelectGroup={selectGroup} onSelectTeam={startTeam} onAuthComplete={handleAuthComplete} authReady={authReady} currentUser={currentUser} onOpenClubhouse={openClubhouse} onResumeCampaign={handleResumeCampaign} hasResumeCampaign={Boolean(firebaseProfile?.currentProgress?.active || firebaseProfile?.savedGames?.current?.active)} />;
  }
  if (screen === "hosts") return <HostSelectScreen allTeamsUnlocked={allTeamsUnlocked} currentUser={currentUser} onAuthComplete={handleAuthComplete} onBack={() => setScreen("home")} onSelectGroup={selectGroup} onSelectTeam={startTeam} />;
  if (screen === "teams") return <TeamSelectScreen allTeamsUnlocked={allTeamsUnlocked} selectedGroup={selectedGroup} onBack={() => setScreen("hosts")} onSelectGroup={setSelectedGroup} onSelectTeam={startTeam} />;

  const matchScreen = <MatchScreen team={team} opponent={opponent} score={score} matchResult={matchResult} modalDismissed={modalDismissed} onDismissModal={() => setModalDismissed(true)} onQuickWin={quickWin} onMatchComplete={handleMatchComplete} onNextMatch={nextMatch} onViewBracket={() => { setStandingsView("knockout"); setDrawer("groups"); setModalDismissed(true); }} onPlayAgain={resetTournament} menuProps={menuProps} stageLabel={matchStage} fixture={currentFixture} groupRows={allGroups.find((item) => item.group === selectedGroup)?.rows || []} qualifiedTeams={qualifiedTeams} selectedGroup={selectedGroup} userForm={userForm} podium={podium} activeCosmetics={activeCosmetics} />;

  if (screen === "match") {
    return (
      <>
        <div className={drawerElement ? "fixed inset-0 -z-10 opacity-0 pointer-events-none" : undefined} aria-hidden={Boolean(drawerElement)}>
          {matchScreen}
        </div>
        {drawerElement}
      </>
    );
  }

  if (drawerElement) return drawerElement;
  return matchScreen;
}
