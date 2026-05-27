import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { GROUPS, GROUP_LETTERS } from "./data/teams.js";
import { buildSchedule, blankTable, buildQualifiers, buildRound32Fixtures, sortRows, applyFixtureResult, completeMatchday, didTeamQualify, findTeamKnockoutFixture, getFixtureOpponent, completeKnockoutRound, knockoutStageLabel, runSelfTests } from "./logic/tournament.js";
import { RESULT_STATUS } from "./logic/resultStatus.js";
import { getUserFinishStatus } from "./logic/podium.js";
import { LEADERBOARD_POINTS, applyCompletedMatchScore, createLeaderboardEntry, createScoringState } from "./logic/leaderboardScoring.js";
import { DrawerShell } from "./components/layout/Layout.jsx";
import { ScreenTopBar } from "./components/layout/ScreenTopBar.jsx";
import { MenuPanel, IvoryCard, UserHighlightCard } from "./components/layout/MenuPanel.jsx";
import { ActionButton } from "./components/layout/ActionButton.jsx";
import { Flag } from "./components/shared.jsx";
import { HomeScreen, TeamSelectScreen } from "./components/selection/SelectionScreens.jsx";
import { FixturesScreen } from "./components/schedule/ScheduleScreens.jsx";
import { GroupsScreen } from "./components/standings/StandingsScreens.jsx";
import { MatchScreen } from "./components/match/MatchScreen.jsx";

runSelfTests();

const BEST_CAMPAIGN_SCORE_KEY = "mondayCup.bestCampaignScore";
const BEST_CAMPAIGN_SUMMARY_KEY = "mondayCup.bestCampaignSummary";
const LOCAL_LEADERBOARD_KEY = "mondayCup.localLeaderboardRows";
const MONDAY_CUPS_WON_KEY = "mondayCup.mondayCupsWon";
const ALL_TIME_GOALS_KEY = "mondayCup.allTimeGoals";
const ALL_TIME_SHOTS_KEY = "mondayCup.allTimeShots";
const COSMETICS_KEY = "mondayCup.clubhouseCosmetics";
const TERMINAL_LEADERBOARD_STATUSES = new Set([
  RESULT_STATUS.CHAMPION,
  RESULT_STATUS.RUNNER_UP,
  RESULT_STATUS.THIRD_PLACE,
  RESULT_STATUS.FOURTH_PLACE,
  RESULT_STATUS.ELIMINATED,
]);

function safeReadNumber(key, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

function safeWriteNumber(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(Number(value || 0)));
}

function safeReadJson(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function safeReadLeaderboardRows() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_LEADERBOARD_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLeaderboardRows(rows) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(rows.slice(0, 50)));
}

function isTerminalLeaderboardStatus(status) {
  return TERMINAL_LEADERBOARD_STATUSES.has(status);
}

