export function scheduleRoundForMatchNo(matchNo) {
  if (!matchNo) return "Round of 32";
  if (matchNo >= 73 && matchNo <= 88) return "Round of 32";
  if (matchNo >= 89 && matchNo <= 96) return "Round of 16";
  if (matchNo >= 97 && matchNo <= 100) return "Quarter-finals";
  if (matchNo >= 101 && matchNo <= 102) return "Semi-finals";
  if (matchNo === 103) return "3RD PLACE PLAY-OFF";
  if (matchNo === 104) return "Final";
  return "Round of 32";
}

export function selectScheduleFocus({
  matchResult = null,
  currentKnockoutMatch = null,
  activeGroupFixture = null,
  schedule = [],
  selectedGroup = null,
  team = null,
  groupStageComplete = false,
}) {
  // Prefer the user's current/upcoming fixture over the last completed result,
  // so opening Schedule lands on the phase they are actually playing next.
  if (currentKnockoutMatch?.matchNo) {
    return { view: "knockout", round: scheduleRoundForMatchNo(currentKnockoutMatch.matchNo) };
  }

  if (activeGroupFixture?.week && !groupStageComplete) {
    return { view: "group", week: activeGroupFixture.week };
  }

  const upcomingGroupFixture = team
    ? schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team))
    : null;

  if (upcomingGroupFixture?.week && !groupStageComplete) {
    return { view: "group", week: upcomingGroupFixture.week };
  }

  if (matchResult?.matchNo) return { view: "knockout", round: scheduleRoundForMatchNo(matchResult.matchNo) };
  if (matchResult?.week && !groupStageComplete) return { view: "group", week: matchResult.week };

  return groupStageComplete ? { view: "knockout", round: "Round of 32" } : { view: "group", week: 1 };
}

export function selectFixtureScrollTarget({ fixtureView = "group", scheduleFocus = null }) {
  if (fixtureView === "group") return { key: `group-${scheduleFocus?.week || 1}`, align: "top" };

  const round = scheduleFocus?.round || "Round of 32";
  const align = ["Semi-finals", "3RD PLACE PLAY-OFF", "Final"].includes(round) ? "bottom" : "top";
  return { key: `knockout-${round}`, align };
}

export function selectStandingsScrollTarget({ standingsView = "group", bracketSide = "top", userGroup = null }) {
  if (standingsView === "knockout") {
    return { key: "knockout-bracket", align: bracketSide === "bottom" ? "bottom" : "top" };
  }

  if (userGroup === "K" || userGroup === "L") return { key: `group-${userGroup}`, align: "bottom" };
  return { key: userGroup ? `group-${userGroup}` : "group-A", align: "top" };
}
