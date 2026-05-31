import { useEffect, useRef } from "react";
import { isRealBracketTeam, selectBracketModel, selectBracketSideForTeam, selectUserGroup } from "../../logic/bracketMappingSelectors.js";
import { selectStandingsScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import TeamName from "../ui/TeamName.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import { userHighlightCardClass, userHighlightTextClass } from "../ui/UserTeamHighlight.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { FixturesToggle } from "../schedule/ScheduleScreens.jsx";
import { PageTabsSlot } from "../ui/PageTabs.jsx";
import AppPanel from "../ui/AppPanel.jsx";

const GROUP_TABLE_GRID = "grid-cols-[22px_32px_minmax(0,1.8fr)_18px_repeat(6,24px)]";
const STANDINGS_SECTION_BG = "bg-[#0B5F35]/44";

const rowClass = ({ isUserTeam }) => [
  `mb-1 grid ${GROUP_TABLE_GRID} items-center gap-[3px] rounded-xl px-2 py-1.5 text-center text-[11px] leading-none last:mb-0 ring-1 shadow-[0_6px_14px_rgba(0,0,0,0.10)] tabular-nums`,
  userHighlightCardClass(isUserTeam, "border border-[#F5F1E8] bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/30"),
].join(" ");

function PlaceholderSlot({ value, compact = false, large = false }) {
  const sizeClass = large ? "h-[34px] w-[48px]" : compact ? "h-[13px] w-[19px]" : "h-[13px] w-[19px]";
  const textClass = large ? "text-[7px]" : "text-[5px]";
  return <span className={`relative flex ${sizeClass} ${textClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] home-copy-bold tracking-[0.035em] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}>TBC</span>;
}

function BracketSlot({ value, compact = false, large = false, isUserTeam = false }) {
  if (!isRealBracketTeam(value)) return <PlaceholderSlot value={value || "TBC"} compact={compact} large={large} />;
  const sizeClass = large ? "h-[34px] w-[48px]" : compact ? "h-[13px] w-[19px]" : "h-[13px] w-[19px]";
  return <span className={`relative inline-flex ${sizeClass} shrink-0 overflow-visible rounded ${isUserTeam ? "outline outline-[1.5px] outline-offset-[2px] outline-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.42)]" : ""}`}>
    <Flag team={value} className={`${sizeClass} rounded ring-1 ${isUserTeam ? "ring-[#F7D117]" : "ring-[#F5F1E8]/35"}`} />
  </span>;
}

function BracketFixture({ fixture, layout = "vertical", userTeam = null, large = false }) {
  const compact = layout === "r32";
  const widthClass = large ? "w-[72px]" : layout === "horizontal" ? "w-[58px]" : compact ? "w-[34px]" : "w-[38px]";
  const heightClass = !large && layout === "horizontal" ? "h-[34px]" : "";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  const isUserFixture = userTeam && (fixture?.home === userTeam || fixture?.away === userTeam);
  const cardClass = isUserFixture ? "border-[#F7D117]/72 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/30" : "border-[#F5F1E8] bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/30";
  const matchNo = Number(fixture?.matchNo);
  const showPlayoffLabel = matchNo === 103;
  return <div data-bracket-match-no={fixture?.matchNo || ""} className={`mx-auto flex ${widthClass} ${heightClass} flex-col items-center justify-center rounded-[0.55rem] border ${cardClass} px-[5px] py-[4px] ring-1 ${large ? "py-[6px]" : ""}`}>
    {showPlayoffLabel && (
      <div className="mb-[2px] max-w-full whitespace-nowrap text-center text-[4.4px] font-black uppercase leading-none tracking-[0.035em] text-[#0B5F35]">PLAY-OFF</div>
    )}
    <div className={`flex ${slotDirection} items-center gap-[6px]`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} compact={compact} large={large} isUserTeam={fixture?.home === userTeam} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} compact={compact} large={large} isUserTeam={fixture?.away === userTeam} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], gap = "gap-[2px]", layout = "vertical", userTeam = null }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} layout={layout} userTeam={userTeam} />)}</div>;
}

function StageLabel({ children, connectorCount = 1 }) {
  const inset = `${50 / Math.max(1, Number(connectorCount || 1))}%`;
  return (
    <div className="relative flex h-[10px] items-center justify-center text-center home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]">
      <span aria-hidden="true" className="absolute top-1/2 h-px -translate-y-1/2 bg-[#F5F1E8]" style={{ left: inset, right: inset }} />
      <span className="relative z-[3] bg-[#0B5F35] px-1 leading-none">{children}</span>
    </div>
  );
}

function RoundFixtureConnectors({ count = 1, className = "" }) {
  const safeCount = Math.max(1, Number(count || 1));
  return (
    <div className={`grid h-[13px] w-full items-stretch ${className}`} style={{ gridTemplateColumns: `repeat(${safeCount}, minmax(0, 1fr))` }}>
      {Array.from({ length: safeCount }).map((_, index) => (
        <span key={index} className="mx-auto block h-full w-px bg-[#F5F1E8]" />
      ))}
    </div>
  );
}

function PodiumBox({ title, team, className, userTeam = null }) {
  return <div className={`mx-auto flex h-[34px] w-[58px] flex-col items-center justify-center rounded-[0.55rem] border border-[#F5F1E8] px-[5px] py-[4px] ring-1 ring-[#F5F1E8]/30 ${className}`}>
    <div className="mb-[2px] max-w-[48px] whitespace-nowrap text-center text-[4.4px] font-black uppercase leading-none tracking-[0.035em] text-[#072D1D]/72">{title}</div>
    <div className="flex h-[13px] items-center justify-center">
      <BracketSlot value={team || "TBC"} isUserTeam={team === userTeam} />
    </div>
  </div>;
}

export function GroupTable({ title, rows, qualifiedTeams = new Set(), userTeam = null }) {
  return <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
    <div className="px-3 pb-1.5 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F0E6]">{title}</div>
    <div className="p-2 pt-1.5">
      <div className={`mb-1 grid ${GROUP_TABLE_GRID} items-center gap-[3px] px-2 text-center text-[11px] home-copy-bold uppercase leading-none tracking-[0.1em] text-[#F5F1E8]/72 tabular-nums`}>
        <span>#</span><span className="justify-self-center text-center">TEAM</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>L</span><span>D</span><span>GD</span><span>PTS</span>
      </div>
      {rows.map((row, index) => {
        const isQualified = qualifiedTeams.has(row.team);
        const isUserTeam = userTeam === row.team;
        return <div key={row.team} className={rowClass({ isUserTeam })}>
          <span className={userHighlightTextClass(isUserTeam)}>{index + 1}</span>
          <span className="flex justify-center"><TeamFlag team={row.team} isUserTeam={isUserTeam} className="h-4 w-6" /></span><TeamName team={row.team} active={isUserTeam} className="pl-2 text-left tracking-[0.015em]" />
          <span className={`flex items-center justify-center text-[10px] home-copy-bold font-black ${isUserTeam ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{isQualified ? "Q" : ""}</span>
          <span className={`flex items-center justify-center ${userHighlightTextClass(isUserTeam)}`}>{row.played}</span><span className={`flex items-center justify-center ${userHighlightTextClass(isUserTeam)}`}>{row.won}</span><span className={`flex items-center justify-center ${userHighlightTextClass(isUserTeam)}`}>{row.lost}</span><span className={`flex items-center justify-center ${userHighlightTextClass(isUserTeam)}`}>{row.drawn}</span><span className={`flex items-center justify-center ${userHighlightTextClass(isUserTeam)}`}>{row.gd}</span><span className={`flex items-center justify-center font-black ${userHighlightTextClass(isUserTeam)}`}>{row.pts}</span>
        </div>;
      })}
    </div>
  </AppPanel>;
}

function BracketStageBox({ title, children, className = "", titlePosition = "above", connectorCount = 1 }) {
  const titleNode = <StageLabel connectorCount={connectorCount}>{title}</StageLabel>;
  return (
    <section className={`p-0 text-[#F5F1E8] ${className}`}>
      {titlePosition === "above" ? (
        <>
          {titleNode}
          <RoundFixtureConnectors count={connectorCount} className="-mt-[5px]" />
          <div>{children}</div>
        </>
      ) : (
        <>
          <div>{children}</div>
          <RoundFixtureConnectors count={connectorCount} className="-mb-[5px]" />
          {titleNode}
        </>
      )}
    </section>
  );
}

function PodiumStageBox({ winner, runnerUp, thirdPlace }) {
  return (
    <div className="mx-auto grid h-[62px] w-full max-w-[228px] grid-cols-3 items-center justify-center gap-1.5 text-[#F5F1E8]">
      <PodiumBox title="THIRD PLACE" team={thirdPlace} className="bg-[#D9822B]" />
      <PodiumBox title="RUNNER-UP" team={runnerUp} className="bg-[#C8C8C8]" />
      <PodiumBox title="CHAMPIONS" team={winner} className="bg-[#D8B62F]" />
    </div>
  );
}

function BracketHalfBox({ title, fixtures = [], count, gap = "gap-1.5", layout = "horizontal", userTeam = null }) {
  return (
    <section className="p-0 text-[#F5F1E8]">
      <StageLabel connectorCount={count}>{title}</StageLabel>
      <RoundFixtureConnectors count={count} className="-mt-[5px]" />
      <div>
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

function KnockoutRoundBand({ title, fixtures = [], count, gap = "gap-1.5", layout = "horizontal", userTeam = null, className = "", titlePosition = "above" }) {
  return (
    <BracketStageBox title={title} titlePosition={titlePosition} connectorCount={count} className={`mx-auto w-full overflow-visible ${className}`}>
      <BracketRow count={count} fixtures={fixtures} gap={gap} layout={layout} userTeam={userTeam} />
    </BracketStageBox>
  );
}

function CentreFixtureStageBox({ title, fixture, userTeam = null, splitThirdPlace = false }) {
  if (splitThirdPlace) {
    return (
      <section className="mx-auto flex w-[68px] flex-col items-center justify-start text-[#F5F1E8]">
        <div className="relative h-[8px] w-full overflow-visible text-center home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]">
          <span className="absolute bottom-0 left-1/2 block -translate-x-1/2 whitespace-nowrap leading-none">
            <span className="block">THIRD PLACE</span>
            <span className="block">PLAY-OFF</span>
          </span>
        </div>
        <span aria-hidden="true" className="block h-[13px] w-px bg-[#F5F1E8]" />
        <div className="flex h-[62px] w-[68px] items-center justify-center">
          <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-[68px] flex-col items-center justify-start text-[#F5F1E8]">
      <StageLabel connectorCount={1}>{title}</StageLabel>
      <RoundFixtureConnectors count={1} className="-mt-[5px]" />
      <div className="flex h-[62px] w-[68px] items-center justify-center">
        <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} />
      </div>
    </section>
  );
}

function FinalCentreStageBox({ fixture, userTeam = null }) {
  return (
    <section className="relative mx-auto w-[68px] overflow-visible text-[#F5F1E8]">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F5F1E8]" />
      <div className="relative z-[3]">
        <StageLabel connectorCount={1}>FINAL</StageLabel>
      </div>
      <RoundFixtureConnectors count={1} className="relative z-0 -mt-[5px]" />
      <div className="relative z-[2] flex justify-center">
        <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} />
      </div>
      <RoundFixtureConnectors count={1} className="relative z-0 -mb-[5px]" />
      <div className="relative z-[3]">
        <StageLabel connectorCount={1}>FINAL</StageLabel>
      </div>
    </section>
  );
}

function KnockoutCentreBand({ finalFixture, thirdFixture, winner, runnerUp, thirdPlace, userTeam = null }) {
  return (
    <div className="relative mx-auto flex w-full justify-center">
      <div
        data-align-ref="R16-M89"
        className="pointer-events-none absolute left-[20%] top-[0px] z-[2] flex -translate-x-1/2 flex-col items-center justify-start gap-1.5"
      >
        <PodiumBox title="THIRD PLACE" team={thirdPlace} userTeam={userTeam} className="bg-[#D9822B]" />
        <BracketFixture fixture={thirdFixture} layout="horizontal" userTeam={userTeam} />
      </div>

      <FinalCentreStageBox fixture={finalFixture} userTeam={userTeam} />

      <div
        data-align-ref="R16-M94"
        className="pointer-events-none absolute left-[80%] top-[0px] z-[2] flex -translate-x-1/2 flex-col items-center justify-start gap-1.5"
      >
        <PodiumBox title="CHAMPIONS" team={winner} userTeam={userTeam} className="bg-[#D8B62F]" />
        <PodiumBox title="RUNNER-UP" team={runnerUp} userTeam={userTeam} className="bg-[#C8C8C8]" />
      </div>
    </div>
  );
}

function KnockoutBracket({ round32 = [], podium = {}, userTeam = null }) {
  const { r32, r16, qf, sf, finalFixture, thirdFixture, winner, runnerUp, thirdPlace } = selectBracketModel({ knockoutFixtures: round32, podium });

  return (
    <div className="mx-auto w-full max-w-full overflow-hidden px-2 text-[#F5F1E8]">
      <div className={`mx-auto flex w-[94%] flex-col gap-2 rounded-[1.6rem] border border-[#F5F1E8]/12 ${STANDINGS_SECTION_BG} px-2 py-3 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F5F1E8]/10`}>
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
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="QUARTER-FINALS"
          className="mx-auto max-w-[150px]"
          fixtures={qf.slice(2, 4)}
          count={2}
          gap="gap-2"
          layout="horizontal"
          userTeam={userTeam}
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="ROUND OF 16"
          className="mx-auto max-w-[320px]"
          fixtures={r16.slice(4, 8)}
          count={4}
          gap="gap-1.5"
          layout="horizontal"
          userTeam={userTeam}
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="ROUND OF 32"
          fixtures={r32.slice(8, 16)}
          count={8}
          gap="gap-[1px]"
          layout="r32"
          userTeam={userTeam}
          titlePosition="below"
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

  return <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]"><ScreenTopBar {...menuProps}>STANDINGS</ScreenTopBar><PageTabsSlot><FixturesToggle value={standingsView} onChange={onStandingsViewChange} labels={["GROUPS", "BRACKET"]} /></PageTabsSlot><PageScroll ref={scrollRef} className="pt-1"><div className="space-y-2.5 pb-4">
    {standingsView === "group" && allGroups.map(({ group, rows }) => <div key={group} ref={(node) => { if (node) groupRefs.current[group] = node; }}><GroupTable title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} /></div>)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} podium={podium} userTeam={userTeam} />}
  </div></PageScroll></main>;
}
