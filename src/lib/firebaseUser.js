import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

export const FORM_GUIDE_LENGTH = 8;
export const GROUP_STAGE_MATCH_START = 1;
export const GROUP_STAGE_MATCH_END = 72;
export const KNOCKOUT_MATCH_START = 73;
export const KNOCKOUT_MATCH_END = 104;

const COSMETIC_KEYS = ["goldenBall", "goldenGlove", "cosmetic3", "cosmetic4"];
const UPGRADE_KEYS = ["allTeams", ...COSMETIC_KEYS];

const emptyBooleanMap = (keys) => Object.fromEntries(keys.map((key) => [key, false]));

export const normaliseFormGuide = (formGuide = []) => {
  const source = Array.isArray(formGuide) ? formGuide : [];
  return Array.from({ length: FORM_GUIDE_LENGTH }, (_, index) => source[index] ?? null);
};

export const createEmptyResultMap = (start, end) => {
  const results = {};
  for (let matchId = start; matchId <= end; matchId += 1) {
    results[String(matchId)] = null;
  }
  return results;
};

export const createDefaultCurrentMatchState = () => ({
  matchId: null,
  homeTeamId: null,
  awayTeamId: null,
  userTeamId: null,
  opponentTeamId: null,

  userScore: 0,
  opponentScore: 0,

  currentPenaltyNumber: 1,
  suddenDeath: false,

  userPensTaken: 0,
  opponentPensTaken: 0,
  userPenaltyGoals: 0,
  opponentPenaltyGoals: 0,

  currentTurn: "user",
  penaltyMarkers: [],
  penaltyLog: [],

  lastShot: null,
  resultModal: null,
});

export const createDefaultCurrentCampaign = () => ({
  exists: false,
  status: "not_started", // not_started | active | completed
  selectedTeamId: null,
  selectedTeamName: null,
  tournamentPhase: "Not Started",
  formGuide: normaliseFormGuide(),
  gameScore: 0,
  groupStageResults: createEmptyResultMap(GROUP_STAGE_MATCH_START, GROUP_STAGE_MATCH_END),
  knockoutResults: createEmptyResultMap(KNOCKOUT_MATCH_START, KNOCKOUT_MATCH_END),
  cosmeticsApplied: emptyBooleanMap(COSMETIC_KEYS),
  currentMatchState: createDefaultCurrentMatchState(),
  updatedAt: null,
});

export const createDefaultBestCampaign = () => ({
  exists: false,
  teamId: null,
  teamName: null,
  tournamentPhase: "Not Started",
  formGuide: normaliseFormGuide(),
  gameScore: 0,
  cosmeticsApplied: emptyBooleanMap(COSMETIC_KEYS),
  completedAt: null,
});

export const createDefaultAchievements = () =>
  Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`trophy${index + 1}`, false]));

const cleanUsername = (value, fallback = "Player") =>
  String(value || fallback).trim().slice(0, 10) || fallback;

const normaliseUpgradeMap = (source = {}, legacyCosmetics = {}, legacyUnlocks = {}) => ({
  allTeams: Boolean(source.allTeams ?? legacyUnlocks.allTeams ?? false),
  goldenBall: Boolean(source.goldenBall ?? legacyCosmetics.goldenBall ?? false),
  goldenGlove: Boolean(source.goldenGlove ?? legacyCosmetics.goldenGlove ?? false),
  cosmetic3: Boolean(source.cosmetic3 ?? legacyCosmetics.cosmetic3 ?? false),
  cosmetic4: Boolean(source.cosmetic4 ?? legacyCosmetics.cosmetic4 ?? false),
});

const normaliseCosmeticsEquipped = (source = {}, legacyCosmetics = {}) => ({
  goldenBall: Boolean(source.goldenBall ?? legacyCosmetics.goldenBall ?? false),
  goldenGlove: Boolean(source.goldenGlove ?? legacyCosmetics.goldenGlove ?? false),
  cosmetic3: Boolean(source.cosmetic3 ?? legacyCosmetics.cosmetic3 ?? false),
  cosmetic4: Boolean(source.cosmetic4 ?? legacyCosmetics.cosmetic4 ?? false),
});

