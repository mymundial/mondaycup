import { HOST_TEAMS, GROUPS, GROUP_LETTERS, TEAM_RANK, getTeamTheme } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";
import { DEFAULT_ASSETS, GAME } from "../../logic/penaltyEngine.js";
import { Flag } from "../shared.jsx";
import { GreenCard, SelectionLayout, Shell } from "../layout/Layout.jsx";


function HomeCrowdPerson({ x, y, scale = 1, shirt = "#0d6c3d", skin = "#c98f65", pose = "down", opacity = 1 }) {
  const armLeft = pose === "up" ? "M5 13 L1 6" : "M5 13 L2 20";
  const armRight = pose === "up" ? "M13 13 L17 6" : "M13 13 L16 20";
  return (
    <svg className="absolute overflow-visible" style={{ left: `${x}%`, top: `${y}%`, width: `${18 * scale}px`, height: `${30 * scale}px`, opacity, transform: "translate(-50%, -50%)" }} viewBox="0 0 18 30" aria-hidden="true">
      <path d={armLeft} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <path d={armRight} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="6" r="4" fill={skin} />
      <rect x="4" y="11" width="10" height="12" rx="3" fill={shirt} />
      <rect x="5" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
      <rect x="10" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
    </svg>
  );
}

function HomeCrowdBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  const boardTop = goalLine - boardHeight;
  const shirts = [
    "#2DA94F", "#F7D117", "#FF1E3C", "#FF3131", "#E1251B", "#2F3ED6", "#8A1538", "#E3000F",
    "#E10600", "#1A22C9", "#2A248A", "#F7C600", "#FF8A00", "#F7D900", "#FF8500", "#3131E8",
    "#FF1744", "#9B003F", "#F20D1B", "#25308F", "#7CB5E8", "#0D47A1", "#157A52", "#D50000",
    "#93BFEA", "#00A86B", "#FF3B30", "#1E7FF0", "#2437C6", "#FFFFFF"
  ];
  const skins = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];
  const makeRow = ({ count, startX, step, y, scale, opacity, stagger = 0, wave = 0, shirtOffset = 0, skinOffset = 0 }) => Array.from({ length: count }, (_, i) => ({
    x: startX + i * step + (i % 2 ? stagger : 0),
    y: y + (i % 3) * wave,
    scale,
    shirt: shirts[((i * 7) + shirtOffset) % shirts.length],
    skin: skins[(i + skinOffset) % skins.length],
    pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
    opacity,
  }));
  const crowdRows = [
    ...makeRow({ count: 42, startX: 0.5, step: 2.35, y: 4, scale: 0.4, opacity: 0.18, stagger: 0.35, wave: 0.35 }),
    ...makeRow({ count: 38, startX: 1, step: 2.6, y: 9, scale: 0.46, opacity: 0.26, stagger: 0.45, wave: 0.4, shirtOffset: 1 }),
    ...makeRow({ count: 36, startX: 1.5, step: 2.85, y: 16, scale: 0.54, opacity: 0.34, stagger: 0.55, wave: 0.5, shirtOffset: 2, skinOffset: 1 }),
    ...makeRow({ count: 34, startX: 2, step: 3.05, y: 25, scale: 0.62, opacity: 0.42, stagger: 0.65, wave: 0.55, shirtOffset: 3, skinOffset: 2 }),
    ...makeRow({ count: 32, startX: 2.5, step: 3.25, y: 36, scale: 0.7, opacity: 0.54, stagger: 0.75, wave: 0.65, shirtOffset: 4, skinOffset: 1 }),
    ...makeRow({ count: 30, startX: 3, step: 3.45, y: 49, scale: 0.78, opacity: 0.66, stagger: 0.9, wave: 0.8, shirtOffset: 0, skinOffset: 3 }),
    ...makeRow({ count: 28, startX: 3.5, step: 3.75, y: 64, scale: 0.86, opacity: 0.8, stagger: 1, wave: 0.9, shirtOffset: 2, skinOffset: 0 }),
    ...makeRow({ count: 26, startX: 4, step: 4.05, y: 80, scale: 0.94, opacity: 0.92, stagger: 1.1, wave: 0.9, shirtOffset: 1, skinOffset: 2 }),
    ...makeRow({ count: 24, startX: 4.5, step: 4.35, y: 91, scale: 0.98, opacity: 1, stagger: 1.2, wave: 0.45, shirtOffset: 3, skinOffset: 1 }),
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden bg-[#123822]" style={{ height: `${boardTop}%` }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 6%, rgba(245,241,232,0.08), transparent 20%), radial-gradient(circle at 80% 8%, rgba(255,214,0,0.05), transparent 18%), linear-gradient(180deg, rgba(4,22,14,0.4), rgba(4,22,14,0.1))" }} />
      <div className="absolute inset-x-0 top-[5%] h-[10%] bg-[#0b2d1d]/12" />
      <div className="absolute inset-x-0 top-[18%] h-[11%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[33%] h-[12%] bg-[#0b2d1d]/12" />
      {crowdRows.map((person, index) => <HomeCrowdPerson key={index} {...person} />)}
    </div>
  );
}

