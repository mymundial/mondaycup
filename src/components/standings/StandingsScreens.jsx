import { useEffect, useRef } from "react";
import { isRealBracketTeam, selectBracketModel, selectBracketSideForTeam, selectUserGroup } from "../../logic/bracketMappingSelectors.js";
import { selectStandingsScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import { ScreenTitle } from "../layout/Menu.jsx";
import { FixturesToggle, PAGE_TOGGLE_TOP_PADDING } from "../schedule/ScheduleScreens.jsx";

const GROUP_TABLE_GRID = "grid-cols-[22px_32px_minmax(0,1.8fr)_18px_repeat(6,24px)]";

const rowClass = ({ isUserTeam }) => [
  `mb-1 grid ${GROUP_TABLE_GRID} items-center gap-[3px] rounded-xl px-2 py-1.5 text-center text-[11px] leading-none last:mb-0 ring-1 shadow-[0_6px_14px_rgba(0,0,0,0.10)] tabular-nums`, 
  isUserTeam ? "border border-[#F7D117]/28 bg-[#072D1D]/82 text-[#F5F1E8] ring-[#F7D117]/16" : "border border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18",
].join(" ");

function PlaceholderSlot({ value, compact = false, large = false }) {
  const sizeClass = large ? "h-[34px] w-[48px] text-[7px]" : compact ? "h-[13px] w-[19px] text-[4px]" : "h-[13px] w-[19px] text-[4px]";
  return <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] font-black uppercase tracking-[0.035em] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/35`}>{value || "TBC"}</span>;
}

function BracketSlot({ value, compact = false, large = false }) {
  if (!isRealBracketTeam(value)) return <PlaceholderSlot value={value || "TBC"} compact={compact} large={large} />;
  const sizeClass = large ? "h-[34px] w-[48px]" : compact ? "h-[13px] w-[19px]" : "h-[13px] w-[19px]";
  return <span className={`relative inline-flex ${sizeClass} shrink-0 overflow-hidden rounded`}>
    <Flag team={value} className={`${sizeClass} rounded ring-1 ring-[#F5F1E8]/35`} />
  </span>;
}

function BracketFixture({ fixture, layout = "vertical", userTeam = null, large = false }) {
  const compact = layout === "r32";
  const widthClass = large ? "w-[72px]" : layout === "horizontal" ? "w-[58px]" : compact ? "w-[34px]" : "w-[38px]";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  const isUserFixture = userTeam && (fixture?.home === userTeam || fixture?.away === userTeam);
  const cardClass = isUserFixture ? "border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-[#0B5F35]/45" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18";
  const labelClass = isUserFixture ? "text-[#F7D117]" : "text-[#0B5F35]";
  return <div className={`mx-auto flex ${widthClass} flex-col items-center rounded-[0.55rem] border ${cardClass} px-[5px] py-[4px] ring-1 ${large ? "py-[6px]" : ""}`}>
    <div className={`mb-[2px] text-[5.5px] font-black uppercase tracking-[0.05em] ${labelClass}`}>M{fixture?.matchNo || ""}</div>
    <div className={`flex ${slotDirection} items-center gap-[6px]`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} compact={compact} large={large} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} compact={compact} large={large} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], gap = "gap-[2px]", layout = "vertical", userTeam = null }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} layout={layout} userTeam={userTeam} />)}</div>;
}

function StageLabel({ children }) {
  return <div className="text-center home-copy-bold text-[8px] uppercase tracking-[0.14em] text-[#F5F1E8]/72">{children}</div>;
}

function PodiumBox({ title, team, className }) {
  return <div className={`mx-auto flex w-[68px] flex-col items-center rounded-[0.55rem] px-[5px] py-[4px] ${className}`}>
    <div className="mb-[2px] text-[5.5px] font-black uppercase leading-none tracking-[0.05em] text-[#072D1D]/70">{title}</div>
    <BracketSlot value={team || "TBC"} />
  </div>;
}

