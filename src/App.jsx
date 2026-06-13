import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { auth } from "./firebase.js";
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
  simulateGoldenTicketFinalRun,
  simulateSemiFinalRun,
  simulateRemainingKnockoutTournament,
  runSelfTests,
} from "./logic/tournament.js";
import { RESULT_STATUS } from "./logic/resultStatus.js";
import { selectScheduleFocus } from "./logic/schedulePositioningSelectors.js";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import { getUserFinishStatus } from "./logic/podium.js";
import {
  LEADERBOARD_POINTS,
  applyCompletedMatchScore,
  createLeaderboardEntry,
  createScoringState,
} from "./logic/leaderboardScoring.js";
import {
  HomeScreen,
  HostSelectScreen,
  TeamSelectScreen,
} from "./components/selection/SelectionScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";
import ShirtShareModal from "./components/share/ShirtShareModal.jsx";
import {
  ensureUserDocument,
  isNicknameTaken,
  loadCurrentProgress,
  loadLeaderboardRows,
  loadUserProfile,
  saveCurrentProgress,
  clearCurrentProgress,
  saveLeaderboardHighScore,
  saveUserNickname,
  saveUserProfile,
  consumeGoldenTicket,
  saveCosmeticActive,
  saveCheckoutStarted,
  buildStoreEntitlements,
  saveUserShirtProfile,
  saveUserFeedback,
} from "./lib/firebaseUser.js";
import ShopModal from "./components/store/ShopModal.jsx";
import FeedbackModal from "./components/feedback/FeedbackModal.jsx";
import {
  BEST_CAMPAIGN_SCORE_KEY,
  BEST_CAMPAIGN_SUMMARY_KEY,
  MONDAY_CUPS_WON_KEY,
  ALL_TIME_GOALS_KEY,
  ALL_TIME_SHOTS_KEY,
  COSMETICS_KEY,
  ALL_TEAMS_UNLOCKED_KEY,
  safeReadNumber,
  safeWriteNumber,
  safeReadJson,
  safeWriteJson,
  safeReadLeaderboardRows,
  safeWriteLeaderboardRows,
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

import {
  ACHIEVEMENTS_KEY,
  ALL_TIME_MATCHES_DRAWN_KEY,
  ALL_TIME_CAMPAIGNS_COMPLETED_KEY,
  ALL_TIME_MATCHES_LOST_KEY,
  ALL_TIME_MATCHES_PLAYED_KEY,
  ALL_TIME_MATCHES_WON_KEY,
  CORE_ACHIEVEMENT_KEYS,
  EMPTY_ACTIVE_COSMETICS,
  HOST_TEAMS,
  NATION_CUP_WINS_KEY,
  NATION_STICKER_PROGRESS_KEY,
  PODIUM_ACHIEVEMENT_KEYS,
  SHARE_EDITOR_EMAIL,
  containsWoodwork,
  mergeUnlockedKeys,
  normaliseActiveCosmeticsForEntitlements,
  userScoreParts,
} from "./app/appCore.js";

import { AppDrawer } from "./app/components/AppDrawer.jsx";
import { withNonMatchFooter } from "./app/components/NonMatchFooter.jsx";
import { useLeaderboardRows } from "./app/hooks/useLeaderboardRows.js";
import {
  getUnopenedNationStickerNoticeKey,
  hasUnopenedNationSticker,
} from "./app/stickerNotices.js";

runSelfTests();

const waitForCheckoutConfirmation = (ms) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));


const FEEDBACK_KEY = "mondayCup.feedback";

const createFeedbackState = (source = {}) => {
  const ratings = Array.isArray(source?.ratings) ? source.ratings : [];
  const latestRating = source?.latestRating || source?.feedbackLatest || ratings[ratings.length - 1] || null;
  return {
    prompt1Shown: Boolean(source?.prompt1Shown),
    prompt2Shown: Boolean(source?.prompt2Shown),
    hasSubmitted: Boolean(source?.hasSubmitted || latestRating || ratings.length),
    latestRating,
    ratings,
    lastPromptType: source?.lastPromptType || latestRating?.promptType || null,
    lastPromptedAt: Number(source?.lastPromptedAt || 0),
    lastSubmittedAt: Number(source?.lastSubmittedAt || latestRating?.createdAt || 0),
  };
};

const buildFeedbackPromptType = ({ feedback, campaignsCompleted, cupsWon }) => {
  const state = createFeedbackState(feedback);
  if (state.hasSubmitted) return null;
  const campaigns = Number(campaignsCompleted || 0);
  const wins = Number(cupsWon || 0);
  if (!state.prompt1Shown && campaigns >= 3) return "prompt1";
  if (state.prompt1Shown && !state.prompt2Shown && (wins > 0 || campaigns >= 10)) return "prompt2";
  return null;
};

const GOLDEN_TICKET_NEXT_CAMPAIGN_KEY = "mondayCup.goldenTicketNextCampaign";
const DEV_SEMI_FINAL_EMAIL = "alexjashworth@gmail.com";

const readGoldenTicketNextCampaignIntent = () => {
  try {
    return window.localStorage?.getItem(GOLDEN_TICKET_NEXT_CAMPAIGN_KEY) === "1";
  } catch {
    return false;
  }
};

const writeGoldenTicketNextCampaignIntent = (active) => {
  try {
    if (active) window.localStorage?.setItem(GOLDEN_TICKET_NEXT_CAMPAIGN_KEY, "1");
    else window.localStorage?.removeItem(GOLDEN_TICKET_NEXT_CAMPAIGN_KEY);
  } catch {
    // localStorage can be unavailable in private browsing; state still carries the intent.
  }
};

