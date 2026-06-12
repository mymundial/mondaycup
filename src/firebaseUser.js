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
import { auth, db } from "../firebase.js";
import { isTerminalResultStatus, normalizeResultStatus } from "../logic/resultStatus.js";

export const FORM_GUIDE_LENGTH = 8;
export const GROUP_STAGE_MATCH_START = 1;
export const GROUP_STAGE_MATCH_END = 72;
export const KNOCKOUT_MATCH_START = 73;
export const KNOCKOUT_MATCH_END = 104;

const COSMETIC_KEYS = ["goldenBoot", "goldenBall", "goldenGlove", "goldenTicket"];
const UPGRADE_KEYS = ["allTeams", "goldenBoot", "goldenBall", "goldenGlove"];
const SHIRT_PATTERN_TYPES = ["plain", "stripes", "hoops", "checks"];

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const emptyBooleanMap = (keys) => Object.fromEntries(keys.map((key) => [key, false]));
const truthy = (...values) => values.some((value) => value === true || value === 1 || value === "true");
const number = (value, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanUsername = (value, fallback = "Player") =>
  String(value || fallback).trim().slice(0, 10) || fallback;

export const normaliseFormGuide = (cupRun = []) => {
  const source = Array.isArray(cupRun) ? cupRun : [];
  return Array.from({ length: FORM_GUIDE_LENGTH }, (_, index) => source[index] ?? null);
};
const normaliseCupRun = normaliseFormGuide;

export const createEmptyResultMap = (start, end) => {
  const results = {};
  for (let matchId = start; matchId <= end; matchId += 1) results[String(matchId)] = null;
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
  lastShot: null,
});

export const createDefaultCurrentCampaign = () => ({
  exists: false,
  active: false,
  status: "NOT_STARTED",
  campaignId: null,
  teamId: null,
  teamName: null,
  opponent: null,
  round: null,
  matchId: null,
  cupRun: normaliseCupRun(),
  gameScore: 0,
  score: [0, 0],
  matches: [],
  activeMatchId: null,
  activeMatchSnapshot: {
    matchId: null,
    fixtureId: null,
    penaltyNumber: 1,
    currentTurn: "user",
    suddenDeath: false,
    penMarkersFor: [],
    penMarkersAgainst: [],
    suddenDeathMarkersFor: [],
    suddenDeathMarkersAgainst: [],
    score: { user: 0, opponent: 0 },
  },
  activeMatch: createDefaultCurrentMatchState(),
  startedAt: null,
  updatedAt: null,
  runtimeSnapshot: null,
});

export const createDefaultBestCampaign = () => ({
  exists: false,
  gameScore: 0,
  teamName: null,
  team: null,
  cupRun: normaliseCupRun(),
  phase: "Not Started",
  round: "Not Started",
  podium: "none",
  completedAt: null,
  updatedAt: null,
});

const CAREER_HIGHLIGHT_KEYS = [
  "rememberTheName",
  "nationalPride",
  "grizzledVeteran",
  "serialWinner",
  "siuuu",
  "goat",
];
const MATCHES_PLAYED_KEYS = [
  "matchesPlayed1",
  "matchesPlayed10",
  "matchesPlayed25",
  "matchesPlayed50",
  "matchesPlayed100",
  "matchesPlayed500",
];
const MATCHES_WON_KEYS = [
  "matchesWon1",
  "matchesWon5",
  "matchesWon10",
  "matchesWon25",
  "matchesWon50",
  "matchesWon250",
];
const GOALS_SCORED_KEYS = [
  "goalsScored5",
  "goalsScored50",
  "goalsScored125",
  "goalsScored250",
  "goalsScored500",
  "goalsScored1000",
];
const PODIUM_BADGE_KEYS = ["thirdPlaceFinish", "runnerUpFinish", "championFinish"];

export const TROPHY_SCHEMA = {
  careerHighlights: CAREER_HIGHLIGHT_KEYS,
  matchesPlayed: MATCHES_PLAYED_KEYS,
  matchesWon: MATCHES_WON_KEYS,
  goalsScored: GOALS_SCORED_KEYS,
  podiumBadges: PODIUM_BADGE_KEYS,
};

export const ACHIEVEMENT_KEYS = [
  ...CAREER_HIGHLIGHT_KEYS,
  ...MATCHES_PLAYED_KEYS,
  ...MATCHES_WON_KEYS,
  ...GOALS_SCORED_KEYS,
  ...PODIUM_BADGE_KEYS,
];

const LEGACY_ACHIEVEMENT_KEYS = [
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
  "hostHero",
  "firstMatch",
  "pointsOnTheBoard",
  "firstWin",
  "knockoutQualified",
  "round32Win",
  "reachQF",
  "reachSF",
  "reachFinal",
  "champions",
  "champion",
  "trophy5",
  "runnerUp",
  "thirdPlace",
];

const emptyTrophies = () => ({
  careerHighlights: emptyBooleanMap(CAREER_HIGHLIGHT_KEYS),
  matchesPlayed: emptyBooleanMap(MATCHES_PLAYED_KEYS),
  matchesWon: emptyBooleanMap(MATCHES_WON_KEYS),
  goalsScored: emptyBooleanMap(GOALS_SCORED_KEYS),
  podiumBadges: emptyBooleanMap(PODIUM_BADGE_KEYS),
});

const flattenTrophies = (trophies = {}) => ({
  ...(trophies.careerHighlights || {}),
  ...(trophies.matchesPlayed || {}),
  ...(trophies.matchesWon || {}),
  ...(trophies.goalsScored || {}),
  ...(trophies.podiumBadges || {}),
});

const normaliseTrophies = (source = {}, legacyAchievements = {}) => {
  const trophies = emptyTrophies();
  const nested = source && typeof source === "object" ? source : {};
  const old = legacyAchievements && typeof legacyAchievements === "object" ? legacyAchievements : {};
  const flat = { ...old, ...flattenTrophies(nested), ...nested };

  const setCategory = (category, keys) => {
    keys.forEach((key) => {
      trophies[category][key] = truthy(nested?.[category]?.[key], flat[key]);
    });
  };

  setCategory("careerHighlights", CAREER_HIGHLIGHT_KEYS);
  setCategory("matchesPlayed", MATCHES_PLAYED_KEYS);
  setCategory("matchesWon", MATCHES_WON_KEYS);
  setCategory("goalsScored", GOALS_SCORED_KEYS);
  setCategory("podiumBadges", PODIUM_BADGE_KEYS);

  trophies.careerHighlights.rememberTheName = truthy(
    trophies.careerHighlights.rememberTheName,
    flat.targetMan,
    flat.rememberTheName,
  );
  trophies.careerHighlights.nationalPride = truthy(
    trophies.careerHighlights.nationalPride,
    flat.championFinish,
    flat.champions,
    flat.champion,
    flat.trophy5,
    flat.nationalPride,
  );
  trophies.careerHighlights.siuuu = truthy(trophies.careerHighlights.siuuu, flat.siuuu);
  trophies.careerHighlights.goat = truthy(trophies.careerHighlights.goat, flat.goat, flat.globalIcon);
  trophies.podiumBadges.championFinish = truthy(
    trophies.podiumBadges.championFinish,
    flat.championFinish,
    flat.champions,
    flat.champion,
    flat.trophy5,
  );
  trophies.podiumBadges.runnerUpFinish = truthy(
    trophies.podiumBadges.runnerUpFinish,
    flat.runnerUpFinish,
    flat.runnerUp,
  );
  trophies.podiumBadges.thirdPlaceFinish = truthy(
    trophies.podiumBadges.thirdPlaceFinish,
    flat.thirdPlaceFinish,
    flat.thirdPlace,
  );

  return trophies;
};

export const createDefaultAchievements = () => flattenTrophies(emptyTrophies());

const buildUiAchievements = (trophies = {}) => {
  const flat = flattenTrophies(trophies);
  return {
    ...flat,
    // UI compatibility only. These aliases are NOT written back to Firestore.
    targetMan: Boolean(flat.rememberTheName),
    championFinish: Boolean(flat.championFinish || flat.nationalPride),
    globalIcon: Boolean(flat.goat),
  };
};

const getTrophyPath = (key) => {
  if (CAREER_HIGHLIGHT_KEYS.includes(key)) return `trophies.careerHighlights.${key}`;
  if (MATCHES_PLAYED_KEYS.includes(key)) return `trophies.matchesPlayed.${key}`;
  if (MATCHES_WON_KEYS.includes(key)) return `trophies.matchesWon.${key}`;
  if (GOALS_SCORED_KEYS.includes(key)) return `trophies.goalsScored.${key}`;
  if (PODIUM_BADGE_KEYS.includes(key)) return `trophies.podiumBadges.${key}`;
  const aliasMap = {
    targetMan: "trophies.careerHighlights.rememberTheName",
    nationalPride: "trophies.careerHighlights.nationalPride",
    globalIcon: "trophies.careerHighlights.goat",
  };
  return aliasMap[key] || null;
};

const TEAM_STICKER_KEYS = ["kit", "flag", "champions", "stopper", "talisman", "striker"];

const stickerDefaults = () => ({
  wearTheShirt: false,
  flyTheFlag: false,
  liftTheCup: false,
  safeHands: false,
  talismanicLeader: false,
  superStriker: false,
  opened: {},
  claimable: {},
});

const normaliseStickerKeyMap = (value = {}, aliases = {}) => {
  if (value === true) {
    return TEAM_STICKER_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
  }
  if (!value || typeof value !== "object") return {};
  return {
    kit: Boolean(value.kit ?? value.wearTheShirt ?? value.shirt ?? aliases.kit ?? false),
    flag: Boolean(value.flag ?? value.flyTheFlag ?? aliases.flag ?? false),
    champions: Boolean(value.champions ?? value.icon ?? value.liftTheCup ?? aliases.champions ?? false),
    stopper: Boolean(value.stopper ?? value.safeHands ?? value.keeper ?? aliases.stopper ?? false),
    talisman: Boolean(value.talisman ?? value.talismanicLeader ?? aliases.talisman ?? false),
    striker: Boolean(value.striker ?? value.superStriker ?? aliases.striker ?? false),
  };
};

