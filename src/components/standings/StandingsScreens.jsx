import { useEffect, useRef } from "react";
import { isRealBracketTeam, selectBracketModel, selectBracketSideForTeam, selectUserGroup } from "../../logic/bracketMappingSelectors.js";
import { selectStandingsScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import TeamName from "../ui/TeamName.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import { userHighlightCardClass } from "../ui/UserTeamHighlight.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { FixturesToggle } from "../schedule/ScheduleScreens.jsx";
import { PageTabsSlot } from "../ui/PageTabs.jsx";
import AppPanel from "../ui/AppPanel.jsx";

const GROUP_TABLE_GRID = "grid-cols-[22px_32px_minmax(0,1.8fr)_18px_repeat(6,24px)]";
const STANDINGS_SECTION_BG = "bg-[#031B12]/24";
const PITCH_LINE_CLASS = "border-[#F5F1E8]/74";
const PITCH_LINE_BG_CLASS = "bg-[#F5F1E8]/74";

const rowClass = ({ isUserTeam }) => [
  `mb-1 grid ${GROUP_TABLE_GRID} items-center gap-[3px] rounded-xl px-2 py-1.5 text-center text-[11px] leading-none last:mb-0 ring-1 shadow-[0_6px_14px_rgba(0,0,0,0.10)] tabular-nums`,
  userHighlightCardClass(isUserTeam, "border border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10"),
].join(" ");

function PlaceholderSlot({ value, compact = false, large = false, medium = false, small = false }) {
  const sizeClass = large ? "h-[34px] w-[48px]" : medium ? "h-[18px] w-[27px]" : small ? "h-[11px] w-[16px]" : compact ? "h-[11px] w-[16px]" : "h-[13px] w-[19px]";
  const textClass = large ? "text-[7px]" : medium ? "text-[5px]" : small || compact ? "text-[4.5px]" : "text-[5px]";
  return <span className={`relative flex ${sizeClass} ${textClass} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] home-copy-bold tracking-[0.035em] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}>TBC</span>;
}

function BracketSlot({ value, compact = false, large = false, medium = false, small = false, isUserTeam = false }) {
  if (!isRealBracketTeam(value)) return <PlaceholderSlot value={value || "TBC"} compact={compact} large={large} medium={medium} small={small} />;
  const sizeClass = large ? "h-[34px] w-[48px]" : medium ? "h-[18px] w-[27px]" : small ? "h-[11px] w-[16px]" : compact ? "h-[11px] w-[16px]" : "h-[13px] w-[19px]";
  return <span className={`relative inline-flex ${sizeClass} shrink-0 overflow-visible rounded`}>
    <Flag team={value} className={`${sizeClass} rounded ring-1 ${isUserTeam ? "ring-[#F7D117]" : "ring-[#F5F1E8]/35"}`} />
  </span>;
}

function BracketFixture({ fixture, layout = "vertical", userTeam = null, large = false, featuredFlags = false, finalFlags = false, className = "" }) {
  const compact = layout === "r32";
  const widthClass = large ? "w-[72px]" : finalFlags ? "w-[58px]" : layout === "horizontal" ? "w-[48px]" : compact ? "w-[28px]" : "w-[34px]";
  const heightClass = finalFlags ? "h-[58px]" : !large && layout === "horizontal" ? "h-[30px]" : "";
  const slotDirection = layout === "horizontal" ? "flex-row" : "flex-col";
  const smallFlags = !large && !featuredFlags && !finalFlags;
  const isUserFixture = userTeam && (fixture?.home === userTeam || fixture?.away === userTeam);
  const cardClass = isUserFixture ? "border-[#F7D117]/72 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F7D117]/30" : "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10";
  const matchNo = Number(fixture?.matchNo);
  const showPlayoffLabel = matchNo === 103;
  return <div data-bracket-match-no={fixture?.matchNo || ""} className={`mx-auto flex ${widthClass} ${heightClass} ${className} flex-col items-center justify-center ${finalFlags ? "rounded-full" : "rounded-[0.55rem]"} border ${cardClass} px-[5px] py-[4px] ring-1 ${large ? "py-[6px]" : ""}`}>
    {showPlayoffLabel && (
      <div className="mb-[2px] max-w-full whitespace-nowrap text-center home-copy-bold text-[8px] font-black uppercase leading-none tracking-[0.035em] text-[#F5F1E8]/72">PLAY-OFF</div>
    )}
    <div className={`flex ${slotDirection} items-center gap-[6px]`}>
      <BracketSlot value={fixture?.home || fixture?.homeSeed || "TBC"} compact={compact} large={large} medium={finalFlags} small={smallFlags} isUserTeam={fixture?.home === userTeam} />
      <BracketSlot value={fixture?.away || fixture?.awaySeed || "TBC"} compact={compact} large={large} medium={finalFlags} small={smallFlags} isUserTeam={fixture?.away === userTeam} />
    </div>
  </div>;
}

function BracketRow({ count, fixtures = [], gap = "gap-[2px]", layout = "vertical", userTeam = null }) {
  const cols = count === 8 ? "grid-cols-8" : count === 4 ? "grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-1";
  return <div className={`grid w-full ${cols} ${gap} items-start`}>{Array.from({ length: count }).map((_, index) => <BracketFixture key={index} fixture={fixtures[index]} layout={layout} userTeam={userTeam} />)}</div>;
}

function stageLineInset(connectorCount = 1) {
  const count = Math.max(1, Number(connectorCount || 1));
  if (count <= 1) return "50%";

  // Match the horizontal title rail to the actual centre-points of the
  // bracket fixture columns. The fixture grids use small CSS gaps, so pure
  // 50/count percentages leave tiny broken line endings at R16/QF.
  const insetByCount = {
    2: "25%",
    4: "12.5%",
    8: "6.25%",
  };

  return insetByCount[count] || `${50 / count}%`;
}

function StageLabel({ children, connectorCount = 1 }) {
  const showRail = Number(connectorCount || 1) > 1;
  return (
    <div className="relative flex h-[10px] items-center justify-center overflow-visible text-center home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]">
      {showRail && <span aria-hidden="true" className={`absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${PITCH_LINE_BG_CLASS}`} />}
      <span className="relative z-[3] bg-[#052D1D] px-1 leading-none">{children}</span>
    </div>
  );
}

function RoundFixtureConnectors({ count = 1, gap = "gap-0", className = "" }) {
  const safeCount = Math.max(1, Number(count || 1));
  return (
    <div
      className={`grid h-[10px] w-full items-stretch ${gap} ${className}`}
      style={{ gridTemplateColumns: `repeat(${safeCount}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: safeCount }).map((_, index) => (
        <span key={index} className={`mx-auto block h-full w-[1.5px] ${PITCH_LINE_BG_CLASS}`} />
      ))}
    </div>
  );
}

