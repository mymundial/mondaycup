import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { GROUPS, GROUP_LETTERS } from "../data/teams.js";
import { RESULT_STATUS } from "./resultStatus.js";
import { knockoutStageLabel } from "./tournament.js";

export const BEST_CAMPAIGN_SCORE_KEY = "mondayCup.bestCampaignScore";
export const BEST_CAMPAIGN_SUMMARY_KEY = "mondayCup.bestCampaignSummary";
export const LOCAL_LEADERBOARD_KEY = "mondayCup.localLeaderboardRows";
export const MONDAY_CUPS_WON_KEY = "mondayCup.mondayCupsWon";
export const ALL_TIME_GOALS_KEY = "mondayCup.allTimeGoals";
export const ALL_TIME_SHOTS_KEY = "mondayCup.allTimeShots";
export const COSMETICS_KEY = "mondayCup.clubhouseCosmetics";
export const ALL_TEAMS_UNLOCKED_KEY = "mondayCup.allTeamsUnlocked";
export const ACHIEVEMENTS_KEY = "mondayCup.achievements";
export const NATION_CUP_WINS_KEY = "mondayCup.nationCupWins";
const TERMINAL_LEADERBOARD_STATUSES = new Set([
  RESULT_STATUS.CHAMPION,
  RESULT_STATUS.RUNNER_UP,
  RESULT_STATUS.THIRD_PLACE,
  RESULT_STATUS.FOURTH_PLACE,
  RESULT_STATUS.ELIMINATED,
]);

export function safeReadNumber(key, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

export function safeWriteNumber(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(Number(value || 0)));
}

export function safeReadJson(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeWriteJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function localLeaderboardScore(row = {}) {
  return Number(row.gameScore ?? row.campaignPoints ?? row.points ?? row.bestCampaign?.gameScore ?? row.bestCampaign?.campaignPoints ?? row.bestCampaign?.points ?? 0) || 0;
}

function isLocalGuestLeaderboardRow(row = {}) {
  const userId = String(row.userId || row.uid || row.id || "");
  return Boolean(row.localOnly || row.isUserPreview || userId === "guest-local" || userId === "guest-preview");
}

function localLeaderboardUsesUpgrade(row = {}) {
  return Boolean(row.usedGoldenUpgrade || row.goldenUpgradeUsed || row.usedGoldenTicket || row.goldenTicketUsed || row.cosmeticsApplied?.goldenBoot || row.cosmeticsApplied?.goldenBall || row.cosmeticsApplied?.goldenGlove || row.cosmeticsApplied?.goldenTicket || row.bestCampaign?.usedGoldenUpgrade || row.bestCampaign?.goldenUpgradeUsed || row.bestCampaign?.usedGoldenTicket || row.bestCampaign?.goldenTicketUsed || row.bestCampaign?.cosmeticsApplied?.goldenBoot || row.bestCampaign?.cosmeticsApplied?.goldenBall || row.bestCampaign?.cosmeticsApplied?.goldenGlove || row.bestCampaign?.cosmeticsApplied?.goldenTicket);
}

function chooseBetterLocalLeaderboardRow(existing, row) {
  if (!existing) return row;
  const rowScore = localLeaderboardScore(row);
  const existingScore = localLeaderboardScore(existing);
  if (rowScore > existingScore) return row;
  if (rowScore < existingScore) return existing;
  const rowUsesUpgrade = localLeaderboardUsesUpgrade(row);
  const existingUsesUpgrade = localLeaderboardUsesUpgrade(existing);
  if (!rowUsesUpgrade && existingUsesUpgrade) return row;
  if (rowUsesUpgrade && !existingUsesUpgrade) return existing;
  const rowCompletedAt = String(row.completedAt || row.bestCampaign?.completedAt || "");
  const existingCompletedAt = String(existing.completedAt || existing.bestCampaign?.completedAt || "");
  if (rowCompletedAt > existingCompletedAt) return row;
  return existing;
}

function normaliseLocalLeaderboardRows(rows = []) {
  const byUser = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object" || localLeaderboardScore(row) <= 0) return;
    const isGuest = isLocalGuestLeaderboardRow(row);
    const key = isGuest ? "guest-local" : String(row.userId || row.uid || row.id || row.username || "");
    if (!key) return;
    const nextRow = isGuest
      ? { ...row, id: "guest-local", uid: "guest-local", userId: "guest-local", localOnly: true, isUserPreview: false }
      : row;
    byUser.set(key, chooseBetterLocalLeaderboardRow(byUser.get(key), nextRow));
  });
  return Array.from(byUser.values())
    .sort((a, b) => localLeaderboardScore(b) - localLeaderboardScore(a))
    .slice(0, 50);
}

export function safeReadLeaderboardRows() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_LEADERBOARD_KEY) || "[]");
    return normaliseLocalLeaderboardRows(parsed);
  } catch {
    return [];
  }
}

