import { KNOCKOUT_PLACEHOLDER_SLOTS } from "../../data/tournament.js";
import { buildRound32Placeholders, mergeKnockoutFixtures } from "../../logic/tournament.js";
import { Flag } from "../shared.jsx";
import { ScreenTitle } from "../layout/Menu.jsx";
import { FixturesToggle } from "../schedule/ScheduleScreens.jsx";

const isRealTeam = (value) => value && value !== "TBC" && !/^[123][A-L]+$/.test(String(value)) && !/^(W|RU)\d+$/.test(String(value));

const medalRingClass = (medal) => {
  if (medal === "gold") return "ring-2 ring-[#D4AF37]";
  if (medal === "silver") return "ring-2 ring-[#C0C0C0]";
  if (medal === "bronze") return "ring-2 ring-[#CD7F32]";
  return "ring-1 ring-[#0B5F35]/5";
};

const rowClass = ({ isUserTeam, medal }) => [
  "mb-1.5 grid grid-cols-[24px_minmax(0,1.9fr)_repeat(6,24px)] items-center gap-[3px] rounded-xl px-2 py-2 text-center text-[9px] font-semibold text-[#072D1D]/80 last:mb-0",
  isUserTeam ? "bg-[#DCE9DE]" : "bg-[#F8F4EC]",
  medalRingClass(medal),
].join(" ");

function PlaceholderSlot({ value, size = "sm" }) {
  const sizeClass = "h-[18px] w-[26px] text-[5px]";
  return <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#DCE9DE] font-black uppercase tracking-[0.035em] text-[#0B5F35]/55 ring-1 ring-[#0B5F35]/10`}>{value || "TBC"}</span>;
}

const slotSizeClass = () => "h-[18px] w-[26px]";

const userRing = (value, userTeam) => isRealTeam(value) && value === userTeam ? "ring-2 ring-[#DCE9DE] ring-offset-1 ring-offset-[#F8F4EC]" : "";

function BracketSlot({ value, size = "sm", userTeam = null }) {
  const sizeClass = slotSizeClass(size);
  return isRealTeam(value)
    ? <span className={`inline-flex rounded ${userRing(value, userTeam)}`}><Flag team={value} className={`${sizeClass} rounded`} /></span>
    : <PlaceholderSlot value={value || "TBC"} size={size} />;
}

function BracketFixture({ fixture, size = "sm", layout = "vertical", userTeam = null }) {
  const widthClass = size === "final" ? "w-[62px]" : layout === "horizontal" ? "w-[76px]" : "w-[32px]";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  const gapClass = size === "final" ? "gap-1.5" : "gap-[4px]";
  return <div className={`mx-auto flex ${widthClass} flex-col items-center rounded-[0.5rem] bg-[#F8F4EC] px-[3px] py-[4px] ring-1 ring-[#0B5F35]/8`}>
    <div className="mb-[3px] text-[5.5px] font-black uppercase tracking-[0.05em] text-[#0B5F35]/50">M{fixture?.matchNo || ""}</div>
    <div className={`flex ${slotDirection} items-center ${gapClass}`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} size={size} userTeam={userTeam} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} size={size} userTeam={userTeam} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], size = "sm", gap = "gap-[2px]", layout = "vertical", userTeam = null }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} size={size} layout={layout} userTeam={userTeam} />)}</div>;
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

function PodiumFlag({ team }) {
  return isRealTeam(team) ? <Flag team={team} className="h-[18px] w-[26px] rounded" /> : <PlaceholderSlot value="TBC" size="sm" />;
}

function PodiumBox({ label, team, bgClass }) {
  return <div className={`flex w-[86px] flex-col items-center rounded-[0.55rem] px-2 py-1.5 text-center shadow-sm ${bgClass}`}>
    <div className="mb-1 text-[5.5px] font-black uppercase tracking-[0.07em] text-[#072D1D]/70">{label}</div>
    <PodiumFlag team={team} />
  </div>;
}

function PodiumStack({ podium = {} }) {
  return <div className="flex flex-col items-center gap-1.5">
    <PodiumBox label="CHAMPIONS" team={podium.winner} bgClass="bg-[#D4AF37]" />
    <PodiumBox label="RUNNER-UP" team={podium.runnerUp} bgClass="bg-[#C0C0C0]" />
    <PodiumBox label="THIRD" team={podium.third} bgClass="bg-[#CD7F32]" />
  </div>;
}