function railInsetStyle(count = 1, gap = "gap-0") {
  const safeCount = Math.max(1, Number(count || 1));
  if (safeCount <= 1) return { left: "50%", right: "50%" };

  const gapPxByClass = {
    "gap-[1px]": 1,
    "gap-1": 4,
    "gap-1.5": 6,
    "gap-2": 8,
  };
  const gapPx = gapPxByClass[gap] ?? 0;
  const totalGapPx = gapPx * (safeCount - 1);
  const inset = totalGapPx
    ? `calc((100% - ${totalGapPx}px) / ${safeCount * 2})`
    : `${50 / safeCount}%`;

  return { left: inset, right: inset };
}

function StageRail({ title, count = 1, position = "above", gap = "gap-0" }) {
  const safeCount = Math.max(1, Number(count || 1));
  const isAbove = position === "above";
  const labelTopClass = isAbove ? "top-0" : "bottom-0";
  const horizontalClass = isAbove ? "top-[5px]" : "bottom-[5px]";
  const verticalClass = isAbove ? "top-[5px] h-[7px]" : "bottom-[5px] h-[7px]";
  const showRail = safeCount > 1;
  const railInset = railInsetStyle(safeCount, gap);

  return (
    <div className="relative h-[13px] w-full overflow-visible text-center home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]">
      {showRail && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute ${horizontalClass} z-[1] block h-[1.5px] ${PITCH_LINE_BG_CLASS}`}
          style={railInset}
        />
      )}
      <div
        className={`pointer-events-none absolute inset-0 z-[2] grid ${gap}`}
        style={{ gridTemplateColumns: `repeat(${safeCount}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: safeCount }).map((_, index) => (
          <span key={`stem-cell-${index}`} className="relative block h-full min-w-0 overflow-visible">
            <span className={`absolute left-1/2 ${verticalClass} block w-[1.5px] -translate-x-1/2 ${PITCH_LINE_BG_CLASS}`} />
          </span>
        ))}
      </div>
      <span className={`absolute left-1/2 ${labelTopClass} z-[3] -translate-x-1/2 whitespace-nowrap bg-[#052D1D] px-1 leading-none`}>{title}</span>
    </div>
  );
}

