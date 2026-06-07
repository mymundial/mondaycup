import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  MAX_GOLDEN_TICKETS,
  normaliseTicketQuantity,
} from "../data/storeItems.js";
import { db } from "../firebase.js";
import { isTerminalResultStatus, normalizeResultStatus } from "../logic/resultStatus.js";

export const FORM_GUIDE_LENGTH = 8;
export const GROUP_STAGE_MATCH_START = 1;
export const GROUP_STAGE_MATCH_END = 72;
export const KNOCKOUT_MATCH_START = 73;
export const KNOCKOUT_MATCH_END = 104;

const COSMETIC_KEYS = [
  "goldenBoot",
  "goldenBall",
  "goldenGlove",
  "goldenTicket",
];
const UPGRADE_KEYS = ["allTeams", "goldenBoot", "goldenBall", "goldenGlove"];

const emptyBooleanMap = (keys) =>
  Object.fromEntries(keys.map((key) => [key, false]));

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);


export const normaliseFormGuide = (formGuide = []) => {
  const source = Array.isArray(formGuide) ? formGuide : [];
  return Array.from(
    { length: FORM_GUIDE_LENGTH },
    (_, index) => source[index] ?? null,
  );
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
  groupStageResults: createEmptyResultMap(
    GROUP_STAGE_MATCH_START,
    GROUP_STAGE_MATCH_END,
  ),
  knockoutResults: createEmptyResultMap(
    KNOCKOUT_MATCH_START,
    KNOCKOUT_MATCH_END,
  ),
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

export const ACHIEVEMENT_KEYS = [
  "ourTime",
  "kickOff",
  "woodwork",
  "targetMan",
  "ptsOnTheBoard",
  "victory",
  "cleanSweep",
  "qualified",
  "tko",
  "quarterFinalist",
  "semiFinalist",
  "finalist",
  "cleanSheet",
  "perfect",
  "comebackKing",
  "iceCold",
  "goldenTouch",
  "corruptionScandal",
  "mondayLegend",
  "invincible",
  "nationalTreasure",
  "globalIcon",
  "siuuu",
  "goat",
  "championFinish",
  "runnerUpFinish",
  "thirdPlaceFinish",
];

const LEGACY_ACHIEVEMENT_ALIAS_KEYS = [
  "hostHero",
  "firstMatch",
  "rememberTheName",
  "pointsOnTheBoard",
  "firstWin",
  "knockoutQualified",
  "round32Win",
  "reachQF",
  "reachSF",
  "reachFinal",
  "nationalPride",
  "champions",
  "champion",
  "trophy5",
  "runnerUp",
  "thirdPlace",
].filter((key) => !ACHIEVEMENT_KEYS.includes(key));

const buildLegacyAchievementDeleteUpdate = () => {
  const update = {};
  LEGACY_ACHIEVEMENT_ALIAS_KEYS.forEach((key) => {
    update[`achievements.${key}`] = deleteField();
    update[`trophies.${key}`] = deleteField();
  });
  return update;
};


const truthy = (...values) => values.some((value) => value === true || value === 1 || value === "true");

const normaliseAchievements = (source = {}, legacy = {}) => {
  const src = source && typeof source === "object" ? source : {};
  const old = legacy && typeof legacy === "object" ? legacy : {};

  return {
    ...emptyBooleanMap(ACHIEVEMENT_KEYS),
    ourTime: truthy(src.ourTime, old.ourTime, src.hostHero, old.hostHero),
    kickOff: truthy(src.kickOff, old.kickOff, src.firstMatch, old.firstMatch),
    woodwork: truthy(src.woodwork, old.woodwork),
    targetMan: truthy(src.targetMan, old.targetMan, src.rememberTheName, old.rememberTheName),
    ptsOnTheBoard: truthy(src.ptsOnTheBoard, old.ptsOnTheBoard, src.pointsOnTheBoard, old.pointsOnTheBoard),
    victory: truthy(src.victory, old.victory, src.firstWin, old.firstWin),
    cleanSweep: truthy(src.cleanSweep, old.cleanSweep),
    qualified: truthy(src.qualified, old.qualified, src.knockoutQualified, old.knockoutQualified),
    tko: truthy(src.tko, old.tko, src.round32Win, old.round32Win),
    quarterFinalist: truthy(src.quarterFinalist, old.quarterFinalist, src.reachQF, old.reachQF),
    semiFinalist: truthy(src.semiFinalist, old.semiFinalist, src.reachSF, old.reachSF),
    finalist: truthy(src.finalist, old.finalist, src.reachFinal, old.reachFinal),
    cleanSheet: truthy(src.cleanSheet, old.cleanSheet),
    perfect: truthy(src.perfect, old.perfect),
    comebackKing: truthy(src.comebackKing, old.comebackKing),
    iceCold: truthy(src.iceCold, old.iceCold),
    goldenTouch: truthy(src.goldenTouch, old.goldenTouch),
    corruptionScandal: truthy(src.corruptionScandal, old.corruptionScandal),
    mondayLegend: truthy(src.mondayLegend, old.mondayLegend),
    invincible: truthy(src.invincible, old.invincible),
    nationalTreasure: truthy(src.nationalTreasure, old.nationalTreasure),
    globalIcon: truthy(src.globalIcon, old.globalIcon),
    siuuu: truthy(src.siuuu, old.siuuu),
    goat: truthy(src.goat, old.goat),
    championFinish: truthy(src.championFinish, old.championFinish, src.nationalPride, old.nationalPride, src.champions, old.champions, src.champion, old.champion, src.trophy5, old.trophy5),
    runnerUpFinish: truthy(src.runnerUpFinish, old.runnerUpFinish, src.runnerUp, old.runnerUp),
    thirdPlaceFinish: truthy(src.thirdPlaceFinish, old.thirdPlaceFinish, src.thirdPlace, old.thirdPlace),
  };
};

const normaliseNationCupWins = (source = {}) =>
  source && typeof source === "object" ? { ...source } : {};

const DEFAULT_USER_SHIRT = {
  team: "",
  name: "",
  number: "11",
  bg: "#073B26",
  patternMode: "plain",
  patternColour: "#FFFFFF",
  textColour: "#F5F1E8",
  numberColour: "#F5F1E8",
  outlineColour: "#F5F1E8",
  nameOutlineWidth: 0,
  numberOutlineWidth: 0,
  composition: {
    mondayScale: 1.18,
    mondayX: 0,
    mondayY: -3,
    nameScale: 1.08,
    nameX: 0,
    nameY: -2,
    numberScale: 1.18,
    numberX: 0,
    numberY: 0,
    brothersScale: 1,
    brothersX: 0,
    brothersY: 0,
  },
};

const cleanShirtName = (value, fallback = "") =>
  String(value || fallback)
    .replace(/[^a-z0-9 ]/gi, "")
    .trim()
    .toUpperCase()
    .slice(0, 14);
const cleanShirtNumber = (value, fallback = "11") =>
  String(value ?? fallback)
    .replace(/[^0-9]/g, "")
    .slice(0, 2) || fallback;

const normaliseUserShirt = (source = {}, username = "") => {
  const shirt = source && typeof source === "object" ? source : {};
  const name = cleanShirtName(shirt.name, username || "GUEST");
  return {
    ...DEFAULT_USER_SHIRT,
    ...shirt,
    team: String(shirt.team || ""),
    name,
    number: cleanShirtNumber(shirt.number, "11"),
    bg: shirt.bg || DEFAULT_USER_SHIRT.bg,
    patternMode: shirt.patternMode || DEFAULT_USER_SHIRT.patternMode,
    patternColour: shirt.patternColour || DEFAULT_USER_SHIRT.patternColour,
    textColour: shirt.textColour || DEFAULT_USER_SHIRT.textColour,
    numberColour:
      shirt.numberColour || shirt.textColour || DEFAULT_USER_SHIRT.numberColour,
    outlineColour: shirt.outlineColour || DEFAULT_USER_SHIRT.outlineColour,
    nameOutlineWidth: Math.max(0, Number(shirt.nameOutlineWidth ?? shirt.outlineWeight ?? DEFAULT_USER_SHIRT.nameOutlineWidth) || 0),
    numberOutlineWidth: Math.max(0, Number(shirt.numberOutlineWidth ?? shirt.outlineWeight ?? DEFAULT_USER_SHIRT.numberOutlineWidth) || 0),
    composition: {
      ...DEFAULT_USER_SHIRT.composition,
      ...(shirt.composition || {}),
    },
  };
};

export const createDefaultAchievements = () => normaliseAchievements();

const cleanUsername = (value, fallback = "Player") =>
  String(value || fallback)
    .trim()
    .slice(0, 10) || fallback;

const normaliseGoldenTicket = (source = {}, legacyCosmetics = {}) => {
  const quantity = normaliseTicketQuantity(
    source.quantity ??
      source.count ??
      source.qty ??
      (legacyCosmetics.goldenTicket ? 1 : 0) ??
      0,
  );
  return {
    quantity,
    equipped: quantity > 0,
    totalPurchased: Number(source.totalPurchased ?? 0),
    totalUsed: Number(source.totalUsed ?? 0),
    lastPurchasedAt: source.lastPurchasedAt ?? null,
    lastUsedAt: source.lastUsedAt ?? null,
  };
};

const normaliseConsumables = (source = {}, legacyCosmetics = {}) => ({
  goldenTicket: normaliseGoldenTicket(source.goldenTicket, legacyCosmetics),
});

const normaliseUpgradeMap = (
  source = {},
  legacyCosmetics = {},
  legacyUnlocks = {},
) => ({
  allTeams: Boolean(source.allTeams ?? legacyUnlocks.allTeams ?? false),
  // Ownership must come from purchase entitlements only.
  // Legacy/applied cosmetics are display/equip state, not proof of purchase.
  goldenBoot: Boolean(source.goldenBoot ?? false),
  goldenBall: Boolean(source.goldenBall ?? false),
  goldenGlove: Boolean(source.goldenGlove ?? false),
});

const normaliseCosmeticsActive = (
  source = {},
  legacyEquipped = {},
  consumables = {},
  upgradesPurchased = {},
) => {
  const activeSource = source && typeof source === "object" ? source : {};
  const legacyActive =
    legacyEquipped && typeof legacyEquipped === "object" ? legacyEquipped : {};

  return {
    // Active state never proves ownership. These can only be active when the owned entitlement exists.
    goldenBoot: Boolean(
      upgradesPurchased.goldenBoot &&
      (activeSource.goldenBoot ?? legacyActive.goldenBoot ?? false),
    ),
    goldenBall: Boolean(
      upgradesPurchased.goldenBall &&
      (activeSource.goldenBall ?? legacyActive.goldenBall ?? false),
    ),
    goldenGlove: Boolean(
      upgradesPurchased.goldenGlove &&
      (activeSource.goldenGlove ?? legacyActive.goldenGlove ?? false),
    ),
    // Golden Ticket is consumable. Availability comes from quantity, not an equip toggle.
    goldenTicket:
      normaliseTicketQuantity(consumables.goldenTicket?.quantity) > 0,
  };
};

// Backwards-compatible name while older imports/readers are removed.
const normaliseCosmeticsEquipped = normaliseCosmeticsActive;

const normaliseCosmeticsApplied = (source = {}, legacy = {}) => ({
  goldenBoot: Boolean(
    source.goldenBoot ?? legacy.goldenBoot ?? legacy.cosmetic3 ?? false,
  ),
  goldenBall: Boolean(
    source.goldenBall ??
    legacy.goldenBall ??
    legacy.cosmeticBallEquipped ??
    false,
  ),
  goldenGlove: Boolean(
    source.goldenGlove ??
    legacy.goldenGlove ??
    legacy.cosmeticGloveEquipped ??
    false,
  ),
  goldenTicket: Boolean(
    source.goldenTicket ?? legacy.goldenTicket ?? legacy.cosmetic4 ?? false,
  ),
});

const normaliseResultMap = (value, start, end) => ({
  ...createEmptyResultMap(start, end),
  ...(value && typeof value === "object" ? value : {}),
});

const normaliseCurrentCampaign = (campaign = {}, currentProgress = null) => {
  const defaults = createDefaultCurrentCampaign();
  const selectedTeam =
    campaign.selectedTeamName ||
    campaign.team ||
    campaign.selectedTeam ||
    currentProgress?.team ||
    null;
  const score = Number(
    campaign.gameScore ??
      campaign.points ??
      campaign.campaignPoints ??
      currentProgress?.scoringState?.campaignPoints ??
      0,
  );
  const phase =
    campaign.tournamentPhase ||
    campaign.stage ||
    campaign.roundLabel ||
    currentProgress?.matchStage ||
    "Not Started";
  const status =
    campaign.status ||
    (campaign.active
      ? "active"
      : score > 0 || selectedTeam
        ? "active"
        : "not_started");

  return {
    ...defaults,
    ...campaign,
    exists: Boolean(
      campaign.exists ?? campaign.active ?? selectedTeam ?? score > 0,
    ),
    status,
    selectedTeamId: campaign.selectedTeamId || campaign.teamId || null,
    selectedTeamName: selectedTeam,
    tournamentPhase: phase,
    formGuide: normaliseFormGuide(
      campaign.formGuide || campaign.form || currentProgress?.userForm,
    ),
    gameScore: score,
    groupStageResults: normaliseResultMap(
      campaign.groupStageResults,
      GROUP_STAGE_MATCH_START,
      GROUP_STAGE_MATCH_END,
    ),
    knockoutResults: normaliseResultMap(
      campaign.knockoutResults,
      KNOCKOUT_MATCH_START,
      KNOCKOUT_MATCH_END,
    ),
    cosmeticsApplied: normaliseCosmeticsApplied(
      campaign.cosmeticsApplied,
      campaign,
    ),
    currentMatchState: {
      ...defaults.currentMatchState,
      ...(campaign.currentMatchState || {}),
      matchId:
        campaign.currentMatchState?.matchId ??
        currentProgress?.currentMatchId ??
        currentProgress?.matchResult?.matchNo ??
        null,
      userScore: Number(
        campaign.currentMatchState?.userScore ??
          currentProgress?.score?.[0] ??
          campaign.score?.[0] ??
          0,
      ),
      opponentScore: Number(
        campaign.currentMatchState?.opponentScore ??
          currentProgress?.score?.[1] ??
          campaign.score?.[1] ??
          0,
      ),
      currentPenaltyNumber: Number(
        campaign.currentMatchState?.currentPenaltyNumber ?? 1,
      ),
      suddenDeath: Boolean(campaign.currentMatchState?.suddenDeath ?? false),
    },
    updatedAt: campaign.updatedAt || null,
  };
};

const normaliseBestCampaign = (campaign = {}) => {
  const defaults = createDefaultBestCampaign();
  const score = Number(
    campaign.gameScore ?? campaign.points ?? campaign.campaignPoints ?? 0,
  );
  const teamName = campaign.teamName || campaign.team || null;

  return {
    ...defaults,
    ...campaign,
    exists: Boolean(campaign.exists ?? teamName ?? score > 0),
    teamId: campaign.teamId || null,
    teamName,
    tournamentPhase:
      campaign.tournamentPhase ||
      campaign.roundLabel ||
      campaign.stage ||
      "Not Started",
    formGuide: normaliseFormGuide(
      campaign.formGuide || campaign.form || campaign.tournamentProgress,
    ),
    gameScore: score,
    cosmeticsApplied: normaliseCosmeticsApplied(
      campaign.cosmeticsApplied,
      campaign,
    ),
    completedAt: campaign.completedAt || null,
  };
};

const normaliseCareerStats = (stats = {}, legacy = {}) => {
  const totalShots = Number(
    stats.totalShots ?? stats.totalShotsTaken ?? legacy.totalShotsTaken ?? 0,
  );
  const totalGoals = Number(
    stats.totalGoals ?? stats.totalGoalsScored ?? legacy.totalGoalsScored ?? 0,
  );
  const matchesPlayed = Number(
    stats.matchesPlayed ??
      stats.totalMatchesPlayed ??
      stats.totalMatchesCompleted ??
      legacy.matchesPlayed ??
      legacy.totalMatchesPlayed ??
      legacy.totalMatchesCompleted ??
      legacy.matchesCompleted ??
      0,
  );
  const matchesWon = Number(
    stats.matchesWon ??
      stats.totalMatchesWon ??
      legacy.matchesWon ??
      legacy.totalMatchesWon ??
      0,
  );
  const matchesDrawn = Number(
    stats.matchesDrawn ??
      stats.totalMatchesDrawn ??
      legacy.matchesDrawn ??
      legacy.totalMatchesDrawn ??
      0,
  );
  const matchesLost = Number(
    stats.matchesLost ??
      stats.totalMatchesLost ??
      legacy.matchesLost ??
      legacy.totalMatchesLost ??
      0,
  );
  const highScore = Number(
    stats.highScore ??
      stats.gameScore ??
      legacy.highScore ??
      legacy.gameScore ??
      0,
  );
  const goalConversionRate = Number(
    stats.goalConversionRate ??
      stats.conversionPercentage ??
      (totalShots > 0 ? Math.round((totalGoals / totalShots) * 100) : 0),
  );

  const mondayCupsWon = Number(
    stats.mondayCupsWon ??
      stats.mondayCupWins ??
      stats.cupWins ??
      stats.cupsWon ??
      legacy.mondayCupsWon ??
      legacy.mondayCupWins ??
      legacy.cupWins ??
      legacy.cupsWon ??
      0,
  );

  return {
    totalShots,
    totalShotsTaken: totalShots,
    allTimeShots: totalShots,
    totalGoals,
    totalGoalsScored: totalGoals,
    goalsScored: totalGoals,
    allTimeGoals: totalGoals,
    goalConversionRate,
    conversionPercentage: goalConversionRate,
    mondayCupsWon,
    mondayCupWins: mondayCupsWon,
    cupWins: mondayCupsWon,
    cupsWon: mondayCupsWon,
    tournamentsStarted: Number(
      stats.tournamentsStarted ?? legacy.tournamentsStarted ?? 0,
    ),
    totalMatchesCompleted: matchesPlayed,
    matchesCompleted: matchesPlayed,
    matchesPlayed,
    totalMatchesPlayed: matchesPlayed,
    allTimeMatchesPlayed: matchesPlayed,
    matchesWon,
    totalMatchesWon: matchesWon,
    allTimeMatchesWon: matchesWon,
    matchesDrawn,
    totalMatchesDrawn: matchesDrawn,
    allTimeMatchesDrawn: matchesDrawn,
    matchesLost,
    totalMatchesLost: matchesLost,
    allTimeMatchesLost: matchesLost,
    highScore,
    gameScore: highScore,
  };
};

const buildCompatibilityAliases = ({
  currentCampaign,
  bestCampaign,
  careerStats,
  upgradesPurchased,
  cosmeticsEquipped,
  consumables,
  userShirt,
}) => ({
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
    mondayCupWins: careerStats.mondayCupsWon,
    cupWins: careerStats.mondayCupsWon,
    cupsWon: careerStats.mondayCupsWon,
    matchesPlayed: careerStats.matchesPlayed,
    totalMatchesPlayed: careerStats.totalMatchesPlayed,
    allTimeMatchesPlayed: careerStats.matchesPlayed,
    totalMatchesCompleted: careerStats.totalMatchesCompleted,
    matchesCompleted: careerStats.totalMatchesCompleted,
    matchesWon: careerStats.matchesWon,
    totalMatchesWon: careerStats.totalMatchesWon,
    allTimeMatchesWon: careerStats.matchesWon,
    matchesDrawn: careerStats.matchesDrawn,
    totalMatchesDrawn: careerStats.totalMatchesDrawn,
    allTimeMatchesDrawn: careerStats.matchesDrawn,
    matchesLost: careerStats.matchesLost,
    totalMatchesLost: careerStats.totalMatchesLost,
    allTimeMatchesLost: careerStats.matchesLost,
    totalGoals: careerStats.totalGoals,
    totalGoalsScored: careerStats.totalGoals,
    goalsScored: careerStats.totalGoals,
    allTimeGoals: careerStats.totalGoals,
    totalShots: careerStats.totalShots,
    totalShotsTaken: careerStats.totalShots,
    allTimeShots: careerStats.totalShots,
    goalConversionRate: careerStats.goalConversionRate,
    conversionPercentage: careerStats.goalConversionRate,
    tournamentsStarted: careerStats.tournamentsStarted,
    highScore: careerStats.highScore,
    gameScore: careerStats.gameScore,
  },
  unlocks: {
    allTeams: Boolean(upgradesPurchased.allTeams),
  },
  allTeamsEquipped: Boolean(upgradesPurchased.allTeams),
  allTeamsUnlocked: Boolean(upgradesPurchased.allTeams),
  userShirt,
  shirt: userShirt,
  shareShirt: userShirt,
  cosmeticsActive: {
    ...cosmeticsEquipped,
    goldenTicketQuantity: Number(consumables?.goldenTicket?.quantity || 0),
  },
  cosmeticsEquipped: {
    ...cosmeticsEquipped,
    goldenTicketQuantity: Number(consumables?.goldenTicket?.quantity || 0),
  },
  cosmetics: {
    ...cosmeticsEquipped,
    goldenTicketQuantity: Number(consumables?.goldenTicket?.quantity || 0),
  },
});