const normaliseStickers = (source = {}) => {
  const result = {};
  const records = source && typeof source === "object" ? source : {};
  Object.entries(records).forEach(([teamId, record]) => {
    if (!teamId || !record || typeof record !== "object") return;
    const wearTheShirt = Boolean(record.wearTheShirt ?? record.kit ?? record.shirt ?? record.campaignCompleted ?? false);
    const flyTheFlag = Boolean(record.flyTheFlag ?? record.flag ?? record.knockoutQualified ?? false);
    const liftTheCup = Boolean(record.liftTheCup ?? record.champions ?? record.cupWon ?? record.unlocked ?? false);
    const safeHands = Boolean(record.safeHands ?? record.stopper ?? record.keeper ?? false);
    const talismanicLeader = Boolean(record.talismanicLeader ?? record.talisman ?? false);
    const superStriker = Boolean(record.superStriker ?? record.striker ?? false);
    const aliasMap = {
      kit: wearTheShirt,
      flag: flyTheFlag,
      champions: liftTheCup,
      stopper: safeHands,
      talisman: talismanicLeader,
      striker: superStriker,
    };

    const campaignsCompleted = number(record.campaignsCompleted, 0);
    const wins = number(record.wins, 0);
    const goals = number(record.goals, 0);
    const keeperSaves = number(record.keeperSaves, 0);
    const cupWon = Boolean(record.cupWon ?? record.liftTheCup ?? record.unlocked ?? false);
    const knockoutQualified = Boolean(record.knockoutQualified ?? record.flyTheFlag ?? false);
    const earnedMap = {
      kit: campaignsCompleted >= 1,
      flag: knockoutQualified,
      champions: cupWon,
      stopper: keeperSaves >= 10,
      talisman: wins >= 10,
      striker: goals >= 25,
    };
    const openedMap = normaliseStickerKeyMap(record.opened, {});
    const claimableMap = normaliseStickerKeyMap(record.claimable, aliasMap);

    result[teamId] = {
      ...stickerDefaults(),
      wearTheShirt,
      flyTheFlag,
      liftTheCup,
      safeHands,
      talismanicLeader,
      superStriker,
      opened: TEAM_STICKER_KEYS.reduce((acc, key) => ({ ...acc, [key]: Boolean(openedMap[key] && earnedMap[key]) }), {}),
      played: Boolean(record.played ?? false),
      claimable: TEAM_STICKER_KEYS.reduce((acc, key) => ({ ...acc, [key]: Boolean(claimableMap[key] && earnedMap[key]) }), {}),
      cupWon,
      knockoutQualified,
      campaignsCompleted,
      matchesPlayed: number(record.matchesPlayed, 0),
      wins,
      goals,
      keeperSaves,
    };
  });
  return result;
};

const normaliseNationCupWins = (source = {}) =>
  source && typeof source === "object" ? { ...source } : {};

const cleanHex = (value, fallback) => {
  const raw = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(raw) ? raw : fallback;
};
const cleanShirtName = (value, fallback = "") =>
  String(value || fallback).replace(/[^a-z0-9 ]/gi, "").trim().toUpperCase().slice(0, 14);
const cleanShirtNumber = (value, fallback = "11") =>
  String(value ?? fallback).replace(/[^0-9]/g, "").slice(0, 2) || fallback;

export const DEFAULT_USER_SHIRT = {
  playerName: "GUEST",
  playerNumber: "11",
  fabric: {
    backgroundColour: "#073B26",
    patternColour: "#FFFFFF",
    patternType: "plain",
  },
  print: {
    nameColour: "#FFFFFF",
    numberColour: "#FFFFFF",
    nameOutlineEnabled: false,
    nameOutlineColour: "#FFFFFF",
    numberOutlineEnabled: false,
    numberOutlineColour: "#FFFFFF",
  },
  updatedAt: null,
};

const normaliseShirt = (source = {}, username = "") => {
  const src = source && typeof source === "object" ? source : {};
  const fabric = src.fabric || {};
  const print = src.print || {};
  const outlineWidth = number(src.outlineWeight ?? src.nameOutlineWidth ?? 0, 0);
  const numberOutlineWidth = number(src.numberOutlineWidth ?? src.outlineWeight ?? 0, 0);
  const patternType = fabric.patternType || src.patternType || src.patternMode || "plain";
  return {
    playerName: cleanShirtName(src.playerName || src.name, username || "GUEST"),
    playerNumber: cleanShirtNumber(src.playerNumber || src.number, "11"),
    fabric: {
      backgroundColour: cleanHex(fabric.backgroundColour || src.backgroundColour || src.bg, DEFAULT_USER_SHIRT.fabric.backgroundColour),
      patternColour: cleanHex(fabric.patternColour || src.patternColour, DEFAULT_USER_SHIRT.fabric.patternColour),
      patternType: SHIRT_PATTERN_TYPES.includes(patternType) ? patternType : "plain",
    },
    print: {
      nameColour: cleanHex(print.nameColour || src.nameColour || src.textColour, DEFAULT_USER_SHIRT.print.nameColour),
      numberColour: cleanHex(print.numberColour || src.numberColour || src.textColour, DEFAULT_USER_SHIRT.print.numberColour),
      nameOutlineEnabled: Boolean(print.nameOutlineEnabled ?? src.nameOutlineEnabled ?? outlineWidth > 0),
      nameOutlineColour: cleanHex(print.nameOutlineColour || src.nameOutlineColour || src.outlineColour, DEFAULT_USER_SHIRT.print.nameOutlineColour),
      numberOutlineEnabled: Boolean(print.numberOutlineEnabled ?? src.numberOutlineEnabled ?? numberOutlineWidth > 0),
      numberOutlineColour: cleanHex(print.numberOutlineColour || src.numberOutlineColour || src.outlineColour, DEFAULT_USER_SHIRT.print.numberOutlineColour),
    },
    updatedAt: src.updatedAt || null,
  };
};

const toLegacyShirt = (shirt = DEFAULT_USER_SHIRT) => ({
  team: "",
  name: shirt.playerName || "GUEST",
  number: shirt.playerNumber || "11",
  bg: shirt.fabric?.backgroundColour || DEFAULT_USER_SHIRT.fabric.backgroundColour,
  patternMode: shirt.fabric?.patternType || "plain",
  patternColour: shirt.fabric?.patternColour || DEFAULT_USER_SHIRT.fabric.patternColour,
  textColour: shirt.print?.nameColour || DEFAULT_USER_SHIRT.print.nameColour,
  numberColour: shirt.print?.numberColour || DEFAULT_USER_SHIRT.print.numberColour,
  outlineColour: shirt.print?.nameOutlineColour || DEFAULT_USER_SHIRT.print.nameOutlineColour,
  nameOutlineWidth: shirt.print?.nameOutlineEnabled ? 1.5 : 0,
  numberOutlineWidth: shirt.print?.numberOutlineEnabled ? 1.5 : 0,
});

const normaliseGoldenTicket = (source = {}, legacyCosmetics = {}) => {
  const quantity = normaliseTicketQuantity(
    source.quantity ?? source.count ?? source.qty ?? legacyCosmetics.goldenTicketQuantity ?? (legacyCosmetics.goldenTicket ? 1 : 0) ?? 0,
  );
  return {
    quantity,
    totalPurchased: number(source.totalPurchased ?? source.purchased ?? source.totalBought, 0),
    totalUsed: number(source.totalUsed ?? source.used, 0),
    lastPurchasedAt: source.lastPurchasedAt || null,
    lastUsedAt: source.lastUsedAt || null,
  };
};

const normaliseConsumables = (source = {}, legacyCosmetics = {}) => ({
  goldenTicket: normaliseGoldenTicket(source?.goldenTicket || {}, legacyCosmetics),
});

const normaliseUpgradeMap = (source = {}, legacyCosmetics = {}, legacyUnlocks = {}, legacyRoot = {}) => {
  const legacyStoreEntitlements = legacyRoot?.storeEntitlements || legacyRoot?.entitlements || {};
  const hasGoldenKitbag = Boolean(
    source?.goldenKitbag ??
      source?.fullBundle ??
      legacyStoreEntitlements?.goldenKitbag ??
      legacyStoreEntitlements?.fullBundle ??
      legacyRoot?.goldenKitbag ??
      legacyRoot?.fullBundle ??
      false,
  );
  return {
    allTeams: Boolean(source?.allTeams ?? legacyUnlocks?.allTeams ?? legacyRoot?.allTeamsEquipped ?? legacyRoot?.allTeamsUnlocked ?? false),
    goldenBoot: Boolean(source?.goldenBoot ?? false),
    goldenBall: Boolean(source?.goldenBall ?? false),
    goldenGlove: Boolean(source?.goldenGlove ?? false),
    goldenKitbag: hasGoldenKitbag,
    fullBundle: hasGoldenKitbag,
  };
};

const normaliseCosmeticsEquipped = (source = {}, legacy = {}, consumables = {}, upgrades = {}) => {
  const src = source && typeof source === "object" ? source : {};
  const old = legacy && typeof legacy === "object" ? legacy : {};
  return {
    goldenBoot: Boolean(upgrades.goldenBoot && (src.goldenBoot ?? old.goldenBoot ?? false)),
    goldenBall: Boolean(upgrades.goldenBall && (src.goldenBall ?? old.goldenBall ?? false)),
    goldenGlove: Boolean(upgrades.goldenGlove && (src.goldenGlove ?? old.goldenGlove ?? false)),
    goldenTicket: normaliseTicketQuantity(consumables.goldenTicket?.quantity) > 0 && Boolean(src.goldenTicket ?? old.goldenTicket ?? true),
  };
};

const COSMETIC_ALIASES = {
  goldenBoot: ["goldenBoot", "golden_boot", "boot", "cosmetic3", "cosmeticBoot", "cosmeticBootEquipped", "goldenBootEquipped"],
  goldenBall: ["goldenBall", "golden_ball", "ball", "cosmeticBall", "cosmeticBallEquipped", "goldenBallEquipped"],
  goldenGlove: ["goldenGlove", "golden_glove", "glove", "cosmeticGlove", "cosmeticGloveEquipped", "goldenGloveEquipped"],
  goldenTicket: ["goldenTicket", "golden_ticket", "ticket", "cosmetic4", "goldenTicketUsed", "usedGoldenTicket"],
};