function PodiumBox({ title, team, className, userTeam = null }) {
  return <div className={`mx-auto flex h-[34px] w-[58px] flex-col items-center justify-center rounded-[0.55rem] border border-[#F5F1E8] px-[5px] py-[4px] ring-1 ring-[#F5F1E8]/30 ${className}`}>
    <div className="mb-[2px] max-w-[54px] whitespace-nowrap text-center home-copy-bold text-[8px] font-black uppercase leading-none tracking-[0.01em] text-[#072D1D]/72">{title}</div>
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
          <span>{index + 1}</span>
          <span className="flex justify-center"><TeamFlag team={row.team} isUserTeam={isUserTeam} className="h-4 w-6" /></span><TeamName team={row.team} active={isUserTeam} className="pl-2 text-left tracking-[0.015em]" />
          <span className="flex h-[16px] w-full items-center justify-center text-center text-[10px] home-copy-regular font-black leading-[10px] text-[#F7D117]">{isQualified ? "Q" : ""}</span>
          <span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.played}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.won}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.lost}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.drawn}</span><span className={`flex items-center justify-center ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.gd}</span><span className={`flex items-center justify-center font-black ${isUserTeam ? "text-[#F7D117]" : ""}`}>{row.pts}</span>
        </div>;
      })}
    </div>
  </AppPanel>;
}

function BracketStageBox({ title, children, className = "", titlePosition = "above", connectorCount = 1, connectorGap = "gap-0" }) {
  return (
    <section className={`p-0 text-[#F5F1E8] ${className}`}>
      {titlePosition === "above" ? (
        <>
          <StageRail title={title} count={connectorCount} gap={connectorGap} position="above" />
          <div>{children}</div>
        </>
      ) : (
        <>
          <div>{children}</div>
          <StageRail title={title} count={connectorCount} gap={connectorGap} position="below" />
        </>
      )}
    </section>
  );
}

function PodiumStageBox({ winner, runnerUp, thirdPlace }) {
  return (
    <div className="mx-auto grid h-[62px] w-full max-w-[228px] grid-cols-3 items-center justify-center gap-1.5 text-[#F5F1E8]">
      <PodiumBox title="THIRD PLACE" team={thirdPlace} className="mc-metallic-bronze" />
      <PodiumBox title="RUNNER-UP" team={runnerUp} className="mc-metallic-silver" />
      <PodiumBox title="CHAMPIONS" team={winner} className="mc-metallic-gold" />
    </div>
  );
}

