import { useState } from "react";
import { auth } from "../../firebase.js";
import { LEADERBOARD_POINTS } from "../../logic/leaderboardScoring.js";
import { formForSummary, conversionPercent } from "../../logic/appState.js";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { AuthMenuPanel } from "../layout/Menu.jsx";
import { MenuPanel, IvoryCard, UserHighlightCard } from "../layout/MenuPanel.jsx";
import { ActionButton } from "../layout/ActionButton.jsx";
import { Flag } from "../shared.jsx";

function DrawerContent({ children }) {
  return <section className="min-h-0 flex-1 overflow-auto px-0 pb-4 pt-4">{children}</section>;
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

function StatTile({ label, value, highlight = false }) {
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

function FormDot({ value, compact = false }) {
  const dotClass = value === "W" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]" : value === "L" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" : value === "D" ? "bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.7)]" : "bg-[#F7D117]/28";
  const sizeClass = compact ? "h-[clamp(6px,1.7vw,9px)] w-[clamp(6px,1.7vw,9px)]" : "h-[clamp(8px,2.2vw,11px)] w-[clamp(8px,2.2vw,11px)]";
  return <span className={`block min-w-0 shrink aspect-square ${sizeClass} rounded-full ${dotClass}`} aria-hidden="true" />;
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
  const railClass = "border-[#F7D117]/12 bg-[#062819]/94 text-[#F7D117] shadow-[0_8px_20px_rgba(0,0,0,0.18)]";
  return (
    <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
      <div className={`flex h-[29px] min-w-0 items-center justify-center gap-[clamp(2px,0.8vw,5px)] overflow-hidden rounded-full border px-2 ${railClass}`}>
        {Array.from({ length: 8 }).map((_, index) => <FormDot key={index} value={form[index]} compact />)}
      </div>
      <div className="font-led grid h-[25px] min-w-[40px] place-items-center rounded-full border border-[#F7D117]/12 bg-[#062819]/94 px-2 text-[9px] uppercase leading-none tracking-[0.035em] text-[#F7D117] shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
        {Number(points || 0)}
      </div>
    </div>
  );
}

function TeamSummaryCard({ title, team, roundLabel = "GROUP STAGE", highlight = false, medalClass = null }) {
  const cardClass = highlight
    ? "rounded-[1.35rem] border border-[#F7D117]/18 bg-[#062819] text-[#F5F1E8] shadow-[0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(245,241,232,0.06)] ring-1 ring-[#F7D117]/16"
    : medalClass || "rounded-[1.35rem] border border-[#F5F1E8]/70 bg-[#F5F1E8] text-[#072D1D] shadow-[0_10px_22px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.70)] ring-1 ring-[#0B5F35]/12";
  const isMedal = Boolean(medalClass);
  const titleClass = highlight ? "text-[#F5F1E8]" : "text-[#0B5F35]";
  const teamClass = highlight ? "text-[#F7D117]" : isMedal ? "text-[#072D1D]" : "text-[#26352E]";
  const stageClass = highlight ? "text-[#F5F1E8]/78" : "text-[#0B5F35]";

  return (
    <section className={`${cardClass} grid min-h-[142px] min-w-0 place-items-center overflow-hidden p-3 text-center`}>
      <div className={`home-copy-bold text-[8.5px] uppercase leading-none tracking-[0.12em] ${titleClass}`}>{title}</div>
      <Flag team={team} className={`mt-3 h-12 w-[76px] rounded-[9px] object-cover ${highlight ? "ring-1 ring-[#F7D117]/40" : "ring-1 ring-[#0B5F35]/18"}`} />
      <div className={`mt-3 max-w-full truncate home-copy-bold text-[16px] uppercase leading-none tracking-[0.08em] ${teamClass}`}>{team || "NO TEAM"}</div>
      <div className={`mt-2 home-copy-bold text-[7.5px] uppercase leading-none tracking-[0.11em] ${stageClass}`}>{phaseLabel(roundLabel)}</div>
    </section>
  );
}

function CampaignSummaryBlock({ title, team, form = [], points = null, campaignPoints = null, roundLabel = "GROUP STAGE", highlight = false, medalClass = null }) {
  const displayPoints = Number(points ?? campaignPoints ?? 0);
  const card = <TeamSummaryCard title={title} team={team} roundLabel={roundLabel} highlight={highlight} medalClass={medalClass} />;

  return (
    <div className="min-w-0">
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
        className={`${isGuest ? "mt-[-4px] mb-4" : "mt-0.5"} mx-auto block text-center home-copy-regular text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/72`}
      >
        {isGuest ? "JOIN THE CLUB" : "EDIT NICKNAME"}
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

export function ClubhouseScreen({
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
  allTeamsUnlocked = false,
  onUnlockAllTeams,
  onNicknameUpdate,
  currentUser = auth.currentUser,
}) {
  const [registerAuthOpen, setRegisterAuthOpen] = useState(false);
  const isGuest = !currentUser?.uid;
  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST USER";
  const conversion = conversionPercent(allTimeGoals, allTimeShots);
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
        <MenuPanel title={displayName}>
          <NicknameEditor displayName={displayName} onNicknameUpdate={onNicknameUpdate} isGuest={isGuest} onRegister={() => setRegisterAuthOpen(true)} />
          <div className="space-y-3 p-4 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <CampaignSummaryBlock title="Current Campaign" {...currentSummary} highlight />
              <CampaignSummaryBlock title="Best Campaign" {...bestSummary} medalClass={campaignMedalClass(bestSummary)} />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Total goals" value={allTimeGoals || 0} />
              <StatTile label="Conversion" value={`${conversion}%`} />
              <StatTile label="Monday Cups won" value={mondayCupsWon || 0} />
              <RankStatTile value={leaderboardRank || "#--"} />
            </div>
          </div>
        </MenuPanel>

        <MenuPanel title="UPGRADES" className="mt-4">
          <div className="p-4 pt-2">
            <AllTeamsUnlockButton unlocked={Boolean(allTeamsUnlocked)} guestLocked={isGuest} onUnlock={() => { if (isGuest) setRegisterAuthOpen(true); else onUnlockAllTeams?.(); }} />
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

function TrophyIcon({ unlocked }) {
  return (
    <svg viewBox="0 0 64 64" className={`h-10 w-10 ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]/34"}`} fill="none" aria-hidden="true">
      <path d="M22 10h20v9c0 9-4 16-10 19-6-3-10-10-10-19v-9Z" fill="currentColor" />
      <path d="M18 14H9v4c0 8 5 14 13 15M46 14h9v4c0 8-5 14-13 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 38v10M22 54h20M18 60h28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyCabinetScreen({ menuProps }) {
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

export function LeaderboardScreen({ menuProps, rows = [], currentCampaignScore = 0, bestCampaignScore = 0, team = "", bestCampaignSummary = null, currentUser = auth.currentUser }) {
  const [leaderboardView, setLeaderboardView] = useState("scores");
  const placeholderRows = Array.from({ length: 5 }, (_, index) => ({
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
  const activeUserId = currentUser?.uid || "guest-preview";
  const hasRegisteredUserRow = Boolean(currentUser?.uid && rows.some((row) => row.userId === currentUser.uid));
  const previewUserRow = activeUserScore > 0 && !hasRegisteredUserRow
    ? [{
        id: "current-user-preview",
        userId: activeUserId,
        username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
        team: leaderboardTeam,
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
    username: currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST",
    team: leaderboardTeam,
    campaignPoints: activeUserScore,
    isUserPreview: true,
  };

  const sliderButtonClass = (active) => `rounded-full px-3 py-2 home-copy-bold text-[14px] uppercase tracking-[0.08em] transition-all ${
    active
      ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.22)]"
      : "bg-[#0B5F35] text-[#F5F1E8]/72"
  }`;

  const scoringSections = [
    {
      title: "Match Results",
      items: [
        { label: "Match Played", points: LEADERBOARD_POINTS.MATCH_PLAYED },
        { label: "Match Drawn", points: LEADERBOARD_POINTS.MATCH_DRAWN },
        { label: "Match Won", points: LEADERBOARD_POINTS.MATCH_WON },
      ],
    },
    {
      title: "Shot Skill",
      items: [
        { label: "Accuracy Meter", points: `0-${LEADERBOARD_POINTS.ACCURACY_METER_MAX}` },
        { label: "Power Meter", points: `0-${LEADERBOARD_POINTS.POWER_METER_MAX}` },
        { label: "Goal Scored", points: LEADERBOARD_POINTS.GOAL_SCORED },
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

        <MenuPanel title={leaderboardView === "model" ? null : "LEADERBOARD"}>
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