export default function App() {
  const [screen, setScreen] = useState("home");
  const [twoPlayerMode, setTwoPlayerMode] = useState(false);
  const twoPlayerThrowawayRef = useRef(false);
  const cloudProfileSaveVersionRef = useRef(0);
  const accountSessionUidRef = useRef(auth.currentUser?.uid || null);
  const [twoPlayerSetup, setTwoPlayerSetup] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [shirtShareOpen, setShirtShareOpen] = useState(false);
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
  const [allTeamsUnlocked, setAllTeamsUnlocked] = useState(false);
  const [team, setTeam] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState([0, 0]);
  const [matchResult, setMatchResult] = useState(null);
  const [matchResetKey, setMatchResetKey] = useState(0);
  const [activeMatchSnapshot, setActiveMatchSnapshot] = useState(null);
  const activeMatchSnapshotRef = useRef(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [awardedTrophyMatchKey, setAwardedTrophyMatchKey] = useState(null);
  const [acknowledgedStickerNoticeKey, setAcknowledgedStickerNoticeKey] = useState("");
  const [table, setTable] = useState(blankTable());
  const [schedule, setSchedule] = useState(buildSchedule());
  const [knockoutFixtures, setKnockoutFixtures] = useState([]);
  const [currentKnockoutMatch, setCurrentKnockoutMatch] = useState(null);
  const [podium, setPodium] = useState({});
  const [matchStage, setMatchStage] = useState("GROUP STAGE");
  const [userForm, setUserForm] = useState([]);
  const [scoringState, setScoringState] = useState(() => createScoringState());
  const [bestCampaignScore, setBestCampaignScore] = useState(() =>
    safeReadNumber(BEST_CAMPAIGN_SCORE_KEY, 0),
  );
  const [leaderboardRows, setLeaderboardRows] = useLeaderboardRows();
  const [bestCampaignSummary, setBestCampaignSummary] = useState(() =>
    safeReadJson(BEST_CAMPAIGN_SUMMARY_KEY, null),
  );
  const [mondayCupsWon, setMondayCupsWon] = useState(() =>
    safeReadNumber(MONDAY_CUPS_WON_KEY, 0),
  );
  const [allTimeCampaignsCompleted, setAllTimeCampaignsCompleted] = useState(() =>
    safeReadNumber(ALL_TIME_CAMPAIGNS_COMPLETED_KEY, 0),
  );
  const [feedbackState, setFeedbackState] = useState(() =>
    createFeedbackState(safeReadJson(FEEDBACK_KEY, {})),
  );
  const [feedbackPromptType, setFeedbackPromptType] = useState(null);
  const [pendingFeedbackCheck, setPendingFeedbackCheck] = useState(false);
  const [allTimeGoals, setAllTimeGoals] = useState(() =>
    safeReadNumber(ALL_TIME_GOALS_KEY, 0),
  );
  const [allTimeShots, setAllTimeShots] = useState(() =>
    safeReadNumber(ALL_TIME_SHOTS_KEY, 0),
  );
  const [allTimeMatchesPlayed, setAllTimeMatchesPlayed] = useState(() =>
    safeReadNumber(ALL_TIME_MATCHES_PLAYED_KEY, 0),
  );
  const [allTimeMatchesWon, setAllTimeMatchesWon] = useState(() =>
    safeReadNumber(ALL_TIME_MATCHES_WON_KEY, 0),
  );
  const [allTimeMatchesDrawn, setAllTimeMatchesDrawn] = useState(() =>
    safeReadNumber(ALL_TIME_MATCHES_DRAWN_KEY, 0),
  );
  const [allTimeMatchesLost, setAllTimeMatchesLost] = useState(() =>
    safeReadNumber(ALL_TIME_MATCHES_LOST_KEY, 0),
  );
  const [achievements, setAchievements] = useState(() =>
    safeReadJson(ACHIEVEMENTS_KEY, {}),
  );
  const [nationCupWins, setNationCupWins] = useState(() =>
    safeReadJson(NATION_CUP_WINS_KEY, {}),
  );
  const [nationStickerProgress, setNationStickerProgress] = useState(() =>
    safeReadJson(NATION_STICKER_PROGRESS_KEY, {}),
  );
  const [activeCosmetics, setActiveCosmetics] = useState(() =>
    normaliseActiveCosmeticsForEntitlements(
      safeReadJson(COSMETICS_KEY, EMPTY_ACTIVE_COSMETICS),
      {},
    ),
  );
  const [campaignCosmeticsUsed, setCampaignCosmeticsUsed] = useState({
    goldenBoot: false,
    goldenBall: false,
    goldenGlove: false,
    goldenTicket: false,
    cosmeticBallEquipped: false,
    cosmeticGloveEquipped: false,
    goldenTicketUsed: false,
  });
  const [firebaseProfile, setFirebaseProfile] = useState(null);
  const [userShirtProfile, setUserShirtProfile] = useState(null);
  const [shopInitialItemId, setShopInitialItemId] = useState(null);
  const [pendingShopItemId, setPendingShopItemId] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [goldenTicketNextCampaign, setGoldenTicketNextCampaign] = useState(() =>
    readGoldenTicketNextCampaignIntent(),
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const nextUid = user?.uid || null;
      const previousUid = accountSessionUidRef.current;
      if (previousUid && previousUid !== nextUid) {
        clearAccountSessionState();
      }
      accountSessionUidRef.current = nextUid;
      setCurrentUser(user || null);
      setAuthReady(true);

      if (user) {
        try {
          await user.reload();
        } catch (error) {
          console.warn("Could not refresh email verification state", error);
        }

        const freshUser = auth.currentUser || user;
        if (accountSessionUidRef.current !== freshUser.uid) {
          clearAccountSessionState();
          accountSessionUidRef.current = freshUser.uid;
        }
        setCurrentUser(freshUser);

        if (!freshUser.emailVerified) {
          setFirebaseProfile(null);
          setUserShirtProfile(null);
          setAllTeamsUnlocked(false);
          safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, false);
          const lockedCosmetics = normaliseActiveCosmeticsForEntitlements(
            EMPTY_ACTIVE_COSMETICS,
            {},
          );
          setActiveCosmetics(lockedCosmetics);
          safeWriteJson(COSMETICS_KEY, lockedCosmetics);
          return;
        }

        try {
          await ensureUserDocument(
            freshUser,
            freshUser.displayName || freshUser.email?.split("@")[0] || "Player",
            {
              source: "auth-state",
              accountStatus: {
                emailVerified: true,
                verificationRequired: false,
              },
            },
          );
          const profile = await loadUserProfile(freshUser.uid);
          setFirebaseProfile(profile || null);
          setUserShirtProfile(
            profile?.userShirt || profile?.shirt || profile?.shareShirt || null,
          );
          const entitlements = buildStoreEntitlements(profile || {});
          if (entitlements.allTeams) {
            setAllTeamsUnlocked(true);
            safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
          } else {
            setAllTeamsUnlocked(false);
            safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, false);
          }
          const nextActiveCosmetics = normaliseActiveCosmeticsForEntitlements(
            profile?.cosmeticsActive || profile?.cosmeticsEquipped || {},
            entitlements,
          );
          setActiveCosmetics(nextActiveCosmetics);
          safeWriteJson(COSMETICS_KEY, nextActiveCosmetics);
          if (freshUser.uid) {
            ["goldenBoot", "goldenBall", "goldenGlove"].forEach((key) => {
              const storedActive = Boolean(
                (profile?.cosmeticsActive ||
                  profile?.cosmeticsEquipped ||
                  {})?.[key],
              );
              if (storedActive !== Boolean(nextActiveCosmetics?.[key])) {
                saveCosmeticActive(
                  freshUser.uid,
                  key,
                  Boolean(nextActiveCosmetics?.[key]),
                ).catch(() => {});
              }
            });
          }
          if (
            profile?.bestCampaign?.gameScore ||
            profile?.bestCampaign?.points ||
            profile?.bestCampaign?.campaignPoints
          ) {
            const profileBestScore = Number(
              profile.bestCampaign.gameScore ??
                profile.bestCampaign.points ??
                profile.bestCampaign.campaignPoints ??
                0,
            );
            setBestCampaignScore(profileBestScore);
            const summary = {
              ...(profile.bestCampaign || {}),
              team: profile.bestCampaign.teamName || profile.bestCampaign.team || "NO TEAM",
              teamName: profile.bestCampaign.teamName || profile.bestCampaign.team || "NO TEAM",
              cupRun:
                profile.bestCampaign.cupRun ||
                profile.bestCampaign.form ||
                profile.bestCampaign.tournamentProgress ||
                [],
              gameScore: profileBestScore,
              roundLabel:
                profile.bestCampaign.round ||
                profile.bestCampaign.phase ||
                profile.bestCampaign.roundLabel ||
                profile.bestCampaign.stage ||
                "NO CAMPAIGN",
              updatedAt: profile.bestCampaign.updatedAt || Date.now(),
            };
            setBestCampaignSummary(summary);
            safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, profileBestScore);
            safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, summary);
          }
          if (profile?.careerStats || profile?.stats) {
            const stats = profile.careerStats || profile.stats || {};
            const cloudNationCupWins = Object.values(profile?.nationCupWins || {}).filter((record) =>
              Boolean(record?.unlocked || record?.cupWon || record?.champions || record?.liftTheCup),
            ).length;
            const cloudCupWins = Math.max(
              Number(stats.cupsWon ?? stats.cupWins ?? stats.mondayCupsWon ?? stats.mondayCupWins ?? 0),
              cloudNationCupWins,
            );
            setMondayCupsWon(cloudCupWins);
            setAllTimeCampaignsCompleted(Number(stats.campaignsCompleted ?? stats.tournamentsCompleted ?? 0));
            setAllTimeGoals(Number(stats.goalsScored ?? stats.totalGoalsScored ?? 0));
            setAllTimeShots(Number(stats.totalShots ?? stats.totalShotsTaken ?? 0));
            setAllTimeMatchesPlayed(Number(stats.matchesPlayed ?? stats.totalMatchesPlayed ?? 0));
            setAllTimeMatchesWon(Number(stats.matchesWon ?? stats.totalMatchesWon ?? 0));
            setAllTimeMatchesDrawn(Number(stats.matchesDrawn ?? stats.totalMatchesDrawn ?? 0));
            setAllTimeMatchesLost(Number(stats.matchesLost ?? stats.totalMatchesLost ?? 0));
          }
          if (profile?.achievements || profile?.trophies) {
            // loadUserProfile exposes `achievements` as the flat UI-ready trophy map.
            // `trophies` is the nested Firestore canonical shape, so prefer the UI alias here.
            const trophyState = profile.achievements || profile.trophies || {};
            setAchievements(trophyState);
            safeWriteJson(ACHIEVEMENTS_KEY, trophyState);
          }
          if (profile?.nationCupWins) {
            setNationCupWins(profile.nationCupWins || {});
            safeWriteJson(NATION_CUP_WINS_KEY, profile.nationCupWins || {});
          }
          if (profile?.stickers || profile?.nationStickerProgress) {
            const stickerState = profile.stickers || profile.nationStickerProgress || {};
            setNationStickerProgress(stickerState);
            safeWriteJson(NATION_STICKER_PROGRESS_KEY, stickerState);
          }
          if (profile?.feedback || profile?.feedbackLatest) {
            const nextFeedback = createFeedbackState({
              ...(profile?.feedback || {}),
              feedbackLatest: profile?.feedbackLatest,
            });
            setFeedbackState(nextFeedback);
            safeWriteJson(FEEDBACK_KEY, nextFeedback);
          }
        } catch (error) {
          console.warn("User profile sync failed", error);
        }
      } else {
        setFirebaseProfile(null);
        setUserShirtProfile(null);
        accountSessionUidRef.current = null;
      }
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!authReady || !hasCloudUser) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search || "");
    if (params.get("checkout") !== "success") return;

    const sessionId = String(params.get("session_id") || "").trim();
    if (!sessionId) return;

    const confirmationKey = `mondayCup.checkoutConfirmation.v2.${sessionId}`;
    if (window.sessionStorage?.getItem(confirmationKey) === "done") return;

    let cancelled = false;

    const cleanCheckoutParams = () => {
      try {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("checkout");
        nextUrl.searchParams.delete("session_id");
        window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      } catch {
        // Ignore URL cleanup failures; purchase confirmation has already completed.
      }
    };

    const refreshProfileFromCloud = async () => {
      const profile = await loadUserProfile(currentUser.uid);
      if (cancelled) return null;

      setFirebaseProfile(profile || null);
      setUserShirtProfile(profile?.userShirt || profile?.shirt || profile?.shareShirt || null);

      const entitlements = buildStoreEntitlements(profile || {});
      setAllTeamsUnlocked(Boolean(entitlements.allTeams));
      safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, Boolean(entitlements.allTeams));

      const nextActiveCosmetics = normaliseActiveCosmeticsForEntitlements(
        profile?.cosmeticsActive || profile?.cosmeticsEquipped || {},
        entitlements,
      );
      setActiveCosmetics(nextActiveCosmetics);
      safeWriteJson(COSMETICS_KEY, nextActiveCosmetics);

      return { profile, entitlements };
    };

    const confirmCheckout = async () => {
      try {
        window.sessionStorage?.setItem(confirmationKey, "running");
        const idToken = await currentUser.getIdToken(true);
        const response = await fetch("/api/confirm-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || `Checkout confirmation failed with status ${response.status}`);
        }

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const refreshed = await refreshProfileFromCloud();
          if (!refreshed || cancelled) return;

          const grants = payload?.grants || {};
          const hasExpectedEntitlement =
            (!grants.allTeams || refreshed.entitlements.allTeams) &&
            (!grants.goldenBoot || refreshed.entitlements.goldenBoot) &&
            (!grants.goldenBall || refreshed.entitlements.goldenBall) &&
            (!grants.goldenGlove || refreshed.entitlements.goldenGlove) &&
            (!Number(grants.goldenTicketQty || 0) || Number(refreshed.entitlements.goldenTicketQty || 0) > 0);

          if (hasExpectedEntitlement) break;
          await waitForCheckoutConfirmation(400 + attempt * 250);
        }

        window.sessionStorage?.setItem(confirmationKey, "done");
        cleanCheckoutParams();
      } catch (error) {
        window.sessionStorage?.removeItem(confirmationKey);
        console.warn("Checkout confirmation failed", error);
      }
    };

    confirmCheckout();

    return () => {
      cancelled = true;
    };
  }, [authReady, currentUser?.uid, currentUser?.emailVerified]);

  const handleAuthComplete = async (user, options = {}) => {
    const nextUser = user || auth.currentUser || null;
    const guestSnapshot = buildGameSnapshot();
    const hasGuestProgress = Boolean(
      !isCampaignSaveBlocked() && guestSnapshot?.active && guestSnapshot?.team,
    );
    setCurrentUser(nextUser);

    if (nextUser?.uid && !nextUser.emailVerified) {
      setFirebaseProfile(null);
      setAllTeamsUnlocked(false);
      safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, false);
      openAuthMenu("verify", { showLogoBack: true });
      return;
    }

    const authSource = String(options?.source || "").toLowerCase();
    const signedUpNow = Boolean(
      options?.isSignup || authSource.includes("signup"),
    );
    if (nextUser?.uid && signedUpNow) {
      try {
        const seenKey = `mondayCup.shirtShareSeen.${nextUser.uid}`;
        if (!window.localStorage?.getItem(seenKey)) {
          window.localStorage?.setItem(seenKey, "1");
          setShirtShareOpen(true);
        }
      } catch {
        setShirtShareOpen(true);
      }
    }

    if (nextUser) {
      try {
        await ensureUserDocument(
          nextUser,
          nextUser.displayName || nextUser.email?.split("@")[0] || "Player",
          {
            source: "auth-complete",
          },
        );

        if (hasGuestProgress) {
          const currentCampaignPayload = {
            active: true,
            teamName: team || guestSnapshot.team || null,
            opponent: opponent || guestSnapshot.opponent || null,
            phase: currentRoundLabel || matchStage || "Group Stage",
            gameScore: Number(
              scoringState.campaignPoints ||
                guestSnapshot.scoringState?.campaignPoints ||
                0,
            ),
            cupRun: userForm || guestSnapshot.userForm || [],
            score: Array.isArray(score) ? score : guestSnapshot.score || [0, 0],
            matchResult: matchResult
              ? {
                  status: matchResult.status || null,
                  matchNo: matchResult.matchNo || null,
                  winner: matchResult.winner || null,
                  loser: matchResult.loser || null,
                  userScore: matchResult.userScore ?? null,
                  opponentScore: matchResult.opponentScore ?? null,
                }
              : null,
            runtimeSnapshot: guestSnapshot,
          };

          await saveUserProfile(nextUser.uid, {
            currentCampaign: currentCampaignPayload,
            cosmeticsEquipped: activeCosmetics || {
              goldenBoot: false,
              goldenBall: false,
              goldenGlove: false,
              goldenTicket: false,
              goldenTicketQuantity: 0,
            },
            trophies: achievements || {},
            nationCupWins: nationCupWins || {},
            stickers: nationStickerProgress || {},
          });
          await saveCurrentProgress(nextUser.uid, guestSnapshot);
        }

        const profile = await loadUserProfile(nextUser.uid);
        setFirebaseProfile(profile || null);
        setUserShirtProfile(
          profile?.userShirt || profile?.shirt || profile?.shareShirt || null,
        );
        const freshEntitlements = buildStoreEntitlements(profile || {});
        if (freshEntitlements.allTeams) {
          setAllTeamsUnlocked(true);
          safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
        } else {
          setAllTeamsUnlocked(false);
          safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, false);
        }
      } catch (error) {
        console.warn("User profile setup failed", error);
      }
    }

    if (nextUser && pendingShopItemId) {
      const itemId = pendingShopItemId;
      setPendingShopItemId(null);
      setShopInitialItemId(itemId);
      setShopOpen(true);
      setDrawer("clubhouse");
      setMenuOpen(false);
      return;
    }

    if (nextUser && signedUpNow) {
      setDrawer("clubhouse");
      setMenuOpen(false);
      setShirtShareOpen(true);
      return;
    }

    if (nextUser && (options?.source === "menu-auth" || options?.source === "home-signin")) {
      setDrawer("clubhouse");
      setMenuOpen(false);
      return;
    }

    if (options?.navigate !== false) {
      setScreen("teams");
      setDrawer(null);
    }
  };

  const groupStageComplete = schedule.every((fixture) => fixture.played);
  const visibleKnockoutFixtures =
    groupStageComplete && !knockoutFixtures.length
      ? buildRound32Fixtures(table)
      : knockoutFixtures;
  const allGroups = useMemo(
    () =>
      GROUP_LETTERS.map((group) => ({
        group,
        rows: sortRows(GROUPS[group].map((name) => table[name])),
      })),
    [table],
  );
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(
    () =>
      calculateEarlyQualifiedTeams(
        table,
        schedule,
        qualifiers,
        groupStageComplete,
      ),
    [table, schedule, qualifiers, groupStageComplete],
  );

  const activeGroupFixture = useMemo(() => {
    if (!team || !opponent) return null;
    return (
      schedule.find(
        (fixture) =>
          !fixture.played &&
          fixture.group === selectedGroup &&
          ((fixture.home === team && fixture.away === opponent) ||
            (fixture.home === opponent && fixture.away === team)),
      ) ||
      schedule.find(
        (fixture) =>
          fixture.group === selectedGroup &&
          ((fixture.home === team && fixture.away === opponent) ||
            (fixture.home === opponent && fixture.away === team)),
      ) ||
      null
    );
  }, [schedule, selectedGroup, team, opponent]);

  const twoPlayerFixture = twoPlayerMode && team && opponent
    ? {
        id: `two-player-final-${team}-${opponent}`,
        matchNo: 104,
        stage: "final",
        home: team,
        away: opponent,
        homeTeamId: team,
        awayTeamId: opponent,
        stadium: "MONDAY CUP",
        venue: "MONDAY CUP",
        allowDraw: false,
        requiresWinner: true,
      }
    : null;
  const currentFixture = twoPlayerFixture || (currentKnockoutMatch
    ? toGameFixture(currentKnockoutMatch)
    : toGameFixture(activeGroupFixture));
  const currentRoundLabel = team
    ? roundLabelForResult(matchResult, matchStage)
    : "NO CAMPAIGN";
  const scheduleFocus = selectScheduleFocus({
    matchResult,
    currentKnockoutMatch,
    activeGroupFixture,
    schedule,
    selectedGroup,
    team,
    groupStageComplete,
  });
  const hasCloudUser = Boolean(currentUser?.uid);
  const isCurrentUserVerified = Boolean(
    currentUser?.uid && currentUser.emailVerified,
  );

  const cosmeticUsageFromActive = (cosmetics = {}) => ({
    goldenBoot: Boolean(cosmetics?.goldenBoot),
    goldenBall: Boolean(cosmetics?.goldenBall),
    goldenGlove: Boolean(cosmetics?.goldenGlove),
    // Golden Ticket ownership is tracked on activeCosmetics for quantity/UI,
    // but it is only marked as used when a ticket campaign actually starts.
    goldenTicket: false,
    cosmeticBallEquipped: Boolean(cosmetics?.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmetics?.goldenGlove),
    goldenTicketUsed: false,
  });

  const mergeCosmeticUsage = (current = {}, incoming = {}) => ({
    goldenBoot: Boolean(current?.goldenBoot || incoming?.goldenBoot),
    goldenBall: Boolean(current?.goldenBall || incoming?.goldenBall),
    goldenGlove: Boolean(current?.goldenGlove || incoming?.goldenGlove),
    goldenTicket: Boolean(current?.goldenTicket || incoming?.goldenTicket),
    cosmeticBallEquipped: Boolean(
      current?.cosmeticBallEquipped ||
      incoming?.cosmeticBallEquipped ||
      incoming?.goldenBall,
    ),
    cosmeticGloveEquipped: Boolean(
      current?.cosmeticGloveEquipped ||
      incoming?.cosmeticGloveEquipped ||
      incoming?.goldenGlove,
    ),
    goldenTicketUsed: Boolean(
      current?.goldenTicketUsed ||
      incoming?.goldenTicketUsed ||
      incoming?.goldenTicket,
    ),
  });

  const campaignCosmeticsApplied = () =>
    mergeCosmeticUsage(
      campaignCosmeticsUsed,
      cosmeticUsageFromActive(activeCosmetics),
    );

  useEffect(() => {
    if (!team) return;
    const activeUsage = cosmeticUsageFromActive(activeCosmetics);
    if (
      !(
        activeUsage.goldenBoot ||
        activeUsage.goldenBall ||
        activeUsage.goldenGlove
      )
    )
      return;
    setCampaignCosmeticsUsed((current) =>
      mergeCosmeticUsage(current, activeUsage),
    );
  }, [
    team,
    activeCosmetics?.goldenBoot,
    activeCosmetics?.goldenBall,
    activeCosmetics?.goldenGlove,
    activeCosmetics?.goldenTicket,
  ]);

  const unlockAchievements = (keys = []) => {
    const cleanKeys = [...new Set(keys.filter(Boolean))];
    if (!cleanKeys.length) return;
    setAchievements((current) => {
      const next = mergeUnlockedKeys(current, cleanKeys);
      if (next !== current) safeWriteJson(ACHIEVEMENTS_KEY, next);
      return next;
    });
  };

  const updateNationStickerProgress = (updater, options = {}) => {
    let nextProgress = null;
    setNationStickerProgress((current) => {
      const next = updater(current || {});
      nextProgress = next;
      if (next !== current) safeWriteJson(NATION_STICKER_PROGRESS_KEY, next);
      return next;
    });

    if (options?.saveCloud && currentUser?.uid) {
      window.setTimeout(() => {
        if (!nextProgress) return;
        saveUserProfile(currentUser.uid, { stickers: nextProgress }).catch((error) => {
          console.warn("Sticker open state save failed", error);
        });
      }, 0);
    }
  };

  const countKeeperSavesForSticker = (opponentShotEvents = []) => {
    if (!Array.isArray(opponentShotEvents)) return 0;
    return opponentShotEvents.filter((event) => {
      if (!event || event.goal !== false) return false;
      if (event.savedByKeeper || event.keeperSave || event.gkSave || event.goalkeeperSave) return true;
      const raw = String(event?.shotResult || event?.result || event?.outcome || "").toLowerCase();
      if (raw.includes("save") || raw.includes("saved")) return true;
      const shotDirectionId = event.directionId || event.direction?.id || null;
      const keeperDirectionId = event.keeperDirectionId || event.keeperDirection?.id || null;
      const targetCode = event.code || event.targetCode || null;
      return raw === "s" && Boolean(shotDirectionId && keeperDirectionId && targetCode === shotDirectionId && keeperDirectionId === shotDirectionId);
    }).length;
  };


  const buildStickerClaimable = (record = {}) => ({
    ...(record.claimable || {}),
    kit: Number(record.campaignsCompleted || record.completedCampaigns || 0) >= 1,
    flag: Boolean(record.knockoutQualified || record.qualifiedForKnockouts || record.qualified || record.reachedKnockouts),
    champions: Boolean(record.cupWon),
    stopper: Number(record.keeperSaves || 0) >= 10,
    talisman: Number(record.wins || 0) >= 10,
    striker: Number(record.goals || 0) >= 25,
  });

  const recordNationStickerMatchProgress = (nation, updates = {}) => {
    if (!nation) return;
    updateNationStickerProgress((current) => {
      const existing = current?.[nation] || {};
      const opened = existing.opened || {};
      const nextNationBase = {
        ...existing,
        played: true,
        matchesPlayed: Number(existing.matchesPlayed || 0) + 1,
        wins: Number(existing.wins || 0) + (updates.userWon ? 1 : 0),
        goals: Number(existing.goals || 0) + Number(updates.goals || 0),
        keeperSaves: Number(existing.keeperSaves || 0) + Number(updates.keeperSaves || 0),
        campaignsCompleted:
          Number(existing.campaignsCompleted || 0) + (updates.campaignCompleted ? 1 : 0),
        knockoutQualified: Boolean(existing.knockoutQualified || updates.knockoutQualified || updates.qualifiedForKnockouts || updates.qualified),
        cupWon: Boolean(existing.cupWon || updates.cupWon),
        firstPlayedAt: existing.firstPlayedAt || Date.now(),
        lastPlayedAt: Date.now(),
        opened,
      };
      const nextNation = {
        ...nextNationBase,
        claimable: buildStickerClaimable(nextNationBase),
        lastStickerProgressAt: Date.now(),
      };
      return { ...(current || {}), [nation]: nextNation };
    });
  };

  const stickerIsEarnedForOpening = (record = {}, stickerKey = "flag") => {
    const claimable = buildStickerClaimable(record);
    return Boolean(claimable?.[stickerKey]);
  };

  const markNationStickerOpened = (nation, stickerKey = "flag") => {
    if (!nation || !stickerKey) return;
    updateNationStickerProgress((current) => {
      const existing = current?.[nation] || {};
      if (!stickerIsEarnedForOpening(existing, stickerKey)) return current || {};
      const existingOpened = existing.opened && typeof existing.opened === "object" ? existing.opened : {};
      const opened = { ...existingOpened, [stickerKey]: true };
      const nextNationBase = {
        ...existing,
        played: true,
        firstPlayedAt: existing.firstPlayedAt || Date.now(),
        opened,
      };
      const nextNation = {
        ...nextNationBase,
        claimable: buildStickerClaimable(nextNationBase),
      };
      return { ...(current || {}), [nation]: nextNation };
    }, { saveCloud: true });
  };

  const markNationStickerCupWin = (nation) => {
    if (!nation) return;
    updateNationStickerProgress((current) => {
      const existing = current?.[nation] || {};
      const nextNationBase = {
        ...existing,
        played: true,
        cupWon: true,
        wonAt: existing.wonAt || Date.now(),
        opened: existing.opened || {},
      };
      const nextNation = {
        ...nextNationBase,
        claimable: buildStickerClaimable(nextNationBase),
      };
      return { ...(current || {}), [nation]: nextNation };
    });
  };

  const unlockNationCupWin = (nation) => {
    if (!nation) return;
    markNationStickerCupWin(nation);
    setNationCupWins((current) => {
      if (current?.[nation]?.unlocked) return current;
      const next = {
        ...(current || {}),
        [nation]: {
          unlocked: true,
          wonAt: Date.now(),
        },
      };
      safeWriteJson(NATION_CUP_WINS_KEY, next);
      return next;
    });
  };

  const awardTrophiesForResult = ({
    baseResult,
    enrichedResult,
    userShotEvents = [],
    nextForm = [],
    shotStats = { goals: 0, shots: 0 },
  }) => {
    const keys = ["kickOff"];
    const status = baseResult?.status;
    const matchNo = Number(baseResult?.matchNo || enrichedResult?.matchNo || 0);
    const { scored, conceded } = userScoreParts(baseResult, team);
    const userWon = Boolean(baseResult?.userWon || baseResult?.won);
    const nextGoalsTotal =
      Number(allTimeGoals || 0) + Number(shotStats?.goals || 0);
    const nextCupTotal =
      Number(mondayCupsWon || 0) + (status === RESULT_STATUS.CHAMPION ? 1 : 0);
    const nextAchievements = { ...(achievements || {}) };

    if (containsWoodwork(userShotEvents)) keys.push("woodwork");
    if (scored > 0 || Number(shotStats?.goals || 0) > 0) keys.push("targetMan");
    if (
      [
        RESULT_STATUS.GROUP_WIN,
        RESULT_STATUS.GROUP_DRAW,
        RESULT_STATUS.QUALIFIED,
      ].includes(status)
    )
      keys.push("ptsOnTheBoard");
    if (userWon) keys.push("victory");
    if (
      baseResult?.week &&
      nextForm.slice(0, 3).length >= 3 &&
      nextForm.slice(0, 3).every((value) => value === "W")
    )
      keys.push("cleanSweep");
    if (status === RESULT_STATUS.QUALIFIED) keys.push("qualified");
    if (matchNo >= 73 && matchNo <= 88 && userWon) keys.push("tko");
    if (matchNo >= 89 && matchNo <= 96 && userWon) keys.push("quarterFinalist");
    if (matchNo >= 97 && matchNo <= 100 && userWon) keys.push("semiFinalist");
    if (matchNo >= 101 && matchNo <= 102 && userWon) keys.push("finalist");
    if (conceded === 0) keys.push("cleanSheet");
    if (
      Array.isArray(userShotEvents) &&
      userShotEvents.length >= 5 &&
      userShotEvents.every((event) => event?.goal)
    )
      keys.push("perfect");
    if (userWon && conceded > 0) keys.push("comebackKing");
    if (userWon && userShotEvents.some((event) => event?.isSuddenDeath))
      keys.push("iceCold");
    if (
      userWon &&
      (activeCosmetics?.goldenBoot ||
        activeCosmetics?.goldenBall ||
        activeCosmetics?.goldenGlove)
    )
      keys.push("goldenTouch");
    if (nextCupTotal >= 5) keys.push("mondayLegend");
    if (
      status === RESULT_STATUS.CHAMPION &&
      nextForm.length >= 8 &&
      nextForm.every((value) => value === "W")
    )
      keys.push("invincible");
    if (nextGoalsTotal >= 1000) keys.push("siuuu");

    if (status === RESULT_STATUS.THIRD_PLACE) keys.push("thirdPlaceFinish");
    if (status === RESULT_STATUS.RUNNER_UP) keys.push("runnerUpFinish");
    if (status === RESULT_STATUS.CHAMPION) {
      keys.push("championFinish");
      unlockNationCupWin(team);
    }

    keys.forEach((key) => {
      nextAchievements[key] = true;
    });
    const podiumComplete = PODIUM_ACHIEVEMENT_KEYS.every(
      (key) => nextAchievements[key],
    );
    if (podiumComplete) {
      keys.push("nationalTreasure");
      nextAchievements.nationalTreasure = true;
    }

    const nationWinsAfterThisMatch =
      status === RESULT_STATUS.CHAMPION &&
      team &&
      !nationCupWins?.[team]?.unlocked
        ? { ...(nationCupWins || {}), [team]: { unlocked: true } }
        : nationCupWins || {};
    const flagWallComplete = GROUP_LETTERS.flatMap(
      (group) => GROUPS[group],
    ).every((nation) => nationWinsAfterThisMatch?.[nation]?.unlocked);
    if (flagWallComplete) {
      keys.push("globalIcon");
      nextAchievements.globalIcon = true;
    }

    const coreComplete = CORE_ACHIEVEMENT_KEYS.filter(
      (key) => key !== "goat",
    ).every((key) => nextAchievements[key] || keys.includes(key));
    if (coreComplete && podiumComplete && flagWallComplete) keys.push("goat");

    const newTrophyKeys = keys.filter((key) => !achievements?.[key]);
    if (newTrophyKeys.length) {
      setAwardedTrophyMatchKey(`${matchNo || baseResult?.week || "match"}-${status || "result"}-${newTrophyKeys.join(".")}`);
    }

    unlockAchievements(keys);
  };

  const sanitizeCloudData = (value) =>
    JSON.parse(JSON.stringify(value ?? null));

  const updateActiveMatchSnapshot = (snapshot) => {
    const safeSnapshot = snapshot ? sanitizeCloudData(snapshot) : null;
    activeMatchSnapshotRef.current = safeSnapshot;
    setActiveMatchSnapshot(safeSnapshot);
  };

  const clearActiveMatchSnapshot = () => updateActiveMatchSnapshot(null);

  const isTwoPlayerSnapshot = (snapshot = {}) => {
    const matchStageValue = String(snapshot?.matchStage || snapshot?.stage || "").toUpperCase();
    const fixtureId = String(
      snapshot?.activeMatchSnapshot?.fixtureId ||
        snapshot?.activeMatchSnapshot?.id ||
        snapshot?.currentKnockoutMatch?.id ||
        snapshot?.matchResult?.fixtureId ||
        snapshot?.matchResult?.id ||
        "",
    ).toLowerCase();
    const status = snapshot?.matchResult?.status || snapshot?.status || null;
    const twoPlayerTerminalShootout =
      matchStageValue === "SHOOTOUT" &&
      !snapshot?.matchResult?.matchNo &&
      (status === RESULT_STATUS.CHAMPION || status === RESULT_STATUS.RUNNER_UP);

    return (
      snapshot?.mode === "twoPlayer" ||
      fixtureId.startsWith("two-player") ||
      twoPlayerTerminalShootout
    );
  };

  const shouldClearRejectedCampaignSnapshot = (snapshot = {}) =>
    Boolean(snapshot?.active && snapshot?.team && isTwoPlayerSnapshot(snapshot));

  const isCampaignSaveBlocked = () =>
    Boolean(twoPlayerMode || twoPlayerThrowawayRef.current);

  const markTwoPlayerThrowaway = () => {
    twoPlayerThrowawayRef.current = true;
  };

  const releaseTwoPlayerThrowawayForCampaign = () => {
    twoPlayerThrowawayRef.current = false;
  };

  const clearedCurrentCampaignForUi = (reason = "cleared") => ({
    exists: false,
    active: false,
    status: String(reason || "cleared").toUpperCase(),
    teamName: null,
    team: null,
    opponent: null,
    phase: "Not Started",
    round: "Not Started",
    gameScore: 0,
    cupRun: [],
    score: [0, 0],
    usedGoldenUpgrade: false,
    usedGoldenTicket: false,
    matchResult: null,
    runtimeSnapshot: null,
    updatedAt: Date.now(),
  });

  const clearLocalCurrentCampaignState = (reason = "cleared") => {
    setFirebaseProfile((profile) => {
      if (!profile) return profile;
      return {
        ...profile,
        currentCampaign: clearedCurrentCampaignForUi(reason),
        currentProgress: null,
        savedGames: {
          ...(profile.savedGames || {}),
          current: null,
        },
      };
    });
  };

  const buildGameSnapshot = () => {
    if (isCampaignSaveBlocked()) return null;

    return sanitizeCloudData({
      version: 1,
      mode: "campaign",
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
      campaignCosmeticsUsed,
      usedGoldenUpgrade: Boolean(campaignCosmeticsUsed?.goldenBoot || campaignCosmeticsUsed?.goldenBall || campaignCosmeticsUsed?.goldenGlove || campaignCosmeticsUsed?.goldenTicket || campaignCosmeticsUsed?.goldenTicketUsed),
      usedGoldenTicket: Boolean(campaignCosmeticsUsed?.goldenTicket || campaignCosmeticsUsed?.goldenTicketUsed),
      achievements,
      nationCupWins,
      nationStickerProgress,
      awardedTrophyMatchKey,
      activeMatchSnapshot: activeMatchSnapshotRef.current || activeMatchSnapshot || null,
    });
  };

  const restoreGameSnapshot = (snapshot) => {
    if (!snapshot?.active || !snapshot?.team || isTwoPlayerSnapshot(snapshot)) return false;
    releaseTwoPlayerThrowawayForCampaign();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    setSelectedGroup(snapshot.selectedGroup || "A");
    setTeam(snapshot.team || null);
    setOpponent(snapshot.opponent || "Opponent");
    setScore(Array.isArray(snapshot.score) ? snapshot.score : [0, 0]);
    setMatchStage(snapshot.matchStage || "GROUP STAGE");
    setUserForm(Array.isArray(snapshot.userForm) ? snapshot.userForm : []);
    setScoringState(snapshot.scoringState || createScoringState());
    setFixtureView(snapshot.fixtureView || "group");
    setStandingsView(snapshot.standingsView || "group");
    setTable(snapshot.table || blankTable());
    setSchedule(
      Array.isArray(snapshot.schedule) ? snapshot.schedule : buildSchedule(),
    );
    setKnockoutFixtures(
      Array.isArray(snapshot.knockoutFixtures) ? snapshot.knockoutFixtures : [],
    );
    setCurrentKnockoutMatch(snapshot.currentKnockoutMatch || null);
    setPodium(snapshot.podium || {});
    setMatchResult(snapshot.matchResult || null);
    const restoredMatchSnapshot = snapshot.activeMatchSnapshot || snapshot.matchSnapshot || null;
    activeMatchSnapshotRef.current = restoredMatchSnapshot;
    setActiveMatchSnapshot(restoredMatchSnapshot);
    const terminalStatuses = new Set([
      RESULT_STATUS.ELIMINATED,
      RESULT_STATUS.CHAMPION,
      RESULT_STATUS.RUNNER_UP,
      RESULT_STATUS.THIRD_PLACE,
      RESULT_STATUS.FOURTH_PLACE,
    ]);
    setAwardedTrophyMatchKey(snapshot.awardedTrophyMatchKey || null);
    setModalDismissed(
      snapshot.matchResult?.status &&
        terminalStatuses.has(snapshot.matchResult.status)
        ? false
        : Boolean(snapshot.modalDismissed),
    );
    const restoredActiveCosmetics = normaliseActiveCosmeticsForEntitlements(
      snapshot.activeCosmetics || {},
      isCurrentUserVerified ? storeEntitlements : {},
    );
    setActiveCosmetics(restoredActiveCosmetics);
    safeWriteJson(COSMETICS_KEY, restoredActiveCosmetics);
    setCampaignCosmeticsUsed(
      snapshot.campaignCosmeticsUsed ||
        cosmeticUsageFromActive(restoredActiveCosmetics),
    );
    if (snapshot.achievements) {
      setAchievements(snapshot.achievements || {});
      safeWriteJson(ACHIEVEMENTS_KEY, snapshot.achievements || {});
    }
    if (snapshot.nationCupWins) {
      setNationCupWins(snapshot.nationCupWins || {});
      safeWriteJson(NATION_CUP_WINS_KEY, snapshot.nationCupWins || {});
    }
    if (snapshot.nationStickerProgress) {
      setNationStickerProgress(snapshot.nationStickerProgress || {});
      safeWriteJson(NATION_STICKER_PROGRESS_KEY, snapshot.nationStickerProgress || {});
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
    if (!authReady || !hasCloudUser) return;
    // Wait for the cloud profile to load before autosaving. This prevents stale
    // localStorage achievement/unlock state from overwriting Firestore during sign-in.
    if (!firebaseProfile) return;

    const attempts = Number(allTimeShots || 0);
    const goals = Number(allTimeGoals || 0);
    const conversionPercentage =
      attempts > 0 ? Math.round((goals / attempts) * 100) : 0;
    const profileHighScore = Number(
      Math.max(scoringState.campaignPoints || 0, bestCampaignScore || 0),
    );
    const profileUpgrades = firebaseProfile?.upgradesPurchased || {};
    const autosaveUpgradesPurchased = [
      "allTeams",
      "goldenBoot",
      "goldenBall",
      "goldenGlove",
      "goldenKitbag",
      "fullBundle",
    ].reduce((next, key) => {
      if (profileUpgrades?.[key] || (key === "allTeams" && allTeamsUnlocked)) {
        next[key] = true;
      }
      return next;
    }, {});
    const profileTicket = firebaseProfile?.consumables?.goldenTicket || {};
    const shouldAutosaveTicket = Boolean(
      Number(profileTicket.quantity || 0) > 0 ||
        Number(profileTicket.totalPurchased || 0) > 0 ||
        Number(profileTicket.totalUsed || 0) > 0,
    );
    const autosaveConsumables = shouldAutosaveTicket
      ? { goldenTicket: profileTicket }
      : undefined;

    const currentProgressSnapshot = buildGameSnapshot();
    const shouldSaveCurrentCampaign = Boolean(
      !isCampaignSaveBlocked() &&
        currentProgressSnapshot?.mode === "campaign" &&
        currentProgressSnapshot?.active &&
        currentProgressSnapshot?.team &&
        team,
    );

    const payload = {
      nickname:
        currentUser.displayName || currentUser.email?.split("@")[0] || "Player",
      email: currentUser.email || "",
      accountStatus: { emailVerified: Boolean(currentUser.emailVerified), verificationRequired: !currentUser.emailVerified },
      ...(shouldSaveCurrentCampaign
        ? {
            currentCampaign: {
              active: true,
              teamName: team || null,
              opponent: opponent || null,
              phase: currentRoundLabel || matchStage || "No Campaign",
              gameScore: Number(scoringState.campaignPoints || 0),
              cupRun: userForm || [],
              usedGoldenUpgrade: Boolean(campaignCosmeticsApplied()?.goldenBoot || campaignCosmeticsApplied()?.goldenBall || campaignCosmeticsApplied()?.goldenGlove || campaignCosmeticsApplied()?.goldenTicket || campaignCosmeticsApplied()?.goldenTicketUsed),
              usedGoldenTicket: Boolean(campaignCosmeticsApplied()?.goldenTicket || campaignCosmeticsApplied()?.goldenTicketUsed),
              score,
              matchResult: matchResult
                ? {
                    status: matchResult.status || null,
                    matchNo: matchResult.matchNo || null,
                    winner: matchResult.winner || null,
                    loser: matchResult.loser || null,
                    userScore: matchResult.userScore ?? null,
                    opponentScore: matchResult.opponentScore ?? null,
                  }
                : null,
              runtimeSnapshot: currentProgressSnapshot,
            },
          }
        : {}),
      bestCampaign: {
        exists: Boolean((bestCampaignSummary?.teamName || bestCampaignSummary?.team) || Number(bestCampaignScore || 0) > 0),
        gameScore: Number(bestCampaignScore || 0),
        teamName: bestCampaignSummary?.teamName || bestCampaignSummary?.team || null,
        team: bestCampaignSummary?.teamName || bestCampaignSummary?.team || null,
        cupRun:
          bestCampaignSummary?.cupRun ||
          bestCampaignSummary?.formGuide ||
          bestCampaignSummary?.form ||
          bestCampaignSummary?.tournamentProgress ||
          [],
        phase:
          bestCampaignSummary?.phase ||
          bestCampaignSummary?.roundLabel ||
          bestCampaignSummary?.stage ||
          "No Campaign",
        round:
          bestCampaignSummary?.round ||
          bestCampaignSummary?.roundLabel ||
          bestCampaignSummary?.stage ||
          bestCampaignSummary?.phase ||
          "No Campaign",
        podium: bestCampaignSummary?.podium || "none",
        cosmeticsApplied: bestCampaignSummary?.cosmeticsApplied || {},
        usedGoldenUpgrade: Boolean(bestCampaignSummary?.usedGoldenUpgrade || bestCampaignSummary?.goldenUpgradeUsed || bestCampaignSummary?.usedGoldenTicket || bestCampaignSummary?.goldenTicketUsed),
        usedGoldenTicket: Boolean(bestCampaignSummary?.usedGoldenTicket || bestCampaignSummary?.goldenTicketUsed),
        completedAt: bestCampaignSummary?.completedAt || null,
        updatedAt: bestCampaignSummary?.updatedAt || Date.now(),
      },
      careerStats: {
        cupsWon: Number(mondayCupsWon || 0),
        campaignsCompleted: Number(allTimeCampaignsCompleted || 0),
        matchesPlayed: Number(allTimeMatchesPlayed || 0),
        matchesWon: Number(allTimeMatchesWon || 0),
        matchesDrawn: Number(allTimeMatchesDrawn || 0),
        matchesLost: Number(allTimeMatchesLost || 0),
        goalsScored: goals,
        goalsConceded: Number(firebaseProfile?.careerStats?.goalsConceded || 0),
        totalShots: attempts,
        goalConversionRate: conversionPercentage,
        highScore: profileHighScore,
        leaderboardRank: myLeaderboardRank || null,
      },
      trophies: achievements || {},
      nationCupWins: nationCupWins || {},
      stickers: nationStickerProgress || {},
      feedback: feedbackState || createFeedbackState({}),
      cosmeticsEquipped: activeCosmetics || {
        goldenBoot: false,
        goldenBall: false,
        goldenGlove: false,
        goldenTicket: false,
        goldenTicketQuantity: 0,
      },
      ...(Object.keys(autosaveUpgradesPurchased).length
        ? { upgradesPurchased: autosaveUpgradesPurchased }
        : {}),
      ...(autosaveConsumables ? { consumables: autosaveConsumables } : {}),
      leaderboard: {
        points: profileHighScore,
        highScore: profileHighScore,
        rank: myLeaderboardRank || null,
        team: bestCampaignSummary?.team || null,
      },
    };

    const saveVersion = cloudProfileSaveVersionRef.current;
    const timeout = window.setTimeout(() => {
      if (saveVersion !== cloudProfileSaveVersionRef.current) return;
      saveUserProfile(currentUser.uid, payload).catch((error) => {
        console.warn("Cloud profile save failed", error);
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    activeCosmetics,
    activeMatchSnapshot,
    campaignCosmeticsUsed,
    allTeamsUnlocked,
    allTimeCampaignsCompleted,
    allTimeGoals,
    allTimeShots,
    allTimeMatchesPlayed,
    allTimeMatchesWon,
    allTimeMatchesDrawn,
    allTimeMatchesLost,
    achievements,
    nationCupWins,
    nationStickerProgress,
    feedbackState,
    authReady,
    bestCampaignScore,
    bestCampaignSummary,
    currentRoundLabel,
    currentUser,
    firebaseProfile,
    matchResult,
    matchStage,
    mondayCupsWon,
    myLeaderboardRank,
    opponent,
    score,
    scoringState.campaignPoints,
    team,
    twoPlayerMode,
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
      campaignPoints: nextScoringState.campaignPoints,
      pointsAwarded: nextScoringState.lastMatchPoints,
      pointsBreakdown: nextScoringState.lastBreakdown,
      attempts: {
        user: userShotEvents || [],
        opponent: baseResult?.opponentShotEvents || [],
      },
    };

    setScoringState(nextScoringState);

    const resultCode = resultFormCode(enrichedResult, team);
    const nextForm = [...userForm, resultCode].filter(Boolean).slice(-8);
    const shotStats = countShotStats(userShotEvents);

    recordNationStickerMatchProgress(team, {
      goals: shotStats.goals,
      keeperSaves: countKeeperSavesForSticker(baseResult?.opponentShotEvents || baseResult?.attempts?.opponent),
      userWon: Boolean(baseResult?.userWon || baseResult?.won),
      campaignCompleted: isTerminalLeaderboardStatus(baseResult?.status),
      knockoutQualified: baseResult?.status === RESULT_STATUS.QUALIFIED,
      cupWon: baseResult?.status === RESULT_STATUS.CHAMPION,
    });

    setAllTimeMatchesPlayed((value) => {
      const next = Number(value || 0) + 1;
      safeWriteNumber(ALL_TIME_MATCHES_PLAYED_KEY, next);
      return next;
    });

    if (resultCode === "W") {
      setAllTimeMatchesWon((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(ALL_TIME_MATCHES_WON_KEY, next);
        return next;
      });
    } else if (resultCode === "D") {
      setAllTimeMatchesDrawn((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(ALL_TIME_MATCHES_DRAWN_KEY, next);
        return next;
      });
    } else if (resultCode === "L") {
      setAllTimeMatchesLost((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(ALL_TIME_MATCHES_LOST_KEY, next);
        return next;
      });
    }

    awardTrophiesForResult({
      baseResult,
      enrichedResult,
      userShotEvents,
      nextForm,
      shotStats,
    });

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

    const nextIsBestCampaign =
      nextScoringState.campaignPoints > Number(bestCampaignScore || 0);
    const campaignCosmetics = campaignCosmeticsApplied();
    const usedGoldenTicket = Boolean(
      campaignCosmetics?.goldenTicket ||
      campaignCosmetics?.goldenTicketUsed
    );
    const usedGoldenUpgrade = Boolean(
      campaignCosmetics?.goldenBoot ||
      campaignCosmetics?.goldenBall ||
      campaignCosmetics?.goldenGlove ||
      usedGoldenTicket
    );
    const latestBestCampaignSummary = nextIsBestCampaign
      ? {
          ...buildCampaignSummary({
            team,
            userForm: nextForm,
            campaignPoints: nextScoringState.campaignPoints,
            result: enrichedResult,
            fallbackRound: matchStage,
          }),
          gameScore: Number(nextScoringState.campaignPoints || 0),
          cupRun: nextForm,
          podium: podium === "champion" ? "champion" : podium === "runnerUp" ? "runner-up" : podium === "third" || podium === "thirdPlace" ? "third-place" : "none",
          cosmeticsApplied: campaignCosmetics,
          usedGoldenUpgrade,
          usedGoldenTicket,
          completedAt: isTerminalLeaderboardStatus(baseResult.status) ? Date.now() : null,
          updatedAt: Date.now(),
        }
      : bestCampaignSummary;

    if (nextIsBestCampaign) {
      setBestCampaignScore(nextScoringState.campaignPoints);
      setBestCampaignSummary(latestBestCampaignSummary);
      safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, nextScoringState.campaignPoints);
      safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, latestBestCampaignSummary);
    }

    if (isTerminalLeaderboardStatus(baseResult.status)) {
      setAllTimeCampaignsCompleted((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(ALL_TIME_CAMPAIGNS_COMPLETED_KEY, next);
        return next;
      });

      const leaderboardBestScore = Number(
        Math.max(nextScoringState.campaignPoints || 0, bestCampaignScore || 0),
      );
      const leaderboardBestTeam = nextIsBestCampaign
        ? team
        : latestBestCampaignSummary?.teamName || latestBestCampaignSummary?.team || team || null;
      const leaderboardForm =
        latestBestCampaignSummary?.cupRun ||
        latestBestCampaignSummary?.formGuide ||
        latestBestCampaignSummary?.form ||
        latestBestCampaignSummary?.tournamentProgress ||
        nextForm ||
        [];
      const localUserId = currentUser?.uid || "guest-local";
      const entry = {
        ...createLeaderboardEntry({
          user: currentUser || { uid: localUserId, displayName: "GUEST" },
          team: leaderboardBestTeam,
          campaignPoints: leaderboardBestScore,
          status: baseResult.status,
          podium,
          cosmeticsApplied: campaignCosmetics,
        }),
        id: localUserId,
        uid: localUserId,
        userId: localUserId,
        username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
        cupRun: leaderboardForm,
        gameScore: leaderboardBestScore,
        bestCampaign: latestBestCampaignSummary || {
          exists: true,
          teamName: leaderboardBestTeam,
          team: leaderboardBestTeam,
          cupRun: leaderboardForm,
          gameScore: leaderboardBestScore,
          round: roundLabelForResult(baseResult, matchStage),
          phase: roundLabelForResult(baseResult, matchStage),
          podium: podium === "champion" ? "champion" : podium === "runnerUp" ? "runner-up" : podium === "third" || podium === "thirdPlace" ? "third-place" : "none",
          cosmeticsApplied: campaignCosmetics,
          usedGoldenUpgrade,
          usedGoldenTicket,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        },
        usedGoldenUpgrade,
        usedGoldenTicket,
        emailVerified: Boolean(isCurrentUserVerified),
        accountStatus: { emailVerified: Boolean(isCurrentUserVerified), verificationRequired: !isCurrentUserVerified },
        localOnly: !hasCloudUser,
      };
      setLeaderboardRows((rows) => {
        const isSameLeaderboardUser = (row = {}) => {
          const rowUserId = String(row.userId || row.uid || row.id || "");
          if (hasCloudUser) return rowUserId === localUserId;
          return Boolean(row.localOnly || row.isUserPreview || rowUserId === "guest-local" || rowUserId === "guest-preview");
        };
        const withoutUser = rows.filter((row) => !isSameLeaderboardUser(row));
        const nextRows = [entry, ...withoutUser]
          .sort((a, b) => Number(b.campaignPoints || b.gameScore || 0) - Number(a.campaignPoints || a.gameScore || 0))
          .slice(0, 50)
          .map((row, index) => ({ ...row, rank: index + 1 }));
        safeWriteLeaderboardRows(nextRows.filter((row) => row.localOnly || row.userId === "guest-local" || row.userId === "guest-preview"));
        return nextRows;
      });
      if (hasCloudUser) {
        saveLeaderboardHighScore(currentUser.uid, entry)
          .then(() => loadLeaderboardRows(50).then((rows) => {
            setLeaderboardRows(rows.sort((a, b) => Number(b.campaignPoints || b.gameScore || 0) - Number(a.campaignPoints || a.gameScore || 0)).slice(0, 50));
          }))
          .catch((error) =>
            console.warn("Leaderboard high-score save failed", error),
          );
      }
    }

    return enrichedResult;
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuInitialView("menu");
    setMenuInitialAuthMode("signin");
    setMenuAuthShowLogoBack(false);
  };
  const openAuthMenu = (mode = "signin", options = {}) => {
    setMenuInitialView("auth");
    setMenuInitialAuthMode(mode || "signin");
    setMenuAuthShowLogoBack(Boolean(options?.showLogoBack));
    setMenuAuthRequestId((id) => id + 1);
    setMenuOpen(true);
  };
  const requireVerifiedAccess = (mode = "signin") => {
    if (!currentUser?.uid) {
      openAuthMenu(mode, { showLogoBack: true });
      return false;
    }
    if (!currentUser.emailVerified) {
      openAuthMenu("verify", { showLogoBack: true });
      return false;
    }
    return true;
  };
  const resetTournament = (nextScreen = "home") => {
    const shouldClearCloudCampaign = Boolean(hasCloudUser && !isCampaignSaveBlocked());
    if (shouldClearCloudCampaign) {
      cloudProfileSaveVersionRef.current += 1;
      clearLocalCurrentCampaignState("play_again");
    }
    releaseTwoPlayerThrowawayForCampaign();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    setScreen(nextScreen);
    setDrawer(null);
    setMenuOpen(false);
    setFixtureView("group");
    setStandingsView("group");
    setSelectedGroup("A");
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setAwardedTrophyMatchKey(null);
    setTable(blankTable());
    setSchedule(buildSchedule());
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setPodium({});
    setMatchStage("GROUP STAGE");
    setUserForm([]);
    setScoringState(createScoringState());
    setCampaignCosmeticsUsed({
      goldenBoot: false,
      goldenBall: false,
      goldenGlove: false,
      goldenTicket: false,
      cosmeticBallEquipped: false,
      cosmeticGloveEquipped: false,
      goldenTicketUsed: false,
    });
    setPendingFeedbackCheck(true);
    if (shouldClearCloudCampaign) {
      const uid = currentUser.uid;
      clearCurrentProgress(uid, "play_again").catch((error) => {
        console.warn("Could not clear current campaign", error);
      });
      window.setTimeout(() => {
        clearCurrentProgress(uid, "play_again_confirmed").catch((error) => {
          console.warn("Could not confirm current campaign clear", error);
        });
      }, 900);
    }
  };

  useEffect(() => {
    if (!pendingFeedbackCheck || screen !== "home") return;
    const promptType = buildFeedbackPromptType({
      feedback: feedbackState,
      campaignsCompleted: allTimeCampaignsCompleted,
      cupsWon: mondayCupsWon,
    });
    if (promptType) setFeedbackPromptType(promptType);
    setPendingFeedbackCheck(false);
  }, [pendingFeedbackCheck, screen, feedbackState, allTimeCampaignsCompleted, mondayCupsWon]);

  const persistFeedbackState = (nextFeedback, ratingEntry = null) => {
    safeWriteJson(FEEDBACK_KEY, nextFeedback);
    setFeedbackState(nextFeedback);
    if (hasCloudUser) {
      saveUserFeedback(currentUser.uid, nextFeedback, ratingEntry).catch((error) => {
        console.warn("Feedback save failed", error);
      });
    }
  };

  const markFeedbackPromptShown = (promptType) => {
    const key = promptType === "prompt2" ? "prompt2Shown" : "prompt1Shown";
    const nextFeedback = createFeedbackState({
      ...feedbackState,
      [key]: true,
      lastPromptType: promptType,
      lastPromptedAt: Date.now(),
    });
    persistFeedbackState(nextFeedback);
  };

  const closeFeedbackModal = () => {
    if (feedbackPromptType) markFeedbackPromptShown(feedbackPromptType);
    setFeedbackPromptType(null);
  };

  const openManualFeedbackModal = () => {
    if (!hasCloudUser) return;
    setPendingFeedbackCheck(false);
    setFeedbackPromptType("prompt1");
  };

  const submitFeedback = ({ rating, comment, promptType }) => {
    const safeRating = Math.max(1, Math.min(5, Math.round(Number(rating || 0))));
    if (!safeRating) return;
    const createdAt = Date.now();
    const entry = {
      id: `${createdAt}-${safeRating}`,
      stars: safeRating,
      rating: safeRating,
      comment: String(comment || "").trim().slice(0, 280),
      promptType: promptType || feedbackPromptType || "prompt1",
      campaignsCompleted: Number(allTimeCampaignsCompleted || 0),
      cupsWon: Number(mondayCupsWon || 0),
      createdAt,
    };
    const key = entry.promptType === "prompt2" ? "prompt2Shown" : "prompt1Shown";
    const nextFeedback = createFeedbackState({
      ...feedbackState,
      [key]: true,
      hasSubmitted: true,
      lastPromptType: entry.promptType,
      lastPromptedAt: feedbackState?.lastPromptedAt || createdAt,
      lastSubmittedAt: createdAt,
      latestRating: entry,
      ratings: [...(feedbackState?.ratings || []), entry].slice(-10),
    });
    persistFeedbackState(nextFeedback, entry);
  };
  const handleResumeCampaign = async () => {
    const snapshot = hasCloudUser
      ? await loadCurrentProgress(currentUser.uid).catch(
          () =>
            firebaseProfile?.currentCampaign?.runtimeSnapshot ||
            firebaseProfile?.currentProgress ||
            firebaseProfile?.savedGames?.current ||
            null,
        )
      : firebaseProfile?.currentCampaign?.runtimeSnapshot ||
        firebaseProfile?.currentProgress ||
        firebaseProfile?.savedGames?.current ||
        null;
    const restored = restoreGameSnapshot(snapshot);
    if (!restored) {
      if (hasCloudUser && shouldClearRejectedCampaignSnapshot(snapshot)) {
        cloudProfileSaveVersionRef.current += 1;
        clearLocalCurrentCampaignState("rejected-two-player-snapshot");
        clearCurrentProgress(currentUser.uid, "rejected-two-player-snapshot").catch((error) => {
          console.warn("Could not clear rejected current campaign", error);
        });
      }
      setScreen("home");
    }
  };

  const hasActiveCampaign = () =>
    Boolean(!isCampaignSaveBlocked() && team && (opponent || currentKnockoutMatch || activeGroupFixture));

  const openTeamFlow = () => {
    setDrawer(null);
    setScreen("hosts");
  };

  const openMatch = async () => {
    closeMenu();
    setDrawer(null);

    if (hasActiveCampaign()) {
      setScreen("match");
      return;
    }

    const savedProgress = hasCloudUser
      ? await loadCurrentProgress(currentUser.uid).catch(
          () =>
            firebaseProfile?.currentCampaign?.runtimeSnapshot ||
            firebaseProfile?.currentProgress ||
            firebaseProfile?.savedGames?.current ||
            null,
        )
      : firebaseProfile?.currentCampaign?.runtimeSnapshot ||
        firebaseProfile?.currentProgress ||
        firebaseProfile?.savedGames?.current ||
        null;

    if (savedProgress?.active && savedProgress?.team) {
      if (restoreGameSnapshot(savedProgress)) {
        return;
      }
      if (hasCloudUser && shouldClearRejectedCampaignSnapshot(savedProgress)) {
        cloudProfileSaveVersionRef.current += 1;
        clearLocalCurrentCampaignState("rejected-two-player-snapshot");
        clearCurrentProgress(currentUser.uid, "rejected-two-player-snapshot").catch((error) => {
          console.warn("Could not clear rejected current campaign", error);
        });
      }
    }

    openTeamFlow();
  };
  const openFixtures = () => {
    closeMenu();
    if (resultIsEliminated(matchResult)) finishTournamentForEliminatedUser();
    setFixtureView(resultIsEliminated(matchResult) ? "knockout" : scheduleFocus.view);
    setDrawer("fixtures");
  };
  const openGroups = () => {
    closeMenu();
    if (resultIsEliminated(matchResult)) finishTournamentForEliminatedUser();
    setStandingsView(groupStageComplete || resultIsEliminated(matchResult) ? "knockout" : standingsView);
    setDrawer("groups");
  };
  const openClubhouse = () => {
    closeMenu();
    setDrawer("clubhouse");
  };
  const openTrophyCabinet = () => {
    closeMenu();
    const stickerNoticeKey = getUnopenedNationStickerNoticeKey(nationStickerProgress, team);
    if (stickerNoticeKey) setAcknowledgedStickerNoticeKey(stickerNoticeKey);
    setAwardedTrophyMatchKey(null);
    setDrawer("trophyCabinet");
  };
  const openLeaderboard = () => {
    closeMenu();
    setDrawer("leaderboard");
  };
  const openShop = (itemId = null) => {
    setShopInitialItemId(itemId);
    setShopOpen(true);
  };

  const refreshCurrentUserForPurchase = async () => {
    const user = auth.currentUser || currentUser || null;
    if (!user?.uid) return null;
    try {
      await user.reload();
    } catch (error) {
      console.warn("Firebase user refresh before purchase failed", error);
    }
    const freshUser = auth.currentUser || user;
    if (freshUser?.uid) {
      setCurrentUser({ ...freshUser });
      if (freshUser.emailVerified && firebaseProfile?.profile && !firebaseProfile.profile.emailVerified) {
        setFirebaseProfile((current) => current
          ? {
              ...current,
              profile: { ...(current.profile || {}), emailVerified: true },
              accountStatus: { ...(current.accountStatus || {}), emailVerified: true, verificationRequired: false },
            }
          : current);
      }
    }
    return freshUser;
  };

  const requestShopItem = async (itemId = null) => {
    const freshUser = await refreshCurrentUserForPurchase();
    if (!freshUser?.uid) {
      setPendingShopItemId(itemId);
      setShopOpen(false);
      openAuthMenu("signup", { showLogoBack: true });
      return;
    }
    if (!freshUser.emailVerified) {
      setPendingShopItemId(itemId);
      setShopOpen(false);
      openAuthMenu("verify", { showLogoBack: true });
      return;
    }
    openShop(itemId);
  };
  const closeShop = () => {
    setShopOpen(false);
    setShopInitialItemId(null);
  };

  const useGoldenTicketForNextCampaign = (quantityOverride = null) => {
    const ticketQuantity = Math.max(
      getGoldenTicketQuantity(),
      Number(quantityOverride || 0),
    );
    if (ticketQuantity <= 0) {
      writeGoldenTicketNextCampaignIntent(false);
      setGoldenTicketNextCampaign(false);
      requestShopItem("goldenTicket");
      return;
    }

    // Persist the intent before navigation so the following team selection
    // starts a final-only Golden Ticket run instead of a normal group campaign.
    writeGoldenTicketNextCampaignIntent(true);
    setGoldenTicketNextCampaign(true);
    setActiveCosmetics((current) => {
      const next = {
        ...(current || {}),
        goldenTicket: true,
        goldenTicketQuantity: Math.max(
          Number(current?.goldenTicketQuantity || 0),
          ticketQuantity,
        ),
      };
      safeWriteJson(COSMETICS_KEY, next);
      return next;
    });
    releaseTwoPlayerThrowawayForCampaign();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setCurrentKnockoutMatch(null);
    setMatchStage("FINAL");
    setDrawer(null);
    setMenuOpen(false);
    setScreen("hosts");
  };

  const storeEntitlements = buildStoreEntitlements({
    ...(firebaseProfile || {}),
    unlocks: firebaseProfile?.unlocks || {},
    upgradesPurchased: firebaseProfile?.upgradesPurchased || {},
    consumables: firebaseProfile?.consumables || {},
  });

  function getGoldenTicketQuantity() {
    const profileQuantity = Number(
      firebaseProfile?.consumables?.goldenTicket?.quantity ??
        firebaseProfile?.cosmetics?.goldenTicketQuantity ??
        0,
    );
    const entitlementQuantity = Number(storeEntitlements?.goldenTicketQty ?? 0);
    return Math.max(0, Math.floor(Math.max(profileQuantity, entitlementQuantity)));
  }


  const finishTournamentForEliminatedUser = (fixtures = knockoutFixtures, tableState = table) => {
    const simulated = simulateRemainingKnockoutTournament(fixtures?.length ? fixtures : buildRound32Fixtures(tableState), tableState);
    if (simulated?.updatedFixtures?.length) {
      setKnockoutFixtures(simulated.updatedFixtures);
      setFixtureView("knockout");
      setStandingsView("knockout");
    }
    if (simulated?.podium) setPodium(simulated.podium);
    return simulated;
  };

  const resultIsEliminated = (result) =>
    [RESULT_STATUS.ELIMINATED, RESULT_STATUS.FOURTH_PLACE].includes(result?.status);

  const clearAwardedTrophyPrompt = () => setAwardedTrophyMatchKey(null);

  const startStripeCheckout = async (selection = {}) => {
    const freshUser = await refreshCurrentUserForPurchase();
    if (!freshUser?.uid)
      throw new Error("Please sign in again before buying upgrades");
    if (!freshUser.emailVerified)
      throw new Error("Please verify your email before buying upgrades");
    const idToken = await freshUser.getIdToken(true);
    await saveCheckoutStarted(freshUser.uid, {
      selection,
      source: "clubhouse-shop",
    }).catch(() => {});
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ selection, source: "clubhouse-shop" }),
    });

    const responseText = await response.text().catch(() => "");
    const payload = responseText
      ? (() => {
          try {
            return JSON.parse(responseText);
          } catch {
            return { error: responseText };
          }
        })()
      : {};

    if (!response.ok) {
      const rawBackendMessage =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        payload?.details ||
        "";
      const backendMessage =
        typeof rawBackendMessage === "string"
          ? rawBackendMessage
          : rawBackendMessage
            ? JSON.stringify(rawBackendMessage)
            : "";

      if (response.status === 404)
        throw new Error("Stripe checkout endpoint is not deployed yet");

      throw new Error(
        backendMessage
          ? `Stripe checkout failed: ${backendMessage}`
          : `Stripe checkout failed with status ${response.status}`,
      );
    }

    if (!payload?.url) {
      const rawMissingUrlMessage =
        payload?.error?.message || payload?.error || payload?.message || "";
      const missingUrlMessage =
        typeof rawMissingUrlMessage === "string" ? rawMissingUrlMessage : "";
      throw new Error(
        missingUrlMessage || "Stripe checkout did not return a payment link",
      );
    }

    window.location.assign(payload.url);
  };


  const selectGroup = (group) => {
    if (!allTeamsUnlocked) {
      requestShopItem("allTeams");
      return;
    }
    setSelectedGroup(group);
    setScreen("teams");
  };

  const consumeLocalGoldenTicket = () => {
    const currentTicketQuantity = getGoldenTicketQuantity();
    const nextQuantity = Math.max(0, Number(currentTicketQuantity || 0) - 1);

    setActiveCosmetics((current) => {
      const next = {
        ...(current || {}),
        goldenTicket: nextQuantity > 0,
        goldenTicketQuantity: nextQuantity,
      };
      safeWriteJson(COSMETICS_KEY, next);
      return next;
    });

    setFirebaseProfile((current) => {
      if (!current) return current;
      const previousTicket = current?.consumables?.goldenTicket || {};
      const nextTicket = {
        ...previousTicket,
        quantity: nextQuantity,
        totalUsed: Number(previousTicket.totalUsed || 0) + 1,
        lastUsedAt: Date.now(),
      };
      return {
        ...current,
        consumables: {
          ...(current.consumables || {}),
          goldenTicket: nextTicket,
        },
        cosmeticsEquipped: {
          ...(current.cosmeticsEquipped || {}),
          goldenTicket: nextQuantity > 0,
          goldenTicketQuantity: nextQuantity,
        },
        cosmeticsActive: {
          ...(current.cosmeticsActive || {}),
          goldenTicket: nextQuantity > 0,
          goldenTicketQuantity: nextQuantity,
        },
        cosmetics: {
          ...(current.cosmetics || {}),
          goldenTicket: nextQuantity > 0,
          goldenTicketQuantity: nextQuantity,
        },
      };
    });

    if (hasCloudUser) {
      consumeGoldenTicket(currentUser.uid, currentTicketQuantity).catch(
        (error) => {
          console.warn("Golden Ticket consume failed", error);
        },
      );
    }
  };


  const beginTwoPlayer = () => {
    markTwoPlayerThrowaway();
    setTwoPlayerMode(true);
    setTwoPlayerSetup({ step: "p1", p1Team: null, p1Group: null });
    setSelectedGroup("A");
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setCurrentKnockoutMatch(null);
    setMatchStage("SHOOTOUT");
    setDrawer(null);
    setMenuOpen(false);
    setScreen("hosts");
  };

  const handleTwoPlayerTeamSelect = (name, groupOverride = selectedGroup) => {
    markTwoPlayerThrowaway();
    if (twoPlayerSetup?.step === "p2" && twoPlayerSetup?.p1Team && name === twoPlayerSetup.p1Team) {
      return;
    }

    if (!twoPlayerSetup || twoPlayerSetup.step === "p1") {
      setTwoPlayerSetup({ step: "p2", p1Team: name, p1Group: groupOverride });
      setSelectedGroup("A");
      setScreen("hosts");
      return;
    }

    const p1Team = twoPlayerSetup.p1Team;
    if (!p1Team) {
      setTwoPlayerSetup({ step: "p1", p1Team: null, p1Group: null });
      return;
    }

    setTeam(p1Team);
    setOpponent(name);
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setCurrentKnockoutMatch(null);
    setMatchStage("SHOOTOUT");
    setDrawer(null);
    setMenuOpen(false);
    setScreen("match");
  };

  const handleTwoPlayerBack = () => {
    markTwoPlayerThrowaway();
    if (twoPlayerSetup?.step === "p2") {
      setTwoPlayerSetup({ step: "p1", p1Team: null, p1Group: null });
      return;
    }
    setTwoPlayerSetup(null);
    setTwoPlayerMode(false);
    setScreen("home");
  };

  const handleTwoPlayerMatchComplete = (result) => {
    markTwoPlayerThrowaway();
    if (!result || !team) return;
    const p1Won = Boolean(result.userWon);
    setScore(userScoreFromFixtureResult(result, team));
    setMatchResult({
      ...result,
      home: result.homeTeam || result.home,
      away: result.awayTeam || result.away,
      won: p1Won,
      status: p1Won ? RESULT_STATUS.CHAMPION : RESULT_STATUS.RUNNER_UP,
      week: null,
      opponentShotEvents: result?.attempts?.opponent || [],
    });
    setModalDismissed(false);
  };

  const replayTwoPlayerMatch = () => {
    markTwoPlayerThrowaway();
    setMatchResetKey((key) => key + 1);
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setCurrentKnockoutMatch(null);
    setMatchStage("SHOOTOUT");
    setScreen("match");
  };

  const changeTwoPlayerTeams = () => {
    markTwoPlayerThrowaway();
    setTwoPlayerMode(true);
    setTwoPlayerSetup({ step: "p1", p1Team: null, p1Group: null });
    setSelectedGroup("A");
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setCurrentKnockoutMatch(null);
    setMatchStage("SHOOTOUT");
    setDrawer(null);
    setMenuOpen(false);
    setScreen("hosts");
  };

  const exitTwoPlayerMatch = () => {
    markTwoPlayerThrowaway();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setTable(blankTable());
    setSchedule(buildSchedule());
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setPodium({});
    setFixtureView("group");
    setStandingsView("group");
    setMatchStage("GROUP STAGE");
    setScreen("home");
  };


  const startDevSemiFinalCampaign = () => {
    const email = String(auth.currentUser?.email || currentUser?.email || "").toLowerCase();
    if (email !== DEV_SEMI_FINAL_EMAIL) return;

    const allTeams = GROUP_LETTERS.flatMap((group) => GROUPS[group] || []);
    const randomTeam = allTeams[Math.floor(Math.random() * allTeams.length)] || "Mexico";
    const randomGroup = GROUP_LETTERS.find((group) => GROUPS[group]?.includes(randomTeam)) || "A";
    const semiRun = simulateSemiFinalRun(randomTeam, randomGroup);
    const semiFixture = semiRun?.currentSemiFinalFixture;
    if (!semiFixture) return;

    releaseTwoPlayerThrowawayForCampaign();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    setSelectedGroup(semiRun.selectedGroup || randomGroup);
    setTeam(randomTeam);
    setOpponent(semiRun.opponent || getFixtureOpponent(randomTeam, semiFixture));
    setSchedule(semiRun.schedule || buildSchedule());
    setTable(semiRun.table || blankTable());
    setKnockoutFixtures(semiRun.knockoutFixtures || []);
    setCurrentKnockoutMatch(semiFixture);
    setPodium({});
    setScreen("match");
    setDrawer(null);
    setMenuOpen(false);
    setScore([0, 0]);
    setMatchStage(knockoutStageLabel(semiFixture.matchNo));
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setAwardedTrophyMatchKey(null);
    setUserForm(Array.isArray(semiRun.userForm) ? semiRun.userForm : ["W", "W", "W", "W", "W", "W"]);
    setScoringState(() => {
      const seedResults = [
        { userWon: true, won: true, status: RESULT_STATUS.GROUP_WIN },
        { userWon: true, won: true, status: RESULT_STATUS.GROUP_WIN },
        { userWon: true, won: true, status: RESULT_STATUS.QUALIFIED },
        { userWon: true, won: true, status: RESULT_STATUS.KNOCKOUT_WIN, matchNo: 73 },
        { userWon: true, won: true, status: RESULT_STATUS.KNOCKOUT_WIN, matchNo: 89 },
        { userWon: true, won: true, status: RESULT_STATUS.KNOCKOUT_WIN, matchNo: 97 },
      ];
      return seedResults.reduce(
        (state, result) => applyCompletedMatchScore({ scoringState: state, result, userShotEvents: [] }),
        createScoringState(),
      );
    });
    setCampaignCosmeticsUsed(cosmeticUsageFromActive(activeCosmetics));
    setFixtureView("knockout");
    setStandingsView("knockout");
  };

  const startTeam = (name, groupOverride = selectedGroup) => {
    releaseTwoPlayerThrowawayForCampaign();
    setTwoPlayerMode(false);
    setTwoPlayerSetup(null);
    if (!HOST_TEAMS.has(name) && !allTeamsUnlocked) {
      requestShopItem("allTeams");
      return;
    }

    const ticketQuantity = getGoldenTicketQuantity();
    const hasGoldenTicketEntitlement =
      ticketQuantity > 0 || Boolean(storeEntitlements?.goldenTicket) || Boolean(activeCosmetics?.goldenTicket);
    const pendingGoldenTicketIntent =
      Boolean(goldenTicketNextCampaign) || readGoldenTicketNextCampaignIntent();
    const canUseGoldenTicket = hasGoldenTicketEntitlement && ticketQuantity > 0;
    const useGoldenTicket = canUseGoldenTicket && pendingGoldenTicketIntent;

    if (HOST_TEAMS.has(name)) unlockAchievements(["ourTime"]);

    if (useGoldenTicket) {
      unlockAchievements(["corruptionScandal"]);
      const ticketRun = simulateGoldenTicketFinalRun(name, groupOverride);
      if (ticketRun?.currentFinalFixture) {
        setSelectedGroup(ticketRun.selectedGroup || groupOverride);
        setTeam(name);
        setOpponent(
          ticketRun.opponent ||
            getFixtureOpponent(name, ticketRun.currentFinalFixture),
        );
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
        clearActiveMatchSnapshot();
        setModalDismissed(false);
        setUserForm(["W", "W", "W", "W", "W", "W", "W"].slice(-8));
        setScoringState(createScoringState());
        setCampaignCosmeticsUsed(
          mergeCosmeticUsage(cosmeticUsageFromActive(activeCosmetics), {
            goldenTicket: true,
            goldenTicketUsed: true,
          }),
        );
        setFixtureView("knockout");
        setStandingsView("knockout");
        consumeLocalGoldenTicket();
        writeGoldenTicketNextCampaignIntent(false);
        setGoldenTicketNextCampaign(false);
        return;
      }
    }

    if (pendingGoldenTicketIntent && !useGoldenTicket) {
      writeGoldenTicketNextCampaignIntent(false);
      setGoldenTicketNextCampaign(false);
    }

    const freshSchedule = buildSchedule();
    const freshTable = blankTable();
    const fixture =
      freshSchedule.find(
        (item) =>
          !item.played &&
          item.group === groupOverride &&
          (item.home === name || item.away === name),
      ) ||
      freshSchedule.find(
        (item) =>
          item.group === groupOverride &&
          (item.home === name || item.away === name),
      );
    setSelectedGroup(groupOverride);
    setTeam(name);
    setOpponent(
      fixture?.home === name ? fixture.away : fixture?.home || "Opponent",
    );
    setScreen("match");
    setDrawer(null);
    setMenuOpen(false);
    setScore([0, 0]);
    setTable(freshTable);
    setSchedule(freshSchedule);
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setPodium({});
    setFixtureView("group");
    setStandingsView("group");
    setMatchStage("GROUP STAGE");
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setAwardedTrophyMatchKey(null);
    setUserForm([]);
    setScoringState(createScoringState());
    setCampaignCosmeticsUsed(cosmeticUsageFromActive(activeCosmetics));
  };

  const quickWin = () => {
    if (!team || !opponent) return;
    clearActiveMatchSnapshot();
    const match = schedule.find(
      (fixture) =>
        !fixture.played &&
        fixture.group === selectedGroup &&
        ((fixture.home === team && fixture.away === opponent) ||
          (fixture.home === opponent && fixture.away === team)),
    );
    if (!match) return;
    const homeGoals = match.home === team ? 1 : 0;
    const awayGoals = match.away === team ? 1 : 0;
    const afterUserSchedule = schedule.map((fixture) =>
      fixture.id === match.id
        ? { ...fixture, played: true, homeGoals, awayGoals }
        : fixture,
    );
    const afterUserTable = applyFixtureResult(
      table,
      match,
      homeGoals,
      awayGoals,
    );
    const { updatedSchedule, updatedTable } = completeMatchday(
      afterUserSchedule,
      afterUserTable,
      match.week,
    );
    const completedGroupStage = updatedSchedule.every(
      (fixture) => fixture.played,
    );
    const qualified = completedGroupStage
      ? didTeamQualify(team, updatedTable)
      : false;
    setScore([1, 0]);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) {
      const round32Fixtures = buildRound32Fixtures(updatedTable);
      if (qualified) setKnockoutFixtures(round32Fixtures);
      else finishTournamentForEliminatedUser(round32Fixtures, updatedTable);
    }
    setModalDismissed(false);
    setUserForm((form) => [...form, "W"].slice(-8));
    const displayResult = applyLeaderboardScore(
      {
        home: match.home,
        away: match.away,
        homeGoals,
        awayGoals,
        userWon: true,
        won: true,
        week: match.week,
        status: completedGroupStage
          ? qualified
            ? RESULT_STATUS.QUALIFIED
            : RESULT_STATUS.ELIMINATED
          : RESULT_STATUS.GROUP_WIN,
        isDraw: false,
        opponentShotEvents: [],
      },
      [],
    );
    setMatchResult(displayResult);
  };

  const handleMatchComplete = (result) => {
    if (!result || !team) return;
    clearActiveMatchSnapshot();

    if (
      currentKnockoutMatch &&
      resultBelongsToFixture(result, currentKnockoutMatch)
    ) {
      const userPlayedMatch = {
        ...currentKnockoutMatch,
        played: true,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
      };

      const {
        updatedFixtures,
        playedUserMatch,
        nextUserFixture,
        podium: completedPodium,
      } = completeKnockoutRound({
        fixtures: knockoutFixtures,
        currentMatch: currentKnockoutMatch,
        userTeam: team,
        userResult: userPlayedMatch,
      });

      const userScore = userScoreFromFixtureResult(
        {
          homeTeam: playedUserMatch.home,
          awayTeam: playedUserMatch.away,
          homeGoals: playedUserMatch.homeGoals,
          awayGoals: playedUserMatch.awayGoals,
        },
        team,
      );

      setScore(userScore);
      setKnockoutFixtures(updatedFixtures);
      if (completedPodium) setPodium(completedPodium);
      const matchNo = playedUserMatch.matchNo;
      const status = getUserFinishStatus({
        result,
        fixture: playedUserMatch,
        matchNo,
        userWon: result.userWon,
      });
      setModalDismissed(false);
      setUserForm((form) =>
        [...form, resultFormCode(result, team)].filter(Boolean).slice(-8),
      );
      const displayResult = applyLeaderboardScore(
        {
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
          opponentShotEvents: result?.attempts?.opponent || [],
        },
        result.userShotEvents || [],
      );
      if (resultIsEliminated(displayResult)) finishTournamentForEliminatedUser(updatedFixtures, table);
      setMatchResult(displayResult);
      return;
    }

    const match =
      schedule.find((fixture) => fixture.id === result.fixtureId) ||
      activeGroupFixture;
    if (!match) return;

    const afterUserSchedule = schedule.map((fixture) =>
      fixture.id === match.id
        ? {
            ...fixture,
            played: true,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
          }
        : fixture,
    );
    const afterUserTable = applyFixtureResult(
      table,
      match,
      result.homeGoals,
      result.awayGoals,
    );
    const { updatedSchedule, updatedTable } = completeMatchday(
      afterUserSchedule,
      afterUserTable,
      match.week,
    );
    const completedGroupStage = updatedSchedule.every(
      (fixture) => fixture.played,
    );
    const qualified = completedGroupStage
      ? didTeamQualify(team, updatedTable)
      : false;
    const userScore = userScoreFromFixtureResult(result, team);

    setScore(userScore);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) {
      const round32Fixtures = buildRound32Fixtures(updatedTable);
      if (qualified) setKnockoutFixtures(round32Fixtures);
      else finishTournamentForEliminatedUser(round32Fixtures, updatedTable);
    }
    setModalDismissed(false);
    setUserForm((form) =>
      [...form, resultFormCode(result, team)].filter(Boolean).slice(-8),
    );
    const displayResult = applyLeaderboardScore(
      {
        home: match.home,
        away: match.away,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        userWon: result.userWon,
        won: result.userWon,
        week: match.week,
        status: completedGroupStage
          ? qualified
            ? RESULT_STATUS.QUALIFIED
            : RESULT_STATUS.ELIMINATED
          : result.isDraw
            ? RESULT_STATUS.GROUP_DRAW
            : result.userWon
              ? RESULT_STATUS.GROUP_WIN
              : RESULT_STATUS.GROUP_LOSS,
        isDraw: result.isDraw || result.homeGoals === result.awayGoals,
        opponentShotEvents: result?.attempts?.opponent || [],
      },
      result.userShotEvents || [],
    );
    setMatchResult(displayResult);
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;
    clearActiveMatchSnapshot();

    if (matchResult.status === RESULT_STATUS.THIRD_PLACE_PENDING) {
      const nextFixture =
        matchResult.nextFixture ||
        knockoutFixtures.find(
          (fixture) =>
            fixture.matchNo === 103 &&
            (fixture.home === team || fixture.away === team),
        );
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        clearAwardedTrophyPrompt();
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (
      [
        RESULT_STATUS.ELIMINATED,
        RESULT_STATUS.RUNNER_UP,
        RESULT_STATUS.THIRD_PLACE,
        RESULT_STATUS.FOURTH_PLACE,
      ].includes(matchResult.status)
    ) {
      resetTournament();
      return;
    }

    if (matchResult.status === RESULT_STATUS.CHAMPION) {
      clearAwardedTrophyPrompt();
      resetTournament("hosts");
      return;
    }

    if (matchResult.status === RESULT_STATUS.QUALIFIED) {
      const round32 = knockoutFixtures.length
        ? knockoutFixtures
        : buildRound32Fixtures(table);
      const userFixture = findTeamKnockoutFixture(team, round32);
      if (userFixture) {
        setKnockoutFixtures(round32);
        setCurrentKnockoutMatch(userFixture);
        setOpponent(getFixtureOpponent(team, userFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(userFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        clearAwardedTrophyPrompt();
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (matchResult.status === RESULT_STATUS.KNOCKOUT_WIN) {
      const nextFixture =
        matchResult.nextFixture ||
        knockoutFixtures.find(
          (fixture) =>
            !fixture.played && (fixture.home === team || fixture.away === team),
        );
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        clearAwardedTrophyPrompt();
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    const upcoming = schedule.find(
      (fixture) =>
        !fixture.played &&
        fixture.group === selectedGroup &&
        (fixture.home === team || fixture.away === team),
    );

    setMatchResult(null);
    setModalDismissed(false);
    clearAwardedTrophyPrompt();
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
    const equippableIds = new Set(["goldenBoot", "goldenBall", "goldenGlove"]);

    if (!hasCloudUser) {
      requestShopItem(id);
      return;
    }

    if (id === "goldenTicket") {
      requestShopItem("goldenTicket");
      return;
    }

    if (!equippableIds.has(id)) {
      requestShopItem(id);
      return;
    }

    const entitlements = storeEntitlements;
    const isOwned = Boolean(entitlements?.[id]);

    if (!isOwned) {
      setActiveCosmetics((current) => {
        const next = normaliseActiveCosmeticsForEntitlements(
          { ...(current || {}), [id]: false },
          entitlements,
        );
        safeWriteJson(COSMETICS_KEY, next);
        saveCosmeticActive(currentUser.uid, id, false).catch(() => {});
        return next;
      });
      requestShopItem(id);
      return;
    }

    setActiveCosmetics((current) => {
      const next = normaliseActiveCosmeticsForEntitlements(
        { ...(current || {}), [id]: !current?.[id] },
        entitlements,
      );
      safeWriteJson(COSMETICS_KEY, next);

      saveCosmeticActive(currentUser.uid, id, Boolean(next[id])).catch(
        (error) => {
          console.warn("Cosmetic active save failed", error);
        },
      );

      return next;
    });
  };

  const handleNicknameUpdate = async (nickname) => {
    const clean = String(nickname || "")
      .trim()
      .toUpperCase();
    if (!isCurrentUserVerified)
      throw new Error("Please verify your email first.");
    if (!/^[A-Z0-9]{1,10}$/.test(clean))
      throw new Error("Use 1-10 letters or numbers.");
    const taken = await isNicknameTaken(clean, currentUser.uid);
    if (taken) throw new Error("Username already taken.");
    await updateProfile(currentUser, { displayName: clean });
    await saveUserNickname(currentUser.uid, clean);
    setCurrentUser({ ...currentUser, displayName: clean });
  };

  const handleShirtSave = async (shirtProfile) => {
    const fallbackName =
      currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST";
    const nextShirt = {
      ...(shirtProfile || {}),
      name:
        String(shirtProfile?.name || fallbackName)
          .replace(/[^a-z0-9 ]/gi, "")
          .trim()
          .toUpperCase()
          .slice(0, 14) || fallbackName.toUpperCase().slice(0, 14),
      number:
        String(shirtProfile?.number || "11")
          .replace(/[^0-9]/g, "")
          .slice(0, 2) || "11",
      updatedAt: Date.now(),
    };
    setUserShirtProfile(nextShirt);
    if (hasCloudUser) {
      await saveUserShirtProfile(currentUser.uid, nextShirt);
      setFirebaseProfile((profile) => ({
        ...(profile || {}),
        userShirt: nextShirt,
        shirt: nextShirt,
        shareShirt: nextShirt,
      }));
    }
  };

  const clearAccountSessionState = () => {
    // Cancels any pending debounced cloud save from the previous account.
    cloudProfileSaveVersionRef.current += 1;
    setFirebaseProfile(null);
    setUserShirtProfile(null);
    setAllTeamsUnlocked(false);
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
    clearActiveMatchSnapshot();
    setModalDismissed(false);
    setAwardedTrophyMatchKey(null);
    setTable(blankTable());
    setSchedule(buildSchedule());
    setKnockoutFixtures([]);
    setCurrentKnockoutMatch(null);
    setPodium({});
    setMatchStage("GROUP STAGE");
    setUserForm([]);
    setScoringState(createScoringState());
    setBestCampaignScore(0);
    setBestCampaignSummary(null);
    setMondayCupsWon(0);
    setAllTimeGoals(0);
    setAllTimeShots(0);
    setAllTimeMatchesPlayed(0);
    setAllTimeMatchesWon(0);
    setAllTimeMatchesDrawn(0);
    setAllTimeMatchesLost(0);
    setAllTimeCampaignsCompleted(0);
    setAchievements({});
    setNationCupWins({});
    setNationStickerProgress({});
    setLeaderboardRows((rows) =>
      (Array.isArray(rows) ? rows : []).filter((row) => {
        const rowId = String(row?.userId || row?.uid || row?.id || "");
        return rowId && rowId !== "guest-local" && rowId !== "guest-preview" && !row?.localOnly && !row?.isUserPreview;
      }),
    );
    safeWriteNumber(ALL_TIME_MATCHES_PLAYED_KEY, 0);
    safeWriteNumber(ALL_TIME_MATCHES_WON_KEY, 0);
    safeWriteNumber(ALL_TIME_MATCHES_DRAWN_KEY, 0);
    safeWriteNumber(ALL_TIME_MATCHES_LOST_KEY, 0);
    setActiveCosmetics(EMPTY_ACTIVE_COSMETICS);

    try {
      window.localStorage.removeItem(BEST_CAMPAIGN_SCORE_KEY);
      window.localStorage.removeItem(BEST_CAMPAIGN_SUMMARY_KEY);
      window.localStorage.removeItem(MONDAY_CUPS_WON_KEY);
      window.localStorage.removeItem(ALL_TIME_GOALS_KEY);
      window.localStorage.removeItem(ALL_TIME_SHOTS_KEY);
      window.localStorage.removeItem(ALL_TIME_CAMPAIGNS_COMPLETED_KEY);
      window.localStorage.removeItem(ALL_TIME_MATCHES_PLAYED_KEY);
      window.localStorage.removeItem(ALL_TIME_MATCHES_WON_KEY);
      window.localStorage.removeItem(ALL_TIME_MATCHES_DRAWN_KEY);
      window.localStorage.removeItem(ALL_TIME_MATCHES_LOST_KEY);
      window.localStorage.removeItem(ACHIEVEMENTS_KEY);
      window.localStorage.removeItem(NATION_CUP_WINS_KEY);
      window.localStorage.removeItem(NATION_STICKER_PROGRESS_KEY);
      window.localStorage.removeItem(COSMETICS_KEY);
      window.localStorage.removeItem(ALL_TEAMS_UNLOCKED_KEY);
      window.localStorage.removeItem("mondayCup.localLeaderboardRows");
    } catch (error) {
      console.warn("Could not clear local account session cache", error);
    }
  };

  const handleSignOut = async () => {
    closeMenu();
    const signingOutUid = currentUser?.uid || null;

    if (hasCloudUser && !isCampaignSaveBlocked()) {
      const snapshot = buildGameSnapshot();
      if (snapshot?.active && snapshot?.mode !== "twoPlayer") {
        await saveCurrentProgress(currentUser.uid, snapshot).catch(
        (error) => {
          console.warn(
            "Could not save current progress before sign out",
            error,
          );
        },
      );
      }
    }

    clearAccountSessionState();
    accountSessionUidRef.current = null;

    await signOut(auth);
    if (accountSessionUidRef.current === signingOutUid) accountSessionUidRef.current = null;
    setCurrentUser(null);
    clearAccountSessionState();
    setDrawer(null);
    setScreen("home");
  };

  const menuProps = {
    menuOpen,
    menuInitialView,
    menuInitialAuthMode,
    menuAuthShowLogoBack,
    menuAuthRequestId,
    onToggleMenu: () => {
      setMenuInitialView("menu");
      setMenuInitialAuthMode("signin");
      setMenuAuthShowLogoBack(false);
      setMenuOpen((open) => !open);
    },
    onCloseMenu: closeMenu,
    onOpenAuthMenu: openAuthMenu,
    onMatch: openMatch,
    onFixtures: openFixtures,
    onGroups: openGroups,
    onClubhouse: openClubhouse,
    onTrophyCabinet: openTrophyCabinet,
    onLeaderboard: openLeaderboard,
    onRestart: resetTournament,
    onSignOut: handleSignOut,
    canSignOut: Boolean(currentUser),
    onAuthComplete: handleAuthComplete,
  };

  const drawerElement = drawer ? (
    <AppDrawer
      drawer={drawer}
      allGroups={allGroups}
      qualifiers={qualifiers}
      menuProps={menuProps}
      standingsView={standingsView}
      onStandingsViewChange={setStandingsView}
      visibleKnockoutFixtures={visibleKnockoutFixtures}
      qualifiedTeams={qualifiedTeams}
      userTeam={isCampaignSaveBlocked() ? null : team}
      currentCampaign={firebaseProfile?.currentCampaign || null}
      podium={podium}
      fixtureView={fixtureView}
      onFixtureViewChange={setFixtureView}
      scheduleFocus={scheduleFocus}
      schedule={schedule}
      profile={{
        userForm: isCampaignSaveBlocked() ? [] : userForm,
        campaignPoints: isCampaignSaveBlocked() ? 0 : scoringState.campaignPoints,
        bestCampaignSummary,
        currentRoundLabel: isCampaignSaveBlocked() ? null : currentRoundLabel,
        leaderboardRank: myLeaderboardRank,
        mondayCupsWon,
        highScore: Math.max(isCampaignSaveBlocked() ? 0 : scoringState.campaignPoints || 0, bestCampaignScore || 0),
        allTimeMatchesPlayed,
        allTimeMatchesWon,
        allTimeMatchesDrawn,
        allTimeMatchesLost,
        allTimeGoals,
        allTimeShots,
        activeCosmetics,
      }}
      clubhouse={{
        storeEntitlements,
        onToggleCosmetic: toggleCosmetic,
        onOpenShop: requestShopItem,
        onUseGoldenTicket: useGoldenTicketForNextCampaign,
        allTeamsUnlocked,
        onUnlockAllTeams: () => requestShopItem("allTeams"),
        onResumeCampaign: openMatch,
        onStartNewCampaign: openTeamFlow,
        currentUser,
        shirtProfile: userShirtProfile,
        onEditShirt: () => setShirtShareOpen(true),
        onNicknameUpdate: handleNicknameUpdate,
      }}
      trophies={{
        achievements,
        nationCupWins,
        nationStickerProgress,
        careerStats: {
          matchesPlayed: allTimeMatchesPlayed,
          matchesWon: allTimeMatchesWon,
          goalsScored: allTimeGoals,
          campaignsCompleted: allTimeCampaignsCompleted,
          cupsWon: mondayCupsWon,
          cupWins: mondayCupsWon,
          mondayCupsWon,
          mondayCupWins: mondayCupsWon,
        },
        allTeamsUnlocked,
        onOpenNationSticker: markNationStickerOpened,
      }}
      leaderboard={{
        rows: leaderboardRows,
        currentCampaignScore: isCampaignSaveBlocked() ? 0 : scoringState.campaignPoints,
        bestCampaignScore,
        bestCampaignSummary,
        activeCosmetics,
        currentUser,
      }}
    />
  ) : null;

  const shopModalElement = (
    <ShopModal
      open={shopOpen}
      onClose={closeShop}
      initialItemId={shopInitialItemId}
      entitlements={storeEntitlements}
      currentUser={currentUser}
      onCheckout={startStripeCheckout}
    />
  );

  const shirtShareModalElement = (
    <ShirtShareModal
      open={shirtShareOpen}
      onClose={() => setShirtShareOpen(false)}
      currentUser={currentUser}
      initialShirt={userShirtProfile}
      onSaveShirt={handleShirtSave}
    />
  );

  const feedbackModalElement = (
    <FeedbackModal
      open={Boolean(feedbackPromptType)}
      promptType={feedbackPromptType || "prompt1"}
      onSubmit={submitFeedback}
      onDismiss={closeFeedbackModal}
    />
  );

  const footerFeedbackProps = {
    onFeedback: openManualFeedbackModal,
    feedbackEnabled: hasCloudUser,
    feedbackSubmitted: Boolean(feedbackState?.hasSubmitted),
  };

  const withShop = (content) => (
    <>
      {content}
      {shopModalElement}
      {shirtShareModalElement}
      {feedbackModalElement}
    </>
  );

  if (["home", "hosts", "teams"].includes(screen)) {
    if (drawerElement) return withNonMatchFooter(withShop(drawerElement), footerFeedbackProps);

    if (screen === "home") {
      return withShop(
        <HomeScreen
          allTeamsUnlocked={allTeamsUnlocked}
          menuProps={menuProps}
          onSelectGroup={selectGroup}
          onSelectTeam={startTeam}
          onTwoPlayer={beginTwoPlayer}
          onUnlockAllTeams={() => requestShopItem("allTeams")}
          onAuthComplete={handleAuthComplete}
          authReady={authReady}
          currentUser={currentUser}
          onOpenClubhouse={openClubhouse}
          onOpenAuthPanel={openAuthMenu}
          onResumeCampaign={handleResumeCampaign}
          hasResumeCampaign={Boolean(
            firebaseProfile?.currentCampaign?.active ||
            firebaseProfile?.currentCampaign?.runtimeSnapshot?.active ||
            firebaseProfile?.currentProgress?.active ||
            firebaseProfile?.savedGames?.current?.active,
          )}
          onOpenFeedback={openManualFeedbackModal}
          showSemiFinalDevButton={String(currentUser?.email || "").toLowerCase() === DEV_SEMI_FINAL_EMAIL}
          onStartAtSemiFinalDev={startDevSemiFinalCampaign}
        />,
      );
    }

    if (screen === "hosts") {
      return withShop(
        <HostSelectScreen
          allTeamsUnlocked={allTeamsUnlocked}
          menuProps={menuProps}
          currentUser={currentUser}
          onAuthComplete={handleAuthComplete}
          onOpenFeedback={openManualFeedbackModal}
          onBack={twoPlayerMode ? handleTwoPlayerBack : () => setScreen("home")}
          onSelectGroup={selectGroup}
          onSelectTeam={twoPlayerMode ? handleTwoPlayerTeamSelect : startTeam}
          onTwoPlayer={beginTwoPlayer}
          onUnlockAllTeams={() => requestShopItem("allTeams")}
          title={twoPlayerMode ? (twoPlayerSetup?.step === "p2" ? "P2 CHOOSE YOUR TEAM" : "P1 CHOOSE YOUR TEAM") : "CHOOSE YOUR TEAM"}
          disabledTeam={twoPlayerMode && twoPlayerSetup?.step === "p2" ? twoPlayerSetup?.p1Team : null}
        />,
      );
    }

    return withShop(
      <TeamSelectScreen
        allTeamsUnlocked={allTeamsUnlocked}
        menuProps={menuProps}
        selectedGroup={selectedGroup}
        onBack={twoPlayerMode ? handleTwoPlayerBack : () => setScreen("hosts")}
        onSelectGroup={setSelectedGroup}
        onSelectTeam={twoPlayerMode ? handleTwoPlayerTeamSelect : startTeam}
        title={twoPlayerMode ? (twoPlayerSetup?.step === "p2" ? "P2 CHOOSE YOUR TEAM" : "P1 CHOOSE YOUR TEAM") : "CHOOSE YOUR TEAM"}
        disabledTeam={twoPlayerMode && twoPlayerSetup?.step === "p2" ? twoPlayerSetup?.p1Team : null}
        onOpenFeedback={openManualFeedbackModal}
      />,
    );
  }

  const currentStickerNoticeKey = getUnopenedNationStickerNoticeKey(nationStickerProgress, team);
  const hasUncollectedReward = Boolean(awardedTrophyMatchKey) || Boolean(currentStickerNoticeKey && currentStickerNoticeKey !== acknowledgedStickerNoticeKey);

  const matchScreen = (
    <MatchScreen
      team={team}
      opponent={opponent}
      score={score}
      matchResult={matchResult}
      modalDismissed={modalDismissed}
      onDismissModal={twoPlayerMode ? exitTwoPlayerMatch : () => setModalDismissed(true)}
      onQuickWin={quickWin}
      onMatchComplete={twoPlayerMode ? handleTwoPlayerMatchComplete : handleMatchComplete}
      onNextMatch={twoPlayerMode ? replayTwoPlayerMatch : nextMatch}
      onChangeTeams={twoPlayerMode ? changeTwoPlayerTeams : undefined}
      matchResetKey={matchResetKey}
      onViewBracket={() => {
        setStandingsView("knockout");
        setDrawer("groups");
      }}
      onPlayAgain={resetTournament}
      onOpenTrophies={openTrophyCabinet}
      hasNewTrophy={hasUncollectedReward}
      menuProps={menuProps}
      stageLabel={twoPlayerMode ? "SHOOTOUT" : matchStage}
      fixture={currentFixture}
      groupRows={
        allGroups.find((item) => item.group === selectedGroup)?.rows || []
      }
      qualifiedTeams={qualifiedTeams}
      selectedGroup={selectedGroup}
      userForm={userForm}
      podium={podium}
      activeCosmetics={activeCosmetics}
      twoPlayerMode={twoPlayerMode}
      activeMatchSnapshot={activeMatchSnapshot}
      onActiveMatchSnapshot={updateActiveMatchSnapshot}
    />
  );

  if (screen === "match") {
    if (drawerElement) {
      return withNonMatchFooter(
        withShop(
          <>
            <div
              className="fixed inset-0 -z-10 opacity-0 pointer-events-none"
              aria-hidden
            >
              {matchScreen}
            </div>
            {drawerElement}
          </>,
        ),
        footerFeedbackProps,
      );
    }

    return withShop(matchScreen);
  }

  if (drawerElement) return withNonMatchFooter(withShop(drawerElement), footerFeedbackProps);
  return matchScreen;
}