function BracketHalfBox({ title, fixtures = [], count, gap = "gap-1.5", layout = "horizontal", userTeam = null }) {
  return (
    <section className="p-0 text-[#F5F1E8]">
      <StageRail title={title} count={count} gap={gap} position="above" />
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
    <BracketStageBox title={title} titlePosition={titlePosition} connectorCount={count} connectorGap={gap} className={`mx-auto w-full overflow-visible ${className}`}>
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
        <span aria-hidden="true" className={`block h-[13px] w-px ${PITCH_LINE_BG_CLASS}`} />
        <div className="flex h-[62px] w-[68px] items-center justify-center">
          <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} featuredFlags />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-[68px] flex-col items-center justify-start text-[#F5F1E8]">
      <StageLabel connectorCount={1}>{title}</StageLabel>
      <RoundFixtureConnectors count={1} className="-mb-[2px] -mt-[5px]" />
      <div className="flex h-[62px] w-[68px] items-center justify-center">
        <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} featuredFlags />
      </div>
    </section>
  );
}

function FinalCentreStageBox({ fixture, userTeam = null }) {
  return (
    <section className="relative mx-auto flex h-[112px] w-[92px] flex-col items-center justify-center overflow-visible text-[#F5F1E8]">
      <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full border ${PITCH_LINE_CLASS}`} />
      <div className="absolute left-1/2 top-0 z-[9] w-full -translate-x-1/2">
        <StageLabel connectorCount={1}>FINAL</StageLabel>
      </div>
      <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-[10px] z-[7] h-[6px] w-px -translate-x-1/2 ${PITCH_LINE_BG_CLASS}`} />
      <div className="relative z-[4] flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#052D1D]/72">
        <BracketFixture fixture={fixture} layout="vertical" userTeam={userTeam} featuredFlags finalFlags className="!h-[80px] !w-[80px] !border-transparent !bg-transparent !ring-0" />
      </div>
      <span aria-hidden="true" className={`pointer-events-none absolute bottom-[10px] left-1/2 z-[7] h-[6px] w-px -translate-x-1/2 ${PITCH_LINE_BG_CLASS}`} />
      <div className="absolute bottom-0 left-1/2 z-[9] w-full -translate-x-1/2">
        <StageLabel connectorCount={1}>FINAL</StageLabel>
      </div>
    </section>
  );
}

function KnockoutCentreBand({ finalFixture, thirdFixture, winner, runnerUp, thirdPlace, userTeam = null }) {
  return (
    <div className="relative mx-auto flex h-[112px] w-full items-center justify-center">
      <div
        data-align-ref="R16-M89"
        className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex w-[68px] flex-col items-center justify-center gap-3"
        style={{ transform: "translate(calc(-50% - 109.5px), -50%)" }}
      >
        <PodiumBox title="THIRD PLACE" team={thirdPlace} userTeam={userTeam} className="mc-metallic-bronze" />
        <BracketFixture fixture={thirdFixture} layout="horizontal" userTeam={userTeam} featuredFlags className="!h-[34px] !w-[58px]" />
      </div>

      <FinalCentreStageBox fixture={finalFixture} userTeam={userTeam} />

      <div
        data-align-ref="R16-M94"
        className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex w-[68px] flex-col items-center justify-center gap-3"
        style={{ transform: "translate(calc(-50% + 109.5px), -50%)" }}
      >
        <PodiumBox title="CHAMPIONS" team={winner} userTeam={userTeam} className="mc-metallic-gold" />
        <PodiumBox title="RUNNER-UP" team={runnerUp} userTeam={userTeam} className="mc-metallic-silver" />
      </div>
    </div>
  );
}