export const createDefaultUserProfile = (
  user,
  username = "Player",
  extra = {},
) => {
  const clean = cleanUsername(
    username || user.displayName || user.email?.split("@")[0] || "Player",
  );
  const consumables = normaliseConsumables(extra.consumables, {});
  const upgradesPurchased = normaliseUpgradeMap(
    extra.upgradesPurchased,
    {},
    extra.unlocks,
  );
  const cosmeticsEquipped = normaliseCosmeticsActive(
    extra.cosmeticsActive || extra.cosmeticsEquipped,
    {},
    consumables,
    upgradesPurchased,
  );
  const currentCampaign = normaliseCurrentCampaign(
    extra.currentCampaign,
    extra.currentProgress,
  );
  const bestCampaign = normaliseBestCampaign(extra.bestCampaign);
  const careerStats = normaliseCareerStats(extra.careerStats, extra.stats);
  const userShirt = normaliseUserShirt(
    extra.userShirt || extra.shirt || extra.shareShirt,
    clean,
  );

  return {
    uid: user.uid,
    email: user.email || "",
    username: clean,
    usernameLower: clean.toLowerCase(),
    nickname: clean,
    nicknameLower: clean.toLowerCase(),
    emailOptIn: Boolean(extra.emailOptIn ?? false),
    accountStatus: {
      emailVerified: Boolean(
        extra.accountStatus?.emailVerified ?? user.emailVerified ?? false,
      ),
      verificationRequired: Boolean(
        extra.accountStatus?.verificationRequired ??
        !(extra.accountStatus?.emailVerified ?? user.emailVerified ?? false),
      ),
      verifiedAt: extra.accountStatus?.emailVerified ? serverTimestamp() : null,
    },

    upgradesPurchased,
    allTeamsEquipped: Boolean(upgradesPurchased.allTeams),
    allTeamsUnlocked: Boolean(upgradesPurchased.allTeams),
    cosmeticsEquipped,
    consumables,
    currentCampaign,
    currentProgress: extra.currentProgress || null,
    bestCampaign,
    careerStats,
    achievements: normaliseAchievements(extra.achievements, extra.trophies),
    trophies: normaliseAchievements(extra.achievements, extra.trophies),
    nationCupWins: normaliseNationCupWins(extra.nationCupWins),
    nationStickerProgress: extra.nationStickerProgress || {},
    userShirt,

    ...buildCompatibilityAliases({
      currentCampaign,
      bestCampaign,
      careerStats,
      upgradesPurchased,
      cosmeticsEquipped,
      consumables,
      userShirt,
    }),

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

const normaliseProfileUpdate = (data = {}) => {
  const update = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  const hasUpgradeInput =
    hasOwn(data, "upgradesPurchased") ||
    data.unlocks?.allTeams === true ||
    data.allTeamsEquipped === true ||
    data.allTeamsUnlocked === true;
  const hasConsumableInput = hasOwn(data, "consumables");
  const hasCosmeticStateInput =
    hasOwn(data, "cosmeticsActive") ||
    hasOwn(data, "cosmeticsEquipped") ||
    hasOwn(data, "cosmetics");
  const hasCurrentCampaignInput =
    hasOwn(data, "currentCampaign") || hasOwn(data, "currentProgress");
  const hasBestCampaignInput = hasOwn(data, "bestCampaign");
  const hasCareerStatsInput = hasOwn(data, "careerStats") || hasOwn(data, "stats");
  const hasAchievementInput = hasOwn(data, "achievements") || hasOwn(data, "trophies");
  const hasNationCupWinsInput = hasOwn(data, "nationCupWins");
  const hasNationStickerProgressInput = hasOwn(data, "nationStickerProgress");
  const hasShirtInput =
    hasOwn(data, "userShirt") || hasOwn(data, "shirt") || hasOwn(data, "shareShirt");

  // Profile saves are partial writes. Only normalise and write a category when
  // the caller actually supplied that category; otherwise an unrelated autosave
  // or narrow profile update can reset purchases, stats, campaigns, or trophies.
  if (hasUpgradeInput) {
    const normalisedUpgrades = {
      ...normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks),
      allTeams: Boolean(
        data.upgradesPurchased?.allTeams ||
          data.unlocks?.allTeams ||
          data.allTeamsEquipped ||
          data.allTeamsUnlocked ||
          false,
      ),
    };
    const upgradesPurchased = Object.fromEntries(
      UPGRADE_KEYS.filter((key) => normalisedUpgrades[key]).map((key) => [key, true]),
    );
    if (Object.keys(upgradesPurchased).length) update.upgradesPurchased = upgradesPurchased;
    else delete update.upgradesPurchased;
    if (upgradesPurchased.allTeams) {
      update.unlocks = { ...(data.unlocks || {}), allTeams: true };
      update.allTeamsEquipped = true;
      update.allTeamsUnlocked = true;
    } else {
      delete update.unlocks;
      delete update.allTeamsEquipped;
      delete update.allTeamsUnlocked;
    }
  } else {
    delete update.upgradesPurchased;
    delete update.unlocks;
    delete update.allTeamsEquipped;
    delete update.allTeamsUnlocked;
  }

  if (hasConsumableInput) {
    update.consumables = normaliseConsumables(data.consumables, data.cosmetics || {});
  } else {
    delete update.consumables;
  }

  if (hasCosmeticStateInput) {
    const cosmeticSource = data.cosmeticsActive || data.cosmeticsEquipped || data.cosmetics || {};
    const consumables = hasConsumableInput
      ? normaliseConsumables(data.consumables, cosmeticSource)
      : normaliseConsumables(
          { goldenTicket: { quantity: cosmeticSource.goldenTicketQuantity ?? (cosmeticSource.goldenTicket ? 1 : 0) } },
          cosmeticSource,
        );
    const upgradesPurchased = hasUpgradeInput
      ? update.upgradesPurchased
      : normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks);
    const cosmeticsActive = hasUpgradeInput || hasConsumableInput
      ? normaliseCosmeticsActive(cosmeticSource, {}, consumables, upgradesPurchased)
      : {
          goldenBoot: Boolean(cosmeticSource.goldenBoot),
          goldenBall: Boolean(cosmeticSource.goldenBall),
          goldenGlove: Boolean(cosmeticSource.goldenGlove),
          goldenTicket: normaliseTicketQuantity(
            cosmeticSource.goldenTicketQuantity ?? (cosmeticSource.goldenTicket ? 1 : 0),
          ) > 0,
        };
    const ticketQuantity = normaliseTicketQuantity(
      update.consumables?.goldenTicket?.quantity ??
        cosmeticSource.goldenTicketQuantity ??
        (cosmeticSource.goldenTicket ? 1 : 0),
    );
    update.cosmeticsActive = {
      ...cosmeticsActive,
      goldenTicketQuantity: ticketQuantity,
    };
    update.cosmeticsEquipped = {
      ...cosmeticsActive,
      goldenTicketQuantity: ticketQuantity,
    };
    update.cosmetics = {
      ...cosmeticsActive,
      goldenTicketQuantity: ticketQuantity,
    };
  } else {
    delete update.cosmeticsActive;
    delete update.cosmeticsEquipped;
    delete update.cosmetics;
  }

  if (hasCurrentCampaignInput) {
    const currentCampaign = normaliseCurrentCampaign(
      data.currentCampaign,
      data.currentProgress,
    );
    update.currentCampaign = {
      ...currentCampaign,
      active: currentCampaign.status === "active",
      team: currentCampaign.selectedTeamName,
      stage: currentCampaign.tournamentPhase,
      points: currentCampaign.gameScore,
      form: currentCampaign.formGuide,
    };
    if (hasOwn(data, "currentProgress")) {
      update.currentProgress = data.currentProgress ?? null;
    } else {
      delete update.currentProgress;
    }
  } else {
    delete update.currentCampaign;
    delete update.currentProgress;
  }

  if (hasBestCampaignInput) {
    const bestCampaign = normaliseBestCampaign(data.bestCampaign);
    update.bestCampaign = {
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
    };
  } else {
    delete update.bestCampaign;
  }

  if (hasCareerStatsInput) {
    const careerStats = normaliseCareerStats(data.careerStats, data.stats);
    update.careerStats = careerStats;
    update.stats = buildCompatibilityAliases({
      currentCampaign: createDefaultCurrentCampaign(),
      bestCampaign: createDefaultBestCampaign(),
      careerStats,
      upgradesPurchased: emptyBooleanMap(UPGRADE_KEYS),
      cosmeticsEquipped: emptyBooleanMap(COSMETIC_KEYS),
      consumables: normaliseConsumables({}, {}),
      userShirt: undefined,
    }).stats;
  } else {
    delete update.careerStats;
    delete update.stats;
  }

  if (hasAchievementInput) {
    const normalisedAchievements = normaliseAchievements(data.achievements, data.trophies);
    update.achievements = normalisedAchievements;
    update.trophies = normalisedAchievements;
  } else {
    delete update.achievements;
    delete update.trophies;
  }

  if (hasNationCupWinsInput) {
    update.nationCupWins = normaliseNationCupWins(data.nationCupWins);
  } else {
    delete update.nationCupWins;
  }

  if (!hasNationStickerProgressInput) {
    delete update.nationStickerProgress;
  }

  if (hasShirtInput) {
    const shirtUsername = cleanUsername(
      data.username ||
        data.nickname ||
        data.userShirt?.name ||
        data.shirt?.name ||
        "Player",
    );
    const userShirt = normaliseUserShirt(
      data.userShirt || data.shirt || data.shareShirt,
      shirtUsername,
    );
    update.userShirt = userShirt;
    update.shirt = userShirt;
    update.shareShirt = userShirt;
  } else {
    delete update.userShirt;
    delete update.shirt;
    delete update.shareShirt;
  }

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

  Object.keys(update).forEach(
    (key) => update[key] === undefined && delete update[key],
  );
  return update;
};