const normaliseCosmeticsApplied = (source = {}, legacy = {}) => ({
  goldenBall: Boolean(source.goldenBall ?? legacy.goldenBall ?? legacy.cosmeticBallEquipped ?? false),
  goldenGlove: Boolean(source.goldenGlove ?? legacy.goldenGlove ?? legacy.cosmeticGloveEquipped ?? false),
  cosmetic3: Boolean(source.cosmetic3 ?? legacy.cosmetic3 ?? false),
  cosmetic4: Boolean(source.cosmetic4 ?? legacy.cosmetic4 ?? false),
});

const normaliseResultMap = (value, start, end) => ({
  ...createEmptyResultMap(start, end),
  ...(value && typeof value === "object" ? value : {}),
});

const normaliseCurrentCampaign = (campaign = {}, currentProgress = null) => {
  const defaults = createDefaultCurrentCampaign();
  const selectedTeam = campaign.selectedTeamName || campaign.team || campaign.selectedTeam || currentProgress?.team || null;
  const score = Number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints ?? currentProgress?.scoringState?.campaignPoints ?? 0);
  const phase = campaign.tournamentPhase || campaign.stage || campaign.roundLabel || currentProgress?.matchStage || "Not Started";
  const status = campaign.status || (campaign.active ? "active" : score > 0 || selectedTeam ? "active" : "not_started");

  return {
    ...defaults,
    ...campaign,
    exists: Boolean(campaign.exists ?? campaign.active ?? selectedTeam ?? score > 0),
    status,
    selectedTeamId: campaign.selectedTeamId || campaign.teamId || null,
    selectedTeamName: selectedTeam,
    tournamentPhase: phase,
    formGuide: normaliseFormGuide(campaign.formGuide || campaign.form || currentProgress?.userForm),
    gameScore: score,
    groupStageResults: normaliseResultMap(campaign.groupStageResults, GROUP_STAGE_MATCH_START, GROUP_STAGE_MATCH_END),
    knockoutResults: normaliseResultMap(campaign.knockoutResults, KNOCKOUT_MATCH_START, KNOCKOUT_MATCH_END),
    cosmeticsApplied: normaliseCosmeticsApplied(campaign.cosmeticsApplied, campaign),
    currentMatchState: {
      ...defaults.currentMatchState,
      ...(campaign.currentMatchState || {}),
      matchId: campaign.currentMatchState?.matchId ?? currentProgress?.currentMatchId ?? currentProgress?.matchResult?.matchNo ?? null,
      userScore: Number(campaign.currentMatchState?.userScore ?? currentProgress?.score?.[0] ?? campaign.score?.[0] ?? 0),
      opponentScore: Number(campaign.currentMatchState?.opponentScore ?? currentProgress?.score?.[1] ?? campaign.score?.[1] ?? 0),
      currentPenaltyNumber: Number(campaign.currentMatchState?.currentPenaltyNumber ?? 1),
      suddenDeath: Boolean(campaign.currentMatchState?.suddenDeath ?? false),
    },
    updatedAt: campaign.updatedAt || null,
  };
};

const normaliseBestCampaign = (campaign = {}) => {
  const defaults = createDefaultBestCampaign();
  const score = Number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints ?? 0);
  const teamName = campaign.teamName || campaign.team || null;

  return {
    ...defaults,
    ...campaign,
    exists: Boolean(campaign.exists ?? teamName ?? score > 0),
    teamId: campaign.teamId || null,
    teamName,
    tournamentPhase: campaign.tournamentPhase || campaign.roundLabel || campaign.stage || "Not Started",
    formGuide: normaliseFormGuide(campaign.formGuide || campaign.form || campaign.tournamentProgress),
    gameScore: score,
    cosmeticsApplied: normaliseCosmeticsApplied(campaign.cosmeticsApplied, campaign),
    completedAt: campaign.completedAt || null,
  };
};

