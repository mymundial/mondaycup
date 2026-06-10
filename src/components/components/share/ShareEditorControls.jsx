import { DIRECTIONS } from "../../logic/penaltyEngine.js";
import { getTeamTheme } from "../../data/teams.js";
import { TEAM_OPTIONS, DIRECTION_TO_SLOT } from "./shareConstants.js";
import { padMarkers } from "./shareUtils.jsx";

export function Field({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-left">
      <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "h-10 min-w-0 rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3 home-copy-bold text-[12px] font-black uppercase tracking-[0.08em] text-[#F5F1E8] outline-none ring-1 ring-[#0B5F35]/45 focus:border-[#F7D117]/65";
const smallButtonBase = "grid h-9 place-items-center rounded-[12px] border px-2 home-copy-bold text-[10px] font-black uppercase tracking-[0.11em] transition";

export function TextInput({ value, onChange, type = "text", min, max }) {
  return <input className={inputClass} type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function ColourInput({ value, onChange }) {
  return <input className="h-10 w-full rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 p-1" type="color" value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function RangeInput({ value, onChange, min = 0.5, max = 1.5, step = 0.05, suffix = "×" }) {
  return (
    <div className="grid h-10 grid-cols-[1fr_44px] items-center gap-2 rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3">
      <input className="w-full accent-[#F7D117]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="text-right home-copy-bold text-[10px] font-black uppercase tracking-[0.08em] text-[#F5F1E8]/80">{Number(value).toFixed(step < 0.1 ? 2 : 1)}{suffix}</span>
    </div>
  );
}

export function TeamSelect({ value, onChange, includePlaceholder = false }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {includePlaceholder && <option value="">SELECT TEAM</option>}
      {TEAM_OPTIONS.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
    </select>
  );
}

export function applyTeamShirtColourway(teamName, setters = {}) {
  if (!teamName) return;
  const theme = getTeamTheme(teamName);
  setters.setBgMode?.("team");
  setters.setTextColour?.(theme.text);
  setters.setNumberColour?.(theme.text);
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

export function MiniSegment({ options, value, onChange }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`${smallButtonBase} ${active ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.20)]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleButton({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`${smallButtonBase} ${active ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
      {children}
    </button>
  );
}

export function CheckboxControl({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex h-10 items-center justify-start gap-2 rounded-[12px] border px-3 home-copy-bold text-[11px] font-black uppercase tracking-[0.1em] ${checked ? "border-[#F7D117]/70 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-[4px] border ${checked ? "border-[#072D1D]" : "border-[#F5F1E8]/40"}`}>{checked ? "✓" : ""}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}


export function PanelPager({ panels, index, onChange }) {
  const count = Math.max(1, panels.length);
  const safeIndex = ((index % count) + count) % count;
  const active = panels[safeIndex];
  const go = (delta) => onChange(((safeIndex + delta + count) % count));

  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 rounded-[14px] border border-[#F5F1E8]/12 bg-[#051A11]/70 p-2">
      <button type="button" onClick={() => go(-1)} className={`${smallButtonBase} border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]`} aria-label="Previous panel">‹</button>
      <div className="text-center">
        <div className="home-copy-bold text-[10px] font-black uppercase tracking-[0.22em] text-[#F5F1E8]/56">Editor panel</div>
        <div className="mt-1 home-copy-bold text-[13px] font-black uppercase tracking-[0.18em] text-[#F7D117]">{active?.label || active}</div>
      </div>
      <button type="button" onClick={() => go(1)} className={`${smallButtonBase} border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]`} aria-label="Next panel">›</button>
    </div>
  );
}

export function MarkerControl({ title, markers, totalSlots, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{title}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}>
        {padMarkers(markers, totalSlots).map((marker, index) => {
          const activeClass = marker === "G" ? "border-green-300/80 bg-green-500 text-[#051A11]" : marker === "S" ? "border-red-200/80 bg-red-500 text-white" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F7D117]";
          return (
            <button key={`${title}-${index}`} type="button" onClick={() => onToggle(index)} className={`${smallButtonBase} ${activeClass}`}>
              {marker || index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PositionSelect({ value, onChange }) {
  const options = [
    { value: "spot", label: "PEN SPOT" },
    ...DIRECTIONS.map((direction) => ({ value: direction.id, label: `${DIRECTION_TO_SLOT[direction.id]} ${direction.id}` })),
  ];
  return <SelectInput value={value} onChange={onChange} options={options} />;
}

export function XYScaleControls({ title, x, setX, y, setY, scale, setScale, xRange = 80, yRange = 80, minScale = 0.5, maxScale = 1.8 }) {
  return (
    <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-3">
      <div className="sm:col-span-3 home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{title}</div>
      <Field label="X"><RangeInput value={x} onChange={setX} min={-xRange} max={xRange} step={1} suffix="px" /></Field>
      <Field label="Y"><RangeInput value={y} onChange={setY} min={-yRange} max={yRange} step={1} suffix="px" /></Field>
      {setScale && <Field label="Scale"><RangeInput value={scale} onChange={setScale} min={minScale} max={maxScale} step={0.05} /></Field>}
    </div>
  );
}
