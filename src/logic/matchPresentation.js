import { getTeamTheme, teamCode } from "../data/teams.js";
import { RESULT_STATUS, isTerminalResultStatus, normalizeResultStatus } from "./resultStatus.js";

export function teamToGameTeam(name) {
  const theme = getTeamTheme(name);
  return {
    id: name,
    name,
    code: teamCode(name),
    flag: `/flags/${teamCode(name)}.png`,
    primaryColour: theme.bg,
    textColour: theme.text,
  };
}

export function modalTitle(result) {
  const status = normalizeResultStatus(result?.status);
  if (status === RESULT_STATUS.CHAMPION) return "CHAMPIONS!";
  if (status === RESULT_STATUS.RUNNER_UP) return "RUNNER-UP!";
  if (status === RESULT_STATUS.THIRD_PLACE) return "THIRD!";
  if (status === RESULT_STATUS.QUALIFIED) return "QUALIFIED!";
  if (status === RESULT_STATUS.ELIMINATED || status === RESULT_STATUS.THIRD_PLACE_PENDING) return "ELIMINATED!";
  if (result.isDraw || result.homeGoals === result.awayGoals) return "DRAW!";
  if (status === RESULT_STATUS.KNOCKOUT_WIN) return "QUALIFIED!";
  return result.won ? "VICTORY!" : "DEFEAT!";
}

export function modalHeaderColour(result) {
  const status = normalizeResultStatus(result?.status);
  if (status === RESULT_STATUS.CHAMPION) return "#D4AF37";
  if (status === RESULT_STATUS.RUNNER_UP) return "#C0C0C0";
  if (status === RESULT_STATUS.THIRD_PLACE) return "#CD7F32";
  return "#0B5F35";
}

export function modalButton(result) {
  if (!result) return "FULL TIME";
  if (isTerminalResultStatus(result.status)) return "PLAY AGAIN";
  return "NEXT MATCH";
}

export function modalHeaderTitle({ isKnockout, stageLabel, selectedGroup }) {
  return isKnockout ? String(stageLabel).replace("SEMI-FINALS", "SEMI-FINAL") : `GROUP ${selectedGroup}`;
}

export function createFallbackFixture({ team, opponent }) {
  return {
    id: `${team || "team"}-${opponent || "opponent"}`,
    matchNo: null,
    stage: "group",
    homeTeamId: team || "Team A",
    awayTeamId: opponent || "Team B",
    allowDraw: true,
    requiresWinner: false,
  };
}

export function toCompletedGameResult(matchResult, fallbackFixture) {
  if (!matchResult) return null;
  return {
    fixtureId: fallbackFixture.id,
    matchNo: fallbackFixture.matchNo,
    stage: fallbackFixture.stage,
    home: matchResult.home,
    away: matchResult.away,
    homeTeam: matchResult.home,
    awayTeam: matchResult.away,
    homeGoals: matchResult.homeGoals,
    awayGoals: matchResult.awayGoals,
    won: matchResult.won,
    status: matchResult.status,
    isDraw: matchResult.isDraw,
    attempts: matchResult.attempts,
  };
}