const normaliseCareerStats = (stats = {}, legacy = {}) => {
  const totalShots = Number(stats.totalShots ?? stats.totalShotsTaken ?? legacy.totalShotsTaken ?? 0);
  const totalGoals = Number(stats.totalGoals ?? stats.totalGoalsScored ?? legacy.totalGoalsScored ?? 0);
  const goalConversionRate = Number(
    stats.goalConversionRate ?? stats.conversionPercentage ?? (totalShots > 0 ? Math.round((totalGoals / totalShots) * 100) : 0)
  );

  return {
    totalShots,
    totalGoals,
    goalConversionRate,
    mondayCupsWon: Number(stats.mondayCupsWon ?? legacy.mondayCupsWon ?? 0),
    tournamentsStarted: Number(stats.tournamentsStarted ?? legacy.tournamentsStarted ?? 0),
    totalMatchesCompleted: Number(stats.totalMatchesCompleted ?? legacy.totalMatchesCompleted ?? legacy.matchesCompleted ?? 0),
  };
};

const buildCompatibilityAliases = ({ currentCampaign, bestCampaign, careerStats, upgradesPurchased, cosmeticsEquipped }) => ({
  // Backwards compatibility for existing App.jsx/ProfileScreens.jsx readers during migration.
  currentProgress: null,
  currentCampaign: {
    ...currentCampaign,
    active: currentCampaign.status === "active",
    team: currentCampaign.selectedTeamName,
    stage: currentCampaign.tournamentPhase,
    points: currentCampaign.gameScore,
    form: currentCampaign.formGuide,
  },
  bestCampaign: {
    ...bestCampaign,
    team: bestCampaign.teamName,
    stage: bestCampaign.tournamentPhase,
    roundLabel: bestCampaign.tournamentPhase,
    points: bestCampaign.gameScore,
    campaignPoints: bestCampaign.gameScore,
    form: bestCampaign.formGuide,
    tournamentProgress: bestCampaign.formGuide,
    cosmeticBallEquipped: Boolean(bestCampaign.cosmeticsApplied.goldenBall),
    cosmeticGloveEquipped: Boolean(bestCampaign.cosmeticsApplied.goldenGlove),
  },
  stats: {
    mondayCupsWon: careerStats.mondayCupsWon,
    totalGoalsScored: careerStats.totalGoals,
    totalShotsTaken: careerStats.totalShots,
    conversionPercentage: careerStats.goalConversionRate,
    tournamentsStarted: careerStats.tournamentsStarted,
    totalMatchesCompleted: careerStats.totalMatchesCompleted,
  },
  unlocks: {
    allTeams: Boolean(upgradesPurchased.allTeams),
  },
  cosmetics: {
    ...cosmeticsEquipped,
  },
});