const GENERIC_UPGRADE_FLAGS = [
  "usedGoldenUpgrade",
  "goldenUpgradeUsed",
  "cosmeticsUsed",
  "cosmeticsAppliedToCampaign",
  "hasCosmeticsApplied",
  "hasGoldenUpgrade",
];

const truthyCosmeticValue = (value) => {
  if (Array.isArray(value)) return value.some(truthyCosmeticValue);
  if (value && typeof value === "object") {
    if (hasOwn(value, "active")) return truthyCosmeticValue(value.active);
    if (hasOwn(value, "enabled")) return truthyCosmeticValue(value.enabled);
    if (hasOwn(value, "equipped")) return truthyCosmeticValue(value.equipped);
    if (hasOwn(value, "used")) return truthyCosmeticValue(value.used);
    if (hasOwn(value, "quantity")) return number(value.quantity, 0) > 0;
    return Object.values(value).some(truthyCosmeticValue);
  }
  if (typeof value === "string") return !["", "false", "0", "no", "none", "off"].includes(value.trim().toLowerCase());
  return Boolean(value);
};

const cosmeticFlagFromSource = (source = {}, key) => {
  if (!source || typeof source !== "object") return false;
  const aliases = COSMETIC_ALIASES[key] || [key];
  return aliases.some((alias) => truthyCosmeticValue(source[alias]));
};

const genericUpgradeFlagFromSource = (source = {}) => {
  if (!source || typeof source !== "object") return false;
  return GENERIC_UPGRADE_FLAGS.some((key) => truthyCosmeticValue(source[key]));
};

const normaliseCosmeticsApplied = (...sources) => {
  const safeSources = sources.filter((source) => source && typeof source === "object");
  const applied = {
    goldenBoot: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenBoot")),
    goldenBall: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenBall")),
    goldenGlove: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenGlove")),
    goldenTicket: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenTicket")),
  };

  return applied;
};

const usesLeaderboardUpgrade = (row = {}) => {
  const bestCampaign = row.bestCampaign && typeof row.bestCampaign === "object" ? row.bestCampaign : {};
  const sources = [
    row,
    row.cosmeticsApplied,
    row.activeCosmetics,
    row.upgradesApplied,
    row.upgradesUsed,
    row.usedUpgrades,
    bestCampaign,
    bestCampaign.cosmeticsApplied,
    bestCampaign.activeCosmetics,
    bestCampaign.upgradesApplied,
    bestCampaign.upgradesUsed,
    bestCampaign.usedUpgrades,
  ];
  const cosmeticsApplied = normaliseCosmeticsApplied(...sources);
  return Boolean(
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    cosmeticsApplied.goldenTicket ||
    sources.some(genericUpgradeFlagFromSource)
  );
};

const normaliseResultMap = (value, start, end) => ({
  ...createEmptyResultMap(start, end),
  ...(value && typeof value === "object" ? value : {}),
});

const getCupRunSource = (...values) => values.find((value) => Array.isArray(value) && value.some(Boolean)) || values.find(Array.isArray) || [];

const normalisePodiumValue = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim().toLowerCase();
    if (!text || ["none", "null", "false", "no", "na", "n/a", "inprogress", "in progress"].includes(text)) continue;
    if (text.includes("champion") || text === "winner" || text === "won" || text === "1" || text === "first") return "champion";
    if (text.includes("runner") || text.includes("second") || text === "runnerup" || text === "runner-up" || text === "2" || text === "silver") return "runner-up";
    if (text.includes("third") || text.includes("bronze") || text === "thirdplace" || text === "third-place" || text === "3") return "third-place";
  }
  return "none";
};

const podiumFromResultFields = (...values) => normalisePodiumValue(...values);

const leaderboardPodiumFromCanonical = (value = "") => {
  const podium = normalisePodiumValue(value);
  if (podium === "runner-up") return "runnerUp";
  if (podium === "third-place") return "thirdPlace";
  if (podium === "champion") return "champion";
  return null;
};

const compactMatchRow = (match = {}) => {
  if (!match || typeof match !== "object") return null;
  const id = match.id ?? match.matchId ?? match.matchNo ?? match.no ?? null;
  return {
    id,
    matchId: match.matchId ?? id,
    round: match.round ?? match.stage ?? match.phase ?? null,
    group: match.group ?? match.groupId ?? null,
    week: match.week ?? null,
    home: match.home ?? match.homeTeam ?? null,
    away: match.away ?? match.awayTeam ?? null,
    homeTeamId: match.homeTeamId ?? null,
    awayTeamId: match.awayTeamId ?? null,
    homeGoals: match.homeGoals ?? match.homeScore ?? null,
    awayGoals: match.awayGoals ?? match.awayScore ?? null,
    played: Boolean(match.played),
    winner: match.winner ?? match.winnerId ?? null,
  };
};

