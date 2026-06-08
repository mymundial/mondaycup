import { useState } from "react";
import { auth } from "../../firebase.js";
import { LEADERBOARD_POINTS } from "../../logic/leaderboardScoring.js";
import { formForSummary, conversionPercent } from "../../logic/appState.js";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { AuthMenuPanel } from "../layout/Menu.jsx";
import {
  MenuPanel,
  IvoryCard,
  UserHighlightCard,
} from "../layout/MenuPanel.jsx";
import { ActionButton } from "../layout/ActionButton.jsx";
import { Flag } from "../shared.jsx";
import PageTabs, { PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import AppPanel, { appPanelStyleForVariant } from "../ui/AppPanel.jsx";
import { getTeamDisplayName } from "../ui/TeamName.jsx";
import { STORE_ITEM_IDS, normaliseTicketQuantity } from "../../data/storeItems.js";
import { GROUPS } from "../../data/teams.js";
import { ShirtPosterPreview } from "../share/SharePreviews.jsx";
import { playerCareerStars, playerCareerTitle } from "../../logic/playerCareer.js";

function DrawerContent({ children }) {
  return <PageScroll className="px-0 pt-0.5">{children}</PageScroll>;
}

function PadlockIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4s3.6 1.4 3.6 3.6V10" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function StatTile({ label, value, highlight = false, toneClass = null }) {
  if (toneClass) {
    return (
      <div
        className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${toneClass}`}
      >
        <div className="home-copy-bold text-[18px] uppercase leading-none">
          {value}
        </div>
        <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#072D1D]/74">
          {label}
        </div>
      </div>
    );
  }

  const Card = highlight ? UserHighlightCard : IvoryCard;
  return (
    <Card className="flex min-h-[58px] flex-col items-center justify-center p-2 text-center">
      <div
        className={`home-copy-bold text-[18px] uppercase leading-none ${highlight ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}
      >
        {value}
      </div>
      <div
        className={`home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] ${highlight ? "text-[#F5F1E8]/72" : "text-[#F5F1E8]/70"}`}
      >
        {label}
      </div>
    </Card>
  );
}

function rankMedalClass(value) {
  const rank = Number(String(value || "").replace(/[^0-9]/g, ""));
  if (rank === 1)
    return "mc-metallic-gold border-[#D8B62F]/80 text-[#072D1D] ring-1 ring-[#F7D117]/32";
  if (rank === 2)
    return "mc-metallic-silver border-[#C8C8C8]/80 text-[#072D1D] ring-1 ring-[#F5F1E8]/30";
  if (rank === 3)
    return "mc-metallic-bronze border-[#D9822B]/80 text-[#072D1D] ring-1 ring-[#D9822B]/30";
  return "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/10";
}

function RankStatTile({ value }) {
  const medalClass = rankMedalClass(value);
  return (
    <div
      className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${medalClass}`}
    >
      <div className="home-copy-bold text-[18px] uppercase leading-none">
        {value || "#--"}
      </div>
      <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#F5F1E8]/70">
        Ranking
      </div>
    </div>
  );
}

function conversionToneClass(value, shots = 0) {
  const attempts = Number(shots || 0);
  if (attempts <= 0) return null;
  const conversion = Number(value || 0);
  if (conversion >= 51)
    return "border-green-500/80 bg-green-500 text-[#072D1D] ring-1 ring-green-400/32";
  if (conversion === 50)
    return "border-[#F7D117]/85 bg-[#F7D117] text-[#072D1D] ring-1 ring-[#F7D117]/32";
  return "border-red-500/80 bg-red-500 text-[#072D1D] ring-1 ring-red-400/32";
}

function CupsWonStatTile({ value }) {
  const cups = Number(value || 0);
  if (cups > 0) {
    return (
      <div
        className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${rankMedalClass(1)}`}
      >
        <div className="home-copy-bold text-[18px] uppercase leading-none">
          {cups}
        </div>
        <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#F5F1E8]/70">
          Cups won
        </div>
      </div>
    );
  }
  return <StatTile label="Cups won" value={cups} />;
}

const CLUBHOUSE_STATS_GRID =
  "minmax(0,0.72fr) minmax(0,0.66fr) minmax(0,0.58fr) minmax(0,0.64fr) minmax(0,0.58fr) minmax(0,0.66fr) minmax(0,0.82fr) minmax(0,0.72fr) minmax(0,0.84fr)";

