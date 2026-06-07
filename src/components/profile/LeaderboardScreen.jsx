import { useState } from "react";
import { auth } from "../../firebase.js";
import { LEADERBOARD_POINTS } from "../../logic/leaderboardScoring.js";
import { formForSummary, conversionPercent } from "../../logic/appState.js";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { AuthMenuPanel } from "../layout/Menu.jsx";
import { MenuPanel, IvoryCard, UserHighlightCard } from "../layout/MenuPanel.jsx";
import { ActionButton } from "../layout/ActionButton.jsx";
import { Flag } from "../shared.jsx";
import PageTabs, { PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import AppPanel, { appPanelStyleForVariant } from "../ui/AppPanel.jsx";
import { getTeamDisplayName } from "../ui/TeamName.jsx";
import { normaliseTicketQuantity } from "../../data/storeItems.js";
import { GROUPS } from "../../data/teams.js";
import { ShirtPosterPreview } from "../share/SharePreviews.jsx";

function DrawerContent({ children }) {
  return <PageScroll className="px-0 pt-0.5">{children}</PageScroll>;
}

const LEADERBOARD_GRID = "34px minmax(76px,96px) minmax(44px,0.85fr) minmax(92px,1.25fr) minmax(32px,0.55fr) minmax(56px,0.9fr)";

function leaderboardCosmetics(row = {}) {
  const applied = row.cosmeticsApplied || row.bestCampaign?.cosmeticsApplied || row.bestCampaign || {};
  return {
    goldenBoot: Boolean(applied.goldenBoot || applied.cosmetic3),
    goldenBall: Boolean(applied.goldenBall || applied.cosmeticBallEquipped),
    goldenGlove: Boolean(applied.goldenGlove || applied.cosmeticGloveEquipped),
    goldenTicket: Boolean(applied.goldenTicket || applied.cosmetic4 || applied.goldenTicketUsed),
  };
}

function leaderboardUsedUpgrade(row = {}) {
  const cosmetics = leaderboardCosmetics(row);
  return Boolean(cosmetics.goldenBoot || cosmetics.goldenBall || cosmetics.goldenGlove || cosmetics.goldenTicket);
}

function leaderboardForm(row = {}) {
  const form = row.cupRun || row.bestCampaign?.cupRun || row.formGuide || row.tournamentProgress || row.form || row.bestCampaign?.formGuide || row.bestCampaign?.tournamentProgress || row.bestCampaign?.form || [];
  return Array.isArray(form) ? form.slice(-8) : [];
}

function leaderboardFinishStatus(row = {}) {
  const raw = String(row.status || row.finish || row.finalPosition || row.bestCampaign?.status || row.bestCampaign?.finalPosition || row.bestCampaign?.roundLabel || row.bestCampaign?.stage || "").toLowerCase();
  if (raw.includes("champion")) return "champion";
  if (raw.includes("runner")) return "runnerUp";
  if (raw.includes("third")) return "thirdPlace";
  return null;
}

const LEADERBOARD_PODIUM_SHIELDS = {
  champion: "/assets/badges/mc-champs2.png",
  runnerUp: "/assets/badges/mc-runner-up.png",
  thirdPlace: "/assets/badges/mc-third-place.png",
};

function LeaderboardPodiumBadge({ row, isUser = false }) {
  const status = leaderboardFinishStatus(row);
  const baseClass = isUser ? "border-[#F7D117]/28 bg-[#F7D117]/10" : "border-[#0B5F35]/18 bg-[#0B5F35]/8";

  if (!status) {
    return <span className="block h-[24px] w-[24px]" aria-hidden="true" />;
  }

  const aria = status === "champion" ? "first place" : status === "runnerUp" ? "second place" : "third place";

  return (
    <span className="grid h-[24px] w-[24px] place-items-center" aria-label={aria}>
      <img
        src={LEADERBOARD_PODIUM_SHIELDS[status]}
        alt=""
        className="block h-[24px] w-[24px] object-contain"
        draggable={false}
      />
    </span>
  );
}

function LeaderboardFormGuide({ form = [], isUser = false }) {
  const safeForm = Array.from({ length: 8 }).map((_, index) => form[index]);
  return (
    <div className="flex min-w-0 items-center justify-center gap-[clamp(3px,0.85vw,6px)]">
      {safeForm.map((value, index) => (
        <span key={index} className={`block h-[7px] w-[7px] rounded-full ${
          value === "W"
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]"
            : value === "L"
              ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
              : value === "D"
                ? "bg-[#F7D117] shadow-[0_0_6px_rgba(247,209,23,0.72)]"
                : isUser ? "bg-[#F7D117]/24" : "bg-[#F5F1E8]/16"
        }`} aria-hidden="true" />
      ))}
    </div>
  );
}

function LeaderboardFilterSlider({ cleanOnly, onToggle }) {
  return (
    <PageTabs
      value={cleanOnly ? "clean" : "all"}
      onChange={(nextValue) => {
        const nextCleanOnly = nextValue === "clean";
        if (nextCleanOnly !== cleanOnly) onToggle?.();
      }}
      ariaLabel="Toggle clean leaderboard"
      size="icon"
      className="mb-1.5"
      options={[
        { value: "clean", label: "Clean", ariaLabel: "Clean leaderboard", iconSrc: "/assets/game/ball1.png" },
        { value: "all", label: "All", ariaLabel: "All scores", iconSrc: "/assets/game/golden-ball.png" },
      ]}
    />
  );
}

function LeaderboardFlag({ team, isUser = false }) {
  if (!team) {
    return <span className={`grid h-[18px] w-[28px] place-items-center text-center home-copy-bold text-[11px] leading-none ${isUser ? "text-[#F5F1E8]/82" : "text-[#F5F1E8]/55"}`}>-</span>;
  }
  return <TeamFlag team={team} isUserTeam={isUser} className="h-[18px] w-[28px] rounded-[5px] object-cover" fallbackRing="ring-[#0B5F35]/18" />;
}

function LeaderboardHeader() {
  return (
    <div
      className="grid items-center gap-0 px-3 pb-1.5 text-center home-copy-bold text-[7px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]"
      style={{ gridTemplateColumns: LEADERBOARD_GRID }}
    >
      <span className="justify-self-center text-center">Rank</span>
      <span className="justify-self-start text-left">Username</span>
      <span className="justify-self-center text-center">Team</span>
      <span className="justify-self-center text-center">Cup Run</span>
      <span className="justify-self-center text-center">Podium</span>
      <span className="flex w-full min-w-0 items-center justify-center text-center leading-tight">Game Score</span>
    </div>
  );
}

function leaderboardPodiumRowClass(rank) {
  const numericRank = Number(rank);
  const baseRowClass = "bg-[#052D1D]/68 text-[#F5F1E8]";
  if (numericRank === 1) return `${baseRowClass} border-[#D8B62F]/80 ring-1 ring-[#F7D117]/32`;
  if (numericRank === 2) return `${baseRowClass} border-[#C8C8C8]/80 ring-1 ring-[#F5F1E8]/28`;
  if (numericRank === 3) return `${baseRowClass} border-[#CD7F32]/80 ring-1 ring-[#CD7F32]/30`;
  return "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/10";
}

function leaderboardPodiumTextClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  if (numericRank === 1) return "text-[#D8B62F]";
  if (numericRank === 2) return "text-[#C8C8C8]";
  if (numericRank === 3) return "text-[#CD7F32]";
  if (isUser) return "text-[#F7D117]";
  return "text-[#F5F1E8]/66";
}

