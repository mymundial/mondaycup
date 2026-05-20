import { KO_ROUNDS, KNOCKOUT_PLACEHOLDER_SLOTS } from "../../data/tournament.js";
import { buildRound32Placeholders } from "../../logic/tournament.js";
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

function buildPlaceholderFixtures(label, nums) {
  const configuredSlots = KNOCKOUT_PLACEHOLDER_SLOTS[label];
  if (configuredSlots) {
    return configuredSlots.map((slot) => ({
      id: `M${slot.matchNo}`,
      matchNo: slot.matchNo,
      home: slot.homeSeed,
      away: slot.awaySeed,
      homeSeed: slot.homeSeed,
      awaySeed: slot.awaySeed,
      played: false,
      homeGoals: null,
      awayGoals: null,
    }));
  }

  return nums.map((num) => ({
    id: `M${num}`,
    matchNo: num,
    home: "TBC",
    away: "TBC",
    played: false,
    homeGoals: null,
    awayGoals: null,
  }));
}

export function FixtureCard({ home = "TBC", away = "TBC", group, played = false, homeGoals = null, awayGoals = null, matchNo = null, userTeam = null }) {
  const isUserFixture = userTeam && (home === userTeam || away === userTeam);
  const cardClass = `mb-2 rounded-2xl bg-[#F8F4EC] px-3 py-3 text-center text-[11px] font-semibold text-[#072D1D]/80 last:mb-0 ${isUserFixture ? "ring-2 ring-[#D4AF37]" : "ring-1 ring-[#0B5F35]/6"}`;
  return <div className={cardClass}>
    <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5F35]/60">
      {matchNo && <span>M{matchNo}</span>}
      {group && <span>Group {group}</span>}
    </div>
    <div className="grid grid-cols-[24px_minmax(0,1fr)_34px_minmax(0,1fr)_24px] items-center gap-2 text-[10px] font-black text-[#072D1D]">
      <div className="flex items-center justify-start"><FlagSlot value={home} /></div>
      <span className="min-w-0 truncate text-right font-semibold uppercase tracking-[0.005em]">{displayTeam(home)}</span>
      <span className="text-center text-[#0B5F35]">{played ? `${homeGoals}-${awayGoals}` : "v"}</span>
      <span className="min-w-0 truncate text-left font-semibold uppercase tracking-[0.005em]">{displayTeam(away)}</span>
      <div className="flex items-center justify-end"><FlagSlot value={away} /></div>
    </div>
  </div>;
}

export function FixturesToggle({ value, onChange }) {
  const buttonClass = (active) => `rounded-full px-3 py-2 text-xs font-black uppercase transition-all ${active ? "bg-[#0B5F35] text-[#F5F0E6] shadow-sm" : "bg-transparent text-[#0B5F35]/72"}`;
  return <div className="grid grid-cols-2 gap-2 rounded-full border border-[#0B5F35]/10 bg-[#EFE7D8] p-1 shadow-inner"><button onClick={() => onChange("group")} className={buttonClass(value === "group")}>Groups</button><button onClick={() => onChange("knockout")} className={buttonClass(value === "knockout")}>Knockout</button></div>;
}

export function FixtureSection({ title, children }) {
  return <div className="mx-auto w-[94%] overflow-hidden rounded-[1.6rem] bg-[#EFE7D8] text-[#072D1D] ring-1 ring-[#0B5F35]/8 shadow-[0_8px_24px_rgba(7,45,29,0.04)]"><div className="bg-[#0B5F35] px-3 py-2.5 text-center text-[17px] font-black uppercase tracking-[-0.025em] text-[#F5F0E6]">{title}</div><div className="p-3">{children}</div></div>;
}

function mergeActualFixtures(label, nums, knockoutFixtures) {
  const placeholders = label === "Round of 32" ? buildRound32Placeholders() : buildPlaceholderFixtures(label, nums);
  const actualByMatchNo = new Map(
    knockoutFixtures
      .filter((fixture) => nums.includes(fixture.matchNo))
      .map((fixture) => [fixture.matchNo, fixture])
  );

  return placeholders.map((placeholder) => actualByMatchNo.get(placeholder.matchNo) || placeholder);
}

export function FixturesScreen({ fixtureView, onFixtureViewChange, schedule, menuProps, knockoutFixtures, userTeam = null }) {
  return <main className="flex min-h-0 flex-1 flex-col gap-2"><ScreenTitle {...menuProps}>SCHEDULE</ScreenTitle><FixturesToggle value={fixtureView} onChange={onFixtureViewChange} /><section className="min-h-0 flex-1 overflow-auto py-1"><div className="space-y-3">
    {fixtureView === "group" && [1, 2, 3].map((round) => <FixtureSection key={round} title={`MATCHDAY ${round}`}>{schedule.filter((fixture) => fixture.week === round).map((fixture) => <FixtureCard key={fixture.id} {...fixture} userTeam={userTeam} />)}</FixtureSection>)}
    {fixtureView === "knockout" && KO_ROUNDS.map(([label, nums]) => {
      const fixtures = mergeActualFixtures(label, nums, knockoutFixtures);
      return <FixtureSection key={label} title={label}>{fixtures.map((fixture) => <FixtureCard key={fixture.id || fixture.matchNo} {...fixture} userTeam={userTeam} />)}</FixtureSection>;
    })}
  </div></section></main>;
}
