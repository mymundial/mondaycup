import { HOST_TEAMS, GROUPS, GROUP_LETTERS, TEAM_RANK, getTeamTheme } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import { Footer, GreenCard, SelectionLayout, Shell } from "../layout/Layout.jsx";

function HomeTopBar() {
  return (
    <div className="relative flex h-[54px] shrink-0 items-center justify-center bg-[#EFE7D8] text-[#0B5F35]">
      <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 object-contain" draggable={false} />
      <div className="text-[24px] font-black uppercase tracking-[-0.02em]">MONDAY CUP</div>
      <div className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2" aria-hidden="true" />
    </div>
  );
}

function HomeLayout({ children }) {
  return (
    <Shell>
      <div className="flex min-h-[100dvh] flex-col bg-[#F5F0E6] text-[#072D1D]">
        <HomeTopBar />
        <main className="flex min-h-0 flex-1 flex-col px-5 pb-0 pt-4">
          <div className="flex justify-center pb-2">
            <img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-[86px] w-[86px] object-contain" draggable={false} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
            {children}
          </div>
        </main>
        <div className="px-5">
          <Footer />
        </div>
      </div>
    </Shell>
  );
}

function ActionButton({ children, eyebrow, onClick, variant = "light", disabled = false }) {
  const styles = variant === "green"
    ? "border-[#F5F0E6]/20 bg-[#0B5F35] text-[#F5F0E6]"
    : variant === "outline"
      ? "border-[#0B5F35]/18 bg-[#F5F0E6]/55 text-[#0B5F35]"
      : "border-[#D4AF37]/50 bg-[#F5F0E6] text-[#0B5F35]";

  return <button onClick={onClick} disabled={disabled} className={`w-full rounded-[1.15rem] border px-4 py-3 text-center shadow-inner transition ${styles} ${disabled ? "opacity-45" : "active:scale-[0.99]"}`}>
    {eyebrow && <div className="text-[8px] font-black uppercase tracking-[0.22em] opacity-55">{eyebrow}</div>}
    <div className="mt-1 text-[17px] font-black uppercase leading-none tracking-[0.02em]">{children}</div>
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

function LandingPanel({ savedCampaign, onContinueCampaign, onNewCampaign, onPlayAsGuest }) {
  return <div className="space-y-3">
    <GreenCard>
      <div className="text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#F5F0E6]/50">MONDAY CUP</div>
        <div className="mt-2 text-[28px] font-black uppercase leading-[0.9] tracking-[-0.03em]">PLAY YOUR TOURNAMENT JOURNEY</div>
        <p className="mx-auto mt-3 max-w-[260px] text-[11px] font-bold uppercase leading-[1.45] tracking-[0.08em] text-[#F5F0E6]/62">Choose a host nation, take every penalty, and chase the final.</p>
      </div>
      <div className="mt-5 space-y-2.5">
        <SavedCampaignCard summary={savedCampaign} onContinue={onContinueCampaign} />
        <ActionButton onClick={onNewCampaign} eyebrow={savedCampaign ? "START FRESH" : "START"}>NEW CAMPAIGN</ActionButton>
        <ActionButton onClick={onPlayAsGuest} eyebrow="NO ACCOUNT NEEDED" variant="outline">PLAY AS GUEST</ActionButton>
      </div>
    </GreenCard>
    <div className="grid grid-cols-2 gap-2">
      <ActionButton disabled eyebrow="COMING SOON" variant="outline">REGISTER</ActionButton>
      <ActionButton disabled eyebrow="COMING SOON" variant="outline">SIGN IN</ActionButton>
    </div>
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

export function HomeScreen(props) { return <HomeLayout><LandingPanel {...props} /></HomeLayout>; }
export function HostSelectScreen(props) { return <SelectionLayout><HostPanel {...props} /></SelectionLayout>; }
export function TeamSelectScreen({ selectedGroup, onSelectGroup, onSelectTeam }) { return <SelectionLayout><TeamPanel group={selectedGroup} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} /></SelectionLayout>; }
