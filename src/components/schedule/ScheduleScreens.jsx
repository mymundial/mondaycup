/* auto-scroll current phase enabled */
import { useEffect, useRef } from "react";
import { KO_ROUNDS } from "../../data/tournament.js";
import { buildRound32Placeholders } from "../../logic/tournament.js";
import { buildPlaceholderFixtures, mergeByMatchNo } from "../../logic/bracketMappingSelectors.js";
import { selectFixtureScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import PageTabs, { PAGE_TABS_SLOT_CLASS, PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import TeamName, { getTeamDisplayName } from "../ui/TeamName.jsx";
import AppPanel from "../ui/AppPanel.jsx";

const isSeedLabel = (value) => /^[123][A-L]+$/.test(String(value || ""));
const isProgressionLabel = (value) => /^(W|RU)\d+$/.test(String(value || ""));
const isPlaceholderLabel = (value) => !value || value === "TBC" || isSeedLabel(value) || isProgressionLabel(value);
const displayTeam = (value) => getTeamDisplayName(value, "fixture");
const normaliseRoundTitle = (title = "") => String(title).replace(/3rd\s+place\s+play-?off/i, "THIRD PLACE PLAY-OFF").replace(/3RD\s+PLACE\s+PLAY-?OFF/i, "THIRD PLACE PLAY-OFF");
const FIXTURE_VENUES = {
  1: "Mexico City Stadium",
  2: "Estadio Guadalajara",
  3: "Toronto Stadium",
  4: "Los Angeles Stadium",
  5: "Boston Stadium",
  6: "BC Place Vancouver",
  7: "New York New Jersey Stadium",
  8: "San Francisco Bay Area Stadium",
  9: "Philadelphia Stadium",
  10: "Houston Stadium",
  11: "Dallas Stadium",
  12: "Estadio Monterrey",
  13: "Miami Stadium",
  14: "Atlanta Stadium",
  15: "Los Angeles Stadium",
  16: "Seattle Stadium",
  17: "New York New Jersey Stadium",
  18: "Boston Stadium",
  19: "Kansas City Stadium",
  20: "San Francisco Bay Area Stadium",
  21: "Toronto Stadium",
  22: "Dallas Stadium",
  23: "Houston Stadium",
  24: "Mexico City Stadium",
  25: "Atlanta Stadium",
  26: "Los Angeles Stadium",
  27: "BC Place Vancouver",
  28: "Estadio Guadalajara",
  29: "Philadelphia Stadium",
  30: "Boston Stadium",
  31: "San Francisco Bay Area Stadium",
  32: "Seattle Stadium",
  33: "Toronto Stadium",
  34: "Kansas City Stadium",
  35: "Houston Stadium",
  36: "Estadio Monterrey",
  37: "Miami Stadium",
  38: "Atlanta Stadium",
  39: "Los Angeles Stadium",
  40: "BC Place Vancouver",
  41: "New York New Jersey Stadium",
  42: "Philadelphia Stadium",
  43: "Dallas Stadium",
  44: "San Francisco Bay Area Stadium",
  45: "Boston Stadium",
  46: "Toronto Stadium",
  47: "Houston Stadium",
  48: "Estadio Guadalajara",
  49: "Miami Stadium",
  50: "Atlanta Stadium",
  51: "BC Place Vancouver",
  52: "Seattle Stadium",
  53: "Mexico City Stadium",
  54: "Estadio Monterrey",
  55: "Philadelphia Stadium",
  56: "New York New Jersey Stadium",
  57: "Dallas Stadium",
  58: "Kansas City Stadium",
  59: "Los Angeles Stadium",
  60: "San Francisco Bay Area Stadium",
  61: "Boston Stadium",
  62: "Toronto Stadium",
  63: "Seattle Stadium",
  64: "BC Place Vancouver",
  65: "Houston Stadium",
  66: "Estadio Guadalajara",
  67: "New York New Jersey Stadium",
  68: "Philadelphia Stadium",
  69: "Kansas City Stadium",
  70: "Dallas Stadium",
  71: "Miami Stadium",
  72: "Atlanta Stadium",
  73: "Los Angeles Stadium",
  74: "Houston Stadium",
  75: "Boston Stadium",
  76: "Estadio Monterrey",
  77: "Dallas Stadium",
  78: "New York New Jersey Stadium",
  79: "Mexico City Stadium",
  80: "Atlanta Stadium",
  81: "Seattle Stadium",
  82: "San Francisco Bay Area Stadium",
  83: "Los Angeles Stadium",
  84: "Toronto Stadium",
  85: "BC Place Vancouver",
  86: "Dallas Stadium",
  87: "Miami Stadium",
  88: "Kansas City Stadium",
  89: "Houston Stadium",
  90: "Philadelphia Stadium",
  91: "New York New Jersey Stadium",
  92: "Mexico City Stadium",
  93: "Dallas Stadium",
  94: "Seattle Stadium",
  95: "Atlanta Stadium",
  96: "BC Place Vancouver",
  97: "Boston Stadium",
  98: "Los Angeles Stadium",
  99: "Miami Stadium",
  100: "Kansas City Stadium",
  101: "Dallas Stadium",
  102: "Atlanta Stadium",
  103: "Miami Stadium",
  104: "New York New Jersey Stadium",
};

function PlaceholderFlag({ className = "h-4 w-6" }) {
  return <span className={`relative flex ${className} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] text-[8px] home-copy-bold tracking-[0.04em] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}>TBC</span>;
}

function FlagSlot({ value, className = "h-5 w-7", isUserTeam = false }) {
  return isPlaceholderLabel(value) ? <PlaceholderFlag className={className} /> : <TeamFlag team={value} className={className} isUserTeam={isUserTeam} userRing="ring-[#F7D117]/80" />;
}

export function FixtureCard({ id = null, home = "TBC", away = "TBC", group, played = false, homeGoals = null, awayGoals = null, matchNo = null, matchNumber = null, matchId = null, userTeam = null }) {
  const isUserFixture = userTeam && (home === userTeam || away === userTeam);
  const isUserHome = userTeam && home === userTeam;
  const isUserAway = userTeam && away === userTeam;
  const scoreText = played ? `${homeGoals}-${awayGoals}` : "v";
  const fixtureNo = Number(matchNo || matchNumber || 0);
  const stadium = FIXTURE_VENUES[fixtureNo] || "";
  const cardClass = `mb-1.5 grid min-h-[62px] grid-rows-[30%_40%_30%] rounded-[1.25rem] border px-2.5 text-center ring-1 last:mb-0 ${isUserFixture ? "border-[#F7D117]/72 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F7D117]/30 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]" : "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]"}`;
  const teamText = (isUserTeam) => isUserTeam ? "text-[#F7D117]" : "text-[#F5F1E8]";
  const scoreClass = "text-[#F5F1E8]";
  const labelClass = "text-[#F5F1E8]/72";

  return (
    <div className={cardClass}>
      <div className={`flex items-end justify-center gap-2 self-stretch pb-[3px] home-copy-bold text-[11px] uppercase leading-none tracking-[0.14em] ${labelClass}`}>
        {fixtureNo && !group && <span>MATCH {fixtureNo}</span>}
        {group && <span>GROUP {group}</span>}
      </div>
      <div className="grid min-h-0 grid-cols-[32px_minmax(0,1fr)_34px_minmax(0,1fr)_32px] items-center gap-2 self-stretch home-main-font text-[clamp(12px,3.2vw,14px)] uppercase leading-none">
        <div className="flex translate-x-1.5 items-center justify-center"><FlagSlot value={home} isUserTeam={isUserHome} /></div>
        <TeamName team={home} context="fixture" className={`text-center home-copy-regular ${teamText(isUserHome)}`} active={false} />
        <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${scoreClass}`}>{scoreText}</span>
        <TeamName team={away} context="fixture" className={`text-center home-copy-regular ${teamText(isUserAway)}`} active={false} />
        <div className="flex -translate-x-1.5 items-center justify-center"><FlagSlot value={away} isUserTeam={isUserAway} /></div>
      </div>
      <div className={`flex items-start justify-center self-stretch pt-[3px] home-copy-regular text-[11px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]/72`}>
        {stadium}
      </div>
    </div>
  );
}

export const PAGE_TOGGLE_TOP_PADDING = PAGE_TABS_SLOT_CLASS;
export function FixturesToggle({ value, onChange, labels = ["GROUPS", "KNOCKOUT"] }) {
  return (
    <PageTabs
      value={value}
      onChange={onChange}
      options={[
        { value: "group", label: labels[0] },
        { value: "knockout", label: labels[1] },
      ]}
    />
  );
}

export function FixtureSection({ title, children, sectionRef }) {
  return (
    <AppPanel ref={sectionRef} variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
      <div className="px-3 pb-2 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
        {normaliseRoundTitle(title)}
      </div>
      <div className="px-2 pb-2">{children}</div>
    </AppPanel>
  );
}


function fallbackFixtureScrollTarget({ fixtureView, schedule = [], knockoutFixtures = [], userTeam = null }) {
  if (!userTeam) return null;

  if (fixtureView === "group") {
    const userFixtures = schedule
      .filter((fixture) => fixture.home === userTeam || fixture.away === userTeam)
      .sort((a, b) => Number(a.week || 0) - Number(b.week || 0));
    const nextFixture = userFixtures.find((fixture) => !fixture.played) || userFixtures[userFixtures.length - 1];
    if (nextFixture?.week) return { key: `group-${nextFixture.week}`, align: "top" };
  }

  if (fixtureView === "knockout") {
    const userFixture = [...knockoutFixtures]
      .sort((a, b) => Number(a.matchNo || 0) - Number(b.matchNo || 0))
      .find((fixture) => fixture.home === userTeam || fixture.away === userTeam);
    const matchNo = Number(userFixture?.matchNo || 0);
    if (matchNo >= 103) return { key: "knockout-Final", align: "bottom" };
    if (matchNo >= 101) return { key: "knockout-Semi-finals", align: "top" };
    if (matchNo >= 97) return { key: "knockout-Quarter-finals", align: "top" };
    if (matchNo >= 89) return { key: "knockout-Round of 16", align: "top" };
    if (matchNo >= 73) return { key: "knockout-Round of 32", align: "top" };
  }

  return null;
}

export function FixturesScreen({ fixtureView, onFixtureViewChange, schedule, menuProps, knockoutFixtures, userTeam = null, scheduleFocus = null }) {
  const round32 = mergeByMatchNo(buildRound32Placeholders(), knockoutFixtures);
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const scrollTarget = scheduleFocus ? selectFixtureScrollTarget({ fixtureView, scheduleFocus }) : (fallbackFixtureScrollTarget({ fixtureView, schedule, knockoutFixtures, userTeam }) || selectFixtureScrollTarget({ fixtureView, scheduleFocus }));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = requestAnimationFrame(() => {
      if (scrollTarget.align === "bottom") {
        container.scrollTop = container.scrollHeight;
        return;
      }
      const target = sectionRefs.current[scrollTarget.key];
      if (!target) {
        container.scrollTop = 0;
        return;
      }
      container.scrollTop = Math.max(0, target.offsetTop - container.offsetTop);
    });
    return () => cancelAnimationFrame(frame);
  }, [fixtureView, scrollTarget.key, scrollTarget.align, schedule.length, knockoutFixtures.length]);

  const setSectionRef = (key) => (node) => {
    if (node) sectionRefs.current[key] = node;
  };

  return (
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>SCHEDULE</ScreenTopBar>
      <PageTabsSlot>
        <FixturesToggle value={fixtureView} onChange={onFixtureViewChange} />
      </PageTabsSlot>
      <PageScroll ref={scrollRef} className="pt-0.5 [scroll-padding-top:0px]">
        <div className="mc-panel-stack pb-4">
          {fixtureView === "group" && [1, 2, 3].map((round) => <FixtureSection key={round} title={`MATCHDAY ${round}`} sectionRef={setSectionRef(`group-${round}`)}>{schedule.map((fixture, index) => ({ fixture, fixtureNo: index + 1 })).filter(({ fixture }) => fixture.week === round).map(({ fixture, fixtureNo }) => <FixtureCard key={fixture.id || fixtureNo} {...fixture} matchNo={fixture.matchNo || fixture.matchNumber || fixtureNo} userTeam={userTeam} />)}</FixtureSection>)}
          {fixtureView === "knockout" && KO_ROUNDS.map(([label, nums]) => {
            const fixtures = label === "Round of 32" ? round32 : mergeByMatchNo(buildPlaceholderFixtures(label, nums), knockoutFixtures);
            return <FixtureSection key={label} title={normaliseRoundTitle(label)} sectionRef={setSectionRef(`knockout-${label}`)}>{[...fixtures].sort((a,b)=>(a.matchNo||0)-(b.matchNo||0)).map((fixture) => <FixtureCard key={fixture.id || fixture.matchNo} {...fixture} userTeam={userTeam} />)}</FixtureSection>;
          })}
        </div>
      </PageScroll>
    </main>
  );
}