function leaderboardNameTextClass(row, isUser = false) {
  if (isUser) return "text-[#F7D117]";
  return "text-[#F5F1E8]";
}

function leaderboardScoreTextClass(row, isUser = false) {
  return "font-led text-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.42)]";
}

function LeaderboardRow({ row, isUser = false }) {
  const form = leaderboardForm(row);
  const numericRank = Number(row?.rank);
  const isPodium = [1, 2, 3].includes(numericRank);
  const defaultRowClass = leaderboardPodiumRowClass(row.rank);
  const rowClass = isUser && !isPodium
    ? "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/10"
    : defaultRowClass;

  return (
    <div
      className={`grid h-[39px] items-center gap-0 rounded-[1.05rem] border px-3 py-0 shadow-[0_6px_14px_rgba(0,0,0,0.10)] ${rowClass}`}
      style={{ gridTemplateColumns: LEADERBOARD_GRID }}
    >
      <div className={`flex min-w-0 items-center justify-center text-center home-copy-bold text-[13px] leading-none ${leaderboardPodiumTextClass(row, isUser)}`}>#{row.rank || "--"}</div>
      <div className={`flex min-w-0 items-center justify-start text-left home-copy-bold text-[13px] uppercase leading-none tracking-[0.04em] ${leaderboardNameTextClass(row, isUser)}`}>
        <span className="block max-w-[12ch] truncate">{row.username || "-"}</span>
      </div>
      <div className="flex min-w-0 items-center justify-center"><LeaderboardFlag team={row.team} isUser={isUser} /></div>
      <LeaderboardFormGuide form={form} isUser={isUser} />
      <div className="flex min-w-0 items-center justify-center"><LeaderboardPodiumBadge row={row} isUser={isUser} /></div>
      <div className={`flex w-full min-w-0 items-center justify-center text-center text-[9px] leading-none tracking-[0.02em] ${leaderboardScoreTextClass(row, isUser)}`}><span className="block w-full text-center tabular-nums">{Number(row.campaignPoints || 0)}</span></div>
    </div>
  );
}