function ClubhouseStatsTable({
  rank,
  matchesPlayed = 0,
  matchesWon = 0,
  matchesDrawn = 0,
  matchesLost = 0,
  totalGoals = 0,
  conversionRate,
  mondayCupsWon = 0,
  highScore = 0,
}) {
  const conversionNumber = Number(
    String(conversionRate || "").replace(/[^0-9.-]/g, ""),
  );
  const conversionClass = !Number.isFinite(conversionNumber)
    ? "text-[#F7D117]"
    : conversionNumber >= 51
      ? "text-green-400"
      : conversionNumber === 50
        ? "text-[#F7D117]"
        : "text-red-400";
  const headers = [
    "Ranking",
    "Played",
    "Won",
    "Drawn",
    "Lost",
    "Goals",
    "Conversion %",
    "Cups Won",
    "High Score",
  ];
  const values = [
    rank || "#--",
    Number(matchesPlayed || 0),
    Number(matchesWon || 0),
    Number(matchesDrawn || 0),
    Number(matchesLost || 0),
    Number(totalGoals || 0),
    conversionRate || "--",
    Number(mondayCupsWon || 0),
    Number(highScore || 0),
  ];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#F5F1E8]/24 bg-[#051A11]/46 p-2 shadow-[0_10px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.06)]">
      <div className="pb-1 text-center home-copy-bold text-[10px] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]">
        CAREER STATS
      </div>
      <div
        className="grid gap-[2px] px-1 pb-[3px] text-center home-copy-regular text-[5.2px] uppercase leading-[1.05] tracking-[0.04em] text-[#F5F1E8]/72"
        style={{ gridTemplateColumns: CLUBHOUSE_STATS_GRID }}
      >
        {headers.map((label) => (
          <span
            key={label}
            className="flex min-h-[14px] items-end justify-center"
          >
            {label}
          </span>
        ))}
      </div>
      <div
        className="grid items-center gap-[2px] rounded-xl border border-[#F7D117]/58 bg-[#031B12]/44 px-1.5 py-[7px] text-center text-[#F5F1E8] ring-1 ring-[#F7D117]/28 shadow-[0_0_12px_rgba(247,209,23,0.10),0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]"
        style={{ gridTemplateColumns: CLUBHOUSE_STATS_GRID }}
      >
        {values.map((value, index) => {
          const isRank = index === 0;
          const isConversion = index === 6;
          const isCups = index === 7 && Number(value || 0) > 0;
          const isHighScore = index === 8;
          const cellClass =
            isRank || isCups || isHighScore
              ? "text-[#F7D117]"
              : isConversion
                ? conversionClass
                : "text-[#F5F1E8]";
          return (
            <span
              key={`${index}-${value}`}
              className={`min-w-0 truncate home-copy-bold text-[clamp(7px,2.05vw,11px)] uppercase leading-none ${cellClass}`}
              title={String(value)}
            >
              {value}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function FormDot({ value }) {
  const dotClass =
    value === "W"
      ? "bg-green-500 shadow-[0_0_3px_rgba(34,197,94,0.42)]"
      : value === "L"
        ? "bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.42)]"
        : value === "D"
          ? "bg-[#F7D117] shadow-[0_0_3px_rgba(247,209,23,0.44)]"
          : "bg-[#F7D117]/28 shadow-[0_0_2px_rgba(247,209,23,0.16)]";
  return (
    <span
      className={`block shrink-0 rounded-full ${dotClass}`}
      style={{
        height: "var(--campaign-rail-size)",
        width: "var(--campaign-rail-size)",
      }}
      aria-hidden="true"
    />
  );
}

function phaseLabel(label, fallback = "GROUP STAGE") {
  const clean = String(label || "")
    .trim()
    .toUpperCase();
  if (!clean) return fallback;
  if (clean === "ELIMINATED") return fallback;
  if (clean.startsWith("ELIMINATED")) {
    const round = clean.replace(/^ELIMINATED\s*(IN|AT|FROM)?\s*/i, "").trim();
    return round || fallback;
  }
  return clean;
}

function campaignMedalClass(summary = {}) {
  const joined = [
    summary.finalPosition,
    summary.placement,
    summary.result,
    summary.tournamentPhase,
    summary.roundLabel,
    summary.stage,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  if (/CHAMP|WINNER|MONDAY CUP/.test(joined))
    return "border-[#D8B62F]/82 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F7D117]/32";
  if (/RUNNER|SECOND|2ND/.test(joined))
    return "border-[#C8C8C8]/82 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/32";
  if (/THIRD|3RD/.test(joined))
    return "border-[#D9822B]/82 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#D9822B]/32";
  return null;
}

function CampaignStatusRail({ form = [], points = 0 }) {
  return (
    <div
      className="mx-auto mt-2 grid h-[36px] w-[92%] min-w-0 grid-cols-[minmax(0,1fr)_1px_minmax(26px,0.32fr)] items-center gap-[clamp(4px,1.2vw,7px)] overflow-hidden rounded-[0.48rem] border border-[#F5F1E8]/22 bg-[#050505]/62 px-[clamp(6px,1.6vw,10px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]"
      style={{ "--campaign-rail-size": "clamp(7px,2.05vw,11px)" }}
    >
      <div className="relative z-[1] flex min-w-0 items-center justify-center gap-[clamp(2px,0.55vw,4px)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <FormDot key={index} value={form[index]} />
        ))}
      </div>
      <span
        className="block h-[58%] w-px shrink-0 bg-[#F5F1E8]/18"
        aria-hidden="true"
      />
      <span
        className="relative z-[1] inline-flex min-w-0 items-center justify-center overflow-hidden font-led leading-none text-[#F7D117] led-text-glow tabular-nums"
        style={{ fontSize: "calc(var(--campaign-rail-size) * 1.18)" }}
      >
        {Number(points || 0)}
      </span>
    </div>
  );
}

function CampaignCupRunRail({ form = [] }) {
  return (
    <div className="mt-2 w-full min-w-0" aria-label="Campaign cup run">
      <div
        className="relative min-w-0 rounded-xl border border-[#F5F1E8]/14 bg-[#052D1D]/68 px-[clamp(10px,3vw,14px)] py-[clamp(6px,1.8vw,8px)] text-[#F5F1E8] shadow-[0_6px_14px_rgba(0,0,0,0.10)] ring-1 ring-[#F5F1E8]/10"
        style={{ "--campaign-rail-size": "clamp(7px,2.05vw,10px)" }}
      >
        <div className="flex w-full min-w-0 items-center justify-between overflow-hidden" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <FormDot key={index} value={form[index]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CampaignGameScoreBox({ score = 0 }) {
  const displayScore = Number(score || 0);
  return (
    <div className="mt-1 flex w-full flex-col items-center justify-end" aria-label="Campaign game score">
      <div className="inline-flex h-[clamp(24px,6.45vw,30px)] w-[74px] items-center justify-center rounded-[0.72rem] border border-[#F7D117]/28 bg-[#050505]/72 px-1 text-center shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/12">
        <span className="font-led text-[13px] font-black uppercase leading-none tracking-[-0.01em] text-[#F7D117] led-text-glow tabular-nums whitespace-nowrap">
          {displayScore}
        </span>
      </div>
    </div>
  );
}

function CampaignOverviewCard({
  title,
  team,
  roundLabel = "GROUP STAGE",
  form = [],
  score = 0,
  highlight = false,
  medalClass = null,
  selectable = false,
  onSelect = null,
  actionLabel = "Resume current campaign",
  showFlag = true,
  className = "",
}) {
  const baseCardClass =
    "rounded-[1.35rem] border shadow-[inset_0_1px_0_rgba(245,241,232,0.06)] ring-1";
  const colourClass = highlight
    ? "border-[#F7D117]/70 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F7D117]/32 shadow-[0_0_12px_rgba(247,209,23,0.10),inset_0_1px_0_rgba(245,241,232,0.06)]"
    : medalClass ||
      "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10";
  const selectableClass = selectable
    ? "relative cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F7D117]/72"
    : "";
  const isMedal = Boolean(medalClass);
  const titleClass = "text-[#F5F1E8]";
  const teamClass = highlight ? "text-[#F7D117]" : "text-[#F5F1E8]";
  const stageClass = "text-[#F5F1E8]";
  const cardClass = `${baseCardClass} ${colourClass} ${selectableClass}`;
  const content = (
    <section
      className={`${cardClass} flex min-w-0 flex-col items-center justify-start overflow-hidden px-3 pb-2.5 pt-3 text-center ${className}`}
    >
      <div
        className={`text-center home-copy-bold text-[10px] uppercase leading-none tracking-[0.16em] ${titleClass}`}
      >
        {title}
      </div>
      <div
        className={`mt-2 max-w-full truncate home-copy-bold text-[16px] uppercase leading-none tracking-[0.08em] ${teamClass}`}
      >
        {team || "NO TEAM"}
      </div>
      {showFlag ? (
        <TeamFlag
          team={team}
          isUserTeam={highlight}
          className="mt-1.5 h-11 w-[72px] rounded-[9px] object-cover"
          fallbackRing="ring-[#0B5F35]/18"
        />
      ) : (
        <div className="mt-1.5 grid h-11 w-[72px] place-items-center rounded-[9px] border border-[#F7D117]/40 bg-[#F7D117]/12 text-[24px] leading-none text-[#F7D117]">+</div>
      )}
      <div className="mt-2 flex w-full flex-col items-center justify-end pt-0">
        <div
          className={`home-copy-bold text-[10px] uppercase leading-none tracking-[0.16em] ${stageClass}`}
        >
          {phaseLabel(roundLabel)}
        </div>
        <CampaignGameScoreBox score={score} />
      </div>
      {selectable && team && team !== "NO TEAM" ? null : null}
    </section>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 rounded-[1.45rem] text-left outline-none"
        aria-label={actionLabel}
      >
        {content}
      </button>
    );
  }

  return <div className="min-w-0">{content}</div>;
}

function StatusPill({ children, active = false, className = "" }) {
  return (
    <span
      className={`inline-flex min-h-[19px] items-center justify-center rounded-full px-2.5 home-copy-bold text-[8.5px] uppercase leading-none tracking-[0.08em] ${active ? "bg-[#052D1D] text-[#F7D117]" : "bg-[#052D1D]/88 text-[#F7D117]"} ${className}`}
    >
      {children}
    </span>
  );
}

function CosmeticUpgradeCard({
  id,
  title,
  subtitle = "BONUS",
  price,
  assetSrc,
  iconText = null,
  active,
  owned = false,
  ticketQuantity = 0,
  disabled = false,
  guestLocked = false,
  onToggle,
  onOpenShop,
  onUseGoldenTicket,
}) {
  const isTicket = id === "goldenTicket";
  const ticketQty = normaliseTicketQuantity(ticketQuantity);
  const isOwned = isTicket ? ticketQty > 0 : Boolean(owned);
  const isMaxTicket = isTicket && ticketQty >= 99;
  const isActive = Boolean(!isTicket && isOwned && active);
  const titleTone = isActive
    ? "text-[#F7D117]"
    : isOwned
      ? "text-[#F5F1E8]"
      : "text-[#F7D117]";
  const subtitleTone = "text-[#F5F1E8]/72";
  const cardTone = isActive
    ? "border-[#F7D117]/72 bg-[#052D1D]/84 text-[#F5F1E8] ring-1 ring-[#F7D117]/30 shadow-[0_0_12px_rgba(247,209,23,0.12),inset_0_1px_0_rgba(245,241,232,0.08)]"
    : isOwned
      ? "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/10"
      : "border-[#F7D117]/42 bg-[#031B12]/42 text-[#F5F1E8] ring-1 ring-[#F7D117]/18";

  const status = isTicket
    ? isMaxTicket
      ? "MAX"
      : ticketQty > 0
        ? `${ticketQty}/99`
        : price
    : isOwned
      ? isActive
        ? "EQUIPPED"
        : "UNEQUIPPED"
      : price;

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        if (guestLocked) {
          onOpenShop?.(id);
          return;
        }
        if (isTicket) {
          if (isOwned) onUseGoldenTicket?.();
          else onOpenShop?.(id);
          return;
        }
        if (!isOwned) {
          onOpenShop?.(id);
          return;
        }
        onToggle?.(id);
      }}
      disabled={disabled || isMaxTicket}
      className={`group relative min-h-[108px] overflow-hidden rounded-[1.1rem] border p-2 text-center shadow-[0_8px_16px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all disabled:cursor-default disabled:opacity-70 ${cardTone}`}
    >
      <div className="flex h-full min-h-[92px] flex-col items-center justify-center">
        <div className="mb-2 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#F5F1E8]/12 bg-[#072D1D]/92">
          {assetSrc ? (
            <img
              src={assetSrc}
              alt=""
              className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.22)]"
              draggable={false}
            />
          ) : (
            <span className="home-copy-bold text-[16px] leading-none text-[#F7D117]">
              {iconText}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-0">
          <div
            className={`home-copy-bold min-h-[12px] text-[10px] uppercase leading-none tracking-[0.075em] ${titleTone}`}
          >
            {title}
          </div>
          <div
            className={`home-copy-regular mt-[-1px] text-[6.5px] uppercase leading-none tracking-[0.10em] ${subtitleTone}`}
          >
            {subtitle}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {isTicket ? (
            <span
              className={`home-copy-bold text-[11px] uppercase leading-none tracking-[0.06em] ${titleTone}`}
            >
              {status}
            </span>
          ) : isOwned ? (
            <StatusPill active={isActive}>{status}</StatusPill>
          ) : (
            <span
              className={`home-copy-bold text-[11px] uppercase leading-none tracking-[0.06em] ${titleTone}`}
            >
              {status}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function OpenPadlockIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4c1.8 0 3.1 1.1 3.5 2.8" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function AllTeamsUnlockButton({
  unlocked = false,
  guestLocked = false,
  onUnlock,
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (guestLocked) {
          onUnlock?.();
          return;
        }
        if (!unlocked) onUnlock?.();
      }}
      disabled={unlocked && !guestLocked}
      className={`group relative flex min-h-[74px] w-full items-center gap-3 overflow-hidden rounded-[1.1rem] border px-4 py-3 text-left shadow-[0_8px_16px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 transition-all active:scale-[0.99] disabled:cursor-default ${unlocked ? "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8]/72 opacity-72 ring-[#F5F1E8]/10" : "border-[#F7D117]/42 bg-[#031B12]/42 text-[#F5F1E8] ring-[#F7D117]/18"} ${guestLocked ? "cursor-pointer" : ""}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#F5F1E8]/12 bg-[#072D1D]/92">
        <img
          src="/assets/branding/monday-cup.png"
          alt=""
          className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.22)]"
          draggable={false}
        />
      </span>
      <span className="pointer-events-none absolute inset-x-[78px] top-1/2 min-w-0 -translate-y-1/2 text-center">
        <span className="block truncate home-copy-bold text-[18px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">
          ALL TEAMS
        </span>
        <span className="mt-1 block truncate home-copy-regular text-[7px] uppercase leading-none tracking-[0.10em] text-[#F5F1E8]/68">
          UNLOCK EVERY PLAYABLE NATION
        </span>
      </span>
      <span className="ml-auto grid min-w-[56px] shrink-0 place-items-center text-center">
        {unlocked ? (
          <StatusPill active>ACTIVE</StatusPill>
        ) : (
          <span className="home-copy-bold text-[15px] uppercase tracking-[0.06em] text-[#F7D117]">
            £1.99
          </span>
        )}
      </span>
    </button>
  );
}

function GoldenKitbagBundleCard({ onOpenShop, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onOpenShop?.(STORE_ITEM_IDS.fullBundle)}
      disabled={disabled}
      className="group relative flex min-h-[118px] w-full items-center gap-4 overflow-hidden rounded-[1.1rem] border border-[#F7D117]/42 bg-[#031B12]/42 px-4 py-4 text-left text-[#F5F1E8] shadow-[0_8px_16px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-[#F7D117]/18 transition-all active:scale-[0.99] disabled:opacity-60"
    >
      <span className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full border border-[#F5F1E8]/12 bg-[#031B12]/54 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
        <img
          src="/assets/game/golden-kitbag.png"
          alt=""
          className="h-16 w-16 object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.28)]"
          draggable={false}
        />
      </span>
      <span className="pointer-events-none absolute inset-x-[92px] top-1/2 min-w-0 -translate-y-1/2 text-center">
        <span className="home-copy-bold mb-1 block text-[8px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/72">
          BEST VALUE
        </span>
        <span className="block truncate home-copy-bold text-[18px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">
          GOLDEN KITBAG
        </span>
        <span className="mt-2 block home-copy-regular text-[8px] uppercase leading-none tracking-[0.10em] text-[#F5F1E8]/68">
          INCLUDES ALL UPGRADE ITEMS
        </span>
        <span className="mt-1.5 flex items-center justify-center gap-1.5">
          {[
            "/assets/branding/monday-cup.png",
            "/assets/game/golden-boot.png",
            "/assets/game/golden-ball.png",
            "/assets/game/golden-glove.png",
            "/assets/game/golden-ticket.png",
          ].map((src) => (
            <span
              key={src}
              className="grid h-6 w-6 place-items-center rounded-full border border-[#F5F1E8]/12 bg-[#072D1D]/92"
            >
              <img
                src={src}
                alt=""
                className="h-5 w-5 object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)]"
                draggable={false}
              />
            </span>
          ))}
        </span>
      </span>
      <span className="ml-auto grid min-w-[64px] shrink-0 place-items-center home-copy-bold text-[18px] uppercase leading-none tracking-[0.07em] text-[#F7D117]">
        £4.99
      </span>
    </button>
  );
}

function TicketOfficeModal({ open, quantity = 0, onUse, onBuyMore, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/62 px-5">
      <div className="w-full max-w-[340px] rounded-[1.35rem] border border-[#F7D117]/48 bg-[#031B12] p-4 text-center text-[#F5F1E8] shadow-[0_18px_34px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/20">
        <div className="home-copy-bold text-[18px] uppercase leading-none tracking-[0.12em] text-[#F7D117]">
          TICKET OFFICE
        </div>
        <div className="home-copy-regular mx-auto mt-3 max-w-[260px] text-[10px] uppercase leading-snug tracking-[0.08em] text-[#F5F1E8]/78">
          Use a Golden Ticket for the next campaign and start directly at the final after choosing a team?
        </div>
        <div className="home-copy-bold mt-3 text-[11px] uppercase leading-none tracking-[0.10em] text-[#F5F1E8]/74">
          OWNED <span className="text-[#F7D117]">{normaliseTicketQuantity(quantity)}/99</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onBuyMore}
            className="rounded-full border border-[#F5F1E8]/18 bg-[#052D1D]/72 px-3 py-3 home-copy-bold text-[10px] uppercase tracking-[0.10em] text-[#F5F1E8]"
          >
            NO
          </button>
          <button
            type="button"
            onClick={onUse}
            className="rounded-full border border-[#F7D117]/78 bg-[#F7D117] px-3 py-3 home-copy-bold text-[10px] uppercase tracking-[0.10em] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.18)]"
          >
            YES
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 home-copy-bold text-[8px] uppercase tracking-[0.14em] text-[#F5F1E8]/54"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

function NicknameEditor({
  displayName,
  onNicknameUpdate,
  isGuest = false,
  onRegister,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const clean = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    setValue(clean);
    setStatus("");
    if (!clean) {
      setStatus("ENTER A USERNAME");
      return;
    }
    if (!onNicknameUpdate) {
      setStatus("SIGN IN REQUIRED");
      return;
    }
    try {
      setSaving(true);
      await onNicknameUpdate(clean);
      setEditing(false);
      setStatus("USERNAME UPDATED");
    } catch (error) {
      setStatus(error?.message || "USERNAME UNAVAILABLE");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          if (isGuest) {
            onRegister?.();
            return;
          }
          setValue(displayName || "");
          setEditing(true);
          setStatus("");
        }}
        className={`${isGuest ? "mt-[-4px] mb-2" : "mt-0.5"} mx-auto block text-center home-copy-regular text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/72`}
      >
        {isGuest ? "JOIN THE MONDAY CLUB" : "EDIT NICKNAME"}
      </button>
    );
  }

  return (
    <div className="mx-auto mt-3 w-[min(320px,92%)]">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) =>
            setValue(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 10),
            )
          }
          maxLength={10}
          className="min-w-0 flex-1 rounded-xl border border-[#F7D117]/45 bg-[#F5F1E8] px-3 py-2 text-center home-copy-bold text-[14px] uppercase tracking-[0.08em] text-[#072D1D] outline-none"
          placeholder="USERNAME"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#F7D117] px-3 py-2 home-copy-bold text-[12px] uppercase tracking-[0.08em] text-[#072D1D] disabled:opacity-60"
        >
          {saving ? "..." : "SAVE"}
        </button>
      </div>
      {status && (
        <div className="mt-2 text-center home-copy-bold text-[9px] uppercase tracking-[0.12em] text-[#F7D117]">
          {status}
        </div>
      )}
    </div>
  );
}

function ClubhouseRegisterAuthOverlay({ onClose, onAuthComplete }) {
  return (
    <div
      className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/45 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[4px]"
      style={{ zIndex: 2147483647 }}
    >
      <button
        aria-label="Close register panel"
        onClick={onClose}
        className="absolute inset-0 z-[0]"
        type="button"
      />
      <aside className="pointer-events-auto relative z-[1] w-[calc(100vw_-_24px)] max-w-[408px] overflow-hidden rounded-[1.65rem] text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.32)]">
        <div
          className="absolute inset-0 rounded-[1.65rem] bg-[repeating-linear-gradient(90deg,#07542F_0px,#07542F_48px,#0B643A_48px,#0B643A_96px)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-[1.65rem] border border-[#F5F1E8]/12"
          aria-hidden="true"
        />
        <div className="relative p-4">
          <AuthMenuPanel
            initialMode="signin"
            showLogoBack
            onClose={onClose}
            onBack={onClose}
            onAuthComplete={async (user, options = {}) => {
              await onAuthComplete?.(user, {
                ...options,
                navigate: false,
                preserveGuestProgress: true,
                source: "clubhouse-register-panel",
              });
            }}
          />
        </div>
      </aside>
    </div>
  );
}

const CLUBHOUSE_PANEL_STYLE = appPanelStyleForVariant("table");

function defaultShirtName(currentUser, displayName) {
  return (
    String(
      displayName ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "GUEST",
    )
      .replace(/[^a-z0-9 ]/gi, "")
      .trim()
      .toUpperCase()
      .slice(0, 14) || "GUEST"
  );
}

function careerStarProgress(careerStats = {}) {
  return playerCareerStars(careerStats);
}

function careerStarTitle(careerStats = {}) {
  return playerCareerTitle(careerStats);
}

function CareerStars({ stars = [], className = "", starClassName = "text-[clamp(20px,5.5vw,30px)]" }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 ${className}`}
      aria-label="Career progress stars"
    >
      {stars.map((star, index) => (
        <span
          key={star.label || index}
          className={`home-copy-bold ${starClassName} leading-none transition-colors ${star.achieved ? "text-[#F7D117] drop-shadow-[0_0_8px_rgba(247,209,23,0.34)]" : "text-[#F7D117]/18"}`}
          title={star.label}
          aria-label={`${star.label}: ${star.achieved ? "achieved" : "locked"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ShirtThumbnailPreview({ children }) {
  const virtualSize = 318;
  const thumbnailSize = 96;
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          height: virtualSize,
          width: virtualSize,
          transform: `translate(-50%, -50%) scale(${thumbnailSize / virtualSize})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ClubhouseShirtCard({
  shirtProfile = null,
  displayName,
  currentUser,
  onEdit,
  careerStats = {},
}) {
  const shirt = shirtProfile || {};
  const name = shirt.name || defaultShirtName(currentUser, displayName);
  const number =
    String(shirt.number || "11")
      .replace(/[^0-9]/g, "")
      .slice(0, 2) || "11";
  const composition = shirt.composition || {};
  const stars = careerStarProgress(careerStats);
  const caps = Number(careerStats?.matchesPlayed || 0);
  const goals = Number(careerStats?.totalGoals || 0);
  return (
    <section className="relative flex min-h-[226px] w-full flex-col items-center justify-start overflow-visible px-4 pb-2 pt-1 text-center">
      <CareerStars stars={stars} className="mt-1" starClassName="text-[clamp(13px,3.8vw,18px)]" />
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 grid h-[118px] w-[118px] place-items-center rounded-[0.45rem] border-[5px] border-[#031B12] bg-[#031B12] p-[3px] shadow-[0_8px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.42)] transition-transform active:scale-[0.99]"
        aria-label="Edit shirt design"
      >
        <div className="grid h-full w-full place-items-center overflow-hidden rounded-[0.16rem] border-[5px] border-[#F5F1E8] bg-[#073B26]">
          <ShirtThumbnailPreview>
          <ShirtPosterPreview
            shirtTeam={shirt.team || ""}
            shirtName={name}
            shirtNumber={number}
            shirtShowMondayLogo={true}
            shirtShowBrothers={true}
            shirtShowTeam={false}
            shirtShowName={true}
            shirtShowNumber={true}
            shirtBgMode="custom"
            shirtCustomBg={shirt.bg || "#073B26"}
            shirtTextColour={shirt.textColour || "#F5F1E8"}
            shirtNumberColour={
              shirt.numberColour || shirt.textColour || "#F5F1E8"
            }
            shirtOutlineEnabled={Number(shirt.nameOutlineWidth || 0) > 0}
            shirtNumberOutlineEnabled={Number(shirt.numberOutlineWidth || 0) > 0}
            shirtOutlineColour={shirt.outlineColour || "#F5F1E8"}
            shirtPatternMode={shirt.patternMode || "plain"}
            shirtPatternColour={shirt.patternColour || "#FFFFFF"}
            shirtFontWeight="900"
            shirtFontStyle="normal"
            shirtFontType="bold"
            shirtOutlineWeight={Math.max(0, Number(shirt.nameOutlineWidth || 0))}
            shirtNumberOutlineWeight={Math.max(0, Number(shirt.numberOutlineWidth || 0))}
            shirtMondayScale={composition.mondayScale ?? 1.18}
            shirtNameScale={composition.nameScale ?? 1.18}
            shirtNumberScale={composition.numberScale ?? 1.58}
            shirtBrothersScale={composition.brothersScale ?? 0.65}
            shirtNameNumberLocked={false}
            shirtMondayX={composition.mondayX ?? 0}
            shirtMondayY={composition.mondayY ?? 0}
            shirtNameX={composition.nameX ?? 0}
            shirtNameY={composition.nameY ?? 0}
            shirtNumberX={composition.numberX ?? 0}
            shirtNumberY={composition.numberY ?? 0}
            shirtBrothersX={composition.brothersX ?? 0}
            shirtBrothersY={composition.brothersY ?? 0}
          />
          </ShirtThumbnailPreview>
        </div>
      </button>

      <div className="mt-3 max-w-full truncate home-copy-bold text-[clamp(24px,6.8vw,34px)] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">
        {displayName}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-3 home-copy-bold text-[10px] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]">
        <span>
          CAPS <span className="text-[#F7D117]">{caps}</span>
        </span>
        <span className="h-3 w-px bg-[#F5F1E8]/18" aria-hidden="true" />
        <span>
          GOALS <span className="text-[#F7D117]">{goals}</span>
        </span>
      </div>
    </section>
  );
}

export function ClubhouseScreen({
  menuProps,
  team,
  userForm,
  campaignPoints,
  bestCampaignSummary,
  currentRoundLabel,
  leaderboardRank,
  mondayCupsWon,
  highScore = 0,
  matchesPlayed = 0,
  allTimeMatchesPlayed = 0,
  allTimeMatchesWon = 0,
  allTimeMatchesDrawn = 0,
  allTimeMatchesLost = 0,
  allTimeGoals,
  allTimeShots,
  activeCosmetics,
  ownedItems = {},
  onToggleCosmetic,
  onOpenShop,
  onUseGoldenTicket,
  allTeamsUnlocked = false,
  onUnlockAllTeams,
  onNicknameUpdate,
  onResumeCampaign,
  onStartNewCampaign,
  shirtProfile = null,
  onEditShirt,
  currentUser = auth.currentUser,
}) {
  const [registerAuthOpen, setRegisterAuthOpen] = useState(false);
  const [ticketOfficeOpen, setTicketOfficeOpen] = useState(false);
  const [activeClubTab, setActiveClubTab] = useState("clubhouse");
  const isGuest = !currentUser?.uid;
  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "GUEST";
  const conversion = conversionPercent(allTimeGoals, allTimeShots);
  const shotsTakenTotal = Number(allTimeShots || 0);
  const conversionDisplay = shotsTakenTotal > 0 ? `${conversion}%` : "--";
  const matchesPlayedTotal = Number(allTimeMatchesPlayed || matchesPlayed || 0);
  const highScoreTotal = Number(highScore || 0);
  const hasCurrentCampaign = Boolean(team);
  const currentSummary = {
    team: hasCurrentCampaign ? team : "START NEW CAMPAIGN",
    form: hasCurrentCampaign ? formForSummary(userForm) : [],
    campaignPoints: hasCurrentCampaign ? Number(campaignPoints || 0) : 0,
    roundLabel: hasCurrentCampaign ? (currentRoundLabel || "GROUP STAGE") : "NO ACTIVE CAMPAIGN",
  };
  const bestSummary =
    bestCampaignSummary?.campaignPoints || bestCampaignSummary?.points
      ? {
          ...bestCampaignSummary,
          campaignPoints: Number(
            bestCampaignSummary.campaignPoints ??
              bestCampaignSummary.points ??
              0,
          ),
        }
      : {
          team: "NO TEAM",
          form: [],
          campaignPoints: 0,
          roundLabel: "NO CAMPAIGN",
        };
  const bestSummaryForm = formForSummary(
    bestSummary.cupRun || bestSummary.formGuide || bestSummary.form || bestSummary.tournamentProgress || [],
  );

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>CLUBHOUSE</ScreenTopBar>
      <PageTabsSlot>
        <PageTabs
          options={[
            { value: "clubhouse", label: "PROFILE" },
            { value: "shop", label: "KITBAG" },
          ]}
          value={activeClubTab}
          onChange={setActiveClubTab}
          ariaLabel="Clubhouse sections"
        />
      </PageTabsSlot>
      <DrawerContent>
        {activeClubTab === "clubhouse" ? (
          <div className="space-y-3">
            <MenuPanel style={CLUBHOUSE_PANEL_STYLE}>
              <div className="px-4 pb-4 pt-3">
                <ClubhouseShirtCard
                  shirtProfile={shirtProfile}
                  displayName={displayName}
                  currentUser={currentUser}
                  onEdit={onEditShirt}
                  careerStats={{
                    matchesPlayed: matchesPlayedTotal,
                    matchesWon: allTimeMatchesWon,
                    totalGoals: allTimeGoals,
                    highScore: highScoreTotal,
                    mondayCupsWon,
                  }}
                />
                <div className="mt-1">
                  <ClubhouseStatsTable
                    rank={leaderboardRank || "#--"}
                    matchesPlayed={matchesPlayedTotal}
                    matchesWon={allTimeMatchesWon || 0}
                    matchesDrawn={allTimeMatchesDrawn || 0}
                    matchesLost={allTimeMatchesLost || 0}
                    totalGoals={allTimeGoals || 0}
                    conversionRate={conversionDisplay}
                    mondayCupsWon={mondayCupsWon || 0}
                    highScore={highScoreTotal}
                  />
                </div>
              </div>
            </MenuPanel>

            <MenuPanel title="CAMPAIGN DATA" style={CLUBHOUSE_PANEL_STYLE}>
              <div className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <CampaignOverviewCard
                    title="Current Campaign"
                    team={currentSummary.team}
                    roundLabel={currentSummary.roundLabel}
                    form={currentSummary.form}
                    score={currentSummary.campaignPoints}
                    highlight
                    selectable
                    onSelect={() => (hasCurrentCampaign ? onResumeCampaign?.() : onStartNewCampaign?.())}
                    actionLabel={hasCurrentCampaign ? "Resume current campaign" : "Start new campaign"}
                    showFlag={hasCurrentCampaign}
                  />
                  <CampaignOverviewCard
                    title="Best Campaign"
                    team={bestSummary.team}
                    roundLabel={bestSummary.roundLabel}
                    form={bestSummaryForm}
                    score={bestSummary.campaignPoints}
                    medalClass={campaignMedalClass(bestSummary)}
                  />
                </div>
              </div>
            </MenuPanel>
          </div>
        ) : (
          <div className="space-y-3">
            <MenuPanel
              title="UPGRADES"
              style={CLUBHOUSE_PANEL_STYLE}
            >
              <div className="space-y-3 p-4 pt-2">
                <AllTeamsUnlockButton
                  unlocked={Boolean(allTeamsUnlocked)}
                  guestLocked={isGuest}
                  onUnlock={() => onUnlockAllTeams?.()}
                />
                <div className="grid grid-cols-4 gap-2">
                <CosmeticUpgradeCard
                  id="goldenBoot"
                  title="Golden Boot"
                  subtitle="+10% SHOT POWER"
                  price="£1"
                  assetSrc="/assets/game/golden-boot.png"
                  active={
                    isGuest
                      ? false
                      : Boolean(
                          ownedItems?.goldenBoot && activeCosmetics?.goldenBoot,
                        )
                  }
                  owned={Boolean(ownedItems?.goldenBoot)}
                  ticketQuantity={Number(
                    activeCosmetics?.goldenTicketQuantity ||
                      ownedItems?.goldenTicketQty ||
                      0,
                  )}
                  guestLocked={isGuest}
                  onOpenShop={(id) => onOpenShop?.(id)}
                  onUseGoldenTicket={() => setTicketOfficeOpen(true)}
                  onToggle={(id) => {
                    if (isGuest) onOpenShop?.(id);
                    else onToggleCosmetic?.(id);
                  }}
                />
                <CosmeticUpgradeCard
                  id="goldenBall"
                  title="Golden Ball"
                  subtitle="+10% SHOT ACCURACY"
                  price="£1"
                  assetSrc="/assets/game/golden-ball.png"
                  active={
                    isGuest
                      ? false
                      : Boolean(
                          ownedItems?.goldenBall && activeCosmetics?.goldenBall,
                        )
                  }
                  owned={Boolean(ownedItems?.goldenBall)}
                  ticketQuantity={Number(
                    activeCosmetics?.goldenTicketQuantity ||
                      ownedItems?.goldenTicketQty ||
                      0,
                  )}
                  guestLocked={isGuest}
                  onOpenShop={(id) => onOpenShop?.(id)}
                  onToggle={(id) => {
                    if (isGuest) onOpenShop?.(id);
                    else onToggleCosmetic?.(id);
                  }}
                />
                <CosmeticUpgradeCard
                  id="goldenGlove"
                  title="Golden Glove"
                  subtitle="INCREASED GK SAVE"
                  price="£1"
                  assetSrc="/assets/game/golden-glove.png"
                  active={
                    isGuest
                      ? false
                      : Boolean(
                          ownedItems?.goldenGlove && activeCosmetics?.goldenGlove,
                        )
                  }
                  owned={Boolean(ownedItems?.goldenGlove)}
                  ticketQuantity={Number(
                    activeCosmetics?.goldenTicketQuantity ||
                      ownedItems?.goldenTicketQty ||
                      0,
                  )}
                  guestLocked={isGuest}
                  onOpenShop={(id) => onOpenShop?.(id)}
                  onToggle={(id) => {
                    if (isGuest) onOpenShop?.(id);
                    else onToggleCosmetic?.(id);
                  }}
                />
                <CosmeticUpgradeCard
                  id="goldenTicket"
                  title="Golden Ticket"
                  subtitle="1x ADVANCE TO FINAL"
                  price="£1"
                  assetSrc="/assets/game/golden-ticket.png"
                  active={
                    isGuest ? false : Number(ownedItems?.goldenTicketQty || 0) > 0
                  }
                  owned={Number(ownedItems?.goldenTicketQty || 0) > 0}
                  ticketQuantity={Number(
                    activeCosmetics?.goldenTicketQuantity ||
                      ownedItems?.goldenTicketQty ||
                      0,
                  )}
                  guestLocked={isGuest}
                  onOpenShop={(id) => onOpenShop?.(id)}
                  onUseGoldenTicket={() => setTicketOfficeOpen(true)}
                  onToggle={(id) => {
                    if (isGuest) onOpenShop?.(id);
                    else onToggleCosmetic?.(id);
                  }}
                />
                </div>
              </div>
            </MenuPanel>

            <MenuPanel
              title="FULL BUNDLE"
              style={CLUBHOUSE_PANEL_STYLE}
            >
              <div className="p-4 pt-2">
                <GoldenKitbagBundleCard
                  onOpenShop={(id) => onOpenShop?.(id)}
                  disabled={false}
                />
              </div>
            </MenuPanel>
          </div>
        )}
      </DrawerContent>
      <TicketOfficeModal
        open={ticketOfficeOpen}
        quantity={Number(activeCosmetics?.goldenTicketQuantity || ownedItems?.goldenTicketQty || 0)}
        onClose={() => setTicketOfficeOpen(false)}
        onUse={() => {
          setTicketOfficeOpen(false);
          onUseGoldenTicket?.();
        }}
        onBuyMore={() => {
          setTicketOfficeOpen(false);
          onOpenShop?.(STORE_ITEM_IDS.goldenTicket);
        }}
      />
      {registerAuthOpen && (
        <ClubhouseRegisterAuthOverlay
          onClose={() => setRegisterAuthOpen(false)}
          onAuthComplete={async (user, options) => {
            await menuProps?.onAuthComplete?.(user, options);
            setRegisterAuthOpen(false);
          }}
        />
      )}
    </main>
  );
}
