import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, getTeamTheme } from "../../data/teams.js";
import {
  captureShareElementBlob,
  shareNativeImage,
  shareOrDownloadResult,
} from "../../utils/shareExport.js";
import { ShirtPosterPreview } from "./ShareScreen.jsx";

const TEAM_OPTIONS = Object.values(GROUPS).flat().sort((a, b) => a.localeCompare(b));
const IVORY = "#FFFFFF";
const SHIRT_BG = "#073B26";
const LED_YELLOW = "#F7D117";
const PITCH_MOW_BACKGROUND_STYLE = {
  backgroundColor: "#0d6c3d",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))",
  backgroundSize: "100% 100%",
};
const SHIRT_LAYOUT_VERSION = 6;
const DEFAULT_COMPOSITION = {
  mondayScale: 1.18,
  mondayX: 0,
  mondayY: 0,
  nameScale: 1.18,
  nameX: 0,
  nameY: 0,
  numberScale: 1.58,
  numberX: 0,
  numberY: 0,
  brothersScale: 0.65,
  brothersX: 0,
  brothersY: 0,
};

function cleanName(value, fallback = "MONDAY") {
  const clean = String(value || "").replace(/[^a-z0-9 ]/gi, "").trim().toUpperCase().slice(0, 14);
  return clean || fallback;
}

function cleanNumber(value, fallback = "11") {
  const clean = String(value ?? "").replace(/[^0-9]/g, "").slice(0, 2);
  return clean || fallback;
}

function usernameFromUser(currentUser) {
  return cleanName(currentUser?.displayName || currentUser?.email?.split("@")[0] || "MONDAY");
}

function normaliseInitialShirt(initialShirt, currentUser) {
  const defaultName = usernameFromUser(currentUser);
  return {
    team: initialShirt?.team || "",
    name: cleanName(initialShirt?.name, defaultName),
    number: cleanNumber(initialShirt?.number, "11"),
    bg: initialShirt?.bg || SHIRT_BG,
    textColour: initialShirt?.textColour || IVORY,
    numberColour: initialShirt?.numberColour || initialShirt?.textColour || IVORY,
    composition: {
      ...DEFAULT_COMPOSITION,
      ...(initialShirt?.layoutVersion >= SHIRT_LAYOUT_VERSION ? (initialShirt?.composition || {}) : {}),
      // Keep the production shirt print layout fixed even if old saved data exists.
      nameScale: DEFAULT_COMPOSITION.nameScale,
      numberScale: DEFAULT_COMPOSITION.numberScale,
      brothersScale: DEFAULT_COMPOSITION.brothersScale,
    },
  };
}

function CloseIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8.8 12.2l6.4-3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M8.8 12.2l6.4 3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="6.4" cy="12" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="5.9" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="18.1" r="2.45" stroke="currentColor" strokeWidth="2.35" />
    </svg>
  );
}

function CheckIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 12.4l4.15 4.15L19 6.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close shirt creator"
      className="flex h-10 w-10 items-center justify-center justify-self-end text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]"
    >
      <CloseIcon className="h-6 w-6" />
    </button>
  );
}