export function GroupTable({ title, rows, qualifiedTeams = new Set(), userTeam = null }) {
  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] border border-[#F5F1E8]/12 bg-[#0B5F35]/72 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/12 shadow-[0_10px_26px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.08)] backdrop-blur-[1px]">
    <div className="px-3 pb-1.5 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F0E6]">{title}</div>
    <div className="p-2 pt-1.5">
      <div className={`mb-1 grid ${GROUP_TABLE_GRID} items-center gap-[3px] px-2 text-center text-[11px] home-copy-bold uppercase leading-none tracking-[0.1em] text-[#F5F1E8]/72 tabular-nums`}>
        <span>#</span><span className="justify-self-center text-center">TEAM</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>L</span><span>D</span><span>GD</span><span>PTS</span>
      </div>
      {rows.map((row, index) => {
        const isQualified = qualifiedTeams.has(row.team);
        const isUserTeam = userTeam === row.team;
        return <div key={row.team} className={rowClass({ isUserTeam })}>
          <span className={isUserTeam ? "text-[#F7D117]" : ""}>{index + 1}</span>
          <span className="flex justify-center"><Flag team={row.team} className="h-4 w-6 rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></span><span className={`min-w-0 truncate pl-2 text-left uppercase tracking-[0.015em] ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.team}</span>
          <span className={`flex items-center justify-center text-[10px] home-copy-bold font-black ${isUserTeam ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{isQualified ? "Q" : ""}</span>
          <span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.played}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.won}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.lost}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.drawn}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.gd}</span><span className={`flex items-center justify-center font-black ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.pts}</span>
        </div>;
      })}
    </div>
  </div>;
}

