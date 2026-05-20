import { KNOCKOUT_PLACEHOLDER_SLOTS } from "../../data/tournament.js";
import { buildRound32Placeholders } from "../../logic/tournament.js";
import { Flag } from "../shared.jsx";
import { ScreenTitle } from "../layout/Menu.jsx";
import { FixturesToggle } from "../schedule/ScheduleScreens.jsx";

const isRealTeam = (value) => value && value !== "TBC" && !/^[123][A-L]+$/.test(String(value)) && !/^(W|RU)\d+$/.test(String(value));

const rowClass = ({ isQualified, isUserTeam }) => [
  "mb-1.5 grid grid-cols-[24px_minmax(0,1.9fr)_18px_repeat(6,24px)] items-center gap-[3px] rounded-xl px-2 py-2 text-center text-[9px] font-semibold text-[#072D1D]/80 last:mb-0 ring-1 ring-[#0B5F35]/5",
  isUserTeam ? "bg-[#DCE9DE]" : "bg-[#F8F4EC]",
].join(" ");

function PlaceholderSlot({ value, size = "sm" }) {
  const sizeClass = size === "lg" ? "h-6 w-10 text-[6px]" : size === "md" ? "h-5 w-8 text-[5px]" : "h-[18px] w-[26px] text-[5px]";
  return <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#DCE9DE] font-black uppercase tracking-[0.035em] text-[#0B5F35]/55 ring-1 ring-[#0B5F35]/10`}>{value || "TBC"}</span>;
}

const medalRing = (medal) => {
  if (medal === "gold") return "ring-2 ring-[#D4AF37]";
  if (medal === "silver") return "ring-2 ring-[#C0C0C0]";
  if (medal === "bronze") return "ring-2 ring-[#CD7F32]";
  return "";
};

function BracketSlot({ value, size = "sm", medalTeams = {} }) {
  const sizeClass = size === "lg" ? "h-6 w-10" : size === "md" ? "h-5 w-8" : "h-[18px] w-[26px]";
  const medal = isRealTeam(value) ? medalTeams[value] : null;
  return isRealTeam(value)
    ? <span className={`inline-flex rounded `}><Flag team={value} className={`${sizeClass} rounded`} /></span>
    : <PlaceholderSlot value={value || "TBC"} size={size} />;
}

function BracketFixture({ fixture, size = "sm", layout = "vertical", medalTeams = {} }) {
  const widthClass = layout === "horizontal" ? (size === "lg" ? "w-[102px]" : "w-[86px]") : size === "lg" ? "w-[56px]" : size === "md" ? "w-[46px]" : "w-[32px]";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  return <div className={`mx-auto flex ${widthClass} flex-col items-center rounded-[0.55rem] bg-[#F8F4EC] px-[3px] py-[3px] ring-1 ring-[#0B5F35]/8`}>
    <div className="mb-[2px] text-[5.5px] font-black uppercase tracking-[0.05em] text-[#0B5F35]/50">M{fixture?.matchNo || ""}</div>
    <div className={`flex ${slotDirection} items-center gap-[2px]`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} size={size} medalTeams={medalTeams} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} size={size} medalTeams={medalTeams} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], size = "sm", gap = "gap-[2px]", layout = "vertical", medalTeams = {} }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} size={size} layout={layout} medalTeams={medalTeams} />)}</div>;
}

function StageLabel({ children }) {
  return <div className="text-center text-[6px] font-black uppercase tracking-[0.1em] text-[#7DAA8F]">{children}</div>;
}

function placeholderFixtures(label) {
  return (KNOCKOUT_PLACEHOLDER_SLOTS[label] || []).map((slot) => ({
    id: `M${slot.matchNo}`,
    matchNo: slot.matchNo,
    home: slot.homeSeed,
    away: slot.awaySeed,
    homeSeed: slot.homeSeed,
    awaySeed: slot.awaySeed,
  }));
}

export function GroupTable({ title, rows, qualifiedTeams = new Set(), userTeam = null }) {
  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]">
    <div className="bg-[#0B5F35] px-3 py-2.5 text-center text-[17px] font-black tracking-[-0.025em] text-[#F5F0E6]">{title}</div>
    <div className="p-3">
      <div className="mb-1.5 grid grid-cols-[24px_minmax(0,1.9fr)_18px_repeat(6,24px)] items-center gap-[3px] px-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-[#072D1D]/42">
        <span>#</span><span className="pl-1 text-left">Team</span><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isQualified = qualifiedTeams.has(row.team);
        const isUserTeam = userTeam === row.team;
        return <div key={row.team} className={rowClass({ isQualified, isUserTeam })}>
          <span>{index + 1}</span>
          <span className="flex min-w-0 items-center gap-1.5 pl-1 text-left"><Flag team={row.team} /><span className="truncate uppercase tracking-[0.015em]">{row.team}</span></span>
          <span className="text-[10px] font-black text-[#0B5F35]">{isQualified ? "Q" : ""}</span>
          <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span>{row.gd}</span><span className="font-black">{row.pts}</span>
        </div>;
      })}
    </div>
  </div>;
}

function KnockoutBracket({ round32 = [], podium = {} }) {
  const r32 = round32.length ? round32 : buildRound32Placeholders();
  const r16 = placeholderFixtures("Round of 16");
  const qf = placeholderFixtures("Quarter-finals");
  const sf = placeholderFixtures("Semi-finals");
  const final = placeholderFixtures("Final");
  const medalTeams = {
    ...(podium.winner ? { [podium.winner]: "gold" } : {}),
    ...(podium.runnerUp ? { [podium.runnerUp]: "silver" } : {}),
    ...(podium.third ? { [podium.third]: "bronze" } : {}),
  };

  return <div className="mx-auto w-[92%] text-[#072D1D]">
    <div className="mb-1 rounded-[1rem] bg-[#0B5F35] px-2 py-2 text-center text-[15px] font-black tracking-[-0.025em] text-[#F5F0E6]">TOURNAMENT BRACKET</div>
    <div className="origin-top scale-[0.86] px-0 pb-0">
      <StageLabel>ROUND OF 32</StageLabel>
      <div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(0, 8)} size="sm" gap="gap-[1px]" layout="vertical" medalTeams={medalTeams} /></div>

      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(0, 4)} size="sm" gap="gap-3" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(0, 2)} size="md" gap="gap-8" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-4"><StageLabel>SEMI-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(0, 1)} size="lg" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-5"><StageLabel>FINAL</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={final} size="lg" layout="vertical" medalTeams={medalTeams} /></div></div>
      <div className="mt-4"><StageLabel>SEMI-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(1, 2)} size="lg" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(2, 4)} size="md" gap="gap-8" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(4, 8)} size="sm" gap="gap-3" layout="horizontal" medalTeams={medalTeams} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 32</StageLabel><div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(8, 16)} size="sm" gap="gap-[1px]" layout="vertical" medalTeams={medalTeams} /></div></div>
    </div>
  </div>;
}

export function GroupsScreen({ allGroups, menuProps, standingsView, onStandingsViewChange, knockoutFixtures, qualifiedTeams = new Set(), userTeam = null }) {
  return <main className="flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>STANDINGS</ScreenTitle><FixturesToggle value={standingsView} onChange={onStandingsViewChange} /><section className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-2">
    {standingsView === "group" && allGroups.map(({ group, rows }) => <GroupTable key={group} title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} />}
  </div></section></main>;
}
