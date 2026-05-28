/* auto-scroll current phase enabled */
import { useEffect, useRef } from "react";
import { KO_ROUNDS } from "../../data/tournament.js";
import { buildRound32Placeholders } from "../../logic/tournament.js";
import { buildPlaceholderFixtures, mergeByMatchNo } from "../../logic/bracketMappingSelectors.js";
import { selectFixtureScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import { ScreenTitle } from "../layout/Menu.jsx";

const isSeedLabel = (value) => /^[123][A-L]+$/.test(String(value || ""));
const isProgressionLabel = (value) => /^(W|RU)\d+$/.test(String(value || ""));
const isPlaceholderLabel = (value) => !value || value === "TBC" || isSeedLabel(value) || isProgressionLabel(value);
const displayTeam = (value) => value || "TBC";
const normaliseRoundTitle = (title = "") => String(title).replace(/3rd\s+place\s+play-?off/i, "THIRD PLACE PLAY-OFF").replace(/3RD\s+PLACE\s+PLAY-?OFF/i, "THIRD PLACE PLAY-OFF");

function PlaceholderFlag({ className = "h-4 w-6" }) {
  return <span className={`relative flex ${className} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] text-[8px] home-copy-bold tracking-[0.04em] text-[#F5F1E8] ring-1 ring-[#F5F1E8]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}>TBC</span>;
}

function FlagSlot({ value, className = "h-5 w-7" }) {
  return isPlaceholderLabel(value) ? <PlaceholderFlag className={className} /> : <Flag team={value} className={`${className} rounded-[4px] ring-1 ring-[#F5F1E8]/35`} />;
}

export function FixtureCard({ home = "TBC", away = "TBC", group, played = false, homeGoals = null, awayGoals = null, matchNo = null, userTeam = null }) {
  const isUserFixture = userTeam && (home === userTeam || away === userTeam);
  const isUserHome = userTeam && home === userTeam;
  const isUserAway = userTeam && away === userTeam;
  const scoreText = played ? `${homeGoals}-${awayGoals}` : "v";
  const cardClass = `mb-1.5 grid min-h-[62px] grid-rows-[30%_40%_30%] rounded-[1.25rem] border px-2.5 text-center ring-1 last:mb-0 ${isUserFixture ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/16 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`;
  const teamText = (isUserTeam) => isUserTeam ? "text-[#F7D117]" : isUserFixture ? "text-[#F5F1E8]" : "text-[#26352E]";
  const scoreClass = isUserFixture ? "text-[#F5F1E8]" : "text-[#26352E]";
  const labelClass = isUserFixture ? "text-[#F5F1E8]" : "text-[#0B5F35]";

  return (
    <div className={cardClass}>
      <div className={`flex items-end justify-center gap-2 self-stretch pb-[3px] home-copy-bold text-[11px] uppercase leading-none tracking-[0.14em] ${labelClass}`}>
        {matchNo && !group && <span>M{matchNo}</span>}
        {group && <span>GROUP {group}</span>}
        {matchNo && group && <span className="home-copy-regular text-[10px] opacity-80">M{matchNo}</span>}
      </div>
      <div className="grid min-h-0 grid-cols-[32px_minmax(0,1fr)_34px_minmax(0,1fr)_32px] items-center gap-2 self-stretch home-main-font text-[clamp(12px,3.2vw,14px)] uppercase leading-none">
        <div className="flex translate-x-1.5 items-center justify-center"><FlagSlot value={home} /></div>
        <span className={`block min-w-0 truncate text-center home-copy-regular ${teamText(isUserHome)}`} title={displayTeam(home)}>{displayTeam(home)}</span>
        <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${scoreClass}`}>{scoreText}</span>
        <span className={`block min-w-0 truncate text-center home-copy-regular ${teamText(isUserAway)}`} title={displayTeam(away)}>{displayTeam(away)}</span>
        <div className="flex -translate-x-1.5 items-center justify-center"><FlagSlot value={away} /></div>
      </div>
      <div aria-hidden="true" className="self-stretch" />
    </div>
  );
}

export const PAGE_TOGGLE_TOP_PADDING = "px-0 pb-2 pt-3";
const FIXTURE_SECTION_BG = "bg-[#0B5F35]/44";

export function FixturesToggle({ value, onChange, labels = ["GROUPS", "KNOCKOUT"] }) {
  const buttonClass = (active) => `flex h-8 items-center justify-center rounded-[0.75rem] px-3 home-copy-bold text-[14px] uppercase leading-none tracking-[0.08em] transition-all ${active ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.24)]" : "bg-[#0B5F35] text-[#F5F1E8]/72"}`;
  return (
    <div className="mx-auto grid w-[94%] grid-cols-2 rounded-[0.95rem] border border-[#F5F1E8]/20 bg-[#0B5F35]/82 p-0.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.08),0_8px_20px_rgba(0,0,0,0.12)]">
      <button type="button" onClick={() => onChange("group")} className={buttonClass(value === "group")}>{labels[0]}</button>
      <button type="button" onClick={() => onChange("knockout")} className={buttonClass(value === "knockout")}>{labels[1]}</button>
    </div>
  );
}

export function FixtureSection({ title, children, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      className={`mx-auto w-[94%] overflow-hidden rounded-[1.6rem] border border-[#F5F1E8]/12 ${FIXTURE_SECTION_BG} text-[#F5F1E8] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F5F1E8]/10`}
    >
      <div className="px-3 pb-2 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
        {normaliseRoundTitle(title)}
      </div>
      <div className="px-2 pb-2">{children}</div>
    </section>
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
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]">
      <ScreenTitle {...menuProps}>SCHEDULE</ScreenTitle>
      <div className={PAGE_TOGGLE_TOP_PADDING}>
        <FixturesToggle value={fixtureView} onChange={onFixtureViewChange} />
      </div>
      <section ref={scrollRef} className="min-h-0 flex-1 overflow-auto pt-0.5 pb-1 [scroll-padding-top:0px]">
        <div className="space-y-2.5 pb-2">
          {fixtureView === "group" && [1, 2, 3].map((round) => <FixtureSection key={round} title={`MATCHDAY ${round}`} sectionRef={setSectionRef(`group-${round}`)}>{schedule.filter((fixture) => fixture.week === round).map((fixture) => <FixtureCard key={fixture.id} {...fixture} userTeam={userTeam} />)}</FixtureSection>)}
          {fixtureView === "knockout" && KO_ROUNDS.map(([label, nums]) => {
            const fixtures = label === "Round of 32" ? round32 : mergeByMatchNo(buildPlaceholderFixtures(label, nums), knockoutFixtures);
            return <FixtureSection key={label} title={normaliseRoundTitle(label)} sectionRef={setSectionRef(`knockout-${label}`)}>{[...fixtures].sort((a,b)=>(a.matchNo||0)-(b.matchNo||0)).map((fixture) => <FixtureCard key={fixture.id || fixture.matchNo} {...fixture} userTeam={userTeam} />)}</FixtureSection>;
          })}
        </div>
      </section>
    </main>
  );
}
