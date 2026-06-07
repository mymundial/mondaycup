import { useEffect, useMemo, useState } from "react";
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
  simulateRemainingKnockoutTournament,
  runSelfTests,
} from "./logic/tournament.js";
import { RESULT_STATUS } from "./logic/resultStatus.js";
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
  saveAllTeamsUnlocked,
  saveCurrentProgress,
  saveLeaderboardHighScore,
  saveUserNickname,
  saveUserProfile,
  consumeGoldenTicket,
  saveCosmeticActive,
  saveCheckoutStarted,
  buildStoreEntitlements,
  saveUserShirtProfile,
} from "./lib/firebaseUser.js";
import ShopModal from "./components/store/ShopModal.jsx";
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

export default function App() {
  const [screen, setScreen] = useState("home");
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
  const [goldenTicketNextCampaign, setGoldenTicketNextCampaign] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      if (user) {
        try {
          await user.reload();
        } catch (error) {
          console.warn("Could not refresh email verification state", error);
        }

        const freshUser = auth.currentUser || user;
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
          try {
            const seenKey = `mondayCup.shirtShareSeen.${freshUser.uid}`;
            if (
              !profile?.userShirt?.updatedAt &&
              !window.localStorage?.getItem(seenKey)
            ) {
              window.localStorage?.setItem(seenKey, "1");
              setShirtShareOpen(true);
            }
          } catch {
            if (!profile?.userShirt?.updatedAt) setShirtShareOpen(true);
          }
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
            profile?.bestCampaign?.points ||
            profile?.bestCampaign?.campaignPoints
          ) {
            const profileBestScore = Number(
              profile.bestCampaign.points ??
                profile.bestCampaign.campaignPoints ??
                0,
            );
            setBestCampaignScore(profileBestScore);
            const summary = {
              ...(profile.bestCampaign || {}),
              team: profile.bestCampaign.team || "NO TEAM",
              form:
                profile.bestCampaign.form ||
                profile.bestCampaign.tournamentProgress ||
                [],
              tournamentProgress:
                profile.bestCampaign.tournamentProgress ||
                profile.bestCampaign.form ||
                [],
              campaignPoints: profileBestScore,
              points: profileBestScore,
              roundLabel:
                profile.bestCampaign.roundLabel ||
                profile.bestCampaign.stage ||
                "NO CAMPAIGN",
              updatedAt: profile.bestCampaign.updatedAt || Date.now(),
            };
            setBestCampaignSummary(summary);
            safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, profileBestScore);
            safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, summary);
          }
          if (profile?.stats) {
            setMondayCupsWon(Number(profile.stats.mondayCupsWon || 0));
            setAllTimeGoals(Number(profile.stats.totalGoalsScored || 0));
            setAllTimeShots(
              Number(
                profile.stats.totalShotsTaken || profile.stats.totalShots || 0,
              ),
            );
            setAllTimeMatchesPlayed(
              Number(
                profile.stats.matchesPlayed ||
                  profile.stats.totalMatchesPlayed ||
                  profile.stats.totalMatchesCompleted ||
                  0,
              ),
            );
            setAllTimeMatchesWon(
              Number(
                profile.stats.matchesWon || profile.stats.totalMatchesWon || 0,
              ),
            );
            setAllTimeMatchesDrawn(
              Number(
                profile.stats.matchesDrawn ||
                  profile.stats.totalMatchesDrawn ||
                  0,
              ),
            );
            setAllTimeMatchesLost(
              Number(
                profile.stats.matchesLost ||
                  profile.stats.totalMatchesLost ||
                  0,
              ),
            );
          }
          if (profile?.achievements) {
            setAchievements(profile.achievements || {});
            safeWriteJson(ACHIEVEMENTS_KEY, profile.achievements || {});
          }
          if (profile?.nationCupWins) {
            setNationCupWins(profile.nationCupWins || {});
            safeWriteJson(NATION_CUP_WINS_KEY, profile.nationCupWins || {});
          }
          if (profile?.nationStickerProgress) {
            setNationStickerProgress(profile.nationStickerProgress || {});
            safeWriteJson(NATION_STICKER_PROGRESS_KEY, profile.nationStickerProgress || {});
          }
        } catch (error) {
          console.warn("User profile sync failed", error);
        }
      } else {
        setFirebaseProfile(null);
        setUserShirtProfile(null);
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
      guestSnapshot?.active && guestSnapshot?.team,
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
            team: team || guestSnapshot.team || null,
            opponent: opponent || guestSnapshot.opponent || null,
            stage: currentRoundLabel || matchStage || "Group Stage",
            points: Number(
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
          };

          await saveUserProfile(nextUser.uid, {
            currentCampaign: currentCampaignPayload,
            currentProgress: guestSnapshot,
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
        try {
          const seenKey = `mondayCup.shirtShareSeen.${nextUser.uid}`;
          if (
            !profile?.userShirt?.updatedAt &&
            !window.localStorage?.getItem(seenKey)
          ) {
            window.localStorage?.setItem(seenKey, "1");
            setShirtShareOpen(true);
          }
        } catch {
          if (!profile?.userShirt?.updatedAt) setShirtShareOpen(true);
        }
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

    if (nextUser && options?.source === "menu-auth") {
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

  const currentFixture = currentKnockoutMatch
    ? toGameFixture(currentKnockoutMatch)
    : toGameFixture(activeGroupFixture);
  const currentRoundLabel = team
    ? roundLabelForResult(matchResult, matchStage)
    : "NO CAMPAIGN";
  const hasCloudUser = Boolean(currentUser?.uid);
  const isCurrentUserVerified = Boolean(
    currentUser?.uid && currentUser.emailVerified,
  );

  const cosmeticUsageFromActive = (cosmetics = {}) => ({
    goldenBoot: Boolean(cosmetics?.goldenBoot),
    goldenBall: Boolean(cosmetics?.goldenBall),
    goldenGlove: Boolean(cosmetics?.goldenGlove),
    goldenTicket: Boolean(cosmetics?.goldenTicket),
    cosmeticBallEquipped: Boolean(cosmetics?.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmetics?.goldenGlove),
    goldenTicketUsed: Boolean(cosmetics?.goldenTicket),
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
        activeUsage.goldenGlove ||
        activeUsage.goldenTicket
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

  const updateNationStickerProgress = (updater) => {
    setNationStickerProgress((current) => {
      const next = updater(current || {});
      if (next !== current) safeWriteJson(NATION_STICKER_PROGRESS_KEY, next);
      return next;
    });
  };

  const countKeeperSavesForSticker = (opponentShotEvents = []) => {
    if (!Array.isArray(opponentShotEvents)) return 0;
    return opponentShotEvents.filter((event) => {
      const raw = String(event?.shotResult || event?.result || event?.outcome || "").toLowerCase();
      return event?.goal === false && (raw.includes("save") || raw.includes("saved"));
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

  const markNationStickerOpened = (nation, stickerKey = "flag") => {
    if (!nation || !stickerKey) return;
    updateNationStickerProgress((current) => {
      const existing = current?.[nation] || {};
      const opened = { ...(existing.opened || {}), [stickerKey]: true };
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
    });
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

  const buildGameSnapshot = () =>
    sanitizeCloudData({
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
      campaignCosmeticsUsed,
      achievements,
      nationCupWins,
      nationStickerProgress,
      awardedTrophyMatchKey,
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

    const payload = {
      nickname:
        currentUser.displayName || currentUser.email?.split("@")[0] || "Player",
      email: currentUser.email || "",
      accountStatus: { emailVerified: Boolean(currentUser.emailVerified), verificationRequired: !currentUser.emailVerified },
      currentCampaign: {
        active: Boolean(team),
        team: team || null,
        opponent: opponent || null,
        stage: currentRoundLabel || matchStage || "No Campaign",
        points: Number(scoringState.campaignPoints || 0),
        cupRun: userForm || [],
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
      },
      currentProgress: buildGameSnapshot(),
      bestCampaign: {
        ...(bestCampaignSummary || {}),
        points: Number(bestCampaignScore || 0),
        campaignPoints: Number(bestCampaignScore || 0),
        cupRun:
          bestCampaignSummary?.cupRun ||
          bestCampaignSummary?.formGuide ||
          bestCampaignSummary?.form ||
          bestCampaignSummary?.tournamentProgress ||
          [],
        team: bestCampaignSummary?.team || null,
        stage:
          bestCampaignSummary?.roundLabel ||
          bestCampaignSummary?.stage ||
          "No Campaign",
        roundLabel:
          bestCampaignSummary?.roundLabel ||
          bestCampaignSummary?.stage ||
          "No Campaign",
        cosmeticsApplied:
          bestCampaignSummary?.cosmeticsApplied || campaignCosmeticsApplied(),
        cosmeticBallEquipped: Boolean(
          bestCampaignSummary?.cosmeticBallEquipped ??
          activeCosmetics?.goldenBall,
        ),
        cosmeticGloveEquipped: Boolean(
          bestCampaignSummary?.cosmeticGloveEquipped ??
          activeCosmetics?.goldenGlove,
        ),
      },
      careerStats: {
        mondayCupsWon: Number(mondayCupsWon || 0),
        matchesPlayed: Number(allTimeMatchesPlayed || 0),
        totalMatchesPlayed: Number(allTimeMatchesPlayed || 0),
        matchesWon: Number(allTimeMatchesWon || 0),
        totalMatchesWon: Number(allTimeMatchesWon || 0),
        matchesDrawn: Number(allTimeMatchesDrawn || 0),
        totalMatchesDrawn: Number(allTimeMatchesDrawn || 0),
        matchesLost: Number(allTimeMatchesLost || 0),
        totalMatchesLost: Number(allTimeMatchesLost || 0),
        totalGoalsScored: goals,
        totalShotsTaken: attempts,
        conversionPercentage,
        highScore: profileHighScore,
        gameScore: profileHighScore,
        leaderboardRank: myLeaderboardRank || null,
      },
      trophies: achievements || {},
      nationCupWins: nationCupWins || {},
      stickers: nationStickerProgress || {},
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

    const timeout = window.setTimeout(() => {
      saveUserProfile(currentUser.uid, payload).catch((error) => {
        console.warn("Cloud profile save failed", error);
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    activeCosmetics,
    campaignCosmeticsUsed,
    allTeamsUnlocked,
    allTimeGoals,
    allTimeShots,
    allTimeMatchesPlayed,
    allTimeMatchesWon,
    allTimeMatchesDrawn,
    allTimeMatchesLost,
    achievements,
    nationCupWins,
    nationStickerProgress,
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
      keeperSaves: countKeeperSavesForSticker(baseResult?.opponentShotEvents),
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
    const latestBestCampaignSummary = nextIsBestCampaign
      ? {
          ...buildCampaignSummary({
            team,
            userForm: nextForm,
            campaignPoints: nextScoringState.campaignPoints,
            result: enrichedResult,
            fallbackRound: matchStage,
          }),
          points: Number(nextScoringState.campaignPoints || 0),
          formGuide: nextForm,
          tournamentProgress: nextForm,
          form: nextForm,
          cosmeticsApplied: campaignCosmetics,
          cosmeticBallEquipped: Boolean(campaignCosmetics?.goldenBall),
          cosmeticGloveEquipped: Boolean(campaignCosmetics?.goldenGlove),
        }
      : bestCampaignSummary;

    if (nextIsBestCampaign) {
      setBestCampaignScore(nextScoringState.campaignPoints);
      setBestCampaignSummary(latestBestCampaignSummary);
      safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, nextScoringState.campaignPoints);
      safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, latestBestCampaignSummary);
    }

    if (isTerminalLeaderboardStatus(baseResult.status)) {
      const leaderboardBestScore = Number(
        Math.max(nextScoringState.campaignPoints || 0, bestCampaignScore || 0),
      );
      const leaderboardBestTeam = nextIsBestCampaign
        ? team
        : latestBestCampaignSummary?.team || team || null;
      const leaderboardForm =
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
        }),
        id: localUserId,
        uid: localUserId,
        userId: localUserId,
        username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
        formGuide: leaderboardForm,
        form: leaderboardForm,
        tournamentProgress: leaderboardForm,
        bestCampaign: latestBestCampaignSummary || {
          team: leaderboardBestTeam,
          formGuide: leaderboardForm,
          form: leaderboardForm,
          tournamentProgress: leaderboardForm,
          campaignPoints: leaderboardBestScore,
          points: leaderboardBestScore,
          roundLabel: roundLabelForResult(baseResult, matchStage),
        },
        cosmeticsApplied: latestBestCampaignSummary?.cosmeticsApplied || campaignCosmeticsApplied(),
        emailVerified: Boolean(isCurrentUserVerified),
        accountStatus: { emailVerified: Boolean(isCurrentUserVerified), verificationRequired: !isCurrentUserVerified },
        localOnly: !hasCloudUser,
      };
      setLeaderboardRows((rows) => {
        const withoutUser = rows.filter((row) => (row.userId || row.uid) !== localUserId);
        const nextRows = [entry, ...withoutUser]
          .sort((a, b) => Number(b.campaignPoints || b.gameScore || 0) - Number(a.campaignPoints || a.gameScore || 0))
          .slice(0, 50)
          .map((row, index) => ({ ...row, rank: index + 1 }));
        safeWriteLeaderboardRows(nextRows.filter((row) => row.localOnly || row.userId === "guest-local"));
        return nextRows;
      });
      if (hasCloudUser) {
        saveLeaderboardHighScore(currentUser.uid, entry)
          .then(() => loadLeaderboardRows(50).then((rows) => {
            const localRows = safeReadLeaderboardRows();
            setLeaderboardRows([...localRows, ...rows].sort((a, b) => Number(b.campaignPoints || b.gameScore || 0) - Number(a.campaignPoints || a.gameScore || 0)).slice(0, 50));
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
  };
  const handleResumeCampaign = async () => {
    const snapshot = hasCloudUser
      ? await loadCurrentProgress(currentUser.uid).catch(
          () =>
            firebaseProfile?.currentProgress ||
            firebaseProfile?.savedGames?.current ||
            null,
        )
      : firebaseProfile?.currentProgress ||
        firebaseProfile?.savedGames?.current ||
        null;
    const restored = restoreGameSnapshot(snapshot);
    if (!restored) setScreen("home");
  };

  const hasActiveCampaign = () =>
    Boolean(team && (opponent || currentKnockoutMatch || activeGroupFixture));

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
            firebaseProfile?.currentProgress ||
            firebaseProfile?.savedGames?.current ||
            null,
        )
      : firebaseProfile?.currentProgress ||
        firebaseProfile?.savedGames?.current ||
        null;

    if (
      savedProgress?.active &&
      savedProgress?.team &&
      restoreGameSnapshot(savedProgress)
    ) {
      return;
    }

    openTeamFlow();
  };
  const openFixtures = () => {
    closeMenu();
    if (resultIsEliminated(matchResult)) finishTournamentForEliminatedUser();
    setFixtureView(groupStageComplete || resultIsEliminated(matchResult) ? "knockout" : "group");
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
  const requestShopItem = (itemId = null) => {
    if (!currentUser?.uid) {
      setPendingShopItemId(itemId);
      setShopOpen(false);
      openAuthMenu("signup", { showLogoBack: true });
      return;
    }
    if (!currentUser.emailVerified) {
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

  const useGoldenTicketForNextCampaign = () => {
    const ticketQuantity = Number(
      activeCosmetics?.goldenTicketQuantity ??
        (activeCosmetics?.goldenTicket ? 1 : 0),
    );
    if (ticketQuantity <= 0) {
      requestShopItem("goldenTicket");
      return;
    }
    setGoldenTicketNextCampaign(true);
    setDrawer(null);
    setMenuOpen(false);
    setScreen("home");
  };

  const storeEntitlements = buildStoreEntitlements({
    ...(firebaseProfile || {}),
    unlocks: firebaseProfile?.unlocks || {},
    upgradesPurchased: firebaseProfile?.upgradesPurchased || {},
    consumables: firebaseProfile?.consumables || {},
  });


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
    if (!isCurrentUserVerified)
      throw new Error("Please verify your email before buying upgrades");
    const idToken = await currentUser.getIdToken();
    await saveCheckoutStarted(currentUser.uid, {
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

  const unlockAllTeams = () => {
    setAllTeamsUnlocked(true);
    safeWriteJson(ALL_TEAMS_UNLOCKED_KEY, true);
    if (hasCloudUser) {
      saveAllTeamsUnlocked(currentUser.uid, true).catch((error) =>
        console.warn("Unlock-all-teams save failed", error),
      );
    }
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
    const currentTicketQuantity = Number(
      activeCosmetics?.goldenTicketQuantity ??
        (activeCosmetics?.goldenTicket ? 1 : 0),
    );

    setActiveCosmetics((current) => {
      const nextQuantity = Math.max(0, Number(currentTicketQuantity || 0) - 1);
      const next = {
        ...(current || {}),
        goldenTicket: nextQuantity > 0,
        goldenTicketQuantity: nextQuantity,
      };
      safeWriteJson(COSMETICS_KEY, next);
      return next;
    });

    if (hasCloudUser) {
      consumeGoldenTicket(currentUser.uid, currentTicketQuantity).catch(
        (error) => {
          console.warn("Golden Ticket consume failed", error);
        },
      );
    }
  };

  const startTeam = (name, groupOverride = selectedGroup) => {
    if (!HOST_TEAMS.has(name) && !allTeamsUnlocked) {
      requestShopItem("allTeams");
      return;
    }

    const ticketQuantity = Number(
      activeCosmetics?.goldenTicketQuantity ??
        (activeCosmetics?.goldenTicket ? 1 : 0),
    );
    const canUseGoldenTicket =
      Boolean(activeCosmetics?.goldenTicket) && ticketQuantity > 0;
    const useGoldenTicket = canUseGoldenTicket && goldenTicketNextCampaign;

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
        setGoldenTicketNextCampaign(false);
        return;
      }
    }

    if (goldenTicketNextCampaign && !useGoldenTicket) {
      setGoldenTicketNextCampaign(false);
    }

    const fixture =
      schedule.find(
        (item) =>
          !item.played &&
          item.group === groupOverride &&
          (item.home === name || item.away === name),
      ) ||
      schedule.find(
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
    setCurrentKnockoutMatch(null);
    setMatchStage("GROUP STAGE");
    setMatchResult(null);
    setModalDismissed(false);
    setAwardedTrophyMatchKey(null);
    setUserForm([]);
    setScoringState(createScoringState());
    setCampaignCosmeticsUsed(cosmeticUsageFromActive(activeCosmetics));
  };

  const quickWin = () => {
    if (!team || !opponent) return;
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
      setCurrentKnockoutMatch(null);
      setStandingsView("knockout");
      setDrawer("groups");
      setMatchResult(null);
      setModalDismissed(false);
      clearAwardedTrophyPrompt();
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
    setFirebaseProfile(null);
    setUserShirtProfile(null);
    setAllTeamsUnlocked(false);
    setTeam(null);
    setOpponent("");
    setScore([0, 0]);
    setMatchResult(null);
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
      window.localStorage.removeItem(COSMETICS_KEY);
      window.localStorage.removeItem(ALL_TEAMS_UNLOCKED_KEY);
      window.localStorage.removeItem("mondayCup.localLeaderboardRows");
    } catch (error) {
      console.warn("Could not clear local account session cache", error);
    }
  };

  const handleSignOut = async () => {
    closeMenu();

    if (hasCloudUser) {
      await saveCurrentProgress(currentUser.uid, buildGameSnapshot()).catch(
        (error) => {
          console.warn(
            "Could not save current progress before sign out",
            error,
          );
        },
      );
    }

    await signOut(auth);
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
      userTeam={team}
      podium={podium}
      fixtureView={fixtureView}
      onFixtureViewChange={setFixtureView}
      schedule={schedule}
      profile={{
        userForm,
        campaignPoints: scoringState.campaignPoints,
        bestCampaignSummary,
        currentRoundLabel,
        leaderboardRank: myLeaderboardRank,
        mondayCupsWon,
        highScore: Math.max(scoringState.campaignPoints || 0, bestCampaignScore || 0),
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
        },
        allTeamsUnlocked,
        onOpenNationSticker: markNationStickerOpened,
      }}
      leaderboard={{
        rows: leaderboardRows,
        currentCampaignScore: scoringState.campaignPoints,
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

  const withShop = (content) => (
    <>
      {content}
      {shopModalElement}
      {shirtShareModalElement}
    </>
  );

  if (["home", "hosts", "teams"].includes(screen)) {
    if (drawerElement) return withNonMatchFooter(withShop(drawerElement));

    if (screen === "home") {
      return withShop(
        <HomeScreen
          allTeamsUnlocked={allTeamsUnlocked}
          menuProps={menuProps}
          onSelectGroup={selectGroup}
          onSelectTeam={startTeam}
          onUnlockAllTeams={() => requestShopItem("allTeams")}
          onAuthComplete={handleAuthComplete}
          authReady={authReady}
          currentUser={currentUser}
          onOpenClubhouse={openClubhouse}
          onOpenAuthPanel={openAuthMenu}
          onResumeCampaign={handleResumeCampaign}
          hasResumeCampaign={Boolean(
            firebaseProfile?.currentProgress?.active ||
            firebaseProfile?.savedGames?.current?.active,
          )}
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
          onBack={() => setScreen("home")}
          onSelectGroup={selectGroup}
          onSelectTeam={startTeam}
          onUnlockAllTeams={() => requestShopItem("allTeams")}
        />,
      );
    }

    return withShop(
      <TeamSelectScreen
        allTeamsUnlocked={allTeamsUnlocked}
        menuProps={menuProps}
        selectedGroup={selectedGroup}
        onBack={() => setScreen("hosts")}
        onSelectGroup={setSelectedGroup}
        onSelectTeam={startTeam}
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
      onDismissModal={() => setModalDismissed(true)}
      onQuickWin={quickWin}
      onMatchComplete={handleMatchComplete}
      onNextMatch={nextMatch}
      onViewBracket={() => {
        setStandingsView("knockout");
        setDrawer("groups");
      }}
      onPlayAgain={resetTournament}
      onOpenTrophies={openTrophyCabinet}
      hasNewTrophy={hasUncollectedReward}
      menuProps={menuProps}
      stageLabel={matchStage}
      fixture={currentFixture}
      groupRows={
        allGroups.find((item) => item.group === selectedGroup)?.rows || []
      }
      qualifiedTeams={qualifiedTeams}
      selectedGroup={selectedGroup}
      userForm={userForm}
      podium={podium}
      activeCosmetics={activeCosmetics}
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
      );
    }

    return withShop(matchScreen);
  }

  if (drawerElement) return withNonMatchFooter(withShop(drawerElement));
  return matchScreen;
}
