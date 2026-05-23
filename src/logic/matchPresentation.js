import { getTeamTheme, teamCode } from "../data/teams.js";

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
  if (result.status === "champion") return "CHAMPIONS!";
  if (result.status === "runnerUp") return "RUNNER-UP!";
  if (result.status === "third") return "THIRD!";
  if (result.status === "qualified") return "QUALIFIED!";
  if (result.status === "eliminated" || result.status === "thirdPlace") return "ELIMINATED!";
  if (result.isDraw || result.homeGoals === result.awayGoals) return "DRAW!";
  if (result.status === "knockoutWin") return "QUALIFIED!";
  return result.won ? "VICTORY!" : "DEFEAT!";
}

export function modalHeaderColour(result) {
  if (result?.status === "champion") return "#D4AF37";
  if (result?.status === "runnerUp") return "#C0C0C0";
  if (result?.status === "third") return "#CD7F32";
  return "#0B5F35";
}

export function modalButton(result) {
  if (!result) return "FULL TIME";
  if (["eliminated", "champion", "runnerUp", "third", "fourth"].includes(result.status)) return "PLAY AGAIN";
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
