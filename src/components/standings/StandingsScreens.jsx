import { useEffect, useRef } from "react";
import { isRealBracketTeam, selectBracketModel, selectBracketSideForTeam, selectUserGroup } from "../../logic/bracketMappingSelectors.js";
import { selectStandingsScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import { ScreenTitle } from "../layout/Menu.jsx";
import { FixturesToggle } from "../schedule/ScheduleScreens.jsx";

const rowClass = ({ isUserTeam }) => [
  "mb-1 grid grid-cols-[24px_minmax(0,1.9fr)_18px_repeat(6,24px)] items-center gap-[3px] rounded-xl px-2 py-1.5 text-center text-[9px] text-[#072D1D]/80 last:mb-0 ring-1 ring-[#0B5F35]/5",
  isUserTeam ? "bg-[#DCE9DE] font-black" : "bg-[#F8F4EC] font-semibold",
].join(" ");

function PlaceholderSlot({ value, compact = false }) {
  const sizeClass = compact ? "h-[14px] w-[21px] text-[4.5px]" : "h-[18px] w-[26px] text-[5px]";
  return <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#DCE9DE] font-black uppercase tracking-[0.035em] text-[#0B5F35]/55 ring-1 ring-[#0B5F35]/10`}>{value || "TBC"}</span>;
}

function BracketSlot({ value, compact = false }) {
  if (!isRealBracketTeam(value)) return <PlaceholderSlot value={value || "TBC"} compact={compact} />;
  const sizeClass = compact ? "h-[14px] w-[21px]" : "h-[18px] w-[26px]";
  return <span className={`relative inline-flex ${sizeClass} shrink-0 overflow-hidden rounded`}>
    <Flag team={value} className={`${sizeClass} rounded`} />
  </span>;
}

function BracketFixture({ fixture, layout = "vertical", userTeam = null }) {
  const compact = layout === "r32";
  const widthClass = layout === "horizontal" ? "w-[84px]" : compact ? "w-[39px]" : "w-[48px]";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  const isUserFixture = userTeam && (fixture?.home === userTeam || fixture?.away === userTeam);
  const cardClass = isUserFixture ? "bg-[#DCE9DE] text-[#072D1D] ring-[#0B5F35]/18" : "bg-[#F8F4EC] text-[#072D1D] ring-[#0B5F35]/8";
  const labelClass = isUserFixture ? "text-[#0B5F35]/70" : "text-[#0B5F35]/50";
  return <div className={`mx-auto flex ${widthClass} flex-col items-center rounded-[0.55rem] ${cardClass} px-[5px] py-[4px] ring-1`}>
    <div className={`mb-[2px] text-[5.5px] font-black uppercase tracking-[0.05em] ${labelClass}`}>M{fixture?.matchNo || ""}</div>
    <div className={`flex ${slotDirection} items-center gap-[6px]`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} compact={compact} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} compact={compact} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], gap = "gap-[2px]", layout = "vertical", userTeam = null }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} layout={layout} userTeam={userTeam} />)}</div>;
}

function StageLabel({ children }) {
  return <div className="text-center text-[6px] font-black uppercase tracking-[0.1em] text-[#7DAA8F]">{children}</div>;
}

function PodiumBox({ title, team, className }) {
  return <div className={`flex h-[42px] w-[76px] flex-col items-center justify-center rounded-[0.85rem] ${className}`}>
    <div className="mb-1 text-[6px] font-black uppercase tracking-[0.16em] text-[#072D1D]/70">{title}</div>
    <BracketSlot value={team || "TBC"} />
  </div>;
}

export function GroupTable({ title, rows, qualifiedTeams = new Set(), userTeam = null }) {
  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]">
    <div className="bg-[#0B5F35] px-3 py-2.5 text-center text-[17px] font-black tracking-[-0.025em] text-[#F5F0E6]">{title}</div>
    <div className="p-2.5">
      <div className="mb-1 grid grid-cols-[24px_minmax(0,1.9fr)_18px_repeat(6,24px)] items-center gap-[3px] px-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-[#072D1D]/42">
        <span>#</span><span className="pl-1 text-left">Team</span><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isQualified = qualifiedTeams.has(row.team);
        const isUserTeam = userTeam === row.team;
        return <div key={row.team} className={rowClass({ isUserTeam })}>
          <span>{index + 1}</span>
          <span className="flex min-w-0 items-center gap-1.5 pl-1 text-left"><Flag team={row.team} /><span className="truncate uppercase tracking-[0.015em]">{row.team}</span></span>
          <span className="text-[10px] font-black text-[#0B5F35]">{isQualified ? "Q" : ""}</span>
          <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span>{row.gd}</span><span className="font-black">{row.pts}</span>
        </div>;
      })}
    </div>
  </div>;
}

