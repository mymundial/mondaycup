import { RESULT_STATUS } from "./resultStatus.js";

export const LEADERBOARD_POINTS = Object.freeze({
  MATCH_PLAYED: 5,
  MATCH_DRAWN: 10,
  MATCH_WON: 30,
  ACCURACY_METER_MAX: 50,
  POWER_METER_MAX: 50,
  GOAL_SCORED: 25,
  PERFECT_SHOOTOUT_WIN: 100,
  QUALIFY_FROM_GROUP: 100,
  REACH_ROUND_OF_16: 150,
  REACH_QUARTER_FINAL: 250,
  REACH_SEMI_FINAL: 400,
  REACH_FINAL: 650,
  WIN_THIRD_PLACE_PLAY_OFF: 750,
  RUNNER_UP_FINISH: 1000,
  WIN_MONDAY_CUP: 1500,
});

const STAGE_MILESTONES_BY_MATCH_NO = [
  { id: "reach-round-of-16", label: "Reach Round of 16", points: LEADERBOARD_POINTS.REACH_ROUND_OF_16, min: 73, max: 88 },
  { id: "reach-quarter-final", label: "Reach Quarter-final", points: LEADERBOARD_POINTS.REACH_QUARTER_FINAL, min: 89, max: 96 },
  { id: "reach-semi-final", label: "Reach Semi-final", points: LEADERBOARD_POINTS.REACH_SEMI_FINAL, min: 97, max: 100 },
  { id: "reach-final", label: "Reach Final", points: LEADERBOARD_POINTS.REACH_FINAL, min: 101, max: 102 },
];

export function createScoringState() {
  return {
    campaignPoints: 0,
    awardedMilestones: [],
    matchCount: 0,
  };
}

export function normaliseAwardedMilestones(value) {
  if (value instanceof Set) return new Set(value);
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function scoreMeterCentre(value, maxPoints = 50) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  const safeValue = clamp(numericValue, 0, 100);
  const distanceFromMiddle = Math.abs(safeValue - 50);
  return clamp(Math.round(maxPoints - distanceFromMiddle), 0, maxPoints);
}

export function scoreShotEvents(userShotEvents = []) {
  const breakdown = [];
  let points = 0;

  userShotEvents.forEach((event, index) => {
    const shotNo = index + 1;
    const preScoredAccuracy = Number(event?.accuracyPoints);
    const preScoredPower = Number(event?.powerPoints);
    const accuracyPoints = Number.isFinite(preScoredAccuracy)
      ? preScoredAccuracy
      : scoreMeterCentre(event?.accuracy, LEADERBOARD_POINTS.ACCURACY_METER_MAX);
    const powerPoints = Number.isFinite(preScoredPower)
      ? preScoredPower
      : scoreMeterCentre(event?.power, LEADERBOARD_POINTS.POWER_METER_MAX);
    const goal = Boolean(event?.goal);

    if (accuracyPoints > 0) {
      points += accuracyPoints;
      breakdown.push({ id: `shot-${shotNo}-accuracy-meter`, label: "Accuracy meter", points: accuracyPoints });
    }

    if (powerPoints > 0) {
      points += powerPoints;
      breakdown.push({ id: `shot-${shotNo}-power-meter`, label: "Power meter", points: powerPoints });
    }

    if (goal) {
      points += LEADERBOARD_POINTS.GOAL_SCORED;
      breakdown.push({ id: `shot-${shotNo}-goal`, label: "Goal scored", points: LEADERBOARD_POINTS.GOAL_SCORED });
    }
  });

  return { points, breakdown };
}

export function isPerfectShootoutWin({ result, userShotEvents = [] }) {
  const userWon = Boolean(result?.userWon ?? result?.won);
  if (!userWon || userShotEvents.length < 5) return false;
  return userShotEvents.slice(0, 5).every((event) => event?.goal === true);
}

