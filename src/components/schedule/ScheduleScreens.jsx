/* auto-scroll current phase enabled */
import { useEffect, useRef } from "react";
import { KO_ROUNDS } from "../../data/tournament.js";
import { buildRound32Placeholders } from "../../logic/tournament.js";
import { buildPlaceholderFixtures, mergeByMatchNo } from "../../logic/bracketMappingSelectors.js";
import { selectFixtureScrollTarget } from "../../logic/schedulePositioningSelectors.js";
import { Flag } from "../shared.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { MenuPanel } from "../layout/MenuPanel.jsx";

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
  const cardClass = `mb-1.5 grid min-h-[62px] grid-rows-[30%_40%_30%] rounded-[1.25rem] border px-2.5 text-center ring-1 last:mb-0 shadow-[0_8px_18px_rgba(0,0,0,0.12)] ${isUserFixture ? "border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-[#0B5F35]/45 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`;
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
      <div className="grid min-h-0 grid-cols-[28px_minmax(0,1fr)_34px_minmax(0,1fr)_28px] items-center gap-1 self-stretch home-main-font text-[clamp(12px,3.2vw,14px)] uppercase leading-none">
        <div className="flex items-center justify-center"><FlagSlot value={home} /></div>
        <span className={`block min-w-0 truncate text-center home-copy-regular ${teamText(isUserHome)}`} title={displayTeam(home)}>{displayTeam(home)}</span>
        <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${scoreClass}`}>{scoreText}</span>
        <span className={`block min-w-0 truncate text-center home-copy-regular ${teamText(isUserAway)}`} title={displayTeam(away)}>{displayTeam(away)}</span>
        <div className="flex items-center justify-center"><FlagSlot value={away} /></div>
      </div>
      <div aria-hidden="true" className="self-stretch" />
    </div>
  );
}

export function FixturesToggle({ value, onChange }) {
  const buttonClass = (active) => `rounded-full px-3 py-2 home-copy-bold text-[14px] uppercase tracking-[0.08em] transition-all ${active ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.22)]" : "bg-transparent text-[#F5F1E8]"}`;
  return <div className="mx-auto grid w-[94%] grid-cols-2 gap-2 rounded-full border border-[#F5F1E8]/14 bg-[#0B5F35]/70 p-1 shadow-[inset_0_1px_0_rgba(245,241,232,0.08),0_8px_20px_rgba(0,0,0,0.12)]"><button onClick={() => onChange("group")} className={buttonClass(value === "group")}>Groups</button><button onClick={() => onChange("knockout")} className={buttonClass(value === "knockout")}>Knockout</button></div>;
}

export function FixtureSection({ title, children, sectionRef }) {
  return (
    <MenuPanel ref={sectionRef}>
      <div className="px-3 pb-1.5 pt-3 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">{normaliseRoundTitle(title)}</div>
      <div className="p-2 pt-1.5">{children}</div>
    </MenuPanel>
  );
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

  return (
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>SCHEDULE</ScreenTopBar>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 px-0 pb-2 pt-1.5">
        <FixturesToggle value={fixtureView} onChange={onFixtureViewChange} />
        <section ref={scrollRef} className="min-h-0 flex-1 overflow-auto py-1">
          <div className="space-y-2.5 pb-2">
            {fixtureView === "group" && [1, 2, 3].map((round) => <FixtureSection key={round} title={`MATCHDAY ${round}`} sectionRef={setSectionRef(`group-${round}`)}>{schedule.filter((fixture) => fixture.week === round).map((fixture) => <FixtureCard key={fixture.id} {...fixture} userTeam={userTeam} />)}</FixtureSection>)}
            {fixtureView === "knockout" && KO_ROUNDS.map(([label, nums]) => {
              const fixtures = label === "Round of 32" ? round32 : mergeByMatchNo(buildPlaceholderFixtures(label, nums), knockoutFixtures);
              return <FixtureSection key={label} title={normaliseRoundTitle(label)} sectionRef={setSectionRef(`knockout-${label}`)}>{[...fixtures].sort((a,b)=>(a.matchNo||0)-(b.matchNo||0)).map((fixture) => <FixtureCard key={fixture.id || fixture.matchNo} {...fixture} userTeam={userTeam} />)}</FixtureSection>;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