function KnockoutBracket({ round32 = [], podium = {}, userTeam = null }) {
  const { r32, r16, qf, sf, finalFixture, thirdFixture, winner, runnerUp, thirdPlace } = selectBracketModel({ knockoutFixtures: round32, podium });

  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]">
    <div className="bg-[#0B5F35] px-3 py-2.5 text-center text-[17px] font-black tracking-[-0.025em] text-[#F5F0E6]">TOURNAMENT BRACKET</div>
    <div className="px-2 pb-2 pt-2" style={{ zoom: 0.86 }}>
      <StageLabel>ROUND OF 32</StageLabel>
      <div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(0, 8)} gap="gap-[1px]" layout="r32" userTeam={userTeam} /></div>

      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(0, 4)} gap="gap-3" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(0, 2)} gap="gap-8" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>SEMI-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(0, 1)} layout="horizontal" userTeam={userTeam} /></div></div>

      <div className="mt-5 grid grid-cols-3 items-center gap-2">
        <div><StageLabel>P3 PLAY-OFF</StageLabel><div className="mt-1.5"><BracketFixture fixture={thirdFixture} layout="vertical" userTeam={userTeam} /></div></div>
        <div className="flex flex-col items-center gap-2">
          <PodiumBox title="CHAMPIONS" team={winner} className="bg-[#D8B62F]" />
          <PodiumBox title="RUNNER-UP" team={runnerUp} className="bg-[#C8C8C8]" />
          <PodiumBox title="THIRD" team={thirdPlace} className="bg-[#D9822B]" />
        </div>
        <div><StageLabel>FINAL</StageLabel><div className="mt-1.5"><BracketFixture fixture={finalFixture} layout="vertical" userTeam={userTeam} /></div></div>
      </div>

      <div className="mt-4"><StageLabel>SEMI-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={1} fixtures={sf.slice(1, 2)} layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-4"><StageLabel>QUARTER-FINALS</StageLabel><div className="mt-1.5"><BracketRow count={2} fixtures={qf.slice(2, 4)} gap="gap-8" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 16</StageLabel><div className="mt-1.5"><BracketRow count={4} fixtures={r16.slice(4, 8)} gap="gap-3" layout="horizontal" userTeam={userTeam} /></div></div>
      <div className="mt-3"><StageLabel>ROUND OF 32</StageLabel><div className="mt-1.5"><BracketRow count={8} fixtures={r32.slice(8, 16)} gap="gap-[1px]" layout="r32" userTeam={userTeam} /></div></div>
    </div>
  </div>;
}

export function GroupsScreen({ allGroups, menuProps, standingsView, onStandingsViewChange, knockoutFixtures, qualifiedTeams = new Set(), userTeam = null, podium = {} }) {
  const scrollRef = useRef(null);
  const groupRefs = useRef({});
  const bracketSide = selectBracketSideForTeam(knockoutFixtures, userTeam);
  const userGroup = selectUserGroup(allGroups, userTeam);
  const scrollTarget = selectStandingsScrollTarget({ standingsView, bracketSide, userGroup });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = requestAnimationFrame(() => {
      if (scrollTarget.align === "bottom") {
        container.scrollTop = container.scrollHeight;
        return;
      }
      const target = groupRefs.current[scrollTarget.key.replace("group-", "")];
      container.scrollTop = target ? Math.max(0, target.offsetTop - container.offsetTop) : 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTarget.key, scrollTarget.align, standingsView, knockoutFixtures.length, userTeam, userGroup, allGroups.length]);

  return <main className="flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>STANDINGS</ScreenTitle><FixturesToggle value={standingsView} onChange={onStandingsViewChange} /><section ref={scrollRef} className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-2">
    {standingsView === "group" && allGroups.map(({ group, rows }) => <div key={group} ref={(node) => { if (node) groupRefs.current[group] = node; }}><GroupTable title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} /></div>)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} podium={podium} userTeam={userTeam} />}
  </div></section></main>;
}