function milestoneForResult(result) {
  const status = result?.status;
  const matchNo = Number(result?.matchNo);

  if (status === RESULT_STATUS.QUALIFIED) {
    return { id: "qualify-from-group", label: "Qualify from group", points: LEADERBOARD_POINTS.QUALIFY_FROM_GROUP };
  }

  if (status === RESULT_STATUS.KNOCKOUT_WIN) {
    return STAGE_MILESTONES_BY_MATCH_NO.find((item) => matchNo >= item.min && matchNo <= item.max) || null;
  }

  if (status === RESULT_STATUS.THIRD_PLACE) {
    return { id: "win-third-place-play-off", label: "Win third place play-off", points: LEADERBOARD_POINTS.WIN_THIRD_PLACE_PLAY_OFF };
  }

  if (status === RESULT_STATUS.RUNNER_UP) {
    return { id: "runner-up-finish", label: "Runner-up finish", points: LEADERBOARD_POINTS.RUNNER_UP_FINISH };
  }

  if (status === RESULT_STATUS.CHAMPION) {
    return { id: "win-monday-cup", label: "Win Monday Cup", points: LEADERBOARD_POINTS.WIN_MONDAY_CUP };
  }

  return null;
}

export function scoreCompletedMatch({ result, userShotEvents = [], awardedMilestones = [] }) {
  const milestoneSet = normaliseAwardedMilestones(awardedMilestones);
  const breakdown = [];
  let points = 0;

  points += LEADERBOARD_POINTS.MATCH_PLAYED;
  breakdown.push({ id: "match-played", label: "Match played", points: LEADERBOARD_POINTS.MATCH_PLAYED });

  if (result?.isDraw) {
    points += LEADERBOARD_POINTS.MATCH_DRAWN;
    breakdown.push({ id: "match-drawn", label: "Match drawn", points: LEADERBOARD_POINTS.MATCH_DRAWN });
  }

  if (result?.userWon ?? result?.won) {
    points += LEADERBOARD_POINTS.MATCH_WON;
    breakdown.push({ id: "match-won", label: "Match won", points: LEADERBOARD_POINTS.MATCH_WON });
  }

  const shotScore = scoreShotEvents(userShotEvents);
  points += shotScore.points;
  breakdown.push(...shotScore.breakdown);

  if (isPerfectShootoutWin({ result, userShotEvents })) {
    points += LEADERBOARD_POINTS.PERFECT_SHOOTOUT_WIN;
    breakdown.push({ id: "perfect-shootout-win", label: "Perfect shootout win", points: LEADERBOARD_POINTS.PERFECT_SHOOTOUT_WIN });
  }

  const milestone = milestoneForResult(result);
  if (milestone && !milestoneSet.has(milestone.id)) {
    milestoneSet.add(milestone.id);
    points += milestone.points;
    breakdown.push(milestone);
  }

  return {
    points,
    breakdown,
    awardedMilestones: Array.from(milestoneSet),
  };
}

export function applyCompletedMatchScore({ scoringState = createScoringState(), result, userShotEvents = [] }) {
  const current = scoringState || createScoringState();
  const matchScore = scoreCompletedMatch({
    result,
    userShotEvents,
    awardedMilestones: current.awardedMilestones,
  });
  const campaignPoints = Number(current.campaignPoints || 0) + matchScore.points;
  return {
    campaignPoints,
    awardedMilestones: matchScore.awardedMilestones,
    matchCount: Number(current.matchCount || 0) + 1,
    lastMatchPoints: matchScore.points,
    lastBreakdown: matchScore.breakdown,
  };
}

export function createLeaderboardEntry({ user, team, campaignPoints, status, podium, completedAt = Date.now() }) {
  return {
    userId: user?.uid || null,
    username: user?.displayName || user?.email?.split("@")[0] || "MONDAY HERO",
    team: team || "",
    campaignPoints: Number(campaignPoints || 0),
    status: status || "inProgress",
    finish: status || "inProgress",
    podium: podium || null,
    completedAt,
  };
}
