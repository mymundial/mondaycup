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
import { GROUPS } from "../../data/teams.js";

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
      <div className="home-copy-regular mt-1 text-[6.5px] uppercase leading-tight tracking-[0.10em] text-[#0B5F35]">Leaderboard rank</div>
    </div>
  );
}

function conversionToneClass(value) {
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

function FormDot({ value }) {
  const dotClass = value === "W"
    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.75),0_0_14px_rgba(34,197,94,0.24)]"
    : value === "L"
      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75),0_0_14px_rgba(239,68,68,0.24)]"
      : value === "D"
        ? "bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.78),0_0_14px_rgba(247,209,23,0.24)]"
        : "bg-[#F7D117]/28 shadow-[0_0_5px_rgba(247,209,23,0.22)]";
  return <span className={`block h-[clamp(6px,1.7vw,9px)] w-[clamp(6px,1.7vw,9px)] shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />;
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
    <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(44px,52px)] items-center gap-1">
      <div className="relative flex h-[29px] min-w-0 items-center justify-center overflow-hidden rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505]/58 px-2 py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
        <div className="relative z-[1] flex min-w-0 items-center justify-center gap-[clamp(2px,0.7vw,4px)]">
          {Array.from({ length: 8 }).map((_, index) => <FormDot key={index} value={form[index]} />)}
        </div>
      </div>
      <div className="relative flex h-[29px] min-w-[44px] items-center justify-center overflow-hidden rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505]/58 px-1 py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
        <span className="relative z-[1] font-led text-[clamp(6px,1.7vw,9px)] leading-none text-[#F7D117] led-text-glow tabular-nums">{Number(points || 0)}</span>
      </div>
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

function CosmeticUpgradeCard({ id, title, subtitle = "BONUS", price, assetSrc, iconText = null, active, disabled = false, guestLocked = false, onToggle }) {
  const titleTone = active ? "text-[#F7D117]" : "text-[#072D1D]";
  return (
    <button
      type="button"
      onClick={() => { if (!disabled) onToggle?.(id); }}
      disabled={disabled}
      className={`group relative min-h-[108px] overflow-hidden rounded-[1.1rem] border p-2 text-center shadow-[0_8px_16px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all disabled:cursor-default disabled:opacity-70 ${guestLocked ? "cursor-pointer" : ""} ${
        active
          ? "border-[#F7D117]/38 bg-[#062819] text-[#F5F1E8] ring-1 ring-[#F7D117]/22"
          : "border-[#F7D117]/38 bg-[#F7D117] text-[#072D1D] ring-1 ring-[#0B5F35]/10"
      }`}
    >
      <div className="flex h-full min-h-[92px] flex-col items-center justify-center">
        <div className={`mb-2 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#0B5F35]/18 bg-[#072D1D]`}>
          {assetSrc ? <img src={assetSrc} alt="" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.22)]" draggable={false} /> : <span className="home-copy-bold text-[16px] leading-none text-[#F7D117]">{iconText}</span>}
        </div>
        <div className="flex flex-col items-center gap-0">
          <div className={`home-copy-bold min-h-[12px] text-[10px] uppercase leading-none tracking-[0.075em] ${titleTone}`}>{title}</div>
          <div className={`home-copy-regular mt-[-1px] text-[6.5px] uppercase leading-none tracking-[0.10em] ${active ? "text-[#F5F1E8]/72" : "text-[#072D1D]/70"}`}>{subtitle}</div>
        </div>
        <div className={`mt-2 home-copy-bold text-[11px] uppercase leading-none tracking-[0.06em] ${titleTone}`}>{disabled ? price : active ? "ACTIVE" : price}</div>
      </div>
    </button>
  );
}