function ExportButton({ icon, label, onClick, disabled, primary = false, busy = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-14 items-center justify-center gap-2 rounded-[18px] border px-3 text-center home-copy-bold text-[11px] font-black uppercase leading-none tracking-[0.12em] shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:cursor-default disabled:opacity-60 ${primary ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/82 text-[#F5F1E8]"}`}
    >
      {icon}
      <span>{busy ? "WAIT" : label}</span>
    </button>
  );
}

export default function ShirtShareModal({ open, onClose, currentUser = null, initialShirt = null, onSaveShirt = null }) {
  const frameRef = useRef(null);
  const defaultShirt = useMemo(() => normaliseInitialShirt(initialShirt, currentUser), [initialShirt, currentUser]);
  const [team, setTeam] = useState(defaultShirt.team);
  const [name, setName] = useState(defaultShirt.name);
  const [number, setNumber] = useState(defaultShirt.number);
  const [customBg, setCustomBg] = useState(defaultShirt.bg);
  const [textColour, setTextColour] = useState(defaultShirt.textColour);
  const [numberColour, setNumberColour] = useState(defaultShirt.numberColour);
  const [composition, setComposition] = useState(defaultShirt.composition);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = normaliseInitialShirt(initialShirt, currentUser);
    setTeam(next.team);
    setName(next.name);
    setNumber(next.number);
    setCustomBg(next.bg);
    setTextColour(next.textColour);
    setNumberColour(next.numberColour);
    setComposition(next.composition);
  }, [open, initialShirt, currentUser]);

  if (!open) return null;

  const selectedTheme = team ? getTeamTheme(team) : null;
  const shirtBackground = selectedTheme?.bg || customBg || SHIRT_BG;
  const shirtTextColour = selectedTheme?.text || textColour || IVORY;
  const shirtNumberColour = selectedTheme?.text || numberColour || shirtTextColour;

  const buildPayload = () => ({
    team,
    name: cleanName(name, usernameFromUser(currentUser)),
    number: cleanNumber(number, "11"),
    bg: team ? selectedTheme?.bg : shirtBackground,
    textColour: shirtTextColour,
    numberColour: shirtNumberColour,
    composition,
    layoutVersion: SHIRT_LAYOUT_VERSION,
    updatedAt: Date.now(),
  });

  const makeBlob = async () => {
    if (!frameRef.current) throw new Error("Shirt preview not found");
    return captureShareElementBlob(frameRef.current, team || null);
  };

  const withBusy = async (label, action) => {
    if (busy) return;
    setBusy(label);
    try {
      await action();
    } catch (error) {
      console.error(`Shirt ${label} failed`, error);
      window.alert("Sorry, that shirt action failed. Please try another option.");
    } finally {
      setBusy("");
    }
  };

  const handleSave = () => withBusy("saving", async () => {
    await onSaveShirt?.(buildPayload());
    onClose?.();
  });

  const handleShare = () => withBusy("sharing", async () => {
    const blob = await makeBlob();
    try {
      await shareNativeImage(blob, "monday-cup-shirt.png", { title: "Monday Cup Shirt", text: "My Monday Cup shirt" });
    } catch (error) {
      console.warn("Native shirt share unavailable, falling back", error);
      await shareOrDownloadResult({ blob, filename: "monday-cup-shirt.png" });
    }
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[#051A11]/72 px-3 py-[max(14px,env(safe-area-inset-top))] text-[#F5F1E8] sm:items-center">
      <div className="absolute inset-0 bg-[#051A11]/58 backdrop-blur-[3px]" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-[410px] max-h-[calc(100dvh-28px)] overflow-y-auto rounded-[28px] border border-[#F5F1E8]/16 p-3.5 shadow-[0_20px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(245,241,232,0.08)] sm:p-4" style={{ ...PITCH_MOW_BACKGROUND_STYLE, backgroundColor: "#2C7041", backgroundBlendMode: "multiply" }}>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
          <div />
          <div className="min-w-0 text-center">
            <div className="home-copy-bold text-[clamp(21px,5.8vw,25px)] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">SHIRT PRINTING</div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="mx-auto mt-3 aspect-square w-full max-w-[318px] overflow-hidden border border-[#F5F1E8]/20 bg-[#073B26] shadow-[0_12px_28px_rgba(0,0,0,0.24)] ring-1 ring-[#F7D117]/24">
          <div ref={frameRef} className="h-full w-full">
            <ShirtPosterPreview
              shirtTeam={team}
              shirtName={cleanName(name, usernameFromUser(currentUser))}
              shirtNumber={cleanNumber(number, "11")}
              shirtShowMondayLogo={true}
              shirtShowBrothers={true}
              shirtShowTeam={false}
              shirtShowName={true}
              shirtShowNumber={true}
              shirtBgMode="custom"
              shirtCustomBg={shirtBackground}
              shirtTextColour={shirtTextColour}
              shirtNumberColour={shirtNumberColour}
              shirtOutlineEnabled={false}
              shirtOutlineColour={IVORY}
              shirtFontWeight="900"
              shirtFontStyle="normal"
              shirtFontType="bold"
              shirtOutlineWeight={0}
              shirtMondayScale={composition.mondayScale}
              shirtNameScale={composition.nameScale}
              shirtNumberScale={composition.numberScale}
              shirtBrothersScale={composition.brothersScale}
              shirtNameNumberLocked={false}
              shirtMondayX={composition.mondayX}
              shirtMondayY={composition.mondayY}
              shirtNameX={composition.nameX}
              shirtNameY={composition.nameY}
              shirtNumberX={composition.numberX}
              shirtNumberY={composition.numberY}
              shirtBrothersX={composition.brothersX}
              shirtBrothersY={composition.brothersY}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2.5">
          <label className="grid gap-1 text-left">
            <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">Team fabric</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)} className="h-10 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3 home-copy-bold text-[12px] font-black uppercase tracking-[0.08em] text-[#F5F1E8] outline-none">
              <option value="">SELECT TEAM</option>
              {TEAM_OPTIONS.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-2.5">
            <label className="grid gap-1 text-left">
              <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">Name</span>
              <input value={name} onChange={(event) => setName(cleanName(event.target.value, ""))} className="h-10 min-w-0 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-2.5 home-copy-bold text-[12px] font-black uppercase tracking-[0.06em] text-[#F5F1E8] outline-none" />
            </label>
            <label className="grid gap-1 text-left">
              <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">No.</span>
              <input inputMode="numeric" min="0" max="99" value={number} onChange={(event) => setNumber(cleanNumber(event.target.value, ""))} className="h-10 min-w-0 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-2 text-center home-copy-bold text-[12px] font-black uppercase tracking-[0.04em] text-[#F5F1E8] outline-none" />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ExportButton
            onClick={handleShare}
            disabled={Boolean(busy)}
            primary
            icon={<ShareIcon className="h-5 w-5" />}
            label="Share"
            busy={busy === "sharing"}
          />
          <ExportButton
            onClick={handleSave}
            disabled={Boolean(busy)}
            primary
            icon={<CheckIcon className="h-5 w-5" />}
            label="Save"
            busy={busy === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