function KnockoutBracket({ round32 = [], podium = {}, userTeam = null }) {
  const { r32, r16, qf, sf, finalFixture, thirdFixture, winner, runnerUp, thirdPlace } = selectBracketModel({ knockoutFixtures: round32, podium });

  return (
    <div className="mx-auto w-full max-w-full overflow-hidden px-2 text-[#F5F1E8]">
      <div
        className={`relative mx-auto flex w-[94%] flex-col overflow-hidden rounded-none border ${PITCH_LINE_CLASS} ${STANDINGS_SECTION_BG} px-2 py-3 shadow-[inset_0_0_0_1px_rgba(245,241,232,0.22),inset_0_1px_0_rgba(245,241,232,0.12)]`}
      >
        <span aria-hidden="true" className={`pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 ${PITCH_LINE_BG_CLASS}`} />
        <span aria-hidden="true" className={`pointer-events-none absolute -left-[15px] -top-[15px] z-0 h-[30px] w-[30px] rounded-full border ${PITCH_LINE_CLASS}`} />
        <span aria-hidden="true" className={`pointer-events-none absolute -right-[15px] -top-[15px] z-0 h-[30px] w-[30px] rounded-full border ${PITCH_LINE_CLASS}`} />
        <span aria-hidden="true" className={`pointer-events-none absolute -bottom-[15px] -left-[15px] z-0 h-[30px] w-[30px] rounded-full border ${PITCH_LINE_CLASS}`} />
        <span aria-hidden="true" className={`pointer-events-none absolute -bottom-[15px] -right-[15px] z-0 h-[30px] w-[30px] rounded-full border ${PITCH_LINE_CLASS}`} />
        <div className="relative z-[2] flex flex-col gap-2">
        <KnockoutRoundBand
          title="ROUND OF 32"
          className="mx-auto max-w-[348px]"
          fixtures={r32.slice(0, 8)}
          count={8}
          gap="gap-[1px]"
          layout="r32"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="ROUND OF 16"
          className="mx-auto max-w-[292px]"
          fixtures={r16.slice(0, 4)}
          count={4}
          gap="gap-1.5"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="QUARTER-FINALS"
          className="mx-auto max-w-[132px]"
          fixtures={qf.slice(0, 2)}
          count={2}
          gap="gap-2"
          layout="horizontal"
          userTeam={userTeam}
        />

        <KnockoutRoundBand
          title="SEMI-FINALS"
          className="mx-auto max-w-[64px]"
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
          className="mx-auto max-w-[64px]"
          fixtures={sf.slice(1, 2)}
          count={1}
          gap="gap-1"
          layout="horizontal"
          userTeam={userTeam}
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="QUARTER-FINALS"
          className="mx-auto max-w-[132px]"
          fixtures={qf.slice(2, 4)}
          count={2}
          gap="gap-2"
          layout="horizontal"
          userTeam={userTeam}
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="ROUND OF 16"
          className="mx-auto max-w-[292px]"
          fixtures={r16.slice(4, 8)}
          count={4}
          gap="gap-1.5"
          layout="horizontal"
          userTeam={userTeam}
          titlePosition="below"
        />

        <KnockoutRoundBand
          title="ROUND OF 32"
          className="mx-auto max-w-[348px]"
          fixtures={r32.slice(8, 16)}
          count={8}
          gap="gap-[1px]"
          layout="r32"
          userTeam={userTeam}
          titlePosition="below"
        />


        </div>
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

  return <main className="relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]"><ScreenTopBar {...menuProps}>STANDINGS</ScreenTopBar><PageTabsSlot><FixturesToggle value={standingsView} onChange={onStandingsViewChange} labels={["GROUPS", "BRACKET"]} /></PageTabsSlot><PageScroll ref={scrollRef} className="pt-1"><div className={standingsView === "group" ? "mc-panel-stack pb-4" : "space-y-0 pb-4"}>
    {standingsView === "group" && allGroups.map(({ group, rows }) => <div key={group} ref={(node) => { if (node) groupRefs.current[group] = node; }}><GroupTable title={`GROUP ${group}`} rows={rows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} /></div>)}
    {standingsView === "knockout" && <KnockoutBracket round32={knockoutFixtures} podium={podium} userTeam={userTeam} />}
  </div></PageScroll></main>;
}
