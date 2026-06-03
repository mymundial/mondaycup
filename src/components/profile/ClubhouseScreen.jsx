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
  return <PageScroll className="px-0 pt-4">{children}</PageScroll>;
}


function PadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4s3.6 1.4 3.6 3.6V10" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function StatTile({ label, value, highlight = false, toneClass = null }) {
  if (toneClass) {
    return (
      <div className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${toneClass}`}>
        <div className="home-copy-bold text-[18px] uppercase leading-none">{value}</div>
        <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#072D1D]/74">{label}</div>
      </div>
    );
  }

  const Card = highlight ? UserHighlightCard : IvoryCard;
  return (
    <Card className="flex min-h-[58px] flex-col items-center justify-center p-2 text-center">
      <div className={`home-copy-bold text-[18px] uppercase leading-none ${highlight ? "text-[#F7D117]" : "text-[#072D1D]"}`}>{value}</div>
      <div className={`home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] ${highlight ? "text-[#F5F1E8]/72" : "text-[#0B5F35]"}`}>{label}</div>
    </Card>
  );
}


function rankMedalClass(value) {
  const rank = Number(String(value || "").replace(/[^0-9]/g, ""));
  if (rank === 1) return "border-[#D8B62F]/80 bg-[#D8B62F] text-[#072D1D] ring-1 ring-[#F7D117]/32";
  if (rank === 2) return "border-[#C8C8C8]/80 bg-[#C8C8C8] text-[#072D1D] ring-1 ring-[#F5F1E8]/30";
  if (rank === 3) return "border-[#D9822B]/80 bg-[#D9822B] text-[#072D1D] ring-1 ring-[#D9822B]/30";
  return "border-[#F5F1E8]/70 bg-[#F5F1E8] text-[#072D1D] ring-1 ring-[#0B5F35]/12";
}

function RankStatTile({ value }) {
  const medalClass = rankMedalClass(value);
  return (
    <div className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${medalClass}`}>
      <div className="home-copy-bold text-[18px] uppercase leading-none">{value || "#--"}</div>
      <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#0B5F35]">Ranking</div>
    </div>
  );
}

function conversionToneClass(value, shots = 0) {
  const attempts = Number(shots || 0);
  if (attempts <= 0) return null;
  const conversion = Number(value || 0);
  if (conversion >= 51) return "border-green-500/80 bg-green-500 text-[#072D1D] ring-1 ring-green-400/32";
  if (conversion === 50) return "border-[#F7D117]/85 bg-[#F7D117] text-[#072D1D] ring-1 ring-[#F7D117]/32";
  return "border-red-500/80 bg-red-500 text-[#072D1D] ring-1 ring-red-400/32";
}

function CupsWonStatTile({ value }) {
  const cups = Number(value || 0);
  if (cups > 0) {
    return (
      <div className={`flex min-h-[58px] flex-col items-center justify-center rounded-[1.25rem] border p-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.22)] ${rankMedalClass(1)}`}>
        <div className="home-copy-bold text-[18px] uppercase leading-none">{cups}</div>
        <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#0B5F35]">Cups won</div>
      </div>
    );
  }
  return <StatTile label="Cups won" value={cups} />;
}

const CLUBHOUSE_STATS_GRID = "minmax(37px,0.62fr) minmax(70px,1.15fr) minmax(45px,0.78fr) minmax(45px,0.78fr) minmax(52px,0.88fr) minmax(50px,0.88fr)";