function AllTeamsUnlockButton({ unlocked = false, guestLocked = false, onUnlock }) {
  return (
    <button
      type="button"
      onClick={() => { if (guestLocked) { onUnlock?.(); return; } if (!unlocked) onUnlock?.(); }}
      disabled={unlocked && !guestLocked}
      className={`relative mb-3 flex h-[50px] w-full items-center justify-center rounded-[1rem] border-2 border-[#F7D117]/85 bg-[#F7D117] px-5 text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.08)] transition-transform active:scale-[0.99] disabled:cursor-default disabled:opacity-80 ${guestLocked ? "cursor-pointer" : ""}`}
    >
      <PadlockIcon className="absolute left-5 h-7 w-7 text-[#072D1D]" />
      <div className="home-copy-bold min-w-0 truncate text-center text-[clamp(13px,3.5vw,17px)] uppercase leading-none tracking-[0.075em]">
        ALL TEAMS
      </div>
      <div className="home-copy-bold absolute right-5 text-right text-[19px] uppercase tracking-[0.06em]">
        £1.99
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
  allTimeGoals,
  allTimeShots,
  activeCosmetics,
  onToggleCosmetic,
  allTeamsUnlocked = false,
  onUnlockAllTeams,
  onNicknameUpdate,
  currentUser = auth.currentUser,
}) {
  const [registerAuthOpen, setRegisterAuthOpen] = useState(false);
  const isGuest = !currentUser?.uid;
  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST USER";
  const conversion = conversionPercent(allTimeGoals, allTimeShots);
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
            <div className="grid grid-cols-5 gap-2">
              <StatTile label="Matches played" value={matchesPlayedTotal || 0} />
              <StatTile label="Total goals" value={allTimeGoals || 0} />
              <StatTile label="Conversion" value={`${conversion}%`} toneClass={conversionToneClass(conversion)} />
              <CupsWonStatTile value={mondayCupsWon || 0} />
              <RankStatTile value={leaderboardRank || "#--"} />
            </div>

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
                subtitle="POWER BONUS"
                price="£1"
                assetSrc="/assets/game/golden-boot.png"
                active={isGuest ? false : Boolean(activeCosmetics?.goldenBoot)}
                guestLocked={isGuest}
                onToggle={(id) => { if (isGuest) setRegisterAuthOpen(true); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenBall"
                title="Golden Ball"
                subtitle="ACCURACY BONUS"
                price="£1"
                assetSrc="/assets/game/golden-ball.png"
                active={isGuest ? false : Boolean(activeCosmetics?.goldenBall)}
                guestLocked={isGuest}
                onToggle={(id) => { if (isGuest) setRegisterAuthOpen(true); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenGlove"
                title="Golden Glove"
                subtitle="GOALKEEPER BONUS"
                price="£1"
                assetSrc="/assets/game/golden-glove.png"
                active={isGuest ? false : Boolean(activeCosmetics?.goldenGlove)}
                guestLocked={isGuest}
                onToggle={(id) => { if (isGuest) setRegisterAuthOpen(true); else onToggleCosmetic?.(id); }}
              />
              <CosmeticUpgradeCard
                id="goldenTicket"
                title="Golden Ticket"
                subtitle="ADVANCE TO FINAL"
                price="£1"
                assetSrc="/assets/game/golden-ticket.png"
                active={isGuest ? false : Boolean(activeCosmetics?.goldenTicket)}
                guestLocked={isGuest}
                onToggle={(id) => { if (isGuest) setRegisterAuthOpen(true); else onToggleCosmetic?.(id); }}
              />
            </div>
            <div className="mt-3">
              <AllTeamsUnlockButton unlocked={Boolean(allTeamsUnlocked)} guestLocked={isGuest} onUnlock={() => { if (isGuest) setRegisterAuthOpen(true); else onUnlockAllTeams?.(); }} />
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

const ALL_NATIONS = Object.values(GROUPS).flat();

const PODIUM_BADGES = [
  {
    key: "thirdPlaceFinish",
    title: "Third Place",
    assetSrc: "/assets/badges/mc-third-place.png",
    placeholderSrc: "/assets/badges/bronze_shield.png",
    accent: "#D9822B",
    podiumClass: "border-[#D9822B]/82 bg-[#D9822B] text-[#072D1D] ring-[#D9822B]/28",
  },
  {
    key: "runnerUpFinish",
    title: "Runner-Up",
    assetSrc: "/assets/badges/mc-runner-up.png",
    placeholderSrc: "/assets/badges/silver_shield.png",
    accent: "#C8C8C8",
    podiumClass: "border-[#C8C8C8]/82 bg-[#C8C8C8] text-[#072D1D] ring-[#F5F1E8]/28",
  },
  {
    key: "championFinish",
    title: "Champion",
    assetSrc: "/assets/badges/mc-champs2.png",
    placeholderSrc: "/assets/badges/gold_shield.png",
    accent: "#D8B62F",
    podiumClass: "border-[#D8B62F]/82 bg-[#D8B62F] text-[#072D1D] ring-[#F7D117]/28",
  },
];

function PodiumBadgeCard({ unlocked, title, assetSrc, placeholderSrc, podiumClass = "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18" }) {
  return (
    <div className={`grid h-[112px] min-h-[112px] grid-rows-[70px_auto] place-items-center rounded-[1.25rem] border px-2.5 py-3 text-center ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_7px_14px_rgba(0,0,0,0.12)] ${podiumClass}`}>
      <div className="flex h-[70px] w-full items-center justify-center overflow-hidden">
        <img src={unlocked ? assetSrc : placeholderSrc} alt="" className="h-[58px] w-[58px] max-h-[58px] max-w-[58px] object-contain" />
      </div>
      <div className="home-copy-bold mt-1 text-[9px] uppercase leading-none tracking-[0.11em] text-[#072D1D]">{title}</div>
    </div>
  );
}

function NationFlagTile({ team, unlocked }) {
  const displayName = getTeamDisplayName(team, "flagWall");
  return (
    <div className={`grid min-w-0 place-items-center justify-items-center rounded-[1.05rem] border px-1.5 py-1.5 text-center ring-1 ${unlocked ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/16" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`}>
      <div className={`mx-auto flex h-[24px] w-[36px] shrink-0 items-center justify-center justify-self-center overflow-hidden rounded-[0.4rem] ${unlocked ? "ring-1 ring-[#F7D117]/55" : "opacity-35 saturate-0 brightness-[0.78]"}`}>
        <Flag team={team} className="block h-[24px] w-[36px] rounded-[0.4rem] object-cover" />
      </div>
      <div className={`mt-1 block w-full min-w-0 max-w-full truncate text-center home-copy-bold text-[5.8px] uppercase leading-tight tracking-[0.08em] ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]/56"}`}>{displayName}</div>
    </div>
  );
}

function TrophyToggle({ value, onChange }) {
  return (
    <PageTabs
      value={value}
      onChange={onChange}
      options={[
        { value: "badges", label: "BADGES" },
        { value: "flagWall", label: "FLAGS" },
      ]}
    />
  );
}

function TrophySection({ title, children }) {
  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
      {title && (
        <div className="px-4 pb-5 pt-4 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
          {title}
        </div>
      )}
      <div className={title ? "px-3.5 pb-4" : "px-3.5 py-4"}>{children}</div>
    </AppPanel>
  );
}

function TrophyCount({ children }) {
  return <div className="pt-2 text-center home-copy-bold text-[10px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">{children}</div>;
}

function TrophyProgressMeter({ unlocked = 0, total = 27 }) {
  const safeTotal = Math.max(1, Number(total || 27));
  const safeUnlocked = Math.max(0, Math.min(Number(unlocked || 0), safeTotal));
  const progress = Math.round((safeUnlocked / safeTotal) * 100);

  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.35rem" className="px-4 py-3 text-[#F5F1E8]">
      <div className="text-center home-copy-bold text-[12px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">
        Progress
      </div>
      <div className="mt-3 h-[10px] overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#062819]/86 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
        <div
          className="h-full rounded-full bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.34)]"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 text-center home-copy-regular text-[7px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/72">
        {progress}% Complete
      </div>
    </AppPanel>
  );
}

function AchievementArrowButton({ direction, onClick }) {
  return <button type="button" onClick={onClick} className="flex h-8 w-8 items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]" aria-label={direction === "left" ? "Previous achievements" : "Next achievements"}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === "left" ? <path d="M15 5L8 12L15 19" /> : <path d="M9 5L16 12L9 19" />}</svg></button>;
}

function AchievementSectionTitle({ onPrevious, onNext }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
      <AchievementArrowButton direction="left" onClick={onPrevious} />
      <span>ACHIEVEMENTS</span>
      <AchievementArrowButton direction="right" onClick={onNext} />
    </div>
  );
}


const ACHIEVEMENT_PLACEHOLDER_SRC = "/assets/badges/gold_shield.png";
const ACHIEVEMENT_TROPHY_SRC = "/assets/badges/mc-trophy.png";

function AchievementIcon({ unlocked }) {
  const sizeClass = unlocked ? "h-[46px] w-[46px]" : "h-[50px] w-[50px]";

  return (
    <div className="flex h-[58px] w-[58px] items-center justify-center bg-transparent">
      <img
        src={unlocked ? ACHIEVEMENT_TROPHY_SRC : ACHIEVEMENT_PLACEHOLDER_SRC}
        alt=""
        className={`block ${sizeClass} bg-transparent object-contain shadow-none drop-shadow-none`}
        draggable={false}
      />
    </div>
  );
}

function SvgTrophyCard({ title, description, unlocked, number }) {
  return (
    <div className={`relative flex min-h-[112px] flex-col items-center justify-center rounded-[1.1rem] border px-1.5 py-2 text-center ring-1 ${unlocked ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/16" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`}>
      <div className={`absolute left-3 top-2 home-copy-bold font-black text-[7px] uppercase leading-none tracking-[0.08em] ${unlocked ? "text-[#F7D117]/90" : "text-[#0B5F35]/58"}`}>#{number}</div>
      <AchievementIcon unlocked={unlocked} />
      <div className={`home-copy-bold mt-1.5 text-[8px] uppercase leading-none tracking-[0.12em] ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]"}`}>{title}</div>
      <div className={`mt-1 max-w-full truncate home-copy-regular text-[5.5px] uppercase leading-none tracking-[0.08em] ${unlocked ? "text-[#F5F1E8]/70" : "text-[#0B5F35]/58"}`}>{description}</div>
    </div>
  );
}

export function TrophyCabinetScreen({ menuProps, achievements = {}, nationCupWins = {} }) {
  const [trophyView, setTrophyView] = useState("badges");
  const [achievementPage, setAchievementPage] = useState(0);
  const completedCount = ALL_NATIONS.filter((team) => nationCupWins?.[team]?.unlocked).length;
  const svgTrophies = [
    { key: "ourTime", title: "Our Time", description: "Start as a host" },
    { key: "kickOff", title: "Kick Off", description: "Complete one match" },
    { key: "woodwork", title: "Woodwork", description: "Hit post or bar" },
    { key: "targetMan", title: "Target Man", description: "Score first goal" },
    { key: "ptsOnTheBoard", title: "PTS On The Board", description: "Earn group points" },
    { key: "victory", title: "Victory", description: "Win first match" },
    { key: "cleanSweep", title: "Clean Sweep", description: "Win all groups" },
    { key: "qualified", title: "Qualified", description: "Escape the group" },
    { key: "tko", title: "TKO", description: "Win R32" },
    { key: "quarterFinalist", title: "Quarter-Finalist", description: "Win R16" },
    { key: "semiFinalist", title: "Semi-Finalist", description: "Win QF" },
    { key: "finalist", title: "Finalist", description: "Win SF" },
    { key: "cleanSheet", title: "Clean Sheet", description: "Concede zero" },
    { key: "perfect", title: "Perfect", description: "Score all pens" },
    { key: "comebackKing", title: "Comeback King", description: "Win from behind" },
    { key: "iceCold", title: "Ice Cold", description: "Win sudden death" },
    { key: "goldenTouch", title: "Golden Touch", description: "Win with cosmetic" },
    { key: "corruptionScandal", title: "Corruption Scandal", description: "Use Golden Ticket" },
    { key: "mondayLegend", title: "Monday Legend", description: "Win 5 cups" },
    { key: "invincible", title: "Invincible", description: "Win all 8 matches" },
    { key: "nationalTreasure", title: "National Treasure", description: "Collect podium" },
    { key: "globalIcon", title: "Global Icon", description: "Complete flag wall", unlocked: completedCount >= ALL_NATIONS.length || Boolean(achievements?.globalIcon) },
    { key: "siuuu", title: "SIUUU!", description: "Score 1000 goals" },
    { key: "goat", title: "G.O.A.T.", description: "Collect all trophies" },
  ].map((item) => ({ ...item, unlocked: item.unlocked ?? Boolean(achievements?.[item.key]) }));
  const achievementsPerPage = 6;
  const achievementPageCount = Math.ceil(svgTrophies.length / achievementsPerPage);
  const visibleAchievements = svgTrophies.slice(achievementPage * achievementsPerPage, achievementPage * achievementsPerPage + achievementsPerPage);
  const achievementUnlockedCount = svgTrophies.filter((item) => item.unlocked).length;
  const podiumUnlockedCount = PODIUM_BADGES.filter((badge) => Boolean(achievements?.[badge.key])).length;
  const previousAchievementPage = () => setAchievementPage((page) => (page - 1 + achievementPageCount) % achievementPageCount);
  const nextAchievementPage = () => setAchievementPage((page) => (page + 1) % achievementPageCount);

  return (
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>TROPHIES</ScreenTopBar>
      <PageTabsSlot>
        <TrophyToggle value={trophyView} onChange={setTrophyView} />
      </PageTabsSlot>
      <PageScroll className="pt-0.5">
        <div className="space-y-2.5 pb-4">
          {trophyView === "badges" && (
            <>
              <TrophySection title={<AchievementSectionTitle onPrevious={previousAchievementPage} onNext={nextAchievementPage} />}>
                <div className="grid grid-cols-3 gap-3">
                  {visibleAchievements.map((trophy, index) => <SvgTrophyCard key={trophy.key} {...trophy} number={(achievementPage * achievementsPerPage) + index + 1} />)}
                </div>
                <TrophyCount>{achievementUnlockedCount}/{svgTrophies.length}</TrophyCount>
              </TrophySection>
              <TrophySection title={null}>
                <div className="grid grid-cols-3 gap-3">
                  {PODIUM_BADGES.map((badge) => (
                    <PodiumBadgeCard
                      key={badge.key}
                      unlocked={Boolean(achievements?.[badge.key])}
                      title={badge.title}
                      assetSrc={badge.assetSrc}
                      placeholderSrc={badge.placeholderSrc}
                      podiumClass={badge.podiumClass}
                    />
                  ))}
                </div>
              </TrophySection>
              <TrophyProgressMeter
                unlocked={achievementUnlockedCount + podiumUnlockedCount}
                total={svgTrophies.length + PODIUM_BADGES.length}
              />
            </>
          )}

          {trophyView === "flagWall" && (
            <TrophySection title="FLAG WALL">
              <div className="grid grid-cols-6 justify-items-stretch gap-2.5">
                {ALL_NATIONS.map((nation) => (
                  <NationFlagTile key={nation} team={nation} unlocked={Boolean(nationCupWins?.[nation]?.unlocked)} />
                ))}
              </div>
              <TrophyCount>{completedCount}/{ALL_NATIONS.length}</TrophyCount>
            </TrophySection>
          )}
        </div>
      </PageScroll>
    </main>
  );
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
  const form = row.tournamentProgress || row.form || row.bestCampaign?.tournamentProgress || row.bestCampaign?.form || [];
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
    return <span className={`block h-[20px] w-[20px] rounded-full border ${baseClass} opacity-45`} aria-hidden="true" />;
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
                : isUser ? "bg-[#F7D117]/24" : "bg-[#0B5F35]/12"
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
        { value: "all", label: "All", ariaLabel: "All scores", iconSrc: "/assets/game/golden-ball.png" },
        { value: "clean", label: "Clean", ariaLabel: "Clean leaderboard", iconSrc: "/assets/game/ball1.png" },
      ]}
    />
  );
}