export async function ensureUserDocument(
  user,
  username = "Player",
  extra = {},
) {
  if (!user?.uid || !db) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const displayName =
    username || user.displayName || user.email?.split("@")[0] || "Player";

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
  if (update.achievements || update.trophies) {
    await updateDoc(ref, buildLegacyAchievementDeleteUpdate()).catch(() => {});
  }
  return { id: snap.id, ...existing, ...update };
}

export async function loadUserProfile(uid) {
  if (!uid || !db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  // Normalise old documents in memory so the UI can safely read the new schema immediately.
  const currentCampaign = normaliseCurrentCampaign(
    data.currentCampaign,
    data.currentProgress,
  );
  const bestCampaign = normaliseBestCampaign(data.bestCampaign);
  const consumables = normaliseConsumables(data.consumables, {});
  const upgradesPurchased = {
    ...normaliseUpgradeMap(
      data.upgradesPurchased,
      {},
      data.unlocks,
    ),
    allTeams: Boolean(
      data.upgradesPurchased?.allTeams ||
        data.unlocks?.allTeams ||
        data.allTeamsEquipped ||
        data.allTeamsUnlocked ||
        false,
    ),
  };
  const cosmeticsEquipped = normaliseCosmeticsActive(
    data.cosmeticsActive || data.cosmeticsEquipped,
    {},
    consumables,
    upgradesPurchased,
  );
  const careerStats = normaliseCareerStats(data.careerStats, data.stats);
  const userShirt = normaliseUserShirt(
    data.userShirt || data.shirt || data.shareShirt,
    data.username || data.nickname || data.displayName || "",
  );

  return {
    ...data,
    upgradesPurchased,
    cosmeticsEquipped,
    consumables,
    currentCampaign,
    bestCampaign,
    careerStats,
    achievements: normaliseAchievements(data.achievements, data.trophies),
    trophies: normaliseAchievements(data.achievements, data.trophies),
    nationCupWins: normaliseNationCupWins(data.nationCupWins),
    nationStickerProgress: data.nationStickerProgress || {},
    userShirt,
    ...buildCompatibilityAliases({
      currentCampaign,
      bestCampaign,
      careerStats,
      upgradesPurchased,
      cosmeticsEquipped,
      consumables,
      userShirt,
    }),
    currentProgress: data.currentProgress || null,
  };
}

export async function saveUserProfile(uid, data = {}) {
  if (!uid || !db) return;
  const update = normaliseProfileUpdate(data);
  const hasAchievementInput = hasOwn(data, "achievements") || hasOwn(data, "trophies");
  await setDoc(doc(db, "users", uid), update, {
    merge: true,
  });
  if (hasAchievementInput) {
    await updateDoc(doc(db, "users", uid), buildLegacyAchievementDeleteUpdate()).catch(() => {});
  }
}

export async function saveUserShirtProfile(uid, shirt = {}) {
  if (!uid || !db) return;
  const userShirt = normaliseUserShirt(shirt, shirt.name || "GUEST");
  await setDoc(
    doc(db, "users", uid),
    {
      userShirt,
      shirt: userShirt,
      shareShirt: userShirt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function unlockTrophy(uid, trophyKey) {
  if (!uid || !trophyKey || !db) return;
  const achievementUpdate = {
    [`achievements.${trophyKey}`]: true,
    [`trophies.${trophyKey}`]: true,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, "users", uid), {
    ...achievementUpdate,
    ...buildLegacyAchievementDeleteUpdate(),
  });
}

export async function saveCosmeticActive(uid, cosmeticKey, active = true) {
  if (!uid || !cosmeticKey || !db) return;
  const equippable = ["goldenBoot", "goldenBall", "goldenGlove"];
  if (!equippable.includes(cosmeticKey)) return;
  const isActive = Boolean(active);
  await setDoc(
    doc(db, "users", uid),
    {
      [`cosmeticsActive.${cosmeticKey}`]: isActive,
      [`cosmeticsEquipped.${cosmeticKey}`]: isActive,
      [`cosmetics.${cosmeticKey}`]: isActive,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// Backwards-compatible export. In user-facing language this means ACTIVE, not purchased.
export const saveCosmeticEquipped = saveCosmeticActive;

export async function unlockCosmetic(uid, cosmeticKey, equipped = true) {
  if (!uid || !cosmeticKey || !db) return;
  const isKnownCosmetic = COSMETIC_KEYS.includes(cosmeticKey);
  if (!isKnownCosmetic) return;

  if (cosmeticKey === "goldenTicket") {
    await setDoc(
      doc(db, "users", uid),
      {
        "consumables.goldenTicket.quantity": equipped ? 1 : 0,
        "consumables.goldenTicket.equipped": Boolean(equipped),
        "consumables.goldenTicket.totalPurchased": equipped ? increment(1) : 0,
        "consumables.goldenTicket.lastPurchasedAt": equipped
          ? serverTimestamp()
          : null,
        "cosmeticsActive.goldenTicket": Boolean(equipped),
        "cosmeticsEquipped.goldenTicket": Boolean(equipped),
        "cosmetics.goldenTicket": Boolean(equipped),
        "cosmetics.goldenTicketQuantity": equipped ? 1 : 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await setDoc(
    doc(db, "users", uid),
    {
      [`upgradesPurchased.${cosmeticKey}`]: true,
      [`cosmeticsActive.${cosmeticKey}`]: Boolean(equipped),
      [`cosmeticsEquipped.${cosmeticKey}`]: Boolean(equipped),
      [`cosmetics.${cosmeticKey}`]: Boolean(equipped),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function consumeGoldenTicket(uid, currentQuantity = 1) {
  if (!uid || !db) return;
  const nextQuantity = normaliseTicketQuantity(
    Number(currentQuantity || 0) - 1,
  );
  await setDoc(
    doc(db, "users", uid),
    {
      "consumables.goldenTicket.quantity": nextQuantity,
      "consumables.goldenTicket.equipped": nextQuantity > 0,
      "consumables.goldenTicket.totalUsed": increment(1),
      "consumables.goldenTicket.lastUsedAt": serverTimestamp(),
      "cosmeticsActive.goldenTicket": nextQuantity > 0,
      "cosmeticsEquipped.goldenTicket": nextQuantity > 0,
      "cosmetics.goldenTicket": nextQuantity > 0,
      "cosmetics.goldenTicketQuantity": nextQuantity,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveAllTeamsUnlocked(
  uid,
  purchased = true,
  equipped = true,
) {
  if (!uid || !db) return;
  await setDoc(
    doc(db, "users", uid),
    {
      "upgradesPurchased.allTeams": Boolean(purchased),
      "unlocks.allTeams": Boolean(purchased),
      allTeamsEquipped: Boolean(purchased ? true : equipped),
      allTeamsUnlocked: Boolean(purchased ? true : equipped),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveCheckoutStarted(uid, checkout = {}) {
  if (!uid || !db) return;
  await setDoc(
    doc(db, "users", uid),
    {
      lastCheckoutStarted: {
        ...checkout,
        startedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function buildStoreEntitlements(profile = {}) {
  const upgrades = normaliseUpgradeMap(
    profile.upgradesPurchased,
    {},
    profile.unlocks,
  );
  const consumables = normaliseConsumables(profile.consumables, {});
  return {
    allTeams: Boolean(
      upgrades.allTeams ||
        profile.allTeamsEquipped ||
        profile.allTeamsUnlocked ||
        profile.unlocks?.allTeams ||
        false,
    ),
    goldenBall: Boolean(upgrades.goldenBall),
    goldenBoot: Boolean(upgrades.goldenBoot),
    goldenGlove: Boolean(upgrades.goldenGlove),
    goldenTicket:
      normaliseTicketQuantity(consumables.goldenTicket?.quantity) > 0,
    goldenTicketQty: normaliseTicketQuantity(
      consumables.goldenTicket?.quantity,
    ),
  };
}

export async function saveCurrentProgress(uid, snapshot = null) {
  if (!uid || !db) return;
  const currentCampaign = normaliseCurrentCampaign(
    snapshot?.currentCampaign || {},
    snapshot,
  );

  await setDoc(
    doc(db, "users", uid),
    {
      currentProgress: snapshot,
      currentCampaign,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadCurrentProgress(uid) {
  const profile = await loadUserProfile(uid);
  // The runtime snapshot remains the source for exact resume while the structured schema stores display/query fields.
  return profile?.currentProgress || profile?.savedGames?.current || null;
}

export async function saveLeaderboardHighScore(uid, entry = {}) {
  if (!uid || !db) return;

  const rawBestCampaign = entry.bestCampaign || {
    ...entry,
    team: entry.team || entry.teamName || entry.teamFlag || "",
    formGuide: entry.formGuide || entry.form || entry.tournamentProgress || [],
    form: entry.form || entry.formGuide || entry.tournamentProgress || [],
    tournamentProgress:
      entry.tournamentProgress || entry.formGuide || entry.form || [],
  };
  const bestCampaign = normaliseBestCampaign(rawBestCampaign);
  const formGuide = normaliseFormGuide(
    bestCampaign.formGuide ||
      rawBestCampaign.form ||
      rawBestCampaign.tournamentProgress ||
      entry.formGuide ||
      entry.form ||
      entry.tournamentProgress,
  );
  const score = Number(
    entry.gameScore ??
      entry.campaignPoints ??
      entry.points ??
      bestCampaign.gameScore ??
      0,
  );
  const teamName =
    entry.team ||
    entry.teamName ||
    entry.teamFlag ||
    bestCampaign.teamName ||
    "";
  const cosmeticsApplied = normaliseCosmeticsApplied(
    entry.cosmeticsApplied,
    bestCampaign.cosmeticsApplied || rawBestCampaign || entry,
  );
  const username = cleanUsername(
    entry.username || entry.nickname || "PLAYER",
  ).toUpperCase();

  const finish = normalizeResultStatus(
    entry.status ||
      entry.finish ||
      rawBestCampaign.status ||
      rawBestCampaign.finish ||
      "inProgress",
  );
  if (!isTerminalResultStatus(finish)) return;
  const podiumAchieved = Boolean(
    entry.podium ||
    entry.podiumAchieved ||
    /champion|runner|third/i.test(String(finish || "")),
  );
  const leaderboardBestCampaign = {
    ...bestCampaign,
    team: bestCampaign.teamName || teamName,
    teamName: bestCampaign.teamName || teamName,
    stage: bestCampaign.tournamentPhase,
    roundLabel: bestCampaign.tournamentPhase,
    points: score,
    campaignPoints: score,
    gameScore: score,
    formGuide,
    form: formGuide,
    tournamentProgress: formGuide,
    cosmeticsApplied,
    cosmeticBallEquipped: Boolean(cosmeticsApplied.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmeticsApplied.goldenGlove),
  };

  await setDoc(
    doc(db, "leaderboard", uid),
    {
      uid,
      emailVerified: true,
      accountStatus: { emailVerified: true, verificationRequired: false },
      userId: uid,
      username,
      teamFlag:
        entry.teamFlag || entry.flag || entry.team?.flag || teamName || "",
      gameScore: score,
      formGuide,
      form: formGuide,
      tournamentProgress: formGuide,
      bestCampaign: leaderboardBestCampaign,
      cosmeticsApplied,
      podium: entry.podium || null,
      podiumAchieved,
      status: finish,
      finish,
      stats: {
        matchesPlayed: Number(
          entry.matchesPlayed ?? entry.stats?.matchesPlayed ?? 0,
        ),
        totalMatchesPlayed: Number(
          entry.matchesPlayed ??
            entry.stats?.totalMatchesPlayed ??
            entry.stats?.matchesPlayed ??
            0,
        ),
        matchesWon: Number(entry.matchesWon ?? entry.stats?.matchesWon ?? 0),
        totalMatchesWon: Number(
          entry.matchesWon ??
            entry.stats?.totalMatchesWon ??
            entry.stats?.matchesWon ??
            0,
        ),
        matchesDrawn: Number(
          entry.matchesDrawn ?? entry.stats?.matchesDrawn ?? 0,
        ),
        totalMatchesDrawn: Number(
          entry.matchesDrawn ??
            entry.stats?.totalMatchesDrawn ??
            entry.stats?.matchesDrawn ??
            0,
        ),
        matchesLost: Number(entry.matchesLost ?? entry.stats?.matchesLost ?? 0),
        totalMatchesLost: Number(
          entry.matchesLost ??
            entry.stats?.totalMatchesLost ??
            entry.stats?.matchesLost ??
            0,
        ),
        totalGoalsScored: Number(
          entry.totalGoals ??
            entry.stats?.totalGoalsScored ??
            entry.stats?.totalGoals ??
            0,
        ),
        totalShotsTaken: Number(
          entry.totalShots ??
            entry.stats?.totalShotsTaken ??
            entry.stats?.totalShots ??
            0,
        ),
        conversionPercentage: Number(
          entry.conversionPercentage ?? entry.stats?.conversionPercentage ?? 0,
        ),
        mondayCupsWon: Number(
          entry.mondayCupsWon ?? entry.stats?.mondayCupsWon ?? 0,
        ),
        highScore: Number(entry.highScore ?? score),
        gameScore: Number(entry.highScore ?? score),
      },
      highScore: Number(entry.highScore ?? score),
      updatedAt: serverTimestamp(),

      // Temporary aliases so existing leaderboard UI keeps working while migrated.
      team: teamName,
      campaignPoints: score,
    },
    { merge: true },
  );
}

export async function loadLeaderboardRows(limitCount = 50) {
  if (!db) return [];

  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy("gameScore", "desc"),
    limit(limitCount),
  );

  const snap = await getDocs(leaderboardQuery);
  const bestByUser = new Map();
  const hasFormValues = (value) => Array.isArray(value) && value.some(Boolean);
  const firstUsefulFormGuide = (...values) =>
    normaliseFormGuide(values.find(hasFormValues) || []);

  for (const item of snap.docs) {
    const data = item.data() || {};
    const userId = data.uid || data.userId || item.id;
    if (!userId || userId === "guest-preview" || data.localOnly) continue;
    if (
      data.emailVerified === false ||
      data.accountStatus?.emailVerified === false
    )
      continue;

    const leaderboardFormSource =
      data.formGuide ||
      data.form ||
      data.tournamentProgress ||
      data.bestCampaign?.formGuide ||
      data.bestCampaign?.form ||
      data.bestCampaign?.tournamentProgress ||
      [];
    let userProfile = null;
    if (!hasFormValues(leaderboardFormSource)) {
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        userProfile = userSnap.exists() ? userSnap.data() || {} : null;
      } catch (error) {
        console.warn("Leaderboard best campaign fallback failed", error);
      }
    }

    const campaignSource = data.bestCampaign ||
      userProfile?.bestCampaign || {
        ...data,
        formGuide: leaderboardFormSource,
        form: leaderboardFormSource,
        tournamentProgress: leaderboardFormSource,
      };
    const gameScore = Number(
      data.gameScore ??
        data.campaignPoints ??
        data.points ??
        campaignSource?.gameScore ??
        campaignSource?.campaignPoints ??
        campaignSource?.points ??
        0,
    );
    const bestCampaign = normaliseBestCampaign(campaignSource);
    const formGuide = firstUsefulFormGuide(
      leaderboardFormSource,
      userProfile?.bestCampaign?.formGuide,
      userProfile?.bestCampaign?.form,
      userProfile?.bestCampaign?.tournamentProgress,
      bestCampaign.formGuide,
    );
    const rowTeam =
      data.teamFlag ||
      data.flag ||
      data.team ||
      bestCampaign.teamName ||
      userProfile?.bestCampaign?.teamName ||
      userProfile?.bestCampaign?.team ||
      "";
    const row = {
      id: item.id,
      uid: userId,
      userId,
      username:
        data.username ||
        data.nickname ||
        userProfile?.username ||
        userProfile?.nickname ||
        "PLAYER",
      teamFlag: rowTeam,
      team: rowTeam,
      gameScore,
      campaignPoints: gameScore,
      formGuide,
      form: formGuide,
      tournamentProgress: formGuide,
      bestCampaign: {
        ...bestCampaign,
        team: bestCampaign.teamName || rowTeam,
        teamName: bestCampaign.teamName || rowTeam,
        formGuide,
        form: formGuide,
        tournamentProgress: formGuide,
        points: gameScore,
        campaignPoints: gameScore,
        gameScore,
      },
      cosmeticsApplied: normaliseCosmeticsApplied(
        data.cosmeticsApplied,
        data.bestCampaign || userProfile?.bestCampaign || data,
      ),
      podium: data.podium || null,
      podiumAchieved: Boolean(
        data.podiumAchieved ||
        data.podium ||
        /champion|runner|third/i.test(
          String(
            data.status ||
              data.finish ||
              data.bestCampaign?.roundLabel ||
              data.bestCampaign?.stage ||
              userProfile?.bestCampaign?.roundLabel ||
              userProfile?.bestCampaign?.stage ||
              "",
          ),
        ),
      ),
      status:
        data.status ||
        data.finish ||
        data.bestCampaign?.roundLabel ||
        data.bestCampaign?.stage ||
        userProfile?.bestCampaign?.roundLabel ||
        userProfile?.bestCampaign?.stage ||
        "inProgress",
      finish:
        data.finish ||
        data.status ||
        data.bestCampaign?.roundLabel ||
        data.bestCampaign?.stage ||
        userProfile?.bestCampaign?.roundLabel ||
        userProfile?.bestCampaign?.stage ||
        "inProgress",
      updatedAt: data.updatedAt || null,
    };

    const existing = bestByUser.get(userId);
    if (!existing || gameScore > Number(existing.gameScore || 0)) {
      bestByUser.set(userId, row);
    }
  }

  return Array.from(bestByUser.values())
    .sort((a, b) => Number(b.gameScore || 0) - Number(a.gameScore || 0))
    .slice(0, limitCount);
}

export async function isNicknameTaken(nickname, uidToIgnore = null) {
  const clean = String(nickname || "")
    .trim()
    .toLowerCase();
  if (!clean || !db) return false;
  const usernameQuery = query(
    collection(db, "users"),
    where("usernameLower", "==", clean),
    limit(3),
  );
  const snap = await getDocs(usernameQuery);
  return snap.docs.some((item) => item.id !== uidToIgnore);
}

export async function saveUserNickname(uid, username) {
  const clean = cleanUsername(username).toUpperCase();
  if (!uid || !clean || !db) return;

  await setDoc(
    doc(db, "users", uid),
    {
      username: clean,
      usernameLower: clean.toLowerCase(),
      nickname: clean,
      nicknameLower: clean.toLowerCase(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "leaderboard", uid),
    {
      username: clean,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function reserveUsername(uid, username) {
  const clean = cleanUsername(username).toLowerCase();
  if (!uid || !clean || !db) return;
  await setDoc(
    doc(db, "usernames", clean),
    {
      uid,
      username: clean.toUpperCase(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function incrementTournamentsStarted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = Number(
    profile?.careerStats?.tournamentsStarted ??
      profile?.stats?.tournamentsStarted ??
      0,
  );
  await setDoc(
    doc(db, "users", uid),
    {
      "careerStats.tournamentsStarted": current + Number(amount || 1),
      "stats.tournamentsStarted": current + Number(amount || 1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function incrementTotalMatchesCompleted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = Number(
    profile?.careerStats?.totalMatchesCompleted ??
      profile?.stats?.totalMatchesCompleted ??
      0,
  );
  await setDoc(
    doc(db, "users", uid),
    {
      "careerStats.totalMatchesCompleted": current + Number(amount || 1),
      "stats.totalMatchesCompleted": current + Number(amount || 1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