function ClubhouseStatsTable({ rank, username, matchesWon, totalGoals, conversionRate, mondayCupsWon }) {
  const conversionNumber = Number(String(conversionRate || "").replace(/[^0-9.-]/g, ""));
  const conversionClass = !Number.isFinite(conversionNumber)
    ? "text-[#F7D117]"
    : conversionNumber >= 51
      ? "text-green-400"
      : conversionNumber === 50
        ? "text-[#F7D117]"
        : "text-red-400";
  const headers = ["Leaderboard Rank", "Username", "Matches Won", "Total Goals", "Conversion Rate", "Monday Cups Won"];
  const values = [rank || "#--", username || "GUEST USER", matchesWon || 0, totalGoals || 0, conversionRate || "--", mondayCupsWon || 0];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#F5F1E8]/24 bg-[#051A11]/46 p-2 shadow-[0_10px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.06)]">
      <div className="grid gap-[3px] px-1 pb-[5px] text-center home-copy-regular text-[6px] uppercase leading-[1.05] tracking-[0.06em] text-[#F5F1E8]/72" style={{ gridTemplateColumns: CLUBHOUSE_STATS_GRID }}>
        {headers.map((label) => <span key={label} className="flex min-h-[18px] items-end justify-center">{label}</span>)}
      </div>
      <div className="grid items-center gap-[3px] rounded-xl border border-[#F7D117]/58 bg-[#072D1D] px-1.5 py-[7px] text-center text-[#F5F1E8] ring-1 ring-[#F7D117]/28 shadow-[0_0_12px_rgba(247,209,23,0.10),0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" style={{ gridTemplateColumns: CLUBHOUSE_STATS_GRID }}>
        {values.map((value, index) => {
          const isRank = index === 0;
          const isUsername = index === 1;
          const isConversion = index === 4;
          const isCups = index === 5 && Number(value || 0) > 0;
          const cellClass = isRank || isCups
            ? "text-[#F7D117]"
            : isConversion
              ? conversionClass
              : "text-[#F5F1E8]";
          return (
            <span
              key={`${index}-${value}`}
              className={`min-w-0 truncate home-copy-bold text-[clamp(9px,2.55vw,12px)] uppercase leading-none ${cellClass}`}
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
  const dotClass = value === "W"
    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.75),0_0_14px_rgba(34,197,94,0.24)]"
    : value === "L"
      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75),0_0_14px_rgba(239,68,68,0.24)]"
      : value === "D"
        ? "bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.78),0_0_14px_rgba(247,209,23,0.24)]"
        : "bg-[#F7D117]/28 shadow-[0_0_5px_rgba(247,209,23,0.22)]";
  return <span className={`block shrink-0 rounded-full ${dotClass}`} style={{ height: "var(--campaign-rail-size)", width: "var(--campaign-rail-size)" }} aria-hidden="true" />;
}

function phaseLabel(label, fallback = "GROUP STAGE") {
  const clean = String(label || "").trim().toUpperCase();
  if (!clean) return fallback;
  if (clean === "ELIMINATED") return fallback;
  if (clean.startsWith("ELIMINATED")) {
    const round = clean.replace(/^ELIMINATED\s*(IN|AT|FROM)?\s*/i, "").trim();
    return round || fallback;
  }
  return clean;
}

function campaignMedalClass(summary = {}) {
  const joined = [summary.finalPosition, summary.placement, summary.result, summary.tournamentPhase, summary.roundLabel, summary.stage]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  if (/CHAMP|WINNER|MONDAY CUP/.test(joined)) return "border-[#D8B62F]/82 bg-[#D8B62F] text-[#072D1D] ring-1 ring-[#F7D117]/28";
  if (/RUNNER|SECOND|2ND/.test(joined)) return "border-[#C8C8C8]/82 bg-[#C8C8C8] text-[#072D1D] ring-1 ring-[#F5F1E8]/28";
  if (/THIRD|3RD/.test(joined)) return "border-[#D9822B]/82 bg-[#D9822B] text-[#072D1D] ring-1 ring-[#D9822B]/28";
  return null;
}

function CampaignStatusRail({ form = [], points = 0 }) {
  return (
    <div
      className="mx-auto mt-2 flex h-[42px] w-[92%] min-w-0 items-center justify-center gap-[clamp(10px,2.7vw,15px)] overflow-hidden rounded-[0.48rem] border border-[#F5F1E8]/22 bg-[#050505]/62 px-[clamp(10px,2.8vw,16px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]"
      style={{ "--campaign-rail-size": "clamp(11px,3.1vw,16px)" }}
    >
      <div className="relative z-[1] flex min-w-0 items-center justify-center gap-[clamp(2px,0.65vw,4px)]">
        {Array.from({ length: 8 }).map((_, index) => <FormDot key={index} value={form[index]} />)}
      </div>
      <span className="block h-[58%] w-px shrink-0 bg-[#F5F1E8]/18" aria-hidden="true" />
      <span className="relative z-[1] inline-flex min-w-[42px] items-center justify-center font-led leading-none text-[#F7D117] led-text-glow tabular-nums" style={{ fontSize: "var(--campaign-rail-size)" }}>{Number(points || 0)}</span>
    </div>
  );
}