export const createDefaultUserProfile = (user, username = "Player", extra = {}) => {
  const clean = cleanUsername(username || user.displayName || user.email?.split("@")[0] || "Player");
  const upgradesPurchased = normaliseUpgradeMap(extra.upgradesPurchased, extra.cosmetics, extra.unlocks);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(extra.cosmeticsEquipped, extra.cosmetics);
  const currentCampaign = normaliseCurrentCampaign(extra.currentCampaign, extra.currentProgress);
  const bestCampaign = normaliseBestCampaign(extra.bestCampaign);
  const careerStats = normaliseCareerStats(extra.careerStats, extra.stats);

  return {
    uid: user.uid,
    email: user.email || "",
    username: clean,
    usernameLower: clean.toLowerCase(),
    nickname: clean,
    nicknameLower: clean.toLowerCase(),
    emailOptIn: Boolean(extra.emailOptIn ?? false),

    upgradesPurchased,
    cosmeticsEquipped,
    currentCampaign,
    currentProgress: extra.currentProgress || null,
    bestCampaign,
    careerStats,
    achievements: {
      ...createDefaultAchievements(),
      ...(extra.achievements || {}),
    },

    ...buildCompatibilityAliases({ currentCampaign, bestCampaign, careerStats, upgradesPurchased, cosmeticsEquipped }),

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

const normaliseProfileUpdate = (data = {}) => {
  const upgradesPurchased = normaliseUpgradeMap(data.upgradesPurchased, data.cosmetics, data.unlocks);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(data.cosmeticsEquipped, data.cosmetics);
  const currentCampaign = normaliseCurrentCampaign(data.currentCampaign, data.currentProgress);
  const bestCampaign = normaliseBestCampaign(data.bestCampaign);
  const careerStats = normaliseCareerStats(data.careerStats, data.stats);

  const update = {
    ...data,
    upgradesPurchased,
    cosmeticsEquipped,
    currentCampaign,
    currentProgress: data.currentProgress ?? data.currentCampaign?.currentProgress ?? null,
    bestCampaign,
    careerStats,
    achievements: data.achievements ? { ...createDefaultAchievements(), ...data.achievements } : undefined,
    ...buildCompatibilityAliases({ currentCampaign, bestCampaign, careerStats, upgradesPurchased, cosmeticsEquipped }),
    updatedAt: serverTimestamp(),
  };

  if (data.username || data.nickname) {
    const username = cleanUsername(data.username || data.nickname);
    update.username = username;
    update.usernameLower = username.toLowerCase();
    update.nickname = username;
    update.nicknameLower = username.toLowerCase();
  }

  if (data.emailOptIn !== undefined) {
    update.emailOptIn = Boolean(data.emailOptIn);
  }

  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
  return update;
};

export async function ensureUserDocument(user, username = "Player", extra = {}) {
  if (!user?.uid || !db) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const displayName = username || user.displayName || user.email?.split("@")[0] || "Player";

  if (!snap.exists()) {
    const profile = createDefaultUserProfile(user, displayName, extra);
    await setDoc(ref, profile);
    return profile;
  }

  const existing = snap.data() || {};
  const update = normaliseProfileUpdate({
    ...existing,
    ...extra,
    uid: user.uid,
    email: user.email || existing.email || "",
    username: displayName,
  });

  await setDoc(ref, update, { merge: true });
  return { id: snap.id, ...existing, ...update };
}

export async function loadUserProfile(uid) {
  if (!uid || !db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  // Normalise old documents in memory so the UI can safely read the new schema immediately.
  const currentCampaign = normaliseCurrentCampaign(data.currentCampaign, data.currentProgress);
  const bestCampaign = normaliseBestCampaign(data.bestCampaign);
  const upgradesPurchased = normaliseUpgradeMap(data.upgradesPurchased, data.cosmetics, data.unlocks);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(data.cosmeticsEquipped, data.cosmetics);
  const careerStats = normaliseCareerStats(data.careerStats, data.stats);

  return {
    ...data,
    upgradesPurchased,
    cosmeticsEquipped,
    currentCampaign,
    bestCampaign,
    careerStats,
    achievements: { ...createDefaultAchievements(), ...(data.achievements || data.trophies || {}) },
    ...buildCompatibilityAliases({ currentCampaign, bestCampaign, careerStats, upgradesPurchased, cosmeticsEquipped }),
    currentProgress: data.currentProgress || null,
  };
}

export async function saveUserProfile(uid, data = {}) {
  if (!uid || !db) return;
  await setDoc(doc(db, "users", uid), normaliseProfileUpdate(data), { merge: true });
}

export async function unlockTrophy(uid, trophyKey) {
  if (!uid || !trophyKey || !db) return;
  await updateDoc(doc(db, "users", uid), {
    [`achievements.${trophyKey}`]: true,
    // Backwards compatible trophy flags while the trophy cabinet is migrated.
    [`trophies.${trophyKey}`]: true,
    updatedAt: serverTimestamp(),
  });
}

export async function unlockCosmetic(uid, cosmeticKey, equipped = true) {
  if (!uid || !cosmeticKey || !db) return;
  const isKnownCosmetic = COSMETIC_KEYS.includes(cosmeticKey);
  if (!isKnownCosmetic) return;

  await setDoc(doc(db, "users", uid), {
    [`upgradesPurchased.${cosmeticKey}`]: true,
    [`cosmeticsEquipped.${cosmeticKey}`]: Boolean(equipped),
    // Compatibility alias until all pages read cosmeticsEquipped.
    [`cosmetics.${cosmeticKey}`]: Boolean(equipped),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveAllTeamsUnlocked(uid, purchased = true, equipped = true) {
  if (!uid || !db) return;
  await setDoc(doc(db, "users", uid), {
    "upgradesPurchased.allTeams": Boolean(purchased),
    "unlocks.allTeams": Boolean(purchased),
    "allTeamsEquipped": Boolean(equipped),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveCurrentProgress(uid, snapshot = null) {
  if (!uid || !db) return;
  const currentCampaign = normaliseCurrentCampaign(snapshot?.currentCampaign || {}, snapshot);

  await setDoc(doc(db, "users", uid), {
    currentProgress: snapshot,
    currentCampaign,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadCurrentProgress(uid) {
  const profile = await loadUserProfile(uid);
  // The runtime snapshot remains the source for exact resume while the structured schema stores display/query fields.
  return profile?.currentProgress || profile?.savedGames?.current || null;
}

export async function saveLeaderboardHighScore(uid, entry = {}) {
  if (!uid || !db) return;

  const cosmeticsApplied = normaliseCosmeticsApplied(entry.cosmeticsApplied, entry.bestCampaign || entry);
  const username = cleanUsername(entry.username || entry.nickname || "PLAYER").toUpperCase();

  await setDoc(doc(db, "leaderboard", uid), {
    uid,
    userId: uid,
    username,
    teamFlag: entry.teamFlag || entry.flag || entry.team?.flag || entry.team || "",
    gameScore: Number(entry.gameScore ?? entry.campaignPoints ?? entry.points ?? 0),
    cosmeticsApplied,
    updatedAt: serverTimestamp(),

    // Temporary aliases so existing leaderboard UI keeps working while migrated.
    team: entry.team || entry.teamName || entry.teamFlag || "",
    campaignPoints: Number(entry.gameScore ?? entry.campaignPoints ?? entry.points ?? 0),
  }, { merge: true });
}

export async function loadLeaderboardRows(limitCount = 50) {
  if (!db) return [];

  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy("gameScore", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(leaderboardQuery);
  const bestByUser = new Map();

  snap.docs.forEach((item) => {
    const data = item.data() || {};
    const userId = data.uid || data.userId || item.id;
    if (!userId || userId === "guest-preview" || data.localOnly) return;

    const gameScore = Number(data.gameScore ?? data.campaignPoints ?? data.points ?? 0);
    const row = {
      id: item.id,
      uid: userId,
      userId,
      username: data.username || data.nickname || "PLAYER",
      teamFlag: data.teamFlag || data.flag || data.team || "",
      team: data.teamFlag || data.flag || data.team || "",
      gameScore,
      campaignPoints: gameScore,
      cosmeticsApplied: normaliseCosmeticsApplied(data.cosmeticsApplied, data.bestCampaign || data),
      updatedAt: data.updatedAt || null,
    };

    const existing = bestByUser.get(userId);
    if (!existing || gameScore > Number(existing.gameScore || 0)) {
      bestByUser.set(userId, row);
    }
  });

  return Array.from(bestByUser.values())
    .sort((a, b) => Number(b.gameScore || 0) - Number(a.gameScore || 0))
    .slice(0, limitCount);
}

export async function isNicknameTaken(nickname, uidToIgnore = null) {
  const clean = String(nickname || "").trim().toLowerCase();
  if (!clean || !db) return false;
  const usernameQuery = query(collection(db, "users"), where("usernameLower", "==", clean), limit(3));
  const snap = await getDocs(usernameQuery);
  return snap.docs.some((item) => item.id !== uidToIgnore);
}

export async function saveUserNickname(uid, username) {
  const clean = cleanUsername(username).toUpperCase();
  if (!uid || !clean || !db) return;

  await setDoc(doc(db, "users", uid), {
    username: clean,
    usernameLower: clean.toLowerCase(),
    nickname: clean,
    nicknameLower: clean.toLowerCase(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "leaderboard", uid), {
    username: clean,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function reserveUsername(uid, username) {
  const clean = cleanUsername(username).toLowerCase();
  if (!uid || !clean || !db) return;
  await setDoc(doc(db, "usernames", clean), {
    uid,
    username: clean.toUpperCase(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function incrementTournamentsStarted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = Number(profile?.careerStats?.tournamentsStarted ?? profile?.stats?.tournamentsStarted ?? 0);
  await setDoc(doc(db, "users", uid), {
    "careerStats.tournamentsStarted": current + Number(amount || 1),
    "stats.tournamentsStarted": current + Number(amount || 1),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function incrementTotalMatchesCompleted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = Number(profile?.careerStats?.totalMatchesCompleted ?? profile?.stats?.totalMatchesCompleted ?? 0);
  await setDoc(doc(db, "users", uid), {
    "careerStats.totalMatchesCompleted": current + Number(amount || 1),
    "stats.totalMatchesCompleted": current + Number(amount || 1),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