export function safeWriteLeaderboardRows(rows) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(normaliseLocalLeaderboardRows(rows)));
}

export function isTerminalLeaderboardStatus(status) {
  return TERMINAL_LEADERBOARD_STATUSES.has(status);
}

export async function publishRegisteredLeaderboardEntry(entry) {
  if (!entry?.userId || !db) return;
  try {
    await setDoc(doc(db, "leaderboard", entry.userId), {
      ...entry,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Leaderboard publish failed", error);
  }
}

const stageKeyFromMatchNo = (matchNo) => {
  if (matchNo >= 73 && matchNo <= 88) return "round32";
  if (matchNo >= 89 && matchNo <= 96) return "round16";
  if (matchNo >= 97 && matchNo <= 100) return "quarterFinal";
  if (matchNo === 101 || matchNo === 102) return "semiFinal";
  if (matchNo === 103) return "thirdPlace";
  if (matchNo === 104) return "final";
  return "round32";
};

export function toGameFixture(fixture, fallbackStage = "group") {
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

export function resultBelongsToFixture(result, fixture) {
  if (!result || !fixture) return false;
  if (result.fixtureId && fixture.id) return result.fixtureId === fixture.id;
  if (result.matchNo && fixture.matchNo) return result.matchNo === fixture.matchNo;
  return result.homeTeam === fixture.home && result.awayTeam === fixture.away;
}


export function userScoreFromFixtureResult(result, userTeam) {
  const userIsHome = result.homeTeam === userTeam || result.home === userTeam;
  return userIsHome ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals];
}


export function resultFormCode(result, userTeam) {
  if (!result) return null;
  if (result.isDraw || result.homeGoals === result.awayGoals) return "D";
  return result.userWon || result.won ? "W" : "L";
}

export function formForSummary(form = []) {
  return Array.isArray(form) ? form.slice(-8) : [];
}

export function roundLabelForResult(result, fallback = "GROUP STAGE") {
  const status = result?.status;
  if (status === RESULT_STATUS.CHAMPION) return "CHAMPIONS";
  if (status === RESULT_STATUS.RUNNER_UP) return "RUNNER-UP";
  if (status === RESULT_STATUS.THIRD_PLACE) return "THIRD PLACE";
  if (status === RESULT_STATUS.FOURTH_PLACE) return "THIRD PLACE PLAY-OFF";
  if (status === RESULT_STATUS.THIRD_PLACE_PENDING) return "THIRD PLACE PLAY-OFF";
  if (status === RESULT_STATUS.ELIMINATED) return Number(result?.matchNo) ? knockoutStageLabel(result.matchNo) : fallback || "GROUP STAGE";
  if (status === RESULT_STATUS.QUALIFIED) return "ROUND OF 32";
  if (Number(result?.matchNo)) return knockoutStageLabel(result.matchNo);
  return fallback || "GROUP STAGE";
}

export function buildCampaignSummary({ team, userForm, campaignPoints, result, fallbackRound }) {
  return {
    team: team || "NO TEAM",
    form: formForSummary(userForm),
    campaignPoints: Number(campaignPoints || 0),
    roundLabel: roundLabelForResult(result, fallbackRound),
    updatedAt: Date.now(),
  };
}

export function countShotStats(userShotEvents = []) {
  const shots = Array.isArray(userShotEvents) ? userShotEvents.length : 0;
  const goals = Array.isArray(userShotEvents) ? userShotEvents.filter((event) => event?.goal).length : 0;
  return { shots, goals };
}

export function conversionPercent(goals, shots) {
  if (!shots) return 0;
  return Math.round((Number(goals || 0) / Number(shots || 1)) * 100);
}

export function calculatePreviewLeaderboardRank({ rows = [], user, currentCampaignScore = 0, bestCampaignScore = 0, team = "" }) {
  const score = Math.max(Number(currentCampaignScore || 0), Number(bestCampaignScore || 0));
  if (!score && !user?.uid) return "--";
  const preview = {
    userId: user?.uid || "guest-preview",
    username: user?.displayName || user?.email?.split("@")[0] || "YOU",
    team,
    campaignPoints: score,
    isUserPreview: true,
  };
  const hasUserRow = Boolean(user?.uid && rows.some((row) => row.userId === user.uid));
  const ranked = [...(!hasUserRow ? [preview] : []), ...rows]
    .sort((a, b) => Number(b.campaignPoints || 0) - Number(a.campaignPoints || 0));
  const index = ranked.findIndex((row) => row.isUserPreview || (user?.uid && row.userId === user.uid));
  return index >= 0 ? `#${index + 1}` : "--";
}

export function calculateEarlyQualifiedTeams(table, schedule, fullQualifiers, groupStageComplete) {
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