function TeamSummaryCard({ title, team, roundLabel = "GROUP STAGE", highlight = false, medalClass = null }) {
  const baseCardClass = "rounded-[1.35rem] border shadow-[0_10px_22px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.70)] ring-1";
  const colourClass = highlight
    ? "border-[#F7D117]/70 bg-[#062819] text-[#F5F1E8] ring-[#F7D117]/32 shadow-[0_0_12px_rgba(247,209,23,0.10),0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(245,241,232,0.06)]"
    : medalClass || "border-[#F5F1E8]/70 bg-[#F5F1E8] text-[#072D1D] ring-[#0B5F35]/12";
  const cardClass = `${baseCardClass} ${colourClass}`;
  const isMedal = Boolean(medalClass);
  const titleClass = highlight ? "text-[#F5F1E8]" : "text-[#0B5F35]";
  const teamClass = highlight ? "text-[#F7D117]" : isMedal ? "text-[#072D1D]" : "text-[#26352E]";
  const stageClass = highlight ? "text-[#F5F1E8]/78" : "text-[#0B5F35]";

  return (
    <section className={`${cardClass} grid min-h-[142px] min-w-0 place-items-center overflow-hidden p-3 text-center`}>
      <div className={`home-copy-bold text-[8.5px] uppercase leading-none tracking-[0.12em] ${titleClass}`}>{title}</div>
      <TeamFlag team={team} isUserTeam={highlight} className="mt-3 h-12 w-[76px] rounded-[9px] object-cover" fallbackRing="ring-[#0B5F35]/18" />
      <div className={`mt-3 max-w-full truncate home-copy-bold text-[16px] uppercase leading-none tracking-[0.08em] ${teamClass}`}>{team || "NO TEAM"}</div>
      <div className={`mt-2 home-copy-bold text-[7.5px] uppercase leading-none tracking-[0.11em] ${stageClass}`}>{phaseLabel(roundLabel)}</div>
    </section>
  );
}

function CampaignSummaryBlock({ title, team, form = [], points = null, campaignPoints = null, roundLabel = "GROUP STAGE", highlight = false, medalClass = null, className = "" }) {
  const displayPoints = Number(points ?? campaignPoints ?? 0);
  const card = (
    <div className="mx-auto w-[92%]">
      <TeamSummaryCard title={title} team={team} roundLabel={roundLabel} highlight={highlight} medalClass={medalClass} />
    </div>
  );

  return (
    <div className={`min-w-0 ${className}`}>
      {card}
      <CampaignStatusRail form={form} points={displayPoints} highlight={highlight} />
    </div>
  );
}

function StatusPill({ children, active = false, className = "" }) {
  return (
    <span className={`inline-flex min-h-[19px] items-center justify-center rounded-full px-2.5 home-copy-bold text-[8.5px] uppercase leading-none tracking-[0.08em] ${active ? "bg-[#052D1D] text-[#F7D117]" : "bg-[#052D1D]/88 text-[#F7D117]"} ${className}`}>
      {children}
    </span>
  );
}

