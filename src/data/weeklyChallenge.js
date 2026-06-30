import { ASSETS } from "./assets.js";
import { FLAG_CC, HOST_TEAMS, teamCode, teamKey } from "./teams.js";

export const WEEKLY_CHALLENGE_MODES = Object.freeze({
  KEEPER_STREAK: "keeperStreak",
});

export const WEEKLY_CHALLENGE_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const ACTIVE_WEEKLY_CHALLENGE_ID = "cape-verde-keeper-001";

const DEFAULT_FREE_TEAM_NAMES = HOST_TEAMS.map((team) => team.name);

function challengeOpponent(teamName) {
  return Object.freeze({
    name: teamName,
    code: teamCode(teamName),
    key: teamKey(teamName),
    flagCc: FLAG_CC[teamName] || "",
  });
}

export const WEEKLY_CHALLENGES = Object.freeze({
  [ACTIVE_WEEKLY_CHALLENGE_ID]: Object.freeze({
    id: ACTIVE_WEEKLY_CHALLENGE_ID,
    status: WEEKLY_CHALLENGE_STATUS.ACTIVE,
    active: true,
    mode: WEEKLY_CHALLENGE_MODES.KEEPER_STREAK,

    title: "Weekly Challenge",
    subtitle: "Beat Cape Verde",
    shortTitle: "Beat Cape Verde",
    badgeCopyTop: "Weekly Challenge",
    badgeCopyBottom: "Beat Cape Verde",

    opponent: challengeOpponent("Cape Verde"),

    assets: Object.freeze({
      badge: ASSETS.challenges.weeklyChallengeCapeVerdeBadge,
    }),

    intro: Object.freeze({
      title: "Weekly Challenge",
      heading: "Beat Cape Verde",
      body: [
        "Choose your team.",
        "Score as many penalties as you can.",
        "One miss ends the run.",
        "Top 10 scores make the weekly leaderboard.",
      ],
      primaryCta: "Play",
      secondaryCta: "Close",
    }),

    rules: Object.freeze({
      userShootsOnly: true,
      opponentShoots: false,
      oneMissEndsRun: true,
      scorePerGoal: 1,
      allowRetry: true,
    }),

    scoreboard: Object.freeze({
      teamASource: "selectedTeam",
      teamBSource: "challengeOpponent",
      opponentScoreLabel: "X",
      stageLabel: "Weekly Challenge",
    }),

    teamAccess: Object.freeze({
      useStandardTeamAccess: true,
      freeTeams: Object.freeze(DEFAULT_FREE_TEAM_NAMES),
      allowOpponentTeamSelection: true,
    }),

    leaderboard: Object.freeze({
      id: ACTIVE_WEEKLY_CHALLENGE_ID,
      collectionPath: `weeklyChallenges/${ACTIVE_WEEKLY_CHALLENGE_ID}/scores`,
      limit: 10,
      sortField: "score",
      sortDirection: "desc",
      savePolicy: "bestScoreOnly",
      columns: Object.freeze(["rank", "username", "team", "score"]),
      teamDisplay: "flagCode",
    }),

    share: Object.freeze({
      title: "I played the Weekly Challenge",
      scoreLabel: "I scored {score} pens",
      challengeLabel: "Beat Cape Verde",
      cta: "Can you beat me?",
      url: "mondaycup.co.uk",
    }),
  }),
});

export const ACTIVE_WEEKLY_CHALLENGE = WEEKLY_CHALLENGES[ACTIVE_WEEKLY_CHALLENGE_ID];

export function getWeeklyChallengeById(id = ACTIVE_WEEKLY_CHALLENGE_ID) {
  return WEEKLY_CHALLENGES[id] || null;
}

export function getActiveWeeklyChallenge() {
  return ACTIVE_WEEKLY_CHALLENGE?.active ? ACTIVE_WEEKLY_CHALLENGE : null;
}

export function isWeeklyChallengeActive(challenge = ACTIVE_WEEKLY_CHALLENGE) {
  return Boolean(challenge?.active && challenge?.status === WEEKLY_CHALLENGE_STATUS.ACTIVE);
}

export function getWeeklyChallengeLeaderboardPath(challenge = ACTIVE_WEEKLY_CHALLENGE) {
  return challenge?.leaderboard?.collectionPath || "";
}

export function normaliseWeeklyChallengeScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function shouldSaveWeeklyChallengeScore(nextScore, existingBestScore = 0) {
  return normaliseWeeklyChallengeScore(nextScore) > normaliseWeeklyChallengeScore(existingBestScore);
}

export function getWeeklyChallengeTeamDisplay(teamName) {
  return {
    name: teamName,
    code: teamCode(teamName),
    key: teamKey(teamName),
    flagCc: FLAG_CC[teamName] || "",
  };
}