function ScoringTypeBox({ label, points, tone = "ivory" }) {
  const toneClass = {
    red: "border-red-500/50 bg-red-500 text-[#F5F1E8]",
    yellow: "border-[#F7D117]/60 bg-[#F7D117] text-[#072D1D]",
    green: "border-green-500/55 bg-green-500 text-[#F5F1E8]",
    bronze: "mc-metallic-bronze border-[#CD7F32]/70 text-[#072D1D]",
    silver: "mc-metallic-silver border-[#C8C8C8]/80 text-[#072D1D]",
    gold: "mc-metallic-gold border-[#D8B62F]/80 text-[#072D1D]",
    ivory: "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8]",
  }[tone] || "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8]";

  return (
    <div className={`rounded-[0.9rem] border p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_5px_10px_rgba(0,0,0,0.10)] ${toneClass}`}>
      <div className="home-copy-bold text-[17px] leading-none">+{points}</div>
      <div className="mt-1 home-copy-bold text-[7px] uppercase leading-tight tracking-[0.07em]">{label}</div>
    </div>
  );
}

function ScoringMeter({ title }) {
  return (
    <div className="rounded-[1rem] border border-[#F5F1E8]/14 bg-[#072D1D]/64 px-3 py-3">
      <div className="mb-1 text-center home-copy-bold text-[17px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">+0-50</div>
      <div className="mb-2 text-center home-copy-bold text-[8px] uppercase tracking-[0.10em] text-[#F5F1E8]">{title}</div>
      <div className="relative h-[15px] overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#031D13]">
        <div className="absolute inset-y-0 left-[40%] w-[20%] bg-green-500/80 shadow-[0_0_12px_rgba(34,197,94,0.45)]" />
        <div className="absolute inset-y-0 left-[49%] w-[2px] bg-[#F5F1E8]/85" />
      </div>
      <div className="relative mt-1.5 h-[9px] home-copy-bold text-[7px] uppercase leading-none text-[#F7D117]">
        <span className="absolute left-0 top-0">0</span>
        <span className="absolute left-1/2 top-0 -translate-x-1/2">50</span>
        <span className="absolute right-0 top-0">0</span>
      </div>
    </div>
  );
}