export function GroupTable({ title, rows, qualifiedTeams = new Set(), userTeam = null }) {
  const showQualificationOutlines = qualifiedTeams.size > 0;
  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]">
    <div className="bg-[#0B5F35] px-3 py-2.5 text-center text-[17px] font-black tracking-[-0.025em] text-[#F5F0E6]">{title}</div>
    <div className="p-3">
      <div className="mb-1.5 grid grid-cols-[24px_minmax(0,1.9fr)_repeat(6,24px)] items-center gap-[3px] px-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-[#072D1D]/42">
        <span>#</span><span className="pl-1 text-left">Team</span><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isUserTeam = userTeam === row.team;
        const medal = showQualificationOutlines
          ? index === 0
            ? "gold"
            : index === 1
              ? "silver"
              : index === 2 && qualifiedTeams.has(row.team)
                ? "bronze"
                : null
          : null;
        return <div key={row.team} className={rowClass({ isUserTeam, medal })}>
          <span>{index + 1}</span>
          <span className="flex min-w-0 items-center gap-1.5 pl-1 text-left"><Flag team={row.team} /><span className="truncate uppercase tracking-[0.015em]">{row.team}</span></span>
          <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span>{row.gd}</span><span className="font-black">{row.pts}</span>
        </div>;
      })}
    </div>
  </div>;
}

function KnockoutBracket({ round32 = [], podium = {}, userTeam = null }) {
  const allFixtures = round32 || [];
  const r32 = mergeKnockoutFixtures(buildRound32Placeholders(), allFixtures);
  const r16 = mergeKnockoutFixtures(placeholderFixtures("Round of 16"), allFixtures);
  const qf = mergeKnockoutFixtures(placeholderFixtures("Quarter-finals"), allFixtures);
  const sf = mergeKnockoutFixtures(placeholderFixtures("Semi-finals"), allFixtures);
  const thirdPlace = mergeKnockoutFixtures(placeholderFixtures("3RD PLACE PLAY-OFF"), allFixtures);
  const final = mergeKnockoutFixtures(placeholderFixtures("Final"), allFixtures);
  return <div className="mx-auto w-[92%] text-[#072D1D]">
    <div className="mb-1 rounded-[1rem] bg-[#0B5F35] px-2 py-2 text-center text-[15px] font-black tracking-[-0.025em] text-[#F5F0E6]">TOURNAMENT BRACKET</div>
    <div className="origin-top scale-[0.86] px-0 pb-0">
      <StageLabel>ROUND OF 32</StageLabel>
      <div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(0, 8)} size="sm" gap="gap-[1px]" layout="vertical" userTeam={userTeam} /></div>

      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(0, 4)} size="sm" gap="gap-3" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(0, 2)} size="sm" gap="gap-6" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>SEMI-FINAL</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(0, 1)} size="sm" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div><StageLabel>3RD PLACE PLAY-OFF</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={thirdPlace} size="final" layout="vertical" userTeam={userTeam} /></div></div>
          <PodiumStack podium={podium} />
          <div><StageLabel>FINAL</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={final} size="final" layout="vertical" userTeam={userTeam} /></div></div>
        </div>
      </div>
      <div className="mt-4"><StageLabel>SEMI-FINAL</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(1, 2)} size="sm" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(2, 4)} size="sm" gap="gap-6" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(4, 8)} size="sm" gap="gap-3" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 32</StageLabel><div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(8, 16)} size="sm" gap="gap-[1px]" layout="vertical" userTeam={userTeam} /></div></div>
    </div>
  </div>;
}

export function GroupsScreen({ allGroups, menuProps, standingsView, onStandingsViewChange, knockoutFixtures, qualifiedTeams = new Set(), userTeam = null, podium = {} }) {
  return <main className="flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>STANDINGS</ScreenTitle><FixturesToggle value={standingsView} onChange={onStandingsViewChange} /><section className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-2">
    {standingsView === "group" && allGroups.map(({ group, rows }) => <GroupTable key={group} title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} podium={podium} userTeam={userTeam} />}
  </div></section></main>;
}