const compactMatchesFromProgress = (progress = {}) => {
  const rows = [
    ...(Array.isArray(progress.schedule) ? progress.schedule : []),
    ...(Array.isArray(progress.knockoutFixtures) ? progress.knockoutFixtures : []),
  ]
    .map(compactMatchRow)
    .filter(Boolean);
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.matchId ?? row.id ?? `${row.home}-${row.away}-${row.week}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normaliseActiveMatchState = (campaign = {}, currentProgress = null) => {
  const defaults = createDefaultCurrentMatchState();
  const state = campaign.activeMatch || campaign.currentMatchState || currentProgress?.activeMatch || {};
  const markers = state.penaltyMarkers || currentProgress?.penaltyMarkers || [];
  return {
    ...defaults,
    matchId: state.matchId ?? currentProgress?.currentMatchId ?? currentProgress?.matchResult?.matchNo ?? null,
    homeTeamId: state.homeTeamId ?? null,
    awayTeamId: state.awayTeamId ?? null,
    userTeamId: state.userTeamId ?? null,
    opponentTeamId: state.opponentTeamId ?? null,
    userScore: number(state.userScore ?? currentProgress?.score?.[0] ?? campaign.score?.[0], 0),
    opponentScore: number(state.opponentScore ?? currentProgress?.score?.[1] ?? campaign.score?.[1], 0),
    currentPenaltyNumber: number(state.currentPenaltyNumber ?? state.penaltyNumber, 1),
    suddenDeath: Boolean(state.suddenDeath ?? currentProgress?.suddenDeath ?? false),
    userPensTaken: number(state.userPensTaken, 0),
    opponentPensTaken: number(state.opponentPensTaken, 0),
    userPenaltyGoals: number(state.userPenaltyGoals, 0),
    opponentPenaltyGoals: number(state.opponentPenaltyGoals, 0),
    currentTurn: state.currentTurn || currentProgress?.currentTurn || "user",
    penaltyMarkers: Array.isArray(markers) ? markers.slice(0, 12) : [],
    lastShot: state.lastShot ? { result: state.lastShot.result || state.lastShot.shotResult || null, goal: Boolean(state.lastShot.goal) } : null,
  };
};

const normaliseCurrentCampaign = (campaign = {}, currentProgress = null) => {
  const defaults = createDefaultCurrentCampaign();
  const selectedTeamName = campaign.teamName || campaign.selectedTeamName || campaign.team || campaign.selectedTeam || currentProgress?.team || null;
  const selectedTeamId = campaign.teamId || campaign.selectedTeamId || null;
  const scoreValue = number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints ?? currentProgress?.scoringState?.campaignPoints, 0);
  const phase = campaign.phase || campaign.tournamentPhase || campaign.stage || campaign.roundLabel || currentProgress?.matchStage || "Not Started";
  const status = campaign.status || (campaign.active ? "active" : selectedTeamName || scoreValue > 0 ? "active" : "not_started");
  const matches = Array.isArray(campaign.matches) && campaign.matches.length
    ? campaign.matches.map(compactMatchRow).filter(Boolean)
    : compactMatchesFromProgress(currentProgress || campaign.runtimeSnapshot || {});
  const usedGoldenTicket = Boolean(
    campaign.usedGoldenTicket ??
    campaign.goldenTicketUsed ??
    currentProgress?.usedGoldenTicket ??
    currentProgress?.campaignCosmeticsUsed?.goldenTicket ??
    currentProgress?.campaignCosmeticsUsed?.goldenTicketUsed ??
    false
  );
  const usedGoldenUpgrade = Boolean(
    campaign.usedGoldenUpgrade ||
    campaign.goldenUpgradeUsed ||
    currentProgress?.usedGoldenUpgrade ||
    currentProgress?.campaignCosmeticsUsed?.goldenBall ||
    currentProgress?.campaignCosmeticsUsed?.goldenBoot ||
    currentProgress?.campaignCosmeticsUsed?.goldenGlove ||
    currentProgress?.campaignCosmeticsUsed?.goldenTicket ||
    currentProgress?.campaignCosmeticsUsed?.goldenTicketUsed ||
    usedGoldenTicket
  );

  return {
    ...defaults,
    active: status === "active" || Boolean(campaign.active),
    status,
    teamId: selectedTeamId,
    teamName: selectedTeamName,
    opponent: campaign.opponent || currentProgress?.opponent || null,
    phase,
    round: campaign.round || campaign.roundLabel || phase || null,
    matchId: campaign.matchId || campaign.activeMatch?.matchId || campaign.currentMatchState?.matchId || currentProgress?.currentMatchId || currentProgress?.matchResult?.matchNo || null,
    cupRun: normaliseCupRun(getCupRunSource(campaign.cupRun, campaign.formGuide, campaign.form, currentProgress?.userForm)),
    gameScore: scoreValue,
    score: Array.isArray(campaign.score) ? campaign.score.slice(0, 2) : Array.isArray(currentProgress?.score) ? currentProgress.score.slice(0, 2) : [0, 0],
    usedGoldenUpgrade,
    usedGoldenTicket,
    matches,
    activeMatchId: campaign.activeMatchId || currentProgress?.activeMatchId || campaign.activeMatch?.matchId || currentProgress?.activeMatchSnapshot?.matchId || null,
    activeMatchSnapshot: campaign.activeMatchSnapshot || currentProgress?.activeMatchSnapshot || defaults.activeMatchSnapshot,
    matchResult: campaign.matchResult || currentProgress?.matchResult || null,
    activeMatch: normaliseActiveMatchState(campaign, currentProgress),
    startedAt: campaign.startedAt || currentProgress?.startedAt || null,
    runtimeSnapshot: currentProgress || campaign.runtimeSnapshot || null,
    updatedAt: campaign.updatedAt || null,
  };

};

const isTwoPlayerCurrentCampaignPayload = (campaign = {}, currentProgress = null) => {
  const runtimeSnapshot = campaign?.runtimeSnapshot || currentProgress || {};
  const mode = String(campaign?.mode || runtimeSnapshot?.mode || "").toLowerCase();
  if (mode === "twoplayer" || mode === "two-player" || mode === "two_player") return true;

  const fixtureId = String(
    runtimeSnapshot?.activeMatchSnapshot?.fixtureId ||
      runtimeSnapshot?.activeMatchSnapshot?.id ||
      runtimeSnapshot?.currentKnockoutMatch?.id ||
      runtimeSnapshot?.matchResult?.fixtureId ||
      runtimeSnapshot?.matchResult?.id ||
      campaign?.activeMatchSnapshot?.fixtureId ||
      campaign?.activeMatchSnapshot?.id ||
      campaign?.matchResult?.fixtureId ||
      campaign?.matchResult?.id ||
      "",
  ).toLowerCase();
  if (fixtureId.startsWith("two-player")) return true;

  const stage = String(
    campaign?.phase ||
      campaign?.stage ||
      campaign?.round ||
      runtimeSnapshot?.matchStage ||
      runtimeSnapshot?.stage ||
      "",
  ).toUpperCase();
  const matchResult = campaign?.matchResult || runtimeSnapshot?.matchResult || {};
  const status = String(matchResult?.status || campaign?.status || "").toUpperCase();
  const hasCampaignMatchNumber = Boolean(matchResult?.matchNo || campaign?.matchId || runtimeSnapshot?.matchResult?.matchNo);

  // 2-player is the only flow that uses SHOOTOUT as the saved phase/stage.
  // Campaign fixtures use tournament phases like GROUP STAGE, R32, QF, SF, FINAL.
  // If a browser ever tries to save a SHOOTOUT currentCampaign without a real
  // campaign match number, treat it as throwaway 2-player data and drop it.
  if (stage === "SHOOTOUT" && !hasCampaignMatchNumber) return true;

  return false;
};

const normaliseBestCampaign = (campaign = {}) => {
  const score = number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints, 0);
  const teamName = campaign.teamName || campaign.team || null;
  const phase = campaign.phase || campaign.tournamentPhase || campaign.round || campaign.roundLabel || campaign.stage || campaign.finish || campaign.status || "Not Started";
  const podium = podiumFromResultFields(campaign.podium, campaign.finish, campaign.status, phase, campaign.round, campaign.roundLabel);

  const cosmeticsApplied = normaliseCosmeticsApplied(
    campaign.cosmeticsApplied,
    campaign.activeCosmetics,
    campaign.upgradesApplied,
    campaign.upgradesUsed,
    campaign.usedUpgrades,
    campaign,
  );
  const usedGoldenTicket = Boolean(
    campaign.usedGoldenTicket ||
    campaign.goldenTicketUsed ||
    cosmeticsApplied.goldenTicket
  );
  const usedGoldenUpgrade = Boolean(
    campaign.usedGoldenUpgrade ||
    campaign.goldenUpgradeUsed ||
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    usedGoldenTicket
  );

  return {
    exists: Boolean(teamName || score > 0),
    gameScore: score,
    teamName,
    cupRun: normaliseCupRun(getCupRunSource(campaign.cupRun, campaign.formGuide, campaign.form, campaign.tournamentProgress)),
    phase,
    podium,
    cosmeticsApplied,
    usedGoldenUpgrade,
    usedGoldenTicket,
    completedAt: campaign.completedAt || null,
    updatedAt: campaign.updatedAt || null,
  };
};

const normaliseCareerStats = (stats = {}, legacy = {}) => {
  const s = stats && typeof stats === "object" ? stats : {};
  const old = legacy && typeof legacy === "object" ? legacy : {};
  const matchesPlayed = number(s.matchesPlayed ?? s.totalMatchesPlayed ?? s.totalMatchesCompleted ?? old.matchesPlayed ?? old.totalMatchesPlayed ?? old.totalMatchesCompleted ?? old.matchesCompleted, 0);
  const matchesWon = number(s.matchesWon ?? s.totalMatchesWon ?? old.matchesWon ?? old.totalMatchesWon, 0);
  const matchesDrawn = number(s.matchesDrawn ?? s.totalMatchesDrawn ?? old.matchesDrawn ?? old.totalMatchesDrawn, 0);
  const matchesLost = number(s.matchesLost ?? s.totalMatchesLost ?? old.matchesLost ?? old.totalMatchesLost, 0);
  const goalsScored = number(s.goalsScored ?? s.totalGoals ?? s.totalGoalsScored ?? old.goalsScored ?? old.totalGoals ?? old.totalGoalsScored, 0);
  const goalsConceded = number(s.goalsConceded ?? old.goalsConceded, 0);
  const cupsWon = number(s.cupsWon ?? s.cupWins ?? s.mondayCupsWon ?? s.mondayCupWins ?? old.cupsWon ?? old.cupWins ?? old.mondayCupsWon ?? old.mondayCupWins, 0);
  return {
    matchesPlayed,
    matchesWon,
    matchesDrawn,
    matchesLost,
    goalsScored,
    goalsConceded,
    campaignsCompleted: number(s.campaignsCompleted ?? s.tournamentsCompleted ?? old.campaignsCompleted ?? old.tournamentsCompleted, 0),
    cupsWon,
    runnerUpFinishes: number(s.runnerUpFinishes ?? old.runnerUpFinishes, 0),
    thirdPlaceFinishes: number(s.thirdPlaceFinishes ?? old.thirdPlaceFinishes, 0),
    totalShots: number(s.totalShots ?? s.totalShotsTaken ?? old.totalShots ?? old.totalShotsTaken, 0),
    highScore: number(s.highScore ?? s.gameScore ?? old.highScore ?? old.gameScore, 0),
    goalConversionRate: number(s.goalConversionRate ?? s.conversionPercentage ?? old.goalConversionRate ?? old.conversionPercentage, 0),
  };
};


const normaliseFeedback = (feedback = {}) => {
  const source = feedback && typeof feedback === "object" ? feedback : {};
  const ratings = Array.isArray(source.ratings) ? source.ratings : [];
  const latestSource = source.latestRating || source.latest || ratings[ratings.length - 1] || null;
  const latestRating = latestSource && typeof latestSource === "object" ? {
    id: String(latestSource.id || latestSource.createdAt || Date.now()),
    stars: number(latestSource.stars ?? latestSource.rating, 0),
    rating: number(latestSource.rating ?? latestSource.stars, 0),
    comment: String(latestSource.comment || "").slice(0, 280),
    promptType: latestSource.promptType || source.lastPromptType || "prompt1",
    campaignsCompleted: number(latestSource.campaignsCompleted, 0),
    cupsWon: number(latestSource.cupsWon, 0),
    createdAt: latestSource.createdAt || source.lastSubmittedAt || Date.now(),
  } : null;
  return {
    prompt1Shown: Boolean(source.prompt1Shown),
    prompt2Shown: Boolean(source.prompt2Shown),
    hasSubmitted: Boolean(source.hasSubmitted || latestRating),
    latestRating: latestRating && latestRating.rating >= 1 && latestRating.rating <= 5 ? latestRating : null,
    lastPromptType: source.lastPromptType || latestRating?.promptType || null,
    lastPromptedAt: source.lastPromptedAt || null,
    lastSubmittedAt: source.lastSubmittedAt || latestRating?.createdAt || null,
  };
};

const careerStatsUiAliases = (careerStats = {}) => ({
  ...careerStats,
  totalMatchesPlayed: careerStats.matchesPlayed,
  allTimeMatchesPlayed: careerStats.matchesPlayed,
  totalMatchesCompleted: careerStats.matchesPlayed,
  matchesCompleted: careerStats.matchesPlayed,
  totalMatchesWon: careerStats.matchesWon,
  allTimeMatchesWon: careerStats.matchesWon,
  totalMatchesDrawn: careerStats.matchesDrawn,
  allTimeMatchesDrawn: careerStats.matchesDrawn,
  totalMatchesLost: careerStats.matchesLost,
  allTimeMatchesLost: careerStats.matchesLost,
  totalGoals: careerStats.goalsScored,
  totalGoalsScored: careerStats.goalsScored,
  allTimeGoals: careerStats.goalsScored,
  totalShotsTaken: careerStats.totalShots,
  allTimeShots: careerStats.totalShots,
  conversionPercentage: careerStats.goalConversionRate,
  mondayCupsWon: careerStats.cupsWon,
  mondayCupWins: careerStats.cupsWon,
  cupWins: careerStats.cupsWon,
  gameScore: careerStats.highScore,
});

const buildUiProfileAliases = ({ profile, shirt, currentCampaign, bestCampaign, careerStats, trophies, stickers, nationCupWins, upgradesPurchased, cosmeticsEquipped, consumables, feedback }) => {
  const legacyShirt = toLegacyShirt(shirt);
  const uiCareerStats = careerStatsUiAliases(careerStats);
  const achievements = buildUiAchievements(trophies);
  return {
    uid: profile.uid,
    email: profile.email,
    username: profile.username,
    usernameLower: String(profile.username || "").toLowerCase(),
    nickname: profile.username,
    nicknameLower: String(profile.username || "").toLowerCase(),
    emailOptIn: Boolean(profile.emailCommsOptIn),
    accountStatus: {
      emailVerified: Boolean(profile.emailVerified),
      verificationRequired: !profile.emailVerified,
    },
    currentCampaign: {
      ...currentCampaign,
      exists: Boolean(currentCampaign.teamName || currentCampaign.gameScore || currentCampaign.active),
      selectedTeamId: currentCampaign.teamId,
      selectedTeamName: currentCampaign.teamName,
      tournamentPhase: currentCampaign.phase,
      formGuide: currentCampaign.cupRun,
      form: currentCampaign.cupRun,
      stage: currentCampaign.phase,
      points: currentCampaign.gameScore,
    },
    bestCampaign: {
      ...bestCampaign,
      exists: Boolean(bestCampaign.teamName || bestCampaign.gameScore),
      team: bestCampaign.teamName,
      tournamentPhase: bestCampaign.phase,
      roundLabel: bestCampaign.phase,
      stage: bestCampaign.phase,
      formGuide: bestCampaign.cupRun,
      form: bestCampaign.cupRun,
      tournamentProgress: bestCampaign.cupRun,
      points: bestCampaign.gameScore,
      campaignPoints: bestCampaign.gameScore,
    },
    currentProgress: currentCampaign.runtimeSnapshot || null,
    careerStats: uiCareerStats,
    stats: uiCareerStats,
    trophies,
    achievements,
    nationCupWins,
    stickers,
    nationStickerProgress: stickers,
    upgradesPurchased,
    allTeamsUnlocked: Boolean(upgradesPurchased.allTeams),
    allTeamsEquipped: Boolean(upgradesPurchased.allTeams),
    unlocks: { allTeams: Boolean(upgradesPurchased.allTeams) },
    cosmeticsEquipped: {
      ...cosmeticsEquipped,
      goldenTicketQuantity: normaliseTicketQuantity(consumables.goldenTicket?.quantity),
    },
    cosmeticsActive: {
      ...cosmeticsEquipped,
      goldenTicketQuantity: normaliseTicketQuantity(consumables.goldenTicket?.quantity),
    },
    cosmetics: {
      ...cosmeticsEquipped,
      goldenTicketQuantity: normaliseTicketQuantity(consumables.goldenTicket?.quantity),
    },
    consumables,
    feedback,
    shirt,
    userShirt: legacyShirt,
    shareShirt: legacyShirt,
  };
};

const normaliseProfile = (user = {}, data = {}) => {
  const src = data.profile || {};
  const username = cleanUsername(src.username || data.username || data.nickname || user.displayName || user.email?.split("@")[0] || "Player");
  return {
    uid: user.uid || src.uid || data.uid || "",
    username,
    email: user.email || src.email || data.email || "",
    emailVerified: Boolean(src.emailVerified ?? data.accountStatus?.emailVerified ?? user.emailVerified ?? false),
    emailCommsOptIn: Boolean(src.emailCommsOptIn ?? data.emailCommsOptIn ?? data.emailOptIn ?? false),
    accountStatus: src.accountStatus || data.accountStatus?.status || "active",
    termsAcceptedAt: src.termsAcceptedAt || data.termsAcceptedAt || null,
    privacyAcceptedAt: src.privacyAcceptedAt || data.privacyAcceptedAt || null,
    createdAt: src.createdAt || data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: src.lastLoginAt || data.lastLoginAt || null,
  };
};

const buildCanonicalProfile = (user, username = "Player", extra = {}) => {
  const profile = normaliseProfile(user, { ...extra, username });
  const consumables = normaliseConsumables(extra.consumables, extra.cosmetics || extra.cosmeticsEquipped || extra.cosmeticsActive || {});
  const upgradesPurchased = normaliseUpgradeMap(extra.upgradesPurchased, {}, extra.unlocks, extra);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(extra.cosmeticsEquipped || extra.cosmeticsActive || extra.cosmetics, {}, consumables, upgradesPurchased);
  const currentCampaign = normaliseCurrentCampaign(extra.currentCampaign, extra.currentProgress);
  const bestCampaign = normaliseBestCampaign(extra.bestCampaign);
  const careerStats = normaliseCareerStats(extra.careerStats, extra.stats);
  const trophies = normaliseTrophies(extra.trophies, extra.achievements);
  const stickers = normaliseStickers(extra.stickers || extra.nationStickerProgress);
  const shirt = normaliseShirt(extra.shirt || extra.userShirt || extra.shareShirt, profile.username);
  const feedback = normaliseFeedback(extra.feedback);
  return {
    profile,
    shirt,
    careerStats,
    currentCampaign,
    bestCampaign,
    upgradesPurchased,
    cosmeticsEquipped,
    consumables,
    trophies,
    stickers,
    nationCupWins: normaliseNationCupWins(extra.nationCupWins),
    feedback,
    updatedAt: serverTimestamp(),
  };
};

export const createDefaultUserProfile = (user, username = "Player", extra = {}) => {
  const canonical = buildCanonicalProfile(user, username, extra);
  return {
    ...canonical,
    createdAt: serverTimestamp(),
    ...buildUiProfileAliases(canonical),
  };
};

const LEGACY_TOP_LEVEL_FIELDS = [
  "achievements",
  "nationStickerProgress",
  "userShirt",
  "shareShirt",
  "stats",
  "unlocks",
  "allTeamsEquipped",
  "allTeamsUnlocked",
  "cosmeticsActive",
  "cosmetics",
  "currentProgress",
  "emailOptIn",
  "nickname",
  "nicknameLower",
  "username",
  "usernameLower",
  "email",
  "accountStatus",
];

const LEGACY_NESTED_FIELDS = [
  "profile.usernameLower",
  "currentCampaign.formGuide",
  "currentCampaign.form",
  "currentCampaign.selectedTeamId",
  "currentCampaign.selectedTeamName",
  "currentCampaign.tournamentPhase",
  "currentCampaign.stage",
  "bestCampaign.formGuide",
  "bestCampaign.form",
  "bestCampaign.tournamentProgress",
  "bestCampaign.tournamentPhase",
  "bestCampaign.stage",
  "bestCampaign.roundLabel",
  "bestCampaign.points",
  "bestCampaign.campaignPoints",
  "bestCampaign.teamId",
  "bestCampaign.finish",
  "bestCampaign.status",
  "bestCampaign.groupPosition",
  "bestCampaign.team",
  "bestCampaign.round",
  "bestCampaign.cosmeticsApplied",
  "bestCampaign.activeCosmetics",
  "bestCampaign.upgradesApplied",
  "bestCampaign.upgradesUsed",
  "bestCampaign.usedUpgrades",
  "bestCampaign.usedGoldenUpgrade",
  "bestCampaign.goldenUpgradeUsed",
  "bestCampaign.cosmeticBootEquipped",
  "bestCampaign.cosmeticBallEquipped",
  "bestCampaign.cosmeticGloveEquipped",
  "bestCampaign.goldenTicketUsed",
  "feedback.ratings",
];

const buildLegacyDeleteUpdate = () => {
  const update = {};
  [...LEGACY_TOP_LEVEL_FIELDS, ...LEGACY_NESTED_FIELDS].forEach((key) => {
    update[key] = deleteField();
  });
  LEGACY_ACHIEVEMENT_KEYS.forEach((key) => {
    update[`trophies.${key}`] = deleteField();
  });
  return update;
};

const canonicaliseProfileUpdate = (data = {}) => {
  const update = { updatedAt: serverTimestamp() };

  if (hasOwn(data, "profile") || data.username || data.nickname || data.email || hasOwn(data, "emailOptIn") || hasOwn(data, "emailCommsOptIn") || data.accountStatus) {
    const incomingProfile = data.profile || {};
    if (data.uid || incomingProfile.uid) update["profile.uid"] = data.uid || incomingProfile.uid;
    if (data.username || data.nickname || incomingProfile.username) {
      const username = cleanUsername(data.username || data.nickname || incomingProfile.username);
      update["profile.username"] = username;
    }
    if (data.email || incomingProfile.email) update["profile.email"] = data.email || incomingProfile.email;
    if (hasOwn(data, "emailOptIn") || hasOwn(data, "emailCommsOptIn") || hasOwn(incomingProfile, "emailCommsOptIn")) {
      update["profile.emailCommsOptIn"] = Boolean(data.emailCommsOptIn ?? data.emailOptIn ?? incomingProfile.emailCommsOptIn);
    }
    if (hasOwn(data.accountStatus || {}, "emailVerified") || hasOwn(incomingProfile, "emailVerified")) {
      update["profile.emailVerified"] = Boolean(data.accountStatus?.emailVerified ?? incomingProfile.emailVerified);
    }
    update["profile.updatedAt"] = serverTimestamp();
  }
  if (hasOwn(data, "shirt") || hasOwn(data, "userShirt") || hasOwn(data, "shareShirt")) {
    update.shirt = normaliseShirt(data.shirt || data.userShirt || data.shareShirt, data.username || data.nickname || "Player");
  }
  if (hasOwn(data, "careerStats") || hasOwn(data, "stats")) {
    update.careerStats = normaliseCareerStats(data.careerStats, data.stats);
  }
  if (hasOwn(data, "currentCampaign") || hasOwn(data, "currentProgress")) {
    if (!isTwoPlayerCurrentCampaignPayload(data.currentCampaign || {}, data.currentProgress || null)) {
      update.currentCampaign = normaliseCurrentCampaign(data.currentCampaign, data.currentProgress);
    }
  }
  if (hasOwn(data, "bestCampaign")) {
    update.bestCampaign = normaliseBestCampaign(data.bestCampaign);
  }
  if (hasOwn(data, "upgradesPurchased") || data.unlocks?.allTeams === true || data.allTeamsEquipped === true || data.allTeamsUnlocked === true) {
    update.upgradesPurchased = normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks, data);
  }
  if (hasOwn(data, "consumables")) {
    update.consumables = normaliseConsumables(data.consumables, data.cosmetics || {});
  }
  if (hasOwn(data, "cosmeticsEquipped") || hasOwn(data, "cosmeticsActive") || hasOwn(data, "cosmetics")) {
    const upgrades = update.upgradesPurchased || normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks, data);
    const consumables = update.consumables || normaliseConsumables(data.consumables, data.cosmetics || data.cosmeticsEquipped || data.cosmeticsActive || {});
    update.cosmeticsEquipped = normaliseCosmeticsEquipped(data.cosmeticsEquipped || data.cosmeticsActive || data.cosmetics, {}, consumables, upgrades);
  }
  if (hasOwn(data, "trophies") || hasOwn(data, "achievements")) {
    update.trophies = normaliseTrophies(data.trophies, data.achievements);
  }
  if (hasOwn(data, "stickers") || hasOwn(data, "nationStickerProgress")) {
    update.stickers = normaliseStickers(data.stickers || data.nationStickerProgress);
  }
  if (hasOwn(data, "nationCupWins")) {
    update.nationCupWins = normaliseNationCupWins(data.nationCupWins);
  }
  if (hasOwn(data, "feedback")) {
    update.feedback = normaliseFeedback(data.feedback);
  }

  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
  return update;
};

const canonicalFromFirestore = (uid, data = {}) => {
  const user = { uid, email: data.profile?.email || data.email || "", emailVerified: data.profile?.emailVerified ?? data.accountStatus?.emailVerified };
  const profile = normaliseProfile(user, data);
  const consumables = normaliseConsumables(data.consumables, data.cosmetics || data.cosmeticsEquipped || data.cosmeticsActive || {});
  const upgradesPurchased = normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks, data);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(data.cosmeticsEquipped || data.cosmeticsActive || data.cosmetics, {}, consumables, upgradesPurchased);
  const rawCurrentCampaignIsTwoPlayer = isTwoPlayerCurrentCampaignPayload(data.currentCampaign || {}, data.currentProgress || null);
  const canonical = {
    profile,
    shirt: normaliseShirt(data.shirt || data.userShirt || data.shareShirt, profile.username),
    careerStats: normaliseCareerStats(data.careerStats, data.stats),
    currentCampaign: rawCurrentCampaignIsTwoPlayer
      ? normaliseCurrentCampaign({
          active: false,
          status: "CLEARED_TWO_PLAYER",
          teamName: null,
          opponent: null,
          phase: "Not Started",
          gameScore: 0,
          cupRun: [],
          runtimeSnapshot: null,
        })
      : normaliseCurrentCampaign(data.currentCampaign, data.currentProgress),
    bestCampaign: normaliseBestCampaign(data.bestCampaign),
    upgradesPurchased,
    cosmeticsEquipped,
    consumables,
    trophies: normaliseTrophies(data.trophies, data.achievements),
    stickers: normaliseStickers(data.stickers || data.nationStickerProgress),
    nationCupWins: normaliseNationCupWins(data.nationCupWins),
    feedback: normaliseFeedback(data.feedback),
    updatedAt: serverTimestamp(),
  };
  return canonical;
};

const repairUserDocument = async (uid, canonical) => {
  if (!uid || !db) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, canonical, { merge: true }).catch(() => {});
  await updateDoc(ref, buildLegacyDeleteUpdate()).catch(() => {});
};

export async function ensureUserDocument(user, username = "Player", extra = {}) {
  if (!user?.uid || !db) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const displayName = username || user.displayName || user.email?.split("@")[0] || "Player";

  if (!snap.exists()) {
    const canonical = buildCanonicalProfile(user, displayName, extra);
    await setDoc(ref, { ...canonical, createdAt: serverTimestamp() });
    return { id: user.uid, ...canonical, ...buildUiProfileAliases(canonical) };
  }

  const existing = snap.data() || {};
  const canonical = canonicalFromFirestore(user.uid, { ...existing, ...extra, profile: { ...(existing.profile || {}), email: user.email || existing.profile?.email || existing.email || "", emailVerified: user.emailVerified ?? existing.profile?.emailVerified } });
  canonical.profile.username = cleanUsername(displayName || canonical.profile.username);
  await repairUserDocument(user.uid, canonical);
  return { id: user.uid, ...canonical, ...buildUiProfileAliases(canonical) };
}

export async function loadUserProfile(uid) {
  if (!uid || !db) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const canonical = canonicalFromFirestore(uid, snap.data() || {});
  await repairUserDocument(uid, canonical);
  return { id: uid, ...canonical, ...buildUiProfileAliases(canonical) };
}

export async function saveUserProfile(uid, data = {}) {
  if (!uid || !db) return;
  const update = canonicaliseProfileUpdate({ ...data, uid });
  await setDoc(doc(db, "users", uid), update, { merge: true });
  await updateDoc(doc(db, "users", uid), buildLegacyDeleteUpdate()).catch(() => {});
}

export async function saveUserShirtProfile(uid, shirt = {}) {
  if (!uid || !db) return;
  await setDoc(doc(db, "users", uid), { shirt: normaliseShirt(shirt, shirt.name || shirt.playerName || "GUEST"), updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), {
    userShirt: deleteField(),
    shareShirt: deleteField(),
  }).catch(() => {});
}

export async function unlockTrophy(uid, trophyKey) {
  if (!uid || !trophyKey || !db) return;
  const path = getTrophyPath(trophyKey);
  if (!path) return;
  await setDoc(doc(db, "users", uid), { [path]: true, updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), buildLegacyDeleteUpdate()).catch(() => {});
}

export async function saveCosmeticActive(uid, cosmeticKey, active = true) {
  if (!uid || !cosmeticKey || !db) return;
  if (!["goldenBoot", "goldenBall", "goldenGlove"].includes(cosmeticKey)) return;
  await setDoc(doc(db, "users", uid), { [`cosmeticsEquipped.${cosmeticKey}`]: Boolean(active), updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { [`cosmeticsActive.${cosmeticKey}`]: deleteField(), [`cosmetics.${cosmeticKey}`]: deleteField() }).catch(() => {});
}
export const saveCosmeticEquipped = saveCosmeticActive;


export async function consumeGoldenTicket(uid, currentQuantity = 1) {
  if (!uid || !db) return;
  const nextQuantity = normaliseTicketQuantity(number(currentQuantity, 0) - 1);
  await setDoc(doc(db, "users", uid), {
    "consumables.goldenTicket.quantity": nextQuantity,
    "consumables.goldenTicket.totalUsed": increment(1),
    "consumables.goldenTicket.lastUsedAt": serverTimestamp(),
    "cosmeticsEquipped.goldenTicket": nextQuantity > 0,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await updateDoc(doc(db, "users", uid), { "cosmeticsActive.goldenTicket": deleteField(), "cosmetics.goldenTicket": deleteField(), "cosmetics.goldenTicketQuantity": deleteField() }).catch(() => {});
}


export async function saveCheckoutStarted(uid, checkout = {}) {
  if (!uid || !db) return;
  await setDoc(doc(db, "users", uid), {
    stripe: {
      ...(checkout.customerId ? { customerId: checkout.customerId } : {}),
      lastCheckoutSessionId: checkout.sessionId || null,
      lastPurchaseAt: null,
    },
    lastCheckoutStarted: {
      ...checkout,
      startedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

function hasGoldenKitbagPurchase(profile = {}, upgrades = {}) {
  if (upgrades.goldenKitbag || upgrades.fullBundle) return true;
  const selectedItems = profile?.lastPurchase?.selectedItems;
  if (Array.isArray(selectedItems)) {
    return selectedItems.some((item) => {
      if (typeof item === "string") return item === "fullBundle" || item === "goldenKitbag";
      return item?.itemId === "fullBundle" || item?.id === "fullBundle" || item?.itemId === "goldenKitbag";
    });
  }
  return false;
}

export function buildStoreEntitlements(profile = {}) {
  const upgrades = normaliseUpgradeMap(profile.upgradesPurchased, {}, profile.unlocks, profile);
  const consumables = normaliseConsumables(profile.consumables, profile.cosmetics || {});
  const goldenKitbag = hasGoldenKitbagPurchase(profile, upgrades);
  return {
    allTeams: Boolean(upgrades.allTeams),
    goldenBall: Boolean(upgrades.goldenBall),
    goldenBoot: Boolean(upgrades.goldenBoot),
    goldenGlove: Boolean(upgrades.goldenGlove),
    goldenKitbag,
    fullBundle: goldenKitbag,
    goldenTicket: normaliseTicketQuantity(consumables.goldenTicket?.quantity) > 0,
    goldenTicketQty: normaliseTicketQuantity(consumables.goldenTicket?.quantity),
  };
}

export async function saveCurrentProgress(uid, snapshot = null) {
  if (!uid || !db) return;
  if (!snapshot || snapshot.mode !== "campaign" || isTwoPlayerCurrentCampaignPayload(snapshot?.currentCampaign || {}, snapshot)) {
    return;
  }
  const currentCampaign = normaliseCurrentCampaign(snapshot?.currentCampaign || {}, snapshot);
  await setDoc(doc(db, "users", uid), { currentCampaign, updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { currentProgress: deleteField() }).catch(() => {});
}

export async function clearCurrentProgress(uid, reason = "cleared") {
  if (!uid || !db) return;
  await setDoc(
    doc(db, "users", uid),
    {
      currentCampaign: {
        active: false,
        status: String(reason || "cleared").toUpperCase(),
        teamName: null,
        opponent: null,
        phase: "Not Started",
        gameScore: 0,
        cupRun: [],
        score: [0, 0],
        usedGoldenUpgrade: false,
        usedGoldenTicket: false,
        matchResult: null,
        runtimeSnapshot: null,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await updateDoc(doc(db, "users", uid), { currentProgress: deleteField() }).catch(() => {});
}

export async function loadCurrentProgress(uid) {
  const profile = await loadUserProfile(uid);
  return profile?.currentCampaign?.runtimeSnapshot || profile?.currentProgress || profile?.savedGames?.current || null;
}

function leaderboardScoreOf(row = {}) {
  return number(row.gameScore ?? row.campaignPoints ?? row.points ?? row.bestCampaign?.gameScore ?? row.bestCampaign?.campaignPoints ?? row.bestCampaign?.points, 0);
}

function leaderboardUsesUpgrade(row = {}) {
  return usesLeaderboardUpgrade(row);
}

function isGuestLeaderboardRow(row = {}) {
  const userId = String(row.userId || row.uid || row.id || "");
  return Boolean(row.localOnly || row.isUserPreview || userId === "guest-local" || userId === "guest-preview");
}

function chooseBetterLeaderboardRow(existing, incoming) {
  if (!incoming) return existing || null;
  if (!existing) return incoming;

  const incomingScore = leaderboardScoreOf(incoming);
  const existingScore = leaderboardScoreOf(existing);
  if (incomingScore > existingScore) return incoming;
  if (incomingScore < existingScore) return existing;

  const incomingHasCosmetics = leaderboardUsesUpgrade(incoming);
  const existingHasCosmetics = leaderboardUsesUpgrade(existing);
  if (existingHasCosmetics !== incomingHasCosmetics) {
    // Same score: keep the clean/non-upgraded campaign as the better public row.
    // A later cosmetic campaign must not relabel an older clean best score.
    return existingHasCosmetics ? incoming : existing;
  }

  const incomingCompletedAt = incoming.completedAt || incoming.bestCampaign?.completedAt || "";
  const existingCompletedAt = existing.completedAt || existing.bestCampaign?.completedAt || "";
  if (String(incomingCompletedAt) > String(existingCompletedAt)) return incoming;

  return existing;
}

function normaliseLeaderboardEntry(uid, entry = {}) {
  const rawBestCampaign = entry.bestCampaign || { ...entry };
  const bestCampaign = normaliseBestCampaign(rawBestCampaign);
  const cupRun = normaliseCupRun(getCupRunSource(
    entry.cupRun,
    rawBestCampaign.cupRun,
    entry.formGuide,
    entry.form,
    entry.tournamentProgress,
    rawBestCampaign.formGuide,
    rawBestCampaign.form,
    rawBestCampaign.tournamentProgress,
  ));
  const gameScore = number(entry.gameScore ?? entry.campaignPoints ?? entry.points ?? bestCampaign.gameScore, 0);
  const teamName = entry.teamName || entry.team || entry.teamFlag || bestCampaign.teamName || "";
  const finish = normalizeResultStatus(entry.status || entry.finish || rawBestCampaign.status || rawBestCampaign.finish || "inProgress");
  const hasCompletionEvidence = Boolean(entry.completedAt || rawBestCampaign.completedAt || bestCampaign.completedAt);
  if (!uid || gameScore <= 0 || (!isTerminalResultStatus(finish) && !hasCompletionEvidence)) return null;

  const storedFinish = isTerminalResultStatus(finish) ? finish : "completed";
  const podiumCanonical = podiumFromResultFields(entry.podium, bestCampaign.podium, storedFinish, rawBestCampaign.phase, rawBestCampaign.round);
  const podium = leaderboardPodiumFromCanonical(podiumCanonical);
  const hasNestedBestCampaign = Boolean(entry.bestCampaign && typeof entry.bestCampaign === "object");
  const upgradeSources = hasNestedBestCampaign
    ? [
        rawBestCampaign,
        rawBestCampaign.cosmeticsApplied,
        rawBestCampaign.activeCosmetics,
        rawBestCampaign.upgradesApplied,
        rawBestCampaign.upgradesUsed,
        rawBestCampaign.usedUpgrades,
      ]
    : [
        entry,
        entry.cosmeticsApplied,
        entry.activeCosmetics,
        entry.upgradesApplied,
        entry.upgradesUsed,
        entry.usedUpgrades,
        rawBestCampaign,
        rawBestCampaign.cosmeticsApplied,
        rawBestCampaign.activeCosmetics,
        rawBestCampaign.upgradesApplied,
        rawBestCampaign.upgradesUsed,
        rawBestCampaign.usedUpgrades,
      ];
  const cosmeticsApplied = normaliseCosmeticsApplied(...upgradeSources);
  const usedGoldenTicket = Boolean(
    cosmeticsApplied.goldenTicket ||
    upgradeSources.some((source) => truthyCosmeticValue(source?.usedGoldenTicket) || truthyCosmeticValue(source?.goldenTicketUsed))
  );
  const usedGoldenUpgrade = Boolean(
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    usedGoldenTicket ||
    upgradeSources.some(genericUpgradeFlagFromSource)
  );

  return {
    uid,
    userId: uid,
    username: cleanUsername(entry.username || entry.nickname || "PLAYER").toUpperCase(),
    teamId: entry.teamId || bestCampaign.teamId || null,
    teamName,
    team: teamName,
    teamFlag: teamName,
    gameScore,
    campaignPoints: gameScore,
    points: gameScore,
    cupRun,
    formGuide: cupRun,
    form: cupRun,
    tournamentProgress: cupRun,
    finish: storedFinish,
    status: storedFinish,
    podium,
    podiumAchieved: Boolean(podium || /champion|runner|third/i.test(storedFinish)),
    cosmeticsApplied,
    activeCosmetics: cosmeticsApplied,
    upgradesApplied: cosmeticsApplied,
    usedUpgrades: cosmeticsApplied,
    usedGoldenUpgrade,
    usedGoldenTicket,
    goldenUpgradeUsed: usedGoldenUpgrade,
    goldenTicketUsed: usedGoldenTicket,
    cosmeticBootEquipped: Boolean(cosmeticsApplied.goldenBoot),
    cosmeticBallEquipped: Boolean(cosmeticsApplied.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmeticsApplied.goldenGlove),
    completedAt: entry.completedAt || bestCampaign.completedAt || null,
    round: rawBestCampaign.round || rawBestCampaign.roundLabel || rawBestCampaign.stage || rawBestCampaign.phase || storedFinish,
    phase: rawBestCampaign.phase || rawBestCampaign.roundLabel || rawBestCampaign.stage || storedFinish,
  };
}

export async function saveLeaderboardHighScore(uid, entry = {}) {
  if (!uid || !db) return;
  const row = normaliseLeaderboardEntry(uid, entry);
  if (!row || row.localOnly || uid === "guest-local" || uid === "guest-preview") return;

  const leaderboardRef = doc(db, "leaderboard", uid);
  const existingSnap = await getDoc(leaderboardRef).catch(() => null);
  const existingRow = existingSnap?.exists?.()
    ? buildLeaderboardRowFromData(uid, existingSnap.data() || {}, "leaderboard")
    : null;
  const bestRow = chooseBetterLeaderboardRow(existingRow, row);
  if (bestRow !== row) return;

  const completedAt = row.completedAt || serverTimestamp();
  const podiumCanonical = podiumFromResultFields(row.podium, row.finish, row.phase, row.round);

  await setDoc(leaderboardRef, {
    uid,
    userId: uid,
    username: row.username,
    teamName: row.teamName || "",
    team: row.teamName || "",
    teamFlag: row.teamName || "",
    gameScore: row.gameScore,
    cupRun: row.cupRun,
    round: row.round || row.phase || row.finish || "completed",
    phase: row.phase || row.round || row.finish || "completed",
    podium: podiumCanonical,
    usedGoldenUpgrade: Boolean(row.usedGoldenUpgrade || row.goldenUpgradeUsed || row.usedGoldenTicket || row.goldenTicketUsed),
    usedGoldenTicket: Boolean(row.usedGoldenTicket || row.goldenTicketUsed),
    completedAt,
    updatedAt: serverTimestamp(),
    localOnly: false,
  }, { merge: true });

  await updateDoc(leaderboardRef, {
    highScore: deleteField(),
    emailVerified: deleteField(),
    accountStatus: deleteField(),
    campaignPoints: deleteField(),
    points: deleteField(),
    formGuide: deleteField(),
    form: deleteField(),
    tournamentProgress: deleteField(),
    teamId: deleteField(),
    finish: deleteField(),
    status: deleteField(),
    cosmeticsApplied: deleteField(),
    activeCosmetics: deleteField(),
    upgradesApplied: deleteField(),
    usedUpgrades: deleteField(),
    goldenUpgradeUsed: deleteField(),
    cosmeticBootEquipped: deleteField(),
    cosmeticBallEquipped: deleteField(),
    cosmeticGloveEquipped: deleteField(),
    goldenTicketUsed: deleteField(),
    bestCampaign: deleteField(),
    "bestCampaign.formGuide": deleteField(),
    "bestCampaign.form": deleteField(),
    "bestCampaign.tournamentProgress": deleteField(),
    "bestCampaign.points": deleteField(),
    "bestCampaign.campaignPoints": deleteField(),
    "bestCampaign.teamId": deleteField(),
    "bestCampaign.finish": deleteField(),
    "bestCampaign.status": deleteField(),
    "bestCampaign.groupPosition": deleteField(),
    "bestCampaign.cosmeticsApplied": deleteField(),
    "bestCampaign.activeCosmetics": deleteField(),
    "bestCampaign.upgradesApplied": deleteField(),
    "bestCampaign.usedUpgrades": deleteField(),
    "bestCampaign.usedGoldenUpgrade": deleteField(),
    "bestCampaign.goldenUpgradeUsed": deleteField(),
    "bestCampaign.cosmeticBootEquipped": deleteField(),
    "bestCampaign.cosmeticBallEquipped": deleteField(),
    "bestCampaign.cosmeticGloveEquipped": deleteField(),
    "bestCampaign.goldenTicketUsed": deleteField(),
  }).catch(() => {});
}

function buildLeaderboardRowFromData(id, data = {}, source = "leaderboard") {
  const userId = data.uid || data.userId || id;
  if (!userId || userId === "guest-preview" || data.localOnly) return null;

  const bestCampaign = normaliseBestCampaign(data.bestCampaign || {});
  const finish = normalizeResultStatus(data.finish || data.status || bestCampaign.finish || "inProgress");
  const completedAt = data.completedAt || bestCampaign.completedAt || null;
  const hasCompletedBestCampaign = Boolean(completedAt || isTerminalResultStatus(finish));
  if (source === "users" && !hasCompletedBestCampaign) return null;

  const cupRun = normaliseCupRun(getCupRunSource(
    data.cupRun,
    data.formGuide,
    data.form,
    data.tournamentProgress,
    bestCampaign.cupRun,
    data.bestCampaign?.formGuide,
    data.bestCampaign?.form,
    data.bestCampaign?.tournamentProgress,
  ));
  const gameScore = leaderboardScoreOf({ ...data, bestCampaign });
  if (gameScore <= 0) return null;

  const profile = data.profile || {};
  const teamName = data.teamName || data.team || data.teamFlag || bestCampaign.teamName || data.bestCampaign?.team || "";
  const podiumCanonical = podiumFromResultFields(data.podium, bestCampaign.podium, finish, data.phase, data.round, data.bestCampaign?.phase, data.bestCampaign?.round);
  const podium = leaderboardPodiumFromCanonical(podiumCanonical);
  const username = cleanUsername(data.username || profile.username || data.nickname || "PLAYER").toUpperCase();
  const dataBestCampaign = data.bestCampaign && typeof data.bestCampaign === "object" ? data.bestCampaign : {};
  const upgradeSources = source === "users" && Object.keys(dataBestCampaign).length
    ? [
        dataBestCampaign,
        dataBestCampaign.cosmeticsApplied,
        dataBestCampaign.activeCosmetics,
        dataBestCampaign.upgradesApplied,
        dataBestCampaign.upgradesUsed,
        dataBestCampaign.usedUpgrades,
      ]
    : [
        data,
        data.cosmeticsApplied,
        data.activeCosmetics,
        data.upgradesApplied,
        data.upgradesUsed,
        data.usedUpgrades,
        dataBestCampaign,
        dataBestCampaign.cosmeticsApplied,
        dataBestCampaign.activeCosmetics,
        dataBestCampaign.upgradesApplied,
        dataBestCampaign.upgradesUsed,
        dataBestCampaign.usedUpgrades,
      ];
  const cosmeticsApplied = normaliseCosmeticsApplied(...upgradeSources);
  const usedGoldenTicket = Boolean(
    cosmeticsApplied.goldenTicket ||
    upgradeSources.some((source) => truthyCosmeticValue(source?.usedGoldenTicket) || truthyCosmeticValue(source?.goldenTicketUsed))
  );
  const usedGoldenUpgrade = Boolean(
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    usedGoldenTicket ||
    upgradeSources.some(genericUpgradeFlagFromSource)
  );

  return {
    id,
    uid: userId,
    userId,
    username,
    teamId: data.teamId || bestCampaign.teamId || null,
    teamName,
    teamFlag: teamName,
    team: teamName,
    gameScore,
    campaignPoints: gameScore,
    points: gameScore,
    cupRun,
    formGuide: cupRun,
    form: cupRun,
    tournamentProgress: cupRun,
    finish,
    status: finish,
    podium,
    podiumAchieved: Boolean(podium || /champion|runner|third/i.test(String(finish))),
    completedAt,
    updatedAt: data.updatedAt || null,
    cosmeticsApplied,
    activeCosmetics: cosmeticsApplied,
    upgradesApplied: cosmeticsApplied,
    usedUpgrades: cosmeticsApplied,
    usedGoldenUpgrade,
    usedGoldenTicket,
    goldenUpgradeUsed: usedGoldenUpgrade,
    goldenTicketUsed: usedGoldenTicket,
    cosmeticBootEquipped: Boolean(cosmeticsApplied.goldenBoot),
    cosmeticBallEquipped: Boolean(cosmeticsApplied.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmeticsApplied.goldenGlove),
    bestCampaign: {
      exists: Boolean(teamName || gameScore > 0),
      gameScore,
      teamName,
      team: teamName,
      cupRun,
      phase: data.bestCampaign?.phase || bestCampaign.phase || finish,
      round: data.bestCampaign?.round || bestCampaign.round || data.bestCampaign?.phase || bestCampaign.phase || finish,
      podium: podiumCanonical,
      cosmeticsApplied,
      usedGoldenUpgrade,
      usedGoldenTicket,
      completedAt,
      updatedAt: data.bestCampaign?.updatedAt || bestCampaign.updatedAt || data.updatedAt || null,
    },
  };
}

function normalisePublicLeaderboardApiBase(value = "") {
  const base = String(value || "").trim();
  return base ? base.replace(/\/+$/, "") : "";
}

function publicLeaderboardApiUrls(limitCount = 50) {
  if (typeof window === "undefined") return [];
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limitCount || 50)) || 50));
  const queryString = `limit=${encodeURIComponent(safeLimit)}`;
  const urls = [];
  const configuredBase = normalisePublicLeaderboardApiBase(import.meta?.env?.VITE_PUBLIC_LEADERBOARD_API_BASE || import.meta?.env?.VITE_LEADERBOARD_API_BASE || "");

  if (configuredBase) urls.push(`${configuredBase}/api/leaderboard?${queryString}`);
  urls.push(`/api/leaderboard?${queryString}`);

  const host = String(window.location?.hostname || "").toLowerCase();
  const isLocalDev = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  if (isLocalDev) urls.push(`https://mondaycup.co.uk/api/leaderboard?${queryString}`);

  return Array.from(new Set(urls));
}