function CosmeticUpgradeCard({ id, title, subtitle = "BONUS", price, assetSrc, iconText = null, active, owned = false, ticketQuantity = 0, disabled = false, guestLocked = false, onToggle, onOpenShop }) {
  const isTicket = id === "goldenTicket";
  const ticketQty = normaliseTicketQuantity(ticketQuantity);
  const isOwned = isTicket ? ticketQty > 0 : Boolean(owned);
  const isMaxTicket = isTicket && ticketQty >= 99;
  const isActive = Boolean(!isTicket && isOwned && active);
  const titleTone = isActive ? "text-[#F7D117]" : "text-[#072D1D]";
  const subtitleTone = isActive ? "text-[#F5F1E8]/72" : "text-[#072D1D]/70";
  const cardTone = isActive
    ? "border-[#F7D117]/44 bg-[#062819] text-[#F5F1E8] ring-1 ring-[#F7D117]/24"
    : "border-[#F7D117]/76 bg-[#F7D117] text-[#072D1D] ring-1 ring-[#0B5F35]/10";

  const status = isTicket
    ? (isMaxTicket ? "MAX" : price)
    : isOwned
      ? (isActive ? "EQUIPPED" : "PURCHASED")
      : price;

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        if (guestLocked) { onOpenShop?.(id); return; }
        if (isTicket || !isOwned) { onOpenShop?.(id); return; }
        onToggle?.(id);
      }}
      disabled={disabled}
      className={`group relative min-h-[108px] overflow-hidden rounded-[1.1rem] border p-2 text-center shadow-[0_8px_16px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all disabled:cursor-default disabled:opacity-70 ${cardTone}`}
    >
      <div className="flex h-full min-h-[92px] flex-col items-center justify-center">
        <div className="mb-2 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#0B5F35]/18 bg-[#072D1D]">
          {assetSrc ? <img src={assetSrc} alt="" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.22)]" draggable={false} /> : <span className="home-copy-bold text-[16px] leading-none text-[#F7D117]">{iconText}</span>}
        </div>
        <div className="flex flex-col items-center gap-0">
          <div className={`home-copy-bold min-h-[12px] text-[10px] uppercase leading-none tracking-[0.075em] ${titleTone}`}>{title}</div>
          <div className={`home-copy-regular mt-[-1px] text-[6.5px] uppercase leading-none tracking-[0.10em] ${subtitleTone}`}>{subtitle}</div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {isTicket ? (
            <>
              <span className={`home-copy-bold text-[11px] uppercase leading-none tracking-[0.06em] ${titleTone}`}>{status}</span>
              <span className="rounded-full bg-[#052D1D]/88 px-1.5 py-1 home-copy-bold text-[7px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">{ticketQty}/99</span>
            </>
          ) : isOwned ? (
            <StatusPill active={isActive}>{status}</StatusPill>
          ) : (
            <span className={`home-copy-bold text-[11px] uppercase leading-none tracking-[0.06em] ${titleTone}`}>{status}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function OpenPadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4c1.8 0 3.1 1.1 3.5 2.8" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function AllTeamsUnlockButton({ unlocked = false, guestLocked = false, onUnlock }) {
  return (
    <button
      type="button"
      onClick={() => { if (guestLocked) { onUnlock?.(); return; } if (!unlocked) onUnlock?.(); }}
      disabled={unlocked && !guestLocked}
      className={`relative mb-3 flex h-[50px] w-full items-center justify-center rounded-[1rem] border-2 border-[#F7D117]/85 px-5 shadow-[0_0_14px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.08)] transition-transform active:scale-[0.99] disabled:cursor-default ${unlocked ? "bg-[#062819] text-[#F5F1E8]" : "bg-[#F7D117] text-[#072D1D]"} ${guestLocked ? "cursor-pointer" : ""}`}
    >
      {unlocked ? <OpenPadlockIcon className="absolute left-5 h-7 w-7 text-[#F7D117]" /> : <PadlockIcon className="absolute left-5 h-7 w-7 text-[#072D1D]" />}
      <div className={`home-copy-bold min-w-0 truncate text-center text-[clamp(13px,3.5vw,17px)] uppercase leading-none tracking-[0.075em] ${unlocked ? "text-[#F7D117]" : "text-[#072D1D]"}`}>
        ALL TEAMS
      </div>
      <div className="absolute right-5 text-right">
        {unlocked ? <StatusPill active>ACTIVE</StatusPill> : <span className="home-copy-bold text-[19px] uppercase tracking-[0.06em] text-[#072D1D]">£1.99</span>}
      </div>
    </button>
  );
}

function NicknameEditor({ displayName, onNicknameUpdate, isGuest = false, onRegister }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const clean = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setValue(clean);
    setStatus("");
    if (!clean) { setStatus("ENTER A USERNAME"); return; }
    if (!onNicknameUpdate) { setStatus("SIGN IN REQUIRED"); return; }
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
          if (isGuest) { onRegister?.(); return; }
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
          onChange={(event) => setValue(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
          maxLength={10}
          className="min-w-0 flex-1 rounded-xl border border-[#F7D117]/45 bg-[#F5F1E8] px-3 py-2 text-center home-copy-bold text-[14px] uppercase tracking-[0.08em] text-[#072D1D] outline-none"
          placeholder="USERNAME"
        />
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#F7D117] px-3 py-2 home-copy-bold text-[12px] uppercase tracking-[0.08em] text-[#072D1D] disabled:opacity-60">{saving ? "..." : "SAVE"}</button>
      </div>
      {status && <div className="mt-2 text-center home-copy-bold text-[9px] uppercase tracking-[0.12em] text-[#F7D117]">{status}</div>}
    </div>
  );
}


function ClubhouseRegisterAuthOverlay({ onClose, onAuthComplete }) {
  return (
    <div
      className="fixed inset-0 isolate flex items-start justify-center bg-[#031B12]/36 px-3 pb-4 pt-[70px] backdrop-blur-[2px]"
      style={{ zIndex: 2147483647 }}
    >
      <button aria-label="Close register panel" onClick={onClose} className="absolute inset-0 z-[0]" type="button" />
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
  return String(displayName || currentUser?.displayName || currentUser?.email?.split("@")[0] || "MONDAY")
    .replace(/[^a-z0-9 ]/gi, "")
    .trim()
    .toUpperCase()
    .slice(0, 14) || "MONDAY";
}

function ClubhouseShirtCard({ shirtProfile = null, displayName, currentUser, onEdit }) {
  const shirt = shirtProfile || {};
  const name = shirt.name || defaultShirtName(currentUser, displayName);
  const number = String(shirt.number || "11").replace(/[^0-9]/g, "").slice(0, 2) || "11";
  const composition = shirt.composition || {};
  return (
    <button
      type="button"
      onClick={onEdit}
      className="grid w-full grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.25rem] border border-[#F7D117]/35 bg-[#051A11]/48 p-2 text-left shadow-[0_10px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.06)]"
    >
      <div className="aspect-square overflow-hidden rounded-[16px] border border-[#F5F1E8]/18 bg-[#073B26] shadow-[0_8px_16px_rgba(0,0,0,0.22)]">
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
          shirtNumberColour={shirt.numberColour || shirt.textColour || "#F5F1E8"}
          shirtOutlineEnabled={false}
          shirtOutlineColour="#F5F1E8"
          shirtFontWeight="900"
          shirtFontStyle="normal"
          shirtFontType="bold"
          shirtOutlineWeight={0}
          shirtMondayScale={composition.mondayScale ?? 1.18}
          shirtNameScale={1.18}
          shirtNumberScale={1.58}
          shirtBrothersScale={0.65}
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
      </div>
      <div className="min-w-0">
        <div className="home-copy-bold text-[10px] font-black uppercase tracking-[0.18em] text-[#F5F1E8]/62">Shirt profile</div>
        <div className="mt-1 truncate home-copy-bold text-[18px] font-black uppercase leading-none tracking-[0.08em] text-[#F7D117]">{name} {number}</div>
        <div className="mt-1 truncate home-copy-regular text-[9px] uppercase tracking-[0.12em] text-[#F5F1E8]/66">{shirt.team || "Default Monday green"}</div>
      </div>
      <span className="grid h-10 w-10 place-items-center rounded-[13px] border border-[#F5F1E8]/18 bg-[#0B5F35]/74 text-[#F5F1E8]">✎</span>
    </button>
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
  allTeamsUnlocked = false,
  onUnlockAllTeams,
  onNicknameUpdate,
  shirtProfile = null,
  onEditShirt,
  currentUser = auth.currentUser,
}) {
  const [registerAuthOpen, setRegisterAuthOpen] = useState(false);
  const isGuest = !currentUser?.uid;
  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST USER";
  const conversion = conversionPercent(allTimeGoals, allTimeShots);
  const shotsTakenTotal = Number(allTimeShots || 0);
  const conversionDisplay = shotsTakenTotal > 0 ? `${conversion}%` : "--";
  const matchesPlayedTotal = Number(allTimeMatchesPlayed || matchesPlayed || 0);
  const currentSummary = {
    team: team || "NO TEAM",
    form: formForSummary(userForm),
    campaignPoints: Number(campaignPoints || 0),
    roundLabel: currentRoundLabel || "GROUP STAGE",
  };
  const bestSummary = bestCampaignSummary?.campaignPoints || bestCampaignSummary?.points ? {
    ...bestCampaignSummary,
    campaignPoints: Number(bestCampaignSummary.campaignPoints ?? bestCampaignSummary.points ?? 0),
  } : {
    team: "NO TEAM",
    form: [],
    campaignPoints: 0,
    roundLabel: "NO CAMPAIGN",
  };

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>CLUBHOUSE</ScreenTopBar>
      <DrawerContent>
        <MenuPanel title={displayName} style={CLUBHOUSE_PANEL_STYLE}>
          <NicknameEditor displayName={displayName} onNicknameUpdate={onNicknameUpdate} isGuest={isGuest} onRegister={() => setRegisterAuthOpen(true)} />
          <div className="space-y-3 p-4 pt-2">
            {!isGuest && <ClubhouseShirtCard shirtProfile={shirtProfile} displayName={displayName} currentUser={currentUser} onEdit={onEditShirt} />}
            <ClubhouseStatsTable
              rank={leaderboardRank || "#--"}
              username={displayName}
              matchesWon={allTimeMatchesWon || 0}
              totalGoals={allTimeGoals || 0}
              conversionRate={conversionDisplay}
              mondayCupsWon={mondayCupsWon || 0}
            />

            <div className="grid grid-cols-4 gap-2">
              <CampaignSummaryBlock className="col-span-2" title="Current Campaign" {...currentSummary} highlight />
              <CampaignSummaryBlock className="col-span-2" title="Best Campaign" {...bestSummary} medalClass={campaignMedalClass(bestSummary)} />
            </div>
          </div>
        </MenuPanel>

        <MenuPanel title="UPGRADES" className="mt-4" style={CLUBHOUSE_PANEL_STYLE}>
          <div className="p-4 pt-2">
            <div className="grid grid-cols-4 gap-2">
              <CosmeticUpgradeCard
                id="goldenBoot"
                title="Golden Boot"
                subtitle="10% SHOT POWER"
                price="£1"
                assetSrc="/assets/game/golden-boot.png"
                active={isGuest ? false : Boolean(ownedItems?.goldenBoot && activeCosmetics?.goldenBoot)}
                owned={Boolean(ownedItems?.goldenBoot)}
                ticketQuantity={Number(activeCosmetics?.goldenTicketQuantity || ownedItems?.goldenTicketQty || 0)}
                guestLocked={isGuest}
                onOpenShop={(id) => onOpenShop?.(id)}
                onToggle={(id) => { if (isGuest) onOpenShop?.(id); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenBall"
                title="Golden Ball"
                subtitle="10% SHOT ACCURACY"
                price="£1"
                assetSrc="/assets/game/golden-ball.png"
                active={isGuest ? false : Boolean(ownedItems?.goldenBall && activeCosmetics?.goldenBall)}
                owned={Boolean(ownedItems?.goldenBall)}
                ticketQuantity={Number(activeCosmetics?.goldenTicketQuantity || ownedItems?.goldenTicketQty || 0)}
                guestLocked={isGuest}
                onOpenShop={(id) => onOpenShop?.(id)}
                onToggle={(id) => { if (isGuest) onOpenShop?.(id); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenGlove"
                title="Golden Glove"
                subtitle="INCREASED GK SAVE"
                price="£1"
                assetSrc="/assets/game/golden-glove.png"
                active={isGuest ? false : Boolean(ownedItems?.goldenGlove && activeCosmetics?.goldenGlove)}
                owned={Boolean(ownedItems?.goldenGlove)}
                ticketQuantity={Number(activeCosmetics?.goldenTicketQuantity || ownedItems?.goldenTicketQty || 0)}
                guestLocked={isGuest}
                onOpenShop={(id) => onOpenShop?.(id)}
                onToggle={(id) => { if (isGuest) onOpenShop?.(id); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenTicket"
                title="Golden Ticket"
                subtitle="1x ADVANCE TO FINAL"
                price="£1"
                assetSrc="/assets/game/golden-ticket.png"
                active={isGuest ? false : Number(ownedItems?.goldenTicketQty || 0) > 0}
                owned={Number(ownedItems?.goldenTicketQty || 0) > 0}
                ticketQuantity={Number(activeCosmetics?.goldenTicketQuantity || ownedItems?.goldenTicketQty || 0)}
                guestLocked={isGuest}
                onOpenShop={(id) => onOpenShop?.(id)}
                onToggle={(id) => { if (isGuest) onOpenShop?.(id); else onToggleCosmetic?.(id); }}
              />
            </div>
            <div className="mt-3">
              <AllTeamsUnlockButton unlocked={Boolean(allTeamsUnlocked)} guestLocked={isGuest} onUnlock={() => onUnlockAllTeams?.()} />
            </div>
          </div>
        </MenuPanel>
      </DrawerContent>
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
