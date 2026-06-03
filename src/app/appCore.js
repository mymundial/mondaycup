export const ACHIEVEMENTS_KEY = "mondayCup.achievements";
export const NATION_CUP_WINS_KEY = "mondayCup.nationCupWins";
export const ALL_TIME_MATCHES_PLAYED_KEY = "mondayCup.allTimeMatchesPlayed";
export const ALL_TIME_MATCHES_WON_KEY = "mondayCup.allTimeMatchesWon";
export const ALL_TIME_MATCHES_DRAWN_KEY = "mondayCup.allTimeMatchesDrawn";
export const ALL_TIME_MATCHES_LOST_KEY = "mondayCup.allTimeMatchesLost";
export const HOST_TEAMS = new Set(["Mexico", "Canada", "United States"]);
export const PODIUM_ACHIEVEMENT_KEYS = ["thirdPlaceFinish", "runnerUpFinish", "championFinish"];
export const EMPTY_ACTIVE_COSMETICS = {
  goldenBoot: false,
  goldenBall: false,
  goldenGlove: false,
  goldenTicket: false,
  goldenTicketQuantity: 0,
};

export const SHARE_EDITOR_EMAIL = "alexjashworth@gmail.com";

export const CORE_ACHIEVEMENT_KEYS = [
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
];

export const normaliseActiveCosmeticsForEntitlements = (source = {}, entitlements = {}) => {
  const ticketQty = Math.max(0, Math.min(99, Math.floor(Number(entitlements?.goldenTicketQty || 0))));
  return {
    goldenBoot: Boolean(entitlements?.goldenBoot && source?.goldenBoot),
    goldenBall: Boolean(entitlements?.goldenBall && source?.goldenBall),
    goldenGlove: Boolean(entitlements?.goldenGlove && source?.goldenGlove),
    goldenTicket: ticketQty > 0,
    goldenTicketQuantity: ticketQty,
  };
};

export function userScoreParts(result, userTeam) {
  const home = result?.home ?? result?.homeTeam;
  const away = result?.away ?? result?.awayTeam;
  const userIsHome = home === userTeam;
  return {
    scored: userIsHome ? Number(result?.homeGoals || 0) : Number(result?.awayGoals || 0),
    conceded: userIsHome ? Number(result?.awayGoals || 0) : Number(result?.homeGoals || 0),
  };
}

export function containsWoodwork(userShotEvents = []) {
  return userShotEvents.some((event) => {
    const value = `${event?.accuracyOutcome || ""} ${event?.quality || ""} ${event?.code || ""} ${event?.shotResult || ""}`.toLowerCase();
    return value.includes("post") || value.includes("crossbar") || value.includes("bar") || /\bp\b/.test(value) || value.includes("cx");
  });
}

export function mergeUnlockedKeys(current = {}, keys = []) {
  const next = { ...(current || {}) };
  let changed = false;
  keys.filter(Boolean).forEach((key) => {
    if (!next[key]) {
      next[key] = true;
      changed = true;
    }
  });
  return changed ? next : current;
}