async function loadPublicLeaderboardRowsFromApi(limitCount = 50) {
  if (typeof window === "undefined" || typeof fetch !== "function") return [];
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limitCount || 50)) || 50));
  const errors = [];

  for (const url of publicLeaderboardApiUrls(safeLimit)) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Public leaderboard API failed (${response.status})`);
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      const normalisedRows = rows
        .map((row) => buildLeaderboardRowFromData(row.id || row.userId || row.uid, row, "leaderboard") || row)
        .filter(Boolean)
        .sort((a, b) => leaderboardScoreOf(b) - leaderboardScoreOf(a))
        .slice(0, safeLimit);
      if (normalisedRows.length) return normalisedRows;
    } catch (error) {
      errors.push(`${url}: ${error?.message || error}`);
    }
  }

  if (errors.length) console.warn("Public leaderboard API load failed", errors.join(" | "));
  return [];
}

export async function loadLeaderboardRows(limitCount = 50) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limitCount || 50)) || 50));
  const bestByUser = new Map();

  const addRow = (row) => {
    if (!row || isGuestLeaderboardRow(row)) return;
    const userKey = row.userId || row.uid || row.id;
    if (!userKey) return;
    const normalisedRow = { ...row, userId: userKey, uid: row.uid || userKey };
    bestByUser.set(userKey, chooseBetterLeaderboardRow(bestByUser.get(userKey), normalisedRow));
  };

  const addRows = (rows = []) => rows.forEach(addRow);

  // First choice: the public Firestore /leaderboard collection. This is the
  // canonical global leaderboard and should be readable by signed-in users and guests.
  if (db) {
    const leaderboardQueries = [
      query(collection(db, "leaderboard"), orderBy("gameScore", "desc"), limit(safeLimit)),
      query(collection(db, "leaderboard"), orderBy("campaignPoints", "desc"), limit(safeLimit)),
      query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(safeLimit)),
      query(collection(db, "leaderboard"), limit(safeLimit)),
    ];

    for (const leaderboardQuery of leaderboardQueries) {
      try {
        const snap = await getDocs(leaderboardQuery);
        addRows(snap.docs.map((item) => buildLeaderboardRowFromData(item.id, item.data() || {}, "leaderboard")));
        if (bestByUser.size) break;
      } catch (error) {
        console.warn("Published leaderboard query failed", error);
      }
    }
  }

  // Enrich with public server API rows. This does not sign guests in anonymously.
  // The API can merge legacy users/{uid}.bestCampaign metadata into public rows
  // so the golden upgrade filter still works for older published scores.
  addRows(await loadPublicLeaderboardRowsFromApi(safeLimit));

  // Signed-in recovery only. If an old account still has its best score only in
  // users/{uid}, publish that signed-in user's best campaign back to /leaderboard.
  if (auth.currentUser?.uid && db) {
    try {
      const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const row = profileSnap.exists()
        ? buildLeaderboardRowFromData(auth.currentUser.uid, { ...(profileSnap.data() || {}), uid: auth.currentUser.uid }, "users")
        : null;
      if (row) {
        addRow(row);
        await saveLeaderboardHighScore(auth.currentUser.uid, row).catch((error) => console.warn("Own leaderboard publish repair failed", error));
      }
    } catch (error) {
      console.warn("Signed-in leaderboard repair failed", error);
    }
  }

  return Array.from(bestByUser.values())
    .sort((a, b) => leaderboardScoreOf(b) - leaderboardScoreOf(a))
    .slice(0, safeLimit);
}

export async function isNicknameTaken(nickname, uidToIgnore = null) {
  const clean = String(nickname || "").trim().toLowerCase();
  if (!clean || !db) return false;
  const reservedSnap = await getDoc(doc(db, "usernames", clean)).catch(() => null);
  if (reservedSnap?.exists()) return reservedSnap.data()?.uid !== uidToIgnore;
  const snap = await getDocs(query(collection(db, "users"), limit(250))).catch(() => null);
  return Boolean(snap?.docs?.some((item) => item.id !== uidToIgnore && String(item.data()?.profile?.username || "").trim().toLowerCase() === clean));
}

export async function saveUserNickname(uid, username) {
  const clean = cleanUsername(username).toUpperCase();
  if (!uid || !clean || !db) return;
  await setDoc(doc(db, "users", uid), {
    "profile.username": clean,
    "profile.updatedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await updateDoc(doc(db, "users", uid), { username: deleteField(), usernameLower: deleteField(), nickname: deleteField(), nicknameLower: deleteField() }).catch(() => {});
  await setDoc(doc(db, "leaderboard", uid), { username: clean, updatedAt: serverTimestamp() }, { merge: true });
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

export async function saveUserFeedback(uid, feedback = {}, latestRating = null) {
  if (!uid || !db) return;
  const nextFeedback = normaliseFeedback(feedback);
  const latest = latestRating ? normaliseFeedback({ ratings: [latestRating] }).ratings[0] || null : nextFeedback.latestRating || null;
  await setDoc(doc(db, "users", uid), {
    feedback: nextFeedback,
    ...(latest ? { feedbackLatest: latest } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function incrementTournamentsStarted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = number(profile?.careerStats?.campaignsCompleted ?? 0, 0);
  await setDoc(doc(db, "users", uid), { "careerStats.campaignsCompleted": current + number(amount, 1), updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { "stats.tournamentsStarted": deleteField() }).catch(() => {});
}

export async function incrementTotalMatchesCompleted(uid, amount = 1) {
  if (!uid || !db) return;
  const profile = await loadUserProfile(uid);
  const current = number(profile?.careerStats?.matchesPlayed ?? 0, 0);
  await setDoc(doc(db, "users", uid), { "careerStats.matchesPlayed": current + number(amount, 1), updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { "stats.totalMatchesCompleted": deleteField(), "stats.matchesCompleted": deleteField() }).catch(() => {});
}
