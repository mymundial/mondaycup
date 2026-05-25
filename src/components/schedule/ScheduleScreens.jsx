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

function PlaceholderFlag({ className = "h-4 w-6" }) {
  return <span className={`relative flex ${className} shrink-0 items-center justify-center overflow-hidden rounded bg-[#DCE9DE] text-[6px] font-black tracking-[0.04em] text-[#0B5F35]/55 ring-1 ring-[#0B5F35]/10`}>TBC</span>;
}

function FlagSlot({ value }) {
  return isPlaceholderLabel(value) ? <PlaceholderFlag /> : <Flag team={value} />;
}

export function FixtureCard({ home = "TBC", away = "TBC", group, played = false, homeGoals = null, awayGoals = null, matchNo = null, userTeam = null }) {
  const isUserFixture = userTeam && (home === userTeam || away === userTeam);
  const isUserHome = userTeam && home === userTeam;
  const isUserAway = userTeam && away === userTeam;
  const cardClass = `mb-1.5 rounded-2xl px-3 py-2 text-center home-copy-light text-[12px] text-[#072D1D]/80 ring-1 ring-[#0B5F35]/6 last:mb-0 ${isUserFixture ? "bg-[#DCE9DE]" : "bg-[#F8F4EC]"}`;
  return <div className={cardClass}>
    <div className="mb-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#0B5F35]/60">
      {matchNo && <span>M{matchNo}</span>}
      {group && <span>Group {group}</span>}
    </div>
    <div className="grid grid-cols-[24px_minmax(0,1fr)_34px_minmax(0,1fr)_24px] items-center gap-2 text-[12px] text-[#072D1D]">
      <div className="flex items-center justify-center"><FlagSlot value={home} /></div>
      <span className={`min-w-0 truncate text-center uppercase tracking-[0.005em] ${isUserHome ? "home-copy-regular" : "home-copy-light"}`}>{displayTeam(home)}</span>
      <span className="text-center font-black text-[#0B5F35]">{played ? `${homeGoals}-${awayGoals}` : "v"}</span>
      <span className={`min-w-0 truncate text-center uppercase tracking-[0.005em] ${isUserAway ? "home-copy-regular" : "home-copy-light"}`}>{displayTeam(away)}</span>
      <div className="flex items-center justify-center"><FlagSlot value={away} /></div>
    </div>
  </div>;
}

export function FixturesToggle({ value, onChange }) {
  const buttonClass = (active) => `rounded-full px-3 py-2 text-xs font-black uppercase transition-all ${active ? "bg-[#0B5F35] text-[#F5F0E6] shadow-sm" : "bg-transparent text-[#0B5F35]/72"}`;
  return <div className="grid grid-cols-2 gap-2 rounded-full border border-[#0B5F35]/10 bg-[#EFE7D8] p-1 shadow-inner"><button onClick={() => onChange("group")} className={buttonClass(value === "group")}>Groups</button><button onClick={() => onChange("knockout")} className={buttonClass(value === "knockout")}>Knockout</button></div>;
}

export function FixtureSection({ title, children, sectionRef }) {
  return <div ref={sectionRef} className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]"><div className="bg-[#0B5F35] px-3 py-2.5 text-center home-copy-bold text-[20px] uppercase tracking-[0.06em] text-[#F5F0E6]">{title}</div><div className="p-2.5">{children}</div></div>;
}

export function FixturesScreen({ fixtureView, onFixtureViewChange, schedule, menuProps, knockoutFixtures, userTeam = null, scheduleFocus = null }) {
  const round32 = mergeByMatchNo(buildRound32Placeholders(), knockoutFixtures);
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const scrollTarget = selectFixtureScrollTarget({ fixtureView, scheduleFocus });

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

  return <main className="flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>SCHEDULE</ScreenTitle><FixturesToggle value={fixtureView} onChange={onFixtureViewChange} /><section ref={scrollRef} className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-2.5">
    {fixtureView === "group" && [1, 2, 3].map((round) => <FixtureSection key={round} title={`MATCHDAY ${round}`} sectionRef={setSectionRef(`group-${round}`)}>{schedule.filter((fixture) => fixture.week === round).map((fixture) => <FixtureCard key={fixture.id} {...fixture} userTeam={userTeam} />)}</FixtureSection>)}
    {fixtureView === "knockout" && KO_ROUNDS.map(([label, nums]) => {
      const fixtures = label === "Round of 32" ? round32 : mergeByMatchNo(buildPlaceholderFixtures(label, nums), knockoutFixtures);
      return <FixtureSection key={label} title={label} sectionRef={setSectionRef(`knockout-${label}`)}>{[...fixtures].sort((a,b)=>(a.matchNo||0)-(b.matchNo||0)).map((fixture) => <FixtureCard key={fixture.id || fixture.matchNo} {...fixture} userTeam={userTeam} />)}</FixtureSection>;
    })}
  </div></section></main>;
}