function BracketStageBox({ title, children, className = "" }) {
  return (
    <section className={`p-0 text-[#F5F1E8] ${className}`}>
      <StageLabel>{title}</StageLabel>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function PodiumStageBox({ winner, runnerUp, thirdPlace }) {
  return (
    <div className="mx-auto flex w-[68px] flex-col items-center justify-center gap-1 text-[#F5F1E8]">
      <PodiumBox title="CHAMPIONS" team={winner} className="bg-[#D8B62F]" />
      <PodiumBox title="RUNNER-UP" team={runnerUp} className="bg-[#C8C8C8]" />
      <PodiumBox title="THIRD" team={thirdPlace} className="bg-[#D9822B]" />
    </div>
  );
}

function BracketHalfBox({ title, fixtures = [], count, gap = "gap-1.5", layout = "horizontal", userTeam = null }) {
  return (
    <section className="p-0 text-[#F5F1E8]">
      <StageLabel>{title}</StageLabel>
      <div className="mt-1.5">
        <BracketRow count={count} fixtures={fixtures} gap={gap} layout={layout} userTeam={userTeam} />
      </div>
    </section>
  );
}

function BracketStageColumn({ title, topFixtures = [], bottomFixtures = [], count, topLabel = "TOP HALF", bottomLabel = "BOTTOM HALF", gap = "gap-1.5", layout = "horizontal", userTeam = null, className = "" }) {
  return (
    <div className={`flex min-h-[230px] flex-col justify-between gap-3 ${className}`}>
      <BracketHalfBox title={`${title} · ${topLabel}`} fixtures={topFixtures} count={count} gap={gap} layout={layout} userTeam={userTeam} />
      <BracketHalfBox title={`${title} · ${bottomLabel}`} fixtures={bottomFixtures} count={count} gap={gap} layout={layout} userTeam={userTeam} />
    </div>
  );
}

function KnockoutRoundBand({ title, fixtures = [], count, gap = "gap-1.5", layout = "horizontal", userTeam = null, className = "" }) {
  return (
    <BracketStageBox title={title} className={`mx-auto w-full overflow-hidden ${className}`}>
      <BracketRow count={count} fixtures={fixtures} gap={gap} layout={layout} userTeam={userTeam} />
    </BracketStageBox>
  );
}

function KnockoutCentreBand({ finalFixture, thirdFixture, winner, runnerUp, thirdPlace, userTeam = null }) {
  return (
    <div className="mx-auto grid w-full max-w-[228px] grid-cols-[76px_68px_76px] items-center justify-center gap-1.5">
      <BracketStageBox title="THIRD PLACE PLAY-OFF" className="mx-auto flex h-[62px] w-[68px] flex-col justify-center p-1.5">
        <BracketFixture fixture={thirdFixture} layout="vertical" userTeam={userTeam} />
      </BracketStageBox>

      <PodiumStageBox winner={winner} runnerUp={runnerUp} thirdPlace={thirdPlace} />

      <BracketStageBox title="FINAL" className="mx-auto flex h-[62px] w-[68px] flex-col justify-center p-1.5">
        <BracketFixture fixture={finalFixture} layout="vertical" userTeam={userTeam} />
      </BracketStageBox>
    </div>
  );
}

function KnockoutBracket({ round32 = [], podium = {}, userTeam = null }) {
  const { r32, r16, qf, sf, finalFixture, thirdFixture, winner, runnerUp, thirdPlace } = selectBracketModel({ knockoutFixtures: round32, podium });

  return (
    <div className="mx-auto w-full max-w-full overflow-hidden px-2 text-[#F5F1E8]">
      <div className="mx-auto flex w-[94%] max-w-[400px] flex-col gap-2 rounded-[1.6rem] border border-[#F5F1E8]/12 bg-[#0B5F35]/72 px-2 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F5F1E8]/12">
        <KnockoutRoundBand
          title="ROUND OF 32"
          fixtures={r32.slice(0, 8)}
          count={8}
          gap="gap-[1px]"
          layout="r32"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="ROUND OF 16"
          className="mx-auto max-w-[320px]"
          fixtures={r16.slice(0, 4)}
          count={4}
          gap="gap-1.5"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="QUARTER-FINALS"
          className="mx-auto max-w-[150px]"
          fixtures={qf.slice(0, 2)}
          count={2}
          gap="gap-2"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="SEMI-FINALS"
          className="mx-auto max-w-[76px]"
          fixtures={sf.slice(0, 1)}
          count={1}
          gap="gap-1"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutCentreBand
          finalFixture={finalFixture}
          thirdFixture={thirdFixture}
          winner={winner}
          runnerUp={runnerUp}
          thirdPlace={thirdPlace}
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="SEMI-FINALS"
          className="mx-auto max-w-[76px]"
          fixtures={sf.slice(1, 2)}
          count={1}
          gap="gap-1"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="QUARTER-FINALS"
          className="mx-auto max-w-[150px]"
          fixtures={qf.slice(2, 4)}
          count={2}
          gap="gap-2"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="ROUND OF 16"
          className="mx-auto max-w-[320px]"
          fixtures={r16.slice(4, 8)}
          count={4}
          gap="gap-1.5"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="ROUND OF 32"
          fixtures={r32.slice(8, 16)}
          count={8}
          gap="gap-[1px]"
          layout="r32"
          userTeam={userTeam}
        />
      </div>
    </div>
  );
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

  return <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]"><ScreenTitle {...menuProps}>STANDINGS</ScreenTitle><div className={PAGE_TOGGLE_TOP_PADDING}><FixturesToggle value={standingsView} onChange={onStandingsViewChange} labels={["GROUPS", "BRACKET"]} /></div><section ref={scrollRef} className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-2.5 pb-2">
    {standingsView === "group" && allGroups.map(({ group, rows }) => <div key={group} ref={(node) => { if (node) groupRefs.current[group] = node; }}><GroupTable title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} /></div>)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} podium={podium} userTeam={userTeam} />}
  </div></section></main>;
}