function ScoringSection({ title, items, columns = 2 }) {
  return (
    <div className="space-y-2">
      {title && <div className="text-center home-copy-bold text-[14px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]">{title}</div>}
      <div className={`grid gap-2 ${columns === 5 ? "grid-cols-5" : columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {items.map((item) => <ScoringTypeBox key={item.label} {...item} />)}
      </div>
    </div>
  );
}

function ScoringOutcomeSection({ title, items = [] }) {
  return (
    <div className="space-y-2">
      {title && <div className="text-center home-copy-bold text-[14px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]">{title}</div>}
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => <ScoringTypeBox key={item.label} {...item} />)}
      </div>
    </div>
  );
}

function LeaderboardSection({ title = null, children, className = "" }) {
  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className={`text-[#F5F1E8] ${className}`}>
      {title && (
        <div className="px-3 pb-2 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
          {title}
        </div>
      )}
      {children}
    </AppPanel>
  );
}


export function LeaderboardScreen({ menuProps, rows = [], currentCampaignScore = 0, bestCampaignScore = 0, team = "", bestCampaignSummary = null, activeCosmetics = {}, currentUser = auth.currentUser }) {
  const [leaderboardView, setLeaderboardView] = useState("scores");
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [cleanLeaderboardOnly, setCleanLeaderboardOnly] = useState(true);
  const placeholderRows = Array.from({ length: 10 }, (_, index) => ({
    id: `placeholder-${index}`,
    username: "-",
    team: "",
    campaignPoints: 0,
    isPlaceholder: true,
  }));

  const bestScore = Number(bestCampaignScore || bestCampaignSummary?.campaignPoints || bestCampaignSummary?.points || 0);
  const guestCurrentScore = Number(currentCampaignScore || 0);
  const guestBestScore = Number(bestScore || 0);
  const guestScore = guestBestScore > 0 ? guestBestScore : guestCurrentScore;
  const activeUserScore = currentUser?.uid ? bestScore : guestScore;
  const leaderboardTeam = currentUser?.uid
    ? (bestScore > 0 ? (bestCampaignSummary?.team || "") : "")
    : (guestBestScore > 0 ? (bestCampaignSummary?.team || "") : guestCurrentScore > 0 ? (team || "") : "");
  const currentCampaignCosmetics = {
    goldenBoot: Boolean(activeCosmetics?.goldenBoot),
    goldenBall: Boolean(activeCosmetics?.goldenBall),
    goldenGlove: Boolean(activeCosmetics?.goldenGlove),
    goldenTicket: Boolean(activeCosmetics?.goldenTicket),
    cosmeticBallEquipped: Boolean(activeCosmetics?.goldenBall),
    cosmeticGloveEquipped: Boolean(activeCosmetics?.goldenGlove),
    goldenTicketUsed: Boolean(activeCosmetics?.goldenTicket),
  };
  const previewCosmetics = bestCampaignSummary?.cosmeticsApplied || (guestCurrentScore > 0 ? currentCampaignCosmetics : {});
  const activeUserId = currentUser?.uid || "guest-preview";
  const hasRegisteredUserRow = Boolean(currentUser?.uid && rows.some((row) => row.userId === currentUser.uid));
  const previewUserRow = activeUserScore > 0 && !hasRegisteredUserRow
    ? [{
        id: "current-user-preview",
        userId: activeUserId,
        username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
        team: leaderboardTeam,
        campaignPoints: activeUserScore,
        cupRun: bestCampaignSummary?.cupRun || bestCampaignSummary?.formGuide || bestCampaignSummary?.form || bestCampaignSummary?.tournamentProgress || [],
        cosmeticsApplied: previewCosmetics,
        bestCampaign: { ...(bestCampaignSummary || {}), cosmeticsApplied: previewCosmetics },
        status: bestCampaignSummary?.status || bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "inProgress",
        isUserPreview: true,
      }]
    : [];

  const bestSummaryForm = bestCampaignSummary?.cupRun || bestCampaignSummary?.formGuide || bestCampaignSummary?.form || bestCampaignSummary?.tournamentProgress || [];
  const hydrateCurrentUserLeaderboardRow = (row) => {
    if (!currentUser?.uid || row?.userId !== currentUser.uid) return row;
    const rowForm = leaderboardForm(row);
    if (rowForm.some(Boolean) || !Array.isArray(bestSummaryForm) || !bestSummaryForm.some(Boolean)) return row;
    return {
      ...row,
      cupRun: bestSummaryForm,
      bestCampaign: {
        ...(row.bestCampaign || {}),
        ...(bestCampaignSummary || {}),
        cupRun: bestSummaryForm,
      },
    };
  };
  const baseRows = rows.length ? rows.map(hydrateCurrentUserLeaderboardRow) : placeholderRows;
  const filterLeaderboardRow = (row) => !cleanLeaderboardOnly || row.isPlaceholder || row.isUserPreview || !leaderboardUsedUpgrade(row);
  const rankedRows = [...previewUserRow, ...baseRows].filter(filterLeaderboardRow)
    .sort((a, b) => Number(b.campaignPoints || 0) - Number(a.campaignPoints || 0))
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const visibleRows = rankedRows.length ? rankedRows : placeholderRows.map((row, index) => ({ ...row, rank: index + 1 }));
  const realLeaderboardCount = visibleRows.filter((row) => !row.isPlaceholder).length;
  const showLeaderboardPaging = realLeaderboardCount > 10;
  const pageSize = 10;
  const totalLeaderboardPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safeLeaderboardPage = showLeaderboardPaging ? Math.min(leaderboardPage, totalLeaderboardPages - 1) : 0;
  const pageStartRank = safeLeaderboardPage * pageSize + 1;
  const pageEndRank = Math.min(pageStartRank + pageSize - 1, Math.max(realLeaderboardCount, pageSize));
  const pagedRows = visibleRows.slice(safeLeaderboardPage * pageSize, safeLeaderboardPage * pageSize + pageSize);
  const topTenTitle = safeLeaderboardPage === 0 ? "TOP 10" : `RANK ${pageStartRank}-${pageEndRank}`;
  const previousLeaderboardPage = () => setLeaderboardPage((page) => (page <= 0 ? totalLeaderboardPages - 1 : page - 1));
  const nextLeaderboardPage = () => setLeaderboardPage((page) => (page >= totalLeaderboardPages - 1 ? 0 : page + 1));
  const myRankRow = rankedRows.find((row) => row.isUserPreview || (currentUser?.uid && row.userId === currentUser.uid)) || {
    id: "my-rank-empty",
    rank: "--",
    username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
    team: leaderboardTeam,
    campaignPoints: activeUserScore,
    cupRun: bestCampaignSummary?.cupRun || bestCampaignSummary?.form || bestCampaignSummary?.tournamentProgress || [],
    cosmeticsApplied: previewCosmetics,
    bestCampaign: { ...(bestCampaignSummary || {}), cosmeticsApplied: previewCosmetics },
    status: bestCampaignSummary?.status || bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "inProgress",
    isUserPreview: true,
  };

  const rankArrowClass = () => "flex h-8 w-8 items-center justify-center text-[#F5F1E8] opacity-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]";

  const scoringSections = [
    {
      title: "MATCH RESULT",
      columns: 4,
      items: [
        { label: "Match Played", points: LEADERBOARD_POINTS.MATCH_PLAYED, tone: "ivory" },
        { label: "Match Lost", points: LEADERBOARD_POINTS.MATCH_LOST ?? 0, tone: "red" },
        { label: "Match Drawn", points: LEADERBOARD_POINTS.MATCH_DRAWN, tone: "yellow" },
        { label: "Match Won", points: LEADERBOARD_POINTS.MATCH_WON, tone: "green" },
      ],
    },
    {
      title: "SHOT OUTCOME",
      items: [
        { label: "Shot Miss", points: LEADERBOARD_POINTS.SHOT_MISS ?? 0, tone: "red" },
        { label: "Hit Woodwork", points: LEADERBOARD_POINTS.SHOT_WOODWORK, tone: "red" },
        { label: "Shot Saved", points: LEADERBOARD_POINTS.SHOT_SAVED, tone: "red" },
        { label: "Goal Scored", points: LEADERBOARD_POINTS.GOAL_SCORED, tone: "green" },
        { label: "Perfect Shootout", points: LEADERBOARD_POINTS.PERFECT_SHOOTOUT_WIN, tone: "green" },
      ],
    },
    {
      title: "CUP RUN",
      columns: 5,
      items: [
        { label: "Round of 32", points: LEADERBOARD_POINTS.QUALIFY_FROM_GROUP },
        { label: "Round of 16", points: LEADERBOARD_POINTS.REACH_ROUND_OF_16 },
        { label: "Quarter-Finals", points: LEADERBOARD_POINTS.REACH_QUARTER_FINAL },
        { label: "Semi-Finals", points: LEADERBOARD_POINTS.REACH_SEMI_FINAL },
        { label: "Final", points: LEADERBOARD_POINTS.REACH_FINAL },
      ],
    },
    {
      title: "PODIUM",
      columns: 3,
      items: [
        { label: "Third Place", points: LEADERBOARD_POINTS.WIN_THIRD_PLACE_PLAY_OFF, tone: "bronze" },
        { label: "Runner-Up", points: LEADERBOARD_POINTS.RUNNER_UP_FINISH, tone: "silver" },
        { label: "Champions", points: LEADERBOARD_POINTS.WIN_MONDAY_CUP, tone: "gold" },
      ],
    },
  ];

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>LEADERBOARD</ScreenTopBar>
      <PageTabsSlot>
        <PageTabs
          value={leaderboardView}
          onChange={setLeaderboardView}
          options={[
            { value: "scores", label: "SCORES" },
            { value: "model", label: "SCORING" },
          ]}
        />
      </PageTabsSlot>
      <DrawerContent>
        <div className="pt-0.5 [scroll-padding-top:0px]">
          <div className="mc-panel-stack pb-4">
            {leaderboardView === "model" ? (
              <LeaderboardSection title="BEST CAMPAIGN SCORE">
                <div className="space-y-3 px-3 pb-3 pt-2">
                  <div className="space-y-2">
                    <div className="text-center home-copy-bold text-[14px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]">SHOT SKILL</div>
                    <div className="grid grid-cols-2 gap-2">
                      <ScoringMeter title="Power Meter" />
                      <ScoringMeter title="Accuracy Meter" />
                    </div>
                  </div>
                  <ScoringOutcomeSection {...scoringSections[1]} />
                  <ScoringSection {...scoringSections[0]} />
                  <ScoringSection {...scoringSections[2]} />
                  <ScoringSection {...scoringSections[3]} />
                </div>
              </LeaderboardSection>
            ) : (
              <>
                <LeaderboardSection title="MY RANKING">
                  <div className="px-2 pb-2 pt-0">
                    <LeaderboardHeader />
                    <LeaderboardRow row={myRankRow} isUser />
                  </div>
                </LeaderboardSection>

                <LeaderboardSection>
                  <div className="px-2 pb-2 pt-2">
                    <div className="mb-1 grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 px-1">
                      {showLeaderboardPaging ? (
                        <button type="button" aria-label="Previous leaderboard page" onClick={previousLeaderboardPage} className={rankArrowClass()}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5L8 12L15 19" /></svg></button>
                      ) : <span aria-hidden="true" />}
                      <div className="text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">{topTenTitle}</div>
                      {showLeaderboardPaging ? (
                        <button type="button" aria-label="Next leaderboard page" onClick={nextLeaderboardPage} className={rankArrowClass()}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5L16 12L9 19" /></svg></button>
                      ) : <span aria-hidden="true" />}
                    </div>
                    <LeaderboardFilterSlider cleanOnly={cleanLeaderboardOnly} onToggle={() => { setCleanLeaderboardOnly((value) => !value); setLeaderboardPage(0); }} />
                    <LeaderboardHeader />
                    <div className="space-y-1.5 pr-1">
                      {pagedRows.map((row) => {
                        const isUser = Boolean((currentUser && row.userId === currentUser.uid) || row.isUserPreview);
                        return <LeaderboardRow key={`${row.userId || row.id || row.username}-${row.completedAt || row.rank}`} row={row} isUser={isUser} />;
                      })}
                    </div>
                  </div>
                </LeaderboardSection>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </main>
  );
}