function HomeLedAdvertisingHoard() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#2d2d2d] bg-[#050505] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]" style={{ top: `${goalLine - boardHeight}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.8px)", backgroundSize: "6px 6px" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,168,87,0.16),rgba(255,255,255,0.04),rgba(36,168,87,0.16))]" />
      <div className="relative flex h-full items-center justify-center">
        <img src={DEFAULT_ASSETS.logo} alt="myMUNDIAL" className="h-[72%] max-w-[82%] object-contain opacity-95 drop-shadow-[0_0_8px_rgba(245,241,232,0.58)]" draggable={false} />
      </div>
    </div>
  );
}

function HomeGoalFrame() {
  const goal = GAME.goal;
  return (
    <div className="absolute z-[3] overflow-hidden border-[8px] border-b-0 border-[#f5f1e8] bg-[#0d6c3d]/30" style={{ left: `${goal.left}%`, top: `${goal.top}%`, width: `${goal.width}%`, height: `${goal.height}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 1.8%, rgba(245,241,232,0.18) 2.0%, transparent 2.2%), repeating-linear-gradient(180deg, transparent 0%, transparent 2.6%, rgba(245,241,232,0.16) 2.8%, transparent 3.1%), linear-gradient(135deg, transparent 0%, transparent 49%, rgba(245,241,232,0.08) 49.4%, transparent 50%)", backgroundSize: "100% 100%, 100% 100%, 8px 8px" }} />
    </div>
  );
}

function HomePitchBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0d6c3d]">
      <HomeCrowdBackdrop />
      <HomeLedAdvertisingHoard />
      <div className="absolute bottom-0 left-0 right-0" style={{ top: `${goalLine}%`, backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))" }} />
      <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
      <div className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]" style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }} />
      <HomeGoalFrame />
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
    </div>
  );
}

function HomeFlagPanel({ type }) {
  const isCup = type === "cup";
  const flagSrc = type === "canada" ? "/flags/CAN.png" : type === "mexico" ? "/flags/MEX.png" : "/flags/USA.png";
  return (
    <div className="relative h-full w-full">
      <div className="absolute -left-[3%] -right-[3%] -top-[5px] h-[4px] rounded-full bg-[#BFC7C4] shadow-[0_1px_3px_rgba(0,0,0,0.35)]" />
      <div className="absolute -left-[3%] -top-[7px] h-[8px] w-[8px] rounded-full bg-[#AEB7B4] shadow-[0_1px_3px_rgba(0,0,0,0.35)]" />
      <div className="absolute -right-[3%] -top-[7px] h-[8px] w-[8px] rounded-full bg-[#AEB7B4] shadow-[0_1px_3px_rgba(0,0,0,0.35)]" />
      <div className={`flex h-full w-full items-center justify-center overflow-hidden border border-[#0A1A12]/55 shadow-[0_4px_10px_rgba(0,0,0,0.30)] ${isCup ? "bg-[#7D8581]" : "bg-[#F5F0E6]"}`}>
        {isCup ? (
          <img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-[80%] w-[84%] object-contain" draggable={false} />
        ) : (
          <img src={flagSrc} alt="" className="h-full w-full object-contain" draggable={false} />
        )}
      </div>
    </div>
  );
}

function HomeHangingFlag({ type, left }) {
  return (
    <div className="absolute z-[4] -translate-x-1/2" style={{ left: `${left}%`, top: "42%", width: "12.5%", height: "46%" }}>
      <div className="absolute left-[10%] top-[-24%] h-[24%] w-[2px] rounded-full bg-[#D8DFDC]/80 shadow-[0_1px_2px_rgba(0,0,0,0.38)]" />
      <div className="absolute right-[10%] top-[-24%] h-[24%] w-[2px] rounded-full bg-[#D8DFDC]/80 shadow-[0_1px_2px_rgba(0,0,0,0.38)]" />
      <HomeFlagPanel type={type} />
    </div>
  );
}

function ScoreboardPlaceholder() {
  const flagCenters = [20, 35, 50, 65, 80];
  const lightCenters = flagCenters.map((x) => x * 10);
  const flagItems = ["canada", "cup", "mexico", "cup", "usa"];
  const headerHeight = "calc(54px + ((100dvh - 54px) * 0.165))";
  const flashHeight = "calc((100dvh - 54px) * 0.165 * 0.26)";
  const trussHeight = "calc(((100dvh - 54px) * 0.165 * 0.26) * 0.5)";
  const mergedBarHeight = "calc(((100dvh - 54px) * 0.165 * 0.26) * 1.5)";
  const skyHeight = "calc(54px + ((100dvh - 54px) * 0.165) - (((100dvh - 54px) * 0.165 * 0.26) * 2.5))";

  return (
    <div className="relative shrink-0 overflow-hidden" style={{ height: headerHeight }} aria-hidden="true">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#07111E_0%,#10243B_52%,#183854_100%)]" style={{ height: skyHeight }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.10),transparent_46%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(245,241,232,0.04))]" />
      </div>

      <div className="relative overflow-hidden bg-[#11161C]" style={{ height: flashHeight }}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#2F363E_0%,#1A222A_18%,#12191F_58%,#0A0E13_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[16%] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0))]" />
        <div className="absolute inset-x-0 top-[12%] h-[11%] bg-[#535960]/55" />
        <div className="absolute inset-x-0 top-[19%] h-[4%] bg-[#9AA0A4]/28" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 28 H1000" stroke="rgba(20,24,29,0.82)" strokeWidth="15" />
            <path d="M0 31 H1000" stroke="rgba(245,241,232,0.10)" strokeWidth="2" />
            <path d="M0 82 H1000" stroke="rgba(5,8,11,0.84)" strokeWidth="8" />
            {Array.from({ length: 7 }).map((_, idx) => {
              const left = idx * 166 - 30;
              const center = left + 83;
              return (
                <g key={idx}>
                  <path d={`M${left} 82 L${center} 32 L${left + 166} 82`} stroke="rgba(87,96,104,0.32)" strokeWidth="8" />
                  <path d={`M${left + 18} 82 L${center} 40 L${left + 148} 82`} stroke="rgba(245,241,232,0.08)" strokeWidth="3" />
                </g>
              );
            })}
            <path d="M80 64 H920" stroke="rgba(168,174,179,0.28)" strokeWidth="4" />
          </g>
        </svg>
      </div>

      <div className="relative overflow-hidden bg-[#0A3321]" style={{ height: mergedBarHeight }}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />

        <div className="absolute inset-x-0 top-0" style={{ height: trussHeight }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M120 20 H880" stroke="rgba(210,216,218,0.54)" strokeWidth="6" />
              <path d="M120 74 H880" stroke="rgba(155,164,166,0.48)" strokeWidth="6" />
              {Array.from({ length: 4 }).map((_, idx) => {
                const x0 = 120 + idx * 190;
                const x1 = x0 + 190;
                return (
                  <g key={idx}>
                    <path d={`M${x0} 74 L${x1} 20`} stroke="rgba(210,216,218,0.32)" strokeWidth="4" />
                    <path d={`M${x0} 20 L${x1} 74`} stroke="rgba(210,216,218,0.28)" strokeWidth="4" />
                  </g>
                );
              })}
              {lightCenters.map((cx) => <path key={`hanger-${cx}`} d={`M${cx} 20 V83`} stroke="rgba(210,216,218,0.22)" strokeWidth="3" />)}
            </g>
            <g>
              {lightCenters.map((cx) => (
                <g key={cx}>
                  <rect x={cx - 15} y="38" width="30" height="20" rx="2" fill="#F5F1E8" />
                  <rect x={cx - 9} y="43" width="18" height="10" rx="1.5" fill="#FFFFFF" />
                  <rect x={cx - 3} y="58" width="6" height="9" rx="1.5" fill="rgba(220,226,222,0.78)" />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {flagItems.map((type, index) => <HomeHangingFlag key={`${type}-${index}`} type={type} left={flagCenters[index]} />)}
        <div className="absolute inset-x-0 bottom-[-1px] h-[3px] bg-[#123822]" />
      </div>
    </div>
  );
}


function HomeFooter() {
  return (
    <div className="relative z-10 flex justify-center pb-5 pt-2">
      <img src={ASSETS.myMundialLogo} alt="myMUNDIAL" className="h-8 w-auto object-contain opacity-90" draggable={false} />
    </div>
  );
}

function HomeLayout({ children }) {
  return (
    <Shell>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#EFE7D8] text-[#072D1D]">
        <ScoreboardPlaceholder />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <HomePitchBackdrop />
          <div className="relative z-10 flex h-full flex-col px-5 pb-0 pt-4">
            <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
              {children}
            </div>
            <HomeFooter />
          </div>
        </main>
      </div>
    </Shell>
  );
}

function ActionButton({ children, eyebrow, onClick, variant = "light", disabled = false }) {
  const styles = variant === "green"
    ? "border-[#F5F0E6]/20 bg-[#0B5F35] text-[#F5F0E6]"
    : variant === "account"
      ? "border-[#F5F0E6]/18 bg-[#F5F0E6]/18 text-[#F5F0E6]/60"
      : "border-[#D4AF37]/50 bg-[#F5F0E6] text-[#0B5F35]";

  return <button onClick={onClick} disabled={disabled} className={`w-full rounded-[1.35rem] border px-4 py-4 text-center shadow-inner transition ${styles} ${disabled ? "opacity-70" : "active:scale-[0.99]"}`}>
    {eyebrow && <div className="text-[8px] font-black uppercase tracking-[0.24em] opacity-50">{eyebrow}</div>}
    <div className="mt-1 text-[18px] font-black uppercase leading-none tracking-[0.02em]">{children}</div>
  </button>;
}

function SavedCampaignCard({ summary, onContinue }) {
  if (!summary) return null;
  return <button onClick={onContinue} className="w-full rounded-[1.35rem] border border-[#D4AF37]/55 bg-[#F5F0E6] p-4 text-left text-[#0B5F35] shadow-inner">
    <div className="text-[8px] font-black uppercase tracking-[0.24em] text-[#0B5F35]/45">CONTINUE CAMPAIGN</div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[21px] font-black uppercase leading-none tracking-[-0.02em]">{summary.team}</div>
        <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#0B5F35]/50">{summary.matchStage} · v {summary.opponent}</div>
      </div>
      <div className="shrink-0 rounded-full bg-[#0B5F35] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#F5F0E6]">PLAY</div>
    </div>
  </button>;
}

function LandingPanel({ onSelectGroup }) {
  return <div className="space-y-3">
    <GreenCard>
      <div className="text-center">
        <div className="text-[28px] font-black uppercase leading-[0.9] tracking-[-0.03em]">PLAY YOUR TOURNAMENT JOURNEY</div>
        <p className="mx-auto mt-3 max-w-[248px] text-[10px] font-bold uppercase leading-[1.45] tracking-[0.09em] text-[#F5F0E6]/58">Choose a host nation and chase the final.</p>
      </div>
      <div className="mt-5 space-y-2.5">
        <ActionButton onClick={() => onSelectGroup("A")} eyebrow="NO ACCOUNT NEEDED">PLAY AS GUEST</ActionButton>
        <ActionButton disabled eyebrow="COMING SOON" variant="account">SIGN IN / REGISTER</ActionButton>
      </div>
    </GreenCard>
  </div>;
}

function HostPanel({ onSelectGroup, onSelectTeam }) {
  return <GreenCard><div className="mb-2 text-center text-[22px] font-black uppercase tracking-[-0.02em]">HOST NATIONS</div><div className="grid grid-cols-3 gap-2">{HOST_TEAMS.map((host) => { const theme = getTeamTheme(host.name); return <button key={host.name} onClick={() => onSelectTeam(host.name, host.group)} className="h-[38px] rounded-[1rem] shadow-inner" style={{ backgroundColor: theme.bg, color: theme.text }}><span className="flex h-full items-center justify-center text-[18px] font-black tracking-[0.04em]">{host.code}</span></button>; })}</div><button onClick={() => onSelectGroup("A")} className="mt-3 flex h-[96px] w-full items-center justify-center rounded-[1.15rem] border-[2px] border-[#D4AF37] bg-[#F5F0E6] px-4 text-[#0B5F35] shadow-inner"><div className="text-center"><div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#0B5F35]/45">UNLOCK THE FULL TOURNAMENT</div><div className="mt-2 text-[20px] font-black uppercase leading-[0.9] tracking-[-0.02em]">ALL 48 TEAMS</div><div className="mt-2 inline-flex rounded-full bg-[#0B5F35] px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#F5F0E6]">£2.99</div></div></button></GreenCard>;
}

function ArrowButton({ direction, onClick }) {
  return <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F0E6] text-[#0B5F35]"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === "left" ? <path d="M15 5L8 12L15 19" /> : <path d="M9 5L16 12L9 19" />}</svg></button>;
}

function TeamPanel({ group, onSelectGroup, onSelectTeam }) {
  const currentIndex = GROUP_LETTERS.indexOf(group);
  const previousGroup = () => onSelectGroup(GROUP_LETTERS[(currentIndex - 1 + GROUP_LETTERS.length) % GROUP_LETTERS.length]);
  const nextGroup = () => onSelectGroup(GROUP_LETTERS[(currentIndex + 1) % GROUP_LETTERS.length]);
  return <GreenCard><div className="mb-3 flex items-center justify-between"><ArrowButton direction="left" onClick={previousGroup} /><div className="text-[24px] font-black uppercase tracking-[-0.02em] text-[#F5F0E6]">GROUP {group}</div><ArrowButton direction="right" onClick={nextGroup} /></div><div className="grid gap-2">{GROUPS[group].map((name) => <button key={name} onClick={() => onSelectTeam(name)} className="grid h-[38px] grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 rounded-[1.15rem] bg-[#F5F0E6] px-4 text-left text-[15px] font-black tracking-[-0.02em] text-[#0B5F35] shadow-inner"><Flag team={name} className="h-5 w-7" /><span className="truncate text-center uppercase tracking-[-0.01em]">{name}</span><span className="text-right text-[11px] font-black tabular-nums tracking-[0.06em] text-[#0B5F35]/45">#{TEAM_RANK[name]}</span></button>)}</div></GreenCard>;
}

export function HomeScreen({ onSelectGroup }) { return <HomeLayout><LandingPanel onSelectGroup={onSelectGroup} /></HomeLayout>; }
export function HostSelectScreen(props) { return <SelectionLayout><HostPanel {...props} /></SelectionLayout>; }
export function TeamSelectScreen({ selectedGroup, onSelectGroup, onSelectTeam }) { return <SelectionLayout><TeamPanel group={selectedGroup} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} /></SelectionLayout>; }
