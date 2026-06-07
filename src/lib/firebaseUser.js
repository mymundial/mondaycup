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
  penaltyLog: [],
  lastShot: null,
  resultModal: null,
});

export const createDefaultCurrentCampaign = () => ({
  active: false,
  status: "not_started",
  teamId: null,
  teamName: null,
  phase: "Not Started",
  round: null,
  matchId: null,
  groupId: null,
  groupPosition: null,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  cupRun: normaliseCupRun(),
  gameScore: 0,
  groupStageResults: createEmptyResultMap(GROUP_STAGE_MATCH_START, GROUP_STAGE_MATCH_END),
  knockoutResults: createEmptyResultMap(KNOCKOUT_MATCH_START, KNOCKOUT_MATCH_END),
  cosmeticsApplied: emptyBooleanMap(COSMETIC_KEYS),
  currentMatchState: createDefaultCurrentMatchState(),
  startedAt: null,
  runtimeSnapshot: null,
  updatedAt: null,
});

export const createDefaultBestCampaign = () => ({
  teamId: null,
  teamName: null,
  finish: null,
  phase: "Not Started",
  round: null,
  groupPosition: null,
  cupRun: normaliseCupRun(),
  gameScore: 0,
  podium: null,
  cosmeticsApplied: emptyBooleanMap(COSMETIC_KEYS),
  completedAt: null,
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

const stickerDefaults = () => ({
  wearTheShirt: false,
  flyTheFlag: false,
  liftTheCup: false,
  safeHands: false,
  talismanicLeader: false,
  superStriker: false,
  opened: false,
});

const normaliseStickers = (source = {}) => {
  const result = {};
  const records = source && typeof source === "object" ? source : {};
  Object.entries(records).forEach(([teamId, record]) => {
    if (!teamId || !record || typeof record !== "object") return;
    result[teamId] = {
      ...stickerDefaults(),
      ...record,
      wearTheShirt: Boolean(record.wearTheShirt ?? record.kit ?? record.shirt ?? record.campaignCompleted ?? false),
      flyTheFlag: Boolean(record.flyTheFlag ?? record.flag ?? record.knockoutQualified ?? false),
      liftTheCup: Boolean(record.liftTheCup ?? record.champions ?? record.cupWon ?? record.unlocked ?? false),
      safeHands: Boolean(record.safeHands ?? record.stopper ?? record.keeper ?? false),
      talismanicLeader: Boolean(record.talismanicLeader ?? record.talisman ?? false),
      superStriker: Boolean(record.superStriker ?? record.striker ?? false),
      opened: Boolean(record.opened ?? false),
      claimable: Boolean(record.claimable ?? false),
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
    totalPurchased: number(source.totalPurchased, 0),
    totalUsed: number(source.totalUsed, 0),
    lastPurchasedAt: source.lastPurchasedAt ?? null,
    lastUsedAt: source.lastUsedAt ?? null,
  };
};

const normaliseConsumables = (source = {}, legacyCosmetics = {}) => ({
  goldenTicket: normaliseGoldenTicket(source?.goldenTicket || {}, legacyCosmetics),
});

const normaliseUpgradeMap = (source = {}, legacyCosmetics = {}, legacyUnlocks = {}, legacyRoot = {}) => ({
  allTeams: Boolean(source?.allTeams ?? legacyUnlocks?.allTeams ?? legacyRoot?.allTeamsEquipped ?? legacyRoot?.allTeamsUnlocked ?? false),
  goldenBoot: Boolean(source?.goldenBoot ?? false),
  goldenBall: Boolean(source?.goldenBall ?? false),
  goldenGlove: Boolean(source?.goldenGlove ?? false),
});

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

const normaliseCosmeticsApplied = (source = {}, legacy = {}) => ({
  goldenBoot: Boolean(source?.goldenBoot ?? legacy?.goldenBoot ?? legacy?.cosmetic3 ?? false),
  goldenBall: Boolean(source?.goldenBall ?? legacy?.goldenBall ?? legacy?.cosmeticBallEquipped ?? false),
  goldenGlove: Boolean(source?.goldenGlove ?? legacy?.goldenGlove ?? legacy?.cosmeticGloveEquipped ?? false),
  goldenTicket: Boolean(source?.goldenTicket ?? legacy?.goldenTicket ?? legacy?.cosmetic4 ?? false),
});

const normaliseResultMap = (value, start, end) => ({
  ...createEmptyResultMap(start, end),
  ...(value && typeof value === "object" ? value : {}),
});

const getCupRunSource = (...values) => values.find((value) => Array.isArray(value) && value.some(Boolean)) || values.find(Array.isArray) || [];

const normaliseCurrentCampaign = (campaign = {}, currentProgress = null) => {
  const defaults = createDefaultCurrentCampaign();
  const selectedTeamName = campaign.teamName || campaign.selectedTeamName || campaign.team || campaign.selectedTeam || currentProgress?.team || null;
  const selectedTeamId = campaign.teamId || campaign.selectedTeamId || null;
  const score = number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints ?? currentProgress?.scoringState?.campaignPoints, 0);
  const phase = campaign.phase || campaign.tournamentPhase || campaign.stage || campaign.roundLabel || currentProgress?.matchStage || "Not Started";
  const status = campaign.status || (campaign.active ? "active" : selectedTeamName || score > 0 ? "active" : "not_started");
  return {
    ...defaults,
    active: status === "active" || Boolean(campaign.active),
    status,
    teamId: selectedTeamId,
    teamName: selectedTeamName,
    phase,
    round: campaign.round || campaign.roundLabel || null,
    matchId: campaign.matchId || campaign.currentMatchState?.matchId || currentProgress?.currentMatchId || currentProgress?.matchResult?.matchNo || null,
    groupId: campaign.groupId || null,
    groupPosition: campaign.groupPosition ?? null,
    played: number(campaign.played, 0),
    won: number(campaign.won, 0),
    drawn: number(campaign.drawn, 0),
    lost: number(campaign.lost, 0),
    goalsFor: number(campaign.goalsFor, 0),
    goalsAgainst: number(campaign.goalsAgainst, 0),
    goalDifference: number(campaign.goalDifference, number(campaign.goalsFor, 0) - number(campaign.goalsAgainst, 0)),
    points: number(campaign.points, 0),
    cupRun: normaliseCupRun(getCupRunSource(campaign.cupRun, campaign.formGuide, campaign.form, currentProgress?.userForm)),
    gameScore: score,
    groupStageResults: normaliseResultMap(campaign.groupStageResults, GROUP_STAGE_MATCH_START, GROUP_STAGE_MATCH_END),
    knockoutResults: normaliseResultMap(campaign.knockoutResults, KNOCKOUT_MATCH_START, KNOCKOUT_MATCH_END),
    cosmeticsApplied: normaliseCosmeticsApplied(campaign.cosmeticsApplied, campaign),
    currentMatchState: {
      ...defaults.currentMatchState,
      ...(campaign.currentMatchState || {}),
      matchId: campaign.currentMatchState?.matchId ?? currentProgress?.currentMatchId ?? currentProgress?.matchResult?.matchNo ?? null,
      userScore: number(campaign.currentMatchState?.userScore ?? currentProgress?.score?.[0] ?? campaign.score?.[0], 0),
      opponentScore: number(campaign.currentMatchState?.opponentScore ?? currentProgress?.score?.[1] ?? campaign.score?.[1], 0),
      currentPenaltyNumber: number(campaign.currentMatchState?.currentPenaltyNumber, 1),
      suddenDeath: Boolean(campaign.currentMatchState?.suddenDeath ?? false),
    },
    startedAt: campaign.startedAt || null,
    runtimeSnapshot: currentProgress || campaign.runtimeSnapshot || null,
    updatedAt: campaign.updatedAt || null,
  };
};

const normaliseBestCampaign = (campaign = {}) => {
  const score = number(campaign.gameScore ?? campaign.points ?? campaign.campaignPoints, 0);
  const teamName = campaign.teamName || campaign.team || null;
  return {
    ...createDefaultBestCampaign(),
    teamId: campaign.teamId || null,
    teamName,
    finish: campaign.finish || campaign.status || null,
    phase: campaign.phase || campaign.tournamentPhase || campaign.roundLabel || campaign.stage || "Not Started",
    round: campaign.round || campaign.roundLabel || null,
    groupPosition: campaign.groupPosition ?? null,
    cupRun: normaliseCupRun(getCupRunSource(campaign.cupRun, campaign.formGuide, campaign.form, campaign.tournamentProgress)),
    gameScore: score,
    podium: campaign.podium || null,
    cosmeticsApplied: normaliseCosmeticsApplied(campaign.cosmeticsApplied, campaign),
    completedAt: campaign.completedAt || null,
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

const buildUiProfileAliases = ({ profile, shirt, currentCampaign, bestCampaign, careerStats, trophies, stickers, nationCupWins, upgradesPurchased, cosmeticsEquipped, consumables }) => {
  const legacyShirt = toLegacyShirt(shirt);
  const uiCareerStats = careerStatsUiAliases(careerStats);
  const achievements = buildUiAchievements(trophies);
  return {
    uid: profile.uid,
    email: profile.email,
    username: profile.username,
    usernameLower: profile.usernameLower,
    nickname: profile.username,
    nicknameLower: profile.usernameLower,
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
      roundLabel: bestCampaign.round || bestCampaign.phase,
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
    usernameLower: username.toLowerCase(),
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
      update["profile.usernameLower"] = username.toLowerCase();
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
    update.currentCampaign = normaliseCurrentCampaign(data.currentCampaign, data.currentProgress);
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

  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
  return update;
};

const canonicalFromFirestore = (uid, data = {}) => {
  const user = { uid, email: data.profile?.email || data.email || "", emailVerified: data.profile?.emailVerified ?? data.accountStatus?.emailVerified };
  const profile = normaliseProfile(user, data);
  const consumables = normaliseConsumables(data.consumables, data.cosmetics || data.cosmeticsEquipped || data.cosmeticsActive || {});
  const upgradesPurchased = normaliseUpgradeMap(data.upgradesPurchased, {}, data.unlocks, data);
  const cosmeticsEquipped = normaliseCosmeticsEquipped(data.cosmeticsEquipped || data.cosmeticsActive || data.cosmetics, {}, consumables, upgradesPurchased);
  const canonical = {
    profile,
    shirt: normaliseShirt(data.shirt || data.userShirt || data.shareShirt, profile.username),
    careerStats: normaliseCareerStats(data.careerStats, data.stats),
    currentCampaign: normaliseCurrentCampaign(data.currentCampaign, data.currentProgress),
    bestCampaign: normaliseBestCampaign(data.bestCampaign),
    upgradesPurchased,
    cosmeticsEquipped,
    consumables,
    trophies: normaliseTrophies(data.trophies, data.achievements),
    stickers: normaliseStickers(data.stickers || data.nationStickerProgress),
    nationCupWins: normaliseNationCupWins(data.nationCupWins),
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
  canonical.profile.usernameLower = canonical.profile.username.toLowerCase();
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

export async function unlockCosmetic(uid, cosmeticKey, equipped = true) {
  if (!uid || !cosmeticKey || !db) return;
  if (cosmeticKey === "goldenTicket") {
    await setDoc(doc(db, "users", uid), {
      "consumables.goldenTicket.quantity": equipped ? 1 : 0,
      "consumables.goldenTicket.totalPurchased": equipped ? increment(1) : 0,
      "consumables.goldenTicket.lastPurchasedAt": equipped ? serverTimestamp() : null,
      "cosmeticsEquipped.goldenTicket": Boolean(equipped),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await updateDoc(doc(db, "users", uid), { "cosmeticsActive.goldenTicket": deleteField(), "cosmetics.goldenTicket": deleteField(), "cosmetics.goldenTicketQuantity": deleteField() }).catch(() => {});
    return;
  }
  if (!["goldenBoot", "goldenBall", "goldenGlove"].includes(cosmeticKey)) return;
  await setDoc(doc(db, "users", uid), {
    [`upgradesPurchased.${cosmeticKey}`]: true,
    [`cosmeticsEquipped.${cosmeticKey}`]: Boolean(equipped),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

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

export async function saveAllTeamsUnlocked(uid, purchased = true) {
  if (!uid || !db) return;
  await setDoc(doc(db, "users", uid), { "upgradesPurchased.allTeams": Boolean(purchased), updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { "unlocks.allTeams": deleteField(), allTeamsEquipped: deleteField(), allTeamsUnlocked: deleteField() }).catch(() => {});
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

export function buildStoreEntitlements(profile = {}) {
  const upgrades = normaliseUpgradeMap(profile.upgradesPurchased, {}, profile.unlocks, profile);
  const consumables = normaliseConsumables(profile.consumables, profile.cosmetics || {});
  return {
    allTeams: Boolean(upgrades.allTeams),
    goldenBall: Boolean(upgrades.goldenBall),
    goldenBoot: Boolean(upgrades.goldenBoot),
    goldenGlove: Boolean(upgrades.goldenGlove),
    goldenTicket: normaliseTicketQuantity(consumables.goldenTicket?.quantity) > 0,
    goldenTicketQty: normaliseTicketQuantity(consumables.goldenTicket?.quantity),
  };
}

export async function saveCurrentProgress(uid, snapshot = null) {
  if (!uid || !db) return;
  const currentCampaign = normaliseCurrentCampaign(snapshot?.currentCampaign || {}, snapshot);
  await setDoc(doc(db, "users", uid), { currentCampaign, updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(doc(db, "users", uid), { currentProgress: deleteField() }).catch(() => {});
}

export async function loadCurrentProgress(uid) {
  const profile = await loadUserProfile(uid);
  return profile?.currentCampaign?.runtimeSnapshot || profile?.currentProgress || profile?.savedGames?.current || null;
}

export async function saveLeaderboardHighScore(uid, entry = {}) {
  if (!uid || !db) return;
  const rawBestCampaign = entry.bestCampaign || { ...entry };
  const bestCampaign = normaliseBestCampaign(rawBestCampaign);
  const cupRun = normaliseCupRun(getCupRunSource(entry.cupRun, rawBestCampaign.cupRun, entry.formGuide, entry.form, entry.tournamentProgress, rawBestCampaign.formGuide, rawBestCampaign.form, rawBestCampaign.tournamentProgress));
  const score = number(entry.gameScore ?? entry.campaignPoints ?? entry.points ?? bestCampaign.gameScore, 0);
  const teamName = entry.teamName || entry.team || entry.teamFlag || bestCampaign.teamName || "";
  const finish = normalizeResultStatus(entry.status || entry.finish || rawBestCampaign.status || rawBestCampaign.finish || "inProgress");
  const hasCompletionEvidence = Boolean(entry.completedAt || rawBestCampaign.completedAt || bestCampaign.completedAt);
  if (!isTerminalResultStatus(finish) && !hasCompletionEvidence) return;
  const storedFinish = isTerminalResultStatus(finish) ? finish : "completed";
  const username = cleanUsername(entry.username || entry.nickname || "PLAYER").toUpperCase();
  const podium = entry.podium || (/champion/i.test(storedFinish) ? "champions" : /runner/i.test(storedFinish) ? "runnerUp" : /third/i.test(storedFinish) ? "thirdPlace" : null);

  await setDoc(doc(db, "leaderboard", uid), {
    uid,
    username,
    teamId: entry.teamId || bestCampaign.teamId || null,
    teamName,
    gameScore: score,
    cupRun,
    finish: storedFinish,
    podium,
    completedAt: entry.completedAt || bestCampaign.completedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await updateDoc(doc(db, "leaderboard", uid), {
    formGuide: deleteField(),
    form: deleteField(),
    tournamentProgress: deleteField(),
    campaignPoints: deleteField(),
    points: deleteField(),
    team: deleteField(),
    teamFlag: deleteField(),
    bestCampaign: deleteField(),
    stats: deleteField(),
    cosmeticsApplied: deleteField(),
    podiumAchieved: deleteField(),
    status: deleteField(),
    highScore: deleteField(),
    userId: deleteField(),
    emailVerified: deleteField(),
    accountStatus: deleteField(),
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
  const gameScore = number(data.gameScore ?? data.campaignPoints ?? data.points ?? bestCampaign.gameScore, 0);
  if (source === "users" && gameScore <= 0) return null;

  const profile = data.profile || {};
  const teamName = data.teamName || data.team || data.teamFlag || bestCampaign.teamName || data.bestCampaign?.team || "";
  const podium = data.podium || bestCampaign.podium || (/champion/i.test(finish) ? "champions" : /runner/i.test(finish) ? "runnerUp" : /third/i.test(finish) ? "thirdPlace" : null);
  const username = cleanUsername(data.username || profile.username || data.nickname || "PLAYER").toUpperCase();

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
    bestCampaign: {
      ...createDefaultBestCampaign(),
      ...bestCampaign,
      teamName,
      team: teamName,
      gameScore,
      points: gameScore,
      campaignPoints: gameScore,
      cupRun,
      formGuide: cupRun,
      form: cupRun,
      tournamentProgress: cupRun,
      finish,
      podium,
      completedAt,
    },
    cosmeticsApplied: normaliseCosmeticsApplied(data.cosmeticsApplied || bestCampaign.cosmeticsApplied, data),
  };
}

export async function loadLeaderboardRows(limitCount = 50) {
  if (!db) return [];
  const bestByUser = new Map();

  const addRow = (row) => {
    if (!row) return;
    const existing = bestByUser.get(row.userId);
    if (!existing || number(row.gameScore, 0) > number(existing.gameScore, 0)) bestByUser.set(row.userId, row);
  };

  const leaderboardQuery = query(collection(db, "leaderboard"), orderBy("gameScore", "desc"), limit(limitCount));
  const snap = await getDocs(leaderboardQuery);
  for (const item of snap.docs) {
    addRow(buildLeaderboardRowFromData(item.id, item.data() || {}, "leaderboard"));
  }

  // Recovery path for the clean schema rollout: if a registered user's bestCampaign was saved
  // but leaderboard/{uid} was never written, still surface them on the leaderboard and backfill
  // the canonical leaderboard doc. This keeps the UI working while old docs migrate.
  const usersSnap = await getDocs(query(collection(db, "users"), limit(Math.max(limitCount, 50))));
  for (const item of usersSnap.docs) {
    const data = item.data() || {};
    const row = buildLeaderboardRowFromData(item.id, { ...data, uid: item.id }, "users");
    addRow(row);
    if (row && !snap.docs.some((docSnap) => docSnap.id === item.id)) {
      saveLeaderboardHighScore(item.id, {
        uid: item.id,
        username: row.username,
        teamId: row.teamId,
        teamName: row.teamName,
        gameScore: row.gameScore,
        cupRun: row.cupRun,
        finish: row.finish,
        podium: row.podium,
        completedAt: row.completedAt,
        bestCampaign: row.bestCampaign,
      }).catch((error) => console.warn("Leaderboard backfill failed", error));
    }
  }

  return Array.from(bestByUser.values()).sort((a, b) => number(b.gameScore) - number(a.gameScore)).slice(0, limitCount);
}

export async function isNicknameTaken(nickname, uidToIgnore = null) {
  const clean = String(nickname || "").trim().toLowerCase();
  if (!clean || !db) return false;
  const usernameQuery = query(collection(db, "users"), where("profile.usernameLower", "==", clean), limit(3));
  const snap = await getDocs(usernameQuery);
  return snap.docs.some((item) => item.id !== uidToIgnore);
}

export async function saveUserNickname(uid, username) {
  const clean = cleanUsername(username).toUpperCase();
  if (!uid || !clean || !db) return;
  await setDoc(doc(db, "users", uid), {
    "profile.username": clean,
    "profile.usernameLower": clean.toLowerCase(),
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