async function publishRegisteredLeaderboardEntry(entry) {
  if (!entry?.userId || !db) return;
  try {
    await addDoc(collection(db, "leaderboard"), {
      ...entry,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
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

function toGameFixture(fixture, fallbackStage = "group") {
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

function resultBelongsToFixture(result, fixture) {
  if (!result || !fixture) return false;
  if (result.fixtureId && fixture.id) return result.fixtureId === fixture.id;
  if (result.matchNo && fixture.matchNo) return result.matchNo === fixture.matchNo;
  return result.homeTeam === fixture.home && result.awayTeam === fixture.away;
}


function userScoreFromFixtureResult(result, userTeam) {
  const userIsHome = result.homeTeam === userTeam || result.home === userTeam;
  return userIsHome ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals];
}


function resultFormCode(result, userTeam) {
  if (!result) return null;
  if (result.isDraw || result.homeGoals === result.awayGoals) return "D";
  return result.userWon || result.won ? "W" : "L";
}

function formForSummary(form = []) {
  return Array.isArray(form) ? form.slice(-8) : [];
}

function roundLabelForResult(result, fallback = "GROUP STAGE") {
  const status = result?.status;
  if (status === RESULT_STATUS.CHAMPION) return "MONDAY CUP CHAMPION";
  if (status === RESULT_STATUS.RUNNER_UP) return "RUNNER-UP";
  if (status === RESULT_STATUS.THIRD_PLACE) return "THIRD PLACE";
  if (status === RESULT_STATUS.FOURTH_PLACE) return "FOURTH PLACE";
  if (status === RESULT_STATUS.THIRD_PLACE_PENDING) return "THIRD PLACE PLAY-OFF";
  if (status === RESULT_STATUS.ELIMINATED) return "ELIMINATED";
  if (status === RESULT_STATUS.QUALIFIED) return "ROUND OF 32";
  if (Number(result?.matchNo)) return knockoutStageLabel(result.matchNo);
  return fallback || "GROUP STAGE";
}

function buildCampaignSummary({ team, userForm, campaignPoints, result, fallbackRound }) {
  return {
    team: team || "NO TEAM",
    form: formForSummary(userForm),
    campaignPoints: Number(campaignPoints || 0),
    roundLabel: roundLabelForResult(result, fallbackRound),
    updatedAt: Date.now(),
  };
}

function countShotStats(userShotEvents = []) {
  const shots = Array.isArray(userShotEvents) ? userShotEvents.length : 0;
  const goals = Array.isArray(userShotEvents) ? userShotEvents.filter((event) => event?.goal).length : 0;
  return { shots, goals };
}

function conversionPercent(goals, shots) {
  if (!shots) return 0;
  return Math.round((Number(goals || 0) / Number(shots || 1)) * 100);
}

function calculatePreviewLeaderboardRank({ rows = [], user, currentCampaignScore = 0, bestCampaignScore = 0, team = "" }) {
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

function calculateEarlyQualifiedTeams(table, schedule, fullQualifiers, groupStageComplete) {
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


function DrawerContent({ children }) {
  return <section className="min-h-0 flex-1 overflow-auto px-0 pb-4 pt-2">{children}</section>;
}

function StatTile({ label, value, highlight = false }) {
  const Card = highlight ? UserHighlightCard : IvoryCard;
  return (
    <Card className="flex min-h-[78px] flex-col items-center justify-center p-3 text-center">
      <div className={`home-copy-bold text-[24px] uppercase leading-none ${highlight ? "text-[#F7D117]" : "text-[#072D1D]"}`}>{value}</div>
      <div className={`home-copy-regular mt-1 text-[8px] uppercase leading-tight tracking-[0.12em] ${highlight ? "text-[#F5F1E8]/72" : "text-[#0B5F35]"}`}>{label}</div>
    </Card>
  );
}

function rankTone(rankValue) {
  const rank = Number(String(rankValue || "").replace("#", ""));
  if (rank === 1) return { bg: "#D8B62F", text: "#072D1D", sub: "rgba(7,45,29,0.70)" };
  if (rank === 2) return { bg: "#C8C8C8", text: "#072D1D", sub: "rgba(7,45,29,0.70)" };
  if (rank === 3) return { bg: "#D9822B", text: "#072D1D", sub: "rgba(7,45,29,0.70)" };
  return { bg: "#072D1D", text: "#F7D117", sub: "rgba(245,241,232,0.72)" };
}

function RankStatTile({ value }) {
  const tone = rankTone(value);
  return (
    <div
      className="flex min-h-[78px] flex-col items-center justify-center rounded-[1.2rem] border border-[#F5F1E8]/20 p-3 text-center shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/18"
      style={{ background: tone.bg }}
    >
      <div className="home-copy-bold text-[24px] uppercase leading-none" style={{ color: tone.text }}>{value || "#--"}</div>
      <div className="home-copy-regular mt-1 text-[8px] uppercase leading-tight tracking-[0.12em]" style={{ color: tone.sub }}>Leaderboard rank</div>
    </div>
  );
}

function FormDot({ value }) {
  const dotClass = value === "W" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]" : value === "L" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" : value === "D" ? "bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.7)]" : "bg-[#F7D117]/28";
  return <span className={`h-3.5 w-3.5 rounded-full ${dotClass}`} />;
}

function TeamSummaryCard({ title, team, form = [], points = 0, roundLabel = "GROUP STAGE", highlight = false }) {
  const Card = highlight ? UserHighlightCard : IvoryCard;
  return (
    <Card className="p-3 text-left">
      <div className={`home-copy-bold text-[10px] uppercase leading-none tracking-[0.12em] ${highlight ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{title}</div>
      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3">
        <Flag team={team} className={`h-7 w-10 rounded-[6px] object-cover ${highlight ? "ring-1 ring-[#F7D117]/40" : "ring-1 ring-[#0B5F35]/18"}`} />
        <div className="min-w-0">
          <div className={`truncate home-copy-bold text-[18px] uppercase leading-none tracking-[0.04em] ${highlight ? "text-[#F7D117]" : "text-[#26352E]"}`}>{team || "NO TEAM"}</div>
          <div className={`mt-1 home-copy-bold text-[9px] uppercase leading-none tracking-[0.10em] ${highlight ? "text-[#F5F1E8]/78" : "text-[#0B5F35]"}`}>{roundLabel || "GROUP STAGE"}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="flex items-center gap-1.5">{Array.from({ length: 8 }).map((_, index) => <FormDot key={index} value={form[index]} />)}</div>
        <div className={`rounded-full px-3 py-1.5 home-copy-bold text-[14px] uppercase leading-none ${highlight ? "bg-[#F7D117] text-[#072D1D]" : "bg-[#0B5F35] text-[#F7D117]"}`}>{Number(points || 0)} PTS</div>
      </div>
    </Card>
  );
}

function CosmeticUpgradeCard({ id, title, detail, price, assetSrc, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(id)}
      className={`min-h-[142px] rounded-[1.25rem] border p-3 text-left shadow-[0_10px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.20)] transition-all ${
        active
          ? "border-[#F7D117]/35 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#F7D117]/20"
          : "border-[#F5F1E8]/35 bg-[#F7D117] text-[#072D1D] ring-1 ring-[#F7D117]/35"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${active ? "bg-[#F7D117]" : "bg-[#072D1D]"}`}>
          <img src={assetSrc} alt="" className="h-14 w-14 object-contain" draggable={false} />
        </div>
        <div className="min-w-0">
          <div className={`home-copy-bold text-[13px] uppercase leading-none tracking-[0.08em] ${active ? "text-[#F7D117]" : "text-[#072D1D]"}`}>{title}</div>
          <div className={`mt-1.5 home-copy-bold text-[16px] uppercase leading-none ${active ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{active ? "ACTIVE" : price}</div>
        </div>
      </div>
      <div className={`mt-3 home-copy-regular text-[8px] uppercase leading-tight tracking-[0.08em] ${active ? "text-[#F5F1E8]/76" : "text-[#072D1D]/75"}`}>{detail}</div>
    </button>
  );
}

function ClubhouseScreen({
  menuProps,
  team,
  userForm,
  campaignPoints,
  bestCampaignSummary,
  currentRoundLabel,
  leaderboardRank,
  mondayCupsWon,
  allTimeGoals,
  allTimeShots,
  activeCosmetics,
  onToggleCosmetic,
  currentUser = auth.currentUser,
}) {
  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST USER";
  const profileAction = currentUser ? "EDIT NICKNAME" : "REGISTER";
  const conversion = conversionPercent(allTimeGoals, allTimeShots);
  const currentSummary = {
    team: team || "NO TEAM",
    form: formForSummary(userForm),
    campaignPoints: Number(campaignPoints || 0),
    roundLabel: currentRoundLabel || "GROUP STAGE",
  };
  const bestSummary = bestCampaignSummary?.campaignPoints ? bestCampaignSummary : {
    team: team || "NO TEAM",
    form: [],
    campaignPoints: 0,
    roundLabel: "NO CAMPAIGN",
  };

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>CLUBHOUSE</ScreenTopBar>
      <DrawerContent>
        <MenuPanel title={displayName} subtitle={profileAction}>
          <div className="space-y-3 p-4 pt-2">
            <TeamSummaryCard title="Current Campaign" {...currentSummary} highlight />
            <TeamSummaryCard title="Best Campaign" {...bestSummary} />

            <div className="grid grid-cols-2 gap-2">
              <RankStatTile value={leaderboardRank || "#--"} />
              <StatTile label="Monday Cups won" value={mondayCupsWon || 0} />
              <StatTile label="Total goals scored" value={allTimeGoals || 0} />
              <StatTile label="Conversion percentage" value={`${conversion}%`} />
            </div>

            <div className="pt-1 text-center home-copy-bold text-[15px] uppercase leading-none tracking-[0.10em] text-[#F5F1E8]">Cosmetics</div>
            <div className="grid grid-cols-2 gap-2">
              <CosmeticUpgradeCard
                id="goldenBall"
                title="Golden Ball"
                price="£0.49"
                assetSrc="/assets/game/golden-ball.png"
                active={Boolean(activeCosmetics?.goldenBall)}
                onToggle={onToggleCosmetic}
                detail="Equips golden ball in-match. Adds a temporary +10% goal assist while testing."
              />
              <CosmeticUpgradeCard
                id="goldenGlove"
                title="Golden Glove"
                price="£0.49"
                assetSrc="/assets/game/golden-glove.png"
                active={Boolean(activeCosmetics?.goldenGlove)}
                onToggle={onToggleCosmetic}
                detail="Equips golden glove in-match. Adds a temporary +10% save assist while testing."
              />
            </div>
          </div>
        </MenuPanel>
      </DrawerContent>
    </main>
  );
}

function TrophyIcon({ unlocked }) {
  return (
    <svg viewBox="0 0 64 64" className={`h-10 w-10 ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]/34"}`} fill="none" aria-hidden="true">
      <path d="M22 10h20v9c0 9-4 16-10 19-6-3-10-10-10-19v-9Z" fill="currentColor" />
      <path d="M18 14H9v4c0 8 5 14 13 15M46 14h9v4c0 8-5 14-13 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 38v10M22 54h20M18 60h28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function TrophyCabinetScreen({ menuProps }) {
  const trophies = ["Host hero", "Group winner", "Knockout king", "Finalist", "Champion", "Golden boot", "Perfect power", "Perfect accuracy", "Clean sweep", "Underdog", "48-team master", "Monday legend"];
  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>TROPHY CABINET</ScreenTopBar>
      <DrawerContent>
        <MenuPanel title="COLLECTION" subtitle="Unlocked trophies use the user highlight style">
          <div className="grid grid-cols-3 gap-3 p-4 pt-2">
            {trophies.map((name, index) => {
              const unlocked = index < 5;
              const Card = unlocked ? UserHighlightCard : IvoryCard;
              return (
                <Card key={name} className="flex h-[104px] flex-col items-center justify-center p-2 text-center">
                  <TrophyIcon unlocked={unlocked} />
                  <div className={`home-copy-bold mt-2 text-[8px] uppercase leading-tight tracking-[0.06em] ${unlocked ? "text-[#F7D117]" : "text-[#26352E]"}`}>{name}</div>
                  <div className={`home-copy-regular mt-1 text-[6px] uppercase tracking-[0.10em] ${unlocked ? "text-[#F5F1E8]/72" : "text-[#0B5F35]/45"}`}>{unlocked ? "Unlocked" : "Locked"}</div>
                </Card>
              );
            })}
          </div>
        </MenuPanel>
      </DrawerContent>
    </main>
  );
}

const LEADERBOARD_GRID = "46px minmax(0,1fr) 44px 58px";

function LeaderboardFlag({ team, isUser = false }) {
  const flagClass = `h-[16px] w-[24px] rounded-[4px] object-cover ${isUser ? "ring-1 ring-[#F7D117]/45" : "ring-1 ring-[#0B5F35]/18"}`;
  if (!team) {
    return (
      <div className={`grid h-[18px] w-[31px] place-items-center rounded-[5px] border ${isUser ? "border-[#F7D117]/35 bg-[#0B5F35] text-[#F5F1E8]" : "border-[#0B5F35]/20 bg-[#0B5F35] text-[#F5F1E8]"}`}>
        <span className="home-copy-bold text-[8px] uppercase leading-none tracking-[0.035em]">TBC</span>
      </div>
    );
  }
  return <Flag team={team} className={flagClass} />;
}

function LeaderboardHeader() {
  return (
    <div
      className="grid items-center gap-2 px-3 pb-2 text-center home-copy-bold text-[8px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]"
      style={{ gridTemplateColumns: LEADERBOARD_GRID }}
    >
      <span className="justify-self-center text-center">Rank</span>
      <span className="justify-self-start text-left">Username</span>
      <span className="justify-self-center text-center">Team</span>
      <span className="justify-self-center text-center">Score</span>
    </div>
  );
}

function LeaderboardRow({ row, isUser = false }) {
  return (
    <div
      className={`grid h-14 items-center gap-2 rounded-[1.2rem] border px-3 py-0 shadow-[0_8px_18px_rgba(0,0,0,0.10)] ${isUser ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/16" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-1 ring-[#F5F1E8]/18"}`}
      style={{ gridTemplateColumns: LEADERBOARD_GRID }}
    >
      <div className={`flex min-w-0 items-center justify-center text-center home-copy-bold text-[14px] leading-none ${isUser ? "text-[#F7D117]" : "text-[#0B5F35]/65"}`}>#{row.rank || "--"}</div>
      <div className={`flex min-w-0 items-center justify-start truncate text-left home-copy-bold text-[14px] uppercase leading-none tracking-[0.04em] ${isUser ? "text-[#F7D117]" : "text-[#26352E]"}`}>{row.username || "-"}</div>
      <div className="flex min-w-0 items-center justify-center"><LeaderboardFlag team={row.team} isUser={isUser} /></div>
      <div className={`flex min-w-0 items-center justify-center text-center home-copy-bold text-[15px] leading-none ${isUser ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{Number(row.campaignPoints || 0)}</div>
    </div>
  );
}

function ScoringTypeBox({ label, points }) {
  return (
    <div className="rounded-[0.9rem] border border-[#F5F1E8]/70 bg-[#F5F1E8] p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_5px_10px_rgba(0,0,0,0.10)]">
      <div className="home-copy-bold text-[22px] leading-none text-[#0B5F35]">+{points}</div>
      <div className="mt-1.5 home-copy-bold text-[9px] uppercase leading-tight tracking-[0.07em] text-[#072D1D]">{label}</div>
    </div>
  );
}

function ScoringSection({ title, items }) {
  return (
    <div className="space-y-2">
      <div className="text-center home-copy-bold text-[14px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => <ScoringTypeBox key={item.label} {...item} />)}
      </div>
    </div>
  );
}

function LeaderboardScreen({ menuProps, rows = [], currentCampaignScore = 0, bestCampaignScore = 0, team = "", currentUser = auth.currentUser }) {
  const [leaderboardView, setLeaderboardView] = useState("scores");
  const placeholderRows = Array.from({ length: 5 }, (_, index) => ({
    id: `placeholder-${index}`,
    username: "-",
    team: "",
    campaignPoints: 0,
    isPlaceholder: true,
  }));

  const activeUserScore = Math.max(Number(currentCampaignScore || 0), Number(bestCampaignScore || 0));
  const activeUserId = currentUser?.uid || "guest-preview";
  const hasRegisteredUserRow = Boolean(currentUser?.uid && rows.some((row) => row.userId === currentUser.uid));
  const previewUserRow = activeUserScore > 0 && !hasRegisteredUserRow
    ? [{
        id: "current-user-preview",
        userId: activeUserId,
        username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "YOU",
        team,
        campaignPoints: activeUserScore,
        isUserPreview: true,
      }]
    : [];

  const baseRows = rows.length ? rows : placeholderRows;
  const rankedRows = [...previewUserRow, ...baseRows]
    .sort((a, b) => Number(b.campaignPoints || 0) - Number(a.campaignPoints || 0))
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const visibleRows = rankedRows.length ? rankedRows : placeholderRows.map((row, index) => ({ ...row, rank: index + 1 }));
  const myRankRow = rankedRows.find((row) => row.isUserPreview || (currentUser?.uid && row.userId === currentUser.uid)) || {
    id: "my-rank-empty",
    rank: "--",
    username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "YOU",
    team,
    campaignPoints: activeUserScore,
    isUserPreview: true,
  };

  const sliderButtonClass = (active) => `rounded-full px-3 py-2 home-copy-bold text-[14px] uppercase tracking-[0.08em] transition-all ${
    active
      ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.22)]"
      : "bg-transparent text-[#F5F1E8]"
  }`;

  const scoringSections = [
    {
      title: "Match Results",
      items: [
        { label: "Match Played", points: LEADERBOARD_POINTS.MATCH_PLAYED },
        { label: "Match Drawn", points: LEADERBOARD_POINTS.MATCH_DRAWN },
        { label: "Match Won", points: LEADERBOARD_POINTS.MATCH_WON },
        { label: "Sudden Death Win", points: LEADERBOARD_POINTS.SUDDEN_DEATH_MATCH_WIN },
      ],
    },
    {
      title: "Shot Skill",
      items: [
        { label: "Target Zone", points: LEADERBOARD_POINTS.TARGET_ZONE_RELEASE },
        { label: "Goal Scored", points: LEADERBOARD_POINTS.GOAL_SCORED },
        { label: "Target Goal Combo", points: LEADERBOARD_POINTS.TARGET_ZONE_GOAL_COMBO },
        { label: "Top Corner Bonus", points: LEADERBOARD_POINTS.TOP_CORNER_TARGET_ZONE_GOAL },
        { label: "Sudden Death Goal", points: LEADERBOARD_POINTS.SUDDEN_DEATH_GOAL },
        { label: "Perfect Shootout Win", points: LEADERBOARD_POINTS.PERFECT_SHOOTOUT_WIN },
      ],
    },
    {
      title: "Tournament Progress",
      items: [
        { label: "Qualify Group", points: LEADERBOARD_POINTS.QUALIFY_FROM_GROUP },
        { label: "Reach Round of 16", points: LEADERBOARD_POINTS.REACH_ROUND_OF_16 },
        { label: "Reach Quarter Final", points: LEADERBOARD_POINTS.REACH_QUARTER_FINAL },
        { label: "Reach Semi Final", points: LEADERBOARD_POINTS.REACH_SEMI_FINAL },
        { label: "Reach Final", points: LEADERBOARD_POINTS.REACH_FINAL },
        { label: "Win Third Place", points: LEADERBOARD_POINTS.WIN_THIRD_PLACE_PLAY_OFF },
        { label: "Runner-Up Finish", points: LEADERBOARD_POINTS.RUNNER_UP_FINISH },
        { label: "Win Monday Cup", points: LEADERBOARD_POINTS.WIN_MONDAY_CUP },
      ],
    },
  ];

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>RANKING</ScreenTopBar>
      <DrawerContent>
        <div className="mx-auto mb-2 grid w-[94%] grid-cols-2 gap-2 rounded-full border border-[#F5F1E8]/14 bg-[#0B5F35]/82 p-1 shadow-[inset_0_1px_0_rgba(245,241,232,0.08),0_8px_20px_rgba(0,0,0,0.12)]">
          <button type="button" onClick={() => setLeaderboardView("scores")} className={sliderButtonClass(leaderboardView === "scores")}>HIGH SCORES</button>
          <button type="button" onClick={() => setLeaderboardView("model")} className={sliderButtonClass(leaderboardView === "model")}>POINTS SYSTEM</button>
        </div>

        <MenuPanel title={leaderboardView === "model" ? "SCORING" : "LEADERBOARD"}>
          <div className="p-4 pt-2">
            {leaderboardView === "model" ? (
              <div className="space-y-3.5">
                {scoringSections.map((section) => <ScoringSection key={section.title} {...section} />)}
              </div>
            ) : (
              <div>
                <LeaderboardHeader />
                    <div className="space-y-2 pr-1">
                  {visibleRows.slice(0, 5).map((row) => {
                    const isUser = Boolean((currentUser && row.userId === currentUser.uid) || row.isUserPreview);
                    return <LeaderboardRow key={`${row.userId || row.id || row.username}-${row.completedAt || row.rank}`} row={row} isUser={isUser} />;
                  })}
                </div>
              </div>
            )}
          </div>
        </MenuPanel>
        {leaderboardView === "scores" && (
          <MenuPanel title="MY RANK" className="mt-4">
            <div className="p-4 pt-2">
              <LeaderboardRow row={myRankRow} isUser />
            </div>
          </MenuPanel>
        )}
      </DrawerContent>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fixtureView, setFixtureView] = useState("group");
  const [standingsView, setStandingsView] = useState("group");
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [allTeamsUnlocked, setAllTeamsUnlocked] = useState(false);
  const [team, setTeam] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState([0, 0]);
  const [matchResult, setMatchResult] = useState(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [table, setTable] = useState(blankTable());
  const [schedule, setSchedule] = useState(buildSchedule());
  const [knockoutFixtures, setKnockoutFixtures] = useState([]);
  const [currentKnockoutMatch, setCurrentKnockoutMatch] = useState(null);
  const [podium, setPodium] = useState({});
  const [matchStage, setMatchStage] = useState("GROUP STAGE");
  const [userForm, setUserForm] = useState([]);
  const [scoringState, setScoringState] = useState(() => createScoringState());
  const [bestCampaignScore, setBestCampaignScore] = useState(() => safeReadNumber(BEST_CAMPAIGN_SCORE_KEY, 0));
  const [leaderboardRows, setLeaderboardRows] = useState(() => safeReadLeaderboardRows());
  const [bestCampaignSummary, setBestCampaignSummary] = useState(() => safeReadJson(BEST_CAMPAIGN_SUMMARY_KEY, null));
  const [mondayCupsWon, setMondayCupsWon] = useState(() => safeReadNumber(MONDAY_CUPS_WON_KEY, 0));
  const [allTimeGoals, setAllTimeGoals] = useState(() => safeReadNumber(ALL_TIME_GOALS_KEY, 0));
  const [allTimeShots, setAllTimeShots] = useState(() => safeReadNumber(ALL_TIME_SHOTS_KEY, 0));
  const [activeCosmetics, setActiveCosmetics] = useState(() => safeReadJson(COSMETICS_KEY, { goldenBall: false, goldenGlove: false }));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthComplete = (user) => {
    setCurrentUser(user || auth.currentUser || null);
    setScreen("teams");
    setDrawer(null);
  };

  const groupStageComplete = schedule.every((fixture) => fixture.played);
  const visibleKnockoutFixtures = groupStageComplete && !knockoutFixtures.length ? buildRound32Fixtures(table) : knockoutFixtures;
  const allGroups = useMemo(() => GROUP_LETTERS.map((group) => ({ group, rows: sortRows(GROUPS[group].map((name) => table[name])) })), [table]);
  const qualifiers = useMemo(() => buildQualifiers(table), [table]);
  const qualifiedTeams = useMemo(() => calculateEarlyQualifiedTeams(table, schedule, qualifiers, groupStageComplete), [table, schedule, qualifiers, groupStageComplete]);

  const activeGroupFixture = useMemo(() => {
    if (!team || !opponent) return null;
    return schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
      || schedule.find((fixture) => fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)))
      || null;
  }, [schedule, selectedGroup, team, opponent]);

  const currentFixture = currentKnockoutMatch ? toGameFixture(currentKnockoutMatch) : toGameFixture(activeGroupFixture);
  const currentRoundLabel = team ? roundLabelForResult(matchResult, matchStage) : "NO CAMPAIGN";
  const myLeaderboardRank = calculatePreviewLeaderboardRank({
    rows: leaderboardRows,
    user: currentUser,
    currentCampaignScore: scoringState.campaignPoints,
    bestCampaignScore,
    team,
  });

  const applyLeaderboardScore = (baseResult, userShotEvents = []) => {
    const nextScoringState = applyCompletedMatchScore({
      scoringState,
      result: baseResult,
      userShotEvents,
    });
    const enrichedResult = {
      ...baseResult,
      userShotEvents,
      campaignPoints: nextScoringState.campaignPoints,
      pointsAwarded: nextScoringState.lastMatchPoints,
      pointsBreakdown: nextScoringState.lastBreakdown,
    };

    setScoringState(nextScoringState);

    const shotStats = countShotStats(userShotEvents);
    if (shotStats.shots > 0) {
      setAllTimeGoals((value) => {
        const next = Number(value || 0) + shotStats.goals;
        safeWriteNumber(ALL_TIME_GOALS_KEY, next);
        return next;
      });
      setAllTimeShots((value) => {
        const next = Number(value || 0) + shotStats.shots;
        safeWriteNumber(ALL_TIME_SHOTS_KEY, next);
        return next;
      });
    }

    if (baseResult.status === RESULT_STATUS.CHAMPION) {
      setMondayCupsWon((value) => {
        const next = Number(value || 0) + 1;
        safeWriteNumber(MONDAY_CUPS_WON_KEY, next);
        return next;
      });
    }

    if (nextScoringState.campaignPoints > bestCampaignScore) {
      const summary = buildCampaignSummary({
        team,
        userForm: [...userForm, resultFormCode(enrichedResult, team)].filter(Boolean).slice(-8),
        campaignPoints: nextScoringState.campaignPoints,
        result: enrichedResult,
        fallbackRound: matchStage,
      });
      setBestCampaignScore(nextScoringState.campaignPoints);
      setBestCampaignSummary(summary);
      safeWriteNumber(BEST_CAMPAIGN_SCORE_KEY, nextScoringState.campaignPoints);
      safeWriteJson(BEST_CAMPAIGN_SUMMARY_KEY, summary);
    }

    if (isTerminalLeaderboardStatus(baseResult.status) && currentUser) {
      const entry = createLeaderboardEntry({
        user: currentUser,
        team,
        campaignPoints: nextScoringState.campaignPoints,
        status: baseResult.status,
        podium,
      });
      setLeaderboardRows((rows) => {
        const nextRows = [entry, ...rows].sort((a, b) => Number(b.campaignPoints || 0) - Number(a.campaignPoints || 0)).slice(0, 50);
        safeWriteLeaderboardRows(nextRows);
        return nextRows;
      });
      publishRegisteredLeaderboardEntry(entry);
    }

    return enrichedResult;
  };

  const closeMenu = () => setMenuOpen(false);
  const resetTournament = () => { setScreen("home"); setDrawer(null); setMenuOpen(false); setFixtureView("group"); setStandingsView("group"); setSelectedGroup("A"); setAllTeamsUnlocked(false); setTeam(null); setOpponent(""); setScore([0, 0]); setMatchResult(null); setModalDismissed(false); setTable(blankTable()); setSchedule(buildSchedule()); setKnockoutFixtures([]); setCurrentKnockoutMatch(null); setPodium({}); setMatchStage("GROUP STAGE"); setUserForm([]); setScoringState(createScoringState()); };
  const openMatch = () => { closeMenu(); setDrawer(null); };
  const openFixtures = () => { closeMenu(); setFixtureView(groupStageComplete ? "knockout" : "group"); setDrawer("fixtures"); };
  const openGroups = () => { closeMenu(); setStandingsView(groupStageComplete ? "knockout" : standingsView); setDrawer("groups"); };
  const openClubhouse = () => { closeMenu(); setDrawer("clubhouse"); };
  const openTrophyCabinet = () => { closeMenu(); setDrawer("trophyCabinet"); };
  const openLeaderboard = () => { closeMenu(); setDrawer("leaderboard"); };
  const selectGroup = (group) => { setAllTeamsUnlocked(true); setSelectedGroup(group); setScreen("teams"); };

  const startTeam = (name, groupOverride = selectedGroup) => {
    const fixture = schedule.find((item) => !item.played && item.group === groupOverride && (item.home === name || item.away === name)) || schedule.find((item) => item.group === groupOverride && (item.home === name || item.away === name));
    setSelectedGroup(groupOverride);
    setTeam(name);
    setOpponent(fixture?.home === name ? fixture.away : fixture?.home || "Opponent");
    setScreen("match");
    setDrawer(null);
    setMenuOpen(false);
    setScore([0, 0]);
    setCurrentKnockoutMatch(null);
    setMatchStage("GROUP STAGE");
    setMatchResult(null);
    setModalDismissed(false);
    setUserForm([]);
    setScoringState(createScoringState());
  };

  const quickWin = () => {
    if (!team || !opponent) return;
    const match = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && ((fixture.home === team && fixture.away === opponent) || (fixture.home === opponent && fixture.away === team)));
    if (!match) return;
    const homeGoals = match.home === team ? 1 : 0;
    const awayGoals = match.away === team ? 1 : 0;
    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals, awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, homeGoals, awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
    setScore([1, 0]);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) setKnockoutFixtures(buildRound32Fixtures(updatedTable));
    setModalDismissed(false);
    setUserForm((form) => [...form, "W"].slice(-8));
    const displayResult = applyLeaderboardScore({
      home: match.home,
      away: match.away,
      homeGoals,
      awayGoals,
      userWon: true,
      won: true,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : RESULT_STATUS.GROUP_WIN,
      isDraw: false,
    }, []);
    setMatchResult(displayResult);
  };

  const handleMatchComplete = (result) => {
    if (!result || !team) return;

    if (currentKnockoutMatch && resultBelongsToFixture(result, currentKnockoutMatch)) {
      const userPlayedMatch = {
        ...currentKnockoutMatch,
        played: true,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
      };

      const { updatedFixtures, playedUserMatch, nextUserFixture, podium: completedPodium } = completeKnockoutRound({
        fixtures: knockoutFixtures,
        currentMatch: currentKnockoutMatch,
        userTeam: team,
        userResult: userPlayedMatch,
      });

      const userScore = userScoreFromFixtureResult({
        homeTeam: playedUserMatch.home,
        awayTeam: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
      }, team);

      setScore(userScore);
      setKnockoutFixtures(updatedFixtures);
      if (completedPodium) setPodium(completedPodium);
      const matchNo = playedUserMatch.matchNo;
      const status = getUserFinishStatus({ result, fixture: playedUserMatch, matchNo, userWon: result.userWon });
      setModalDismissed(false);
      setUserForm((form) => [...form, resultFormCode(result, team)].filter(Boolean).slice(-8));
      const displayResult = applyLeaderboardScore({
        home: playedUserMatch.home,
        away: playedUserMatch.away,
        homeGoals: playedUserMatch.homeGoals,
        awayGoals: playedUserMatch.awayGoals,
        userWon: result.userWon,
        won: result.userWon,
        week: null,
        matchNo,
        status,
        nextFixture: nextUserFixture,
        isDraw: false,
      }, result.userShotEvents || []);
      setMatchResult(displayResult);
      return;
    }

    const match = schedule.find((fixture) => fixture.id === result.fixtureId) || activeGroupFixture;
    if (!match) return;

    const afterUserSchedule = schedule.map((fixture) => fixture.id === match.id ? { ...fixture, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : fixture);
    const afterUserTable = applyFixtureResult(table, match, result.homeGoals, result.awayGoals);
    const { updatedSchedule, updatedTable } = completeMatchday(afterUserSchedule, afterUserTable, match.week);
    const completedGroupStage = updatedSchedule.every((fixture) => fixture.played);
    const qualified = completedGroupStage ? didTeamQualify(team, updatedTable) : false;
    const userScore = userScoreFromFixtureResult(result, team);

    setScore(userScore);
    setSchedule(updatedSchedule);
    setTable(updatedTable);
    if (completedGroupStage) setKnockoutFixtures(buildRound32Fixtures(updatedTable));
    setModalDismissed(false);
    setUserForm((form) => [...form, resultFormCode(result, team)].filter(Boolean).slice(-8));
    const displayResult = applyLeaderboardScore({
      home: match.home,
      away: match.away,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      userWon: result.userWon,
      won: result.userWon,
      week: match.week,
      status: completedGroupStage ? (qualified ? RESULT_STATUS.QUALIFIED : RESULT_STATUS.ELIMINATED) : (result.isDraw ? RESULT_STATUS.GROUP_DRAW : result.userWon ? RESULT_STATUS.GROUP_WIN : RESULT_STATUS.GROUP_LOSS),
      isDraw: result.isDraw || result.homeGoals === result.awayGoals,
    }, result.userShotEvents || []);
    setMatchResult(displayResult);
  };

  const nextMatch = () => {
    if (!team || !matchResult) return;

    if (matchResult.status === RESULT_STATUS.THIRD_PLACE_PENDING) {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => fixture.matchNo === 103 && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if ([RESULT_STATUS.ELIMINATED, RESULT_STATUS.RUNNER_UP, RESULT_STATUS.THIRD_PLACE, RESULT_STATUS.FOURTH_PLACE].includes(matchResult.status)) { resetTournament(); return; }

    if (matchResult.status === RESULT_STATUS.CHAMPION) {
      setCurrentKnockoutMatch(null);
      setStandingsView("knockout");
      setDrawer("groups");
      setMatchResult(null);
      setModalDismissed(false);
      return;
    }

    if (matchResult.status === RESULT_STATUS.QUALIFIED) {
      const round32 = knockoutFixtures.length ? knockoutFixtures : buildRound32Fixtures(table);
      const userFixture = findTeamKnockoutFixture(team, round32);
      if (userFixture) {
        setKnockoutFixtures(round32);
        setCurrentKnockoutMatch(userFixture);
        setOpponent(getFixtureOpponent(team, userFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(userFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    if (matchResult.status === RESULT_STATUS.KNOCKOUT_WIN) {
      const nextFixture = matchResult.nextFixture || knockoutFixtures.find((fixture) => !fixture.played && (fixture.home === team || fixture.away === team));
      if (nextFixture) {
        setCurrentKnockoutMatch(nextFixture);
        setOpponent(getFixtureOpponent(team, nextFixture));
        setScore([0, 0]);
        setMatchStage(knockoutStageLabel(nextFixture.matchNo));
        setMatchResult(null);
        setModalDismissed(false);
        setDrawer(null);
        setScreen("match");
        return;
      }
    }

    const upcoming = schedule.find((fixture) => !fixture.played && fixture.group === selectedGroup && (fixture.home === team || fixture.away === team));

    setMatchResult(null);
    setModalDismissed(false);
    if (upcoming) {
      setOpponent(upcoming.home === team ? upcoming.away : upcoming.home);
      setScore([0, 0]);
      setCurrentKnockoutMatch(null);
      setMatchStage("GROUP STAGE");
      setDrawer(null);
      setScreen("match");
    } else {
      setFixtureView(groupStageComplete ? "knockout" : "group");
      setStandingsView(groupStageComplete ? "knockout" : standingsView);
      setDrawer("fixtures");
    }
  };

  const toggleCosmetic = (id) => {
    setActiveCosmetics((current) => {
      const next = { ...(current || {}), [id]: !current?.[id] };
      safeWriteJson(COSMETICS_KEY, next);
      return next;
    });
  };

  const menuProps = { menuOpen, onToggleMenu: () => setMenuOpen((open) => !open), onMatch: openMatch, onFixtures: openFixtures, onGroups: openGroups, onClubhouse: openClubhouse, onTrophyCabinet: openTrophyCabinet, onLeaderboard: openLeaderboard, onRestart: resetTournament };

  if (screen === "home") return <HomeScreen allTeamsUnlocked={allTeamsUnlocked} onSelectGroup={selectGroup} onSelectTeam={startTeam} onAuthComplete={handleAuthComplete} authReady={authReady} currentUser={currentUser} />;
  if (screen === "teams") return <TeamSelectScreen allTeamsUnlocked={allTeamsUnlocked} selectedGroup={selectedGroup} onBack={() => setScreen("home")} onSelectGroup={setSelectedGroup} onSelectTeam={startTeam} />;
  if (drawer === "groups") return <DrawerShell><GroupsScreen allGroups={allGroups} qualifiers={qualifiers} menuProps={menuProps} standingsView={standingsView} onStandingsViewChange={setStandingsView} knockoutFixtures={visibleKnockoutFixtures} qualifiedTeams={qualifiedTeams} userTeam={team} podium={podium} /></DrawerShell>;
  if (drawer === "clubhouse") return (
    <DrawerShell>
      <ClubhouseScreen
        menuProps={menuProps}
        team={team}
        userForm={userForm}
        campaignPoints={scoringState.campaignPoints}
        bestCampaignSummary={bestCampaignSummary}
        currentRoundLabel={currentRoundLabel}
        leaderboardRank={myLeaderboardRank}
        mondayCupsWon={mondayCupsWon}
        allTimeGoals={allTimeGoals}
        allTimeShots={allTimeShots}
        activeCosmetics={activeCosmetics}
        onToggleCosmetic={toggleCosmetic}
        currentUser={currentUser}
      />
    </DrawerShell>
  );
  if (drawer === "trophyCabinet") return <DrawerShell><TrophyCabinetScreen menuProps={menuProps} /></DrawerShell>;
  if (drawer === "leaderboard") return <DrawerShell><LeaderboardScreen menuProps={menuProps} rows={leaderboardRows} currentCampaignScore={scoringState.campaignPoints} bestCampaignScore={bestCampaignScore} team={team} currentUser={currentUser} /></DrawerShell>;
  if (drawer === "fixtures") return <DrawerShell><FixturesScreen fixtureView={fixtureView} onFixtureViewChange={setFixtureView} schedule={schedule} menuProps={menuProps} knockoutFixtures={visibleKnockoutFixtures} userTeam={team} /></DrawerShell>;
  return <MatchScreen team={team} opponent={opponent} score={score} matchResult={matchResult} modalDismissed={modalDismissed} onDismissModal={() => setModalDismissed(true)} onQuickWin={quickWin} onMatchComplete={handleMatchComplete} onNextMatch={nextMatch} onViewBracket={() => { setStandingsView("knockout"); setDrawer("groups"); setModalDismissed(true); }} onPlayAgain={resetTournament} menuProps={menuProps} stageLabel={matchStage} fixture={currentFixture} groupRows={allGroups.find((item) => item.group === selectedGroup)?.rows || []} qualifiedTeams={qualifiedTeams} selectedGroup={selectedGroup} userForm={userForm} podium={podium} activeCosmetics={activeCosmetics} />;
}