function LeaderboardFlag({ team, isUser = false }) {
  if (!team) {
    return <span className={`grid h-[18px] w-[28px] place-items-center text-center home-copy-bold text-[11px] leading-none ${isUser ? "text-[#F5F1E8]/82" : "text-[#0B5F35]/65"}`}>-</span>;
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
      <span className="justify-self-center text-center">Form</span>
      <span aria-hidden="true" />
      <span className="justify-self-center text-center">Score</span>
    </div>
  );
}

function leaderboardPodiumRowClass(rank) {
  const numericRank = Number(rank);
  if (numericRank === 1) return "border-[#D8B62F]/70 bg-[#D8B62F] text-[#072D1D] ring-1 ring-[#F7D117]/25";
  if (numericRank === 2) return "border-[#C8C8C8]/70 bg-[#C8C8C8] text-[#072D1D] ring-1 ring-[#F5F1E8]/25";
  if (numericRank === 3) return "border-[#CD7F32]/70 bg-[#CD7F32] text-[#072D1D] ring-1 ring-[#CD7F32]/25";
  return "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-1 ring-[#F5F1E8]/18";
}

function leaderboardPodiumTextClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  if (isUser) return "text-[#F7D117]";
  if ([1, 2, 3].includes(numericRank)) return "text-[#355243]";
  return "text-[#0B5F35]/65";
}

function leaderboardNameTextClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  if (isUser) return "text-[#F7D117]";
  if ([1, 2, 3].includes(numericRank)) return "text-[#355243]";
  return "text-[#26352E]";
}

function leaderboardScoreTextClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  if (isUser) return "text-[#F5F1E8]";
  if ([1, 2, 3].includes(numericRank)) return "text-[#355243]";
  return "text-[#0B5F35]";
}

function LeaderboardRow({ row, isUser = false }) {
  const form = leaderboardForm(row);
  const rowClass = isUser
    ? "border-[#F7D117]/70 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#F7D117]/32 shadow-[0_0_12px_rgba(247,209,23,0.10)]"
    : leaderboardPodiumRowClass(row.rank);

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
      <div className={`flex min-w-0 items-center justify-center text-center home-copy-bold text-[14px] leading-none ${leaderboardScoreTextClass(row, isUser)}`}>{Number(row.campaignPoints || 0)}</div>
    </div>
  );
}

function ScoringTypeBox({ label, points, tone = "ivory" }) {
  const toneClass = {
    red: "border-red-500/50 bg-red-500 text-[#F5F1E8]",
    yellow: "border-[#F7D117]/60 bg-[#F7D117] text-[#072D1D]",
    green: "border-green-500/55 bg-green-500 text-[#F5F1E8]",
    bronze: "border-[#CD7F32]/70 bg-[#CD7F32] text-[#072D1D]",
    silver: "border-[#C8C8C8]/80 bg-[#C8C8C8] text-[#072D1D]",
    gold: "border-[#D8B62F]/80 bg-[#D8B62F] text-[#072D1D]",
    ivory: "border-[#F5F1E8]/70 bg-[#F5F1E8] text-[#072D1D]",
  }[tone] || "border-[#F5F1E8]/70 bg-[#F5F1E8] text-[#072D1D]";

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
  const [cleanLeaderboardOnly, setCleanLeaderboardOnly] = useState(false);
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
        form: bestCampaignSummary?.form || bestCampaignSummary?.tournamentProgress || [],
        tournamentProgress: bestCampaignSummary?.tournamentProgress || bestCampaignSummary?.form || [],
        cosmeticsApplied: previewCosmetics,
        bestCampaign: { ...(bestCampaignSummary || {}), cosmeticsApplied: previewCosmetics },
        status: bestCampaignSummary?.status || bestCampaignSummary?.roundLabel || bestCampaignSummary?.stage || "inProgress",
        isUserPreview: true,
      }]
    : [];

  const baseRows = rows.length ? rows : placeholderRows;
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
    form: bestCampaignSummary?.form || bestCampaignSummary?.tournamentProgress || [],
    tournamentProgress: bestCampaignSummary?.tournamentProgress || bestCampaignSummary?.form || [],
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
      <DrawerContent>
        <PageTabsSlot className="pb-3">
          <PageTabs
            value={leaderboardView}
            onChange={setLeaderboardView}
            options={[
              { value: "scores", label: "SCORES" },
              { value: "model", label: "SCORING" },
            ]}
          />
        </PageTabsSlot>

        <div className="pt-0.5 [scroll-padding-top:0px]">
          <div className="space-y-2 pb-4">
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

                <LeaderboardSection title="MY RANKING">
                  <div className="px-2 pb-2 pt-0">
                    <LeaderboardRow row={myRankRow} isUser />
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
